// client/src/pages/admin/targets.tsx

import React, { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format, startOfMonth, endOfMonth, parseISO } from "date-fns";
import {
  Target,
  Users,
  TrendingUp,
  Zap,
  CheckCircle,
  Circle,
  Clock,
  Search,
  RefreshCw,
  Filter,
  Calendar,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  MoreHorizontal,
  Check,
  X,
  Eye,
  Star,
  Award,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  Building2,
  User,
  FileText,
  DollarSign,
  AlertCircle,
  Loader2,
  Download,
  ChevronLeft,
  ChevronUp,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import type { SafeUser, TargetItem, Target as TargetType } from "@shared/schema";

// === TYPES ===
interface EmployeeTargetData {
  employee: SafeUser;
  target: TargetType | null;
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

interface TargetsSummaryResponse {
  employees: EmployeeTargetData[];
  totals: {
    totalMeetings: number;
    verifiedMeetings: number;
    totalOrders: number;
    verifiedOrders: number;
    totalEmployees: number;
  };
}

// === CONSTANTS ===
const SOURCES = [
  "FB Yousaf", "FB Abdullah", "FB Get Ai",
  "Insta Yousaf", "Insta Getai",
  "Linkedin Yousaf", "Linkedin Abdullah", "Linkedin Get Ai",
  "Discovery", "Top Upwork", "New Upwork", "Fiver Top"
];

const CLIENT_TYPES = ["B2B", "B2C"];

// === HELPERS ===
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
    "bg-indigo-500",
    "bg-pink-500",
  ];
  return colors[(name?.charCodeAt(0) || 0) % colors.length];
}

function getSourceIcon(source: string | null) {
  if (!source) return <Target className="w-3 h-3" />;
  if (source.includes("Upwork") || source.includes("Fiver")) return <Zap className="w-3 h-3" />;
  if (source.includes("Linkedin")) return <Users className="w-3 h-3" />;
  if (source.includes("FB") || source.includes("Insta")) return <Star className="w-3 h-3" />;
  return <Target className="w-3 h-3" />;
}

