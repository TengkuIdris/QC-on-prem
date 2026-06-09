# KaizenHub UI Design Guidelines

This document defines the UI design rules for the KaizenHub frontend.
It is the source of truth for colors, typography, layout, and styling
conventions used in the app.

If anything in the codebase conflicts with this document, treat this
document as the canonical reference and update the code accordingly.

---

## 1. Design Goals & Principles

KaizenHub is a professional tool for manufacturing quality management.
The UI should reflect:

- **Trust & reliability** – stable, calm visual design; avoid flashy or noisy colors
- **Clarity under pressure** – information-dense screens that remain readable
- **Consistency** – same patterns across Pareto, Fishbone, FTA, Why-Why, and KaizenHub features
- **Accessibility** – sufficient contrast, predictable focus states, and clear hierarchy

When in doubt, prefer:

- Fewer colors over more colors  
- Clear structure over decorative visuals  
- Reuse of existing patterns over new bespoke components  

---

## 2. Brand Color

KaizenHub’s official brand color is a deep green used for key brand
elements and important actions. :contentReference[oaicite:0]{index=0}

**Official KaizenHub Brand Color:**

- **DIC Spot Color**: F175 (Lierre)  
- **CMYK**: C100%, M50%, Y90%, K40%  
- **RGB**: R0, G77, B15  
- **HEX**: `#004D0D`  
- **PANTONE**: 567C  

This color appears in:

- Logo and key brandmarks
- Primary call-to-action areas where a clear “KaizenHub action” should stand out
- High-level navigation and key status indicators (used sparingly)

---

## 3. Color System

KaizenHub uses a combination of **CSS variables** (brand/token layer) and
the **MUI theme** (component layer). The variables are defined in
`src/index.css`. 

### 3.1 Brand & Token Colors (CSS variables)

Defined in `src/index.css` as custom properties: 

**Primary Brand Tokens**

- `--color-primary`: `#004D0D`  
  - KaizenHub brand green – use for:
    - Primary actions closely tied to KaizenHub’s core flows
    - Header accents or key navigation highlights
- `--color-primary-hover`: `#003A0B`  
  - Darker brand green for hover/active states
- `--color-accent-cta`: `#FFD700`  
  - Gold accent – for prominent **call-to-action** buttons or highlights
  - Use sparingly: at most one major CTA per screen
- `--color-link`: `#4B73FF`  
  - Link color and some focus/interactive states

**Backgrounds**

- `--color-bg-page`: `#FFFFFF`  
  - Default page background
- `--color-bg-surface`: `#F6F9FF`  
  - Light blue surface for cards, modals, and elevated containers

**Text**

- `--color-text-body`: `#374151`  
  - Primary body text
- `--color-text-secondary`: `#5F6D7E`  
  - Secondary text, labels, captions

**Borders & Dividers**

- `--color-border`: `#E5E8EC`  
  - Thin borders, separators, and table dividers

When writing CSS/Tailwind overrides, prefer the variables:

```css
color: var(--color-text-body);
background-color: var(--color-bg-surface);
border-color: var(--color-border);
````

### 3.2 MUI Theme Palette

MUI’s theme colors (defined in `src/theme/theme.ts`) provide a generic
palette that complements – but does not replace – the brand tokens.

* `primary`: `#007bff` (blue)
* `secondary`: `#6c757d` (gray)
* `success`: `#28a745` (green)
* `error`: `#dc3545` (red)
* `warning`: `#ffc107` (yellow)
* `info`: `#17a2b8` (teal)

**Usage guidelines:**

* Use **MUI `primary`** for generic primary buttons in neutral flows.
* Use **brand green (`--color-primary`)** only when the action is
  KaizenHub-defining (e.g., “Save analysis”, “Create Kaizen”).
  Often this is implemented via custom `sx` or CSS using the token.
* Use **`success` / `error` / `warning` / `info`** strictly for state
  semantics (status chips, alerts, form feedback).
