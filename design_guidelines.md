# GAC Trackings Dashboard - Design Guidelines

## Design Approach
**Selected Approach:** Design System (Utility-Focused Dashboard)  
**Primary Reference:** Linear/Notion-style productivity dashboards with Material Design principles  
**Justification:** Multi-user dashboard with authentication requires consistent, data-focused UI patterns and clear role hierarchies.

## Typography System
- **Primary Font:** Inter or DM Sans via Google Fonts
- **Headings:** Bold (700), sizes: text-2xl (page titles), text-lg (section headers)
- **Body:** Regular (400), text-base for content, text-sm for labels/metadata
- **Data/Numbers:** Medium (500), tabular-nums for tracking metrics

## Layout System
**Spacing Primitives:** Tailwind units of 2, 4, 6, and 8 (p-2, p-4, p-6, p-8, gap-4, etc.)
- Dashboard shell: Two-column layout (sidebar + main content)
- Sidebar: Fixed width w-64, full height
- Main content: Flexible with max-w-7xl container, padding px-6 py-8

## Core Components

**Authentication Pages:**
- Centered card layout (max-w-md mx-auto)
- Login form with email/password fields, "Remember me" checkbox
- Role selector if needed (Admin/User tabs or dropdown)
- Clean, focused design with minimal distractions

**Navigation Sidebar:**
- Logo/brand at top (h-16)
- Vertical navigation menu with icons + labels
- Active state: subtle background highlight
- User profile section at bottom with role badge
- Collapsible on mobile (hamburger menu)

**Dashboard Layout:**
- Top bar: Page title, breadcrumbs, action buttons (right-aligned)
- Stats cards: Grid of 3-4 cards showing key metrics (grid-cols-1 md:grid-cols-2 lg:grid-cols-4)
- Data tables: Full-width with alternating row backgrounds, sortable headers, pagination
- Card containers: Rounded corners (rounded-lg), subtle borders, p-6 padding

**Forms & Inputs:**
- Label above input pattern
- Input height: h-10 or h-12 for better touch targets
- Focus states with ring-2 outline
- Validation messages below inputs
- Button groups for actions (gap-2)

**Data Display:**
- Tables: Sticky headers, hover states on rows
- Status badges: Rounded pills with semantic colors
- Charts/graphs: Use Chart.js or similar library placeholders
- Empty states: Centered icon + message + CTA

**Admin-Specific UI:**
- User management table with action dropdowns
- Settings panels with tabbed navigation
- Audit log/activity feed with timestamps
- Permission toggles and role assignment controls

## Component Patterns
- **Cards:** white bg, border, shadow-sm, rounded-lg, p-6
- **Buttons:** Primary (solid), Secondary (outline), Ghost (text-only)
- **Badges:** Small rounded pills for status indicators
- **Dropdowns:** Right-aligned menus for row actions
- **Modals:** Centered overlay for confirmations/forms

## Animations
Minimal, functional only:
- Sidebar expand/collapse (transition-all duration-300)
- Dropdown menus (fade-in)
- No decorative animations

## Icons
**Library:** Heroicons via CDN  
**Usage:** 20px for nav items, 16px for buttons, 24px for empty states

## Images
No hero images required. Dashboard focuses on data and functionality. Use placeholder icons for empty states and user avatars only.

## Accessibility
- Keyboard navigation for all interactive elements
- ARIA labels for icon-only buttons
- Focus indicators (ring-2) on all inputs
- Proper heading hierarchy (h1 → h2 → h3)