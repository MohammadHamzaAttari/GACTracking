// client/src/pages/admin/dashboard.tsx
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Users,
  Clock,
  UserCheck,
  Coffee,
  Sun,
  Moon,
  Search,
  Filter,
  RefreshCw,
  Activity,
  TrendingUp,
  Zap,
  Timer,
  Building2,
  ChevronRight,
  Circle,
  Pause,
  Play,
  LogIn,
  LogOut,
  MoreHorizontal,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { Shift, SafeUser, Break } from "@shared/schema";

interface DashboardStats {
  totalEmployees: number;
  activeWorking: number;
  onBreak: number;
  notStarted: number;
}

interface TodayShift extends Shift {
  user: SafeUser;
  breaks?: Break[];
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
    "from-amber-500 to-orange-500",
    "from-cyan-500 to-blue-500",
  ];
  const index = (name?.charCodeAt(0) || 0) % gradients.length;
  return gradients[index];
}

function getEmployeeStatus(shift: TodayShift) {
  const hasActiveBreak = shift.breaks?.some(b => !b.endTime);
  
  if (hasActiveBreak) {
    return { status: "break", label: "On Break", color: "text-orange-500", bg: "bg-orange-500", dot: "bg-orange-500 animate-pulse" };
  }
  
  if (shift.eveningClockIn && !shift.eveningClockOut) {
    return { status: "evening", label: "Evening Shift", color: "text-blue-500", bg: "bg-blue-500", dot: "bg-blue-500 animate-pulse" };
  }
  
  if (shift.morningClockIn && !shift.morningClockOut) {
    return { status: "morning", label: "Morning Shift", color: "text-emerald-500", bg: "bg-emerald-500", dot: "bg-emerald-500 animate-pulse" };
  }
  
  if (shift.eveningClockOut || shift.morningClockOut) {
    return { status: "completed", label: "Completed", color: "text-slate-500", bg: "bg-slate-500", dot: "bg-slate-400" };
  }
  
  return { status: "not_started", label: "Not Started", color: "text-slate-400", bg: "bg-slate-400", dot: "bg-slate-300" };
}

function calculateWorkTime(shift: TodayShift): string {
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
  
  if (totalMinutes <= 0) return "-";
  
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  return `${hours}h ${mins}m`;
}

function getActiveBreakType(shift: TodayShift): string | null {
  const activeBreak = shift.breaks?.find(b => !b.endTime);
  return activeBreak?.type || null;
}

