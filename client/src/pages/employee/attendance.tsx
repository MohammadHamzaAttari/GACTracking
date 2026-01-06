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
  Sunrise,
  Sunset,
  Info,
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { Shift } from "@shared/schema";

// Grace period constant (should match server)
const GRACE_PERIOD_MINUTES = 15;

/**
 * Format date/time specifically for Pakistani timezone (Asia/Karachi)
 */
function formatPakistaniTime(date: Date | string, formatStr: string = "h:mm a"): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Karachi',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  }).format(d);
}

// Generate month options for the last 12 months
function getMonthOptions() {
  const options = [];
  // Use Pakistani time for current month detection
  const now = new Date();
  const pkNowStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Karachi' }).format(now);
  const [pkYear, pkMonth] = pkNowStr.split('-').map(Number);

  for (let i = 0; i < 12; i++) {
    const date = new Date(pkYear, pkMonth - 1 - i, 1);
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
    case "incomplete":
      return "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400";
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
    case "incomplete":
      return <AlertCircle className="h-3.5 w-3.5" />;
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
    case "incomplete":
      return "Incomplete";
    default:
      return status;
  }
}

function calculateDuration(
  clockIn: string | Date | null,
  clockOut: string | Date | null
): { hours: number; minutes: number; formatted: string; isActive: boolean; isError: boolean } {
  if (!clockIn) return { hours: 0, minutes: 0, formatted: "-", isActive: false, isError: false };

  const startTime = new Date(clockIn);
  const isActive = !clockOut;
  const endTime = clockOut ? new Date(clockOut) : new Date();

  const diff = endTime.getTime() - startTime.getTime();

  // Handle negative duration (e.g. clock-out before clock-in due to sync issues)
  if (diff < 0) {
    return { hours: 0, minutes: 0, formatted: "Invalid", isActive: false, isError: true };
  }

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  return {
    hours,
    minutes,
    formatted: isActive ? "Active" : `${hours}h ${minsToText(minutes)}`,
    isActive,
    isError: false,
  };
}

function minsToText(m: number): string {
  return m < 10 ? `0${m}m` : `${m}m`;
}

function calculateTotalWorkTime(shift: Shift): {
  hours: number;
  minutes: number;
  formatted: string;
} {
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
    formatted: totalMinutes > 0 ? `${hours}h ${minutes}m` : "-",
  };
}

// Format late minutes with detailed info
function formatLateMinutes(lateMinutes: number | null | undefined): {
  text: string;
  fullText: string;
  color: string;
  isLate: boolean;
} {
  if (!lateMinutes || lateMinutes === 0) {
    return {
      text: "On time",
      fullText: `Arrived within ${GRACE_PERIOD_MINUTES}-minute grace period`,
      color: "text-emerald-600 dark:text-emerald-400",
      isLate: false,
    };
  }

  const hours = Math.floor(lateMinutes / 60);
  const mins = lateMinutes % 60;

  const text = `${hours}h ${mins < 10 ? '0' + mins : mins}m`;

  return {
    text,
    fullText: `${lateMinutes} minutes late (after ${GRACE_PERIOD_MINUTES}-min grace period)`,
    color: lateMinutes > 30 ? "text-red-600 dark:text-red-400" : "text-amber-600 dark:text-amber-400",
    isLate: true,
  };
}

