import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { User, Shield, Loader2 } from "lucide-react";
import { loginSchema, type LoginData } from "@shared/schema";
import { useAuth } from "@/lib/auth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { ThemeToggle } from "@/components/theme-toggle";
import companyLogo from "@assets/WhatsApp_Image_2025-08-19_at_14.24.16_1766314150496.jpeg";

export default function LoginPage() {
  const [selectedRole, setSelectedRole] = useState<"employee" | "admin">("employee");
  const [, navigate] = useLocation();
  const { login } = useAuth();
  const { toast } = useToast();

  const form = useForm<LoginData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
      role: "employee",
    },
  });

  const loginMutation = useMutation({
    mutationFn: async (data: LoginData) => {
      const res = await apiRequest("POST", "/api/auth/login", data);
      return res.json();
    },
    onSuccess: (data) => {
      login(data.user);
      if (data.user.role === "admin") {
        navigate("/admin");
      } else {
        navigate("/employee");
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Login Failed",
        description: error.message || "Invalid credentials",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: LoginData) => {
    loginMutation.mutate({ ...data, role: selectedRole });
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="flex items-center justify-end p-4">
        <ThemeToggle />
      </header>
      
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-md space-y-6">
          <div className="flex flex-col items-center space-y-4">
            <div className="flex items-center gap-3">
              <img 
                src={companyLogo} 
                alt="Company Logo" 
                className="h-14 w-14 rounded-md object-contain"
              />
              <div>
                <h1 className="text-2xl font-bold" data-testid="text-brand">GAC Trackings</h1>
              </div>
            </div>
            <div className="text-center">
              <h2 className="text-xl font-semibold" data-testid="text-title">Attendance System</h2>
              <p className="text-muted-foreground text-sm mt-1">Team Management Portal</p>
            </div>
          </div>

          <Card>
            <CardHeader className="pb-4">
              <div className="flex rounded-md border overflow-hidden">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedRole("employee");
                    form.setValue("role", "employee");
                  }}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 text-sm font-medium transition-colors ${
                    selectedRole === "employee"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted/50 text-muted-foreground hover-elevate"
                  }`}
                  data-testid="button-role-employee"
                >
                  <User className="h-4 w-4" />
                  Employee
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedRole("admin");
                    form.setValue("role", "admin");
                  }}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 text-sm font-medium transition-colors ${
                    selectedRole === "admin"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted/50 text-muted-foreground hover-elevate"
                  }`}
                  data-testid="button-role-admin"
                >
                  <Shield className="h-4 w-4" />
                  Admin
                </button>
              </div>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Username</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter your username"
                            {...field}
                            data-testid="input-username"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder="Enter your password"
                            {...field}
                            data-testid="input-password"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={loginMutation.isPending}
                    data-testid="button-login"
                  >
                    {loginMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Logging in...
                      </>
                    ) : (
                      `Login as ${selectedRole === "admin" ? "Admin" : "Employee"}`
                    )}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
