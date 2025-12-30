// client/src/pages/employee/dashboard.tsx
import React, { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, differenceInSeconds } from "date-fns";
import {
  Clock,
  Coffee,
  Play,
  Square,
  LogIn,
  LogOut,
  Utensils,
  Timer,
  FileText,
  Send,
  Loader2,
  Sun,
  Moon,
  Zap,
  Activity,
  CheckCircle,
  Circle,
  Pause,
  Target,
  AlertTriangle,
  Lock,
  Unlock,
  FileCheck,
  AlertCircle,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";

import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Shift, Break } from "@shared/schema";
import { cn } from "@/lib/utils";

// --- Types ---
interface TodayStatus {
  shift: Shift | null;
  breaks: Break[];
  breakCounts: { prayer: number; meal: number; urgent: number };
  activeBreak: Break | null;
  hasSubmittedReport: boolean;
}

// --- Helper: Format seconds to HH:MM:SS ---
function formatDuration(totalSeconds: number): string {
  if (totalSeconds < 0) totalSeconds = 0;
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// --- Helper: Format seconds to Xh Xm ---
function formatDurationShort(totalSeconds: number): string {
  if (totalSeconds < 0) totalSeconds = 0;
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  if (h > 0) {
    return `${h}h ${m}m`;
  }
  return `${m}m`;
}

// --- Live Timer Component ---
const LiveDuration = ({
  start,
  deductSeconds = 0,
  className = "",
}: {
  start: string | null | undefined;
  deductSeconds?: number;
  className?: string;
}) => {
  const [time, setTime] = useState({ h: 0, m: 0, s: 0 });

  useEffect(() => {
    if (!start) return;

    const updateTime = () => {
      const now = new Date();
      const startTime = new Date(start);
      let totalSeconds = differenceInSeconds(now, startTime) - deductSeconds;
      if (totalSeconds < 0) totalSeconds = 0;

      setTime({
        h: Math.floor(totalSeconds / 3600),
        m: Math.floor((totalSeconds % 3600) / 60),
        s: totalSeconds % 60,
      });
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [start, deductSeconds]);

  return (
    <span className={cn("font-mono tabular-nums", className)}>
      {String(time.h).padStart(2, "0")}:{String(time.m).padStart(2, "0")}:
      {String(time.s).padStart(2, "0")}
    </span>
  );
};

// --- Status Pill Component ---
const StatusPill = ({
  status,
  isOnBreak,
}: {
  status: "idle" | "active" | "completed" | "break";
  isOnBreak: boolean;
}) => {
  const styles = {
    idle: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
    active:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400",
    completed:
      "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400",
    break:
      "bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-400",
  };

  const actualStatus = isOnBreak ? "break" : status;

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold",
        styles[actualStatus]
      )}
    >
      <span
        className={cn(
          "w-2 h-2 rounded-full",
          actualStatus === "idle" && "bg-slate-400",
          actualStatus === "active" && "bg-emerald-500 animate-pulse",
          actualStatus === "completed" && "bg-blue-500",
          actualStatus === "break" && "bg-orange-500 animate-pulse"
        )}
      />
      {actualStatus === "idle" && "Ready to Start"}
      {actualStatus === "active" && "Shift Active"}
      {actualStatus === "completed" && "Shift Completed"}
      {actualStatus === "break" && "On Break"}
    </div>
  );
};

