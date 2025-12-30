# GAC Trackings - Complete Routes & Navigation Guide

## 🗺️ Frontend Routes

### Authentication
```
GET  /          → Login Page (public)
```

### Admin Portal Routes
```
Dashboard & Management
GET  /admin                    → Admin Dashboard
GET  /admin/employees          → Employee Management
GET  /admin/attendance         → Attendance Tracking
GET  /admin/settings           → System Settings
GET  /admin/reports            → Reports & Analytics

New Features (Phase 4)
GET  /admin/daily-reports      → Daily Shift Reports Viewer ✨
GET  /admin/special-requests   → Special Requests Manager ✨
GET  /admin/archive            → Archive Management ✨
```

### Employee Portal Routes
```
Core Features
GET  /employee                 → Employee Dashboard
GET  /employee/attendance      → My Attendance
GET  /employee/calendar        → Calendar View

New Features (Phase 3 & 4)
GET  /employee/shift-report    → Daily Shift Report ✨
GET  /employee/special-request → Special Requests ✨
GET  /employee/archive         → My Archive ✨
```

### Error Routes
```
GET  /not-found                → 404 Page (catch-all)
```

---

## 🔌 Backend API Routes

### Daily Shift Reports Endpoints
```
Route: /api/reports/

POST   /daily                  → Create daily report
       Body: {
         shiftId: string (uuid)
         date: Date
         workDetails: string (required)
         loomVideos: string[] (optional)
         notes: string (optional)
         references: string[] (optional)
       }
       Returns: { id, success message }

GET    /daily/my               → Get user's daily reports
       Query: month (optional, YYYY-MM)
       Returns: [ { id, date, workDetails, ... } ]

GET    /daily/shift/:shiftId   → Get report by shift ID
       Returns: { id, date, workDetails, ... }

GET    /admin/reports/daily    → Get all daily reports (admin only)
       Query: month (YYYY-MM, required)
       Returns: [ { id, user, date, workDetails, ... } ]
```

### Special Requests Endpoints
```
Route: /api/requests/

POST   /special                → Create special request
       Body: {
         title: string (required)
         details: string (required)
       }
       Returns: { id, success message }

GET    /special/my             → Get user's special requests
       Query: month (optional, YYYY-MM)
       Returns: [ { id, title, status, ... } ]

GET    /admin/requests/special → Get all requests (admin only)
       Query: month, status
       Returns: [ { id, title, user, status, ... } ]

PATCH  /admin/requests/special/:id → Update request status (admin only)
       Body: {
         status: "approved" | "not_approved" | "revision" | "resolved"
       }
       Returns: { success message }
```

### Comments/Thread Endpoints
```
Route: /api/requests/special/:requestId/

POST   /comments               → Add comment to request
       Body: {
         comment: string (required)
         statusChange: string (optional)
       }
       Returns: { id, success message }

GET    /comments               → Get conversation thread
       Returns: [ { id, comment, isAdminComment, user, ... } ]
```

### Archive Endpoints
```
Route: /api/archive/

GET    /months                 → List all archived months
       Returns: [ { month, totalReports, totalRequests, archivedDate } ]

GET    /reports/:month        → Get archived reports for month
       Params: month (YYYY-MM)
       Returns: [ { id, date, workDetails, user, ... } ]

GET    /requests/:month       → Get archived requests for month
       Params: month (YYYY-MM)
       Returns: [ { id, title, status, user, ... } ]

POST   /admin/archive/:month  → Archive a month (admin only)
       Params: month (YYYY-MM)
       Returns: { success message }
```

---

## 🔐 Route Protection

### Public Routes
- `/` (Login page)

### Protected Routes (Requires Authentication)
All routes except login require valid user session

### Admin-Only Routes
```
/admin/*                       Requires role: "admin"
/api/admin/*                   Requires role: "admin"
/api/admin/archive/*           Requires role: "admin"
```

### Employee-Only Routes
```
/employee/*                    Requires role: "employee"
/api/reports/*                 Requires role: "employee"
/api/requests/*                Requires role: "employee"
```

---

## 🛣️ Route Navigation Map

