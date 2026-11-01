import { describe, it, expect } from 'vitest';
import {
  normalizeHebrewTextForContext,
  adaptTextToGender,
  adaptGoalToGender,
  resolveStudentAgeAndDateInfo,
  normalizeAndSizeGoalDuration,
  isGoalEmpty,
  attachAiBaselineToGoal,
  isGoalProtectedFromAiOverwrite,
  doGoalsReferToSameTopic,
  mergeReanalyzedGoals,
  DURATION_TSHIRT_OPTIONS
} from '../domain/goalSizingAndMerge';
import {
  buildDiagnosticPrompt,
  sanitizeDiagnosticIntakeResult,
  applyDiagnosticIntakeToStudent,
  createDiagnosticDocumentRecord,
  addDiagnosticDocumentToStudent,
  removeDiagnosticDocumentFromStudent
} from '../domain/diagnosticIntake';
import {
  getIsraeliHolidayInfo,
  getIsraeliHolidayOrVacation,
  getObservationGaps,
  getPedagogicalAccomplishmentsSummary,
  createOutlook365CalendarUrl,
  createGoogleCalendarUrl,
  generateIcsFileContent,
  buildAiGoalMatchPrompt,
  parseAiGoalMatchResponse,
  calculateDurationMinutes,
  getEventBarThickness,
  shouldSendPedagogicalDigest
} from '../domain/dailyPedagogicalTracking';
import {
  ONBOARDING_TOTAL_STEPS,
  ONBOARDING_STEPS,
  DEMO_STUDENT_DATA,
  getStepById,
  getNextStep,
  getPreviousStep,
  isDemoStudent,
  createFreshDemoStudent
} from '../domain/onboardingJourney';

