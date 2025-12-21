import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Clock,
  LogIn,
  LogOut,
  Calendar,
  TrendingUp,
  CheckCircle2,
  XCircle,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Attendance } from "@shared/schema";

interface TodayStatus {
  hasClockIn: boolean;
  hasClockOut: boolean;
  clockInTime: string | null;
  clockOutTime: string | null;
  record: Attendance | null;
}

interface AttendanceStats {
  presentDays: number;
  absentDays: number;
  lateDays: number;
  totalWorkHours: number;
}

function StatCard({
  title,
  value,
  icon: Icon,
  color,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  color?: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className={`h-4 w-4 ${color || "text-muted-foreground"}`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold" data-testid={`stat-${title.toLowerCase().replace(" ", "-")}`}>
          {value}
        </div>
      </CardContent>
    </Card>
  );
}

export default function EmployeeDashboard() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const { data: todayStatus, isLoading: statusLoading } = useQuery<TodayStatus>({
    queryKey: ["/api/employee/today"],
  });

  const { data: stats, isLoading: statsLoading } = useQuery<AttendanceStats>({
    queryKey: ["/api/employee/stats"],
  });

  const clockInMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/employee/clock-in");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/employee/today"] });
      queryClient.invalidateQueries({ queryKey: ["/api/employee/stats"] });
      toast({ title: "Clocked in successfully!" });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to clock in",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const clockOutMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/employee/clock-out");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/employee/today"] });
      queryClient.invalidateQueries({ queryKey: ["/api/employee/stats"] });
      toast({ title: "Clocked out successfully!" });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to clock out",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const today = format(currentTime, "EEEE, MMMM d, yyyy");
  const time = format(currentTime, "hh:mm:ss a");

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-greeting">
            Welcome, {user?.fullName?.split(" ")[0] || "Employee"}
          </h1>
          <p className="text-muted-foreground text-sm">{today}</p>
        </div>
        <Badge variant="secondary" className="w-fit text-lg font-mono py-1 px-3">
          <Clock className="h-4 w-4 mr-2" />
          {time}
        </Badge>
      </div>

      <Card className="border-2">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-between">
            <div className="text-center sm:text-left">
              <h2 className="text-xl font-semibold mb-2">Today's Attendance</h2>
              {statusLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-24" />
                </div>
              ) : (
                <div className="space-y-1">
                  {todayStatus?.clockInTime && (
                    <p className="text-sm text-muted-foreground flex items-center gap-2 justify-center sm:justify-start">
                      <LogIn className="h-4 w-4 text-green-500" />
                      Clocked in at{" "}
                      {format(new Date(todayStatus.clockInTime), "hh:mm a")}
                    </p>
                  )}
                  {todayStatus?.clockOutTime && (
                    <p className="text-sm text-muted-foreground flex items-center gap-2 justify-center sm:justify-start">
                      <LogOut className="h-4 w-4 text-orange-500" />
                      Clocked out at{" "}
                      {format(new Date(todayStatus.clockOutTime), "hh:mm a")}
                    </p>
                  )}
                  {!todayStatus?.hasClockIn && (
                    <p className="text-sm text-muted-foreground">
                      You haven't clocked in yet today
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="flex gap-3">
              {!todayStatus?.hasClockIn ? (
                <Button
                  size="lg"
                  onClick={() => clockInMutation.mutate()}
                  disabled={clockInMutation.isPending}
                  className="gap-2"
                  data-testid="button-clock-in"
                >
                  {clockInMutation.isPending ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <LogIn className="h-5 w-5" />
                  )}
                  Clock In
                </Button>
              ) : !todayStatus?.hasClockOut ? (
                <Button
                  size="lg"
                  variant="secondary"
                  onClick={() => clockOutMutation.mutate()}
                  disabled={clockOutMutation.isPending}
                  className="gap-2"
                  data-testid="button-clock-out"
                >
                  {clockOutMutation.isPending ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <LogOut className="h-5 w-5" />
                  )}
                  Clock Out
                </Button>
              ) : (
                <Badge variant="secondary" className="text-base py-2 px-4 bg-green-500/10 text-green-600 dark:text-green-400">
                  <CheckCircle2 className="h-5 w-5 mr-2" />
                  Day Complete
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

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
              title="Present Days"
              value={stats?.presentDays || 0}
              icon={CheckCircle2}
              color="text-green-500"
            />
            <StatCard
              title="Absent Days"
              value={stats?.absentDays || 0}
              icon={XCircle}
              color="text-red-500"
            />
            <StatCard
              title="Late Arrivals"
              value={stats?.lateDays || 0}
              icon={Clock}
              color="text-yellow-500"
            />
            <StatCard
              title="Total Hours"
              value={`${stats?.totalWorkHours || 0}h`}
              icon={TrendingUp}
              color="text-blue-500"
            />
          </>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Quick Info
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Department</p>
              <p className="font-medium">{user?.department || "Not assigned"}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Position</p>
              <p className="font-medium">{user?.position || "Not assigned"}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Email</p>
              <p className="font-medium">{user?.email || "Not provided"}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Username</p>
              <p className="font-medium">@{user?.username}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
