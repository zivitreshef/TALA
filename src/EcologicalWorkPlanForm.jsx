import React, { useState, useEffect, useRef } from 'react';
import {
  Save,
  Printer,
  Sparkles,
  Plus,
  Trash2,
  Search,
  TrendingUp,
  HelpCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  BookOpen,
  Wand2,
  FileText,
  Check,
  ShieldAlert,
  Mail,
  Send,
  Download,
  Users,
  Calendar,
  X
} from 'lucide-react';
import {
  ENVIRONMENTS_LIST,
  SCHOOL_YEARS_LIST,
  getSortedGoalBank,
  generateDefaultQuestionsForCustomGoal,
  reverseEngineerRawTextLocally,
  adaptTextToGender,
  adaptGoalToGender,
  resolveStudentAgeAndDateInfo,
  normalizeAndSizeGoalDuration,
  isGoalEmpty,
  attachAiBaselineToGoal,
  isGoalProtectedFromAiOverwrite,
  mergeReanalyzedGoals,
  toHebrewAcronym,
  maskSensitiveValue,
  redactStudentNameInText,
  getNextSchoolYear,
  buildRolloverStudentForNextYear
} from './goalBankData';
import {
  GOOGLE_APPS_SCRIPT_TEMPLATE,
  loadEmailEngineConfig,
  isDirectEmailEngineConfigured,
  generatePdfBlobFromHtml,
  sendReportEmailInBackground
} from './emailService';

const extractYearReportFromFormData = (data) => ({
  date: data?.date || new Date().toLocaleDateString('he-IL'),
  planType: data?.planType || 'תל"א (תוכנית לימודים אישית)',
  teacherFreeText: data?.teacherFreeText || '',
  freeTextAnalyzed: Boolean(data?.freeTextAnalyzed),
  removedAiGoals: Array.isArray(data?.removedAiGoals) ? data.removedAiGoals : [],
  strengthsExisting: data?.strengthsExisting || '',
  strengthsToEmpower: data?.strengthsToEmpower || '',
  recommendations: data?.recommendations || '',
  evalReportFreeText: data?.evalReportFreeText || '',
  evalReportSummary: data?.evalReportSummary || '',
  lastSavedAt: data?.lastSavedAt || '',
  goals: (data?.goals || []).map((g) => adaptGoalToGender(g, data?.gender || 'boy'))
});

const isRawFreeTextAlreadyAnalyzed = (data) =>
  Boolean(
    data?.freeTextAnalyzed ||
      ((data?.teacherFreeText || '').trim() &&
        ((data?.strengthsExisting || '').trim() ||
          (data?.strengthsToEmpower || '').trim() ||
          (data?.goals || []).some((g) => (g?.title || '').trim())))
  );

const hasContentInYearReport = (rep) => {
  if (!rep) return false;
  return Boolean(
    (rep.teacherFreeText && rep.teacherFreeText.trim()) ||
      (rep.strengthsExisting && rep.strengthsExisting.trim()) ||
      (rep.strengthsToEmpower && rep.strengthsToEmpower.trim()) ||
      (rep.recommendations && rep.recommendations.trim()) ||
      (rep.evalReportFreeText && rep.evalReportFreeText.trim()) ||
      (rep.evalReportSummary && rep.evalReportSummary.trim()) ||
      (rep.goals || []).some(
        (g) => (g.title && g.title.trim()) || (g.objectives && g.objectives.trim())
      )
  );
};

export default function EcologicalWorkPlanForm({
  student,
  goalBank,
  geminiApiKey,
  isAdmin,
  currentUser,
  allowedUsers = [],
  onOpenGoalBankManager,
  onSaveStudentPlan,
  onUseOrAddGoalToBank,
  onDraftStateChange,
  emailEngineConfig,
  onUpdateEmailEngineConfig
}) {
  const containerRef = useRef(null);
  const evalReportSectionRef = useRef(null);

  const buildNormalizedStudentData = (st) => {
    const initialGender = st?.gender || 'boy';
    const currentYear = st?.schoolYear || 'תשפ"ו (2025-2026)';
    const normalizedGoals = (st?.goals || []).map((g) =>
      adaptGoalToGender(g, initialGender)
    );
    const existingReports = { ...(st?.reportsByYear || {}) };
    const initialRemovedAiGoals = Array.isArray(st?.removedAiGoals) ? st.removedAiGoals : [];
    existingReports[currentYear] = {
      date: st?.date || new Date().toLocaleDateString('he-IL'),
      planType: st?.planType || 'תל"א (תוכנית לימודים אישית)',
      teacherFreeText: st?.teacherFreeText || '',
      freeTextAnalyzed: Boolean(st?.freeTextAnalyzed),
      removedAiGoals: initialRemovedAiGoals,
      strengthsExisting: st?.strengthsExisting || '',
      strengthsToEmpower: st?.strengthsToEmpower || '',
      recommendations: st?.recommendations || '',
      evalReportFreeText: st?.evalReportFreeText || '',
      evalReportSummary: st?.evalReportSummary || '',
      lastSavedAt: st?.lastSavedAt || '',
      goals: normalizedGoals
    };

    return {
      ...st,
      schoolYear: currentYear,
      gender: initialGender,
      freeTextAnalyzed: Boolean(st?.freeTextAnalyzed),
      removedAiGoals: initialRemovedAiGoals,
      evalReportFreeText: st?.evalReportFreeText || '',
      evalReportSummary: st?.evalReportSummary || '',
      sharedWith: Array.isArray(st?.sharedWith) ? st.sharedWith : [],
      goals: normalizedGoals,
      reportsByYear: existingReports
    };
  };

  const [formData, setFormData] = useState(() => buildNormalizedStudentData(student));
  const savedSnapshotRef = useRef(JSON.stringify(buildNormalizedStudentData(student)));
  const [hideStudentDetailsOnPrint, setHideStudentDetailsOnPrint] = useState(true); // Default: checked!
  const [saveBanner, setSaveBanner] = useState(false);
  const [autoSavedTime, setAutoSavedTime] = useState('');
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [isReverseEngineering, setIsReverseEngineering] = useState(false);
  const [reverseEngineerBanner, setReverseEngineerBanner] = useState('');
  const [showFullDocPreview, setShowFullDocPreview] = useState(false);
  const [isFreeTextCollapsed, setIsFreeTextCollapsed] = useState(() =>
    isRawFreeTextAlreadyAnalyzed(student)
  );

  // State for Separate Mid-Year / End-of-Year Evaluation Report & AI Processing
  const [showEvalReportSection, setShowEvalReportSection] = useState(false);
  const [loadingEvalAiKey, setLoadingEvalAiKey] = useState(null);
  const [evalAiSuccessKey, setEvalAiSuccessKey] = useState(null);
  const [isProcessingFullEvalAi, setIsProcessingFullEvalAi] = useState(false);
  const [evalReportAiBanner, setEvalReportAiBanner] = useState('');
  const [emailReportMode, setEmailReportMode] = useState('tala'); // 'tala' | 'eval'

  // State for lightweight Team Sharing modal (Option C)
  const [showShareModal, setShowShareModal] = useState(false);
  const [showAllShareUsers, setShowAllShareUsers] = useState(false);

  // State for Collapsible Mid-Year / End-of-Year Evaluation per goal card (Option A)
  const [expandedEvalMap, setExpandedEvalMap] = useState({});

  // State for "Send to Email" (שלח למייל) modal
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailRecipient, setEmailRecipient] = useState('');
  const [emailFormat, setEmailFormat] = useState('docx'); // 'docx' | 'pdf'
  const [emailStatusMsg, setEmailStatusMsg] = useState('');
  const [emailError, setEmailError] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [showEngineSetupInModal, setShowEngineSetupInModal] = useState(false);
  const [localEngineDraft, setLocalEngineDraft] = useState(() =>
    emailEngineConfig || loadEmailEngineConfig()
  );
  const [copiedAppsScript, setCopiedAppsScript] = useState(false);

  // State for Goal Picker / Autocomplete per goal card
  const [openPickerGoalId, setOpenPickerGoalId] = useState(null);
  const [pickerEnvFilter, setPickerEnvFilter] = useState('הכל');
  const [pickerSearch, setPickerSearch] = useState('');
  const [expandedQuickObjMap, setExpandedQuickObjMap] = useState({});

  // State for AI Facilitating Questions per goal card
  const [activeAiGoalId, setActiveAiGoalId] = useState(null);
  const [aiQuestionsMap, setAiQuestionsMap] = useState({});
  const [aiAnswersMap, setAiAnswersMap] = useState({});
  const [loadingAiForGoalId, setLoadingAiForGoalId] = useState(null);

  // Sync when switching selected student from the sidebar list
  useEffect(() => {
    const normalized = buildNormalizedStudentData(student);
    savedSnapshotRef.current = JSON.stringify(normalized);
    setFormData(normalized);
    setIsFreeTextCollapsed(isRawFreeTextAlreadyAnalyzed(normalized));
    setOpenPickerGoalId(null);
    setActiveAiGoalId(null);
    setExpandedQuickObjMap({});
    setExpandedEvalMap({});
    setAutoSavedTime('');
    setEvalReportAiBanner('');
  }, [student?.id]);

  // Report whether current formData has unsaved changes & perform quiet debounced Auto-Save (Option E)
  useEffect(() => {
    const activeYear = formData.schoolYear || 'תשפ"ו (2025-2026)';
    const syncedDraft = {
      ...formData,
      reportsByYear: {
        ...(formData.reportsByYear || {}),
        [activeYear]: extractYearReportFromFormData(formData)
      }
    };
    const isDirty = JSON.stringify(syncedDraft) !== savedSnapshotRef.current;
    if (onDraftStateChange) {
      onDraftStateChange({
        isDirty,
        draftData: syncedDraft
      });
    }

    if (!isDirty) return;

    const autoSaveTimer = setTimeout(() => {
      const nowTime = new Date().toLocaleTimeString('he-IL', {
        hour: '2-digit',
        minute: '2-digit'
      });
      const updatedWithTime = {
        ...formData,
        lastSavedAt: nowTime
      };
      const updated = {
        ...updatedWithTime,
        reportsByYear: {
          ...(formData.reportsByYear || {}),
          [activeYear]: extractYearReportFromFormData(updatedWithTime)
        }
      };
      savedSnapshotRef.current = JSON.stringify(updated);
      setFormData(updated);
      onSaveStudentPlan(updated);
      setAutoSavedTime(nowTime);
      if (onDraftStateChange) {
        onDraftStateChange({ isDirty: false, draftData: updated });
      }
    }, 2500);

    return () => clearTimeout(autoSaveTimer);
  }, [formData, onDraftStateChange, onSaveStudentPlan]);

  // Automatically expand all textareas to their full scrollHeight so NO scrollbar ever appears
  useEffect(() => {
    const resizeAllTextareas = () => {
      if (!containerRef.current) return;
      const allTextareas = containerRef.current.querySelectorAll('textarea');
      allTextareas.forEach((ta) => {
        ta.style.overflowY = 'hidden';
        ta.style.height = 'auto';
        const isGoalTableCell = Boolean(ta.closest('.ecological-6col-table'));
        const minH = isGoalTableCell ? 175 : 88;
        ta.style.height = `${Math.max(ta.scrollHeight + 10, minH)}px`;
      });
    };

    resizeAllTextareas();
    const timer = setTimeout(resizeAllTextareas, 40);
    window.addEventListener('resize', resizeAllTextareas);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', resizeAllTextareas);
    };
  }, [formData, openPickerGoalId, activeAiGoalId, showFullDocPreview, expandedEvalMap, showEvalReportSection, isFreeTextCollapsed]);

  // Sorted goal bank (most common first, lowest rated at the bottom)
  const sortedGoals = getSortedGoalBank(goalBank);
  const currentGender = formData.gender || 'boy';

  // Rollover current student's plan into the next school year (Option D)
  const handleRolloverToNextYear = (targetYearOverride = null) => {
    const currentYear = formData.schoolYear || 'תשפ"ו (2025-2026)';
    const nextYear = targetYearOverride || getNextSchoolYear(currentYear);
    if (
      !window.confirm(
        `האם לפתוח תכנית המשך לשנת הלימודים ${nextYear} על בסיס התכנית של ${currentYear}? מוקדי הכוח והמטרות יועתקו ברצף פדגוגי לשנה החדשה.`
      )
    ) {
      return;
    }
    const syncedCurrent = {
      ...formData,
      reportsByYear: {
        ...(formData.reportsByYear || {}),
        [currentYear]: extractYearReportFromFormData(formData)
      }
    };
    const rolled = buildRolloverStudentForNextYear(syncedCurrent, currentYear, nextYear);
    savedSnapshotRef.current = JSON.stringify(rolled);
    setFormData(rolled);
    onSaveStudentPlan(rolled);
    setSaveBanner(true);
    setTimeout(() => setSaveBanner(false), 2500);
  };

  // Toggle sharing this student with a colleague email (Option C)
  const handleToggleShareColleague = (colleagueEmail) => {
    const cleanEmail = String(colleagueEmail || '').trim().toLowerCase();
    if (!cleanEmail) return;
    const currentShared = Array.isArray(formData.sharedWith) ? formData.sharedWith : [];
    const exists = currentShared.some((em) => String(em || '').toLowerCase() === cleanEmail);
    const nextShared = exists
      ? currentShared.filter((em) => String(em || '').toLowerCase() !== cleanEmail)
      : [...currentShared, cleanEmail];

    const activeYear = formData.schoolYear || 'תשפ"ו (2025-2026)';
    const updated = {
      ...formData,
      sharedWith: nextShared,
      reportsByYear: {
        ...(formData.reportsByYear || {}),
        [activeYear]: extractYearReportFromFormData(formData)
      }
    };
    savedSnapshotRef.current = JSON.stringify(updated);
    setFormData(updated);
    onSaveStudentPlan(updated);
  };

  // Switch school year: snapshot current year's report and load (or create) the selected year's report
  const handleSchoolYearChange = (newYear) => {
    setFormData((prev) => {
      const currentYear = prev.schoolYear || 'תשפ"ו (2025-2026)';
      if (newYear === currentYear) return prev;

      const updatedReportsByYear = {
        ...(prev.reportsByYear || {}),
        [currentYear]: extractYearReportFromFormData(prev)
      };

      const existingTargetReport = updatedReportsByYear[newYear];
      const genderToUse = prev.gender || 'boy';

      if (existingTargetReport) {
        const nextData = {
          ...prev,
          schoolYear: newYear,
          date: existingTargetReport.date || new Date().toLocaleDateString('he-IL'),
          planType: existingTargetReport.planType || prev.planType || 'תל"א (תוכנית לימודים אישית)',
          teacherFreeText: existingTargetReport.teacherFreeText || '',
          freeTextAnalyzed: Boolean(existingTargetReport.freeTextAnalyzed),
          removedAiGoals: Array.isArray(existingTargetReport.removedAiGoals)
            ? existingTargetReport.removedAiGoals
            : [],
          strengthsExisting: existingTargetReport.strengthsExisting || '',
          strengthsToEmpower: existingTargetReport.strengthsToEmpower || '',
          recommendations: existingTargetReport.recommendations || '',
          evalReportFreeText: existingTargetReport.evalReportFreeText || '',
          evalReportSummary: existingTargetReport.evalReportSummary || '',
          lastSavedAt: existingTargetReport.lastSavedAt || '',
          goals: (existingTargetReport.goals || []).map((g) =>
            adaptGoalToGender(g, genderToUse)
          ),
          reportsByYear: updatedReportsByYear
        };
        setIsFreeTextCollapsed(isRawFreeTextAlreadyAnalyzed(nextData));
        return nextData;
      }

      const freshGoal = {
        id: 'g_init_' + Date.now(),
        environment: ENVIRONMENTS_LIST[0],
        activityParticipation: '',
        title: '',
        objectives: '',
        opportunities: '',
        partners: 'צוות הגן, סייעת אישית',
        duration: '',
        evaluationCriteria: ''
      };

      const freshReport = {
        date: new Date().toLocaleDateString('he-IL'),
        planType: prev.planType || 'תל"א (תוכנית לימודים אישית)',
        teacherFreeText: '',
        freeTextAnalyzed: false,
        removedAiGoals: [],
        strengthsExisting: '',
        strengthsToEmpower: '',
        recommendations: '',
        evalReportFreeText: '',
        evalReportSummary: '',
        lastSavedAt: '',
        goals: [freshGoal]
      };

      setIsFreeTextCollapsed(false);
      return {
        ...prev,
        schoolYear: newYear,
        ...freshReport,
        reportsByYear: {
          ...updatedReportsByYear,
          [newYear]: freshReport
        }
      };
    });
    setOpenPickerGoalId(null);
    setActiveAiGoalId(null);
  };

  // Update personal or top-level field
  const handleFieldChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value
    }));
  };

  // Update student gender ('boy' = בן / זכר, 'girl' = בת / נקבה) and automatically inflect all goals & objectives
  const handleGenderChange = (newGender) => {
    setFormData((prev) => ({
      ...prev,
      gender: newGender,
      goals: (prev.goals || []).map((g) => adaptGoalToGender(g, newGender))
    }));
  };

  // Update specific goal row (marks goal as teacher-modified so re-analysis won't overwrite it)
  const handleGoalChange = (goalId, field, value) => {
    setFormData((prev) => ({
      ...prev,
      goals: (prev.goals || []).map((g) =>
        g.id === goalId ? { ...g, [field]: value, isTeacherModified: true } : g
      )
    }));
  };

  // Toggle whether a specific goal is locked against AI re-analysis
  const handleToggleGoalLock = (goalId) => {
    setFormData((prev) => ({
      ...prev,
      goals: (prev.goals || []).map((g) => {
        if (g.id !== goalId) return g;
        const currentlyLocked = isGoalProtectedFromAiOverwrite(g);
        if (currentlyLocked) {
          return attachAiBaselineToGoal(g);
        }
        return { ...g, isTeacherModified: true };
      })
    }));
  };

  // Add a new empty goal block and open the smart Goal Picker immediately
  const handleAddGoalRow = () => {
    const newId = 'g_row_' + Date.now();
    const dateInfo = resolveStudentAgeAndDateInfo(formData, formData.teacherFreeText || '');
    const newGoalObj = {
      id: newId,
      environment: ENVIRONMENTS_LIST[0],
      activityParticipation: '',
      title: '',
      objectives: '',
      opportunities: '',
      partners: 'צוות הגן, סייעת אישית',
      duration: `3 חודשים (עד ${dateInfo.plus3Months})`,
      evaluationCriteria: '',
      isTeacherAdded: true,
      isTeacherModified: true
    };
    setFormData((prev) => ({
      ...prev,
      goals: [...(prev.goals || []), newGoalObj]
    }));
    setOpenPickerGoalId(newId);
    setPickerSearch('');
    setPickerEnvFilter('הכל');
  };

  const handleDeleteGoalRow = (goalId) => {
    if ((formData.goals || []).length <= 1) {
      if (!window.confirm('זוהי המטרה היחידה בתכנית. האם למחוק אותה?')) return;
    }
    setFormData((prev) => {
      const targetGoal = (prev.goals || []).find((g) => g.id === goalId);
      const nextRemoved = [...(prev.removedAiGoals || [])];
      if (targetGoal && !isGoalEmpty(targetGoal)) {
        nextRemoved.push({
          id: targetGoal.id,
          environment: (targetGoal.environment || '').trim(),
          title: (targetGoal.title || '').trim(),
          activityParticipation: (targetGoal.activityParticipation || '').trim(),
          aiSnapshot: targetGoal.aiSnapshot || null
        });
      }
      return {
        ...prev,
        removedAiGoals: nextRemoved,
        goals: (prev.goals || []).filter((g) => g.id !== goalId)
      };
    });
  };

  // Select a goal from the Dynamic Goal Bank (automatically adjusted to student's gender!)
  const handleSelectGoalFromBank = (goalRowId, bankItem, fillTemplate = true) => {
    const genderToUse = formData.gender || 'boy';
    const studentFirstName = (formData.name || (genderToUse === 'girl' ? 'הילדה' : 'הילד'))
      .trim()
      .split(/\s+/)[0];
    const personalizedOpportunities = (bankItem.defaultOpportunities || '').replace(
      /הילד/g,
      studentFirstName
    );

    const genderTitle = adaptTextToGender(bankItem.title || '', genderToUse);
    const genderActivity = adaptTextToGender(bankItem.defaultActivity || '', genderToUse);
    const genderObjectives = (bankItem.suggestedObjectives || [])
      .map((o) => `• ${adaptTextToGender(o, genderToUse)}`)
      .join('\n');
    const genderEval = adaptTextToGender(bankItem.defaultEvaluation || '', genderToUse);
    const dateInfo = resolveStudentAgeAndDateInfo(formData, formData.teacherFreeText || '');

    setFormData((prev) => ({
      ...prev,
      goals: (prev.goals || []).map((g) => {
        if (g.id !== goalRowId) return g;
        if (!fillTemplate) {
          return {
            ...g,
            title: genderTitle,
            environment: bankItem.environment || g.environment,
            isTeacherModified: true
          };
        }
        const draftGoal = {
          ...g,
          title: genderTitle,
          environment: bankItem.environment || g.environment,
          activityParticipation: g.activityParticipation || genderActivity || '',
          objectives: g.objectives || genderObjectives,
          opportunities: g.opportunities || personalizedOpportunities || '',
          partners: g.partners || bankItem.defaultPartners || 'צוות חינוכי, הורים',
          duration: g.duration || '',
          evaluationCriteria: g.evaluationCriteria || genderEval || '',
          isTeacherModified: true
        };
        return {
          ...draftGoal,
          duration:
            g.duration && g.duration !== 'עד סוף השנה'
              ? g.duration
              : normalizeAndSizeGoalDuration(
                  draftGoal,
                  prev.teacherFreeText || '',
                  prev,
                  dateInfo
                )
        };
      })
    }));

    // Increment usage count in global bank
    onUseOrAddGoalToBank({
      title: bankItem.title,
      environment: bankItem.environment
    });

    // Load the 3 Facilitating Questions for this Goal
    const questions =
      bankItem.facilitatingQuestions && bankItem.facilitatingQuestions.length > 0
        ? bankItem.facilitatingQuestions.slice(0, 3)
        : generateDefaultQuestionsForCustomGoal(genderTitle, bankItem.environment, formData);

    setAiQuestionsMap((prev) => ({
      ...prev,
      [goalRowId]: questions
    }));
    setActiveAiGoalId(goalRowId);
    setOpenPickerGoalId(null);
  };

  // Define a brand new custom Goal and trigger AI Facilitating Questions
  const handleConfirmCustomGoal = async (goalRow) => {
    if (!goalRow.title || !goalRow.title.trim()) return;

    setFormData((prev) => ({
      ...prev,
      goals: (prev.goals || []).map((g) =>
        g.id === goalRow.id ? { ...g, isTeacherModified: true } : g
      )
    }));

    // Save to global Goal Bank for future usage
    onUseOrAddGoalToBank(goalRow);
    setOpenPickerGoalId(null);

    // Open AI Facilitating Questions panel and generate up to 3 tailored questions
    setActiveAiGoalId(goalRow.id);
    await handleGenerateAiQuestionsForGoal(goalRow);
  };

  // Generate up to 3 Facilitating Questions via Gemini AI (or smart fallback)
  const handleGenerateAiQuestionsForGoal = async (goalRow) => {
    const goalTitle = (goalRow.title || '').trim();
    if (!goalTitle) return;

    setLoadingAiForGoalId(goalRow.id);
    const dateInfo = resolveStudentAgeAndDateInfo(formData, formData.teacherFreeText || '');

    // Check if bank already has tailored questions and no API key is set
    const existingBankItem = sortedGoals.find(
      (b) =>
        adaptTextToGender(b.title.trim(), currentGender) ===
        adaptTextToGender(goalTitle, currentGender)
    );
    const fallbackQuestions =
      existingBankItem?.facilitatingQuestions?.slice(0, 3) ||
      generateDefaultQuestionsForCustomGoal(goalTitle, goalRow.environment, formData);

    if (!geminiApiKey) {
      setAiQuestionsMap((prev) => ({
        ...prev,
        [goalRow.id]: fallbackQuestions
      }));
      setLoadingAiForGoalId(null);
      return;
    }

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`;
      const genderLabel = currentGender === 'girl' ? 'בת (לשון נקבה)' : 'בן (לשון זכר)';
      const prompt = `אתה מדריך פדגוגי מומחה לבניית "תכנית עבודה משותפת ואינטגרטיבית ברוח הגישה האקולוגית" ותח"י.
המורה הגדירה את המטרה העליונה הבאה עבור תלמיד/ה (${genderLabel}, גיל: ${dateInfo.ageDescription}):
מטרה: "${goalTitle}"
סביבה / תחום: "${goalRow.environment || 'מרחב הגן / הכיתה'}"
תאריך הזנת המטרה: ${dateInfo.entryDateFormatted}
מידע חופשי על הילד/ה: "${formData.teacherFreeText || ''}"

נסח בדיוק 3 שאלות מנחות (Facilitating Questions) קצרות, מכוונות ומעשיות בעברית (מותאמות ל${genderLabel}) שיסייעו למורה לדייק את מילוי השדות של מטרה זו בטבלה:
- שאלה 1: על התפקוד הנוכחי של הילד/ה והגורמים המאפשרים/המגבילים בסביבה (עבור שדה "פעילות והשתתפות").
- שאלה 2: על צעדים אופרטיביים הדרגתיים ואמצעי תיווך של הצוות בהתאם לגיל הילד/ה ורמתו/ה (עבור שדות "יעדים וציוני דרך" ו-"הזדמנויות ואמצעים").
- שאלה 3: על השותפים לתהליך, תיחום הזמן המשוער לפי גודל המטרה (T-Shirt Size: למשל חודש עד ${dateInfo.plus1Month}, 3 חודשים עד ${dateInfo.plus3Months}, או חצי שנה עד ${dateInfo.plus6Months}) ואמות המידה להערכה.

עבור כל שאלה הצע גם 2-3 תשובות קצרות לדוגמה שהמורה יכולה לבחור בלחיצה.
החזר תשובה בפורמט JSON בלבד במבנה הבא:
[
  { "q": "1. טקסט השאלה הראשונה?", "suggestions": ["תשובה מומלצת א", "תשובה מומלצת ב"] },
  { "q": "2. טקסט השאלה השנייה?", "suggestions": ["תשובה מומלצת א", "תשובה מומלצת ב"] },
  { "q": "3. טקסט השאלה השלישית?", "suggestions": ["תשובה מומלצת א", "תשובה מומלצת ב"] }
]`;

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      });

      if (!res.ok) throw new Error('Gemini API request failed');
      const data = await res.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const jsonMatch = rawText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setAiQuestionsMap((prev) => ({
            ...prev,
            [goalRow.id]: parsed.slice(0, 3)
          }));
          setLoadingAiForGoalId(null);
          return;
        }
      }
      setAiQuestionsMap((prev) => ({
        ...prev,
        [goalRow.id]: fallbackQuestions
      }));
    } catch (e) {
      setAiQuestionsMap((prev) => ({
        ...prev,
        [goalRow.id]: fallbackQuestions
      }));
    } finally {
      setLoadingAiForGoalId(null);
    }
  };

  // Apply teacher's answers to the 3 Facilitating Questions to auto-fill/enrich the 6 columns of the goal!
  const handleApplyFacilitatingAnswers = async (goalRow) => {
    const answers = aiAnswersMap[goalRow.id] || {};
    const ans1 = (answers[0] || '').trim();
    const ans2 = (answers[1] || '').trim();
    const ans3 = (answers[2] || '').trim();
    const genderToUse = formData.gender || 'boy';
    const genderLabel =
      genderToUse === 'girl'
        ? 'בת (לשון נקבה בלבד – למשל: תשתתף, תמתין, תבחר)'
        : 'בן (לשון זכר בלבד – למשל: ישתתף, ימתין, יבחר)';
    const firstName = (formData.name || (genderToUse === 'girl' ? 'הילדה' : 'הילד'))
      .trim()
      .split(/\s+/)[0];
    const dateInfo = resolveStudentAgeAndDateInfo(formData, formData.teacherFreeText || '');

    setLoadingAiForGoalId(goalRow.id);

    if (geminiApiKey && (ans1 || ans2 || ans3)) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`;
        const prompt = `אתה מומחה לכתיבת תכנית עבודה אקולוגית ותח"י בעברית.
שם הילד/ה: ${firstName}
מין הילד/ה: ${genderLabel}
גיל הילד/ה: ${dateInfo.ageDescription}
תאריך הזנת המטרה: ${dateInfo.entryDateFormatted}
סביבה: ${goalRow.environment}
מטרה (מה אנחנו רוצים שיקרה?): ${goalRow.title}

תשובות המורה ל-3 השאלות המנחות:
1. תפקוד בסביבה וגורמים מאפשרים/מגבילים: ${ans1 || 'לא צוין'}
2. צעדים אופרטיביים ואמצעי תיווך: ${ans2 || 'לא צוין'}
3. שותפים, משך ואמות מידה להערכה: ${ans3 || 'לא צוין'}

הנחיה לקביעת משך הזמן ("duration") לפי גודל המטרה (T-Shirt Size: S / M / L) ותאריך יחסי מתאריך הזנת המטרה (${dateInfo.entryDateFormatted}):
- אל תקבע כברירת מחדל "עד סוף השנה"! העריך את גודל המטרה לפי גיל הילד/ה, רמתו/ה והקושי:
- אם המטרה ממוקדת וברת השגה בטווח קצר (SMALL): קבע "חודש (עד ${dateInfo.plus1Month})" או "חודשיים (עד ${dateInfo.plus2Months})".
- אם המטרה בינונית (MEDIUM): קבע "3 חודשים (עד ${dateInfo.plus3Months})" או "4 חודשים (עד ${dateInfo.plus4Months})".
- אם המטרה רחבה וארוכת טווח (LARGE): קבע "חצי שנה (עד ${dateInfo.plus6Months})" או "עד סוף השנה (עד ${dateInfo.endOfYear})".

נסח באופן מקצועי, בהיר ומותאם למין הילד/ה (${genderLabel}) את השדות הבאים והחזר JSON בלבד:
{
  "activityParticipation": "תיאור פעילות והשתתפות בסביבה...",
  "objectives": "• יעד 1\\n• יעד 2\\n• יעד 3",
  "opportunities": "• הזדמנות ותיווך 1\\n• הזדמנות ותיווך 2",
  "partners": "שותפים לתהליך...",
  "tShirtSize": "S",
  "duration": "חודש (עד ${dateInfo.plus1Month})",
  "evaluationCriteria": "אמות מידה להערכה..."
}`;

        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });

        if (res.ok) {
          const data = await res.json();
          const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
          const jsonMatch = rawText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const enriched = JSON.parse(jsonMatch[0]);
            setFormData((prev) => ({
              ...prev,
              goals: (prev.goals || []).map((g) => {
                if (g.id !== goalRow.id) return g;
                const mergedGoal = {
                  ...g,
                  activityParticipation:
                    enriched.activityParticipation || g.activityParticipation,
                  objectives: enriched.objectives || g.objectives,
                  opportunities: enriched.opportunities || g.opportunities,
                  partners: enriched.partners || g.partners,
                  tShirtSize: enriched.tShirtSize || g.tShirtSize,
                  duration: enriched.duration || g.duration,
                  evaluationCriteria: enriched.evaluationCriteria || g.evaluationCriteria,
                  isTeacherModified: true
                };
                mergedGoal.duration = normalizeAndSizeGoalDuration(
                  mergedGoal,
                  prev.teacherFreeText || '',
                  prev,
                  dateInfo
                );
                return adaptGoalToGender(mergedGoal, genderToUse);
              })
            }));
            setLoadingAiForGoalId(null);
            return;
          }
        }
      } catch (err) {
        console.warn('Fallback to local synthesis for facilitating answers', err);
      }
    }

    // Smart deterministic synthesis from the 3 answers
    setFormData((prev) => ({
      ...prev,
      goals: (prev.goals || []).map((g) => {
        if (g.id !== goalRow.id) return g;
        const draftGoal = {
          ...g,
          activityParticipation: ans1
            ? `${ans1}${g.activityParticipation ? `\n${g.activityParticipation}` : ''}`
            : g.activityParticipation ||
              `בסביבת ${g.environment}, ${firstName} מתנסה בפעילות עם תיווך מותאם של הצוות.`,
          objectives: ans2
            ? `${g.objectives ? g.objectives + '\n' : ''}• ${ans2}`
            : g.objectives || `• יתקדם בהדרגה לעבר המטרה: ${g.title}.`,
          opportunities: ans2
            ? `${g.opportunities ? g.opportunities + '\n' : ''}• הצוות יתווך ל${firstName} באמצעות: ${ans2}.`
            : g.opportunities || `• המבוגר יזמין ויתווך ל${firstName} באופן יומיומי ומדורג.`,
          partners: ans3 ? ans3 : g.partners || 'צוות הגן / הכיתה, סייעת אישית, הורים',
          duration: ans3 && /\d|חודש|שבוע|שנה/.test(ans3) ? ans3 : g.duration || '',
          evaluationCriteria:
            ans3 && ans3.length > 15
              ? ans3
              : g.evaluationCriteria ||
                `יישום עצמאי ועקבי של המטרה (${g.title}) בסביבת ${g.environment}.`,
          isTeacherModified: true
        };
        draftGoal.duration = normalizeAndSizeGoalDuration(
          draftGoal,
          prev.teacherFreeText || '',
          prev,
          dateInfo
        );
        return adaptGoalToGender(draftGoal, genderToUse);
      })
    }));
    setLoadingAiForGoalId(null);
  };

  // Add an operative objective chip from the Goal Bank (automatically adjusted to student's gender!)
  const handleAddSuggestedObjective = (goalRowId, objText) => {
    const genderToUse = formData.gender || 'boy';
    const genderAdjustedObj = adaptTextToGender(objText, genderToUse);

    setFormData((prev) => ({
      ...prev,
      goals: (prev.goals || []).map((g) => {
        if (g.id !== goalRowId) return g;
        const current = (g.objectives || '').trim();
        if (current.includes(genderAdjustedObj)) return g;
        const nextObjectives = current
          ? `${current}\n• ${genderAdjustedObj}`
          : `• ${genderAdjustedObj}`;
        return { ...g, objectives: nextObjectives, isTeacherModified: true };
      })
    }));
  };

  // Helper to call Gemini API across available Flash models with JSON mode
  const callGeminiJson = async (promptText) => {
    const cleanKey = (geminiApiKey || '').trim();
    if (!cleanKey) return null;

    const models = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];
    for (const modelName of models) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${cleanKey}`;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: promptText }] }],
            generationConfig: { responseMimeType: 'application/json' }
          })
        });
        if (!res.ok) continue;
        const data = await res.json();
        const textOut = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        const jsonMatch = textOut.match(/[\{\[][\s\S]*[\}\]]/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
      } catch (err) {
        console.warn(`Model ${modelName} call failed, trying next`, err);
      }
    }
    return null;
  };

  // === SUBMIT BUTTON: Generate Top Summary Table (and Goals if empty) from Teacher's Free Text + All Goals ===
  const handleSubmitGenerateSummaryTable = async () => {
    const freeText = (formData.teacherFreeText || '').trim();
    const goalsList = (formData.goals || []).filter((g) => g.title && g.title.trim());

    // If the teacher pasted raw text and hasn't defined any goals yet, run full reverse engineering so Goals + Summary are both generated!
    if (freeText && goalsList.length === 0) {
      await handleReverseEngineerFullReport();
      return;
    }

    setIsGeneratingSummary(true);

    if (geminiApiKey && freeText) {
      const goalsSummary = goalsList
        .map(
          (g, idx) =>
            `${idx + 1}. סביבה: ${g.environment} | מטרה: ${g.title} | תפקוד: ${g.activityParticipation || ''} | יעדים: ${g.objectives || ''}`
        )
        .join('\n');

      const prompt = `אתה מומחה פדגוגי לכתיבת "תוכנית עבודה שנתית" (תל"א / תח"י).
