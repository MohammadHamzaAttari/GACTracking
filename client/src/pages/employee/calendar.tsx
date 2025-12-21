import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, isSameDay } from "date-fns";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, CheckCircle2, XCircle, AlertCircle, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { Attendance } from "@shared/schema";

function getStatusColor(status: string) {
  switch (status) {
    case "present":
      return "bg-green-500";
    case "late":
      return "bg-yellow-500";
    case "absent":
      return "bg-red-500";
    case "half-day":
      return "bg-orange-500";
    default:
      return "bg-muted";
  }
}

function getStatusBgColor(status: string) {
  switch (status) {
    case "present":
      return "bg-green-500/10 hover:bg-green-500/20";
    case "late":
      return "bg-yellow-500/10 hover:bg-yellow-500/20";
    case "absent":
      return "bg-red-500/10 hover:bg-red-500/20";
    case "half-day":
      return "bg-orange-500/10 hover:bg-orange-500/20";
    default:
      return "";
  }
}

export default function EmployeeCalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const { data: attendanceRecords, isLoading } = useQuery<Attendance[]>({
    queryKey: ["/api/employee/attendance"],
  });

  const getAttendanceForDay = (date: Date) => {
    return attendanceRecords?.find((record) =>
      isSameDay(new Date(record.date), date)
    );
  };

  const previousMonth = () => {
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1));
  };

  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const startDay = monthStart.getDay();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-page-title">Calendar</h1>
        <p className="text-muted-foreground text-sm">
          View your attendance calendar
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            {format(currentMonth, "MMMM yyyy")}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button size="icon" variant="outline" onClick={previousMonth} data-testid="button-prev-month">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="outline" onClick={nextMonth} data-testid="button-next-month">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="grid grid-cols-7 gap-2">
              {[...Array(35)].map((_, i) => (
                <Skeleton key={i} className="h-16 rounded-md" />
              ))}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-7 gap-2 mb-2">
                {weekDays.map((day) => (
                  <div
                    key={day}
                    className="text-center text-sm font-medium text-muted-foreground py-2"
                  >
                    {day}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-2">
                {[...Array(startDay)].map((_, i) => (
                  <div key={`empty-${i}`} className="h-16" />
                ))}
                {days.map((day) => {
                  const attendance = getAttendanceForDay(day);
                  const isCurrentDay = isToday(day);
                  const dayNum = format(day, "d");

                  return (
                    <div
                      key={day.toString()}
                      className={`h-16 rounded-md border p-2 transition-colors ${
                        isCurrentDay
                          ? "border-primary border-2"
                          : "border-border"
                      } ${attendance ? getStatusBgColor(attendance.status) : "hover-elevate"}`}
                      data-testid={`calendar-day-${format(day, "yyyy-MM-dd")}`}
                    >
                      <div className="flex items-start justify-between">
                        <span
                          className={`text-sm font-medium ${
                            isCurrentDay ? "text-primary" : ""
                          }`}
                        >
                          {dayNum}
                        </span>
                        {attendance && (
                          <div
                            className={`h-2 w-2 rounded-full ${getStatusColor(
                              attendance.status
                            )}`}
                          />
                        )}
                      </div>
                      {attendance && (
                        <p className="text-xs text-muted-foreground mt-1 truncate">
                          {attendance.clockIn
                            ? format(new Date(attendance.clockIn), "h:mm a")
                            : attendance.status}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Legend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-green-500" />
              <span className="text-sm">Present</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-yellow-500" />
              <span className="text-sm">Late</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-red-500" />
              <span className="text-sm">Absent</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-orange-500" />
              <span className="text-sm">Half Day</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
