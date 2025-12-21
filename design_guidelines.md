# GAC Trackings Dashboard - Design Guidelines

## Design Approach
**Selected Approach:** Modern Design System with Vibrant Gradient Aesthetic  
**Primary Reference:** Linear's clean layouts + Stripe's premium feel + modern SaaS dashboards (Vercel, Notion)  
**Design Philosophy:** Professional productivity dashboard with energetic, gradient-driven visual identity that feels premium and cutting-edge.

## Color System & Gradients

**Primary Gradients:**
- Hero Gradient: Bright blue (#0EA5E9) → Teal (#14B8A6) → Cyan (#06B6D4)
- Accent Gradient: Indigo (#6366F1) → Purple (#A855F7)
- Success Gradient: Emerald (#10B981) → Teal (#14B8A6)

**Background Strategy:**
- Base: Clean white (#FFFFFF) for main content areas
- Subtle wash: Very light blue-tinted gray (#F8FAFC) for alternating sections
- Card backgrounds: White with gradient borders or subtle gradient overlays (10% opacity)

**Gradient Applications:**
- Primary buttons: Full gradient background with slight blur backdrop when over images
- Card accents: Top border gradient strips (h-1) or diagonal corner gradients
- Stats cards: Gradient icon backgrounds (circular, 20% opacity)
- Sidebar active states: Subtle vertical gradient highlight
- Status badges: Soft gradient fills matching status type

## Typography System
**Primary Font:** Inter (400, 500, 600, 700) via Google Fonts  
**Hierarchy:**
- Page Titles: text-3xl, font-bold (700), gradient text effect on key headings
- Section Headers: text-xl, font-semibold (600)
- Card Titles: text-lg, font-medium (500)
- Body Text: text-base, font-normal (400)
- Metadata/Labels: text-sm, font-medium (500)
- Numbers/Metrics: text-2xl to text-4xl, font-bold (700), tabular-nums

**Gradient Text Treatment:**
Apply gradient backgrounds with background-clip text to primary headings and large metrics for premium effect.

## Layout System
**Spacing Units:** Consistent use of 4, 6, 8, 12 (gap-4, p-6, p-8, mb-12)

**Dashboard Shell:**
- Sidebar: w-72 fixed, gradient background (blue to teal, subtle 15-degree angle)
- Main Content: Flexible with max-w-7xl container, px-8 py-6
- Top Bar: h-20, white with subtle shadow, gradient underline accent

**Responsive Grid Patterns:**
- Stats Cards: grid-cols-1 md:grid-cols-2 lg:grid-cols-4, gap-6
- Data Tables: Full-width with generous spacing
- Two-column sections: grid-cols-1 lg:grid-cols-2, gap-8

## Core Components

**Authentication Pages:**
- Full-screen gradient background (animated subtle movement)
- Centered white card (max-w-md, rounded-2xl, shadow-2xl)
- Logo with gradient treatment
- Form inputs with gradient focus rings
- Primary CTA button with full gradient + hover glow effect

**Navigation Sidebar:**
- Gradient background with semi-transparent white overlay pattern
- Logo at top (h-20) with white or gradient version
- Navigation items: Icon + label, white text with gradient on hover/active
- Active state: White background with subtle shadow, gradient left border (w-1)
- Bottom section: User profile card with gradient border, role badge with gradient

**Dashboard Stats Cards:**
- White background, rounded-xl, shadow-md
- Top gradient accent strip (h-2, full gradient)
- Large metric numbers with optional gradient text
- Icon in gradient circular background (48px, 20% opacity gradient fill)
- Trend indicators with color-coded gradients
- Hover: Subtle lift with increased shadow

**Data Tables:**
- White background with rounded-xl container
- Header: Gradient background (10% opacity) with bold text
- Rows: Alternating subtle backgrounds, gradient highlight on hover
- Action buttons: Small gradient buttons or gradient icon buttons
- Sticky header with subtle gradient shadow on scroll

**Forms & Inputs:**
- Labels: font-medium, text-sm, above inputs
- Input fields: h-12, border with gradient on focus (ring effect)
- Buttons: h-12 for primary actions, gradient backgrounds
- Button groups: gap-3, mixed gradient and outline styles
- Validation: Gradient underlines for success/error states

**Buttons:**
- Primary: Full gradient background, white text, hover glow effect
- Secondary: White background, gradient border (2px), gradient text, hover fill
- Ghost: Transparent, gradient text, hover gradient background (10% opacity)
- Icon buttons: Circular, gradient background on hover

**Cards & Containers:**
- Default: white, rounded-xl, shadow-md, p-6
- Premium variant: Gradient border (2px), slight gradient overlay
- Hover states: Lift effect (translateY -2px) + enhanced shadow

**Status Badges:**
- Rounded-full pills with gradient backgrounds
- Active/Online: Green-teal gradient
- Pending: Yellow-orange gradient
- Inactive: Gray with subtle gradient
- Present: Blue-cyan gradient
- Absent: Red-pink gradient

**Modals & Overlays:**
- Backdrop: Dark overlay with blur effect
- Modal: White, rounded-2xl, shadow-2xl, max-w-2xl
- Header with gradient accent strip
- Smooth fade + scale-in animation

## Animations & Interactions

**Smooth Transitions:** All interactive elements use transition-all duration-300 ease-in-out

**Key Animations:**
- Page load: Stagger fade-in for cards (delay increments of 50ms)
- Sidebar: Smooth expand/collapse with gradient fade
- Stats cards: Count-up animation for numbers on initial load
- Button hover: Gradient shift + subtle glow (box-shadow)
- Dropdown menus: Smooth slide-down with fade
- Table row hover: Gradient sweep from left
- Modal entry: Fade backdrop + scale modal from 95% to 100%
- Success states: Subtle gradient pulse effect

**Micro-interactions:**
- Input focus: Gradient ring appears with smooth scale
- Checkbox/toggle: Gradient fill animation
- Loading states: Gradient shimmer effect
- Notifications: Slide-in from top-right with bounce

## Icons & Assets
**Icon Library:** Heroicons (outline + solid variants) via CDN  
**Icon Sizes:**
- Navigation: 24px (w-6 h-6)
- Buttons: 20px (w-5 h-5)
- Stats cards: 32px (w-8 h-8)
- Table actions: 16px (w-4 h-4)

**Icon Treatments:**
- Gradient backgrounds for featured icons (circular containers)
- Gradient fill for active/selected states
- White icons on gradient buttons

## Admin-Specific Features
- User management: Table with gradient action buttons
- Settings: Tabbed interface with gradient active tab indicators
- Analytics: Chart.js integration with gradient fills/lines
- Audit log: Timeline view with gradient connectors
- Permission controls: Toggle switches with gradient active states

## Premium Polish Details
- Subtle gradient noise texture on large gradient areas (prevents banding)
- Smooth scroll behavior throughout
- Gradient loading bars for async operations
- Toast notifications with gradient accents
- Empty states: Gradient icon backgrounds with encouraging CTAs
- Keyboard focus: Gradient ring indicators for accessibility

## Accessibility
- Ensure gradient text maintains 4.5:1 contrast minimum
- Focus indicators: Visible gradient rings (3px)
- Keyboard navigation: Tab order follows visual hierarchy
- ARIA labels for all icon-only elements
- Reduced motion: Respect prefers-reduced-motion (disable gradient animations)