import pg from 'pg'
import {
  AI_PLAYER_RUNTIME_MODEL_DISPATCH_POSTGRES_MIGRATION_SQL,
  applyAiPlayerRuntimeModelDispatchPostgresMigration,
} from '../application/ai/aiPlayerRuntimeModelDispatchStore'

const DATABASE_URL_ENV = 'AI_PLAYER_RUNTIME_MODEL_DISPATCH_POSTGRES_DATABASE_URL'

function usage() {
  return [
    'Usage:',
    '  tsx server/src/evals/runAiRuntimeModelDispatchPostgres.ts --print-migration',
    '  tsx server/src/evals/runAiRuntimeModelDispatchPostgres.ts --migrate',
  ].join('\n')
}

function readDatabaseUrl() {
  const value = process.env[DATABASE_URL_ENV]?.trim() || process.env.DATABASE_URL?.trim()
  if (!value) {
    throw new Error(`${DATABASE_URL_ENV} or DATABASE_URL is required`)
  }
  return value
}

async function run() {
  const command = process.argv.slice(2).find((item) => item === '--print-migration' || item === '--migrate')
  if (!command) {
    throw new Error(usage())
  }

  if (command === '--print-migration') {
    console.log(JSON.stringify({
      ok: true,
      command: 'print-migration',
      migrationSql: AI_PLAYER_RUNTIME_MODEL_DISPATCH_POSTGRES_MIGRATION_SQL,
    }))
    return
  }

  const pool = new pg.Pool({
    connectionString: readDatabaseUrl(),
    max: 4,
    application_name: 'ai-player-runtime-model-dispatch-migration',
  })
  try {
    await applyAiPlayerRuntimeModelDispatchPostgresMigration(pool)
    console.log(JSON.stringify({
      ok: true,
      command: 'migrate',
      store: 'ai-player-runtime-model-dispatch-postgres',
    }))
  } finally {
    await pool.end()
  }
}

run().catch((error: unknown) => {
  console.error(JSON.stringify({
    ok: false,
    error: error instanceof Error ? error.message : String(error),
  }))
  process.exit(1)
})