* Avoid inventing new random colors; if a new semantic is needed, extend
  the theme in `theme.ts` and update this document.

### 3.3 Feature Gradients

Feature cards (e.g., on the home page) use distinct gradients for quick
visual recognition. These are defined in `HomePage.tsx`.

* **Pareto**
  `linear-gradient(135deg, #FF8A80 0%, #FF6B6B 100%)`
  → Red/coral, used for issues and prioritization

* **Fishbone (特性要因図)**
  `linear-gradient(135deg, #4DD0E1 0%, #4ECDC4 100%)`
  → Teal/cyan, used for cause–effect diagrams

* **Why-Why (なぜなぜ分析)**
  `linear-gradient(135deg, #42A5F5 0%, #2196F3 100%)`
  → Blue, used for analysis flows and AI conversations

* **Feedback (ご意見・ご要望)**
  `linear-gradient(135deg, #FFCA28 0%, #F7B731 100%)`
  → Yellow/gold, used for user feedback channels

Do **not** repurpose these gradients for unrelated features. If a new
major feature is introduced, define a new gradient here and reuse it
consistently.

---

## 4. Typography

The primary typeface for KaizenHub is **Noto Sans JP**, chosen for
Japanese readability and compatibility. 

### 4.1 Fonts & Stacks

* **Primary font**: `NotoSansJP`

  * Loaded via `@font-face` in `src/index.css`
  * Weights:

    * Regular: 400
    * Bold: 700

* **Body default**:

  ```css
  font-family: "NotoSansJP", Arial, sans-serif;
  ```

* **MUI fallback stack**:

  ```text
  -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
  "Helvetica Neue", Arial, sans-serif
  ```

* Additional fonts are available primarily for **diagram export
  compatibility** (e.g., Arial, Meiryo, MS Gothic, Calibri, Helvetica,
  Georgia, Osaka, BIZUDPGothic, etc.) – do not change the main UI font
  to these. 

### 4.2 Hierarchy & Usage

Keep a simple, consistent hierarchy:

* **Page titles** – large, bold (e.g., `h4`/`h5` in MUI terms)
* **Section headers** – medium, bold
* **Body text** – regular weight, `--color-text-body`
* **Secondary text** – smaller or same size with
  `--color-text-secondary` (labels, helper texts)

Guidelines:

* Use **bold sparingly** to highlight key terms or counts.
* Avoid mixing too many different font sizes on a single screen.
* For Japanese text, ensure line-height is comfortable (1.4–1.6).

---

## 5. Layout System

The main authenticated app uses a **three-column layout** defined in
`src/components/layout/Layout.tsx`. 

```text
+----------+------------------+---------------+
| Sidebar  |     Header       | Right Panel   |
| (70-280px| (64px height)    | (300-350px)   |
|          +------------------+               |
|          | Main Content     |               |
|          | (Outlet)         |               |
|          |                  |               |
+----------+------------------+---------------+
```

* **Sidebar**

  * Collapsible navigation
  * Width:

    * 280px (expanded)
    * 72px (collapsed)
  * On mobile/tablet, behaves as an overlay (slides in/out)

* **Header**

  * Height: 64px
  * Contains breadcrumbs and feature-specific actions
  * Should remain visually light; avoid heavy backgrounds unless needed
    for contrast

* **Main Content**

  * React Router `<Outlet />` for feature views
  * Use consistent padding (e.g., 16–24px) on all sides
  * Avoid edge-to-edge content touching the viewport edges

* **Right Panel**

  * Width: 300–350px on desktop
  * Optional, feature-specific (e.g., details, logs, AI context)
  * Hidden on smaller screens (tablet/mobile)

### 5.1 Responsive Behavior

Use MUI’s breakpoint system (`xs`, `sm`, `md`, `lg`, `xl`) as defined in
the theme.

Guidelines:

