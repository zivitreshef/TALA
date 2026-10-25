# TALA Marketing Presentation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform `TALA_Marketing_Presentation.html` into a clean, spacious, high-impact 6-slide Hebrew presentation combining the "Big Rocks" pedagogical narrative with clear "Before vs. After" comparison cards.

**Architecture:** Pure HTML5/CSS3 presentation formatted for A4 landscape print and on-screen projection, using CSS flex/grid, Google Fonts (Rubik), semantic RTL typography, and high-contrast dual cards.

**Tech Stack:** HTML5, CSS3 (A4 Landscape Print `@page`, Flexbox, CSS Grid), Google Fonts (Rubik).

**Spec:** `docs/superpowers/specs/2026-10-25-tala-value-marketing-presentation-design.md`

## Global Constraints

- **Language & Direction**: Hebrew (`lang="he"`, `dir="rtl"`). All typography, card flows, and badges must be strictly right-to-left aligned.
- **Tone & Audience**: Executive, pedagogical, empathetic to teachers and Matya directors. No low-level technical jargon (no mentions of SHA-256, IndexedDB, test suites, or code variables).
- **Visual Clarity**: Exactly 2 comparison cards per content slide ("השחיקה המסורתית" in soft red/rose vs. "שגרת העבודה ב-TALA" in fresh indigo/emerald) plus top pedagogical anchor and bottom value banner.
- **Print & Viewport**: `@page { size: A4 landscape; margin: 0; }` with exact dimensions (`297mm x 210mm`) and print color adjustments.

## Review Focus

- Slide content overflow when printed to A4 landscape: verify each slide stays within bounds without vertical spilling.
- Contrast and legibility: verify text colors against light and colored card backgrounds meet WCAG standards.
- RTL punctuation and bidirectional text: ensure acronyms (AI, TALA, PDF, PWA) and numbers render properly without RTL punctuation flipping.
- Purity of value proposition: verify every slide highlights educator agency and time savings.
- Removal of obsolete technical boilerplate: verify all previous 7-slide dense tables and engineering bullets are fully replaced.

---

### Task 1: Base CSS Architecture & Presentation Framework

**Files:**
- Modify: `TALA_Marketing_Presentation.html`

**Interfaces:**
- Produces: Base presentation layout container, header styling, A4 landscape print bounds, high-contrast dual-card CSS grid (`.split-comparison-grid`), and badge utility classes.

- [ ] **Step 1: Write styling structure in `TALA_Marketing_Presentation.html`**
  Set up `@import` for Rubik font, reset margins, define CSS variables for TALA brand (primary navy `#1e3a5f`, purple `#6b46c1`, emerald `#059669`, rose-red `#be123c`, soft backgrounds `#f8fafc`, `#fff1f2`, `#f5f3ff`).
- [ ] **Step 2: Add print page rules and container bounds**
  Define `.slide` with `width: 297mm; height: 210mm; page-break-after: always;` and flexbox layout.
- [ ] **Step 3: Define `.comparison-card` component styles**
  Implement `.comparison-card.before` (subtle red border, `#fff1f2` tag, strike/cross icon accents) and `.comparison-card.after` (subtle purple/emerald border, `#f5f3ff` tag, checkmark/sparkle accents).
- [ ] **Step 4: Verify CSS syntax and layout rendering**
  Open file or inspect via command line to ensure no CSS syntax errors exist.
- [ ] **Step 5: Commit**
  `git add TALA_Marketing_Presentation.html && git commit -m "style: establish clean base presentation css architecture"`

---

### Task 2: Implement Slide 1 (Cover) & Slide 2 ("האבנים הגדולות" Routine)

**Files:**
- Modify: `TALA_Marketing_Presentation.html`

**Interfaces:**
- Consumes: Base CSS tokens and slide containers from Task 1.
- Produces: Slide 1 (Cover with logo, mission, and 4 value pills) and Slide 2 (The Big Rocks comparison cards).

- [ ] **Step 1: Implement Slide 1 (Cover Slide)**
  Add TALA logo (`./public/tala-logo.png`), main title "מערכת TALA – מהתוכנית הכתובה למעשה החינוכי היומיומי", subtitle, and the 4 primary value badges (Big Rocks, Time Savings, AI in Teacher Control, Multidisciplinary Synergy).
- [ ] **Step 2: Implement Slide 2 (The Big Rocks Routine)**
  Create header "1. 'האבנים הגדולות' – ממסמך שנשכח בקלסר לשגרת עבודה חיה".
  Card 1 (Before): תל"א שנכתבת במאמץ ונשכחת, ניהול מפוזר ביומני נייר ופתקים, נתק בין יעדי העל לשגרה.
  Card 2 (After): יומן פדגוגי מובנה שמחבר בין לוח משה"ח, סנכרון Google/Outlook ומטרות העל למשימות יומיות ושבועיות.
  Takeaway banner: "המורה פותחת כל בוקר עם מיקוד ברור במה שחשוב באמת – במקום לטבוע בכיבוי שריפות".
- [ ] **Step 3: Verify Slide 1 & 2 layout and copy**
  Verify Hebrew text flow, badge layout, and spacing.
- [ ] **Step 4: Commit**
  `git add TALA_Marketing_Presentation.html && git commit -m "feat: implement cover and big rocks slides"`

---

### Task 3: Implement Slide 3 (AI with Teacher Agency) & Slide 4 (Time Savings & Micro-Observations)

