import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import bcrypt from "bcrypt";
import { storage } from "./storage";
import { insertUserSchema, insertShiftSchema, insertBreakSchema, loginSchema, BREAK_LIMITS } from "@shared/schema";
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
      res.status(500).json({ error: "Internal server error" });
    }
  });
  
  // Get current user
  app.get("/api/auth/me", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    
    const user = await storage.getUser(req.session.userId);
    if (!user) {
      req.session.destroy(() => {});
      return res.status(401).json({ error: "User not found" });
    }
    
    const { password, ...safeUser } = user;
    res.json({ user: safeUser });
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
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });
  
  // Get all employees
  app.get("/api/admin/employees", requireAdmin, async (req, res) => {
    try {
      const employees = await storage.getAllUsers();
      res.json(employees);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch employees" });
    }
  });
  
  // Create employee
  app.post("/api/admin/employees", requireAdmin, async (req, res) => {
    try {
      const data = insertUserSchema.parse(req.body);
      
      const existing = await storage.getUserByUsername(data.username);
      if (existing) {
        return res.status(400).json({ error: "Username already exists" });
      }
      
      const hashedPassword = await bcrypt.hash(data.password, SALT_ROUNDS);
      const user = await storage.createUser({ ...data, password: hashedPassword });
      const { password, ...safeUser } = user;
      res.json(safeUser);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors[0].message });
      }
      res.status(500).json({ error: "Failed to create employee" });
    }
  });
  
  // Update employee
  app.patch("/api/admin/employees/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const data = req.body;
      
      // Remove password if empty, otherwise hash it
      if (data.password === "" || !data.password) {
        delete data.password;
      } else {
        data.password = await bcrypt.hash(data.password, SALT_ROUNDS);
      }
      
      const user = await storage.updateUser(id, data);
      if (!user) {
        return res.status(404).json({ error: "Employee not found" });
      }
      
      const { password, ...safeUser } = user;
      res.json(safeUser);
    } catch (error) {
      res.status(500).json({ error: "Failed to update employee" });
    }
  });
  
  // Delete employee
  app.delete("/api/admin/employees/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteUser(id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete employee" });
    }
  });

  // Get today's shifts (Staff Activity Monitor)
  app.get("/api/admin/shifts/today", requireAdmin, async (req, res) => {
    try {
      const shifts = await storage.getTodayShifts();
      res.json(shifts);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch today's shifts" });
    }
  });

  // Get recent activity logs
  app.get("/api/admin/activity-logs", requireAdmin, async (req, res) => {
    try {
      const logs = await storage.getRecentActivityLogs(50);
      res.json(logs);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch activity logs" });
    }
  });

  // WASENDER API Config
  app.get("/api/admin/wasender-config", requireAdmin, async (req, res) => {
    try {
      const config = await storage.getWasenderConfig();
      res.json(config || { instanceId: "", apiToken: "", isActive: false });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch WASENDER config" });
    }
  });

  app.post("/api/admin/wasender-config", requireAdmin, async (req, res) => {
    try {
      const { instanceId, apiToken, isActive } = req.body;
      const config = await storage.updateWasenderConfig({ instanceId, apiToken, isActive });
      res.json(config);
    } catch (error) {
      res.status(500).json({ error: "Failed to update WASENDER config" });
    }
  });

  app.post("/api/admin/wasender-test", requireAdmin, async (req, res) => {
    try {
      const config = await storage.getWasenderConfig();
      if (!config?.instanceId || !config?.apiToken) {
        return res.status(400).json({ error: "WASENDER not configured" });
      }
      
      // Test connection (mock for now)
      await storage.updateWasenderConfig({ lastTested: new Date() });
      res.json({ success: true, message: "Connection successful" });
    } catch (error) {
      res.status(500).json({ error: "Failed to test WASENDER connection" });
    }
  });

  // Departments
  app.get("/api/admin/departments", requireAdmin, async (req, res) => {
    try {
      const departments = await storage.getDepartments();
      res.json(departments);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch departments" });
    }
  });

  app.patch("/api/admin/departments/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const dept = await storage.updateDepartment(id, req.body);
      res.json(dept);
    } catch (error) {
      res.status(500).json({ error: "Failed to update department" });
    }
  });

  // ============= EMPLOYEE ROUTES =============
  
  // Get today's shift status
  app.get("/api/employee/today", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const today = new Date().toISOString().split("T")[0];
      
      const shift = await storage.getShiftByUserAndDate(userId, today);
      const activeBreak = await storage.getActiveBreak(userId);
      const breaks = await storage.getBreaksByUserAndDate(userId, today);
      const activityLogs = await storage.getActivityLogsByUser(userId, today);
      
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
      });
    } catch (error) {
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
      
      // Check if late
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
      
      // Log activity
      await storage.createActivityLog({
        userId,
        action: "morning_clock_in",
        details: lateMinutes > 0 ? `Late by ${lateMinutes} minutes` : "On time",
        timestamp: now,
      });
      
      res.json(shift);
    } catch (error) {
      res.status(500).json({ error: "Failed to start morning shift" });
    }
  });
  
  // End morning shift
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
      
      if (shift) {
        shift = await storage.updateShift(shift.id, {
          eveningClockIn: now,
        });
      } else {
        shift = await storage.createShift({
          userId,
          date: today,
          eveningClockIn: now,
          status: "present",
        });
      }
      
      await storage.createActivityLog({
        userId,
        action: "evening_clock_in",
        details: "Evening shift started",
        timestamp: now,
      });
      
      res.json(shift);
    } catch (error) {
      res.status(500).json({ error: "Failed to start evening shift" });
    }
  });
  
  // End evening shift
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
      res.status(500).json({ error: "Failed to end evening shift" });
    }
  });

  // Start break
  app.post("/api/employee/break/start", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const today = new Date().toISOString().split("T")[0];
      const now = new Date();
      const { type } = req.body; // prayer, meal, urgent
      
      if (!["prayer", "meal", "urgent"].includes(type)) {
        return res.status(400).json({ error: "Invalid break type" });
      }
      
      // Check if already on break
      const activeBreak = await storage.getActiveBreak(userId);
      if (activeBreak) {
        return res.status(400).json({ error: "Already on a break" });
      }
      
      // Check break limits
      const shift = await storage.getShiftByUserAndDate(userId, today);
      const currentPeriod = now.getHours() < 14 ? "morning" : "evening";
      
      if (type === "prayer") {
        // Prayer breaks: max 3 per day, morning only
        const count = await storage.countBreaksByType(userId, today, "prayer");
        if (count >= BREAK_LIMITS.prayer.maxPerDay) {
          return res.status(400).json({ error: "Maximum prayer breaks reached for today" });
        }
      } else if (type === "meal") {
        // Meal breaks: max 1 per day
        const count = await storage.countBreaksByType(userId, today, "meal");
        if (count >= BREAK_LIMITS.meal.maxPerDay) {
          return res.status(400).json({ error: "Meal break already taken today" });
        }
      } else if (type === "urgent") {
        // Urgent breaks: max 2 per shift
        const count = await storage.countBreaksByType(userId, today, "urgent", currentPeriod);
        if (count >= BREAK_LIMITS.urgent.maxPerShift) {
          return res.status(400).json({ error: "Maximum urgent breaks reached for this shift" });
        }
      }
      
      const breakRecord = await storage.createBreak({
        userId,
        shiftId: shift?.id,
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
      res.status(500).json({ error: "Failed to fetch activity logs" });
    }
  });

  // ============= TARGETS ROUTES =============
  
  // Get employee's targets for current month
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
      res.status(500).json({ error: "Failed to fetch targets" });
    }
  });

  // Add target item (meeting or order)
  app.post("/api/employee/targets/items", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const { type, name, source, contactLink, date } = req.body;
      const month = (date as string).slice(0, 7);
      
      if (!["meeting", "order"].includes(type)) {
        return res.status(400).json({ error: "Invalid target item type" });
      }
      
      // Get or create target for this month
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
      res.status(500).json({ error: "Failed to add target item" });
    }
  });

  // Admin: Get all targets for a month
  app.get("/api/admin/targets", requireAdmin, async (req, res) => {
    try {
      const month = req.query.month as string || new Date().toISOString().slice(0, 7);
      const allTargets = await storage.getAllTargetsForMonth(month);
      res.json(allTargets);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch targets" });
    }
  });

  // Admin: Set target goals for an employee
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
      res.status(500).json({ error: "Failed to set targets" });
    }
  });

  // Admin: Verify target item
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
      res.status(500).json({ error: "Failed to verify target item" });
    }
  });

  // Admin: Get all target items (for verification board)
  app.get("/api/admin/targets/items", requireAdmin, async (req, res) => {
    try {
      const month = req.query.month as string || new Date().toISOString().slice(0, 7);
      const items = await storage.getAllTargetItemsForMonth(month);
      res.json(items);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch target items" });
    }
  });

  // ============= ANALYTICS ROUTES =============
  
  // Admin: Get attendance analytics
  app.get("/api/admin/analytics/attendance", requireAdmin, async (req, res) => {
    try {
      const startDate = req.query.startDate as string;
      const endDate = req.query.endDate as string;
      const analytics = await storage.getAttendanceAnalytics(startDate, endDate);
      res.json(analytics);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch attendance analytics" });
    }
  });

  // Admin: Get department stats
  app.get("/api/admin/analytics/departments", requireAdmin, async (req, res) => {
    try {
      const stats = await storage.getDepartmentStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch department stats" });
    }
  });

  return httpServer;
}
