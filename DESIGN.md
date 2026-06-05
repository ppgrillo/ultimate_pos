# Ultimate POS — Design System

> **Source:** Google Stitch project "ultimate POS OA"
> **Style:** Vibrant Neo-Bento · Dark Mode · Glassmorphism

---

## Brand & Style

Design engineered for the next generation of digital POS. Merges **Neo-Bento** layout efficiency with **Playful Minimalism**. High-contrast focal points, glassmorphic surfaces, and a "vibrant dark" atmosphere that feels premium and high-octane.

Personality: energetic, professional in utility, fun in execution. Electric accents draw the eye to core actions while maintaining clean, breathable interfaces.

---

## Color Palette

| Token | Hex | Usage |
|-------|-----|-------|
| **Primary** | `#ccff00` | CTAs, success states, primary buttons (Electric Lime) |
| **On Primary** | `#283500` | Text on primary bg |
| **Primary Container** | `#c3f400` | Container bg for primary sections |
| **On Primary Container** | `#556d00` | Text on primary-container bg |
| **Primary Fixed** | `#c3f400` | Elevated primary bg |
| **Primary Fixed Dim** | `#abd600` | Dimmed primary bg |
| **On Primary Fixed** | `#161e00` | Text on primary-fixed |
| **On Primary Fixed Variant** | `#3c4d00` | Alt text on primary-fixed |
| **Inverse Primary** | `#506600` | Primary on dark surfaces |
| **Secondary** | `#ffb1c3` | Secondary interactions, badges, notifications |
| **On Secondary** | `#66002c` | Text on secondary bg |
| **Secondary Container** | `#ff4b89` | Container for secondary sections |
| **On Secondary Container** | `#590026` | Text on secondary-container |
| **Secondary Fixed** | `#ffd9e0` | Elevated secondary bg |
| **Secondary Fixed Dim** | `#ffb1c3` | Dimmed secondary bg |
| **On Secondary Fixed** | `#3f0019` | Text on secondary-fixed |
| **On Secondary Fixed Variant** | `#8f0041` | Alt text on secondary-fixed |
| **Tertiary** | `#ffffff` | Accent elements, highlights |
| **On Tertiary** | `#480081` | Text on tertiary bg |
| **Tertiary Container** | `#efdbff` | Container for tertiary sections |
| **On Tertiary Container** | `#8b2ce3` | Text on tertiary-container |
| **Tertiary Fixed** | `#efdbff` | Elevated tertiary bg |
| **Tertiary Fixed Dim** | `#dcb8ff` | Dimmed tertiary bg |
| **On Tertiary Fixed** | `#2c0051` | Text on tertiary-fixed |
| **On Tertiary Fixed Variant** | `#6700b5` | Alt text on tertiary-fixed |
| **Surface** | `#111508` | Main background (Midnight Carbon) |
| **Surface Dim** | `#111508` | Dim surface variant |
| **Surface Bright** | `#373b2c` | Bright surface variant |
| **Surface Container Lowest** | `#0c0f04` | Deepest surface |
| **Surface Container Low** | `#1a1d10` | Low-elevation surface |
| **Surface Container** | `#1e2113` | Default surface container |
| **Surface Container High** | `#282b1d` | High-elevation surface |
| **Surface Container Highest** | `#333627` | Highest surface |
| **On Surface** | `#e2e4cf` | Primary text |
| **On Surface Variant** | `#c4c9ac` | Secondary text |
| **Inverse Surface** | `#e2e4cf` | Surface on dark bg |
| **Inverse On Surface** | `#2f3223` | Text on inverse surface |
| **Surface Tint** | `#abd600` | Tint overlay |
| **Surface Variant** | `#333627` | Alt surface |
| **Background** | `#111508` | Page background |
| **On Background** | `#e2e4cf` | Text on background |
| **Outline** | `#8e9379` | Borders, dividers |
| **Outline Variant** | `#444933` | Subtle borders |
| **Error** | `#ffb4ab` | Error indicators |
| **On Error** | `#690005` | Text on error |
| **Error Container** | `#93000a` | Error container |
| **On Error Container** | `#ffdad6` | Text on error container |

### Color Application Rules

- **Surfaces:** Semi-transparent glass effect (`backdrop-filter: blur(20px)`) with 5-10% white opacity fill
- **Borders:** 1px glowing gradient border (`rgba(255,255,255,0.2)` → `rgba(255,255,255,0.05)`)
- **Glows:** Primary buttons use outer bloom (lime-tinted soft shadow)

---

## Typography

