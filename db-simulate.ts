
import { storage } from "./server/storage";
import { db } from "./server/db";
import { targetItems, users } from "./shared/schema";
import { eq, and } from "drizzle-orm";

async function simulate() {
    try {
        const month = "2025-12";
        console.log("Simulating Admin Summary for:", month);

        const allUsers = await storage.getAllUsers();
        const bdEmployees = allUsers.filter(u =>
            u.role === "employee" &&
            u.status === "active" &&
            u.department === "Business Development"
        );
        console.log("BD Employees Found:", bdEmployees.length);

        for (const employee of bdEmployees) {
            console.log(`\nEmployee: ${employee.firstName} ${employee.lastName} (${employee.id})`);
            const items = await storage.getTargetItemsByUserAndMonth(employee.id, month);
            console.log("Total Raw Items:", items.length);

            const meetings = items.filter((i: any) => i.type === "meeting");
            const orders = items.filter((i: any) => i.type === "order");

            console.log("Meetings Count:", meetings.length);
            console.log("Orders Count:", orders.length);

            // Manually reject one for testing
            if (meetings.length > 0) {
                console.log("Rejection check for first meeting:");
                console.log("m.isRejected:", meetings[0].isRejected);
                console.log("!!m.isRejected:", !!meetings[0].isRejected);
            }

            const rejectedMeetings = meetings.filter((m: any) => !!m.isRejected).length;
            console.log("Calculated Rejected Meetings:", rejectedMeetings);
        }

        process.exit(0);
    } catch (err) {
        console.error("Error:", err);
        process.exit(1);
    }
}

simulate();
