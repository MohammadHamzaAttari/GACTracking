// client/src/pages/admin/employees.tsx
import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Plus,
  Search,
  MoreVertical,
  Pencil,
  Trash2,
  UserPlus,
  Loader2,
  Users,
  Filter,
  Clock,
  Sun,
  Moon,
  Sunrise,
  Sunset,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { SafeUser } from "@shared/schema";
import { DEPARTMENTS } from "@shared/schema";
import { cn } from "@/lib/utils";

// Use a constant for "no selection" instead of empty string
const NO_DEPARTMENT = "_none_";

// Schema for creating a new employee (password required)
const createEmployeeSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(4, "Password must be at least 4 characters"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  department: z.string().optional(),
  position: z.string().optional(),
  role: z.enum(["admin", "employee"]).default("employee"),
  salary: z.coerce.number().optional().or(z.literal("")),
  shiftType: z.enum(["one_shift", "two_shifts", "open"]).default("one_shift"),
  // One Shift times
  shiftStartTime: z.string().optional(),
  shiftEndTime: z.string().optional(),
  // Two Shifts - Morning
  morningShiftStart: z.string().optional(),
  morningShiftEnd: z.string().optional(),
  // Two Shifts - Evening
  eveningShiftStart: z.string().optional(),
  eveningShiftEnd: z.string().optional(),
  phone: z.string().optional(),
  whatsappPreference: z.enum(["both", "breaks_only", "shift_reports_only", "none"]).default("both"),
  address: z.string().optional(),
  emergencyContact: z.string().optional(),
});

// Schema for updating an existing employee (password optional)
const updateEmployeeSchema = createEmployeeSchema.extend({
  password: z.string().min(4, "Password must be at least 4 characters").optional().or(z.literal("")),
});

type CreateEmployeeFormData = z.infer<typeof createEmployeeSchema>;
type UpdateEmployeeFormData = z.infer<typeof updateEmployeeSchema>;
type EmployeeFormData = CreateEmployeeFormData | UpdateEmployeeFormData;

