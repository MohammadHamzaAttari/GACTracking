import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean, date, integer, time } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Departments table
export const departments = pgTable("departments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  whatsappGroupId: text("whatsapp_group_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Users table with enhanced fields for employee management
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email"),
  role: text("role").notNull().default("employee"), // 'admin' or 'employee'
  department: text("department"), // Development, Business Development, Designing Team
  position: text("position"),
  salary: integer("salary"), // Monthly salary in PKR
  status: text("status").notNull().default("active"), // 'active' or 'inactive'
  shiftType: text("shift_type").notNull().default("one_shift"), // 'one_shift', 'two_shifts', 'open'
  shiftStartTime: time("shift_start_time"),
  shiftEndTime: time("shift_end_time"),
  phone: text("phone"),
  whatsappPreference: text("whatsapp_preference").default("both"), // 'both', 'breaks_only', 'shift_reports_only', 'none'
  address: text("address"),
  emergencyContact: text("emergency_contact"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Shifts table for daily clock in/out records (morning/evening shifts)
export const shifts = pgTable("shifts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  date: date("date").notNull(),
  // Morning shift
  morningClockIn: timestamp("morning_clock_in"),
  morningClockOut: timestamp("morning_clock_out"),
  morningLateMinutes: integer("morning_late_minutes").default(0),
  // Evening shift
  eveningClockIn: timestamp("evening_clock_in"),
  eveningClockOut: timestamp("evening_clock_out"),
  eveningLateMinutes: integer("evening_late_minutes").default(0),
  // Status
  status: text("status").notNull().default("not_started"), // 'not_started', 'present', 'absent', 'late', 'half_day'
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Breaks table for tracking employee breaks
export const breaks = pgTable("breaks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  shiftId: varchar("shift_id").references(() => shifts.id),
  date: date("date").notNull(),
  type: text("type").notNull(), // 'prayer', 'meal', 'urgent'
  shiftPeriod: text("shift_period").notNull().default("morning"), // 'morning' or 'evening'
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time"),
  durationMinutes: integer("duration_minutes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Targets table for meetings and orders tracking
export const targets = pgTable("targets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  month: text("month").notNull(), // Format: 'YYYY-MM'
  meetingTarget: integer("meeting_target").default(0),
  orderTarget: integer("order_target").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// Target items (meetings and orders)
export const targetItems = pgTable("target_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  targetId: varchar("target_id").notNull().references(() => targets.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  type: text("type").notNull(), // 'meeting' or 'order'
  name: text("name").notNull(),
  source: text("source"), // 'Top Upwork', 'B2B', etc.
  contactLink: text("contact_link"),
  date: date("date").notNull(),
  verified: boolean("verified").default(false),
  verifiedAt: timestamp("verified_at"),
  verifiedBy: varchar("verified_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Activity logs for tracking all employee actions
export const activityLogs = pgTable("activity_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  action: text("action").notNull(), // 'clock_in', 'clock_out', 'break_start', 'break_end', etc.
  details: text("details"),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

// WASENDER API configuration
export const wasenderConfig = pgTable("wasender_config", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  instanceId: text("instance_id"),
  apiToken: text("api_token"), // Encrypted/stored securely
  isActive: boolean("is_active").default(false),
  lastTested: timestamp("last_tested"),
  updatedAt: timestamp("updated_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  shifts: many(shifts),
  breaks: many(breaks),
  targets: many(targets),
  targetItems: many(targetItems),
  activityLogs: many(activityLogs),
}));

export const shiftsRelations = relations(shifts, ({ one, many }) => ({
  user: one(users, {
    fields: [shifts.userId],
    references: [users.id],
  }),
  breaks: many(breaks),
}));

export const breaksRelations = relations(breaks, ({ one }) => ({
  user: one(users, {
    fields: [breaks.userId],
    references: [users.id],
  }),
  shift: one(shifts, {
    fields: [breaks.shiftId],
    references: [shifts.id],
  }),
}));

export const targetsRelations = relations(targets, ({ one, many }) => ({
  user: one(users, {
    fields: [targets.userId],
    references: [users.id],
  }),
  items: many(targetItems),
}));

export const targetItemsRelations = relations(targetItems, ({ one }) => ({
  target: one(targets, {
    fields: [targetItems.targetId],
    references: [targets.id],
  }),
  user: one(users, {
    fields: [targetItems.userId],
    references: [users.id],
  }),
  verifier: one(users, {
    fields: [targetItems.verifiedBy],
    references: [users.id],
  }),
}));

export const activityLogsRelations = relations(activityLogs, ({ one }) => ({
  user: one(users, {
    fields: [activityLogs.userId],
    references: [users.id],
  }),
}));

// Insert schemas
export const insertDepartmentSchema = createInsertSchema(departments).omit({
  id: true,
  createdAt: true,
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertShiftSchema = createInsertSchema(shifts).omit({
  id: true,
  createdAt: true,
});

export const insertBreakSchema = createInsertSchema(breaks).omit({
  id: true,
  createdAt: true,
});

export const insertTargetSchema = createInsertSchema(targets).omit({
  id: true,
  createdAt: true,
});

export const insertTargetItemSchema = createInsertSchema(targetItems).omit({
  id: true,
  createdAt: true,
});

export const insertActivityLogSchema = createInsertSchema(activityLogs).omit({
  id: true,
  createdAt: true,
});

export const insertWasenderConfigSchema = createInsertSchema(wasenderConfig).omit({
  id: true,
  createdAt: true,
});

// Login schema
export const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
  role: z.enum(["admin", "employee"]),
});

// Types
export type InsertDepartment = z.infer<typeof insertDepartmentSchema>;
export type Department = typeof departments.$inferSelect;

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertShift = z.infer<typeof insertShiftSchema>;
export type Shift = typeof shifts.$inferSelect;

export type InsertBreak = z.infer<typeof insertBreakSchema>;
export type Break = typeof breaks.$inferSelect;

export type InsertTarget = z.infer<typeof insertTargetSchema>;
export type Target = typeof targets.$inferSelect;

export type InsertTargetItem = z.infer<typeof insertTargetItemSchema>;
export type TargetItem = typeof targetItems.$inferSelect;

export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;
export type ActivityLog = typeof activityLogs.$inferSelect;

export type InsertWasenderConfig = z.infer<typeof insertWasenderConfigSchema>;
export type WasenderConfig = typeof wasenderConfig.$inferSelect;

export type LoginData = z.infer<typeof loginSchema>;

// User without password for frontend
export type SafeUser = Omit<User, "password">;

// Break limits configuration
export const BREAK_LIMITS = {
  prayer: { maxPerDay: 3, shiftPeriod: "morning" as const },
  meal: { maxPerDay: 1, shiftPeriod: "any" as const },
  urgent: { maxPerShift: 2, shiftPeriod: "any" as const },
} as const;

// Departments list
export const DEPARTMENTS = [
  "Development",
  "Business Development", 
  "Designing Team",
] as const;

// Shift types
export const SHIFT_TYPES = ["one_shift", "two_shifts", "open"] as const;

// WhatsApp preferences
export const WHATSAPP_PREFERENCES = ["both", "breaks_only", "shift_reports_only", "none"] as const;
