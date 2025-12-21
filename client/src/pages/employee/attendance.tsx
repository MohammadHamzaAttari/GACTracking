import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Clock, Calendar, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Attendance } from "@shared/schema";

function getStatusColor(status: string) {
  switch (status) {
    case "present":
      return "bg-green-500/10 text-green-600 dark:text-green-400";
    case "late":
      return "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400";
    case "absent":
      return "bg-red-500/10 text-red-600 dark:text-red-400";
    case "half-day":
      return "bg-orange-500/10 text-orange-600 dark:text-orange-400";
    default:
      return "";
  }
}

function getStatusIcon(status: string) {
  switch (status) {
    case "present":
      return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    case "late":
      return <AlertCircle className="h-4 w-4 text-yellow-500" />;
    case "absent":
      return <XCircle className="h-4 w-4 text-red-500" />;
    default:
      return <Clock className="h-4 w-4 text-muted-foreground" />;
  }
}

function calculateDuration(clockIn: Date | null, clockOut: Date | null): string {
  if (!clockIn || !clockOut) return "-";
  const diff = new Date(clockOut).getTime() - new Date(clockIn).getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}h ${minutes}m`;
}

export default function EmployeeAttendancePage() {
  const { data: attendanceRecords, isLoading } = useQuery<Attendance[]>({
    queryKey: ["/api/employee/attendance"],
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-page-title">My Attendance</h1>
        <p className="text-muted-foreground text-sm">
          View your attendance history
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Attendance History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(10)].map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-6 w-20" />
                </div>
              ))}
            </div>
          ) : attendanceRecords && attendanceRecords.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Day</TableHead>
                  <TableHead>Clock In</TableHead>
                  <TableHead>Clock Out</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {attendanceRecords.map((record) => (
                  <TableRow key={record.id} data-testid={`row-attendance-${record.id}`}>
                    <TableCell className="font-medium">
                      {format(new Date(record.date), "MMM dd, yyyy")}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(record.date), "EEEE")}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {record.clockIn
                        ? format(new Date(record.clockIn), "hh:mm a")
                        : "-"}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {record.clockOut
                        ? format(new Date(record.clockOut), "hh:mm a")
                        : "-"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {calculateDuration(record.clockIn, record.clockOut)}
                    </TableCell>
                    <TableCell>
                      <Badge className={`${getStatusColor(record.status)} gap-1`} variant="secondary">
                        {getStatusIcon(record.status)}
                        {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12">
              <Clock className="h-12 w-12 mx-auto text-muted-foreground/50" />
              <p className="mt-2 text-muted-foreground">
                No attendance records yet
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Start clocking in to see your history
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
