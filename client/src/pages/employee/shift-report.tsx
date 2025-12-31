// client/src/pages/employee/shift-report.tsx
import { useState, useMemo } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertCircle,
  FileText,
  Plus,
  X,
  Calendar,
  Clock,
  CheckCircle,
  ChevronRight,
  Loader2,
  Send,
  Video,
  Link2,
  FileCheck,
  History,
  Eye,
  ExternalLink,
  RefreshCw,
  Circle,
  Sparkles,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import { cn } from "@/lib/utils";

// Helper function to safely parse JSON or return array
function safeParseArray(value: any): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    // Try to parse as JSON
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed;
      // If it's a single string (not JSON), return it as an array
      return [value];
    } catch {
      // Not valid JSON, treat as single string value
      if (value.trim()) {
        return [value];
      }
      return [];
    }
  }
  return [];
}

// Generate month options for the last 12 months
function getMonthOptions() {
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
}

// Report Card Component
function ReportCard({
  report,
  onClick,
}: {
  report: any;
  onClick: () => void;
}) {
  const reportDate = parseISO(report.date);
  const videos = safeParseArray(report.loomVideos);
  const refs = safeParseArray(report.references);
  
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left p-4 rounded-xl border transition-all duration-200",
        "bg-white dark:bg-slate-900 hover:shadow-md hover:border-primary/50",
        "group"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 flex flex-col items-center justify-center shrink-0">
            <span className="text-lg font-bold text-primary leading-none">
              {format(reportDate, "d")}
            </span>
            <span className="text-[10px] text-primary/70 uppercase font-medium">
              {format(reportDate, "MMM")}
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900 dark:text-white mb-1">
              {format(reportDate, "EEEE")}
            </p>
            <p className="text-xs text-slate-500 line-clamp-2">
              {report.workDetails?.substring(0, 100)}...
            </p>
            <div className="flex items-center gap-2 mt-2">
              {videos.length > 0 && (
                <Badge variant="secondary" className="text-[10px] gap-1">
                  <Video className="h-2.5 w-2.5" />
                  {videos.length}
                </Badge>
              )}
              {refs.length > 0 && (
                <Badge variant="secondary" className="text-[10px] gap-1">
                  <Link2 className="h-2.5 w-2.5" />
                  {refs.length}
                </Badge>
              )}
            </div>
          </div>
        </div>
        <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-primary transition-colors shrink-0" />
      </div>
    </button>
  );
}

