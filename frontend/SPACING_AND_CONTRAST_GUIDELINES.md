# Frontend UI/UX Guidelines - Spacing & Contrast

## 🎯 Purpose
Prevent future spacing, contrast, and layout issues across all pages and components.

---

## 1. SPACING GUIDELINES

### Page-Level Padding
**All pages using `PageShell` component MUST have proper padding:**
- ✅ **Required**: `padding: 40px 32px` (set in `.page-shell` CSS)
- ✅ **Applied to**: 
  - `/listings/new` (Create Listing)
  - `/profile` (User Profile)
  - `/inbox` (Messages)
  - `/dashboard/offers` (Transactions)
  - Any other page using `<PageShell>` component

**What this prevents:**
- Content touching page edges
- Text appearing "like Word document" without breathing room
- Compressed feeling of forms and layouts

### Form Field Spacing
**Every `<div className="field">` block MUST have:**
- ✅ **Between fields**: `margin-bottom: 16px` (set in `.field` CSS)
- ✅ **Inside field**: `gap: 6px` (between label and input)
- ✅ **Input padding**: `padding: 10px 14px` (inside input element)

**Structure:**
```jsx
// ✅ CORRECT: Each field is properly spaced
<div className="field">
  <label>Field Label</label>
  <input type="text" />
</div>

<div className="field">
  <label>Next Field</label>
  <input type="text" />
</div>
// Auto margin-bottom: 16px creates gap between fields

// ❌ WRONG: No gap between fields
<div>
  <label>Field 1</label>
  <input type="text" />
  <label>Field 2</label>
  <input type="text" />
</div>
```

### Section-Level Spacing
**Group related sections with consistent gaps:**
- **Between major sections**: `gap: 32px` (use `.page-grid` or custom gap)
- **Between cards**: `gap: 24px` (use `.grid` class)
- **Between form sections**: `margin: 24px 0`

**Example:**
```css
.page-grid {
  display: grid;
  gap: 24px;  /* Gap between page sections */
}
```

### Spacing Scale (Design Tokens)
Use these predefined spacing values - **NEVER use random values:**
- `4px` - Micro spacing (internal component gaps)
- `6px` - Form label-to-input gap
- `8px` - Button icon-to-text gap
- `12px` - Small container padding
- `16px` - Form field margin-bottom, component gaps
- `24px` - Card gaps, section spacing
- `32px` - Major section gaps
- `40px` - Page horizontal padding (part of `40px 32px`)
- `48px` - Hero section padding

---

## 2. COLOR CONTRAST GUIDELINES

### Text on Backgrounds (WCAG AA Compliance)
**All text-background combinations MUST meet WCAG AA minimum:**
- ✅ Large text (18pt+): **3:1 contrast ratio minimum**
- ✅ Normal text (<18pt): **4.5:1 contrast ratio minimum**

### Navigation Bar (`.nav-shell`)
**Current Implementation (CORRECT):**
```css
.nav-shell {
  background: var(--color-navy);  /* #2d3250 - DARK */
  color: var(--text);              /* Light text #e8eef8 */
  border-bottom: 1px solid rgba(249, 177, 122, 0.2);
}
```
- ✅ Navy background provides excellent contrast with light text
- ✅ DO NOT change background to light colors (causes text invisibility)
- ✅ DO NOT use translucent backgrounds without testing contrast

**What FAILED:**
```css
.nav-shell {
  background: rgba(255, 255, 255, 0.82);  /* ❌ WRONG - light background */
  color: var(--text);                      /* Light text - invisible! */
}
```

### Form Elements
**Input fields on card background:**
```css
.field input {
  background: var(--bg-card);      /* Card background */
  color: var(--text);              /* Dark text - high contrast */
  border: 1px solid var(--border); /* Visible border */
}
```

