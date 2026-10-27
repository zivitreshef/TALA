# Design Document: Team Share Collaboration Thread & Handoff Notes

## 1. Intent & Context
Currently, teachers in TALA can share a student's annual work plan with colleagues belonging to the same group via `ShareTeamModal.jsx`. However:
- Clicking a colleague instantly toggles access without any way to communicate instructions, context, or requests (e.g. *"Please add speech therapy goals"* or *"Review before the upcoming committee"*).
- There is no ongoing space for multidisciplinary team members (homeroom teacher, special ed teacher, OT, speech therapist, counselor) to leave pedagogical notes, updates, or audit trail entries directly on the student's plan.

This feature introduces:
1. **Share Handoff Note**: An optional message field with 1-click quick-chips when sharing with a colleague.
2. **Persistent Team Collaboration Thread & Audit Trail (`teamMessages`)**: Stored on the student document, synced safely across devices.
3. **Slide-Over Side Drawer (`TeamChatDrawer.jsx`)**: An unobtrusive drawer accessible from the top toolbar, allowing teachers to chat and review notes while directly referencing the student's goals.

---

## 2. Goals & Non-Goals

### Goals:
1. **Contextual Sharing**: Allow teachers to attach an optional handoff message when sharing a student with a colleague, with one-click quick chips (*"נא להוסיף מטרות"*, *"לעיונך והערות"*, *"בדיקת סטטוס והתייעצות"*).
2. **Persistent Student-Level Thread**: Retain a chronological audit and discussion trail (`formData.teamMessages`) on the student record.
3. **Slide-Over Side Drawer**: Provide a responsive, RTL drawer on the right side of the plan, with unread badge counter in the top toolbar.
4. **Author-Only Retraction**: Allow any teacher to retract/delete **only their own messages** (preventing accidental slips or typos), while prohibiting wiping the full history to protect pedagogical audit integrity.
5. **Conflict-Free Realtime Sync**: Update `mergeStudentSnapshots` so concurrent edits by colleagues merge `teamMessages` arrays cleanly without data loss.
6. **Notification Display**: Show the handoff note in the recipient's unread shared report modal (`AllowlistAuthGate.jsx`).

### Non-Goals:
- A generic school-wide messaging system or replacement for WhatsApp: this is strictly a student-specific pedagogical audit and collaboration log.
- Full-history deletion by the student owner: preserving professional trust and compliance with educational audit trails.

---

## 3. Data Model

In `formData` (normalized in `yearReport.js` and `workPlanEdits.js`):
```typescript
interface TeamMessage {
  id: string;               // Unique ID: "msg_" + timestamp + "_" + randomSuffix
  schoolYear?: string;      // Associated school year (e.g., "תשפ\"ו")
  authorEmail: string;      // Normalized lowercase email of author
  authorName: string;       // Display name of author
  authorRole: string;       // Role or title (e.g., "מחנכת", "קלינאית תקשורת")
  text: string;             // Sanitized text content (max 800 chars)
  createdAt: string;        // ISO 8601 string
  type: 'share_handoff' | 'comment'; // 'share_handoff' for notes sent on share; 'comment' for thread replies
  recipientEmail?: string;  // If targeted to a specific colleague on share
  recipientName?: string;   // Display name of recipient
  isDeleted?: boolean;      // Soft delete flag if retracted by author
  deletedAt?: string;       // Timestamp of deletion
}
```

---

## 4. UI / UX Design

### A. Share Modal (`ShareTeamModal.jsx`)
- When a colleague is checked:
  - If freshly checked, an inline card opens underneath their row:
    - Label: `✉️ הודעת פתיחה והנחיות ל[שם הקולגה] (אופציונלי)`
    - Quick chips: `[+ נא להוסיף מטרות]` `[+ לעיונך והערות]` `[+ בדיקת סטטוס]`
    - Clean textarea (max 800 chars)
- On modal close / save:
  - The note is automatically appended to `formData.teamMessages` as a `share_handoff` message.

### B. Student Plan Toolbar (`EcologicalWorkPlanForm.jsx`)
- Next to `👥 שיתוף צוות`, add a `💬 שיח צוות` button:
  - Shows total count / unread badge (e.g., `💬 שיח צוות • 2`).
  - Clicking it slides open the drawer.

### C. Slide-Over Side Drawer (`TeamChatDrawer.jsx`)
- Standard 380px wide RTL slide-over on desktop, full-width on mobile.
- Header: Student name, team member count, close button (32x32px).
- Message List: Chronological stream with author avatars, role badges, timestamps, message text, and delete icon (visible only for current user's own messages).
- Input Box: Textarea, quick reply chips, character counter, and send button.

### D. Unread Notification Bell (`AllowlistAuthGate.jsx`)
- When a shared student has a `share_handoff` message directed to the user (or latest unread message), display the note snippet inside the shared report notification card.

---

## 5. Security & Zero-Trust Architecture
1. **Input Sanitization**: Strip dangerous HTML characters, enforce 800-character max length.
2. **Access Control**: Only users in `formData.sharedWith` or the student owner can view, post, or retract messages.
3. **Auditing**: Every message retains its original author email and timestamp.
