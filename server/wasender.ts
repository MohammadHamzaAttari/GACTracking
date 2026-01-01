const WASENDER_API_URL = "https://wasenderapi.com/api/send-message";
const WASENDER_API_KEY = process.env.WASENDER_API_KEY || "";
const GROUP_ID = process.env.WASENDER_GROUP_ID || "";

interface Employee {
  fullName: string;
  department: string;
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

async function sendWhatsAppMessage(text: string): Promise<boolean> {
  // Skip if env vars not configured
  if (!WASENDER_API_KEY || !GROUP_ID) {
    console.log("WASENDER not configured, skipping notification");
    return false;
  }
  
  try {
    const response = await fetch(WASENDER_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${WASENDER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: GROUP_ID,
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

export async function notifyShiftStart(employee: Employee): Promise<void> {
  const now = new Date();
  const message = `🌅 SHIFT STARTED

👤 Employee: ${employee.fullName}
🏢 Department: ${employee.department}
⏰ Session: ${getSessionType(now)}
🕐 Started at: ${formatTime(now)}

✅ Employee has checked in successfully.`;

  await sendWhatsAppMessage(message);
}

export async function notifyShiftEnd(
  employee: Employee,
  shiftStartTime: Date,
  totalWorkedMinutes: number,
  breaksTaken: number,
  totalBreakMinutes: number,
  lateMinutes: number = 0
): Promise<void> {
  const now = new Date();
  const workedHours = Math.floor(totalWorkedMinutes / 60);
  const workedMins = totalWorkedMinutes % 60;
  
  const message = `🔴 SHIFT REPORT

⌛ Late By: ${lateMinutes} minutes
👤 Employee: ${employee.fullName}
🏢 Department: ${employee.department}
⏰ Shift: ${getSessionType(shiftStartTime)}
🌅 Shift Started At: ${formatTime(shiftStartTime)}
🌇 Shift Ended At: ${formatTime(now)}

📊 Shift Summary:
✅ Total Worked Hours: ${workedHours}h ${workedMins}m
🕒 Required Working Hours: 8h 0m
☕ Breaks Taken: ${breaksTaken}
☕ Total break Duration: ${totalBreakMinutes} minutes

✅ Employee has checked out successfully.`;

  await sendWhatsAppMessage(message);
}

export async function notifyBreakStart(employee: Employee, breakType: string): Promise<void> {
  const now = new Date();
  
  const breakEmoji = breakType === "prayer" ? "🕌" : 
                     breakType === "meal" ? "🍽️" : 
                     breakType === "urgent" ? "🚨" : "☕";
  
  const message = `${breakEmoji} BREAK STARTED

👤 Employee: ${employee.fullName}
🏢 Department: ${employee.department}
📋 Break Type: ${breakType}
🕐 Started at: ${formatTime(now)}

⏸️ Employee is now on break.`;

  await sendWhatsAppMessage(message);
}

export async function notifyBreakEnd(
  employee: Employee, 
  breakType: string, 
  durationMinutes: number
): Promise<void> {
  const now = new Date();
  
  const message = `🚨 BREAK ENDED

👤 Employee: ${employee.fullName}
🏢 Department: ${employee.department}
📋 Break Type: ${breakType}
🕐 Ended at: ${formatTime(now)}
⏱️ Duration: ${durationMinutes} minutes

▶️ Employee has resumed work.`;

  await sendWhatsAppMessage(message);
}

export async function notifyDailyReportSubmitted(
  employee: Employee,
  workDetails: string
): Promise<void> {
  const now = new Date();
  
  const message = `📝 DAILY REPORT SUBMITTED

👤 Employee: ${employee.fullName}
🏢 Department: ${employee.department}
🕐 Submitted at: ${formatTime(now)}

📋 Work Summary:
${workDetails.substring(0, 200)}${workDetails.length > 200 ? '...' : ''}

✅ Report submitted successfully.`;

  await sendWhatsAppMessage(message);
}
