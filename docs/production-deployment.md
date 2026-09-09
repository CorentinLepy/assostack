# Production deployment guide

This guide covers a generic single-host Debian Docker deployment for AssoStack. It is intentionally reusable and does not hard-code private infrastructure; it also notes the Team SMH validation environment, which uses a Proxmox Debian VM and Cloudflare Tunnel on a trusted LAN host.

## Architecture

The production deployment uses a small Docker Compose stack:

- PostgreSQL 18 container
- Payload + Next admin application container on port 3001
- one-shot Astro web build container
- static web serving container using nginx:alpine on port 4321

Important design choices:

- PostgreSQL is internal-only and never published to the host.
- The admin app is exposed on the LAN via a bind-address-controlled host port.
- The public static site is exposed on a separate bind-address-controlled host port.
- Cloudflare Tunnel on a separate trusted host forwards public hostnames to these internal LAN ports.
- No host Nginx, no host TLS reverse proxy, and no host PHP are required in this stack.
- The static site is rebuilt when needed by a dedicated one-shot builder service that waits for the admin app to become healthy.

## Requirements

- Debian 12 host with Docker Engine and Docker Compose available
- Node 24-compatible build environment if building images locally
- persistent Docker named volumes for PostgreSQL, admin media, admin documents, and static web output
- a production `.env.production` file generated from `.env.production.example`
- a trusted Cloudflare Tunnel running elsewhere on the LAN
- a policy that only the application ports are exposed on the host network and only where practical

## Repository setup

Clone the repository on the Debian host:

```bash
git clone <repository-url>
cd assostack
```

Pull the latest release or deployment branch, then check out the intended version:

```bash
git fetch --all
git checkout production/0.6-deployment
```

If you need to rebuild the images from a fresh checkout, the repo already contains the required Dockerfiles and Compose stack definitions.

## Production environment preparation

Create a local production environment file from the example:

```bash
cp .env.production.example .env.production
```

Then edit `.env.production` and replace placeholders with real deployment values. Keep secrets out of the repository and back them up separately via a secure secret-management process.

Required values include:

- `POSTGRES_DB`
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `DATABASE_URL`
- `PAYLOAD_SECRET`
- `NEXT_PUBLIC_SERVER_URL`
- `PUBLIC_WEB_URL`
- `ASSOSTACK_API_URL`
- `ASSOSTACK_ORGANIZATION`
- `ASSOSTACK_BIND_ADDRESS`
- `PAYLOAD_DB_PUSH=false`

Recommended values for a private LAN deployment:

```env
ASSOSTACK_BIND_ADDRESS=10.10.60.225
NEXT_PUBLIC_SERVER_URL=https://admin.example.com
PUBLIC_WEB_URL=https://www.example.com
ASSOSTACK_API_URL=http://admin:3001
ASSOSTACK_ORGANIZATION=team-smh
PAYLOAD_DB_PUSH=false
```

The public web URL and internal API URL are intentionally distinct. `NEXT_PUBLIC_SERVER_URL` and `PUBLIC_WEB_URL` should be public hostnames routed through Cloudflare, while `ASSOSTACK_API_URL` may be the internal Compose service name `http://admin:3001` used by the one-shot Astro build.

## Image build

Build the production images from the repo root:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml build
```

This uses the repo’s Dockerfiles and keeps the runtime images smaller than the build images. The admin Docker image builds the production Next app and runs `next start --port 3001`. The web Dockerfile creates an Astro production static build in a temporary build stage, and the stack copies the resulting static output into a shared named volume for the nginx serving container.

## First PostgreSQL start

Start PostgreSQL first so the admin service can wait for a healthy database:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml up -d postgres
```

Check health:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml ps

docker inspect --format='{{json .State.Health}}' $(docker compose --env-file .env.production -f docker-compose.prod.yml ps -q postgres)
```

Use the real PostgreSQL health status before proceeding.

## Migrations

After PostgreSQL is healthy, run migrations explicitly rather than relying on runtime schema mutation:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml run --rm admin sh -lc "cd /workspace/apps/admin && pnpm --config.verify-deps-before-run=false migrate"
```

To check migration status explicitly:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml run --rm admin sh -lc "cd /workspace/apps/admin && pnpm --config.verify-deps-before-run=false migrate:status"
```

This must use the repository’s existing Payload migration command and should only be run against a fresh or maintained production database. The stack has `PAYLOAD_DB_PUSH=false` set to make this explicit and to avoid automatic schema mutation during startup.

Do not do any of the following in production:

- reset the database
- drop the database
- truncate tables
- recreate the database automatically
- run down migrations automatically

## Admin startup

Once the database is ready, start the admin service:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml up -d admin
```

Check readiness:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml exec admin \
  curl -fsS http://127.0.0.1:3001/api/health/ready
```

The admin health route is the existing Payload health endpoint and does not expose a large operational surface. It is sufficient for deployment health checks and startup gating.

## Static site build

The site build is intentionally a one-shot runtime step. Run it explicitly after admin is healthy so postgres/admin remain running and unaffected.

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml run --rm --no-deps web-build
```

This is the correct path when `ASSOSTACK_API_URL` and `ASSOSTACK_ORGANIZATION` are both set because the Astro build fetches published public content during build time. The internal Compose network URL `http://admin:3001` is appropriate for the build, while the public site remains separate from the admin URL.

The `web-build` service uses a bounded readiness loop before running Astro build. It retries admin readiness for a fixed number of attempts and exits with a clear error if admin never becomes ready.

If the build environment does not have both variables set, the site builds as the generic AssoStack landing page instead.

## Static site serving

