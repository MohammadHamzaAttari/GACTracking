// client/src/pages/admin/attendance.tsx
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isToday, isSameDay } from "date-fns";
import {
  Calendar as CalendarIcon,
  Search,
  Download,
  Clock,
  Filter,
  Users,
  LogIn,
  LogOut,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  XCircle,
  AlertCircle,
  Coffee,
  Building2,
  User,
  Timer,
  X,
  BarChart3,
  Loader2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Calendar } from "@/components/ui/calendar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import type { SafeUser, Shift, Break } from "@shared/schema";

// Types
interface ShiftWithUser extends Shift {
  user: SafeUser;
  breaks?: Break[];
}

interface AttendanceStats {
  total: number;
  present: number;
  late: number;
  absent: number;
  onBreak: number;
}

// Helpers
function getInitials(firstName: string, lastName: string) {
  return `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase() || "?";
}

function getAvatarGradient(name: string) {
  const gradients = [
    "from-violet-500 to-purple-600",
    "from-blue-500 to-cyan-500",
    "from-emerald-500 to-teal-500",
    "from-orange-500 to-red-500",
    "from-pink-500 to-rose-500",
    "from-indigo-500 to-blue-600",
  ];
  return gradients[(name?.charCodeAt(0) || 0) % gradients.length];
}

function formatTime(date: string | Date | null): string {
  if (!date) return "—";
  return format(new Date(date), "h:mm a");
}

function calculateDuration(clockIn: string | Date | null, clockOut: string | Date | null, breaks?: Break[]): string {
  if (!clockIn) return "—";
  
  const start = new Date(clockIn);
  const end = clockOut ? new Date(clockOut) : new Date();
  let totalMinutes = Math.floor((end.getTime() - start.getTime()) / 60000);
  
  // Subtract break time
  if (breaks) {
    breaks.forEach(b => {
      if (b.startTime) {
        const breakStart = new Date(b.startTime);
        const breakEnd = b.endTime ? new Date(b.endTime) : new Date();
        totalMinutes -= Math.floor((breakEnd.getTime() - breakStart.getTime()) / 60000);
      }
    });
  }
  
  if (totalMinutes <= 0) return "—";
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  return `${hours}h ${mins}m`;
}

function getAttendanceStatus(shift: ShiftWithUser | null, employee: SafeUser) {
  if (!shift) {
    return { 
      status: "absent", 
      label: "Absent", 
      color: "text-red-600",
      bg: "bg-red-50 dark:bg-red-900/30",
      icon: XCircle
    };
  }

  const hasActiveBreak = shift.breaks?.some(b => !b.endTime);
  if (hasActiveBreak) {
    return { 
      status: "break", 
      label: "On Break", 
      color: "text-amber-600",
      bg: "bg-amber-50 dark:bg-amber-900/30",
      icon: Coffee
    };
  }

  const isWorking = (shift.morningClockIn && !shift.morningClockOut) || 
                    (shift.eveningClockIn && !shift.eveningClockOut);
  
  if (isWorking) {
    // Check if late (if employee has shift start time)
    const expectedStart = employee.shiftStartTime;
    const actualStart = shift.morningClockIn || shift.eveningClockIn;
    
    if (expectedStart && actualStart) {
      const [expectedHour, expectedMin] = expectedStart.split(':').map(Number);
      const actualTime = new Date(actualStart);
      const expectedTime = new Date(actualTime);
      expectedTime.setHours(expectedHour, expectedMin, 0, 0);
      
      // If clocked in more than 15 minutes late
      if (actualTime.getTime() - expectedTime.getTime() > 15 * 60 * 1000) {
        return { 
          status: "late", 
          label: "Late", 
          color: "text-amber-600",
          bg: "bg-amber-50 dark:bg-amber-900/30",
          icon: AlertCircle
        };
      }
    }
    
    return { 
      status: "present", 
      label: "Working", 
      color: "text-emerald-600",
      bg: "bg-emerald-50 dark:bg-emerald-900/30",
      icon: CheckCircle
    };
  }

  if (shift.morningClockOut || shift.eveningClockOut) {
    return { 
      status: "completed", 
      label: "Completed", 
      color: "text-blue-600",
      bg: "bg-blue-50 dark:bg-blue-900/30",
      icon: CheckCircle
    };
  }

  return { 
    status: "absent", 
    label: "Absent", 
    color: "text-slate-400",
    bg: "bg-slate-50 dark:bg-slate-800",
    icon: XCircle
  };
}

// Generate month options
function getMonthOptions() {
  const options = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    options.push({
      value: format(date, "yyyy-MM"),
      label: format(date, "MMMM yyyy"),
    });
  }
  return options;
}

// Mini Stat Pill
function StatPill({ 
  icon: Icon, 
  value, 
  label, 
  color,
  active,
  onClick
}: { 
  icon: any; 
  value: number; 
  label: string; 
  color: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all",
        "hover:scale-105 active:scale-95",
        active 
          ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-lg" 
          : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 shadow-sm hover:shadow-md"
      )}
    >
      <Icon className={cn("h-3.5 w-3.5", active ? "" : color)} />
      <span className="font-bold">{value}</span>
      <span className="hidden sm:inline opacity-70">{label}</span>
    </button>
  );
}

// Attendance Row Component
function AttendanceRow({ 
  employee, 
  shift 
}: { 
  employee: SafeUser; 
  shift: ShiftWithUser | null;
}) {
  const status = getAttendanceStatus(shift, employee);
  const StatusIcon = status.icon;
  const clockIn = shift?.morningClockIn || shift?.eveningClockIn;
  const clockOut = shift?.morningClockOut || shift?.eveningClockOut;
  const workDuration = calculateDuration(clockIn, clockOut, shift?.breaks);
  const breakCount = shift?.breaks?.length || 0;

  return (
    <tr className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
      {/* Employee */}
      <td className="py-3 px-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9 ring-2 ring-white dark:ring-slate-900 shadow-sm">
            <AvatarFallback className={cn(
              "text-xs font-bold text-white bg-gradient-to-br",
              getAvatarGradient(employee.firstName || "")
            )}>
              {getInitials(employee.firstName || "", employee.lastName || "")}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium text-sm text-slate-900 dark:text-white">
              {employee.firstName} {employee.lastName}
            </p>
            {employee.department && (
              <p className="text-[10px] text-slate-500 flex items-center gap-1">
                <Building2 className="h-2.5 w-2.5" />
                {employee.department}
              </p>
            )}
          </div>
        </div>
      </td>

      {/* Status */}
      <td className="py-3 px-4">
        <div className={cn(
          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
          status.bg, status.color
        )}>
          <StatusIcon className={cn(
            "h-3.5 w-3.5",
            (status.status === "present" || status.status === "break") && "animate-pulse"
          )} />
          {status.label}
        </div>
      </td>

      {/* Clock In */}
      <td className="py-3 px-4">
        <div className="flex items-center gap-2 text-sm">
          <LogIn className="h-4 w-4 text-slate-400" />
          <span className={cn(
            "font-mono",
            clockIn ? "text-slate-700 dark:text-slate-300" : "text-slate-400"
          )}>
            {formatTime(clockIn)}
          </span>
        </div>
      </td>

      {/* Clock Out */}
      <td className="py-3 px-4">
        <div className="flex items-center gap-2 text-sm">
          <LogOut className="h-4 w-4 text-slate-400" />
          <span className={cn(
            "font-mono",
            clockOut ? "text-slate-700 dark:text-slate-300" : "text-slate-400"
          )}>
            {formatTime(clockOut)}
          </span>
        </div>
      </td>

      {/* Work Hours */}
      <td className="py-3 px-4">
        <div className="flex items-center gap-2 text-sm">
          <Timer className="h-4 w-4 text-slate-400" />
          <span className={cn(
            "font-medium",
            workDuration !== "—" ? "text-slate-700 dark:text-slate-300" : "text-slate-400"
          )}>
            {workDuration}
          </span>
        </div>
      </td>

      {/* Breaks */}
      <td className="py-3 px-4">
        <div className="flex items-center gap-2 text-sm">
          <Coffee className="h-4 w-4 text-slate-400" />
          <span className="text-slate-500">
            {breakCount > 0 ? `${breakCount} break${breakCount > 1 ? 's' : ''}` : "—"}
          </span>
        </div>
      </td>
    </tr>
  );
}

// Department Group
function DepartmentGroup({ 
  department, 
  attendanceData,
}: { 
  department: string; 
  attendanceData: { employee: SafeUser; shift: ShiftWithUser | null }[];
}) {
  const stats = useMemo(() => {
    let present = 0, absent = 0, late = 0;
    attendanceData.forEach(({ employee, shift }) => {
      const status = getAttendanceStatus(shift, employee).status;
      if (status === "present" || status === "completed" || status === "break") present++;
      else if (status === "late") late++;
      else absent++;
    });
    return { present, absent, late, total: attendanceData.length };
  }, [attendanceData]);

  return (
    <div className="mb-6">
      {/* Department Header */}
      <div className="flex items-center gap-2 mb-3">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white dark:bg-slate-800 shadow-sm">
          <Building2 className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs font-semibold text-slate-900 dark:text-white">
            {department}
          </span>
        </div>
        
        <div className="flex items-center gap-1">
          {stats.present > 0 && (
            <Badge className="text-[10px] px-1.5 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">
              {stats.present} present
            </Badge>
          )}
          {stats.late > 0 && (
            <Badge className="text-[10px] px-1.5 bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">
              {stats.late} late
            </Badge>
          )}
          {stats.absent > 0 && (
            <Badge className="text-[10px] px-1.5 bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400">
              {stats.absent} absent
            </Badge>
          )}
        </div>
        
        <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
      </div>

      {/* Table */}
      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50 dark:bg-slate-800/50">
              <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Employee</TableHead>
              <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</TableHead>
              <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Clock In</TableHead>
              <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Clock Out</TableHead>
              <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Hours</TableHead>
              <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Breaks</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {attendanceData.map(({ employee, shift }) => (
              <AttendanceRow key={employee.id} employee={employee} shift={shift} />
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

// Main Component
export default function AttendancePage() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");
  const [groupByDepartment, setGroupByDepartment] = useState(true);

  const dateParam = format(selectedDate, "yyyy-MM-dd");

  // Fetch all employees
  const { data: employees = [] } = useQuery<SafeUser[]>({
    queryKey: ["/api/admin/employees"],
    select: (data) => data.filter(emp => emp.role === "employee" && emp.status === "active"),
  });

  // Fetch shifts for selected date
  const { data: shifts = [], isLoading, refetch } = useQuery<ShiftWithUser[]>({
    queryKey: ["/api/admin/shifts", { date: dateParam }],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/admin/shifts?date=${dateParam}`);
      if (!res.ok) return [];
      return res.json();
    },
  });

  // Map shifts by userId
  const shiftsByUserId = useMemo(() => {
    const map = new Map<string, ShiftWithUser>();
    shifts.forEach(shift => map.set(shift.userId, shift));
    return map;
  }, [shifts]);

  // Combine employees with their attendance
  const attendanceData = useMemo(() => {
    return employees.map(employee => ({
      employee,
      shift: shiftsByUserId.get(employee.id) || null,
    }));
  }, [employees, shiftsByUserId]);

  // Get departments
  const departments = useMemo(() => {
    const depts = new Set<string>();
    employees.forEach(emp => {
      if (emp.department) depts.add(emp.department);
    });
    return Array.from(depts).sort();
  }, [employees]);

  // Calculate stats
  const stats = useMemo(() => {
    let present = 0, late = 0, absent = 0, onBreak = 0;
    attendanceData.forEach(({ employee, shift }) => {
      const status = getAttendanceStatus(shift, employee).status;
      if (status === "present" || status === "completed") present++;
      else if (status === "late") late++;
      else if (status === "break") onBreak++;
      else absent++;
    });
    return { total: employees.length, present, late, absent, onBreak };
  }, [attendanceData, employees]);

  // Filter data
  const filteredData = useMemo(() => {
    let filtered = [...attendanceData];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(({ employee }) =>
        `${employee.firstName} ${employee.lastName}`.toLowerCase().includes(query)
      );
    }

    if (departmentFilter !== "all") {
      filtered = filtered.filter(({ employee }) => employee.department === departmentFilter);
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter(({ employee, shift }) => {
        const status = getAttendanceStatus(shift, employee).status;
        if (statusFilter === "present") return status === "present" || status === "completed";
        if (statusFilter === "late") return status === "late";
        if (statusFilter === "absent") return status === "absent";
        if (statusFilter === "break") return status === "break";
        return true;
      });
    }

    return filtered;
  }, [attendanceData, searchQuery, departmentFilter, statusFilter]);

  // Group by department
  const groupedData = useMemo(() => {
    if (!groupByDepartment) return { "All Employees": filteredData };
    
    const groups: Record<string, typeof filteredData> = {};
    filteredData.forEach(item => {
      const dept = item.employee.department || "Unassigned";
      if (!groups[dept]) groups[dept] = [];
      groups[dept].push(item);
    });
    return groups;
  }, [filteredData, groupByDepartment]);

  // Navigation
  const goToPreviousDay = () => {
    const prev = new Date(selectedDate);
    prev.setDate(prev.getDate() - 1);
    setSelectedDate(prev);
  };

  const goToNextDay = () => {
    const next = new Date(selectedDate);
    next.setDate(next.getDate() + 1);
    setSelectedDate(next);
  };

  const goToToday = () => setSelectedDate(new Date());
  const isTodaySelected = format(selectedDate, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");

  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setDepartmentFilter("all");
  };

  const hasActiveFilters = searchQuery || statusFilter !== "all" || departmentFilter !== "all";

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Loading attendance...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col gap-3 p-2">
      {/* Header Bar */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Date Navigation */}
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={goToPreviousDay}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="h-8 gap-2 text-xs font-medium">
                <CalendarIcon className="h-3.5 w-3.5" />
                {format(selectedDate, "EEE, MMM d, yyyy")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={goToNextDay}>
            <ChevronRight className="h-4 w-4" />
          </Button>

          {!isTodaySelected && (
            <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={goToToday}>
              Today
            </Button>
          )}
        </div>

        <div className="h-5 w-px bg-slate-200 dark:bg-slate-700" />

        {/* Stats Pills */}
        <div className="flex items-center gap-1.5">
          <StatPill 
            icon={Users} 
            value={stats.total} 
            label="Total" 
            color="text-slate-500"
            active={statusFilter === "all"}
            onClick={() => setStatusFilter("all")}
          />
          <StatPill 
            icon={CheckCircle} 
            value={stats.present} 
            label="Present" 
            color="text-emerald-500"
            active={statusFilter === "present"}
            onClick={() => setStatusFilter("present")}
          />
          <StatPill 
            icon={AlertCircle} 
            value={stats.late} 
            label="Late" 
            color="text-amber-500"
            active={statusFilter === "late"}
            onClick={() => setStatusFilter("late")}
          />
          <StatPill 
            icon={XCircle} 
            value={stats.absent} 
            label="Absent" 
            color="text-red-500"
            active={statusFilter === "absent"}
            onClick={() => setStatusFilter("absent")}
          />
          <StatPill 
            icon={Coffee} 
            value={stats.onBreak} 
            label="Break" 
            color="text-orange-500"
            active={statusFilter === "break"}
            onClick={() => setStatusFilter("break")}
          />
        </div>

        <div className="h-5 w-px bg-slate-200 dark:bg-slate-700 hidden md:block" />

        {/* Search */}
        <div className="relative flex-1 min-w-[140px] max-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <Input
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 pl-8 text-xs bg-white dark:bg-slate-800 border-0 shadow-sm"
          />
        </div>

        {/* Department Filter */}
        <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
          <SelectTrigger className="h-8 w-[130px] text-xs bg-white dark:bg-slate-800 border-0 shadow-sm">
            <Building2 className="h-3 w-3 mr-1 text-slate-400" />
            <SelectValue placeholder="All Depts" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Depts</SelectItem>
            {departments.map(dept => (
              <SelectItem key={dept} value={dept}>{dept}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Group Toggle */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={groupByDepartment ? "default" : "ghost"}
              size="sm"
              className="h-8 px-2"
              onClick={() => setGroupByDepartment(!groupByDepartment)}
            >
              <BarChart3 className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {groupByDepartment ? "Show all" : "Group by department"}
          </TooltipContent>
        </Tooltip>

        {/* Actions */}
        <div className="flex items-center gap-1 ml-auto">
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={clearFilters}>
              <X className="h-3 w-3 mr-1" />
              Clear
            </Button>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => refetch()}>
                <RefreshCw className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Refresh</TooltipContent>
          </Tooltip>
          <Button variant="outline" size="sm" className="h-8 text-xs">
            <Download className="h-3.5 w-3.5 mr-1.5" />
            Export
          </Button>
        </div>
      </div>

      {/* Info Bar */}
      <div className="flex items-center justify-between px-1">
        <p className="text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">{filteredData.length}</span> employees
          {departmentFilter !== "all" && ` in ${departmentFilter}`}
        </p>
        <p className="text-[10px] text-muted-foreground">
          {isTodaySelected ? "Today" : format(selectedDate, "EEEE, MMMM d, yyyy")}
        </p>
      </div>

      {/* Main Content */}
      <ScrollArea className="flex-1 -mx-2 px-2">
        {filteredData.length === 0 ? (
          <div className="h-full flex items-center justify-center py-20">
            <div className="text-center">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
                <Users className="h-6 w-6 text-slate-400" />
              </div>
              <p className="font-medium text-slate-900 dark:text-white mb-1">No records found</p>
              <p className="text-sm text-slate-500">
                {hasActiveFilters ? "Try adjusting your filters" : "No attendance data for this date"}
              </p>
            </div>
          </div>
        ) : groupByDepartment ? (
          <div className="space-y-4 pb-4">
            {Object.entries(groupedData)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([department, data]) => (
                <DepartmentGroup
                  key={department}
                  department={department}
                  attendanceData={data}
                />
              ))}
          </div>
        ) : (
          <Card className="overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 dark:bg-slate-800/50">
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Employee</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Clock In</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Clock Out</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Hours</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Breaks</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.map(({ employee, shift }) => (
                  <AttendanceRow key={employee.id} employee={employee} shift={shift} />
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </ScrollArea>
    </div>
  );
}