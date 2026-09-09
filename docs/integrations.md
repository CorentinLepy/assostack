# Integrations foundation

AssoStack integrations are replaceable adapters. CRM, CMS, Events, Memberships and Association Operations must depend on generic contracts, never on a provider SDK or provider-specific data model.

## Adapter and registry

`apps/admin/src/integrations/types.ts` defines the provider-neutral contracts. An `IntegrationExecutionContext` always contains the organization and integration identifiers. `IntegrationRegistry` resolves adapters by the allow-listed provider name. The default registry implements generic inbound webhooks and SMTP email. HelloAsso, Brevo, Cloudflare R2, Cloudflare Turnstile and automation remain placeholders that do not call external APIs.

Adapters declare capabilities such as execution or inbound/outbound webhooks. A provider implementation should validate its non-sensitive configuration and keep provider SDK details inside its own adapter module.

## Tenancy and configuration

The `integrations` collection is tenant-scoped through the existing Payload multi-tenant plugin. Organization administrators can create and update integrations; editors can read operational configuration and status; members have no access. The existing organization access helpers and write hook remain the enforcement boundary, including for crafted cross-tenant writes.

`config` contains non-sensitive provider settings only. Unknown providers are rejected by the Payload select field and adapter lookup. Provider-specific configuration validation happens through the selected adapter.

## Secrets

Credentials are not stored in `config` and are never returned by the collection. `secretRef` is an opaque reference, hidden on reads and intended to be resolved by the `SecretStore` abstraction. `createEnvironmentSecretStore` is the initial environment-variable implementation. A deployment may later provide a secret-manager or encrypted-credential implementation without changing adapters. AssoStack does not implement cryptography in this layer, and secrets must never be logged.

## Webhooks and jobs

`processInboundWebhook` delegates signature and payload verification to the adapter, binds idempotency to the organization and integration, and rejects unsupported or invalid inbound webhooks. A persistent event-store implementation should record accepted event IDs before asynchronous domain processing. Payload jobs remain the execution mechanism for work that should be retried or deferred, following the existing CMS rebuild task pattern. Outbound delivery belongs behind an adapter capability and must use an explicit organization execution context.

### Generic inbound webhook runtime

Enabled generic webhook integrations receive `POST /api/integrations/:id/webhook`. By default, the request must include `x-assostack-signature` and the stable event identifier in `x-assostack-event-id`. The signature is an HMAC-SHA256 over the exact raw request body, supplied as a lowercase hexadecimal digest with an optional `sha256=` prefix. The signing secret is resolved through the integration `secretRef` and `SecretStore`, never from webhook configuration. Idempotency is enforced at the organization, integration, and event ID boundary in the persisted webhook event ledger. The runtime verifies and records deliveries only; no domain or CRM processing occurs yet.

## Adding a provider

### Outbound email

`email.ts` defines `EmailMessage` (`to: string | string[]`, `subject: string`, optional `text`, `html` and `replyTo`) and `EmailDeliveryResult` (`status: 'accepted'`, optional `messageID`). Messages require at least one non-empty recipient, a non-empty subject and content in text or HTML. The optional `sendEmail({ config, context, logger, message, secret })` adapter method implements the `email` capability independently of `execute()`. Brevo is expected to implement this same generic contract later.

SMTP accepts only non-sensitive `host`, integer `port` (1–65535), boolean `secure`, optional `username`, `fromAddress` and optional `fromName`. String settings are trimmed. The password must be resolved only through `secretRef` / `SecretStore` and passed as `secret`; it never belongs in config. A username requires a non-empty string secret; omitting username allows unauthenticated SMTP without a secret. Password whitespace is preserved.

`smtp-adapter.ts` keeps Nodemailer and SMTP transport details provider-local. `createSMTPAdapter()` accepts a minimal transport factory for tests without network access. Each call validates inputs and sends one email, returning only acceptance and the provider message ID. Provider failures propagate without adapter logging; callers must sanitize errors before logging or exposing them. Acceptance does not guarantee inbox delivery. Callers remain responsible for tenant authorization and secret resolution. No endpoint, templates, campaigns, queue/retry runtime or domain wiring is included.

### Provider checklist

1. Add the provider identifier to `integrationProviders`.
2. Implement and register an adapter with strict non-sensitive configuration validation.
3. Add provider-specific signature verification or delivery behavior only inside that adapter.
4. Add tests for tenant isolation, invalid configuration, provider errors, idempotency and secret redaction.
5. Document required secret references and retry/idempotency semantics.

The first foundation deliberately excludes real HelloAsso synchronization, Brevo campaigns, production R2 storage, public Turnstile challenges, a complete configuration UX and generic OAuth.
