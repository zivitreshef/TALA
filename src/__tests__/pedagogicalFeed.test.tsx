import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  createSnippetId,
  createTeacherNoteSnippet,
  createDocumentSnippet,
  migrateLegacyFreeTextToSnippets,
  aggregateSnippetsForAiPrompt,
  syncSnippetsToCombinedText,
  addSnippet,
  removeSnippet,
  updateSnippet
} from '../domain/pedagogicalFeed';
import PedagogicalFeed, { SNIPPET_COLOR_PALETTES } from '../components/form/PedagogicalFeed';
import DiagnosticIntakeModal from '../components/form/DiagnosticIntakeModal';
import type { PedagogicalSnippet } from '../domain/types';

describe('Pedagogical Feed Domain & Timeline Logic', () => {
  it('generates unique snippet IDs with ps_ prefix', () => {
    const id1 = createSnippetId();
    const id2 = createSnippetId();
    expect(id1).toMatch(/^ps_\d+_[a-z0-9]+$/);
    expect(id2).toMatch(/^ps_\d+_[a-z0-9]+$/);
    expect(id1).not.toBe(id2);
  });

  it('creates teacher note snippet correctly', () => {
    const snippet = createTeacherNoteSnippet('  הילד מפגין קשיי ויסות בחצר  ', 'זיוית המורה');
    expect(snippet.id).toBeDefined();
    expect(snippet.sourceType).toBe('teacher_note');
    expect(snippet.sourceTitle).toBe('תצפית (זיוית המורה)');
    expect(snippet.content).toBe('הילד מפגין קשיי ויסות בחצר');
    expect(snippet.authorName).toBe('זיוית המורה');
    expect(snippet.createdAt).toBeDefined();
  });

  it('creates document snippet correctly', () => {
    const snippet = createDocumentSnippet({
      sourceTitle: 'סיכום ועדת אפיון תשפ״ו.docx',
      content: 'מומלץ לשלב סייעת צמודה במעברים.',
      documentId: 'doc_123'
    });
    expect(snippet.id).toBeDefined();
    expect(snippet.sourceType).toBe('document');
    expect(snippet.sourceTitle).toBe('סיכום ועדת אפיון תשפ״ו.docx');
    expect(snippet.content).toBe('מומלץ לשלב סייעת צמודה במעברים.');
    expect(snippet.documentId).toBe('doc_123');
  });

  describe('Backward compatibility: migrateLegacyFreeTextToSnippets', () => {
    it('returns empty array when no text and no snippets exist', () => {
      expect(migrateLegacyFreeTextToSnippets('', [])).toEqual([]);
      expect(migrateLegacyFreeTextToSnippets(undefined, undefined)).toEqual([]);
    });

    it('migrates legacy teacherFreeText string into a single teacher note snippet', () => {
      const legacyText = 'רועי ילד סקרן וחברותי, מתקשה בכתיבה ממושכת.';
      const snippets = migrateLegacyFreeTextToSnippets(legacyText, undefined, 'מוטי');
      expect(snippets).toHaveLength(1);
      expect(snippets[0].sourceType).toBe('teacher_note');
      expect(snippets[0].content).toBe(legacyText);
      expect(snippets[0].authorName).toBe('מוטי');
    });

    it('preserves existing snippets without re-migrating legacy text', () => {
      const existing: PedagogicalSnippet[] = [
        {
          id: 'ps_1',
          sourceType: 'document',
          sourceTitle: 'דוח ריפוי בעיסוק',
          content: 'שיפור באחיזת עפרון',
          createdAt: new Date().toISOString()
        }
      ];
      const result = migrateLegacyFreeTextToSnippets('טקסט ישן שלא אמור להחליף', existing);
      expect(result).toBe(existing);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('ps_1');
    });
  });

  describe('AI Prompt Aggregation & Synchronization', () => {
    it('aggregates multiple snippets with source headers for the AI prompt', () => {
      const snippets: PedagogicalSnippet[] = [
        {
          id: 'ps_doc1',
          sourceType: 'document',
          sourceTitle: 'סיכום ועדת זכאות',
          content: 'הילד זקוק להטרמה קבועה לפני שינוי שגרה.',
          createdAt: '2026-11-01T10:00:00Z'
        },
        {
          id: 'ps_note1',
          sourceType: 'teacher_note',
          sourceTitle: 'תצפית מורה',
          authorName: 'אילנית',
          content: 'מגיב נפלא לחיזוקים חיוביים בלוח נקודות אישי.',
          createdAt: '2026-11-02T12:00:00Z'
        }
      ];

      const promptText = aggregateSnippetsForAiPrompt(snippets);
      expect(promptText).toContain('[מקור #1 (מסמך): סיכום ועדת זכאות]');
      expect(promptText).toContain('הילד זקוק להטרמה קבועה לפני שינוי שגרה.');
      expect(promptText).toContain('---');
      expect(promptText).toContain('[מקור #2 (תצפית אישית): תצפית מורה | נרשם על ידי: אילנית]');
      expect(promptText).toContain('מגיב נפלא לחיזוקים חיוביים בלוח נקודות אישי.');
    });

    it('syncSnippetsToCombinedText combines text for downstream consumers', () => {
      const snippets: PedagogicalSnippet[] = [
        {
          id: 'ps_1',
          sourceType: 'document',
          sourceTitle: 'מסמך 1',
          content: 'חלק ראשון',
          createdAt: ''
        },
        {
          id: 'ps_2',
          sourceType: 'teacher_note',
          sourceTitle: 'הערה',
          content: 'חלק שני',
          createdAt: ''
        }
      ];
      expect(syncSnippetsToCombinedText(snippets)).toBe('חלק ראשון\n\nחלק שני');
    });

    it('addSnippet and removeSnippet are immutable', () => {
      const initial: PedagogicalSnippet[] = [
        { id: '1', sourceType: 'document', sourceTitle: 'A', content: 'A', createdAt: '' }
      ];
      const newOne: PedagogicalSnippet = { id: '2', sourceType: 'teacher_note', sourceTitle: 'B', content: 'B', createdAt: '' };
      
      const added = addSnippet(initial, newOne);
      expect(added).toHaveLength(2);
      expect(initial).toHaveLength(1);

      const removed = removeSnippet(added, '1');
      expect(removed).toHaveLength(1);
      expect(removed[0].id).toBe('2');
      expect(added).toHaveLength(2);
    });

    it('updateSnippet updates content and sets updatedAt immutably', () => {
      const initial: PedagogicalSnippet[] = [
        { id: '1', sourceType: 'document', sourceTitle: 'A', content: 'Original text', createdAt: '2026-11-01T10:00:00Z' },
        { id: '2', sourceType: 'teacher_note', sourceTitle: 'B', content: 'Second note', createdAt: '2026-11-01T11:00:00Z' }
      ];

      const updated = updateSnippet(initial, '1', 'Updated text by teacher');
      expect(updated).toHaveLength(2);
      expect(updated[0].content).toBe('Updated text by teacher');
      expect(updated[0].updatedAt).toBeDefined();
      expect(initial[0].content).toBe('Original text');

      const notFound = updateSnippet(initial, '999', 'Something');
      expect(notFound[0].content).toBe('Original text');

      const emptyUpdate = updateSnippet(initial, '1', '   ');
      expect(emptyUpdate[0].content).toBe('Original text');

      expect(updateSnippet(undefined, '1', 'Text')).toEqual([]);
    });
  });
});

