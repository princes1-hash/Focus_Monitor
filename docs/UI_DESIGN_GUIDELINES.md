# UI_DESIGN_GUIDELINES.md

## AI-Driven Ocular & Cognitive Focus Monitoring Platform

This document is the visual and interaction source of truth for the
frontend implementation. Follow it across the landing page and all
authenticated pages.

## 1. Design direction

Use the supplied fitness landing-page image as a **visual reference
only**. Reproduce its visual language, not its fitness content.

The intended feel is: - Premium, cinematic, editorial, modern. - Dark
and immersive, with strong typography. - Minimal rather than crowded. -
Data-rich without looking like a generic admin template. - Consistent
across public pages and the authenticated application.

The product is a cognitive monitoring research/prototype platform. Do
not use fitness, body-transformation, weight-loss, or
athletic-performance messaging.

## 2. Visual system

### Core palette

Use CSS variables or Tailwind theme tokens so the palette is consistent
and easy to tune.

  --------------------------------------------------------------------------
  Token                   Suggested value            Usage
  ----------------------- -------------------------- -----------------------
  `--background`          `#101012`                  Main page background

  `--surface`             `#1A1A1E`                  Cards and panels

  `--surface-raised`      `#242428`                  Elevated cards, menus

  `--text-primary`        `#F5F5F5`                  Main text

  `--text-secondary`      `#B8B8BE`                  Supporting text

  `--text-muted`          `#85858D`                  Metadata and hints

  `--border-subtle`       `rgba(255,255,255,0.12)`   Card and divider
                                                     borders

  `--accent`              `#F07832`                  Primary accent and
                                                     active states

  `--success`             `#58B88A`                  Successful
                                                     connection/status

  `--warning`             `#E6B45C`                  Caution and degraded
                                                     input

  `--danger`              `#E36A6A`                  Errors and critical
                                                     alerts
  --------------------------------------------------------------------------

These are starting tokens, not rigid values. Maintain sufficient
contrast and do not use status colors as decoration.

### Backgrounds and surfaces

-   Prefer near-black and charcoal rather than pure black everywhere.
-   Use subtle gradients to create depth.
-   Use translucent glass-like panels sparingly, with a restrained blur
    and visible border.
-   Ensure text remains readable over imagery; use a dark overlay behind
    text.
-   Avoid excessive glow, neon colors, and large areas of saturated
    orange.

### Typography

-   Use a clean geometric sans-serif for interface text.
-   Use large, bold, uppercase display typography for hero headlines and
    major page titles.
-   Keep body text comfortable and readable.
-   Use a local/system fallback if Google Fonts cannot be reached in a
    development sandbox.
-   Never make the app depend on an external font service to build
    successfully.

Suggested fallback:
`font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;`

## 3. Layout and navigation

### Public navigation

Use a floating or visually lightweight navigation bar inspired by the
reference: - Product mark/name on the left. - Main links such as Home,
About, How It Works, Features. - Login and a visually prominent Get
Started action on the right. - Rounded or pill-shaped navigation
controls. - On mobile, collapse links into an accessible menu.

### Authenticated navigation

Keep the same visual identity, but prioritize usability: - Persistent
sidebar on wide screens or a compact top navigation. - Main
destinations: Overview, Monitor, My Moments, Session History, Analytics,
Profile. - Clearly indicate the active page. - On mobile, use a compact
menu or bottom navigation if it improves access.

Do not make the navigation obscure the monitoring controls or live data.

## 4. Landing page

Build a polished, responsive landing page with these sections:

1.  **Hero**
    -   Full-bleed, relevant background image or abstract visual.
    -   Dark gradient overlay.
    -   Large headline, for example: "UNDERSTAND YOUR FOCUS".
    -   Short, accurate product description.
    -   Primary action: "Get Started".
    -   Secondary action: "Explore Features".
    -   Floating data-preview cards inspired by the reference image.
2.  **About**
    -   Explain the platform as an experimental ocular and EEG-related
        monitoring tool.
    -   Avoid claims that it diagnoses, clinically measures, or
        definitively identifies a mental state.
3.  **How it works**
    -   Show the input → analysis → fusion → session insights flow.
    -   Distinguish webcam-derived indicators from EEG data.
    -   Label simulated EEG clearly wherever applicable.
4.  **Features**
    -   Ocular indicators.
    -   EEG-related indicators.
    -   Multimodal/fusion output.
    -   Session history and captured moments.
    -   Personal analytics.
5.  **Privacy**
    -   Explain camera permission.
    -   Explain optional image/frame storage.
    -   Explain user control and deletion.
6.  **Call to action and footer**
    -   Clear next step.
    -   Links to relevant public pages and privacy information.

Avoid fake testimonials, unsupported user counts, fabricated partner
logos, or invented performance statistics.

## 5. Auth pages

Login and signup must use the same dark visual system: - Focused form
card with clear hierarchy. - Visible labels, not placeholder-only
labels. - Helpful inline validation. - Password visibility toggle. -
Loading, success, and error states. - Keyboard accessible controls. -
Clear navigation between login and signup.

