// client/src/pages/employee/attendance.tsx
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from "date-fns";
import {
  Clock,
  Calendar,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  Coffee,
  TrendingUp,
  Timer,
  CalendarDays,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import type { Shift } from "@shared/schema";

// Generate month options for the last 12 months
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

function getStatusColor(status: string) {
  switch (status) {
    case "present":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400";
    case "late":
      return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
    case "absent":
      return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
    case "half_day":
      return "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400";
    case "not_started":
      return "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400";
    default:
      return "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400";
  }
}

function getStatusIcon(status: string) {
  switch (status) {
    case "present":
      return <CheckCircle2 className="h-3.5 w-3.5" />;
    case "late":
      return <AlertCircle className="h-3.5 w-3.5" />;
    case "absent":
      return <XCircle className="h-3.5 w-3.5" />;
    case "half_day":
      return <Clock className="h-3.5 w-3.5" />;
    default:
      return <Clock className="h-3.5 w-3.5" />;
  }
}

function getStatusLabel(status: string) {
  switch (status) {
    case "present":
      return "Present";
    case "late":
      return "Late";
    case "absent":
      return "Absent";
    case "half_day":
      return "Half Day";
    case "not_started":
      return "Not Started";
    default:
      return status;
  }
}

function calculateDuration(clockIn: string | null, clockOut: string | null): { hours: number; minutes: number; formatted: string } {
  if (!clockIn) return { hours: 0, minutes: 0, formatted: "-" };
  
  const startTime = new Date(clockIn);
  const endTime = clockOut ? new Date(clockOut) : new Date();
  
  const diff = endTime.getTime() - startTime.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  return { 
    hours, 
    minutes, 
    formatted: `${hours}h ${minutes}m` 
  };
}

function calculateTotalWorkTime(shift: Shift): { hours: number; minutes: number; formatted: string } {
  let totalMinutes = 0;
  
  // Morning shift duration
  if (shift.morningClockIn) {
    const morningDuration = calculateDuration(
      shift.morningClockIn?.toString() || null, 
      shift.morningClockOut?.toString() || null
    );
    totalMinutes += morningDuration.hours * 60 + morningDuration.minutes;
  }
  
  // Evening shift duration
  if (shift.eveningClockIn) {
    const eveningDuration = calculateDuration(
      shift.eveningClockIn?.toString() || null, 
      shift.eveningClockOut?.toString() || null
    );
    totalMinutes += eveningDuration.hours * 60 + eveningDuration.minutes;
  }
  
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  
  return {
    hours,
    minutes,
    formatted: totalMinutes > 0 ? `${hours}h ${minutes}m` : "-"
  };
}

export default function EmployeeAttendancePage() {
  const currentMonth = new Date().toISOString().substring(0, 7);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);

  // Fetch shifts for the employee
  const { data: shifts = [], isLoading, refetch } = useQuery<Shift[]>({
    queryKey: ["/api/employee/shifts"],
  });

  // Filter shifts by selected month
  const filteredShifts = useMemo(() => {
    return shifts
      .filter((shift) => shift.date.startsWith(selectedMonth))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [shifts, selectedMonth]);

  // Calculate statistics
  const stats = useMemo(() => {
    const monthShifts = filteredShifts;
    
    const totalDays = monthShifts.length;
    const presentDays = monthShifts.filter(s => s.status === "present").length;
    const lateDays = monthShifts.filter(s => s.status === "late").length;
    const absentDays = monthShifts.filter(s => s.status === "absent").length;
    
    // Calculate total work hours
    let totalMinutes = 0;
    monthShifts.forEach(shift => {
      const workTime = calculateTotalWorkTime(shift);
      totalMinutes += workTime.hours * 60 + workTime.minutes;
    });
    
    const totalHours = Math.floor(totalMinutes / 60);
    const remainingMinutes = totalMinutes % 60;
    
    // Calculate total late minutes
    let totalLateMinutes = 0;
    monthShifts.forEach(shift => {
      totalLateMinutes += (shift.morningLateMinutes || 0) + (shift.eveningLateMinutes || 0);
    });
    
    const attendanceRate = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;
    
    return {
      totalDays,
      presentDays,
      lateDays,
      absentDays,
      totalHours,
      remainingMinutes,
      totalLateMinutes,
      attendanceRate,
    };
  }, [filteredShifts]);

  return (
    <ScrollArea className="h-full">
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">My Attendance</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Track your work hours and attendance history
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-[180px]">
                <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {getMonthOptions().map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="ghost" size="icon" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-0 shadow-sm bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/50 dark:to-emerald-900/30">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-500 text-white shadow-lg shadow-emerald-500/25">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Present</p>
                  <p className="text-2xl font-bold text-emerald-900 dark:text-emerald-100">
                    {stats.presentDays}
                    <span className="text-sm font-normal text-emerald-600 dark:text-emerald-400 ml-1">days</span>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-950/50 dark:to-amber-900/30">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-amber-500 text-white shadow-lg shadow-amber-500/25">
                  <AlertCircle className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">Late</p>
                  <p className="text-2xl font-bold text-amber-900 dark:text-amber-100">
                    {stats.lateDays}
                    <span className="text-sm font-normal text-amber-600 dark:text-amber-400 ml-1">days</span>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/50 dark:to-blue-900/30">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-blue-500 text-white shadow-lg shadow-blue-500/25">
                  <Timer className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">Total Hours</p>
                  <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                    {stats.totalHours}
                    <span className="text-sm font-normal text-blue-600 dark:text-blue-400 ml-1">h {stats.remainingMinutes}m</span>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-950/50 dark:to-purple-900/30">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-purple-500 text-white shadow-lg shadow-purple-500/25">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-purple-600 dark:text-purple-400 font-medium">Attendance</p>
                  <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                    {stats.attendanceRate}
                    <span className="text-sm font-normal text-purple-600 dark:text-purple-400 ml-1">%</span>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Attendance Table */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-primary" />
                Attendance History
              </CardTitle>
              <Badge variant="secondary" className="font-mono">
                {filteredShifts.length} records
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredShifts.length > 0 ? (
              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50 dark:bg-slate-800/50">
                      <TableHead className="font-semibold">Date</TableHead>
                      <TableHead className="font-semibold">
                        <div className="flex items-center gap-1">
                          <Sun className="h-3.5 w-3.5 text-amber-500" />
                          Morning
                        </div>
                      </TableHead>
                      <TableHead className="font-semibold">
                        <div className="flex items-center gap-1">
                          <Moon className="h-3.5 w-3.5 text-blue-500" />
                          Evening
                        </div>
                      </TableHead>
                      <TableHead className="font-semibold">Total</TableHead>
                      <TableHead className="font-semibold">Late</TableHead>
                      <TableHead className="font-semibold">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredShifts.map((shift) => {
                      const morningDuration = calculateDuration(
                        shift.morningClockIn?.toString() || null,
                        shift.morningClockOut?.toString() || null
                      );
                      const eveningDuration = calculateDuration(
                        shift.eveningClockIn?.toString() || null,
                        shift.eveningClockOut?.toString() || null
                      );
                      const totalWork = calculateTotalWorkTime(shift);
                      const totalLate = (shift.morningLateMinutes || 0) + (shift.eveningLateMinutes || 0);
                      
                      return (
                        <TableRow key={shift.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-primary/10 flex flex-col items-center justify-center">
                                <span className="text-sm font-bold text-primary leading-none">
                                  {format(parseISO(shift.date), "d")}
                                </span>
                                <span className="text-[9px] text-primary/70 uppercase">
                                  {format(parseISO(shift.date), "MMM")}
                                </span>
                              </div>
                              <div>
                                <p className="text-sm font-medium">
                                  {format(parseISO(shift.date), "EEEE")}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {format(parseISO(shift.date), "MMM d, yyyy")}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {shift.morningClockIn ? (
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400">
                                    {format(new Date(shift.morningClockIn), "h:mm a")}
                                  </span>
                                  {shift.morningClockOut && (
                                    <>
                                      <span className="text-muted-foreground">→</span>
                                      <span className="text-xs font-mono text-slate-600 dark:text-slate-400">
                                        {format(new Date(shift.morningClockOut), "h:mm a")}
                                      </span>
                                    </>
                                  )}
                                </div>
                                <p className="text-[10px] text-muted-foreground">
                                  {morningDuration.formatted}
                                </p>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {shift.eveningClockIn ? (
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-mono text-blue-600 dark:text-blue-400">
                                    {format(new Date(shift.eveningClockIn), "h:mm a")}
                                  </span>
                                  {shift.eveningClockOut && (
                                    <>
                                      <span className="text-muted-foreground">→</span>
                                      <span className="text-xs font-mono text-slate-600 dark:text-slate-400">
                                        {format(new Date(shift.eveningClockOut), "h:mm a")}
                                      </span>
                                    </>
                                  )}
                                </div>
                                <p className="text-[10px] text-muted-foreground">
                                  {eveningDuration.formatted}
                                </p>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <span className={cn(
                              "text-sm font-semibold",
                              totalWork.hours >= 8 ? "text-emerald-600" : 
                              totalWork.hours >= 4 ? "text-amber-600" : "text-slate-500"
                            )}>
                              {totalWork.formatted}
                            </span>
                          </TableCell>
                          <TableCell>
                            {totalLate > 0 ? (
                              <Badge variant="secondary" className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 text-xs">
                                {totalLate}m
                              </Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge className={cn("gap-1 text-xs", getStatusColor(shift.status))}>
                              {getStatusIcon(shift.status)}
                              {getStatusLabel(shift.status)}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
                  <Clock className="h-8 w-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No Records Found</h3>
                <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                  No attendance records for {format(parseISO(selectedMonth + "-01"), "MMMM yyyy")}.
                  Start clocking in to track your attendance.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Summary Note */}
        {stats.totalLateMinutes > 0 && (
          <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                    Late Time Summary
                  </p>
                  <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                    You were late by a total of <span className="font-semibold">{stats.totalLateMinutes} minutes</span> across {stats.lateDays} day{stats.lateDays !== 1 ? "s" : ""} this month.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </ScrollArea>
  );
}