* Mobile-first: design for narrow viewports first, then enhance.
* On small screens:

  * Sidebar becomes overlay
  * Right panel is hidden or accessible via a toggle
  * Critical actions should remain visible (bottom bar or top actions)

Use `useMediaQuery` (MUI) where conditional rendering is necessary.

---

## 6. Styling Approach

KaizenHub combines several styling mechanisms: CSS variables, MUI theme
with `sx`, Tailwind utilities, and some global styles via styled-components. 

### 6.1 Tools & Layers

* **CSS Variables** (`src/index.css`)

  * Base color system (`--color-*` tokens)
  * Used for brand and background/text tokens

* **MUI Theme** (`src/theme/theme.ts`)

  * Palette (primary/secondary/etc.)
  * Typography (font sizes, weights)
  * Breakpoints and spacing

* **MUI `sx` Prop**

  * Component-level styling and responsive overrides
  * Use for local tweaks instead of ad-hoc CSS files

* **Tailwind CSS**

  * Utility classes for quick layout/spacing
  * Prefer using Tailwind only for standard utilities (flex, grid,
    padding, margin) and rely on tokens for colors

* **styled-components**

  * Global styles in `src/theme/globalStyles.ts`
  * Avoid creating many new styled components unless a pattern is reused

### 6.2 Preferred Patterns

* For **new components**:

  * Start with MUI component + `sx` + Tailwind utilities for layout
  * Use CSS variables for colors:

    ```tsx
    <Box
      sx={{
        backgroundColor: "var(--color-bg-surface)",
        color: "var(--color-text-body)",
      }}
      className="p-4"
    >
      ...
    </Box>
    ```

* For **buttons**:

  * Use MUI `Button`:

    * `variant="contained"` with `color="primary"` for standard actions
    * Use `var(--color-primary)`/`--color-accent-cta` only when
      explicitly designing a brand CTA

* For **cards/panels**:

  * Background: `var(--color-bg-surface)`
  * Border: `1px solid var(--color-border)`
  * Rounded corners and shadow consistent with existing layout components

---

## 7. Accessibility & Contrast

Even though it is not fully formalized yet, follow these basic rules:

* Body text must have sufficient contrast against background (aim for
  WCAG AA level).
* Do not rely solely on color to indicate state; combine color with:

  * Icons
  * Text labels
  * Patterns (e.g., underline for links)
* Focused elements should:

  * Be clearly visible (outline or shadow)
  * Preferably use `--color-link` or a related accent as the focus
    indicator

If you introduce a new color for status or emphasis, verify contrast
using a contrast checker before committing.

---

## 8. Adding or Changing UI Design Rules

When you need to introduce a new pattern (color, layout, or component):

1. **Check first**:

   * Does an equivalent pattern already exist in the app?
   * Can you reuse an existing component from `src/components/` or a
     feature folder?

2. **If truly new**:

   * Add tokens (if needed) in `src/index.css`
   * Extend the MUI theme in `src/theme/theme.ts` if it’s a palette
     concern
   * Document the new rule in this file (`docs/ui-design.md`):

     * What the new pattern is
     * When to use it
     * When **not** to use it
     * Example file that uses it

3. **Keep it simple**:

   * Avoid introducing multiple variants that differ only slightly
   * Favor a small, well-documented design system over many ad-hoc styles

---

## 9. Quick Checklist for Contributors

Before submitting UI changes:

* [ ] Are you using existing color tokens (`--color-*`) and theme colors
  instead of hard-coded values?
* [ ] Does the layout respect the three-column layout and responsive
  rules where applicable?
* [ ] Are typography and hierarchy consistent with existing screens?
* [ ] If you introduced a new pattern, did you update `docs/ui-design.md`
  and, if needed, `src/theme/theme.ts` or `src/index.css`?
* [ ] On mobile, is the screen still usable and readable?

If you’re unsure, open this file and the referenced source files and
align your implementation to the existing patterns.