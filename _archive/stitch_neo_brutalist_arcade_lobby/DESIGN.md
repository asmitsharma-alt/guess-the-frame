---
name: Radical Arcade
colors:
  surface: '#fafaf4'
  surface-dim: '#dadad5'
  surface-bright: '#fafaf4'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f4f4ee'
  surface-container: '#eeeee8'
  surface-container-high: '#e8e8e3'
  surface-container-highest: '#e3e3dd'
  on-surface: '#1a1c19'
  on-surface-variant: '#4a4451'
  inverse-surface: '#2f312d'
  inverse-on-surface: '#f1f1eb'
  outline: '#7c7482'
  outline-variant: '#ccc3d3'
  surface-tint: '#714aaa'
  primary: '#714aaa'
  on-primary: '#ffffff'
  primary-container: '#bd93f9'
  on-primary-container: '#4e2484'
  inverse-primary: '#d7baff'
  secondary: '#006e2b'
  on-secondary: '#ffffff'
  secondary-container: '#55fe7e'
  on-secondary-container: '#00722d'
  tertiary: '#a42e79'
  on-tertiary: '#ffffff'
  tertiary-container: '#fe78c5'
  on-tertiary-container: '#770054'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#eddcff'
  primary-fixed-dim: '#d7baff'
  on-primary-fixed: '#290055'
  on-primary-fixed-variant: '#593090'
  secondary-fixed: '#69ff88'
  secondary-fixed-dim: '#31e368'
  on-secondary-fixed: '#002108'
  on-secondary-fixed-variant: '#00531e'
  tertiary-fixed: '#ffd8e9'
  tertiary-fixed-dim: '#ffafd7'
  on-tertiary-fixed: '#3c0029'
  on-tertiary-fixed-variant: '#860f60'
  background: '#fafaf4'
  on-background: '#1a1c19'
  surface-variant: '#e3e3dd'
typography:
  headline-xl:
    fontFamily: Anybody
    fontSize: 48px
    fontWeight: '900'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Anybody
    fontSize: 32px
    fontWeight: '800'
    lineHeight: '1.2'
  headline-lg-mobile:
    fontFamily: Anybody
    fontSize: 24px
    fontWeight: '800'
    lineHeight: '1.2'
  headline-sm:
    fontFamily: Anybody
    fontSize: 18px
    fontWeight: '700'
    lineHeight: '1.2'
  body-lg:
    fontFamily: Space Grotesk
    fontSize: 18px
    fontWeight: '500'
    lineHeight: '1.5'
  body-md:
    fontFamily: Space Grotesk
    fontSize: 16px
    fontWeight: '500'
    lineHeight: '1.5'
  label-bold:
    fontFamily: JetBrains Mono
    fontSize: 14px
    fontWeight: '700'
    lineHeight: '1'
  label-sm:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: '1'
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 4px
  gutter: 16px
  margin-mobile: 16px
  margin-desktop: 32px
  card-padding: 20px
  shadow-offset: 6px
---

## Brand & Style

This design system is a high-energy fusion of **Neo-Brutalism** and **Retro Arcade** aesthetics. It is designed for competitive social gaming, creative platforms, and high-engagement digital experiences. The visual narrative rejects the "safe" polish of modern SaaS in favor of a raw, "sticker-slapped" aesthetic that feels hand-crafted and tactile.

The primary personality is energetic, rebellious, and playful. It utilizes heavy strokes, sharp offsets, and a vibrant color palette to create a sense of physical presence. The design should evoke the nostalgic excitement of a 90s arcade cabinet while maintaining the functional clarity of contemporary web interfaces.

**Key Visual Pillars:**
- **Thick Outlines:** Every container and interactive element is bound by a solid 2px to 4px black border.
- **Hard Shadows:** No blurs or gradients. Depth is created through hard-edged, offset black rectangles.
- **Sticker Aesthetic:** UI components often look like they’ve been placed on a canvas, utilizing slight rotations or "irregular" container shapes.
- **Intentional Rawness:** Use of monospaced fonts and heavy uppercase headers to ground the playful colors in a structured, "dev-mode" vibe.

## Colors

The palette is built on high-contrast saturation against a warm, off-white "paper" background. Colors are used functionally to denote different sections or states, rather than for aesthetic decoration.

