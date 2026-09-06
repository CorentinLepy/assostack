# Contributing to AssoStack

AssoStack is in early development. Contributions are welcome, but the architecture is still being established.

## Before contributing

Please read:

- `README.md`
- `AGENTS.md`
- `docs/architecture.md`
- `docs/roadmap.md`
- relevant ADRs under `docs/adr/`

## Development principles

Contributions should preserve the separation between:

- **core** — generic capabilities useful across organizations;
- **modules** — optional reusable business capabilities;
- **integrations** — adapters to external services;
- **deployments** — organization-specific configuration and branding.

Team SMH is the first production implementation, but Team SMH-specific logic must not be embedded into the generic product.

## Pull requests

A pull request should:

- explain the problem being solved;
- explain why the change belongs in core, a module, an integration, or deployment-specific configuration;
- include tests when business logic, authorization, tenancy or data transformations change;
- include migrations for schema changes;
- update documentation when behavior or architecture changes.

## Security

Do not submit real personal data, credentials, tokens, private keys or production configuration.

For security vulnerabilities, follow `SECURITY.md` instead of opening a public issue.

## Licensing

The project license is being finalized before the first public release. Contributions accepted before that decision may require confirmation that they can be redistributed under the chosen project license.
