import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Send, MessageCircle, Check, X } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const statusColors: Record<string, string> = {
  sent_for_approval: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  approved: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  not_approved: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  revision: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  resolved: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
};

export default function SpecialRequestPage() {
  const { toast } = useToast();
  const currentMonth = new Date().toISOString().substring(0, 7);

  // Form state for new request
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [selectedRequest, setSelectedRequest] = useState<string | null>(null);

  // Get my requests
  const { data: myRequests = [], isLoading: requestsLoading, refetch: refetchRequests } = useQuery({
    queryKey: ["requests", "my", currentMonth],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/requests/special/my?month=${currentMonth}`);
      return res.json();
    },
  });

  // Get comments for selected request
  const { data: comments = [], refetch: refetchComments } = useQuery({
    queryKey: ["request-comments", selectedRequest],
    queryFn: async () => {
      if (!selectedRequest) return [];
      const res = await apiRequest("GET", `/api/requests/special/${selectedRequest}/comments`);
      return res.json();
    },
    enabled: !!selectedRequest,
  });

  // Create request mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/requests/special", {
        title,
        details,
        month: currentMonth,
        status: "sent_for_approval",
        archived: false,
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Special request submitted successfully!",
      });
      setTitle("");
      setDetails("");
      refetchRequests();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to submit request",
        variant: "destructive",
      });
    },
  });

  // Add comment mutation
  const [commentText, setCommentText] = useState("");
  const addCommentMutation = useMutation({
    mutationFn: async () => {
      if (!selectedRequest) throw new Error("No request selected");
      const res = await apiRequest("POST", `/api/requests/special/${selectedRequest}/comments`, {
        comment: commentText,
        isAdminComment: false,
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Comment added successfully!",
      });
      setCommentText("");
      refetchComments();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add comment",
        variant: "destructive",
      });
    },
  });

  if (requestsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading requests...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-8">
      <Tabs defaultValue="new" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="new">New Request</TabsTrigger>
          <TabsTrigger value="history">Request History ({myRequests.length})</TabsTrigger>
        </TabsList>

        {/* New Request Tab */}
        <TabsContent value="new" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Submit Special Request</CardTitle>
              <p className="text-sm text-muted-foreground mt-2">
                Submit a new request for leave, remote work, or other special arrangements.
              </p>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  createMutation.mutate();
                }}
                className="space-y-6"
              >
                {/* Title */}
                <div className="space-y-2">
                  <Label htmlFor="title" className="text-base font-semibold">
                    Request Title <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., 'Leave Request - 3 Days'"
                    required
                  />
                </div>

                {/* Details */}
                <div className="space-y-2">
                  <Label htmlFor="details" className="text-base font-semibold">
                    Request Details <span className="text-red-500">*</span>
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Provide complete details about your request including dates, reasons, and any other relevant information.
                  </p>
                  <Textarea
                    id="details"
                    value={details}
                    onChange={(e) => setDetails(e.target.value)}
                    placeholder="Explain your request in detail..."
                    rows={6}
                    required
                  />
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  size="lg"
                  className="w-full"
                  disabled={createMutation.isPending || !title.trim() || !details.trim()}
                >
                  {createMutation.isPending ? "Submitting..." : "Submit Request"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-4">
          {myRequests.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>No requests found for this month.</AlertDescription>
            </Alert>
          ) : (
            <div className="grid gap-4">
              {myRequests.map((request: any) => (
                <Card
                  key={request.id}
                  className={`cursor-pointer transition-all hover:shadow-lg ${
                    selectedRequest === request.id ? "ring-2 ring-primary" : ""
                  }`}
                  onClick={() => setSelectedRequest(request.id)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{request.title}</CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                          {new Date(request.createdAt).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                      <Badge className={statusColors[request.status]}>
                        {request.status.replace(/_/g, " ").toUpperCase()}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground line-clamp-2">{request.details}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Request Details & Comments */}
          {selectedRequest && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageCircle className="h-5 w-5" />
                  Request Conversation Thread
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Comments */}
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {comments.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No comments yet. Admin will respond to your request soon.
                    </p>
                  ) : (
                    comments.map((comment: any) => (
                      <div
                        key={comment.id}
                        className={`p-4 rounded-lg border ${
                          comment.isAdminComment
                            ? "bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800"
                            : "bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {comment.isAdminComment ? (
                              <>
                                <div className="h-8 w-8 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-bold">
                                  👔
                                </div>
                                <div>
                                  <p className="text-sm font-semibold">Admin</p>
                                </div>
                              </>
                            ) : (
                              <>
                                <div className="h-8 w-8 rounded-full bg-gray-500 text-white flex items-center justify-center text-xs font-bold">
                                  👤
                                </div>
                                <div>
                                  <p className="text-sm font-semibold">{comment.user.firstName} {comment.user.lastName}</p>
                                </div>
                              </>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {new Date(comment.createdAt).toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="text-sm whitespace-pre-wrap">{comment.comment}</p>
                        {comment.statusChange && (
                          <div className="mt-2 pt-2 border-t border-current opacity-50">
                            <p className="text-xs font-semibold flex items-center gap-1">
                              Status: {comment.statusChange.replace(/_/g, " ").toUpperCase()}
                            </p>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>

                {/* Add Comment */}
                <div className="pt-4 border-t space-y-3">
                  <Label className="text-sm font-semibold">Add Your Response</Label>
                  <Textarea
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Type your response..."
                    rows={3}
                  />
                  <Button
                    onClick={() => addCommentMutation.mutate()}
                    disabled={addCommentMutation.isPending || !commentText.trim()}
                    className="w-full"
                    size="sm"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    {addCommentMutation.isPending ? "Sending..." : "Send Response"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
