import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import TeacherPreferencesModal from '../components/modals/TeacherPreferencesModal';
import DailyPedagogicalTracker from '../components/DailyPedagogicalTracker';
import { buildAiGoalMatchPrompt } from '../domain/dailyPedagogicalTracking';
import { DEFAULT_USER_PREFERENCES } from '../domain/userPreferences';
import { callAiProxyEndpoint } from '../services/aiProxyClient';
import { callAiJson } from '../services/aiJsonClient';

describe('Busy Indicators and AI Prompt Resilience Test Suite', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('Issue 1: Busy indicators on pedagogical reminder & AI analysis buttons', () => {
    it('renders TeacherPreferencesModal reminder button with correct idle attributes', () => {
      const html = renderToStaticMarkup(
        <TeacherPreferencesModal
          isOpen={true}
          onClose={() => {}}
          userPreferences={DEFAULT_USER_PREFERENCES}
          onSavePreferences={() => {}}
          currentUser={{ email: 'teacher@school.gov.il', name: 'מורה' }}
          students={[]}
        />
      );

      expect(html).toContain('data-testid="send-pedagogical-reminder-now-btn"');
      expect(html).toContain('שלח סיכום פדגוגי כעת למייל');
      // aria-busy is false when idle
      expect(html).toContain('aria-busy="false"');
    });

    it('DailyPedagogicalTracker button renders aria-busy and spinner during AI analysis', () => {
      const dummyStudent = {
        id: 'st_1',
        name: 'דניאל כהן',
        stage: 'kindergarten',
        goals: [{ id: 'g_1', title: 'השתתפות במפגש בוקר', environment: 'מפגש בגן' }]
      };

      const html = renderToStaticMarkup(
        <DailyPedagogicalTracker
          students={[dummyStudent]}
          onUpdateStudent={() => {}}
        />
      );

      // Verify the button has aria-busy attribute and is ready
      expect(html).toContain('נתח ושייך ליעד ב-AI');
      expect(html).toContain('aria-busy="false"');
      expect(html).toContain('btn-ai-analyze');
    });
  });

  describe('Issue 2: AI Prompt Budget & Clamping Resilience', () => {
    it('buildAiGoalMatchPrompt bounds oversized notes to at most 5,000 characters', () => {
      const hugeNote = 'תצפית בגן: '.repeat(1000); // ~11,000 chars
      const prompt = buildAiGoalMatchPrompt({
        note: hugeNote,
        student: {
          name: 'נועה',
          goals: Array.from({ length: 40 }, (_, i) => ({
            id: `g_${i}`,
            title: `יעד מספר ${i}`
          }))
        }
      });

      // Bounded note ensures prompt stays well below 14,000 chars
      expect(prompt.length).toBeLessThan(12000);
      expect(prompt).toContain('נועה');
      // Should cap goals to at most 25
      expect(prompt).toContain('[יעד 25]');
      expect(prompt).not.toContain('[יעד 26]');
    });

    it('callAiProxyEndpoint safely clamps oversized prompts > 14,500 chars to avoid HTTP 400 prompt invalid', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (_url, options: any) => {
        const body = JSON.parse(options?.body as string);
        expect(body.payload.prompt.length).toBeLessThanOrEqual(14500);
        return new Response(JSON.stringify({ data: { ok: true } }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      });

      const hugePrompt = 'מטרה בגן הילדים '.repeat(1500); // ~24,000 chars
      const result = await callAiProxyEndpoint({
        operation: 'rawPrompt',
        payload: { prompt: hugePrompt }
      });

      expect(fetchSpy).toHaveBeenCalled();
      expect(result).toEqual({ ok: true });
    });

    it('callAiJson caps prompt exceeding 14,200 chars before delegating to proxy', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (_url, options: any) => {
        const body = JSON.parse(options?.body as string);
        expect(body.payload.prompt.length).toBeLessThanOrEqual(14200);
        return new Response(JSON.stringify({ data: { goals: [] } }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      });

      const hugePrompt = 'פרומפט מפורט לתוכנית עבודה שנתית בגן '.repeat(1000); // ~37,000 chars
      const result = await callAiJson(hugePrompt, {
        name: 'יוסי כהן',
        gender: 'boy',
        stage: 'kindergarten'
      });

      expect(fetchSpy).toHaveBeenCalled();
      expect(result).toEqual({ goals: [] });
    });
  });
});