function getInitials(firstName: string, lastName: string) {
  return `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase() || "U";
}

// Shift Type Display Component
function ShiftTypeCard({ 
  type, 
  selected, 
  onSelect,
  icon: Icon,
  title,
  description,
}: { 
  type: string;
  selected: boolean;
  onSelect: () => void;
  icon: any;
  title: string;
  description: string;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200",
        "hover:border-primary/50 hover:bg-primary/5",
        selected 
          ? "border-primary bg-primary/10 shadow-sm" 
          : "border-slate-200 dark:border-slate-800"
      )}
    >
      <div className={cn(
        "p-3 rounded-full",
        selected 
          ? "bg-primary text-white" 
          : "bg-slate-100 dark:bg-slate-800 text-slate-500"
      )}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="text-center">
        <p className={cn(
          "font-medium text-sm",
          selected ? "text-primary" : "text-slate-700 dark:text-slate-300"
        )}>
          {title}
        </p>
        <p className="text-xs text-slate-500 mt-0.5">{description}</p>
      </div>
    </button>
  );
}

// Time Input Component with Label
function TimeInputField({
  label,
  icon: Icon,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  icon: any;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="space-y-2">
      <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
        <Icon className="w-4 h-4 text-slate-400" />
        {label}
      </label>
      <Input
        type="time"
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        className="w-full"
        placeholder={placeholder}
      />
    </div>
  );
}

export default function EmployeesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<SafeUser | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<SafeUser | null>(null);
  const { toast } = useToast();

  const { data: employees, isLoading } = useQuery<SafeUser[]>({
    queryKey: ["/api/admin/employees"],
  });

  const form = useForm<EmployeeFormData>({
    resolver: zodResolver(editingUser ? updateEmployeeSchema : createEmployeeSchema),
    defaultValues: {
      username: "",
      password: "",
      firstName: "",
      lastName: "",
      email: "",
      department: NO_DEPARTMENT,
      position: "",
      role: "employee",
      salary: undefined,
      shiftType: "one_shift",
      shiftStartTime: "",
      shiftEndTime: "",
      morningShiftStart: "",
      morningShiftEnd: "",
      eveningShiftStart: "",
      eveningShiftEnd: "",
      phone: "",
      whatsappPreference: "both",
      address: "",
      emergencyContact: "",
    },
  });

  // Watch shift type to show/hide time fields
  const shiftType = useWatch({
    control: form.control,
    name: "shiftType",
  });

  const createMutation = useMutation({
    mutationFn: async (data: EmployeeFormData) => {
      const res = await apiRequest("POST", "/api/admin/employees", data);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to create employee");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/employees"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      setIsDialogOpen(false);
      form.reset();
      toast({ 
        title: "Success",
        description: "Employee created successfully",
        className: "bg-emerald-50 border-emerald-200 text-emerald-800",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create employee",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<EmployeeFormData> }) => {
      const res = await apiRequest("PATCH", `/api/admin/employees/${id}`, data);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to update employee");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/employees"] });
      setIsDialogOpen(false);
      setEditingUser(null);
      form.reset();
      toast({ 
        title: "Success",
        description: "Employee updated successfully",
        className: "bg-emerald-50 border-emerald-200 text-emerald-800",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update employee",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/admin/employees/${id}`);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to delete employee");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/employees"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      setDeleteDialogOpen(false);
      setUserToDelete(null);
      toast({ 
        title: "Success",
        description: "Employee deleted successfully",
        className: "bg-emerald-50 border-emerald-200 text-emerald-800",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete employee",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: EmployeeFormData) => {
    // Clean the data before sending
    const cleanedData: any = { ...data };
    
    // Convert NO_DEPARTMENT placeholder to null
    if (cleanedData.department === NO_DEPARTMENT || cleanedData.department === "") {
      cleanedData.department = null;
    }
    
    // Handle salary
    if (cleanedData.salary === "" || cleanedData.salary === undefined || isNaN(cleanedData.salary)) {
      cleanedData.salary = null;
    }
    
    // Clean shift times based on shift type
    if (cleanedData.shiftType === "open") {
      // Open shift - no times needed
      cleanedData.shiftStartTime = null;
      cleanedData.shiftEndTime = null;
      cleanedData.morningShiftStart = null;
      cleanedData.morningShiftEnd = null;
      cleanedData.eveningShiftStart = null;
      cleanedData.eveningShiftEnd = null;
    } else if (cleanedData.shiftType === "one_shift") {
      // One shift - only use main start/end times
      cleanedData.morningShiftStart = null;
      cleanedData.morningShiftEnd = null;
      cleanedData.eveningShiftStart = null;
      cleanedData.eveningShiftEnd = null;
    } else if (cleanedData.shiftType === "two_shifts") {
      // Two shifts - use morning and evening times, clear main times
      cleanedData.shiftStartTime = null;
      cleanedData.shiftEndTime = null;
    }
    
    // Clean empty strings for optional fields
    const optionalFields = [
      'email', 'position', 'phone', 'address', 'emergencyContact',
      'shiftStartTime', 'shiftEndTime',
      'morningShiftStart', 'morningShiftEnd',
      'eveningShiftStart', 'eveningShiftEnd'
    ];
    for (const field of optionalFields) {
      if (cleanedData[field] === "") {
        cleanedData[field] = null;
      }
    }
    
    if (editingUser) {
      // For update, remove password if empty
      if (!cleanedData.password || cleanedData.password === "") {
        delete cleanedData.password;
      }
      updateMutation.mutate({
        id: editingUser.id,
        data: cleanedData,
      });
    } else {
      createMutation.mutate(cleanedData);
    }
  };

  const handleEdit = (user: SafeUser) => {
    setEditingUser(user);
    form.reset({
      username: user.username,
      password: "",
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email || "",
      department: user.department || NO_DEPARTMENT,
      position: user.position || "",
      role: user.role as "admin" | "employee",
      salary: user.salary || undefined,
      shiftType: (user.shiftType as "one_shift" | "two_shifts" | "open") || "one_shift",
      shiftStartTime: user.shiftStartTime || "",
      shiftEndTime: user.shiftEndTime || "",
      morningShiftStart: (user as any).morningShiftStart || "",
      morningShiftEnd: (user as any).morningShiftEnd || "",
      eveningShiftStart: (user as any).eveningShiftStart || "",
      eveningShiftEnd: (user as any).eveningShiftEnd || "",
      phone: user.phone || "",
      whatsappPreference: (user.whatsappPreference as "both" | "breaks_only" | "shift_reports_only" | "none") || "both",
      address: user.address || "",
      emergencyContact: user.emergencyContact || "",
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (user: SafeUser) => {
    setUserToDelete(user);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (userToDelete) {
      deleteMutation.mutate(userToDelete.id);
    }
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingUser(null);
    form.reset({
      username: "",
      password: "",
      firstName: "",
      lastName: "",
      email: "",
      department: NO_DEPARTMENT,
      position: "",
      role: "employee",
      salary: undefined,
      shiftType: "one_shift",
      shiftStartTime: "",
      shiftEndTime: "",
      morningShiftStart: "",
      morningShiftEnd: "",
      eveningShiftStart: "",
      eveningShiftEnd: "",
      phone: "",
      whatsappPreference: "both",
      address: "",
      emergencyContact: "",
    });
  };

  const handleAddNew = () => {
    setEditingUser(null);
    form.reset({
      username: "",
      password: "",
      firstName: "",
      lastName: "",
      email: "",
      department: NO_DEPARTMENT,
      position: "",
      role: "employee",
      salary: undefined,
      shiftType: "one_shift",
      shiftStartTime: "",
      shiftEndTime: "",
      morningShiftStart: "",
      morningShiftEnd: "",
      eveningShiftStart: "",
      eveningShiftEnd: "",
      phone: "",
      whatsappPreference: "both",
      address: "",
      emergencyContact: "",
    });
    setIsDialogOpen(true);
  };

  const filteredEmployees = employees?.filter((emp) => {
    const fullName = `${emp.firstName} ${emp.lastName}`.toLowerCase();
    const matchesSearch =
      fullName.includes(searchQuery.toLowerCase()) ||
      emp.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.department?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDepartment =
      departmentFilter === "all" || emp.department === departmentFilter;
    return matchesSearch && matchesDepartment;
  });

  return (
    <ScrollArea className="h-full">
      <div className="p-6 space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Employees</h1>
            <p className="text-muted-foreground text-sm">
              Manage your team members
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            if (!open) handleDialogClose();
            else setIsDialogOpen(true);
          }}>
            <DialogTrigger asChild>
              <Button onClick={handleAddNew}>
                <Plus className="h-4 w-4 mr-2" />
                Add Employee
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl max-h-[90vh]">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <UserPlus className="h-5 w-5" />
                  {editingUser ? "Edit Employee" : "Add New Employee"}
                </DialogTitle>
              </DialogHeader>
              <ScrollArea className="max-h-[70vh] pr-4">
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <Tabs defaultValue="basic" className="w-full">
                      <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="basic">Basic Info</TabsTrigger>
                        <TabsTrigger value="work">Work Details</TabsTrigger>
                        <TabsTrigger value="contact">Contact</TabsTrigger>
                      </TabsList>
                      
                      <TabsContent value="basic" className="space-y-4 mt-4">
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="firstName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>First Name *</FormLabel>
                                <FormControl>
                                  <Input placeholder="John" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="lastName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Last Name *</FormLabel>
                                <FormControl>
                                  <Input placeholder="Doe" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="username"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Username *</FormLabel>
                                <FormControl>
                                  <Input placeholder="johndoe" {...field} />
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
                                <FormLabel>
                                  Password {editingUser ? "(leave blank to keep current)" : "*"}
                                </FormLabel>
                                <FormControl>
                                  <Input type="password" placeholder="••••••" {...field} />
                                </FormControl>
                                {!editingUser && (
                                  <FormDescription>
                                    Minimum 4 characters
                                  </FormDescription>
                                )}
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                              <FormItem className="col-span-2">
                                <FormLabel>Email</FormLabel>
                                <FormControl>
                                  <Input type="email" placeholder="john@example.com" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="role"
                            render={({ field }) => (
                              <FormItem className="col-span-2">
                                <FormLabel>Role *</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select role" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="employee">Employee</SelectItem>
                                    <SelectItem value="admin">Admin</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </TabsContent>

                      <TabsContent value="work" className="space-y-6 mt-4">
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="department"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Department</FormLabel>
                                <Select 
                                  onValueChange={field.onChange} 
                                  value={field.value || NO_DEPARTMENT}
                                >
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select department" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value={NO_DEPARTMENT}>
                                      <span className="text-muted-foreground">No Department</span>
                                    </SelectItem>
                                    {DEPARTMENTS.map((dept) => (
                                      <SelectItem key={dept} value={dept}>
                                        {dept}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="position"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Position</FormLabel>
                                <FormControl>
                                  <Input placeholder="Developer" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="salary"
                            render={({ field }) => (
                              <FormItem className="col-span-2">
                                <FormLabel>Salary (PKR)</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="number" 
                                    placeholder="50000" 
                                    {...field} 
                                    value={field.value ?? ""}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      field.onChange(val === "" ? undefined : Number(val));
                                    }}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <Separator />

                        {/* Shift Type Selection */}
                        <div className="space-y-4">
                          <div>
                            <h4 className="text-sm font-medium mb-1">Shift Type</h4>
                            <p className="text-xs text-muted-foreground">
                              Select the type of shift schedule for this employee
                            </p>
                          </div>
                          
                          <FormField
                            control={form.control}
                            name="shiftType"
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <div className="grid grid-cols-3 gap-3">
                                    <ShiftTypeCard
                                      type="one_shift"
                                      selected={field.value === "one_shift"}
                                      onSelect={() => field.onChange("one_shift")}
                                      icon={Sun}
                                      title="One Shift"
                                      description="Single work period"
                                    />
                                    <ShiftTypeCard
                                      type="two_shifts"
                                      selected={field.value === "two_shifts"}
                                      onSelect={() => field.onChange("two_shifts")}
                                      icon={Clock}
                                      title="Two Shifts"
                                      description="Morning & Evening"
                                    />
                                    <ShiftTypeCard
                                      type="open"
                                      selected={field.value === "open"}
                                      onSelect={() => field.onChange("open")}
                                      icon={Sunrise}
                                      title="Open/Flexible"
                                      description="No fixed hours"
                                    />
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          {/* Dynamic Shift Time Fields */}
                          {shiftType === "one_shift" && (
                            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 space-y-4">
                              <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                                <Sun className="w-4 h-4 text-amber-500" />
                                Shift Schedule
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                <FormField
                                  control={form.control}
                                  name="shiftStartTime"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel className="flex items-center gap-2">
                                        <Sunrise className="w-4 h-4 text-orange-500" />
                                        Start Time
                                      </FormLabel>
                                      <FormControl>
                                        <Input 
                                          type="time" 
                                          {...field} 
                                          value={field.value || ""} 
                                        />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={form.control}
                                  name="shiftEndTime"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel className="flex items-center gap-2">
                                        <Sunset className="w-4 h-4 text-purple-500" />
                                        End Time
                                      </FormLabel>
                                      <FormControl>
                                        <Input 
                                          type="time" 
                                          {...field} 
                                          value={field.value || ""} 
                                        />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </div>
                            </div>
                          )}

                          {shiftType === "two_shifts" && (
                            <div className="space-y-4">
                              {/* Morning Shift */}
                              <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 space-y-4">
                                <div className="flex items-center gap-2 text-sm font-medium text-amber-700 dark:text-amber-400">
                                  <Sun className="w-4 h-4" />
                                  Morning Shift
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                  <FormField
                                    control={form.control}
                                    name="morningShiftStart"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                                          <Sunrise className="w-4 h-4" />
                                          Start Time
                                        </FormLabel>
                                        <FormControl>
                                          <Input 
                                            type="time" 
                                            {...field} 
                                            value={field.value || ""} 
                                            className="border-amber-200 dark:border-amber-800"
                                          />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                  <FormField
                                    control={form.control}
                                    name="morningShiftEnd"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                                          <Sunset className="w-4 h-4" />
                                          End Time
                                        </FormLabel>
                                        <FormControl>
                                          <Input 
                                            type="time" 
                                            {...field} 
                                            value={field.value || ""} 
                                            className="border-amber-200 dark:border-amber-800"
                                          />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                </div>
                              </div>

                              {/* Evening Shift */}
                              <div className="p-4 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/50 space-y-4">
                                <div className="flex items-center gap-2 text-sm font-medium text-indigo-700 dark:text-indigo-400">
                                  <Moon className="w-4 h-4" />
                                  Evening Shift
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                  <FormField
                                    control={form.control}
                                    name="eveningShiftStart"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel className="flex items-center gap-2 text-indigo-700 dark:text-indigo-400">
                                          <Sunrise className="w-4 h-4" />
                                          Start Time
                                        </FormLabel>
                                        <FormControl>
                                          <Input 
                                            type="time" 
                                            {...field} 
                                            value={field.value || ""} 
                                            className="border-indigo-200 dark:border-indigo-800"
                                          />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                  <FormField
                                    control={form.control}
                                    name="eveningShiftEnd"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel className="flex items-center gap-2 text-indigo-700 dark:text-indigo-400">
                                          <Sunset className="w-4 h-4" />
                                          End Time
                                        </FormLabel>
                                        <FormControl>
                                          <Input 
                                            type="time" 
                                            {...field} 
                                            value={field.value || ""} 
                                            className="border-indigo-200 dark:border-indigo-800"
                                          />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                </div>
                              </div>
                            </div>
                          )}

                          {shiftType === "open" && (
                            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50">
                              <div className="flex items-center gap-3">
                                <div className="p-2 rounded-full bg-emerald-100 dark:bg-emerald-900">
                                  <Sunrise className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                                    Flexible Schedule
                                  </p>
                                  <p className="text-xs text-emerald-600 dark:text-emerald-500">
                                    This employee has no fixed shift times. They can clock in and out at any time.
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </TabsContent>

                      <TabsContent value="contact" className="space-y-4 mt-4">
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="phone"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Phone Number</FormLabel>
                                <FormControl>
                                  <Input placeholder="+92 300 1234567" {...field} value={field.value || ""} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="whatsappPreference"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>WhatsApp Notifications</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select preference" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="both">All Notifications</SelectItem>
                                    <SelectItem value="breaks_only">Breaks Only</SelectItem>
                                    <SelectItem value="shift_reports_only">Shift Reports Only</SelectItem>
                                    <SelectItem value="none">None</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="address"
                            render={({ field }) => (
                              <FormItem className="col-span-2">
                                <FormLabel>Address</FormLabel>
                                <FormControl>
                                  <Input placeholder="Street address" {...field} value={field.value || ""} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="emergencyContact"
                            render={({ field }) => (
                              <FormItem className="col-span-2">
                                <FormLabel>Emergency Contact</FormLabel>
                                <FormControl>
                                  <Input placeholder="Name - Phone" {...field} value={field.value || ""} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </TabsContent>
                    </Tabs>

                    <div className="flex justify-end gap-2 pt-4 border-t">
                      <Button type="button" variant="outline" onClick={handleDialogClose}>
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={createMutation.isPending || updateMutation.isPending}
                      >
                        {(createMutation.isPending || updateMutation.isPending) && (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        )}
                        {editingUser ? "Update Employee" : "Create Employee"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </ScrollArea>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Team Members ({filteredEmployees?.length || 0})
            </CardTitle>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search employees..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-full sm:w-64"
                />
              </div>
              <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                <SelectTrigger className="w-full sm:w-48">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="All Departments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {DEPARTMENTS.map((dept) => (
                    <SelectItem key={dept} value={dept}>
                      {dept}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                    <Skeleton className="h-6 w-16" />
                  </div>
                ))}
              </div>
            ) : filteredEmployees && filteredEmployees.length > 0 ? (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Shift Type</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEmployees.map((employee) => {
                      const fullName = `${employee.firstName} ${employee.lastName}`;
                      return (
                        <TableRow key={employee.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-9 w-9">
                                <AvatarFallback className="bg-primary/10 text-primary text-sm">
                                  {getInitials(employee.firstName, employee.lastName)}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">{fullName}</p>
                                <p className="text-xs text-muted-foreground">
                                  @{employee.username}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">
                            {employee.department || <span className="text-muted-foreground">—</span>}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={cn(
                              "capitalize",
                              employee.shiftType === "one_shift" && "bg-amber-50 text-amber-700 border-amber-200",
                              employee.shiftType === "two_shifts" && "bg-indigo-50 text-indigo-700 border-indigo-200",
                              employee.shiftType === "open" && "bg-emerald-50 text-emerald-700 border-emerald-200",
                            )}>
                              {employee.shiftType?.replace(/_/g, " ") || "—"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={employee.role === "admin" ? "default" : "secondary"}>
                              {employee.role}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="secondary"
                              className={
                                employee.isActive
                                  ? "bg-green-500/10 text-green-600 dark:text-green-400"
                                  : "bg-red-500/10 text-red-600 dark:text-red-400"
                              }
                            >
                              {employee.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button size="icon" variant="ghost">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleEdit(employee)}>
                                  <Pencil className="h-4 w-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onClick={() => handleDelete(employee)}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-12">
                <Users className="h-12 w-12 mx-auto text-muted-foreground/50" />
                <p className="mt-2 text-muted-foreground">
                  {searchQuery || departmentFilter !== "all" ? "No employees found" : "No employees yet"}
                </p>
                {!searchQuery && departmentFilter === "all" && (
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={handleAddNew}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add your first employee
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Employee</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete{" "}
                <span className="font-semibold">
                  {userToDelete?.firstName} {userToDelete?.lastName}
                </span>
                ? This action cannot be undone and will also delete all associated shifts,
                breaks, and activity logs.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </ScrollArea>
  );
}