# Security Policy

AssoStack handles potentially sensitive organizational and personal data. Security issues must therefore be handled carefully.

## Reporting a vulnerability

Please do **not** disclose suspected vulnerabilities in public GitHub issues, discussions or pull requests.

Until a dedicated private reporting channel is published, contact the project maintainer privately through their GitHub profile.

When reporting, include where possible:

- affected component and version/commit;
- impact;
- reproduction steps;
- proof of concept if safe to share;
- suggested mitigation if known.

## Scope priorities

Security-sensitive areas include:

- authentication and sessions;
- authorization and role checks;
- tenant isolation;
- file uploads and document access;
- API access;
- webhooks and integrations;
- secret handling;
- database access;
- personal data exposure;
- deployment and update mechanisms.

## Project expectations

- Secrets must never be committed.
- Production personal data must never be used in public fixtures or examples.
- Tenant isolation must be tested.
- Security-sensitive changes should receive explicit review.
- Supported production deployments should follow least-privilege principles.

A more formal disclosure and support policy will be published before the first stable release.
