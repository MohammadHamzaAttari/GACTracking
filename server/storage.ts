import { 
  users, 
  shifts,
  breaks,
  targets,
  targetItems,
  activityLogs,
  wasenderConfig,
  departments,
  type User, 
  type InsertUser,
  type Shift,
  type InsertShift,
  type Break,
  type InsertBreak,
  type Target,
  type InsertTarget,
  type TargetItem,
  type InsertTargetItem,
  type ActivityLog,
  type InsertActivityLog,
  type WasenderConfig,
  type InsertWasenderConfig,
  type Department,
  type InsertDepartment,
  type SafeUser,
  BREAK_LIMITS
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, sql, inArray } from "drizzle-orm";

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, data: Partial<InsertUser>): Promise<User | undefined>;
  deleteUser(id: string): Promise<void>;
  getAllUsers(): Promise<SafeUser[]>;
  getUsersByRole(role: string): Promise<SafeUser[]>;
  getUsersByDepartment(department: string): Promise<SafeUser[]>;
  
  // Shift methods
  getShiftById(id: string): Promise<Shift | undefined>;
  getShiftByUserAndDate(userId: string, date: string): Promise<Shift | undefined>;
  createShift(shift: InsertShift): Promise<Shift>;
  updateShift(id: string, data: Partial<InsertShift>): Promise<Shift | undefined>;
  getShiftsByUser(userId: string): Promise<Shift[]>;
  getTodayShifts(): Promise<(Shift & { user: SafeUser; breaks: Break[] })[]>;
  
  // Break methods
  getBreakById(id: string): Promise<Break | undefined>;
  createBreak(breakRecord: InsertBreak): Promise<Break>;
  updateBreak(id: string, data: Partial<InsertBreak>): Promise<Break | undefined>;
  getBreaksByShift(shiftId: string): Promise<Break[]>;
  getBreaksByUserAndDate(userId: string, date: string): Promise<Break[]>;
  getActiveBreak(userId: string): Promise<Break | undefined>;
  countBreaksByType(userId: string, date: string, type: string, shiftPeriod?: string): Promise<number>;
  
  // Target methods
  getTargetById(id: string): Promise<Target | undefined>;
  getTargetByUserAndMonth(userId: string, month: string): Promise<Target | undefined>;
  createTarget(target: InsertTarget): Promise<Target>;
  updateTarget(id: string, data: Partial<InsertTarget>): Promise<Target | undefined>;
  getAllTargetsForMonth(month: string): Promise<(Target & { user: SafeUser })[]>;
  
  // Target item methods
  getTargetItemById(id: string): Promise<TargetItem | undefined>;
  createTargetItem(item: InsertTargetItem): Promise<TargetItem>;
  updateTargetItem(id: string, data: Partial<InsertTargetItem>): Promise<TargetItem | undefined>;
  getTargetItemsByTarget(targetId: string): Promise<TargetItem[]>;
  getAllTargetItemsForMonth(month: string): Promise<(TargetItem & { user: SafeUser })[]>;
  
  // Activity log methods
  createActivityLog(log: InsertActivityLog): Promise<ActivityLog>;
  getActivityLogsByUser(userId: string, date?: string): Promise<ActivityLog[]>;
  getRecentActivityLogs(limit?: number): Promise<(ActivityLog & { user: SafeUser })[]>;
  
  // WASENDER config methods
  getWasenderConfig(): Promise<WasenderConfig | undefined>;
  updateWasenderConfig(data: Partial<InsertWasenderConfig>): Promise<WasenderConfig>;
  
  // Department methods
  getDepartments(): Promise<Department[]>;
  updateDepartment(id: string, data: Partial<InsertDepartment>): Promise<Department | undefined>;
  
  // Dashboard stats
  getDashboardStats(): Promise<{
    totalEmployees: number;
    activeWorking: number;
    onBreak: number;
    notStarted: number;
  }>;
  
  // Analytics methods
  getAttendanceAnalytics(startDate?: string, endDate?: string): Promise<{
    totalShifts: number;
    onTimeRate: number;
    avgWorkHours: number;
    breakStats: { type: string; count: number; avgDuration: number }[];
  }>;
  getDepartmentStats(): Promise<{ department: string; count: number; activeToday: number }[]>;
}

