// client/src/pages/admin/dashboard.tsx
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Users,
  Clock,
  Search,
  RefreshCw,
  Activity,
  Coffee,
  LogIn,
  LogOut,
  ChevronDown,
  ChevronRight,
  Circle,
  Filter,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { Shift, SafeUser, Break } from "@shared/schema";

const DEPARTMENTS = ["Development", "Business Development", "Designing Team"];

interface TodayShift extends Shift {
  user: SafeUser;
  breaks?: Break[];
}

type StatusType = "working" | "on_break" | "completed" | "not_started";

interface StatusInfo {
  type: StatusType;
  label: string;
  color: string;
  bgColor: string;
}

// Helpers
function getInitials(firstName: string, lastName: string) {
  return `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase() || "?";
}

function getAvatarColor(name: string) {
  const colors = [
    "bg-blue-500",
    "bg-emerald-500",
    "bg-violet-500",
    "bg-rose-500",
    "bg-amber-500",
    "bg-cyan-500",
  ];
  return colors[(name?.charCodeAt(0) || 0) % colors.length];
}

function getStatus(shift: TodayShift | null): StatusInfo {
  if (!shift) {
    return { 
      type: "not_started", 
      label: "Not Started", 
      color: "text-slate-400",
      bgColor: "bg-slate-100 dark:bg-slate-800"
    };
  }

  const activeBreak = shift.breaks?.some(b => !b.endTime);
  if (activeBreak) {
    return { 
      type: "on_break", 
      label: "On Break", 
      color: "text-amber-600",
      bgColor: "bg-amber-50 dark:bg-amber-950/50"
    };
  }

  const isWorking = (shift.morningClockIn && !shift.morningClockOut) || 
                    (shift.eveningClockIn && !shift.eveningClockOut);
  if (isWorking) {
    return { 
      type: "working", 
      label: "Working", 
      color: "text-emerald-600",
      bgColor: "bg-emerald-50 dark:bg-emerald-950/50"
    };
  }

  if (shift.morningClockOut || shift.eveningClockOut) {
    return { 
      type: "completed", 
      label: "Completed", 
      color: "text-blue-600",
      bgColor: "bg-blue-50 dark:bg-blue-950/50"
    };
  }

  return { 
    type: "not_started", 
    label: "Not Started", 
    color: "text-slate-400",
    bgColor: "bg-slate-100 dark:bg-slate-800"
  };
}

function getWorkHours(shift: TodayShift | null): string {
  if (!shift) return "—";
  
  let totalMinutes = 0;
  
  if (shift.morningClockIn) {
    const start = new Date(shift.morningClockIn);
    const end = shift.morningClockOut ? new Date(shift.morningClockOut) : new Date();
    totalMinutes += Math.floor((end.getTime() - start.getTime()) / 60000);
  }
  
  if (shift.eveningClockIn) {
    const start = new Date(shift.eveningClockIn);
    const end = shift.eveningClockOut ? new Date(shift.eveningClockOut) : new Date();
    totalMinutes += Math.floor((end.getTime() - start.getTime()) / 60000);
  }
  
  // Subtract break time
  if (shift.breaks) {
    shift.breaks.forEach(breakItem => {
      if (breakItem.startTime) {
        const breakStart = new Date(breakItem.startTime);
        const breakEnd = breakItem.endTime ? new Date(breakItem.endTime) : new Date();
        totalMinutes -= Math.floor((breakEnd.getTime() - breakStart.getTime()) / 60000);
      }
    });
  }
  
  if (totalMinutes <= 0) return "—";
  
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  return `${hours}h ${mins}m`;
}

function formatTime(date: string | Date | null): string {
  if (!date) return "—";
  return format(new Date(date), "h:mm a");
}

// Stat Card Component
function StatCard({ 
  label, 
  value, 
  color,
  active,
  onClick 
}: { 
  label: string; 
  value: number; 
  color: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-center justify-center px-4 py-3 rounded-lg border transition-all min-w-[100px]",
        active 
          ? "border-slate-900 dark:border-white bg-slate-900 dark:bg-white" 
          : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-600"
      )}
    >
      <span className={cn(
        "text-2xl font-bold",
        active ? "text-white dark:text-slate-900" : color
      )}>
        {value}
      </span>
      <span className={cn(
        "text-xs mt-0.5",
        active ? "text-slate-300 dark:text-slate-600" : "text-slate-500"
      )}>
        {label}
      </span>
    </button>
  );
}

// Status Indicator
function StatusIndicator({ status }: { status: StatusInfo }) {
  return (
    <div className={cn(
      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
      status.bgColor,
      status.color
    )}>
      <Circle className={cn(
        "h-2 w-2 fill-current",
        status.type === "working" && "animate-pulse"
      )} />
      {status.label}
    </div>
  );
}

// Employee Row Component
function EmployeeRow({ 
  employee, 
  shift,
  showDepartment = false 
}: { 
  employee: SafeUser; 
  shift: TodayShift | null;
  showDepartment?: boolean;
}) {
  const status = getStatus(shift);
  const workHours = getWorkHours(shift);
  const clockIn = shift?.morningClockIn || shift?.eveningClockIn;
  const clockOut = shift?.morningClockOut || shift?.eveningClockOut;

  return (
    <tr className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
      {/* Employee */}
      <td className="py-3 px-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9">
            <AvatarFallback className={cn("text-white text-xs font-medium", getAvatarColor(employee.firstName))}>
              {getInitials(employee.firstName, employee.lastName)}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium text-slate-900 dark:text-white text-sm">
              {employee.firstName} {employee.lastName}
            </p>
            {showDepartment && employee.department && (
              <p className="text-xs text-slate-500">{employee.department}</p>
            )}
          </div>
        </div>
      </td>

      {/* Status */}
      <td className="py-3 px-4">
        <StatusIndicator status={status} />
      </td>

      {/* Clock In */}
      <td className="py-3 px-4">
        <div className="flex items-center gap-2 text-sm">
          <LogIn className="h-4 w-4 text-slate-400" />
          <span className={clockIn ? "text-slate-700 dark:text-slate-300" : "text-slate-400"}>
            {formatTime(clockIn)}
          </span>
        </div>
      </td>

      {/* Clock Out */}
      <td className="py-3 px-4">
        <div className="flex items-center gap-2 text-sm">
          <LogOut className="h-4 w-4 text-slate-400" />
          <span className={clockOut ? "text-slate-700 dark:text-slate-300" : "text-slate-400"}>
            {formatTime(clockOut)}
          </span>
        </div>
      </td>

      {/* Hours Worked */}
      <td className="py-3 px-4">
        <div className="flex items-center gap-2 text-sm">
          <Clock className="h-4 w-4 text-slate-400" />
          <span className={cn(
            "font-medium",
            workHours !== "—" ? "text-slate-700 dark:text-slate-300" : "text-slate-400"
          )}>
            {workHours}
          </span>
        </div>
      </td>

      {/* Break Time */}
      <td className="py-3 px-4">
        <div className="flex items-center gap-2 text-sm">
          <Coffee className="h-4 w-4 text-slate-400" />
          <span className="text-slate-500">
            {shift?.breaks?.length ? `${shift.breaks.length} break${shift.breaks.length > 1 ? 's' : ''}` : "—"}
          </span>
        </div>
      </td>
    </tr>
  );
}

// Department Section
function DepartmentSection({
  name,
  employees,
  isExpanded,
  onToggle,
}: {
  name: string;
  employees: { employee: SafeUser; shift: TodayShift | null }[];
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const stats = useMemo(() => {
    let working = 0, onBreak = 0;
    employees.forEach(({ shift }) => {
      const status = getStatus(shift).type;
      if (status === "working") working++;
      if (status === "on_break") onBreak++;
    });
    return { working, onBreak, total: employees.length };
  }, [employees]);

  // Sort: working first, then on break, then completed, then not started
  const sortedEmployees = useMemo(() => {
    const order: Record<StatusType, number> = { working: 0, on_break: 1, completed: 2, not_started: 3 };
    return [...employees].sort((a, b) => {
      const statusA = getStatus(a.shift).type;
      const statusB = getStatus(b.shift).type;
      return order[statusA] - order[statusB];
    });
  }, [employees]);

  if (employees.length === 0) return null;

  return (
    <div className="mb-6">
      {/* Department Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors mb-2"
      >
        <div className="flex items-center gap-3">
          {isExpanded ? (
            <ChevronDown className="h-5 w-5 text-slate-400" />
          ) : (
            <ChevronRight className="h-5 w-5 text-slate-400" />
          )}
          <h3 className="font-semibold text-slate-900 dark:text-white">{name}</h3>
          <span className="text-sm text-slate-500">({stats.total})</span>
        </div>
        
        <div className="flex items-center gap-3">
          {stats.working > 0 && (
            <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400 hover:bg-emerald-100">
              {stats.working} working
            </Badge>
          )}
          {stats.onBreak > 0 && (
            <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400 hover:bg-amber-100">
              {stats.onBreak} on break
            </Badge>
          )}
        </div>
      </button>

      {/* Employees Table */}
      {isExpanded && (
        <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Employee
                </th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Clock In
                </th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Clock Out
                </th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Hours
                </th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Breaks
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedEmployees.map(({ employee, shift }) => (
                <EmployeeRow key={employee.id} employee={employee} shift={shift} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// Main Dashboard
export default function AdminDashboard() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");
  const [expandedDepts, setExpandedDepts] = useState<Set<string>>(new Set(DEPARTMENTS));

  // Fetch employees
  const { data: allEmployees = [], isLoading: loadingEmployees } = useQuery<SafeUser[]>({
    queryKey: ["/api/admin/employees"],
    select: (data) => data.filter(emp => emp.role === "employee" && emp.status === "active"),
  });

  // Fetch today's shifts
  const { data: todayShifts = [], isLoading: loadingShifts, refetch } = useQuery<TodayShift[]>({
    queryKey: ["/api/admin/shifts/today"],
    refetchInterval: 1000,
  });

  // Map shifts by user ID
  const shiftMap = useMemo(() => {
    const map = new Map<string, TodayShift>();
    todayShifts.forEach(shift => map.set(shift.userId, shift));
    return map;
  }, [todayShifts]);

  // Combine employees with their shifts
  const employeesWithShifts = useMemo(() => {
    return allEmployees.map(employee => ({
      employee,
      shift: shiftMap.get(employee.id) || null,
    }));
  }, [allEmployees, shiftMap]);

  // Get all departments
  const departments = useMemo(() => {
    const depts = new Set<string>(DEPARTMENTS);
    allEmployees.forEach(emp => {
      if (emp.department) depts.add(emp.department);
    });
    return Array.from(depts).sort();
  }, [allEmployees]);

  // Group by department
  const byDepartment = useMemo(() => {
    const groups: Record<string, typeof employeesWithShifts> = {};
    departments.forEach(d => groups[d] = []);
    
    employeesWithShifts.forEach(item => {
      const dept = item.employee.department || "Unassigned";
      if (!groups[dept]) groups[dept] = [];
      groups[dept].push(item);
    });
    
    return groups;
  }, [employeesWithShifts, departments]);

  // Calculate stats
  const stats = useMemo(() => {
    let working = 0, onBreak = 0, completed = 0, notStarted = 0;
    
    employeesWithShifts.forEach(({ shift }) => {
      const status = getStatus(shift).type;
      if (status === "working") working++;
      else if (status === "on_break") onBreak++;
      else if (status === "completed") completed++;
      else notStarted++;
    });

    return { 
      total: allEmployees.length,
      working, 
      onBreak, 
      completed, 
      notStarted 
    };
  }, [employeesWithShifts, allEmployees]);

  // Apply filters
  const getFilteredEmployees = (employees: typeof employeesWithShifts) => {
    return employees.filter(({ employee, shift }) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const fullName = `${employee.firstName} ${employee.lastName}`.toLowerCase();
        if (!fullName.includes(query)) return false;
      }

      // Status filter
      if (statusFilter !== "all") {
        const status = getStatus(shift).type;
        if (statusFilter === "working" && status !== "working") return false;
        if (statusFilter === "on_break" && status !== "on_break") return false;
        if (statusFilter === "completed" && status !== "completed") return false;
        if (statusFilter === "not_started" && status !== "not_started") return false;
      }

      return true;
    });
  };

  const toggleDepartment = (dept: string) => {
    const newExpanded = new Set(expandedDepts);
    if (newExpanded.has(dept)) {
      newExpanded.delete(dept);
    } else {
      newExpanded.add(dept);
    }
    setExpandedDepts(newExpanded);
  };

  const isLoading = loadingEmployees || loadingShifts;

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="h-6 w-6 text-slate-400 animate-spin" />
          <p className="text-sm text-slate-500">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <div className="shrink-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-semibold text-slate-900 dark:text-white">
              Staff Activity
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {format(new Date(), "EEEE, MMMM d, yyyy")} • {format(new Date(), "h:mm a")}
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1.5 py-1">
              <Activity className="h-3 w-3 text-emerald-500 animate-pulse" />
              Live
            </Badge>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-3 overflow-x-auto pb-2">
          <StatCard 
            label="Total" 
            value={stats.total} 
            color="text-slate-700 dark:text-slate-300"
            active={statusFilter === "all"}
            onClick={() => setStatusFilter("all")}
          />
          <StatCard 
            label="Working" 
            value={stats.working} 
            color="text-emerald-600"
            active={statusFilter === "working"}
            onClick={() => setStatusFilter("working")}
          />
          <StatCard 
            label="On Break" 
            value={stats.onBreak} 
            color="text-amber-600"
            active={statusFilter === "on_break"}
            onClick={() => setStatusFilter("on_break")}
          />
          <StatCard 
            label="Completed" 
            value={stats.completed} 
            color="text-blue-600"
            active={statusFilter === "completed"}
            onClick={() => setStatusFilter("completed")}
          />
          <StatCard 
            label="Not Started" 
            value={stats.notStarted} 
            color="text-slate-400"
            active={statusFilter === "not_started"}
            onClick={() => setStatusFilter("not_started")}
          />
        </div>
      </div>

      {/* Filters Bar */}
      <div className="shrink-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-3">
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search employees..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
            />
          </div>

          {/* Department Filter */}
          <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
            <SelectTrigger className="w-[180px] bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700">
              <Filter className="h-4 w-4 mr-2 text-slate-400" />
              <SelectValue placeholder="All Departments" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {departments.map(dept => (
                <SelectItem key={dept} value={dept}>{dept}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Quick Actions */}
          <div className="ml-auto flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setExpandedDepts(new Set(departments))}
            >
              Expand All
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setExpandedDepts(new Set())}
            >
              Collapse All
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <ScrollArea className="flex-1">
        <div className="p-6">
          {departmentFilter === "all" ? (
            // Show all departments
            departments.map(dept => {
              const employees = byDepartment[dept] || [];
              const filtered = getFilteredEmployees(employees);
              
              if (filtered.length === 0 && (searchQuery || statusFilter !== "all")) {
                return null;
              }

              return (
                <DepartmentSection
                  key={dept}
                  name={dept}
                  employees={filtered}
                  isExpanded={expandedDepts.has(dept)}
                  onToggle={() => toggleDepartment(dept)}
                />
              );
            })
          ) : (
            // Show single department
            <DepartmentSection
              name={departmentFilter}
              employees={getFilteredEmployees(byDepartment[departmentFilter] || [])}
              isExpanded={true}
              onToggle={() => {}}
            />
          )}

          {/* Empty State */}
          {employeesWithShifts.length === 0 && (
            <div className="text-center py-16">
              <Users className="h-12 w-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-1">
                No employees found
              </h3>
              <p className="text-sm text-slate-500">
                Add employees to start tracking their activity.
              </p>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="shrink-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 px-6 py-2">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>
            Showing {employeesWithShifts.length} employees across {departments.length} departments
          </span>
          <span>
            Auto-refreshes every 30 seconds
          </span>
        </div>
      </div>
    </div>
  );
}