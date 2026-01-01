// server/storage.ts
import { 
  users, 
  shifts,
  breaks,
  targets,
  targetItems,
  activityLogs,
  wasenderConfig,
  departments,
  dailyShiftReports,
  specialRequests,
  requestComments,
  monthlyArchive,
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
  type DailyShiftReport,
  type InsertDailyShiftReport,
  type SpecialRequest,
  type InsertSpecialRequest,
  type RequestComment,
  type InsertRequestComment,
  type MonthlyArchive,
  type InsertMonthlyArchive,
  type SafeUser,
  BREAK_LIMITS
} from "@shared/schema";
import { and, eq, isNull, isNotNull, lt, or, desc, gte, lte, sql, inArray } from "drizzle-orm";
import { db } from "./db";

// Type for shift with user data
export interface ShiftWithUser extends Shift {
  user: SafeUser | null;
  breaks: Break[];
}

export interface IStorage {
  getShiftsByDate(date: string): Promise<ShiftWithUser[]>;
  deleteTargetItem(id: string): Promise<void>;
  getTargetItemsByUserAndMonth(userId: string, month: string): Promise<TargetItem[]>;
  
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
  getShiftsByUser(userId: string, limit?: number): Promise<Shift[]>;
  getTodayShifts(): Promise<(Shift & { user: SafeUser; breaks: Break[] })[]>;
  
  // Break methods
  getBreakById(id: string): Promise<Break | undefined>;
  createBreak(breakRecord: InsertBreak): Promise<Break>;
  updateBreak(id: string, data: Partial<InsertBreak>): Promise<Break | undefined>;
  getBreaksByShift(shiftId: string): Promise<Break[]>;
  getBreaksByUserAndDate(userId: string, date: string): Promise<Break[]>;
  getActiveBreak(userId: string): Promise<Break | undefined>;
  getActiveBreakForDate(userId: string, date: string): Promise<Break | undefined>;
  countBreaksByType(userId: string, date: string, type: string, shiftPeriod?: string): Promise<number>;
  getAllActiveBreaks(userId: string): Promise<Break[]>;
  endStaleBraaks(userId: string, currentDate: string): Promise<number>;
  getBreakStatsForPeriod(userId: string, startDate: string, endDate: string): Promise<{
    totalBreaks: number;
    totalDuration: number;
    byType: { type: string; count: number; duration: number }[];
  }>;
  
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

  // Daily Shift Report methods
  getDailyShiftReport(id: string): Promise<DailyShiftReport | undefined>;
  createDailyShiftReport(report: InsertDailyShiftReport): Promise<DailyShiftReport>;
  updateDailyShiftReport(id: string, data: Partial<InsertDailyShiftReport>): Promise<DailyShiftReport | undefined>;
  getDailyShiftReportsByUser(userId: string, month?: string): Promise<DailyShiftReport[]>;
  getDailyShiftReportsByMonth(month: string): Promise<(DailyShiftReport & { user: SafeUser })[]>;
  getDailyShiftReportsByUserAndMonth(userId: string, month: string): Promise<DailyShiftReport[]>;
  getDailyShiftReportsForDateRange(startDate: string, endDate: string): Promise<(DailyShiftReport & { user: SafeUser })[]>;
  getAllDailyShiftReports(): Promise<DailyShiftReport[]>;
  getReportByShiftId(shiftId: string): Promise<DailyShiftReport | undefined>;

  // Special Request methods
  getSpecialRequest(id: string): Promise<SpecialRequest | undefined>;
  createSpecialRequest(request: InsertSpecialRequest): Promise<SpecialRequest>;
  updateSpecialRequest(id: string, data: Partial<InsertSpecialRequest>): Promise<SpecialRequest | undefined>;
  getSpecialRequestsByUser(userId: string, month?: string): Promise<SpecialRequest[]>;
  getSpecialRequestsByMonth(month: string): Promise<(SpecialRequest & { user: SafeUser })[]>;
  getSpecialRequestsByStatus(status: string, month?: string): Promise<(SpecialRequest & { user: SafeUser })[]>;
  getSpecialRequestsByStatusWithUser(status: string, month: string): Promise<any[]>;
  getSpecialRequestsByMonthWithUser(month: string): Promise<any[]>;
  getAllSpecialRequests(): Promise<SpecialRequest[]>;

  // Request Comment methods
  getRequestComments(requestId: string): Promise<(RequestComment & { user: SafeUser })[]>;
  addRequestComment(comment: InsertRequestComment): Promise<RequestComment>;
  getRequestCommentsWithUser(requestId: string): Promise<any[]>;
  getRequestCommentWithUser(commentId: string): Promise<any>;

