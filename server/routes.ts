// server/routes.ts
import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import bcrypt from "bcrypt";
import { storage } from "./storage";
import { 
  insertUserSchema, 
  insertShiftSchema, 
  insertBreakSchema, 
  loginSchema, 
  insertDailyShiftReportSchema,
  insertSpecialRequestSchema,
  insertRequestCommentSchema,
  BREAK_LIMITS,
  SPECIAL_REQUEST_STATUSES
} from "@shared/schema";
import { z } from "zod";

const SALT_ROUNDS = 10;

// Extend express-session types
declare module "express-session" {
  interface SessionData {
    userId: string;
    role: string;
  }
}

// Middleware to check if user is authenticated
function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

// Middleware to check if user is admin
function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  if (req.session.role !== "admin") {
    return res.status(403).json({ error: "Forbidden - Admin access required" });
  }
  next();
}

// Helper function to clean empty strings to null/undefined
function cleanEmployeeData(data: any): any {
  const cleaned: any = { ...data };
  
  // Convert empty strings to null for optional fields
  const optionalFields = [
    'email', 'department', 'position', 'phone', 
    'address', 'emergencyContact', 'shiftStartTime', 'shiftEndTime',
    'morningShiftStart', 'morningShiftEnd', 'eveningShiftStart', 'eveningShiftEnd'
  ];
  
  for (const field of optionalFields) {
    if (cleaned[field] === '' || cleaned[field] === undefined) {
      cleaned[field] = null;
    }
  }
  
  // Handle department placeholder
  if (cleaned.department === '_none_') {
    cleaned.department = null;
  }
  
  // Handle salary - convert empty/undefined to null, or ensure it's a number
  if (cleaned.salary === '' || cleaned.salary === undefined || cleaned.salary === null) {
    cleaned.salary = null;
  } else {
    cleaned.salary = Number(cleaned.salary);
    if (isNaN(cleaned.salary)) {
      cleaned.salary = null;
    }
  }
  
  // Ensure boolean fields have proper defaults
  if (cleaned.isActive === undefined) {
    cleaned.isActive = true;
  }
  
  // Ensure status has default
  if (!cleaned.status) {
    cleaned.status = 'active';
  }
  
  // Ensure shiftType has default
  if (!cleaned.shiftType) {
    cleaned.shiftType = 'one_shift';
  }
  
  // Ensure whatsappPreference has default
  if (!cleaned.whatsappPreference) {
    cleaned.whatsappPreference = 'both';
  }
  
  // Clean shift times based on shift type
  if (cleaned.shiftType === 'open') {
    cleaned.shiftStartTime = null;
    cleaned.shiftEndTime = null;
    cleaned.morningShiftStart = null;
    cleaned.morningShiftEnd = null;
    cleaned.eveningShiftStart = null;
    cleaned.eveningShiftEnd = null;
  } else if (cleaned.shiftType === 'one_shift') {
    cleaned.morningShiftStart = null;
    cleaned.morningShiftEnd = null;
    cleaned.eveningShiftStart = null;
    cleaned.eveningShiftEnd = null;
  } else if (cleaned.shiftType === 'two_shifts') {
    cleaned.shiftStartTime = null;
    cleaned.shiftEndTime = null;
  }
  
  return cleaned;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Session middleware
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "gac-trackings-secret-key-2024",
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === "production",
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
      },
    })
  );

  // ============= AUTH ROUTES =============
  
  // Login
  app.post("/api/auth/login", async (req, res) => {
    try {
      const data = loginSchema.parse(req.body);
      const user = await storage.getUserByUsername(data.username);
      
      if (!user) {
        return res.status(401).json({ error: "Invalid username or password" });
      }
      
      const isValidPassword = await bcrypt.compare(data.password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ error: "Invalid username or password" });
      }
      
      if (user.role !== data.role) {
        return res.status(401).json({ error: `This account is not registered as ${data.role}` });
      }
      
      if (!user.isActive || user.status === "inactive") {
        return res.status(401).json({ error: "Account is deactivated" });
      }
      
      req.session.userId = user.id;
      req.session.role = user.role;
      
      const { password, ...safeUser } = user;
      res.json({ user: safeUser });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors[0].message });
      }
      console.error("Login error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  
  // Get current user
  app.get("/api/auth/me", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    
    try {
      const user = await storage.getUser(req.session.userId);
      if (!user) {
        req.session.destroy(() => {});
        return res.status(401).json({ error: "User not found" });
      }
      
      const { password, ...safeUser } = user;
      res.json({ user: safeUser });
    } catch (error) {
      console.error("Failed to get current user:", error);
      res.status(500).json({ error: "Failed to get user" });
    }
  });
  
  // Logout
  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: "Failed to logout" });
      }
      res.json({ success: true });
    });
  });

  // ============= ADMIN ROUTES =============
  
  // Get dashboard stats
  app.get("/api/admin/stats", requireAdmin, async (req, res) => {
    try {
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (error) {
      console.error("Failed to fetch stats:", error);
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });
  
  // Get all employees
  app.get("/api/admin/employees", requireAdmin, async (req, res) => {
    try {
      const employees = await storage.getAllUsers();
      res.json(employees);
    } catch (error) {
      console.error("Failed to fetch employees:", error);
      res.status(500).json({ error: "Failed to fetch employees" });
    }
  });
  
  // Create employee
  app.post("/api/admin/employees", requireAdmin, async (req, res) => {
    try {
      console.log("Creating employee with data:", JSON.stringify(req.body, null, 2));
      
      // Validate password is provided for new users
      if (!req.body.password || req.body.password.trim() === '') {
        return res.status(400).json({ error: "Password is required for new employees" });
      }
      
      // Validate required fields
      if (!req.body.username || req.body.username.trim() === '') {
        return res.status(400).json({ error: "Username is required" });
      }
      if (!req.body.firstName || req.body.firstName.trim() === '') {
        return res.status(400).json({ error: "First name is required" });
      }
      if (!req.body.lastName || req.body.lastName.trim() === '') {
        return res.status(400).json({ error: "Last name is required" });
      }
      
      // Check if username exists
      const existing = await storage.getUserByUsername(req.body.username);
      if (existing) {
        return res.status(400).json({ error: "Username already exists" });
      }
      
      // Clean and prepare data
      const cleanedData = cleanEmployeeData(req.body);
      
      // Hash password
      const hashedPassword = await bcrypt.hash(req.body.password, SALT_ROUNDS);
      
      // Create the user data object
      const userData = {
        username: cleanedData.username.trim(),
        password: hashedPassword,
        firstName: cleanedData.firstName.trim(),
        lastName: cleanedData.lastName.trim(),
        email: cleanedData.email,
        role: cleanedData.role || 'employee',
        department: cleanedData.department,
        position: cleanedData.position,
        salary: cleanedData.salary,
        status: cleanedData.status,
        shiftType: cleanedData.shiftType,
        shiftStartTime: cleanedData.shiftStartTime,
        shiftEndTime: cleanedData.shiftEndTime,
        phone: cleanedData.phone,
        whatsappPreference: cleanedData.whatsappPreference,
        address: cleanedData.address,
        emergencyContact: cleanedData.emergencyContact,
        isActive: cleanedData.isActive,
      };
      
      console.log("Cleaned user data:", JSON.stringify({ ...userData, password: '[HIDDEN]' }, null, 2));
      
      const user = await storage.createUser(userData);
      const { password, ...safeUser } = user;
      
      console.log("Employee created successfully:", safeUser.id);
      res.json(safeUser);
    } catch (error: any) {
      console.error("Failed to create employee:", error);
      console.error("Error stack:", error.stack);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors[0].message });
      }
      
      // Check for unique constraint violation
      if (error.code === '23505') {
        return res.status(400).json({ error: "Username or email already exists" });
      }
      
      res.status(500).json({ error: error.message || "Failed to create employee" });
    }
  });
  
  // Update employee
  app.patch("/api/admin/employees/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      console.log("Updating employee:", id, JSON.stringify(req.body, null, 2));
      
      // Check if employee exists
      const existingUser = await storage.getUser(id);
      if (!existingUser) {
        return res.status(404).json({ error: "Employee not found" });
      }
      
      // Clean and prepare data
      const cleanedData = cleanEmployeeData(req.body);
      
      // Handle password - remove if empty, otherwise hash it
      if (cleanedData.password && cleanedData.password.trim() !== '') {
        cleanedData.password = await bcrypt.hash(cleanedData.password, SALT_ROUNDS);
      } else {
        delete cleanedData.password;
      }
      
      // Check username uniqueness if it's being changed
      if (cleanedData.username && cleanedData.username !== existingUser.username) {
        const usernameExists = await storage.getUserByUsername(cleanedData.username);
        if (usernameExists) {
          return res.status(400).json({ error: "Username already exists" });
        }
      }
      
      console.log("Cleaned update data:", JSON.stringify({ ...cleanedData, password: cleanedData.password ? '[HIDDEN]' : undefined }, null, 2));
      
      const user = await storage.updateUser(id, cleanedData);
      if (!user) {
        return res.status(404).json({ error: "Employee not found" });
      }
      
      const { password, ...safeUser } = user;
      console.log("Employee updated successfully:", safeUser.id);
      res.json(safeUser);
    } catch (error: any) {
      console.error("Failed to update employee:", error);
      console.error("Error stack:", error.stack);
      
      // Check for unique constraint violation
      if (error.code === '23505') {
        return res.status(400).json({ error: "Username or email already exists" });
      }
      
      res.status(500).json({ error: error.message || "Failed to update employee" });
    }
  });
  
  // Delete employee
  app.delete("/api/admin/employees/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      
      // Check if trying to delete self
      if (id === req.session.userId) {
        return res.status(400).json({ error: "Cannot delete your own account" });
      }
      
      await storage.deleteUser(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Failed to delete employee:", error);
      res.status(500).json({ error: "Failed to delete employee" });
    }
  });

  // Get today's shifts (Staff Activity Monitor)
  app.get("/api/admin/shifts/today", requireAdmin, async (req, res) => {
    try {
      const shifts = await storage.getTodayShifts();
      res.json(shifts);
    } catch (error) {
      console.error("Failed to fetch today's shifts:", error);
      res.status(500).json({ error: "Failed to fetch today's shifts" });
    }
  });

  // Get recent activity logs
  app.get("/api/admin/activity-logs", requireAdmin, async (req, res) => {
    try {
      const logs = await storage.getRecentActivityLogs(50);
      res.json(logs);
    } catch (error) {
      console.error("Failed to fetch activity logs:", error);
      res.status(500).json({ error: "Failed to fetch activity logs" });
    }
  });

  // WASENDER API Config
  app.get("/api/admin/wasender-config", requireAdmin, async (req, res) => {
    try {
      const config = await storage.getWasenderConfig();
      res.json(config || { instanceId: "", apiToken: "", isActive: false });
    } catch (error) {
      console.error("Failed to fetch WASENDER config:", error);
      res.status(500).json({ error: "Failed to fetch WASENDER config" });
    }
  });

  app.post("/api/admin/wasender-config", requireAdmin, async (req, res) => {
    try {
      const { instanceId, apiToken, isActive } = req.body;
      const config = await storage.updateWasenderConfig({ instanceId, apiToken, isActive });
      res.json(config);
    } catch (error) {
      console.error("Failed to update WASENDER config:", error);
      res.status(500).json({ error: "Failed to update WASENDER config" });
    }
  });

  app.post("/api/admin/wasender-test", requireAdmin, async (req, res) => {
    try {
      const config = await storage.getWasenderConfig();
      if (!config?.instanceId || !config?.apiToken) {
        return res.status(400).json({ error: "WASENDER not configured" });
      }
      
      await storage.updateWasenderConfig({ lastTested: new Date() });
      res.json({ success: true, message: "Connection successful" });
    } catch (error) {
      console.error("Failed to test WASENDER connection:", error);
      res.status(500).json({ error: "Failed to test WASENDER connection" });
    }
  });

  // Departments
  app.get("/api/admin/departments", requireAdmin, async (req, res) => {
    try {
      const departments = await storage.getDepartments();
      res.json(departments);
    } catch (error) {
      console.error("Failed to fetch departments:", error);
      res.status(500).json({ error: "Failed to fetch departments" });
    }
  });

  app.patch("/api/admin/departments/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const dept = await storage.updateDepartment(id, req.body);
      res.json(dept);
    } catch (error) {
      console.error("Failed to update department:", error);
      res.status(500).json({ error: "Failed to update department" });
    }
  });

  // ============= EMPLOYEE ROUTES =============
  
  // Get today's shift status (with hasSubmittedReport check)
  app.get("/api/employee/today", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const today = new Date().toISOString().split("T")[0];
      
      const shift = await storage.getShiftByUserAndDate(userId, today);
      const activeBreak = await storage.getActiveBreak(userId);
      const breaks = await storage.getBreaksByUserAndDate(userId, today);
      const activityLogs = await storage.getActivityLogsByUser(userId, today);
      
      // Check if report is submitted for today's shift
      let hasSubmittedReport = false;
      if (shift) {
        const report = await storage.getReportByShiftId(shift.id);
        hasSubmittedReport = !!report;
      }
      
      // Count breaks by type
      const breakCounts = {
        prayer: breaks.filter(b => b.type === "prayer").length,
        meal: breaks.filter(b => b.type === "meal").length,
        urgent: breaks.filter(b => b.type === "urgent").length,
      };
      
      // Calculate total break duration
      const totalBreakMinutes = breaks.reduce((acc, b) => acc + (b.durationMinutes || 0), 0);
      
      res.json({
        shift,
        activeBreak,
        breaks,
        breakCounts,
        totalBreakMinutes,
        activityLogs,
        hasSubmittedReport,
      });
    } catch (error) {
      console.error("Failed to fetch today's status:", error);
      res.status(500).json({ error: "Failed to fetch today's status" });
    }
  });
  
  // Start morning shift (clock in)
  app.post("/api/employee/shift/morning/start", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const today = new Date().toISOString().split("T")[0];
      const now = new Date();
      
      let shift = await storage.getShiftByUserAndDate(userId, today);
      
      if (shift?.morningClockIn) {
        return res.status(400).json({ error: "Morning shift already started" });
      }
      
      // Check if user is on break
      const activeBreak = await storage.getActiveBreak(userId);
      if (activeBreak) {
        return res.status(400).json({ error: "Please end your break first" });
      }
      
      // Calculate late minutes
      const user = await storage.getUser(userId);
      let lateMinutes = 0;
      if (user?.shiftStartTime) {
        const [hours, minutes] = user.shiftStartTime.split(":").map(Number);
        const shiftStart = new Date();
        shiftStart.setHours(hours, minutes, 0, 0);
        if (now > shiftStart) {
          lateMinutes = Math.floor((now.getTime() - shiftStart.getTime()) / 60000);
        }
      }
      
      if (shift) {
        shift = await storage.updateShift(shift.id, {
          morningClockIn: now,
          morningLateMinutes: lateMinutes,
          status: lateMinutes > 0 ? "late" : "present",
        });
      } else {
        shift = await storage.createShift({
          userId,
          date: today,
          morningClockIn: now,
          morningLateMinutes: lateMinutes,
          status: lateMinutes > 0 ? "late" : "present",
        });
      }
      
      await storage.createActivityLog({
        userId,
        action: "morning_clock_in",
        details: lateMinutes > 0 ? `Late by ${lateMinutes} minutes` : "On time",
        timestamp: now,
      });
      
      res.json(shift);
    } catch (error) {
      console.error("Failed to start morning shift:", error);
      res.status(500).json({ error: "Failed to start morning shift" });
    }
  });
  
  // End morning shift (REQUIRES REPORT)
  app.post("/api/employee/shift/morning/end", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const today = new Date().toISOString().split("T")[0];
      const now = new Date();
      
      const shift = await storage.getShiftByUserAndDate(userId, today);
      
      if (!shift?.morningClockIn) {
        return res.status(400).json({ error: "Morning shift not started" });
      }
      
      if (shift.morningClockOut) {
        return res.status(400).json({ error: "Morning shift already ended" });
      }
      
      // Check if user is on break
      const activeBreak = await storage.getActiveBreak(userId);
      if (activeBreak) {
        return res.status(400).json({ error: "Please end your break first before ending shift" });
      }
      
      // Check if report is submitted (REQUIRED)
      const report = await storage.getReportByShiftId(shift.id);
      if (!report) {
        return res.status(400).json({ 
          error: "Please submit your daily report before ending the shift",
          code: "REPORT_REQUIRED"
        });
      }
      
      const updated = await storage.updateShift(shift.id, {
        morningClockOut: now,
      });
      
      await storage.createActivityLog({
        userId,
        action: "morning_clock_out",
        details: "Morning shift ended",
        timestamp: now,
      });
      
      res.json(updated);
    } catch (error) {
      console.error("Failed to end morning shift:", error);
      res.status(500).json({ error: "Failed to end morning shift" });
    }
  });
  
  // Start evening shift
  app.post("/api/employee/shift/evening/start", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const today = new Date().toISOString().split("T")[0];
      const now = new Date();
      
      let shift = await storage.getShiftByUserAndDate(userId, today);
      
      if (shift?.eveningClockIn) {
        return res.status(400).json({ error: "Evening shift already started" });
      }
      
      // Check if user is on break
      const activeBreak = await storage.getActiveBreak(userId);
      if (activeBreak) {
        return res.status(400).json({ error: "Please end your break first" });
      }
      
      // Calculate late minutes for evening shift
      const user = await storage.getUser(userId);
      let lateMinutes = 0;
      
      // For two_shifts, check evening shift start time
      if (user?.shiftType === 'two_shifts' && (user as any).eveningShiftStart) {
        const [hours, minutes] = (user as any).eveningShiftStart.split(":").map(Number);
        const shiftStart = new Date();
        shiftStart.setHours(hours, minutes, 0, 0);
        if (now > shiftStart) {
          lateMinutes = Math.floor((now.getTime() - shiftStart.getTime()) / 60000);
        }
      }
      
      if (shift) {
        shift = await storage.updateShift(shift.id, {
          eveningClockIn: now,
          eveningLateMinutes: lateMinutes,
          status: shift.status === "not_started" ? (lateMinutes > 0 ? "late" : "present") : shift.status,
        });
      } else {
        shift = await storage.createShift({
          userId,
          date: today,
          eveningClockIn: now,
          eveningLateMinutes: lateMinutes,
          status: lateMinutes > 0 ? "late" : "present",
        });
      }
      
      await storage.createActivityLog({
        userId,
        action: "evening_clock_in",
        details: lateMinutes > 0 ? `Late by ${lateMinutes} minutes` : "Evening shift started",
        timestamp: now,
      });
      
      res.json(shift);
    } catch (error) {
      console.error("Failed to start evening shift:", error);
      res.status(500).json({ error: "Failed to start evening shift" });
    }
  });
  
  // End evening shift (REQUIRES REPORT)
  app.post("/api/employee/shift/evening/end", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const today = new Date().toISOString().split("T")[0];
      const now = new Date();
      
      const shift = await storage.getShiftByUserAndDate(userId, today);
      
      if (!shift?.eveningClockIn) {
        return res.status(400).json({ error: "Evening shift not started" });
      }
      
      if (shift.eveningClockOut) {
        return res.status(400).json({ error: "Evening shift already ended" });
      }
      
      // Check if user is on break
      const activeBreak = await storage.getActiveBreak(userId);
      if (activeBreak) {
        return res.status(400).json({ error: "Please end your break first before ending shift" });
      }
      
      // Check if report is submitted (REQUIRED)
      const report = await storage.getReportByShiftId(shift.id);
      if (!report) {
        return res.status(400).json({ 
          error: "Please submit your daily report before ending the shift",
          code: "REPORT_REQUIRED"
        });
      }
      
      const updated = await storage.updateShift(shift.id, {
        eveningClockOut: now,
      });
      
      await storage.createActivityLog({
        userId,
        action: "evening_clock_out",
        details: "Evening shift ended",
        timestamp: now,
      });
      
      res.json(updated);
    } catch (error) {
      console.error("Failed to end evening shift:", error);
      res.status(500).json({ error: "Failed to end evening shift" });
    }
  });

  // Start break
  app.post("/api/employee/break/start", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const today = new Date().toISOString().split("T")[0];
      const now = new Date();
      const { type } = req.body;
      
      if (!["prayer", "meal", "urgent"].includes(type)) {
        return res.status(400).json({ error: "Invalid break type. Must be prayer, meal, or urgent" });
      }
      
      // Check if shift is active
      const shift = await storage.getShiftByUserAndDate(userId, today);
      const isMorningActive = shift?.morningClockIn && !shift?.morningClockOut;
      const isEveningActive = shift?.eveningClockIn && !shift?.eveningClockOut;
      
      if (!isMorningActive && !isEveningActive) {
        return res.status(400).json({ error: "No active shift. Please clock in first" });
      }
      
      // Check if already on break
      const activeBreak = await storage.getActiveBreak(userId);
      if (activeBreak) {
        return res.status(400).json({ error: "Already on a break. Please end your current break first" });
      }
      
      const currentPeriod = isMorningActive ? "morning" : "evening";
      
      // Check break limits
      if (type === "prayer") {
        const count = await storage.countBreaksByType(userId, today, "prayer");
        if (count >= BREAK_LIMITS.prayer.maxPerDay) {
          return res.status(400).json({ error: `Maximum prayer breaks (${BREAK_LIMITS.prayer.maxPerDay}) reached for today` });
        }
      } else if (type === "meal") {
        const count = await storage.countBreaksByType(userId, today, "meal");
        if (count >= BREAK_LIMITS.meal.maxPerDay) {
          return res.status(400).json({ error: "Meal break already taken today" });
        }
      } else if (type === "urgent") {
        const count = await storage.countBreaksByType(userId, today, "urgent", currentPeriod);
        if (count >= BREAK_LIMITS.urgent.maxPerShift) {
          return res.status(400).json({ error: `Maximum urgent breaks (${BREAK_LIMITS.urgent.maxPerShift}) reached for this shift` });
        }
      }
      
      const breakRecord = await storage.createBreak({
        userId,
        shiftId: shift?.id || null,
        date: today,
        type,
        shiftPeriod: currentPeriod,
        startTime: now,
      });
      
      await storage.createActivityLog({
        userId,
        action: "break_start",
        details: `Started ${type} break`,
        timestamp: now,
      });
      
      res.json(breakRecord);
    } catch (error) {
      console.error("Failed to start break:", error);
      res.status(500).json({ error: "Failed to start break" });
    }
  });

  // End break
  app.post("/api/employee/break/end", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const now = new Date();
      
      const activeBreak = await storage.getActiveBreak(userId);
      if (!activeBreak) {
        return res.status(400).json({ error: "No active break to end" });
      }
      
      const durationMinutes = Math.floor(
        (now.getTime() - new Date(activeBreak.startTime).getTime()) / 60000
      );
      
      const updated = await storage.updateBreak(activeBreak.id, {
        endTime: now,
        durationMinutes,
      });
      
      await storage.createActivityLog({
        userId,
        action: "break_end",
        details: `Ended ${activeBreak.type} break (${durationMinutes} minutes)`,
        timestamp: now,
      });
      
      res.json(updated);
    } catch (error) {
      console.error("Failed to end break:", error);
      res.status(500).json({ error: "Failed to end break" });
    }
  });
  
  // Get employee's shift history
  app.get("/api/employee/shifts", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const shifts = await storage.getShiftsByUser(userId);
      res.json(shifts);
    } catch (error) {
      console.error("Failed to fetch shifts:", error);
      res.status(500).json({ error: "Failed to fetch shifts" });
    }
  });

  // Get employee's activity logs
  app.get("/api/employee/activity-logs", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const date = req.query.date as string | undefined;
      const logs = await storage.getActivityLogsByUser(userId, date);
      res.json(logs);
    } catch (error) {
      console.error("Failed to fetch activity logs:", error);
      res.status(500).json({ error: "Failed to fetch activity logs" });
    }
  });

  // ============= TARGETS ROUTES =============
  
  app.get("/api/employee/targets", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const month = req.query.month as string || new Date().toISOString().slice(0, 7);
      
      const target = await storage.getTargetByUserAndMonth(userId, month);
      if (!target) {
        return res.json({ target: null, items: [] });
      }
      
      const items = await storage.getTargetItemsByTarget(target.id);
      res.json({ target, items });
    } catch (error) {
      console.error("Failed to fetch targets:", error);
      res.status(500).json({ error: "Failed to fetch targets" });
    }
  });

  app.post("/api/employee/targets/items", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const { type, name, source, contactLink, date } = req.body;
      const month = (date as string).slice(0, 7);
      
      if (!["meeting", "order"].includes(type)) {
        return res.status(400).json({ error: "Invalid target item type" });
      }
      
      let target = await storage.getTargetByUserAndMonth(userId, month);
      if (!target) {
        target = await storage.createTarget({ userId, month });
      }
      
      const item = await storage.createTargetItem({
        targetId: target.id,
        userId,
        type,
        name,
        source,
        contactLink,
        date,
      });
      
      await storage.createActivityLog({
        userId,
        action: `target_${type}_added`,
        details: `Added ${type}: ${name}`,
        timestamp: new Date(),
      });
      
      res.json(item);
    } catch (error) {
      console.error("Failed to add target item:", error);
      res.status(500).json({ error: "Failed to add target item" });
    }
  });

  app.get("/api/admin/targets", requireAdmin, async (req, res) => {
    try {
      const month = req.query.month as string || new Date().toISOString().slice(0, 7);
      const allTargets = await storage.getAllTargetsForMonth(month);
      res.json(allTargets);
    } catch (error) {
      console.error("Failed to fetch targets:", error);
      res.status(500).json({ error: "Failed to fetch targets" });
    }
  });

  app.post("/api/admin/targets", requireAdmin, async (req, res) => {
    try {
      const { userId, month, meetingTarget, orderTarget } = req.body;
      
      let target = await storage.getTargetByUserAndMonth(userId, month);
      if (target) {
        target = await storage.updateTarget(target.id, { meetingTarget, orderTarget });
      } else {
        target = await storage.createTarget({ userId, month, meetingTarget, orderTarget });
      }
      
      res.json(target);
    } catch (error) {
      console.error("Failed to set targets:", error);
      res.status(500).json({ error: "Failed to set targets" });
    }
  });

  app.patch("/api/admin/targets/items/:id/verify", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const adminId = req.session.userId!;
      
      const item = await storage.updateTargetItem(id, {
        verified: true,
        verifiedAt: new Date(),
        verifiedBy: adminId,
      });
      
      if (!item) {
        return res.status(404).json({ error: "Target item not found" });
      }
      
      res.json(item);
    } catch (error) {
      console.error("Failed to verify target item:", error);
      res.status(500).json({ error: "Failed to verify target item" });
    }
  });

  app.get("/api/admin/targets/items", requireAdmin, async (req, res) => {
    try {
      const month = req.query.month as string || new Date().toISOString().slice(0, 7);
      const items = await storage.getAllTargetItemsForMonth(month);
      res.json(items);
    } catch (error) {
      console.error("Failed to fetch target items:", error);
      res.status(500).json({ error: "Failed to fetch target items" });
    }
  });

  // ============= ANALYTICS ROUTES =============
  
  app.get("/api/admin/analytics/attendance", requireAdmin, async (req, res) => {
    try {
      const startDate = req.query.startDate as string;
      const endDate = req.query.endDate as string;
      const analytics = await storage.getAttendanceAnalytics(startDate, endDate);
      res.json(analytics);
    } catch (error) {
      console.error("Failed to fetch attendance analytics:", error);
      res.status(500).json({ error: "Failed to fetch attendance analytics" });
    }
  });

  app.get("/api/admin/analytics/departments", requireAdmin, async (req, res) => {
    try {
      const stats = await storage.getDepartmentStats();
      res.json(stats);
    } catch (error) {
      console.error("Failed to fetch department stats:", error);
      res.status(500).json({ error: "Failed to fetch department stats" });
    }
  });

  // ============= DAILY SHIFT REPORT ROUTES =============

  // Submit daily report (employee)
  app.post("/api/reports/daily", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const today = new Date().toISOString().split("T")[0];
      
      // Validate required fields
      if (!req.body.workDetails || req.body.workDetails.trim() === '') {
        return res.status(400).json({ error: "Work details are required" });
      }
      
      // Get or validate shift
      let shiftId = req.body.shiftId;
      if (!shiftId) {
        const shift = await storage.getShiftByUserAndDate(userId, today);
        if (!shift) {
          return res.status(400).json({ error: "No shift found for today. Please clock in first." });
        }
        shiftId = shift.id;
      }
      
      // Check if report already exists for this shift
      const existingReport = await storage.getReportByShiftId(shiftId);
      if (existingReport) {
        return res.status(400).json({ error: "Report already submitted for this shift" });
      }
      
      const reportData = {
        userId,
        shiftId,
        date: req.body.date || today,
        workDetails: req.body.workDetails.trim(),
        loomVideos: req.body.loomVideos || null,
        notes: req.body.notes || null,
        references: req.body.references || null,
        month: req.body.month || new Date().toISOString().slice(0, 7),
      };
      
      const report = await storage.createDailyShiftReport(reportData);
      
      await storage.createActivityLog({
        userId,
        action: "report_submitted",
        details: "Daily shift report submitted",
        timestamp: new Date(),
      });
      
      res.json(report);
    } catch (error: any) {
      console.error("Failed to create daily report:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors[0].message });
      }
      res.status(500).json({ error: error.message || "Failed to create daily report" });
    }
  });

  // Get my daily reports
  app.get("/api/reports/daily/my", requireAuth, async (req, res) => {
    try {
      const month = req.query.month as string | undefined;
      const reports = await storage.getDailyShiftReportsByUser(req.session.userId!, month);
      res.json(reports);
    } catch (error) {
      console.error("Failed to fetch daily reports:", error);
      res.status(500).json({ error: "Failed to fetch daily reports" });
    }
  });

  // Get report by shift ID
  app.get("/api/reports/daily/shift/:shiftId", requireAuth, async (req, res) => {
    try {
      const report = await storage.getReportByShiftId(req.params.shiftId);
      res.json(report || null);
    } catch (error) {
      console.error("Failed to fetch report:", error);
      res.status(500).json({ error: "Failed to fetch report" });
    }
  });

  // Get today's report status
  app.get("/api/reports/daily/today", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const today = new Date().toISOString().split("T")[0];
      
      const shift = await storage.getShiftByUserAndDate(userId, today);
      if (!shift) {
        return res.json({ hasReport: false, report: null });
      }
      
      const report = await storage.getReportByShiftId(shift.id);
      res.json({ hasReport: !!report, report });
    } catch (error) {
      console.error("Failed to fetch today's report:", error);
      res.status(500).json({ error: "Failed to fetch today's report" });
    }
  });

  // Admin: Get all daily reports for a month
  app.get("/api/admin/reports/daily", requireAdmin, async (req, res) => {
    try {
      const month = req.query.month as string;
      if (!month) {
        return res.status(400).json({ error: "Month parameter required" });
      }
      const reports = await storage.getDailyShiftReportsByMonth(month);
      res.json(reports);
    } catch (error) {
      console.error("Failed to fetch daily reports:", error);
      res.status(500).json({ error: "Failed to fetch daily reports" });
    }
  });

  // ============= SPECIAL REQUEST ROUTES =============

  // Create special request (Employee)
  app.post("/api/requests/special", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      
      // Validate required fields
      if (!req.body.title || req.body.title.trim() === '') {
        return res.status(400).json({ error: "Title is required" });
      }
      if (!req.body.details || req.body.details.trim() === '') {
        return res.status(400).json({ error: "Details are required" });
      }
      
      const requestData = {
        userId,
        title: req.body.title.trim(),
        details: req.body.details.trim(),
        month: req.body.month || new Date().toISOString().slice(0, 7),
        status: "sent_for_approval",
        archived: false,
      };
      
      console.log("Creating special request:", requestData);
      
      const request = await storage.createSpecialRequest(requestData);
      
      console.log("Created special request:", request);
      
      await storage.createActivityLog({
        userId,
        action: "special_request_created",
        details: `Created special request: ${requestData.title}`,
        timestamp: new Date(),
      });
      
      res.json(request);
    } catch (error: any) {
      console.error("Failed to create request:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors[0].message });
      }
      res.status(500).json({ error: error.message || "Failed to create request" });
    }
  });

  // Get my special requests (Employee)
  app.get("/api/requests/special/my", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const month = req.query.month as string || new Date().toISOString().slice(0, 7);
      
      console.log("Fetching requests for user:", userId, "month:", month);
      
      const requests = await storage.getSpecialRequestsByUser(userId, month);
      
      console.log("Found requests:", requests.length);
      
      res.json(requests);
    } catch (error) {
      console.error("Failed to fetch requests:", error);
      res.status(500).json({ error: "Failed to fetch requests" });
    }
  });

  // Get all special requests (Admin) - WITH USER DATA
  app.get("/api/admin/requests/special", requireAdmin, async (req, res) => {
    try {
      const month = req.query.month as string || new Date().toISOString().slice(0, 7);
      const status = req.query.status as string;
      
      console.log("Admin fetching requests - Month:", month, "Status:", status);
      
      let requests;
      if (status && status !== "all") {
        requests = await storage.getSpecialRequestsByStatusWithUser(status, month);
      } else {
        requests = await storage.getSpecialRequestsByMonthWithUser(month);
      }
      
      console.log("Found admin requests:", requests.length);
      
      res.json(requests);
    } catch (error) {
      console.error("Failed to fetch requests:", error);
      res.status(500).json({ error: "Failed to fetch requests" });
    }
  });

  // Update special request status (Admin)
  app.patch("/api/admin/requests/special/:id", requireAdmin, async (req, res) => {
    try {
      const { status } = req.body;
      
      if (!status || !SPECIAL_REQUEST_STATUSES.includes(status)) {
        return res.status(400).json({ error: "Invalid status" });
      }

      const request = await storage.updateSpecialRequest(req.params.id, { status });
      
      if (!request) {
        return res.status(404).json({ error: "Request not found" });
      }

      res.json(request);
    } catch (error) {
      console.error("Failed to update request:", error);
      res.status(500).json({ error: "Failed to update request" });
    }
  });

  // ============= REQUEST COMMENT ROUTES =============

  // Add comment to request
  app.post("/api/requests/special/:id/comments", requireAuth, async (req, res) => {
    try {
      const requestId = req.params.id;
      const userId = req.session.userId!;
      const isAdmin = req.session.role === "admin";
      const { comment, statusChange } = req.body;
      
      if (!comment || comment.trim() === '') {
        return res.status(400).json({ error: "Comment is required" });
      }

      // Check if request exists
      const request = await storage.getSpecialRequest(requestId);
      if (!request) {
        return res.status(404).json({ error: "Request not found" });
      }

      // Check permissions - employee can only comment on their own requests
      if (!isAdmin && request.userId !== userId) {
        return res.status(403).json({ error: "Forbidden" });
      }

      // Create the comment
      const newComment = await storage.addRequestComment({
        requestId,
        userId,
        comment: comment.trim(),
        isAdminComment: isAdmin,
        statusChange: isAdmin && statusChange ? statusChange : null,
      });

      // Update request status if admin changed it
      if (isAdmin && statusChange && SPECIAL_REQUEST_STATUSES.includes(statusChange)) {
        await storage.updateSpecialRequest(requestId, { status: statusChange });
      }

      // Fetch comment with user info
      const commentWithUser = await storage.getRequestCommentWithUser(newComment.id);

      res.json(commentWithUser || newComment);
    } catch (error) {
      console.error("Failed to add comment:", error);
      res.status(500).json({ error: "Failed to add comment" });
    }
  });

  // Get comments for a request
  app.get("/api/requests/special/:id/comments", requireAuth, async (req, res) => {
    try {
      const requestId = req.params.id;
      const userId = req.session.userId!;
      const isAdmin = req.session.role === "admin";

      // Check if request exists
      const request = await storage.getSpecialRequest(requestId);
      if (!request) {
        return res.status(404).json({ error: "Request not found" });
      }

      // Check permissions
      if (!isAdmin && request.userId !== userId) {
        return res.status(403).json({ error: "Forbidden" });
      }

      const comments = await storage.getRequestCommentsWithUser(requestId);
      res.json(comments);
    } catch (error) {
      console.error("Failed to fetch comments:", error);
      res.status(500).json({ error: "Failed to fetch comments" });
    }
  });

  // ============= ARCHIVE ROUTES =============

  app.get("/api/archive/months", requireAuth, async (req, res) => {
    try {
      const months = await storage.getArchivedMonths();
      res.json(months);
    } catch (error) {
      console.error("Failed to fetch archived months:", error);
      res.status(500).json({ error: "Failed to fetch archived months" });
    }
  });

  app.get("/api/archive/reports/:month", requireAuth, async (req, res) => {
    try {
      const reports = await storage.getArchivedReports(req.params.month);
      res.json(reports);
    } catch (error) {
      console.error("Failed to fetch archived reports:", error);
      res.status(500).json({ error: "Failed to fetch archived reports" });
    }
  });

  app.get("/api/archive/requests/:month", requireAuth, async (req, res) => {
    try {
      const requests = await storage.getArchivedRequests(req.params.month);
      res.json(requests);
    } catch (error) {
      console.error("Failed to fetch archived requests:", error);
      res.status(500).json({ error: "Failed to fetch archived requests" });
    }
  });

  app.post("/api/admin/archive/:month", requireAdmin, async (req, res) => {
    try {
      const archive = await storage.archiveMonth(req.params.month);
      res.json(archive);
    } catch (error) {
      console.error("Failed to archive month:", error);
      res.status(500).json({ error: "Failed to archive month" });
    }
  });

  // ============= DEBUG ROUTE (Remove in production) =============
  app.get("/api/debug/requests", requireAdmin, async (req, res) => {
    try {
      const allRequests = await storage.getAllSpecialRequests();
      res.json({
        count: allRequests.length,
        requests: allRequests
      });
    } catch (error) {
      console.error("Debug error:", error);
      res.status(500).json({ error: String(error) });
    }
  });

  return httpServer;
}