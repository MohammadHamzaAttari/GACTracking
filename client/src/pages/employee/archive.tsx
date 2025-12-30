import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Archive, Calendar, FileText, MessageSquare } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface ArchivedMonth {
  month: string;
  totalReports: number;
  totalRequests: number;
  archivedDate: string;
}

interface DailyReportPreview {
  id: string;
  date: string;
  workDetails: string;
  hasVideo: boolean;
  hasNotes: boolean;
  hasReferences: boolean;
  createdAt: string;
  notes?: string;
}

interface SpecialRequestPreview {
  id: string;
  title: string;
  status: string;
  details: string;
  createdAt: string;
}

export default function EmployeeArchivePage() {
  const { user } = useAuth();
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [viewType, setViewType] = useState<"reports" | "requests" | "month">("month");
  const [selectedReportDetail, setSelectedReportDetail] = useState<DailyReportPreview | null>(null);

  // Get list of archived months for this employee
  const { data: archivedMonths = [], isLoading: isLoadingMonths } = useQuery({
    queryKey: ["employee-archived-months"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/archive/months");
      if (!res.ok) throw new Error("Failed to fetch archived months");
      return res.json();
    },
  });

  // Get archived reports for selected month
  const { data: archivedReports = [], isLoading: isLoadingReports } = useQuery({
    queryKey: ["employee-archived-reports", selectedMonth],
    queryFn: async () => {
      if (!selectedMonth) return [];
      const res = await apiRequest("GET", `/api/archive/reports/${selectedMonth}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: viewType === "reports" && !!selectedMonth,
  });

  // Get archived requests for selected month
  const { data: archivedRequests = [], isLoading: isLoadingRequests } = useQuery({
    queryKey: ["employee-archived-requests", selectedMonth],
    queryFn: async () => {
      if (!selectedMonth) return [];
      const res = await apiRequest("GET", `/api/archive/requests/${selectedMonth}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: viewType === "requests" && !!selectedMonth,
  });

  // Filter reports to show only user's reports
  const userReports = archivedReports.filter((r: any) => r.userId === user?.id);
  const userRequests = archivedRequests.filter((r: any) => r.userId === user?.id);

  const handleMonthSelect = (month: string) => {
    setSelectedMonth(month);
    setViewType("month");
  };

  const handleViewReports = (month: string) => {
    setSelectedMonth(month);
    setViewType("reports");
  };

  const handleViewRequests = (month: string) => {
    setSelectedMonth(month);
    setViewType("requests");
  };

  return (
    <div className="flex-1 p-8">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">My Archive</h1>
          <p className="text-muted-foreground mt-2">
            View your archived attendance records and requests. Archived data is read-only.
          </p>
        </div>

        {/* View Selector */}
        {selectedMonth && (
          <div className="flex gap-2">
            <Button
              variant={viewType === "month" ? "default" : "outline"}
              onClick={() => setViewType("month")}
              size="sm"
            >
              Archive Info
            </Button>
            <Button
              variant={viewType === "reports" ? "default" : "outline"}
              onClick={() => handleViewReports(selectedMonth)}
              size="sm"
            >
              My Reports
            </Button>
            <Button
              variant={viewType === "requests" ? "default" : "outline"}
              onClick={() => handleViewRequests(selectedMonth)}
              size="sm"
            >
              My Requests
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setSelectedMonth(null);
                setViewType("month");
              }}
              size="sm"
            >
              Back to List
            </Button>
          </div>
        )}

        {/* Archived Months List */}
        {viewType === "month" && !selectedMonth && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Archive className="h-5 w-5" />
                Archived Months ({archivedMonths.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingMonths ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary mx-auto mb-2" />
                  <p className="text-muted-foreground">Loading archived months...</p>
                </div>
              ) : archivedMonths.length === 0 ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>No archived months found</AlertDescription>
                </Alert>
              ) : (
                <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                  {archivedMonths.map((archive: ArchivedMonth) => (
                    <Dialog key={archive.month}>
                      <DialogTrigger asChild>
                        <Card
                          className="cursor-pointer hover:shadow-lg transition-shadow"
                          onClick={() => handleMonthSelect(archive.month)}
                        >
                          <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                              <Calendar className="h-4 w-4" />
                              {new Date(archive.month + "-01").toLocaleDateString("en-US", {
                                year: "numeric",
                                month: "long",
                              })}
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">Daily Reports</span>
                                <Badge variant="outline">{archive.totalReports}</Badge>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">Special Requests</span>
                                <Badge variant="outline">{archive.totalRequests}</Badge>
                              </div>
                              <div className="text-xs text-muted-foreground pt-2 border-t">
                                Archived on{" "}
                                {new Date(archive.archivedDate).toLocaleDateString()}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>
                            Archive: {new Date(archive.month + "-01").toLocaleDateString("en-US", {
                              year: "numeric",
                              month: "long",
                            })}
                          </DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950">
                              <div className="flex items-center gap-2 mb-2">
                                <FileText className="h-4 w-4 text-blue-600" />
                                <span className="text-sm font-medium">Daily Reports</span>
                              </div>
                              <p className="text-2xl font-bold text-blue-600">{archive.totalReports}</p>
                              <p className="text-xs text-muted-foreground mt-2">Total records submitted</p>
                            </div>
                            <div className="p-4 rounded-lg bg-purple-50 dark:bg-purple-950">
                              <div className="flex items-center gap-2 mb-2">
                                <MessageSquare className="h-4 w-4 text-purple-600" />
                                <span className="text-sm font-medium">Special Requests</span>
                              </div>
                              <p className="text-2xl font-bold text-purple-600">
                                {archive.totalRequests}
                              </p>
                              <p className="text-xs text-muted-foreground mt-2">Total requests submitted</p>
                            </div>
                          </div>
                          <div className="pt-4 border-t">
                            <p className="text-sm text-muted-foreground mb-4">
                              <strong>Archived on:</strong>{" "}
                              {new Date(archive.archivedDate).toLocaleDateString("en-US", {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                              })}
                            </p>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleViewReports(archive.month)}
                                className="flex-1"
                              >
                                View My Reports
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleViewRequests(archive.month)}
                                className="flex-1"
                              >
                                View My Requests
                              </Button>
                            </div>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Month Detail View */}
        {selectedMonth && viewType === "month" && (
          <Card>
            <CardHeader>
              <CardTitle>
                {new Date(selectedMonth + "-01").toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                })}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      My Daily Reports
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold">{userReports.length}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      My Special Requests
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold">{userRequests.length}</p>
                  </CardContent>
                </Card>
              </div>
              <div className="flex gap-2">
                <Button onClick={() => handleViewReports(selectedMonth)} className="flex-1">
                  View My Reports
                </Button>
                <Button onClick={() => handleViewRequests(selectedMonth)} className="flex-1">
                  View My Requests
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Archived Reports View */}
        {viewType === "reports" && selectedMonth && (
          <Card>
            <CardHeader>
              <CardTitle>
                My Daily Reports - {new Date(selectedMonth + "-01").toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                })}
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-2">
                Read-only view of your archived reports
              </p>
            </CardHeader>
            <CardContent>
              {isLoadingReports ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary mx-auto mb-2" />
                  <p className="text-muted-foreground">Loading reports...</p>
                </div>
              ) : userReports.length === 0 ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>No archived reports found for this month</AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-3">
                  {userReports.map((report: DailyReportPreview) => (
                    <Dialog key={report.id}>
                      <DialogTrigger asChild>
                        <div className="p-4 border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h3 className="font-semibold">
                                {new Date(report.date).toLocaleDateString()}
                              </h3>
                              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                {report.workDetails}
                              </p>
                              <div className="flex gap-1 mt-2">
                                {report.hasVideo && (
                                  <Badge variant="secondary" className="text-xs">
                                    Video
                                  </Badge>
                                )}
                                {report.hasReferences && (
                                  <Badge variant="secondary" className="text-xs">
                                    Links
                                  </Badge>
                                )}
                                {report.hasNotes && (
                                  <Badge variant="secondary" className="text-xs">
                                    Notes
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                              {new Date(report.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>
                            Daily Report - {new Date(report.date).toLocaleDateString()}
                          </DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4 pb-4 border-b">
                            <div>
                              <p className="text-sm text-muted-foreground">Report Date</p>
                              <p className="font-semibold">
                                {new Date(report.date).toLocaleDateString()}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Submitted</p>
                              <p className="font-semibold text-sm">
                                {new Date(report.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div>
                            <h3 className="font-semibold mb-2">Work Details</h3>
                            <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
                              <p className="text-sm whitespace-pre-wrap">{report.workDetails}</p>
                            </div>
                          </div>
                          {report.notes && (
                            <div>
                              <h3 className="font-semibold mb-2">Notes</h3>
                              <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
                                <p className="text-sm whitespace-pre-wrap">{report.notes}</p>
                              </div>
                            </div>
                          )}
                          <div className="pt-2 text-sm text-muted-foreground italic">
                            This is an archived record and is read-only.
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Archived Requests View */}
        {viewType === "requests" && selectedMonth && (
          <Card>
            <CardHeader>
              <CardTitle>
                My Special Requests - {new Date(selectedMonth + "-01").toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                })}
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-2">
                Read-only view of your archived requests
              </p>
            </CardHeader>
            <CardContent>
              {isLoadingRequests ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary mx-auto mb-2" />
                  <p className="text-muted-foreground">Loading requests...</p>
                </div>
              ) : userRequests.length === 0 ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>No archived requests found for this month</AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-3">
                  {userRequests.map((request: SpecialRequestPreview) => (
                    <Dialog key={request.id}>
                      <DialogTrigger asChild>
                        <div className="p-4 border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h3 className="font-semibold">{request.title}</h3>
                              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                {request.details}
                              </p>
                              <p className="text-xs text-muted-foreground mt-2">
                                {new Date(request.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                            <Badge variant="outline" className="whitespace-nowrap ml-2">
                              {request.status.replace(/_/g, " ").toUpperCase()}
                            </Badge>
                          </div>
                        </div>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>{request.title}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4 pb-4 border-b">
                            <div>
                              <p className="text-sm text-muted-foreground">Status</p>
                              <Badge variant="outline">
                                {request.status.replace(/_/g, " ").toUpperCase()}
                              </Badge>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Submitted</p>
                              <p className="font-semibold text-sm">
                                {new Date(request.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div>
                            <h3 className="font-semibold mb-2">Request Details</h3>
                            <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
                              <p className="text-sm whitespace-pre-wrap">{request.details}</p>
                            </div>
                          </div>
                          <div className="pt-2 text-sm text-muted-foreground italic">
                            This is an archived record and is read-only.
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
