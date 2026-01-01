const WASENDER_API_URL = "https://wasenderapi.com/api/send-message";

// Pakistan timezone offset (GMT+5)
const PAKISTAN_TIMEZONE_OFFSET = 5 * 60; // 5 hours in minutes

interface Employee {
  fullName: string;
  department: string;
}

export interface WasenderSettings {
  apiToken: string | null;
  groupId: string | null;
  isActive: boolean | null;
}

function getPakistanTime(): Date {
  const now = new Date();
  // Get UTC time and add Pakistan offset
  const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
  return new Date(utcTime + (PAKISTAN_TIMEZONE_OFFSET * 60000));
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: true 
  });
}

function getSessionType(date: Date): string {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) return "Morning";
  if (hour >= 12 && hour < 17) return "Afternoon";
  return "Evening";
}

async function sendWhatsAppMessage(text: string, settings: WasenderSettings): Promise<boolean> {
  // Skip if not configured or not active
  if (!settings.apiToken || !settings.groupId || !settings.isActive) {
    console.log("WASENDER not configured or not active, skipping notification");
    return false;
  }
  
  try {
    const response = await fetch(WASENDER_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${settings.apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: settings.groupId,
        text,
      }),
    });
    
    if (!response.ok) {
      console.error("WASENDER API error:", await response.text());
      return false;
    }
    
    console.log("WhatsApp notification sent successfully");
    return true;
  } catch (error) {
    console.error("Failed to send WhatsApp notification:", error);
    return false;
  }
}

export async function notifyShiftStart(employee: Employee, settings: WasenderSettings): Promise<void> {
  const now = getPakistanTime();
  const message = `🌅 SHIFT STARTED

👤 Employee: ${employee.fullName}
🏢 Department: ${employee.department}
⏰ Session: ${getSessionType(now)}
🕐 Started at: ${formatTime(now)}

✅ Employee has checked in successfully.`;

  await sendWhatsAppMessage(message, settings);
}

export async function notifyShiftEnd(
  employee: Employee,
  shiftStartTime: Date,
  totalWorkedMinutes: number,
  breaksTaken: number,
  totalBreakMinutes: number,
  lateMinutes: number = 0,
  settings: WasenderSettings
): Promise<void> {
  const now = getPakistanTime();
  const workedHours = Math.floor(totalWorkedMinutes / 60);
  const workedMins = totalWorkedMinutes % 60;
  
  // Convert shift start time to Pakistan time
  const utcStartTime = shiftStartTime.getTime() + (shiftStartTime.getTimezoneOffset() * 60000);
  const startTimePKT = new Date(utcStartTime + (PAKISTAN_TIMEZONE_OFFSET * 60000));
  
  const message = `🔴 SHIFT REPORT

⌛ Late By: ${lateMinutes} minutes
👤 Employee: ${employee.fullName}
🏢 Department: ${employee.department}
⏰ Shift: ${getSessionType(startTimePKT)}
🌅 Shift Started At: ${formatTime(startTimePKT)}
🌇 Shift Ended At: ${formatTime(now)}

📊 Shift Summary:
✅ Total Worked Hours: ${workedHours}h ${workedMins}m
🕒 Required Working Hours: 8h 0m
☕ Breaks Taken: ${breaksTaken}
☕ Total break Duration: ${totalBreakMinutes} minutes

✅ Employee has checked out successfully.`;

  await sendWhatsAppMessage(message, settings);
}

export async function notifyBreakStart(employee: Employee, breakType: string, settings: WasenderSettings): Promise<void> {
  const now = getPakistanTime();
  
  const breakEmoji = breakType === "prayer" ? "🕌" : 
                     breakType === "meal" ? "🍽️" : 
                     breakType === "urgent" ? "🚨" : "☕";
  
  const message = `${breakEmoji} BREAK STARTED

👤 Employee: ${employee.fullName}
🏢 Department: ${employee.department}
📋 Break Type: ${breakType}
🕐 Started at: ${formatTime(now)}

⏸️ Employee is now on break.`;

  await sendWhatsAppMessage(message, settings);
}

export async function notifyBreakEnd(
  employee: Employee, 
  breakType: string, 
  durationMinutes: number,
  settings: WasenderSettings
): Promise<void> {
  const now = getPakistanTime();
  
  const message = `🚨 BREAK ENDED

👤 Employee: ${employee.fullName}
🏢 Department: ${employee.department}
📋 Break Type: ${breakType}
🕐 Ended at: ${formatTime(now)}
⏱️ Duration: ${durationMinutes} minutes

▶️ Employee has resumed work.`;

  await sendWhatsAppMessage(message, settings);
}

export async function notifyDailyReportSubmitted(
  employee: Employee,
  workDetails: string,
  settings: WasenderSettings
): Promise<void> {
  const now = getPakistanTime();
  
  const message = `📝 DAILY REPORT SUBMITTED

👤 Employee: ${employee.fullName}
🏢 Department: ${employee.department}
🕐 Submitted at: ${formatTime(now)}

📋 Work Summary:
${workDetails.substring(0, 200)}${workDetails.length > 200 ? '...' : ''}

✅ Report submitted successfully.`;

  await sendWhatsAppMessage(message, settings);
}