- **Primary (Purple):** Used for main headers, active states, and focus areas.
- **Secondary (Green):** Reserved for "Ready," "Success," and "Online" indicators.
- **Tertiary (Pink):** Used for info panels, destructive actions, or secondary highlights.
- **Accent (Yellow):** Used for "Host" status, high-priority alerts, or call-to-action modifiers.
- **Neutral (Off-white):** The base canvas color, preventing the high-contrast elements from feeling overly clinical.
- **Stroke (Black):** The absolute foundation. Every element must be contained within a #000000 stroke to maintain the Neo-Brutalist structure.

## Typography

The typography strategy prioritizes impact and character. We use **Anybody** for headlines to provide a variable, aggressive weight that feels like a game title. **Space Grotesk** handles body copy, offering a geometric but readable feel. **JetBrains Mono** is used for metadata, status labels, and "technical" information to lean into the retro-computing aesthetic.

All headlines must be **UPPERCASE**. This reinforces the "urgent" arcade feel. Letter-spacing should be tightened for large headings to create a solid block of text.

## Layout & Spacing

This design system uses a **fixed-column grid** with high-density spacing. The layout is structured but allows for "breaking the grid" via offset shadows and slightly tilted components.

- **The 4px Grid:** All spacing (padding, margins, gaps) should be multiples of 4px.
- **Fixed Width Containers:** Main content should live in centered containers (max-width 1200px) to maintain the "arcade cabinet" focused feel.
- **Gutter Strategy:** 16px gutters between cards. Use 24px or 32px for larger sectional separations.
- **Mobile Reflow:** On mobile, columns collapse to a single stack. Shadows should be reduced from 6px to 3px to maintain hit-target accuracy.

## Elevation & Depth

Depth in this design system is purely **orthographic and flat**. 

- **Hard Shadows:** Elevation is communicated by a solid black rectangle (`#000000`) offset to the bottom-right. 
- **Shadow Scale:**
  - *Level 1 (Buttons/Small Chips):* 3px offset.
  - *Level 2 (Cards/Main Buttons):* 6px offset.
  - *Level 3 (Modals/Large Sections):* 10px offset.
- **Interaction:** On hover, buttons and interactive cards should "press down" by reducing the shadow offset and translating the element's position (e.g., `transform: translate(2px, 2px)`). This creates a physical click feel without needing gradients.

## Shapes

The shape language is primarily **rectilinear with soft corners**. This avoids the "too sharp" look of pure Brutalism, making it feel more like a friendly game interface.

- **Base Radius:** 4px (Soft) for most components.
- **Outer Containers:** 8px (rounded-lg) for main sections to contain the inner 4px components harmoniously.
- **Inner Accents:** Use 0px radius for internal "technical" readouts (like progress bars or timer boxes) to provide a contrast between "container" and "data."

## Components

### Buttons
- **Primary:** High-contrast color (Green or Purple), 3px black stroke, 6px hard shadow. Text is Uppercase Anybody.
- **Secondary:** White background, 3px black stroke, 4px hard shadow.
- **Pressed State:** Element moves toward the shadow, shadow shrinks.

### Cards
- **Structure:** Always feature a header bar (often a different color than the body) separated by a 2px horizontal line.
- **Sticker Mode:** Occasionally apply a `-1deg` or `1deg` rotation to secondary cards to enhance the "hand-placed" feel.

### Input Fields
- **Style:** Flat white background, 3px black stroke. Focus state changes stroke color to Primary Purple or increases stroke thickness.
- **Labels:** Use JetBrains Mono above the field, always uppercase.

### Chips & Badges
- **Online Status:** Pill-shaped (rounded-xl) with a solid green circle icon.
- **Category Tags:** Rectangular (rounded-sm) with 2px strokes, no shadows for non-interactive versions.

### Progress Bars
- **Frame:** Thick black border.
- **Fill:** Solid neon color (Green or Yellow).
- **Detail:** Use a "segmented" look or a simple flat fill. No rounded ends on the inner fill.

### Checkboxes
- **Style:** Square, 2px stroke. When checked, fill with a primary color and a thick black checkmark. Hard shadow offset by 2px.