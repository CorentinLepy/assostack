#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { existsSync, readFileSync, writeFileSync, copyFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

export const DEFAULT_SECRET_PLACEHOLDER = 'replace-me-with-a-long-random-secret'

const scriptPath = fileURLToPath(import.meta.url)
const repoRoot = resolve(dirname(scriptPath), '..')

const dockerComposeArgs = ['compose', '-f', 'docker-compose.yml']

function log(message) {
  console.log(message)
}

function fail(message) {
  throw new Error(message)
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: options.capture ? 'pipe' : 'inherit',
    env: process.env,
  })

  if (result.error) {
    fail(`${options.label ?? command} failed: ${result.error.message}`)
  }

  if (result.status !== 0) {
    const details = options.capture
      ? `\n${result.stdout ?? ''}${result.stderr ?? ''}`.trimEnd()
      : ''
    fail(
      `${options.label ?? command} exited with code ${result.status}.${details ? `\n${details}` : ''}`,
    )
  }

  return result
}

function commandExists(command, args) {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: 'pipe',
  })

  return !result.error && result.status === 0
}

export function satisfiesNodeEngine(version, engineRange) {
  const current = parseVersion(version)
  const comparators = engineRange.split(/\s+/).filter(Boolean)

  return comparators.every((comparator) => {
    const match = comparator.match(/^(>=|>|<=|<|=)?(.+)$/)
    if (!match) {
      return false
    }

    const operator = match[1] ?? '='
    const required = parseVersion(match[2])
    const comparison = compareVersions(current, required)

    if (operator === '>=') return comparison >= 0
    if (operator === '>') return comparison > 0
    if (operator === '<=') return comparison <= 0
    if (operator === '<') return comparison < 0
    return comparison === 0
  })
}

function parseVersion(version) {
  const match = version
    .trim()
    .replace(/^v/, '')
    .match(/^(\d+)(?:\.(\d+))?(?:\.(\d+))?/)
  if (!match) {
    fail(`Unable to parse Node version "${version}".`)
  }

  return match.slice(1, 4).map((part) => Number(part ?? 0))
}

function compareVersions(left, right) {
  for (let index = 0; index < 3; index += 1) {
    if (left[index] > right[index]) return 1
    if (left[index] < right[index]) return -1
  }

  return 0
}

function verifyTools() {
  const checks = [
    ['node', ['--version'], 'Node.js'],
    ['pnpm', ['--version'], 'pnpm'],
    ['docker', ['--version'], 'Docker'],
  ]

  for (const [command, args, label] of checks) {
    if (!commandExists(command, args)) {
      fail(`${label} is required but was not found on PATH.`)
    }
  }

  if (!commandExists('docker', ['compose', 'version'])) {
    fail('Docker Compose is required but `docker compose version` failed.')
  }
}

function verifyNodeVersion() {
  const packageJson = JSON.parse(readFileSync(resolve(repoRoot, 'package.json'), 'utf8'))
  const engineRange = packageJson.engines?.node

  if (!engineRange) {
    fail('package.json does not declare engines.node.')
  }

  if (!satisfiesNodeEngine(process.version, engineRange)) {
    fail(
      `Node ${process.version} does not satisfy package.json engines.node (${engineRange}). Use the version from .nvmrc.`,
    )
  }
}

export function ensureEnvFile(targetPath, examplePath, logger = () => {}) {
  if (existsSync(targetPath)) {
    logger(`Found ${relativePath(targetPath)}.`)
    return false
  }

  copyFileSync(examplePath, targetPath)
  logger(`Created ${relativePath(targetPath)} from ${relativePath(examplePath)}.`)
  return true
}

export function ensurePayloadSecret(envPath, examplePath, logger = () => {}) {
  const envContent = readFileSync(envPath, 'utf8')
  const exampleContent = readFileSync(examplePath, 'utf8')
  const placeholder = readEnvValue(exampleContent, 'PAYLOAD_SECRET') ?? DEFAULT_SECRET_PLACEHOLDER
  const current = readEnvValue(envContent, 'PAYLOAD_SECRET')

  if (current && current !== placeholder) {
    logger('Found existing local PAYLOAD_SECRET in apps/admin/.env; leaving it unchanged.')
    return false
  }

  const secret = randomBytes(48).toString('base64url')
  const nextContent = setEnvValue(envContent, 'PAYLOAD_SECRET', secret)
  writeFileSync(envPath, nextContent)
  logger('Generated a local PAYLOAD_SECRET in apps/admin/.env.')
  return true
}

export function readEnvValue(content, key) {
  const line = content.split(/\r?\n/).find((candidate) => {
    return new RegExp(`^\\s*(?:export\\s+)?${escapeRegExp(key)}\\s*=`).test(candidate)
  })

  if (!line) {
    return undefined
  }

  const rawValue = line.slice(line.indexOf('=') + 1).trim()
  return unquote(rawValue)
}

export function setEnvValue(content, key, value) {
  const lines = content.split(/\r?\n/)
  const matcher = new RegExp(`^\\s*(?:export\\s+)?${escapeRegExp(key)}\\s*=`)
  const index = lines.findIndex((line) => matcher.test(line))
  const nextLine = `${key}=${value}`

  if (index >= 0) {
    lines[index] = nextLine
    return lines.join('\n')
  }

  const suffix = content.endsWith('\n') ? '' : '\n'
  return `${content}${suffix}${nextLine}\n`
}

