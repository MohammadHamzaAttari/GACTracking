// client/src/App.tsx
import { Switch, Route, Redirect, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider, useAuth } from "@/lib/auth";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Preloader, PageLoader } from "@/components/preloader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Bell,
  Search,
  Command,
  Sparkles,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import NotFound from "@/pages/not-found";
import LoginPage from "@/pages/login";

// Admin Imports
import AdminDashboard from "@/pages/admin/dashboard";
import EmployeesPage from "@/pages/admin/employees";
import AdminAttendancePage from "@/pages/admin/attendance";
import ReportsPage from "@/pages/admin/reports";
import SettingsPage from "@/pages/admin/settings";
import AdminDailyReportsPage from "@/pages/admin/daily-reports";
import AdminSpecialRequestsPage from "@/pages/admin/special-requests";
import AdminArchivePage from "@/pages/admin/archive";
import AdminTargetBoard from "@/pages/admin/targets"; // ← ADD THIS

// Employee Imports
import EmployeeDashboard from "@/pages/employee/dashboard";
import EmployeeAttendancePage from "@/pages/employee/attendance";
import EmployeeCalendarPage from "@/pages/employee/calendar";
import ShiftReportPage from "@/pages/employee/shift-report";
import SpecialRequestPage from "@/pages/employee/special-request";
import EmployeeArchivePage from "@/pages/employee/archive";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

function ProtectedRoute({
  children,
  requiredRole,
}: {
  children: React.ReactNode;
  requiredRole?: "admin" | "employee";
}) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <PageLoader />;
  }

  if (!user) {
    return <Redirect to="/" />;
  }

  if (requiredRole && user.role !== requiredRole) {
    return <Redirect to={user.role === "admin" ? "/admin" : "/employee"} />;
  }

  return <>{children}</>;
}

