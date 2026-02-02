import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { pool } from './pool.js'
import { logger } from '../services/logger.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const migrationsDir = path.resolve(__dirname, '../../../database/migrations')

const ensureMigrationsTable = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      filename TEXT UNIQUE NOT NULL,
      applied_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `)
}

const getMigrationFiles = async (): Promise<string[]> => {
  const files = await fs.readdir(migrationsDir)
  return files.filter((file) => file.endsWith('.sql')).sort()
}

const getAppliedMigrations = async (): Promise<Set<string>> => {
  const result = await pool.query('SELECT filename FROM schema_migrations')
  return new Set(result.rows.map((row) => row.filename as string))
}

const run = async () => {
  await ensureMigrationsTable()
  const [files, applied] = await Promise.all([getMigrationFiles(), getAppliedMigrations()])

  for (const file of files) {
    if (applied.has(file)) continue
    const sql = await fs.readFile(path.join(migrationsDir, file), 'utf8')
    logger.info({ file }, 'Applying migration')
    await pool.query('BEGIN')
    try {
      await pool.query(sql)
      await pool.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [file])
      await pool.query('COMMIT')
    } catch (err) {
      await pool.query('ROLLBACK')
      logger.error({ err, file }, 'Migration failed')
      throw err
    }
  }

  logger.info('Migrations complete')
  await pool.end()
}

run().catch((err) => {
  logger.error({ err }, 'Migration runner failed')
  process.exit(1)
})
