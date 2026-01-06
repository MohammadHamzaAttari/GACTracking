// client/src/pages/notifications.tsx

import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, isToday, isYesterday, subDays, startOfDay, endOfDay, isWithinInterval, parseISO } from "date-fns";
import {
  Bell,
  Clock,
  CheckCircle,
  MessageSquare,
  AlertTriangle,
  Zap,
  Filter,
  Search,
  RefreshCw,
  MoreVertical,
  Calendar,
  User,
  Activity,
  TrendingUp,
  Coffee,
  LogIn,
  LogOut,
  PlayCircle,
  PauseCircle,
  FileText,
  Settings,
  Shield,
  UserPlus,
  UserMinus,
  Edit,
  Trash2,
  Eye,
  Download,
  Upload,
  Mail,
  Phone,
  Globe,
  X,
  ChevronDown,
  ChevronRight,
  SlidersHorizontal,
  Sparkles,
  Flame,
  Target,
  DollarSign,
  Briefcase,
  List,
  LayoutGrid,
  ArrowUpRight,
  ArrowDownRight,
  Hash,
  Layers,
  Timer,
  AlertCircle,
  Info,
  XCircle,
  CheckCircle2,
  Circle,
  Inbox,
  Archive,
  Star,
  BarChart3,
  PieChart,
  CalendarDays,
  CalendarRange,
  Users,
  Building2,
  Code,
  Laptop,
  Smartphone,
  Wifi,
  WifiOff,
  MapPin,
  Navigation,
  RotateCcw,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { PageLoader } from "@/components/preloader";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import type { ActivityLog, SafeUser } from "@shared/schema";

type Notification = ActivityLog & { user?: SafeUser };

// === ACTION CONFIGURATIONS ===
const ACTION_CONFIG: Record<string, {
  icon: any;
  color: string;
  bgColor: string;
  label: string;
  category: string;
}> = {
  clock_in: { icon: LogIn, color: "text-emerald-500", bgColor: "bg-emerald-500/10", label: "Clock In", category: "attendance" },
  morning_clock_in: { icon: Zap, color: "text-emerald-500", bgColor: "bg-emerald-500/10", label: "Morning Clock In", category: "attendance" },
  evening_clock_in: { icon: Zap, color: "text-cyan-500", bgColor: "bg-cyan-500/10", label: "Evening Clock In", category: "attendance" },
  clock_out: { icon: LogOut, color: "text-orange-500", bgColor: "bg-orange-500/10", label: "Clock Out", category: "attendance" },
  morning_clock_out: { icon: Clock, color: "text-orange-500", bgColor: "bg-orange-500/10", label: "Morning Clock Out", category: "attendance" },
  evening_clock_out: { icon: Clock, color: "text-amber-500", bgColor: "bg-amber-500/10", label: "Evening Clock Out", category: "attendance" },
  break_start: { icon: Coffee, color: "text-blue-500", bgColor: "bg-blue-500/10", label: "Break Started", category: "attendance" },
  break_end: { icon: PlayCircle, color: "text-emerald-500", bgColor: "bg-emerald-500/10", label: "Break Ended", category: "attendance" },
  special_request_created: { icon: FileText, color: "text-purple-500", bgColor: "bg-purple-500/10", label: "Request Created", category: "requests" },
  special_request_status_update: { icon: AlertTriangle, color: "text-blue-500", bgColor: "bg-blue-500/10", label: "Request Updated", category: "requests" },
  special_request_comment: { icon: MessageSquare, color: "text-indigo-500", bgColor: "bg-indigo-500/10", label: "New Comment", category: "requests" },
  user_created: { icon: UserPlus, color: "text-emerald-500", bgColor: "bg-emerald-500/10", label: "User Created", category: "admin" },
  user_updated: { icon: Edit, color: "text-blue-500", bgColor: "bg-blue-500/10", label: "User Updated", category: "admin" },
  user_deleted: { icon: UserMinus, color: "text-rose-500", bgColor: "bg-rose-500/10", label: "User Removed", category: "admin" },
  login: { icon: Shield, color: "text-emerald-500", bgColor: "bg-emerald-500/10", label: "Login", category: "security" },
  logout: { icon: LogOut, color: "text-slate-500", bgColor: "bg-slate-500/10", label: "Logout", category: "security" },
  password_changed: { icon: Shield, color: "text-amber-500", bgColor: "bg-amber-500/10", label: "Password Changed", category: "security" },
  target_added: { icon: Target, color: "text-blue-500", bgColor: "bg-blue-500/10", label: "Target Added", category: "targets" },
  target_verified: { icon: CheckCircle, color: "text-emerald-500", bgColor: "bg-emerald-500/10", label: "Target Verified", category: "targets" },
  meeting_added: { icon: TrendingUp, color: "text-blue-500", bgColor: "bg-blue-500/10", label: "Meeting Added", category: "targets" },
  order_added: { icon: DollarSign, color: "text-emerald-500", bgColor: "bg-emerald-500/10", label: "Order Added", category: "targets" },
};

const CATEGORIES = [
  { id: "attendance", label: "Attendance", icon: Clock, color: "text-emerald-500" },
  { id: "requests", label: "Requests", icon: FileText, color: "text-purple-500" },
  { id: "targets", label: "Targets", icon: Target, color: "text-blue-500" },
  { id: "admin", label: "Admin", icon: Settings, color: "text-amber-500" },
  { id: "security", label: "Security", icon: Shield, color: "text-rose-500" },
];

const DATE_PRESETS = [
  { id: "today", label: "Today", days: 0 },
  { id: "yesterday", label: "Yesterday", days: 1 },
  { id: "last7", label: "Last 7 days", days: 7 },
  { id: "last30", label: "Last 30 days", days: 30 },
  { id: "last90", label: "Last 90 days", days: 90 },
  { id: "all", label: "All time", days: -1 },
];

// === FILTER STATE TYPE ===
interface FilterState {
  categories: string[];
  actions: string[];
  users: string[];
  datePreset: string;
  customDateRange: { from: Date | null; to: Date | null };
}

// === HELPERS ===
const getInitials = (firstName: string, lastName: string) =>
  `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase() || "?";

const getAvatarColor = (name: string) => {
  const colors = [
    "from-blue-500 to-blue-600", "from-emerald-500 to-emerald-600",
    "from-violet-500 to-violet-600", "from-rose-500 to-rose-600",
    "from-amber-500 to-amber-600", "from-cyan-500 to-cyan-600",
  ];
  return colors[(name?.charCodeAt(0) || 0) % colors.length];
};

const getActionConfig = (action: string) => {
  return ACTION_CONFIG[action] || {
    icon: Bell,
    color: "text-slate-400",
    bgColor: "bg-slate-500/10",
    label: action.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
    category: "other"
  };
};

const formatNotificationTime = (date: string | Date) => {
  const d = new Date(date);
  if (isToday(d)) return format(d, "h:mm a");
  if (isYesterday(d)) return `Yesterday ${format(d, "h:mm a")}`;
  return format(d, "MMM dd, h:mm a");
};

const formatDateHeader = (date: string) => {
  const d = new Date(date);
  if (isToday(d)) return "Today";
  if (isYesterday(d)) return "Yesterday";
  return format(d, "EEEE, MMMM dd, yyyy");
};

// === MINI STAT COMPONENT ===
function MiniStat({ icon: Icon, value, label, color = "slate" }: {
  icon: any; value: number | string; label: string; color?: string;
}) {
  const colorClasses: Record<string, string> = {
    blue: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    purple: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
    amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    rose: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
    cyan: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400",
    slate: "bg-slate-500/10 text-slate-600 dark:text-slate-400",
  };

  return (
    <div className={cn("flex items-center gap-2 px-3 py-1.5 rounded-full", colorClasses[color])}>
      <Icon className="w-3.5 h-3.5" />
      <span className="text-sm font-semibold">{value}</span>
      <span className="text-xs opacity-70">{label}</span>
    </div>
  );
}

// === FILTER CHIP ===
function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/50 text-xs font-medium text-blue-700 dark:text-blue-300">
      {label}
      <button onClick={onRemove} className="hover:bg-blue-200 dark:hover:bg-blue-800 rounded-full p-0.5">
        <X className="w-3 h-3" />
      </button>
    </span>
  );
}

// === ADVANCED FILTER PANEL ===
function FilterPanel({
  filters,
  setFilters,
  onClear,
  activeCount,
  uniqueUsers,
  uniqueActions,
}: {
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  onClear: () => void;
  activeCount: number;
  uniqueUsers: SafeUser[];
  uniqueActions: string[];
}) {
  const toggleArrayFilter = (key: keyof FilterState, value: string) => {
    if (key === "datePreset" || key === "customDateRange") return;
    setFilters(prev => ({
      ...prev,
      [key]: (prev[key] as string[]).includes(value)
        ? (prev[key] as string[]).filter(v => v !== value)
        : [...(prev[key] as string[]), value]
    }));
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 relative h-9">
          <SlidersHorizontal className="w-4 h-4" />
          <span className="hidden sm:inline">Filters</span>
          {activeCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center font-medium">
              {activeCount}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[360px] sm:w-[420px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-blue-500" />
            Advanced Filters
          </SheetTitle>
          <SheetDescription>
            Narrow down your activity history
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-200px)] mt-6 pr-4">
          <div className="space-y-6">
            {/* Date Range */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-slate-400" />
                Time Period
              </Label>
              <div className="grid grid-cols-2 gap-2">
                {DATE_PRESETS.map(preset => (
                  <button
                    key={preset.id}
                    onClick={() => setFilters(prev => ({ ...prev, datePreset: preset.id }))}
                    className={cn(
                      "px-3 py-2 rounded-lg text-sm font-medium transition-all text-left",
                      filters.datePreset === preset.id
                        ? "bg-blue-500 text-white"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
                    )}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            <Separator />

            {/* Categories */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold flex items-center gap-2">
                <Layers className="w-4 h-4 text-slate-400" />
                Categories
              </Label>
              <div className="space-y-2">
                {CATEGORIES.map(category => (
                  <label
                    key={category.id}
                    className={cn(
                      "flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-colors",
                      filters.categories.includes(category.id)
                        ? "bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800"
                        : "hover:bg-slate-50 dark:hover:bg-slate-800 border border-transparent"
                    )}
                  >
                    <Checkbox
                      checked={filters.categories.includes(category.id)}
                      onCheckedChange={() => toggleArrayFilter("categories", category.id)}
                    />
                    <category.icon className={cn("w-4 h-4", category.color)} />
                    <span className="text-sm font-medium flex-1">{category.label}</span>
                    <Badge variant="secondary" className="text-[10px]">
                      {uniqueActions.filter(a => getActionConfig(a).category === category.id).length}
                    </Badge>
                  </label>
                ))}
              </div>
            </div>

            <Separator />

            {/* Action Types */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold flex items-center gap-2">
                <Activity className="w-4 h-4 text-slate-400" />
                Action Types
              </Label>
              <div className="max-h-48 overflow-y-auto space-y-1 pr-2">
                {uniqueActions.map(action => {
                  const config = getActionConfig(action);
                  return (
                    <label
                      key={action}
                      className={cn(
                        "flex items-center gap-2 px-2.5 py-2 rounded-lg cursor-pointer transition-colors",
                        filters.actions.includes(action)
                          ? "bg-blue-50 dark:bg-blue-950/50"
                          : "hover:bg-slate-50 dark:hover:bg-slate-800"
                      )}
                    >
                      <Checkbox
                        checked={filters.actions.includes(action)}
                        onCheckedChange={() => toggleArrayFilter("actions", action)}
                      />
                      <div className={cn("p-1 rounded", config.bgColor)}>
                        <config.icon className={cn("w-3 h-3", config.color)} />
                      </div>
                      <span className="text-sm">{config.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Users (Admin Only) */}
            {uniqueUsers.length > 0 && (
              <>
                <Separator />
                <div className="space-y-3">
                  <Label className="text-sm font-semibold flex items-center gap-2">
                    <Users className="w-4 h-4 text-slate-400" />
                    Users
                  </Label>
                  <div className="max-h-48 overflow-y-auto space-y-1 pr-2">
                    {uniqueUsers.map(user => (
                      <label
                        key={user.id}
                        className={cn(
                          "flex items-center gap-2 px-2.5 py-2 rounded-lg cursor-pointer transition-colors",
                          filters.users.includes(user.id)
                            ? "bg-blue-50 dark:bg-blue-950/50"
                            : "hover:bg-slate-50 dark:hover:bg-slate-800"
                        )}
                      >
                        <Checkbox
                          checked={filters.users.includes(user.id)}
                          onCheckedChange={() => toggleArrayFilter("users", user.id)}
                        />
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className={cn("text-white text-[10px] bg-gradient-to-br", getAvatarColor(user.firstName))}>
                            {getInitials(user.firstName, user.lastName)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{user.firstName} {user.lastName}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </ScrollArea>

        <SheetFooter className="mt-6">
          <Button variant="outline" onClick={onClear} className="flex-1">
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset All
          </Button>
          <SheetClose asChild>
            <Button className="flex-1">
              Apply Filters
            </Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

// === NOTIFICATION CARD ===
function NotificationCard({ notification, isAdmin }: { notification: Notification; isAdmin: boolean }) {
  const config = getActionConfig(notification.action);
  const IconComponent = config.icon;

  return (
    <div className={cn(
      "group relative flex items-start gap-4 p-4 rounded-xl transition-all duration-200",
      "bg-white dark:bg-slate-900/60 backdrop-blur-sm",
      "border border-slate-200/50 dark:border-slate-700/50",
      "hover:shadow-lg hover:shadow-slate-200/50 dark:hover:shadow-slate-900/50",
      "hover:border-slate-300 dark:hover:border-slate-600"
    )}>
      {/* Time indicator line */}
      <div className="absolute left-0 top-4 bottom-4 w-0.5 rounded-full bg-gradient-to-b from-transparent via-slate-200 dark:via-slate-700 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

      {/* Icon */}
      <div className={cn(
        "shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110",
        config.bgColor
      )}>
        <IconComponent className={cn("w-5 h-5", config.color)} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            {/* Header Row */}
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <Badge 
                variant="secondary" 
                className={cn(
                  "text-[10px] font-bold uppercase tracking-tight px-1.5 py-0 border",
                  config.bgColor, config.color, "border-current/20"
                )}
              >
                {config.label}
              </Badge>
              
              {isAdmin && notification.user && (
                <div className="flex items-center gap-1.5">
                  <Avatar className="h-5 w-5">
                    <AvatarFallback className={cn("text-white text-[8px] bg-gradient-to-br", getAvatarColor(notification.user.firstName))}>
                      {getInitials(notification.user.firstName, notification.user.lastName)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {notification.user.firstName} {notification.user.lastName}
                  </span>
                </div>
              )}
            </div>

            {/* Details */}
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              {notification.details}
            </p>

            {/* Metadata */}
            {notification.metadata && typeof notification.metadata === 'object' && (
              <div className="flex flex-wrap gap-2 mt-2">
                {Object.entries(notification.metadata as Record<string, any>).slice(0, 3).map(([key, value]) => (
                  <span key={key} className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">
                    {key}: {String(value)}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Time & Actions */}
          <div className="shrink-0 flex flex-col items-end gap-2">
            <span className="text-[11px] font-medium text-slate-400 whitespace-nowrap">
              {formatNotificationTime(notification.timestamp)}
            </span>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem className="text-xs gap-2">
                  <Eye className="w-3.5 h-3.5" />
                  View Details
                </DropdownMenuItem>
                <DropdownMenuItem className="text-xs gap-2">
                  <Archive className="w-3.5 h-3.5" />
                  Archive
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-xs gap-2 text-rose-600">
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </div>
  );
}

// === ACTIVITY TIMELINE DOT ===
function TimelineDot({ isFirst, isLast }: { isFirst: boolean; isLast: boolean }) {
  return (
    <div className="absolute left-5 top-0 bottom-0 flex flex-col items-center">
      {!isFirst && <div className="w-px flex-1 bg-slate-200 dark:bg-slate-700" />}
      <div className="w-2.5 h-2.5 rounded-full bg-blue-500 ring-4 ring-blue-500/20 shrink-0" />
      {!isLast && <div className="w-px flex-1 bg-slate-200 dark:bg-slate-700" />}
    </div>
  );
}

// === MAIN COMPONENT ===
export default function NotificationsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "timeline">("list");
  const [filters, setFilters] = useState<FilterState>({
    categories: [],
    actions: [],
    users: [],
    datePreset: "all",
    customDateRange: { from: null, to: null },
  });

  const { data: notifications, isLoading, refetch, isFetching } = useQuery<Notification[]>({
    queryKey: [isAdmin ? "/api/admin/notifications" : "/api/notifications"],
    staleTime: 30000,
  });

  // Extract unique values for filters
  const uniqueUsers = useMemo(() => {
    if (!notifications || !isAdmin) return [];
    const userMap = new Map<string, SafeUser>();
    notifications.forEach(n => {
      if (n.user && !userMap.has(n.user.id)) {
        userMap.set(n.user.id, n.user);
      }
    });
    return Array.from(userMap.values());
  }, [notifications, isAdmin]);

  const uniqueActions = useMemo(() => {
    if (!notifications) return [];
    return [...new Set(notifications.map(n => n.action))];
  }, [notifications]);

  // Calculate active filter count
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.categories.length) count++;
    if (filters.actions.length) count++;
    if (filters.users.length) count++;
    if (filters.datePreset !== "all") count++;
    return count;
  }, [filters]);

  const clearFilters = () => {
    setFilters({
      categories: [], actions: [], users: [],
      datePreset: "all", customDateRange: { from: null, to: null },
    });
    setSearchQuery("");
  };

  // Filter notifications
  const filteredNotifications = useMemo(() => {
    if (!notifications) return [];

    return notifications.filter(n => {
      // Search
      if (searchQuery) {
        const searchLower = searchQuery.toLowerCase();
        const matchesSearch =
          n.details?.toLowerCase().includes(searchLower) ||
          n.action.toLowerCase().includes(searchLower) ||
          (n.user && `${n.user.firstName} ${n.user.lastName}`.toLowerCase().includes(searchLower));
        if (!matchesSearch) return false;
      }

      // Category filter
      if (filters.categories.length > 0) {
        const config = getActionConfig(n.action);
        if (!filters.categories.includes(config.category)) return false;
      }

      // Action filter
      if (filters.actions.length > 0) {
        if (!filters.actions.includes(n.action)) return false;
      }

      // User filter
      if (filters.users.length > 0) {
        if (!n.user || !filters.users.includes(n.user.id)) return false;
      }

      // Date filter
      if (filters.datePreset !== "all") {
        const preset = DATE_PRESETS.find(p => p.id === filters.datePreset);
        if (preset && preset.days >= 0) {
          const startDate = startOfDay(subDays(new Date(), preset.days));
          const endDate = endOfDay(new Date());
          const notificationDate = new Date(n.timestamp);
          if (!isWithinInterval(notificationDate, { start: startDate, end: endDate })) {
            return false;
          }
        }
      }

      return true;
    });
  }, [notifications, searchQuery, filters]);

  // Group by date
  const groupedNotifications = useMemo(() => {
    const groups: Record<string, Notification[]> = {};
    filteredNotifications.forEach((n) => {
      const date = format(new Date(n.timestamp), "yyyy-MM-dd");
      if (!groups[date]) groups[date] = [];
      groups[date].push(n);
    });
    return groups;
  }, [filteredNotifications]);

  // Calculate stats
  const stats = useMemo(() => {
    const total = filteredNotifications.length;
    const today = filteredNotifications.filter(n => isToday(new Date(n.timestamp))).length;
    const categories = CATEGORIES.map(cat => ({
      ...cat,
      count: filteredNotifications.filter(n => getActionConfig(n.action).category === cat.id).length
    }));
    return { total, today, categories };
  }, [filteredNotifications]);

  if (isLoading) return <PageLoader />;

  return (
    <TooltipProvider>
      <div className="h-full flex flex-col bg-gradient-to-br from-slate-50 via-slate-50 to-slate-100 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
        {/* Compact Header */}
        <div className="shrink-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-800/50 sticky top-0 z-50">
          <div className="px-4 py-2.5">
            <div className="flex items-center gap-3">
              {/* Search */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search activities, users, actions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9 bg-slate-50 dark:bg-slate-800 border-slate-200/50"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Quick Date Selector */}
              <Select value={filters.datePreset} onValueChange={(v) => setFilters(prev => ({ ...prev, datePreset: v }))}>
                <SelectTrigger className="w-[130px] h-9 bg-slate-50 dark:bg-slate-800">
                  <Calendar className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DATE_PRESETS.map(preset => (
                    <SelectItem key={preset.id} value={preset.id}>{preset.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Advanced Filters */}
              <FilterPanel
                filters={filters}
                setFilters={setFilters}
                onClear={clearFilters}
                activeCount={activeFilterCount}
                uniqueUsers={uniqueUsers}
                uniqueActions={uniqueActions}
              />

              {/* View Toggle */}
              <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => setViewMode("list")}
                      className={cn(
                        "p-1.5 rounded-md transition-all",
                        viewMode === "list" 
                          ? "bg-white dark:bg-slate-700 shadow-sm" 
                          : "text-slate-500 hover:text-slate-700"
                      )}
                    >
                      <List className="w-4 h-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>List View</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => setViewMode("timeline")}
                      className={cn(
                        "p-1.5 rounded-md transition-all",
                        viewMode === "timeline" 
                          ? "bg-white dark:bg-slate-700 shadow-sm" 
                          : "text-slate-500 hover:text-slate-700"
                      )}
                    >
                      <Activity className="w-4 h-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>Timeline View</TooltipContent>
                </Tooltip>
              </div>

              {/* Refresh */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-9 w-9" 
                    onClick={() => refetch()}
                  >
                    <RefreshCw className={cn("w-4 h-4", isFetching && "animate-spin")} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Refresh</TooltipContent>
              </Tooltip>
            </div>

            {/* Stats Bar */}
            <div className="flex items-center gap-2 mt-2 overflow-x-auto pb-1">
              <MiniStat icon={Activity} value={stats.total} label="total" color="slate" />
              <MiniStat icon={Sparkles} value={stats.today} label="today" color="blue" />
              <Separator orientation="vertical" className="h-5" />
              {stats.categories.filter(c => c.count > 0).map(cat => (
                <MiniStat key={cat.id} icon={cat.icon} value={cat.count} label={cat.label.toLowerCase()} color={
                  cat.id === "attendance" ? "emerald" :
                  cat.id === "requests" ? "purple" :
                  cat.id === "targets" ? "blue" :
                  cat.id === "admin" ? "amber" :
                  cat.id === "security" ? "rose" : "slate"
                } />
              ))}

              {/* Active Filters */}
              {(activeFilterCount > 0 || searchQuery) && (
                <>
                  <Separator orientation="vertical" className="h-5" />
                  <div className="flex items-center gap-1">
                    {searchQuery && (
                      <FilterChip label={`"${searchQuery}"`} onRemove={() => setSearchQuery("")} />
                    )}
                    {filters.categories.map(c => (
                      <FilterChip 
                        key={c} 
                        label={CATEGORIES.find(cat => cat.id === c)?.label || c} 
                        onRemove={() => setFilters(p => ({ ...p, categories: p.categories.filter(x => x !== c) }))} 
                      />
                    ))}
                    {filters.actions.length > 0 && (
                      <FilterChip 
                        label={`${filters.actions.length} actions`} 
                        onRemove={() => setFilters(p => ({ ...p, actions: [] }))} 
                      />
                    )}
                    {filters.users.length > 0 && (
                      <FilterChip 
                        label={`${filters.users.length} users`} 
                        onRemove={() => setFilters(p => ({ ...p, users: [] }))} 
                      />
                    )}
                    {filters.datePreset !== "all" && (
                      <FilterChip 
                        label={DATE_PRESETS.find(p => p.id === filters.datePreset)?.label || filters.datePreset} 
                        onRemove={() => setFilters(p => ({ ...p, datePreset: "all" }))} 
                      />
                    )}
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-6 px-2 text-xs text-slate-500" 
                      onClick={clearFilters}
                    >
                      Clear all
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <ScrollArea className="flex-1">
          <div className="p-4 max-w-5xl mx-auto">
            {Object.keys(groupedNotifications).length > 0 ? (
              Object.keys(groupedNotifications)
                .sort((a, b) => b.localeCompare(a))
                .map((date, dateIdx) => (
                  <div key={date} className="mb-8">
                    {/* Date Header */}
                    <div className="flex items-center gap-4 mb-4 sticky top-0 z-10">
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white dark:bg-slate-800 shadow-sm border border-slate-200/50 dark:border-slate-700/50">
                        <CalendarDays className="w-4 h-4 text-blue-500" />
                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                          {formatDateHeader(date)}
                        </span>
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                          {groupedNotifications[date].length}
                        </Badge>
                      </div>
                      <div className="h-px flex-1 bg-gradient-to-r from-slate-200 dark:from-slate-700 to-transparent" />
                    </div>

                    {/* Notifications */}
                    <div className={cn(
                      viewMode === "timeline" ? "relative pl-12 space-y-4" : "space-y-3"
                    )}>
                      {viewMode === "timeline" && (
                        <div className="absolute left-5 top-0 bottom-0 w-px bg-gradient-to-b from-blue-500 via-slate-200 dark:via-slate-700 to-transparent" />
                      )}
                      
                      {groupedNotifications[date].map((notification, idx) => (
                        <div key={notification.id} className="relative">
                          {viewMode === "timeline" && (
                            <div className="absolute left-[-28px] top-5 w-3 h-3 rounded-full bg-blue-500 ring-4 ring-blue-500/20 dark:ring-blue-500/30" />
                          )}
                          <NotificationCard notification={notification} isAdmin={isAdmin} />
                        </div>
                      ))}
                    </div>
                  </div>
                ))
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-20 h-20 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
                  <Inbox className="w-10 h-10 text-slate-300 dark:text-slate-600" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">
                  No Activities Found
                </h3>
                <p className="text-slate-500 max-w-sm">
                  {searchQuery || activeFilterCount > 0
                    ? "No activities match your current filters. Try adjusting your search or filters."
                    : "When there are new activities or alerts, they will appear here."
                  }
                </p>
                {(searchQuery || activeFilterCount > 0) && (
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={clearFilters}
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Clear All Filters
                  </Button>
                )}
              </div>
            )}

            {/* Load More / Pagination could go here */}
            {filteredNotifications.length > 0 && (
              <div className="text-center py-8">
                <p className="text-sm text-slate-400">
                  Showing {filteredNotifications.length} of {notifications?.length || 0} activities
                </p>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Minimal Footer */}
        <div className="shrink-0 px-4 py-1.5 bg-white/50 dark:bg-slate-900/50 backdrop-blur border-t border-slate-200/30 dark:border-slate-800/30">
          <div className="flex items-center justify-between text-[10px] text-slate-400">
            <span className="flex items-center gap-2">
              <span>{filteredNotifications.length} activities</span>
              {activeFilterCount > 0 && (
                <span className="text-blue-500">• {activeFilterCount} filters active</span>
              )}
            </span>
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live • {format(new Date(), "h:mm a")}
            </span>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}