# Mask Section 1 details before every Gemini call

## Goal

Before any text is sent to Gemini, replace known values from section **1. פרטים אישיים של הילד/ה ומסגרת חינוכית** (including **מידע נוסף**) wherever they appear in the prompt. The saved form, print, and Word export stay unchanged. Existing print redaction (`redactStudentNameInText`) is not reused: it turns names into initials, which are still identifying. AI prompts get a generic child label and block masks instead.

## Keywords (exact stored values only)

Collect non-empty trimmed values, skip the placeholder `תלמיד/ה חדש/ה`, and replace longest-first so a full name is removed before its parts:

| Field | Replacement |
|---|---|
| `name` (full string, then each word of length ≥ 2) | `הילד` or `הילדה` from `gender` |
| `idNumber`, `birthDate`, `address`, `phone` | `████` |
| `educationalFramework`, `schoolName`, `gradeClass` | `המסגרת` |
| `homeroomTeacher`, `integrationTeacher`, `learningSupportAssistant`, `counselorName`, `psychologistName`, `matyaCoordinator`, `emotionalTherapist`, `paraMedicalTeam`, `additionalPartners` | `איש צוות` |

Do not invent pattern matching for IDs, phones, or names that were never typed into these fields. The existing free-text disclaimer stays.

## Implementation

1. Add `maskKnownStudentDetails(text, formData)` in `src/domain/privacyAndAcronyms.js`. Escape each keyword for regex, replace case-sensitively (Hebrew), and collapse leftover extra spaces. Empty input returns `''`.
2. Add `maskPromptForAi(promptText, formData)` that runs the masker on the finished prompt string. Age sent to the model must stay the computed `ageYears` / a date-free description (for example `6 שנים`). `resolveStudentAgeAndDateInfo` currently appends `(ת.ל: DD/MM/YYYY)` — strip that clause inside the masker or stop putting the raw birth date into `ageDescription` before it is interpolated.
3. In `src/EcologicalWorkPlanForm.jsx`, pass every outbound prompt through `maskPromptForAi` at the single chokepoint `callGeminiJson`, and also on the two prompts that call `fetch` directly:
   - `handleGenerateAiQuestionsForGoal` (free text + goal text)
   - `handleApplyFacilitatingAnswers` (replaces `firstName` with `הילד`/`הילדה` in the prompt and in the local fallback sentences that would otherwise be stored)
4. `callGeminiJson` covers עיבוד המידע (`handleReverseEngineerFullReport`), summary generation, eval AI, and דו"ח מצב. Masking the finished prompt also scrubs names that leaked into goal titles, eval notes, or `studentCardPayload` (which today sends `name` and `birthDate`). Do not change local engines (`reverseEngineerRawTextLocally`, `generateStatusReportLocally`).
5. Keep Gemini's optional `name` / `educationalFramework` extraction from free text as it is today: only fill those fields when they are still empty. Masking means the model usually will not see them.

## Tests

Extend `Privacy Redaction` in `src/__tests__/coreDomain.test.js`:

- Full name and each name part inside free text become `הילדה` / `הילד`.
- ID, birth date, address, and phone become `████`; school and a staff name become `המסגרת` / `איש צוות`.
- A shorter keyword does not eat part of a longer one; empty fields are ignored.
- An `ageDescription` containing `(ת.ל: …)` loses the date.

## Out of scope

- Regex for unknown IDs/phones typed only in free text.
- Changing print, email, or Word masking.
- Un-masking model output (masked prompts should not echo the original values).