function unquote(value) {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1)
  }

  return value
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function ensureDependencies() {
  if (existsSync(resolve(repoRoot, 'node_modules/.modules.yaml'))) {
    log('Dependencies already installed; skipping pnpm install.')
    return
  }

  log('Installing dependencies with pnpm install --frozen-lockfile...')
  run('pnpm', ['install', '--frozen-lockfile'], { label: 'pnpm install --frozen-lockfile' })
}

function startPostgres() {
  log('Starting local PostgreSQL with docker-compose.yml...')
  run('docker', [...dockerComposeArgs, 'up', '-d', 'postgres'], {
    label: 'docker compose up postgres',
  })
}

async function waitForPostgres() {
  log('Waiting for PostgreSQL to become healthy...')
  const containerId = run('docker', [...dockerComposeArgs, 'ps', '-q', 'postgres'], {
    capture: true,
    label: 'docker compose ps postgres',
  }).stdout.trim()

  if (!containerId) {
    fail('Could not find the local PostgreSQL container.')
  }

  const deadline = Date.now() + 120_000
  let lastStatus = 'unknown'

  while (Date.now() < deadline) {
    const status = run(
      'docker',
      [
        'inspect',
        '--format',
        '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}',
        containerId,
      ],
      {
        capture: true,
        label: 'docker inspect postgres health',
      },
    ).stdout.trim()

    lastStatus = status

    if (status === 'healthy') {
      log('PostgreSQL is healthy.')
      return
    }

    await delay(2_000)
  }

  fail(`PostgreSQL did not become healthy within 120 seconds. Last status: ${lastStatus}.`)
}

function delay(milliseconds) {
  return new Promise((resolveDelay) => {
    setTimeout(resolveDelay, milliseconds)
  })
}

export function migrationStatusHasPending(output) {
  if (/\bno\s+pending\s+migrations\s+found\b/i.test(output)) {
    return false
  }

  const tableRows = output
    .split(/\r?\n/)
    .filter((line) => line.includes('│'))
    .map((line) =>
      line
        .split('│')
        .slice(1, -1)
        .map((column) => column.trim()),
    )
    .filter((columns) => columns.length >= 3 && columns[0] && columns[0] !== 'Name')

  if (tableRows.some((columns) => /^no$/i.test(columns[2]))) {
    return true
  }

  if (tableRows.length > 0) {
    return false
  }

  return /\bpending\b/i.test(output)
}

function migrationStatus() {
  return run('pnpm', ['db:migrate:status'], {
    capture: true,
    label: 'pnpm db:migrate:status',
  })
}

function writeCapturedOutput(result) {
  if (result.stdout) process.stdout.write(result.stdout)
  if (result.stderr) process.stderr.write(result.stderr)
}

export function runMigrationsIfNeeded(options = {}) {
  const logger = options.logger ?? log
  const getMigrationStatus = options.getMigrationStatus ?? migrationStatus
  const migrate =
    options.migrate ?? (() => run('pnpm', ['db:migrate'], { label: 'pnpm db:migrate' }))
  const writeOutput = options.writeOutput ?? writeCapturedOutput

  logger('Checking migration status...')
  const firstStatus = getMigrationStatus()
  writeOutput(firstStatus)

  if (migrationStatusHasPending(firstStatus.stdout ?? '')) {
    logger('Pending migrations found; applying them...')
    migrate()
  } else {
    logger('No pending migrations found.')
  }

  logger('Verifying migration status...')
  const finalStatus = getMigrationStatus()
  writeOutput(finalStatus)

  if (migrationStatusHasPending(finalStatus.stdout ?? '')) {
    fail('Migrations are still pending after pnpm db:migrate.')
  }
}

function relativePath(absolutePath) {
  return absolutePath.replace(`${repoRoot}/`, '')
}

export async function runSetupSequence(options = {}) {
  const logger = options.logger ?? log
  const verifyToolsStep = options.verifyToolsStep ?? verifyTools
  const verifyNodeVersionStep = options.verifyNodeVersionStep ?? verifyNodeVersion
  const ensureRootEnvStep =
    options.ensureRootEnvStep ??
    (() => ensureEnvFile(resolve(repoRoot, '.env'), resolve(repoRoot, '.env.example'), logger))
  const ensureAdminEnvStep =
    options.ensureAdminEnvStep ??
    (() =>
      ensureEnvFile(
        resolve(repoRoot, 'apps/admin/.env'),
        resolve(repoRoot, 'apps/admin/.env.example'),
        logger,
      ))
  const ensurePayloadSecretStep =
    options.ensurePayloadSecretStep ??
    (() =>
      ensurePayloadSecret(
        resolve(repoRoot, 'apps/admin/.env'),
        resolve(repoRoot, 'apps/admin/.env.example'),
        logger,
      ))
  const ensureDependenciesStep = options.ensureDependenciesStep ?? ensureDependencies
  const startPostgresStep = options.startPostgresStep ?? startPostgres
  const waitForPostgresStep = options.waitForPostgresStep ?? waitForPostgres
  const runMigrationsStep = options.runMigrationsStep ?? runMigrationsIfNeeded

  logger('Preparing AssoStack for local development...')
  verifyToolsStep()
  verifyNodeVersionStep()
  ensureRootEnvStep()
  ensureAdminEnvStep()
  ensurePayloadSecretStep()
  ensureDependenciesStep()
  startPostgresStep()
  await waitForPostgresStep()
  runMigrationsStep()

  logger('')
  logger('Local setup complete.')
  logger('Start the apps with: pnpm dev')
  logger('Admin: http://localhost:3001/admin')
  logger('Web: http://localhost:4321')
}

export async function setupLocal() {
  await runSetupSequence()
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  setupLocal().catch((error) => {
    console.error(error.message)
    process.exit(1)
  })
}
