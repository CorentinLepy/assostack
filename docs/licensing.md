# Licensing Strategy (Working Document)

AssoStack is intended to be free/open-source software with optional commercial offerings around managed hosting, support, integrations and advanced capabilities.

## Product goals

The licensing model should preserve these goals:

- anyone can inspect, use, self-host and improve the Community edition;
- the Community edition remains genuinely useful;
- commercial hosting and support remain possible;
- the project can offer optional paid services or advanced capabilities later;
- contributors understand how their code can be redistributed;
- the project avoids accidental incompatibilities with dependencies.

## Current status

No final project license has been selected yet.

This is intentional. The repository is public while the architecture is being established, but the project should choose and publish its final license before the first public release intended for third-party use and before accepting significant external contributions.

## Candidate directions

### AGPL-3.0-or-later

Potential advantages:

- strong software-freedom guarantees;
- modifications offered as a network service generally remain subject to source-sharing obligations;
- suitable for a project that wants a sustainable managed-hosting business without allowing closed hosted forks to silently diverge.

Points to evaluate:

- implications for proprietary modules and integrations;
- contributor expectations;
- compatibility with dependencies and distribution model;
- whether future dual licensing would require contributor agreements or copyright ownership strategy.

### Permissive core (for example MIT/Apache-2.0) plus commercial modules/services

Potential advantages:

- simple adoption and integration;
- friendly to a broad developer ecosystem;
- straightforward use by companies.

Points to evaluate:

- permits closed-source hosted forks;
- less protection against competitors taking the full community work private;
- may change the commercial strategy toward brand, hosting and proprietary modules.

## Dependency licensing

Every bundled dependency and optional component must be reviewed for license compatibility before redistribution.

In particular, distinguish between:

- libraries linked into AssoStack;
- optional external services reached through APIs/webhooks;
- separately deployed automation products;
- assets, fonts, icons and templates.

## Commercial direction

The current product idea is:

- **Community** — free/open-source and self-hostable;
- **Hosted** — managed hosting, backups, upgrades and operations;
- **Pro** — optional advanced capabilities and integrations;
- **Enterprise** — support, SSO, SLA and organization-specific services.

The licensing choice must support this model without intentionally crippling Community.

## Decision process

Before the first release intended for general adoption:

1. review candidate licenses and dependency compatibility;
2. decide whether proprietary modules are part of the long-term strategy;
3. decide whether dual licensing may be needed;
4. obtain legal review if the project becomes commercially significant;
5. publish `LICENSE` and update contribution terms accordingly.