describe('TypeScript Migration Phase 2 - Batch 10 Domain Modules', () => {
  describe('goalSizingAndMerge', () => {
    it('normalizes Hebrew typos and variations in context', () => {
      const input = 'הילד מתקשא במיפגש, צריך וויסות ריגשי';
      const output = normalizeHebrewTextForContext(input);
      expect(output).toContain('מתקשה');
      expect(output).toContain('מפגש');
      expect(output).toContain('ויסות');
      expect(output).toContain('רגשי');
    });

    it('adapts text to gender for boy and girl accurately', () => {
      const boyText = adaptTextToGender('התלמיד ישחק עם חבריו וייעזר בעצמו', 'girl');
      expect(boyText).toContain('תשחק');
      expect(boyText).toContain('תיעזר');
      expect(boyText).toContain('בעצמה');

      const girlText = adaptTextToGender('התלמידה תשחק ותיעזר בעצמה', 'boy');
      expect(girlText).toContain('ישחק');
      expect(girlText).toContain('ייעזר');
      expect(girlText).toContain('בעצמו');
    });

    it('adapts entire goal object including aiSnapshot to gender', () => {
      const goal = {
        title: 'הילד יגזור וידביק בעצמו',
        activityParticipation: 'ישחק בחצר',
        objectives: 'יקשיב להוראות',
        evaluationCriteria: 'יצליח ב-80%',
        aiSnapshot: {
          title: 'הילד יגזור',
          activityParticipation: 'ישחק',
          objectives: 'יקשיב',
          evaluationCriteria: 'יצליח'
        }
      };

      const adaptedGirl = adaptGoalToGender(goal, 'girl');
      expect(adaptedGirl.title).toContain('תגזור');
      expect(adaptedGirl.title).toContain('תדביק');
      expect(adaptedGirl.title).toContain('בעצמה');
      expect(adaptedGirl.aiSnapshot?.title).toContain('תגזור');
    });

    it('resolves student age and relative milestone dates', () => {
      const formData = {
        date: '01/09/2025',
        birthDate: '01/09/2019',
        educationalFramework: 'בית ספר יסודי "ארזים"'
      };
      const info = resolveStudentAgeAndDateInfo(formData, 'יונתן בן 6');
      expect(info.entryDateFormatted).toBe('01/09/2025');
      expect(info.plus1Month).toBe('01/10/2025');
      expect(info.plus3Months).toBe('01/12/2025');
      expect(info.endOfYear).toBe('30/06/2026');
      expect(info.ageYears).toBe(6);
    });

    it('normalizes and sizes goal duration with T-Shirt logic', () => {
      const formData = { date: '01/09/2025' };
      const smallGoal = { tShirtSize: 'S', title: 'ארגון ציוד' };
      const durationS = normalizeAndSizeGoalDuration(smallGoal, '', formData);
      expect(durationS).toContain('חודש');

      const mediumGoal = { tShirtSize: 'M', title: 'השתתפות במליאה' };
      const durationM = normalizeAndSizeGoalDuration(mediumGoal, '', formData);
      expect(durationM).toContain('3 חודשים');

      expect(DURATION_TSHIRT_OPTIONS.length).toBeGreaterThanOrEqual(6);
    });

    it('correctly detects empty goals, attaches baseline, and tracks protection', () => {
      expect(isGoalEmpty(null)).toBe(true);
      expect(isGoalEmpty({ title: '', objectives: '' })).toBe(true);
      expect(isGoalEmpty({ title: 'מטרה ברורה' })).toBe(false);

      const rawGoal = { id: 'g1', title: 'השתתפות במפגש', environment: 'מפגש' };
      const baseline = attachAiBaselineToGoal(rawGoal);
      expect(baseline.isAiGenerated).toBe(true);
      expect(baseline.isTeacherModified).toBe(false);
      expect(baseline.aiSnapshot.title).toBe('השתתפות במפגש');
      expect(isGoalProtectedFromAiOverwrite(baseline)).toBe(false);

      // Teacher edits the title -> protected!
      const modifiedGoal = { ...baseline, title: 'עריכת מורה ייחודית' };
      expect(isGoalProtectedFromAiOverwrite(modifiedGoal)).toBe(true);
    });

    it('matches goals referring to the same topic and merges reanalyzed goals cleanly', () => {
      const goalA = { id: 'g1', environment: 'חצר', title: 'משחק כדורגל משותף' };
      const goalB = { id: 'g2', environment: 'חצר', title: 'משחק כדורגל בחצר' };
      expect(doGoalsReferToSameTopic(goalA, goalB)).toBe(true);

      const existingGoals = [
        {
          id: 'prot_1',
          title: 'מטרת מורה נעולה',
          isTeacherAdded: true
        }
      ];
      const candidates = [
        { title: 'מטרה חדשה מה-AI 1' },
        { title: 'מטרה חדשה מה-AI 2' }
      ];
      const merged = mergeReanalyzedGoals({
        existingGoals,
        candidateNewGoals: candidates
      });
      expect(merged.length).toBeGreaterThanOrEqual(2);
      expect(merged[0].id).toBe('prot_1');
    });
  });

  describe('diagnosticIntake', () => {
    it('builds diagnostic pedagogical prompt with gender instructions', () => {
      const boyPrompt = buildDiagnosticPrompt({
        diagnosticText: 'דוח אבחון ראשוני',
        gender: 'boy',
        studentName: 'דניאל'
      });
      expect(boyPrompt).toContain('בלשון זכר');
      expect(boyPrompt).toContain('דניאל');

      const girlPrompt = buildDiagnosticPrompt({
        diagnosticText: 'דוח אבחון ראשוני',
        gender: 'girl',
        studentName: 'מאיה'
      });
      expect(girlPrompt).toContain('בלשון נקבה');
      expect(girlPrompt).toContain('מאיה');
    });

    it('sanitizes diagnostic intake result and creates goals with IDs', () => {
      const raw = {
        studentGeneralBackground: 'רקע משפחתי תקין',
        studentMainGoal: 'שיפור קשב',
        suggestedGoals: [
          {
            environment: 'כיתה',
            title: 'ישיבה רצופה',
            objectives: 'יקשיב 15 דקות'
          }
        ]
      };
      const sanitized = sanitizeDiagnosticIntakeResult(raw, 'girl');
      expect(sanitized.studentGeneralBackground).toBe('רקע משפחתי תקין');
      expect(sanitized.suggestedGoals.length).toBe(1);
      expect(sanitized.suggestedGoals[0].id).toMatch(/^intake_g_/);
      expect(sanitized.suggestedGoals[0].title).toContain('ישיבה רצופה');
    });

    it('manages diagnostic document records and attaches to student record', () => {
      const doc = createDiagnosticDocumentRecord({
        fileName: 'psychological_eval_2025.pdf',
        fileType: 'pdf',
        fullText: 'אבחון פסיכודידקטי מקיף 2025',
        fileSizeFormatted: '1.2 MB'
      });
      expect(doc.id).toMatch(/^doc_/);
      expect(doc.extractionStatus).toBe('success');
      expect(doc.textSnippet).toContain('אבחון פסיכודידקטי');

      let student: Record<string, unknown> = { name: 'יונתן' };
      student = addDiagnosticDocumentToStudent(student, doc);
      expect(Array.isArray(student.diagnosticDocuments)).toBe(true);
      expect((student.diagnosticDocuments as unknown[]).length).toBe(1);

      student = removeDiagnosticDocumentFromStudent(student, doc.id);
      expect((student.diagnosticDocuments as unknown[]).length).toBe(0);
    });

    it('merges diagnostic intake data into student form data', () => {
      const student = {
        studentGeneralBackground: 'רקע קודם',
        goals: [{ id: 'g_existing', title: 'מטרה קיימת' }]
      };
      const intake = {
        studentGeneralBackground: 'תוספת רקע מהאבחון',
        studentMainGoal: 'מטרה שנתית',
        suggestedGoals: [
          {
            id: 'g_new_1',
            environment: 'כיתה',
            title: 'מטרה מאושרת',
            objectives: '',
            opportunities: '',
            duration: '3 חודשים',
            evaluationCriteria: '',
            leadProfessional: 'מחנכת',
            isTeacherAdded: true
          }
        ]
      };
      const merged = applyDiagnosticIntakeToStudent(student, intake, ['g_new_1']);
      expect(String(merged.studentGeneralBackground)).toContain('רקע קודם');
      expect(String(merged.studentGeneralBackground)).toContain('תוספת רקע מהאבחון');
      expect((merged.goals as unknown[]).length).toBe(2);
    });
  });

  describe('dailyPedagogicalTracking', () => {
    it('accurately identifies Israeli holidays and distinguishes vacations', () => {
      // Yom HaShoah 2025 (יש לימודים - false)
      const shoahInfo = getIsraeliHolidayInfo('2025-04-24');
      expect(shoahInfo).not.toBeNull();
      expect(shoahInfo?.name).toContain('יום הזיכרון לשואה');
      expect(shoahInfo?.isVacation).toBe(false);
      expect(shoahInfo?.statusText).toBe('יש לימודים');

      // Passover 2025 (אין לימודים - true)
      const passoverInfo = getIsraeliHolidayInfo('2025-04-10');
      expect(passoverInfo).not.toBeNull();
      expect(passoverInfo?.name).toContain('חופשת פסח');
      expect(passoverInfo?.isVacation).toBe(true);
      expect(passoverInfo?.statusText).toBe('אין לימודים');

      // Summer Vacation (July)
      const summerInfo = getIsraeliHolidayInfo('2026-07-15');
      expect(summerInfo?.name).toBe('החופש הגדול');
      expect(summerInfo?.isVacation).toBe(true);

      expect(getIsraeliHolidayOrVacation('2025-04-10')).toContain('פסח');
      expect(getIsraeliHolidayOrVacation('2025-11-15')).toBeNull();
    });

    it('identifies observation gaps for stale or never-observed goals', () => {
      const students = [
        {
          id: 's1',
          name: 'יונתן',
          goals: [
            { id: 'g1', title: 'יעד ללא תצפיות', observations: [] },
            {
              id: 'g2',
              title: 'יעד עם תצפית ישנה',
              observations: [{ timestamp: '2025-01-01T08:00:00Z', progress: 20 }]
            }
          ]
        }
      ];

      const refDate = new Date('2025-03-01T08:00:00Z');
      const gaps = getObservationGaps(students, 21, refDate);
      expect(gaps.length).toBe(2);
      expect(gaps.find((g) => g.goalId === 'g1')?.neverObserved).toBe(true);
      expect(gaps.find((g) => g.goalId === 'g2')?.daysSinceObservation).toBeGreaterThan(21);
    });

    it('summarizes pedagogical accomplishments and milestones', () => {
      const students = [
        {
          id: 's1',
          name: 'נועם',
          goals: [
            {
              title: 'יעד שהתקדם',
              currentProgress: 75,
              targetProgress: 80,
              observations: [
                {
                  timestamp: '2025-05-10T10:00:00Z',
                  note: 'התקדמות יפה',
                  progress: 75
                }
              ]
            }
          ]
        }
      ];

      const summary = getPedagogicalAccomplishmentsSummary(
        students,
        30,
        new Date('2025-05-15T10:00:00Z')
      );
      expect(summary.totalStudents).toBe(1);
      expect(summary.totalGoals).toBe(1);
      expect(summary.onTrackGoalsCount).toBe(1);
      expect(summary.advancedGoals.length).toBe(1);
      expect(summary.recentObservations.length).toBe(1);
    });

    it('generates Outlook, Google, and iCalendar links and files', () => {
      const event = {
        title: 'ישיבת תל"א יונתן',
        startIso: '2025-10-15T10:00:00',
        endIso: '2025-10-15T11:00:00',
        details: 'דיון על התקדמות שנתית',
        location: 'חדר מתי"א'
      };

      const outlookUrl = createOutlook365CalendarUrl(event);
      expect(outlookUrl).toContain('outlook.office.com');
      expect(outlookUrl).toContain('subject=');

      const googleUrl = createGoogleCalendarUrl(event);
      expect(googleUrl).toContain('calendar.google.com');
      expect(googleUrl).toContain('action=TEMPLATE');

      const ics = generateIcsFileContent([event]);
      expect(ics).toContain('BEGIN:VCALENDAR');
      expect(ics).toContain('SUMMARY:ישיבת תל"א יונתן');
      expect(ics).toContain('END:VCALENDAR');
    });

    it('builds AI goal matching prompt and parses AI JSON responses', () => {
      const student = {
        name: 'יונתן',
        goals: [{ id: 'g1', title: 'השתתפות במליאה', currentProgress: 40 }]
      };
      const prompt = buildAiGoalMatchPrompt({
        note: 'יונתן ישב יפה במפגש הבוקר',
        student
      });
      expect(prompt).toContain('יונתן ישב יפה');
      expect(prompt).toContain('השתתפות במליאה');

      const rawAiResponse = '```json\n{"matchedGoalId": "g1", "matchedGoalTitle": "השתתפות במליאה", "suggestedProgressDelta": 10}\n```';
      const parsed = parseAiGoalMatchResponse(rawAiResponse);
      expect(parsed).not.toBeNull();
      expect(parsed?.matchedGoalId).toBe('g1');
      expect(parsed?.suggestedProgressDelta).toBe(10);
    });

    it('calculates meeting durations and determines digest scheduling', () => {
      expect(calculateDurationMinutes('10:00', '10:45')).toBe(45);
      expect(calculateDurationMinutes('23:30', '00:15')).toBe(45);
      expect(getEventBarThickness('10:00', '10:20')).toBe(3);
      expect(getEventBarThickness('10:00', '10:50')).toBe(4.5);
      expect(getEventBarThickness('10:00', '11:30')).toBe(6);

      const prefs = {
        pedagogicalReminderEnabled: true,
        pedagogicalReminderFrequency: 'monthly',
        pedagogicalReminderMonthlyDay: 1,
        pedagogicalReminderTime: '08:00'
      };
      // On the 1st of the month at 09:00 -> should send!
      const testDate = new Date(2025, 9, 1, 9, 0, 0);
      expect(shouldSendPedagogicalDigest(prefs, null, testDate)).toBe(true);

      // Already sent today -> false
      expect(shouldSendPedagogicalDigest(prefs, testDate.toISOString(), testDate)).toBe(false);
    });
  });

  describe('onboardingJourney', () => {
    it('defines 10 valid steps covering the entire pedagogical journey', () => {
      expect(ONBOARDING_TOTAL_STEPS).toBe(10);
      expect(ONBOARDING_STEPS.length).toBe(10);
      expect(ONBOARDING_STEPS[0].key).toBe('getting_started');
      expect(ONBOARDING_STEPS[9].key).toBe('matya_settings');
    });

    it('allows bidirectional step traversal', () => {
      const step1 = getStepById(1);
      expect(step1?.title).toContain('מבוא למערכת');

      const step2 = getNextStep(1);
      expect(step2?.id).toBe(2);

      const backTo1 = getPreviousStep(2);
      expect(backTo1?.id).toBe(1);

      expect(getNextStep(10)).toBeNull();
      expect(getPreviousStep(1)).toBeNull();
    });

    it('identifies demo student and generates fresh isolated demo instances', () => {
      expect(isDemoStudent({ isDemo: true })).toBe(true);
      expect(isDemoStudent({ id: 'demo_yonatan_levi' })).toBe(true);
      expect(isDemoStudent({ ownerEmail: 'demo@tala.internal' })).toBe(true);
      expect(isDemoStudent({ id: 'real_student_123', isDemo: false })).toBe(false);

      const schoolDemo = createFreshDemoStudent({ stage: 'school' });
      expect(schoolDemo.name).toContain('יונתן');
      expect(schoolDemo.freeTextAnalyzed).toBe(false);

      const kgDemo = createFreshDemoStudent({ stage: 'kindergarten' });
      expect(kgDemo.name).toContain('נועם כהן');
      expect(kgDemo.stage).toBe('kindergarten');
      expect(kgDemo.planType).toContain('גן ילדים');

      expect(DEMO_STUDENT_DATA.id).toBe('demo_yonatan_levi');
    });
  });
});