  // Archive methods
  getMonthlyArchive(month: string): Promise<MonthlyArchive | undefined>;
  archiveMonth(month: string): Promise<MonthlyArchive>;
  getArchivedMonths(): Promise<MonthlyArchive[]>;
  isMonthArchived(month: string): Promise<boolean>;
  getArchivedReports(month: string): Promise<DailyShiftReport[]>;
  getArchivedRequests(month: string): Promise<SpecialRequest[]>;
  
  // Incomplete shifts
  getIncompleteShiftsBeforeDate(userId: string, beforeDate: string): Promise<Shift[]>;
  getOrCreateShiftForDate(userId: string, date: string): Promise<Shift>;

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
  // ============= USER METHODS =============
  
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
    // Delete related records first
    await db.delete(requestComments).where(eq(requestComments.userId, id));
    await db.delete(specialRequests).where(eq(specialRequests.userId, id));
    await db.delete(dailyShiftReports).where(eq(dailyShiftReports.userId, id));
    await db.delete(targetItems).where(eq(targetItems.userId, id));
    await db.delete(targets).where(eq(targets.userId, id));
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

  // ============= SHIFT METHODS =============

  async getShiftsByDate(date: string): Promise<ShiftWithUser[]> {
    try {
      const shiftRecords = await db
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
        .where(eq(shifts.date, date))
        .orderBy(desc(shifts.createdAt));
      
      // Fetch breaks for all shifts
      const shiftIds = shiftRecords.map(r => r.id);
      const allBreaks = shiftIds.length > 0 
        ? await db.select().from(breaks).where(inArray(breaks.shiftId, shiftIds))
        : [];
      
      // Merge breaks into shifts
      return shiftRecords.map(shift => ({
        ...shift,
        breaks: allBreaks.filter(b => b.shiftId === shift.id),
      })) as ShiftWithUser[];
    } catch (error) {
      console.error("Error fetching shifts by date:", error);
      return [];
    }
  }

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

