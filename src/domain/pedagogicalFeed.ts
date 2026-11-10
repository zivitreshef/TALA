import type { PedagogicalSnippet } from './types';

export function createSnippetId(): string {
  return `ps_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export function createTeacherNoteSnippet(
  content: string,
  authorName?: string,
  createdAt?: string
): PedagogicalSnippet {
  return {
    id: createSnippetId(),
    sourceType: 'teacher_note',
    sourceTitle: authorName ? `תצפית (${authorName})` : 'תצפית מורה',
    content: (content || '').trim(),
    authorName: (authorName || '').trim() || undefined,
    createdAt: createdAt || new Date().toISOString()
  };
}

export interface CreateDocumentSnippetParams {
  sourceTitle: string;
  content: string;
  documentId?: string;
  authorName?: string;
  createdAt?: string;
}

export function createDocumentSnippet(params: CreateDocumentSnippetParams): PedagogicalSnippet {
  return {
    id: createSnippetId(),
    sourceType: 'document',
    sourceTitle: (params.sourceTitle || 'מסמך רקע').trim(),
    documentId: params.documentId,
    content: (params.content || '').trim(),
    authorName: params.authorName?.trim() || undefined,
    createdAt: params.createdAt || new Date().toISOString()
  };
}

/**
 * Backward compatibility:
 * If a student record has `teacherFreeText` but no `pedagogicalSnippets`,
 * converts the existing text into a single `teacher_note` snippet.
 */
export function migrateLegacyFreeTextToSnippets(
  teacherFreeText?: string,
  existingSnippets?: PedagogicalSnippet[],
  defaultAuthor?: string
): PedagogicalSnippet[] {
  if (Array.isArray(existingSnippets) && existingSnippets.length > 0) {
    return existingSnippets;
  }
  const clean = (teacherFreeText || '').trim();
  if (!clean) {
    return [];
  }
  return [createTeacherNoteSnippet(clean, defaultAuthor)];
}

/**
 * Formats all active snippets into a unified, high-context string
 * for the pedagogical AI prompt.
 */
export function aggregateSnippetsForAiPrompt(snippets: PedagogicalSnippet[]): string {
  if (!Array.isArray(snippets) || snippets.length === 0) {
    return '';
  }

  return snippets
    .filter((s) => (s.content || '').trim().length > 0)
    .map((s, idx) => {
      const typeLabel = s.sourceType === 'document' ? 'מסמך' : 'תצפית אישית';
      const authorPart = s.authorName ? ` | נרשם על ידי: ${s.authorName}` : '';
      return `[מקור #${idx + 1} (${typeLabel}): ${s.sourceTitle}${authorPart}]\n${s.content.trim()}`;
    })
    .join('\n\n---\n\n');
}

/**
 * Synchronizes snippets into a single plain-text string for backward compatibility
 * with legacy consumers (reports, stage classifiers, rollover).
 */
export function syncSnippetsToCombinedText(snippets: PedagogicalSnippet[]): string {
  if (!Array.isArray(snippets) || snippets.length === 0) {
    return '';
  }
  return snippets
    .map((s) => s.content.trim())
    .filter(Boolean)
    .join('\n\n');
}

export function addSnippet(
  snippets: PedagogicalSnippet[] | undefined,
  snippet: PedagogicalSnippet
): PedagogicalSnippet[] {
  const current = Array.isArray(snippets) ? [...snippets] : [];
  return [...current, snippet];
}

export function removeSnippet(
  snippets: PedagogicalSnippet[] | undefined,
  snippetId: string
): PedagogicalSnippet[] {
  if (!Array.isArray(snippets)) return [];
  return snippets.filter((s) => s.id !== snippetId);
}

export function updateSnippet(
  snippets: PedagogicalSnippet[] | undefined,
  snippetId: string,
  updatedContent: string
): PedagogicalSnippet[] {
  if (!Array.isArray(snippets)) return [];
  const trimmed = (updatedContent || '').trim();
  if (!trimmed) return snippets;
  return snippets.map((s) => {
    if (s.id === snippetId) {
      return {
        ...s,
        content: trimmed,
        updatedAt: new Date().toISOString()
      };
    }
    return s;
  });
}
