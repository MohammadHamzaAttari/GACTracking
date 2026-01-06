// migrate.js
import { Pool } from 'pg';

async function migrate() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  console.log('Running migration...');

  try {
    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS morning_shift_start TEXT,
      ADD COLUMN IF NOT EXISTS morning_shift_end TEXT,
      ADD COLUMN IF NOT EXISTS evening_shift_start TEXT,
      ADD COLUMN IF NOT EXISTS evening_shift_end TEXT
    `);
    
    console.log('✅ Migration successful!');
    
    // Verify
    const result = await pool.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name LIKE '%shift%'
    `);
    
    console.log('Shift columns:', result.rows.map(r => r.column_name));
  } catch (error) {
    console.error('Migration error:', error.message);
  } finally {
    await pool.end();
  }
}

migrate();