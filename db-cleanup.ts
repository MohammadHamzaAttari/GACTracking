
import { db } from "./server/db";
import { targetItems } from "./shared/schema";
import { sql } from "drizzle-orm";

async function cleanup() {
    try {
        console.log("All Target Items (latest 20):");
        const items = await db.execute(sql`SELECT id, name, date, is_rejected, type FROM target_items ORDER BY date DESC LIMIT 20`);
        console.log(JSON.stringify(items.rows, null, 2));

        console.log("\nCounts by is_rejected:");
        const counts = await db.execute(sql`SELECT is_rejected, count(*) FROM target_items GROUP BY is_rejected`);
        console.log(JSON.stringify(counts.rows, null, 2));

        process.exit(0);
    } catch (err) {
        console.error("Error:", err);
        process.exit(1);
    }
}

cleanup();
