# CardPerks Design Guidelines

## Design Approach
**Selected Approach:** Design System with Fintech Influences

**Justification:** CardPerks is a utility-focused financial management tool where clarity, trust, and efficiency are paramount. Drawing inspiration from modern fintech leaders (Stripe, Plaid, Revolut) combined with Material Design principles for component consistency.

**Key Design Principles:**
- **Clarity First:** Information hierarchy prioritizes quick scanning and decision-making
- **Trust Signals:** Professional, secure aesthetic builds confidence in financial data
- **Visual Distinction:** Clear differentiation between personal and household contexts
- **Efficiency:** Streamlined workflows minimize steps to value

---

## Core Design Elements

### A. Color Palette

**Light Mode:**
- Primary: 220 70% 50% (Trust blue for CTAs and interactive elements)
- Secondary: 210 15% 25% (Dark slate for text and headers)
- Household Accent: 280 60% 55% (Purple for household-specific elements)
- Personal Accent: 140 50% 50% (Green for personal card indicators)
- Background: 0 0% 98% (Soft white for main canvas)
- Surface: 0 0% 100% (Pure white for cards and panels)
- Border: 220 15% 90% (Subtle separation)
- Success: 145 65% 45% (Approval actions)
- Warning: 35 90% 55% (Pending/expiring perks)
- Error: 0 70% 55% (Destructive actions)

**Dark Mode:**
- Primary: 220 80% 60% (Brighter blue for contrast)
- Secondary: 210 15% 85% (Light text)
- Household Accent: 280 65% 65% (Lighter purple)
- Personal Accent: 140 55% 60% (Lighter green)
- Background: 220 20% 10% (Deep navy background)
- Surface: 220 18% 14% (Elevated navy for cards)
- Border: 220 15% 25% (Visible dark borders)

### B. Typography

**Font Families:**
- Primary: Inter (CDN: Google Fonts) - UI elements, body text, data
- Accent: Sora (CDN: Google Fonts) - Headers, emphasis

**Scale:**
- Display: text-4xl (36px) font-bold - Dashboard titles
- Heading 1: text-3xl (30px) font-semibold - Section headers
- Heading 2: text-2xl (24px) font-semibold - Card titles
- Heading 3: text-xl (20px) font-medium - Subsections
- Body: text-base (16px) font-normal - Main content
- Small: text-sm (14px) - Metadata, labels
- Tiny: text-xs (12px) - Tags, status indicators

### C. Layout System

**Spacing Primitives:** Use Tailwind units of 2, 4, 8, 12, 16
- Micro spacing: p-2, gap-2 (8px) - tight groupings
- Standard spacing: p-4, gap-4 (16px) - component padding
- Section spacing: p-8, gap-8 (32px) - between major sections
- Large spacing: p-12 (48px) - hero sections, major divisions
- XL spacing: p-16 (64px) - dashboard margins

**Grid System:**
- Container: max-w-7xl mx-auto for main content
- Dashboard: 12-column grid (grid-cols-12)
- Card Grid: 3-column for desktop (lg:grid-cols-3), 2 for tablet (md:grid-cols-2), 1 for mobile
- Admin Tables: Full-width responsive tables

### D. Component Library

**Core UI Elements:**

*Card Tiles:*
- Elevated surface with shadow-md, rounded-xl corners
- Network logo/icon in top-left (h-8 w-12)
- Ownership indicator: Personal (subtle 👤 or no badge), Household (prominent 🏠 badge with purple background)
- Card name in text-xl font-semibold
- Associated perks count in text-sm text-slate-500
- Hover: transform scale-[1.02] with shadow-lg

*Buttons:*
- Primary: Solid fill with primary color, rounded-lg, px-4 py-2
- Secondary: Outline variant with border-2
- Destructive: Error color for delete actions
- Icon buttons: rounded-full p-2 for actions

*Search Bar:*
- Prominent fixed position or sticky header
- Large input (h-14) with rounded-full or rounded-xl
- Placeholder: "Where are you shopping today?"
- Search icon left, clear button right
- Dropdown results with shadow-xl, absolute positioning

**Navigation:**
- Top navbar: Fixed with backdrop-blur-sm, border-b
- Logo left, user menu right
- Main nav: Dashboard, Cards, Merchants, Household (conditional)
- Mobile: Hamburger menu with slide-out drawer

**Forms:**
- Input fields: h-12, rounded-lg, border focus:ring-2
- Labels: text-sm font-medium mb-2
- Helper text: text-xs text-slate-500
- Error states: border-red-500 with error message below
- Success states: border-green-500 with checkmark

**Data Displays:**
- Perks List: Stacked cards with merchant logo, perk name, expiration date badge
- Merchant Cards: Image placeholder (aspect-video), name overlay, category tag
- Admin Tables: Striped rows (even:bg-slate-50), sticky headers, action column right

**Overlays:**
- Modals: max-w-2xl, rounded-2xl, backdrop-blur with dark overlay
- Toasts: Fixed bottom-right, slide-in animation, auto-dismiss
- Dropdowns: Elevated with shadow-lg, rounded-lg

### E. Animations

**Sparingly Used:**
- Card hover: transform and shadow transition (200ms)
- Page transitions: Fade in opacity (150ms)
- Search dropdown: Slide down with fade (200ms)
- Toast notifications: Slide in from bottom-right
- NO scroll-triggered animations, NO complex keyframes

---

## Dashboard Layout

**Hero/Welcome Section:**
- Full-width background gradient (primary to secondary, subtle)
- Centered search bar (max-w-2xl)
- Quick stats row below: Total Cards, Active Perks, Household Members (if applicable)

**Card Summary Section:**
- Section header: "Your Cards" with "Add Card" button right-aligned
- Grid layout: Personal cards first, then household cards (if any)
- Visual separator between personal and household sections (border-t with label)

**Suggested Perks Section:**
- Horizontal scroll on mobile, grid on desktop
- Perk cards with merchant image background, overlay text
- "View All" link at end

**Admin Dashboard Differences:**
- Sidebar navigation: Merchants, Crowdsourcing, Public Perks, Logs
- Main content: Tables with inline actions
- Pending submissions: Yellow badge with count
- Approve/Reject: Inline buttons with confirmation modal

---

## Images

**Hero Section:** 
- Large hero image (aspect-video or h-96) showing credit cards fanned out or wallet with cards
- Overlay with dark gradient for text legibility
- Buttons on image should have backdrop-blur-sm background

**Card Visuals:**
- Credit card network logos (Visa, Mastercard, Amex) from CDN or local assets
- Merchant placeholder images: Use unsplash.com API with category tags
- Household icon: 🏠 or similar vector icon from Heroicons

**Merchant Cards:**
- Aspect-ratio-video thumbnail images
- Fallback: Colored gradient based on category

---

## Trust & Security Patterns

- Email verification: Green checkmark badge next to verified emails
- Secure forms: Lock icon for password fields
- Household invites: Clear "Pending" vs "Active" status with color coding
- Admin actions: Confirmation modals with destructive action warnings
- JWT token display: Never shown to users, only used in headers

---

## Responsive Breakpoints

- Mobile: Full-width cards, stacked layout, bottom nav
- Tablet (md:768px): 2-column grids, persistent top nav
- Desktop (lg:1024px): 3-column grids, sidebar nav for admin
- XL (xl:1280px): Max container width, increased spacing