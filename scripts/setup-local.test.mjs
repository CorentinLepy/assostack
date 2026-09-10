import assert from 'node:assert/strict'
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'

import {
  DEFAULT_SECRET_PLACEHOLDER,
  ensureEnvFile,
  ensurePayloadSecret,
  migrationStatusHasPending,
  readEnvValue,
  runMigrationsIfNeeded,
  runSetupSequence,
  satisfiesNodeEngine,
} from './setup-local.mjs'

function withTempDir(callback) {
  const directory = join(
    tmpdir(),
    `assostack-setup-local-${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
  )
  mkdirSync(directory, { recursive: true })

  try {
    return callback(directory)
  } finally {
    rmSync(directory, { force: true, recursive: true })
  }
}

test('Node engine check uses package-style comparator ranges', () => {
  assert.equal(satisfiesNodeEngine('v24.20.0', '>=24.20.0 <25'), true)
  assert.equal(satisfiesNodeEngine('v24.21.3', '>=24.20.0 <25'), true)
  assert.equal(satisfiesNodeEngine('v24.19.9', '>=24.20.0 <25'), false)
  assert.equal(satisfiesNodeEngine('v25.0.0', '>=24.20.0 <25'), false)
})

test('ensureEnvFile copies the example only when the target is missing', () => {
  withTempDir((directory) => {
    const examplePath = join(directory, '.env.example')
    const targetPath = join(directory, '.env')
    writeFileSync(examplePath, 'VALUE=from-example\n')

    assert.equal(ensureEnvFile(targetPath, examplePath), true)
    assert.equal(readFileSync(targetPath, 'utf8'), 'VALUE=from-example\n')

    writeFileSync(targetPath, 'VALUE=local\n')
    assert.equal(ensureEnvFile(targetPath, examplePath), false)
    assert.equal(readFileSync(targetPath, 'utf8'), 'VALUE=local\n')
  })
})

test('ensurePayloadSecret preserves an existing non-placeholder secret', () => {
  withTempDir((directory) => {
    const examplePath = join(directory, '.env.example')
    const envPath = join(directory, '.env')
    const existingSecret = 'already-local-and-private'
    const messages = []

    writeFileSync(examplePath, `PAYLOAD_SECRET=${DEFAULT_SECRET_PLACEHOLDER}\n`)
    writeFileSync(envPath, `DATABASE_URL=postgresql://example\nPAYLOAD_SECRET=${existingSecret}\n`)

    assert.equal(
      ensurePayloadSecret(envPath, examplePath, (message) => messages.push(message)),
      false,
    )
    assert.equal(readEnvValue(readFileSync(envPath, 'utf8'), 'PAYLOAD_SECRET'), existingSecret)
    assert.equal(messages.join('\n').includes(existingSecret), false)
  })
})

test('ensurePayloadSecret replaces the placeholder without logging the generated secret', () => {
  withTempDir((directory) => {
    const examplePath = join(directory, '.env.example')
    const envPath = join(directory, '.env')
    const messages = []

    writeFileSync(examplePath, `PAYLOAD_SECRET=${DEFAULT_SECRET_PLACEHOLDER}\n`)
    writeFileSync(envPath, `PAYLOAD_SECRET=${DEFAULT_SECRET_PLACEHOLDER}\n`)

    assert.equal(
      ensurePayloadSecret(envPath, examplePath, (message) => messages.push(message)),
      true,
    )

    const generatedSecret = readEnvValue(readFileSync(envPath, 'utf8'), 'PAYLOAD_SECRET')
    assert.ok(generatedSecret)
    assert.notEqual(generatedSecret, DEFAULT_SECRET_PLACEHOLDER)
    assert.equal(messages.join('\n').includes(generatedSecret), false)
  })
})

test('ensurePayloadSecret appends a missing secret', () => {
  withTempDir((directory) => {
    const examplePath = join(directory, '.env.example')
    const envPath = join(directory, '.env')

    writeFileSync(examplePath, `PAYLOAD_SECRET=${DEFAULT_SECRET_PLACEHOLDER}\n`)
    writeFileSync(envPath, 'DATABASE_URL=postgresql://example\n')

    assert.equal(ensurePayloadSecret(envPath, examplePath), true)
    assert.ok(readEnvValue(readFileSync(envPath, 'utf8'), 'PAYLOAD_SECRET'))
  })
})

test('migration status parsing detects pending migrations', () => {
  assert.equal(migrationStatusHasPending('No pending migrations found'), false)
  assert.equal(migrationStatusHasPending('20260906_initial_schema Pending'), true)
  assert.equal(migrationStatusHasPending('20260906_initial_schema Migrated'), false)
  assert.equal(
    migrationStatusHasPending('│ Name │ Batch │ Ran │\n│ 20260906_initial_schema │ 1 │ Yes │'),
    false,
  )
  assert.equal(
    migrationStatusHasPending('│ Name │ Batch │ Ran │\n│ 20260906_initial_schema │   │ No │'),
    true,
  )
})

test('setup sequence waits for PostgreSQL health before checking migrations', async () => {
  const events = []
  const step = (name) => () => events.push(name)

  await runSetupSequence({
    logger: () => {},
    verifyToolsStep: step('verify tools'),
    verifyNodeVersionStep: step('verify node'),
    ensureRootEnvStep: step('root env'),
    ensureAdminEnvStep: step('admin env'),
    ensurePayloadSecretStep: step('payload secret'),
    ensureDependenciesStep: step('dependencies'),
    startPostgresStep: step('start postgres'),
    waitForPostgresStep: async () => {
      events.push('wait postgres start')
      await Promise.resolve()
      events.push('wait postgres done')
    },
    runMigrationsStep: step('migrations'),
  })

  assert.deepEqual(events, [
    'verify tools',
    'verify node',
    'root env',
    'admin env',
    'payload secret',
    'dependencies',
    'start postgres',
    'wait postgres start',
    'wait postgres done',
    'migrations',
  ])
})

test('migration runner applies pending migrations and verifies final status', () => {
  const statuses = [
    { stdout: '20260906_initial_schema Pending\n' },
    { stdout: 'No pending migrations found\n' },
  ]
  let migrateCalls = 0

  runMigrationsIfNeeded({
    logger: () => {},
    getMigrationStatus: () => statuses.shift(),
    migrate: () => {
      migrateCalls += 1
    },
    writeOutput: () => {},
  })

  assert.equal(migrateCalls, 1)
})

test('migration runner skips apply when no migrations are pending', () => {
  let migrateCalls = 0

  runMigrationsIfNeeded({
    logger: () => {},
    getMigrationStatus: () => ({ stdout: 'No pending migrations found\n' }),
    migrate: () => {
      migrateCalls += 1
    },
    writeOutput: () => {},
  })

  assert.equal(migrateCalls, 0)
})