**Files:**
- Modify: `TALA_Marketing_Presentation.html`

**Interfaces:**
- Consumes: Task 1 comparison grid and Task 2 layout rhythm.
- Produces: Slide 3 (Human-in-the-loop AI) and Slide 4 (Time-saving micro-observations).

- [ ] **Step 1: Implement Slide 3 (AI in the Teacher's Cockpit)**
  Header: "2. בינה מלאכותית מקצועית – המורה תמיד במושב הנהג (Human-in-the-Loop)".
  Card 1 (Before): שעות של פענוח אבחונים מורכבים, ניסוח ידני מול דף ריק, חשש מאי-דיוקים פדגוגיים.
  Card 2 (After): קליטת אבחון ב-AI (PDF/טקסט) למיצוי מיידי של מוקדי כוח ומטרות אקולוגיות; מחולל משימות מותאם אישית.
  Takeaway banner: "💡 טייס משנה, לא תחליף: המערכת ממליצה ומדייקת – המורה בוחנת, עורכת ומאשרת כל מילה".
- [ ] **Step 2: Implement Slide 4 (Time Savings & 10s Micro-Observations)**
  Header: "3. חיסכון בזמן ותיעוד שטח – אפס עומס בירוקרטי".
  Card 1 (Before): חוסר תיעוד רציף המוביל למרתון "שחזור זיכרון" מפרך בהערכות מחצית וסוף שנה; עומס טפסים וטבלאות.
  Card 2 (After): מיקרו-תצפיות של 10 שניות בסמארטפון או בטאבלט (גם אופליין בכיתה ובחצר); הנתונים נצברים ישירות לדוחות.
  Takeaway banner: "⚡ 70% פחות זמן על מנהלה: איסוף נתונים שוטף ונטול מאמץ שמחזיר עשרות שעות פנויות לעבודה חינוכית נטו".
- [ ] **Step 3: Verify Slide 3 & 4 text, iconography, and RTL alignment**
- [ ] **Step 4: Commit**
  `git add TALA_Marketing_Presentation.html && git commit -m "feat: implement ai agency and time savings slides"`

---

### Task 4: Implement Slide 5 (Team & Parents Synergy) & Slide 6 (Executive Summary & 3 Reports)

**Files:**
- Modify: `TALA_Marketing_Presentation.html`

**Interfaces:**
- Consumes: Prior slides framework.
- Produces: Slide 5 (Multidisciplinary collaboration and Parent Portal) and Slide 6 (Summary, 3 official reports, clean ministry bridge, and CTA).

- [ ] **Step 1: Implement Slide 5 (True Multidisciplinary Synergy & Parent Voice)**
  Header: "4. שותפות רב-מקצועית וחיבור ישיר להורים".
  Card 1 (Before): עבודה בסילואים מנותקים, דריסת קבצים בין מטפלים לגננת, קושי בריכוז עמדת ההורים.
  Card 2 (After): מוביל/ת מטרה לכל יעד מקצועי, שער 'קול ההורים' בנייד (WhatsApp) ומיזוג ענן חכם ללא דריסות הדדיות.
  Takeaway banner: "🌱 מעטפת 360° אקולוגית: כל איש צוות יודע את אחריותו, ההורים שותפים מלאים, והרצף הפדגוגי נשמר משנה לשנה".
- [ ] **Step 2: Implement Slide 6 (Executive Summary, 3 Reports & Ministry Bridge)**
  Header: "5. השורה התחתונה: דוחות רשמיים, גשר למנב"ס ושקט נפשי".
  Card 1 (Before): ניסוח ידני מחדש של דו"ח מצב, טבלאות שמתפרקות בהעתקה למנב"סנט, וחשש מחשיפת פרטים מזהים (PII).
  Card 2 (After): 3 דוחות רשמיים בלחיצה (תל"א/תח"י, הערכת מחצית, דו"ח מצב), כפתור העתקה נקייה למנב"ס, והשחרת פרטים רגישים אוטומטית.
  Takeaway banner & Metrics: "🏆 70% פחות בירוקרטיה • 100% שליטה פדגוגית • שקט נפשי מלא למנהלים ולצוות. מוכנה להטמעה מיידית במתי"א ובמוסדות החינוך."
- [ ] **Step 3: Verify Slide 5 & 6 formatting and visual balance**
- [ ] **Step 4: Commit**
  `git add TALA_Marketing_Presentation.html && git commit -m "feat: implement team synergy and executive summary slides"`

---

### Task 5: End-to-End Verification & Polishing

**Files:**
- Verify: `TALA_Marketing_Presentation.html`

**Interfaces:**
- Validates: Zero technical jargon, strict RTL formatting, valid HTML/CSS, A4 landscape page breaks, high-contrast readability.

- [ ] **Step 1: Run static check on HTML structure and character encoding**
  Verify valid closing tags, utf-8 encoding, and image path resolution (`./public/tala-logo.png`).
- [ ] **Step 2: Verify typography and visual layout**
  Verify Rubik font imports, line-heights, card alignments, padding, and print margins.
- [ ] **Step 3: Verify absence of jargon**
  Verify that terms like `SHA-256`, `IndexedDB`, `v1.0.87`, `220 בדיקות` are completely gone and replaced by pedagogical value propositions.
- [ ] **Step 4: Commit**
  `git add TALA_Marketing_Presentation.html && git commit -m "chore: complete presentation polishing and verification"`
