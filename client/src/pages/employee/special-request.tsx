// client/src/pages/employee/special-request.tsx
import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Send,
  MessageCircle,
  RefreshCw,
  Plus,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  RotateCcw,
  Loader2,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

const statusConfig: Record<string, { label: string; color: string; icon: any; bgColor: string }> = {
  sent_for_approval: {
    label: "Pending",
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-100 dark:bg-blue-900/30",
    icon: Clock,
  },
  approved: {
    label: "Approved",
    color: "text-green-600 dark:text-green-400",
    bgColor: "bg-green-100 dark:bg-green-900/30",
    icon: CheckCircle,
  },
  not_approved: {
    label: "Rejected",
    color: "text-red-600 dark:text-red-400",
    bgColor: "bg-red-100 dark:bg-red-900/30",
    icon: XCircle,
  },
  revision: {
    label: "Revision",
    color: "text-yellow-600 dark:text-yellow-400",
    bgColor: "bg-yellow-100 dark:bg-yellow-900/30",
    icon: RotateCcw,
  },
  resolved: {
    label: "Resolved",
    color: "text-gray-600 dark:text-gray-400",
    bgColor: "bg-gray-100 dark:bg-gray-900/30",
    icon: CheckCircle,
  },
};

export default function SpecialRequestPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const currentMonth = new Date().toISOString().substring(0, 7);

  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState("");
  const [newRequestOpen, setNewRequestOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");

  // Fetch requests
  const {
    data: myRequests = [],
    isLoading,
    refetch: refetchRequests,
  } = useQuery({
    queryKey: ["my-special-requests", currentMonth],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/requests/special/my?month=${currentMonth}`);
      if (!res.ok) throw new Error("Failed to fetch requests");
      return res.json();
    },
    refetchInterval: 10000,
  });

  // Fetch comments
  const {
    data: comments = [],
    refetch: refetchComments,
    isLoading: commentsLoading,
  } = useQuery({
    queryKey: ["request-comments", selectedRequestId],
    queryFn: async () => {
      if (!selectedRequestId) return [];
      const res = await apiRequest("GET", `/api/requests/special/${selectedRequestId}/comments`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!selectedRequestId,
    refetchInterval: 5000,
  });

  const selectedRequest = myRequests.find((r: any) => r.id === selectedRequestId);

  // Create request mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/requests/special", {
        title,
        details,
        month: currentMonth,
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Request submitted successfully!" });
      setTitle("");
      setDetails("");
      setNewRequestOpen(false);
      refetchRequests();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Add comment mutation
  const addCommentMutation = useMutation({
    mutationFn: async () => {
      if (!selectedRequestId) throw new Error("No request selected");
      const res = await apiRequest("POST", `/api/requests/special/${selectedRequestId}/comments`, {
        comment: commentText,
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Reply sent!" });
      setCommentText("");
      refetchComments();
      refetchRequests();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Auto-select first request
  useEffect(() => {
    if (myRequests.length > 0 && !selectedRequestId) {
      setSelectedRequestId(myRequests[0].id);
    }
  }, [myRequests, selectedRequestId]);

  // Stats
  const stats = {
    total: myRequests.length,
    pending: myRequests.filter((r: any) => r.status === "sent_for_approval").length,
    approved: myRequests.filter((r: any) => r.status === "approved").length,
    rejected: myRequests.filter((r: any) => r.status === "not_approved").length,
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          <p className="text-sm text-slate-500">Loading requests...</p>
        </div>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Special Requests</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Submit and track your requests
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => refetchRequests()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button onClick={() => setNewRequestOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Request
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800">
                  <FileText className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total</p>
                  <p className="text-xl font-bold">{stats.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                  <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Pending</p>
                  <p className="text-xl font-bold text-blue-600">{stats.pending}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                  <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Approved</p>
                  <p className="text-xl font-bold text-green-600">{stats.approved}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
                  <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Rejected</p>
                  <p className="text-xl font-bold text-red-600">{stats.rejected}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        {myRequests.length === 0 ? (
          <Card className="py-12">
            <div className="text-center">
              <FileText className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium mb-2">No Requests Yet</h3>
              <p className="text-muted-foreground mb-4">
                You haven't submitted any special requests this month.
              </p>
              <Button onClick={() => setNewRequestOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Request
              </Button>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Request List - Left Side */}
            <div className="lg:col-span-4">
              <Card className="h-[600px] flex flex-col">
                <CardHeader className="pb-3 shrink-0">
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Your Requests
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 p-0 overflow-hidden">
                  <ScrollArea className="h-full">
                    <div className="p-4 space-y-2">
                      {myRequests.map((request: any) => {
                        const config = statusConfig[request.status] || statusConfig.sent_for_approval;
                        const StatusIcon = config.icon;
                        return (
                          <div
                            key={request.id}
                            onClick={() => setSelectedRequestId(request.id)}
                            className={cn(
                              "p-4 rounded-lg border cursor-pointer transition-all hover:shadow-md",
                              selectedRequestId === request.id
                                ? "border-primary bg-primary/5 shadow-sm"
                                : "border-border hover:border-primary/50"
                            )}
                          >
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <h4 className="font-medium text-sm line-clamp-1 flex-1">
                                {request.title}
                              </h4>
                              <Badge variant="secondary" className={cn("shrink-0 text-xs", config.bgColor, config.color)}>
                                <StatusIcon className="w-3 h-3 mr-1" />
                                {config.label}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                              {request.details}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(request.createdAt), "MMM d, yyyy")}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>

            {/* Conversation Thread - Right Side */}
            <div className="lg:col-span-8">
              {selectedRequest ? (
                <Card className="h-[600px] flex flex-col">
                  {/* Header */}
                  <CardHeader className="pb-3 shrink-0 border-b">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg truncate">{selectedRequest.title}</CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                          Submitted on {format(new Date(selectedRequest.createdAt), "MMMM d, yyyy 'at' h:mm a")}
                        </p>
                      </div>
                      {(() => {
                        const config = statusConfig[selectedRequest.status];
                        const StatusIcon = config.icon;
                        return (
                          <Badge className={cn("shrink-0", config.bgColor, config.color)}>
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {config.label}
                          </Badge>
                        );
                      })()}
                    </div>
                  </CardHeader>

                  {/* Messages */}
                  <CardContent className="flex-1 p-0 overflow-hidden">
                    <ScrollArea className="h-full">
                      <div className="p-4 space-y-4">
                        {/* Original Request */}
                        <div className="flex justify-end">
                          <div className="max-w-[85%] rounded-2xl rounded-tr-md bg-primary text-primary-foreground p-4">
                            <p className="text-xs font-medium opacity-80 mb-2">Your Request</p>
                            <p className="text-sm whitespace-pre-wrap">{selectedRequest.details}</p>
                            <p className="text-xs opacity-60 mt-2 text-right">
                              {format(new Date(selectedRequest.createdAt), "h:mm a")}
                            </p>
                          </div>
                        </div>

                        {/* Comments */}
                        {commentsLoading ? (
                          <div className="flex justify-center py-8">
                            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                          </div>
                        ) : comments.length === 0 ? (
                          <div className="text-center py-8">
                            <MessageCircle className="w-10 h-10 mx-auto text-muted-foreground/30 mb-2" />
                            <p className="text-sm text-muted-foreground">
                              Waiting for admin response...
                            </p>
                          </div>
                        ) : (
                          comments.map((comment: any) => (
                            <div
                              key={comment.id}
                              className={cn("flex", comment.isAdminComment ? "justify-start" : "justify-end")}
                            >
                              <div
                                className={cn(
                                  "max-w-[85%] rounded-2xl p-4",
                                  comment.isAdminComment
                                    ? "rounded-tl-md bg-blue-100 dark:bg-blue-900/40"
                                    : "rounded-tr-md bg-slate-100 dark:bg-slate-800"
                                )}
                              >
                                <p className={cn(
                                  "text-xs font-medium mb-2",
                                  comment.isAdminComment ? "text-blue-600 dark:text-blue-400" : "text-muted-foreground"
                                )}>
                                  {comment.isAdminComment ? "👔 Admin Response" : "You"}
                                </p>
                                <p className="text-sm whitespace-pre-wrap">{comment.comment}</p>
                                
                                {comment.statusChange && (
                                  <div className="mt-3 pt-2 border-t border-current/10">
                                    {(() => {
                                      const config = statusConfig[comment.statusChange];
                                      return (
                                        <Badge className={cn("text-xs", config?.bgColor, config?.color)}>
                                          Status: {config?.label || comment.statusChange}
                                        </Badge>
                                      );
                                    })()}
                                  </div>
                                )}
                                
                                <p className="text-xs text-muted-foreground mt-2 text-right">
                                  {format(new Date(comment.createdAt), "MMM d, h:mm a")}
                                </p>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </ScrollArea>
                  </CardContent>

                  {/* Reply Input */}
                  <div className="p-4 border-t shrink-0">
                    {selectedRequest.status === "resolved" ? (
                      <Alert>
                        <CheckCircle className="h-4 w-4" />
                        <AlertDescription>
                          This request has been resolved.
                        </AlertDescription>
                      </Alert>
                    ) : (
                      <div className="flex gap-3">
                        <Textarea
                          value={commentText}
                          onChange={(e) => setCommentText(e.target.value)}
                          placeholder="Type your reply..."
                          rows={2}
                          className="flex-1 resize-none"
                        />
                        <Button
                          onClick={() => addCommentMutation.mutate()}
                          disabled={addCommentMutation.isPending || !commentText.trim()}
                          className="self-end"
                        >
                          {addCommentMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Send className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                </Card>
              ) : (
                <Card className="h-[600px] flex items-center justify-center">
                  <div className="text-center">
                    <MessageCircle className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
                    <p className="text-muted-foreground">Select a request to view conversation</p>
                  </div>
                </Card>
              )}
            </div>
          </div>
        )}

        {/* New Request Dialog */}
        <Dialog open={newRequestOpen} onOpenChange={setNewRequestOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                New Special Request
              </DialogTitle>
              <DialogDescription>
                Submit a request for leave, remote work, or other arrangements.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="title">
                  Title <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Leave Request - 3 Days"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="details">
                  Details <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="details"
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  placeholder="Provide complete details including dates, reasons, and any relevant information..."
                  rows={5}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setNewRequestOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => createMutation.mutate()}
                disabled={createMutation.isPending || !title.trim() || !details.trim()}
              >
                {createMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Send className="w-4 h-4 mr-2" />
                )}
                Submit Request
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </ScrollArea>
  );
}