// PostgreSQL Database Storage
export class DatabaseStorage implements IStorage {
  // User methods
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(id: string, data: Partial<InsertUser>): Promise<User | undefined> {
    const [user] = await db.update(users).set(data).where(eq(users.id, id)).returning();
    return user || undefined;
  }

  async deleteUser(id: string): Promise<void> {
    await db.delete(activityLogs).where(eq(activityLogs.userId, id));
    await db.delete(breaks).where(eq(breaks.userId, id));
    await db.delete(shifts).where(eq(shifts.userId, id));
    await db.delete(users).where(eq(users.id, id));
  }

  async getAllUsers(): Promise<SafeUser[]> {
    const allUsers = await db.select({
      id: users.id,
      username: users.username,
      firstName: users.firstName,
      lastName: users.lastName,
      email: users.email,
      role: users.role,
      department: users.department,
      position: users.position,
      salary: users.salary,
      status: users.status,
      shiftType: users.shiftType,
      shiftStartTime: users.shiftStartTime,
      shiftEndTime: users.shiftEndTime,
      phone: users.phone,
      whatsappPreference: users.whatsappPreference,
      address: users.address,
      emergencyContact: users.emergencyContact,
      isActive: users.isActive,
      createdAt: users.createdAt,
    }).from(users).orderBy(desc(users.createdAt));
    return allUsers as SafeUser[];
  }

  async getUsersByRole(role: string): Promise<SafeUser[]> {
    const roleUsers = await db.select({
      id: users.id,
      username: users.username,
      firstName: users.firstName,
      lastName: users.lastName,
      email: users.email,
      role: users.role,
      department: users.department,
      position: users.position,
      salary: users.salary,
      status: users.status,
      shiftType: users.shiftType,
      shiftStartTime: users.shiftStartTime,
      shiftEndTime: users.shiftEndTime,
      phone: users.phone,
      whatsappPreference: users.whatsappPreference,
      address: users.address,
      emergencyContact: users.emergencyContact,
      isActive: users.isActive,
      createdAt: users.createdAt,
    }).from(users).where(eq(users.role, role));
    return roleUsers as SafeUser[];
  }

  async getUsersByDepartment(department: string): Promise<SafeUser[]> {
    const deptUsers = await db.select({
      id: users.id,
      username: users.username,
      firstName: users.firstName,
      lastName: users.lastName,
      email: users.email,
      role: users.role,
      department: users.department,
      position: users.position,
      salary: users.salary,
      status: users.status,
      shiftType: users.shiftType,
      shiftStartTime: users.shiftStartTime,
      shiftEndTime: users.shiftEndTime,
      phone: users.phone,
      whatsappPreference: users.whatsappPreference,
      address: users.address,
      emergencyContact: users.emergencyContact,
      isActive: users.isActive,
      createdAt: users.createdAt,
    }).from(users).where(eq(users.department, department));
    return deptUsers as SafeUser[];
  }

  // Shift methods
  async getShiftById(id: string): Promise<Shift | undefined> {
    const [shift] = await db.select().from(shifts).where(eq(shifts.id, id));
    return shift || undefined;
  }

  async getShiftByUserAndDate(userId: string, date: string): Promise<Shift | undefined> {
    const [shift] = await db
      .select()
      .from(shifts)
      .where(and(eq(shifts.userId, userId), eq(shifts.date, date)));
    return shift || undefined;
  }

  async createShift(shift: InsertShift): Promise<Shift> {
    const [newShift] = await db.insert(shifts).values(shift).returning();
    return newShift;
  }

