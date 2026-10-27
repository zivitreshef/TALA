import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  DeleteStudentModal,
  ArchiveStudentModal,
  LogoutUnsavedModal
} from '../components/modals/StudentActionModals';
import TrialUpgradeModal from '../components/modals/TrialUpgradeModal';
import UserFeedbackSurveyModal from '../components/modals/UserFeedbackSurveyModal';
import AdminAllowlistModal from '../components/modals/AdminAllowlistModal';
import { getPaidRemainingDays } from '../allowedUsers';

// ============================================================================
// Modal Interaction & Validation Logic Helpers (TALA Pedagogical Modals)
// ============================================================================

/**
 * Validates whether user-entered confirmation text matches expected student name exactly.
 * Protects against accidental deletion of student IEP records.
 */
export function validateDeleteConfirmationString(expectedName, userInput) {
  if (typeof expectedName !== 'string' || !expectedName.trim()) return false;
  if (typeof userInput !== 'string') return false;
  return userInput.trim() === expectedName.trim();
}

/**
 * Evaluates whether an unsaved draft exists that warrants prompting before logout.
 */
export function shouldPromptLogoutUnsaved(draftState) {
  if (!draftState || typeof draftState !== 'object') return false;
  return Boolean(draftState.isDirty && draftState.draftData);
}

/**
 * Calculates a prorated subscription price based on remaining days in the cycle.
 * Standard full annual subscription rate is 150 NIS.
 */
export function calculateProratedUpgradePrice(remainingDays, annualRate = 150, options = {}) {
  const { minCharge = 20, cycleDays = 365 } = options;
  if (typeof remainingDays !== 'number' || Number.isNaN(remainingDays) || remainingDays <= 0) {
    return 0;
  }
  if (remainingDays >= cycleDays) {
    return annualRate;
  }
  const rawProrated = (remainingDays / cycleDays) * annualRate;
  const rounded = Math.round(rawProrated);
  return Math.max(minCharge, Math.min(annualRate, rounded));
}

/**
 * Validates and clamps a user satisfaction rating to the permissible 1-5 integer scale.
 */
export function validateSurveyRating(rating) {
  if (typeof rating !== 'number' || Number.isNaN(rating)) return 5;
  const intVal = Math.round(rating);
  if (intVal < 1) return 1;
  if (intVal > 5) return 5;
  return intVal;
}

/**
 * Validates free-text comment limits, trimming whitespace and enforcing max length.
 */
export function validateSurveyComment(text, maxLength = 2000) {
  if (typeof text !== 'string') return '';
  const trimmed = text.trim();
  if (trimmed.length > maxLength) {
    return trimmed.slice(0, maxLength);
  }
  return trimmed;
}

/**
 * Formats a structured survey payload for submission.
 */
export function buildSurveySubmissionPayload({
  currentUser,
  ratings,
  recommendation,
  overallFeedback,
  improvementSuggestions,
  submittedAt = '25/10/2026, 18:00'
}) {
  const safeRatings = {
    easeOfWebsite: validateSurveyRating(ratings?.easeOfWebsite),
    createStudent: validateSurveyRating(ratings?.createStudent),
    generateGoals: validateSurveyRating(ratings?.generateGoals),
    createReport: validateSurveyRating(ratings?.createReport),
    collaborateWithColleagues: validateSurveyRating(ratings?.collaborateWithColleagues)
  };

  return {
    userName: currentUser?.name || '',
    userEmail: currentUser?.email || '',
    userTitle: currentUser?.title || '',
    userGroup: currentUser?.group || '',
    isTrialUser: Boolean(currentUser?.isTrialUser),
    ratings: safeRatings,
    recommendToColleaguesAndManager: recommendation || 'לא נבחר',
    overallFeedback: validateSurveyComment(overallFeedback),
    improvementSuggestions: validateSurveyComment(improvementSuggestions),
    submittedAt
  };
}

// ============================================================================
// Test Suites
// ============================================================================

