import { db } from "./db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";

async function seed() {
  console.log("Seeding database...");

  const existingAdmin = await db
    .select()
    .from(users)
    .where(eq(users.username, "admin"))
    .limit(1);

  if (existingAdmin.length === 0) {
    await db.insert(users).values({
      username: "admin",
      password: "admin123",
      fullName: "System Administrator",
      email: "admin@gactrackings.com",
      role: "admin",
      department: "Administration",
      position: "System Admin",
      isActive: true,
    });
    console.log("Default admin user created (admin/admin123)");
  } else {
    console.log("Admin user already exists");
  }

  console.log("Seeding complete!");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seeding failed:", err);
  process.exit(1);
});