### Semantic Color Tokens
**Use semantic tokens, NEVER hard-coded colors:**
- ✅ `var(--bg)` - Primary background
- ✅ `var(--bg-card)` - Card background
- ✅ `var(--text)` - Primary text
- ✅ `var(--text-secondary)` - Secondary text (muted)
- ✅ `var(--accent)` - Interactive elements (peach #f9b17a)

---

## 3. COMPONENT STRUCTURE BEST PRACTICES

### Using `PageShell` Component (✅ RECOMMENDED)
```jsx
import { PageShell } from "@/components/page-shell";

export default function MyPage() {
  return (
    <PageShell
      title="Page Title"
      description="Optional description"
    >
      {/* Content here automatically gets padding + proper spacing */}
      <div className="field">
        <label>Form Field</label>
        <input type="text" />
      </div>
    </PageShell>
  );
}
```
**Automatic benefits:**
- ✅ 40px 32px padding around content
- ✅ Proper animation (`fadeUp`)
- ✅ 28px margin-bottom on heading
- ✅ Semantic heading styling

### NOT Using `PageShell` (Auth Pages, Custom)
**If you DON'T use `PageShell`, ensure manual padding:**
```jsx
// ❌ WRONG - No padding
<div>
  <h1>Form Title</h1>
  <div className="field">...</div>
</div>

// ✅ CORRECT - Explicit padding
<div style={{ padding: '40px 32px' }}>
  <h1>Form Title</h1>
  <div className="field">...</div>
</div>

// ✅ BETTER - Use CSS class
<div className="page-shell">
  <h1>Form Title</h1>
  <div className="field">...</div>
</div>
```

---

## 4. FORM DESIGN CHECKLIST

Before shipping any form:

- [ ] Every form field is wrapped in `<div className="field">`
- [ ] Form uses semantic `<label>` elements with `htmlFor` attributes
- [ ] Visual gap between form groups (auto from `margin-bottom: 16px`)
- [ ] Input height minimum 44px (accessibility - touch target)
- [ ] Error messages have visible red color (contrast checked)
- [ ] Helper text uses `--text-secondary` color (muted but readable)
- [ ] Focus state has visible outline/border (blue accent color)
- [ ] All text meets 4.5:1 contrast ratio on background

**Example Form:**
```jsx
<form className="page-shell">
  <h2>Create New Item</h2>
  
  <div className="field">
    <label htmlFor="title">Title *</label>
    <input 
      id="title" 
      type="text" 
      placeholder="Enter title"
      required 
    />
  </div>

  <div className="field">
    <label htmlFor="desc">Description</label>
    <textarea 
      id="desc" 
      placeholder="Enter description"
    />
  </div>

  <div className="field">
    <label htmlFor="price">Price *</label>
    <input 
      id="price" 
      type="number" 
      placeholder="0"
      required 
    />
  </div>

  <button type="submit" className="button primary">Submit</button>
</form>
```

---

## 5. RESPONSIVE SPACING (Mobile-First)

### Breakpoints & Adjustments
```css
/* Default (mobile) - 40px horizontal padding */
.page-shell {
  padding: 24px 16px;  /* Reduced on mobile */
}

/* Tablet and up - 40px padding */
@media (min-width: 768px) {
  .page-shell {
    padding: 40px 32px;
  }
}

/* Desktop and up - Optional max-width */
@media (min-width: 1024px) {
  .page-shell {
    max-width: 1200px;
    margin: 0 auto;
  }
}
```

**Current Implementation Note:**
- ✅ `PageShell` has `40px 32px` padding (works well on tablet+)
- ⚠️ May want mobile-specific padding in media query for very narrow screens

---

## 6. TYPOGRAPHY HIERARCHY

### Heading Styles (Consistent Spacing)
```css
.page-header h1 {
  font-size: 28px;
  font-weight: 700;
  margin-bottom: 28px;  /* Gap after heading */
}

.page-header p {
  font-size: 15px;
  color: var(--text-secondary);
  margin-top: 6px;      /* Gap between heading and description */
}
```

### Body Text Line Height
```css
p {
  line-height: 1.6;    /* Comfortable reading */
  margin-bottom: 16px; /* Gap after paragraph */
}
```

---

## 7. CSS MODULES vs GLOBALS

### When to Use Global Styles (`globals.css`)
- ✅ Layout patterns (`.page-shell`, `.page-grid`, `.field`)
- ✅ Typography base styles
- ✅ Form element resets
- ✅ Navigation/header styles
- ✅ Spacing utilities (`.grid`, `.panel`)

### When to Use CSS Modules (`.module.css`)
- ✅ Component-specific styling
- ✅ Scoped classes that won't conflict
- ✅ Complex component layouts

**Example:**
```jsx
// ProductCard.tsx
import styles from './ProductCard.module.css';

export function ProductCard() {
  return (
    <div className={styles.card}>
      {/* Component-specific styling */}
    </div>
  );
}
```

---

## 8. COMMON MISTAKES TO AVOID

| ❌ WRONG | ✅ CORRECT | Why? |
|---------|-----------|------|
| `padding: 0` on page wrapper | `padding: 40px 32px` | Content visibility |
| `gap: 0` between form fields | `margin-bottom: 16px` | Visual breathing room |
| Light text on light background | Dark text on light bg | Contrast compliance |
| Random spacing values | Use design token scale | Consistency |
| Inline styles for padding | CSS classes from globals.css | Maintainability |
| No label on form input | `<label htmlFor="id">` | Accessibility |
| Input height < 44px | `min-height: 44px` | Touch target size |
| Focus state invisible | Blue border/box-shadow | Keyboard navigation |

---

## 9. QUICK AUDIT CHECKLIST

When reviewing any page:

1. **Padding**: Does content have clear margin from page edges? ✅ 40px 32px
2. **Form Fields**: Are form groups visually separated? ✅ 16px gaps
3. **Contrast**: Can you read all text clearly? ✅ 4.5:1+ ratio
4. **Hierarchy**: Do headings stand out from body text? ✅ Font size + weight + gap
5. **Consistency**: Do all pages follow same pattern? ✅ Use PageShell
6. **Mobile**: Is spacing still good on narrow screens? ✅ Test at 375px

---

## 10. DESIGN SYSTEM FILES

**Reference Implementation Files:**
- ✅ `frontend/src/styles/variables.css` - All color/spacing tokens
- ✅ `frontend/src/app/globals.css` - Global styles (PageShell, .field, etc.)
- ✅ `frontend/src/app/page.tsx` - Homepage (reference layout)
- ✅ `frontend/src/components/page-shell.tsx` - PageShell component

**Use these as source of truth - DO NOT create new utilities that duplicate them.**

---

## Summary

**The 3 Core Rules:**
1. **Spacing**: Use `PageShell` component OR manually add `40px 32px` padding
2. **Form Fields**: Wrap in `<div className="field">` - get auto `margin-bottom: 16px`
3. **Contrast**: Navy on light or light on dark - NEVER light on light

**Follow this, and you won't get spacing/contrast errors again.**
