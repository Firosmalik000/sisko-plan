---
name: Sisko Plan Public Landing
description: A scan-first Indonesian retail landing built from ivory paper, forest ink, ruled records, and one orange action color.
colors:
    primary-action: '#f05a16'
    primary-action-hover: '#db4909'
    forest-ink: '#063f35'
    forest-ink-deep: '#022e27'
    ivory-paper: '#fbf8ef'
    ivory-paper-strong: '#f2ecdc'
    ruled-line: '#d8cebb'
    muted-copy: '#5e6964'
    mint-status: '#e8f1d3'
typography:
    display:
        fontFamily: "Bahnschrift, 'Trebuchet MS', sans-serif"
        fontSize: 'clamp(3.35rem, 5.15vw, 6rem)'
        fontWeight: 750
        lineHeight: 0.94
        letterSpacing: '-0.035em'
    headline:
        fontFamily: "Bahnschrift, 'Trebuchet MS', sans-serif"
        fontSize: 'clamp(2.5rem, 4.6vw, 5rem)'
        fontWeight: 750
        lineHeight: 0.98
        letterSpacing: '-0.035em'
    title:
        fontFamily: "Bahnschrift, 'Trebuchet MS', sans-serif"
        fontSize: 'clamp(1.1rem, 1.8vw, 1.45rem)'
        fontWeight: 700
        letterSpacing: '-0.03em'
    body:
        fontFamily: "Bahnschrift, 'Trebuchet MS', sans-serif"
        fontSize: '0.9rem'
        fontWeight: 400
        lineHeight: 1.65
    label:
        fontFamily: "Bahnschrift, 'Trebuchet MS', sans-serif"
        fontSize: '0.7rem'
        fontWeight: 700
        letterSpacing: '0.08em'
rounded:
    record: '0.35rem'
    control: '0.45rem'
    surface: '0.5rem'
    pill: '10rem'
spacing:
    xs: '0.5rem'
    sm: '0.75rem'
    md: '1rem'
    lg: '1.5rem'
    xl: '2rem'
    section: 'clamp(5rem, 9vw, 9rem)'
components:
    button-primary:
        backgroundColor: '{colors.primary-action}'
        textColor: '#ffffff'
        typography: '{typography.body}'
        rounded: '{rounded.control}'
        padding: '0.75rem 1.35rem'
        height: '46px'
    button-primary-hover:
        backgroundColor: '{colors.primary-action-hover}'
        textColor: '#ffffff'
        rounded: '{rounded.control}'
    button-dark:
        backgroundColor: '{colors.forest-ink}'
        textColor: '#ffffff'
        typography: '{typography.body}'
        rounded: '{rounded.control}'
        padding: '0.75rem 1.35rem'
        height: '46px'
    operations-board:
        backgroundColor: '{colors.ivory-paper}'
        textColor: '{colors.forest-ink-deep}'
        rounded: '{rounded.record}'
        padding: '1.2rem 1rem'
    status-live:
        backgroundColor: '{colors.mint-status}'
        textColor: '{colors.forest-ink}'
        typography: '{typography.label}'
        rounded: '{rounded.record}'
        padding: '0.22rem 0.4rem'
---

# Design System: Sisko Plan Public Landing

## Overview

**Creative North Star: "The Scan-First Retail Ledger"**

The public landing page feels like an orderly worktable for a real Indonesian shop: warm ivory paper, dark forest ink, fine ruled divisions, receipts, and compact operational figures. Its confidence comes from a visible scan interaction rather than generic SaaS decoration. A product moves from scan to cart while stock and sales updates show how kasir, stok, kas, and laporan remain connected.

The world is professional, compact, and direct. Large editorial headings create persuasion while small tables, totals, status labels, and chart marks supply believable operational texture. Orange is reserved for decisive action and small points of attention; the rest of the interface stays calm and readable. The public experience is light-only.

**Key Characteristics:**

- Warm ivory paper rather than pure-white software chrome.
- Forest ink carries brand, structure, and high-contrast content.
- Ruled rows and columns organize information before cards or decoration.
- Compact scan and operations data is always identified as synthetic proof.
- Direct Indonesian labels and actions avoid marketing filler.
- Responsive simplification preserves the primary action and operational story.

## Colors

The palette combines warm paper neutrals with credible forest greens, then uses vivid orange as a deliberately scarce action signal.

### Primary

- **Action Orange:** The sole high-energy action color for primary calls to action, directional arrows, focus emphasis, chart highlights, and the hero rule.
- **Pressed Orange:** The darker hover state keeps the primary action tactile without introducing a new hue.

### Secondary

- **Forest Ink:** Brand marks, dark buttons, icons, charts, and major operational surfaces.
- **Deep Forest Ink:** Primary text and the full dark setup section, providing the strongest contrast in the system.

### Neutral