After the build succeeds, start the nginx static service:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml up -d web
```

The web container serves the generated static site from a read-only mounted volume:

- source: `assostack-web-dist`
- target: `/usr/share/nginx/html`

The host port mapping is controlled by `ASSOSTACK_BIND_ADDRESS`, for example:

```env
ASSOSTACK_BIND_ADDRESS=127.0.0.1
```

`127.0.0.1` means localhost-only binding. It is not reachable by cloudflared when cloudflared runs on another machine.

On the Team SMH production validation host, set this to the Debian VM LAN address (for example `10.10.60.225`) so the separate Cloudflare Tunnel host can reach the service ports, then restrict firewall access to only trusted origin hosts where practical.

## Cloudflare Tunnel origin mapping

Cloudflare Tunnel should be configured to forward public hostnames to the Debian VM application ports over the LAN, not directly to the Docker host ports of the stack's internal components.

Intended layout:

- `https://<public-static-host>` -> `http://10.10.60.225:4321`
- `https://<public-admin-host>` -> `http://10.10.60.225:3001`

Environment-variable mapping for this architecture:

- `ASSOSTACK_BIND_ADDRESS=<debian-vm-lan-ip>`
- `NEXT_PUBLIC_SERVER_URL=https://<public-admin-host>`
- `PUBLIC_WEB_URL=https://<public-static-host>`
- `ASSOSTACK_API_URL=http://admin:3001`
- `ASSOSTACK_ORGANIZATION=<organization-slug>`

This stack does not include Cloudflare Tunnel or any host TLS proxy. It only exposes the application ports needed by the tunnel on the local host.

## Upgrade sequence

Use a deliberate upgrade flow:

1. review the release and the migration state
2. create and verify backups
3. update the repository on the Debian host
4. update `.env.production` if needed
5. rebuild images
6. start PostgreSQL
7. wait for PostgreSQL health
8. run the explicit migration command
9. restart/update admin
10. verify admin readiness with `docker compose ... exec admin curl -fsS http://127.0.0.1:3001/api/health/ready`
11. rebuild static web output with `docker compose ... run --rm --no-deps web-build`
12. reload or restart the static web container

## Rollback considerations

A rollback should be prepared as a deliberate operation:

- keep previous release images or the prior git revision available
- keep PostgreSQL logical backups current
- remember that the static site is generated output, so a rollback may require rebuilding it from the previous version or restoring the static output volume
- do not rely on automatic down migrations for a production rollback
- restart the admin and web services only after validating the database and config state

## Backups

The production backup set should include:

1. PostgreSQL logical dump using `pg_dump`
2. admin media volume
3. admin documents volume
4. deployment configuration needed to recreate the environment
5. secret backup kept separately and securely

Example backup commands:

```bash
mkdir -p /var/backups/assostack
timestamp="$(date +%Y%m%d-%H%M%S)"

docker compose --env-file .env.production -f docker-compose.prod.yml \
  exec -T postgres sh -lc 'pg_dump --username="$POSTGRES_USER" --dbname="$POSTGRES_DB" --format=custom' \
  > "/var/backups/assostack/assostack-${timestamp}.dump"

docker compose --env-file .env.production -f docker-compose.prod.yml \
  exec -T admin sh -lc 'tar czf - -C /workspace/apps/admin media' \
  > "/var/backups/assostack/admin-media-${timestamp}.tar.gz"

docker compose --env-file .env.production -f docker-compose.prod.yml \
  exec -T admin sh -lc 'tar czf - -C /workspace/apps/admin documents' \
  > "/var/backups/assostack/admin-documents-${timestamp}.tar.gz"
```

Store `.env.production` separately and never commit it. Secrets are not part of the repository and should not be included in normal backup files unless they are handled by a controlled secret backup process.

## Restore validation

Use a disposable environment or disposable PostgreSQL database to validate a restore before using it in production. The validation should cover:

- restore of a logical PostgreSQL dump into a disposable database
- application startup against restored data
- admin readiness and login flow
- media/document presence verification
- static site rebuild using the restored system

This validation protects against silent corruption or incomplete restore workflows.

## Logs and operational checks

View logs:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml logs -f postgres

docker compose --env-file .env.production -f docker-compose.prod.yml logs -f admin

docker compose --env-file .env.production -f docker-compose.prod.yml logs -f web
```

Check health and status:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml ps

docker compose --env-file .env.production -f docker-compose.prod.yml top
```

Inspect volumes:

```bash
docker volume ls
docker volume inspect assostack_assostack-postgres
docker volume inspect assostack_assostack-admin-media
docker volume inspect assostack_assostack-admin-documents
```

The admin runtime image includes `tar`, so media/documents backups can be streamed from the running admin container without guessing Compose-prefixed volume names.

## Firewall principle

The host firewall should allow only the application ports needed by Cloudflare Tunnel and local internal access. PostgreSQL is not exposed publicly. This is the recommended default:

- no public PostgreSQL port binding
- only the LAN-reachable application ports should be reachable from Cloudflare Tunnel network peers
- no host Nginx or host TLS endpoint is required in this stack

## Remaining 0.6 blockers

This production deployment foundation is intentionally limited to safe infrastructure. The following items remain outside this slice and must be handled later as actual Team SMH production work:

- public Cloudflare routing configuration
- Team SMH branding and site configuration
- legacy content and data migration
- live backup/restore validation in real infrastructure
- production security review
- monitoring and alerting
- field validation and operator runbooks
- deployment automation beyond the repository-defined Compose stack

This slice does not claim milestone 0.6 completion; it prepares the safe deployment foundation needed for later production rollout.