### From Login Page
```
Login with admin credentials
        ↓
    /admin
        ↓
┌───────────────────────────────────────┐
├─ Dashboard                            │
├─ Employees                            │
├─ Attendance                           │
├─ Daily Reports         ← NEW          │
├─ Special Requests      ← NEW          │
├─ Archive               ← NEW          │
├─ Reports                             │
└─ Settings                            │

Login with employee credentials
        ↓
    /employee
        ↓
┌───────────────────────────────────────┐
├─ Dashboard                            │
├─ My Attendance                        │
├─ Calendar                             │
├─ Shift Report          ← NEW          │
├─ Special Request       ← NEW          │
└─ Archive               ← NEW          │
```

---

## 📊 Route Grouping by Purpose

### Reports & Submissions
```
Employee:  /employee/shift-report         → Submit daily work
Admin:     /admin/daily-reports           → View all submissions
API:       POST   /api/reports/daily      → Submit report
API:       GET    /api/reports/daily/my   → Get user reports
API:       GET    /api/admin/reports/daily → Get all reports
```

### Requests & Approvals
```
Employee:  /employee/special-request      → Create/manage requests
Admin:     /admin/special-requests        → Manage approvals
API:       POST   /api/requests/special   → Create request
API:       GET    /api/requests/special/my → Get user requests
API:       GET    /api/admin/requests/special → Get all requests
API:       PATCH  /api/admin/requests/special/:id → Change status
```

### Conversations
```
API:       POST   /api/requests/special/:id/comments → Add comment
API:       GET    /api/requests/special/:id/comments → Get thread
```

### Archive & History
```
Employee:  /employee/archive              → View personal archives
Admin:     /admin/archive                 → Manage all archives
API:       GET    /api/archive/months     → List months
API:       GET    /api/archive/reports/:month → Get reports
API:       GET    /api/archive/requests/:month → Get requests
API:       POST   /api/admin/archive/:month → Archive month
```

---

## 🧭 Sidebar Navigation Structure

### Admin Sidebar Menu
```
📊 Dashboard
👥 Employees
📅 Attendance
📄 Daily Reports      ← NEW
💬 Special Requests   ← NEW
📦 Archive            ← NEW
📊 Reports
⚙️ Settings
```

### Employee Sidebar Menu
```
🏠 Dashboard
🕐 My Attendance
📅 Calendar
📝 Shift Report       ← NEW
💬 Special Request    ← NEW
📦 Archive            ← NEW
```

---

## 🔄 API Response Patterns

### Success Responses
```
POST /api/reports/daily
Response: 200 OK
{
  "id": "uuid",
  "message": "Daily report created successfully"
}

GET /api/admin/reports/daily
Response: 200 OK
[
  {
    "id": "uuid",
    "user": { "firstName": "...", "lastName": "...", "department": "..." },
    "date": "2025-01-15",
    "workDetails": "...",
    "loomVideos": ["..."],
    "notes": "...",
    "references": ["..."],
    "createdAt": "2025-01-15T10:00:00Z",
    "updatedAt": "2025-01-15T10:00:00Z"
  }
]
```

### Error Responses
```
Response: 401 Unauthorized
{
  "error": "Not authenticated"
}

Response: 403 Forbidden
{
  "error": "Admin access required"
}

Response: 400 Bad Request
{
  "error": "Validation failed",
  "details": "..."
}
```

---

## 🚦 Route Access Control Matrix

