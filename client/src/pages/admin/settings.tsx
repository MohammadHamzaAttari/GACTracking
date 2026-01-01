import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Settings,
  Clock,
  Bell,
  Shield,
  Building,
  MessageSquare,
  Loader2,
  CheckCircle2,
  XCircle,
  Send,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { WasenderConfig } from "@shared/schema";

const wasenderFormSchema = z.object({
  instanceId: z.string().min(1, "Instance ID is required"),
  apiToken: z.string().min(1, "API Token is required"),
  groupId: z.string().min(1, "Group ID is required"),
  isActive: z.boolean().default(false),
});

type WasenderFormData = z.infer<typeof wasenderFormSchema>;

export default function SettingsPage() {
  const [wasenderDialogOpen, setWasenderDialogOpen] = useState(false);
  const { toast } = useToast();

  const { data: wasenderConfig, isLoading: configLoading } = useQuery<WasenderConfig>({
    queryKey: ["/api/admin/wasender-config"],
  });

  const wasenderForm = useForm<WasenderFormData>({
    resolver: zodResolver(wasenderFormSchema),
    defaultValues: {
      instanceId: wasenderConfig?.instanceId || "",
      apiToken: "",
      groupId: wasenderConfig?.groupId || "",
      isActive: wasenderConfig?.isActive || false,
    },
  });

  const updateWasenderMutation = useMutation({
    mutationFn: async (data: WasenderFormData) => {
      const res = await apiRequest("POST", "/api/admin/wasender-config", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/wasender-config"] });
      setWasenderDialogOpen(false);
      toast({ title: "WASENDER configuration updated" });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update configuration",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const testWasenderMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/wasender-test");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/wasender-config"] });
      toast({ title: "Connection test successful!" });
    },
    onError: (error: Error) => {
      toast({
        title: "Connection test failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onWasenderSubmit = (data: WasenderFormData) => {
    updateWasenderMutation.mutate(data);
  };

  const handleOpenWasenderDialog = () => {
    wasenderForm.reset({
      instanceId: wasenderConfig?.instanceId || "",
      apiToken: "",
      groupId: wasenderConfig?.groupId || "",
      isActive: wasenderConfig?.isActive || false,
    });
    setWasenderDialogOpen(true);
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="space-y-6 p-1">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Settings</h1>
          <p className="text-muted-foreground text-sm">
            Configure your attendance system
          </p>
        </div>

        <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              WASENDER WhatsApp Integration
            </CardTitle>
            <CardDescription>
              Configure WhatsApp notifications for shift and break updates
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {configLoading ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading configuration...
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Label>Connection Status</Label>
                      {wasenderConfig?.isActive ? (
                        <Badge variant="secondary" className="bg-green-500/10 text-green-600 dark:text-green-400">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Connected
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-600 dark:text-yellow-400">
                          <XCircle className="h-3 w-3 mr-1" />
                          Not Configured
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {wasenderConfig?.instanceId 
                        ? `Instance: ${wasenderConfig.instanceId}${wasenderConfig?.groupId ? ` | Group: ${wasenderConfig.groupId}` : ''}`
                        : "No instance configured"
                      }
                    </p>
                    {wasenderConfig?.lastTested && (
                      <p className="text-xs text-muted-foreground">
                        Last tested: {new Date(wasenderConfig.lastTested).toLocaleString()}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {wasenderConfig?.instanceId && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => testWasenderMutation.mutate()}
                        disabled={testWasenderMutation.isPending}
                        data-testid="button-test-wasender"
                      >
                        {testWasenderMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <Send className="h-4 w-4 mr-2" />
                        )}
                        Test
                      </Button>
                    )}
                    <Dialog open={wasenderDialogOpen} onOpenChange={setWasenderDialogOpen}>
                      <DialogTrigger asChild>
                        <Button
                          size="sm"
                          onClick={handleOpenWasenderDialog}
                          data-testid="button-configure-wasender"
                        >
                          <Settings className="h-4 w-4 mr-2" />
                          Configure
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle className="flex items-center gap-2">
                            <MessageSquare className="h-5 w-5" />
                            WASENDER Configuration
                          </DialogTitle>
                          <DialogDescription>
                            Enter your WASENDER API credentials to enable WhatsApp notifications
                          </DialogDescription>
                        </DialogHeader>
                        <Form {...wasenderForm}>
                          <form onSubmit={wasenderForm.handleSubmit(onWasenderSubmit)} className="space-y-4">
                            <FormField
                              control={wasenderForm.control}
                              name="instanceId"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Instance ID</FormLabel>
                                  <FormControl>
                                    <Input placeholder="your-instance-id" {...field} data-testid="input-instance-id" />
                                  </FormControl>
                                  <FormDescription>
                                    Your WASENDER instance identifier
                                  </FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={wasenderForm.control}
                              name="apiToken"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>API Token</FormLabel>
                                  <FormControl>
                                    <Input 
                                      type="password" 
                                      placeholder="Enter your API token" 
                                      {...field} 
                                      data-testid="input-api-token" 
                                    />
                                  </FormControl>
                                  <FormDescription>
                                    Your WASENDER API authentication token
                                  </FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={wasenderForm.control}
                              name="groupId"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Group ID (To)</FormLabel>
                                  <FormControl>
                                    <Input 
                                      placeholder="WhatsApp group ID" 
                                      {...field} 
                                      data-testid="input-group-id" 
                                    />
                                  </FormControl>
                                  <FormDescription>
                                    The WhatsApp group ID to send notifications to (used as 'to' parameter)
                                  </FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={wasenderForm.control}
                              name="isActive"
                              render={({ field }) => (
                                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                                  <div className="space-y-0.5">
                                    <FormLabel className="text-base">Enable Notifications</FormLabel>
                                    <FormDescription>
                                      Send WhatsApp notifications for shifts and breaks
                                    </FormDescription>
                                  </div>
                                  <FormControl>
                                    <Switch
                                      checked={field.value}
                                      onCheckedChange={field.onChange}
                                      data-testid="switch-wasender-active"
                                    />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                            <div className="flex justify-end gap-2">
                              <Button type="button" variant="outline" onClick={() => setWasenderDialogOpen(false)}>
                                Cancel
                              </Button>
                              <Button
                                type="submit"
                                disabled={updateWasenderMutation.isPending}
                                data-testid="button-save-wasender"
                              >
                                {updateWasenderMutation.isPending && (
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                )}
                                Save Configuration
                              </Button>
                            </div>
                          </form>
                        </Form>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5" />
              Organization Settings
            </CardTitle>
            <CardDescription>
              Configure your organization details
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="org-name">Organization Name</Label>
                <Input
                  id="org-name"
                  defaultValue="GAC Trackings"
                  data-testid="input-org-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="timezone">Timezone</Label>
                <Select defaultValue="pkt">
                  <SelectTrigger data-testid="select-timezone">
                    <SelectValue placeholder="Select timezone" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pkt">Pakistan Time (PKT)</SelectItem>
                    <SelectItem value="utc">UTC</SelectItem>
                    <SelectItem value="est">Eastern Time (EST)</SelectItem>
                    <SelectItem value="pst">Pacific Time (PST)</SelectItem>
                    <SelectItem value="ist">India Standard Time (IST)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Work Hours
            </CardTitle>
            <CardDescription>
              Define standard work hours and late threshold
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="start-time">Work Start Time</Label>
                <Input
                  id="start-time"
                  type="time"
                  defaultValue="09:00"
                  data-testid="input-start-time"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end-time">Work End Time</Label>
                <Input
                  id="end-time"
                  type="time"
                  defaultValue="18:00"
                  data-testid="input-end-time"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="late-threshold">Late After (minutes)</Label>
                <Input
                  id="late-threshold"
                  type="number"
                  defaultValue="15"
                  data-testid="input-late-threshold"
                />
              </div>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label>Weekend Working</Label>
                <p className="text-sm text-muted-foreground">
                  Allow attendance tracking on weekends
                </p>
              </div>
              <Switch data-testid="switch-weekend" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notifications
            </CardTitle>
            <CardDescription>
              Configure notification preferences
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label>Email Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Receive daily attendance summaries
                </p>
              </div>
              <Switch defaultChecked data-testid="switch-email-notifications" />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label>Absence Alerts</Label>
                <p className="text-sm text-muted-foreground">
                  Get notified when employees are absent
                </p>
              </div>
              <Switch defaultChecked data-testid="switch-absence-alerts" />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label>Late Arrival Alerts</Label>
                <p className="text-sm text-muted-foreground">
                  Get notified when employees arrive late
                </p>
              </div>
              <Switch data-testid="switch-late-alerts" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Security
            </CardTitle>
            <CardDescription>
              Security and access settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label>Require Location</Label>
                <p className="text-sm text-muted-foreground">
                  Require location verification for clock in/out
                </p>
              </div>
              <Switch data-testid="switch-location" />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label>IP Restriction</Label>
                <p className="text-sm text-muted-foreground">
                  Only allow clock in from office network
                </p>
              </div>
              <Switch data-testid="switch-ip-restriction" />
            </div>
          </CardContent>
        </Card>

          <div className="flex justify-end">
            <Button data-testid="button-save-settings">
              <Settings className="h-4 w-4 mr-2" />
              Save Settings
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