// Header Component
function DashboardHeader() {
  const { user } = useAuth();
  const [location] = useLocation();

  const getPageTitle = () => {
    const titles: Record<string, string> = {
      "/admin": "Dashboard",
      "/admin/employees": "Employees",
      "/admin/attendance": "Attendance",
      "/admin/reports": "Reports",
      "/admin/settings": "Settings",
      "/admin/daily-reports": "Daily Reports",
      "/admin/special-requests": "Special Requests",
      "/admin/archive": "Archive",
      "/admin/targets": "Target Board", // ← ADD THIS
      "/employee": "Dashboard",
      "/employee/attendance": "My Attendance",
      "/employee/calendar": "Calendar",
      "/employee/shift-report": "Shift Report",
      "/employee/special-request": "Special Request",
      "/employee/archive": "Archive",
    };
    return titles[location] || "Dashboard";
  };

  return (
    <header className="shrink-0 h-14 flex items-center justify-between gap-4 border-b border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-slate-950/90 backdrop-blur-xl px-4 sticky top-0 z-40">
      <div className="flex items-center gap-4">
        <SidebarTrigger className="h-8 w-8 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg lg:hidden" />

        {/* Page Title */}
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">
            {getPageTitle()}
          </h1>
          <Badge
            variant="outline"
            className="text-[10px] font-bold uppercase tracking-wider bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800"
          >
            {user?.role}
          </Badge>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="hidden md:flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800/50 text-slate-500 min-w-[200px] lg:min-w-[280px] hover:bg-slate-200/80 dark:hover:bg-slate-700/50 transition-all cursor-pointer border border-transparent hover:border-slate-300 dark:hover:border-slate-600">
          <Search className="w-4 h-4" />
          <span className="text-sm flex-1">Search...</span>
          <kbd className="hidden lg:flex items-center gap-0.5 text-[10px] bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 font-mono">
            <Command className="w-2.5 h-2.5" />K
          </kbd>
        </div>

        {/* Quick Action */}
        <Button
          variant="outline"
          size="sm"
          className="hidden sm:flex gap-2 h-9 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/50 dark:to-indigo-950/50 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 hover:from-blue-100 hover:to-indigo-100 dark:hover:from-blue-900/50 dark:hover:to-indigo-900/50 transition-all"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span className="text-xs font-semibold">Quick Action</span>
        </Button>

        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative h-9 w-9 rounded-xl">
              <Bell className="w-4 h-4" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white dark:ring-slate-950 animate-pulse" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel className="flex items-center justify-between">
              <span>Notifications</span>
              <Badge variant="secondary" className="text-[10px] bg-red-100 text-red-600">
                3 new
              </Badge>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <div className="max-h-[300px] overflow-y-auto">
              <DropdownMenuItem className="flex flex-col items-start gap-1 p-3 cursor-pointer">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full" />
                  <span className="font-medium text-sm">New attendance record</span>
                </div>
                <span className="text-xs text-slate-500 pl-4">2 minutes ago</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="flex flex-col items-start gap-1 p-3 cursor-pointer">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                  <span className="font-medium text-sm">Report approved</span>
                </div>
                <span className="text-xs text-slate-500 pl-4">1 hour ago</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="flex flex-col items-start gap-1 p-3 cursor-pointer">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-orange-500 rounded-full" />
                  <span className="font-medium text-sm">New request pending</span>
                </div>
                <span className="text-xs text-slate-500 pl-4">3 hours ago</span>
              </DropdownMenuItem>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="justify-center text-blue-600 font-medium cursor-pointer">
              View all notifications
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider
      defaultOpen={false}
      style={{
        "--sidebar-width": "16rem",
        "--sidebar-width-icon": "4.5rem",
      } as React.CSSProperties}
    >
      <div className="flex h-screen w-full overflow-hidden bg-slate-50 dark:bg-slate-950">
        <AppSidebar />

        {/* Main Content Area */}
        <div className="flex flex-col flex-1 h-full min-w-0">
          <DashboardHeader />

          {/* Main Content */}
          <main className="flex-1 overflow-hidden">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function AppRoutes() {
  const { user, isLoading } = useAuth();
  const [location] = useLocation();

  if (isLoading) {
    return <PageLoader />;
  }

  if (user && location === "/") {
    return <Redirect to={user.role === "admin" ? "/admin" : "/employee"} />;
  }

  return (
    <Switch>
      <Route path="/" component={LoginPage} />

      {/* Admin Routes */}
      <Route path="/admin">
        <ProtectedRoute requiredRole="admin">
          <DashboardLayout>
            <AdminDashboard />
          </DashboardLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/admin/employees">
        <ProtectedRoute requiredRole="admin">
          <DashboardLayout>
            <EmployeesPage />
          </DashboardLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/admin/attendance">
        <ProtectedRoute requiredRole="admin">
          <DashboardLayout>
            <AdminAttendancePage />
          </DashboardLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/admin/reports">
        <ProtectedRoute requiredRole="admin">
          <DashboardLayout>
            <ReportsPage />
          </DashboardLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/admin/settings">
        <ProtectedRoute requiredRole="admin">
          <DashboardLayout>
            <SettingsPage />
          </DashboardLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/admin/daily-reports">
        <ProtectedRoute requiredRole="admin">
          <DashboardLayout>
            <AdminDailyReportsPage />
          </DashboardLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/admin/special-requests">
        <ProtectedRoute requiredRole="admin">
          <DashboardLayout>
            <AdminSpecialRequestsPage />
          </DashboardLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/admin/archive">
        <ProtectedRoute requiredRole="admin">
          <DashboardLayout>
            <AdminArchivePage />
          </DashboardLayout>
        </ProtectedRoute>
      </Route>
      {/* ↓↓↓ ADD THIS NEW ROUTE ↓↓↓ */}
      <Route path="/admin/targets">
        <ProtectedRoute requiredRole="admin">
          <DashboardLayout>
            <AdminTargetBoard />
          </DashboardLayout>
        </ProtectedRoute>
      </Route>
      {/* ↑↑↑ ADD THIS NEW ROUTE ↑↑↑ */}

      {/* Employee Routes */}
      <Route path="/employee">
        <ProtectedRoute requiredRole="employee">
          <DashboardLayout>
            <EmployeeDashboard />
          </DashboardLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/employee/attendance">
        <ProtectedRoute requiredRole="employee">
          <DashboardLayout>
            <EmployeeAttendancePage />
          </DashboardLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/employee/calendar">
        <ProtectedRoute requiredRole="employee">
          <DashboardLayout>
            <EmployeeCalendarPage />
          </DashboardLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/employee/shift-report">
        <ProtectedRoute requiredRole="employee">
          <DashboardLayout>
            <ShiftReportPage />
          </DashboardLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/employee/special-request">
        <ProtectedRoute requiredRole="employee">
          <DashboardLayout>
            <SpecialRequestPage />
          </DashboardLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/employee/archive">
        <ProtectedRoute requiredRole="employee">
          <DashboardLayout>
            <EmployeeArchivePage />
          </DashboardLayout>
        </ProtectedRoute>
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [showPreloader, setShowPreloader] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShowPreloader(false), 1800);
    return () => clearTimeout(timer);
  }, []);

  return (
    <ThemeProvider defaultTheme="dark" storageKey="dash-hr-theme">
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <TooltipProvider delayDuration={0}>
            {showPreloader && <Preloader isLoading={showPreloader} />}
            <Toaster />
            <AppRoutes />
          </TooltipProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;