export default function ShiftReportPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const today = new Date().toISOString().split("T")[0];
  const currentMonth = new Date().toISOString().substring(0, 7);

  // States
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("submit");

  // Form state
  const [workDetails, setWorkDetails] = useState("");
  const [notes, setNotes] = useState("");
  const [loomVideos, setLoomVideos] = useState<string[]>([]);
  const [references, setReferences] = useState<string[]>([]);
  const [newVideoLink, setNewVideoLink] = useState("");
  const [newReference, setNewReference] = useState("");

  // Get today's status (shift info)
  const { data: todayStatus, isLoading: statusLoading } = useQuery({
    queryKey: ["/api/employee/today"],
    refetchInterval: 30000,
  });

  const todayShift = todayStatus?.shift;
  const hasSubmittedReport = todayStatus?.hasSubmittedReport;

  // Get all reports for selected month
  const { data: reports = [], isLoading: reportsLoading, refetch: refetchReports } = useQuery({
    queryKey: ["my-reports", selectedMonth],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/reports/daily/my?month=${selectedMonth}`);
      if (!res.ok) throw new Error("Failed to fetch reports");
      return res.json();
    },
  });

  // Sort reports by date (newest first)
  const sortedReports = useMemo(() => {
    return [...reports].sort((a: any, b: any) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [reports]);

  // Stats for selected month - SAFE PARSING
  const stats = useMemo(() => {
    const total = reports.length;
    const withVideos = reports.filter((r: any) => {
      const videos = safeParseArray(r.loomVideos);
      return videos.length > 0;
    }).length;
    const withRefs = reports.filter((r: any) => {
      const refs = safeParseArray(r.references);
      return refs.length > 0;
    }).length;
    return { total, withVideos, withRefs };
  }, [reports]);

  // Submit report mutation
  const submitMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/reports/daily", {
        shiftId: todayShift?.id,
        date: today,
        workDetails,
        notes: notes || null,
        loomVideos: loomVideos.length > 0 ? JSON.stringify(loomVideos) : null,
        references: references.length > 0 ? JSON.stringify(references) : null,
        month: currentMonth,
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to submit report");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Report Submitted!",
        description: "Your daily shift report has been saved successfully.",
      });
      // Reset form
      setWorkDetails("");
      setNotes("");
      setLoomVideos([]);
      setReferences([]);
      // Refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/employee/today"] });
      queryClient.invalidateQueries({ queryKey: ["my-reports", currentMonth] });
      refetchReports();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to submit report",
        variant: "destructive",
      });
    },
  });

  const addVideoLink = () => {
    if (newVideoLink.trim()) {
      setLoomVideos([...loomVideos, newVideoLink.trim()]);
      setNewVideoLink("");
    }
  };

  const removeVideoLink = (index: number) => {
    setLoomVideos(loomVideos.filter((_, i) => i !== index));
  };

  const addReference = () => {
    if (newReference.trim()) {
      setReferences([...references, newReference.trim()]);
      setNewReference("");
    }
  };

  const removeReference = (index: number) => {
    setReferences(references.filter((_, i) => i !== index));
  };

  const viewReport = (report: any) => {
    setSelectedReport(report);
    setViewDialogOpen(true);
  };

  if (statusLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Daily Reports</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Submit and view your daily shift reports
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1">
              <Calendar className="h-3 w-3" />
              {format(new Date(), "EEEE, MMM d")}
            </Badge>
          </div>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="submit" className="gap-2">
              <Send className="h-4 w-4" />
              Submit Report
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <History className="h-4 w-4" />
              Report History
            </TabsTrigger>
          </TabsList>

          {/* Submit Report Tab */}
          <TabsContent value="submit" className="space-y-6">
            {/* Status Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/50 dark:to-blue-900/30">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-500 text-white">
                      <Clock className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">Today's Shift</p>
                      <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                        {todayShift?.morningClockIn 
                          ? format(new Date(todayShift.morningClockIn), "h:mm a")
                          : "Not Started"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className={cn(
                "border-0 shadow-sm",
                hasSubmittedReport 
                  ? "bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/50 dark:to-emerald-900/30"
                  : "bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-950/50 dark:to-amber-900/30"
              )}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "p-2 rounded-lg text-white",
                      hasSubmittedReport ? "bg-emerald-500" : "bg-amber-500"
                    )}>
                      {hasSubmittedReport ? <CheckCircle className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                    </div>
                    <div>
                      <p className={cn(
                        "text-xs font-medium",
                        hasSubmittedReport 
                          ? "text-emerald-600 dark:text-emerald-400" 
                          : "text-amber-600 dark:text-amber-400"
                      )}>
                        Today's Report
                      </p>
                      <p className={cn(
                        "text-sm font-semibold",
                        hasSubmittedReport 
                          ? "text-emerald-900 dark:text-emerald-100" 
                          : "text-amber-900 dark:text-amber-100"
                      )}>
                        {hasSubmittedReport ? "Submitted" : "Pending"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-950/50 dark:to-purple-900/30">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-purple-500 text-white">
                      <FileCheck className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs text-purple-600 dark:text-purple-400 font-medium">This Month</p>
                      <p className="text-sm font-semibold text-purple-900 dark:text-purple-100">
                        {stats.total} Report{stats.total !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Report Form or Already Submitted Message */}
            {!todayShift ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  No active shift found for today. Please start your shift first to submit a report.
                </AlertDescription>
              </Alert>
            ) : hasSubmittedReport ? (
              <Card className="border-0 shadow-sm">
                <CardContent className="p-8 text-center">
                  <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="h-8 w-8 text-emerald-500" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Report Already Submitted</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    You have already submitted your daily report for {format(new Date(), "MMMM d, yyyy")}.
                  </p>
                  <Button variant="outline" onClick={() => setActiveTab("history")}>
                    <Eye className="h-4 w-4 mr-2" />
                    View Report History
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-0 shadow-lg">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-gradient-to-br from-primary to-primary/80 text-white">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle>Submit Daily Report</CardTitle>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {format(new Date(), "EEEE, MMMM d, yyyy")}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      submitMutation.mutate();
                    }}
                    className="space-y-6"
                  >
                    {/* Work Details */}
                    <div className="space-y-2">
                      <Label htmlFor="workDetails" className="text-sm font-semibold">
                        Work Details <span className="text-red-500">*</span>
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Describe your tasks, progress, and accomplishments today
                      </p>
                      <Textarea
                        id="workDetails"
                        value={workDetails}
                        onChange={(e) => setWorkDetails(e.target.value)}
                        placeholder="What did you work on today? List your tasks, meetings, achievements..."
                        rows={6}
                        required
                        className="resize-none"
                      />
                    </div>

                    {/* Notes */}
                    <div className="space-y-2">
                      <Label htmlFor="notes" className="text-sm font-semibold">
                        Additional Notes <span className="text-muted-foreground font-normal">(Optional)</span>
                      </Label>
                      <Textarea
                        id="notes"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Any blockers, questions, or notes for tomorrow..."
                        rows={3}
                        className="resize-none"
                      />
                    </div>

                    {/* Loom Videos */}
                    <div className="space-y-3">
                      <Label className="text-sm font-semibold flex items-center gap-2">
                        <Video className="h-4 w-4 text-red-500" />
                        Loom Video Links <span className="text-muted-foreground font-normal">(Optional)</span>
                      </Label>
                      <div className="flex gap-2">
                        <Input
                          value={newVideoLink}
                          onChange={(e) => setNewVideoLink(e.target.value)}
                          placeholder="https://loom.com/share/..."
                          onKeyPress={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              addVideoLink();
                            }
                          }}
                        />
                        <Button type="button" onClick={addVideoLink} size="icon" variant="outline">
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      {loomVideos.length > 0 && (
                        <div className="space-y-2">
                          {loomVideos.map((video, index) => (
                            <div key={index} className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                              <Video className="h-4 w-4 text-red-500 shrink-0" />
                              <a 
                                href={video} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="text-sm text-primary hover:underline truncate flex-1"
                              >
                                {video}
                              </a>
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                onClick={() => removeVideoLink(index)}
                                className="h-6 w-6 shrink-0"
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* References */}
                    <div className="space-y-3">
                      <Label className="text-sm font-semibold flex items-center gap-2">
                        <Link2 className="h-4 w-4 text-blue-500" />
                        Reference Links <span className="text-muted-foreground font-normal">(Optional)</span>
                      </Label>
                      <div className="flex gap-2">
                        <Input
                          value={newReference}
                          onChange={(e) => setNewReference(e.target.value)}
                          placeholder="Add link to PR, doc, design..."
                          onKeyPress={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              addReference();
                            }
                          }}
                        />
                        <Button type="button" onClick={addReference} size="icon" variant="outline">
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      {references.length > 0 && (
                        <div className="space-y-2">
                          {references.map((ref, index) => (
                            <div key={index} className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                              <Link2 className="h-4 w-4 text-blue-500 shrink-0" />
                              <a 
                                href={ref} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="text-sm text-primary hover:underline truncate flex-1"
                              >
                                {ref}
                              </a>
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                onClick={() => removeReference(index)}
                                className="h-6 w-6 shrink-0"
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <Separator />

                    {/* Submit Button */}
                    <Button
                      type="submit"
                      size="lg"
                      className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg"
                      disabled={submitMutation.isPending || !workDetails.trim()}
                    >
                      {submitMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4 mr-2" />
                          Submit Report
                        </>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Report History Tab */}
          <TabsContent value="history" className="space-y-6">
            {/* Filters */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
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
                
                <Button variant="ghost" size="icon" onClick={() => refetchReports()}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Circle className="h-2 w-2 fill-primary text-primary" />
                  {stats.total} reports
                </span>
                {stats.withVideos > 0 && (
                  <span className="flex items-center gap-1.5">
                    <Video className="h-3 w-3" />
                    {stats.withVideos}
                  </span>
                )}
                {stats.withRefs > 0 && (
                  <span className="flex items-center gap-1.5">
                    <Link2 className="h-3 w-3" />
                    {stats.withRefs}
                  </span>
                )}
              </div>
            </div>

            {/* Reports List */}
            {reportsLoading ? (
              <div className="py-12 text-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Loading reports...</p>
              </div>
            ) : sortedReports.length === 0 ? (
              <Card className="border-0 shadow-sm">
                <CardContent className="py-12 text-center">
                  <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
                    <FileText className="h-8 w-8 text-slate-400" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">No Reports Found</h3>
                  <p className="text-sm text-muted-foreground">
                    No reports submitted for {format(parseISO(selectedMonth + "-01"), "MMMM yyyy")}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {sortedReports.map((report: any) => (
                  <ReportCard
                    key={report.id}
                    report={report}
                    onClick={() => viewReport(report)}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* View Report Dialog */}
        <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            {selectedReport && (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-lg">Daily Report</p>
                      <p className="text-sm text-muted-foreground font-normal">
                        {format(parseISO(selectedReport.date), "EEEE, MMMM d, yyyy")}
                      </p>
                    </div>
                  </DialogTitle>
                </DialogHeader>

                <div className="space-y-6 mt-4">
                  {/* Work Details */}
                  <div>
                    <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-primary" />
                      Work Details
                    </h4>
                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                      <p className="text-sm whitespace-pre-wrap leading-relaxed">
                        {selectedReport.workDetails}
                      </p>
                    </div>
                  </div>

                  {/* Notes */}
                  {selectedReport.notes && (
                    <div>
                      <h4 className="text-sm font-semibold mb-2">Additional Notes</h4>
                      <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                        <p className="text-sm whitespace-pre-wrap leading-relaxed">
                          {selectedReport.notes}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Loom Videos */}
                  {(() => {
                    const videos = safeParseArray(selectedReport.loomVideos);
                    if (videos.length === 0) return null;
                    return (
                      <div>
                        <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                          <Video className="h-4 w-4 text-red-500" />
                          Video Links
                        </h4>
                        <div className="space-y-2">
                          {videos.map((video: string, i: number) => (
                            <a
                              key={i}
                              href={video}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group"
                            >
                              <Video className="h-4 w-4 text-red-500 shrink-0" />
                              <span className="text-sm text-primary truncate flex-1">{video}</span>
                              <ExternalLink className="h-3 w-3 text-muted-foreground group-hover:text-primary shrink-0" />
                            </a>
                          ))}
                        </div>
                      </div>
                    );
                  })()}

                  {/* References */}
                  {(() => {
                    const refs = safeParseArray(selectedReport.references);
                    if (refs.length === 0) return null;
                    return (
                      <div>
                        <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                          <Link2 className="h-4 w-4 text-blue-500" />
                          Reference Links
                        </h4>
                        <div className="space-y-2">
                          {refs.map((ref: string, i: number) => (
                            <a
                              key={i}
                              href={ref}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group"
                            >
                              <Link2 className="h-4 w-4 text-blue-500 shrink-0" />
                              <span className="text-sm text-primary truncate flex-1">{ref}</span>
                              <ExternalLink className="h-3 w-3 text-muted-foreground group-hover:text-primary shrink-0" />
                            </a>
                          ))}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Metadata */}
                  <Separator />
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      Submitted: {format(new Date(selectedReport.createdAt), "MMM d, yyyy 'at' h:mm a")}
                    </span>
                    {selectedReport.updatedAt && selectedReport.updatedAt !== selectedReport.createdAt && (
                      <span>
                        Updated: {format(new Date(selectedReport.updatedAt), "MMM d, yyyy 'at' h:mm a")}
                      </span>
                    )}
                  </div>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </ScrollArea>
  );
}