- **Ivory Paper:** The main page and board canvas; it should remain visibly warm.
- **Strong Ivory Paper:** A slightly deeper paper layer for restrained section and surface separation.
- **Ruled Line:** The structural divider for rows, columns, sections, and board boundaries.
- **Muted Copy:** Secondary explanations and metadata that remain readable without competing with headings.
- **Mint Status:** Positive or live status fill, always paired with explicit text.

### Named Rules

**The One Orange Action Rule.** Orange identifies the primary action or a compact point of operational attention; it never becomes a broad decorative wash.

**The Paper, Not Chrome Rule.** Prefer warm ivory surfaces and visible ruled structure over pure-white glass panels or generic gray application chrome.

## Typography

**Display Font:** Bahnschrift (with Trebuchet MS and sans-serif fallbacks)
**Body Font:** Bahnschrift (with Trebuchet MS and sans-serif fallbacks)
**Label Font:** Bahnschrift (with Trebuchet MS and sans-serif fallbacks)

**Character:** A single practical grotesk family keeps sales language and operational data in the same visual voice. Tight, heavy headlines feel editorial; compact labels and figures feel like a clean ledger.

### Hierarchy

- **Display:** Heavy and tightly tracked, used only for the first-view promise; balanced wrapping is part of the composition.
- **Headline:** Large, compact section statements that maintain the same tight rhythm as the hero.
- **Title:** Firm service and step names, sized for fast scanning rather than decoration.
- **Body:** Direct Indonesian prose with generous line height and constrained line length, usually between 320px and 560px wide.
- **Label:** Small, bold metadata; uppercase and expanded tracking are reserved for labels such as `Data contoh`, not ordinary controls or body copy.
- **Operational data:** Dense values may descend to approximately 0.5-0.75rem inside the proof board, but labels, row rules, alignment, and explicit status text must keep them legible.

### Named Rules

**The One Voice Rule.** Do not introduce a display serif or a second expressive family; hierarchy comes from scale, weight, tracking, and density within Bahnschrift.

**The Direct Indonesian Rule.** Use concise, familiar store language and action-led labels; avoid decorative explanation, repeated instruction, and unverified claims.

## Layout

The system uses a centered fluid container capped at 1480px with 1rem side gutters at wide widths. The hero is an asymmetric two-column composition: an editorial scan promise sits beside a live scanner-and-cart proof. Subsequent sections move through a connected workflow strip, familiar operational problems, a dark three-step sequence, ruled feature rows, horizontally adaptable product views, operational coverage, a comparison with manual recording, FAQ, and a full-width closing action. The pricing surface inherits the same world through an ivory hero, forest workflow proof, ruled package records, and dark closing action. Section spacing is generous and fluid, while product surfaces remain compact.

At 1279px and below, the hero columns tighten and the scan proof reduces its peripheral annotations. At 1023px and below, desktop navigation is removed, the hero becomes a single vertical flow, and the scan proof follows the copy. At 767px and below, a 44px menu control replaces desktop actions, primary hero and closing actions span the available width, the workflow and product gallery become horizontally scrollable with snap points, and the cart detail is removed from the scanner proof rather than compressed past legibility. Split layouts stack. At 374px and below, gutters, brand scale, headings, workflow widths, and proof padding tighten again for a 320px viewport.

Verify every public-page change at 320px, 375px, 640px, 768px, 1024px, 1280px, and 1536px. There must be no horizontal page overflow, clipped control, overlapping content, hidden primary action, or broken text wrapping.

### Named Rules

**The Story Survives Compression Rule.** Responsive layouts may remove secondary board columns and decorative icons, but must preserve the promise, primary action, Kasir-to-Laporan flow, and clearly labeled example data.

## Elevation & Depth

The system is flat by default. Depth comes first from paper-tone changes, fine rules, dark field reversals, and dense internal alignment. Shadows are reserved for the large operations board, the mobile navigation popover, action affordances, and the dark operational summary; they are low, broad, and tinted toward forest or orange rather than neutral black.

### Shadow Vocabulary

- **Board lift:** A broad forest-tinted shadow under the hero operations board separates the proof surface from the paper without making it float like a generic card.
- **Action lift:** Tight tinted shadows support orange and forest buttons and strengthen slightly on hover.
- **Popover lift:** A deeper compact shadow identifies the mobile navigation as a temporary layer.
- **Summary lift:** A directional forest shadow gives the dark business summary physical weight.

### Named Rules

**The Ruled Before Raised Rule.** Use a border, divider, tonal shift, or dark reversal before adding shadow; most surfaces remain flat at rest.

## Motion

Motion follows the store workflow rather than decorating every section. The authored focal sequence moves from the hero promise to the scanner, product match, stock update, and sales update. Supporting sections use distinct but restrained relationships: clipped headline reveals, alternating panel arrivals, and bounded sibling stagger for lists and package choices.