// Mini Stat Component
function MiniStat({ 
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
        "flex items-center gap-2 px-3 py-1.5 rounded-full transition-all text-xs font-medium",
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

// Employee Card Component
function EmployeeCard({ shift }: { shift: TodayShift }) {
  const statusInfo = getEmployeeStatus(shift);
  const workTime = calculateWorkTime(shift);
  const activeBreakType = getActiveBreakType(shift);
  const isActive = statusInfo.status === "morning" || statusInfo.status === "evening" || statusInfo.status === "break";
  
  return (
    <div className={cn(
      "group relative p-4 rounded-2xl transition-all duration-300",
      "bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800",
      "hover:shadow-xl hover:shadow-slate-200/50 dark:hover:shadow-slate-900/50",
      "hover:-translate-y-1 hover:border-slate-200 dark:hover:border-slate-700",
      isActive && "ring-2 ring-offset-2 ring-offset-background",
      statusInfo.status === "morning" && "ring-emerald-500/50",
      statusInfo.status === "evening" && "ring-blue-500/50",
      statusInfo.status === "break" && "ring-orange-500/50",
    )}>
      {/* Status Indicator Line */}
      <div className={cn(
        "absolute top-0 left-4 right-4 h-1 rounded-b-full opacity-80",
        statusInfo.bg
      )} />
      
      <div className="flex items-start gap-3 mt-1">
        {/* Avatar with Status */}
        <div className="relative">
          <Avatar className="h-12 w-12 ring-2 ring-white dark:ring-slate-900 shadow-md">
            <AvatarFallback className={cn(
              "text-sm font-bold text-white bg-gradient-to-br",
              getAvatarGradient(shift.user?.firstName || "")
            )}>
              {getInitials(shift.user?.firstName || "", shift.user?.lastName || "")}
            </AvatarFallback>
          </Avatar>
          <span className={cn(
            "absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-white dark:border-slate-900",
            statusInfo.dot
          )} />
        </div>
        
        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-semibold text-sm text-slate-900 dark:text-white truncate">
                {shift.user?.firstName} {shift.user?.lastName}
              </h3>
              <div className="flex items-center gap-1.5 mt-0.5">
                {shift.user?.department && (
                  <span className="text-[10px] text-slate-500 flex items-center gap-1">
                    <Building2 className="h-2.5 w-2.5" />
                    {shift.user.department}
                  </span>
                )}
              </div>
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>View Profile</DropdownMenuItem>
                <DropdownMenuItem>View Attendance</DropdownMenuItem>
                <DropdownMenuItem>Send Message</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          
          {/* Status Badge */}
          <div className="flex items-center gap-2 mt-2">
            <Badge 
              variant="secondary" 
              className={cn(
                "text-[10px] font-semibold gap-1 px-2",
                statusInfo.status === "morning" && "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400",
                statusInfo.status === "evening" && "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400",
                statusInfo.status === "break" && "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400",
                statusInfo.status === "completed" && "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
                statusInfo.status === "not_started" && "bg-slate-50 text-slate-400 dark:bg-slate-800/50 dark:text-slate-500",
              )}
            >
              {statusInfo.status === "morning" && <Sun className="h-2.5 w-2.5" />}
              {statusInfo.status === "evening" && <Moon className="h-2.5 w-2.5" />}
              {statusInfo.status === "break" && <Coffee className="h-2.5 w-2.5" />}
              {statusInfo.label}
            </Badge>
            
            {activeBreakType && (
              <span className="text-[10px] text-orange-600 dark:text-orange-400 capitalize">
                {activeBreakType}
              </span>
            )}
          </div>
        </div>
      </div>
      
      {/* Time Info */}
      <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
        <div className="text-center">
          <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-0.5">In</p>
          <p className="text-xs font-mono font-medium text-slate-700 dark:text-slate-300">
            {shift.morningClockIn 
              ? format(new Date(shift.morningClockIn), "h:mm a")
              : "-"}
          </p>
        </div>
        <div className="text-center border-x border-slate-100 dark:border-slate-800">
          <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-0.5">Breaks</p>
          <p className="text-xs font-mono font-medium text-slate-700 dark:text-slate-300">
            {shift.breaks?.length || 0}
          </p>
        </div>
        <div className="text-center">
          <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-0.5">Time</p>
          <p className={cn(
            "text-xs font-mono font-semibold",
            isActive ? "text-emerald-600 dark:text-emerald-400" : "text-slate-700 dark:text-slate-300"
          )}>
            {workTime}
          </p>
        </div>
      </div>
    </div>
  );
}

// Main Dashboard
export default function AdminDashboard() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");

  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/admin/stats"],
    refetchInterval: 30000,
  });

  const { data: todayShifts = [], isLoading: shiftsLoading, refetch } = useQuery<TodayShift[]>({
    queryKey: ["/api/admin/shifts/today"],
    refetchInterval: 15000,
  });

  // Get unique departments
  const departments = useMemo(() => {
    const depts = new Set<string>();
    todayShifts.forEach((shift) => {
      if (shift.user?.department) depts.add(shift.user.department);
    });
    return Array.from(depts).sort();
  }, [todayShifts]);

  // Filter shifts
  const filteredShifts = useMemo(() => {
    let filtered = [...todayShifts];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((shift) =>
        `${shift.user?.firstName} ${shift.user?.lastName}`.toLowerCase().includes(query) ||
        shift.user?.department?.toLowerCase().includes(query)
      );
    }

    // Department filter
    if (selectedDepartment !== "all") {
      filtered = filtered.filter((shift) => shift.user?.department === selectedDepartment);
    }

    // Status filter
    if (selectedStatus !== "all") {
      filtered = filtered.filter((shift) => {
        const status = getEmployeeStatus(shift).status;
        if (selectedStatus === "active") return status === "morning" || status === "evening";
        if (selectedStatus === "break") return status === "break";
        if (selectedStatus === "completed") return status === "completed";
        return true;
      });
    }

    return filtered;
  }, [todayShifts, searchQuery, selectedDepartment, selectedStatus]);

  // Group by status for quick stats
  const statusCounts = useMemo(() => {
    let active = 0;
    let onBreak = 0;
    let completed = 0;
    
    todayShifts.forEach((shift) => {
      const status = getEmployeeStatus(shift).status;
      if (status === "morning" || status === "evening") active++;
      else if (status === "break") onBreak++;
      else if (status === "completed") completed++;
    });
    
    return { active, onBreak, completed };
  }, [todayShifts]);

  if (statsLoading || shiftsLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3 animate-pulse">
            <Activity className="h-5 w-5 text-primary" />
          </div>
          <p className="text-sm text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col gap-3 p-2">
      {/* Compact Header Bar */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Stats Pills */}
        <div className="flex items-center gap-1.5">
          <MiniStat
            icon={Users}
            value={stats?.totalEmployees || 0}
            label="Total"
            color="text-slate-500"
            active={selectedStatus === "all"}
            onClick={() => setSelectedStatus("all")}
          />
          <MiniStat
            icon={Zap}
            value={statusCounts.active}
            label="Active"
            color="text-emerald-500"
            active={selectedStatus === "active"}
            onClick={() => setSelectedStatus("active")}
          />
          <MiniStat
            icon={Coffee}
            value={statusCounts.onBreak}
            label="Break"
            color="text-orange-500"
            active={selectedStatus === "break"}
            onClick={() => setSelectedStatus("break")}
          />
          <MiniStat
            icon={UserCheck}
            value={statusCounts.completed}
            label="Done"
            color="text-blue-500"
            active={selectedStatus === "completed"}
            onClick={() => setSelectedStatus("completed")}
          />
        </div>

        <div className="h-5 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block" />

        {/* Search */}
        <div className="relative flex-1 min-w-[160px] max-w-[220px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <Input
            placeholder="Search staff..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 pl-8 text-xs bg-white dark:bg-slate-800 border-0 shadow-sm"
          />
        </div>

        {/* Department Filter */}
        <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
          <SelectTrigger className="h-8 w-[140px] text-xs bg-white dark:bg-slate-800 border-0 shadow-sm">
            <Building2 className="h-3 w-3 mr-1.5 text-slate-400" />
            <SelectValue placeholder="Department" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Depts</SelectItem>
            {departments.map((dept) => (
              <SelectItem key={dept} value={dept}>{dept}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Actions */}
        <div className="flex items-center gap-1 ml-auto">
          {(searchQuery || selectedDepartment !== "all" || selectedStatus !== "all") && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 text-xs"
              onClick={() => {
                setSearchQuery("");
                setSelectedDepartment("all");
                setSelectedStatus("all");
              }}
            >
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
          <Badge variant="outline" className="text-[10px] font-normal hidden md:flex">
            <Activity className="h-2.5 w-2.5 mr-1 text-emerald-500 animate-pulse" />
            Live
          </Badge>
        </div>
      </div>

      {/* Results Count */}
      <div className="flex items-center justify-between px-1">
        <p className="text-xs text-muted-foreground">
          Showing <span className="font-semibold text-foreground">{filteredShifts.length}</span> of {todayShifts.length} employees
        </p>
        <p className="text-[10px] text-muted-foreground hidden sm:block">
          {format(new Date(), "EEEE, MMM d • h:mm a")}
        </p>
      </div>

      {/* Employee Cards Grid - Maximum Space */}
      <ScrollArea className="flex-1 -mx-2 px-2">
        {filteredShifts.length === 0 ? (
          <div className="h-full flex items-center justify-center py-20">
            <div className="text-center">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
                <Users className="h-6 w-6 text-slate-400" />
              </div>
              <p className="font-medium text-slate-900 dark:text-white mb-1">No employees found</p>
              <p className="text-sm text-slate-500">
                {searchQuery || selectedDepartment !== "all" || selectedStatus !== "all"
                  ? "Try adjusting your filters"
                  : "No one has clocked in yet today"}
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 pb-4">
            {filteredShifts.map((shift) => (
              <EmployeeCard key={shift.id} shift={shift} />
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}