// --- Break Type Card ---
const BreakTypeCard = ({
  type,
  icon: Icon,
  used,
  max,
  isActive,
  onSelect,
  disabled,
}: {
  type: string;
  icon: any;
  used: number;
  max: number;
  isActive?: boolean;
  onSelect: () => void;
  disabled: boolean;
}) => {
  const remaining = max - used;
  const isMaxed = remaining <= 0;

  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled || isMaxed}
      className={cn(
        "relative p-4 rounded-xl border-2 transition-all duration-200 text-left w-full",
        "hover:scale-[1.02] active:scale-[0.98]",
        isActive
          ? "border-blue-500 bg-blue-50 dark:bg-blue-950/50"
          : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700",
        (disabled || isMaxed) && "opacity-50 cursor-not-allowed hover:scale-100"
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div
          className={cn(
            "p-2 rounded-lg",
            isActive
              ? "bg-blue-500 text-white"
              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
          )}
        >
          <Icon className="w-4 h-4" />
        </div>
        <Badge
          variant="outline"
          className={cn(
            "text-xs",
            isMaxed
              ? "bg-red-50 text-red-600 border-red-200"
              : "bg-slate-50 dark:bg-slate-800"
          )}
        >
          {remaining} left
        </Badge>
      </div>
      <p className="font-semibold text-slate-900 dark:text-white capitalize">
        {type}
      </p>
      <div className="mt-2 flex gap-1">
        {Array.from({ length: max }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "h-1.5 flex-1 rounded-full",
              i < used ? "bg-blue-500" : "bg-slate-200 dark:bg-slate-700"
            )}
          />
        ))}
      </div>
    </button>
  );
};