בהתבסס על הטקסט החופשי שכתבה המורה על הילד/ה ועל המטרות שהוגדרו, הפק תקציר מנהלים (Executive Summary) תמציתי, קוהרנטי ומזוקק עבור טבלת מוקדי הכוח בראש המסמך.
הנחיות קריטיות:
- לעולם אל תעתיק משפטים גולמיים כמו שהם (As-Is) מתוך הטקסט של המורה!
- תקן אוטומטית כל שגיאת כתיב, הקלדה או ניסוח יומיומי על פי ההקשר, ונסח מחדש בעברית פדגוגית תקנית ורהוטה.
- בכל עמודה כתוב תקציר מנהלים קצר של 3 עד 4 נקודות בלבד (כל נקודה בשורה אחת קצרה וממוקדת לפי נושא/תחום: "• [שם התחום]: [תמצית מקצועית קצרה]"). אל תעמיס מלל!

1. "strengthsExisting": תקציר מנהלים של מוקדי כוח וכוחות קיימים לפי תחומים (3-4 נקודות קצרות).
2. "strengthsToEmpower": תקציר מנהלים של כוחות להעצמה וחיזוק לפי תחומים (3-4 נקודות קצרות).

טקסט חופשי של המורה:
"${freeText}"

המטרות שהוגדרו לתלמיד/ה:
${goalsSummary}

החזר JSON בלבד:
{
  "strengthsExisting": "• תחום אישיותי-רגשי: תמצית קצרה\\n• תחום קוגניטיבי ושפתי: תמצית קצרה",
  "strengthsToEmpower": "• משחקי שולחן וקופסא: תמצית קצרה\\n• מפגש ושיח: תמצית קצרה"
}`;

      const parsed = await callGeminiJson(prompt);
      if (parsed && (parsed.strengthsExisting || parsed.strengthsToEmpower)) {
        const updated = {
          ...formData,
          freeTextAnalyzed: true,
          strengthsExisting: parsed.strengthsExisting || formData.strengthsExisting,
          strengthsToEmpower: parsed.strengthsToEmpower || formData.strengthsToEmpower,
          status: 'מוכן להדפסה',
          lastSavedAt: new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })
        };
        setFormData(updated);
        onSaveStudentPlan(updated);
        setIsGeneratingSummary(false);
        setIsFreeTextCollapsed(true);
        setSaveBanner(true);
        setTimeout(() => setSaveBanner(false), 3000);
        return;
      }
    }

    // Use the coherent Hebrew Semantic & Executive Summary Interpreter
    const engineered = reverseEngineerRawTextLocally(freeText, formData, goalBank);

    const updated = {
      ...formData,
      freeTextAnalyzed: true,
      name: engineered?.name || formData.name,
      gender: engineered?.gender || formData.gender || 'boy',
      educationalFramework: engineered?.educationalFramework || formData.educationalFramework,
      strengthsExisting: engineered?.strengthsExisting || formData.strengthsExisting,
      strengthsToEmpower: engineered?.strengthsToEmpower || formData.strengthsToEmpower,
      status: 'מוכן להדפסה',
      lastSavedAt: new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })
    };

    setFormData(updated);
    onSaveStudentPlan(updated);
    setIsGeneratingSummary(false);
    setIsFreeTextCollapsed(true);
    setSaveBanner(true);
    setTimeout(() => setSaveBanner(false), 3000);
  };

  // === AI Reverse Engineering from Raw Data Text to Full Formal Report ===
  const handleReverseEngineerFullReport = async () => {
    const rawText = (formData.teacherFreeText || '').trim();
    if (!rawText) {
      window.alert('נא להזין טקסט גולמי על התלמיד/ה בתיבת התיאור החופשי כדי שה-AI יוכל להפיק ממנו דוח רשמי מלא.');
      return;
    }

    setIsReverseEngineering(true);
    setReverseEngineerBanner('');

    const genderToUse = formData.gender || 'boy';
    const genderInstruction =
      genderToUse === 'girl'
        ? 'בת (נקבה) – חובה לנסח את כל המטרות, היעדים והתיאורים בלשון נקבה בלבד (למשל: תשתתף, תמתין, תבחר, תגיב)!'
        : 'בן (זכר) – חובה לנסח את כל המטרות, היעדים והתיאורים בלשון זכר בלבד (למשל: ישתתף, ימתין, יבחר, יגיב)!';

    const dateInfo = resolveStudentAgeAndDateInfo(formData, rawText);
    const existingGoals = formData.goals || [];
    const protectedGoals = existingGoals.filter((g) => isGoalProtectedFromAiOverwrite(g));
    const unprotectedGoals = existingGoals.filter(
      (g) => !isGoalEmpty(g) && !isGoalProtectedFromAiOverwrite(g)
    );
    const removedGoals = Array.isArray(formData.removedAiGoals) ? formData.removedAiGoals : [];

    // 1. Try Live Gemini AI if API key is provided
    if (geminiApiKey && geminiApiKey.trim()) {
      const bankReference = sortedGoals
        .slice(0, 20)
        .map(
          (b) =>
            `- סביבת השתתפות: "${b.environment}" | מטרה: "${adaptTextToGender(b.title, genderToUse)}" | יעדים אפשריים: ${(b.suggestedObjectives || []).map((o) => adaptTextToGender(o, genderToUse)).join(' ; ')}`
        )
        .join('\n');

      const protectedGoalsPromptBlock =
        protectedGoals.length > 0
          ? `\nהנחיה קריטית – מטרות שנערכו או נוספו על ידי המורה (נעולות לשינוי!):
המורה ערכה או הוסיפה ידנית את ${protectedGoals.length} המטרות הבאות לאחר ניתוח קודם:
${protectedGoals
  .map((pg, idx) => {
    const origNote =
      pg.aiSnapshot?.title && pg.aiSnapshot.title !== pg.title
        ? ` (עודכן מתוך מטרת ה-AI המקורית: "${pg.aiSnapshot.title}")`
        : '';
    return `  * מטרה נעולה #${idx + 1}: סביבה="${pg.environment}" | מטרה="${pg.title}"${origNote} | תפקוד="${pg.activityParticipation}"`;
  })
  .join('\n')}
- **אסור לשנות דבר במטרות נעולות אלו ואסור להחזיר אותן או את גרסתן המקורית או כפילויות שלהן במערך "goals"!**
- התייחס בניתוח של מערך "goals" **אך ורק לשאר המטרות** (עדכון/ניתוח של מטרות קיימות שלא נערכו ידנית, או יצירת מטרות חדשות עבור אתגרים בטקסט שאינם מכוסים כבר במטרות הנעולות). אם כל הנושאים בטקסט כבר מכוסים במטרות הנעולות, החזר מערך ריק [] עבור "goals".\n`
          : '';

      const removedGoalsPromptBlock =
        removedGoals.length > 0
          ? `\nהנחיה קריטית – מטרות שהוסרו על ידי המורה:
המורה מחקה מהתוכנית את המטרות הבאות:
${removedGoals
  .map((rg, idx) => `  * הוסרה #${idx + 1}: סביבה="${rg.environment}" | מטרה="${rg.title}"`)
  .join('\n')}
