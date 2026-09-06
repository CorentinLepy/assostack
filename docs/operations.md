# Operations and health checks

AssoStack exposes small provider-neutral health endpoints from the admin/backend application. They are intended for reverse proxies, container platforms and monitoring systems such as Zabbix without coupling the product to any specific vendor.

## Liveness

```text
GET /api/health/live
```

Healthy response:

```json
{"status":"ok"}
```

A `200` response means the application process can execute the route. The liveness check intentionally does **not** query PostgreSQL or any external provider.

Use liveness to detect a dead or wedged application process. Do not use it as the only signal for routing user traffic because the backend may be alive while its database is unavailable.

## Readiness

```text
GET /api/health/ready
```

Healthy response:

```json
{"status":"ready"}
```

with HTTP `200`.

The readiness probe initializes Payload and executes a minimal `SELECT 1` against PostgreSQL. It therefore checks that the application can reach its core database dependency.

If readiness fails, the endpoint returns HTTP `503` with only:

```json
{"status":"unavailable"}
```

Database errors, credentials, hostnames, stack traces and tenant data are deliberately not returned.

## Caching

Both endpoints return a `Cache-Control` header containing `no-store`. Health results must be evaluated at request time rather than served from a proxy or CDN cache.

## Monitoring semantics

Recommended baseline:

- monitor `/api/health/live` to detect process failure;
- monitor `/api/health/ready` to detect inability to serve backend-dependent traffic;
- alert more urgently when readiness remains unavailable for multiple checks;
- keep PostgreSQL host/service monitoring separate so operators can distinguish application and database failures.

Exact intervals and alert thresholds belong to each deployment's operational configuration rather than the AssoStack core.

## Structured operational logs

AssoStack's baseline application operational events are emitted as one-line JSON objects. The initial common fields are:

```json
{
  "timestamp": "2026-09-06T20:00:00.000Z",
  "level": "warn",
  "event": "health.readiness.failed",
  "component": "database"
}
```

Rules:

- `event` is a stable machine-oriented identifier;
- context fields must be small and structured;
- do not log passwords, tokens, connection strings, session identifiers or personal data;
- public health responses remain sanitized even when internal logs record an operational event;
- vendor-specific exporters (Sentry, OpenTelemetry, hosted logging, etc.) should consume or wrap these signals rather than changing product-domain code.

This baseline is intentionally small. Request correlation, tracing and metrics will be added when the application has enough real traffic and workflows to justify them.