  async updateShift(id: string, data: Partial<InsertShift>): Promise<Shift | undefined> {
    const [shift] = await db.update(shifts).set(data).where(eq(shifts.id, id)).returning();
    return shift || undefined;
  }

  async getShiftsByUser(userId: string): Promise<Shift[]> {
    return await db
      .select()
      .from(shifts)
      .where(eq(shifts.userId, userId))
      .orderBy(desc(shifts.date));
  }

  async getTodayShifts(): Promise<(Shift & { user: SafeUser; breaks: Break[] })[]> {
    const today = new Date().toISOString().split("T")[0];
    const records = await db
      .select({
        id: shifts.id,
        userId: shifts.userId,
        date: shifts.date,
        morningClockIn: shifts.morningClockIn,
        morningClockOut: shifts.morningClockOut,
        morningLateMinutes: shifts.morningLateMinutes,
        eveningClockIn: shifts.eveningClockIn,
        eveningClockOut: shifts.eveningClockOut,
        eveningLateMinutes: shifts.eveningLateMinutes,
        status: shifts.status,
        notes: shifts.notes,
        createdAt: shifts.createdAt,
        user: {
          id: users.id,
          username: users.username,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
          role: users.role,
          department: users.department,
          position: users.position,
          salary: users.salary,
          status: users.status,
          shiftType: users.shiftType,
          shiftStartTime: users.shiftStartTime,
          shiftEndTime: users.shiftEndTime,
          phone: users.phone,
          whatsappPreference: users.whatsappPreference,
          address: users.address,
          emergencyContact: users.emergencyContact,
          isActive: users.isActive,
          createdAt: users.createdAt,
        },
      })
      .from(shifts)
      .leftJoin(users, eq(shifts.userId, users.id))
      .where(eq(shifts.date, today));
    
    // Fetch breaks for all shifts
    const shiftIds = records.map(r => r.id);
    const allBreaks = shiftIds.length > 0 
      ? await db.select().from(breaks).where(inArray(breaks.shiftId, shiftIds))
      : [];
    
    // Merge breaks into shifts
    const shiftsWithBreaks = records.map(shift => ({
      ...shift,
      breaks: allBreaks.filter(b => b.shiftId === shift.id),
    }));
    
    return shiftsWithBreaks as (Shift & { user: SafeUser; breaks: Break[] })[];
  }

  // Break methods
  async getBreakById(id: string): Promise<Break | undefined> {
    const [breakRecord] = await db.select().from(breaks).where(eq(breaks.id, id));
    return breakRecord || undefined;
  }

  async createBreak(breakRecord: InsertBreak): Promise<Break> {
    const [newBreak] = await db.insert(breaks).values(breakRecord).returning();
    return newBreak;
  }

  async updateBreak(id: string, data: Partial<InsertBreak>): Promise<Break | undefined> {
    const [breakRecord] = await db.update(breaks).set(data).where(eq(breaks.id, id)).returning();
    return breakRecord || undefined;
  }

  async getBreaksByShift(shiftId: string): Promise<Break[]> {
    return await db.select().from(breaks).where(eq(breaks.shiftId, shiftId));
  }

  async getBreaksByUserAndDate(userId: string, date: string): Promise<Break[]> {
    return await db
      .select()
      .from(breaks)
      .where(and(eq(breaks.userId, userId), eq(breaks.date, date)))
      .orderBy(desc(breaks.startTime));
  }

  async getActiveBreak(userId: string): Promise<Break | undefined> {
    const today = new Date().toISOString().split("T")[0];
    const [activeBreak] = await db
      .select()
      .from(breaks)
      .where(and(
        eq(breaks.userId, userId),
        eq(breaks.date, today),
        sql`${breaks.endTime} IS NULL`
      ));
    return activeBreak || undefined;
  }

