import { db } from "./db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";

const SALT_ROUNDS = 10;

async function seed() {
  console.log("Seeding database...");

  const existingAdmin = await db
    .select()
    .from(users)
    .where(eq(users.username, "admin"))
    .limit(1);

  if (existingAdmin.length === 0) {
    const hashedPassword = await bcrypt.hash("admin123", SALT_ROUNDS);
    await db.insert(users).values({
      username: "admin",
      password: hashedPassword,
      firstName: "System",
      lastName: "Administrator",
      email: "admin@gactrackings.com",
      role: "admin",
      department: "Administration",
      position: "System Admin",
      isActive: true,
    });
    console.log("Default admin user created (admin/admin123)");
  } else {
    console.log("Admin user already exists, updating password to hashed version...");
    const hashedPassword = await bcrypt.hash("admin123", SALT_ROUNDS);
    await db.update(users)
      .set({ password: hashedPassword })
      .where(eq(users.username, "admin"));
    console.log("Admin password updated to hashed version");
  }

  // Create a default employee user
  const existingEmployee = await db
    .select()
    .from(users)
    .where(eq(users.username, "hamza.dev"))
    .limit(1);

  if (existingEmployee.length === 0) {
    const hashedPassword = await bcrypt.hash("employee123", SALT_ROUNDS);
    await db.insert(users).values({
      username: "hamza.dev",
      password: hashedPassword,
      firstName: "Hamza",
      lastName: "Dev",
      email: "hamza.dev@gactrackings.com",
      role: "employee",
      department: "Development",
      position: "Employee",
      shiftType: "two_shifts",
      isActive: true,
    });
    console.log("Default employee user created (hamza.dev/employee123)");
  } else {
    console.log("Employee user already exists.");
  }

  console.log("Seeding complete!");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seeding failed:", err);
  process.exit(1);
});
