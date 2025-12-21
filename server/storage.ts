import { 
  users, 
  attendanceRecords,
  type User, 
  type InsertUser,
  type Attendance,
  type InsertAttendance,
  type SafeUser
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, gte, lte, sql } from "drizzle-orm";

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, data: Partial<InsertUser>): Promise<User | undefined>;
  deleteUser(id: string): Promise<void>;
  getAllUsers(): Promise<SafeUser[]>;
  getUsersByRole(role: string): Promise<SafeUser[]>;
  
  // Attendance methods
  getAttendanceById(id: string): Promise<Attendance | undefined>;
  getAttendanceByUserAndDate(userId: string, date: string): Promise<Attendance | undefined>;
  createAttendance(record: InsertAttendance): Promise<Attendance>;
  updateAttendance(id: string, data: Partial<InsertAttendance>): Promise<Attendance | undefined>;
  getAttendanceByUser(userId: string): Promise<Attendance[]>;
  getAttendanceByDate(date: string): Promise<(Attendance & { user: SafeUser })[]>;
  getRecentAttendance(limit?: number): Promise<(Attendance & { user: SafeUser })[]>;
  getAttendanceStats(userId?: string): Promise<{
    presentDays: number;
    absentDays: number;
    lateDays: number;
    totalWorkHours: number;
  }>;
  getDashboardStats(): Promise<{
    totalEmployees: number;
    presentToday: number;
    absentToday: number;
    lateToday: number;
    attendanceRate: number;
  }>;
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
    await db.delete(attendanceRecords).where(eq(attendanceRecords.userId, id));
    await db.delete(users).where(eq(users.id, id));
  }

  async getAllUsers(): Promise<SafeUser[]> {
    const allUsers = await db.select({
      id: users.id,
      username: users.username,
      fullName: users.fullName,
      email: users.email,
      role: users.role,
      department: users.department,
      position: users.position,
      isActive: users.isActive,
      createdAt: users.createdAt,
    }).from(users).orderBy(desc(users.createdAt));
    return allUsers;
  }

  async getUsersByRole(role: string): Promise<SafeUser[]> {
    const roleUsers = await db.select({
      id: users.id,
      username: users.username,
      fullName: users.fullName,
      email: users.email,
      role: users.role,
      department: users.department,
      position: users.position,
      isActive: users.isActive,
      createdAt: users.createdAt,
    }).from(users).where(eq(users.role, role));
    return roleUsers;
  }

  // Attendance methods
  async getAttendanceById(id: string): Promise<Attendance | undefined> {
    const [record] = await db.select().from(attendanceRecords).where(eq(attendanceRecords.id, id));
    return record || undefined;
  }

  async getAttendanceByUserAndDate(userId: string, date: string): Promise<Attendance | undefined> {
    const [record] = await db
      .select()
      .from(attendanceRecords)
      .where(and(eq(attendanceRecords.userId, userId), eq(attendanceRecords.date, date)));
    return record || undefined;
  }

  async createAttendance(record: InsertAttendance): Promise<Attendance> {
    const [attendance] = await db.insert(attendanceRecords).values(record).returning();
    return attendance;
  }

  async updateAttendance(id: string, data: Partial<InsertAttendance>): Promise<Attendance | undefined> {
    const [attendance] = await db
      .update(attendanceRecords)
      .set(data)
      .where(eq(attendanceRecords.id, id))
      .returning();
    return attendance || undefined;
  }

  async getAttendanceByUser(userId: string): Promise<Attendance[]> {
    const records = await db
      .select()
      .from(attendanceRecords)
      .where(eq(attendanceRecords.userId, userId))
      .orderBy(desc(attendanceRecords.date));
    return records;
  }

  async getAttendanceByDate(date: string): Promise<(Attendance & { user: SafeUser })[]> {
    const records = await db
      .select({
        id: attendanceRecords.id,
        userId: attendanceRecords.userId,
        date: attendanceRecords.date,
        clockIn: attendanceRecords.clockIn,
        clockOut: attendanceRecords.clockOut,
        status: attendanceRecords.status,
        notes: attendanceRecords.notes,
        createdAt: attendanceRecords.createdAt,
        user: {
          id: users.id,
          username: users.username,
          fullName: users.fullName,
          email: users.email,
          role: users.role,
          department: users.department,
          position: users.position,
          isActive: users.isActive,
          createdAt: users.createdAt,
        },
      })
      .from(attendanceRecords)
      .leftJoin(users, eq(attendanceRecords.userId, users.id))
      .where(eq(attendanceRecords.date, date))
      .orderBy(desc(attendanceRecords.clockIn));
    
    return records as (Attendance & { user: SafeUser })[];
  }

  async getRecentAttendance(limit = 10): Promise<(Attendance & { user: SafeUser })[]> {
    const records = await db
      .select({
        id: attendanceRecords.id,
        userId: attendanceRecords.userId,
        date: attendanceRecords.date,
        clockIn: attendanceRecords.clockIn,
        clockOut: attendanceRecords.clockOut,
        status: attendanceRecords.status,
        notes: attendanceRecords.notes,
        createdAt: attendanceRecords.createdAt,
        user: {
          id: users.id,
          username: users.username,
          fullName: users.fullName,
          email: users.email,
          role: users.role,
          department: users.department,
          position: users.position,
          isActive: users.isActive,
          createdAt: users.createdAt,
        },
      })
      .from(attendanceRecords)
      .leftJoin(users, eq(attendanceRecords.userId, users.id))
      .orderBy(desc(attendanceRecords.createdAt))
      .limit(limit);
    
    return records as (Attendance & { user: SafeUser })[];
  }

  async getAttendanceStats(userId?: string): Promise<{
    presentDays: number;
    absentDays: number;
    lateDays: number;
    totalWorkHours: number;
  }> {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    
    let query = db.select().from(attendanceRecords);
    if (userId) {
      query = query.where(eq(attendanceRecords.userId, userId)) as typeof query;
    }
    
    const records = await query;
    
    let presentDays = 0;
    let absentDays = 0;
    let lateDays = 0;
    let totalWorkHours = 0;
    
    records.forEach((record) => {
      if (record.status === "present") presentDays++;
      else if (record.status === "absent") absentDays++;
      else if (record.status === "late") lateDays++;
      
      if (record.clockIn && record.clockOut) {
        const diff = new Date(record.clockOut).getTime() - new Date(record.clockIn).getTime();
        totalWorkHours += diff / (1000 * 60 * 60);
      }
    });
    
    return {
      presentDays,
      absentDays,
      lateDays,
      totalWorkHours: Math.round(totalWorkHours),
    };
  }

  async getDashboardStats(): Promise<{
    totalEmployees: number;
    presentToday: number;
    absentToday: number;
    lateToday: number;
    attendanceRate: number;
  }> {
    const today = new Date().toISOString().split("T")[0];
    
    const allEmployees = await db
      .select()
      .from(users)
      .where(eq(users.role, "employee"));
    
    const totalEmployees = allEmployees.length;
    
    const todayRecords = await db
      .select()
      .from(attendanceRecords)
      .where(eq(attendanceRecords.date, today));
    
    let presentToday = 0;
    let lateToday = 0;
    
    todayRecords.forEach((record) => {
      if (record.status === "present") presentToday++;
      else if (record.status === "late") {
        lateToday++;
        presentToday++;
      }
    });
    
    const absentToday = Math.max(0, totalEmployees - todayRecords.length);
    const attendanceRate = totalEmployees > 0 
      ? Math.round((presentToday / totalEmployees) * 100) 
      : 0;
    
    return {
      totalEmployees,
      presentToday,
      absentToday,
      lateToday,
      attendanceRate,
    };
  }
}

export const storage = new DatabaseStorage();
