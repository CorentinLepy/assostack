# AssoStack Roadmap

This roadmap is intentionally pragmatic. Team SMH is the first production implementation used to validate the product, but milestones are defined for a reusable platform.

## 0.1 Foundation — complete

Goal: establish a reliable development and deployment base.

- pnpm monorepo
- Astro public application
- Payload admin/backend application
- PostgreSQL
- Docker Compose reference environment
- configuration model
- authentication
- tenants/organizations
- roles and permissions
- baseline CI
- linting, type checking and tests
- migration workflow
- initial observability hooks

Exit criteria: a developer can clone the repository, start the platform locally, sign in, and operate within a tenant-aware environment.

## 0.2 CMS — complete

Goal: provide the website/content capabilities needed by real organizations.

- tenant-scoped pages, news/articles and media
- draft/version/publish workflow and scheduled publication
- structured reusable page sections
- organization navigation and constrained theme configuration
- provider-neutral built-in public routes
- stable public content API that exposes published content only
- static Astro rendering from backend content
- transaction-safe static-site rebuild queue/webhook boundary
- SEO fields, canonical/social metadata
- `robots.txt`, XML sitemap and RSS news feed
- configured static-build tests that guard the public/backend boundary

Exit criteria: an organization can publish and maintain a usable public website without modifying product code.

## 0.3 CRM — complete

Goal: establish the reusable relationship-management core.

- contacts (people and organizations)
- organization/company relationships without duplicating CRM identities
- tags/segments
- activities/interactions
- notes
- tasks and reminders
- custom fields strategy — tenant-safe Contact custom field definitions and typed values implemented
- tenant-safe CSV import/export foundation
- privacy/consent metadata

Exit criteria: an organization can manage its contact base and relationship history reliably.

## 0.4 Association Operations — complete

Goal: cover common association workflows through reusable modules.

- memberships and membership periods/status
- volunteers, shifts and assignments
- events and registrations/participation
- sponsors/partners
- forms and submissions
- tenant-safe private association documents

Exit criteria: Team SMH can operate its core association workflows on AssoStack without Team SMH-specific logic in the product core.

## 0.5 Integrations

Goal: connect AssoStack safely to external services.

Initial adapter candidates:

- HelloAsso
- Brevo
- SMTP
- Cloudflare R2
- Cloudflare Turnstile
- generic webhooks
- automation adapter

Exit criteria: integrations are replaceable adapters rather than hard-coded assumptions.

## 0.6 Team SMH Production

Goal: migrate the first real organization onto the platform.

- Team SMH branding/configuration
- legacy content migration
- legacy CRM/data migration where useful
- production deployment
- backup and restore validation
- security review
- operational monitoring
- field feedback and fixes

## 0.7 Productization

Goal: make the Community edition usable outside the founding deployment.

- generic onboarding
- demo association
- sample data
- installation documentation
- upgrade documentation
- admin UX cleanup
- module documentation
- API/SDK documentation
- accessibility review
- localization foundations

## 1.0

Goal: first stable public release.

Required before 1.0:

- stable documented install and upgrade path
- reliable backup/restore procedure
- tested tenant isolation
- documented security model
- documented extension/module model
- resolved license strategy
- release process and changelog
- supported version policy

## Beyond 1.0

Potential directions, not commitments:

- managed AssoStack hosting
- advanced automation
- premium integrations
- advanced reporting
- SSO/enterprise identity
- multi-organization administration
- booking and inventory modules
- small-business-oriented modules
- AI assistants with permission-aware access
- CLI/bootstrap tooling such as `create-assostack`

Experimental features should not delay a solid core unless they directly validate a key architectural assumption.
