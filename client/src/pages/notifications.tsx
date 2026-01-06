import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, isToday, isYesterday } from "date-fns";
import {
    Bell,
    Clock,
    CheckCircle,
    MessageSquare,
    AlertTriangle,
    Zap,
    ArrowRight,
    Filter,
    Search,
    RefreshCw,
    MoreVertical,
    ChevronRight,
    Calendar,
    User,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PageLoader } from "@/components/preloader";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import type { ActivityLog, SafeUser } from "@shared/schema";

type Notification = ActivityLog & { user?: SafeUser };

export default function NotificationsPage() {
    const { user } = useAuth();
    const isAdmin = user?.role === "admin";
    const [searchQuery, setSearchQuery] = useState("");
    const [filterType, setFilterType] = useState<string>("all");

    const { data: notifications, isLoading, refetch } = useQuery<Notification[]>({
        queryKey: [isAdmin ? "/api/admin/notifications" : "/api/notifications"],
        staleTime: 30000,
    });

    const getActionIcon = (action: string) => {
        switch (action) {
            case "clock_in":
            case "morning_clock_in":
            case "evening_clock_in":
                return <Zap className="w-4 h-4 text-emerald-500" />;
            case "clock_out":
            case "morning_clock_out":
            case "evening_clock_out":
                return <Clock className="w-4 h-4 text-orange-500" />;
            case "break_start":
                return <RefreshCw className="w-4 h-4 text-blue-500" />;
            case "break_end":
                return <CheckCircle className="w-4 h-4 text-emerald-500" />;
            case "special_request_created":
                return <MessageSquare className="w-4 h-4 text-purple-500" />;
            case "special_request_status_update":
                return <AlertTriangle className="w-4 h-4 text-blue-500" />;
            case "special_request_comment":
                return <MessageSquare className="w-4 h-4 text-indigo-500" />;
            default:
                return <Bell className="w-4 h-4 text-slate-400" />;
        }
    };

    const getActionLabel = (action: string) => {
        return action.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
    };

    const formatNotificationTime = (date: string | Date) => {
        const d = new Date(date);
        if (isToday(d)) return `Today, ${format(d, "h:mm a")}`;
        if (isYesterday(d)) return `Yesterday, ${format(d, "h:mm a")}`;
        return format(d, "MMM dd, h:mm a");
    };

    const filteredNotifications = notifications?.filter((n) => {
        const matchesSearch =
            n.details?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            n.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (n.user && `${n.user.firstName} ${n.user.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()));

        const matchesFilter = filterType === "all" || n.action.includes(filterType);

        return matchesSearch && matchesFilter;
    });

    // Group by date
    const groupedNotifications: Record<string, Notification[]> = {};
    filteredNotifications?.forEach((n) => {
        const date = format(new Date(n.timestamp), "yyyy-MM-dd");
        if (!groupedNotifications[date]) groupedNotifications[date] = [];
        groupedNotifications[date].push(n);
    });

    if (isLoading) return <PageLoader />;

    return (
        <div className="flex flex-col h-full bg-slate-50/50 dark:bg-slate-950/50">
            {/* Header Section */}
            <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-6">
                <div className="max-w-6xl mx-auto w-full flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <Bell className="w-6 h-6 text-blue-500" />
                            Notifications
                        </h1>
                        <p className="text-sm text-slate-500 mt-1">
                            Stay updated with the latest activities and alerts.
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="relative flex-1 md:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <Input
                                placeholder="Search activities..."
                                className="pl-9 bg-slate-50 dark:bg-slate-800 border-none h-10"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={() => refetch()}
                            className="h-10 w-10 shrink-0"
                        >
                            <RefreshCw className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <ScrollArea className="flex-1 p-6">
                <div className="max-w-4xl mx-auto space-y-8">
                    {Object.keys(groupedNotifications).length > 0 ? (
                        Object.keys(groupedNotifications)
                            .sort((a, b) => b.localeCompare(a))
                            .map((date) => (
                                <div key={date} className="space-y-4">
                                    <div className="flex items-center gap-4">
                                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 shrink-0">
                                            {isToday(new Date(date))
                                                ? "Today"
                                                : isYesterday(new Date(date))
                                                    ? "Yesterday"
                                                    : format(new Date(date), "MMMM dd, yyyy")}
                                        </h3>
                                        <Separator className="flex-1 bg-slate-200 dark:bg-slate-800" />
                                    </div>

                                    <div className="space-y-3">
                                        {groupedNotifications[date].map((notification, idx) => (
                                            <Card
                                                key={notification.id}
                                                className="group border-none shadow-sm bg-white dark:bg-slate-900 hover:shadow-md transition-all duration-200"
                                            >
                                                <CardContent className="p-4">
                                                    <div className="flex items-start gap-4">
                                                        <div className="mt-1 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20 transition-colors">
                                                            {getActionIcon(notification.action)}
                                                        </div>

                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center justify-between gap-4 mb-0.5">
                                                                <div className="flex items-center gap-2">
                                                                    <Badge
                                                                        variant="secondary"
                                                                        className="text-[10px] font-bold uppercase tracking-tight py-0"
                                                                    >
                                                                        {getActionLabel(notification.action)}
                                                                    </Badge>
                                                                    {isAdmin && notification.user && (
                                                                        <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                                                                            {notification.user.firstName} {notification.user.lastName}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <span className="text-[10px] font-medium text-slate-400">
                                                                    {formatNotificationTime(notification.timestamp)}
                                                                </span>
                                                            </div>
                                                            <p className="text-sm text-slate-700 dark:text-slate-300">
                                                                {notification.details}
                                                            </p>
                                                        </div>

                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                    <MoreVertical className="w-4 h-4" />
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end" className="w-40">
                                                                <DropdownMenuItem className="text-xs">
                                                                    Mark as read
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem className="text-xs">
                                                                    View details
                                                                </DropdownMenuItem>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                </div>
                            ))
                    ) : (
                        <div className="flex flex-col items-center justify-center py-20 text-center">
                            <div className="w-20 h-20 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
                                <Bell className="w-10 h-10 text-slate-300" />
                            </div>
                            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                                No notifications found
                            </h3>
                            <p className="text-slate-500 max-w-xs mt-2">
                                When there are new activities or alerts, they will appear here.
                            </p>
                            {searchQuery && (
                                <Button
                                    variant="ghost"
                                    className="mt-4 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                                    onClick={() => setSearchQuery("")}
                                >
                                    Clear search
                                </Button>
                            )}
                        </div>
                    )}
                </div>
            </ScrollArea>
        </div>
    );
}