// --- Main Dashboard Component ---
export default function EmployeeDashboard() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeTab, setActiveTab] = useState<"morning" | "evening">("morning");
  const [selectedBreakType, setSelectedBreakType] = useState<string>("");

  // Report state
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [reportContent, setReportContent] = useState("");
  const [loomLinks, setLoomLinks] = useState("");
  const [references, setReferences] = useState("");
  const [notes, setNotes] = useState("");

  // End shift confirmation
  const [endShiftDialogOpen, setEndShiftDialogOpen] = useState(false);

  const { user } = useAuth();
  const { toast } = useToast();

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch today's status
  const { data: todayStatus, isLoading } = useQuery<TodayStatus>({
    queryKey: ["/api/employee/today"],
    refetchInterval: 30000,
  });

  const shift = todayStatus?.shift;
  const breaks = todayStatus?.breaks || [];
  const activeBreak = todayStatus?.activeBreak;
  const isOnBreak = !!activeBreak;
  const hasSubmittedReport = todayStatus?.hasSubmittedReport || false;

  // Calculate total break time in seconds
  const totalBreakSeconds = useMemo(() => {
    return breaks.reduce((acc, b) => {
      if (b.endTime) {
        return acc + differenceInSeconds(new Date(b.endTime), new Date(b.startTime));
      } else if (b.startTime) {
        // Active break - calculate current duration
        return acc + differenceInSeconds(new Date(), new Date(b.startTime));
      }
      return acc;
    }, 0);
  }, [breaks, currentTime]); // Include currentTime to recalculate for active breaks

  // Current shift period status
  const currentStart =
    activeTab === "morning" ? shift?.morningClockIn : shift?.eveningClockIn;
  const currentEnd =
    activeTab === "morning" ? shift?.morningClockOut : shift?.eveningClockOut;
  const isStarted = !!currentStart;
  const isEnded = !!currentEnd;
  const isActive = isStarted && !isEnded;

  // Calculate total worked seconds (gross time - without break deduction)
  const grossWorkedSeconds = useMemo(() => {
    if (!currentStart) return 0;
    
    const startTime = new Date(currentStart);
    const endTime = currentEnd ? new Date(currentEnd) : new Date();
    
    return differenceInSeconds(endTime, startTime);
  }, [currentStart, currentEnd, currentTime]);

  // Calculate net worked seconds (gross time - break time)
  const netWorkedSeconds = useMemo(() => {
    const net = grossWorkedSeconds - totalBreakSeconds;
    return net > 0 ? net : 0;
  }, [grossWorkedSeconds, totalBreakSeconds]);

  // Get shift status
  const getShiftStatus = (): "idle" | "active" | "completed" => {
    if (isEnded) return "completed";
    if (isActive) return "active";
    return "idle";
  };

  // Check if can end shift (must have submitted report)
  const canEndShift = isActive && hasSubmittedReport && !isOnBreak;
  const needsReportToEnd = isActive && !hasSubmittedReport;

  // Calculate progress percentage (based on 8 hour target = 28800 seconds)
  const calculateProgress = () => {
    if (!currentStart) return 0;
    
    const targetSeconds = 8 * 60 * 60; // 8 hours
    const progress = Math.round((netWorkedSeconds / targetSeconds) * 100);
    
    return Math.min(progress, 100);
  };

  // Calculate efficiency (net time / gross time * 100)
  const calculateEfficiency = () => {
    if (grossWorkedSeconds === 0) return 0;
    return Math.round((netWorkedSeconds / grossWorkedSeconds) * 100);
  };

  // Mutation handler
  const handleMutation = async (
    promise: Promise<Response>,
    successMsg: string,
    onSuccess?: () => void
  ) => {
    try {
      const res = await promise;
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || error.message);
      }
      await res.json();
      queryClient.invalidateQueries({ queryKey: ["/api/employee/today"] });
      toast({
        title: "Success",
        description: successMsg,
        className: "bg-emerald-50 border-emerald-200 text-emerald-800",
      });
      onSuccess?.();
    } catch (e: any) {
      toast({
        title: "Error",
        description: e.message,
        variant: "destructive",
      });
    }
  };

  // Loading states
  const [isStartingShift, setIsStartingShift] = useState(false);
  const [isEndingShift, setIsEndingShift] = useState(false);
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [isStartingBreak, setIsStartingBreak] = useState(false);
  const [isEndingBreak, setIsEndingBreak] = useState(false);

  const startShift = async () => {
    setIsStartingShift(true);
    await handleMutation(
      apiRequest("POST", `/api/employee/shift/${activeTab}/start`),
      `${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} shift started`
    );
    setIsStartingShift(false);
  };

  const endShift = async () => {
    if (!hasSubmittedReport) {
      setReportDialogOpen(true);
      return;
    }

    setIsEndingShift(true);
    await handleMutation(
      apiRequest("POST", `/api/employee/shift/${activeTab}/end`),
      `${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} shift ended`,
      () => setEndShiftDialogOpen(false)
    );
    setIsEndingShift(false);
  };

  const startBreak = async () => {
    if (!selectedBreakType) {
      toast({
        title: "Select Break Type",
        description: "Please select a break type first",
        variant: "destructive",
      });
      return;
    }

    setIsStartingBreak(true);
    await handleMutation(
      apiRequest("POST", "/api/employee/break/start", { type: selectedBreakType }),
      `${selectedBreakType.charAt(0).toUpperCase() + selectedBreakType.slice(1)} break started`,
      () => setSelectedBreakType("")
    );
    setIsStartingBreak(false);
  };

  const endBreak = async () => {
    setIsEndingBreak(true);
    await handleMutation(
      apiRequest("POST", "/api/employee/break/end"),
      "Break ended"
    );
    setIsEndingBreak(false);
  };

  const submitReport = async () => {
    if (!reportContent.trim()) {
      toast({
        title: "Report Required",
        description: "Please describe what you worked on today",
        variant: "destructive",
      });
      return;
    }

    setIsSubmittingReport(true);

    const reportData = {
      shiftId: shift?.id,
      date: new Date().toISOString().split("T")[0],
      workDetails: reportContent.trim(),
      loomVideos: loomLinks.trim() || null,
      references: references.trim() || null,
      notes: notes.trim() || null,
      month: new Date().toISOString().slice(0, 7),
    };

    await handleMutation(
      apiRequest("POST", "/api/reports/daily", reportData),
      "Report submitted successfully",
      () => {
        setReportDialogOpen(false);
        setReportContent("");
        setLoomLinks("");
        setReferences("");
        setNotes("");
        queryClient.invalidateQueries({ queryKey: ["/api/employee/today"] });
      }
    );
    setIsSubmittingReport(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          <p className="text-sm text-slate-500">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="relative z-10 p-6 space-y-6 max-w-7xl mx-auto">
        {/* === HEADER SECTION === */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-blue-500/25">
                  {user?.firstName?.charAt(0)}
                  {user?.lastName?.charAt(0)}
                </div>
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white dark:border-slate-900" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                  Welcome back, {user?.firstName}
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {format(currentTime, "EEEE, MMMM do, yyyy")}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Live Clock */}
            <div className="hidden sm:flex items-center gap-3 px-4 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <Clock className="w-4 h-4 text-slate-400" />
              <span className="font-mono text-lg font-semibold text-slate-900 dark:text-white tabular-nums">
                {format(currentTime, "HH:mm:ss")}
              </span>
            </div>

            {/* Shift Toggle */}
            <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800/50">
              <button
                onClick={() => setActiveTab("morning")}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                  activeTab === "morning"
                    ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                )}
              >
                <Sun className="w-4 h-4" />
                Morning
              </button>
              <button
                onClick={() => setActiveTab("evening")}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                  activeTab === "evening"
                    ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                )}
              >
                <Moon className="w-4 h-4" />
                Evening
              </button>
            </div>
          </div>
        </div>

        {/* === REPORT REQUIRED ALERT === */}
        {needsReportToEnd && (
          <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertTitle className="text-amber-800 dark:text-amber-400">
              Report Required
            </AlertTitle>
            <AlertDescription className="text-amber-700 dark:text-amber-500">
              You must submit a daily report before ending your shift. This helps
              track your work and progress.
            </AlertDescription>
          </Alert>
        )}

        {/* === MAIN GRID === */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* === LEFT COLUMN: Time Tracker === */}
          <div className="lg:col-span-2 space-y-6">
            {/* Primary Time Card */}
            <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white shadow-2xl">
              {/* Decorative elements */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-500/20 rounded-full blur-3xl" />

              <CardContent className="relative z-10 p-8">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                  {/* Timer Display */}
                  <div className="space-y-4">
                    <StatusPill status={getShiftStatus()} isOnBreak={isOnBreak} />

                    <div className="space-y-2">
                      <p className="text-sm text-slate-400 font-medium">
                        {isActive
                          ? "Net Working Time"
                          : isEnded
                          ? "Total Net Time"
                          : "Ready to Track"}
                      </p>
                      <div className="text-5xl md:text-6xl font-bold tracking-tight">
                        {isActive ? (
                          <LiveDuration
                            start={currentStart?.toString()}
                            deductSeconds={totalBreakSeconds}
                          />
                        ) : isEnded ? (
                          formatDuration(netWorkedSeconds)
                        ) : (
                          "00:00:00"
                        )}
                      </div>
                    </div>

                    {/* Progress */}
                    <div className="space-y-2 max-w-md">
                      <div className="flex justify-between text-xs text-slate-400">
                        <span>Progress</span>
                        <span>{calculateProgress()}% of 8h target</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-700 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-1000"
                          style={{ width: `${calculateProgress()}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Action Button */}
                  <div className="flex flex-col items-center gap-4">
                    {!isStarted && (
                      <Button
                        size="lg"
                        className="h-24 w-24 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 hover:from-emerald-500 hover:to-emerald-700 shadow-lg shadow-emerald-500/30 border-4 border-emerald-400/30 transition-all hover:scale-105"
                        onClick={startShift}
                        disabled={isOnBreak || isStartingShift}
                      >
                        {isStartingShift ? (
                          <Loader2 className="w-10 h-10 animate-spin" />
                        ) : (
                          <Play className="w-10 h-10 fill-white" />
                        )}
                      </Button>
                    )}

                    {isActive && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div>
                            <Button
                              size="lg"
                              className={cn(
                                "h-24 w-24 rounded-full shadow-lg border-4 transition-all",
                                canEndShift
                                  ? "bg-gradient-to-br from-red-400 to-red-600 hover:from-red-500 hover:to-red-700 shadow-red-500/30 border-red-400/30 hover:scale-105"
                                  : "bg-gradient-to-br from-slate-500 to-slate-600 border-slate-400/30 cursor-not-allowed"
                              )}
                              onClick={() => {
                                if (!hasSubmittedReport) {
                                  setReportDialogOpen(true);
                                } else {
                                  setEndShiftDialogOpen(true);
                                }
                              }}
                              disabled={isOnBreak || isEndingShift}
                            >
                              {isEndingShift ? (
                                <Loader2 className="w-8 h-8 animate-spin" />
                              ) : hasSubmittedReport ? (
                                <Square className="w-8 h-8 fill-white" />
                              ) : (
                                <Lock className="w-8 h-8" />
                              )}
                            </Button>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          {hasSubmittedReport
                            ? "Click to end shift"
                            : "Submit report to unlock"}
                        </TooltipContent>
                      </Tooltip>
                    )}

                    {isEnded && (
                      <div className="h-24 w-24 rounded-full bg-slate-700/50 flex items-center justify-center border-4 border-slate-600/30">
                        <CheckCircle className="w-10 h-10 text-emerald-400" />
                      </div>
                    )}

                    <p className="text-xs text-slate-400 font-medium text-center">
                      {!isStarted && "Tap to clock in"}
                      {isActive && !hasSubmittedReport && "Submit report first"}
                      {isActive && hasSubmittedReport && "Tap to clock out"}
                      {isEnded && "Shift completed"}
                    </p>
                  </div>
                </div>

                {/* Clock Times */}
                <Separator className="my-6 bg-slate-700" />

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-1">
                    <p className="text-xs text-slate-400 flex items-center gap-1.5">
                      <LogIn className="w-3 h-3" /> Clock In
                    </p>
                    <p className="text-lg font-semibold">
                      {currentStart
                        ? format(new Date(currentStart), "hh:mm a")
                        : "--:--"}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-slate-400 flex items-center gap-1.5">
                      <LogOut className="w-3 h-3" /> Clock Out
                    </p>
                    <p className="text-lg font-semibold">
                      {currentEnd
                        ? format(new Date(currentEnd), "hh:mm a")
                        : "--:--"}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-slate-400 flex items-center gap-1.5">
                      <Coffee className="w-3 h-3" /> Break Time
                    </p>
                    <p className="text-lg font-semibold">
                      {formatDurationShort(totalBreakSeconds)}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-slate-400 flex items-center gap-1.5">
                      <FileText className="w-3 h-3" /> Report
                    </p>
                    <p className="text-lg font-semibold flex items-center gap-2">
                      {hasSubmittedReport ? (
                        <>
                          <CheckCircle className="w-4 h-4 text-emerald-400" />
                          <span className="text-emerald-400">Done</span>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="w-4 h-4 text-amber-400" />
                          <span className="text-amber-400">Pending</span>
                        </>
                      )}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                    <Target className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Target</p>
                    <p className="text-lg font-bold">8h</p>
                  </div>
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                    <Zap className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Efficiency</p>
                    <p className="text-lg font-bold">
                      {isStarted ? `${calculateEfficiency()}%` : "--"}
                    </p>
                  </div>
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30">
                    <Coffee className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Breaks</p>
                    <p className="text-lg font-bold">
                      {(todayStatus?.breakCounts?.prayer || 0) +
                        (todayStatus?.breakCounts?.meal || 0) +
                        (todayStatus?.breakCounts?.urgent || 0)}
                      /6
                    </p>
                  </div>
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                    <Activity className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Gross Time</p>
                    <p className="text-lg font-bold">
                      {isStarted ? formatDurationShort(grossWorkedSeconds) : "--"}
                    </p>
                  </div>
                </div>
              </Card>
            </div>

            {/* Submit Report Card (when shift is active and no report) */}
            {isActive && !hasSubmittedReport && (
              <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/50">
                        <FileText className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                      </div>
                      <div>
                        <CardTitle className="text-base">
                          Daily Report Required
                        </CardTitle>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Submit your report to unlock shift ending
                        </p>
                      </div>
                    </div>
                    <Button
                      onClick={() => setReportDialogOpen(true)}
                      className="gap-2"
                    >
                      <FileCheck className="w-4 h-4" />
                      Submit Report
                    </Button>
                  </div>
                </CardHeader>
              </Card>
            )}

            {/* Report Submitted Card */}
            {hasSubmittedReport && isActive && (
              <Card className="border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-emerald-100 dark:bg-emerald-900/50">
                      <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-emerald-800 dark:text-emerald-400">
                        Report Submitted
                      </p>
                      <p className="text-xs text-emerald-600 dark:text-emerald-500">
                        You can now end your shift when ready
                      </p>
                    </div>
                    <Badge className="bg-emerald-500">
                      <Unlock className="w-3 h-3 mr-1" />
                      Unlocked
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* === RIGHT COLUMN: Break Management === */}
          <div className="space-y-6">
            {/* Break Control Panel */}
            <Card className="border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl overflow-hidden">
              <CardHeader className="pb-3 bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/30 border-b border-orange-100 dark:border-orange-900/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/50">
                      <Coffee className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                    </div>
                    <div>
                      <CardTitle className="text-base">Break Control</CardTitle>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {isOnBreak ? "Break in progress" : "Manage your breaks"}
                      </p>
                    </div>
                  </div>
                  {isOnBreak && (
                    <Badge className="bg-orange-500 text-white animate-pulse">
                      Active
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                {isOnBreak ? (
                  /* Active Break View */
                  <div className="space-y-4">
                    <div className="text-center p-6 rounded-xl bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/30 border border-orange-200 dark:border-orange-800">
                      <div className="text-4xl font-bold text-orange-600 dark:text-orange-400 mb-2">
                        <LiveDuration start={activeBreak?.startTime?.toString()} />
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400 capitalize">
                        {activeBreak?.type} Break
                      </p>
                    </div>
                    <Button
                      className="w-full bg-orange-600 hover:bg-orange-700"
                      onClick={endBreak}
                      disabled={isEndingBreak}
                    >
                      {isEndingBreak ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Pause className="w-4 h-4 mr-2" />
                      )}
                      End Break
                    </Button>
                  </div>
                ) : (
                  /* Break Selection View */
                  <div className="space-y-4">
                    <div className="grid gap-3">
                      <BreakTypeCard
                        type="Prayer"
                        icon={Timer}
                        used={todayStatus?.breakCounts?.prayer || 0}
                        max={3}
                        isActive={selectedBreakType === "prayer"}
                        onSelect={() => setSelectedBreakType("prayer")}
                        disabled={!isActive}
                      />
                      <BreakTypeCard
                        type="Meal"
                        icon={Utensils}
                        used={todayStatus?.breakCounts?.meal || 0}
                        max={1}
                        isActive={selectedBreakType === "meal"}
                        onSelect={() => setSelectedBreakType("meal")}
                        disabled={!isActive}
                      />
                      <BreakTypeCard
                        type="Urgent"
                        icon={Zap}
                        used={todayStatus?.breakCounts?.urgent || 0}
                        max={2}
                        isActive={selectedBreakType === "urgent"}
                        onSelect={() => setSelectedBreakType("urgent")}
                        disabled={!isActive}
                      />
                    </div>

                    <Button
                      className="w-full"
                      disabled={!selectedBreakType || !isActive || isStartingBreak}
                      onClick={startBreak}
                    >
                      {isStartingBreak ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Pause className="w-4 h-4 mr-2" />
                      )}
                      Start Break
                    </Button>

                    {!isActive && (
                      <p className="text-xs text-center text-slate-400">
                        Start your shift to take breaks
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Today's Activity */}
            <Card className="border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-cyan-100 dark:bg-cyan-900/30">
                    <Activity className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                  </div>
                  <CardTitle className="text-base">Today's Activity</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[200px]">
                  <div className="p-4 space-y-3">
                    {currentStart && (
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 p-1.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                          <LogIn className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                            Clocked In
                          </p>
                          <p className="text-xs text-slate-400">
                            {format(new Date(currentStart), "hh:mm a")}
                          </p>
                        </div>
                      </div>
                    )}

                    {breaks.map((brk, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <div className="mt-0.5 p-1.5 rounded-full bg-orange-100 dark:bg-orange-900/30">
                          <Coffee className="w-3 h-3 text-orange-600 dark:text-orange-400" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-slate-700 dark:text-slate-300 capitalize">
                            {brk.type} Break
                          </p>
                          <p className="text-xs text-slate-400">
                            {format(new Date(brk.startTime), "hh:mm a")}
                            {brk.endTime &&
                              ` - ${format(new Date(brk.endTime), "hh:mm a")}`}
                            {brk.durationMinutes && ` (${brk.durationMinutes}m)`}
                          </p>
                        </div>
                      </div>
                    ))}

                    {hasSubmittedReport && (
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 p-1.5 rounded-full bg-purple-100 dark:bg-purple-900/30">
                          <FileText className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                            Report Submitted
                          </p>
                          <p className="text-xs text-slate-400">Today</p>
                        </div>
                      </div>
                    )}

                    {currentEnd && (
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 p-1.5 rounded-full bg-blue-100 dark:bg-blue-900/30">
                          <LogOut className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                            Clocked Out
                          </p>
                          <p className="text-xs text-slate-400">
                            {format(new Date(currentEnd), "hh:mm a")}
                          </p>
                        </div>
                      </div>
                    )}

                    {!currentStart && breaks.length === 0 && (
                      <div className="text-center py-8">
                        <Circle className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                        <p className="text-sm text-slate-400">No activity yet</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* === REPORT SUBMISSION DIALOG === */}
        <Dialog open={reportDialogOpen} onOpenChange={setReportDialogOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-500" />
                Submit Daily Report
              </DialogTitle>
              <DialogDescription>
                Summarize your work for today. This is required before ending
                your shift.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Work Details <span className="text-red-500">*</span>
                </label>
                <Textarea
                  placeholder="What did you work on today? Describe your tasks, progress, and achievements..."
                  className="min-h-[120px] resize-none"
                  value={reportContent}
                  onChange={(e) => setReportContent(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Loom Video Links</label>
                <Input
                  placeholder="https://loom.com/share/..."
                  value={loomLinks}
                  onChange={(e) => setLoomLinks(e.target.value)}
                />
                <p className="text-xs text-slate-500">
                  Add links to any screen recordings or video updates
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">References</label>
                <Input
                  placeholder="Links to PRs, docs, designs, etc."
                  value={references}
                  onChange={(e) => setReferences(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Additional Notes</label>
                <Textarea
                  placeholder="Any blockers, questions, or notes for tomorrow..."
                  className="min-h-[80px] resize-none"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setReportDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={submitReport}
                disabled={!reportContent.trim() || isSubmittingReport}
                className="gap-2"
              >
                {isSubmittingReport ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                Submit Report
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* === END SHIFT CONFIRMATION DIALOG === */}
        <Dialog open={endShiftDialogOpen} onOpenChange={setEndShiftDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <LogOut className="w-5 h-5 text-red-500" />
                End Shift
              </DialogTitle>
              <DialogDescription>
                Are you sure you want to end your {activeTab} shift? This action
                cannot be undone.
              </DialogDescription>
            </DialogHeader>

            <div className="py-4">
              <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-900 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Clock In</span>
                  <span className="font-medium">
                    {currentStart
                      ? format(new Date(currentStart), "hh:mm a")
                      : "--:--"}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Gross Time</span>
                  <span className="font-medium">
                    {formatDurationShort(grossWorkedSeconds)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Break Time</span>
                  <span className="font-medium">
                    {formatDurationShort(totalBreakSeconds)}
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500 font-medium">Net Working Time</span>
                  <span className="font-bold text-emerald-600">
                    {formatDurationShort(netWorkedSeconds)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Report Status</span>
                  <span className="font-medium text-emerald-600 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" /> Submitted
                  </span>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setEndShiftDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={endShift}
                disabled={isEndingShift}
                className="gap-2"
              >
                {isEndingShift ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <LogOut className="w-4 h-4" />
                )}
                End Shift
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </ScrollArea>
  );
}