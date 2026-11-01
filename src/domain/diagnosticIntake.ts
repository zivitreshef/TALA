import { adaptTextToGender } from './goalSizingAndMerge';
import type {
  DiagnosticDocumentRecord,
  DiagnosticSuggestedGoal,
  SanitizedDiagnosticIntake
} from './types';

export interface BuildDiagnosticPromptOptions {
  diagnosticText?: string;
  gender?: string;
  studentName?: string;
  planType?: string;
}

export interface CreateDiagnosticDocumentRecordOptions {
  fileName?: string;
  fileType?: string;
  fullText?: string;
  fileSizeFormatted?: string;
  storageUrl?: string;
  storagePath?: string;
}

declare global {
  interface PromiseConstructor {
    withResolvers?<T>(): {
      promise: Promise<T>;
      resolve: (value: T | PromiseLike<T>) => void;
      reject: (reason?: unknown) => void;
    };
  }
}

declare class DecompressionStream {
  constructor(format: string);
  readonly readable: ReadableStream<Uint8Array>;
  readonly writable: WritableStream<Uint8Array>;
}

// Polyfill Promise.withResolvers for Node 20 / older browser runtimes needed by pdfjs-dist
if (typeof Promise.withResolvers === 'undefined') {
  Promise.withResolvers = function <T>() {
    let resolve!: (value: T | PromiseLike<T>) => void;
    let reject!: (reason?: unknown) => void;
    const promise = new Promise<T>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
  };
}

/**
 * Extracts plain text from an uncompressed or deflate-compressed .docx (Word) file ArrayBuffer.
 */
export async function extractTextFromDocx(buffer?: ArrayBuffer | null): Promise<string> {
  if (!buffer) return '';
  const bytes = new Uint8Array(buffer);
  const view = new DataView(buffer);
  let pos = 0;

  while (pos < bytes.length - 30) {
    if (view.getUint32(pos, true) === 0x04034b50) {
      const compMethod = view.getUint16(pos + 8, true);
      const compSize = view.getUint32(pos + 18, true);
      const nameLen = view.getUint16(pos + 26, true);
      const extraLen = view.getUint16(pos + 28, true);
      const nameBytes = bytes.slice(pos + 30, pos + 30 + nameLen);
      const fileName = new TextDecoder('utf-8').decode(nameBytes);
      const dataStart = pos + 30 + nameLen + extraLen;

      if (fileName === 'word/document.xml') {
        const compressedData = bytes.slice(dataStart, dataStart + compSize);
        let xmlStr = '';
        if (compMethod === 0) {
          xmlStr = new TextDecoder('utf-8').decode(compressedData);
        } else if (compMethod === 8 && typeof DecompressionStream !== 'undefined') {
          try {
            const ds = new DecompressionStream('deflate-raw');
            const writer = ds.writable.getWriter();
            writer.write(compressedData);
            writer.close();
            const reader = ds.readable.getReader();
            const chunks: Uint8Array[] = [];
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              chunks.push(value);
            }
            const totalLen = chunks.reduce((acc, c) => acc + c.length, 0);
            const merged = new Uint8Array(totalLen);
            let offset = 0;
            for (const c of chunks) {
              merged.set(c, offset);
              offset += c.length;
            }
            xmlStr = new TextDecoder('utf-8').decode(merged);
          } catch (e) {
            console.warn('DOCX deflate decompression failed:', e);
          }
        }

        if (xmlStr) {
          const paragraphs = xmlStr.split(/<\/w:p>/);
          const lines: string[] = [];
          for (const p of paragraphs) {
            const textMatches = p.match(/<w:t[^>]*>([^<]+)<\/w:t>/g) || [];
            if (textMatches.length > 0) {
              const line = textMatches.map((m) => m.replace(/<[^>]+>/g, '')).join('');
              if (line.trim()) lines.push(line.trim());
            }
          }
          return lines.join('\n');
        }
      }
      pos = dataStart + compSize;
    } else {
      pos++;
    }
  }
  return '';
}

/**
 * Extracts plain text from a PDF file ArrayBuffer using PDF.js with raw stream fallback.
 */
