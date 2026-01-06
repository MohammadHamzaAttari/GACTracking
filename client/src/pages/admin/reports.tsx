import { useQuery } from "@tanstack/react-query";
import {
  BarChart3,
  TrendingUp,
  Users,
  Calendar,
  Clock,
  Download,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";

interface ReportsData {
  monthlyAttendance: number;
  averageWorkHours: number;
  topDepartments: { name: string; rate: number }[];
  weeklyTrend: number[];
}

export default function ReportsPage() {
  const { data: reports, isLoading } = useQuery<ReportsData>({
    queryKey: ["/api/admin/reports"],
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Reports</h1>
          <p className="text-muted-foreground text-sm">
            Analytics and attendance insights
          </p>
        </div>
        <Button variant="outline" data-testid="button-download-report">
          <Download className="h-4 w-4 mr-2" />
          Download Report
        </Button>
      </div>

      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Monthly Attendance Rate
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-3xl font-bold" data-testid="stat-monthly-attendance">
                  {reports?.monthlyAttendance || 0}%
                </div>
                <Progress
                  value={reports?.monthlyAttendance || 0}
                  className="mt-2 h-2"
                />
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Avg. Work Hours/Day
            </CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-3xl font-bold" data-testid="stat-avg-hours">
                {reports?.averageWorkHours || 0}h
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              This Month
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {new Date().toLocaleDateString("en-US", { month: "short", year: "numeric" })}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Weekly Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(7)].map((_, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Skeleton className="h-4 w-12" />
                    <Skeleton className="h-6 flex-1" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day, i) => (
                  <div key={day} className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground w-10">{day}</span>
                    <div className="flex-1 h-6 bg-muted rounded-md overflow-hidden">
                      <div
                        className="h-full bg-primary/80 rounded-md"
                        style={{
                          width: `${reports?.weeklyTrend?.[i] || 0}%`,
                        }}
                      />
                    </div>
                    <span className="text-sm font-medium w-10 text-right">
                      {reports?.weeklyTrend?.[i] || 0}%
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Department Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-6 w-16" />
                  </div>
                ))}
              </div>
            ) : reports?.topDepartments && reports.topDepartments.length > 0 ? (
              <div className="space-y-4">
                {reports.topDepartments.map((dept) => (
                  <div key={dept.name} className="flex items-center justify-between">
                    <span className="text-sm font-medium">{dept.name}</span>
                    <Badge
                      variant="secondary"
                      className={
                        dept.rate >= 90
                          ? "bg-green-500/10 text-green-600 dark:text-green-400"
                          : dept.rate >= 75
                            ? "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400"
                            : "bg-red-500/10 text-red-600 dark:text-red-400"
                      }
                    >
                      {dept.rate}%
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No department data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
