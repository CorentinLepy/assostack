# Team SMH legacy migration

`src/scripts/team-smh-legacy-import.ts` is a narrowly scoped, repeatable importer for a Team SMH legacy SQLite export. It is deployment-specific and does not add Team SMH behavior to the AssoStack core.

## Safety boundary

The importer opens the supplied SQLite database read-only using Node 24's built-in `node:sqlite`. It uses fixed reads only from `settings`, `articles`, `pilots`, `program_items`, `visitor_cards`, `map_points`, and `events`. It does not read authentication, security, analytics, logs, messages, audit history, deleted records, or backup SQLite files. Reports include only counts, target slugs, operation types, and public titles. It always closes both the SQLite connection and initialized Payload resources before exit.

The default is dry-run. It plans all reads and checks target records, but never calls Payload create, update, or delete operations. There is no delete operation in the importer.

Run a dry-run before approval:

```powershell
pnpm --config.verify-deps-before-run=false payload run src/scripts/team-smh-legacy-import.ts -- --db /legacy/team_smh.sqlite --organization team-smh
```

After reviewing the report, use `--apply` to create or update only the planned pages and posts:

```powershell
pnpm --config.verify-deps-before-run=false payload run src/scripts/team-smh-legacy-import.ts -- --db /legacy/team_smh.sqlite --organization team-smh --apply
```

The command requires the exact `team-smh` organization slug, exactly one matching organization, and at least one existing platform-admin user. It uses one platform admin with Payload local API operations so normal tenant hooks and authorization apply. It never creates or changes users.

## Imported content

Pages are idempotently found by organization and slug. `home`, `pilotes`, and the deterministic event slug are created when missing or updated when present. Published legacy articles are similarly upserted as posts. Legacy HTML body values are reduced to conservative plain text and stored in the existing minimal Lexical structure.

Only an empty current organization website tagline may be populated, from `association_title`. The organization's manually configured identity, lifecycle, locale, timezone, primary domain, and site title are not changed.

The legacy event is deliberately not copied into the AssoStack Events collection because its date has no reliable start time.

## Deferred data

The report explicitly defers the Apple sponsor and JPG pending human approval, test-looking race results, the pilot named `test`, social wall and countdown settings, operational/live/weather/parking/security data, authentication/security/statistics/logging data, and backup SQLite files. No images are imported in this first pass.