  async countBreaksByType(userId: string, date: string, type: string, shiftPeriod?: string): Promise<number> {
    const conditions = [
      eq(breaks.userId, userId),
      eq(breaks.date, date),
      eq(breaks.type, type)
    ];
    
    if (shiftPeriod) {
      conditions.push(eq(breaks.shiftPeriod, shiftPeriod));
    }
    
    const [result] = await db
      .select({ count: sql<number>`count(*)` })
      .from(breaks)
      .where(and(...conditions));
    
    return Number(result?.count || 0);
  }

  // Target methods
  async getTargetById(id: string): Promise<Target | undefined> {
    const [target] = await db.select().from(targets).where(eq(targets.id, id));
    return target || undefined;
  }

  async getTargetByUserAndMonth(userId: string, month: string): Promise<Target | undefined> {
    const [target] = await db
      .select()
      .from(targets)
      .where(and(eq(targets.userId, userId), eq(targets.month, month)));
    return target || undefined;
  }

  async createTarget(target: InsertTarget): Promise<Target> {
    const [newTarget] = await db.insert(targets).values(target).returning();
    return newTarget;
  }

  async updateTarget(id: string, data: Partial<InsertTarget>): Promise<Target | undefined> {
    const [target] = await db.update(targets).set(data).where(eq(targets.id, id)).returning();
    return target || undefined;
  }

  // Target item methods
  async getTargetItemById(id: string): Promise<TargetItem | undefined> {
    const [item] = await db.select().from(targetItems).where(eq(targetItems.id, id));
    return item || undefined;
  }

  async createTargetItem(item: InsertTargetItem): Promise<TargetItem> {
    const [newItem] = await db.insert(targetItems).values(item).returning();
    return newItem;
  }

  async updateTargetItem(id: string, data: Partial<InsertTargetItem>): Promise<TargetItem | undefined> {
    const [item] = await db.update(targetItems).set(data).where(eq(targetItems.id, id)).returning();
    return item || undefined;
  }

  async getTargetItemsByTarget(targetId: string): Promise<TargetItem[]> {
    return await db.select().from(targetItems).where(eq(targetItems.targetId, targetId));
  }

  // Activity log methods
  async createActivityLog(log: InsertActivityLog): Promise<ActivityLog> {
    const [newLog] = await db.insert(activityLogs).values(log).returning();
    return newLog;
  }

  async getActivityLogsByUser(userId: string, date?: string): Promise<ActivityLog[]> {
    if (date) {
      return await db
        .select()
        .from(activityLogs)
        .where(and(
          eq(activityLogs.userId, userId),
          sql`DATE(${activityLogs.timestamp}) = ${date}`
        ))
        .orderBy(desc(activityLogs.timestamp));
    }
    return await db
      .select()
      .from(activityLogs)
      .where(eq(activityLogs.userId, userId))
      .orderBy(desc(activityLogs.timestamp));
  }

  async getRecentActivityLogs(limit = 50): Promise<(ActivityLog & { user: SafeUser })[]> {
    const logs = await db
      .select({
        id: activityLogs.id,
        userId: activityLogs.userId,
        action: activityLogs.action,
        details: activityLogs.details,
        timestamp: activityLogs.timestamp,
        createdAt: activityLogs.createdAt,
        user: {
          id: users.id,
          username: users.username,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
          role: users.role,
          department: users.department,
          position: users.position,
          salary: users.salary,
          status: users.status,
          shiftType: users.shiftType,
          shiftStartTime: users.shiftStartTime,
          shiftEndTime: users.shiftEndTime,
          phone: users.phone,
          whatsappPreference: users.whatsappPreference,
          address: users.address,
          emergencyContact: users.emergencyContact,
          isActive: users.isActive,
          createdAt: users.createdAt,
        },
      })
      .from(activityLogs)
      .leftJoin(users, eq(activityLogs.userId, users.id))
      .orderBy(desc(activityLogs.timestamp))
      .limit(limit);
    
    return logs as (ActivityLog & { user: SafeUser })[];
  }