- **אל תחזיר ואל תיצור מחדש מטרות אלו במערך "goals"!**\n`
          : '';

      const unprotectedGoalsPromptBlock =
        unprotectedGoals.length > 0 && (protectedGoals.length > 0 || removedGoals.length > 0)
          ? `\nמטרות קיימות שטרם נערכו ידנית על ידי המורה (אליהן ולמטרות חדשות מהטקסט עליך להתייחס במערך "goals"):
${unprotectedGoals
  .map((ug, idx) => `  * מטרה קיימת #${idx + 1}: סביבה="${ug.environment}" | מטרה="${ug.title}"`)
  .join('\n')}\n`
          : '';

      const prompt = `אתה מומחה פדגוגי בכיר לכתיבת "תוכנית עבודה שנתית" (תל"א / תח"י ברוח הגישה האקולוגית) במשרד החינוך.
המורה הזינה טקסט גולמי ("Raw Data") המתאר ילד/ה במילים חופשיות (העלול להכיל שגיאות כתיב, שגיאות הקלדה או ניסוח יומיומי).
מין הילד/ה שהוגדר בטופס: ${genderInstruction}
גיל הילד/ה: ${dateInfo.ageDescription}
מסגרת חינוכית: ${formData.educationalFramework || 'לא צוין'}
תאריך הזנת המטרות (תאריך ייחוס לחישוב משך הזמן): ${dateInfo.entryDateFormatted}

