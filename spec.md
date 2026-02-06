**Role:**
Act as a Senior Frontend Engineer specialized in High-Performance Static Sites and PWAs.

**Objective:**
Build a highly optimized, static web application for a music festival ("Cosquín Rock® 2026") timetable. The app must handle low-network environments effectively.

**Tech Stack:**

1. **Framework:** Astro (for static HTML generation and zero-JS default). Project was initialized with `npm create astro@latest`.

**Core Features & Requirements:**

1. **The Timetable Grid (React Component):**

- **Layout:**
- **X-Axis (Top):** Stages (Escenarios). Must be sticky on scroll.
- **Y-Axis (Left):** Time (Hours). Must be sticky on horizontal scroll.
- **Content:** Render artist slots as absolute positioned blocks within the grid columns.

- **Time Logic:**
- The festival runs from ~14:00 to ~03:00 (next day). Argentine time.
- Handle day crossover: Events starting after midnight (00:00 to 03:00)
- Normalize time: Treat 00:00, 01:00, 02:00 as 24:00, 25:00, 26:00 to render them at the bottom of the grid, not the top.
- Calculation: `(EventTimeInMinutes - StartTimeInMinutes) * PixelsPerMinute`.

- **Visuals:** Dark mode theme (Slate/Zinc palette). The blocks should look distinct and clickable.

2. **State Management (URL-Based):**

- Allow users to select/click artists to "highlight" them or add them to their personal schedule.
- **No Database:** The state of selected artists must be stored in the URL Query Params (e.g., `?ids=Artist1,Artist2` or a compressed string).
- On page load, read the URL to hydrate the selected state.

3. **Export Features:**

- **Shareable Link:** Generate a URL with the selected artists in query params. This link should be copyable o sendeable via social media (e.g., Twitter, WhatsApp, etc.). The page opened via this link should reflect the selected artists in read-only mode. Should be the same page with another path or query param to indicate read-only mode. Can be an "Create your schedule" button that switches to default mode.
- **Export to Calendar:** A button to add selected artists to Google Calendar or download an `.ics` file. Prioritize Google Calendar integration.

4. **Performance(Critical):**

- The app must handle low-network environments effectively.
- Minimize JavaScript: Use Astro's zero-JS-by-default approach. Only load React where necessary.
- Optimize assets and prioritize system fonts only (no external font loading).

5. **Offline Support (PWA):**

- **Strategy:** Stale-While-Revalidate (serve cached content instantly, update in background).
- **Service Worker (`public/sw.js`):** Caches all pages, assets, and fonts. Falls back to offline message if no cache.
- **Registration script (`public/register-sw.js`):** Non-blocking, registered after page load.
- **Web App Manifest (`public/manifest.json`):** Enables installability and PWA metadata.
- **Update notification:** Toast alerts users when new version is available.

**Data Structure:**
I will provide an array `data.json`. Each object contains:

- `artist`: name of the artist.
- `day`: 1 or 2.
- `stage`: name of the stage (x-axis).
- `startAt`: time in ISO 8601 format and UTC-3 timezone.
- `endAt`: time in ISO 8601 format and UTC-3 timezone.

5. **Accessibility & UX:**

- The app must be in Spanish.
- Ensure keyboard navigability and screen reader compatibility.
- Provide visual feedback on interactions (e.g., highlighting selected artists).
- Responsive design for mobile and desktop devices (mainly mobile-first).
- Logo and branding consistent with Cosquín Rock® aesthetics.
- Logo resource is available in `resources\logo.webp`
- Clarify that it is not the official website of Cosquín Rock® and include a link to the official Cosquín Rock® website: `https://cosquinrock.net/`
- Footer with credits: "Developed by [Your Name] - Data from Cosquín Rock® Official". Link to repository for contributions.