```
Route                          Anonymous  Employee  Admin   Description
────────────────────────────────────────────────────────────────────
/                              ✅         ❌        ❌     Login page
/employee/*                    ❌         ✅        ❌     Employee pages
/admin/*                       ❌         ❌        ✅     Admin pages
/employee/shift-report         ❌         ✅        ❌     NEW - Reports
/employee/special-request      ❌         ✅        ❌     NEW - Requests
/employee/archive              ❌         ✅        ❌     NEW - Archive
/admin/daily-reports           ❌         ❌        ✅     NEW - View reports
/admin/special-requests        ❌         ❌        ✅     NEW - Manage req
/admin/archive                 ❌         ❌        ✅     NEW - Archive mgmt

/api/reports/daily             ❌         ✅        ❌     Create report
/api/reports/daily/my          ❌         ✅        ❌     Get user reports
/api/admin/reports/daily       ❌         ❌        ✅     Get all reports
/api/requests/special          ❌         ✅        ❌     Create request
/api/requests/special/my       ❌         ✅        ❌     Get user requests
/api/admin/requests/special    ❌         ❌        ✅     Get all requests
/api/admin/requests/special/:id ❌         ❌        ✅     Update request
/api/requests/special/:id/comments ❌      ✅        ✅     Comments
/api/archive/*                 ❌         ✅        ✅     Archive access
/api/admin/archive/:month      ❌         ❌        ✅     Archive month
```

---

## 📱 Mobile-Responsive Breakpoints

All routes are responsive:
- Mobile (< 640px)
- Tablet (640px - 1024px)
- Desktop (> 1024px)

---

## ⏱️ Route Load Times (Estimated)

```
/employee/shift-report         ~150ms (small form)
/employee/special-request      ~200ms (with query data)
/employee/archive              ~300ms (loading archived data)
/admin/daily-reports           ~250ms (table view)
/admin/special-requests        ~300ms (with filters)
/admin/archive                 ~350ms (nested dialogs)
```

---

## 🔗 Deep Linking Examples

### Admin accessing specific month's reports
```
/admin/daily-reports?month=2025-01
(Month is set via local state)
```

### Employee viewing specific request
```
/employee/special-request
(Request selected via ID in component state)
```

### Archive navigation
```
/employee/archive → Select month → View reports
/admin/archive → Select month → View data
```

---

## 🎯 Route Hierarchy

```
Root (/)
├── Public
│   └── /                      (Login)
├── Admin (/admin)
│   ├── /                      (Dashboard)
│   ├── /employees
│   ├── /attendance
│   ├── /daily-reports         ✨ NEW
│   ├── /special-requests      ✨ NEW
│   ├── /archive               ✨ NEW
│   ├── /reports
│   └── /settings
└── Employee (/employee)
    ├── /                      (Dashboard)
    ├── /attendance
    ├── /calendar
    ├── /shift-report          ✨ NEW
    ├── /special-request       ✨ NEW
    └── /archive               ✨ NEW
```

---

## 📝 Route Parameter Types

```
Path Parameters:
  :shiftId          string (uuid) - Shift identifier
  :requestId        string (uuid) - Request identifier
  :month            string (YYYY-MM) - Month filter
  :id               string (uuid) - Generic ID

Query Parameters:
  ?month=YYYY-MM    Month filter for listings
  ?status=...       Status filter (requests)
  ?userId=...       User filter (admin views)
```

---

## 🚀 Navigation Flow Examples

### Employee Daily Report Workflow
```
1. Login (/login)
2. Dashboard (/employee)
3. Click Shift Report → (/employee/shift-report)
4. Fill form → POST /api/reports/daily
5. See success → View in History (same page)
6. Click Archive → (/employee/archive)
7. Select month → View past reports (read-only)
```

### Admin Request Management Workflow
```
1. Login (/login)
2. Dashboard (/admin)
3. Click Special Requests → (/admin/special-requests)
4. Filter by "Pending Approval"
5. Click View → See details & comments
6. Add response → POST /api/requests/:id/comments
7. Change status → PATCH /api/admin/requests/:id
8. Refresh → See updated list
```

---

## ✅ Route Testing Checklist

- [x] All public routes accessible without auth
- [x] Protected routes redirect to login
- [x] Admin routes blocked for employees
- [x] Employee routes blocked for admins
- [x] API endpoints require auth
- [x] API endpoints check role permissions
- [x] Navigation menu links work
- [x] Back buttons navigate correctly
- [x] Route parameters passed correctly
- [x] Page titles update
- [x] Breadcrumbs display
- [x] Mobile responsive

---

**Last Updated:** Implementation Complete  
**Total Routes:** 20+ (Frontend + API)  
**Status:** ✅ Fully Functional  
