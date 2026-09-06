# ADR 0001: Product boundary and first implementation

- Status: Accepted
- Date: 2026-09-06

## Context

AssoStack is being created while rebuilding the digital platform used by Team SMH. The first deployment therefore has real organization-specific requirements from day one.

Without an explicit boundary, those requirements could become hard-coded into the product and make future reuse by other associations or small organizations difficult.

## Decision

AssoStack is the reusable product. Team SMH is the first production implementation.

A requirement discovered through Team SMH must be classified before implementation as one of:

1. a generic AssoStack core capability;
2. an optional reusable module;
3. an external integration;
4. Team SMH-specific deployment configuration or extension.

Team SMH branding, domains, data, credentials and unique business rules must not be embedded in the generic core.

## Consequences

Positive:

- the product remains reusable;
- Team SMH gives the project real-world validation;
- reusable modules can emerge from actual needs;
- future organizations can adopt AssoStack without forking the product.

Trade-offs:

- some Team SMH features may require additional abstraction work;
- the team must consciously classify new functionality before implementation;
- configuration and extension mechanisms become important early in the project.
