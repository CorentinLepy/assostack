# AssoStack

AssoStack is an open-source platform for associations and small organizations.

It aims to provide a modern, modular and self-hostable foundation for:

- public websites and content management;
- contacts and CRM;
- memberships;
- events;
- volunteers;
- sponsors and partners;
- forms and documents;
- integrations and automation;
- organization-specific modules.

## Project status

> Early development / pre-alpha.

The project is being built in public. The first real-world deployment will be **Team SMH**, but Team SMH is an implementation of AssoStack, not part of the product core.

## Product principles

1. **AssoStack is the product. Team SMH is the first production implementation.**
2. The Community edition must remain genuinely useful and self-hostable.
3. Organization-specific logic must not leak into the core.
4. Prefer modularity and stable interfaces over hard-coded integrations.
5. PostgreSQL is the source of truth for business data.
6. Security and privacy are design requirements, not later add-ons.
7. Experiments must not destabilize the core.
8. Avoid unnecessary vendor lock-in.
9. The codebase should be friendly to both human contributors and coding agents.
10. Paid offerings may exist around hosting, support and advanced capabilities without making the free core intentionally unusable.

## Planned architecture

- **Astro** for public websites
- **Payload** for the administration layer, CMS and application backend
- **PostgreSQL** for persistent business data
- **TypeScript** throughout the application stack
- **pnpm workspaces** for the monorepo
- **Docker Compose** as the reference self-hosted deployment
- **Cloudflare** integrations where useful (R2, Turnstile, CDN / edge)

The architecture is expected to evolve. Significant technical decisions are documented as ADRs under `docs/adr/`.

## Repository direction

```text
assostack/
├── apps/
│   ├── web/          # Public website application (Astro)
│   ├── admin/        # Administration / backend (Payload)
│   └── docs/         # Product documentation (later)
├── packages/
│   ├── core/
│   ├── ui/
│   ├── sdk/
│   ├── config/
│   ├── modules/
│   └── integrations/
├── infra/
├── docs/
├── AGENTS.md
├── CONTRIBUTING.md
└── SECURITY.md
```

Directories will be created as the relevant parts of the product are bootstrapped. We intentionally avoid empty placeholder directories.

## First implementation: Team SMH

Team SMH will be used to validate AssoStack with real association workflows, including members, volunteers, events, sponsors and organization-specific activities.

A requirement discovered for Team SMH should be handled in one of three ways:

- generalized into the AssoStack core;
- implemented as a reusable module;
- kept in the Team SMH deployment if it is truly specific to that organization.

## Roadmap

Initial milestones:

- **0.1 Foundation** — monorepo, applications, database, tenancy, authentication, roles, CI.
- **0.2 CMS** — pages, news, media, navigation, theming and SEO.
- **0.3 CRM** — contacts, organizations, memberships, activities, tasks and notes.
- **0.4 Association operations** — events, registrations, volunteers, sponsors and documents.
- **0.5 Integrations** — payment, email, storage, anti-abuse and automation adapters.
- **0.6 Team SMH** — first production migration and field validation.
- **1.0** — documented installation, upgrades, backup/restore, security and a stable extension model.

See `docs/roadmap.md` for the working roadmap.

## Licensing

AssoStack is intended to be free/open-source software with optional commercial offerings around managed hosting, support and advanced services.

The exact project license is being finalized before the first public release. See `docs/licensing.md` for the current licensing strategy and constraints.

## Contributing

The project is at an early stage, but contributions and technical discussion are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md).

## Security

Please do not open public issues for security vulnerabilities. See [SECURITY.md](SECURITY.md).
