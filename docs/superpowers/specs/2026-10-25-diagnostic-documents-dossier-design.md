# Design Document: Diagnostic Documents Dossier & Enhanced Intake UX

## 1. Intent & Context
Currently, the "קליטת אבחון ב-AI" button is a small, easy-to-miss chip tucked in the top corner of Section 2 ("תיאור חופשי של המורה"). More critically, when files are uploaded, their text is parsed only for a one-time AI prompt and the file records disappear immediately upon closing the modal. Teachers and multidisciplinary staff have no way of knowing whether evaluations (psychological, developmental, speech therapy, OT, or committee summaries) were uploaded, nor can they view, re-read, or re-analyze them later.

This feature transforms Section 2 by adding a persistent, prominent **"📁 תיק מסמכי אבחון ורקע" (Diagnostic & Assessment Dossier)** within each student card.

## 2. Goals & Non-Goals

### Goals:
1. **Prominent, Clear UX**: Replace the tiny button with an inviting, prominent hero card at the top of Section 2 clearly inviting teachers to upload assessment documents (Word, PDF, scans/text).
2. **Persistent Document Storage in Student Card**: Store uploaded document records in `formData.diagnosticDocuments` (id, fileName, uploadedAt, fileType, textSnippet, fullText, autoSummary).
3. **Document Indicators**:
   - Header badge in student toolbar/header: e.g., `📎 2 מסמכי אבחון בתיק`.
   - Visual cards in Section 2 displaying each attached document with actions: [עיון בטקסט], [ניתוח חוזר ב-AI], [מחיקה].
4. **Seamless Collaboration with Free Text**: Maintain the teacher's free-text textarea right below the dossier so AI and the teacher can draw from both the official evaluations and personal classroom impressions.
5. **Privacy & Offline Safety**: Document text is stored in student record (local IndexedDB & encrypted Firestore) without storing external binary blobs, respecting all existing student privacy rules.

### Non-Goals:
- Storing multi-megabyte binary PDF blobs in Firestore: we store metadata and extracted clean text, which keeps the student document compact (<50KB), lightning-fast, and offline-compatible.
- Replacing the existing manual free-text editor: free-text remains available and complementary.

## 3. Data Model

In `formData` (normalized in `yearReport.js`):
```javascript
diagnosticDocuments: [
  {
    id: 'doc_1730000000000_abc',
    fileName: 'אבחון פסיכודידקטי - מכון אותיות.docx',
    fileType: 'docx', // 'docx' | 'pdf' | 'txt'
    uploadedAt: '2026-10-25T12:00:00.000Z',
    fileSizeFormatted: '142 KB',
    textSnippet: 'התלמיד גילה מוטיבציה גבוהה, קשיי קשב וריכוז...',
    fullText: '...', // Extracted text
    lastAnalyzedAt: '2026-10-25T12:05:00.000Z'
  }
]
```

## 4. UI / UX Design

### A. Student Header Indicator:
- Next to student name and plan status badge:
  `📎 2 מסמכי אבחון בתיק` (clickable chip that scrolls smoothly to Section 2).

### B. Section 2 Layout ("2. מסמכי אבחון, תיאור תפקוד ומוקדי כוח"):
- **Top Card: "📁 תיק מסמכי אבחון וסיכומי ועדות"**:
  - Banner explaining: *"העלי אבחונים ומסמכי רקע (Word, PDF, טקסט) כדי לשמור אותם בתיק התלמיד/ה ולגזור מהם רקע ומטרות בעזרת AI."*
  - Big primary action button: **`✨ העלאת אבחון וניתוח ב-AI`**
  - **Attached Documents List**:
    - If empty: friendly empty-state placeholder: *"טרם צורפו מסמכי אבחון לתלמיד/ה. ניתן לצרף אבחון פסיכודידקטי, סיכום ועדת אפיון וזכאות או דוחות טיפוליים."*
    - If documents exist: A list of clean cards showing:
      - File icon (`FileText`) + File name + Upload date + Word count/Size.
      - Action buttons:
        - `👁️ עיון בטקסט` (opens a clean reader modal showing the document text).
        - `✨ ניתוח ב-AI` (opens intake modal pre-filled with this document's text).
        - `🗑️ הסרה` (with confirmation).
- **Bottom Zone: "✍️ תיאור חופשי של המורה והתרשמות הצוות"**:
  - Unchanged textarea with privacy note and `✨ עיבוד המידע` button.
