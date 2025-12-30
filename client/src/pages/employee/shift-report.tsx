import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { AlertCircle, FileText, Plus, X } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function ShiftReportPage() {
  const { toast } = useToast();
  const today = new Date().toISOString().split("T")[0];

  // Form state
  const [workDetails, setWorkDetails] = useState("");
  const [notes, setNotes] = useState("");
  const [loomVideos, setLoomVideos] = useState<string[]>([]);
  const [references, setReferences] = useState<string[]>([]);
  const [newVideoLink, setNewVideoLink] = useState("");
  const [newReference, setNewReference] = useState("");

  // Get today's shift
  const { data: todayShift, isLoading: shiftLoading } = useQuery({
    queryKey: ["shift", today],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/shifts/${today}`);
      return res.json();
    },
  });

  // Check if report already exists
  const { data: existingReport } = useQuery({
    queryKey: ["report", todayShift?.id],
    queryFn: async () => {
      if (!todayShift?.id) return null;
      const res = await apiRequest("GET", `/api/reports/daily/shift/${todayShift.id}`);
      if (res.ok) return res.json();
      return null;
    },
    enabled: !!todayShift?.id,
  });

  // Submit report mutation
  const submitMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/reports/daily", {
        shiftId: todayShift.id,
        date: today,
        workDetails,
        notes: notes || null,
        loomVideos: loomVideos.length > 0 ? JSON.stringify(loomVideos) : null,
        references: references.length > 0 ? JSON.stringify(references) : null,
        month: new Date().toISOString().substring(0, 7), // YYYY-MM format
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Daily shift report submitted successfully!",
      });
      // Reset form
      setWorkDetails("");
      setNotes("");
      setLoomVideos([]);
      setReferences([]);
    },
    onError: (error) => {
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

  if (shiftLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading shift information...</p>
        </div>
      </div>
    );
  }

  if (!todayShift) {
    return (
      <div className="flex-1 p-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>No active shift found for today. Please start your shift first.</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (existingReport) {
    return (
      <div className="flex-1 p-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Daily Shift Report
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                You have already submitted a report for today ({today}). 
                {existingReport.updatedAt && ` Last updated: ${new Date(existingReport.updatedAt).toLocaleTimeString()}`}
              </AlertDescription>
            </Alert>
            <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
              <h3 className="font-semibold mb-2">Work Details:</h3>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{existingReport.workDetails}</p>
              {existingReport.notes && (
                <>
                  <h3 className="font-semibold mt-4 mb-2">Notes:</h3>
                  <p className="text-sm text-muted-foreground">{existingReport.notes}</p>
                </>
              )}
              {existingReport.loomVideos && JSON.parse(existingReport.loomVideos).length > 0 && (
                <>
                  <h3 className="font-semibold mt-4 mb-2">Video Links:</h3>
                  <ul className="list-disc list-inside space-y-1">
                    {JSON.parse(existingReport.loomVideos).map((video: string, i: number) => (
                      <li key={i}>
                        <a href={video} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-sm">
                          {video}
                        </a>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex-1 p-8">
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Daily Shift Report
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-2">
            Shift Date: <span className="font-semibold">{today}</span>
          </p>
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
              <Label htmlFor="workDetails" className="text-base font-semibold">
                Work Details <span className="text-red-500">*</span>
              </Label>
              <p className="text-sm text-muted-foreground">
                Describe what you worked on today, tasks completed, progress updates, etc.
              </p>
              <Textarea
                id="workDetails"
                value={workDetails}
                onChange={(e) => setWorkDetails(e.target.value)}
                placeholder="Enter detailed information about your day's work..."
                rows={6}
                required
                className="min-h-[150px]"
              />
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes" className="text-base font-semibold">
                Additional Notes <span className="text-gray-400">(Optional)</span>
              </Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any additional notes or information..."
                rows={3}
              />
            </div>

            {/* Loom Videos */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">
                Loom Video Links <span className="text-gray-400">(Optional)</span>
              </Label>
              <div className="flex gap-2">
                <Input
                  value={newVideoLink}
                  onChange={(e) => setNewVideoLink(e.target.value)}
                  placeholder="Paste Loom video link..."
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addVideoLink();
                    }
                  }}
                />
                <Button type="button" onClick={addVideoLink} size="sm" variant="outline">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {loomVideos.length > 0 && (
                <div className="space-y-2">
                  {loomVideos.map((video, index) => (
                    <div key={index} className="flex items-center justify-between bg-gray-50 dark:bg-gray-900 p-2 rounded">
                      <a href={video} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline truncate">
                        {video}
                      </a>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => removeVideoLink(index)}
                        className="h-6 w-6 p-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* References */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">
                Reference Links <span className="text-gray-400">(Optional)</span>
              </Label>
              <div className="flex gap-2">
                <Input
                  value={newReference}
                  onChange={(e) => setNewReference(e.target.value)}
                  placeholder="Add reference link..."
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addReference();
                    }
                  }}
                />
                <Button type="button" onClick={addReference} size="sm" variant="outline">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {references.length > 0 && (
                <div className="space-y-2">
                  {references.map((ref, index) => (
                    <div key={index} className="flex items-center justify-between bg-gray-50 dark:bg-gray-900 p-2 rounded">
                      <a href={ref} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline truncate">
                        {ref}
                      </a>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => removeReference(index)}
                        className="h-6 w-6 p-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={submitMutation.isPending || !workDetails.trim()}
            >
              {submitMutation.isPending ? "Submitting..." : "Submit Report"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
