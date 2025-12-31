// client/src/pages/employee/dashboard.tsx

import React, { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
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
  Target as TargetIcon, // ✅ RENAMED to avoid conflict
  AlertTriangle,
  Lock,
  Unlock,
  FileCheck,
  AlertCircle,
  TrendingUp,
  Plus,
  ExternalLink,
  Calendar,
  X,
  ChevronDown,
  ChevronUp,
  Filter,
  MoreHorizontal,
  Trash2,
  Edit3,
  Eye,
  Star,
  Award,
  Sparkles,
  Users,
  DollarSign,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Search,
  RefreshCw
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Shift, Break, TargetItem, Target as TargetType } from "@shared/schema"; // ✅ RENAMED
import { cn } from "@/lib/utils";

// --- Types ---
interface TodayStatus {
  shift: Shift | null;
  breaks: Break[];
  breakCounts: { prayer: number; meal: number; urgent: number };
  activeBreak: Break | null;
  hasSubmittedReport: boolean;
}

interface TargetsSummary {
  target: TargetType & { meetingTarget: number; orderTarget: number };
  meetings: {
    total: number;
    verified: number;
    items: TargetItem[];
  };
  orders: {
    total: number;
    verified: number;
    items: TargetItem[];
  };
}

// === BUSINESS DEVELOPMENT SOURCES ===
const SOURCES: string[] = [
  "FB Yousaf", "FB Abdullah", "FB Get Ai",
  "Insta Yousaf", "Insta Getai",
  "Linkedin Yousaf", "Linkedin Abdullah", "Linkedin Get Ai",
  "Discovery", "Top Upwork", "New Upwork", "Fiver Top"
];

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
    active: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400",
    completed: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400",
    break: "bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-400",
  };

  const actualStatus = isOnBreak ? "break" : status;

  return (
    <div className={cn("inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold", styles[actualStatus])}>
      <span className={cn(
        "w-2 h-2 rounded-full",
        actualStatus === "idle" && "bg-slate-400",
        actualStatus === "active" && "bg-emerald-500 animate-pulse",
        actualStatus === "completed" && "bg-blue-500",
        actualStatus === "break" && "bg-orange-500 animate-pulse"
      )} />
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
        <div className={cn(
          "p-2 rounded-lg",
          isActive ? "bg-blue-500 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
        )}>
          <Icon className="w-4 h-4" />
        </div>
        <Badge variant="outline" className={cn("text-xs", isMaxed ? "bg-red-50 text-red-600 border-red-200" : "bg-slate-50 dark:bg-slate-800")}>
          {remaining} left
        </Badge>
      </div>
      <p className="font-semibold text-slate-900 dark:text-white capitalize">{type}</p>
      <div className="mt-2 flex gap-1">
        {Array.from({ length: max }).map((_, i) => (
          <div key={i} className={cn("h-1.5 flex-1 rounded-full", i < used ? "bg-blue-500" : "bg-slate-200 dark:bg-slate-700")} />
        ))}
      </div>
    </button>
  );
};