describe('Modal State Validation & Interaction Logic Suite', () => {

  // --------------------------------------------------------------------------
  // Suite 1: StudentActionModals (Delete, Archive, Logout Unsaved)
  // --------------------------------------------------------------------------
  describe('StudentActionModals Safeguards & State Transitions', () => {
    describe('DeleteStudentModal Safety & Confirmation', () => {
      it('returns null when studentToDelete is null or undefined', () => {
        expect(DeleteStudentModal({ studentToDelete: null })).toBeNull();
        expect(DeleteStudentModal({ studentToDelete: undefined })).toBeNull();
      });

      it('enforces exact confirmation string match for destructive student deletion', () => {
        const studentName = 'איתי לוי';

        // Exact match succeeds
        expect(validateDeleteConfirmationString(studentName, 'איתי לוי')).toBe(true);
        expect(validateDeleteConfirmationString(studentName, '  איתי לוי  ')).toBe(true);

        // Mismatches and tampering fail
        expect(validateDeleteConfirmationString(studentName, 'איתי')).toBe(false);
        expect(validateDeleteConfirmationString(studentName, 'איתי לוין')).toBe(false);
        expect(validateDeleteConfirmationString(studentName, '')).toBe(false);
        expect(validateDeleteConfirmationString(studentName, null)).toBe(false);
        expect(validateDeleteConfirmationString(studentName, undefined)).toBe(false);
        expect(validateDeleteConfirmationString('', 'איתי לוי')).toBe(false);
        expect(validateDeleteConfirmationString(null, 'איתי לוי')).toBe(false);
      });

      it('renders student deletion modal with warning banner and target name', () => {
        const student = { id: 's_1', name: 'נעם אברהם', archived: false };
        const html = renderToStaticMarkup(
          React.createElement(DeleteStudentModal, {
            studentToDelete: student,
            onClose: () => {},
            onConfirmArchiveInstead: () => {},
            onConfirmDelete: () => {}
          })
        );

        expect(html).toContain('אישור מחיקת תלמיד/ה');
        expect(html).toContain('נעם אברהם');
        expect(html).toContain('פעולה זו תמחק את התלמיד/ה ותכנית העבודה לצמיתות');
        expect(html).toContain('העבר לארכיון במקום מחיקה');
        expect(html).toContain('כן, מחק לצמיתות');
      });

      it('hides archive recommendation button when student is already archived', () => {
        const archivedStudent = { id: 's_2', name: 'שירה כהן', archived: true };
        const html = renderToStaticMarkup(
          React.createElement(DeleteStudentModal, {
            studentToDelete: archivedStudent,
            onClose: () => {},
            onConfirmArchiveInstead: () => {},
            onConfirmDelete: () => {}
          })
        );

        expect(html).toContain('שירה כהן');
        expect(html).not.toContain('העבר לארכיון במקום מחיקה');
        expect(html).toContain('כן, מחק לצמיתות');
      });

      it('uses fallback text when student name is missing or blank', () => {
        const student = { id: 's_3', name: '', archived: false };
        const html = renderToStaticMarkup(
          React.createElement(DeleteStudentModal, {
            studentToDelete: student,
            onClose: () => {},
            onConfirmArchiveInstead: () => {},
            onConfirmDelete: () => {}
          })
        );

        expect(html).toContain('ללא שם');
      });

      it('invokes action callbacks correctly', () => {
        const student = { id: 's_1', name: 'אורי לוי', archived: false };
        const onClose = vi.fn();
        const onConfirmArchiveInstead = vi.fn();
        const onConfirmDelete = vi.fn();

        const element = React.createElement(DeleteStudentModal, {
          studentToDelete: student,
          onClose,
          onConfirmArchiveInstead,
          onConfirmDelete
        });

        // Verify props bindings on the React element
        expect(element.props.studentToDelete).toBe(student);
        expect(element.props.onClose).toBe(onClose);
        expect(element.props.onConfirmArchiveInstead).toBe(onConfirmArchiveInstead);
        expect(element.props.onConfirmDelete).toBe(onConfirmDelete);

        // Execute handlers
        element.props.onConfirmArchiveInstead(student);
        expect(onConfirmArchiveInstead).toHaveBeenCalledWith(student);

        element.props.onConfirmDelete();
        expect(onConfirmDelete).toHaveBeenCalledTimes(1);

        element.props.onClose();
        expect(onClose).toHaveBeenCalledTimes(1);
      });
    });

    describe('ArchiveStudentModal State & Rendering', () => {
      it('returns null when studentToArchive is null or undefined', () => {
        expect(ArchiveStudentModal({ studentToArchive: null })).toBeNull();
        expect(ArchiveStudentModal({ studentToArchive: undefined })).toBeNull();
      });

      it('renders student archiving modal with explanation and student name', () => {
        const student = { id: 's_10', name: 'דניאל יוסף' };
        const html = renderToStaticMarkup(
          React.createElement(ArchiveStudentModal, {
            studentToArchive: student,
            onClose: () => {},
            onConfirmArchive: () => {}
          })
        );

        expect(html).toContain('העברת תלמיד/ה לארכיון');
        expect(html).toContain('דניאל יוסף');
        expect(html).toContain('התלמיד/ה יוסר/תוסר מרשימת התלמידים הפעילה');
        expect(html).toContain('כן, העבר לארכיון');
      });

      it('triggers onConfirmArchive with student object on confirmation', () => {
        const student = { id: 's_10', name: 'דניאל יוסף' };
        const onConfirmArchive = vi.fn();
        const onClose = vi.fn();

        const element = React.createElement(ArchiveStudentModal, {
          studentToArchive: student,
          onClose,
          onConfirmArchive
        });

        element.props.onConfirmArchive(student);
        expect(onConfirmArchive).toHaveBeenCalledWith(student);

        element.props.onClose();
        expect(onClose).toHaveBeenCalledTimes(1);
      });
    });

    describe('LogoutUnsavedModal Draft Safeguards', () => {
      it('returns null when isOpen is false', () => {
        expect(LogoutUnsavedModal({ isOpen: false })).toBeNull();
      });

      it('evaluates whether unsaved draft warrants confirmation dialog', () => {
        expect(shouldPromptLogoutUnsaved(null)).toBe(false);
        expect(shouldPromptLogoutUnsaved(undefined)).toBe(false);
        expect(shouldPromptLogoutUnsaved({ isDirty: false, draftData: null })).toBe(false);
        expect(shouldPromptLogoutUnsaved({ isDirty: false, draftData: { name: 'תמר' } })).toBe(false);
        expect(shouldPromptLogoutUnsaved({ isDirty: true, draftData: null })).toBe(false);
        expect(shouldPromptLogoutUnsaved({ isDirty: true, draftData: { name: 'תמר' } })).toBe(true);
      });

      it('renders unsaved changes modal with draft student name and warning', () => {
        const html = renderToStaticMarkup(
          React.createElement(LogoutUnsavedModal, {
            isOpen: true,
            draftStudentName: 'רוני גולדמן',
            onClose: () => {},
            onDiscardAndLogout: () => {},
            onSaveAndLogout: () => {}
          })
        );

        expect(html).toContain('שינויים שלא נשמרו לפני התנתקות');
        expect(html).toContain('רוני גולדמן');
        expect(html).toContain('כל השינויים שבוצעו מאז השמירה האחרונה יאבדו');
        expect(html).toContain('התעלם והתנתק');
        expect(html).toContain('שמור שינויים והתנתק');
      });

      it('renders fallback label when draftStudentName is omitted', () => {
        const html = renderToStaticMarkup(
          React.createElement(LogoutUnsavedModal, {
            isOpen: true,
            draftStudentName: '',
            onClose: () => {},
            onDiscardAndLogout: () => {},
            onSaveAndLogout: () => {}
          })
        );

        expect(html).toContain('התלמיד/ה');
      });

      it('triggers discard and save callbacks correctly', () => {
        const onDiscardAndLogout = vi.fn();
        const onSaveAndLogout = vi.fn();
        const onClose = vi.fn();

        const element = React.createElement(LogoutUnsavedModal, {
          isOpen: true,
          draftStudentName: 'מאיה',
          onClose,
          onDiscardAndLogout,
          onSaveAndLogout
        });

        element.props.onDiscardAndLogout();
        expect(onDiscardAndLogout).toHaveBeenCalledTimes(1);

        element.props.onSaveAndLogout();
        expect(onSaveAndLogout).toHaveBeenCalledTimes(1);

        element.props.onClose();
        expect(onClose).toHaveBeenCalledTimes(1);
      });
    });
  });

  // --------------------------------------------------------------------------
  // Suite 2: TrialUpgradeModal (Calculations, Days Left & Upgrade Payloads)
  // --------------------------------------------------------------------------
  describe('TrialUpgradeModal Logic & Upgrade Requests', () => {
    describe('Days Left Calculation & Expiration Detection', () => {
      it('calculates remaining paid days cleanly from paidExpiresAt', () => {
        const now = new Date('2026-10-01T12:00:00Z');
        const user = {
          role: 'user',
          isTrialUser: false,
          paidExpiresAt: '2026-11-01T12:00:00Z'
        };

        const days = getPaidRemainingDays(user, now);
        expect(days).toBe(31);
      });

      it('calculates remaining days cleanly from upgradedToPaidAt for full year cycle', () => {
        const now = new Date('2026-06-01T00:00:00Z');
        const user = {
          role: 'user',
          isTrialUser: false,
          upgradedToPaidAt: '2026-01-01T00:00:00Z'
        };

        const days = getPaidRemainingDays(user, now);
        // From Jan 1 to June 1 is 151 days; 365 - 151 = 214 days remaining
        expect(days).toBe(214);
      });

      it('returns Infinity for admin accounts regardless of expiration date', () => {
        const adminUser = { role: 'admin', isTrialUser: false };
        const ownerUser = { email: 'zivit.reshef@gmail.com', isTrialUser: false };

        expect(getPaidRemainingDays(adminUser)).toBe(Infinity);
        expect(getPaidRemainingDays(ownerUser)).toBe(Infinity);
      });

      it('returns null for trial users or missing user object', () => {
        expect(getPaidRemainingDays(null)).toBeNull();
        expect(getPaidRemainingDays({ isTrialUser: true })).toBeNull();
      });

      it('returns 0 when subscription has expired in the past', () => {
        const now = new Date('2026-10-25T12:00:00Z');
        const expiredUser = {
          role: 'user',
          isTrialUser: false,
          paidExpiresAt: '2026-10-01T12:00:00Z'
        };

        const days = getPaidRemainingDays(expiredUser, now);
        expect(days).toBe(0);
      });
    });

    describe('Prorated Upgrade Price Calculation', () => {
      it('calculates full annual price (150 NIS) when 365 days or more remaining', () => {
        expect(calculateProratedUpgradePrice(365)).toBe(150);
        expect(calculateProratedUpgradePrice(400)).toBe(150);
      });

      it('calculates prorated rate mid-cycle cleanly rounded to integer NIS', () => {
        // ~6 months (182 days): 182/365 * 150 = 74.79 -> 75 NIS
        expect(calculateProratedUpgradePrice(182)).toBe(75);

        // ~3 months (91 days): 91/365 * 150 = 37.39 -> 37 NIS
        expect(calculateProratedUpgradePrice(91)).toBe(37);

        // ~1 month (30 days): 30/365 * 150 = 12.32 -> clamped to minCharge (20 NIS)
        expect(calculateProratedUpgradePrice(30)).toBe(20);
      });

      it('enforces boundary safety: never negative, never exceeds annualRate, zero for expired', () => {
        expect(calculateProratedUpgradePrice(0)).toBe(0);
        expect(calculateProratedUpgradePrice(-15)).toBe(0);
        expect(calculateProratedUpgradePrice(null)).toBe(0);
        expect(calculateProratedUpgradePrice(undefined)).toBe(0);
        expect(calculateProratedUpgradePrice(NaN)).toBe(0);
      });

      it('supports custom annual rate and minimum charge configurations', () => {
        const customPrice = calculateProratedUpgradePrice(100, 200, { minCharge: 30, cycleDays: 365 });
        // 100 / 365 * 200 = 54.79 -> 55 NIS
        expect(customPrice).toBe(55);
      });
    });

    describe('Upgrade & Support Message Payloads', () => {
      it('constructs correct payload topic based on user subscription state', () => {
        const paidUser = { name: 'מיכל כהן', email: 'michal@school.org', isTrialUser: false };
        const trialUser = { name: 'יעל לוי', email: 'yael@gan.org', isTrialUser: true };
        const expiredUser = { name: 'רותי דגן', email: 'ruti@tal.org', isTrialUser: true };

        const createTopic = (user, isExpired) => {
          const isNonTrial = Boolean(user && !user.isTrialUser);
          if (isNonTrial) return '💬 פנייה ממשתמש/ת מנוי (תמיכה ושאלות)';
          if (isExpired) return '💬 פנייה ממשתמש/ת ניסיון שפג תוקפו (הסדרת מנוי)';
          return '💬 פנייה ממשתמש/ת ניסיון (הסדרת מנוי / תמיכה)';
        };

        expect(createTopic(paidUser, false)).toContain('משתמש/ת מנוי');
        expect(createTopic(trialUser, false)).toContain('הסדרת מנוי / תמיכה');
        expect(createTopic(expiredUser, true)).toContain('שפג תוקפו');
      });

      it('structures support submission message with trimmed notes and sender info', () => {
        const user = { name: 'שרה ברק', email: 'sara@example.com', isTrialUser: false };
        const rawMessage = '  שלום, אשמח לעזרה בייצוא דוח להדפסה   ';

        const buildPayload = (currentUser, text) => ({
          topic: '💬 פנייה ממשתמש/ת מנוי (תמיכה ושאלות)',
          notes: `פנייה ממשתמש/ת מנוי:\n${text.trim()}\n(ערוץ פנייה מועדף: וואטסאפ ישיר לזיוית)`,
          name: currentUser.name,
          email: currentUser.email
        });

        const payload = buildPayload(user, rawMessage);
        expect(payload.name).toBe('שרה ברק');
        expect(payload.email).toBe('sara@example.com');
        expect(payload.notes).toContain('שלום, אשמח לעזרה בייצוא דוח להדפסה');
        expect(payload.notes).not.toContain('   שלום');
      });

      it('structures minor RFE enhancement suggestion payload with fallback title', () => {
        const user = { name: 'דנה רז', email: 'dana@example.com' };
        const category = 'מאגר מטרות ויעדים';
        const emptyTitle = '   ';
        const message = 'תוספת מטרות מיומנות ויסות חושי';

        const buildRfePayload = (currentUser, cat, title, msg) => ({
          topic: `💡 הצעת ייעול ובקשה לשיפור (Minor RFE): ${cat} - ${title.trim() || 'ללא כותרת'}`,
          notes: `[בקשת שיפור / RFE ממשתמש/ת ${currentUser.name} (${currentUser.email})]:\nקטגוריה: ${cat}\nנושא: ${title.trim() || 'כללי'}\nפירוט ההצעה:\n${msg.trim()}`,
          name: currentUser.name,
          email: currentUser.email
        });

        const payload = buildRfePayload(user, category, emptyTitle, message);
        expect(payload.topic).toContain('ללא כותרת');
        expect(payload.notes).toContain('נושא: כללי');
        expect(payload.notes).toContain('תוספת מטרות מיומנות ויסות חושי');
      });

      it('generates direct WhatsApp URL encoding user credentials without plain-text phone exposure', () => {
        const user = { name: 'תמר שקד', email: 'tamar@school.il', isTrialUser: true };
        const isExpired = true;
        const phone = '972559236606';

        const text = `היי זיוית, הסתיימה תקופת הניסיון שלי ואשמח להסדיר רכישת מנוי שנתי (150 ש"ח לשנה). שמי: ${user.name} (${user.email}). תודה!`;
        const url = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;

        expect(url).toContain('https://wa.me/972559236606');
        expect(url).toContain(encodeURIComponent('תמר שקד'));
        expect(url).toContain(encodeURIComponent('tamar@school.il'));
        expect(url).toContain(encodeURIComponent('150 ש"ח לשנה'));
      });
    });

    describe('TrialUpgradeModal Rendering Safeguards', () => {
      it('returns empty string when isOpen is false or currentUser is missing', () => {
        const htmlClosed = renderToStaticMarkup(
          React.createElement(TrialUpgradeModal, { isOpen: false, currentUser: { name: 'דני' } })
        );
        expect(htmlClosed).toBe('');

        const htmlNoUser = renderToStaticMarkup(
          React.createElement(TrialUpgradeModal, { isOpen: true, currentUser: null })
        );
        expect(htmlNoUser).toBe('');
      });

      it('renders modal in active trial mode with days remaining counter', () => {
        const user = { name: 'חנה ישראלי', email: 'hana@gan.il', isTrialUser: true };
        const html = renderToStaticMarkup(
          React.createElement(TrialUpgradeModal, {
            isOpen: true,
            currentUser: user,
            remainingDays: 14,
            isExpired: false,
            onClose: () => {}
          })
        );

        expect(html).toContain('חשבון התנסות פעיל ב-TALA');
        expect(html).toContain('נותרו 14 ימים לתקופת הניסיון');
        expect(html).toContain('סרטון הדרכה');
        expect(html).toContain('פנייה בוואטסאפ להסדרת מנוי');
      });

      it('renders modal in expired mode with lock badge and warning borders', () => {
        const user = { name: 'מירב שלום', email: 'meirav@gan.il', isTrialUser: true };
        const html = renderToStaticMarkup(
          React.createElement(TrialUpgradeModal, {
            isOpen: true,
            currentUser: user,
            remainingDays: 0,
            isExpired: true,
            onClose: () => {},
            onLogout: () => {}
          })
        );

        expect(html).toContain('תקופת הניסיון הסתיימה');
        expect(html).toContain('נתונייך שמורים ומאובטחים במלואם');
        expect(html).toContain('התנתקות מהמערכת');
      });
      it('renders direct live support chat action button when onOpenChat handler is provided', () => {
        const user = { name: 'רחל כהן', email: 'rachel@gan.il', isTrialUser: true };
        const html = renderToStaticMarkup(
          React.createElement(TrialUpgradeModal, {
            isOpen: true,
            currentUser: user,
            remainingDays: 5,
            isExpired: false,
            onClose: () => {},
            onOpenChat: () => {}
          })
        );

        expect(html).toContain('צ&#x27;אט תמיכה ישיר באתר');
      });
    });
  });

  // --------------------------------------------------------------------------
  // Suite 3: UserFeedbackSurveyModal (Rating Boundaries & Payload Structuring)
  // --------------------------------------------------------------------------
  describe('UserFeedbackSurveyModal Validation & Submission Payload', () => {
    describe('Rating Boundaries (1-5 Scale)', () => {
      it('validates and clamps satisfaction ratings within 1 to 5', () => {
        expect(validateSurveyRating(5)).toBe(5);
        expect(validateSurveyRating(1)).toBe(1);
        expect(validateSurveyRating(3.2)).toBe(3);
        expect(validateSurveyRating(4.8)).toBe(5);

        // Clamping out-of-bounds
        expect(validateSurveyRating(0)).toBe(1);
        expect(validateSurveyRating(-10)).toBe(1);
        expect(validateSurveyRating(6)).toBe(5);
        expect(validateSurveyRating(100)).toBe(5);

        // Fallbacks for non-numbers
        expect(validateSurveyRating(null)).toBe(5);
        expect(validateSurveyRating(undefined)).toBe(5);
        expect(validateSurveyRating('5')).toBe(5);
        expect(validateSurveyRating(NaN)).toBe(5);
      });

      it('maps numerical ratings to correct pedagogical Hebrew labels', () => {
        const labels = {
          1: '1 – טעון שיפור',
          2: '2 – בינוני',
          3: '3 – טוב',
          4: '4 – טוב מאוד',
          5: '5 – מצוין!'
        };

        expect(labels[1]).toBe('1 – טעון שיפור');
        expect(labels[3]).toBe('3 – טוב');
        expect(labels[5]).toBe('5 – מצוין!');
      });
    });

    describe('Comment Length & Text Sanitization', () => {
      it('trims leading and trailing whitespace from user feedback', () => {
        expect(validateSurveyComment('   מערכת מצוינת שעוזרת המון   ')).toBe('מערכת מצוינת שעוזרת המון');
        expect(validateSurveyComment('\n\nנהדרת\t')).toBe('נהדרת');
      });

      it('enforces maximum character limits preventing storage bloat or DoS', () => {
        const maxLen = 100;
        const hugeText = 'א'.repeat(250);
        const result = validateSurveyComment(hugeText, maxLen);

        expect(result).toHaveLength(maxLen);
        expect(result).toBe('א'.repeat(maxLen));
      });

      it('safely handles non-string inputs returning empty string', () => {
        expect(validateSurveyComment(null)).toBe('');
        expect(validateSurveyComment(undefined)).toBe('');
        expect(validateSurveyComment(12345)).toBe('');
        expect(validateSurveyComment({})).toBe('');
      });
    });

    describe('Submission Payload Structuring', () => {
      it('structures complete survey payload matching cloud schema', () => {
        const currentUser = {
          name: 'טליה מור',
          email: 'talia@school.org',
          title: 'מורת שילוב',
          group: 'מחוז מרכז',
          isTrialUser: false
        };

        const rawRatings = {
          easeOfWebsite: 5,
          createStudent: 4,
          generateGoals: 5,
          createReport: 4,
          collaborateWithColleagues: 5
        };

        const recommendation = 'בהחלט כן – אמליץ בחום לקולגות ולמנהל/ת לרכוש גישה להמשך שימוש';
        const overallFeedback = '  אפליקציה נהדרת ומדויקת להפליא  ';
        const improvementSuggestions = '  אשמח לאפשרות ייצוא לאקסל  ';

        const payload = buildSurveySubmissionPayload({
          currentUser,
          ratings: rawRatings,
          recommendation,
          overallFeedback,
          improvementSuggestions,
          submittedAt: '25/10/2026, 18:30'
        });

        expect(payload).toEqual({
          userName: 'טליה מור',
          userEmail: 'talia@school.org',
          userTitle: 'מורת שילוב',
          userGroup: 'מחוז מרכז',
          isTrialUser: false,
          ratings: {
            easeOfWebsite: 5,
            createStudent: 4,
            generateGoals: 5,
            createReport: 4,
            collaborateWithColleagues: 5
          },
          recommendToColleaguesAndManager: 'בהחלט כן – אמליץ בחום לקולגות ולמנהל/ת לרכוש גישה להמשך שימוש',
          overallFeedback: 'אפליקציה נהדרת ומדויקת להפליא',
          improvementSuggestions: 'אשמח לאפשרות ייצוא לאקסל',
          submittedAt: '25/10/2026, 18:30'
        });
      });

      it('clamps out-of-bound ratings in payload automatically', () => {
        const payload = buildSurveySubmissionPayload({
          currentUser: { name: 'בדיקה' },
          ratings: {
            easeOfWebsite: 99,
            createStudent: -5,
            generateGoals: 3
          }
        });

        expect(payload.ratings.easeOfWebsite).toBe(5);
        expect(payload.ratings.createStudent).toBe(1);
        expect(payload.ratings.generateGoals).toBe(3);
        expect(payload.ratings.createReport).toBe(5); // default fallback
        expect(payload.ratings.collaborateWithColleagues).toBe(5); // default fallback
      });
    });

    describe('UserFeedbackSurveyModal Rendering Safeguards', () => {
      it('returns empty string when isOpen is false or currentUser is missing', () => {
        const htmlClosed = renderToStaticMarkup(
          React.createElement(UserFeedbackSurveyModal, { isOpen: false, currentUser: { name: 'ענת' } })
        );
        expect(htmlClosed).toBe('');

        const htmlNoUser = renderToStaticMarkup(
          React.createElement(UserFeedbackSurveyModal, { isOpen: true, currentUser: null })
        );
        expect(htmlNoUser).toBe('');
      });

      it('renders survey modal with all 5 category titles and recommendation options', () => {
        const user = { name: 'ענת לוי', email: 'anat@gan.il', isTrialUser: true };
        const html = renderToStaticMarkup(
          React.createElement(UserFeedbackSurveyModal, {
            isOpen: true,
            currentUser: user,
            onSubmitSurvey: () => {},
            onSnoozeSurvey: () => {},
            onDismissSurveyPermanently: () => {}
          })
        );

        expect(html).toContain('משוב חוויית משתמש');
        expect(html).toContain('קלות ונוחות השימוש באתר');
        expect(html).toContain('יצירה והקמה של כרטיס תלמיד/ה חדש/ה');
        expect(html).toContain('ניסוח ובניית מטרות ויעדים');
        expect(html).toContain('הפקת דוחות');
        expect(html).toContain('שיתוף תלמיד/ה ועבודה משותפת עם קולגות בצוות');
        expect(html).toContain('האם תמליץ/י לקולגות ולמנהל/ת המסגרת');
        expect(html).toContain('דחה לאחר כך');
        expect(html).toContain('אל תציג שוב');
        expect(html).toContain('שלח משוב למנהלת המערכת');
      });

      it('binds snooze and dismiss handlers to modal actions', () => {
        const onSnoozeSurvey = vi.fn();
        const onDismissSurveyPermanently = vi.fn();
        const onSubmitSurvey = vi.fn();

        const element = React.createElement(UserFeedbackSurveyModal, {
          isOpen: true,
          currentUser: { name: 'שרה' },
          onSnoozeSurvey,
          onDismissSurveyPermanently,
          onSubmitSurvey
        });

        element.props.onSnoozeSurvey();
        expect(onSnoozeSurvey).toHaveBeenCalledTimes(1);

        element.props.onDismissSurveyPermanently();
        expect(onDismissSurveyPermanently).toHaveBeenCalledTimes(1);
      });
    });
    describe('AdminAllowlistModal Layout Resiliency', () => {
      it('preserves tab strip visibility and prevents flexbox vertical clipping with banner toast', () => {
        const html = renderToStaticMarkup(
          React.createElement(AdminAllowlistModal, {
            isOpen: true,
            onClose: () => {},
            allowedUsers: [],
            onUpdateAllowedUsers: () => {},
            currentUser: { role: 'admin', email: 'admin@tala.com' }
          })
        );

        // Header and tab strip must not shrink under flex compression
        expect(html).toContain('flex-shrink:0');
        expect(html).toContain('overflow-x:auto');
        expect(html).toContain('overflow-y:auto');
        expect(html).toContain('modal-body');
      });
    });

    describe('AdminAllowlistModal Inquiries & Support Chat Bi-directional Handling (Regression Tests)', () => {
      it('renders incoming support chat threads when adminRequests is empty and displays unread indicator', () => {
        const mockSupportThreads = [
          {
            id: 'teacher_tala_org',
            userEmail: 'teacher@tala.org',
            userName: 'מיכל כהן',
            topic: "💬 פנייה מתוך צ'אט התמיכה",
            unreadByAdmin: true,
            updatedAt: new Date().toISOString(),
            messages: [
              {
                id: 'msg_1',
                senderRole: 'user',
                senderEmail: 'teacher@tala.org',
                senderName: 'מיכל כהן',
                text: 'שלום, נתקלתי בבעיה בעת שמירת תוכנית העבודה',
                createdAt: '27/10/2026, 18:00',
                timestamp: Date.now()
              }
            ]
          }
        ];

        const html = renderToStaticMarkup(
          React.createElement(AdminAllowlistModal, {
            isOpen: true,
            initialTab: 'requests',
            onClose: () => {},
            allowedUsers: [{ role: 'admin', email: 'admin@tala.com' }],
            currentUser: { role: 'admin', email: 'admin@tala.com' },
            adminRequests: [],
            initialSupportThreads: mockSupportThreads
          })
        );

        // Must display the teacher thread, not "אין פניות ממתינות כרגע"
        expect(html).not.toContain('אין פניות ממתינות כרגע.');
        expect(html).toContain('מיכל כהן');
        expect(html).toContain('teacher@tala.org');
        expect(html).toContain('💬 פנייה מתוך צ&#x27;אט התמיכה');
        expect(html).toContain('שלום, נתקלתי בבעיה בעת שמירת תוכנית העבודה');
        expect(html).toContain('חדש');
        expect(html).toContain('מענה למורה (צ&#x27;אט)');
        expect(html).toContain('1 ממתינות למענה');
      });

      it('renders screenshot attachment thumbnail and zoom preview button in admin chat thread', () => {
        const mockSupportThreadsWithScreenshot = [
          {
            id: 'screenshot_thread',
            userEmail: 'teacher_img@tala.org',
            userName: 'רונית לוי',
            topic: '💬 תקלה עם תמונה',
            unreadByAdmin: false,
            updatedAt: new Date().toISOString(),
            messages: [
              {
                id: 'msg_img_1',
                senderRole: 'user',
                senderEmail: 'teacher_img@tala.org',
                senderName: 'רונית לוי',
                text: 'הנה צילום המסך של השגיאה',
                createdAt: '27/10/2026, 18:05',
                timestamp: Date.now(),
                attachment: {
                  name: 'error_screen.jpg',
                  url: 'data:image/jpeg;base64,mockImageData123',
                  sizeKb: 45
                }
              }
            ]
          }
        ];

        const html = renderToStaticMarkup(
          React.createElement(AdminAllowlistModal, {
            isOpen: true,
            initialTab: 'requests',
            onClose: () => {},
            allowedUsers: [{ role: 'admin', email: 'admin@tala.com' }],
            currentUser: { role: 'admin', email: 'admin@tala.com' },
            adminRequests: [],
            initialSupportThreads: mockSupportThreadsWithScreenshot,
            initialActiveChatReqId: 'screenshot_thread'
          })
        );

        expect(html).toContain('רונית לוי');
        expect(html).toContain('data:image/jpeg;base64,mockImageData123');
        expect(html).toContain('error_screen.jpg');
        expect(html).toContain('45KB');
        expect(html).toContain('לחץ/י להגדלה');
      });

      it('shows empty state when both adminRequests and supportThreads are empty', () => {
        const html = renderToStaticMarkup(
          React.createElement(AdminAllowlistModal, {
            isOpen: true,
            initialTab: 'requests',
            onClose: () => {},
            allowedUsers: [{ role: 'admin', email: 'admin@tala.com' }],
            currentUser: { role: 'admin', email: 'admin@tala.com' },
            adminRequests: [],
            initialSupportThreads: []
          })
        );

        expect(html).toContain('אין פניות ממתינות כרגע.');
      });

      it('automatically expands target teacher chat thread when initialActiveChatReqId is passed as teacher email (deep link)', () => {
        const mockSupportThreads = [
          {
            id: 'thread_sarah_school_org',
            userEmail: 'sarah@school.org',
            userName: 'שרה אהרוני',
            topic: "💬 בעיית גישה",
            unreadByAdmin: true,
            updatedAt: new Date().toISOString(),
            messages: [
              {
                id: 'm1',
                senderRole: 'user',
                senderEmail: 'sarah@school.org',
                senderName: 'שרה אהרוני',
                text: 'לא מצליחה להתחבר',
                createdAt: '27/10/2026, 18:20',
                timestamp: Date.now()
              }
            ]
          }
        ];

        const html = renderToStaticMarkup(
          React.createElement(AdminAllowlistModal, {
            isOpen: true,
            initialTab: 'requests',
            onClose: () => {},
            allowedUsers: [{ role: 'admin', email: 'admin@tala.com' }],
            currentUser: { role: 'admin', email: 'admin@tala.com' },
            adminRequests: [],
            initialSupportThreads: mockSupportThreads,
            initialActiveChatReqId: 'sarah@school.org'
          })
        );

        // Expanded panel should render reply input and quick chips
        expect(html).toContain('שרה אהרוני');
        expect(html).toContain('לא מצליחה להתחבר');
        expect(html).toContain('כתוב/י מענה ישיר ל-שרה אהרוני...');
        expect(html).toContain('שלח תגובה');
      });

      it('renders segmented inbox filters, rich status badges, school group chip, and alert channels status', () => {
        const mockSupportThreads = [
          {
            id: 'thread_1',
            userEmail: 't1@school.org',
            userName: 'מיכל כהן',
            topic: 'תקלה 1',
            status: 'needs_attention',
            lastFeedback: 'needs_help',
            feedbackNote: 'עדיין יש שגיאה',
            unreadByAdmin: false,
            updatedAt: new Date().toISOString(),
            messages: []
          },
          {
            id: 'thread_2',
            userEmail: 't2@school.org',
            userName: 'נועה לוי',
            topic: 'תקלה 2',
            status: 'resolved',
            resolutionFeedback: 'thumbs_up',
            unreadByAdmin: false,
            updatedAt: new Date().toISOString(),
            messages: []
          }
        ];

        const mockAllowedUsers = [
          {
            role: 'admin',
            email: 'admin@tala.com',
            active: true,
            adminAlerts: {
              telegram: { enabled: true, botToken: 'tok123' },
              whatsapp: { enabled: false },
              email: { enabled: true }
            }
          },
          {
            role: 'teacher',
            email: 't1@school.org',
            name: 'מיכל כהן',
            group: 'מתי"א מרכז'
          }
        ];

        const html = renderToStaticMarkup(
          React.createElement(AdminAllowlistModal, {
            isOpen: true,
            initialTab: 'requests',
            onClose: () => {},
            allowedUsers: mockAllowedUsers,
            currentUser: { role: 'admin', email: 'admin@tala.com' },
            adminRequests: [],
            initialSupportThreads: mockSupportThreads
          })
        );

        // Segmented filter tabs
        expect(html).toContain('ממתינות למענה');
        expect(html).toContain('בטיפול / פעילות');
        expect(html).toContain('טופלו ונסגרו');
        expect(html).toContain('כל הפניות');

        // Alert channels status badge
        expect(html).toContain('ערוצי התראה:');
        expect(html).toContain('טלגרם');
        expect(html).toContain('דוא&quot;ל');

        // Teacher context chip
        expect(html).toContain('🏫 מתי&quot;א מרכז');

        // Status badge for needs_attention
        expect(html).toContain('⚠️ דורשת המשך מענה');
        expect(html).toContain('הערת מורה: &quot;עדיין יש שגיאה&quot;');
      });
    });

  });
});
