import { useQuery } from "@tanstack/react-query";
import {
  Users,
  Clock,
  UserCheck,
  UserX,
  TrendingUp,
  Calendar,
  Sun,
  Moon,
  Coffee,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { Shift, SafeUser, Break } from "@shared/schema";

interface DashboardStats {
  totalEmployees: number;
  presentToday: number;
  absentToday: number;
  lateToday: number;
  attendanceRate: number;
}

interface TodayShift extends Shift {
  user: SafeUser;
  breaks?: Break[];
}

function StatCard({
  title,
  value,
  icon: Icon,
  description,
  trend,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  description?: string;
  trend?: "up" | "down" | "neutral";
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold" data-testid={`stat-${title.toLowerCase().replace(" ", "-")}`}>
          {value}
        </div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
            {trend === "up" && <TrendingUp className="h-3 w-3 text-green-500" />}
            {description}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function getInitials(firstName: string, lastName: string) {
  return `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase() || "U";
}

function getStatusColor(status: string) {
  switch (status) {
    case "present":
      return "bg-green-500/10 text-green-600 dark:text-green-400";
    case "late":
      return "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400";
    case "absent":
      return "bg-red-500/10 text-red-600 dark:text-red-400";
    case "half_day":
      return "bg-orange-500/10 text-orange-600 dark:text-orange-400";
    case "not_started":
      return "bg-gray-500/10 text-gray-600 dark:text-gray-400";
    default:
      return "";
  }
}

function getCurrentShiftStatus(shift: TodayShift) {
  if (shift.eveningClockIn && !shift.eveningClockOut) {
    return "evening_active";
  }
  if (shift.morningClockIn && !shift.morningClockOut) {
    return "morning_active";
  }
  if (shift.eveningClockOut) {
    return "evening_complete";
  }
  if (shift.morningClockOut) {
    return "morning_complete";
  }
  return "not_started";
}

export default function AdminDashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/admin/stats"],
  });

  const { data: todayShifts, isLoading: shiftsLoading } = useQuery<TodayShift[]>({
    queryKey: ["/api/admin/shifts/today"],
  });

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Admin Dashboard</h1>
          <p className="text-muted-foreground text-sm">{today}</p>
        </div>
        <Badge variant="secondary" className="w-fit flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          Today's Overview
        </Badge>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {statsLoading ? (
          <>
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <Skeleton className="h-4 w-24" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-16" />
                </CardContent>
              </Card>
            ))}
          </>
        ) : (
          <>
            <StatCard
              title="Total Employees"
              value={stats?.totalEmployees || 0}
              icon={Users}
              description="Active team members"
            />
            <StatCard
              title="Present Today"
              value={stats?.presentToday || 0}
              icon={UserCheck}
              description="On time arrivals"
              trend="up"
            />
            <StatCard
              title="Absent Today"
              value={stats?.absentToday || 0}
              icon={UserX}
              description="Not checked in"
            />
            <StatCard
              title="Attendance Rate"
              value={`${stats?.attendanceRate || 0}%`}
              icon={TrendingUp}
              description="This month"
              trend="up"
            />
          </>
        )}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Staff Activity Monitor
          </CardTitle>
          <Badge variant="outline" className="text-xs">
            Live Status
          </Badge>
        </CardHeader>
        <CardContent>
          {shiftsLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
              ))}
            </div>
          ) : todayShifts && todayShifts.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Morning Shift</TableHead>
                  <TableHead>Evening Shift</TableHead>
                  <TableHead>Breaks</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {todayShifts.map((shift) => {
                  const shiftStatus = getCurrentShiftStatus(shift);
                  const fullName = `${shift.user?.firstName || ""} ${shift.user?.lastName || ""}`.trim();
                  return (
                    <TableRow key={shift.id} data-testid={`row-shift-${shift.id}`}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="text-xs bg-primary/10 text-primary">
                              {getInitials(shift.user?.firstName || "", shift.user?.lastName || "")}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-sm">{fullName || "Unknown"}</p>
                            <p className="text-xs text-muted-foreground">
                              {shift.user?.department || "No department"}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(shift.status)} variant="secondary">
                          {shift.status === "not_started" ? "Not Started" : 
                           shift.status.charAt(0).toUpperCase() + shift.status.slice(1).replace("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        <div className="flex items-center gap-2">
                          <Sun className="h-3 w-3 text-yellow-500" />
                          <div>
                            {shift.morningClockIn
                              ? new Date(shift.morningClockIn).toLocaleTimeString("en-US", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : "-"}
                            {shift.morningClockIn && (
                              <span className="text-muted-foreground mx-1">to</span>
                            )}
                            {shift.morningClockOut
                              ? new Date(shift.morningClockOut).toLocaleTimeString("en-US", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : shift.morningClockIn && shiftStatus === "morning_active" 
                                ? <Badge variant="outline" className="text-xs ml-1 text-green-600">Active</Badge>
                                : ""}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        <div className="flex items-center gap-2">
                          <Moon className="h-3 w-3 text-blue-500" />
                          <div>
                            {shift.eveningClockIn
                              ? new Date(shift.eveningClockIn).toLocaleTimeString("en-US", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : "-"}
                            {shift.eveningClockIn && (
                              <span className="text-muted-foreground mx-1">to</span>
                            )}
                            {shift.eveningClockOut
                              ? new Date(shift.eveningClockOut).toLocaleTimeString("en-US", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : shift.eveningClockIn && shiftStatus === "evening_active"
                                ? <Badge variant="outline" className="text-xs ml-1 text-green-600">Active</Badge>
                                : ""}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Coffee className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm">{shift.breaks?.length || 0}</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8">
              <Clock className="h-12 w-12 mx-auto text-muted-foreground/50" />
              <p className="mt-2 text-muted-foreground">No attendance records yet today</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
