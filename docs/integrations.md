# Integrations foundation

AssoStack integrations are replaceable adapters. CRM, CMS, Events, Memberships and Association Operations must depend on generic contracts, never on a provider SDK or provider-specific data model.

## Adapter and registry

`apps/admin/src/integrations/types.ts` defines the provider-neutral contracts. An `IntegrationExecutionContext` always contains the organization and integration identifiers. `IntegrationRegistry` resolves adapters by the allow-listed provider name. The default registry currently exposes placeholders for HelloAsso, Brevo, SMTP, Cloudflare R2, Cloudflare Turnstile, generic webhooks and automation; these placeholders intentionally do not call external APIs.

Adapters declare capabilities such as execution or inbound/outbound webhooks. A provider implementation should validate its non-sensitive configuration and keep provider SDK details inside its own adapter module.

## Tenancy and configuration

The `integrations` collection is tenant-scoped through the existing Payload multi-tenant plugin. Organization administrators can create and update integrations; editors can read operational configuration and status; members have no access. The existing organization access helpers and write hook remain the enforcement boundary, including for crafted cross-tenant writes.

`config` contains non-sensitive provider settings only. Unknown providers are rejected by the Payload select field and adapter lookup. Provider-specific configuration validation happens through the selected adapter.

## Secrets

Credentials are not stored in `config` and are never returned by the collection. `secretRef` is an opaque reference, hidden on reads and intended to be resolved by the `SecretStore` abstraction. `createEnvironmentSecretStore` is the initial environment-variable implementation. A deployment may later provide a secret-manager or encrypted-credential implementation without changing adapters. AssoStack does not implement cryptography in this layer, and secrets must never be logged.

## Webhooks and jobs

`processInboundWebhook` delegates signature and payload verification to the adapter, binds idempotency to the organization and integration, and rejects unsupported or invalid inbound webhooks. A persistent event-store implementation should record accepted event IDs before asynchronous domain processing. Payload jobs remain the execution mechanism for work that should be retried or deferred, following the existing CMS rebuild task pattern. Outbound delivery belongs behind an adapter capability and must use an explicit organization execution context.

## Adding a provider

1. Add the provider identifier to `integrationProviders`.
2. Implement and register an adapter with strict non-sensitive configuration validation.
3. Add provider-specific signature verification or delivery behavior only inside that adapter.
4. Add tests for tenant isolation, invalid configuration, provider errors, idempotency and secret redaction.
5. Document required secret references and retry/idempotency semantics.

The first foundation deliberately excludes real HelloAsso synchronization, Brevo campaigns, production R2 storage, public Turnstile challenges, a complete configuration UX and generic OAuth.