export async function extractTextFromPdf(buffer?: ArrayBuffer | null): Promise<string> {
  if (!buffer) return '';

  // 1. Primary: PDF.js legacy engine (handles compressed streams, embedded font CMaps, multi-page)
  try {
    const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const data = new Uint8Array(buffer);
    const loadingTask = pdfjsLib.getDocument({
      data,
      useWorkerFetch: false,
      // @ts-expect-error pdfjs-dist legacy option
      isEvalSupported: false,
      useSystemFonts: true
    });
    const pdf = await loadingTask.promise;
    const pages: string[] = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = ((textContent.items as Record<string, unknown>[]) || [])
        .map((item) => (typeof item.str === 'string' ? item.str : ''))
        .join(' ');
      if (pageText.trim()) {
        pages.push(`--- עמוד ${i} ---\n${pageText.trim()}`);
      }
    }
    const combined = pages.join('\n\n');
    if (combined.trim().length > 10) {
      return combined;
    }
  } catch (err) {
    console.warn('PDF.js extraction failed, attempting raw stream fallback:', err);
  }

  // 2. Fallback: raw stream parsing for simple uncompressed PDFs
  try {
    const textDecoder = new TextDecoder('latin1');
    const rawStr = textDecoder.decode(buffer);
    const btMatches = rawStr.match(/BT[\s\S]*?ET/g) || [];
    const extractedChunks: string[] = [];
    for (const block of btMatches) {
      const strMatches = block.match(/\(([^)]+)\)\s*(?:Tj|'|")/g) || [];
      for (const m of strMatches) {
        const inner = m.replace(/^\(/, '').replace(/\)\s*(?:Tj|'|")$/, '');
        if (inner && inner.trim().length > 1) {
          extractedChunks.push(inner.trim());
        }
      }
    }
    if (extractedChunks.length > 5) {
      return extractedChunks.join(' ');
    }
  } catch (e) {
    console.warn('PDF raw stream fallback failed:', e);
  }

  return '';
}

/**
 * Extracts plain text from an uploaded File (.txt, .docx, markdown, or .pdf).
 */
export async function extractTextFromFile(file?: { name?: string; text?: () => Promise<string>; arrayBuffer?: () => Promise<ArrayBuffer> } | File | null): Promise<string> {
  if (!file) return '';
  const fileName = (file.name || '').toLowerCase();

  // 1. Text files (.txt, .csv, markdown)
  if (fileName.endsWith('.txt') || fileName.endsWith('.csv') || fileName.endsWith('.md')) {
    return typeof file.text === 'function' ? await file.text() : '';
  }

  // 2. Word files (.docx)
  if (fileName.endsWith('.docx')) {
    try {
      if (typeof file.arrayBuffer !== 'function') return '';
      const buffer = await file.arrayBuffer();
      const extracted = await extractTextFromDocx(buffer);
      if (extracted && extracted.trim()) {
        return extracted;
      }
    } catch (e) {
      console.warn('DOCX extraction fallback:', e);
    }
  }

  // 3. PDF files (.pdf)
  if (fileName.endsWith('.pdf')) {
    try {
      if (typeof file.arrayBuffer !== 'function') return '';
      const buffer = await file.arrayBuffer();
      const extracted = await extractTextFromPdf(buffer);
      if (extracted && extracted.trim()) {
        return extracted;
      }
    } catch (e) {
      console.warn('PDF extraction error:', e);
    }
  }

  return '';
}

/**
 * Builds the structured pedagogical prompt for analyzing psychological/developmental evaluations.
 */
export function buildDiagnosticPrompt({
  diagnosticText = '',
  gender = 'boy',
  studentName = '',
  planType = 'תל"א'
}: BuildDiagnosticPromptOptions = {}): string {
  const isGirl = gender === 'girl';
  const genderInstruction = isGirl
    ? 'נסח הכל בלשון נקבה בלבד (התלמידה, מזהה, מתמידה, מתקשה).'
    : 'נסח הכל בלשון זכר בלבד (התלמיד, מזהה, מתמיד, מתקשה).';

  return `אתה מומחה בכיר לאבחון פדגוגי ופסיכודידקטי בחינוך המיוחד בישראל.
לפניך קטעים מתוך דו"ח אבחון פסיכודידקטי / התפתחותי / סיכום ועדת זכאות ואפיון של ${isGirl ? 'תלמידה' : 'תלמיד'}.
שם: ${studentName || (isGirl ? 'התלמידה' : 'התלמיד')}.
סוג תוכנית: ${planType}.
הנחיית מגדר: ${genderInstruction}

טקסט האבחון:
"""
${diagnosticText.slice(0, 10000)}
"""

עליך לנתח את האבחון ולחלץ ממנו סיכום מקצועי ומטרות אופרטיביות לתוכנית העבודה.
החזר אך ורק אובייקט JSON תקין במבנה הבא (ללא טקסט מקדים וללא תגי markdown):
{
  "studentGeneralBackground": "רקע משפחתי, התפתחותי וקליני תמציתי ומכבד (2-4 משפטים)",
  "studentSupportReceived": "מענים, טיפולים ותמיכות שהומלצו או ניתנו (כגון שילוב, קלינאית תקשורת, ריפוי בעיסוק, טיפול רגשי)",
  "studentMainGoal": "מטרה מרכזית כוללת של התלמיד/ה לשנה זו מתוך האבחון",
  "strengthsExisting": "מוקדי כוח, יכולות בולטות, תחומי עניין וגורמים מסייעים",
  "strengthsToEmpower": "מוקדים לחיזוק, חסמים ואתגרים עיקריים",
  "recommendations": "המלצות יישומיות לצוות החינוכי ולהתאמות דרכי הוראה והיבחנות",
  "suggestedGoals": [
    {
      "environment": "סביבה מתוך: כיתה ולימודים / חצר והפסקות / ארוחה ומפגש / שפה ואוריינות / מרחב חברתי",
      "title": "ניסוח מטרה עליונה בהירה (מה אנחנו רוצים שיקרה)",
      "objectives": "• יעד אופרטיבי ראשון\\n• יעד אופרטיבי שני",
      "opportunities": "אמצעים ודרכי פעולה של הצוות להשגת המטרה",
      "duration": "3 חודשים",
      "evaluationCriteria": "אמות מידה ומדד להצלחה",
      "leadProfessional": "אחד מתוך: מחנכת הכיתה / מורת שילוב / קלינאית תקשורת / ריפוי בעיסוק / טיפול רגשי / אמנויות / צוות משותף"
    }
  ]
}`;
}

/**
 * Sanitizes and normalizes the parsed diagnostic intake response.
 */
export function sanitizeDiagnosticIntakeResult(
  rawResult: Record<string, unknown> = {},
  gender = 'boy'
): SanitizedDiagnosticIntake {
  const g = (txt: unknown): string => adaptTextToGender(String(txt || '').trim(), gender);

  const rawGoals = Array.isArray(rawResult.suggestedGoals) ? rawResult.suggestedGoals : [];
  const suggestedGoals: DiagnosticSuggestedGoal[] = rawGoals.map((gItem: unknown, idx: number) => {
    const gObj = (gItem && typeof gItem === 'object' ? gItem : {}) as Record<string, unknown>;
    return {
      id: `intake_g_${Date.now()}_${idx}`,
      environment: g(gObj.environment) || 'כיתה ולימודים',
      title: g(gObj.title) || '',
      objectives: g(gObj.objectives) || '',
      opportunities: g(gObj.opportunities) || '',
      duration: g(gObj.duration) || '3 חודשים',
      evaluationCriteria: g(gObj.evaluationCriteria) || '',
      leadProfessional: String(gObj.leadProfessional || 'צוות משותף'),
      isTeacherAdded: true
    };
  });

  return {
    studentGeneralBackground: g(rawResult.studentGeneralBackground),
    studentSupportReceived: g(rawResult.studentSupportReceived),
    studentMainGoal: g(rawResult.studentMainGoal),
    strengthsExisting: g(rawResult.strengthsExisting),
    strengthsToEmpower: g(rawResult.strengthsToEmpower),
    recommendations: g(rawResult.recommendations),
    suggestedGoals
  };
}

/**
 * Merges the approved diagnostic intake data into the existing student formData.
 */
export function applyDiagnosticIntakeToStudent(
  formData: Record<string, unknown> = {},
  intake: Partial<SanitizedDiagnosticIntake> = {},
  selectedGoalIds: string[] = [],
  attachedDocRecord?: DiagnosticDocumentRecord | null
): Record<string, unknown> {
  const approvedGoals = (intake.suggestedGoals || []).filter((g) =>
    selectedGoalIds.includes(g.id)
  );

  const existingGoals = Array.isArray(formData.goals) ? (formData.goals as unknown[]) : [];
  const nextGoals = [...existingGoals, ...approvedGoals];

  const mergeText = (cur: unknown, add: unknown): string => {
    const c = String(cur || '').trim();
    const a = String(add || '').trim();
    if (!a) return c;
    if (!c) return a;
    if (c.includes(a)) return c;
    return `${c}\n\n${a}`;
  };

  let nextFormData: Record<string, unknown> = {
    ...formData,
    studentGeneralBackground: mergeText(
      formData.studentGeneralBackground,
      intake.studentGeneralBackground
    ),
    studentSupportReceived: mergeText(
      formData.studentSupportReceived,
      intake.studentSupportReceived
    ),
    studentMainGoal: formData.studentMainGoal || intake.studentMainGoal || '',
    strengthsExisting: mergeText(formData.strengthsExisting, intake.strengthsExisting),
    strengthsToEmpower: mergeText(formData.strengthsToEmpower, intake.strengthsToEmpower),
    recommendations: mergeText(formData.recommendations, intake.recommendations),
    goals: nextGoals,
    lastSavedAt: new Date().toISOString()
  };

  if (attachedDocRecord && attachedDocRecord.fileName) {
    nextFormData = addDiagnosticDocumentToStudent(nextFormData, attachedDocRecord);
  }

  return nextFormData;
}


/**
 * Creates a diagnostic document record object for student storage.
 */
export function createDiagnosticDocumentRecord({
  fileName = '',
  fileType = 'pdf',
  fullText = '',
  fileSizeFormatted = '',
  storageUrl = '',
  storagePath = ''
}: CreateDiagnosticDocumentRecordOptions = {}): DiagnosticDocumentRecord {
  const cleanText = String(fullText || '').trim();
  const snippet = cleanText
    ? (cleanText.length > 200 ? `${cleanText.slice(0, 200)}...` : cleanText)
    : 'מסמך סרוק / תמונה – שמור בתיק התלמיד/ה';
  return {
    id: `doc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    fileName: String(fileName || 'מסמך ללא שם').trim(),
    fileType: String(fileType || 'pdf').toLowerCase(),
    fileSizeFormatted: fileSizeFormatted || '',
    storageUrl: String(storageUrl || ''),
    storagePath: String(storagePath || ''),
    uploadedAt: new Date().toISOString(),
    extractionStatus: cleanText ? 'success' : 'scanned_image',
    textSnippet: snippet,
    fullText: cleanText
  };
}

/**
 * Attaches a diagnostic document record to the student's diagnosticDocuments list.
 */
export function addDiagnosticDocumentToStudent(
  formData: Record<string, unknown> = {},
  docRecord?: DiagnosticDocumentRecord | null
): Record<string, unknown> {
  if (!docRecord || !docRecord.fileName) return formData;
  const existingDocs: DiagnosticDocumentRecord[] = Array.isArray(formData.diagnosticDocuments)
    ? (formData.diagnosticDocuments as DiagnosticDocumentRecord[])
    : [];

  const exists = existingDocs.some(
    (d) => d.id === docRecord.id || (d.fileName === docRecord.fileName && d.fullText === docRecord.fullText)
  );
  if (exists) return formData;

  return {
    ...formData,
    diagnosticDocuments: [docRecord, ...existingDocs],
    lastSavedAt: new Date().toISOString()
  };
}

/**
 * Removes a diagnostic document from the student's diagnosticDocuments list by id.
 */
export function removeDiagnosticDocumentFromStudent(
  formData: Record<string, unknown> = {},
  docId: string = ''
): Record<string, unknown> {
  if (!docId) return formData;
  const existingDocs: DiagnosticDocumentRecord[] = Array.isArray(formData.diagnosticDocuments)
    ? (formData.diagnosticDocuments as DiagnosticDocumentRecord[])
    : [];
  const filtered = existingDocs.filter((d) => d.id !== docId);

  return {
    ...formData,
    diagnosticDocuments: filtered,
    lastSavedAt: new Date().toISOString()
  };
}