// === ANIMATED COUNTER ===
function AnimatedCounter({ value, suffix = "" }: { value: number; suffix?: string }) {
  const [displayValue, setDisplayValue] = useState(0);

  React.useEffect(() => {
    const duration = 800;
    const steps = 20;
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

// === STAT CARD ===
function StatCard({
  icon: Icon,
  label,
  value,
  subValue,
  trend,
  color = "blue",
  onClick,
  active,
}: {
  icon: any;
  label: string;
  value: number | string;
  subValue?: string;
  trend?: { value: number; isPositive: boolean };
  color?: "blue" | "emerald" | "purple" | "amber" | "rose";
  onClick?: () => void;
  active?: boolean;
}) {
  const colorClasses = {
    blue: "bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400",
    emerald: "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400",
    purple: "bg-purple-50 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400",
    amber: "bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400",
    rose: "bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400",
  };

  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className={cn(
        "relative p-5 rounded-xl border transition-all text-left w-full",
        "bg-white dark:bg-slate-900",
        active
          ? "border-slate-900 dark:border-white ring-2 ring-slate-900/10 dark:ring-white/10"
          : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700",
        onClick && "cursor-pointer hover:shadow-md"
      )}
    >
      <div className="flex items-start justify-between">
        <div className={cn("p-2.5 rounded-xl", colorClasses[color])}>
          <Icon className="w-5 h-5" />
        </div>
        {trend && (
          <div className={cn(
            "flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full",
            trend.isPositive
              ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400"
              : "bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400"
          )}>
            {trend.isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {trend.value}%
          </div>
        )}
      </div>
      <div className="mt-4">
        <p className="text-3xl font-bold text-slate-900 dark:text-white">
          {typeof value === "number" ? <AnimatedCounter value={value} /> : value}
        </p>
        <p className="text-sm text-slate-500 mt-1">{label}</p>
        {subValue && <p className="text-xs text-slate-400 mt-0.5">{subValue}</p>}
      </div>
    </button>
  );
}

// === ENTRY CARD FOR ADMIN ===
function AdminEntryCard({
  entry,
  type,
  employeeName,
  onVerify,
  onReject,
  isVerifying,
}: {
  entry: TargetItem;
  type: "meeting" | "order";
  employeeName: string;
  onVerify: () => void;
  onReject: () => void;
  isVerifying: boolean;
}) {
  const [detailsOpen, setDetailsOpen] = useState(false);

  return (
    <>
      <div
        className={cn(
          "group relative overflow-hidden rounded-xl border transition-all duration-300",
          "bg-white dark:bg-slate-900",
          entry.verified
            ? "border-emerald-200 dark:border-emerald-800"
            : "border-slate-200 dark:border-slate-800",
          "hover:shadow-lg hover:shadow-slate-200/50 dark:hover:shadow-slate-900/50"
        )}
      >
        {/* Top accent bar */}
        <div className={cn(
          "absolute top-0 left-0 right-0 h-1",
          type === "meeting"
            ? "bg-gradient-to-r from-blue-400 via-blue-500 to-indigo-500"
            : "bg-gradient-to-r from-emerald-400 via-emerald-500 to-teal-500"
        )} />

        {/* Verified badge */}
        {entry.verified && (
          <div className="absolute top-3 right-3 z-10">
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="p-1.5 rounded-full shadow-lg bg-gradient-to-br from-emerald-400 to-emerald-600 text-white">
                  <CheckCircle className="w-3.5 h-3.5" />
                </div>
              </TooltipTrigger>
              <TooltipContent side="left">
                <p>Verified</p>
              </TooltipContent>
            </Tooltip>
          </div>
        )}

        <div className="p-4 pt-5">
          {/* Header */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-slate-900 dark:text-white truncate text-base mb-1">
                {entry.name}
              </h4>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <User className="w-3 h-3" />
                <span>{employeeName}</span>
                <span className="text-slate-300 dark:text-slate-600">•</span>
                <Calendar className="w-3 h-3" />
                <span>{entry.date ? format(new Date(entry.date), "MMM dd, yyyy") : "No date"}</span>
              </div>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => setDetailsOpen(true)}>
                  <Eye className="w-4 h-4 mr-2" />
                  View Details
                </DropdownMenuItem>
                {entry.contactLink && (
                  <DropdownMenuItem onClick={() => window.open(entry.contactLink!, '_blank')}>
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Open GHL Link
                  </DropdownMenuItem>
                )}
                {!entry.verified && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={onVerify} className="text-emerald-600">
                      <Check className="w-4 h-4 mr-2" />
                      Verify Entry
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={onReject} className="text-rose-600">
                      <X className="w-4 h-4 mr-2" />
                      Reject Entry
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Tags */}
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <Badge
              variant="secondary"
              className={cn(
                "text-xs font-medium gap-1",
                type === "meeting"
                  ? "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                  : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
              )}
            >
              {type === "meeting" ? <TrendingUp className="w-3 h-3" /> : <DollarSign className="w-3 h-3" />}
              {type === "meeting" ? "Meeting" : "Order"}
            </Badge>

            {entry.source && (
              <Badge variant="outline" className="text-xs font-medium gap-1">
                {getSourceIcon(entry.source)}
                {entry.source}
              </Badge>
            )}

            {(entry as any).clientType && (
              <Badge
                variant="outline"
                className={cn(
                  "text-xs font-medium",
                  (entry as any).clientType === "B2B"
                    ? "border-purple-200 text-purple-700 bg-purple-50 dark:border-purple-800 dark:text-purple-300 dark:bg-purple-950/50"
                    : "border-amber-200 text-amber-700 bg-amber-50 dark:border-amber-800 dark:text-amber-300 dark:bg-amber-950/50"
                )}
              >
                {(entry as any).clientType}
              </Badge>
            )}

            {!entry.verified && (
              <Badge
                variant="outline"
                className="text-xs font-medium border-orange-200 text-orange-600 bg-orange-50 dark:border-orange-800 dark:text-orange-400 dark:bg-orange-950/50"
              >
                <Clock className="w-3 h-3 mr-1" />
                Pending Review
              </Badge>
            )}
          </div>

          {/* Actions for unverified */}
          {!entry.verified && (
            <div className="flex items-center gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <Button
                size="sm"
                variant="outline"
                className="flex-1 text-emerald-600 border-emerald-200 hover:bg-emerald-50 hover:border-emerald-300 dark:border-emerald-800 dark:hover:bg-emerald-950/50"
                onClick={onVerify}
                disabled={isVerifying}
              >
                {isVerifying ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Check className="w-4 h-4 mr-2" />
                )}
                Verify
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="flex-1 text-rose-600 border-rose-200 hover:bg-rose-50 hover:border-rose-300 dark:border-rose-800 dark:hover:bg-rose-950/50"
                onClick={onReject}
                disabled={isVerifying}
              >
                <X className="w-4 h-4 mr-2" />
                Reject
              </Button>
            </div>
          )}

          {/* GHL Link */}
          {entry.contactLink && (
            <div className={cn("pt-3", !entry.verified && "border-t-0 pt-2")}>
              <a
                href={entry.contactLink}
                target="_blank"
                rel="noreferrer"
                className={cn(
                  "text-xs font-medium flex items-center gap-1.5 transition-colors",
                  type === "meeting"
                    ? "text-blue-600 hover:text-blue-700"
                    : "text-emerald-600 hover:text-emerald-700"
                )}
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Open GHL Contact
                <ArrowUpRight className="w-3 h-3" />
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {type === "meeting" ? (
                <TrendingUp className="w-5 h-5 text-blue-500" />
              ) : (
                <DollarSign className="w-5 h-5 text-emerald-500" />
              )}
              {type === "meeting" ? "Meeting" : "Order"} Details
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-slate-500 mb-1">Client Name</p>
                <p className="font-medium text-slate-900 dark:text-white">{entry.name}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">Employee</p>
                <p className="font-medium text-slate-900 dark:text-white">{employeeName}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">Date</p>
                <p className="font-medium text-slate-900 dark:text-white">
                  {entry.date ? format(new Date(entry.date), "MMMM dd, yyyy") : "N/A"}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">Source</p>
                <p className="font-medium text-slate-900 dark:text-white">{entry.source || "N/A"}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">Client Type</p>
                <p className="font-medium text-slate-900 dark:text-white">{(entry as any).clientType || "N/A"}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">Status</p>
                <Badge className={entry.verified ? "bg-emerald-500" : "bg-amber-500"}>
                  {entry.verified ? "Verified" : "Pending"}
                </Badge>
              </div>
            </div>
            {entry.contactLink && (
              <div>
                <p className="text-xs text-slate-500 mb-1">GHL Contact Link</p>
                <a
                  href={entry.contactLink}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                >
                  {entry.contactLink}
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// === EMPLOYEE SECTION ===
function EmployeeSection({
  data,
  isExpanded,
  onToggle,
  onVerify,
  onReject,
  verifyingId,
  filters,
}: {
  data: EmployeeTargetData;
  isExpanded: boolean;
  onToggle: () => void;
  onVerify: (itemId: string) => void;
  onReject: (itemId: string) => void;
  verifyingId: string | null;
  filters: {
    type: string;
    status: string;
    source: string;
    clientType: string;
    dateFrom: Date | null;
    dateTo: Date | null;
  };
}) {
  const { employee, target, meetings, orders } = data;

  const meetingsTarget = target?.meetingTarget || 20;
  const ordersTarget = target?.orderTarget || 5;
  const meetingsProgress = meetingsTarget > 0 ? (meetings.total / meetingsTarget) * 100 : 0;
  const ordersProgress = ordersTarget > 0 ? (orders.total / ordersTarget) * 100 : 0;

  // Filter entries
  const filteredMeetings = useMemo(() => {
    return meetings.items.filter((item) => {
      if (filters.type !== "all" && filters.type !== "meeting") return false;
      if (filters.status === "verified" && !item.verified) return false;
      if (filters.status === "pending" && item.verified) return false;
      if (filters.source !== "all" && item.source !== filters.source) return false;
      if (filters.clientType !== "all" && (item as any).clientType !== filters.clientType) return false;
      if (filters.dateFrom && item.date && new Date(item.date) < filters.dateFrom) return false;
      if (filters.dateTo && item.date && new Date(item.date) > filters.dateTo) return false;
      return true;
    });
  }, [meetings.items, filters]);

  const filteredOrders = useMemo(() => {
    return orders.items.filter((item) => {
      if (filters.type !== "all" && filters.type !== "order") return false;
      if (filters.status === "verified" && !item.verified) return false;
      if (filters.status === "pending" && item.verified) return false;
      if (filters.source !== "all" && item.source !== filters.source) return false;
      if (filters.clientType !== "all" && (item as any).clientType !== filters.clientType) return false;
      if (filters.dateFrom && item.date && new Date(item.date) < filters.dateFrom) return false;
      if (filters.dateTo && item.date && new Date(item.date) > filters.dateTo) return false;
      return true;
    });
  }, [orders.items, filters]);

  const totalFilteredItems = filteredMeetings.length + filteredOrders.length;
  const pendingCount = [...filteredMeetings, ...filteredOrders].filter(i => !i.verified).length;

  if (totalFilteredItems === 0 && (filters.type !== "all" || filters.status !== "all" || filters.source !== "all" || filters.clientType !== "all" || filters.dateFrom || filters.dateTo)) {
    return null;
  }

  const employeeName = `${employee.firstName} ${employee.lastName}`;

  return (
    <Collapsible open={isExpanded} onOpenChange={onToggle} className="mb-4">
      <CollapsibleTrigger className="w-full">
        <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-all">
          <div className="flex items-center gap-4">
            <Avatar className="h-11 w-11 ring-2 ring-offset-2 ring-slate-100 dark:ring-slate-800">
              <AvatarFallback className={cn("text-white font-semibold", getAvatarColor(employee.firstName))}>
                {getInitials(employee.firstName, employee.lastName)}
              </AvatarFallback>
            </Avatar>
            <div className="text-left">
              <h3 className="font-semibold text-slate-900 dark:text-white">{employeeName}</h3>
              <p className="text-sm text-slate-500">{employee.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            {/* Stats */}
            <div className="hidden sm:flex items-center gap-4">
              <div className="text-right">
                <p className="text-xs text-slate-500">Meetings</p>
                <p className="font-semibold text-blue-600">
                  {meetings.total}/{meetingsTarget}
                </p>
              </div>
              <div className="w-24 hidden md:block">
                <Progress value={Math.min(meetingsProgress, 100)} className="h-2" />
              </div>
            </div>

            <div className="hidden sm:flex items-center gap-4">
              <div className="text-right">
                <p className="text-xs text-slate-500">Orders</p>
                <p className="font-semibold text-emerald-600">
                  {orders.total}/{ordersTarget}
                </p>
              </div>
              <div className="w-24 hidden md:block">
                <Progress value={Math.min(ordersProgress, 100)} className="h-2 [&>div]:bg-emerald-500" />
              </div>
            </div>

            {pendingCount > 0 && (
              <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400">
                {pendingCount} pending
              </Badge>
            )}

            {isExpanded ? (
              <ChevronUp className="w-5 h-5 text-slate-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-slate-400" />
            )}
          </div>
        </div>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="mt-3 space-y-4 pl-4 border-l-2 border-slate-200 dark:border-slate-800 ml-5">
          {/* Meetings */}
          {(filters.type === "all" || filters.type === "meeting") && filteredMeetings.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-500" />
                Meetings ({filteredMeetings.length})
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredMeetings.map((meeting) => (
                  <AdminEntryCard
                    key={meeting.id}
                    entry={meeting}
                    type="meeting"
                    employeeName={employeeName}
                    onVerify={() => onVerify(meeting.id)}
                    onReject={() => onReject(meeting.id)}
                    isVerifying={verifyingId === meeting.id}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Orders */}
          {(filters.type === "all" || filters.type === "order") && filteredOrders.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-500" />
                Orders ({filteredOrders.length})
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredOrders.map((order) => (
                  <AdminEntryCard
                    key={order.id}
                    entry={order}
                    type="order"
                    employeeName={employeeName}
                    onVerify={() => onVerify(order.id)}
                    onReject={() => onReject(order.id)}
                    isVerifying={verifyingId === order.id}
                  />
                ))}
              </div>
            </div>
          )}

          {totalFilteredItems === 0 && (
            <div className="text-center py-8 text-slate-500">
              <Circle className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              <p>No entries found</p>
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

// === MAIN COMPONENT ===
export default function AdminTargetBoard() {
  const { toast } = useToast();

  // State
  const [selectedMonth, setSelectedMonth] = useState(() => format(new Date(), "yyyy-MM"));
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [clientTypeFilter, setClientTypeFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState<Date | null>(null);
  const [dateTo, setDateTo] = useState<Date | null>(null);
  const [expandedEmployees, setExpandedEmployees] = useState<Set<string>>(new Set());
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<"all" | "pending" | "verified">("all");

  // Generate month options (last 12 months)
  const monthOptions = useMemo(() => {
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
  }, []);

  // Fetch data
  const { data, isLoading, refetch } = useQuery<TargetsSummaryResponse>({
    queryKey: ["/api/admin/targets/summary", selectedMonth],
    queryFn: async () => {
      const res = await fetch(`/api/admin/targets/summary?month=${selectedMonth}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch targets");
      return res.json();
    },
    refetchInterval: 60000, // Refresh every minute
  });

  // Verify mutation
  const verifyMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const res = await apiRequest("PATCH", `/api/admin/targets/items/${itemId}/verify`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/targets/summary"] });
      toast({ title: "Success", description: "Entry verified successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Reject mutation
  const rejectMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const res = await apiRequest("DELETE", `/api/admin/targets/items/${itemId}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/targets/summary"] });
      toast({ title: "Success", description: "Entry rejected and removed" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleVerify = async (itemId: string) => {
    setVerifyingId(itemId);
    await verifyMutation.mutateAsync(itemId);
    setVerifyingId(null);
  };

  const handleReject = async (itemId: string) => {
    if (window.confirm("Are you sure you want to reject and delete this entry?")) {
      setVerifyingId(itemId);
      await rejectMutation.mutateAsync(itemId);
      setVerifyingId(null);
    }
  };

  // Filter employees
  const filteredEmployees = useMemo(() => {
    if (!data?.employees) return [];

    return data.employees.filter((emp) => {
      if (searchQuery) {
        const fullName = `${emp.employee.firstName} ${emp.employee.lastName}`.toLowerCase();
        if (!fullName.includes(searchQuery.toLowerCase())) return false;
      }
      return true;
    });
  }, [data?.employees, searchQuery]);

  // Toggle employee expansion
  const toggleEmployee = (employeeId: string) => {
    const newExpanded = new Set(expandedEmployees);
    if (newExpanded.has(employeeId)) {
      newExpanded.delete(employeeId);
    } else {
      newExpanded.add(employeeId);
    }
    setExpandedEmployees(newExpanded);
  };

  // Stats
  const stats = useMemo(() => {
    if (!data?.totals) {
      return {
        totalMeetings: 0,
        verifiedMeetings: 0,
        pendingMeetings: 0,
        totalOrders: 0,
        verifiedOrders: 0,
        pendingOrders: 0,
        totalEmployees: 0,
      };
    }
    return {
      ...data.totals,
      pendingMeetings: data.totals.totalMeetings - data.totals.verifiedMeetings,
      pendingOrders: data.totals.totalOrders - data.totals.verifiedOrders,
    };
  }, [data]);

  const filters = {
    type: typeFilter,
    status: activeView === "pending" ? "pending" : activeView === "verified" ? "verified" : statusFilter,
    source: sourceFilter,
    clientType: clientTypeFilter,
    dateFrom,
    dateTo,
  };

  const clearFilters = () => {
    setTypeFilter("all");
    setStatusFilter("all");
    setSourceFilter("all");
    setClientTypeFilter("all");
    setDateFrom(null);
    setDateTo(null);
    setActiveView("all");
  };

  const hasActiveFilters = typeFilter !== "all" || statusFilter !== "all" || sourceFilter !== "all" || clientTypeFilter !== "all" || dateFrom || dateTo || activeView !== "all";

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
          <p className="text-sm text-slate-500">Loading target board...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <div className="shrink-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        {/* Top Header */}
        <div className="px-6 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-lg shadow-blue-500/25">
                <Target className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                  Target Board
                </h1>
                <p className="text-sm text-slate-500">
                  Business Development Performance Tracking
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Month Selector */}
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="w-[180px] bg-slate-50 dark:bg-slate-800">
                  <Calendar className="w-4 h-4 mr-2 text-slate-400" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {monthOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Badge variant="outline" className="gap-1.5 py-1.5 px-3">
                <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                Live Data
              </Badge>

              <Button variant="outline" size="sm" onClick={() => refetch()}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="px-6 pb-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <StatCard
              icon={Users}
              label="BD Employees"
              value={stats.totalEmployees}
              color="purple"
            />
            <StatCard
              icon={TrendingUp}
              label="Total Meetings"
              value={stats.totalMeetings}
              subValue={`${stats.verifiedMeetings} verified`}
              color="blue"
              onClick={() => { setActiveView("all"); setTypeFilter("meeting"); }}
              active={typeFilter === "meeting"}
            />
            <StatCard
              icon={DollarSign}
              label="Total Orders"
              value={stats.totalOrders}
              subValue={`${stats.verifiedOrders} verified`}
              color="emerald"
              onClick={() => { setActiveView("all"); setTypeFilter("order"); }}
              active={typeFilter === "order"}
            />
            <StatCard
              icon={CheckCircle}
              label="Verified"
              value={stats.verifiedMeetings + stats.verifiedOrders}
              color="emerald"
              onClick={() => setActiveView("verified")}
              active={activeView === "verified"}
            />
            <StatCard
              icon={Clock}
              label="Pending Review"
              value={stats.pendingMeetings + stats.pendingOrders}
              color="amber"
              onClick={() => setActiveView("pending")}
              active={activeView === "pending"}
            />
            <StatCard
              icon={BarChart3}
              label="Verification Rate"
              value={`${stats.totalMeetings + stats.totalOrders > 0 
                ? Math.round(((stats.verifiedMeetings + stats.verifiedOrders) / (stats.totalMeetings + stats.totalOrders)) * 100) 
                : 0}%`}
              color="purple"
            />
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="shrink-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search employees..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-slate-50 dark:bg-slate-800"
            />
          </div>

          {/* Type Filter */}
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[140px] bg-slate-50 dark:bg-slate-800">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="meeting">Meetings</SelectItem>
              <SelectItem value="order">Orders</SelectItem>
            </SelectContent>
          </Select>

          {/* Status Filter */}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px] bg-slate-50 dark:bg-slate-800">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="verified">Verified</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
            </SelectContent>
          </Select>

          {/* Source Filter */}
          <Select value={sourceFilter} onValueChange={setSourceFilter}>
            <SelectTrigger className="w-[160px] bg-slate-50 dark:bg-slate-800">
              <SelectValue placeholder="Source" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sources</SelectItem>
              {SOURCES.map((source) => (
                <SelectItem key={source} value={source}>{source}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Client Type Filter */}
          <Select value={clientTypeFilter} onValueChange={setClientTypeFilter}>
            <SelectTrigger className="w-[130px] bg-slate-50 dark:bg-slate-800">
              <SelectValue placeholder="Client Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Clients</SelectItem>
              <SelectItem value="B2B">B2B</SelectItem>
              <SelectItem value="B2C">B2C</SelectItem>
            </SelectContent>
          </Select>

          {/* Date Range */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Calendar className="w-4 h-4" />
                {dateFrom || dateTo ? (
                  <span>
                    {dateFrom ? format(dateFrom, "MMM d") : "Start"} - {dateTo ? format(dateTo, "MMM d") : "End"}
                  </span>
                ) : (
                  "Date Range"
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <div className="flex">
                <div className="p-3 border-r">
                  <p className="text-xs font-medium text-slate-500 mb-2">From</p>
                  <CalendarComponent
                    mode="single"
                    selected={dateFrom || undefined}
                    onSelect={(date) => setDateFrom(date || null)}
                    initialFocus
                  />
                </div>
                <div className="p-3">
                  <p className="text-xs font-medium text-slate-500 mb-2">To</p>
                  <CalendarComponent
                    mode="single"
                    selected={dateTo || undefined}
                    onSelect={(date) => setDateTo(date || null)}
                  />
                </div>
              </div>
              <div className="p-3 border-t flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => { setDateFrom(null); setDateTo(null); }}>
                  Clear
                </Button>
              </div>
            </PopoverContent>
          </Popover>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="text-slate-500">
              <X className="w-4 h-4 mr-1" />
              Clear filters
            </Button>
          )}

          {/* Quick Actions */}
          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpandedEmployees(new Set(filteredEmployees.map((e) => e.employee.id)))}
            >
              Expand All
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpandedEmployees(new Set())}
            >
              Collapse All
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <ScrollArea className="flex-1">
        <div className="p-6">
          {filteredEmployees.length > 0 ? (
            filteredEmployees.map((empData) => (
              <EmployeeSection
                key={empData.employee.id}
                data={empData}
                isExpanded={expandedEmployees.has(empData.employee.id)}
                onToggle={() => toggleEmployee(empData.employee.id)}
                onVerify={handleVerify}
                onReject={handleReject}
                verifyingId={verifyingId}
                filters={filters}
              />
            ))
          ) : (
            <div className="text-center py-16">
              <Target className="h-12 w-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-1">
                No employees found
              </h3>
              <p className="text-sm text-slate-500">
                {searchQuery
                  ? "Try adjusting your search query"
                  : "No Business Development employees have targets for this month"}
              </p>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="shrink-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 px-6 py-2">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>
            {filteredEmployees.length} employees • {stats.totalMeetings + stats.totalOrders} total entries
          </span>
          <span>Auto-refreshes every minute</span>
        </div>
      </div>
    </div>
  );
}