  // WASENDER config methods
  async getWasenderConfig(): Promise<WasenderConfig | undefined> {
    const [config] = await db.select().from(wasenderConfig).limit(1);
    return config || undefined;
  }

  async updateWasenderConfig(data: Partial<InsertWasenderConfig>): Promise<WasenderConfig> {
    const existing = await this.getWasenderConfig();
    if (existing) {
      const [updated] = await db
        .update(wasenderConfig)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(wasenderConfig.id, existing.id))
        .returning();
      return updated;
    } else {
      const [created] = await db.insert(wasenderConfig).values(data).returning();
      return created;
    }
  }

  // Department methods
  async getDepartments(): Promise<Department[]> {
    return await db.select().from(departments);
  }

  async updateDepartment(id: string, data: Partial<InsertDepartment>): Promise<Department | undefined> {
    const [dept] = await db.update(departments).set(data).where(eq(departments.id, id)).returning();
    return dept || undefined;
  }

  // Dashboard stats
  async getDashboardStats(): Promise<{
    totalEmployees: number;
    activeWorking: number;
    onBreak: number;
    notStarted: number;
  }> {
    const today = new Date().toISOString().split("T")[0];
    
    const allEmployees = await db
      .select()
      .from(users)
      .where(and(eq(users.role, "employee"), eq(users.status, "active")));
    
    const totalEmployees = allEmployees.length;
    
    const todayShifts = await db
      .select()
      .from(shifts)
      .where(eq(shifts.date, today));
    
    let activeWorking = 0;
    let onBreak = 0;
    
    for (const shift of todayShifts) {
      const activeBreak = await this.getActiveBreak(shift.userId);
      if (activeBreak) {
        onBreak++;
      } else if (shift.morningClockIn || shift.eveningClockIn) {
        activeWorking++;
      }
    }
    
    const notStarted = totalEmployees - todayShifts.length;
    
    return {
      totalEmployees,
      activeWorking,
      onBreak,
      notStarted,
    };
  }

  // Get all targets for a month with user info
  async getAllTargetsForMonth(month: string): Promise<(Target & { user: SafeUser })[]> {
    const records = await db
      .select({
        id: targets.id,
        userId: targets.userId,
        month: targets.month,
        meetingTarget: targets.meetingTarget,
        orderTarget: targets.orderTarget,
        createdAt: targets.createdAt,
        user: {
          id: users.id,
          username: users.username,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
          role: users.role,
          department: users.department,
          position: users.position,
          salary: users.salary,
          status: users.status,
          shiftType: users.shiftType,
          shiftStartTime: users.shiftStartTime,
          shiftEndTime: users.shiftEndTime,
          phone: users.phone,
          whatsappPreference: users.whatsappPreference,
          address: users.address,
          emergencyContact: users.emergencyContact,
          isActive: users.isActive,
          createdAt: users.createdAt,
        },
      })
      .from(targets)
      .leftJoin(users, eq(targets.userId, users.id))
      .where(eq(targets.month, month));
    
    return records as (Target & { user: SafeUser })[];
  }

  // Get all target items for a month with user info
  async getAllTargetItemsForMonth(month: string): Promise<(TargetItem & { user: SafeUser })[]> {
    const startDate = `${month}-01`;
    const endDate = `${month}-31`;
    
    const records = await db
      .select({
        id: targetItems.id,
        targetId: targetItems.targetId,
        userId: targetItems.userId,
        type: targetItems.type,
        name: targetItems.name,
        source: targetItems.source,
        contactLink: targetItems.contactLink,
        date: targetItems.date,
        verified: targetItems.verified,
        verifiedAt: targetItems.verifiedAt,
        verifiedBy: targetItems.verifiedBy,
        createdAt: targetItems.createdAt,
        user: {
          id: users.id,
          username: users.username,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
          role: users.role,
          department: users.department,
          position: users.position,
          salary: users.salary,
          status: users.status,
          shiftType: users.shiftType,
          shiftStartTime: users.shiftStartTime,
          shiftEndTime: users.shiftEndTime,
          phone: users.phone,
          whatsappPreference: users.whatsappPreference,
          address: users.address,
          emergencyContact: users.emergencyContact,
          isActive: users.isActive,
          createdAt: users.createdAt,
        },
      })
      .from(targetItems)
      .leftJoin(users, eq(targetItems.userId, users.id))
      .where(and(
        sql`${targetItems.date} >= ${startDate}`,
        sql`${targetItems.date} <= ${endDate}`
      ))
      .orderBy(desc(targetItems.createdAt));
    
    return records as (TargetItem & { user: SafeUser })[];
  }

  // Analytics: Attendance stats
  async getAttendanceAnalytics(startDate?: string, endDate?: string): Promise<{
    totalShifts: number;
    onTimeRate: number;
    avgWorkHours: number;
    breakStats: { type: string; count: number; avgDuration: number }[];
  }> {
    const today = new Date().toISOString().split("T")[0];
    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const end = endDate || today;
    
    const allShifts = await db
      .select()
      .from(shifts)
      .where(and(
        sql`${shifts.date} >= ${start}`,
        sql`${shifts.date} <= ${end}`
      ));
    
    const totalShifts = allShifts.length;
    const onTimeShifts = allShifts.filter(s => 
      (s.morningLateMinutes === 0 || s.morningLateMinutes === null) &&
      (s.eveningLateMinutes === 0 || s.eveningLateMinutes === null)
    ).length;
    const onTimeRate = totalShifts > 0 ? Math.round((onTimeShifts / totalShifts) * 100) : 0;
    
    const avgWorkHours = 8;
    
    const allBreaks = await db
      .select()
      .from(breaks)
      .where(and(
        sql`${breaks.date} >= ${start}`,
        sql`${breaks.date} <= ${end}`
      ));
    
    const breakStats = [
      { type: "prayer", count: 0, totalDuration: 0 },
      { type: "meal", count: 0, totalDuration: 0 },
      { type: "urgent", count: 0, totalDuration: 0 },
    ];
    
    for (const b of allBreaks) {
      const stat = breakStats.find(s => s.type === b.type);
      if (stat) {
        stat.count++;
        stat.totalDuration += b.durationMinutes || 0;
      }
    }
    
    return {
      totalShifts,
      onTimeRate,
      avgWorkHours,
      breakStats: breakStats.map(s => ({
        type: s.type,
        count: s.count,
        avgDuration: s.count > 0 ? Math.round(s.totalDuration / s.count) : 0,
      })),
    };
  }

  // Analytics: Department stats
  async getDepartmentStats(): Promise<{ department: string; count: number; activeToday: number }[]> {
    const today = new Date().toISOString().split("T")[0];
    
    const allEmployees = await db
      .select()
      .from(users)
      .where(and(eq(users.role, "employee"), eq(users.status, "active")));
    
    const todayShifts = await db
      .select()
      .from(shifts)
      .where(eq(shifts.date, today));
    
    const deptMap: { [key: string]: { count: number; activeToday: number } } = {};
    
    for (const emp of allEmployees) {
      const dept = emp.department || "Unassigned";
      if (!deptMap[dept]) {
        deptMap[dept] = { count: 0, activeToday: 0 };
      }
      deptMap[dept].count++;
      
      const hasShift = todayShifts.some(s => s.userId === emp.id);
      if (hasShift) {
        deptMap[dept].activeToday++;
      }
    }
    
    return Object.entries(deptMap).map(([department, stats]) => ({
      department,
      count: stats.count,
      activeToday: stats.activeToday,
    }));
  }
}

export const storage = new DatabaseStorage();
