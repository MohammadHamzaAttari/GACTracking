// server/run-migration.ts
import { Pool } from "pg";

async function runMigration() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  console.log("🔄 Running database migration...\n");

  const queries = [
    {
      name: "morning_shift_start",
      sql: "ALTER TABLE users ADD COLUMN IF NOT EXISTS morning_shift_start TEXT",
    },
    {
      name: "morning_shift_end", 
      sql: "ALTER TABLE users ADD COLUMN IF NOT EXISTS morning_shift_end TEXT",
    },
    {
      name: "evening_shift_start",
      sql: "ALTER TABLE users ADD COLUMN IF NOT EXISTS evening_shift_start TEXT",
    },
    {
      name: "evening_shift_end",
      sql: "ALTER TABLE users ADD COLUMN IF NOT EXISTS evening_shift_end TEXT",
    },
  ];

  try {
    for (const query of queries) {
      await pool.query(query.sql);
      console.log(`✅ Added column: ${query.name}`);
    }

    // Verify columns
    const result = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name LIKE '%shift%'
      ORDER BY column_name
    `);

    console.log("\n📋 Current shift-related columns:");
    console.table(result.rows);

    console.log("\n✅ Migration completed successfully!");
  } catch (error) {
    console.error("❌ Migration failed:", error);
  } finally {
    await pool.end();
  }
}

runMigration();