import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface ArchivedMonth {
  month: string;
  totalReports: number;
  totalRequests: number;
  archivedDate: string;
}

interface DailyReportPreview {
  id: string;
  user: {
    firstName: string;
    lastName: string;
    department: string;
  };
  date: string;
  workDetails: string;
  hasVideo: boolean;
  hasNotes: boolean;
  hasReferences: boolean;
  createdAt: string;
}

interface SpecialRequestPreview {
  id: string;
  user: {
    firstName: string;
    lastName: string;
  };
  title: string;
  status: string;
  createdAt: string;
}

export default function AdminArchivePage() {
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [viewType, setViewType] = useState<"reports" | "requests" | "month">("month");
  const [selectedReportDetail, setSelectedReportDetail] = useState<DailyReportPreview | null>(null);

  // Get list of archived months
  const { data: archivedMonths = [], isLoading: isLoadingMonths } = useQuery({
    queryKey: ["archived-months"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/archive/months");
      if (!res.ok) throw new Error("Failed to fetch archived months");
      return res.json();
    },
  });

  // Get archived reports for selected month
  const { data: archivedReports = [], isLoading: isLoadingReports } = useQuery({
    queryKey: ["archived-reports", selectedMonth],
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
    queryKey: ["archived-requests", selectedMonth],
    queryFn: async () => {
      if (!selectedMonth) return [];
      const res = await apiRequest("GET", `/api/archive/requests/${selectedMonth}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: viewType === "requests" && !!selectedMonth,
  });

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
          <h1 className="text-3xl font-bold">Archive</h1>
          <p className="text-muted-foreground mt-2">
            View archived attendance records and requests. Archived data is read-only.
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
              Daily Reports
            </Button>
            <Button
              variant={viewType === "requests" ? "default" : "outline"}
              onClick={() => handleViewRequests(selectedMonth)}
              size="sm"
            >
              Special Requests
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
                                View Daily Reports
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleViewRequests(archive.month)}
                                className="flex-1"
                              >
                                View Special Requests
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
                      Daily Reports
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold">
                      {archivedMonths.find((m: any) => m.month === selectedMonth)?.totalReports || 0}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Special Requests
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold">
                      {archivedMonths.find((m: any) => m.month === selectedMonth)?.totalRequests || 0}
                    </p>
                  </CardContent>
                </Card>
              </div>
              <div className="flex gap-2">
                <Button onClick={() => handleViewReports(selectedMonth)} className="flex-1">
                  View Daily Reports
                </Button>
                <Button onClick={() => handleViewRequests(selectedMonth)} className="flex-1">
                  View Special Requests
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
                Daily Reports - {new Date(selectedMonth + "-01").toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                })}
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-2">
                Read-only view of archived reports
              </p>
            </CardHeader>
            <CardContent>
              {isLoadingReports ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary mx-auto mb-2" />
                  <p className="text-muted-foreground">Loading reports...</p>
                </div>
              ) : archivedReports.length === 0 ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>No archived reports found for this month</AlertDescription>
                </Alert>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Employee</TableHead>
                        <TableHead>Department</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Work Summary</TableHead>
                        <TableHead>Attachments</TableHead>
                        <TableHead>Submitted</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {archivedReports.map((report: DailyReportPreview) => (
                        <TableRow key={report.id}>
                          <TableCell className="font-semibold">
                            {report.user.firstName} {report.user.lastName}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{report.user.department}</Badge>
                          </TableCell>
                          <TableCell>{new Date(report.date).toLocaleDateString()}</TableCell>
                          <TableCell className="max-w-xs truncate text-sm text-muted-foreground">
                            {report.workDetails}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
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
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(report.createdAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-right">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setSelectedReportDetail(report)}
                                >
                                  View
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-2xl">
                                <DialogHeader>
                                  <DialogTitle>
                                    Report - {selectedReportDetail?.user.firstName}{" "}
                                    {selectedReportDetail?.user.lastName}
                                  </DialogTitle>
                                </DialogHeader>
                                {selectedReportDetail && (
                                  <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4 pb-4 border-b">
                                      <div>
                                        <p className="text-sm text-muted-foreground">Employee</p>
                                        <p className="font-semibold">
                                          {selectedReportDetail.user.firstName}{" "}
                                          {selectedReportDetail.user.lastName}
                                        </p>
                                      </div>
                                      <div>
                                        <p className="text-sm text-muted-foreground">Department</p>
                                        <p className="font-semibold">
                                          {selectedReportDetail.user.department}
                                        </p>
                                      </div>
                                      <div>
                                        <p className="text-sm text-muted-foreground">Report Date</p>
                                        <p className="font-semibold">
                                          {new Date(selectedReportDetail.date).toLocaleDateString()}
                                        </p>
                                      </div>
                                      <div>
                                        <p className="text-sm text-muted-foreground">Submitted</p>
                                        <p className="font-semibold text-sm">
                                          {new Date(
                                            selectedReportDetail.createdAt
                                          ).toLocaleDateString()}
                                        </p>
                                      </div>
                                    </div>
                                    <div>
                                      <h3 className="font-semibold mb-2">Work Details</h3>
                                      <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
                                        <p className="text-sm whitespace-pre-wrap">
                                          {selectedReportDetail.workDetails}
                                        </p>
                                      </div>
                                    </div>
                                    <div className="pt-2 text-sm text-muted-foreground italic">
                                      This is an archived record and is read-only.
                                    </div>
                                  </div>
                                )}
                              </DialogContent>
                            </Dialog>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
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
                Special Requests - {new Date(selectedMonth + "-01").toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                })}
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-2">
                Read-only view of archived requests
              </p>
            </CardHeader>
            <CardContent>
              {isLoadingRequests ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary mx-auto mb-2" />
                  <p className="text-muted-foreground">Loading requests...</p>
                </div>
              ) : archivedRequests.length === 0 ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>No archived requests found for this month</AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-3">
                  {archivedRequests.map((request: SpecialRequestPreview) => (
                    <div
                      key={request.id}
                      className="p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold">{request.title}</h3>
                          <p className="text-sm text-muted-foreground mt-1">
                            {request.user.firstName} {request.user.lastName}
                          </p>
                          <p className="text-xs text-muted-foreground mt-2">
                            {new Date(request.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge variant="outline" className="whitespace-nowrap">
                          {request.status.replace(/_/g, " ").toUpperCase()}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {archivedRequests.length > 0 && (
                <div className="pt-4 text-sm text-muted-foreground italic border-t mt-4">
                  This is an archived view and is read-only.
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
