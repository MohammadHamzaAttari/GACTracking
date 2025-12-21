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
  Sun,
  Moon,
  Coffee,
  AlertCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Shift, Break, BREAK_LIMITS } from "@shared/schema";

interface TodayStatus {
  shift: Shift | null;
  breaks: Break[];
  breakCounts: {
    prayer: number;
    meal: number;
    urgent: number;
  };
  currentShiftPeriod: "morning" | "evening" | null;
  activeBreak: Break | null;
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
  const [breakDialogOpen, setBreakDialogOpen] = useState(false);
  const [selectedBreakType, setSelectedBreakType] = useState<string>("");
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

  const morningStartMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/employee/shift/morning/start");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/employee/today"] });
      queryClient.invalidateQueries({ queryKey: ["/api/employee/stats"] });
      toast({ title: "Morning shift started!" });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to start morning shift",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const morningEndMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/employee/shift/morning/end");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/employee/today"] });
      queryClient.invalidateQueries({ queryKey: ["/api/employee/stats"] });
      toast({ title: "Morning shift ended!" });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to end morning shift",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const eveningStartMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/employee/shift/evening/start");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/employee/today"] });
      queryClient.invalidateQueries({ queryKey: ["/api/employee/stats"] });
      toast({ title: "Evening shift started!" });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to start evening shift",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const eveningEndMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/employee/shift/evening/end");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/employee/today"] });
      queryClient.invalidateQueries({ queryKey: ["/api/employee/stats"] });
      toast({ title: "Evening shift ended!" });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to end evening shift",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const breakStartMutation = useMutation({
    mutationFn: async (type: string) => {
      const res = await apiRequest("POST", "/api/employee/break/start", { type });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/employee/today"] });
      setBreakDialogOpen(false);
      setSelectedBreakType("");
      toast({ title: "Break started!" });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to start break",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const breakEndMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/employee/break/end");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/employee/today"] });
      toast({ title: "Break ended!" });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to end break",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const today = format(currentTime, "EEEE, MMMM d, yyyy");
  const time = format(currentTime, "hh:mm:ss a");

  const shift = todayStatus?.shift;
  const hasMorningStarted = !!shift?.morningClockIn;
  const hasMorningEnded = !!shift?.morningClockOut;
  const hasEveningStarted = !!shift?.eveningClockIn;
  const hasEveningEnded = !!shift?.eveningClockOut;
  const isOnBreak = !!todayStatus?.activeBreak;
  const currentPeriod = todayStatus?.currentShiftPeriod;

  const breakCounts = todayStatus?.breakCounts || { prayer: 0, meal: 0, urgent: 0 };
  const userName = user?.firstName || "Employee";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-greeting">
            Welcome, {userName}
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
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Sun className="h-5 w-5 text-yellow-500" />
                <h3 className="font-semibold">Morning Shift</h3>
              </div>
              {statusLoading ? (
                <Skeleton className="h-10 w-full" />
              ) : (
                <div className="space-y-2">
                  {hasMorningStarted && (
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <LogIn className="h-4 w-4 text-green-500" />
                      Started at {format(new Date(shift!.morningClockIn!), "hh:mm a")}
                    </p>
                  )}
                  {hasMorningEnded && (
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <LogOut className="h-4 w-4 text-orange-500" />
                      Ended at {format(new Date(shift!.morningClockOut!), "hh:mm a")}
                    </p>
                  )}
                  <div className="flex gap-2">
                    {!hasMorningStarted && !isOnBreak && (
                      <Button
                        onClick={() => morningStartMutation.mutate()}
                        disabled={morningStartMutation.isPending}
                        className="gap-2"
                        data-testid="button-morning-start"
                      >
                        {morningStartMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <LogIn className="h-4 w-4" />
                        )}
                        Start Day
                      </Button>
                    )}
                    {hasMorningStarted && !hasMorningEnded && !isOnBreak && (
                      <Button
                        variant="secondary"
                        onClick={() => morningEndMutation.mutate()}
                        disabled={morningEndMutation.isPending}
                        className="gap-2"
                        data-testid="button-morning-end"
                      >
                        {morningEndMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <LogOut className="h-4 w-4" />
                        )}
                        End Day
                      </Button>
                    )}
                    {hasMorningEnded && (
                      <Badge variant="secondary" className="bg-green-500/10 text-green-600 dark:text-green-400">
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                        Complete
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Moon className="h-5 w-5 text-blue-500" />
                <h3 className="font-semibold">Evening Shift</h3>
              </div>
              {statusLoading ? (
                <Skeleton className="h-10 w-full" />
              ) : (
                <div className="space-y-2">
                  {hasEveningStarted && (
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <LogIn className="h-4 w-4 text-green-500" />
                      Started at {format(new Date(shift!.eveningClockIn!), "hh:mm a")}
                    </p>
                  )}
                  {hasEveningEnded && (
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <LogOut className="h-4 w-4 text-orange-500" />
                      Ended at {format(new Date(shift!.eveningClockOut!), "hh:mm a")}
                    </p>
                  )}
                  <div className="flex gap-2">
                    {!hasEveningStarted && !isOnBreak && (
                      <Button
                        onClick={() => eveningStartMutation.mutate()}
                        disabled={eveningStartMutation.isPending}
                        className="gap-2"
                        data-testid="button-evening-start"
                      >
                        {eveningStartMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <LogIn className="h-4 w-4" />
                        )}
                        Start Night
                      </Button>
                    )}
                    {hasEveningStarted && !hasEveningEnded && !isOnBreak && (
                      <Button
                        variant="secondary"
                        onClick={() => eveningEndMutation.mutate()}
                        disabled={eveningEndMutation.isPending}
                        className="gap-2"
                        data-testid="button-evening-end"
                      >
                        {eveningEndMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <LogOut className="h-4 w-4" />
                        )}
                        End Night
                      </Button>
                    )}
                    {hasEveningEnded && (
                      <Badge variant="secondary" className="bg-green-500/10 text-green-600 dark:text-green-400">
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                        Complete
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2">
            <Coffee className="h-5 w-5" />
            Break Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          {statusLoading ? (
            <Skeleton className="h-20 w-full" />
          ) : isOnBreak ? (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-md bg-yellow-500/10">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-yellow-500" />
                <div>
                  <p className="font-medium">You are currently on a {todayStatus?.activeBreak?.type} break</p>
                  <p className="text-sm text-muted-foreground">
                    Started at {format(new Date(todayStatus!.activeBreak!.startTime), "hh:mm a")}
                  </p>
                </div>
              </div>
              <Button
                variant="secondary"
                onClick={() => breakEndMutation.mutate()}
                disabled={breakEndMutation.isPending}
                className="gap-2"
                data-testid="button-break-end"
              >
                {breakEndMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                End Break
              </Button>
            </div>
          ) : currentPeriod ? (
            <div className="space-y-4">
              <div className="grid gap-4 grid-cols-3">
                <div className="text-center p-3 rounded-md bg-muted/50">
                  <p className="text-2xl font-bold">{breakCounts.prayer}/3</p>
                  <p className="text-xs text-muted-foreground">Prayer Breaks</p>
                </div>
                <div className="text-center p-3 rounded-md bg-muted/50">
                  <p className="text-2xl font-bold">{breakCounts.meal}/1</p>
                  <p className="text-xs text-muted-foreground">Meal Breaks</p>
                </div>
                <div className="text-center p-3 rounded-md bg-muted/50">
                  <p className="text-2xl font-bold">{breakCounts.urgent}/2</p>
                  <p className="text-xs text-muted-foreground">Urgent Breaks</p>
                </div>
              </div>
              <Dialog open={breakDialogOpen} onOpenChange={setBreakDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="w-full gap-2" data-testid="button-start-break">
                    <Coffee className="h-4 w-4" />
                    Start Break
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Start a Break</DialogTitle>
                    <DialogDescription>
                      Select the type of break you want to take.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <Select value={selectedBreakType} onValueChange={setSelectedBreakType}>
                      <SelectTrigger data-testid="select-break-type">
                        <SelectValue placeholder="Select break type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="prayer" disabled={breakCounts.prayer >= 3}>
                          Prayer Break ({breakCounts.prayer}/3 used)
                        </SelectItem>
                        <SelectItem value="meal" disabled={breakCounts.meal >= 1}>
                          Meal Break ({breakCounts.meal}/1 used)
                        </SelectItem>
                        <SelectItem value="urgent" disabled={breakCounts.urgent >= 2}>
                          Urgent Break ({breakCounts.urgent}/2 used)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      className="w-full"
                      disabled={!selectedBreakType || breakStartMutation.isPending}
                      onClick={() => breakStartMutation.mutate(selectedBreakType)}
                      data-testid="button-confirm-break"
                    >
                      {breakStartMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : null}
                      Confirm Break
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          ) : (
            <div className="text-center py-4 text-muted-foreground">
              <p>Start a shift to take breaks</p>
            </div>
          )}
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
              <p className="text-sm text-muted-foreground">Shift Type</p>
              <p className="font-medium capitalize">{user?.shiftType?.replace("_", " ") || "Not set"}</p>
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
