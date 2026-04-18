# UI/UX Rules

Design system, interaction patterns, and visual standards for Seller's Compliance.

## Design Language: SC Bold

Seller's Compliance uses the SC Bold design system — clean, high-contrast, and operationally focused. Designed for fast scanning during high-pressure scheduling.

### Color Palette

| Role | Color | Hex | Usage |
|------|-------|-----|-------|
| Primary | Gold/Yellow | `#FDE047` | Highlights, active states, selected items |
| SC Red | Red | `#C8102E` | Active sidebar icons, alerts, danger states |
| SC Gold | Gold | `#EFB948` | Avatar accent, branding |
| Warning Gold | Gold | `#D4AF37` | Unconfirmed/at-risk indicators |
| Background | Warm white | `#FFFDF5` | Page background |
| Surface | White | `#FFFFFF` | Cards, panels |
| Sidebar | True Black | `#000000` | Sidebar background |
| Text | Near-black | `#2B2B2B` | Primary text, headings |
| Muted | Gray | `#71717A` | Secondary text, subtitles |
| Success | Green | `#16a34a` | Completed, confirmed |
| Danger | Red | `#C8102E` | Delete, cancelled, errors |
| Info | Blue | `#2563EB` | Today indicator, links |

### Typography

| Element | Font | Weight | Size | Usage |
|---------|------|--------|------|-------|
| Page Titles | Inter | Bold (700) | 24px | All admin page h1 headings |
| Section Headers | Inter | Semibold (600) | 14-16px | Card titles, metric labels |
| Body | Inter | Regular (400) | 13-14px | All body text, labels, values |
| Small Labels | Inter | Bold (700) | 10px uppercase | Metric category labels |

Loaded via `next/font/google` in `src/app/layout.tsx`. CSS variable: `--font-inter`. Applied at the admin layout level so all pages inherit automatically.

### Visual Characteristics

- **Borders**: `border-2` with `border-black` or `border-[#2B2B2B]`. Bold, intentional borders.
- **Shadows**: Hard drop shadows via `neo-shadow` CSS classes. No soft/blurred shadows.
- **Border radius**: `rounded-lg` or `rounded-xl`. Never perfectly square, never fully round (except avatars/pills).
- **Hover states**: Border change or shadow shift. e.g., `neo-shadow-hover`.
- **Contrast**: All text must meet WCAG AA contrast ratios against its background.
- **User Badge**: Pill-shaped container with black/gold avatar, role label, hover border.

## Interaction Patterns

### Drag & Drop (Dispatch Timeline)
- **Grab cursor** on draggable items (`cursor-grab`, `cursor-grabbing` while dragging)
- **Drop zone highlight**: Yellow overlay (`bg-[#FDE047]/40`) when dragging over a valid time slot
- **Drag overlay**: Ghost of the dragged job follows the cursor via `@dnd-kit` DragOverlay
- **Drop feedback**: Toast notification confirming the schedule action

### Timeline Grid
- **Grid**: 9AM-5PM horizontal, inspectors vertical, flat list
- **Time slots**: 30-minute increments. `HOUR_WIDTH_PX = 120` pixels per hour.
- **Job blocks**: Positioned absolutely. Width = duration proportional to hour width.
- **Scrollable**: Horizontal scroll for times, vertical scroll for inspectors. Header is sticky.

### Forms
- All inputs use consistent Tailwind styling with bold borders
- Required fields marked visually (not just HTML required)
- Error states use red border + text
- Submit buttons are prominent yellow with black text

### Toasts & Feedback
- Schedule actions show brief success/error toasts via `ScheduleToast` component
- No modal confirmations for drag-and-drop (speed is critical)
- Delete actions use confirmation dialogs

## Responsive Strategy

Seller's Compliance admin is primarily a **desktop tool** — the dispatch timeline requires a wide viewport for the time grid. Mobile inspector view is planned but not yet built.

- **Minimum effective width**: ~1024px
- **Sidebar**: Fixed width, always visible on desktop
- **Timeline**: Horizontally scrollable within the main content area

## Component Library

UI primitives come from two sources:

1. **@base-ui/react** — Accessible primitives for dialogs, dropdowns, selects
2. **shadcn/ui (copied)** — Pre-styled components in `src/components/ui/`. Customized with neo-brutalist theme.

Never add new UI library dependencies without documenting here.

## Icon Usage

Sidebar uses inline SVG icons (stroke-based, 17x17 display, 24x24 viewBox, stroke-width 1.75, round caps/joins). Other icons from `lucide-react`:
- Inline with text: 16px
- Feature icons/empty states: 24-32px
