import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, MessageSquare, Check, X } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const statusColors: Record<string, string> = {
  sent_for_approval: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  approved: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  not_approved: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  revision: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  resolved: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
};

export default function AdminSpecialRequestsPage() {
  const { toast } = useToast();
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().substring(0, 7));
  const [selectedStatus, setSelectedStatus] = useState("sent_for_approval");
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [responseComment, setResponseComment] = useState("");
  const [responseStatus, setResponseStatus] = useState("");

  // Get requests by status and month
  const { data: requests = [], isLoading, refetch } = useQuery({
    queryKey: ["admin-requests", selectedMonth, selectedStatus],
    queryFn: async () => {
      const res = await apiRequest(
        "GET",
        `/api/admin/requests/special?month=${selectedMonth}&status=${selectedStatus}`
      );
      if (!res.ok) throw new Error("Failed to fetch requests");
      return res.json();
    },
  });

  // Get comments for selected request
  const { data: comments = [], refetch: refetchComments } = useQuery({
    queryKey: ["admin-request-comments", selectedRequest?.id],
    queryFn: async () => {
      if (!selectedRequest?.id) return [];
      const res = await apiRequest(
        "GET",
        `/api/requests/special/${selectedRequest.id}/comments`
      );
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!selectedRequest?.id,
  });

  // Add response mutation
  const respondMutation = useMutation({
    mutationFn: async () => {
      if (!selectedRequest?.id) throw new Error("No request selected");
      const res = await apiRequest(
        "POST",
        `/api/requests/special/${selectedRequest.id}/comments`,
        {
          comment: responseComment,
          statusChange: responseStatus || undefined,
        }
      );
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Response added successfully!",
      });
      setResponseComment("");
      setResponseStatus("");
      refetchComments();
      refetch();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add response",
        variant: "destructive",
      });
    },
  });

  const handleViewRequest = (request: any) => {
    setSelectedRequest(request);
    setIsDetailsOpen(true);
  };

  const pendingCount = requests.filter((r: any) => r.status === "sent_for_approval").length;
  const approvedCount = requests.filter((r: any) => r.status === "approved").length;
  const rejectedCount = requests.filter((r: any) => r.status === "not_approved").length;
  const revisionCount = requests.filter((r: any) => r.status === "revision").length;

  return (
    <div className="flex-1 p-8">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Special Requests</h1>
          <p className="text-muted-foreground mt-2">
            Manage employee special requests, leave applications, and other requests.
          </p>
        </div>

        {/* Stats */}
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-blue-600">{pendingCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Approved</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-600">{approvedCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Rejected</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-red-600">{rejectedCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">In Revision</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-yellow-600">{revisionCount}</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Filter Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="month">Select Month</Label>
                <Input
                  id="month"
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sent_for_approval">Pending Approval</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="not_approved">Rejected</SelectItem>
                    <SelectItem value="revision">In Revision</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Requests List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Requests ({requests.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary mx-auto mb-2" />
                <p className="text-muted-foreground">Loading requests...</p>
              </div>
            ) : requests.length === 0 ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  No requests found with status "{selectedStatus.replace(/_/g, " ")}" for {selectedMonth}
                </AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-3">
                {requests.map((request: any) => (
                  <div
                    key={request.id}
                    className="flex items-start justify-between p-4 border rounded-lg hover:bg-accent transition-colors"
                  >
                    <div className="flex-1">
                      <h3 className="font-semibold">{request.title}</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        <span className="font-medium">
                          {request.user.firstName} {request.user.lastName}
                        </span>
                        {" • "}
                        {request.user.department}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {request.details}
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {new Date(request.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <Badge className={statusColors[request.status]}>
                        {request.status.replace(/_/g, " ").toUpperCase()}
                      </Badge>
                      <Dialog open={isDetailsOpen && selectedRequest?.id === request.id} onOpenChange={setIsDetailsOpen}>
                        <DialogTrigger asChild>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleViewRequest(request)}
                          >
                            View
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>{selectedRequest?.title}</DialogTitle>
                          </DialogHeader>
                          {selectedRequest && (
                            <div className="space-y-6">
                              {/* Request Info */}
                              <div className="grid grid-cols-2 gap-4 pb-4 border-b">
                                <div>
                                  <p className="text-sm text-muted-foreground">Employee</p>
                                  <p className="font-semibold">
                                    {selectedRequest.user.firstName} {selectedRequest.user.lastName}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-sm text-muted-foreground">Department</p>
                                  <p className="font-semibold">{selectedRequest.user.department}</p>
                                </div>
                                <div>
                                  <p className="text-sm text-muted-foreground">Status</p>
                                  <Badge className={statusColors[selectedRequest.status]}>
                                    {selectedRequest.status.replace(/_/g, " ").toUpperCase()}
                                  </Badge>
                                </div>
                                <div>
                                  <p className="text-sm text-muted-foreground">Submitted</p>
                                  <p className="font-semibold text-sm">
                                    {new Date(selectedRequest.createdAt).toLocaleDateString()}
                                  </p>
                                </div>
                              </div>

                              {/* Details */}
                              <div>
                                <h3 className="font-semibold mb-2">Request Details</h3>
                                <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
                                  <p className="text-sm whitespace-pre-wrap">{selectedRequest.details}</p>
                                </div>
                              </div>

                              {/* Comments */}
                              <div>
                                <h3 className="font-semibold mb-3">Conversation Thread</h3>
                                <div className="space-y-3 max-h-64 overflow-y-auto mb-4">
                                  {comments.length === 0 ? (
                                    <p className="text-sm text-muted-foreground text-center py-4">
                                      No comments yet
                                    </p>
                                  ) : (
                                    comments.map((comment: any) => (
                                      <div
                                        key={comment.id}
                                        className={`p-3 rounded-lg text-sm ${
                                          comment.isAdminComment
                                            ? "bg-blue-50 dark:bg-blue-950 border-l-4 border-blue-500"
                                            : "bg-gray-50 dark:bg-gray-900"
                                        }`}
                                      >
                                        <p className="font-semibold text-xs mb-1">
                                          {comment.isAdminComment ? "Admin" : "Employee"}
                                        </p>
                                        <p className="whitespace-pre-wrap">{comment.comment}</p>
                                        {comment.statusChange && (
                                          <p className="text-xs text-muted-foreground mt-2">
                                            Status changed to: {comment.statusChange}
                                          </p>
                                        )}
                                      </div>
                                    ))
                                  )}
                                </div>
                              </div>

                              {/* Admin Response */}
                              <div className="pt-4 border-t space-y-3">
                                <h3 className="font-semibold">Add Response</h3>
                                <Textarea
                                  value={responseComment}
                                  onChange={(e) => setResponseComment(e.target.value)}
                                  placeholder="Type your response or revision request..."
                                  rows={3}
                                />
                                <div className="space-y-2">
                                  <Label className="text-sm">Change Status (Optional)</Label>
                                  <Select value={responseStatus} onValueChange={setResponseStatus}>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Keep current status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="approved">Approve</SelectItem>
                                      <SelectItem value="not_approved">Reject</SelectItem>
                                      <SelectItem value="revision">Request Revision</SelectItem>
                                      <SelectItem value="resolved">Mark Resolved</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <Button
                                  onClick={() => respondMutation.mutate()}
                                  disabled={respondMutation.isPending || !responseComment.trim()}
                                  className="w-full"
                                >
                                  {respondMutation.isPending ? "Sending..." : "Send Response"}
                                </Button>
                              </div>
                            </div>
                          )}
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
