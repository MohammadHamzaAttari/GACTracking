// client/src/pages/admin/daily-reports.tsx
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  FileText,
  Calendar,
  Search,
  Video,
  Link2,
  ChevronLeft,
  ChevronRight,
  Eye,
  User,
  Clock,
  ExternalLink,
  FileCheck,
  Filter,
  Download,
  MessageSquare,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import type { DailyShiftReport, SafeUser } from "@shared/schema";

type ReportWithUser = DailyShiftReport & { user: SafeUser };

// Helper function to safely parse JSON or return array from string
function parseStringOrJson(value: string | null | undefined): string[] {
  if (!value) return [];
  
  // If it's already an array (shouldn't happen but just in case)
  if (Array.isArray(value)) return value;
  
  // Try to parse as JSON first
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed;
    // If parsed but not array, return as single item
    return [String(parsed)];
  } catch {
    // Not valid JSON, treat as a single string/URL
    // Split by newlines or commas if multiple URLs
    const urls = value.split(/[\n,]+/).map(s => s.trim()).filter(Boolean);
    return urls;
  }
}

// Helper to check if string has content
function hasContent(value: string | null | undefined): boolean {
  if (!value) return false;
  const items = parseStringOrJson(value);
  return items.length > 0;
}

function getInitials(firstName: string, lastName: string) {
  return `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase() || "U";
}

export default function AdminDailyReportsPage() {
  const [selectedMonth, setSelectedMonth] = useState(
    new Date().toISOString().slice(0, 7)
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedReport, setSelectedReport] = useState<ReportWithUser | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  // Generate month options (last 12 months)
  const monthOptions = Array.from({ length: 12 }, (_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    return {
      value: date.toISOString().slice(0, 7),
      label: format(date, "MMMM yyyy"),
    };
  });

  const { data: reports, isLoading } = useQuery<ReportWithUser[]>({
    queryKey: ["/api/admin/reports/daily", selectedMonth],
    queryFn: async () => {
      const res = await fetch(`/api/admin/reports/daily?month=${selectedMonth}`);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to fetch reports");
      }
      return res.json();
    },
    enabled: !!selectedMonth,
  });

  const filteredReports = reports?.filter((report) => {
    const fullName = `${report.user?.firstName} ${report.user?.lastName}`.toLowerCase();
    const username = report.user?.username?.toLowerCase() || "";
    const workDetails = report.workDetails?.toLowerCase() || "";
    const query = searchQuery.toLowerCase();
    
    return (
      fullName.includes(query) ||
      username.includes(query) ||
      workDetails.includes(query)
    );
  });

  const handlePrevMonth = () => {
    const date = new Date(selectedMonth + "-01");
    date.setMonth(date.getMonth() - 1);
    setSelectedMonth(date.toISOString().slice(0, 7));
  };

  const handleNextMonth = () => {
    const date = new Date(selectedMonth + "-01");
    date.setMonth(date.getMonth() + 1);
    const now = new Date();
    if (date <= now) {
      setSelectedMonth(date.toISOString().slice(0, 7));
    }
  };

  const openReportDetails = (report: ReportWithUser) => {
    setSelectedReport(report);
    setDetailsOpen(true);
  };

  return (
    <ScrollArea className="h-full">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Daily Reports</h1>
            <p className="text-muted-foreground text-sm">
              View and manage employee daily shift reports
            </p>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              {/* Month Navigation */}
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={handlePrevMonth}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger className="w-[180px]">
                    <Calendar className="h-4 w-4 mr-2" />
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
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleNextMonth}
                  disabled={selectedMonth >= new Date().toISOString().slice(0, 7)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              {/* Search */}
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search reports..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Reports Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Reports ({filteredReports?.length || 0})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-48" />
                    </div>
                    <Skeleton className="h-8 w-20" />
                  </div>
                ))}
              </div>
            ) : filteredReports && filteredReports.length > 0 ? (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Work Summary</TableHead>
                      <TableHead>Attachments</TableHead>
                      <TableHead className="w-20">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredReports.map((report) => {
                      const loomVideos = parseStringOrJson(report.loomVideos);
                      const references = parseStringOrJson(report.references);
                      
                      return (
                        <TableRow key={report.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-9 w-9">
                                <AvatarFallback className="bg-primary/10 text-primary text-sm">
                                  {getInitials(
                                    report.user?.firstName || "",
                                    report.user?.lastName || ""
                                  )}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">
                                  {report.user?.firstName} {report.user?.lastName}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  @{report.user?.username}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 text-sm">
                              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                              {report.date
                                ? format(new Date(report.date), "MMM dd, yyyy")
                                : "N/A"}
                            </div>
                          </TableCell>
                          <TableCell>
                            <p className="text-sm line-clamp-2 max-w-xs">
                              {report.workDetails || "No details provided"}
                            </p>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1 flex-wrap">
                              {loomVideos.length > 0 && (
                                <Badge
                                  variant="secondary"
                                  className="text-xs gap-1"
                                >
                                  <Video className="h-3 w-3" />
                                  {loomVideos.length}
                                </Badge>
                              )}
                              {references.length > 0 && (
                                <Badge
                                  variant="secondary"
                                  className="text-xs gap-1"
                                >
                                  <Link2 className="h-3 w-3" />
                                  {references.length}
                                </Badge>
                              )}
                              {report.notes && (
                                <Badge
                                  variant="secondary"
                                  className="text-xs gap-1"
                                >
                                  <MessageSquare className="h-3 w-3" />
                                </Badge>
                              )}
                              {loomVideos.length === 0 &&
                                references.length === 0 &&
                                !report.notes && (
                                  <span className="text-xs text-muted-foreground">
                                    None
                                  </span>
                                )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openReportDetails(report)}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground/50" />
                <p className="mt-2 text-muted-foreground">
                  {searchQuery
                    ? "No reports found matching your search"
                    : "No reports for this month"}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Report Details Dialog */}
        <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
          <DialogContent className="sm:max-w-2xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileCheck className="h-5 w-5 text-primary" />
                Daily Report Details
              </DialogTitle>
            </DialogHeader>
            {selectedReport && (
              <ScrollArea className="max-h-[70vh] pr-4">
                <div className="space-y-6">
                  {/* Employee Info */}
                  <div className="flex items-center gap-4 p-4 rounded-lg bg-slate-50 dark:bg-slate-900">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {getInitials(
                          selectedReport.user?.firstName || "",
                          selectedReport.user?.lastName || ""
                        )}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-semibold">
                        {selectedReport.user?.firstName}{" "}
                        {selectedReport.user?.lastName}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        @{selectedReport.user?.username} •{" "}
                        {selectedReport.user?.department || "No Department"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">
                        {selectedReport.date
                          ? format(new Date(selectedReport.date), "MMMM dd, yyyy")
                          : "N/A"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {selectedReport.createdAt
                          ? format(
                              new Date(selectedReport.createdAt),
                              "hh:mm a"
                            )
                          : ""}
                      </p>
                    </div>
                  </div>

                  {/* Work Details */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold flex items-center gap-2">
                      <FileText className="h-4 w-4 text-blue-500" />
                      Work Details
                    </h4>
                    <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-900 text-sm whitespace-pre-wrap">
                      {selectedReport.workDetails || "No details provided"}
                    </div>
                  </div>

                  {/* Loom Videos */}
                  {hasContent(selectedReport.loomVideos) && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold flex items-center gap-2">
                        <Video className="h-4 w-4 text-purple-500" />
                        Loom Videos
                      </h4>
                      <div className="space-y-2">
                        {parseStringOrJson(selectedReport.loomVideos).map(
                          (url, index) => (
                            <a
                              key={index}
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 p-3 rounded-lg bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-950/50 transition-colors text-sm"
                            >
                              <Video className="h-4 w-4 flex-shrink-0" />
                              <span className="truncate flex-1">{url}</span>
                              <ExternalLink className="h-4 w-4 flex-shrink-0" />
                            </a>
                          )
                        )}
                      </div>
                    </div>
                  )}

                  {/* References */}
                  {hasContent(selectedReport.references) && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold flex items-center gap-2">
                        <Link2 className="h-4 w-4 text-cyan-500" />
                        References
                      </h4>
                      <div className="space-y-2">
                        {parseStringOrJson(selectedReport.references).map(
                          (url, index) => (
                            <a
                              key={index}
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 p-3 rounded-lg bg-cyan-50 dark:bg-cyan-950/30 text-cyan-700 dark:text-cyan-400 hover:bg-cyan-100 dark:hover:bg-cyan-950/50 transition-colors text-sm"
                            >
                              <Link2 className="h-4 w-4 flex-shrink-0" />
                              <span className="truncate flex-1">{url}</span>
                              <ExternalLink className="h-4 w-4 flex-shrink-0" />
                            </a>
                          )
                        )}
                      </div>
                    </div>
                  )}

                  {/* Notes */}
                  {selectedReport.notes && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold flex items-center gap-2">
                        <MessageSquare className="h-4 w-4 text-amber-500" />
                        Additional Notes
                      </h4>
                      <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-950/30 text-sm whitespace-pre-wrap">
                        {selectedReport.notes}
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </ScrollArea>
  );
}