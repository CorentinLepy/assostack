# AGENTS.md

This file defines repository-wide rules for coding agents and human contributors using AI-assisted workflows.

## Product boundary

- **AssoStack is the product.**
- **Team SMH is the first real-world implementation, not part of the product core.**
- Never add Team SMH names, domains, colors, workflows, data models or assumptions to the generic core unless the concept is genuinely reusable.
- A Team SMH requirement must be either generalized, implemented as an optional reusable module, or kept in a separate Team SMH deployment/configuration.

## Architecture rules

- TypeScript is the primary application language.
- PostgreSQL is the authoritative store for business data.
- Database schema changes must be versioned and reproducible through migrations.
- Do not make manual production-only schema changes.
- Public websites use Astro unless an ADR explicitly changes that decision.
- Administration/backend capabilities use Payload unless an ADR explicitly changes that decision.
- Prefer explicit module boundaries and adapters over vendor-specific logic in the core.
- Integrations must be replaceable where practical.

## Security and privacy

- Never commit secrets, tokens, credentials, private keys, production connection strings or real personal data.
- Never give coding agents unrestricted production database credentials.
- Treat member/contact data as sensitive personal data.
- Apply least privilege to users, integrations and services.
- Security-sensitive changes require tests and review.
- Do not weaken authentication, authorization, validation or auditability to simplify development.

## Development quality

- Use TypeScript strict mode.
- Prefer small, composable modules with explicit contracts.
- Add tests for business rules, authorization, tenancy boundaries and data transformations.
- Avoid hidden magic and implicit cross-module coupling.
- Keep dependencies current, but do not adopt unstable technology in the core without an ADR.
- Experimental tools belong behind interfaces, feature flags, isolated services or lab environments.

## Multi-tenancy

- Tenant isolation is a core invariant.
- Any tenant-scoped entity must be filtered and authorized by tenant context.
- Tests must cover cross-tenant access denial for sensitive resources.
- Avoid global queries on tenant-scoped business data unless they are explicitly privileged and audited.

## Public/open-source repository

- Never use production Team SMH data in fixtures, screenshots, examples or test snapshots.
- Use generated or fictional sample data.
- Keep deployment-specific configuration outside the generic product whenever possible.
- Document significant architectural changes in `docs/adr/`.

## Pull requests and commits

- Keep commits focused.
- Explain the reason for architectural changes, not only the implementation.
- New modules should document their purpose, public API and dependency boundaries.
- Database changes must include migration instructions.
- Breaking changes must be called out clearly.

## AI-assisted coding

Before implementing a substantial change, an agent should:

1. inspect the relevant existing code and documentation;
2. identify whether the change belongs to core, module, integration or deployment-specific configuration;
3. preserve tenant isolation and access-control invariants;
4. add or update tests;
5. update documentation or ADRs where the architecture changes.

Agents must not invent credentials, infrastructure facts, customer data or product requirements that are not present in the repository or task context.