הנחיות קריטיות לעיבוד המידע:
1. אל תעתיק משפטים גולמיים מהטקסט "As-Is"! עליך לפרש את המשמעות מתוך ההקשר, לתקן כל שגיאת כתיב או דקדוק, ולנסח מחדש בעברית פדגוגית מקצועית, רהוטה ותקנית המותאמת למין הילד/ה (${genderToUse === 'girl' ? 'לשון נקבה' : 'לשון זכר'}).
2. עבור "strengthsExisting" (מוקדי כוח: כוחות קיימים) ו-"strengthsToEmpower" (כוחות להעצמה וחיזוק) כתוב **תקציר מנהלים (Executive Summary) תמציתי ומזוקק לפי נושאים** – לכל היותר 3 עד 4 נקודות קצרות בכל עמודה (במבנה: "• [נושא/תחום]: [תמצית קצרה של 5-9 מילים]"). אל תעמיס מלל ואל תחזור על משפטים ארוכים!
3. **סיווג מטרות לפי גודל (T-Shirt Size: SMALL / MEDIUM / LARGE) וקביעת משך הזמן ("duration") לפי תאריך יחסי מתאריך הזנת המטרות (${dateInfo.entryDateFormatted}):**
   - נתח כל מטרה בהתאם ל**גיל הילד/ה (${dateInfo.ageDescription}), רמת התפקוד שלו/ה, האתגרים והקשיים** והפרטים שכתבה המורה.
   - **אסור להגדיר את כל המטרות כברירת מחדל לכל השנה ("עד סוף השנה")!** עליך להעריך את גודל המטרה (T-Shirt Size) ולהגביל את משך הזמן שלה ("duration") לתאריך יחסי מתאריך הזנת המטרות (${dateInfo.entryDateFormatted}):
     * **SMALL ("S")** – מטרה ממוקדת, הרגל קונקרטי או מיומנות נקודתית שנראית ברת-השגה בטווח קצר (כחודש עד חודשיים) בהתאם לגיל הילד/ה, רמתו/ה והקושי:
       - אם ניתנת להשגה תוך חודש: הגדר \`"tShirtSize": "S"\` ו-\`"duration": "חודש (עד ${dateInfo.plus1Month})"\`
       - אם ניתנת להשגה תוך חודשיים: הגדר \`"tShirtSize": "S"\` ו-\`"duration": "חודשיים (עד ${dateInfo.plus2Months})"\`
     * **MEDIUM ("M")** – מטרה בינונית הדורשת תרגול הדרגתי ותיווך עקבי לאורך 3 עד 4 חודשים:
       - הגדר \`"tShirtSize": "M"\` ו-\`"duration": "3 חודשים (עד ${dateInfo.plus3Months})"\` (או \`"4 חודשים (עד ${dateInfo.plus4Months})"\`)
     * **LARGE ("L")** – מטרה התפתחותית/רגשית-חברתית רחבה ומורכבת הדורשת תהליך עומק ממושך:
       - הגדר \`"tShirtSize": "L"\` ו-\`"duration": "חצי שנה (עד ${dateInfo.plus6Months})"\` או \`"עד סוף השנה (עד ${dateInfo.endOfYear})"\`
   - התאם גם את היקף היעדים האופרטיביים ("objectives") לגיל הילד/ה, לרמתו/ה ולגודל המטרה (מטרת SMALL תכלול 2-3 צעדים קונקרטיים ומהירים להשגה; מטרת MEDIUM/LARGE תכלול 3-5 צעדים מדורגים).
${protectedGoalsPromptBlock}${removedGoalsPromptBlock}${unprotectedGoalsPromptBlock}
הדוח הרשמי ב-JSON חייב לכלול:
1. "name": שם הילד/ה אם הוזכר בטקסט (או השאר ריק אם לא הוזכר).
2. "educationalFramework": מסגרת חינוכית/גן אם הוזכרו בטקסט (או השאר ריק).
3. "strengthsExisting": תקציר מנהלים תמציתי (3-4 נקודות קצרות לפי נושאים) של מוקדי הכוח הקיימים.
4. "strengthsToEmpower": תקציר מנהלים תמציתי (2-4 נקודות קצרות לפי נושאים) של הכוחות להעצמה וחיזוק.
5. "goals": מערך המטרות (עבור שאר המטרות שאינן נעולות ושלא הוסרו על ידי המורה):
   - תחילה בדוק אם קיימות מטרות מתאימות במאגר המטרות הקיים שלהלן.
   - **חשוב מאוד – יצירת מטרה חדשה במידת הצורך:** אם הטקסט הגולמי של המורה מתאר קושי, צורך או תחום תפקוד שאף אחת מהמטרות הקיימות במאגר אינה מתאימה לו, **חובה ליצור ולנסח מטרה חדשה ומקורית המותאמת אישית לתלמיד/ה זה/זו** (וכן לנסח עבורה יעדים אופרטיביים חדשים, הזדמנויות ואמצעים ואמות מידה להערכה)!
   לכל מטרה מלא את השדות בניסוח מקצועי וללא שגיאות כתיב (בלשון ${genderToUse === 'girl' ? 'נקבה' : 'זכר'}):
   - "environment": סביבת השתתפות מתאימה (מתוך הרשימה: ${ENVIRONMENTS_LIST.join(', ')} – או סביבה מותאמת אם נדרש)
   - "activityParticipation": סינתזה פדגוגית מקצועית ותמציתית של תפקוד הילד/ה בסביבה זו (ללא העתקת הטקסט הגולמי כפי שהוא!)
   - "title": מטרה מתאימה מהמאגר, או **מטרה חדשה ומותאמת אישית** שנוסחה במיוחד עבור התלמיד/ה
   - "objectives": יעדים אופרטיביים ומדורגים המותאמים לגיל הילד/ה, רמתו/ה וגודל המטרה (בנקודות • מופרדות בשורות חדשות)
   - "opportunities": הזדמנויות, אמצעים ודרכי תיווך מעשיות של הצוות עבור הילד/ה (נקודות • מופרדות בשורות חדשות)
   - "partners": שותפים לתהליך
   - "tShirtSize": "S" | "M" | "L"
   - "duration": משך הזמן מתוחם בתאריך יחסי מתאריך הזנת המטרות (למשל: "חודש (עד ${dateInfo.plus1Month})" למטרת S, "3 חודשים (עד ${dateInfo.plus3Months})" למטרת M, וכו')
   - "evaluationCriteria": אמות מידה ברורות להערכה
6. "recommendations": 3 המלצות מערכתיות קצרות וממוקדות לצוות הגן ולהורים.

שם הילד/ה הנוכחי בטופס: "${formData.name || ''}"
הטקסט הגולמי של המורה:
"""
${rawText}
"""

מאגר סביבות ההשתתפות, המטרות והיעדים הקיימים (לבחירה או כהשראה לניסוח מטרה חדשה כאשר אין התאמה):
${bankReference}

החזר JSON תקין בלבד:
{
  "name": "",
  "educationalFramework": "",
  "strengthsExisting": "• תחום אישיותי-רגשי: תמצית קצרה\\n• תחום קוגניטיבי: תמצית קצרה",
  "strengthsToEmpower": "• משחקי שולחן וקופסא: תמצית קצרה\\n• מפגש ושיח: תמצית קצרה",
  "goals": [
    {
      "environment": "...",
      "activityParticipation": "...",
      "title": "...",
      "objectives": "• יעד 1\\n• יעד 2\\n• יעד 3",
      "opportunities": "• אמצעי תיווך 1\\n• אמצעי תיווך 2",
      "partners": "...",
      "tShirtSize": "S",
      "duration": "חודש (עד ${dateInfo.plus1Month})",
      "evaluationCriteria": "..."
    }
  ],
  "recommendations": "..."
}`;

      const parsed = await callGeminiJson(prompt);
      if (
        parsed &&
        Array.isArray(parsed.goals) &&
        (parsed.goals.length > 0 || protectedGoals.length > 0)
      ) {
        const candidateGoals = parsed.goals.map((g, i) => {
          const rawCandidate = {
            id: 'g_airev_' + Date.now() + '_' + i,
            environment: g.environment || ENVIRONMENTS_LIST[0],
            activityParticipation: g.activityParticipation || '',
            title: g.title || '',
            objectives: g.objectives || '',
            opportunities: g.opportunities || '',
            partners: g.partners || 'צוות הגן, הורים',
            tShirtSize: g.tShirtSize || '',
            duration: g.duration || '',
            evaluationCriteria: g.evaluationCriteria || ''
          };
          rawCandidate.duration = normalizeAndSizeGoalDuration(
            rawCandidate,
            rawText,
            formData,
            dateInfo
          );
          return attachAiBaselineToGoal(adaptGoalToGender(rawCandidate, genderToUse));
        });

        const mergedGoals = mergeReanalyzedGoals({
          existingGoals,
          candidateNewGoals: candidateGoals,
          removedGoals,
          gender: genderToUse
        });

        const updated = {
          ...formData,
          freeTextAnalyzed: true,
          name:
            parsed.name && (!formData.name || formData.name === 'תלמיד/ה חדש/ה')
              ? parsed.name
              : formData.name,
          educationalFramework:
            parsed.educationalFramework && !formData.educationalFramework
              ? parsed.educationalFramework
              : formData.educationalFramework,
          strengthsExisting: parsed.strengthsExisting || formData.strengthsExisting,
          strengthsToEmpower: parsed.strengthsToEmpower || formData.strengthsToEmpower,
          goals: mergedGoals,
          recommendations: parsed.recommendations || formData.recommendations,
          status: 'מוכן להדפסה',
          lastSavedAt: new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })
        };

        setFormData(updated);
        onSaveStudentPlan(updated);
        mergedGoals.forEach((g) => {
          if (g.title) onUseOrAddGoalToBank(g);
        });
        setIsReverseEngineering(false);
        setIsFreeTextCollapsed(true);
        const preservedNote =
          protectedGoals.length > 0
            ? ` (${protectedGoals.length} מטרות שנערכו על ידי המורה נשמרו ללא כל שינוי)`
            : '';
        setReverseEngineerBanner(
          `✨ הדוח הרשמי הופק בהצלחה ב-Gemini AI מתוך הטקסט הגולמי! הותאמו זמני יעד יחסיים לפי גודל המטרה (T-Shirt Size), נוסחו טבלת מוקדי הכוח, ${mergedGoals.length} מטרות${preservedNote} ופרק ההמלצות.`
        );
        setSaveBanner(true);
        setTimeout(() => setSaveBanner(false), 3500);
        return;
      }
    }

    // 2. Coherent Built-in Hebrew Pedagogical NLP & Synthesis Engine
    const engineered = reverseEngineerRawTextLocally(rawText, formData, goalBank);
    if (engineered) {
      const updated = {
        ...formData,
        freeTextAnalyzed: true,
        name: engineered.name || formData.name,
        gender: engineered.gender || formData.gender || 'boy',
        educationalFramework: engineered.educationalFramework || formData.educationalFramework,
        strengthsExisting: engineered.strengthsExisting,
        strengthsToEmpower: engineered.strengthsToEmpower,
        goals: engineered.goals,
        recommendations: engineered.recommendations,
        status: 'מוכן להדפסה',
        lastSavedAt: new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })
      };

      setFormData(updated);
      onSaveStudentPlan(updated);
      (engineered.goals || []).forEach((g) => {
        if (g.title) onUseOrAddGoalToBank(g);
      });
      setIsFreeTextCollapsed(true);
      const preservedNote =
        protectedGoals.length > 0
          ? ` (${protectedGoals.length} מטרות שנערכו על ידי המורה נשמרו ללא כל שינוי)`
          : '';
      setReverseEngineerBanner(
        `✨ הדוח הרשמי הופק בהצלחה מתוך הטקסט הגולמי! הותאמו זמני יעד יחסיים לפי גודל המטרה (T-Shirt Size), נוסחו טבלת מוקדי הכוח, ${engineered.goals.length} מטרות רשמיות${preservedNote} ופרק ההמלצות.`
      );
      setSaveBanner(true);
      setTimeout(() => setSaveBanner(false), 3500);
    }

    setIsReverseEngineering(false);
  };

  // Save Progress explicitly
  const handleSaveProgress = () => {
    const nowTime = new Date().toLocaleTimeString('he-IL', {
      hour: '2-digit',
      minute: '2-digit'
    });
    const activeYear = formData.schoolYear || 'תשפ"ו (2025-2026)';
    const updatedWithTime = {
      ...formData,
      lastSavedAt: nowTime
    };
    const updated = {
      ...updatedWithTime,
      reportsByYear: {
        ...(formData.reportsByYear || {}),
        [activeYear]: extractYearReportFromFormData(updatedWithTime)
      }
    };
    savedSnapshotRef.current = JSON.stringify(updated);
    setFormData(updated);
    onSaveStudentPlan(updated);
    if (onDraftStateChange) {
      onDraftStateChange({ isDirty: false, draftData: updated });
    }
    // Also record usage for all defined goals
    (updated.goals || []).forEach((g) => {
      if (g.title && g.title.trim()) {
        onUseOrAddGoalToBank(g);
      }
    });
    setSaveBanner(true);
    setTimeout(() => setSaveBanner(false), 2500);
  };

  // === Local Pedagogical Evaluation Refiner & AI Processing for הערכת מחצית / סוף שנה ===
  const refineGoalEvaluationLocally = (rawEvalText, goalRow, gender, fieldName) => {
    const cleaned = (rawEvalText || '')
      .replace(/\s+/g, ' ')
      .replace(/\.{2,}/g, '.')
      .trim();
    const isGirl = gender === 'girl';
    const envName = goalRow.environment || 'סביבת הפעילות';
    const goalTitle = adaptTextToGender(goalRow.title || 'המטרה שהוגדרה', gender).replace(/\.$/, '');
    const isEndYear = fieldName === 'endYearEvaluation';
    const periodLabel = isEndYear ? 'בסיום שנת הלימודים' : 'במחצית שנת הלימודים';

    let detectedStatus = goalRow.achievementStatus || 'בתהליך';
    if (/(הצליח|הצליחה|השיג|השיגה|במלוא|מצוין|מעולה|שולט|שולטת|באופן עצמאי מלא|ללא תיווך)/.test(cleaned)) {
      detectedStatus = 'הושגה במלואה';
    } else if (/(טרם|לא מצליח|לא מצליחה|מתקשה מאוד|זקוק לעזרה מלאה|זקוקה לעזרה מלאה|עדיין לא)/.test(cleaned)) {
      detectedStatus = 'טרם הושגה';
    } else if (/(חלקית|לפעמים|בחלק|עם תיווך|בעזרת|מתקדם|מתקדמת|שיפור)/.test(cleaned)) {
      detectedStatus = 'הושגה חלקית';
    }

    const adaptedNotes = adaptTextToGender(cleaned, gender).replace(/\.$/, '');
    const continuationSentence =
      detectedStatus === 'הושגה במלואה'
        ? isGirl
          ? `המטרה "${goalTitle}" הושגה במלואה, ומומלץ להמשיך ולבסס את העצמאות שהושגה בסביבות נוספות.`
          : `המטרה "${goalTitle}" הושגה במלואה, ומומלץ להמשיך ולבסס את העצמאות שהושגה בסביבות נוספות.`
        : detectedStatus === 'הושגה חלקית'
        ? isGirl
          ? `ניכרת התקדמות משמעותית ביחס למטרה "${goalTitle}", ומומלץ להמשיך בתיווך מותאם ובהדרגתיות לביסוס עצמאות מלאה.`
          : `ניכרת התקדמות משמעותית ביחס למטרה "${goalTitle}", ומומלץ להמשיך בתיווך מותאם ובהדרגתיות לביסוס עצמאות מלאה.`
        : isGirl
        ? `העבודה על המטרה "${goalTitle}" נמצאת בתהליך מתמשך ודורשת המשך הטרמה, תיווך עקבי וחיזוק חיובי.`
        : `העבודה על המטרה "${goalTitle}" נמצאת בתהליך מתמשך ודורשת המשך הטרמה, תיווך עקבי וחיזוק חיובי.`;

    const formattedEvaluation = `${periodLabel} בסביבת "${envName}", ${adaptedNotes}. ${continuationSentence}`;
    return {
      formattedEvaluation,
      achievementStatus: detectedStatus
    };
  };

  const handleProcessSingleGoalEvalAi = async (goalRow, fieldName) => {
    const rawText = (goalRow[fieldName] || '').trim();
    if (!rawText) {
      window.alert('נא להזין טקסט בתיבת ההערכה לפני הפעלת עיבוד מידע ב-AI.');
      return;
    }

    const aiKey = `${goalRow.id}_${fieldName}`;
    setLoadingEvalAiKey(aiKey);
    const genderToUse = formData.gender || 'boy';
    const isEndYear = fieldName === 'endYearEvaluation';
    const periodTitle = isEndYear ? 'הערכת סוף שנה' : 'הערכת מחצית השנה';

    if (geminiApiKey && geminiApiKey.trim()) {
      const prompt = `אתה מומחה פדגוגי לכתיבת דוח "${periodTitle}" (הערכה תקופתית לתל"א / תח"י) במשרד החינוך.
המורה הזינה הערות גולמיות על התקדמות הילד/ה ביחס למטרה ספציפית.
מין הילד/ה: ${genderToUse === 'girl' ? 'בת (נקבה – נסח בלשון נקבה בלבד)' : 'בן (זכר – נסח בלשון זכר בלבד)'}
סביבת הפעילות: "${goalRow.environment || ''}"
המטרה העליונה: "${goalRow.title || ''}"
היעדים שהוגדרו: "${goalRow.objectives || ''}"

הטקסט הגולמי שכתבה המורה עבור ${periodTitle}:
"""
${rawText}
"""

הנחיות:
1. תקן כל שגיאת כתיב או הקלדה ונסח מחדש פסקת הערכה פדגוגית מקצועית, תמציתית, מכבדת ורהוטה (2-3 משפטים) המשקפת את תפקוד הילד/ה והתקדמותו/ה ביחס למטרה וליעדים.
2. קבע את סטטוס השגת המטרה המתאים ביותר מתוך 4 האפשרויות בלבד: "הושגה במלואה", "הושגה חלקית", "בתהליך", "טרם הושגה".

החזר JSON תקין בלבד:
{
  "formattedEvaluation": "...",
  "achievementStatus": "הושגה חלקית"
}`;

      const parsed = await callGeminiJson(prompt);
      if (parsed && parsed.formattedEvaluation) {
        const validStatuses = ['הושגה במלואה', 'הושגה חלקית', 'בתהליך', 'טרם הושגה'];
        const nextStatus = validStatuses.includes(parsed.achievementStatus)
          ? parsed.achievementStatus
          : goalRow.achievementStatus || 'בתהליך';

        setFormData((prev) => ({
          ...prev,
          goals: (prev.goals || []).map((g) =>
            g.id === goalRow.id
              ? {
                  ...g,
                  [fieldName]: adaptTextToGender(parsed.formattedEvaluation, genderToUse),
                  achievementStatus: nextStatus
                }
              : g
          )
        }));
        setLoadingEvalAiKey(null);
        setEvalAiSuccessKey(aiKey);
        setTimeout(() => setEvalAiSuccessKey(null), 2500);
        return;
      }
    }

    const localResult = refineGoalEvaluationLocally(rawText, goalRow, genderToUse, fieldName);
    setFormData((prev) => ({
      ...prev,
      goals: (prev.goals || []).map((g) =>
        g.id === goalRow.id
          ? {
              ...g,
              [fieldName]: localResult.formattedEvaluation,
              achievementStatus: localResult.achievementStatus
            }
          : g
      )
    }));
    setLoadingEvalAiKey(null);
    setEvalAiSuccessKey(aiKey);
    setTimeout(() => setEvalAiSuccessKey(null), 2500);
  };

  const handleProcessFullEvalReportAi = async () => {
    const rawText = (formData.evalReportFreeText || '').trim();
    if (!rawText) {
      window.alert('נא להזין תיאור חופשי של התקדמות התלמיד/ה בתיבת הטקסט של דוח ההערכה לפני הפעלת עיבוד מידע ב-AI.');
      return;
    }

    setIsProcessingFullEvalAi(true);
    setEvalReportAiBanner('');
    const genderToUse = formData.gender || 'boy';
    const goalsList = formData.goals || [];

    if (geminiApiKey && geminiApiKey.trim()) {
      const goalsContext = goalsList
        .map(
          (g, idx) =>
            `מטרה #${idx + 1} (id: "${g.id}"): סביבה="${g.environment}" | מטרה="${g.title}" | יעדים="${g.objectives}"`
        )
        .join('\n');

      const prompt = `אתה מומחה פדגוגי בכיר לכתיבת "דוח הערכת מחצית / סוף שנה" (דוח הערכה תקופתי נפרד מתל"א) במשרד החינוך.
מין הילד/ה: ${genderToUse === 'girl' ? 'בת (נקבה – נסח בלשון נקבה בלבד)' : 'בן (זכר – נסח בלשון זכר בלבד)'}
המורה כתבה תיאור חופשי על התקדמות הילד/ה לאורך התקופה:
"""
${rawText}
"""

רשימת המטרות בתוכנית של התלמיד/ה:
${goalsContext}

הנחיות:
1. נסח "evalReportSummary": סיכום פדגוגי מקצועי, קוהרנטי ומכבד של התקדמות הילד/ה בתקופה זו (3-4 משפטים תמציתיים, ללא העתקת משפטים גולמיים וללא שגיאות כתיב).
2. עבור כל אחת מהמטרות ברשימה, הפק:
   - "id": ה-id של המטרה
   - "achievementStatus": אחד מתוך: "הושגה במלואה" | "הושגה חלקית" | "בתהליך" | "טרם הושגה"
   - "midYearEvaluation": ניסוח פדגוגי ממוקד להערכת מחצית ביחס למטרה זו (2 משפטים)
   - "endYearEvaluation": ניסוח פדגוגי ממוקד להערכת סוף שנה והמשך ביחס למטרה זו (אם רלוונטי מהטקסט או סיכום המשך קצר)

החזר JSON תקין בלבד:
{
  "evalReportSummary": "...",
  "goalsEvaluations": [
    {
      "id": "...",
      "achievementStatus": "הושגה חלקית",
      "midYearEvaluation": "...",
      "endYearEvaluation": "..."
    }
  ]
}`;

      const parsed = await callGeminiJson(prompt);
      if (parsed && parsed.evalReportSummary) {
        const evalById = {};
        (parsed.goalsEvaluations || []).forEach((item) => {
          if (item && item.id) evalById[item.id] = item;
        });

        const updatedGoals = goalsList.map((g) => {
          const matched = evalById[g.id];
          if (!matched) return g;
          return {
            ...g,
            achievementStatus: matched.achievementStatus || g.achievementStatus || 'בתהליך',
            midYearEvaluation: matched.midYearEvaluation
              ? adaptTextToGender(matched.midYearEvaluation, genderToUse)
              : g.midYearEvaluation,
            endYearEvaluation: matched.endYearEvaluation
              ? adaptTextToGender(matched.endYearEvaluation, genderToUse)
              : g.endYearEvaluation
          };
        });

        const updated = {
          ...formData,
          evalReportSummary: adaptTextToGender(parsed.evalReportSummary, genderToUse),
          goals: updatedGoals
        };
        setFormData(updated);
        onSaveStudentPlan(updated);
        setIsProcessingFullEvalAi(false);
        setEvalReportAiBanner('✨ דוח הערכת מחצית / סוף שנה עובד ונוסח בהצלחה ב-AI עבור כל מטרות התלמיד/ה!');
        return;
      }
    }

    // Built-in Hebrew Pedagogical Evaluation Synthesis Fallback
    const isGirl = genderToUse === 'girl';
    const cleanGeneral = adaptTextToGender(rawText.replace(/\s+/g, ' ').trim(), genderToUse).replace(/\.$/, '');
    const synthesizedSummary = isGirl
      ? `במהלך תקופת ההערכה ניכרת מעורבות והתקדמות בתפקודה של התלמידה בסביבות הפעילות בגן: ${cleanGeneral}. הצוות החינוכי ממשיך בליווי מותאם, הטרמה וחיזוק העצמאות והיוזמה האישית והחברתית.`
      : `במהלך תקופת ההערכה ניכרת מעורבות והתקדמות בתפקודו של התלמיד בסביבות הפעילות בגן: ${cleanGeneral}. הצוות החינוכי ממשיך בליווי מותאם, הטרמה וחיזוק העצמאות והיוזמה האישית והחברתית.`;

    const updatedGoals = goalsList.map((g) => {
      const localEval = refineGoalEvaluationLocally(rawText, g, genderToUse, 'midYearEvaluation');
      return {
        ...g,
        achievementStatus: g.achievementStatus || localEval.achievementStatus,
        midYearEvaluation: g.midYearEvaluation || localEval.formattedEvaluation
      };
    });

    const updated = {
      ...formData,
      evalReportSummary: synthesizedSummary,
      goals: updatedGoals
    };
    setFormData(updated);
    onSaveStudentPlan(updated);
    setIsProcessingFullEvalAi(false);
    setEvalReportAiBanner('✨ דוח הערכת מחצית / סוף שנה עובד ונוסח בהצלחה עבור מטרות התלמיד/ה!');
  };

  // === Build Official Document HTML (with or without Privacy Redaction) ===
  const getFullDocTitle = () => {
    return formData.planType
      ? `תוכנית עבודה שנתית – ${formData.planType}`
      : 'תוכנית עבודה שנתית';
  };

  const getEvalReportTitle = () => {
    return 'דוח הערכת מחצית / סוף שנה';
  };

  const getDisplayStudentName = () => {
    if (hideStudentDetailsOnPrint) {
      return toHebrewAcronym(formData.name);
    }
    return formData.name || '__________';
  };

  const getDisplayMaskedField = (val) => {
    if (hideStudentDetailsOnPrint) {
      return maskSensitiveValue(val);
    }
    return val || '__________';
  };

  const getRedactedText = (text) => {
    return redactStudentNameInText(text || '', formData.name, hideStudentDetailsOnPrint);
  };

  // Print the official Ecological Work Plan document (תל"א / תח"י ONLY — separate from Evaluation Report)
  const handlePrintDocument = () => {
    // Save progress first
    handleSaveProgress();

    const displayName = getDisplayStudentName();
    const displayId = getDisplayMaskedField(formData.idNumber);
    const displayBirthDate = getDisplayMaskedField(formData.birthDate);
    const displayFramework = hideStudentDetailsOnPrint
      ? maskSensitiveValue(formData.educationalFramework)
      : formData.educationalFramework || '__________';
    const displayAddress = getDisplayMaskedField(formData.address);
    const displayPhone = getDisplayMaskedField(formData.phone);
    const fullDocTitle = getFullDocTitle();
    const logoUrl = new URL('./tala-logo.png', window.location.href).href;

    const goalsRowsHtml = (formData.goals || [])
      .map((g) => {
        const activityText = getRedactedText(g.activityParticipation);
        const titleText = getRedactedText(g.title);
        const objectivesText = getRedactedText(g.objectives);
        const opportunitiesText = getRedactedText(g.opportunities);
        const partnersText = getRedactedText(g.partners);
        const durationText = getRedactedText(g.duration);
        const evaluationText = getRedactedText(g.evaluationCriteria);

        return `
          <table class="eco-table goal-block-table">
            <tbody>
              <tr class="env-header-row">
                <td colspan="6">
                  <div><strong>סביבה:</strong> ${g.environment || '__________'}</div>
                  <div style="margin-top: 4px;">
                    <strong>פעילות והשתתפות:</strong>
                    <span class="sub-instruction">תיאור תוך התייחסות לפעילות הספציפית ולתחומי התפקוד השונים במהלך הפעילות:</span>
                  </div>
                  <div style="margin-top: 6px; white-space: pre-line;">${activityText || ''}</div>
                </td>
              </tr>
              <tr class="columns-header-row">
                <th style="width: 18%;">מטרה<br/><span class="th-sub">מה אנחנו רוצים שיקרה?</span></th>
                <th style="width: 22%;">יעדים, ציוני דרך<br/><span class="th-sub">פירוט צעדים אופרטיביים</span></th>
                <th style="width: 24%;">הזדמנויות, אמצעים<br/><span class="th-sub">ואיך נגרום לזה לקרות?</span></th>
                <th style="width: 13%;">שותפים<br/><span class="th-sub">מי ובאיזה אופן?</span></th>
                <th style="width: 9%;">משך</th>
                <th style="width: 14%;">אמות מידה להערכה</th>
              </tr>
              <tr class="columns-content-row">
                <td style="font-weight: 600; color: #0d2b56;">${titleText || ''}</td>
                <td>${objectivesText || ''}</td>
                <td>${opportunitiesText || ''}</td>
                <td>${partnersText || ''}</td>
                <td>${durationText || ''}</td>
                <td>${evaluationText || ''}</td>
              </tr>
            </tbody>
          </table>
        `;
      })
      .join('');

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      window.print();
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="he" dir="rtl">
        <head>
          <meta charset="utf-8" />
          <title>${fullDocTitle.replace(/\s+/g, '_')}_${displayName}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Rubik:wght@300;400;500;600;700&display=swap');
            @page {
              size: A4 landscape;
              margin: 10mm;
            }
            body {
              font-family: 'Rubik', Arial, sans-serif;
              direction: rtl;
              text-align: right;
              color: #243b47;
              background: #f6f5f0;
              margin: 0;
              padding: 0;
              font-size: 12.5px;
              line-height: 1.5;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .stained-glass-strip {
              height: 6px;
              width: 100%;
              background: linear-gradient(90deg, #7ec8e3 0%, #64a8e0 25%, #8b80d6 50%, #a98eda 75%, #c5aef2 100%);
              border-radius: 6px 6px 0 0;
            }
            .print-banner {
              background: linear-gradient(135deg, #3b6ea5 0%, #5b9bd5 50%, #8e7cc3 100%);
              color: #ffffff;
              padding: 14px 20px;
              border-bottom: 4px solid #c5aef2;
              border-radius: 0 0 10px 10px;
              display: flex;
              align-items: center;
              justify-content: space-between;
              margin-bottom: 12px;
            }
            .print-banner-center {
              display: flex;
              align-items: center;
              gap: 14px;
            }
            .print-logo {
              width: 56px;
              height: 56px;
              border-radius: 50%;
              object-fit: cover;
              border: 2px solid #d6c6f7;
              background: #f4f7fc;
            }
            .doc-main-title {
              margin: 0;
              font-size: 19px;
              font-weight: 700;
              color: #ffffff;
            }
            .doc-meta-side {
              font-size: 12.5px;
              color: #f5f0ff;
            }
            .student-details-bar {
              display: flex;
              flex-wrap: wrap;
              gap: 20px;
              padding: 10px 14px;
              border: 1.5px solid #5b9bd5;
              border-right: 5px solid #8b6fc0;
              background: #eef3fb;
              border-radius: 8px;
              margin-bottom: 14px;
              font-size: 13px;
            }
            .eco-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 15px;
              page-break-inside: avoid;
              background: #ffffff;
            }
            .eco-table th, .eco-table td {
              border: 1.5px solid #7997be;
              padding: 8px 10px;
              vertical-align: top;
              text-align: right;
              white-space: pre-line;
            }
            .summary-table th.th-existing {
              background: #5b9bd5;
              color: #ffffff;
              font-size: 13.5px;
              font-weight: 700;
              text-align: center;
            }
            .summary-table th.th-empower {
              background: #8b6fc0;
              color: #ffffff;
              font-size: 13.5px;
              font-weight: 700;
              text-align: center;
            }
            .env-header-row td {
              background: #eef3fb;
              border-top: 3px solid #5b9bd5;
            }
            .sub-instruction {
              font-size: 11px;
              color: #5c6f8c;
              font-weight: normal;
            }
            .columns-header-row th {
              background: #eaf3fc;
              color: #2b4c73;
              font-weight: 700;
              font-size: 12.5px;
              text-align: center;
            }
            .th-sub {
              font-weight: 400;
              font-size: 10.5px;
              display: block;
              color: #4f6585;
            }
            .doc-footer-section {
              margin-top: 14px;
              page-break-inside: avoid;
            }
            .recommendations-box {
              border: 1.5px solid #5b9bd5;
              background: #eef3fb;
              border-radius: 8px;
              padding: 10px 12px;
              min-height: 46px;
              margin-bottom: 18px;
              white-space: pre-line;
            }
            .signatures-row {
              display: flex;
              justify-content: space-between;
              margin-top: 22px;
              font-weight: 600;
              color: #2b4c73;
            }
          </style>
        </head>
        <body>
          <div class="stained-glass-strip"></div>
          <div class="print-banner">
            <div class="doc-meta-side"><strong>תאריך:</strong> ${formData.date || '__________'}</div>
            <div class="print-banner-center">
              <img src="${logoUrl}" alt="TALA Logo" class="print-logo" />
              <h1 class="doc-main-title">${fullDocTitle}</h1>
            </div>
            <div class="doc-meta-side"><strong>שנת לימודים:</strong> ${formData.schoolYear || '__________'}</div>
          </div>

          <div class="student-details-bar">
            <div><strong>שם הילד/ה:</strong> ${displayName}</div>
            <div><strong>ת.ז:</strong> ${displayId}</div>
            <div><strong>ת.ל:</strong> ${displayBirthDate}</div>
            <div><strong>מסגרת חינוכית:</strong> ${displayFramework}</div>
            ${formData.planType ? `<div><strong>סוג תוכנית:</strong> ${formData.planType}</div>` : ''}
            ${formData.address ? `<div><strong>כתובת:</strong> ${displayAddress}</div>` : ''}
            ${formData.phone ? `<div><strong>טלפון:</strong> ${displayPhone}</div>` : ''}
          </div>

          <!-- Top Summary Table: Strengths -->
          <table class="eco-table summary-table">
            <thead>
              <tr>
                <th class="th-existing" style="width: 50%;">מוקדי כוח: כוחות קיימים</th>
                <th class="th-empower" style="width: 50%;">כוחות להעצמה וחיזוק</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>${getRedactedText(formData.strengthsExisting)}</td>
                <td>${getRedactedText(formData.strengthsToEmpower)}</td>
              </tr>
            </tbody>
          </table>

          <!-- Goal Blocks -->
          ${goalsRowsHtml}

          <!-- Footer: Recommendations & Signatures -->
          <div class="doc-footer-section">
            <div class="recommendations-box">
              <strong>המלצות:</strong><br/>
              ${getRedactedText(formData.recommendations)}
            </div>
            <div class="signatures-row">
              <div>חתימת צוות חינוכי: _________________________</div>
              <div>חתימת הורים: _________________________</div>
            </div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 400);
  };

  // === Build & Download Official Word (.doc / .docx compatible) Document for תל"א ===
  const getSafeReportFilename = (ext = 'doc', mode = 'tala') => {
    const displayName = getDisplayStudentName().replace(/[^a-zA-Z0-9א-ת_-]/g, '_');
    const yearStr = (formData.schoolYear || '2026').replace(/[^a-zA-Z0-9א-ת_-]/g, '_');
    const prefix = mode === 'eval' ? 'דוח_הערכת_מחצית_וסוף_שנה' : 'תוכנית_עבודה';
    return `${prefix}_${displayName}_${yearStr}.${ext}`;
  };

  const buildWordDocumentHtml = () => {
    const displayName = getDisplayStudentName();
    const displayId = getDisplayMaskedField(formData.idNumber);
    const displayBirthDate = getDisplayMaskedField(formData.birthDate);
    const displayFramework = hideStudentDetailsOnPrint
      ? maskSensitiveValue(formData.educationalFramework)
      : formData.educationalFramework || '__________';
    const displayAddress = getDisplayMaskedField(formData.address);
    const displayPhone = getDisplayMaskedField(formData.phone);
    const fullDocTitle = getFullDocTitle();

    const goalsRowsHtml = (formData.goals || [])
      .map((g) => {
        const activityText = (getRedactedText(g.activityParticipation) || '').replace(/\n/g, '<br/>');
        const titleText = (getRedactedText(g.title) || '').replace(/\n/g, '<br/>');
        const objectivesText = (getRedactedText(g.objectives) || '').replace(/\n/g, '<br/>');
        const opportunitiesText = (getRedactedText(g.opportunities) || '').replace(/\n/g, '<br/>');
        const partnersText = (getRedactedText(g.partners) || '').replace(/\n/g, '<br/>');
        const durationText = (getRedactedText(g.duration) || '').replace(/\n/g, '<br/>');
        const evaluationText = (getRedactedText(g.evaluationCriteria) || '').replace(/\n/g, '<br/>');

        return `
          <table dir="rtl" border="1" cellspacing="0" cellpadding="6" style="width:100%; border-collapse:collapse; border:1px solid #7997be; margin-bottom:14pt; font-family: Arial, sans-serif; font-size: 10.5pt;">
            <tr style="background-color:#eef3fb;">
              <td colspan="6" style="border:1px solid #7997be; padding:8pt; text-align:right;">
                <div><strong>סביבה:</strong> ${g.environment || '__________'}</div>
                <div style="margin-top:4pt;"><strong>פעילות והשתתפות:</strong> ${activityText}</div>
              </td>
            </tr>
            <tr style="background-color:#eaf3fc; color:#2b4c73; font-weight:bold; text-align:center;">
              <th style="width:18%; border:1px solid #7997be; padding:6pt;">מטרה</th>
              <th style="width:22%; border:1px solid #7997be; padding:6pt;">יעדים, ציוני דרך</th>
              <th style="width:24%; border:1px solid #7997be; padding:6pt;">הזדמנויות, אמצעים</th>
              <th style="width:13%; border:1px solid #7997be; padding:6pt;">שותפים</th>
              <th style="width:9%; border:1px solid #7997be; padding:6pt;">משך</th>
              <th style="width:14%; border:1px solid #7997be; padding:6pt;">אמות מידה להערכה</th>
            </tr>
            <tr>
              <td style="border:1px solid #7997be; padding:6pt; font-weight:bold; color:#0d2b56; vertical-align:top; text-align:right;">${titleText}</td>
              <td style="border:1px solid #7997be; padding:6pt; vertical-align:top; text-align:right;">${objectivesText}</td>
              <td style="border:1px solid #7997be; padding:6pt; vertical-align:top; text-align:right;">${opportunitiesText}</td>
              <td style="border:1px solid #7997be; padding:6pt; vertical-align:top; text-align:right;">${partnersText}</td>
              <td style="border:1px solid #7997be; padding:6pt; vertical-align:top; text-align:right;">${durationText}</td>
              <td style="border:1px solid #7997be; padding:6pt; vertical-align:top; text-align:right;">${evaluationText}</td>
            </tr>
          </table>
        `;
      })
      .join('');

    const strengthsExistingHtml = (getRedactedText(formData.strengthsExisting) || '').replace(/\n/g, '<br/>');
    const strengthsToEmpowerHtml = (getRedactedText(formData.strengthsToEmpower) || '').replace(/\n/g, '<br/>');
    const recommendationsHtml = (getRedactedText(formData.recommendations) || '').replace(/\n/g, '<br/>');

    return `
      <html xmlns:o="urn:schemas-microsoft-com:office:office"
            xmlns:w="urn:schemas-microsoft-com:office:word"
            xmlns="http://www.w3.org/TR/REC-html40"
            lang="he" dir="rtl">
      <head>
        <meta charset="utf-8" />
        <title>${fullDocTitle} - ${displayName}</title>
        <!--[if gte mso 9]>
        <xml>
          <w:WordDocument>
            <w:View>Print</w:View>
            <w:Zoom>100</w:Zoom>
            <w:DoNotOptimizeForBrowser/>
          </w:WordDocument>
        </xml>
        <![endif]-->
        <style>
          @page WordSection1 {
            size: 841.9pt 595.3pt;
            mso-page-orientation: landscape;
            margin: 36.0pt 36.0pt 36.0pt 36.0pt;
          }
          div.WordSection1 { page: WordSection1; direction: rtl; text-align: right; font-family: Arial, sans-serif; }
        </style>
      </head>
      <body lang="he" dir="rtl" style="direction:rtl; text-align:right; font-family:Arial, sans-serif; color:#243b47;">
        <div class="WordSection1" dir="rtl">
          <div style="background-color:#3b6ea5; color:#ffffff; padding:12pt 16pt; margin-bottom:10pt; text-align:center;">
            <h1 style="margin:0; font-size:16pt;">${fullDocTitle}</h1>
            <div style="font-size:10.5pt; margin-top:4pt;">
              <strong>תאריך:</strong> ${formData.date || '__________'} &nbsp;|&nbsp;
              <strong>שנת לימודים:</strong> ${formData.schoolYear || '__________'}
            </div>
          </div>

          <div style="background-color:#eef3fb; border:1px solid #5b9bd5; padding:8pt 12pt; margin-bottom:12pt; font-size:11pt;">
            <strong>שם הילד/ה:</strong> ${displayName} &nbsp;&nbsp;|&nbsp;&nbsp;
            <strong>ת.ז:</strong> ${displayId} &nbsp;&nbsp;|&nbsp;&nbsp;
            <strong>ת.ל:</strong> ${displayBirthDate} &nbsp;&nbsp;|&nbsp;&nbsp;
            <strong>מסגרת חינוכית:</strong> ${displayFramework}
            ${formData.address ? ` &nbsp;&nbsp;|&nbsp;&nbsp; <strong>כתובת:</strong> ${displayAddress}` : ''}
            ${formData.phone ? ` &nbsp;&nbsp;|&nbsp;&nbsp; <strong>טלפון:</strong> ${displayPhone}` : ''}
          </div>

          <table dir="rtl" border="1" cellspacing="0" cellpadding="8" style="width:100%; border-collapse:collapse; border:1px solid #7997be; margin-bottom:14pt; font-family:Arial, sans-serif; font-size:10.5pt;">
            <tr>
              <th style="width:50%; background-color:#5b9bd5; color:#ffffff; border:1px solid #7997be; padding:6pt; text-align:center;">מוקדי כוח: כוחות קיימים</th>
              <th style="width:50%; background-color:#8b6fc0; color:#ffffff; border:1px solid #7997be; padding:6pt; text-align:center;">כוחות להעצמה וחיזוק</th>
            </tr>
            <tr>
              <td style="border:1px solid #7997be; padding:8pt; vertical-align:top; text-align:right;">${strengthsExistingHtml}</td>
              <td style="border:1px solid #7997be; padding:8pt; vertical-align:top; text-align:right;">${strengthsToEmpowerHtml}</td>
            </tr>
          </table>

          ${goalsRowsHtml}

          <div style="background-color:#eef3fb; border:1px solid #5b9bd5; padding:8pt 12pt; margin-top:12pt; margin-bottom:18pt; font-size:10.5pt;">
            <strong>המלצות:</strong><br/>
            ${recommendationsHtml}
          </div>

          <table dir="rtl" border="0" style="width:100%; margin-top:18pt; font-weight:bold; color:#2b4c73; font-size:11pt;">
            <tr>
              <td style="width:50%; text-align:right;">חתימת צוות חינוכי: _________________________</td>
              <td style="width:50%; text-align:left;">חתימת הורים: _________________________</td>
            </tr>
          </table>
        </div>
      </body>
      </html>
    `;
  };

  // === Build & Print Separate Evaluation Report (דוח הערכת מחצית / סוף שנה) ===
  const buildEvalWordDocumentHtml = () => {
    const displayName = getDisplayStudentName();
    const displayId = getDisplayMaskedField(formData.idNumber);
    const displayBirthDate = getDisplayMaskedField(formData.birthDate);
    const displayFramework = hideStudentDetailsOnPrint
      ? maskSensitiveValue(formData.educationalFramework)
      : formData.educationalFramework || '__________';
    const displayAddress = getDisplayMaskedField(formData.address);
    const displayPhone = getDisplayMaskedField(formData.phone);
    const evalDocTitle = getEvalReportTitle();
    const evalSummaryHtml = (getRedactedText(formData.evalReportSummary) || '').replace(/\n/g, '<br/>');
    const recommendationsHtml = (getRedactedText(formData.recommendations) || '').replace(/\n/g, '<br/>');

    const evalGoalsRowsHtml = (formData.goals || [])
      .map((g, idx) => {
        const titleText = (getRedactedText(g.title) || '').replace(/\n/g, '<br/>');
        const objectivesText = (getRedactedText(g.objectives) || '').replace(/\n/g, '<br/>');
        const midEvalText = (getRedactedText(g.midYearEvaluation) || '').replace(/\n/g, '<br/>');
        const endEvalText = (getRedactedText(g.endYearEvaluation) || '').replace(/\n/g, '<br/>');
        const statusText = g.achievementStatus || 'בתהליך';

        return `
          <tr>
            <td style="border:1px solid #7997be; padding:6pt; font-weight:bold; background-color:#f8faff; vertical-align:top; text-align:right;">
              ${idx + 1}. ${g.environment || '__________'}
            </td>
            <td style="border:1px solid #7997be; padding:6pt; vertical-align:top; text-align:right;">
              <div style="font-weight:bold; color:#0d2b56;">${titleText}</div>
              ${objectivesText ? `<div style="margin-top:4pt; font-size:9.5pt; color:#334155;">${objectivesText}</div>` : ''}
            </td>
            <td style="border:1px solid #7997be; padding:6pt; font-weight:bold; color:#4c1d95; vertical-align:top; text-align:center;">
              ${statusText}
            </td>
            <td style="border:1px solid #7997be; padding:6pt; vertical-align:top; text-align:right;">
              ${midEvalText || '—'}
            </td>
            <td style="border:1px solid #7997be; padding:6pt; vertical-align:top; text-align:right;">
              ${endEvalText || '—'}
            </td>
          </tr>
        `;
      })
      .join('');

    return `
      <html xmlns:o="urn:schemas-microsoft-com:office:office"
            xmlns:w="urn:schemas-microsoft-com:office:word"
            xmlns="http://www.w3.org/TR/REC-html40"
            lang="he" dir="rtl">
      <head>
        <meta charset="utf-8" />
        <title>${evalDocTitle} - ${displayName}</title>
        <!--[if gte mso 9]>
        <xml>
          <w:WordDocument>
            <w:View>Print</w:View>
            <w:Zoom>100</w:Zoom>
            <w:DoNotOptimizeForBrowser/>
          </w:WordDocument>
        </xml>
        <![endif]-->
        <style>
          @page WordSection1 {
            size: 841.9pt 595.3pt;
            mso-page-orientation: landscape;
            margin: 36.0pt 36.0pt 36.0pt 36.0pt;
          }
          div.WordSection1 { page: WordSection1; direction: rtl; text-align: right; font-family: Arial, sans-serif; }
        </style>
      </head>
      <body lang="he" dir="rtl" style="direction:rtl; text-align:right; font-family:Arial, sans-serif; color:#243b47;">
        <div class="WordSection1" dir="rtl">
          <div style="background-color:#4e4376; color:#ffffff; padding:12pt 16pt; margin-bottom:10pt; text-align:center;">
            <h1 style="margin:0; font-size:16pt;">${evalDocTitle}</h1>
            <div style="font-size:10.5pt; margin-top:4pt;">
              <strong>תאריך:</strong> ${formData.date || '__________'} &nbsp;|&nbsp;
              <strong>שנת לימודים:</strong> ${formData.schoolYear || '__________'}
            </div>
          </div>

          <div style="background-color:#eef3fb; border:1px solid #5b9bd5; padding:8pt 12pt; margin-bottom:12pt; font-size:11pt;">
            <strong>שם הילד/ה:</strong> ${displayName} &nbsp;&nbsp;|&nbsp;&nbsp;
            <strong>ת.ז:</strong> ${displayId} &nbsp;&nbsp;|&nbsp;&nbsp;
            <strong>ת.ל:</strong> ${displayBirthDate} &nbsp;&nbsp;|&nbsp;&nbsp;
            <strong>מסגרת חינוכית:</strong> ${displayFramework}
            ${formData.address ? ` &nbsp;&nbsp;|&nbsp;&nbsp; <strong>כתובת:</strong> ${displayAddress}` : ''}
            ${formData.phone ? ` &nbsp;&nbsp;|&nbsp;&nbsp; <strong>טלפון:</strong> ${displayPhone}` : ''}
          </div>

          ${
            evalSummaryHtml
              ? `
          <div style="background-color:#f5f3ff; border:1px solid #8b6fc0; padding:8pt 12pt; margin-bottom:12pt; font-size:10.5pt;">
            <strong>סיכום תפקוד והתקדמות תקופתית:</strong><br/>
            ${evalSummaryHtml}
          </div>`
              : ''
          }

          <table dir="rtl" border="1" cellspacing="0" cellpadding="6" style="width:100%; border-collapse:collapse; border:1px solid #7997be; margin-bottom:14pt; font-family: Arial, sans-serif; font-size: 10.5pt;">
            <tr style="background-color:#5b9bd5; color:#ffffff; font-weight:bold; text-align:center;">
              <th style="width:15%; border:1px solid #7997be; padding:6pt;">סביבה / תחום</th>
              <th style="width:25%; border:1px solid #7997be; padding:6pt;">מטרה ויעדים</th>
              <th style="width:12%; border:1px solid #7997be; padding:6pt;">סטטוס השגת המטרה</th>
              <th style="width:24%; border:1px solid #7997be; padding:6pt;">הערכת מחצית</th>
              <th style="width:24%; border:1px solid #7997be; padding:6pt;">הערכת סוף שנה</th>
            </tr>
            ${evalGoalsRowsHtml}
          </table>

          ${
            recommendationsHtml
              ? `
          <div style="background-color:#eef3fb; border:1px solid #5b9bd5; padding:8pt 12pt; margin-top:12pt; margin-bottom:18pt; font-size:10.5pt;">
            <strong>המלצות להמשך:</strong><br/>
            ${recommendationsHtml}
          </div>`
              : ''
          }

          <table dir="rtl" border="0" style="width:100%; margin-top:18pt; font-weight:bold; color:#2b4c73; font-size:11pt;">
            <tr>
              <td style="width:50%; text-align:right;">חתימת צוות חינוכי: _________________________</td>
              <td style="width:50%; text-align:left;">חתימת הורים: _________________________</td>
            </tr>
          </table>
        </div>
      </body>
      </html>
    `;
  };

  const handlePrintEvalReport = () => {
    handleSaveProgress();

    const displayName = getDisplayStudentName();
    const displayId = getDisplayMaskedField(formData.idNumber);
    const displayBirthDate = getDisplayMaskedField(formData.birthDate);
    const displayFramework = hideStudentDetailsOnPrint
      ? maskSensitiveValue(formData.educationalFramework)
      : formData.educationalFramework || '__________';
    const displayAddress = getDisplayMaskedField(formData.address);
    const displayPhone = getDisplayMaskedField(formData.phone);
    const evalDocTitle = getEvalReportTitle();
    const logoUrl = new URL('./tala-logo.png', window.location.href).href;

    const evalRowsHtml = (formData.goals || [])
      .map((g, idx) => {
        const titleText = getRedactedText(g.title);
        const objectivesText = getRedactedText(g.objectives);
        const midEvalText = getRedactedText(g.midYearEvaluation);
        const endEvalText = getRedactedText(g.endYearEvaluation);
        const statusText = g.achievementStatus || 'בתהליך';

        return `
          <tr>
            <td style="font-weight: 700; background: #f8faff; color: #1e3a5f;">${idx + 1}. ${g.environment || '__________'}</td>
            <td>
              <div style="font-weight: 700; color: #0d2b56;">${titleText || ''}</div>
              ${objectivesText ? `<div style="margin-top: 4px; font-size: 11.5px; color: #334155;">${objectivesText}</div>` : ''}
            </td>
            <td style="font-weight: 700; color: #5b21b6; text-align: center;">${statusText}</td>
            <td>${midEvalText || '—'}</td>
            <td>${endEvalText || '—'}</td>
          </tr>
        `;
      })
      .join('');

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      window.print();
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="he" dir="rtl">
        <head>
          <meta charset="utf-8" />
          <title>${evalDocTitle.replace(/\s+/g, '_')}_${displayName}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Rubik:wght@300;400;500;600;700&display=swap');
            @page {
              size: A4 landscape;
              margin: 10mm;
            }
            body {
              font-family: 'Rubik', Arial, sans-serif;
              direction: rtl;
              text-align: right;
              color: #243b47;
              background: #f6f5f0;
              margin: 0;
              padding: 0;
              font-size: 12.5px;
              line-height: 1.5;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .stained-glass-strip {
              height: 6px;
              width: 100%;
              background: linear-gradient(90deg, #7ec8e3 0%, #64a8e0 25%, #8b80d6 50%, #a98eda 75%, #c5aef2 100%);
              border-radius: 6px 6px 0 0;
            }
            .print-banner {
              background: linear-gradient(135deg, #3b6ea5 0%, #5b9bd5 50%, #8e7cc3 100%);
              color: #ffffff;
              padding: 14px 20px;
              border-bottom: 4px solid #c5aef2;
              border-radius: 0 0 10px 10px;
              display: flex;
              align-items: center;
              justify-content: space-between;
              margin-bottom: 12px;
            }
            .print-banner-center {
              display: flex;
              align-items: center;
              gap: 14px;
            }
            .print-logo {
              width: 56px;
              height: 56px;
              border-radius: 50%;
              object-fit: cover;
              border: 2px solid #d6c6f7;
              background: #f4f7fc;
            }
            .doc-main-title {
              margin: 0;
              font-size: 19px;
              font-weight: 700;
              color: #ffffff;
            }
            .doc-meta-side {
              font-size: 12.5px;
              color: #f5f0ff;
            }
            .student-details-bar {
              display: flex;
              flex-wrap: wrap;
              gap: 20px;
              padding: 10px 14px;
              border: 1.5px solid #5b9bd5;
              border-right: 5px solid #8b6fc0;
              background: #eef3fb;
              border-radius: 8px;
              margin-bottom: 14px;
              font-size: 13px;
            }
            .summary-box {
              border: 1.5px solid #8b6fc0;
              background: #f5f3ff;
              border-radius: 8px;
              padding: 10px 14px;
              margin-bottom: 14px;
              white-space: pre-line;
            }
            .eco-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 15px;
              background: #ffffff;
            }
            .eco-table th, .eco-table td {
              border: 1.5px solid #7997be;
              padding: 8px 10px;
              vertical-align: top;
              text-align: right;
              white-space: pre-line;
            }
            .eco-table thead th {
              background: linear-gradient(135deg, #3b6ea5 0%, #6b46c1 100%);
              color: #ffffff;
              font-weight: 700;
              font-size: 13px;
              text-align: center;
            }
            .recommendations-box {
              border: 1.5px solid #5b9bd5;
              background: #eef3fb;
              border-radius: 8px;
              padding: 10px 12px;
              min-height: 42px;
              margin-bottom: 18px;
              white-space: pre-line;
            }
            .signatures-row {
              display: flex;
              justify-content: space-between;
              margin-top: 22px;
              font-weight: 600;
              color: #2b4c73;
            }
          </style>
        </head>
        <body>
          <div class="stained-glass-strip"></div>
          <div class="print-banner">
            <div class="doc-meta-side"><strong>תאריך:</strong> ${formData.date || '__________'}</div>
            <div class="print-banner-center">
              <img src="${logoUrl}" alt="TALA Logo" class="print-logo" />
              <h1 class="doc-main-title">${evalDocTitle}</h1>
            </div>
            <div class="doc-meta-side"><strong>שנת לימודים:</strong> ${formData.schoolYear || '__________'}</div>
          </div>

          <div class="student-details-bar">
            <div><strong>שם הילד/ה:</strong> ${displayName}</div>
            <div><strong>ת.ז:</strong> ${displayId}</div>
            <div><strong>ת.ל:</strong> ${displayBirthDate}</div>
            <div><strong>מסגרת חינוכית:</strong> ${displayFramework}</div>
            ${formData.planType ? `<div><strong>סוג תוכנית:</strong> ${formData.planType}</div>` : ''}
            ${formData.address ? `<div><strong>כתובת:</strong> ${displayAddress}</div>` : ''}
            ${formData.phone ? `<div><strong>טלפון:</strong> ${displayPhone}</div>` : ''}
          </div>

          ${
            formData.evalReportSummary
              ? `<div class="summary-box"><strong>סיכום תפקוד והתקדמות תקופתית:</strong><br/>${getRedactedText(formData.evalReportSummary)}</div>`
              : ''
          }

          <table class="eco-table">
            <thead>
              <tr>
                <th style="width: 15%;">סביבה / תחום</th>
                <th style="width: 25%;">מטרה ויעדים</th>
                <th style="width: 12%;">סטטוס השגת המטרה</th>
                <th style="width: 24%;">הערכת מחצית</th>
                <th style="width: 24%;">הערכת סוף שנה</th>
              </tr>
            </thead>
            <tbody>
              ${evalRowsHtml}
            </tbody>
          </table>

          <div class="recommendations-box">
            <strong>המלצות להמשך:</strong><br/>
            ${getRedactedText(formData.recommendations)}
          </div>
          <div class="signatures-row">
            <div>חתימת צוות חינוכי: _________________________</div>
            <div>חתימת הורים: _________________________</div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 400);
  };

  const createWordBlob = (mode = 'tala') => {
    const wordHtml = mode === 'eval' ? buildEvalWordDocumentHtml() : buildWordDocumentHtml();
    const blob = new Blob(['\ufeff', wordHtml], {
      type: 'application/msword;charset=utf-8'
    });
    const filename = getSafeReportFilename('doc', mode);
    return { blob, filename, mimeType: 'application/msword', htmlContent: wordHtml };
  };

  const downloadWordFile = (mode = 'tala') => {
    const { blob, filename } = createWordBlob(mode);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    return { blob, filename };
  };

  const createPdfBlob = async (mode = 'tala') => {
    const filename = getSafeReportFilename('pdf', mode);
    const reportHtml = mode === 'eval' ? buildEvalWordDocumentHtml() : buildWordDocumentHtml();
    const blob = await generatePdfBlobFromHtml(reportHtml, filename);
    return { blob, filename, mimeType: 'application/pdf', htmlContent: reportHtml };
  };

  const downloadPdfFileDirectly = async (mode = 'tala') => {
    const { blob, filename } = await createPdfBlob(mode);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    return { blob, filename };
  };

  const handleOpenEmailModal = (mode = 'tala') => {
    // Ensure report is saved before opening the Send to Email modal
    handleSaveProgress();
    setEmailReportMode(mode === 'eval' ? 'eval' : 'tala');
    setEmailError('');
    setEmailStatusMsg('');
    const currentCfg = emailEngineConfig || loadEmailEngineConfig();
    setLocalEngineDraft(currentCfg);
    setShowEngineSetupInModal(!isDirectEmailEngineConfigured(currentCfg));
    setShowEmailModal(true);
  };

  const handleSaveEngineConfigInModal = () => {
    setEmailError('');
    if (onUpdateEmailEngineConfig) {
      onUpdateEmailEngineConfig(localEngineDraft);
    }
    if (isDirectEmailEngineConfigured(localEngineDraft)) {
      setShowEngineSetupInModal(false);
      setEmailStatusMsg('מנוע שליחת המייל הישיר הוגדר ונשמר בענן בהצלחה! כעת ניתן לשלוח דוחות בלחיצת כפתור.');
    } else {
      setEmailError('נא להזין כתובת Web App URL תקינה של Google Apps Script (המתחילה ב-https://script.google.com/) או פרטי EmailJS מלאים.');
    }
  };

  const handleCopyAppsScriptCode = () => {
    navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_TEMPLATE);
    setCopiedAppsScript(true);
    setTimeout(() => setCopiedAppsScript(false), 2500);
  };

  const handleSendReportByEmail = async (e) => {
    e.preventDefault();
    setEmailError('');
    setEmailStatusMsg('');

    const trimmedEmail = emailRecipient.trim();
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setEmailError('נא להזין כתובת אימייל תקינה של הנמען (למשל: name@example.com).');
      return;
    }

    const activeEngineCfg = isDirectEmailEngineConfigured(localEngineDraft)
      ? localEngineDraft
      : emailEngineConfig || loadEmailEngineConfig();

    if (!isDirectEmailEngineConfigured(activeEngineCfg)) {
      setShowEngineSetupInModal(true);
      setEmailError(
        'כדי לשלוח את המייל והקובץ המצורף ישירות ברקע (ללא פתיחת תוכנת מייל במחשב), יש להשלים הגדרה חד-פעמית קצרה של מנוע השליחה למטה.'
      );
      return;
    }

    // Save latest progress & engine config if updated
    handleSaveProgress();
    if (onUpdateEmailEngineConfig) {
      onUpdateEmailEngineConfig(activeEngineCfg);
    }

    setIsSendingEmail(true);
    try {
      const displayName = getDisplayStudentName();
      const activeMode = emailReportMode === 'eval' ? 'eval' : 'tala';
      const fullDocTitle = activeMode === 'eval' ? getEvalReportTitle() : getFullDocTitle();
      const formatLabel = emailFormat === 'docx' ? 'Word (DOCX/DOC)' : 'PDF';
      const subject = `${fullDocTitle} – ${displayName} (${formData.schoolYear || ''})`;

      let attachmentInfo;
      if (emailFormat === 'docx') {
        attachmentInfo = createWordBlob(activeMode);
      } else {
        attachmentInfo = await createPdfBlob(activeMode);
      }

      const textBody = [
        'שלום רב,',
        '',
        `מצורף ${fullDocTitle} עבור ${displayName} לשנת הלימודים ${formData.schoolYear || ''} בפורמט ${formatLabel}.`,
        hideStudentDetailsOnPrint
          ? '(המסמך הופק במצב הגנת פרטיות – ראשי תיבות והשחרת פרטים מזהים).'
          : '',
        '',
        'בברכה,',
        activeEngineCfg.senderName || 'מערכת TALA – תוכנית עבודה אקולוגית'
      ]
        .filter(Boolean)
        .join('\r\n');

      const emailHtmlWrapper = `
        <div dir="rtl" style="font-family: Arial, sans-serif; color: #1e293b; line-height: 1.6; text-align: right;">
          <p>שלום רב,</p>
          <p>מצורף <strong>${fullDocTitle}</strong> עבור <strong>${displayName}</strong> לשנת הלימודים <strong>${formData.schoolYear || ''}</strong> בקובץ מצורף (<strong>${attachmentInfo.filename}</strong>).</p>
          ${
            hideStudentDetailsOnPrint
              ? '<p style="color: #4c1d95; font-size: 12px;">🔒 המסמך הופק במצב הגנת פרטיות (ראשי תיבות והשחרת פרטים מזהים).</p>'
              : ''
          }
          <hr style="border: none; border-top: 1px solid #cbd5e1; margin: 16px 0;" />
          ${attachmentInfo.htmlContent}
        </div>
      `;

      await sendReportEmailInBackground({
        config: activeEngineCfg,
        toEmail: trimmedEmail,
        subject,
        htmlBody: emailHtmlWrapper,
        textBody,
        attachmentBlob: attachmentInfo.blob,
        filename: attachmentInfo.filename,
        mimeType: attachmentInfo.mimeType
      });

      setEmailStatusMsg(
        `✅ המייל נשלח בהצלחה ברקע אל ${trimmedEmail} יחד עם הקובץ המצורף (${attachmentInfo.filename})!`
      );
    } catch (err) {
      console.error('Direct background email send error:', err);
      setEmailError(
        `שגיאה בשליחת המייל ברקע: ${err?.message || 'בדוק את חיבור האינטרנט או את הגדרת מנוע המייל.'}`
      );
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleTextareaAutoResize = (e) => {
    const ta = e.currentTarget;
    ta.style.overflowY = 'hidden';
    ta.style.height = 'auto';
    const isGoalTableCell = Boolean(ta.closest('.ecological-6col-table'));
    const minH = isGoalTableCell ? 175 : 88;
    ta.style.height = `${Math.max(ta.scrollHeight + 10, minH)}px`;
  };

  return (
    <div className="workplan-form-container" dir="rtl" ref={containerRef}>
      {/* Sticky Top Action & Print Privacy Toolbar */}
      <div className="sticky-action-bar">
        <div className="action-bar-right">
          <button type="button" className="btn-save-progress" onClick={handleSaveProgress}>
            <Save size={17} />
            <span>שמור התקדמות</span>
          </button>

          {saveBanner && (
            <span className="save-toast-badge">
              <Check size={14} />
              <span>נשמר בהצלחה!</span>
            </span>
          )}

          {(autoSavedTime || formData.lastSavedAt) && !saveBanner && (
            <span className="last-saved-hint">
              {autoSavedTime ? `נשמר אוטומטית: ${autoSavedTime}` : `שמירה אחרונה: ${formData.lastSavedAt}`}
            </span>
          )}
        </div>

        <div className="action-bar-left">
          {/* Privacy Redaction Checkbox (Default Checked) */}
          <label
            className={`privacy-checkbox-label ${hideStudentDetailsOnPrint ? 'checked' : 'unchecked'}`}
            title="כאשר מסומן, בהדפסה יוצגו ראשי תיבות במקום שם הילד ויושחרו ת.ז, ת.ל, כתובת וטלפון"
          >
            <input
              type="checkbox"
              checked={hideStudentDetailsOnPrint}
              onChange={(e) => setHideStudentDetailsOnPrint(e.target.checked)}
            />
            {hideStudentDetailsOnPrint ? <EyeOff size={16} /> : <Eye size={16} />}
            <span>
              הסתר פרטים מזהים בהדפסה
            </span>
          </label>

          <button
            type="button"
            className="btn-preview-doc"
            onClick={() => setShowFullDocPreview(!showFullDocPreview)}
          >
            <FileText size={16} />
            <span>{showFullDocPreview ? 'הסתר תצוגת טבלה מלאה' : 'תצוגת מסמך מלאה'}</span>
          </button>

          <button type="button" className="btn-print-doc" onClick={handlePrintDocument}>
            <Printer size={17} />
            <span>הדפס תוכנית עבודה</span>
          </button>

          <button
            type="button"
            className="btn-send-email-doc"
            onClick={handleOpenEmailModal}
            title={
              formData.lastSavedAt
                ? 'שלח את תוכנית העבודה במייל בפורמט Word או PDF'
                : 'שמור ושלח את תוכנית העבודה במייל בפורמט Word או PDF'
            }
          >
            <Mail size={17} />
            <span>שלח למייל</span>
          </button>
        </div>
      </div>

      {/* Document Title Banner */}
      <div className="document-title-card">
        <div className="doc-title-top-row">
          <div className="inline-meta-field">
            <label>תאריך:</label>
            <input
              type="text"
              value={formData.date || ''}
              onChange={(e) => handleFieldChange('date', e.target.value)}
              placeholder="למשל: 01/10/2026"
            />
          </div>
          <div className="doc-banner-center-brand">
            <img src="./tala-logo.png" alt="TALA Emblem" className="doc-banner-logo" />
            <h2 className="main-ecological-heading">
              {getFullDocTitle()}
            </h2>
          </div>
          <div className="inline-meta-field" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <label>שנת לימודים:</label>
            <select
              value={formData.schoolYear || 'תשפ"ו (2025-2026)'}
              onChange={(e) => handleSchoolYearChange(e.target.value)}
              title="בחר שנת לימודים להצגה או ליצירת דו״ח חדש לתלמיד/ה עבור שנה זו"
            >
              {!SCHOOL_YEARS_LIST.includes(formData.schoolYear || 'תשפ"ו (2025-2026)') && (
                <option value={formData.schoolYear}>
                  {formData.schoolYear}
                </option>
              )}
              {SCHOOL_YEARS_LIST.map((yr) => {
                const isCurrent = yr === (formData.schoolYear || 'תשפ"ו (2025-2026)');
                const rep = isCurrent
                  ? extractYearReportFromFormData(formData)
                  : formData.reportsByYear?.[yr];
                const hasData = hasContentInYearReport(rep);
                return (
                  <option key={yr} value={yr} style={{ color: '#24344d', background: '#ffffff' }}>
                    {yr}{hasData ? ' • קיים דו"ח' : ''}
                  </option>
                );
              })}
            </select>
            {getNextSchoolYear(formData.schoolYear || 'תשפ"ו (2025-2026)') && (
              <button
                type="button"
                onClick={handleRolloverToNextYear}
                title="העתק מוקדי כוח ומטרות מתוכנית זו לשנת הלימודים הבאה"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  background: 'rgba(255, 255, 255, 0.18)',
                  color: '#ffffff',
                  border: '1px solid rgba(255, 255, 255, 0.45)',
                  borderRadius: '6px',
                  padding: '4px 9px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                <Calendar size={13} />
                <span>שכפל לשנה הבאה</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Section 1: Student Personal Details & Plan Type Radio Selector */}
      <section className="form-section-card">
        <div className="section-header-line" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          <h3>1. פרטים אישיים של הילד/ה ומסגרת חינוכית</h3>
          <button
            type="button"
            onClick={() => setShowShareModal(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: Array.isArray(formData.sharedWith) && formData.sharedWith.length > 0 ? '#ede9fe' : '#f1f5f9',
              color: Array.isArray(formData.sharedWith) && formData.sharedWith.length > 0 ? '#5b21b6' : '#334155',
              border: Array.isArray(formData.sharedWith) && formData.sharedWith.length > 0 ? '1px solid #c4b5fd' : '1px solid #cbd5e1',
              borderRadius: '8px',
              padding: '6px 12px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            <Users size={15} />
            <span>
              שיתוף צוות
              {Array.isArray(formData.sharedWith) && formData.sharedWith.length > 0
                ? ` • ${formData.sharedWith.length}`
                : ''}
            </span>
          </button>
        </div>

        {/* Radio Buttons for תל"א OR תח"י */}
        <div className="plan-type-radio-bar">
          <span className="plan-type-label">סוג התוכנית:</span>
          <div className="plan-type-options">
            <label
              className={`plan-type-radio-card ${
                formData.planType === 'תל"א (תוכנית לימודים אישית)' ? 'selected' : ''
              }`}
            >
              <input
                type="radio"
                name="planType"
                value='תל"א (תוכנית לימודים אישית)'
                checked={formData.planType === 'תל"א (תוכנית לימודים אישית)'}
                onChange={(e) => handleFieldChange('planType', e.target.value)}
              />
              <span>תל"א – תוכנית לימודים אישית</span>
            </label>

            <label
              className={`plan-type-radio-card ${
                formData.planType === 'תח"י (תוכנית חינוכית יחידנית)' ? 'selected' : ''
              }`}
            >
              <input
                type="radio"
                name="planType"
                value='תח"י (תוכנית חינוכית יחידנית)'
                checked={formData.planType === 'תח"י (תוכנית חינוכית יחידנית)'}
                onChange={(e) => handleFieldChange('planType', e.target.value)}
              />
              <span>תח"י – תוכנית חינוכית יחידנית</span>
            </label>
          </div>
        </div>

        <div className="personal-details-grid">
          <div className="form-field">
            <label>שם הילד/ה:</label>
            <input
              type="text"
              value={formData.name === 'תלמיד/ה חדש/ה' ? '' : (formData.name || '')}
              onChange={(e) => handleFieldChange('name', e.target.value)}
              placeholder="שם פרטי ושם משפחה"
            />
          </div>

          <div className="form-field">
            <label>מין הילד/ה:</label>
            <div className="gender-radio-group" role="radiogroup" aria-label="מין הילד/ה">
              <label className={`gender-radio-option ${currentGender === 'boy' ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name="studentGender"
                  value="boy"
                  checked={currentGender === 'boy'}
                  onChange={() => handleGenderChange('boy')}
                />
                <span>בן</span>
              </label>
              <label className={`gender-radio-option ${currentGender === 'girl' ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name="studentGender"
                  value="girl"
                  checked={currentGender === 'girl'}
                  onChange={() => handleGenderChange('girl')}
                />
                <span>בת</span>
              </label>
            </div>
          </div>

          <div className="form-field">
            <label>ת.ז:</label>
            <input
              type="text"
              value={formData.idNumber || ''}
              onChange={(e) => handleFieldChange('idNumber', e.target.value)}
              placeholder="מספר תעודת זהות"
            />
          </div>

          <div className="form-field">
            <label>תאריך לידה:</label>
            <input
              type="text"
              value={formData.birthDate || ''}
              onChange={(e) => handleFieldChange('birthDate', e.target.value)}
              placeholder="DD/MM/YYYY"
            />
          </div>

          <div className="form-field">
            <label>מסגרת חינוכית:</label>
            <input
              type="text"
              value={formData.educationalFramework || ''}
              onChange={(e) => handleFieldChange('educationalFramework', e.target.value)}
              placeholder="שם הגן / בית הספר והכיתה"
            />
          </div>

          <div className="form-field">
            <label>כתובת מגורים:</label>
            <input
              type="text"
              value={formData.address || ''}
              onChange={(e) => handleFieldChange('address', e.target.value)}
              placeholder="רחוב, מספר, עיר"
            />
          </div>

          <div className="form-field">
            <label>טלפון הורים / איש קשר:</label>
            <input
              type="text"
              value={formData.phone || ''}
              onChange={(e) => handleFieldChange('phone', e.target.value)}
              placeholder="050-0000000"
            />
          </div>
        </div>
      </section>

      {/* Section 2: Teacher Free Text + עיבוד המידע Button + Top Summary Table */}
      <section className="form-section-card highlight-summary-section">
        <div className="section-header-line">
          <h3>2. תיאור חופשי של המורה וטבלת מוקדי כוח מסכמת</h3>
        </div>

        <div className="free-text-area-box">
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '8px',
              marginBottom: isFreeTextCollapsed ? 0 : '8px'
            }}
          >
            <label className="bold-label" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>✍️ תיאור חופשי של הילד/ה במילים שלך:</span>
              {isRawFreeTextAlreadyAnalyzed(formData) && (
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#5b21b6',
                    background: '#f3eefc',
                    border: '1px solid #d8b4fe',
                    borderRadius: '999px',
                    padding: '2px 10px'
                  }}
                >
                  ✓ עובד ב-AI
                </span>
              )}
            </label>

            {((formData.teacherFreeText || '').trim() || isRawFreeTextAlreadyAnalyzed(formData)) && (
              <button
                type="button"
                onClick={() => setIsFreeTextCollapsed((prev) => !prev)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  background: '#ffffff',
                  color: '#4c1d95',
                  border: '1px solid #c4b5fd',
                  borderRadius: '6px',
                  padding: '4px 10px',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                {isFreeTextCollapsed ? <ChevronDown size={15} /> : <ChevronUp size={15} />}
                <span>{isFreeTextCollapsed ? 'הצג / ערוך תיאור חופשי' : 'הסתר תיאור חופשי'}</span>
              </button>
            )}
          </div>

          {!isFreeTextCollapsed && (
            <>
              <textarea
                rows={4}
                value={formData.teacherFreeText || ''}
                onInput={handleTextareaAutoResize}
                onChange={(e) => handleFieldChange('teacherFreeText', e.target.value)}
                placeholder="הזיני כאן מידע גולמי וחופשי על התלמיד/ה... למשל: ילד נעים, חברותי וסקרן בעל יכולת ריכוז טובה, וורבלי ומלא אנרגיות. מתקשה במשחק משותף עם חברים ומשחק לידם באופן תבניתי, לא ניגש לשולחן הסדנא מיוזמתו ומתקשה בתכנון והתארגנות, וזקוק לתיווך בגמילה בשירותים ובוויסות רגשי..."
              />

              <div className="submit-summary-action-row">
                <span className="submit-helper-text">
                  לחיצה על "עיבוד המידע" תנתח ב-AI את הטקסט החופשי ותמלא אוטומטית את טבלת מוקדי הכוח, המטרות והיעדים ושאר סעיפי הטופס:
                </span>
                <button
                  type="button"
                  className="btn-submit-generate-summary"
                  onClick={handleReverseEngineerFullReport}
                  disabled={isReverseEngineering}
                >
                  <Sparkles size={17} />
                  <span>
                    {isReverseEngineering ? 'מעבד מידע ומייצר מטרות ודוח...' : 'עיבוד המידע'}
                  </span>
                </button>
              </div>
            </>
          )}

          {reverseEngineerBanner && (
            <div className="reverse-engineer-success-banner" style={{ marginTop: isFreeTextCollapsed ? '10px' : undefined }}>
              <CheckCircle2 size={18} />
              <span>{reverseEngineerBanner}</span>
            </div>
          )}
        </div>

        {/* Top Summary Table (Editable Two-Column Ecological Strengths Table) */}
        <div className="top-summary-table-wrapper">
          <table className="interactive-summary-table">
            <thead>
              <tr>
                <th>💪 מוקדי כוח: כוחות קיימים</th>
                <th>🌱 כוחות להעצמה וחיזוק</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td data-label="💪 מוקדי כוח: כוחות קיימים">
                  <textarea
                    rows={5}
                    value={formData.strengthsExisting || ''}
                    onInput={handleTextareaAutoResize}
                    onChange={(e) => handleFieldChange('strengthsExisting', e.target.value)}
                    placeholder="כוחות קיימים של הילד/ה..."
                  />
                </td>
                <td data-label="🌱 כוחות להעצמה וחיזוק">
                  <textarea
                    rows={5}
                    value={formData.strengthsToEmpower || ''}
                    onInput={handleTextareaAutoResize}
                    onChange={(e) => handleFieldChange('strengthsToEmpower', e.target.value)}
                    placeholder="כוחות להעצמה וחיזוק..."
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Optional Live Full Document Table Preview (Right at Top when toggled) */}
      {showFullDocPreview && (
        <section className="form-section-card live-print-preview-card">
          <div className="section-header-line" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <h3>📄 תצוגה מקדימה של המסמך המלא להדפסה</h3>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn-print-doc"
                onClick={() => downloadWordFile('tala')}
                title="הורד כקובץ Word ניתן לעריכה"
              >
                <Download size={16} />
                <span>הורד קובץ Word</span>
              </button>
              <button type="button" className="btn-print-doc" onClick={handlePrintDocument}>
                <Printer size={16} />
                <span>שלח להדפסה כעת</span>
              </button>
            </div>
          </div>

          <div className="preview-paper-sheet">
            <div className="stained-glass-top-strip" style={{ borderRadius: '6px 6px 0 0' }} />
            <div style={{ background: 'linear-gradient(135deg, #3b6ea5 0%, #5b9bd5 50%, #8e7cc3 100%)', color: '#fff', padding: '12px 18px', borderBottom: '3px solid #c5aef2', borderRadius: '0 0 8px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span style={{ fontSize: '12.5px' }}><strong>תאריך:</strong> {formData.date}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <img src="./tala-logo.png" alt="TALA Logo" style={{ width: '46px', height: '46px', borderRadius: '50%', border: '2px solid #d6c6f7', objectFit: 'cover' }} />
                <h4 style={{ margin: 0, fontSize: '17px', color: '#ffffff' }}>
                  {getFullDocTitle()}
                </h4>
              </div>
              <span style={{ fontSize: '12.5px' }}><strong>שנת לימודים:</strong> {formData.schoolYear}</span>
            </div>
            <div style={{ display: 'flex', gap: '18px', flexWrap: 'wrap', padding: '8px 12px', background: '#eef3fb', border: '1.5px solid #5b9bd5', borderRight: '4px solid #8b6fc0', borderRadius: '6px', marginBottom: '12px', fontSize: '13px' }}>
              <span><strong>שם הילד/ה:</strong> {getDisplayStudentName()}</span>
              <span><strong>מין:</strong> {currentGender === 'girl' ? 'בת' : 'בן'}</span>
              <span><strong>ת.ז:</strong> {getDisplayMaskedField(formData.idNumber)}</span>
              <span><strong>ת.ל:</strong> {getDisplayMaskedField(formData.birthDate)}</span>
              <span><strong>מסגרת חינוכית:</strong> {hideStudentDetailsOnPrint ? maskSensitiveValue(formData.educationalFramework) : formData.educationalFramework}</span>
              {formData.planType && <span><strong>סוג תוכנית:</strong> {formData.planType}</span>}
              {formData.address && <span><strong>כתובת:</strong> {getDisplayMaskedField(formData.address)}</span>}
              {formData.phone && <span><strong>טלפון:</strong> {getDisplayMaskedField(formData.phone)}</span>}
            </div>

            <table className="preview-doc-table">
              <thead>
                <tr>
                  <th style={{ width: '50%', background: '#5b9bd5', color: '#fff', textAlign: 'center' }}>מוקדי כוח: כוחות קיימים</th>
                  <th style={{ width: '50%', background: '#8b6fc0', color: '#fff', textAlign: 'center' }}>כוחות להעצמה וחיזוק</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>{getRedactedText(formData.strengthsExisting)}</td>
                  <td>{getRedactedText(formData.strengthsToEmpower)}</td>
                </tr>
              </tbody>
            </table>

            {(formData.goals || []).map((g) => (
              <table key={g.id} className="preview-doc-table" style={{ marginTop: '12px' }}>
                <tbody>
                  <tr style={{ background: '#eef3fb' }}>
                    <td colSpan={6}>
                      <strong>סביבה: {g.environment}</strong> | <strong>פעילות והשתתפות:</strong> {getRedactedText(g.activityParticipation)}
                    </td>
                  </tr>
                  <tr style={{ background: '#eaf3fc', color: '#2b4c73', fontWeight: 'bold' }}>
                    <td>מטרה</td>
                    <td>יעדים, ציוני דרך</td>
                    <td>הזדמנויות, אמצעים</td>
                    <td>שותפים</td>
                    <td>משך</td>
                    <td>אמות מידה להערכה</td>
                  </tr>
                  <tr>
                    <td><strong>{getRedactedText(g.title)}</strong></td>
                    <td>{getRedactedText(g.objectives)}</td>
                    <td>{getRedactedText(g.opportunities)}</td>
                    <td>{getRedactedText(g.partners)}</td>
                    <td>{getRedactedText(g.duration)}</td>
                    <td>{getRedactedText(g.evaluationCriteria)}</td>
                  </tr>
                </tbody>
              </table>
            ))}
          </div>
        </section>
      )}

      {/* Section 3: Ecological Goals & Environments Interactive Builder */}
      <section className="form-section-card">
        <div className="section-header-line">
          <div>
            <h3>3. הגדרת מטרות ויעדים לפי סביבות פעילות ותחומי תפקוד</h3>
            <p className="section-sub-desc">
              בחרי מטרה מתוך מאגר המטרות הדינמי או הקלידי מטרה חדשה.
            </p>
          </div>
          <button type="button" className="btn-add-goal-block" onClick={handleAddGoalRow}>
            <Plus size={18} />
            <span>הוסף מטרה / סביבה חדשה</span>
          </button>
        </div>

        <div className="goals-blocks-list">
          {(formData.goals || []).map((goalRow, index) => {
            const isPickerOpen = openPickerGoalId === goalRow.id;
            const isAiOpen = activeAiGoalId === goalRow.id;
            const matchedBankItem =
              sortedGoals.find(
                (b) =>
                  adaptTextToGender(b.title.trim(), currentGender) ===
                  adaptTextToGender((goalRow.title || '').trim(), currentGender)
              ) ||
              sortedGoals.find((b) => b.environment === goalRow.environment);
            const currentQuestions =
              aiQuestionsMap[goalRow.id] ||
              matchedBankItem?.facilitatingQuestions?.slice(0, 3) ||
              generateDefaultQuestionsForCustomGoal(goalRow.title, goalRow.environment);

            // Filter goals in picker by search & environment, preserving popularity sort
            const filteredBankGoals = sortedGoals.filter((item) => {
              const matchesEnv =
                pickerEnvFilter === 'הכל' || item.environment === pickerEnvFilter;
              const q = (pickerSearch || '').trim();
              const inflectedTitle = adaptTextToGender(item.title, currentGender);
              const matchesQuery =
                !q ||
                item.title.includes(q) ||
                inflectedTitle.includes(q) ||
                (item.environment && item.environment.includes(q)) ||
                (item.suggestedObjectives || []).some(
                  (o) => o.includes(q) || adaptTextToGender(o, currentGender).includes(q)
                );
              return matchesEnv && matchesQuery;
            });

            return (
              <div key={goalRow.id} className="ecological-goal-card">
                {/* Goal Block Top Bar: Environment + Delete */}
                <div className="goal-card-top-bar">
                  <div className="goal-index-And-env">
                    <span className="goal-number-badge">מטרה #{index + 1}</span>
                    <label style={{ fontWeight: 600, fontSize: '13px' }}>סביבה / תחום:</label>
                    <select
                      value={
                        ENVIRONMENTS_LIST.includes(goalRow.environment)
                          ? goalRow.environment
                          : '__custom__'
                      }
                      onChange={(e) => {
                        if (e.target.value === '__custom__') {
                          handleGoalChange(goalRow.id, 'environment', '');
                        } else {
                          handleGoalChange(goalRow.id, 'environment', e.target.value);
                        }
                      }}
                      className="env-select-input"
                    >
                      {ENVIRONMENTS_LIST.map((env) => (
                        <option key={env} value={env}>
                          {env}
                        </option>
                      ))}
                      <option value="__custom__">אחר...</option>
                    </select>
                    <input
                      type="text"
                      value={goalRow.environment || ''}
                      onChange={(e) => handleGoalChange(goalRow.id, 'environment', e.target.value)}
                      placeholder="הקלד סביבה..."
                      className="env-text-input"
                    />
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    {!isGoalEmpty(goalRow) && (
                      <button
                        type="button"
                        onClick={() => handleToggleGoalLock(goalRow.id)}
                        title={
                          isGoalProtectedFromAiOverwrite(goalRow)
                            ? 'מטרה זו עודכנה או נוספה על ידך ולכן היא שמורה ולא תשתנה בעיבוד AI חוזר. לחצי אם ברצונך לאפשר ל-AI לעדכן אותה מחדש.'
                            : 'מטרה זו נוצרה ע"י AI ותתעדכן בעיבוד חוזר. לחצי כדי לנעול אותה מעדכון AI.'
                        }
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          padding: '4px 10px',
                          borderRadius: '999px',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          border: isGoalProtectedFromAiOverwrite(goalRow)
                            ? '1px solid #bbf7d0'
                            : '1px solid #e2e8f0',
                          background: isGoalProtectedFromAiOverwrite(goalRow)
                            ? '#f0fdf4'
                            : '#f8fafc',
                          color: isGoalProtectedFromAiOverwrite(goalRow)
                            ? '#166534'
                            : '#64748b'
                        }}
                      >
                        <CheckCircle2 size={13} />
                        <span>
                          {isGoalProtectedFromAiOverwrite(goalRow)
                            ? 'שמור מעדכון AI (עודכן ידנית)'
                            : 'יתעדכן בעיבוד AI'}
                        </span>
                      </button>
                    )}

                    <button
                      type="button"
                      className="btn-remove-goal"
                      onClick={() => handleDeleteGoalRow(goalRow.id)}
                      title="מחק בלוק מטרה זה"
                    >
                      <Trash2 size={16} />
                      <span>הסר מטרה</span>
                    </button>
                  </div>
                </div>

                {/* Row 1 (Colspan 6 in Doc): Activity & Participation */}
                <div className="activity-participation-box">
                  <label>
                    <strong>פעילות והשתתפות בסביבה: </strong>
                    <span>
                      תיאור תוך התייחסות לפעילות הספציפית ולתחומי התפקוד השונים במהלך הפעילות:
                    </span>
                  </label>
                  <textarea
                    rows={3}
                    value={goalRow.activityParticipation || ''}
                    onInput={handleTextareaAutoResize}
                    onChange={(e) =>
                      handleGoalChange(goalRow.id, 'activityParticipation', e.target.value)
                    }
                    placeholder="תארי כיצד הילד/ה מתפקד/ת בסביבה זו כיום, מה מאפשר ומה מגביל..."
                  />
                </div>

                {/* Goal Selector / Autocomplete Bar */}
                <div className="hl-goal-selector-section">
                  <div className="hl-goal-header-row">
                    <label className="hl-goal-label">
                      מטרה עליונה – מה אנחנו רוצים שיקרה?
                    </label>
                    <div className="hl-goal-actions">
                      <button
                        type="button"
                        className="btn-open-bank"
                        onClick={() => {
                          setOpenPickerGoalId(isPickerOpen ? null : goalRow.id);
                          setPickerSearch('');
                        }}
                      >
                        <BookOpen size={15} />
                        <span>
                          {isPickerOpen
                            ? 'סגור מאגר מטרות'
                            : 'בחר ממאגר המטרות הדינמי'}
                        </span>
                        {isPickerOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                      </button>

                      <button
                        type="button"
                        className={`btn-toggle-ai-questions ${isAiOpen ? 'active' : ''}`}
                        onClick={() => {
                          if (!isAiOpen) {
                            setActiveAiGoalId(goalRow.id);
                            if (!aiQuestionsMap[goalRow.id]) {
                              handleGenerateAiQuestionsForGoal(goalRow);
                            }
                          } else {
                            setActiveAiGoalId(null);
                          }
                        }}
                      >
                        <HelpCircle size={15} />
                        <span>הוספת שאלות לדיוק מטרה</span>
                      </button>
                    </div>
                  </div>

                  {/* Autocomplete / Free-define Input for Goal */}
                  <div className="hl-goal-input-wrapper">
                    <input
                      type="text"
                      className="hl-goal-main-input"
                      value={goalRow.title || ''}
                      onFocus={() => {
                        if (!goalRow.title) {
                          setOpenPickerGoalId(goalRow.id);
                        }
                      }}
                      onChange={(e) => {
                        handleGoalChange(goalRow.id, 'title', e.target.value);
                        setPickerSearch(e.target.value);
                        if (!isPickerOpen) setOpenPickerGoalId(goalRow.id);
                      }}
                      placeholder="הקלידי מטרה חדשה או בחרי מתוך ההשלמה האוטומטית של המטרות הנפוצות..."
                    />
                    {goalRow.title &&
                      !sortedGoals.some(
                        (b) =>
                          adaptTextToGender(b.title.trim(), currentGender) ===
                          adaptTextToGender((goalRow.title || '').trim(), currentGender)
                      ) && (
                        <button
                          type="button"
                          className="btn-save-new-goal-to-bank"
                          onClick={() => handleConfirmCustomGoal(goalRow)}
                          title="שמור מטרה חדשה זו במאגר המטרות לשימוש עתידי וקבל 3 שאלות מנחות"
                        >
                          <Plus size={15} />
                          <span>שמור מטרה חדשה במאגר + הפעל שאלות מנחות</span>
                        </button>
                      )}
                  </div>

                  {/* Light UX Dropdown: Dynamic Usage-Sorted Goal Bank */}
                  {isPickerOpen && (
                    <div className="goal-bank-dropdown-panel">
                      <div className="goal-bank-dropdown-header">
                        <div className="bank-search-box">
                          <Search size={15} />
                          <input
                            type="text"
                            placeholder="סינון מהיר של מטרות או יעדים..."
                            value={pickerSearch}
                            onChange={(e) => setPickerSearch(e.target.value)}
                          />
                        </div>
                        <div className="bank-env-pills">
                          <button
                            type="button"
                            className={`env-pill ${pickerEnvFilter === 'הכל' ? 'active' : ''}`}
                            onClick={() => setPickerEnvFilter('הכל')}
                          >
                            כל המטרות
                          </button>
                          {ENVIRONMENTS_LIST.slice(0, 8).map((env) => (
                            <button
                              key={env}
                              type="button"
                              className={`env-pill ${pickerEnvFilter === env ? 'active' : ''}`}
                              onClick={() => setPickerEnvFilter(env)}
                            >
                              {env}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="goal-bank-items-scroll">
                        {filteredBankGoals.map((bankItem, rankIdx) => {
                          const displayBankTitle = adaptTextToGender(
                            bankItem.title,
                            currentGender
                          );
                          return (
                            <div key={bankItem.id} className="goal-bank-option-row">
                              <div
                                className="goal-bank-option-main"
                                onClick={() => handleSelectGoalFromBank(goalRow.id, bankItem, true)}
                              >
                                <div className="goal-option-title-line">
                                  <span className="popularity-rank-badge">
                                    #{rankIdx + 1}
                                  </span>
                                  <strong>{displayBankTitle}</strong>
                                  <span className="env-tag-chip">{bankItem.environment}</span>
                                  <span className="usage-count-badge">
                                    <TrendingUp size={12} />
                                    <span>נבחר {bankItem.usageCount ?? 0} פעמים</span>
                                  </span>
                                </div>
                                {bankItem.suggestedObjectives && bankItem.suggestedObjectives.length > 0 && (
                                  <div className="goal-option-sub-preview">
                                    יעדים במאגר:{' '}
                                    {bankItem.suggestedObjectives
                                      .slice(0, 2)
                                      .map((o) => adaptTextToGender(o, currentGender))
                                      .join(' | ')}
                                  </div>
                                )}
                              </div>
                              <div className="goal-bank-option-buttons">
                                <button
                                  type="button"
                                  className="btn-use-full-goal"
                                  onClick={() => handleSelectGoalFromBank(goalRow.id, bankItem, true)}
                                >
                                  בחר ומלא תבנית מלאה
                                </button>
                                <button
                                  type="button"
                                  className="btn-use-title-only"
                                  onClick={() => handleSelectGoalFromBank(goalRow.id, bankItem, false)}
                                >
                                  רק כותרת מטרה
                                </button>
                              </div>
                            </div>
                          );
                        })}

                        {pickerSearch.trim() &&
                          !sortedGoals.some(
                            (b) =>
                              adaptTextToGender(b.title.trim(), currentGender) ===
                              adaptTextToGender(pickerSearch.trim(), currentGender)
                          ) && (
                            <div className="create-custom-goal-from-search">
                              <span>לא מצאת את המטרה המדויקת?</span>
                              <button
                                type="button"
                                className="btn-create-from-query"
                                onClick={() => {
                                  handleGoalChange(goalRow.id, 'title', pickerSearch.trim());
                                  handleConfirmCustomGoal({
                                    ...goalRow,
                                    title: pickerSearch.trim()
                                  });
                                }}
                              >
                                ➕ הגדר כמטרה חדשה במאגר: "{pickerSearch.trim()}"
                              </button>
                            </div>
                          )}
                      </div>
                    </div>
                  )}

                  {/* AI Facilitating Questions Panel (Up to 3 Guiding Questions) */}
                  {isAiOpen && (
                    <div className="ai-facilitating-panel">
                      <div className="ai-panel-header">
                        <div className="ai-panel-title">
                          <Wand2 size={18} />
                          <strong>
                            עוזר AI פדגוגי: 3 שאלות מנחות לדיוק ומילוי המטרה "{goalRow.title || 'מטרה חדשה'}"
                          </strong>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            type="button"
                            className="btn-refresh-ai-q"
                            onClick={() => handleGenerateAiQuestionsForGoal(goalRow)}
                            disabled={loadingAiForGoalId === goalRow.id}
                          >
                            <Sparkles size={13} />
                            <span>
                              {loadingAiForGoalId === goalRow.id
                                ? 'מייצר שאלות ב-AI...'
                                : 'חולל שאלות מנחות חדשות ב-AI'}
                            </span>
                          </button>
                          <button
                            type="button"
                            className="btn-close-ai-q"
                            onClick={() => setActiveAiGoalId(null)}
                          >
                            סגור ✕
                          </button>
                        </div>
                      </div>

                      <div className="ai-questions-grid">
                        {currentQuestions.slice(0, 3).map((qObj, qIdx) => {
                          const currentVal = (aiAnswersMap[goalRow.id] || {})[qIdx] || '';
                          return (
                            <div key={qIdx} className="ai-question-box">
                              <label className="ai-q-text">{qObj.q}</label>
                              {qObj.suggestions && qObj.suggestions.length > 0 && (
                                <div className="ai-suggestion-chips">
                                  {qObj.suggestions.map((sug, sIdx) => {
                                    const inflectedSug = adaptTextToGender(sug, currentGender);
                                    return (
                                      <button
                                        key={sIdx}
                                        type="button"
                                        className="ai-sug-chip"
                                        onClick={() => {
                                          const prevAns = aiAnswersMap[goalRow.id] || {};
                                          const nextVal = prevAns[qIdx]
                                            ? `${prevAns[qIdx]}, ${inflectedSug}`
                                            : inflectedSug;
                                          setAiAnswersMap({
                                            ...aiAnswersMap,
                                            [goalRow.id]: { ...prevAns, [qIdx]: nextVal }
                                          });
                                        }}
                                      >
                                        + {inflectedSug}
                                      </button>
                                    );
                                  })}
                                </div>
                              )}
                              <input
                                type="text"
                                placeholder="הקלידי תשובה קצרה או לחצי על ההצעות למעלה..."
                                value={currentVal}
                                onChange={(e) => {
                                  const prevAns = aiAnswersMap[goalRow.id] || {};
                                  setAiAnswersMap({
                                    ...aiAnswersMap,
                                    [goalRow.id]: { ...prevAns, [qIdx]: e.target.value }
                                  });
                                }}
                              />
                            </div>
                          );
                        })}
                      </div>

                      <div className="ai-panel-footer">
                        <button
                          type="button"
                          className="btn-apply-ai-answers"
                          onClick={() => handleApplyFacilitatingAnswers(goalRow)}
                          disabled={loadingAiForGoalId === goalRow.id}
                        >
                          <Sparkles size={15} />
                          <span>
                            {loadingAiForGoalId === goalRow.id
                              ? 'מעבד ומנסח את עמודות הטבלה...'
                              : '✨ שלב את התשובות ומלא אוטומטית את 6 עמודות המטרה בטבלה'}
                          </span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* 6-Column Ecological Matrix for this Goal */}
                <div className="ecological-6col-table-wrapper">
                  <table className="ecological-6col-table">
                    <thead>
                      <tr>
                        <th style={{ width: '15%' }}>
                          מטרה
                          <span className="col-sub">מה אנחנו רוצים שיקרה?</span>
                        </th>
                        <th style={{ width: '24%' }}>
                          יעדים, ציוני דרך
                          <span className="col-sub">פירוט צעדים אופרטיביים</span>
                        </th>
                        <th style={{ width: '24%' }}>
                          הזדמנויות, אמצעים
                          <span className="col-sub">ואיך נגרום לזה לקרות?</span>
                        </th>
                        <th style={{ width: '11%' }}>
                          שותפים
                          <span className="col-sub">מי ובאיזה אופן?</span>
                        </th>
                        <th style={{ width: '8%' }}>משך</th>
                        <th style={{ width: '18%' }}>אמות מידה להערכה</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td data-label="מטרה – מה אנחנו רוצים שיקרה?">
                          <textarea
                            rows={6}
                            value={goalRow.title || ''}
                            onInput={handleTextareaAutoResize}
                            onChange={(e) =>
                              handleGoalChange(goalRow.id, 'title', e.target.value)
                            }
                            placeholder="המטרה העליונה..."
                            style={{ fontWeight: 600 }}
                          />
                        </td>
                        <td data-label="יעדים, ציוני דרך (פירוט צעדים אופרטיביים)">
                          <textarea
                            rows={6}
                            value={goalRow.objectives || ''}
                            onInput={handleTextareaAutoResize}
                            onChange={(e) =>
                              handleGoalChange(goalRow.id, 'objectives', e.target.value)
                            }
                            placeholder="• יעד אופרטיבי 1&#10;• יעד אופרטיבי 2..."
                          />
                          {matchedBankItem?.suggestedObjectives?.length > 0 && (
                            <div className="quick-objectives-bank">
                              <div
                                className="quick-objectives-toggle-header"
                                onClick={() =>
                                  setExpandedQuickObjMap((prev) => ({
                                    ...prev,
                                    [goalRow.id]: !prev[goalRow.id]
                                  }))
                                }
                              >
                                <small>הוסף יעד מהמאגר בלחיצה:</small>
                                <button
                                  type="button"
                                  className={`btn-toggle-quick-obj ${
                                    expandedQuickObjMap[goalRow.id] ? 'open' : ''
                                  }`}
                                  title={
                                    expandedQuickObjMap[goalRow.id]
                                      ? 'הסתר רשימת יעדים'
                                      : 'הצג יעדים מהמאגר להוספה בלחיצה'
                                  }
                                >
                                  {expandedQuickObjMap[goalRow.id] ? '−' : '+'}
                                </button>
                              </div>
                              {expandedQuickObjMap[goalRow.id] && (
                                <div className="quick-obj-chips">
                                  {matchedBankItem.suggestedObjectives.map((obj, oIdx) => {
                                    const inflectedObj = adaptTextToGender(obj, currentGender);
                                    return (
                                      <button
                                        key={oIdx}
                                        type="button"
                                        className="chip-add-obj"
                                        onClick={() =>
                                          handleAddSuggestedObjective(goalRow.id, inflectedObj)
                                        }
                                      >
                                        + {inflectedObj}
                                      </button>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          )}
                        </td>
                        <td data-label="הזדמנויות, אמצעים (ואיך נגרום לזה לקרות?)">
                          <textarea
                            rows={6}
                            value={goalRow.opportunities || ''}
                            onInput={handleTextareaAutoResize}
                            onChange={(e) =>
                              handleGoalChange(goalRow.id, 'opportunities', e.target.value)
                            }
                            placeholder="אמצעים, תיווך והזדמנויות בסדר היום..."
                          />
                        </td>
                        <td data-label="שותפים (מי ובאיזה אופן?)">
                          <textarea
                            rows={6}
                            value={goalRow.partners || ''}
                            onInput={handleTextareaAutoResize}
                            onChange={(e) =>
                              handleGoalChange(goalRow.id, 'partners', e.target.value)
                            }
                            placeholder="צוות הגן, סייעת, מרפאה בעיסוק..."
                          />
                        </td>
                        <td data-label="משך">
                          <textarea
                            rows={6}
                            value={goalRow.duration || ''}
                            onInput={handleTextareaAutoResize}
                            onChange={(e) =>
                              handleGoalChange(goalRow.id, 'duration', e.target.value)
                            }
                            placeholder="חודש (עד תאריך יעד) / כשלושה חודשים / עד סוף השנה"
                          />
                        </td>
                        <td data-label="אמות מידה להערכה">
                          <textarea
                            rows={6}
                            value={goalRow.evaluationCriteria || ''}
                            onInput={handleTextareaAutoResize}
                            onChange={(e) =>
                              handleGoalChange(goalRow.id, 'evaluationCriteria', e.target.value)
                            }
                            placeholder="כיצד נדע שהמטרה הושגה?"
                          />
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Light Collapsible Mid-Year & End-of-Year Evaluation Drawer */}
                <div style={{ marginTop: '10px', borderTop: '1px dashed #cbd5e1', paddingTop: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedEvalMap((prev) => ({
                          ...prev,
                          [goalRow.id]: !prev[goalRow.id]
                        }))
                      }
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: expandedEvalMap[goalRow.id] ? '#ede9fe' : '#f8fafc',
                        color: expandedEvalMap[goalRow.id] ? '#5b21b6' : '#475569',
                        border: expandedEvalMap[goalRow.id] ? '1px solid #c4b5fd' : '1px solid #cbd5e1',
                        borderRadius: '6px',
                        padding: '5px 11px',
                        fontSize: '12.5px',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      {expandedEvalMap[goalRow.id] ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      <span>
                        {expandedEvalMap[goalRow.id]
                          ? 'הסתר הערכת מחצית / סוף שנה'
                          : '+ הערכת מחצית / סוף שנה'}
                      </span>
                    </button>

                    {(goalRow.achievementStatus || goalRow.midYearEvaluation || goalRow.endYearEvaluation) && !expandedEvalMap[goalRow.id] && (
                      <span
                        style={{
                          fontSize: '12px',
                          color: '#5b21b6',
                          background: '#f5f3ff',
                          border: '1px solid #ddd6fe',
                          borderRadius: '999px',
                          padding: '2px 10px',
                          fontWeight: 600
                        }}
                      >
                        {goalRow.achievementStatus || 'הוזנה הערכה תקופתית'}
                      </span>
                    )}
                  </div>

                  {expandedEvalMap[goalRow.id] && (
                    <div
                      style={{
                        marginTop: '10px',
                        padding: '12px 14px',
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>
                          סטטוס השגת המטרה:
                        </span>
                        {['הושגה במלואה', 'הושגה חלקית', 'בתהליך', 'טרם הושגה'].map((statusOpt) => {
                          const isSelected = goalRow.achievementStatus === statusOpt;
                          return (
                            <button
                              key={statusOpt}
                              type="button"
                              onClick={() =>
                                handleGoalChange(
                                  goalRow.id,
                                  'achievementStatus',
                                  isSelected ? '' : statusOpt
                                )
                              }
                              style={{
                                padding: '4px 11px',
                                borderRadius: '999px',
                                fontSize: '12px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                border: isSelected ? '1px solid #7c3aed' : '1px solid #cbd5e1',
                                background: isSelected ? '#7c3aed' : '#ffffff',
                                color: isSelected ? '#ffffff' : '#334155'
                              }}
                            >
                              {statusOpt}
                            </button>
                          );
                        })}
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
                        <div className="form-field" style={{ margin: 0 }}>
                          <label style={{ fontSize: '12.5px', fontWeight: 600 }}>הערכת מחצית:</label>
                          <textarea
                            rows={2}
                            value={goalRow.midYearEvaluation || ''}
                            onInput={handleTextareaAutoResize}
                            onChange={(e) =>
                              handleGoalChange(goalRow.id, 'midYearEvaluation', e.target.value)
                            }
                            placeholder="תיאור התקדמות התלמיד/ה במחצית השנה..."
                            style={{ background: '#ffffff' }}
                          />
                          {(goalRow.midYearEvaluation || '').trim() && (
                            <div style={{ marginTop: '6px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                              <button
                                type="button"
                                className="btn-submit-generate-summary"
                                style={{ padding: '6px 12px', fontSize: '12.5px' }}
                                onClick={() => handleProcessSingleGoalEvalAi(goalRow, 'midYearEvaluation')}
                                disabled={loadingEvalAiKey === `${goalRow.id}_midYearEvaluation`}
                              >
                                <Sparkles size={14} />
                                <span>
                                  {loadingEvalAiKey === `${goalRow.id}_midYearEvaluation`
                                    ? 'מעבד מידע ב-AI...'
                                    : 'עיבוד מידע ב-AI'}
                                </span>
                              </button>
                              {evalAiSuccessKey === `${goalRow.id}_midYearEvaluation` && (
                                <span style={{ fontSize: '12px', color: '#16a34a', fontWeight: 600 }}>
                                  ✓ עובד ב-AI
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="form-field" style={{ margin: 0 }}>
                          <label style={{ fontSize: '12.5px', fontWeight: 600 }}>הערכת סוף שנה:</label>
                          <textarea
                            rows={2}
                            value={goalRow.endYearEvaluation || ''}
                            onInput={handleTextareaAutoResize}
                            onChange={(e) =>
                              handleGoalChange(goalRow.id, 'endYearEvaluation', e.target.value)
                            }
                            placeholder="סיכום השגת המטרה בסוף שנת הלימודים..."
                            style={{ background: '#ffffff' }}
                          />
                          {(goalRow.endYearEvaluation || '').trim() && (
                            <div style={{ marginTop: '6px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                              <button
                                type="button"
                                className="btn-submit-generate-summary"
                                style={{ padding: '6px 12px', fontSize: '12.5px' }}
                                onClick={() => handleProcessSingleGoalEvalAi(goalRow, 'endYearEvaluation')}
                                disabled={loadingEvalAiKey === `${goalRow.id}_endYearEvaluation`}
                              >
                                <Sparkles size={14} />
                                <span>
                                  {loadingEvalAiKey === `${goalRow.id}_endYearEvaluation`
                                    ? 'מעבד מידע ב-AI...'
                                    : 'עיבוד מידע ב-AI'}
                                </span>
                              </button>
                              {evalAiSuccessKey === `${goalRow.id}_endYearEvaluation` && (
                                <span style={{ fontSize: '12px', color: '#16a34a', fontWeight: 600 }}>
                                  ✓ עובד ב-AI
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ marginTop: '14px', textAlign: 'center' }}>
          <button type="button" className="btn-add-goal-block-large" onClick={handleAddGoalRow}>
            <Plus size={18} />
            <span>הוסף מטרה / סביבה נוספת לתכנית העבודה</span>
          </button>
        </div>
      </section>

      {/* Section 4: Recommendations & Bottom Actions */}
      <section className="form-section-card">
        <div className="section-header-line">
          <h3>4. המלצות</h3>
        </div>
        <div className="form-field">
          <label>המלצות להמשך:</label>
          <textarea
            rows={3}
            value={formData.recommendations || ''}
            onChange={(e) => handleFieldChange('recommendations', e.target.value)}
            placeholder="המלצות יישומיות להמשך הליווי והעבודה המשותפת..."
          />
        </div>

        <div className="bottom-final-actions" style={{ marginTop: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            type="button"
            className="btn-save-progress"
            onClick={handleSaveProgress}
            style={
              saveBanner
                ? {
                    background: 'linear-gradient(135deg, #16a34a 0%, #059669 100%)',
                    borderColor: '#86efac'
                  }
                : undefined
            }
          >
            {saveBanner ? <Check size={18} /> : <Save size={18} />}
            <span>{saveBanner ? 'נשמר בהצלחה!' : 'שמור התקדמות לעריכה עתידית'}</span>
          </button>

          {saveBanner && (
            <span className="save-toast-badge">
              <Check size={14} />
              <span>השינויים נשמרו בהצלחה!</span>
            </span>
          )}

          <button type="button" className="btn-print-doc" onClick={handlePrintDocument}>
            <Printer size={18} />
            <span>הדפס מסמך</span>
          </button>

          <button
            type="button"
            className="btn-print-doc"
            onClick={() => {
              handleSaveProgress();
              downloadWordFile('tala');
            }}
            title="הורד ישירות כקובץ Word ניתן לעריכה"
          >
            <Download size={18} />
            <span>הורד קובץ Word</span>
          </button>

          {((formData.evalReportSummary || '').trim() ||
            (formData.evalReportFreeText || '').trim() ||
            (formData.goals || []).some(
              (g) =>
                (g.achievementStatus || '').trim() ||
                (g.midYearEvaluation || '').trim() ||
                (g.endYearEvaluation || '').trim()
            )) && (
            <button
              type="button"
              className="btn-print-doc"
              onClick={() => {
                setShowEvalReportSection((prev) => {
                  const next = !prev;
                  if (next) {
                    setTimeout(() => {
                      evalReportSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }, 80);
                  }
                  return next;
                });
              }}
            >
              <FileText size={18} />
              <span>הערכת מחצית / סוף שנה</span>
            </button>
          )}

          <button type="button" className="btn-send-email-doc" onClick={() => handleOpenEmailModal('tala')}>
            <Mail size={18} />
            <span>שלח למייל</span>
          </button>
        </div>
      </section>

      {/* Separate Report Section: דוח הערכת מחצית / סוף שנה */}
      {showEvalReportSection &&
        ((formData.evalReportSummary || '').trim() ||
          (formData.evalReportFreeText || '').trim() ||
          (formData.goals || []).some(
            (g) =>
              (g.achievementStatus || '').trim() ||
              (g.midYearEvaluation || '').trim() ||
              (g.endYearEvaluation || '').trim()
          )) && (
        <section
          ref={evalReportSectionRef}
          className="form-section-card highlight-summary-section"
          style={{ borderTop: '4px solid #7c65b8' }}
        >
          <div className="section-header-line" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h3>דוח הערכת מחצית / סוף שנה</h3>
              <p className="section-sub-desc">
                דוח הערכה נפרד מתוכנית התל"א • סיכום התקדמות התלמיד/ה והשגת המטרות
              </p>
            </div>
            <button
              type="button"
              className="btn-preview-doc"
              onClick={() => setShowEvalReportSection(false)}
            >
              <X size={15} />
              <span>סגור דוח הערכה</span>
            </button>
          </div>

          {/* Free-text input for Evaluation Report + AI Processing Button */}
          <div className="free-text-area-box" style={{ marginBottom: '16px' }}>
            <label className="bold-label">
              ✍️ תיאור חופשי להערכת מחצית / סוף שנה:
            </label>
            <textarea
              rows={3}
              value={formData.evalReportFreeText || ''}
              onInput={handleTextareaAutoResize}
              onChange={(e) => handleFieldChange('evalReportFreeText', e.target.value)}
              placeholder="הזיני במילים שלך איך הילד/ה התקדם/ה לאורך התקופה ביחס למטרות... למשל: התקדם מאוד במשחק משותף עם חברים וממתין לתורו, במפגש משתתף יותר כשיש תיווך, ובסדנא כבר ניגש בעצמו וגוזר יפה..."
            />

            {(formData.evalReportFreeText || '').trim() && (
              <div className="submit-summary-action-row" style={{ marginTop: '10px' }}>
                <span className="submit-helper-text">
                  לחיצה על "עיבוד מידע ב-AI" תנסח באופן מקצועי את סיכום ההערכה ותמלא את הערכת המטרות למטה:
                </span>
                <button
                  type="button"
                  className="btn-submit-generate-summary"
                  onClick={handleProcessFullEvalReportAi}
                  disabled={isProcessingFullEvalAi}
                >
                  <Sparkles size={17} />
                  <span>
                    {isProcessingFullEvalAi ? 'מעבד מידע ב-AI...' : 'עיבוד מידע ב-AI'}
                  </span>
                </button>
              </div>
            )}

            {evalReportAiBanner && (
              <div className="reverse-engineer-success-banner" style={{ marginTop: '10px' }}>
                <CheckCircle2 size={18} />
                <span>{evalReportAiBanner}</span>
              </div>
            )}
          </div>

          {/* General Period Summary Field */}
          <div className="form-field" style={{ marginBottom: '18px' }}>
            <label style={{ fontWeight: 700 }}>סיכום תפקוד והתקדמות תקופתית:</label>
            <textarea
              rows={3}
              value={formData.evalReportSummary || ''}
              onInput={handleTextareaAutoResize}
              onChange={(e) => handleFieldChange('evalReportSummary', e.target.value)}
              placeholder="סיכום כללי של התקדמות התלמיד/ה בתקופת ההערכה..."
            />
          </div>

          {/* Goals Evaluation Cards inside the Separate Report */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {(formData.goals || []).map((goalRow, idx) => (
              <div
                key={goalRow.id}
                style={{
                  background: '#ffffff',
                  border: '1.5px solid #cbd5e1',
                  borderRadius: '10px',
                  padding: '14px 16px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '10px' }}>
                  <div>
                    <span className="goal-number-badge" style={{ marginLeft: '8px' }}>
                      מטרה #{idx + 1}
                    </span>
                    <strong style={{ color: '#1e3a5f', fontSize: '14px' }}>
                      {goalRow.environment}
                    </strong>
                    {goalRow.title && (
                      <span style={{ color: '#334155', fontSize: '13.5px', marginRight: '8px' }}>
                        – {goalRow.title}
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '12.5px', fontWeight: 600, color: '#475569' }}>סטטוס:</span>
                    {['הושגה במלואה', 'הושגה חלקית', 'בתהליך', 'טרם הושגה'].map((statusOpt) => {
                      const isSelected = goalRow.achievementStatus === statusOpt;
                      return (
                        <button
                          key={statusOpt}
                          type="button"
                          onClick={() =>
                            handleGoalChange(
                              goalRow.id,
                              'achievementStatus',
                              isSelected ? '' : statusOpt
                            )
                          }
                          style={{
                            padding: '4px 10px',
                            borderRadius: '999px',
                            fontSize: '12px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            border: isSelected ? '1px solid #7c3aed' : '1px solid #cbd5e1',
                            background: isSelected ? '#7c3aed' : '#f8fafc',
                            color: isSelected ? '#ffffff' : '#334155'
                          }}
                        >
                          {statusOpt}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px' }}>
                  <div className="form-field" style={{ margin: 0 }}>
                    <label style={{ fontSize: '12.5px', fontWeight: 600 }}>הערכת מחצית:</label>
                    <textarea
                      rows={2}
                      value={goalRow.midYearEvaluation || ''}
                      onInput={handleTextareaAutoResize}
                      onChange={(e) =>
                        handleGoalChange(goalRow.id, 'midYearEvaluation', e.target.value)
                      }
                      placeholder="תיאור התקדמות התלמיד/ה במחצית השנה..."
                    />
                    {(goalRow.midYearEvaluation || '').trim() && (
                      <div style={{ marginTop: '6px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          className="btn-submit-generate-summary"
                          style={{ padding: '6px 12px', fontSize: '12.5px' }}
                          onClick={() => handleProcessSingleGoalEvalAi(goalRow, 'midYearEvaluation')}
                          disabled={loadingEvalAiKey === `${goalRow.id}_midYearEvaluation`}
                        >
                          <Sparkles size={14} />
                          <span>
                            {loadingEvalAiKey === `${goalRow.id}_midYearEvaluation`
                              ? 'מעבד מידע ב-AI...'
                              : 'עיבוד מידע ב-AI'}
                          </span>
                        </button>
                        {evalAiSuccessKey === `${goalRow.id}_midYearEvaluation` && (
                          <span style={{ fontSize: '12px', color: '#16a34a', fontWeight: 600 }}>
                            ✓ עובד ב-AI
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="form-field" style={{ margin: 0 }}>
                    <label style={{ fontSize: '12.5px', fontWeight: 600 }}>הערכת סוף שנה:</label>
                    <textarea
                      rows={2}
                      value={goalRow.endYearEvaluation || ''}
                      onInput={handleTextareaAutoResize}
                      onChange={(e) =>
                        handleGoalChange(goalRow.id, 'endYearEvaluation', e.target.value)
                      }
                      placeholder="סיכום השגת המטרה בסוף שנת הלימודים..."
                    />
                    {(goalRow.endYearEvaluation || '').trim() && (
                      <div style={{ marginTop: '6px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          className="btn-submit-generate-summary"
                          style={{ padding: '6px 12px', fontSize: '12.5px' }}
                          onClick={() => handleProcessSingleGoalEvalAi(goalRow, 'endYearEvaluation')}
                          disabled={loadingEvalAiKey === `${goalRow.id}_endYearEvaluation`}
                        >
                          <Sparkles size={14} />
                          <span>
                            {loadingEvalAiKey === `${goalRow.id}_endYearEvaluation`
                              ? 'מעבד מידע ב-AI...'
                              : 'עיבוד מידע ב-AI'}
                          </span>
                        </button>
                        {evalAiSuccessKey === `${goalRow.id}_endYearEvaluation` && (
                          <span style={{ fontSize: '12px', color: '#16a34a', fontWeight: 600 }}>
                            ✓ עובד ב-AI
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Separate Report Actions Bar */}
          <div className="bottom-final-actions" style={{ marginTop: '18px', flexWrap: 'wrap', alignItems: 'center' }}>
            <button type="button" className="btn-print-doc" onClick={handlePrintEvalReport}>
              <Printer size={18} />
              <span>הדפס דוח הערכת מחצית / סוף שנה</span>
            </button>

            <button
              type="button"
              className="btn-print-doc"
              onClick={() => {
                handleSaveProgress();
                downloadWordFile('eval');
              }}
            >
              <Download size={18} />
              <span>הורד קובץ Word – דוח הערכה</span>
            </button>

            <button
              type="button"
              className="btn-send-email-doc"
              onClick={() => handleOpenEmailModal('eval')}
            >
              <Mail size={18} />
              <span>שלח דוח הערכה למייל</span>
            </button>
          </div>
        </section>
      )}

      {/* Team Sharing Modal ("שיתוף צוות") */}
      {showShareModal && (
        <div className="modal-backdrop" onClick={() => setShowShareModal(false)}>
          <div
            className="modal-card email-report-modal"
            dir="rtl"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '500px' }}
          >
            <div className="modal-header email-modal-header">
              <div className="modal-title-row">
                <Users size={22} />
                <div>
                  <h3>שיתוף תוכנית עם צוות / מתי"א</h3>
                  <p className="modal-subtitle">
                    בחרי אנשי צוות שיוכלו לצפות ולעבוד על התוכנית של <strong>{formData.name || 'התלמיד/ה'}</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="btn-close-modal"
                onClick={() => setShowShareModal(false)}
                title="סגור"
              >
                <X size={20} />
              </button>
            </div>

            <div className="modal-body email-modal-body">
              {(() => {
                const myEmail = (currentUser?.email || '').trim().toLowerCase();
                const myUserRecord = (allowedUsers || []).find(
                  (u) => (u.email || '').trim().toLowerCase() === myEmail
                );
                const myGroup = (myUserRecord?.group || currentUser?.group || '').trim();
                const otherUsers = (allowedUsers || []).filter(
                  (u) => u.active !== false && (u.email || '').trim().toLowerCase() !== myEmail
                );
                const sameGroupUsers = myGroup
                  ? otherUsers.filter((u) => (u.group || '').trim() === myGroup)
                  : [];
                const visibleUsers =
                  myGroup && sameGroupUsers.length > 0 && !showAllShareUsers
                    ? sameGroupUsers
                    : otherUsers;
                const currentShared = (formData.sharedWith || []).map((e) =>
                  String(e || '').trim().toLowerCase()
                );

                return (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
                      <span style={{ fontSize: '13px', color: '#475569', fontWeight: 600 }}>
                        {myGroup && sameGroupUsers.length > 0 && !showAllShareUsers
                          ? `חברי צוות: ${myGroup}`
                          : 'כל אנשי הצוות במערכת'}
                      </span>
                      {myGroup && sameGroupUsers.length > 0 && otherUsers.length > sameGroupUsers.length && (
                        <button
                          type="button"
                          onClick={() => setShowAllShareUsers(!showAllShareUsers)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#2563eb',
                            fontSize: '12.5px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            padding: 0
                          }}
                        >
                          {showAllShareUsers ? `הצג רק את ${myGroup}` : 'הצג את כל הצוותים'}
                        </button>
                      )}
                    </div>

                    {visibleUsers.length === 0 ? (
                      <p style={{ fontSize: '13.5px', color: '#64748b', textAlign: 'center', padding: '16px 0' }}>
                        לא נמצאו אנשי צוות נוספים לשיתוף.
                      </p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '280px', overflowY: 'auto', paddingLeft: '4px' }}>
                        {visibleUsers.map((colleague) => {
                          const colEmail = (colleague.email || '').trim().toLowerCase();
                          const isShared = currentShared.includes(colEmail);
                          return (
                            <label
                              key={colEmail}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '9px 12px',
                                borderRadius: '8px',
                                border: isShared ? '1.5px solid #8b5cf6' : '1px solid #e2e8f0',
                                background: isShared ? '#f5f3ff' : '#ffffff',
                                cursor: 'pointer'
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <input
                                  type="checkbox"
                                  checked={isShared}
                                  onChange={() => handleToggleShareColleague(colEmail)}
                                />
                                <div>
                                  <div style={{ fontWeight: 600, fontSize: '13.5px', color: '#1e293b' }}>
                                    {colleague.name || colleague.email}
                                  </div>
                                  <div style={{ fontSize: '12px', color: '#64748b' }}>
                                    {colleague.role || 'איש/אשת צוות'}
                                    {colleague.group ? ` • ${colleague.group}` : ''}
                                  </div>
                                </div>
                              </div>
                              {isShared && (
                                <span style={{ fontSize: '11.5px', fontWeight: 600, color: '#6d28d9', background: '#ede9fe', padding: '2px 8px', borderRadius: '999px' }}>
                                  משותף
                                </span>
                              )}
                            </label>
                          );
                        })}
                      </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
                      <button
                        type="button"
                        className="btn-submit-email"
                        onClick={() => setShowShareModal(false)}
                      >
                        <span>סיום</span>
                      </button>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Send Report to Email Modal ("שלח למייל") */}
      {showEmailModal && (
        <div className="modal-backdrop" onClick={() => setShowEmailModal(false)}>
          <div
            className="modal-card email-report-modal"
            dir="rtl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header email-modal-header">
              <div className="modal-title-row">
                <Mail size={22} />
                <div>
                  <h3>
                    {emailReportMode === 'eval'
                      ? 'שליחת דוח הערכת מחצית / סוף שנה במייל'
                      : 'שליחת תוכנית עבודה במייל'}
                  </h3>
                  <p className="modal-subtitle">
                    {emailReportMode === 'eval' ? getEvalReportTitle() : getFullDocTitle()} • <strong>{getDisplayStudentName()}</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="btn-close-modal"
                onClick={() => setShowEmailModal(false)}
                title="סגור"
              >
                <X size={20} />
              </button>
            </div>

            <form className="modal-body email-modal-body" onSubmit={handleSendReportByEmail}>
              {/* 1. Recipient Email */}
              <div className="email-modal-field">
                <label className="email-modal-label">
                  שלח אל: <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  type="email"
                  required
                  dir="ltr"
                  value={emailRecipient}
                  onChange={(e) => setEmailRecipient(e.target.value)}
                  placeholder="recipient@example.com"
                  className="email-recipient-input"
                  autoFocus
                />
              </div>

              {/* 2. Choose Report Format: DOCX or PDF */}
              <div className="email-modal-field">
                <label className="email-modal-label">בחר פורמט קובץ מצורף:</label>
                <div className="email-format-options">
                  <label
                    className={`email-format-card ${emailFormat === 'docx' ? 'selected' : ''}`}
                    onClick={() => setEmailFormat('docx')}
                  >
                    <input
                      type="radio"
                      name="emailFormat"
                      value="docx"
                      checked={emailFormat === 'docx'}
                      onChange={() => setEmailFormat('docx')}
                    />
                    <div className="email-format-icon docx-badge">DOCX</div>
                    <div className="email-format-info">
                      <strong>קובץ Word</strong>
                      <span>מסמך ניתן לעריכה ב-Microsoft Word</span>
                    </div>
                  </label>

                  <label
                    className={`email-format-card ${emailFormat === 'pdf' ? 'selected' : ''}`}
                    onClick={() => setEmailFormat('pdf')}
                  >
                    <input
                      type="radio"
                      name="emailFormat"
                      value="pdf"
                      checked={emailFormat === 'pdf'}
                      onChange={() => setEmailFormat('pdf')}
                    />
                    <div className="email-format-icon pdf-badge">PDF</div>
                    <div className="email-format-info">
                      <strong>קובץ PDF רשמי</strong>
                      <span>מסמך מעוצב לקריאה והדפסה</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Privacy Redaction Toggle inside modal */}
              <label className="email-privacy-toggle">
                <input
                  type="checkbox"
                  checked={hideStudentDetailsOnPrint}
                  onChange={(e) => setHideStudentDetailsOnPrint(e.target.checked)}
                />
                {hideStudentDetailsOnPrint ? <EyeOff size={16} /> : <Eye size={16} />}
                <span>
                  הפעל הגנת פרטיות בקובץ המצורף
                </span>
              </label>

              {emailError && <div className="email-modal-error">{emailError}</div>}
              {emailStatusMsg && <div className="email-modal-success">{emailStatusMsg}</div>}

              <div className="email-modal-actions">
                <button
                  type="button"
                  className="btn-download-only"
                  disabled={isSendingEmail}
                  onClick={async () => {
                    handleSaveProgress();
                    const activeMode = emailReportMode === 'eval' ? 'eval' : 'tala';
                    if (emailFormat === 'docx') {
                      downloadWordFile(activeMode);
                      setEmailStatusMsg('קובץ ה-Word הורד למחשב שלך.');
                    } else {
                      setEmailStatusMsg('מפיק ומוריד קובץ PDF ישירות למחשב...');
                      await downloadPdfFileDirectly(activeMode);
                      setEmailStatusMsg('קובץ ה-PDF הורד למחשב שלך.');
                    }
                  }}
                >
                  <Download size={16} />
                  <span>הורד קובץ {emailFormat === 'docx' ? 'Word' : 'PDF'} למחשב</span>
                </button>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    className="btn-cancel-modal"
                    onClick={() => setShowEmailModal(false)}
                    disabled={isSendingEmail}
                  >
                    סגור
                  </button>
                  <button type="submit" className="btn-submit-email" disabled={isSendingEmail}>
                    <Send size={16} />
                    <span>
                      {isSendingEmail
                        ? `מפיק קובץ ${emailFormat.toUpperCase()} ושולח ברקע...`
                        : 'שלח דוח במייל כעת'}
                    </span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