describe('PedagogicalFeed Component UI Tests', () => {
  const sampleSnippets: PedagogicalSnippet[] = [
    {
      id: 's1',
      sourceType: 'document',
      sourceTitle: 'יהלי.docx',
      content: 'קושי בוויסות רגשי במעברים פתוחים.',
      createdAt: '2026-11-02T10:00:00Z'
    },
    {
      id: 's2',
      sourceType: 'document',
      sourceTitle: 'יוגב פרץ-2.docx',
      content: 'בשיעור ספורט הצליח להמתין לתורו יפה.',
      createdAt: '2026-11-02T12:00:00Z'
    }
  ];

  it('renders active sources count and snippet cards with distinct rotating color palettes', () => {
    const html = renderToStaticMarkup(
      <PedagogicalFeed
        snippets={sampleSnippets}
        onAddSnippet={vi.fn()}
        onRemoveSnippet={vi.fn()}
        onOpenUploadModal={vi.fn()}
        onSaveDraft={vi.fn()}
        onTriggerAiAnalysis={vi.fn()}
      />
    );

    expect(html).toContain('2 מקורות פעילים');
    expect(html).toContain('יהלי.docx');
    expect(html).toContain('יוגב פרץ-2.docx');
    expect(html).toContain('מסמך רקע');
    expect(html).toContain('קושי בוויסות רגשי במעברים פתוחים.');
    expect(html).toContain('בשיעור ספורט הצליח להמתין לתורו יפה.');
    expect(html).toContain('שמור טיוטה');
    expect(html).toContain('העלאת מסמך אבחון');
    expect(html).toContain('ניתוח כל המקורות ב-AI');

    // Distinct palettes: Card 0 uses indigo (#4f46e5), Card 1 uses teal (#0d9488)
    expect(html).toContain(SNIPPET_COLOR_PALETTES[0].avatarBg);
    expect(html).toContain(SNIPPET_COLOR_PALETTES[1].avatarBg);
  });

  it('renders empty state when no snippets are present', () => {
    const html = renderToStaticMarkup(
      <PedagogicalFeed
        snippets={[]}
        onAddSnippet={vi.fn()}
        onRemoveSnippet={vi.fn()}
        onOpenUploadModal={vi.fn()}
        onSaveDraft={vi.fn()}
        onTriggerAiAnalysis={vi.fn()}
      />
    );

    expect(html).toContain('0 מקורות פעילים');
    expect(html).toContain('pedagogical-feed-empty-strip');
    expect(html).toContain('ציר התובנות ריק כרגע');
    expect(html).not.toContain('📝');
    expect(html).not.toContain('🔒');
    expect(html).toContain('הוסיפי תובנה, תצפית או עדכון חדש:');
  });

  it('hides sample description buttons outside the user journey (onboardingStep <= 0)', () => {
    const html = renderToStaticMarkup(
      <PedagogicalFeed
        snippets={sampleSnippets}
        onAddSnippet={vi.fn()}
        onRemoveSnippet={vi.fn()}
        onOpenUploadModal={vi.fn()}
        onTriggerAiAnalysis={vi.fn()}
        onboardingStep={0}
      />
    );

    expect(html).not.toContain('דוגמה לבי"ס');
    expect(html).not.toContain('דוגמה לגן');
  });

  it('shows sample description buttons only when inside the user journey (onboardingStep > 0)', () => {
    const html = renderToStaticMarkup(
      <PedagogicalFeed
        snippets={sampleSnippets}
        onAddSnippet={vi.fn()}
        onRemoveSnippet={vi.fn()}
        onOpenUploadModal={vi.fn()}
        onTriggerAiAnalysis={vi.fn()}
        onboardingStep={3}
      />
    );

    expect(html).toContain('דוגמה לבי');
    expect(html).toContain('דוגמה לגן');
  });

  it('renders edit pencil button for each snippet when report is not locked', () => {
    const html = renderToStaticMarkup(
      <PedagogicalFeed
        snippets={sampleSnippets}
        onAddSnippet={vi.fn()}
        onUpdateSnippet={vi.fn()}
        onRemoveSnippet={vi.fn()}
        onOpenUploadModal={vi.fn()}
        onTriggerAiAnalysis={vi.fn()}
        isLocked={false}
      />
    );

    expect(html).toContain('עריכת תובנה זו');
    expect(html).toContain('הסרת תובנה זו');
  });

  it('hides edit pencil and remove buttons when report is locked', () => {
    const html = renderToStaticMarkup(
      <PedagogicalFeed
        snippets={sampleSnippets}
        onAddSnippet={vi.fn()}
        onUpdateSnippet={vi.fn()}
        onRemoveSnippet={vi.fn()}
        onOpenUploadModal={vi.fn()}
        onTriggerAiAnalysis={vi.fn()}
        isLocked={true}
      />
    );

    expect(html).not.toContain('עריכת תובנה זו');
    expect(html).not.toContain('הסרת תובנה זו');
  });

  describe('AI Trigger & Self-Explaining Empty State UX', () => {
    it('renders disabled AI button with informative tooltip and guidance text when no content exists', () => {
      const html = renderToStaticMarkup(
        <PedagogicalFeed
          snippets={[]}
          onAddSnippet={vi.fn()}
          onRemoveSnippet={vi.fn()}
          onOpenUploadModal={vi.fn()}
          onTriggerAiAnalysis={vi.fn()}
        />
      );

      // AI button is disabled and has explanatory tooltip
      expect(html).toContain('disabled=""');
      expect(html).toContain('יש להקליד תצפית בתיבה או להעלות מסמך כדי להפעיל את ניתוח ה-AI');
      // Visual guidance microcopy is displayed below the button
      expect(html).toContain('ai-trigger-empty-helper-text');
      expect(html).toContain('הקלידי תצפית בתיבה או העלי מסמך להפעלת הניתוח');
    });

    it('renders active AI button without guidance text when snippets are present', () => {
      const html = renderToStaticMarkup(
        <PedagogicalFeed
          snippets={sampleSnippets}
          onAddSnippet={vi.fn()}
          onRemoveSnippet={vi.fn()}
          onOpenUploadModal={vi.fn()}
          onTriggerAiAnalysis={vi.fn()}
        />
      );

      expect(html).not.toContain('ai-trigger-empty-helper-text');
      expect(html).not.toContain('הקלידי תצפית בתיבה או העלי מסמך להפעלת הניתוח');
      expect(html).toContain('לחצי להפקת יעדים ומטרות מכל המקורות');
    });

    it('hides empty guidance text while AI analysis is actively processing', () => {
      const html = renderToStaticMarkup(
        <PedagogicalFeed
          snippets={[]}
          onAddSnippet={vi.fn()}
          onRemoveSnippet={vi.fn()}
          onOpenUploadModal={vi.fn()}
          onTriggerAiAnalysis={vi.fn()}
          isAnalyzing={true}
        />
      );

      expect(html).toContain('מעבד את כל המקורות ב-AI...');
      expect(html).not.toContain('ai-trigger-empty-helper-text');
      expect(html).not.toContain('הקלידי תצפית בתיבה או העלי מסמך להפעלת הניתוח');
    });

    it('preserves 100% of uncommitted notes and documents when aggregating for AI prompt', () => {
      const existingDoc = sampleSnippets[0];
      const uncommittedTypedText = 'תצפית טרייה שהוקלדה בתיבה וטרם נשמרה בלחיצה ידנית';
      const autoCommittedNote = createTeacherNoteSnippet(uncommittedTypedText, 'רינת המורה');

      const fullCombinedSnippets = addSnippet([existingDoc], autoCommittedNote);
      expect(fullCombinedSnippets).toHaveLength(2);

      const aggregatedPrompt = aggregateSnippetsForAiPrompt(fullCombinedSnippets);
      // Both existing doc and newly typed uncommitted note are fully present in prompt
      expect(aggregatedPrompt).toContain(existingDoc.content);
      expect(aggregatedPrompt).toContain(uncommittedTypedText);
      expect(aggregatedPrompt).toContain('רינת המורה');
    });
  });
});