  async getShiftsByUser(userId: string, limit: number = 30): Promise<Shift[]> {
    return await db
      .select()
      .from(shifts)
      .where(eq(shifts.userId, userId))
      .orderBy(desc(shifts.date))
      .limit(limit);
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

  async getIncompleteShiftsBeforeDate(userId: string, beforeDate: string): Promise<Shift[]> {
    return await db
      .select()
      .from(shifts)
      .where(
        and(
          eq(shifts.userId, userId),
          lt(shifts.date, beforeDate),
          or(
            and(
              isNotNull(shifts.morningClockIn),
              isNull(shifts.morningClockOut)
            ),
            and(
              isNotNull(shifts.eveningClockIn),
              isNull(shifts.eveningClockOut)
            )
          )
        )
      )
      .orderBy(desc(shifts.date));
  }

  async getOrCreateShiftForDate(userId: string, date: string): Promise<Shift> {
    let shift = await this.getShiftByUserAndDate(userId, date);
    
    if (!shift) {
      shift = await this.createShift({
        userId,
        date,
        status: "not_started",
      });
    }
    
    return shift;
  }

  // ============= BREAK METHODS =============

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
        isNull(breaks.endTime)
      ));
    return activeBreak || undefined;
  }

  async getActiveBreakForDate(userId: string, date: string): Promise<Break | undefined> {
    const [activeBreak] = await db
      .select()
      .from(breaks)
      .where(and(
        eq(breaks.userId, userId),
        eq(breaks.date, date),
        isNull(breaks.endTime)
      ))
      .orderBy(desc(breaks.startTime))
      .limit(1);
    return activeBreak || undefined;
  }

  async getAllActiveBreaks(userId: string): Promise<Break[]> {
    return await db
      .select()
      .from(breaks)
      .where(
        and(
          eq(breaks.userId, userId),
          isNull(breaks.endTime)
        )
      )
      .orderBy(desc(breaks.startTime));
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

  async endStaleBraaks(userId: string, currentDate: string): Promise<number> {
    const now = new Date();
    
    // Find all breaks without end time that are not from today
    const staleBreaks = await db
      .select()
      .from(breaks)
      .where(and(
        eq(breaks.userId, userId),
        isNull(breaks.endTime),
        lt(breaks.date, currentDate)
      ));
    
    let endedCount = 0;
    
    for (const brk of staleBreaks) {
      // End the break at midnight of that day
      const breakDate = new Date(brk.date);
      breakDate.setHours(23, 59, 59, 999);
      
      const durationMinutes = Math.floor(
        (breakDate.getTime() - new Date(brk.startTime).getTime()) / 60000
      );
      
      await db.update(breaks).set({
        endTime: breakDate,
        durationMinutes: Math.min(durationMinutes, 480), // Cap at 8 hours
      }).where(eq(breaks.id, brk.id));
      
      endedCount++;
    }
    
    return endedCount;
  }

  async getBreakStatsForPeriod(userId: string, startDate: string, endDate: string): Promise<{
    totalBreaks: number;
    totalDuration: number;
    byType: { type: string; count: number; duration: number }[];
  }> {
    const allBreaks = await db
      .select()
      .from(breaks)
      .where(and(
        eq(breaks.userId, userId),
        gte(breaks.date, startDate),
        lte(breaks.date, endDate)
      ));
    
    const byType = [
      { type: "prayer", count: 0, duration: 0 },
      { type: "meal", count: 0, duration: 0 },
      { type: "urgent", count: 0, duration: 0 },
    ];
    
    let totalDuration = 0;
    
    for (const brk of allBreaks) {
      const stat = byType.find(s => s.type === brk.type);
      if (stat) {
        stat.count++;
        stat.duration += brk.durationMinutes || 0;
      }
      totalDuration += brk.durationMinutes || 0;
    }
    
    return {
      totalBreaks: allBreaks.length,
      totalDuration,
      byType,
    };
  }

  // ============= TARGET METHODS =============

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

  // ============= TARGET ITEM METHODS =============

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

  async deleteTargetItem(id: string): Promise<void> {
    await db.delete(targetItems).where(eq(targetItems.id, id));
  }

  async getTargetItemsByTarget(targetId: string): Promise<TargetItem[]> {
    return await db.select().from(targetItems).where(eq(targetItems.targetId, targetId));
  }

  async getTargetItemsByUserAndMonth(userId: string, month: string): Promise<TargetItem[]> {
    const startDate = `${month}-01`;
    const endDate = `${month}-31`;
    
    return await db
      .select()
      .from(targetItems)
      .where(and(
        eq(targetItems.userId, userId),
        gte(targetItems.date, startDate),
        lte(targetItems.date, endDate)
      ))
      .orderBy(desc(targetItems.createdAt));
  }

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
        clientType: targetItems.clientType,
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
        gte(targetItems.date, startDate),
        lte(targetItems.date, endDate)
      ))
      .orderBy(desc(targetItems.createdAt));
    
    return records as (TargetItem & { user: SafeUser })[];
  }

  // ============= ACTIVITY LOG METHODS =============

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

  // ============= WASENDER CONFIG METHODS =============

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

  // ============= DEPARTMENT METHODS =============

  async getDepartments(): Promise<Department[]> {
    return await db.select().from(departments);
  }

  async updateDepartment(id: string, data: Partial<InsertDepartment>): Promise<Department | undefined> {
    const [dept] = await db.update(departments).set(data).where(eq(departments.id, id)).returning();
    return dept || undefined;
  }

  // ============= DASHBOARD STATS =============

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

  // ============= ANALYTICS METHODS =============

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
        gte(shifts.date, start),
        lte(shifts.date, end)
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
        gte(breaks.date, start),
        lte(breaks.date, end)
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

  // ============= DAILY SHIFT REPORT METHODS =============

  async getDailyShiftReport(id: string): Promise<DailyShiftReport | undefined> {
    const [report] = await db
      .select()
      .from(dailyShiftReports)
      .where(eq(dailyShiftReports.id, id));
    return report || undefined;
  }

  async createDailyShiftReport(report: InsertDailyShiftReport): Promise<DailyShiftReport> {
    console.log("Storage: Creating daily report with data:", report);
    const [created] = await db
      .insert(dailyShiftReports)
      .values(report)
      .returning();
    console.log("Storage: Created daily report:", created);
    return created;
  }

  async updateDailyShiftReport(id: string, data: Partial<InsertDailyShiftReport>): Promise<DailyShiftReport | undefined> {
    const [updated] = await db
      .update(dailyShiftReports)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(dailyShiftReports.id, id))
      .returning();
    return updated || undefined;
  }

  async getDailyShiftReportsByUser(userId: string, month?: string): Promise<DailyShiftReport[]> {
    let conditions = [eq(dailyShiftReports.userId, userId)];
    
    if (month) {
      conditions.push(eq(dailyShiftReports.month, month));
    }
    
    return db
      .select()
      .from(dailyShiftReports)
      .where(and(...conditions))
      .orderBy(desc(dailyShiftReports.date));
  }

  async getDailyShiftReportsByMonth(month: string): Promise<(DailyShiftReport & { user: SafeUser })[]> {
    console.log(`Storage: Fetching daily reports for month "${month}"`);
    
    const reports = await db
      .select({
        id: dailyShiftReports.id,
        userId: dailyShiftReports.userId,
        shiftId: dailyShiftReports.shiftId,
        date: dailyShiftReports.date,
        workDetails: dailyShiftReports.workDetails,
        loomVideos: dailyShiftReports.loomVideos,
        notes: dailyShiftReports.notes,
        references: dailyShiftReports.references,
        month: dailyShiftReports.month,
        archived: dailyShiftReports.archived,
        createdAt: dailyShiftReports.createdAt,
        updatedAt: dailyShiftReports.updatedAt,
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
      .from(dailyShiftReports)
      .innerJoin(users, eq(dailyShiftReports.userId, users.id))
      .where(eq(dailyShiftReports.month, month))
      .orderBy(desc(dailyShiftReports.date));
    
    console.log(`Storage: Found ${reports.length} reports for month ${month}`);
    
    return reports as (DailyShiftReport & { user: SafeUser })[];
  }

  // NEW: Get daily reports by user and month
  async getDailyShiftReportsByUserAndMonth(userId: string, month: string): Promise<DailyShiftReport[]> {
    console.log(`Storage: Fetching reports for user ${userId}, month ${month}`);
    
    const reports = await db
      .select()
      .from(dailyShiftReports)
      .where(and(
        eq(dailyShiftReports.userId, userId),
        eq(dailyShiftReports.month, month)
      ))
      .orderBy(desc(dailyShiftReports.date));
    
    console.log(`Storage: Found ${reports.length} reports`);
    return reports;
  }

  // NEW: Get daily reports for date range with user data
  async getDailyShiftReportsForDateRange(startDate: string, endDate: string): Promise<(DailyShiftReport & { user: SafeUser })[]> {
    console.log(`Storage: Fetching reports from ${startDate} to ${endDate}`);
    
    const reports = await db
      .select({
        id: dailyShiftReports.id,
        userId: dailyShiftReports.userId,
        shiftId: dailyShiftReports.shiftId,
        date: dailyShiftReports.date,
        workDetails: dailyShiftReports.workDetails,
        loomVideos: dailyShiftReports.loomVideos,
        notes: dailyShiftReports.notes,
        references: dailyShiftReports.references,
        month: dailyShiftReports.month,
        archived: dailyShiftReports.archived,
        createdAt: dailyShiftReports.createdAt,
        updatedAt: dailyShiftReports.updatedAt,
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
      .from(dailyShiftReports)
      .innerJoin(users, eq(dailyShiftReports.userId, users.id))
      .where(and(
        gte(dailyShiftReports.date, startDate),
        lte(dailyShiftReports.date, endDate)
      ))
      .orderBy(desc(dailyShiftReports.createdAt));
    
    console.log(`Storage: Found ${reports.length} reports for date range`);
    return reports as (DailyShiftReport & { user: SafeUser })[];
  }

  // NEW: Get all daily reports (for debugging)
  async getAllDailyShiftReports(): Promise<DailyShiftReport[]> {
    const reports = await db
      .select()
      .from(dailyShiftReports)
      .orderBy(desc(dailyShiftReports.createdAt));
    
    console.log(`Storage: Total daily reports in database: ${reports.length}`);
    return reports;
  }

  async getReportByShiftId(shiftId: string): Promise<DailyShiftReport | undefined> {
    const [report] = await db
      .select()
      .from(dailyShiftReports)
      .where(eq(dailyShiftReports.shiftId, shiftId));
    return report || undefined;
  }

  // ============= SPECIAL REQUEST METHODS =============

  async getSpecialRequest(id: string): Promise<SpecialRequest | undefined> {
    const [request] = await db
      .select()
      .from(specialRequests)
      .where(eq(specialRequests.id, id));
    return request || undefined;
  }

  async createSpecialRequest(request: InsertSpecialRequest): Promise<SpecialRequest> {
    console.log("Storage: Creating special request with data:", request);
    const [created] = await db
      .insert(specialRequests)
      .values({
        userId: request.userId,
        title: request.title,
        details: request.details,
        month: request.month,
        status: request.status || "sent_for_approval",
        archived: request.archived || false,
      })
      .returning();
    console.log("Storage: Created special request:", created);
    return created;
  }

  async updateSpecialRequest(id: string, data: Partial<InsertSpecialRequest>): Promise<SpecialRequest | undefined> {
    const [updated] = await db
      .update(specialRequests)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(specialRequests.id, id))
      .returning();
    return updated || undefined;
  }

  async getSpecialRequestsByUser(userId: string, month?: string): Promise<SpecialRequest[]> {
    let conditions = [eq(specialRequests.userId, userId)];
    
    if (month) {
      conditions.push(eq(specialRequests.month, month));
    }
    
    const requests = await db
      .select()
      .from(specialRequests)
      .where(and(...conditions))
      .orderBy(desc(specialRequests.createdAt));
    
    console.log(`Storage: Found ${requests.length} requests for user ${userId}, month: ${month}`);
    return requests;
  }

  async getSpecialRequestsByMonth(month: string): Promise<(SpecialRequest & { user: SafeUser })[]> {
    const requests = await db
      .select({
        id: specialRequests.id,
        userId: specialRequests.userId,
        title: specialRequests.title,
        details: specialRequests.details,
        status: specialRequests.status,
        month: specialRequests.month,
        archived: specialRequests.archived,
        createdAt: specialRequests.createdAt,
        updatedAt: specialRequests.updatedAt,
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
      .from(specialRequests)
      .innerJoin(users, eq(specialRequests.userId, users.id))
      .where(eq(specialRequests.month, month))
      .orderBy(desc(specialRequests.createdAt));
    
    return requests as (SpecialRequest & { user: SafeUser })[];
  }

  async getSpecialRequestsByStatus(status: string, month?: string): Promise<(SpecialRequest & { user: SafeUser })[]> {
    let conditions = [eq(specialRequests.status, status)];
    
    if (month) {
      conditions.push(eq(specialRequests.month, month));
    }
    
    const requests = await db
      .select({
        id: specialRequests.id,
        userId: specialRequests.userId,
        title: specialRequests.title,
        details: specialRequests.details,
        status: specialRequests.status,
        month: specialRequests.month,
        archived: specialRequests.archived,
        createdAt: specialRequests.createdAt,
        updatedAt: specialRequests.updatedAt,
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
      .from(specialRequests)
      .innerJoin(users, eq(specialRequests.userId, users.id))
      .where(and(...conditions))
      .orderBy(desc(specialRequests.createdAt));
    
    return requests as (SpecialRequest & { user: SafeUser })[];
  }

  async getSpecialRequestsByStatusWithUser(status: string, month: string): Promise<any[]> {
    console.log(`Storage: Fetching requests with status "${status}" for month "${month}"`);
    
    const requests = await db
      .select({
        id: specialRequests.id,
        userId: specialRequests.userId,
        title: specialRequests.title,
        details: specialRequests.details,
        status: specialRequests.status,
        month: specialRequests.month,
        archived: specialRequests.archived,
        createdAt: specialRequests.createdAt,
        updatedAt: specialRequests.updatedAt,
        user: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          department: users.department,
          email: users.email,
        },
      })
      .from(specialRequests)
      .leftJoin(users, eq(specialRequests.userId, users.id))
      .where(
        and(
          eq(specialRequests.status, status),
          eq(specialRequests.month, month)
        )
      )
      .orderBy(desc(specialRequests.createdAt));
    
    console.log(`Storage: Found ${requests.length} requests`);
    return requests;
  }

  async getSpecialRequestsByMonthWithUser(month: string): Promise<any[]> {
    console.log(`Storage: Fetching all requests for month "${month}"`);
    
    const requests = await db
      .select({
        id: specialRequests.id,
        userId: specialRequests.userId,
        title: specialRequests.title,
        details: specialRequests.details,
        status: specialRequests.status,
        month: specialRequests.month,
        archived: specialRequests.archived,
        createdAt: specialRequests.createdAt,
        updatedAt: specialRequests.updatedAt,
        user: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          department: users.department,
          email: users.email,
        },
      })
      .from(specialRequests)
      .leftJoin(users, eq(specialRequests.userId, users.id))
      .where(eq(specialRequests.month, month))
      .orderBy(desc(specialRequests.createdAt));
    
    console.log(`Storage: Found ${requests.length} requests`);
    return requests;
  }

  async getAllSpecialRequests(): Promise<SpecialRequest[]> {
    const requests = await db
      .select()
      .from(specialRequests)
      .orderBy(desc(specialRequests.createdAt));
    
    console.log(`Storage: Total requests in database: ${requests.length}`);
    return requests;
  }

  // ============= REQUEST COMMENT METHODS =============

  async getRequestComments(requestId: string): Promise<(RequestComment & { user: SafeUser })[]> {
    const comments = await db
      .select({
        id: requestComments.id,
        requestId: requestComments.requestId,
        userId: requestComments.userId,
        comment: requestComments.comment,
        isAdminComment: requestComments.isAdminComment,
        statusChange: requestComments.statusChange,
        createdAt: requestComments.createdAt,
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
      .from(requestComments)
      .innerJoin(users, eq(requestComments.userId, users.id))
      .where(eq(requestComments.requestId, requestId))
      .orderBy(requestComments.createdAt);
    
    return comments as (RequestComment & { user: SafeUser })[];
  }

  async addRequestComment(comment: InsertRequestComment): Promise<RequestComment> {
    const [created] = await db
      .insert(requestComments)
      .values(comment)
      .returning();
    return created;
  }

  async getRequestCommentsWithUser(requestId: string): Promise<any[]> {
    const comments = await db
      .select({
        id: requestComments.id,
        requestId: requestComments.requestId,
        comment: requestComments.comment,
        isAdminComment: requestComments.isAdminComment,
        statusChange: requestComments.statusChange,
        createdAt: requestComments.createdAt,
        user: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
        },
      })
      .from(requestComments)
      .leftJoin(users, eq(requestComments.userId, users.id))
      .where(eq(requestComments.requestId, requestId))
      .orderBy(requestComments.createdAt);
    
    return comments;
  }

  async getRequestCommentWithUser(commentId: string): Promise<any> {
    const [comment] = await db
      .select({
        id: requestComments.id,
        requestId: requestComments.requestId,
        comment: requestComments.comment,
        isAdminComment: requestComments.isAdminComment,
        statusChange: requestComments.statusChange,
        createdAt: requestComments.createdAt,
        user: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
        },
      })
      .from(requestComments)
      .leftJoin(users, eq(requestComments.userId, users.id))
      .where(eq(requestComments.id, commentId));
    
    return comment || null;
  }

  // ============= ARCHIVE METHODS =============

  async getMonthlyArchive(month: string): Promise<MonthlyArchive | undefined> {
    const [archive] = await db
      .select()
      .from(monthlyArchive)
      .where(eq(monthlyArchive.month, month));
    return archive || undefined;
  }

  async archiveMonth(month: string): Promise<MonthlyArchive> {
    // Count reports for this month
    const reportCountResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(dailyShiftReports)
      .where(eq(dailyShiftReports.month, month));
    
    // Count requests for this month
    const requestCountResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(specialRequests)
      .where(eq(specialRequests.month, month));
    
    // Mark reports as archived
    await db
      .update(dailyShiftReports)
      .set({ archived: true })
      .where(eq(dailyShiftReports.month, month));
    
    // Mark requests as archived
    await db
      .update(specialRequests)
      .set({ archived: true })
      .where(eq(specialRequests.month, month));
    
    // Create archive record
    const [archive] = await db
      .insert(monthlyArchive)
      .values({
        month,
        totalReports: Number(reportCountResult[0]?.count || 0),
        totalRequests: Number(requestCountResult[0]?.count || 0),
      })
      .returning();
    
    return archive;
  }

  async getArchivedMonths(): Promise<MonthlyArchive[]> {
    return db
      .select()
      .from(monthlyArchive)
      .orderBy(desc(monthlyArchive.month));
  }

  async isMonthArchived(month: string): Promise<boolean> {
    const [archive] = await db
      .select()
      .from(monthlyArchive)
      .where(eq(monthlyArchive.month, month));
    return !!archive;
  }

  async getArchivedReports(month: string): Promise<DailyShiftReport[]> {
    return db
      .select()
      .from(dailyShiftReports)
      .where(and(
        eq(dailyShiftReports.month, month),
        eq(dailyShiftReports.archived, true)
      ))
      .orderBy(desc(dailyShiftReports.date));
  }

  async getArchivedRequests(month: string): Promise<SpecialRequest[]> {
    return db
      .select()
      .from(specialRequests)
      .where(and(
        eq(specialRequests.month, month),
        eq(specialRequests.archived, true)
      ))
      .orderBy(desc(specialRequests.createdAt));
  }
}

export const storage = new DatabaseStorage();