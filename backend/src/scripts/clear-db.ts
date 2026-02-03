import { pool } from '../db/pool.js'

async function clear() {
  try {
    console.log('Clearing watchlist...')
    await pool.query('DELETE FROM watchlist')
    console.log('Watchlist cleared.')

    console.log('Clearing vessels...')
    await pool.query('DELETE FROM vessels')
    console.log('Vessels cleared.')

    process.exit(0)
  } catch (err) {
    console.error('Failed to clear DB', err)
    process.exit(1)
  }
}

clear()
