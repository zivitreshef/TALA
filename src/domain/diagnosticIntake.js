import { adaptTextToGender } from './goalSizingAndMerge';

// Polyfill Promise.withResolvers for Node 20 / older browser runtimes needed by pdfjs-dist
if (typeof Promise.withResolvers === 'undefined') {
  Promise.withResolvers = function () {
    let resolve, reject;
    const promise = new Promise((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
  };
}

/**
 * Extracts plain text from an uncompressed or deflate-compressed .docx (Word) file ArrayBuffer.
 */
export async function extractTextFromDocx(buffer) {
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
            const chunks = [];
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
          const lines = [];
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
export async function extractTextFromPdf(buffer) {
  if (!buffer) return '';

  // 1. Primary: PDF.js legacy engine (handles compressed streams, embedded font CMaps, multi-page)
  try {
    const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const data = new Uint8Array(buffer);
    const loadingTask = pdfjsLib.getDocument({
      data,
      useWorkerFetch: false,
      isEvalSupported: false,
      useSystemFonts: true
    });
    const pdf = await loadingTask.promise;
    const pages = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = (textContent.items || [])
        .map((item) => (item.str ? item.str : ''))
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
    const extractedChunks = [];
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
export async function extractTextFromFile(file) {
  if (!file) return '';
  const fileName = (file.name || '').toLowerCase();

  // 1. Text files (.txt, .csv, markdown)
  if (fileName.endsWith('.txt') || fileName.endsWith('.csv') || fileName.endsWith('.md')) {
    return await file.text();
  }

  // 2. Word files (.docx)
  if (fileName.endsWith('.docx')) {
    try {
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
}) {
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
export function sanitizeDiagnosticIntakeResult(rawResult = {}, gender = 'boy') {
  const g = (txt) => adaptTextToGender(String(txt || '').trim(), gender);

  const rawGoals = Array.isArray(rawResult.suggestedGoals) ? rawResult.suggestedGoals : [];
  const suggestedGoals = rawGoals.map((gObj, idx) => ({
    id: `intake_g_${Date.now()}_${idx}`,
    environment: g(gObj.environment) || 'כיתה ולימודים',
    title: g(gObj.title) || '',
    objectives: g(gObj.objectives) || '',
    opportunities: g(gObj.opportunities) || '',
    duration: g(gObj.duration) || '3 חודשים',
    evaluationCriteria: g(gObj.evaluationCriteria) || '',
    leadProfessional: gObj.leadProfessional || 'צוות משותף',
    isTeacherAdded: true
  }));

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
  formData = {},
  intake = {},
  selectedGoalIds = [],
  attachedDocRecord = null
) {
  const approvedGoals = (intake.suggestedGoals || []).filter((g) =>
    selectedGoalIds.includes(g.id)
  );

  const nextGoals = [...(formData.goals || []), ...approvedGoals];

  const mergeText = (cur, add) => {
    const c = String(cur || '').trim();
    const a = String(add || '').trim();
    if (!a) return c;
    if (!c) return a;
    if (c.includes(a)) return c;
    return `${c}\n\n${a}`;
  };

  let nextFormData = {
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
  fileSizeFormatted = ''
}) {
  const cleanText = String(fullText || '').trim();
  const snippet = cleanText
    ? (cleanText.length > 200 ? `${cleanText.slice(0, 200)}...` : cleanText)
    : 'מסמך סרוק / תמונה – שמור בתיק התלמיד/ה';
  return {
    id: `doc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    fileName: String(fileName || 'מסמך ללא שם').trim(),
    fileType: String(fileType || 'pdf').toLowerCase(),
    fileSizeFormatted: fileSizeFormatted || '',
    uploadedAt: new Date().toISOString(),
    extractionStatus: cleanText ? 'success' : 'scanned_image',
    textSnippet: snippet,
    fullText: cleanText
  };
}

/**
 * Attaches a diagnostic document record to the student's diagnosticDocuments list.
 */
export function addDiagnosticDocumentToStudent(formData = {}, docRecord = {}) {
  if (!docRecord || !docRecord.fileName) return formData;
  const existingDocs = Array.isArray(formData.diagnosticDocuments) ? formData.diagnosticDocuments : [];

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
export function removeDiagnosticDocumentFromStudent(formData = {}, docId = '') {
  if (!docId) return formData;
  const existingDocs = Array.isArray(formData.diagnosticDocuments) ? formData.diagnosticDocuments : [];
  const filtered = existingDocs.filter((d) => d.id !== docId);

  return {
    ...formData,
    diagnosticDocuments: filtered,
    lastSavedAt: new Date().toISOString()
  };
}
