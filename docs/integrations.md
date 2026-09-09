# Integrations foundation

AssoStack integrations are replaceable adapters. CRM, CMS, Events, Memberships and Association Operations must depend on generic contracts, never on a provider SDK or provider-specific data model.

## Adapter and registry

`apps/admin/src/integrations/types.ts` defines the provider-neutral contracts. An `IntegrationExecutionContext` always contains the organization and integration identifiers. `IntegrationRegistry` resolves adapters by the allow-listed provider name. The default registry implements generic inbound webhooks, SMTP and Brevo transactional email, and server-side anti-abuse challenge verification through Cloudflare Turnstile. HelloAsso, Cloudflare R2 and automation remain deliberate placeholders that do not call external APIs.

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

`email.ts` defines `EmailMessage` (`to: string | string[]`, `subject: string`, optional `text`, `html` and `replyTo`) and `EmailDeliveryResult` (`status: 'accepted'`, optional `messageID`). Messages require at least one non-empty recipient, a non-empty subject and content in text or HTML. The optional `sendEmail({ config, context, logger, message, secret })` adapter method implements the `email` capability independently of `execute()`. SMTP and Brevo both implement this same provider-neutral email contract through IntegrationAdapter.sendEmail().

SMTP accepts only non-sensitive `host`, integer `port` (1–65535), boolean `secure`, optional `username`, `fromAddress` and optional `fromName`. String settings are trimmed. The password must be resolved only through `secretRef` / `SecretStore` and passed as `secret`; it never belongs in config. A username requires a non-empty string secret; omitting username allows unauthenticated SMTP without a secret. Password whitespace is preserved.

`smtp-adapter.ts` keeps Nodemailer and SMTP transport details provider-local. `createSMTPAdapter()` accepts a minimal transport factory for tests without network access. Each call validates inputs and sends one email, returning only acceptance and the provider message ID. Provider failures propagate without adapter logging; callers must sanitize errors before logging or exposing them. Acceptance does not guarantee inbox delivery. Callers remain responsible for tenant authorization and secret resolution. No endpoint, templates, campaigns, queue/retry runtime or domain wiring is included.

Brevo accepts only non-sensitive `fromAddress` and optional `fromName`. Its API key comes only from the caller through `secretRef` / `SecretStore` as `secret`, never from config. `brevo-adapter.ts` uses built-in fetch with an injectable HTTP boundary for network-free tests to POST to the fixed `https://api.brevo.com/v3/smtp/email` transactional endpoint. It forwards the context AbortSignal and returns acceptance plus the optional message ID; acceptance means Brevo accepted the API request, not guaranteed inbox delivery. Errors are sanitized without adapter logging. No campaigns, templates, contact/list synchronization, marketing automation, Brevo webhooks, queue/retries, CRM/domain wiring or idempotency mapping are implemented.

### Anti-abuse verification

`anti-abuse` is a provider-neutral capability with `verifyChallenge()`, which accepts a token, optional remote IP, execution context and externally resolved secret, and returns only `{ verified: boolean }`. The real Cloudflare Turnstile adapter validates an empty non-sensitive config, sends the secret and token to Cloudflare's siteverify endpoint using built-in fetch, forwards the context AbortSignal, and sanitizes network, HTTP and response errors. It does not expose Cloudflare response types, log credentials, or implement public widgets, forms or domain wiring.

### Provider checklist

1. Add the provider identifier to `integrationProviders`.
2. Implement and register an adapter with strict non-sensitive configuration validation.
3. Add provider-specific signature verification or delivery behavior only inside that adapter.
4. Add tests for tenant isolation, invalid configuration, provider errors, idempotency and secret redaction.
5. Document required secret references and retry/idempotency semantics.

Cloudflare R2 remains a placeholder because association documents and CMS media already use Payload's upload/storage boundary. A future R2 implementation belongs as a Payload storage adapter that preserves collection ACLs and tenant filtering; it must not create a parallel object-storage subsystem in `IntegrationAdapter`. No production R2 wiring, AWS SDK, upload schema change or migration is part of this closeout.

HelloAsso remains a placeholder because no stable provider-neutral payment or synchronization contract is required by the current product scope. There is no HelloAsso OAuth, checkout, payment, refund, membership sync, campaign, reconciliation, webhook or polling implementation. Automation also remains a placeholder: generic webhooks and Payload jobs provide the current boundaries, and no workflow engine, triggers/actions DSL or vendor-specific connector is justified yet.

The first foundation deliberately excludes real HelloAsso synchronization, Brevo campaigns, production R2 storage, public Turnstile widgets or forms, a complete configuration UX and generic OAuth. These exclusions do not introduce provider assumptions: API details stay in adapters, secrets stay externalized, email has replaceable SMTP and Brevo providers, inbound requests have a generic webhook boundary, and storage remains behind Payload.
