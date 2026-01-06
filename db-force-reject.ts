
import { storage } from "./server/storage";
import { db } from "./server/db";
import { targetItems, users, targets } from "./shared/schema";
import { eq, and, sql } from "drizzle-orm";

async function forceReject() {
    try {
        const userId = "cabfa322-04df-4784-8d48-96b1074c2ec5"; // Umar
        const month = "2026-01";
        console.log("--- SIMULATING REJECTION CYCLE FOR JAN 2026 ---");

        // 1. Get or create target
        let target = await storage.getTargetByUserAndMonth(userId, month);
        if (!target) {
            target = await storage.createTarget({ userId, month });
            console.log("Created target for Jan 2026");
        }

        // 2. Create item
        const item = await storage.createTargetItem({
            targetId: target.id,
            userId,
            type: "meeting",
            name: "TEST CLIENT JAN",
            source: "Upwork",
            clientType: "B2B",
            date: "2026-01-06",
        });
        console.log("Created Item ID:", item.id);

        // 3. Reject item
        console.log("Rejecting item...");
        await storage.updateTargetItem(item.id, { isRejected: true });

        // 4. Fetch summary (internal logic)
        const items = await storage.getTargetItemsByUserAndMonth(userId, month);
        console.log("Items fetched for Jan 2026:", items.length);
        const testItem = items.find(i => i.id === item.id);
        console.log("Test Item isRejected (type):", typeof testItem?.isRejected);
        console.log("Test Item isRejected (value):", testItem?.isRejected);

        const rejectedCount = items.filter(i => i.type === "meeting" && !!i.isRejected).length;
        console.log("Calculated Rejected Count:", rejectedCount);

        // 5. Cleanup
        await db.delete(targetItems).where(eq(targetItems.id, item.id));
        console.log("Cleanup complete");

        process.exit(0);
    } catch (err) {
        console.error("Error:", err);
        process.exit(1);
    }
}

forceReject();
