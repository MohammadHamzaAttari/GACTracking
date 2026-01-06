
import { storage } from "./server/storage";
import { db } from "./server/db";
import { targetItems } from "./shared/schema";
import { eq, sql } from "drizzle-orm";

async function debug() {
    try {
        console.log("--- FINDING AN ITEM ---");
        const items = await db.select().from(targetItems).limit(1);
        if (items.length === 0) {
            console.log("No items found in target_items");
            process.exit(0);
        }
        const item = items[0];
        console.log("Original Item:", JSON.stringify(item, null, 2));

        console.log("\n--- REJECTING ITEM ---");
        const updated = await storage.updateTargetItem(item.id, {
            isRejected: true,
            verified: false
        });
        console.log("Updated Item (from return):", JSON.stringify(updated, null, 2));

        console.log("\n--- FETCHING VIA DRIZZLE DIRECTLY ---");
        const direct = await db.select().from(targetItems).where(eq(targetItems.id, item.id));
        console.log("Direct Fetch:", JSON.stringify(direct[0], null, 2));

        console.log("\n--- FETCHING VIA STORAGE METHOD (getAllTargetItemsForMonth) ---");
        const month = item.date.toString().slice(0, 7);
        const monthItems = await storage.getAllTargetItemsForMonth(month);
        const storageFound = monthItems.find(i => i.id === item.id);
        console.log("Storage Method Fetch:", JSON.stringify(storageFound, null, 2));

        console.log("\n--- CLEANUP (Resetting) ---");
        await storage.updateTargetItem(item.id, { isRejected: false });
        console.log("Reset successful");

        process.exit(0);
    } catch (err) {
        console.error("Error:", err);
        process.exit(1);
    }
}

debug();