- Entrances use confident exponential ease-out and finish within 800ms.
- Repeated lists cap stagger at approximately 90ms per sibling.
- Hover feedback moves only actionable or selectable surfaces and never uses bounce.
- The scanner beam is the only nonessential loop; it pauses outside the viewport.
- Framer Motion runs through `LazyMotion`, and `MotionConfig reducedMotion="user"` removes spatial movement when the user requests reduced motion. Meaningful opacity and state feedback remain.

**The Scan Sequence Rule.** The most expressive motion belongs to scan-to-record causality. Supporting reveals must remain quieter than the scanner sequence.

**The Rest When Unseen Rule.** No looping public-page motion may continue while its surface is outside the viewport.

## Shapes

Corners are compact and practical. Operational records use a small 0.35rem radius, controls use 0.4-0.45rem, and larger summary surfaces stop at 0.5rem. Fully rounded geometry is limited to status pills, the hero accent rule, circular service icons, chart dots, and data markers. Fine 1px rules are the dominant shape-making device.

**The Compact Corner Rule.** Do not turn ledger surfaces into large soft cards; broad radii would weaken the paper-and-record character.

## Components

### Buttons

- **Shape:** Compact rectangular controls with gently rounded corners and a minimum 46px height.
- **Primary:** Action Orange with white text, bold labeling, and a directional arrow when advancing the user.
- **Dark:** Forest Ink with white text for header account creation or dashboard access.
- **Hover / Focus:** Lift by 2px, deepen the fill or shadow, and shift directional icons by 3px. Keyboard focus uses a visible orange 3px outline with a 4px offset.
- **Responsive:** Primary calls to action become full width below 768px.

### Text Links

- **Style:** Bold forest text with a fine underline and a compact directional icon.
- **State:** The link lifts by 2px and its icon advances by 3px; it never competes with the orange primary action.

### Status Labels

- **Style:** Compact text-bearing chips with a small radius. Mint with forest text communicates `Live`; pale orange with dark orange text communicates an alert count.
- **Accessibility:** Status is always stated in text and never communicated by color alone.

### Cards / Containers

- **Corner Style:** Tight record corners for the board and modest surface corners for the dark summary.
- **Background:** Ivory paper or Forest Ink, selected by information role rather than decorative alternation.
- **Shadow Strategy:** Flat and ruled by default; only signature proof, popover, action, and summary surfaces receive elevation.
- **Border:** Fine warm rules divide sections, rows, and columns.
- **Internal Padding:** Compact within data boards and more generous around persuasive section content.

### Navigation

- **Desktop:** Uppercase wordmark, centered section links, and account actions in a 76px header with translucent ivory and blur. Hover uses orange text or a short orange underline.
- **Mobile:** At widths below 768px, use a native `details` disclosure with a 44px square trigger and a ruled ivory popover. Each menu row is at least 46px high; the account-creation row receives a Forest Ink fill.

### Scanner Proof

The signature proof surface shows a product inside a camera frame, a successful match, its cart line, the transaction total, and compact stock and sales updates. The external `Data contoh` label is mandatory whenever synthetic values are presented. On mobile, preserve the scan frame and successful product state, but remove cart and peripheral update annotations rather than shrinking them beyond legibility.

### Ruled Feature Rows

Feature coverage is presented as full-width rows rather than a gallery of cards. Each row aligns an icon, title, direct explanation, and orange arrow; hover adds only a subtle paper-tone shift and horizontal inset. On mobile, remove the decorative icon and retain the title, explanation, and arrow.

## Do's and Don'ts

### Do:

- **Do** use warm ivory paper, forest ink, and fine ruled divisions as the default visual grammar.
- **Do** reserve orange for primary action, focus, direction, and small operational highlights.
- **Do** use a compact, explicitly labeled scan interaction to demonstrate the product flow.
- **Do** keep Indonesian copy direct, concise, and grounded in real store work.
- **Do** preserve visible keyboard focus, comfortable touch targets, reduced-motion behavior, and light color scheme at the document root.
- **Do** use motion to show scan-to-record causality, list sequence, or selectable package feedback.
- **Do** simplify responsively rather than compressing every desktop detail onto a phone.

### Don't:

- **Don't** add dark mode to the public surface; the root contract and landing implementation are light-only.
- **Don't** fabricate testimonials, adoption figures, pricing, awards, customer logos, or formal audit claims.
- **Don't** replace ruled operational structure with a generic rounded-card grid, glassmorphism, or broad decorative gradients.
- **Don't** use orange as a large background field or introduce competing accent hues.
- **Don't** add helper text, marketing paragraphs, or repeated instructions when a clear label or direct action is enough.
- **Don't** hide the primary action, `Data contoh` disclosure, or Scan-to-Laporan story at any supported viewport.
- **Don't** add bounce, infinite decorative motion, or the same fade-and-rise treatment to every section.