| Level | Font | Size | Weight | Line Height | Letter Spacing |
|-------|------|------|--------|-------------|----------------|
| **Headline XL** | Lexend | 48px | 800 (ExtraBold) | 1.1 | -0.02em |
| **Headline LG** | Lexend | 32px | 700 (Bold) | 1.2 | -0.01em |
| **Headline LG (Mobile)** | Lexend | 28px | 700 (Bold) | 1.2 | — |
| **Headline MD** | Lexend | 24px | 600 (Semibold) | 1.3 | — |
| **Body LG** | Hanken Grotesk | 18px | 400 (Regular) | 1.6 | — |
| **Body MD** | Hanken Grotesk | 16px | 400 (Regular) | 1.6 | — |
| **Label Bold** | Hanken Grotesk | 14px | 700 (Bold) | 1.0 | 0.05em |

### Font Stack

```css
--font-headline: 'Lexend', sans-serif;
--font-body: 'Hanken Grotesk', sans-serif;
--font-label: 'Hanken Grotesk', sans-serif;
```

### Typography Rules

- Headlines use tight tracking and aggressive weights for Neo-Bento tile headers
- Body text uses generous line-height to prevent visual fatigue in high-density data views
- Labels use uppercase or wide letter-spacing for compact UI elements

---

## Spacing

| Token | Value |
|-------|-------|
| Unit | 8px |
| Container Margin | 24px |
| Gutter | 16px |
| Bento Gap | 20px |

---

## Border Radius

| Token | Value |
|-------|-------|
| sm | 0.25rem (4px) |
| DEFAULT | 0.5rem (8px) |
| md | 0.75rem (12px) |
| lg | 1rem (16px) |
| xl | 1.5rem (24px) |
| full | 9999px |

### Shape Rules

- **Large components** (bento tiles): `rounded-xl` (24px)
- **Interactive elements** (buttons, tags): `rounded-lg` (16px) or pill-shaped for utility items
- Never mix sharp corners with rounded elements — nested images/media inherit parent radius

---

## Elevation & Depth

- **Glassmorphism** replaces traditional heavy shadows
- Surface fill: 5-10% white opacity + `backdrop-filter: blur(20px)`
- Borders: 1px linear gradient (subtle white → transparent)
- Active states use colored outer glows matching the element's accent

---

## Layout

- **12-column fluid grid** for desktop
- **4-column grid** for mobile
- Bento Grid philosophy — content in distinct tiles (1×1, 2×1, 2×2, etc.)
- Tiles reflow vertically on mobile; priority "hero" tiles maintain min aspect ratio
- Consistent internal tile padding: 24–32px

---

## Components

| Component | Style |
|-----------|-------|
| **Primary Buttons** | Solid Electric Lime bg, black text, high contrast |
| **Secondary Buttons** | Glass fill, Hot Pink glowing borders |
| **Bento Cards** | Core containers with subtle top-left inner glow (light source) |
| **Inputs** | Dark glass, 1px border → Electric Lime or Bright Orange glow on focus |
| **Chips & Tags** | High-saturation bg (Violet or Orange), white text, "suspended" over glass |
| **Progress Bars** | Multi-color gradients (Deep Violet → Hot Pink) |

### Interaction Patterns

- Haptic-inspired micro-animations: tiles slightly "lift" or expand on hover
- Reinforces tactile nature of the design

---

## Tailwind Configuration Reference

When implementing this design system in Tailwind CSS, map tokens as follows:

```js
// tailwind.config.ts (reference)
colors: {
  primary: {
    DEFAULT: '#ccff00',
    container: '#c3f400',
    'container-dim': '#abd600',
    'on-container': '#556d00',
  },
  secondary: {
    DEFAULT: '#ffb1c3',
    container: '#ff4b89',
  },
  tertiary: {
    DEFAULT: '#ffffff',
    container: '#efdbff',
  },
  surface: {
    DEFAULT: '#111508',
    dim: '#111508',
    bright: '#373b2c',
    container: {
      lowest: '#0c0f04',
      low: '#1a1d10',
      DEFAULT: '#1e2113',
      high: '#282b1d',
      highest: '#333627',
    },
  },
  'on-surface': '#e2e4cf',
  'on-surface-variant': '#c4c9ac',
  outline: '#8e9379',
  'outline-variant': '#444933',
  error: '#ffb4ab',
  'error-container': '#93000a',
  background: '#111508',
  'on-background': '#e2e4cf',
},
fontFamily: {
  headline: ['Lexend', 'sans-serif'],
  body: ['Hanken Grotesk', 'sans-serif'],
  label: ['Hanken Grotesk', 'sans-serif'],
},
borderRadius: {
  sm: '0.25rem',
  md: '0.75rem',
  lg: '1rem',
  xl: '1.5rem',
}
```