Do not make authentication depend on client-side-only checks. The
backend remains authoritative.

## 6. Dashboard

The dashboard should feel like a refined product workspace, not a
generic template.

Include: - Greeting and concise orientation. - Primary "Start
Monitoring" action. - Summary cards for real stored data only. - Recent
sessions. - Recent captured moments. - Useful empty states for new
accounts.

Never fabricate session counts, scores, trends, or historical values. If
no data exists, explain how to create the first session.

## 7. Monitoring screen

This is the core application screen. Optimize it for clarity and
stability.

Suggested layout: - Main area: webcam preview with explicit camera
status and permission controls. - Adjacent or lower panels: vision
indicators, EEG indicators, fused model output, and input quality. -
Clear Start, Pause/Resume, and Stop controls. - Prominent but not
distracting **Capture Moment** action. - Connection state for camera,
backend, and EEG source. - Timestamp and current session duration.

Important behavior: - Ask for webcam permission before accessing the
camera. - Provide a clear disabled/unavailable state if permission is
denied or no camera exists. - Do not imply that a webcam is active when
it is not. - Clearly label simulated EEG as simulated. - Show
unavailable or stale values as unavailable, not as zero or invented
values. - Display model outputs as experimental estimates, not medical
conclusions. - Capture Moment must save the current available telemetry
and timestamp through the backend. If image capture is enabled, obtain
explicit consent and show the user that a frame is being stored. - Show
a success message only after the server confirms persistence. Show an
actionable error if saving fails.

## 8. My Moments and session history

### My Moments

Use a timeline or responsive card grid. Each item should show: - Date
and time. - Associated session. - Fused model state, if available. -
Relevant recorded metrics. - Optional stored image, only when image
storage was enabled.

Provide filtering, sorting, detail view, and deletion with confirmation.

### Session history

Show session date, duration, captured-moment count, and available
summary metrics. Include pagination or incremental loading for larger
histories.

Both pages must display only records belonging to the authenticated
user.

## 9. Analytics

Use charts only when there is enough real data to make them meaningful.

-   Provide clear chart titles, units, legends, and date ranges.
-   Use restrained chart colors consistent with the palette.
-   Avoid misleading axes or exaggerated visual changes.
-   Explain gaps or missing data.
-   Provide an empty state when there is insufficient history.
-   Do not treat model confidence as a clinically validated measure.

## 10. Profile and privacy settings

Provide: - Name and email details. - Password change flow. - Optional
webcam-frame storage preference. - Account/data deletion controls. -
Clear descriptions of what each privacy setting changes.

Require confirmation for destructive actions.

## 11. Components and interaction states

Create reusable components for: - Buttons and icon buttons. - Navigation
items. - Glass/metric cards. - Status indicators. - Form fields. -
Dialogs and confirmation dialogs. - Toast/notification messages. -
Loading skeletons. - Empty states. - Error states. - Chart containers.

Every interactive element must have: - Hover and focus states. -
Disabled state when applicable. - Loading state for asynchronous
actions. - Accessible labels and keyboard support.

No decorative button should appear functional if it has no action. Do
not use `href="#"` as a substitute for implementation.

## 12. Motion

Use restrained animation: - Short transitions for hover and active
states. - Subtle entrance animation for major sections. - Small feedback
animation for Capture Moment. - Avoid constant motion that distracts
during monitoring. - Respect `prefers-reduced-motion`.

## 13. Responsive behavior

Test at mobile, tablet, laptop, and wide desktop widths.

-   Prevent horizontal overflow.
-   Stack dashboard cards sensibly.
-   Keep monitoring controls reachable on small screens.
-   Ensure charts remain readable.
-   Make forms usable on narrow screens.
-   Keep navigation accessible.

## 14. Accessibility and quality

-   Use semantic HTML.
-   Maintain readable contrast.
-   Provide visible keyboard focus.
-   Use labels and accessible names for controls.
-   Do not communicate status by color alone.
-   Provide text equivalents for important chart information.
-   Avoid flashing or rapid animations.

## 15. Implementation constraints

-   Preserve the existing Next.js, React, TypeScript, and Tailwind stack
    identified in project inspection.
-   Reuse existing working components and functionality where sensible.
-   Keep API calls aligned with `API_DOCUMENTATION.md`.
-   Do not invent backend response fields.
-   Keep secrets out of frontend code.
-   Do not add fake data to make screens look populated.
-   Ensure the application can build without network access to Google
    Fonts.
-   Document any design decisions that cannot be implemented because the
    existing project or assets do not support them.

## Definition of done

The UI is ready for integration when: - All required pages exist and are
responsive. - The reference image's visual language is recognizable
throughout the product. - Forms and navigation work. - Monitoring states
are clearly represented. - Capture Moment is connected to the documented
API. - Empty, loading, error, and success states are implemented. - No
fake metrics or unsupported medical claims are displayed. - Frontend API
usage matches `API_DOCUMENTATION.md`.