// === ANIMATED COUNTER ===
function AnimatedCounter({ value, suffix = "" }: { value: number; suffix?: string }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const duration = 1000;
    const steps = 30;
    const increment = value / steps;
    let current = 0;

    const timer = setInterval(() => {
      current += increment;
      if (current >= value) {
        setDisplayValue(value);
        clearInterval(timer);
      } else {
        setDisplayValue(Math.floor(current));
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [value]);

  return <span>{displayValue}{suffix}</span>;
}

// === CIRCULAR PROGRESS ===
function CircularProgress({
  value,
  size = 120,
  strokeWidth = 10,
  color = "blue"
}: {
  value: number;
  size?: number;
  strokeWidth?: number;
  color?: "blue" | "emerald" | "purple";
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (value / 100) * circumference;

  const colors = {
    blue: "stroke-blue-500",
    emerald: "stroke-emerald-500",
    purple: "stroke-purple-500"
  };

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} stroke="currentColor" strokeWidth={strokeWidth} fill="none" className="text-slate-100 dark:text-slate-800" />
        <circle cx={size / 2} cy={size / 2} r={radius} strokeWidth={strokeWidth} fill="none" strokeLinecap="round" className={cn(colors[color], "transition-all duration-1000 ease-out")} style={{ strokeDasharray: circumference, strokeDashoffset: offset }} />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-2xl font-bold text-slate-900 dark:text-white">
          <AnimatedCounter value={Math.round(value)} suffix="%" />
        </span>
      </div>
    </div>
  );
}

// === ENHANCED BUSINESS ENTRY CARD ===
function EnhancedEntryCard({
  entry,
  type,
  index,
  onDelete,
  onEdit
}: {
  entry: TargetItem;
  type: "meeting" | "order";
  index: number;
  onDelete?: (id: string) => void;
  onEdit?: (entry: TargetItem) => void;
}) {
  const getSourceIcon = (source: string | null) => {
    if (!source) return <TargetIcon className="w-3 h-3" />;
    if (source.includes("Upwork") || source.includes("Fiver")) return <Zap className="w-3 h-3" />;
    if (source.includes("Linkedin")) return <Users className="w-3 h-3" />;
    if (source.includes("FB") || source.includes("Insta")) return <Star className="w-3 h-3" />;
    return <TargetIcon className="w-3 h-3" />;
  };

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-xl border transition-all duration-300",
        "bg-white dark:bg-slate-900",
        "border-slate-200 dark:border-slate-800",
        "hover:shadow-xl hover:shadow-slate-200/50 dark:hover:shadow-slate-900/50",
        "hover:border-slate-300 dark:hover:border-slate-700",
        "animate-in slide-in-from-bottom-2 fade-in"
      )}
      style={{ animationDelay: `${index * 75}ms`, animationFillMode: 'both' }}
    >
      <div className={cn(
        "absolute top-0 left-0 right-0 h-1",
        type === "meeting" ? "bg-gradient-to-r from-blue-400 via-blue-500 to-indigo-500" : "bg-gradient-to-r from-emerald-400 via-emerald-500 to-teal-500"
      )} />

      {entry.verified && (
        <div className="absolute top-3 right-3 z-10">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="p-1.5 rounded-full shadow-lg bg-gradient-to-br from-emerald-400 to-emerald-600 text-white animate-in zoom-in-50 duration-300">
                <CheckCircle className="w-3.5 h-3.5" />
              </div>
            </TooltipTrigger>
            <TooltipContent side="left"><p>Verified by Admin</p></TooltipContent>
          </Tooltip>
        </div>
      )}

      <div className="p-4 pt-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-slate-900 dark:text-white truncate text-base mb-1">{entry.name}</h4>
            <p className="text-xs text-slate-500 flex items-center gap-1.5">
              <Calendar className="w-3 h-3" />
              {entry.date ? format(new Date(entry.date), "MMM dd, yyyy") : "No date"}
            </p>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon" variant="ghost" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-slate-100 dark:hover:bg-slate-800">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {entry.contactLink && (
                <DropdownMenuItem onClick={() => window.open(entry.contactLink!, '_blank')}>
                  <ExternalLink className="w-4 h-4 mr-2" />View in GHL
                </DropdownMenuItem>
              )}
              {!entry.verified && (
                <DropdownMenuItem onClick={() => onEdit?.(entry)}>
                  <Edit3 className="w-4 h-4 mr-2" />Edit Entry
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              {!entry.verified && (
                <DropdownMenuItem onClick={() => onDelete?.(entry.id)} className="text-red-600 focus:text-red-600 focus:bg-red-50">
                  <Trash2 className="w-4 h-4 mr-2" />Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {entry.source && (
            <Badge variant="secondary" className={cn("text-xs font-medium gap-1", type === "meeting" ? "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300" : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300")}>
              {getSourceIcon(entry.source)}{entry.source}
            </Badge>
          )}
          {(entry as any).clientType && (
            <Badge variant="outline" className={cn("text-xs font-medium", (entry as any).clientType === "B2B" ? "border-purple-200 text-purple-700 bg-purple-50" : "border-amber-200 text-amber-700 bg-amber-50")}>
              {(entry as any).clientType}
            </Badge>
          )}
          {!entry.verified && (
            <Badge variant="outline" className="text-xs font-medium border-orange-200 text-orange-600 bg-orange-50">
              <Clock className="w-3 h-3 mr-1" />Pending
            </Badge>
          )}
        </div>

        {entry.contactLink && (
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
            <a href={entry.contactLink} target="_blank" rel="noreferrer" className={cn("text-xs font-medium flex items-center gap-1.5 transition-colors", type === "meeting" ? "text-blue-600 hover:text-blue-700" : "text-emerald-600 hover:text-emerald-700")}>
              <ExternalLink className="w-3.5 h-3.5" />Open GHL Contact<ArrowUpRight className="w-3 h-3" />
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

// === ADD ENTRY MODAL ===
function AddEntryModal({
  type,
  open,
  onOpenChange,
  onSuccess,
  editEntry,
}: {
  type: "Meeting" | "Order";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  editEntry?: TargetItem | null;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({ clientName: "", ghlUrl: "", source: "", clientType: "" });
  const { toast } = useToast();

  useEffect(() => {
    if (editEntry) {
      setFormData({
        clientName: editEntry.name || "",
        ghlUrl: editEntry.contactLink || "",
        source: editEntry.source || "",
        clientType: (editEntry as any).clientType || ""
      });
    } else {
      setFormData({ clientName: "", ghlUrl: "", source: "", clientType: "" });
    }
  }, [editEntry, open]);

  const handleSubmit = async () => {
    if (!formData.clientName || !formData.source || !formData.clientType) {
      toast({ title: "Validation Error", description: "Please fill in all required fields", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        type: type.toLowerCase(),
        name: formData.clientName,
        source: formData.source,
        clientType: formData.clientType,
        contactLink: formData.ghlUrl || null,
        date: new Date().toISOString().split("T")[0],
      };

      if (editEntry) {
        await apiRequest("PATCH", `/api/employee/targets/items/${editEntry.id}`, payload);
        toast({ title: "Success", description: `${type} updated successfully` });
      } else {
        await apiRequest("POST", "/api/employee/targets/items", payload);
        toast({ title: "Success", description: `${type} added successfully` });
      }

      queryClient.invalidateQueries({ queryKey: ["/api/employee/targets/summary"] });
      onSuccess?.();
      onOpenChange(false);
      setFormData({ clientName: "", ghlUrl: "", source: "", clientType: "" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message || `Failed to ${editEntry ? 'update' : 'add'} ${type.toLowerCase()}`, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isValid = formData.clientName && formData.source && formData.clientType;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] p-0 overflow-hidden">
        <div className={cn("px-6 py-5", type === "Meeting" ? "bg-gradient-to-r from-blue-500 to-indigo-600" : "bg-gradient-to-r from-emerald-500 to-teal-600")}>
          <DialogHeader className="text-white">
            <DialogTitle className="flex items-center gap-2 text-xl">
              {type === "Meeting" ? <Users className="w-5 h-5" /> : <DollarSign className="w-5 h-5" />}
              {editEntry ? `Edit ${type}` : `Add New ${type}`}
            </DialogTitle>
            <DialogDescription className="text-white/80">
              {editEntry ? `Update the details for this ${type.toLowerCase()}.` : `Enter client details to track a new ${type.toLowerCase()} for this month.`}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="p-6 space-y-5">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm font-medium">Client Name <span className="text-red-500">*</span></Label>
            <Input id="name" placeholder="Enter client name" value={formData.clientName} onChange={(e) => setFormData({ ...formData, clientName: e.target.value })} className="h-11" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="url" className="text-sm font-medium">GHL Contact URL</Label>
            <Input id="url" placeholder="https://app.gohighlevel.com/..." value={formData.ghlUrl} onChange={(e) => setFormData({ ...formData, ghlUrl: e.target.value })} className="h-11" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="source" className="text-sm font-medium">Source <span className="text-red-500">*</span></Label>
              <Select value={formData.source} onValueChange={(value) => setFormData({ ...formData, source: value })}>
                <SelectTrigger className="h-11"><SelectValue placeholder="Select source" /></SelectTrigger>
                <SelectContent className="max-h-[200px]">
                  {SOURCES.map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="type" className="text-sm font-medium">Client Type <span className="text-red-500">*</span></Label>
              <Select value={formData.clientType} onValueChange={(value) => setFormData({ ...formData, clientType: value })}>
                <SelectTrigger className="h-11"><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="B2B"><span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-purple-500" />B2B - Business</span></SelectItem>
                  <SelectItem value="B2C"><span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-amber-500" />B2C - Consumer</span></SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter className="px-6 py-4 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-800">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="mr-2">Cancel</Button>
          <Button onClick={handleSubmit} disabled={!isValid || isSubmitting} className={cn("min-w-[120px]", type === "Meeting" ? "bg-blue-600 hover:bg-blue-700" : "bg-emerald-600 hover:bg-emerald-700")}>
            {isSubmitting ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" />{editEntry ? 'Updating...' : 'Adding...'}</>) : (<>{editEntry ? <Edit3 className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}{editEntry ? `Update ${type}` : `Add ${type}`}</>)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// === STAT CARD ===
function StatCard({ icon: Icon, label, value, subValue, color = "blue" }: { icon: any; label: string; value: string | number; subValue?: string; color?: "blue" | "emerald" | "purple" | "amber"; }) {
  const iconBg = {
    blue: "bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400",
    emerald: "bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400",
    purple: "bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400",
    amber: "bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400"
  };

  return (
    <Card className="relative bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-slate-200/50 dark:border-slate-800/50 hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-300">
      <CardContent className="p-4">
        <div className={cn("p-2.5 rounded-xl w-fit", iconBg[color])}><Icon className="w-5 h-5" /></div>
        <div className="mt-4">
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{typeof value === 'number' ? <AnimatedCounter value={value} /> : value}</p>
          <p className="text-sm text-slate-500 mt-0.5">{label}</p>
          {subValue && <p className="text-xs text-slate-400 mt-1">{subValue}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

// === BUSINESS DEVELOPMENT BOARD ===
function BusinessDevelopmentBoard() {
  const [isMeetingOpen, setIsMeetingOpen] = useState(false);
  const [isOrderOpen, setIsOrderOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<"all" | "verified" | "pending">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isMeetingsExpanded, setIsMeetingsExpanded] = useState(true);
  const [isOrdersExpanded, setIsOrdersExpanded] = useState(true);
  const [editingEntry, setEditingEntry] = useState<TargetItem | null>(null);
  const [editingType, setEditingType] = useState<"Meeting" | "Order">("Meeting");
  const { toast } = useToast();

  const currentMonth = new Date().toISOString().slice(0, 7);

  const { data: targetsSummary, isLoading, refetch } = useQuery<TargetsSummary>({
    queryKey: ["/api/employee/targets/summary", currentMonth],
    queryFn: async () => {
      const res = await fetch(`/api/employee/targets/summary?month=${currentMonth}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch targets");
      return res.json();
    },
    refetchInterval: 30000,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/employee/targets/items/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/employee/targets/summary"] });
      toast({ title: "Deleted", description: "Entry deleted successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to delete entry", variant: "destructive" });
    },
  });

  const meetings = targetsSummary?.meetings?.items || [];
  const orders = targetsSummary?.orders?.items || [];
  const meetingsTarget = targetsSummary?.target?.meetingTarget || 20;
  const meetingsAchieved = targetsSummary?.meetings?.total || 0;
  const meetingsProgress = meetingsTarget > 0 ? (meetingsAchieved / meetingsTarget) * 100 : 0;
  const meetingsVerified = targetsSummary?.meetings?.verified || 0;
  const ordersTarget = targetsSummary?.target?.orderTarget || 5;
  const ordersAchieved = targetsSummary?.orders?.total || 0;
  const ordersProgress = ordersTarget > 0 ? (ordersAchieved / ordersTarget) * 100 : 0;
  const ordersVerified = targetsSummary?.orders?.verified || 0;
  const combinedProgress = ((meetingsAchieved + ordersAchieved) / (meetingsTarget + ordersTarget)) * 100;

  const filteredMeetings = useMemo(() => {
    return meetings.filter(m => {
      const matchesFilter = activeFilter === "all" || (activeFilter === "verified" && m.verified) || (activeFilter === "pending" && !m.verified);
      const matchesSearch = !searchQuery || m.name.toLowerCase().includes(searchQuery.toLowerCase()) || (m.source?.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesFilter && matchesSearch;
    });
  }, [meetings, activeFilter, searchQuery]);

  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      const matchesFilter = activeFilter === "all" || (activeFilter === "verified" && o.verified) || (activeFilter === "pending" && !o.verified);
      const matchesSearch = !searchQuery || o.name.toLowerCase().includes(searchQuery.toLowerCase()) || (o.source?.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesFilter && matchesSearch;
    });
  }, [orders, activeFilter, searchQuery]);

  const handleDelete = (id: string) => {
    if (window.confirm("Are you sure you want to delete this entry?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleEdit = (entry: TargetItem) => {
    setEditingEntry(entry);
    setEditingType(entry.type === "meeting" ? "Meeting" : "Order");
    if (entry.type === "meeting") setIsMeetingOpen(true);
    else setIsOrderOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          <p className="text-sm text-slate-500">Loading business targets...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-700">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8 text-white shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />

        <div className="relative z-10">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 mb-8">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg shadow-blue-500/30">
                  <TargetIcon className="w-8 h-8" />
                </div>
                <div className="absolute -top-1 -right-1">
                  <span className="flex h-4 w-4">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500" />
                  </span>
                </div>
              </div>
              <div>
                <h2 className="text-3xl font-bold tracking-tight">Business Development</h2>
                <p className="text-slate-400 mt-1">Monthly Performance Dashboard • {format(new Date(), "MMMM yyyy")}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button variant="ghost" size="sm" onClick={() => refetch()} className="text-white/70 hover:text-white hover:bg-white/10">
                <RefreshCw className="w-4 h-4 mr-2" />Refresh
              </Button>
              <Badge className="bg-white/10 text-white border-white/20 px-4 py-2 text-sm backdrop-blur-sm">
                <Sparkles className="w-4 h-4 mr-2 text-amber-400" />Live Data
              </Badge>
              <Button onClick={() => { setEditingEntry(null); setIsMeetingOpen(true); }} className="bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/25">
                <Plus className="w-4 h-4 mr-2" />Add Meeting
              </Button>
              <Button onClick={() => { setEditingEntry(null); setIsOrderOpen(true); }} className="bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-500/25">
                <Plus className="w-4 h-4 mr-2" />Add Order
              </Button>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 lg:gap-6">
            <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-5 border border-white/10">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-2 rounded-lg bg-blue-500/20"><TrendingUp className="w-4 h-4 text-blue-400" /></div>
                <span className="text-sm font-medium text-blue-300">Meetings</span>
              </div>
              <div className="text-4xl font-bold mb-2"><AnimatedCounter value={meetingsAchieved} /><span className="text-lg text-slate-500 font-normal">/{meetingsTarget}</span></div>
              <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full transition-all duration-1000" style={{ width: `${Math.min(meetingsProgress, 100)}%` }} />
              </div>
              <p className="text-xs text-slate-500 mt-2">{meetingsVerified} verified • {meetingsAchieved - meetingsVerified} pending</p>
            </div>

            <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-5 border border-white/10">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-2 rounded-lg bg-emerald-500/20"><Zap className="w-4 h-4 text-emerald-400" /></div>
                <span className="text-sm font-medium text-emerald-300">Orders</span>
              </div>
              <div className="text-4xl font-bold mb-2"><AnimatedCounter value={ordersAchieved} /><span className="text-lg text-slate-500 font-normal">/{ordersTarget}</span></div>
              <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full transition-all duration-1000" style={{ width: `${Math.min(ordersProgress, 100)}%` }} />
              </div>
              <p className="text-xs text-slate-500 mt-2">{ordersVerified} verified • {ordersAchieved - ordersVerified} pending</p>
            </div>

            <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-5 border border-white/10">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-2 rounded-lg bg-amber-500/20"><CheckCircle className="w-4 h-4 text-amber-400" /></div>
                <span className="text-sm font-medium text-amber-300">Verified</span>
              </div>
              <div className="text-4xl font-bold mb-2">{meetingsVerified + ordersVerified}<span className="text-lg text-slate-500 font-normal">/{meetingsAchieved + ordersAchieved}</span></div>
              <p className="text-xs text-slate-500">Total verified entries</p>
            </div>

            <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-5 border border-white/10 flex flex-col items-center justify-center">
              <CircularProgress value={Math.min(combinedProgress, 100)} size={100} strokeWidth={8} color="purple" />
              <p className="text-sm font-medium text-purple-300 mt-3">Overall Progress</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-1">
        <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800/50">
          {[{ key: "all", label: "All", count: meetings.length + orders.length }, { key: "verified", label: "Verified", count: meetingsVerified + ordersVerified }, { key: "pending", label: "Pending", count: (meetings.length - meetingsVerified) + (orders.length - ordersVerified) }].map(({ key, label, count }) => (
            <button key={key} onClick={() => setActiveFilter(key as any)} className={cn("flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all", activeFilter === key ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm" : "text-slate-500 hover:text-slate-700")}>
              {label}<Badge variant="secondary" className="text-xs h-5 px-1.5">{count}</Badge>
            </button>
          ))}
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input placeholder="Search clients..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10 w-full sm:w-64 h-10 bg-white dark:bg-slate-900" />
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Meetings Panel */}
        <Collapsible open={isMeetingsExpanded} onOpenChange={setIsMeetingsExpanded}>
          <Card className="overflow-hidden border-slate-200/80 dark:border-slate-800/80 shadow-xl">
            <div className="bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-600 p-5">
              <CollapsibleTrigger className="w-full">
                <div className="flex items-center justify-between text-white">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-white/20"><TrendingUp className="w-5 h-5" /></div>
                    <div className="text-left">
                      <h3 className="font-bold text-lg">Meetings</h3>
                      <p className="text-blue-100 text-sm">{filteredMeetings.length} entries this month</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge className="bg-white/20 text-white border-0 px-3 py-1">{Math.round(meetingsProgress)}%</Badge>
                    {isMeetingsExpanded ? <ChevronUp className="w-5 h-5 text-white/70" /> : <ChevronDown className="w-5 h-5 text-white/70" />}
                  </div>
                </div>
              </CollapsibleTrigger>
              <div className="mt-4 h-2 rounded-full bg-white/20 overflow-hidden">
                <div className="h-full bg-white rounded-full transition-all duration-1000" style={{ width: `${Math.min(meetingsProgress, 100)}%` }} />
              </div>
            </div>
            <CollapsibleContent>
              <ScrollArea className="h-[400px]">
                <div className="p-5 space-y-4">
                  {filteredMeetings.length === 0 ? (
                    <div className="text-center py-16">
                      <Circle className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                      <p className="text-base font-medium text-slate-600">No meetings found</p>
                      <Button onClick={() => { setEditingEntry(null); setIsMeetingOpen(true); }} className="mt-4 bg-blue-600 hover:bg-blue-700">
                        <Plus className="w-4 h-4 mr-2" />Add Meeting
                      </Button>
                    </div>
                  ) : (
                    filteredMeetings.map((meeting, idx) => (
                      <EnhancedEntryCard key={meeting.id} entry={meeting} type="meeting" index={idx} onDelete={handleDelete} onEdit={handleEdit} />
                    ))
                  )}
                </div>
              </ScrollArea>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Orders Panel */}
        <Collapsible open={isOrdersExpanded} onOpenChange={setIsOrdersExpanded}>
          <Card className="overflow-hidden border-slate-200/80 dark:border-slate-800/80 shadow-xl">
            <div className="bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-600 p-5">
              <CollapsibleTrigger className="w-full">
                <div className="flex items-center justify-between text-white">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-white/20"><Zap className="w-5 h-5" /></div>
                    <div className="text-left">
                      <h3 className="font-bold text-lg">Orders</h3>
                      <p className="text-emerald-100 text-sm">{filteredOrders.length} entries this month</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge className="bg-white/20 text-white border-0 px-3 py-1">{Math.round(ordersProgress)}%</Badge>
                    {isOrdersExpanded ? <ChevronUp className="w-5 h-5 text-white/70" /> : <ChevronDown className="w-5 h-5 text-white/70" />}
                  </div>
                </div>
              </CollapsibleTrigger>
              <div className="mt-4 h-2 rounded-full bg-white/20 overflow-hidden">
                <div className="h-full bg-white rounded-full transition-all duration-1000" style={{ width: `${Math.min(ordersProgress, 100)}%` }} />
              </div>
            </div>
            <CollapsibleContent>
              <ScrollArea className="h-[400px]">
                <div className="p-5 space-y-4">
                  {filteredOrders.length === 0 ? (
                    <div className="text-center py-16">
                      <Circle className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                      <p className="text-base font-medium text-slate-600">No orders found</p>
                      <Button onClick={() => { setEditingEntry(null); setIsOrderOpen(true); }} className="mt-4 bg-emerald-600 hover:bg-emerald-700">
                        <Plus className="w-4 h-4 mr-2" />Add Order
                      </Button>
                    </div>
                  ) : (
                    filteredOrders.map((order, idx) => (
                      <EnhancedEntryCard key={order.id} entry={order} type="order" index={idx} onDelete={handleDelete} onEdit={handleEdit} />
                    ))
                  )}
                </div>
              </ScrollArea>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={TrendingUp} label="Meetings This Month" value={meetingsAchieved} subValue={`Target: ${meetingsTarget}`} color="blue" />
        <StatCard icon={Zap} label="Orders This Month" value={ordersAchieved} subValue={`Target: ${ordersTarget}`} color="emerald" />
        <StatCard icon={CheckCircle} label="Verification Rate" value={`${meetingsAchieved + ordersAchieved > 0 ? Math.round(((meetingsVerified + ordersVerified) / (meetingsAchieved + ordersAchieved)) * 100) : 0}%`} subValue={`${meetingsVerified + ordersVerified} verified entries`} color="purple" />
        <StatCard icon={Award} label="Days Remaining" value={30 - parseInt(format(new Date(), "d"))} subValue={`${format(new Date(), "MMMM")} ends soon`} color="amber" />
      </div>

      {/* Modals */}
      <AddEntryModal type="Meeting" open={isMeetingOpen} onOpenChange={(open) => { setIsMeetingOpen(open); if (!open) setEditingEntry(null); }} onSuccess={() => refetch()} editEntry={editingType === "Meeting" ? editingEntry : null} />
      <AddEntryModal type="Order" open={isOrderOpen} onOpenChange={(open) => { setIsOrderOpen(open); if (!open) setEditingEntry(null); }} onSuccess={() => refetch()} editEntry={editingType === "Order" ? editingEntry : null} />
    </div>
  );
}

// === MAIN DASHBOARD COMPONENT ===
export default function EmployeeDashboard() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeTab, setActiveTab] = useState<"morning" | "evening">("morning");
  const [selectedBreakType, setSelectedBreakType] = useState<string>("");
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [reportContent, setReportContent] = useState("");
  const [loomLinks, setLoomLinks] = useState("");
  const [references, setReferences] = useState("");
  const [notes, setNotes] = useState("");
  const [endShiftDialogOpen, setEndShiftDialogOpen] = useState(false);

  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const { data: todayStatus, isLoading } = useQuery<TodayStatus>({
    queryKey: ["/api/employee/today"],
    refetchInterval: 30000,
  });

  const shift = todayStatus?.shift;
  const breaks = todayStatus?.breaks || [];
  const activeBreak = todayStatus?.activeBreak;
  const isOnBreak = !!activeBreak;
  const hasSubmittedReport = todayStatus?.hasSubmittedReport || false;

  const totalBreakSeconds = useMemo(() => {
    return breaks.reduce((acc, b) => {
      if (b.endTime) return acc + differenceInSeconds(new Date(b.endTime), new Date(b.startTime));
      else if (b.startTime) return acc + differenceInSeconds(new Date(), new Date(b.startTime));
      return acc;
    }, 0);
  }, [breaks, currentTime]);

  const currentStart = activeTab === "morning" ? shift?.morningClockIn : shift?.eveningClockIn;
  const currentEnd = activeTab === "morning" ? shift?.morningClockOut : shift?.eveningClockOut;
  const isStarted = !!currentStart;
  const isEnded = !!currentEnd;
  const isActive = isStarted && !isEnded;

  const grossWorkedSeconds = useMemo(() => {
    if (!currentStart) return 0;
    const startTime = new Date(currentStart);
    const endTime = currentEnd ? new Date(currentEnd) : new Date();
    return differenceInSeconds(endTime, startTime);
  }, [currentStart, currentEnd, currentTime]);

  const netWorkedSeconds = useMemo(() => {
    const net = grossWorkedSeconds - totalBreakSeconds;
    return net > 0 ? net : 0;
  }, [grossWorkedSeconds, totalBreakSeconds]);

  const getShiftStatus = (): "idle" | "active" | "completed" => {
    if (isEnded) return "completed";
    if (isActive) return "active";
    return "idle";
  };

  const canEndShift = isActive && hasSubmittedReport && !isOnBreak;
  const needsReportToEnd = isActive && !hasSubmittedReport;

  const calculateProgress = () => {
    if (!currentStart) return 0;
    const targetSeconds = 8 * 60 * 60;
    return Math.min(Math.round((netWorkedSeconds / targetSeconds) * 100), 100);
  };

  const calculateEfficiency = () => {
    if (grossWorkedSeconds === 0) return 0;
    return Math.round((netWorkedSeconds / grossWorkedSeconds) * 100);
  };

  const handleMutation = async (promise: Promise<Response>, successMsg: string, onSuccess?: () => void) => {
    try {
      const res = await promise;
      if (!res.ok) { const error = await res.json(); throw new Error(error.error || error.message); }
      await res.json();
      queryClient.invalidateQueries({ queryKey: ["/api/employee/today"] });
      toast({ title: "Success", description: successMsg, className: "bg-emerald-50 border-emerald-200 text-emerald-800" });
      onSuccess?.();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const [isStartingShift, setIsStartingShift] = useState(false);
  const [isEndingShift, setIsEndingShift] = useState(false);
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [isStartingBreak, setIsStartingBreak] = useState(false);
  const [isEndingBreak, setIsEndingBreak] = useState(false);

  const startShift = async () => { setIsStartingShift(true); await handleMutation(apiRequest("POST", `/api/employee/shift/${activeTab}/start`), `${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} shift started`); setIsStartingShift(false); };
  const endShift = async () => { if (!hasSubmittedReport) { setReportDialogOpen(true); return; } setIsEndingShift(true); await handleMutation(apiRequest("POST", `/api/employee/shift/${activeTab}/end`), `${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} shift ended`, () => setEndShiftDialogOpen(false)); setIsEndingShift(false); };
  const startBreak = async () => { if (!selectedBreakType) { toast({ title: "Select Break Type", description: "Please select a break type first", variant: "destructive" }); return; } setIsStartingBreak(true); await handleMutation(apiRequest("POST", "/api/employee/break/start", { type: selectedBreakType }), `${selectedBreakType.charAt(0).toUpperCase() + selectedBreakType.slice(1)} break started`, () => setSelectedBreakType("")); setIsStartingBreak(false); };
  const endBreak = async () => { setIsEndingBreak(true); await handleMutation(apiRequest("POST", "/api/employee/break/end"), "Break ended"); setIsEndingBreak(false); };
  
  const submitReport = async () => {
    if (!reportContent.trim()) { toast({ title: "Report Required", description: "Please describe what you worked on today", variant: "destructive" }); return; }
    setIsSubmittingReport(true);
    const reportData = { shiftId: shift?.id, date: new Date().toISOString().split("T")[0], workDetails: reportContent.trim(), loomVideos: loomLinks.trim() || null, references: references.trim() || null, notes: notes.trim() || null, month: new Date().toISOString().slice(0, 7) };
    await handleMutation(apiRequest("POST", "/api/reports/daily", reportData), "Report submitted successfully", () => { setReportDialogOpen(false); setReportContent(""); setLoomLinks(""); setReferences(""); setNotes(""); queryClient.invalidateQueries({ queryKey: ["/api/employee/today"] }); });
    setIsSubmittingReport(false);
  };

  if (isLoading) {
    return (<div className="flex items-center justify-center h-full"><div className="flex flex-col items-center gap-4"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /><p className="text-sm text-slate-500">Loading your dashboard...</p></div></div>);
  }

  return (
    <ScrollArea className="h-full">
      <div className="relative z-10 p-6 space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-blue-500/25">
                {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
              </div>
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white dark:border-slate-900" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Welcome back, {user?.firstName}</h1>
              <p className="text-sm text-slate-500">{format(currentTime, "EEEE, MMMM do, yyyy")}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-3 px-4 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <Clock className="w-4 h-4 text-slate-400" />
              <span className="font-mono text-lg font-semibold text-slate-900 dark:text-white tabular-nums">{format(currentTime, "HH:mm:ss")}</span>
            </div>
            <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800/50">
              <button onClick={() => setActiveTab("morning")} className={cn("flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all", activeTab === "morning" ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm" : "text-slate-500 hover:text-slate-700")}><Sun className="w-4 h-4" />Morning</button>
              <button onClick={() => setActiveTab("evening")} className={cn("flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all", activeTab === "evening" ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm" : "text-slate-500 hover:text-slate-700")}><Moon className="w-4 h-4" />Evening</button>
            </div>
          </div>
        </div>

        {needsReportToEnd && (
          <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertTitle className="text-amber-800 dark:text-amber-400">Report Required</AlertTitle>
            <AlertDescription className="text-amber-700 dark:text-amber-500">You must submit a daily report before ending your shift.</AlertDescription>
          </Alert>
        )}

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Time Tracker */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white shadow-2xl">
              <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-500/20 rounded-full blur-3xl" />

              <CardContent className="relative z-10 p-8">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                  <div className="space-y-4">
                    <StatusPill status={getShiftStatus()} isOnBreak={isOnBreak} />
                    <div>
                      <p className="text-sm text-slate-400 font-medium">{isActive ? "Net Working Time" : isEnded ? "Total Net Time" : "Ready to Track"}</p>
                      <div className="text-5xl md:text-6xl font-bold tracking-tight">
                        {isActive ? <LiveDuration start={currentStart?.toString()} deductSeconds={totalBreakSeconds} /> : isEnded ? formatDuration(netWorkedSeconds) : "00:00:00"}
                      </div>
                    </div>
                    <div className="space-y-2 max-w-md">
                      <div className="flex justify-between text-xs text-slate-400"><span>Progress</span><span>{calculateProgress()}% of 8h target</span></div>
                      <div className="h-2 rounded-full bg-slate-700 overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-1000" style={{ width: `${calculateProgress()}%` }} />
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-center gap-4">
                    {!isStarted && (
                      <Button size="lg" className="h-24 w-24 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 hover:from-emerald-500 hover:to-emerald-700 shadow-lg shadow-emerald-500/30 border-4 border-emerald-400/30 transition-all hover:scale-105" onClick={startShift} disabled={isOnBreak || isStartingShift}>
                        {isStartingShift ? <Loader2 className="w-10 h-10 animate-spin" /> : <Play className="w-10 h-10 fill-white" />}
                      </Button>
                    )}
                    {isActive && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button size="lg" className={cn("h-24 w-24 rounded-full shadow-lg border-4 transition-all", canEndShift ? "bg-gradient-to-br from-red-400 to-red-600 hover:from-red-500 hover:to-red-700 shadow-red-500/30 border-red-400/30 hover:scale-105" : "bg-gradient-to-br from-slate-500 to-slate-600 border-slate-400/30 cursor-not-allowed")} onClick={() => { if (!hasSubmittedReport) setReportDialogOpen(true); else setEndShiftDialogOpen(true); }} disabled={isOnBreak || isEndingShift}>
                            {isEndingShift ? <Loader2 className="w-8 h-8 animate-spin" /> : hasSubmittedReport ? <Square className="w-8 h-8 fill-white" /> : <Lock className="w-8 h-8" />}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>{hasSubmittedReport ? "Click to end shift" : "Submit report to unlock"}</TooltipContent>
                      </Tooltip>
                    )}
                    {isEnded && (<div className="h-24 w-24 rounded-full bg-slate-700/50 flex items-center justify-center border-4 border-slate-600/30"><CheckCircle className="w-10 h-10 text-emerald-400" /></div>)}
                    <p className="text-xs text-slate-400 font-medium text-center">{!isStarted && "Tap to clock in"}{isActive && !hasSubmittedReport && "Submit report first"}{isActive && hasSubmittedReport && "Tap to clock out"}{isEnded && "Shift completed"}</p>
                  </div>
                </div>

                <Separator className="my-6 bg-slate-700" />

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div><p className="text-xs text-slate-400 flex items-center gap-1.5"><LogIn className="w-3 h-3" />Clock In</p><p className="text-lg font-semibold">{currentStart ? format(new Date(currentStart), "hh:mm a") : "--:--"}</p></div>
                  <div><p className="text-xs text-slate-400 flex items-center gap-1.5"><LogOut className="w-3 h-3" />Clock Out</p><p className="text-lg font-semibold">{currentEnd ? format(new Date(currentEnd), "hh:mm a") : "--:--"}</p></div>
                  <div><p className="text-xs text-slate-400 flex items-center gap-1.5"><Coffee className="w-3 h-3" />Break Time</p><p className="text-lg font-semibold">{formatDurationShort(totalBreakSeconds)}</p></div>
                  <div><p className="text-xs text-slate-400 flex items-center gap-1.5"><FileText className="w-3 h-3" />Report</p><p className="text-lg font-semibold flex items-center gap-2">{hasSubmittedReport ? <><CheckCircle className="w-4 h-4 text-emerald-400" /><span className="text-emerald-400">Done</span></> : <><AlertCircle className="w-4 h-4 text-amber-400" /><span className="text-amber-400">Pending</span></>}</p></div>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="p-4"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30"><TargetIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" /></div><div><p className="text-xs text-slate-500">Target</p><p className="text-lg font-bold">8h</p></div></div></Card>
              <Card className="p-4"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30"><Zap className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /></div><div><p className="text-xs text-slate-500">Efficiency</p><p className="text-lg font-bold">{isStarted ? `${calculateEfficiency()}%` : "--"}</p></div></div></Card>
              <Card className="p-4"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30"><Coffee className="w-4 h-4 text-orange-600 dark:text-orange-400" /></div><div><p className="text-xs text-slate-500">Breaks</p><p className="text-lg font-bold">{(todayStatus?.breakCounts?.prayer || 0) + (todayStatus?.breakCounts?.meal || 0) + (todayStatus?.breakCounts?.urgent || 0)}/6</p></div></div></Card>
              <Card className="p-4"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30"><Activity className="w-4 h-4 text-purple-600 dark:text-purple-400" /></div><div><p className="text-xs text-slate-500">Gross Time</p><p className="text-lg font-bold">{isStarted ? formatDurationShort(grossWorkedSeconds) : "--"}</p></div></div></Card>
            </div>

            {isActive && !hasSubmittedReport && (
              <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2"><div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/50"><FileText className="w-4 h-4 text-amber-600 dark:text-amber-400" /></div><div><CardTitle className="text-base">Daily Report Required</CardTitle><p className="text-xs text-slate-500 mt-0.5">Submit your report to unlock shift ending</p></div></div>
                    <Button onClick={() => setReportDialogOpen(true)} className="gap-2"><FileCheck className="w-4 h-4" />Submit Report</Button>
                  </div>
                </CardHeader>
              </Card>
            )}

            {hasSubmittedReport && isActive && (
              <Card className="border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-emerald-100 dark:bg-emerald-900/50"><CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" /></div>
                    <div className="flex-1"><p className="font-medium text-emerald-800 dark:text-emerald-400">Report Submitted</p><p className="text-xs text-emerald-600 dark:text-emerald-500">You can now end your shift when ready</p></div>
                    <Badge className="bg-emerald-500"><Unlock className="w-3 h-3 mr-1" />Unlocked</Badge>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Break Management */}
          <div className="flex flex-col gap-6 lg:h-full">
            <Card className="border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl overflow-hidden">
              <CardHeader className="pb-3 bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/30 border-b border-orange-100 dark:border-orange-900/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2"><div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/50"><Coffee className="w-4 h-4 text-orange-600 dark:text-orange-400" /></div><div><CardTitle className="text-base">Break Control</CardTitle><p className="text-xs text-slate-500 mt-0.5">{isOnBreak ? "Break in progress" : "Manage your breaks"}</p></div></div>
                  {isOnBreak && <Badge className="bg-orange-500 text-white animate-pulse">Active</Badge>}
                </div>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                {isOnBreak ? (
                  <div className="space-y-4">
                    <div className="text-center p-6 rounded-xl bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/30 border border-orange-200 dark:border-orange-800">
                      <div className="text-4xl font-bold text-orange-600 dark:text-orange-400 mb-2"><LiveDuration start={activeBreak?.startTime?.toString()} /></div>
                      <p className="text-sm text-slate-600 dark:text-slate-400 capitalize">{activeBreak?.type} Break</p>
                    </div>
                    <Button className="w-full bg-orange-600 hover:bg-orange-700" onClick={endBreak} disabled={isEndingBreak}>
                      {isEndingBreak ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Pause className="w-4 h-4 mr-2" />}End Break
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid gap-3">
                      <BreakTypeCard type="Prayer" icon={Timer} used={todayStatus?.breakCounts?.prayer || 0} max={3} isActive={selectedBreakType === "prayer"} onSelect={() => setSelectedBreakType("prayer")} disabled={!isActive} />
                      <BreakTypeCard type="Meal" icon={Utensils} used={todayStatus?.breakCounts?.meal || 0} max={1} isActive={selectedBreakType === "meal"} onSelect={() => setSelectedBreakType("meal")} disabled={!isActive} />
                      <BreakTypeCard type="Urgent" icon={Zap} used={todayStatus?.breakCounts?.urgent || 0} max={2} isActive={selectedBreakType === "urgent"} onSelect={() => setSelectedBreakType("urgent")} disabled={!isActive} />
                    </div>
                    <Button className="w-full" disabled={!selectedBreakType || !isActive || isStartingBreak} onClick={startBreak}>
                      {isStartingBreak ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Pause className="w-4 h-4 mr-2" />}Start Break
                    </Button>
                    {!isActive && <p className="text-xs text-center text-slate-400">Start your shift to take breaks</p>}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl flex-1 flex flex-col min-h-[250px]">
              <CardHeader className="pb-3"><div className="flex items-center gap-2"><div className="p-2 rounded-lg bg-cyan-100 dark:bg-cyan-900/30"><Activity className="w-4 h-4 text-cyan-600 dark:text-cyan-400" /></div><CardTitle className="text-base">Today's Activity</CardTitle></div></CardHeader>
              <CardContent className="p-0 flex-1 overflow-hidden">
                <ScrollArea className="h-full">
                  <div className="p-4 space-y-3">
                    {currentStart && (<div className="flex items-start gap-3"><div className="mt-0.5 p-1.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30"><LogIn className="w-3 h-3 text-emerald-600 dark:text-emerald-400" /></div><div className="flex-1"><p className="text-sm font-medium text-slate-700 dark:text-slate-300">Clocked In</p><p className="text-xs text-slate-400">{format(new Date(currentStart), "hh:mm a")}</p></div></div>)}
                    {breaks.map((brk, i) => (<div key={i} className="flex items-start gap-3"><div className="mt-0.5 p-1.5 rounded-full bg-orange-100 dark:bg-orange-900/30"><Coffee className="w-3 h-3 text-orange-600 dark:text-orange-400" /></div><div className="flex-1"><p className="text-sm font-medium text-slate-700 dark:text-slate-300 capitalize">{brk.type} Break</p><p className="text-xs text-slate-400">{format(new Date(brk.startTime), "hh:mm a")}{brk.endTime && ` - ${format(new Date(brk.endTime), "hh:mm a")}`}{brk.durationMinutes && ` (${brk.durationMinutes}m)`}</p></div></div>))}
                    {hasSubmittedReport && (<div className="flex items-start gap-3"><div className="mt-0.5 p-1.5 rounded-full bg-purple-100 dark:bg-purple-900/30"><FileText className="w-3 h-3 text-purple-600 dark:text-purple-400" /></div><div className="flex-1"><p className="text-sm font-medium text-slate-700 dark:text-slate-300">Report Submitted</p><p className="text-xs text-slate-400">Today</p></div></div>)}
                    {currentEnd && (<div className="flex items-start gap-3"><div className="mt-0.5 p-1.5 rounded-full bg-blue-100 dark:bg-blue-900/30"><LogOut className="w-3 h-3 text-blue-600 dark:text-blue-400" /></div><div className="flex-1"><p className="text-sm font-medium text-slate-700 dark:text-slate-300">Clocked Out</p><p className="text-xs text-slate-400">{format(new Date(currentEnd), "hh:mm a")}</p></div></div>)}
                    {!currentStart && breaks.length === 0 && (<div className="text-center py-8"><Circle className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600 mb-2" /><p className="text-sm text-slate-400">No activity yet</p><p className="text-xs text-slate-400 mt-1">Start your shift to begin tracking</p></div>)}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Business Development Board */}
        {user?.department === "Business Development" && <BusinessDevelopmentBoard />}

        {/* Report Dialog */}
        <Dialog open={reportDialogOpen} onOpenChange={setReportDialogOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2"><FileText className="w-5 h-5 text-blue-500" />Submit Daily Report</DialogTitle>
              <DialogDescription>Summarize your work for today. This is required before ending your shift.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2"><label className="text-sm font-medium">Work Details <span className="text-red-500">*</span></label><Textarea placeholder="What did you work on today? Describe your tasks, progress, and achievements..." className="min-h-[120px] resize-none" value={reportContent} onChange={(e) => setReportContent(e.target.value)} /></div>
              <div className="space-y-2"><label className="text-sm font-medium">Loom Video Links</label><Input placeholder="https://loom.com/share/..." value={loomLinks} onChange={(e) => setLoomLinks(e.target.value)} /><p className="text-xs text-slate-500">Add links to any screen recordings or video updates</p></div>
              <div className="space-y-2"><label className="text-sm font-medium">References</label><Input placeholder="Links to PRs, docs, designs, etc." value={references} onChange={(e) => setReferences(e.target.value)} /></div>
              <div className="space-y-2"><label className="text-sm font-medium">Additional Notes</label><Textarea placeholder="Any blockers, questions, or notes for tomorrow..." className="min-h-[80px] resize-none" value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setReportDialogOpen(false)}>Cancel</Button>
              <Button onClick={submitReport} disabled={!reportContent.trim() || isSubmittingReport} className="gap-2">{isSubmittingReport ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}Submit Report</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* End Shift Dialog */}
        <Dialog open={endShiftDialogOpen} onOpenChange={setEndShiftDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2"><LogOut className="w-5 h-5 text-red-500" />End Shift</DialogTitle>
              <DialogDescription>Are you sure you want to end your {activeTab} shift? This action cannot be undone.</DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-900 space-y-2">
                <div className="flex justify-between text-sm"><span className="text-slate-500">Clock In</span><span className="font-medium">{currentStart ? format(new Date(currentStart), "hh:mm a") : "--:--"}</span></div>
                <div className="flex justify-between text-sm"><span className="text-slate-500">Gross Time</span><span className="font-medium">{formatDurationShort(grossWorkedSeconds)}</span></div>
                <div className="flex justify-between text-sm"><span className="text-slate-500">Break Time</span><span className="font-medium">{formatDurationShort(totalBreakSeconds)}</span></div>
                <Separator />
                <div className="flex justify-between text-sm"><span className="text-slate-500 font-medium">Net Working Time</span><span className="font-bold text-emerald-600">{formatDurationShort(netWorkedSeconds)}</span></div>
                <div className="flex justify-between text-sm"><span className="text-slate-500">Report Status</span><span className="font-medium text-emerald-600 flex items-center gap-1"><CheckCircle className="w-3 h-3" />Submitted</span></div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEndShiftDialogOpen(false)}>Cancel</Button>
              <Button variant="destructive" onClick={endShift} disabled={isEndingShift} className="gap-2">{isEndingShift ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}End Shift</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </ScrollArea>
  );
}