// Stat Card Component
function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  gradient,
}: {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: any;
  gradient: string;
}) {
  return (
    <Card className={cn("border-0 shadow-sm", gradient)}>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-white/80 dark:bg-slate-900/50 shadow-sm">
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-medium opacity-80">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
            {subtitle && <p className="text-xs opacity-70">{subtitle}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function EmployeeAttendancePage() {
  const currentMonth = new Date().toISOString().substring(0, 7);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);

  // Fetch current user info
  const { data: user } = useQuery<any>({
    queryKey: ["/api/user"],
  });

  // Fetch shifts for the employee
  const {
    data: shifts = [],
    isLoading,
    refetch,
    isFetching,
  } = useQuery<Shift[]>({
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
    const presentDays = monthShifts.filter((s) => s.status === "present").length;
    const lateDays = monthShifts.filter((s) => s.status === "late").length;
    const absentDays = monthShifts.filter((s) => s.status === "absent").length;
    const incompleteDays = monthShifts.filter((s) => s.status === "incomplete").length;

    // Calculate total work hours
    let totalMinutes = 0;
    monthShifts.forEach((shift) => {
      const workTime = calculateTotalWorkTime(shift);
      totalMinutes += workTime.hours * 60 + workTime.minutes;
    });

    const totalHours = Math.floor(totalMinutes / 60);
    const remainingMinutes = totalMinutes % 60;

    // Calculate total late minutes
    let totalLateMinutes = 0;
    monthShifts.forEach((shift) => {
      totalLateMinutes += (shift.morningLateMinutes || 0) + (shift.eveningLateMinutes || 0);
    });

    const attendanceRate =
      totalDays > 0 ? Math.round(((presentDays + lateDays) / totalDays) * 100) : 0;

    // Calculate average work hours per day
    const avgWorkHours = totalDays > 0 ? (totalMinutes / totalDays / 60).toFixed(1) : "0";

    return {
      totalDays,
      presentDays,
      lateDays,
      absentDays,
      incompleteDays,
      totalHours,
      remainingMinutes,
      totalLateMinutes,
      attendanceRate,
      avgWorkHours,
    };
  }, [filteredShifts]);

  return (
    <ScrollArea className="h-full">
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
        <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-5xl mx-auto">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                <CalendarDays className="h-7 w-7 text-primary" />
                My Attendance
              </h1>
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
              <Button
                variant="ghost"
                size="icon"
                onClick={() => refetch()}
                disabled={isFetching}
              >
                <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} />
              </Button>
            </div>
          </div>

          {/* Grace Period Info Card */}
          <Card className="border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                    Attendance Policy - {GRACE_PERIOD_MINUTES} Minute Grace Period
                  </p>
                  <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                    You are allowed a {GRACE_PERIOD_MINUTES}-minute grace period after your scheduled
                    start time. Late minutes are only counted after this grace period.
                    <br />
                    <span className="font-medium">Example:</span> If your shift starts at 9:00 AM and
                    you clock in at 9:20 AM, you'll be marked {20 - GRACE_PERIOD_MINUTES} minutes late
                    (20 - {GRACE_PERIOD_MINUTES} = {20 - GRACE_PERIOD_MINUTES}).
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              title="Present"
              value={stats.presentDays}
              subtitle={`of ${stats.totalDays} days`}
              icon={CheckCircle2}
              gradient="bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/50 dark:to-emerald-900/30 text-emerald-700 dark:text-emerald-400"
            />
            <StatCard
              title="Late"
              value={stats.lateDays}
              subtitle={`${stats.totalLateMinutes}m total`}
              icon={AlertCircle}
              gradient="bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-950/50 dark:to-amber-900/30 text-amber-700 dark:text-amber-400"
            />
            <StatCard
              title="Total Hours"
              value={stats.totalHours}
              subtitle={`${stats.remainingMinutes}m extra`}
              icon={Timer}
              gradient="bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/50 dark:to-blue-900/30 text-blue-700 dark:text-blue-400"
            />
            <StatCard
              title="Attendance"
              value={`${stats.attendanceRate}%`}
              subtitle={`avg ${stats.avgWorkHours}h/day`}
              icon={TrendingUp}
              gradient="bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-950/50 dark:to-purple-900/30 text-purple-700 dark:text-purple-400"
            />
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
                          <div className="flex items-center gap-1 text-xs">
                            <Sunrise className="h-3 w-3 text-amber-500" />
                            {user?.shiftType === 'one_shift' ? 'Work Session' : 'Morning Shift'}
                          </div>
                        </TableHead>
                        {user?.shiftType !== 'one_shift' && (
                          <TableHead className="font-semibold">
                            <div className="flex items-center gap-1 text-xs">
                              <Moon className="h-3.5 w-3.5 text-blue-500" />
                              Evening Shift
                            </div>
                          </TableHead>
                        )}
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
                        const totalLate =
                          (shift.morningLateMinutes || 0) + (shift.eveningLateMinutes || 0);
                        const lateInfo = formatLateMinutes(totalLate);

                        return (
                          <TableRow
                            key={shift.id}
                            className="hover:bg-slate-50 dark:hover:bg-slate-800/30"
                          >
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
                                    <Sunrise className="h-3 w-3 text-amber-500" />
                                    <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400">
                                      {formatPakistaniTime(shift.morningClockIn)}
                                    </span>
                                  </div>
                                  {shift.morningClockOut && (
                                    <div className="flex items-center gap-2">
                                      <Sunset className="h-3 w-3 text-orange-500" />
                                      <span className="text-xs font-mono text-slate-600 dark:text-slate-400">
                                        {formatPakistaniTime(shift.morningClockOut)}
                                      </span>
                                    </div>
                                  )}
                                  <p className={cn(
                                    "text-[10px]",
                                    morningDuration.isActive ? "text-emerald-500 font-bold" : "text-muted-foreground",
                                    morningDuration.isError && "text-red-500"
                                  )}>
                                    {morningDuration.formatted}
                                    {shift.morningLateMinutes && shift.morningLateMinutes > 0 && (
                                      <span className="text-amber-600 ml-1">
                                        (+{shift.morningLateMinutes}m late)
                                      </span>
                                    )}
                                  </p>
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            {user?.shiftType !== 'one_shift' && (
                              <TableCell>
                                {shift.eveningClockIn ? (
                                  <div className="space-y-0.5">
                                    <div className="flex items-center gap-2">
                                      <Sunrise className="h-3 w-3 text-blue-500" />
                                      <span className="text-xs font-mono text-blue-600 dark:text-blue-400">
                                        {formatPakistaniTime(shift.eveningClockIn)}
                                      </span>
                                    </div>
                                    {shift.eveningClockOut && (
                                      <div className="flex items-center gap-2">
                                        <Sunset className="h-3 w-3 text-purple-500" />
                                        <span className="text-xs font-mono text-slate-600 dark:text-slate-400">
                                          {formatPakistaniTime(shift.eveningClockOut)}
                                        </span>
                                      </div>
                                    )}
                                    <p className={cn(
                                      "text-[10px]",
                                      eveningDuration.isActive ? "text-blue-500 font-bold" : "text-muted-foreground",
                                      eveningDuration.isError && "text-red-500"
                                    )}>
                                      {eveningDuration.formatted}
                                      {shift.eveningLateMinutes && shift.eveningLateMinutes > 0 && (
                                        <span className="text-amber-600 ml-1">
                                          (+{shift.eveningLateMinutes}m late)
                                        </span>
                                      )}
                                    </p>
                                  </div>
                                ) : (
                                  <span className="text-xs text-muted-foreground">-</span>
                                )}
                              </TableCell>
                            )}
                            <TableCell>
                              <span
                                className={cn(
                                  "text-sm font-semibold",
                                  totalWork.hours >= 8
                                    ? "text-emerald-600"
                                    : totalWork.hours >= 4
                                      ? "text-amber-600"
                                      : "text-slate-500"
                                )}
                              >
                                {totalWork.formatted}
                              </span>
                            </TableCell>
                            <TableCell>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger>
                                    {lateInfo.isLate ? (
                                      <div className="flex flex-col">
                                        <Badge
                                          variant="secondary"
                                          className={cn(
                                            "text-xs",
                                            totalLate > 30
                                              ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                                              : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                                          )}
                                        >
                                          {lateInfo.text}
                                        </Badge>
                                        <span className="text-[10px] text-muted-foreground mt-0.5">
                                          after grace
                                        </span>
                                      </div>
                                    ) : (
                                      <Badge
                                        variant="secondary"
                                        className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-xs"
                                      >
                                        On time
                                      </Badge>
                                    )}
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>{lateInfo.fullText}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
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
                    No attendance records for{" "}
                    {format(parseISO(selectedMonth + "-01"), "MMMM yyyy")}. Start clocking in to track
                    your attendance.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Late Time Summary */}
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
                      You were late by a total of{" "}
                      <span className="font-semibold">
                        {stats.totalLateMinutes >= 60
                          ? `${Math.floor(stats.totalLateMinutes / 60)}h ${stats.totalLateMinutes % 60}m`
                          : `${stats.totalLateMinutes} minutes`}
                      </span>{" "}
                      across {stats.lateDays} day{stats.lateDays !== 1 ? "s" : ""} this month.
                      <br />
                      <span className="opacity-75">
                        (Late time is calculated after the {GRACE_PERIOD_MINUTES}-minute grace period)
                      </span>
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Perfect Attendance Message */}
          {stats.totalDays > 0 && stats.totalLateMinutes === 0 && stats.absentDays === 0 && (
            <Card className="border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-emerald-800 dark:text-emerald-200">
                      Perfect Attendance! 🎉
                    </p>
                    <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-1">
                      You have maintained perfect attendance this month with no late arrivals. Keep up
                      the great work!
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Footer Summary */}
          {filteredShifts.length > 0 && (
            <div className="text-center text-sm text-muted-foreground">
              <p>
                Showing {filteredShifts.length} records for{" "}
                {format(parseISO(selectedMonth + "-01"), "MMMM yyyy")}
              </p>
              <p className="mt-1">
                Total: {stats.presentDays} present, {stats.lateDays} late, {stats.absentDays} absent
                {stats.incompleteDays > 0 && `, ${stats.incompleteDays} incomplete`}
              </p>
            </div>
          )}
        </div>
      </div>
    </ScrollArea>
  );
}