describe('DiagnosticIntakeModal Simplified Workflow', () => {
  it('renders simplified modal without AI button or manual notes field', () => {
    const html = renderToStaticMarkup(
      <DiagnosticIntakeModal
        formData={{ id: 'student_42', name: 'איתי לוי', gender: 'boy' }}
        initialText={'שורה ראשונה חשובה\nשורה שנייה שאינה רלוונטית'}
        initialDocName="ועדת_אפיון.pdf"
        authorName="מורת שילוב"
        onApplyIntake={vi.fn()}
        onClose={vi.fn()}
      />
    );

    // Verify AI analysis button is removed
    expect(html).not.toContain('נתח ב-AI');
    expect(html).not.toContain('תוספת הערות');

    // Verify primary CTA is "שמור בתיק והוסף לתובנות"
    expect(html).toContain('שמור בתיק והוסף לתובנות');
    expect(html).toContain('קליטת מסמך ושמירה בתיק התלמיד/ה');
    expect(html).toContain('בחרי את המשפטים החשובים – הם יתווספו אוטומטית לציר התובנות');
    expect(html).toContain('מרקר שורות (2/2)');
    expect(html).toContain('שורה ראשונה חשובה');
    expect(html).toContain('שורה שנייה שאינה רלוונטית');
    expect(html).toContain('privacy-sensitive-info-note');
    expect(html).toContain('שמירה על פרטיות:');
    expect(html).toContain('נא להימנע מחשיפת מידע אישי רגיש או פרטים מזהים של התלמיד/ה');
  });

  it('unifies the diagnostic upload button label to "העלאת מסמך אבחון" in PedagogicalFeed', () => {
    const html = renderToStaticMarkup(
      <PedagogicalFeed
        snippets={[]}
        onAddSnippet={vi.fn()}
        onRemoveSnippet={vi.fn()}
        onOpenUploadModal={vi.fn()}
        onTriggerAiAnalysis={vi.fn()}
      />
    );
    expect(html).toContain('העלאת מסמך אבחון');
    expect(html).not.toContain('העלאת מסמך נוסף');
  });
});
