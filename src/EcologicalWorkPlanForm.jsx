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
  Loader2,
  X,
  Lock,
  Unlock
} from 'lucide-react';
import {
  ENVIRONMENTS_LIST,
  SCHOOL_YEARS_LIST,
  TALA_PROFILE_DOMAINS,
  TALA_FOCUS_DOMAINS,
  buildDefaultTalaProfileRows,
  isTalaPlanType,
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
  maskPromptForAi,
  getNextSchoolYear,
  buildRolloverStudentForNextYear,
  STATUS_REPORT_SECTIONS_SCHEMA,
  sanitizeStatusReportSections,
  generateStatusReportLocally
} from './goalBankData';
import {
  GOOGLE_APPS_SCRIPT_TEMPLATE,
  loadEmailEngineConfig,
  isDirectEmailEngineConfigured,
  generatePdfBlobFromHtml,
  sendReportEmailInBackground
} from './emailService';
import {
  getFullDocTitle as buildFullDocTitle,
  getEvalReportTitle as buildEvalReportTitle,
  getStatusReportTitle as buildStatusReportTitle,
  getDisplayStudentName as buildDisplayStudentName,
  getDisplayMaskedField as buildDisplayMaskedField,
  getRedactedText as buildRedactedText,
  getSafeReportFilename as buildSafeReportFilename,
  getActiveStatusReportSections as buildActiveStatusReportSections,
  getAdditionalMetadataItems,
  getEffectiveStudentProfileForTala,
  getEffectiveTalaProfileRows,
  hasPopulatedTalaProfile,
  openHtmlPrintWindow,
  buildWorkPlanPrintHtml,
  buildEvalReportPrintHtml,
  buildStatusReportPrintHtml,
  buildWordDocumentHtml as renderWordDocumentHtml,
  buildEvalWordDocumentHtml as renderEvalWordDocumentHtml,
  buildStatusReportWordDocumentHtml as renderStatusReportWordDocumentHtml
} from './export/wordAndPrintBuilders';
import { detectStudentStage, formatPromptWithStudentContext } from './utils/studentStage';
import { canLockReport } from './domain/permissions';
import StatusReportPanel from './components/form/StatusReportPanel';
import ShareTeamModal from './components/form/ShareTeamModal';

// NEW: Firebase Functions imports
import { getFunctions, httpsCallable } from 'firebase/functions';

const DURATION_TSHIRT_OPTIONS = [
  { size: 'S', label: 'חודש (קצר/ממוקד)', value: 'חודש' },
  { size: 'S+', label: 'חודשיים', value: 'חודשיים' },
  { size: 'M', label: '3 חודשים', value: '3 חודשים' },
  { size: 'M+', label: '4 חודשים', value: '4 חודשים' },
  { size: 'L', label: 'חצי שנה (מחצית)', value: 'חצי שנה' },
  { size: 'XL', label: 'עד סוף השנה (שנתי)', value: 'עד סוף השנה' }
];

const getPlanTypeStorageKey = (schoolYear, planType) => {
  const yr = schoolYear || 'תשפ"ו (2025-2026)';
  const typeKey = isTalaPlanType(planType) ? 'tala' : 'tachi';
  return `${yr}__${typeKey}`;
};

const buildFreshReportForPlanType = (planType) => {
  const resolvedPlanType = planType || 'תל"א (תוכנית לימודים אישית)';
  const isTala = isTalaPlanType(resolvedPlanType);
  const freshGoal = {
    id: 'g_init_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
    environment: ENVIRONMENTS_LIST[0],
    activityParticipation: '',
    title: '',
    objectives: '',
    opportunities: '',
    opportunitiesIntegration: '',
    opportunitiesTherapist: '',
    learningAccommodations: '',
    partners: isTala ? 'מחנכת, מורת שילוב, מטפלת באומנויות' : 'צוות הגן, סייעת אישית',
    duration: '',
    evaluationCriteria: ''
  };

  return {
    date: new Date().toLocaleDateString('he-IL'),
    planType: resolvedPlanType,
    isLocked: false,
    lockedAt: '',
    lockedBy: '',
    schoolName: '',
    gradeClass: '',
    homeroomTeacher: '',
    integrationTeacher: '',
    additionalPartners: '',
    learningSupportAssistant: '',
    counselorName: '',
    psychologistName: '',
    matyaCoordinator: '',
    emotionalTherapist: '',
    paraMedicalTeam: '',
    teacherFreeText: '',
    freeTextAnalyzed: false,
    removedAiGoals: [],
    strengthsExisting: '',
    strengthsToEmpower: '',
    studentGeneralBackground: '',
    studentSupportReceived: '',
    studentMainGoal: '',
    talaProfileRows: buildDefaultTalaProfileRows(),
    talaFocusDomains: [],
    recommendations: '',
    evalReportFreeText: '',
    evalReportSummary: '',
    statusReportSections: [],
    statusReportUpdatedAt: '',
    lastSavedAt: '',
    goals: [freshGoal]
  };
};

const extractYearReportFromFormData = (data) => ({
  date: data?.date || new Date().toLocaleDateString('he-IL'),
  planType: data?.planType || 'תל"א (תוכנית לימודים אישית)',
  isLocked: Boolean(data?.isLocked),
  lockedAt: data?.lockedAt || '',
  lockedBy: data?.lockedBy || '',
  schoolName: data?.schoolName || '',
  gradeClass: data?.gradeClass || '',
  homeroomTeacher: data?.homeroomTeacher || '',
  integrationTeacher: data?.integrationTeacher || '',
  additionalPartners: data?.additionalPartners || '',
  learningSupportAssistant: data?.learningSupportAssistant || '',
  counselorName: data?.counselorName || '',
  psychologistName: data?.psychologistName || '',
  matyaCoordinator: data?.matyaCoordinator || '',
  emotionalTherapist: data?.emotionalTherapist || '',
  paraMedicalTeam: data?.paraMedicalTeam || '',
  teacherFreeText: data?.teacherFreeText || '',
  freeTextAnalyzed: Boolean(data?.freeTextAnalyzed),
  removedAiGoals: Array.isArray(data?.removedAiGoals) ? data.removedAiGoals : [],
  strengthsExisting: data?.strengthsExisting || '',
  strengthsToEmpower: data?.strengthsToEmpower || '',
  studentGeneralBackground: data?.studentGeneralBackground || '',
  studentSupportReceived: data?.studentSupportReceived || '',
  studentMainGoal: data?.studentMainGoal || '',
  talaProfileRows: buildDefaultTalaProfileRows(data?.talaProfileRows),
  talaFocusDomains: Array.isArray(data?.talaFocusDomains) ? data.talaFocusDomains : [],
  recommendations: data?.recommendations || '',
  evalReportFreeText: data?.evalReportFreeText || '',
  evalReportSummary: data?.evalReportSummary || '',
  statusReportSections: Array.isArray(data?.statusReportSections) ? data.statusReportSections : [],
  statusReportUpdatedAt: data?.statusReportUpdatedAt || '',
  lastSavedAt: data?.lastSavedAt || '',
  goals: (data?.goals || []).map((g) => adaptGoalToGender(g, data?.gender || 'boy'))
});

const isRawFreeTextAlreadyAnalyzed = (data) =>
  Boolean(
    data?.freeTextAnalyzed ||
      ((data?.teacherFreeText || '').trim() &&
        ((data?.strengthsExisting || '').trim() ||
          (data?.strengthsToEmpower || '').trim() ||
          (data?.studentGeneralBackground || '').trim() ||
          (data?.studentSupportReceived || '').trim() ||
          (data?.studentMainGoal || '').trim() ||
          hasPopulatedTalaProfile(data) ||
          (data?.goals || []).some((g) => (g?.title || '').trim())))
  );

const hasContentInYearReport = (rep) => {
  if (!rep) return false;
  return Boolean(
    (rep.teacherFreeText && rep.teacherFreeText.trim()) ||
      (rep.strengthsExisting && rep.strengthsExisting.trim()) ||
      (rep.strengthsToEmpower && rep.strengthsToEmpower.trim()) ||
      (rep.studentGeneralBackground && rep.studentGeneralBackground.trim()) ||
      (rep.studentSupportReceived && rep.studentSupportReceived.trim()) ||
      (rep.studentMainGoal && rep.studentMainGoal.trim()) ||
      hasPopulatedTalaProfile(rep) ||
      (rep.recommendations && rep.recommendations.trim()) ||
      (rep.evalReportFreeText && rep.evalReportFreeText.trim()) ||
      (rep.evalReportSummary && rep.evalReportSummary.trim()) ||
      (Array.isArray(rep.statusReportSections) && rep.statusReportSections.length > 0) ||
      (rep.goals || []).some(
        (g) => (g.title && g.title.trim()) || (g.objectives && g.objectives.trim())
      )
  );
};

export default function EcologicalWorkPlanForm({
  student,
  externalRevision = 0,
  goalBank,
  geminiApiKey,
  isAdmin,
  currentUser,
  allowedUsers = [],
  onOpenGoalBankManager,
  onSaveStudentPlan,
  onUseOrAddGoalToBank,
  onDraftStateChange,
  onNotifySharedColleague,
  emailEngineConfig,
  onUpdateEmailEngineConfig
}) {
  const containerRef = useRef(null);
  const evalReportSectionRef = useRef(null);
  const statusReportSectionRef = useRef(null);

  const buildNormalizedStudentData = (st) => {
    const initialGender = st?.gender || 'boy';
    const currentYear = st?.schoolYear || 'תשפ"ו (2025-2026)';
    const currentPlanType = st?.planType || 'תל"א (תוכנית לימודים אישית)';
    const normalizedGoals = (st?.goals || []).map((g) =>
      adaptGoalToGender(g, initialGender)
    );
    const normalizedTalaProfileRows = buildDefaultTalaProfileRows(st?.talaProfileRows);
    const normalizedTalaFocusDomains = Array.isArray(st?.talaFocusDomains)
      ? st.talaFocusDomains
      : [];
    const existingReports = { ...(st?.reportsByYear || {}) };
    const existingReportsByPlanType = { ...(st?.reportsByPlanType || {}) };
    const initialRemovedAiGoals = Array.isArray(st?.removedAiGoals) ? st.removedAiGoals : [];
    const initialStatusReportSections = Array.isArray(st?.statusReportSections)
      ? st.statusReportSections
      : [];
    const initialLocked = Boolean(st?.isLocked);

    // Detect if a תח"י report was previously switched to תל"א before per-planType separation existed
    const hasTachiStrengthsOnly =
      !st?.reportsByPlanType &&
      Boolean((st?.strengthsExisting || '').trim() || (st?.strengthsToEmpower || '').trim()) &&
      !(st?.studentGeneralBackground || '').trim() &&
      !(st?.studentSupportReceived || '').trim() &&
      !(st?.studentMainGoal || '').trim() &&
      !hasPopulatedTalaProfile(st);

    const baseSnapshot = {
      date: st?.date || new Date().toLocaleDateString('he-IL'),
      planType: currentPlanType,
      isLocked: initialLocked,
      lockedAt: st?.lockedAt || '',
      lockedBy: st?.lockedBy || '',
      schoolName: st?.schoolName || '',
      gradeClass: st?.gradeClass || '',
      homeroomTeacher: st?.homeroomTeacher || '',
      integrationTeacher: st?.integrationTeacher || '',
      additionalPartners: st?.additionalPartners || '',
      learningSupportAssistant: st?.learningSupportAssistant || '',
      counselorName: st?.counselorName || '',
      psychologistName: st?.psychologistName || '',
      matyaCoordinator: st?.matyaCoordinator || '',
      emotionalTherapist: st?.emotionalTherapist || '',
      paraMedicalTeam: st?.paraMedicalTeam || '',
      teacherFreeText: st?.teacherFreeText || '',
      freeTextAnalyzed: Boolean(st?.freeTextAnalyzed),
      removedAiGoals: initialRemovedAiGoals,
      strengthsExisting: st?.strengthsExisting || '',
      strengthsToEmpower: st?.strengthsToEmpower || '',
      studentGeneralBackground: st?.studentGeneralBackground || '',
      studentSupportReceived: st?.studentSupportReceived || '',
      studentMainGoal: st?.studentMainGoal || '',
      talaProfileRows: normalizedTalaProfileRows,
      talaFocusDomains: normalizedTalaFocusDomains,
      recommendations: st?.recommendations || '',
      evalReportFreeText: st?.evalReportFreeText || '',
      evalReportSummary: st?.evalReportSummary || '',
      statusReportSections: initialStatusReportSections,
      statusReportUpdatedAt: st?.statusReportUpdatedAt || '',
      lastSavedAt: st?.lastSavedAt || '',
      goals: normalizedGoals
    };

    if (hasTachiStrengthsOnly && isTalaPlanType(currentPlanType)) {
      const tachiKey = getPlanTypeStorageKey(currentYear, 'תח"י (תוכנית חינוכית יחידנית)');
      const talaKey = getPlanTypeStorageKey(currentYear, 'תל"א (תוכנית לימודים אישית)');
      existingReportsByPlanType[tachiKey] = {
        ...baseSnapshot,
        planType: 'תח"י (תוכנית חינוכית יחידנית)'
      };
      const emptyTalaReport =
        existingReportsByPlanType[talaKey] ||
        buildFreshReportForPlanType('תל"א (תוכנית לימודים אישית)');
      existingReportsByPlanType[talaKey] = emptyTalaReport;
      existingReports[currentYear] = emptyTalaReport;

      return {
        ...st,
        ...emptyTalaReport,
        schoolYear: currentYear,
        gender: initialGender,
        sharedWith: Array.isArray(st?.sharedWith) ? st.sharedWith : [],
        reportsByYear: existingReports,
        reportsByPlanType: existingReportsByPlanType
      };
    }

    const activePlanKey = getPlanTypeStorageKey(currentYear, currentPlanType);
    existingReportsByPlanType[activePlanKey] = baseSnapshot;
    existingReports[currentYear] = baseSnapshot;

    const stageInfo = detectStudentStage(
      {
        educationalFramework: st?.educationalFramework,
        teacherFreeText: st?.teacherFreeText,
        birthDate: st?.birthDate
      },
      baseSnapshot.date || st?.date
    );
    return {
      ...st,
      ...baseSnapshot,
      schoolYear: currentYear,
      gender: initialGender,
      sharedWith: Array.isArray(st?.sharedWith) ? st.sharedWith : [],
      reportsByYear: existingReports,
      reportsByPlanType: existingReportsByPlanType,
      stage: stageInfo.stage,
      stageSource: stageInfo.stageSource,
      stageReason: stageInfo.stageReason,
      stageUpdatedAt: stageInfo.stageUpdatedAt
    };
  };

  const [formData, setFormData] = useState(() => buildNormalizedStudentData(student));
  const savedSnapshotRef = useRef(JSON.stringify(buildNormalizedStudentData(student)));
  const [hideStudentDetailsOnPrint, setHideStudentDetailsOnPrint] = useState(true); // Default: checked!
  const [saveBanner, setSaveBanner] = useState(false);
  const [autoSavedTime, setAutoSavedTime] = useState('');
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [isReverseEngineering, setIsReverseEngineering] = useState(false);
  const [reverseEngineerStepIdx, setReverseEngineerStepIdx] = useState(0);
  const [reverseEngineerBanner, setReverseEngineerBanner] = useState('');
  const [showFullDocPreview, setShowFullDocPreview] = useState(() =>
    Boolean(student?.isLocked)
  );
  const [isFreeTextCollapsed, setIsFreeTextCollapsed] = useState(() =>
    isRawFreeTextAlreadyAnalyzed(student)
  );
  const [isAdditionalInfoOpen, setIsAdditionalInfoOpen] = useState(false); // Collapsed by default ("מידע נוסף")

  const AI_BUSY_STEPS = [
    'שלב 1/3: מנתח את התיאור החופשי ומזהה מוקדי כוח, תחומי תפקוד ואתגרים של הילד/ה...',
    'שלב 2/3: מתאים מטרות ויעדים לפי גיל ורמת הילד/ה ומחשב משך זמן יחסי (T-Shirt Size)...',
    'שלב 3/3: מנסח בעברית פדגוגית תקנית את טבלת המטרות, היעדים ופרק ההמלצות...'
  ];

  useEffect(() => {
    if (!isReverseEngineering) {
      setReverseEngineerStepIdx(0);
      return;
    }
    const stepTimer = setInterval(() => {
      setReverseEngineerStepIdx((prev) => (prev + 1) % 3);
    }, 1800);
    return () => clearInterval(stepTimer);
  }, [isReverseEngineering]);

  // State for Separate Mid-Year / End-of-Year Evaluation Report & AI Processing
  const [showEvalReportSection, setShowEvalReportSection] = useState(false);
  const [loadingEvalAiKey, setLoadingEvalAiKey] = useState(null);
  const [evalAiSuccessKey, setEvalAiSuccessKey] = useState(null);
  const [isProcessingFullEvalAi, setIsProcessingFullEvalAi] = useState(false);
  const [evalReportAiBanner, setEvalReportAiBanner] = useState('');
  const [emailReportMode, setEmailReportMode] = useState('tala'); // 'tala' | 'eval' | 'status'

  // State for Separate Status Report ("דו"ח מצב")
  const [showStatusReportSection, setShowStatusReportSection] = useState(false);
  const [isGeneratingStatusReport, setIsGeneratingStatusReport] = useState(false);
  const [statusReportStepIdx, setStatusReportStepIdx] = useState(0);
  const [statusReportBanner, setStatusReportBanner] = useState('');
  const [selectedNewStatusSectionNum, setSelectedNewStatusSectionNum] = useState('');

  const STATUS_REPORT_BUSY_STEPS = [
    'שלב 1/3: אוסף ומצליב נתונים מכרטיס התלמיד/ה, המטרות והערכת מחצית / סוף שנה...',
    'שלב 2/3: מסנן סעיפים ללא מידע כדי למנוע השערות ומארגן את תמונת התפקוד העדכנית...',
    'שלב 3/3: מנסח דו"ח מצב חינוכי-תפקודי מקצועי, מכבד וקוהרנטי...'
  ];

  useEffect(() => {
    if (!isGeneratingStatusReport) {
      setStatusReportStepIdx(0);
      return;
    }
    const stepTimer = setInterval(() => {
      setStatusReportStepIdx((prev) => (prev + 1) % 3);
    }, 1800);
    return () => clearInterval(stepTimer);
  }, [isGeneratingStatusReport]);

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
    setShowFullDocPreview(Boolean(normalized.isLocked));
    setIsFreeTextCollapsed(isRawFreeTextAlreadyAnalyzed(normalized));
    setOpenPickerGoalId(null);
    setActiveAiGoalId(null);
    setExpandedQuickObjMap({});
    setExpandedEvalMap({});
    setAutoSavedTime('');
    setEvalReportAiBanner('');
    setStatusReportBanner('');
  }, [student?.id, externalRevision]);

  // Report whether current formData has unsaved changes & perform quiet debounced Auto-Save (Option E)
  useEffect(() => {
    const activeYear = formData.schoolYear || 'תשפ"ו (2025-2026)';
    const activePlanKey = getPlanTypeStorageKey(activeYear, formData.planType);
    const currentSnapshot = extractYearReportFromFormData(formData);
    const syncedDraft = {
      ...formData,
      reportsByYear: {
        ...(formData.reportsByYear || {}),
        [activeYear]: currentSnapshot
      },
      reportsByPlanType: {
        ...(formData.reportsByPlanType || {}),
        [activePlanKey]: currentSnapshot
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
      const snapshotWithTime = extractYearReportFromFormData(updatedWithTime);
      const updated = {
        ...updatedWithTime,
        reportsByYear: {
          ...(formData.reportsByYear || {}),
          [activeYear]: snapshotWithTime
        },
        reportsByPlanType: {
          ...(formData.reportsByPlanType || {}),
          [activePlanKey]: snapshotWithTime
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
  }, [formData, openPickerGoalId, activeAiGoalId, showFullDocPreview, expandedEvalMap, showEvalReportSection, showStatusReportSection, isFreeTextCollapsed, isAdditionalInfoOpen]);

  // Sorted goal bank (most common first, lowest rated at the bottom)
  const sortedGoals = getSortedGoalBank(goalBank);
  const currentGender = formData.gender || 'boy';
  const isReportLocked = Boolean(formData.isLocked);
  const userCanLockReport = canLockReport(formData, currentUser);
  const isTalaMode = isTalaPlanType(formData.planType);

  // Toggle report lock (only owning teacher can lock/unlock; when locked, only Mid-Year/End-Year Evaluation remains editable)
  const handleToggleReportLock = () => {
    if (!userCanLockReport) return;
    const nextLocked = !Boolean(formData.isLocked);
    const nowTime = new Date().toLocaleTimeString('he-IL', {
      hour: '2-digit',
      minute: '2-digit'
    });
    const nowDate = new Date().toLocaleDateString('he-IL');
    const activeYear = formData.schoolYear || 'תשפ"ו (2025-2026)';
    const activePlanKey = getPlanTypeStorageKey(activeYear, formData.planType);

    const updatedWithLock = {
      ...formData,
      isLocked: nextLocked,
      lockedAt: nextLocked ? `${nowDate} ${nowTime}` : '',
      lockedBy: nextLocked ? (currentUser?.name || currentUser?.email || '') : '',
      lastSavedAt: nowTime
    };
    const lockSnapshot = extractYearReportFromFormData(updatedWithLock);
    const updated = {
      ...updatedWithLock,
      reportsByYear: {
        ...(formData.reportsByYear || {}),
        [activeYear]: lockSnapshot
      },
      reportsByPlanType: {
        ...(formData.reportsByPlanType || {}),
        [activePlanKey]: lockSnapshot
      }
    };

    if (nextLocked) {
      setOpenPickerGoalId(null);
      setActiveAiGoalId(null);
      setShowFullDocPreview(true);
    } else {
      setShowFullDocPreview(false);
    }

    savedSnapshotRef.current = JSON.stringify(updated);
    setFormData(updated);
    onSaveStudentPlan(updated);
    if (onDraftStateChange) {
      onDraftStateChange({ isDirty: false, draftData: updated });
    }
    setSaveBanner(true);
    setTimeout(() => setSaveBanner(false), 2500);
  };

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
    const currentSnapshot = extractYearReportFromFormData(formData);
    const syncedCurrent = {
      ...formData,
      reportsByYear: {
        ...(formData.reportsByYear || {}),
        [currentYear]: currentSnapshot
      },
      reportsByPlanType: {
        ...(formData.reportsByPlanType || {}),
        [getPlanTypeStorageKey(currentYear, formData.planType)]: currentSnapshot
      }
    };
    const rolled = buildRolloverStudentForNextYear(syncedCurrent, currentYear, nextYear);
    savedSnapshotRef.current = JSON.stringify(rolled);
    setFormData(rolled);
    setShowFullDocPreview(Boolean(rolled.isLocked));
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

    const currentReadBy = Array.isArray(formData.sharedReadBy) ? formData.sharedReadBy : [];
    const nextReadBy = currentReadBy.filter(
      (em) => String(em || '').trim().toLowerCase() !== cleanEmail
    );
    const nowStamp = new Date().toLocaleString('he-IL', {
      dateStyle: 'short',
      timeStyle: 'short'
    });
    const nextSharedAtByEmail = {
      ...(formData.sharedAtByEmail || {}),
      ...(!exists ? { [cleanEmail]: nowStamp } : {})
    };

    const activeYear = formData.schoolYear || 'תשפ"ו (2025-2026)';
    const currentSnapshot = extractYearReportFromFormData(formData);
    const updated = {
      ...formData,
      sharedWith: nextShared,
      sharedReadBy: nextReadBy,
      sharedByName: currentUser?.name || currentUser?.email || formData.sharedByName || '',
      sharedAtByEmail: nextSharedAtByEmail,
      reportsByYear: {
        ...(formData.reportsByYear || {}),
        [activeYear]: currentSnapshot
      },
      reportsByPlanType: {
        ...(formData.reportsByPlanType || {}),
        [getPlanTypeStorageKey(activeYear, formData.planType)]: currentSnapshot
      }
    };
    savedSnapshotRef.current = JSON.stringify(updated);
    setFormData(updated);
    onSaveStudentPlan(updated);
    if (onNotifySharedColleague) {
      onNotifySharedColleague(formData.id, cleanEmail, !exists);
    }
  };

  // Switch between תל"א and תח"י: keep each plan type completely separate (empty form if the target plan type hasn't been created yet)
  const handlePlanTypeChange = (newPlanType) => {
    if (formData.isLocked) return;
    setFormData((prev) => {
      const currentPlanType = prev.planType || 'תל"א (תוכנית לימודים אישית)';
      if (newPlanType === currentPlanType) return prev;

      const currentYear = prev.schoolYear || 'תשפ"ו (2025-2026)';
      const prevStorageKey = getPlanTypeStorageKey(currentYear, currentPlanType);
      const nextStorageKey = getPlanTypeStorageKey(currentYear, newPlanType);

      const currentReportSnapshot = extractYearReportFromFormData(prev);
      const updatedReportsByPlanType = {
        ...(prev.reportsByPlanType || {}),
        [prevStorageKey]: currentReportSnapshot
      };

      const existingTargetPlanReport = updatedReportsByPlanType[nextStorageKey];
      const genderToUse = prev.gender || 'boy';

      const targetReportToLoad =
        existingTargetPlanReport && hasContentInYearReport(existingTargetPlanReport)
          ? {
              ...existingTargetPlanReport,
              planType: newPlanType,
              talaProfileRows: buildDefaultTalaProfileRows(existingTargetPlanReport.talaProfileRows),
              talaFocusDomains: Array.isArray(existingTargetPlanReport.talaFocusDomains)
                ? existingTargetPlanReport.talaFocusDomains
                : [],
              goals: (existingTargetPlanReport.goals || []).map((g) =>
                adaptGoalToGender(g, genderToUse)
              )
            }
          : buildFreshReportForPlanType(newPlanType);

      const nextData = {
        ...prev,
        ...targetReportToLoad,
        planType: newPlanType,
        reportsByPlanType: {
          ...updatedReportsByPlanType,
          [nextStorageKey]: targetReportToLoad
        },
        reportsByYear: {
          ...(prev.reportsByYear || {}),
          [currentYear]: targetReportToLoad
        }
      };

      setShowFullDocPreview(Boolean(targetReportToLoad.isLocked));
      setIsFreeTextCollapsed(isRawFreeTextAlreadyAnalyzed(nextData));
      return nextData;
    });
    setOpenPickerGoalId(null);
    setActiveAiGoalId(null);
    setReverseEngineerBanner('');
    setEvalReportAiBanner('');
    setStatusReportBanner('');
  };

  // Switch school year: snapshot current year's report and load (or create) the selected year's report
  const handleSchoolYearChange = (newYear) => {
    setFormData((prev) => {
      const currentYear = prev.schoolYear || 'תשפ"ו (2025-2026)';
      if (newYear === currentYear) return prev;

      const currentSnapshot = extractYearReportFromFormData(prev);
      const updatedReportsByYear = {
        ...(prev.reportsByYear || {}),
        [currentYear]: currentSnapshot
      };
      const updatedReportsByPlanType = {
        ...(prev.reportsByPlanType || {}),
        [getPlanTypeStorageKey(currentYear, prev.planType)]: currentSnapshot
      };

      const existingTargetReport = updatedReportsByYear[newYear];
      const genderToUse = prev.gender || 'boy';

      if (existingTargetReport) {
        const resolvedPlanType =
          existingTargetReport.planType || prev.planType || 'תל"א (תוכנית לימודים אישית)';
        const nextData = {
          ...prev,
          schoolYear: newYear,
          date: existingTargetReport.date || new Date().toLocaleDateString('he-IL'),
          planType: resolvedPlanType,
          isLocked: Boolean(existingTargetReport.isLocked),
          lockedAt: existingTargetReport.lockedAt || '',
          lockedBy: existingTargetReport.lockedBy || '',
          schoolName: existingTargetReport.schoolName ?? prev.schoolName ?? '',
          gradeClass: existingTargetReport.gradeClass ?? prev.gradeClass ?? '',
          homeroomTeacher: existingTargetReport.homeroomTeacher ?? prev.homeroomTeacher ?? '',
          integrationTeacher: existingTargetReport.integrationTeacher ?? prev.integrationTeacher ?? '',
          additionalPartners: existingTargetReport.additionalPartners ?? prev.additionalPartners ?? '',
          learningSupportAssistant:
            existingTargetReport.learningSupportAssistant ?? prev.learningSupportAssistant ?? '',
          counselorName: existingTargetReport.counselorName ?? prev.counselorName ?? '',
          psychologistName: existingTargetReport.psychologistName ?? prev.psychologistName ?? '',
          matyaCoordinator: existingTargetReport.matyaCoordinator ?? prev.matyaCoordinator ?? '',
          emotionalTherapist:
            existingTargetReport.emotionalTherapist ?? prev.emotionalTherapist ?? '',
          paraMedicalTeam: existingTargetReport.paraMedicalTeam ?? prev.paraMedicalTeam ?? '',
          teacherFreeText: existingTargetReport.teacherFreeText || '',
          freeTextAnalyzed: Boolean(existingTargetReport.freeTextAnalyzed),
          removedAiGoals: Array.isArray(existingTargetReport.removedAiGoals)
            ? existingTargetReport.removedAiGoals
            : [],
          strengthsExisting: existingTargetReport.strengthsExisting || '',
          strengthsToEmpower: existingTargetReport.strengthsToEmpower || '',
          studentGeneralBackground: existingTargetReport.studentGeneralBackground || '',
          studentSupportReceived: existingTargetReport.studentSupportReceived || '',
          studentMainGoal: existingTargetReport.studentMainGoal || '',
          talaProfileRows: buildDefaultTalaProfileRows(existingTargetReport.talaProfileRows),
          talaFocusDomains: Array.isArray(existingTargetReport.talaFocusDomains)
            ? existingTargetReport.talaFocusDomains
            : [],
          recommendations: existingTargetReport.recommendations || '',
          evalReportFreeText: existingTargetReport.evalReportFreeText || '',
          evalReportSummary: existingTargetReport.evalReportSummary || '',
          statusReportSections: Array.isArray(existingTargetReport.statusReportSections)
            ? existingTargetReport.statusReportSections
            : [],
          statusReportUpdatedAt: existingTargetReport.statusReportUpdatedAt || '',
          lastSavedAt: existingTargetReport.lastSavedAt || '',
          goals: (existingTargetReport.goals || []).map((g) =>
            adaptGoalToGender(g, genderToUse)
          ),
          reportsByYear: updatedReportsByYear,
          reportsByPlanType: updatedReportsByPlanType
        };
        setShowFullDocPreview(Boolean(existingTargetReport.isLocked));
        setIsFreeTextCollapsed(isRawFreeTextAlreadyAnalyzed(nextData));
        return nextData;
      }

      const freshReport = buildFreshReportForPlanType(
        prev.planType || 'תל"א (תוכנית לימודים אישית)'
      );

      setShowFullDocPreview(false);
      setIsFreeTextCollapsed(false);
      return {
        ...prev,
        schoolYear: newYear,
        ...freshReport,
        reportsByYear: {
          ...updatedReportsByYear,
          [newYear]: freshReport
        },
        reportsByPlanType: {
          ...updatedReportsByPlanType,
          [getPlanTypeStorageKey(newYear, freshReport.planType)]: freshReport
        }
      };
    });
    setOpenPickerGoalId(null);
    setActiveAiGoalId(null);
  };

  // Update personal or top-level field (when report is locked, only Evaluation Report fields may be updated)
  const handleFieldChange = (field, value) => {
    const allowedWhenLocked = new Set([
      'evalReportFreeText',
      'evalReportSummary',
      'statusReportSections',
      'statusReportUpdatedAt'
    ]);
    if (formData.isLocked && !allowedWhenLocked.has(field)) return;
    setFormData((prev) => {
      const next = { ...prev, [field]: value };
      if (field === 'educationalFramework' || field === 'teacherFreeText' || field === 'birthDate') {
        const stageInfo = detectStudentStage(
          {
            educationalFramework: next.educationalFramework,
            teacherFreeText: next.teacherFreeText,
            birthDate: next.birthDate
          },
          next.date
        );
        next.stage = stageInfo.stage;
        next.stageSource = stageInfo.stageSource;
        next.stageReason = stageInfo.stageReason;
        next.stageUpdatedAt = stageInfo.stageUpdatedAt;
      }
      return next;
    });
  };

  // Update a row in the 8-row functional profile table (for תל"א)
  const handleTalaProfileRowChange = (rowIdOrDomain, field, value) => {
    if (formData.isLocked) return;
    setFormData((prev) => {
      const currentRows = buildDefaultTalaProfileRows(prev.talaProfileRows);
      const isStrengthField = field === 'strengths' || field === 'strengthsAndFacilitators';
      return {
        ...prev,
        talaProfileRows: currentRows.map((r) =>
          r.id === rowIdOrDomain || r.domain === rowIdOrDomain || r.subDomain === rowIdOrDomain
            ? isStrengthField
              ? { ...r, strengths: value, strengthsAndFacilitators: value }
              : { ...r, toStrengthen: value, areasToStrengthenAndBarriers: value }
            : r
        )
      };
    });
  };

  // Toggle selection of a focus domain for the תל"א work plan
  const handleToggleTalaFocusDomain = (domain) => {
    if (formData.isLocked) return;
    setFormData((prev) => {
      const current = Array.isArray(prev.talaFocusDomains) ? prev.talaFocusDomains : [];
      const next = current.includes(domain)
        ? current.filter((d) => d !== domain)
        : [...current, domain];
      return {
        ...prev,
        talaFocusDomains: next
      };
    });
  };

  // Update student gender ('boy' = בן / זכר, 'girl' = בת / נקבה) and automatically inflect all goals & objectives
  const handleGenderChange = (newGender) => {
    if (formData.isLocked) return;
    setFormData((prev) => ({
      ...prev,
      gender: newGender,
      goals: (prev.goals || []).map((g) => adaptGoalToGender(g, newGender))
    }));
  };

  // Update specific goal row (when report is locked, only Mid-Year / End-of-Year Evaluation fields can be updated!)
  const handleGoalChange = (goalId, field, value) => {
    const allowedEvalFields = new Set([
      'achievementStatus',
      'midYearEvaluation',
      'endYearEvaluation'
    ]);
    const isEvalField = allowedEvalFields.has(field);
    if (formData.isLocked && !isEvalField) return;
    setFormData((prev) => ({
      ...prev,
      goals: (prev.goals || []).map((g) =>
        g.id === goalId
          ? isEvalField
            ? { ...g, [field]: value }
            : { ...g, [field]: value, isTeacherModified: true }
          : g
      )
    }));
  };

  // Toggle whether a specific goal is locked against AI re-analysis
  const handleToggleGoalLock = (goalId) => {
    if (formData.isLocked) return;
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
    if (formData.isLocked) return;
    const newId = 'g_row_' + Date.now();
    const dateInfo = resolveStudentAgeAndDateInfo(formData, formData.teacherFreeText || '');
    const newGoalObj = {
      id: newId,
      environment: ENVIRONMENTS_LIST[0],
      activityParticipation: '',
      title: '',
      objectives: '',
      opportunities: '',
      opportunitiesIntegration: '',
      opportunitiesTherapist: '',
      learningAccommodations: '',
      partners: isTalaMode ? 'מחנכת, מורת שילוב, מטפלת באומנויות' : 'צוות הגן, סייעת אישית',
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
    if (formData.isLocked) return;
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
    if (formData.isLocked) return;
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
          opportunitiesIntegration: g.opportunitiesIntegration || '',
          opportunitiesTherapist: g.opportunitiesTherapist || '',
          learningAccommodations: g.learningAccommodations || '',
          partners: g.partners || bankItem.defaultPartners || (isTalaMode ? 'מחנכת, מורת שילוב, מטפלת באומנויות' : 'צוות חינוכי, הורים'),
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
    if (formData.isLocked) return;
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
    if (formData.isLocked) return;
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
      const prompt = `אתה מדריך פדגוגי מומחה לבניית "תכנית עבודה משותפת ואינטגרטיבית ברוח הגישה האקולוגית" ותל"א / תח"י.
המורה הגדירה את המטרה העליונה הבאה עבור תלמיד/ה (${genderLabel}, גיל: ${dateInfo.ageDescription}):
מטרה: "${goalTitle}"
סביבה / תחום: "${goalRow.environment || 'מרחב הגן / הכיתה'}"
תאריך הזנת המטרה: ${dateInfo.entryDateFormatted}
מידע חופשי על הילד/ה: "${formData.teacherFreeText || ''}"

נסח בדיוק 3 שאלות מנחות (Facilitating Questions) קצרות, מכוונות ומעשיות בעברית (מותאמות ל${genderLabel}) שיסייעו למורה לדייק את מילוי השדות של מטרה זו בטבלה:
- שאלה 1: על התפקוד הנוכחי של הילד/ה והגורמים המאפשרים/המגבילים בסביבה (עבור שדה "פעילות והשתתפות").
- שאלה 2: על צעדים אופרטיביים הדרגתיים ואמצעי תיווך של הצוות (מחנכת, מורת שילוב, מטפלת) בהתאם לגיל הילד/ה ורמתו/ה (עבור שדות "יעדים ולו"ז" ו-"האמצעים לביצוע").
- שאלה 3: על התאמות ללמידה ובדרכי ההיבחנות, תיחום הזמן המשוער לפי גודל המטרה (T-Shirt Size: למשל חודש עד ${dateInfo.plus1Month}, 3 חודשים עד ${dateInfo.plus3Months}, או חצי שנה עד ${dateInfo.plus6Months}) ואמות המידה להערכה.

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
        body: JSON.stringify({ contents: [{ parts: [{ text: maskPromptForAi(formatPromptWithStudentContext(prompt, formData), formData) }] }] })
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

  // Apply teacher's answers to the 3 Facilitating Questions to auto-fill/enrich the goal columns!
  const handleApplyFacilitatingAnswers = async (goalRow) => {
    if (formData.isLocked) return;
    const answers = aiAnswersMap[goalRow.id] || {};
    const ans1 = (answers[0] || '').trim();
    const ans2 = (answers[1] || '').trim();
    const ans3 = (answers[2] || '').trim();
    const genderToUse = formData.gender || 'boy';
    const genderLabel =
      genderToUse === 'girl'
        ? 'בת (לשון נקבה בלבד – למשל: תשתתף, תמתין, תבחר)'
        : 'בן (לשון זכר בלבד – למשל: ישתתף, ימתין, יבחר)';
    const childLabel = genderToUse === 'girl' ? 'הילדה' : 'הילד';
    const dateInfo = resolveStudentAgeAndDateInfo(formData, formData.teacherFreeText || '');

    setLoadingAiForGoalId(goalRow.id);

    if (geminiApiKey && (ans1 || ans2 || ans3)) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`;
        const prompt = `אתה מומחה לכתיבת תכנית עבודה שנתית (תל"א / תח"י) בעברית.
שם הילד/ה: ${childLabel}
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
  "opportunities": "• אמצעי תיווך של המחנכת...",
  "opportunitiesIntegration": "• אמצעי תיווך של מורת שילוב...",
  "opportunitiesTherapist": "• אמצעי תיווך של מטפלת באומנויות...",
  "learningAccommodations": "• התאמות ללמידה ובדרכי ההיבחנות...",
  "partners": "מחנכת, מורת שילוב, מטפלת באומנויות",
  "tShirtSize": "S",
  "duration": "חודש (עד ${dateInfo.plus1Month})",
  "evaluationCriteria": "אמות מידה להערכה..."
}`;

        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: maskPromptForAi(formatPromptWithStudentContext(prompt, formData), formData) }] }] })
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
                  opportunitiesIntegration:
                    enriched.opportunitiesIntegration || g.opportunitiesIntegration,
                  opportunitiesTherapist:
                    enriched.opportunitiesTherapist || g.opportunitiesTherapist,
                  learningAccommodations:
                    enriched.learningAccommodations || g.learningAccommodations,
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
              `בסביבת ${g.environment}, ${childLabel} מתנסה בפעילות עם תיווך מותאם של הצוות.`,
          objectives: ans2
            ? `${g.objectives ? g.objectives + '\n' : ''}• ${ans2}`
            : g.objectives || `• יתקדם בהדרגה לעבר המטרה: ${g.title}.`,
          opportunities: ans2
            ? `${g.opportunities ? g.opportunities + '\n' : ''}• המחנכת תתווך ל${childLabel} באמצעות: ${ans2}.`
            : g.opportunities || `• המבוגר יזמין ויתווך ל${childLabel} באופן יומיומי ומדורג.`,
          opportunitiesIntegration: g.opportunitiesIntegration || `• מורת השילוב תחזק מיומנויות תומכות בקבוצה קטנה.`,
          opportunitiesTherapist: g.opportunitiesTherapist || `• עיבוד חווית ההצלחה וחיזוק הוויסות בחדר הטיפולים.`,
          learningAccommodations: g.learningAccommodations || `• תיווך מילאי, חלוקת משימות לצעדים קטנים והארכת זמן.`,
          partners: ans3 ? ans3 : g.partners || (isTalaMode ? 'מחנכת, מורת שילוב, מטפלת באומנויות' : 'צוות הגן / הכיתה, סייעת אישית, הורים'),
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
    if (formData.isLocked) return;
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

  // Helper to call Gemini API via secure backend proxy
  const callGeminiJson = async (promptText) => {
    // Instead of using client-side API key and direct fetch, call the Cloud Function
    try {
      const functions = getFunctions(); // Initialize Functions
      const callGemini = httpsCallable(functions, 'callGemini'); // Get callable function

      // Mask prompt client-side before sending to function (defense in depth)
      const maskedPromptClientSide = maskPromptForAi(promptText, formData);

      const result = await callGemini({ promptText: maskedPromptClientSide, formData });
      return result.data; // The cloud function returns the parsed JSON
    } catch (error) {
      console.error('Error calling Gemini via backend proxy:', error);
      // Fallback or handle error appropriately in UI
      return null;
    }
  };

  // === SUBMIT BUTTON: Generate Top Summary Table (and Goals if empty) from Teacher's Free Text + All Goals ===
  const handleSubmitGenerateSummaryTable = async () => {
    if (formData.isLocked) return;
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
בהתבסס על הטקסט החופשי שכתבה המורה על הילד/ה ועל המטרות שהוגדרו, הפק תקציר מנהלים תמציתי ומזוקק:
- עבור תח"י: "strengthsExisting" (מוקדי כוח: כוחות קיימים) ו-"strengthsToEmpower" (כוחות להעצמה וחיזוק) — 3-4 נקודות קצרות בכל עמודה.
- עבור תל"א: 
  1. "studentGeneralBackground": רקע על התלמיד (משפחה, אבחנה, טיפול במידה וישנו, מידע הכרחי) — 2-3 פסקאות קצרות ותמציתיות.
  2. "studentSupportReceived": התמיכה שמקבל התלמיד (לימודי, רגשי, חברתי).
  3. "studentMainGoal": מטרות של התלמיד (לאחר שיח אישי) — 1-2 משפטים.
  4. "talaFocusDomains": מערך של תחומים נבחרים מתוך: ["לימודי", "התנהגותי", "רגשי", "חברתי", "חושי- מוטורי", "תקשורתי", "כישורי חיים"].

טקסט חופשי של המורה:
"${freeText}"

המטרות שהוגדרו לתלמיד/ה:
${goalsSummary}

החזר JSON בלבד:
{
  "strengthsExisting": "• תחום אישיותי-רגשי: תמצית קצרה\\n• תחום קוגניטיבי ושפתי: תמצית קצרה",
  "strengthsToEmpower": "• משחקי שולחן וקופסא: תמצית קצרה\\n• מפגש ושיח: תמצית קצרה",
  "studentGeneralBackground": "רקע על התלמיד...",
  "studentSupportReceived": "התמיכה שמקבל התלמיד...",
  "studentMainGoal": "מטרות התלמיד...",
  "talaFocusDomains": ["לימודי", "חברתי"]
}`;

      const parsed = await callGeminiJson(formatPromptWithStudentContext(prompt, formData));
      if (parsed) {
        const nextExisting = parsed.strengthsExisting || formData.strengthsExisting;
        const nextEmpower = parsed.strengthsToEmpower || formData.strengthsToEmpower;
        const updated = {
          ...formData,
          freeTextAnalyzed: true,
          strengthsExisting: nextExisting,
          strengthsToEmpower: nextEmpower,
          studentGeneralBackground:
            parsed.studentGeneralBackground || formData.studentGeneralBackground,
          studentSupportReceived:
            parsed.studentSupportReceived || formData.studentSupportReceived,
          studentMainGoal:
            parsed.studentMainGoal || formData.studentMainGoal,
          talaFocusDomains: Array.isArray(parsed.talaFocusDomains) && parsed.talaFocusDomains.length > 0
            ? parsed.talaFocusDomains
            : formData.talaFocusDomains,
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
      studentGeneralBackground:
        engineered?.studentGeneralBackground || formData.studentGeneralBackground,
      studentSupportReceived:
        engineered?.studentSupportReceived || formData.studentSupportReceived,
      studentMainGoal: engineered?.studentMainGoal || formData.studentMainGoal,
      talaProfileRows: engineered?.talaProfileRows || formData.talaProfileRows,
      talaFocusDomains: engineered?.talaFocusDomains || formData.talaFocusDomains,
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
    if (formData.isLocked) return;
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
המורה הזינה טקסט גולמי ("Raw Data") המתאר ילד/ה במילים חופשיות.
מין הילד/ה שהוגדר בטופס: ${genderInstruction}
גיל הילד/ה: ${dateInfo.ageDescription}
מסגרת חינוכית: ${formData.educationalFramework || 'לא צוין'}
תאריך הזנת המטרות (תאריך ייחוס לחישוב משך הזמן): ${dateInfo.entryDateFormatted}

הנחיות קריטיות לעיבוד המידע:
1. אל תעתיק משפטים גולמיים מהטקסט "As-Is"! פרש את המשמעות מתוך ההקשר, תקן כל שגיאת כתיב או דקדוק, ונסח מחדש בעברית פדגוגית מקצועית, רהוטה ותקנית המותאמת למין הילד/ה (${genderToUse === 'girl' ? 'לשון נקבה' : 'לשון זכר'}).
2. עבור תל"א הפק את השדות הבאים מתוך הטקסט:
   - "studentGeneralBackground": רקע על התלמיד (משפחה, אבחנה, טיפול במידה וישנו, מידע הכרחי).
   - "studentSupportReceived": התמיכה שמקבל התלמיד (לימודי, רגשי, חברתי).
   - "studentMainGoal": מטרות של התלמיד (לאחר שיח אישי).
   - "talaFocusDomains": מערך של תחומים נבחרים מתוך: ["לימודי", "התנהגותי", "רגשי", "חברתי", "חושי- מוטורי", "תקשורתי", "כישורי חיים"].
   - "talaProfileRows": מערך של 8 אובייקטים לפי 8 התחומים (3 תחת התנהגותי-רגשי-חברתי: "ניהול עצמי", "תקשורת ויחסים בינאישיים", "ניידות וטיפול עצמי"; 5 תחת לימודי: "האזנה ודיבור", "כתיבה", "קריאה והפקת משמעות", "ידע לשוני", "מתמטיקה"), לכל אחד:
     { "subDomain": "...", "strengthsAndFacilitators": "מוקדי כוח וגורמים מסייעים...", "areasToStrengthenAndBarriers": "מוקדים לחיזוק וגורמים מגבילים..." }
3. עבור תח"י: "strengthsExisting" (3-4 נקודות) ו-"strengthsToEmpower" (3-4 נקודות).
4. מטרות ויעדים (T-Shirt Size: S / M / L ומשך יחסי מתאריך ${dateInfo.entryDateFormatted}):
   לכל מטרה כלול גם:
   - "opportunities": אמצעי ביצוע של המחנכת
   - "opportunitiesIntegration": אמצעי ביצוע של מורת שילוב
   - "opportunitiesTherapist": אמצעי ביצוע של מטפלת באומנויות
   - "learningAccommodations": התאמות ללמידה ובדרכי ההיבחנות
${protectedGoalsPromptBlock}${removedGoalsPromptBlock}${unprotectedGoalsPromptBlock}

מאגר סביבות ומטרות:
${bankReference}

טקסט גולמי של המורה:
"""
${rawText}
"""

החזר JSON תקין בלבד:
{
  "name": "",
  "educationalFramework": "",
  "strengthsExisting": "• ...",
  "strengthsToEmpower": "• ...",
  "studentGeneralBackground": "רקע על התלמיד...",
  "studentSupportReceived": "התמיכה שמקבל התלמיד...",
  "studentMainGoal": "מטרות התלמיד...",
  "talaFocusDomains": ["לימודי", "חברתי"],
  "talaProfileRows": [
    { "subDomain": "ניהול עצמי", "strengthsAndFacilitators": "...", "areasToStrengthenAndBarriers": "..." }
  ],
  "goals": [
    {
      "environment": "...",
      "activityParticipation": "...",
      "title": "...",
      "objectives": "• ...",
      "opportunities": "אמצעי מחנכת...",
      "opportunitiesIntegration": "אמצעי מורת שילוב...",
      "opportunitiesTherapist": "אמצעי מטפלת באומנויות...",
      "learningAccommodations": "התאמות ללמידה...",
      "partners": "מחנכת, מורת שילוב, מטפלת באומנויות",
      "tShirtSize": "S",
      "duration": "חודש (עד ${dateInfo.plus1Month})",
      "evaluationCriteria": "..."
    }
  ],
  "recommendations": "..."
}`;

      // Yield briefly so the busy indicator renders immediately
      await new Promise((resolve) => setTimeout(resolve, 60));

      const parsed = await callGeminiJson(formatPromptWithStudentContext(prompt, formData));
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
            opportunitiesIntegration: g.opportunitiesIntegration || '',
            opportunitiesTherapist: g.opportunitiesTherapist || '',
            learningAccommodations: g.learningAccommodations || '',
            partners: g.partners || (isTalaMode ? 'מחנכת, מורת שילוב, מטפלת באומנויות' : 'צוות הגן, הורים'),
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

        const nextExisting = parsed.strengthsExisting || formData.strengthsExisting;
        const nextEmpower = parsed.strengthsToEmpower || formData.strengthsToEmpower;
        const activeYear = formData.schoolYear || 'תשפ"ו (2025-2026)';
        const activePlanKey = getPlanTypeStorageKey(activeYear, formData.planType);

        const updatedBase = {
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
          strengthsExisting: isTalaMode ? '' : nextExisting,
          strengthsToEmpower: isTalaMode ? '' : nextEmpower,
          studentGeneralBackground: isTalaMode
            ? parsed.studentGeneralBackground || formData.studentGeneralBackground
            : '',
          studentSupportReceived: isTalaMode
            ? parsed.studentSupportReceived || formData.studentSupportReceived
            : '',
          studentMainGoal: isTalaMode
            ? parsed.studentMainGoal || formData.studentMainGoal
            : '',
          talaProfileRows: isTalaMode
            ? buildDefaultTalaProfileRows(parsed.talaProfileRows || formData.talaProfileRows)
            : formData.talaProfileRows,
          talaFocusDomains: isTalaMode && Array.isArray(parsed.talaFocusDomains) && parsed.talaFocusDomains.length > 0
            ? parsed.talaFocusDomains
            : formData.talaFocusDomains,
          goals: mergedGoals,
          recommendations: parsed.recommendations || formData.recommendations,
          status: 'מוכן להדפסה',
          lastSavedAt: new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })
        };
        const aiSnapshot = extractYearReportFromFormData(updatedBase);
        const updated = {
          ...updatedBase,
          reportsByYear: {
            ...(formData.reportsByYear || {}),
            [activeYear]: aiSnapshot
          },
          reportsByPlanType: {
            ...(formData.reportsByPlanType || {}),
            [activePlanKey]: aiSnapshot
          }
        };

        savedSnapshotRef.current = JSON.stringify(updated);
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
          `✨ הדוח הרשמי הופק בהצלחה ב-Gemini AI מתוך הטקסט הגולמי! הותאמו זמני יעד יחסיים לפי גודל המטרה (T-Shirt Size), נוסחו פרופיל התלמיד/ה, ${mergedGoals.length} מטרות${preservedNote} ופרק ההמלצות.`
        );
        setSaveBanner(true);
        setTimeout(() => setSaveBanner(false), 3500);
        return;
      }
    }

    // 2. Coherent Built-in Hebrew Pedagogical NLP & Synthesis Engine
    // Give the busy indicator time to display clearly so the teacher sees the analysis in progress
    await new Promise((resolve) => setTimeout(resolve, 1400));

    const engineered = reverseEngineerRawTextLocally(rawText, formData, goalBank);
    if (engineered) {
      const activeYear = formData.schoolYear || 'תשפ"ו (2025-2026)';
      const activePlanKey = getPlanTypeStorageKey(activeYear, formData.planType);
      const updatedBase = {
        ...formData,
        freeTextAnalyzed: true,
        name: engineered.name || formData.name,
        gender: engineered.gender || formData.gender || 'boy',
        educationalFramework: engineered.educationalFramework || formData.educationalFramework,
        strengthsExisting: isTalaMode ? '' : engineered.strengthsExisting,
        strengthsToEmpower: isTalaMode ? '' : engineered.strengthsToEmpower,
        studentGeneralBackground: isTalaMode ? engineered.studentGeneralBackground : '',
        studentSupportReceived: isTalaMode ? engineered.studentSupportReceived : '',
        studentMainGoal: isTalaMode ? engineered.studentMainGoal : '',
        talaProfileRows: isTalaMode ? engineered.talaProfileRows : formData.talaProfileRows,
        talaFocusDomains: isTalaMode ? engineered.talaFocusDomains : formData.talaFocusDomains,
        goals: engineered.goals,
        recommendations: engineered.recommendations,
        status: 'מוכן להדפסה',
        lastSavedAt: new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })
      };
      const localAiSnapshot = extractYearReportFromFormData(updatedBase);
      const updated = {
        ...updatedBase,
        reportsByYear: {
          ...(formData.reportsByYear || {}),
          [activeYear]: localAiSnapshot
        },
        reportsByPlanType: {
          ...(formData.reportsByPlanType || {}),
          [activePlanKey]: localAiSnapshot
        }
      };

      savedSnapshotRef.current = JSON.stringify(updated);
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
        `✨ הדוח הרשמי הופק בהצלחה מתוך הטקסט הגולמי! הותאמו זמני יעד יחסיים לפי גודל המטרה (T-Shirt Size), נוסחו ${isTalaMode ? 'פרופיל התלמיד/ה' : 'טבלת מוקדי הכוח'}, ${engineered.goals.length} מטרות רשמיות${preservedNote} ופרק ההמלצות.`
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
    const activePlanKey = getPlanTypeStorageKey(activeYear, formData.planType);
    const updatedWithTime = {
      ...formData,
      lastSavedAt: nowTime
    };
    const currentSnapshot = extractYearReportFromFormData(updatedWithTime);
    const updated = {
      ...updatedWithTime,
      reportsByYear: {
        ...(formData.reportsByYear || {}),
        [activeYear]: currentSnapshot
      },
      reportsByPlanType: {
        ...(formData.reportsByPlanType || {}),
        [activePlanKey]: currentSnapshot
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

      const parsed = await callGeminiJson(formatPromptWithStudentContext(prompt, formData));
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

    await new Promise((resolve) => setTimeout(resolve, 900));

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

      await new Promise((resolve) => setTimeout(resolve, 60));

      const parsed = await callGeminiJson(formatPromptWithStudentContext(prompt, formData));
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
    await new Promise((resolve) => setTimeout(resolve, 1100));

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

  // === Generate Professional Educational-Functional Status Report ("דו"ח מצב עדכני") ===
  const handleGenerateStatusReport = async () => {
    setIsGeneratingStatusReport(true);
    setStatusReportBanner('');

    const genderToUse = formData.gender || 'boy';
    const isGirl = genderToUse === 'girl';
    const validGoals = (formData.goals || []).filter((g) => !isGoalEmpty(g));
    const dateInfo = resolveStudentAgeAndDateInfo(formData, formData.teacherFreeText || '');

    const hasEvalData = Boolean(
      (formData.evalReportFreeText || '').trim() ||
        (formData.evalReportSummary || '').trim() ||
        validGoals.some(
          (g) =>
            (g.achievementStatus && g.achievementStatus.trim()) ||
            (g.midYearEvaluation && g.midYearEvaluation.trim()) ||
            (g.endYearEvaluation && g.endYearEvaluation.trim())
        )
    );

    if (geminiApiKey && geminiApiKey.trim()) {
      const studentCardPayload = {
        name: formData.name && formData.name !== 'תלמיד/ה חדש/ה' ? formData.name : '',
        gender: isGirl ? 'נקבה (בת)' : 'זכר (בן)',
        birthDate: formData.birthDate || '',
        calculatedAge: dateInfo.ageYears !== null ? dateInfo.ageDescription : '',
        educationalFramework: formData.educationalFramework || '',
        schoolYear: formData.schoolYear || '',
        reportDate: formData.date || '',
        planType: formData.planType || '',
        teacherFreeText: formData.teacherFreeText || '',
        strengthsExisting: formData.strengthsExisting || '',
        strengthsToEmpower: formData.strengthsToEmpower || '',
        recommendations: formData.recommendations || '',
        goals: validGoals.map((g, idx) => ({
          goalNumber: idx + 1,
          environment: g.environment || '',
          activityParticipation: g.activityParticipation || '',
          title: g.title || '',
          objectives: g.objectives || '',
          opportunities: g.opportunities || '',
          partners: g.partners || '',
          duration: g.duration || '',
          evaluationCriteria: g.evaluationCriteria || '',
          achievementStatus: g.achievementStatus || '',
          midYearEvaluation: g.midYearEvaluation || '',
          endYearEvaluation: g.endYearEvaluation || ''
        })),
        midAndEndYearEvaluationReport: {
          exists: hasEvalData,
          evalReportFreeText: formData.evalReportFreeText || '',
          evalReportSummary: formData.evalReportSummary || ''
        }
      };

      const prompt = `אתה משמש כמומחה לכתיבת דו״חות חינוכיים-תפקודיים מקצועיים.

עליך ליצור **דו"ח מצב עדכני ומקצועי עבור התלמיד/ה (${isGirl ? 'בלשון נקבה' : 'בלשון זכר'})**, המבוסס **אך ורק על המידע הקיים בכרטיס התלמיד, במטרות שהוגדרו עבורו, ובמידע המופיע בתוך "הערכת מחצית / סוף שנה", ככל שקיים**.

### כללי עבודה מחייבים
1. **אין להמציא מידע.** אין להוסיף פרטים, אבחנות, יכולות, קשיים, טיפולים, התנהגויות או מסקנות שאינם מופיעים במידע שסופק.
2. **אם מידע מסוים אינו קיים – אין להתייחס אליו.** אין לכתוב "לא ידוע", "לא קיים מידע", "לא נמסר" או ניסוחים דומים, אלא פשוט להשמיט את הסעיף או את התת-סעיף.
3. יש להשתמש במידע מתוך **"הערכת מחצית / סוף שנה"** כאשר הוא קיים ורלוונטי לדו"ח, ולשלב אותו באופן טבעי בתיאור המצב הנוכחי.
4. כאשר קיימים מספר מקורות מידע או עדכונים לאורך זמן, יש להעדיף את **המידע העדכני ביותר**, אך ניתן להשתמש במידע קודם כדי לתאר נקודת מוצא, תהליך או התקדמות.
5. אין להסיק אבחנות או מסקנות קליניות שאינן כתובות במפורש במידע המקורי.
6. אין להשתמש בשפה שיפוטית, ביקורתית או מתייגת. יש להשתמש בשפה מקצועית, מכבדת, עניינית וניטרלית.
7. יש להבחין בין:
   - מידע עובדתי שנמסר על התלמיד.
   - תיאור תפקוד שנצפה או דווח.
   - התקדמות שניתן לזהות מהמידע הקיים.
   - מטרות שהוגדרו לתלמיד.
   אין להציג השערה או פרשנות כאילו היא עובדה.
8. יש להימנע מחזרות מיותרות. אם מידע מסוים רלוונטי למספר תחומים, שלב אותו באופן תמציתי בכל מקום שבו הוא משמעותי.
9. הדו"ח צריך לתאר את **מצבו הנוכחי של התלמיד**, ולא להיות רשימה טכנית של הנתונים שהוזנו.
10. כתוב בעברית מקצועית, ברורה, טבעית וזורמת.
11. אין להוסיף סעיפים חדשים מעבר למבנה המוגדר להלן.
12. אם אין מספיק מידע כדי למלא סעיף מסוים, השמט אותו לחלוטין (אל תכלול אותו במערך "sections" ב-JSON).

### מבנה הדו"ח (כלול במערך "sections" אך ורק סעיפים מתוך 1-15 שיש עבורם מידע מבוסס בנתונים!):
1. פרטים מזהים ורקע כללי (גיל, מסגרת, כיתה / גן, ותק במסגרת, סיבת הדיווח – רק אם קיים מידע)
2. רקע התפתחותי ואבחוני רלוונטי (אבחנות, טיפולים, מידע רפואי / התפתחותי המשפיע על התפקוד – רק אם קיים מידע)
3. תיאור תפקוד כללי במסגרת (השתלבות בשגרת היום, רמת עצמאות, צורך בתיווך ובסיוע – רק על בסיס מידע קיים)
4. תחום לימודי / קוגניטיבי (הבנת הוראות, למידה, קשב והתמדה, שפה, קריאה וכתיבה, חשבון, קצב ועצמאות בלמידה – רק לנושאים שלגביהם קיים מידע)
5. תחום שפתי ותקשורתי (הבנה, הבעה, אוצר מילים, ניהול שיח, תקשורת עם מבוגרים וילדים)
6. תחום חברתי (יצירת קשר, משחק, השתתפות בקבוצה, יוזמה חברתית, הבנת מצבים חברתיים, פתרון קונפליקטים)
7. תחום רגשי והתנהגותי (ויסות, התמודדות עם תסכול, גמישות, תגובה לשינויים, התנהגויות מאתגרות והנסיבות שבהן הן מופיעות)
8. תפקודי עצמאות והתארגנות (התארגנות, מעברים, אכילה ושירותים בהתאם לגיל ולרלוונטיות, שימוש בציוד, ביצוע שגרות)
9. חוזקות ותחומי עניין (יכולות בולטות, תחומי עניין, תנאים שבהם הילד מצליח במיוחד)
10. מענים והתערבויות שניתנו (מה ניתן, באיזו תדירות ולמשך כמה זמן, התאמות ותיווך, מי סיפק את המענה – רק אם המידע קיים)
11. התקדמות בעקבות ההתערבות (נקודת מוצא, שינויים שהתרחשו, מה הילד עושה כיום, מה עדיין דורש סיוע – רק כאשר קיים מידע המאפשר זאת; אין לטעון שהתרחשה התקדמות אם אין מידע המאפשר לקבוע זאת)
12. רמת התמיכה הנדרשת כיום (מה מבצע באופן עצמאי, מה דורש תזכורת / רמז, מה דורש תיווך או סיוע משמעותי, באילו מצבים התמיכה נדרשת)
13. השפעת הקשיים על ההשתתפות והתפקוד (למידה, השתתפות בפעילויות, עצמאות, קשרים חברתיים, השתלבות במסגרת – רק השפעות הנתמכות במידע)
14. מטרות להמשך (מבוסס על המטרות שהוגדרו לתלמיד ועל מידע רלוונטי הקיים בהערכת מחצית / סוף שנה: יעדים מרכזיים, סדרי עדיפויות, מדדי הצלחה; אין להמציא מטרות חדשות ואם לא הוגדרו מדדי הצלחה אין להמציא מדדים)
15. סיכום והמלצות מקצועיות (תמונת התפקוד הכוללת, צרכים מרכזיים, התאמות ומענים הנדרשים להמשך – מבוסס על המידע הקיים בלבד)

### הנחיה חשובה לגבי "הערכת מחצית / סוף שנה"
לפני כתיבת הדו"ח, בדוק האם קיימת עבור התלמיד "הערכת מחצית / סוף שנה" (שדה midAndEndYearEvaluationReport.exists או הערכות במטרות).
- אם קיימת: השתמש במידע שבה כחלק מרכזי מתיאור המצב, זהה מידע המתאר את התפקוד הנוכחי, זהה שינויים או התקדמות ביחס למצב קודם רק כאשר הדבר מתועד, ושלב את המידע בסעיפים המתאימים במקום להעתיק את ההערכה כמות שהיא.
- אם אינה קיימת: התבסס רק על שאר המידע הזמין (והשמט את סעיף 11 אם אין תיעוד על התקדמות).

### סגנון הכתיבה ועיצוב בולטים מקצועיים (ללא מספור!)
הדו"ח צריך להישמע כאילו נכתב על ידי איש מקצוע שמכיר את התלמיד ואת תפקודו במסגרת.
- **אין להשתמש במספור (1., 2., וכו') כלל** — לא בכותרות הסעיפים ("title") ולא בתוך תוכן הסעיפים ("content").
- הצג את הנקודות בתוך כל סעיף באמצעות **תבליטים (Bullets) מקצועיים וברורים (• )** המופרדים בירידת שורה (\\n), בניסוח מקצועי, קוהרנטי וזורם.
- הכלל החשוב ביותר: עדיף להשמיט מידע חסר מאשר להשלים אותו באמצעות הנחה או המצאה.

נתוני כרטיס התלמיד/ה, המטרות והערכת מחצית/סוף שנה:
${JSON.stringify(studentCardPayload, null, 2)}

החזר JSON תקין בלבד במבנה הבא (ללא סעיפים חסרי מידע, וללא מספרים בכותרות או בתוכן):
{
  "sections": [
    {
      "sectionNumber": 1,
      "title": "פרטים מזהים ורקע כללי",
      "content": "• ..."
    }
  ]
}`;

      await new Promise((resolve) => setTimeout(resolve, 60));
      const parsed = await callGeminiJson(formatPromptWithStudentContext(prompt, formData));
      if (parsed && Array.isArray(parsed.sections) && parsed.sections.length > 0) {
        const sanitized = sanitizeStatusReportSections(parsed.sections, genderToUse);
        if (sanitized.length > 0) {
          const nowStamp = new Date().toLocaleTimeString('he-IL', {
            hour: '2-digit',
            minute: '2-digit'
          });
          const updated = {
            ...formData,
            statusReportSections: sanitized,
            statusReportUpdatedAt: nowStamp
          };
          setFormData(updated);
          onSaveStudentPlan(updated);
          setIsGeneratingStatusReport(false);
          setStatusReportBanner(
            '✨ דו"ח המצב הופק בהצלחה ב-Gemini AI.'
          );
          return;
        }
      }
    }

    // Built-in Deterministic Pedagogical Status Report Generator
    await new Promise((resolve) => setTimeout(resolve, 1200));
    const localSections = generateStatusReportLocally(formData);
    const nowStamp = new Date().toLocaleTimeString('he-IL', {
      hour: '2-digit',
      minute: '2-digit'
    });
    const updated = {
      ...formData,
      statusReportSections: localSections,
      statusReportUpdatedAt: nowStamp
    };
    setFormData(updated);
    onSaveStudentPlan(updated);
    setIsGeneratingStatusReport(false);
    setStatusReportBanner(
      '✨ דו"ח המצב העדכני הופק בהצלחה.'
    );
  };

  const handleUpdateStatusSectionContent = (sectionNumber, newContent) => {
    setFormData((prev) => ({
      ...prev,
      statusReportSections: (prev.statusReportSections || []).map((sec) =>
        sec.sectionNumber === sectionNumber ? { ...sec, content: newContent } : sec
      )
    }));
  };

  const handleRemoveStatusSection = (sectionNumber) => {
    setFormData((prev) => ({
      ...prev,
      statusReportSections: (prev.statusReportSections || []).filter(
        (sec) => sec.sectionNumber !== sectionNumber
      )
    }));
  };

  const handleAddManualStatusSection = (sectionNumber) => {
    const num = Number(sectionNumber);
    if (!num) return;
    const schemaItem = STATUS_REPORT_SECTIONS_SCHEMA.find((s) => s.sectionNumber === num);
    if (!schemaItem) return;
    setFormData((prev) => {
      const current = prev.statusReportSections || [];
      if (current.some((s) => s.sectionNumber === num)) return prev;
      const next = [
        ...current,
        {
          id: `status_sec_${num}`,
          sectionNumber: num,
          title: schemaItem.title,
          content: ''
        }
      ].sort((a, b) => a.sectionNumber - b.sectionNumber);
      return {
        ...prev,
        statusReportSections: next
      };
    });
    setSelectedNewStatusSectionNum('');
  };

  // === Build Official Document HTML (with or without Privacy Redaction) ===
  const getFullDocTitle = () => buildFullDocTitle(formData);
  const getEvalReportTitle = () => buildEvalReportTitle();
  const getStatusReportTitle = () => buildStatusReportTitle();
  const getDisplayStudentName = () => buildDisplayStudentName(formData, hideStudentDetailsOnPrint);
  const getDisplayMaskedField = (val) => buildDisplayMaskedField(val, hideStudentDetailsOnPrint);
  const getRedactedText = (text) => buildRedactedText(text, formData, hideStudentDetailsOnPrint);
  const getSafeReportFilename = (ext = 'doc', mode = 'tala') => buildSafeReportFilename(formData, hideStudentDetailsOnPrint, ext, mode);
  const getActiveStatusReportSections = () => buildActiveStatusReportSections(formData);

  const buildWordDocumentHtml = () => renderWordDocumentHtml(formData, hideStudentDetailsOnPrint);
  const buildEvalWordDocumentHtml = () => renderEvalWordDocumentHtml(formData, hideStudentDetailsOnPrint);
  const buildStatusReportWordDocumentHtml = () => renderStatusReportWordDocumentHtml(formData, hideStudentDetailsOnPrint);

  const handlePrintDocument = () => {
    handleSaveProgress();
    const logoUrl = new URL('./tala-logo.png', window.location.href).href;
    openHtmlPrintWindow(buildWorkPlanPrintHtml(formData, hideStudentDetailsOnPrint, logoUrl));
  };

  const handlePrintEvalReport = () => {
    handleSaveProgress();
    const logoUrl = new URL('./tala-logo.png', window.location.href).href;
    openHtmlPrintWindow(buildEvalReportPrintHtml(formData, hideStudentDetailsOnPrint, logoUrl));
  };

  const handlePrintStatusReport = () => {
    handleSaveProgress();
    const logoUrl = new URL('./tala-logo.png', window.location.href).href;
    openHtmlPrintWindow(buildStatusReportPrintHtml(formData, hideStudentDetailsOnPrint, logoUrl));
  };

  const createWordBlob = (mode = 'tala') => {
    const wordHtml =
      mode === 'status'
        ? buildStatusReportWordDocumentHtml()
        : mode === 'eval'
        ? buildEvalWordDocumentHtml()
        : buildWordDocumentHtml();
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
    const reportHtml =
      mode === 'status'
        ? buildStatusReportWordDocumentHtml()
        : mode === 'eval'
        ? buildEvalWordDocumentHtml()
        : buildWordDocumentHtml();
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
    setEmailReportMode(mode === 'status' ? 'status' : mode === 'eval' ? 'eval' : 'tala');
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
      const activeMode =
        emailReportMode === 'status' ? 'status' : emailReportMode === 'eval' ? 'eval' : 'tala';
      const fullDocTitle =
        activeMode === 'status'
          ? getStatusReportTitle()
          : activeMode === 'eval'
          ? getEvalReportTitle()
          : getFullDocTitle();
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
    <div
      className={`workplan-form-container ${isReportLocked ? 'report-is-locked' : ''}`}
      dir="rtl"
      ref={containerRef}
    >
      {/* Sticky Top Action & Print Privacy Toolbar */}
      <div className="sticky-action-bar">
        <div className="action-bar-right">
          {/* Yellow Lock / Unlocked Icon at Top of Report (No Labels, Hover Explanation Tooltip) */}
          <div className="report-lock-toggle-wrapper">
            <button
              type="button"
              className={`btn-report-lock-icon ${isReportLocked ? 'locked' : 'unlocked'} ${
                !userCanLockReport ? 'readonly-lock' : ''
              }`}
              onClick={handleToggleReportLock}
              disabled={!userCanLockReport}
              aria-label={isReportLocked ? 'הדו"ח נעול לעריכה' : 'הדו"ח פתוח לעריכה'}
              title={
                isReportLocked
                  ? userCanLockReport
                    ? 'הדו"ח נעול לעריכה (מוסכם וסגור). לא ניתן לערוך את סעיפי התכנית והמטרות, למעט הוספה ועדכון של "הערכת מחצית / סוף שנה". לחצי לפתיחת הנעילה.'
                    : 'הדו"ח נעול לעריכה על ידי המורה האחראי/ת. ניתן להוסיף ולעדכן את "הערכת מחצית / סוף שנה" בלבד.'
                  : userCanLockReport
                    ? 'הדו"ח פתוח לעריכה ולסקירה משותפת. לחצי לנעילת הדו"ח לאחר הסכמת הצוות (גם במצב נעול ניתן להוסיף ולעדכן "הערכת מחצית / סוף שנה").'
                    : 'הדו"ח פתוח לעריכה משותפת. רק המורה האחראי/ת על הדו"ח יכול/ה לנעול אותו.'
              }
            >
              {isReportLocked ? <Lock size={19} /> : <Unlock size={19} />}
            </button>
            <div className="report-lock-hover-tooltip" role="tooltip">
              {isReportLocked ? (
                <>
                  <strong>🔒 הדו"ח נעול לעריכה</strong>
                  <span>
                    תכנית העבודה אושרה וננעלה כך שלא ניתן לערוך את סעיפיה או מטרותיה, למעט הוספה ועדכון של{' '}
                    <strong>"הערכת מחצית / סוף שנה"</strong>.
                    {userCanLockReport
                      ? ' לחצי על הסמל לפתיחת הנעילה.'
                      : ' רק המורה האחראי/ת על הדו"ח יכול/ה לפתוח או לנעול אותו.'}
                  </span>
                </>
              ) : (
                <>
                  <strong>🔓 הדו"ח פתוח לעריכה</strong>
                  <span>
                    הדו"ח פתוח לעריכה ולסקירה משותפת.
                    {userCanLockReport
                      ? ' לאחר הסכמת הצוות, לחצי על הסמל לנעילת הדו"ח (גם במצב נעול ניתן לעדכן "הערכת מחצית / סוף שנה").'
                      : ' רק המורה האחראי/ת על הדו"ח יכול/ה לנעול אותו.'}
                  </span>
                </>
              )}
            </div>
          </div>

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
            <span>{showFullDocPreview ? 'חזרה לתצוגת עריכה' : 'תצוגת מסמך מלאה'}</span>
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
              disabled={isReportLocked}
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

      {/* Full Document View (Replaces Editable Form Sections 1-4 when toggled or when report is locked) */}
      {showFullDocPreview ? (
        <section className="form-section-card live-print-preview-card">
          <div className="section-header-line" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <h3>📄 תצוגת מסמך מלאה</h3>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                type="button"
                disabled={isReportLocked && !userCanLockReport}
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
                  cursor: isReportLocked && !userCanLockReport ? 'not-allowed' : 'pointer',
                  opacity: isReportLocked && !userCanLockReport ? 0.5 : 1
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

            {(() => {
              const previewAdditionalItems = getAdditionalMetadataItems(
                formData,
                hideStudentDetailsOnPrint
              );
              if (previewAdditionalItems.length === 0) return null;
              return (
                <div
                  style={{
                    display: 'flex',
                    gap: '16px',
                    flexWrap: 'wrap',
                    padding: '7px 12px',
                    background: '#f5f3ff',
                    border: '1px solid #8b6fc0',
                    borderRadius: '6px',
                    marginBottom: '12px',
                    fontSize: '12.5px'
                  }}
                >
                  <strong style={{ color: '#4c1d95' }}>מידע נוסף ושותפים חינוכיים:</strong>
                  {previewAdditionalItems.map((it, idx) => (
                    <span key={idx}>
                      <strong>{it.label}:</strong> {it.value}
                    </span>
                  ))}
                </div>
              );
            })()}

            {isTalaMode ? (
              <>
                {(() => {
                  const talaProfile = getEffectiveStudentProfileForTala(
                    formData,
                    hideStudentDetailsOnPrint
                  );
                  const profileRows = getEffectiveTalaProfileRows(formData);
                  const behavioralRows = profileRows.slice(0, 3);
                  const academicRows = profileRows.slice(3);
                  const selectedFocus = Array.isArray(formData.talaFocusDomains)
                    ? formData.talaFocusDomains
                    : [];

                  return (
                    <>
                      {/* 3 Narrative Blocks above the Profile Table */}
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '8px',
                          marginBottom: '14px'
                        }}
                      >
                        <div
                          style={{
                            background: '#f8fafc',
                            border: '1px solid #cbd5e1',
                            borderRight: '4px solid #2b4c73',
                            borderRadius: '6px',
                            padding: '8px 12px',
                            fontSize: '13px',
                            whiteSpace: 'pre-line'
                          }}
                        >
                          <strong style={{ color: '#1e3a5f' }}>
                            רקע על התלמיד (משפחה, אבחנה, טיפול במידה וישנו, מידע הכרחי):
                          </strong>
                          <div>{talaProfile.generalBackground}</div>
                        </div>

                        <div
                          style={{
                            background: '#f8fafc',
                            border: '1px solid #cbd5e1',
                            borderRight: '4px solid #2b4c73',
                            borderRadius: '6px',
                            padding: '8px 12px',
                            fontSize: '13px',
                            whiteSpace: 'pre-line'
                          }}
                        >
                          <strong style={{ color: '#1e3a5f' }}>
                            התמיכה שמקבל התלמיד (לימודי, רגשי, חברתי):
                          </strong>
                          <div>{talaProfile.supportReceived}</div>
                        </div>

                        <div
                          style={{
                            background: '#f8fafc',
                            border: '1px solid #cbd5e1',
                            borderRight: '4px solid #2b4c73',
                            borderRadius: '6px',
                            padding: '8px 12px',
                            fontSize: '13px',
                            whiteSpace: 'pre-line'
                          }}
                        >
                          <strong style={{ color: '#1e3a5f' }}>
                            מטרות של התלמיד (לאחר שיח אישי):
                          </strong>
                          <div>{talaProfile.studentMainGoal}</div>
                        </div>
                      </div>

                      {/* 8-Row Functional Profile Table */}
                      <h4 style={{ margin: '12px 0 6px 0', color: '#1e3a5f', fontSize: '14px' }}>
                        פרופיל - תיאור תפקוד של התלמיד *
                      </h4>
                      <table className="preview-doc-table" style={{ marginBottom: '6px' }}>
                        <thead>
                          <tr style={{ background: '#eaf3fc', color: '#2b4c73' }}>
                            <th style={{ width: '16%' }}>אשכול</th>
                            <th style={{ width: '20%' }}>תחומי תפקוד</th>
                            <th style={{ width: '32%' }}>מוקדים של כח</th>
                            <th style={{ width: '32%' }}>מוקדים לחיזוק</th>
                          </tr>
                        </thead>
                        <tbody>
                          {behavioralRows.map((row, idx) => (
                            <tr key={row.id || `beh_${idx}`}>
                              {idx === 0 && (
                                <td
                                  rowSpan={behavioralRows.length}
                                  style={{
                                    fontWeight: 700,
                                    background: '#f0f5fb',
                                    textAlign: 'center',
                                    verticalAlign: 'middle'
                                  }}
                                >
                                  התנהגותי - רגשי - חברתי
                                </td>
                              )}
                              <td style={{ fontWeight: 700, background: '#f8faff' }}>
                                {row.domain}
                              </td>
                              <td style={{ whiteSpace: 'pre-line' }}>
                                {getRedactedText(row.strengths)}
                              </td>
                              <td style={{ whiteSpace: 'pre-line' }}>
                                {getRedactedText(row.toStrengthen)}
                              </td>
                            </tr>
                          ))}
                          {academicRows.map((row, idx) => (
                            <tr key={row.id || `acad_${idx}`}>
                              {idx === 0 && (
                                <td
                                  rowSpan={academicRows.length}
                                  style={{
                                    fontWeight: 700,
                                    background: '#f0f5fb',
                                    textAlign: 'center',
                                    verticalAlign: 'middle'
                                  }}
                                >
                                  לימודי
                                </td>
                              )}
                              <td style={{ fontWeight: 700, background: '#f8faff' }}>
                                {row.domain}
                              </td>
                              <td style={{ whiteSpace: 'pre-line' }}>
                                {getRedactedText(row.strengths)}
                              </td>
                              <td style={{ whiteSpace: 'pre-line' }}>
                                {getRedactedText(row.toStrengthen)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <div style={{ fontSize: '11.5px', color: '#475569', marginBottom: '14px' }}>
                        * תוך התייחסות לסביבות למידה שונות: שיעורים מקצועיים, פעילויות חוץ בית ספריות, טיולים, הפסקות ועוד.
                      </div>

                      {/* Focus Domains Bar */}
                      <div
                        style={{
                          background: '#eef3fb',
                          border: '1px solid #cbd5e1',
                          borderRadius: '6px',
                          padding: '8px 12px',
                          marginBottom: '10px',
                          fontSize: '13px'
                        }}
                      >
                        <strong style={{ color: '#1e3a5f', marginLeft: '10px' }}>
                          תכנית עבודה — סמן את התחומים הנבחרים בהם מתמקדת התכנית האישית:
                        </strong>
                        <span style={{ display: 'inline-flex', flexWrap: 'wrap', gap: '12px' }}>
                          {TALA_FOCUS_DOMAINS.map((dom) => {
                            const isChecked = selectedFocus.includes(dom);
                            return (
                              <span
                                key={dom}
                                style={{
                                  fontWeight: isChecked ? 700 : 500,
                                  color: isChecked ? '#1e3a5f' : '#475569'
                                }}
                              >
                                {isChecked ? '☑' : '☐'} {dom}
                              </span>
                            );
                          })}
                        </span>
                      </div>

                      {/* 2-Row Header Work Plan Table */}
                      <table className="preview-doc-table" style={{ marginTop: '8px' }}>
                        <thead>
                          <tr style={{ background: '#eaf3fc', color: '#2b4c73', fontWeight: 'bold' }}>
                            <th rowSpan={2} style={{ width: '16%', textAlign: 'center', verticalAlign: 'middle' }}>
                              מטרה
                            </th>
                            <th rowSpan={2} style={{ width: '20%', textAlign: 'center', verticalAlign: 'middle' }}>
                              יעדים ולו"ז
                            </th>
                            <th colSpan={3} style={{ width: '36%', textAlign: 'center' }}>
                              האמצעים לביצוע תוכנית הפעולה על-ידי :
                            </th>
                            <th rowSpan={2} style={{ width: '14%', textAlign: 'center', verticalAlign: 'middle' }}>
                              אמות מידה להערכה
                            </th>
                            <th rowSpan={2} style={{ width: '14%', textAlign: 'center', verticalAlign: 'middle' }}>
                              התאמות ללמידה ובדרכי ההיבחנות
                            </th>
                          </tr>
                          <tr style={{ background: '#f2f7fd', color: '#2b4c73', fontWeight: 'bold' }}>
                            <th style={{ width: '12%', textAlign: 'center' }}>מחנכת</th>
                            <th style={{ width: '12%', textAlign: 'center' }}>מורת שילוב</th>
                            <th style={{ width: '12%', textAlign: 'center' }}>מטפלת באומנויות</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(formData.goals || []).map((g) => {
                            const objectivesWithDuration = [
                              getRedactedText(g.objectives),
                              (g.duration || '').trim()
                                ? `לו"ז: ${getRedactedText(g.duration)}`
                                : ''
                            ]
                              .filter(Boolean)
                              .join('\n\n');
                            return (
                              <tr key={g.id}>
                                <td style={{ whiteSpace: 'pre-line' }}>
                                  {(g.environment || '').trim() && (
                                    <div style={{ fontSize: '11.5px', color: '#475569', marginBottom: '3px' }}>
                                      [{g.environment}]
                                    </div>
                                  )}
                                  <div style={{ fontWeight: 700, color: '#0d2b56' }}>
                                    {getRedactedText(g.title)}
                                  </div>
                                </td>
                                <td style={{ whiteSpace: 'pre-line' }}>{objectivesWithDuration}</td>
                                <td style={{ whiteSpace: 'pre-line' }}>
                                  {getRedactedText(g.opportunities)}
                                </td>
                                <td style={{ whiteSpace: 'pre-line' }}>
                                  {getRedactedText(g.opportunitiesIntegration)}
                                </td>
                                <td style={{ whiteSpace: 'pre-line' }}>
                                  {getRedactedText(g.opportunitiesTherapist)}
                                </td>
                                <td style={{ whiteSpace: 'pre-line' }}>
                                  {getRedactedText(g.evaluationCriteria)}
                                </td>
                                <td style={{ whiteSpace: 'pre-line' }}>
                                  {getRedactedText(g.learningAccommodations)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </>
                  );
                })()}
              </>
            ) : (
              <>
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
              </>
            )}

            {(formData.recommendations || '').trim() && (
              <table className="preview-doc-table" style={{ marginTop: '12px' }}>
                <thead>
                  <tr>
                    <th style={{ background: '#5b9bd5', color: '#fff', textAlign: 'right' }}>המלצות להמשך</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ whiteSpace: 'pre-line' }}>{getRedactedText(formData.recommendations)}</td>
                  </tr>
                </tbody>
              </table>
            )}
          </div>

          <div className="bottom-final-actions" style={{ marginTop: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
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
              style={
                showEvalReportSection
                  ? {
                      background: 'linear-gradient(135deg, #6d28d9 0%, #5b21b6 100%)',
                      color: '#ffffff',
                      borderColor: '#6d28d9',
                      fontWeight: 700
                    }
                  : undefined
              }
            >
              <FileText size={18} />
              <span>הערכת מחצית / סוף שנה</span>
            </button>

            <button
              type="button"
              className="btn-print-doc"
              onClick={() => {
                const next = !showStatusReportSection;
                setShowStatusReportSection(next);
                if (next) {
                  const currentSections = Array.isArray(formData.statusReportSections)
                    ? formData.statusReportSections.filter((s) => (s.content || '').trim())
                    : [];
                  if (currentSections.length === 0 && !isGeneratingStatusReport) {
                    handleGenerateStatusReport();
                  } else {
                    setTimeout(() => {
                      statusReportSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }, 80);
                  }
                }
              }}
              style={{
                background: showStatusReportSection
                  ? 'linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%)'
                  : 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
                color: showStatusReportSection ? '#ffffff' : '#1e40af',
                borderColor: showStatusReportSection ? '#1d4ed8' : '#93c5fd',
                fontWeight: 700
              }}
              title="הפקת דו״ח מצב חינוכי-תפקודי עדכני ומקצועי מבוסס על נתוני הכרטיס, המטרות והערכת מחצית/סוף שנה"
            >
              <FileText size={18} />
              <span>דו"ח מצב</span>
            </button>

            <button type="button" className="btn-send-email-doc" onClick={() => handleOpenEmailModal('tala')}>
              <Mail size={18} />
              <span>שלח למייל</span>
            </button>
          </div>
        </section>
      ) : (
        <>
          {/* Section 1: Student Personal Details & Plan Type Radio Selector */}
          <section className="form-section-card">
        <div className="section-header-line" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          <h3>1. פרטים אישיים של הילד/ה ומסגרת חינוכית</h3>
          <button
            type="button"
            disabled={isReportLocked && !userCanLockReport}
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
              cursor: isReportLocked && !userCanLockReport ? 'not-allowed' : 'pointer',
              opacity: isReportLocked && !userCanLockReport ? 0.5 : 1
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
                disabled={isReportLocked}
                checked={formData.planType === 'תל"א (תוכנית לימודים אישית)'}
                onChange={(e) => handlePlanTypeChange(e.target.value)}
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
                disabled={isReportLocked}
                checked={formData.planType === 'תח"י (תוכנית חינוכית יחידנית)'}
                onChange={(e) => handlePlanTypeChange(e.target.value)}
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
              disabled={isReportLocked}
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
                  disabled={isReportLocked}
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
                  disabled={isReportLocked}
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
              disabled={isReportLocked}
              value={formData.idNumber || ''}
              onChange={(e) => handleFieldChange('idNumber', e.target.value)}
              placeholder="מספר תעודת זהות"
            />
          </div>

          <div className="form-field">
            <label>תאריך לידה:</label>
            <input
              type="text"
              disabled={isReportLocked}
              value={formData.birthDate || ''}
              onChange={(e) => handleFieldChange('birthDate', e.target.value)}
              placeholder="DD/MM/YYYY"
            />
          </div>

          <div className="form-field">
            <label>מסגרת חינוכית:</label>
            <input
              type="text"
              disabled={isReportLocked}
              value={formData.educationalFramework || ''}
              onChange={(e) => handleFieldChange('educationalFramework', e.target.value)}
              placeholder="שם הגן / בית הספר והכיתה"
            />
          </div>

          <div className="form-field">
            <label>כתובת מגורים:</label>
            <input
              type="text"
              disabled={isReportLocked}
              value={formData.address || ''}
              onChange={(e) => handleFieldChange('address', e.target.value)}
              placeholder="רחוב, מספר, עיר"
            />
          </div>

          <div className="form-field">
            <label>טלפון הורים / איש קשר:</label>
            <input
              type="text"
              disabled={isReportLocked}
              value={formData.phone || ''}
              onChange={(e) => handleFieldChange('phone', e.target.value)}
              placeholder="050-0000000"
            />
          </div>
        </div>

        {/* Collapsible Optional Section: מידע נוסף (Collapsed by default) */}
        <div style={{ marginTop: '14px', borderTop: '1px dashed #cbd5e1', paddingTop: '10px' }}>
          <button
            type="button"
            onClick={() => setIsAdditionalInfoOpen((prev) => !prev)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '7px',
              background: isAdditionalInfoOpen ? '#ede9fe' : '#f8fafc',
              color: isAdditionalInfoOpen ? '#5b21b6' : '#334155',
              border: isAdditionalInfoOpen ? '1px solid #c4b5fd' : '1px solid #cbd5e1',
              borderRadius: '8px',
              padding: '6px 14px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            {isAdditionalInfoOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
            <span>מידע נוסף</span>
            {getAdditionalMetadataItems(formData, false).length > 0 && (
              <span
                style={{
                  background: '#7c3aed',
                  color: '#ffffff',
                  borderRadius: '999px',
                  padding: '1px 8px',
                  fontSize: '11px',
                  fontWeight: 700
                }}
              >
                {getAdditionalMetadataItems(formData, false).length}
              </span>
            )}
          </button>

          {isAdditionalInfoOpen && (
            <div
              style={{
                marginTop: '12px',
                padding: '14px',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '10px'
              }}
            >
              <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#475569', marginBottom: '10px' }}>
                פרטי מסגרת, צוות כיתה ושותפים חינוכיים לתהליך (אופציונלי):
              </div>
              <div className="personal-details-grid">
                <div className="form-field">
                  <label>בית הספר:</label>
                  <input
                    type="text"
                    disabled={isReportLocked}
                    value={formData.schoolName || ''}
                    onChange={(e) => handleFieldChange('schoolName', e.target.value)}
                    placeholder="שם בית הספר / המוסד החינוכי"
                  />
                </div>
                <div className="form-field">
                  <label>כיתה:</label>
                  <input
                    type="text"
                    disabled={isReportLocked}
                    value={formData.gradeClass || ''}
                    onChange={(e) => handleFieldChange('gradeClass', e.target.value)}
                    placeholder="למשל: א׳1 / גן שקד"
                  />
                </div>
                <div className="form-field">
                  <label>מחנכת:</label>
                  <input
                    type="text"
                    disabled={isReportLocked}
                    value={formData.homeroomTeacher || ''}
                    onChange={(e) => handleFieldChange('homeroomTeacher', e.target.value)}
                    placeholder="שם מחנכת הכיתה / הגננת"
                  />
                </div>
                <div className="form-field">
                  <label>מורת שילוב:</label>
                  <input
                    type="text"
                    disabled={isReportLocked}
                    value={formData.integrationTeacher || ''}
                    onChange={(e) => handleFieldChange('integrationTeacher', e.target.value)}
                    placeholder="שם מורת השילוב"
                  />
                </div>
                <div className="form-field">
                  <label>תומכת למידה:</label>
                  <input
                    type="text"
                    disabled={isReportLocked}
                    value={formData.learningSupportAssistant || ''}
                    onChange={(e) => handleFieldChange('learningSupportAssistant', e.target.value)}
                    placeholder="שם תומכת הלמידה / סייעת"
                  />
                </div>
                <div className="form-field">
                  <label>יועצת:</label>
                  <input
                    type="text"
                    disabled={isReportLocked}
                    value={formData.counselorName || ''}
                    onChange={(e) => handleFieldChange('counselorName', e.target.value)}
                    placeholder="שם היועצת החינוכית"
                  />
                </div>
                <div className="form-field">
                  <label>פסיכולוגית:</label>
                  <input
                    type="text"
                    disabled={isReportLocked}
                    value={formData.psychologistName || ''}
                    onChange={(e) => handleFieldChange('psychologistName', e.target.value)}
                    placeholder="שם הפסיכולוג/ית"
                  />
                </div>
                <div className="form-field">
                  <label>מתכללת בית ספרית מטעם המתי"א:</label>
                  <input
                    type="text"
                    disabled={isReportLocked}
                    value={formData.matyaCoordinator || ''}
                    onChange={(e) => handleFieldChange('matyaCoordinator', e.target.value)}
                    placeholder="שם מתכללת המתי״א"
                  />
                </div>
                <div className="form-field">
                  <label>מטפלת רגשית / באומנויות:</label>
                  <input
                    type="text"
                    disabled={isReportLocked}
                    value={formData.emotionalTherapist || ''}
                    onChange={(e) => handleFieldChange('emotionalTherapist', e.target.value)}
                    placeholder="שם המטפל/ת הרגשי/ת או באומנויות"
                  />
                </div>
                <div className="form-field">
                  <label>צוות פרא רפואי:</label>
                  <input
                    type="text"
                    disabled={isReportLocked}
                    value={formData.paraMedicalTeam || ''}
                    onChange={(e) => handleFieldChange('paraMedicalTeam', e.target.value)}
                    placeholder="קלינאית תקשורת, מרפאה בעיסוק..."
                  />
                </div>
                <div className="form-field">
                  <label>שותפים נוספים לכתיבת התוכנית:</label>
                  <input
                    type="text"
                    disabled={isReportLocked}
                    value={formData.additionalPartners || ''}
                    onChange={(e) => handleFieldChange('additionalPartners', e.target.value)}
                    placeholder="מורים מקצועיים, הורים, גורמי חוץ..."
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Section 2: Teacher Free Text + עיבוד המידע Button + Student Profile (תל"א) or Strengths Table (תח"י) */}
      <section className="form-section-card highlight-summary-section">
        <div className="section-header-line">
          <h3>
            {isTalaMode
              ? '2. תיאור חופשי של המורה ופרופיל - תיאור תפקוד של התלמיד/ה'
              : '2. תיאור חופשי של המורה וטבלת מוקדי כוח מסכמת'}
          </h3>
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
              <div className="privacy-sensitive-info-note">
                🔒 <strong>לתשומת לבך (שמירה על פרטיות):</strong> נא להימנע מהקלדת פרטים מזהים או מידע אישי רגיש בטקסט החופשי (כגון שמות מלאים של הילד/ה או בני משפחה, מספרי תעודת זהות, טלפונים או כתובות). מומלץ להשתמש בתיאור כללי כגון "הילד/ה" או בראשי תיבות בלבד.
              </div>
              <textarea
                rows={4}
                disabled={isReportLocked}
                value={formData.teacherFreeText || ''}
                onInput={handleTextareaAutoResize}
                onChange={(e) => handleFieldChange('teacherFreeText', e.target.value)}
                placeholder="הזיני כאן מידע גולמי וחופשי על התלמיד/ה... למשל: ילד נעים, חברותי וסקרן בעל יכולת ריכוז טובה, וורבלי ומלא אנרגיות. מתקשה במשחק משותף עם חברים ומשחק לידם באופן תבניתי, לא ניגש לשולחן הסדנא מיוזמתו ומתקשה בתכנון והתארגנות, וזקוק לתיווך בגמילה בשירותים ובוויסות רגשי..."
              />

              <div className="submit-summary-action-row">
                <span className="submit-helper-text">
                  {isTalaMode
                    ? 'לחיצה על "עיבוד המידע" תנתח ב-AI את הטקסט החופשי ותמלא אוטומטית את הרקע והתמיכה, מטרות התלמיד/ה, טבלת הפרופיל התפקודי, תחומי המיקוד וטבלת תוכנית העבודה:'
                    : 'לחיצה על "עיבוד המידע" תנתח ב-AI את הטקסט החופשי ותמלא אוטומטית את טבלת מוקדי הכוח, המטרות והיעדים ושאר סעיפי הטופס:'}
                </span>
                <button
                  type="button"
                  className="btn-submit-generate-summary"
                  onClick={handleReverseEngineerFullReport}
                  disabled={isReportLocked || isReverseEngineering}
                >
                  {isReverseEngineering ? (
                    <Loader2 size={17} className="tala-spin-icon" />
                  ) : (
                    <Sparkles size={17} />
                  )}
                  <span>
                    {isReverseEngineering ? 'מעבד ומנתח את המידע ב-AI...' : 'עיבוד המידע'}
                  </span>
                </button>
              </div>
            </>
          )}

          {isReverseEngineering && (
            <div className="ai-busy-indicator-card" role="status" aria-live="polite">
              <div className="ai-busy-indicator-header">
                <Loader2 size={19} className="tala-spin-icon" />
                <Sparkles size={16} />
                <span>
                  ה-AI מנתח את התיאור החופשי ובונה את תוכנית העבודה... (התהליך עשוי להימשך מספר שניות, נא להמתין)
                </span>
              </div>
              <div className="ai-busy-indicator-sub">
                {AI_BUSY_STEPS[reverseEngineerStepIdx]}
              </div>
              <div className="ai-busy-progress-track">
                <div className="ai-busy-progress-bar" />
              </div>
            </div>
          )}

          {reverseEngineerBanner && !isReverseEngineering && (
            <div className="reverse-engineer-success-banner" style={{ marginTop: isFreeTextCollapsed ? '10px' : undefined }}>
              <CheckCircle2 size={18} />
              <span>{reverseEngineerBanner}</span>
            </div>
          )}
        </div>

        {/* Top Summary Table: In תל"א mode shows the 3 narrative blocks + 8-row Functional Profile Table; in תח"י mode shows Ecological Strengths Table */}
        <div className="top-summary-table-wrapper">
          {isTalaMode ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* 3 Narrative Blocks from the Google Doc Template */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                  gap: '12px'
                }}
              >
                <div className="form-field">
                  <label style={{ fontWeight: 700, color: '#1e3a5f' }}>
                    👤 רקע על התלמיד (משפחה, אבחנה, טיפול במידה וישנו, מידע הכרחי):
                  </label>
                  <textarea
                    rows={4}
                    disabled={isReportLocked}
                    value={formData.studentGeneralBackground || ''}
                    onInput={handleTextareaAutoResize}
                    onChange={(e) =>
                      handleFieldChange('studentGeneralBackground', e.target.value)
                    }
                    placeholder="רקע על התלמיד/ה (משפחה, אבחנה, טיפול במידה וישנו, מידע הכרחי)..."
                  />
                </div>

                <div className="form-field">
                  <label style={{ fontWeight: 700, color: '#1e3a5f' }}>
                    🤝 התמיכה שמקבל התלמיד (לימודי, רגשי, חברתי):
                  </label>
                  <textarea
                    rows={4}
                    disabled={isReportLocked}
                    value={formData.studentSupportReceived || ''}
                    onInput={handleTextareaAutoResize}
                    onChange={(e) =>
                      handleFieldChange('studentSupportReceived', e.target.value)
                    }
                    placeholder="פירוט התמיכות והמענים שמקבל/ת התלמיד/ה בבית הספר ומחוצה לו (לימודי, רגשי, חברתי)..."
                  />
                </div>

                <div className="form-field">
                  <label style={{ fontWeight: 700, color: '#1e3a5f' }}>
                    🎯 מטרות של התלמיד (לאחר שיח אישי):
                  </label>
                  <textarea
                    rows={4}
                    disabled={isReportLocked}
                    value={formData.studentMainGoal || ''}
                    onInput={handleTextareaAutoResize}
                    onChange={(e) => handleFieldChange('studentMainGoal', e.target.value)}
                    placeholder="מטרות של התלמיד/ה במילותיו/ה או לאחר שיח אישי..."
                  />
                </div>
              </div>

              {/* 8-Row Functional Profile Table: פרופיל - תיאור תפקוד של התלמיד * */}
              <div>
                <h4 style={{ margin: '4px 0 8px 0', color: '#1e3a5f', fontSize: '15px' }}>
                  📊 פרופיל - תיאור תפקוד של התלמיד *
                </h4>
                <div className="ecological-6col-table-wrapper">
                  <table className="ecological-6col-table">
                    <thead>
                      <tr>
                        <th style={{ width: '16%' }}>אשכול</th>
                        <th style={{ width: '20%' }}>תחומי תפקוד</th>
                        <th style={{ width: '32%' }}>מוקדים של כח</th>
                        <th style={{ width: '32%' }}>מוקדים לחיזוק</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const profileRows = getEffectiveTalaProfileRows(formData);
                        const behavioralRows = profileRows.slice(0, 3);
                        const academicRows = profileRows.slice(3);

                        return (
                          <>
                            {behavioralRows.map((row, idx) => (
                              <tr key={row.id}>
                                {idx === 0 && (
                                  <td
                                    rowSpan={behavioralRows.length}
                                    data-label="אשכול"
                                    style={{
                                      fontWeight: 700,
                                      color: '#1e3a5f',
                                      background: '#f0f5fb',
                                      textAlign: 'center',
                                      verticalAlign: 'middle',
                                      padding: '10px'
                                    }}
                                  >
                                    התנהגותי - רגשי - חברתי
                                  </td>
                                )}
                                <td
                                  data-label="תחומי תפקוד"
                                  style={{
                                    fontWeight: 700,
                                    color: '#1e3a5f',
                                    background: '#f8fafc',
                                    padding: '10px',
                                    verticalAlign: 'middle'
                                  }}
                                >
                                  {row.domain}
                                </td>
                                <td data-label={`מוקדים של כח (${row.domain})`}>
                                  <textarea
                                    rows={3}
                                    disabled={isReportLocked}
                                    value={row.strengths || ''}
                                    onInput={handleTextareaAutoResize}
                                    onChange={(e) =>
                                      handleTalaProfileRowChange(
                                        row.id,
                                        'strengths',
                                        e.target.value
                                      )
                                    }
                                    placeholder={`מוקדים של כח בתחום ${row.domain}...`}
                                  />
                                </td>
                                <td data-label={`מוקדים לחיזוק (${row.domain})`}>
                                  <textarea
                                    rows={3}
                                    disabled={isReportLocked}
                                    value={row.toStrengthen || ''}
                                    onInput={handleTextareaAutoResize}
                                    onChange={(e) =>
                                      handleTalaProfileRowChange(
                                        row.id,
                                        'toStrengthen',
                                        e.target.value
                                      )
                                    }
                                    placeholder={`מוקדים לחיזוק בתחום ${row.domain}...`}
                                  />
                                </td>
                              </tr>
                            ))}

                            {academicRows.map((row, idx) => (
                              <tr key={row.id}>
                                {idx === 0 && (
                                  <td
                                    rowSpan={academicRows.length}
                                    data-label="אשכול"
                                    style={{
                                      fontWeight: 700,
                                      color: '#1e3a5f',
                                      background: '#f0f5fb',
                                      textAlign: 'center',
                                      verticalAlign: 'middle',
                                      padding: '10px'
                                    }}
                                  >
                                    לימודי
                                  </td>
                                )}
                                <td
                                  data-label="תחומי תפקוד"
                                  style={{
                                    fontWeight: 700,
                                    color: '#1e3a5f',
                                    background: '#f8fafc',
                                    padding: '10px',
                                    verticalAlign: 'middle'
                                  }}
                                >
                                  {row.domain}
                                </td>
                                <td data-label={`מוקדים של כח (${row.domain})`}>
                                  <textarea
                                    rows={3}
                                    disabled={isReportLocked}
                                    value={row.strengths || ''}
                                    onInput={handleTextareaAutoResize}
                                    onChange={(e) =>
                                      handleTalaProfileRowChange(
                                        row.id,
                                        'strengths',
                                        e.target.value
                                      )
                                    }
                                    placeholder={`מוקדים של כח בתחום ${row.domain}...`}
                                  />
                                </td>
                                <td data-label={`מוקדים לחיזוק (${row.domain})`}>
                                  <textarea
                                    rows={3}
                                    disabled={isReportLocked}
                                    value={row.toStrengthen || ''}
                                    onInput={handleTextareaAutoResize}
                                    onChange={(e) =>
                                      handleTalaProfileRowChange(
                                        row.id,
                                        'toStrengthen',
                                        e.target.value
                                      )
                                    }
                                    placeholder={`מוקדים לחיזוק בתחום ${row.domain}...`}
                                  />
                                </td>
                              </tr>
                            ))}
                          </>
                        );
                      })()}
                    </tbody>
                  </table>
                </div>
                <div style={{ fontSize: '12px', color: '#475569', marginTop: '6px' }}>
                  * תוך התייחסות לסביבות למידה שונות: שיעורים מקצועיים, פעילויות חוץ בית ספריות, טיולים, הפסקות ועוד.
                </div>
              </div>
            </div>
          ) : (
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
                      disabled={isReportLocked}
                      value={formData.strengthsExisting || ''}
                      onInput={handleTextareaAutoResize}
                      onChange={(e) => handleFieldChange('strengthsExisting', e.target.value)}
                      placeholder="כוחות קיימים של הילד/ה..."
                    />
                  </td>
                  <td data-label="🌱 כוחות להעצמה וחיזוק">
                    <textarea
                      rows={5}
                      disabled={isReportLocked}
                      value={formData.strengthsToEmpower || ''}
                      onInput={handleTextareaAutoResize}
                      onChange={(e) => handleFieldChange('strengthsToEmpower', e.target.value)}
                      placeholder="כוחות להעצמה וחיזוק..."
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          )}
        </div>
      </section>

      {/* Section 3: Goals & Environments Interactive Builder */}
      <section className="form-section-card">
        <div className="section-header-line">
          <div>
            <h3>
              {isTalaMode
                ? '3. תכנית עבודה – תכנית לימודית יחידנית (תל"א)'
                : '3. הגדרת מטרות ויעדים לפי סביבות פעילות ותחומי תפקוד (תח"י)'}
            </h3>
            <p className="section-sub-desc">
              בחרי מטרה מתוך מאגר המטרות הדינמי או הקלידי מטרה חדשה.
            </p>
          </div>
          <button
            type="button"
            className="btn-add-goal-block"
            onClick={handleAddGoalRow}
            disabled={isReportLocked}
          >
            <Plus size={18} />
            <span>הוסף מטרה / סביבה חדשה</span>
          </button>
        </div>

        {/* In תל"א mode, render Focus Domains Checkboxes from the Google Doc Template */}
        {isTalaMode && (
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: '10px',
              marginBottom: '16px',
              padding: '10px 14px',
              background: '#f0f5fb',
              border: '1px solid #cbd5e1',
              borderRadius: '10px',
              fontSize: '13px'
            }}
          >
            <strong style={{ color: '#1e3a5f' }}>
              סמן את התחומים הנבחרים בהם מתמקדת התכנית האישית:
            </strong>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {TALA_FOCUS_DOMAINS.map((domain) => {
                const isSelected =
                  Array.isArray(formData.talaFocusDomains) &&
                  formData.talaFocusDomains.includes(domain);
                return (
                  <label
                    key={domain}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '4px 12px',
                      borderRadius: '999px',
                      background: isSelected ? '#1e3a5f' : '#ffffff',
                      color: isSelected ? '#ffffff' : '#334155',
                      border: isSelected ? '1px solid #1e3a5f' : '1px solid #cbd5e1',
                      fontWeight: isSelected ? 700 : 500,
                      cursor: isReportLocked ? 'not-allowed' : 'pointer',
                      userSelect: 'none'
                    }}
                  >
                    <input
                      type="checkbox"
                      disabled={isReportLocked}
                      checked={isSelected}
                      onChange={() => handleToggleTalaFocusDomain(domain)}
                      style={{ margin: 0, cursor: isReportLocked ? 'not-allowed' : 'pointer' }}
                    />
                    <span>{domain}</span>
                  </label>
                );
              })}
            </div>
          </div>
        )}

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
                      disabled={isReportLocked}
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
                      disabled={isReportLocked}
                      value={goalRow.environment || ''}
                      onChange={(e) => handleGoalChange(goalRow.id, 'environment', e.target.value)}
                      placeholder="הקלד סביבה..."
                      className="env-text-input"
                    />
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    {!isGoalEmpty(goalRow) && !isReportLocked && (
                      <button
                        type="button"
                        disabled={isReportLocked}
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
                      disabled={isReportLocked}
                      onClick={() => handleDeleteGoalRow(goalRow.id)}
                      title="מחק בלוק מטרה זה"
                    >
                      <Trash2 size={16} />
                      <span>הסר מטרה</span>
                    </button>
                  </div>
                </div>

                {/* In תח"י mode, Activity & Participation appears as a top full-width row above the 6 columns */}
                {!isTalaMode && (
                  <div className="activity-participation-box">
                    <label>
                      <strong>פעילות והשתתפות בסביבה: </strong>
                      <span>
                        תיאור תוך התייחסות לפעילות הספציפית ולתחומי התפקוד השונים במהלך הפעילות:
                      </span>
                    </label>
                    <textarea
                      rows={3}
                      disabled={isReportLocked}
                      value={goalRow.activityParticipation || ''}
                      onInput={handleTextareaAutoResize}
                      onChange={(e) =>
                        handleGoalChange(goalRow.id, 'activityParticipation', e.target.value)
                      }
                      placeholder="תארי כיצד הילד/ה מתפקד/ת בסביבה זו כיום, מה מאפשר ומה מגביל..."
                    />
                  </div>
                )}

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
                        disabled={isReportLocked}
                        onClick={() => {
                          if (isReportLocked) return;
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
                        disabled={isReportLocked}
                        className={`btn-toggle-ai-questions ${isAiOpen ? 'active' : ''}`}
                        onClick={() => {
                          if (isReportLocked) return;
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
                      disabled={isReportLocked}
                      className="hl-goal-main-input"
                      value={goalRow.title || ''}
                      onFocus={() => {
                        if (!isReportLocked && !goalRow.title) {
                          setOpenPickerGoalId(goalRow.id);
                        }
                      }}
                      onChange={(e) => {
                        if (isReportLocked) return;
                        handleGoalChange(goalRow.id, 'title', e.target.value);
                        setPickerSearch(e.target.value);
                        if (!isPickerOpen) setOpenPickerGoalId(goalRow.id);
                      }}
                      placeholder="הקלידי מטרה חדשה או בחרי מתוך ההשלמה האוטומטית של המטרות הנפוצות..."
                    />
                    {!isReportLocked &&
                      goalRow.title &&
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
                  {isPickerOpen && !isReportLocked && (
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
                  {isAiOpen && !isReportLocked && (
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
                              : isTalaMode
                              ? '✨ שלב את התשובות ומלא אוטומטית את עמודות המטרה בטבלת התל"א'
                              : '✨ שלב את התשובות ומלא אוטומטית את 6 עמודות המטרה בטבלה'}
                          </span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Goal Table: 2-Row Header תל"א Work Plan Table OR 6-Column תח"י Ecological Table */}
                <div className="ecological-6col-table-wrapper">
                  {isTalaMode ? (
                    <table className="ecological-6col-table">
                      <thead>
                        <tr>
                          <th rowSpan={2} style={{ width: '16%', verticalAlign: 'middle' }}>
                            מטרה
                            <span className="col-sub">המטרה העליונה</span>
                          </th>
                          <th rowSpan={2} style={{ width: '22%', verticalAlign: 'middle' }}>
                            יעדים ולו"ז
                            <span className="col-sub">צעדים אופרטיביים ומשך</span>
                          </th>
                          <th colSpan={3} style={{ width: '34%', textAlign: 'center' }}>
                            האמצעים לביצוע תוכנית הפעולה על-ידי :
                          </th>
                          <th rowSpan={2} style={{ width: '14%', verticalAlign: 'middle' }}>
                            אמות מידה להערכה
                            <span className="col-sub">מדדי הצלחה</span>
                          </th>
                          <th rowSpan={2} style={{ width: '14%', verticalAlign: 'middle' }}>
                            התאמות ללמידה ובדרכי ההיבחנות
                          </th>
                        </tr>
                        <tr>
                          <th style={{ width: '12%' }}>מחנכת</th>
                          <th style={{ width: '11%' }}>מורת שילוב</th>
                          <th style={{ width: '11%' }}>מטפלת באומנויות</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td data-label="מטרה">
                            <textarea
                              rows={6}
                              disabled={isReportLocked}
                              value={goalRow.title || ''}
                              onInput={handleTextareaAutoResize}
                              onChange={(e) =>
                                handleGoalChange(goalRow.id, 'title', e.target.value)
                              }
                              placeholder="המטרה..."
                              style={{ fontWeight: 700 }}
                            />
                          </td>
                          <td data-label='יעדים ולו"ז'>
                            <textarea
                              rows={5}
                              disabled={isReportLocked}
                              value={goalRow.objectives || ''}
                              onInput={handleTextareaAutoResize}
                              onChange={(e) =>
                                handleGoalChange(goalRow.id, 'objectives', e.target.value)
                              }
                              placeholder="• יעד אופרטיבי 1&#10;• יעד אופרטיבי 2..."
                            />
                            {!isReportLocked && matchedBankItem?.suggestedObjectives?.length > 0 && (
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
                            <div
                              style={{
                                padding: '6px 8px',
                                borderTop: '1px dashed #cbd5e1',
                                background: '#f8fafc'
                              }}
                            >
                              <label
                                style={{
                                  display: 'block',
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  color: '#1e3a5f',
                                  marginBottom: '4px'
                                }}
                              >
                                לו"ז / משך:
                              </label>
                              <select
                                disabled={isReportLocked}
                                value={
                                  (typeof DURATION_TSHIRT_OPTIONS !== 'undefined' && Array.isArray(DURATION_TSHIRT_OPTIONS) ? DURATION_TSHIRT_OPTIONS : []).some(
                                    (opt) => opt.value === (goalRow.duration || '').trim()
                                  )
                                    ? (goalRow.duration || '').trim()
                                    : '__custom__'
                                }
                                onChange={(e) => {
                                  if (e.target.value !== '__custom__') {
                                    handleGoalChange(goalRow.id, 'duration', e.target.value);
                                  }
                                }}
                                style={{
                                  width: '100%',
                                  padding: '4px 6px',
                                  borderRadius: '6px',
                                  border: '1px solid #cbd5e1',
                                  fontSize: '12px',
                                  marginBottom: '4px'
                                }}
                              >
                                <option value="__custom__">בחרי לו"ז מובנה או הקלידי...</option>
                                {(typeof DURATION_TSHIRT_OPTIONS !== 'undefined' && Array.isArray(DURATION_TSHIRT_OPTIONS) ? DURATION_TSHIRT_OPTIONS : []).map((opt) => (
                                  <option key={opt.size} value={opt.value}>
                                    [{opt.size}] {opt.label}
                                  </option>
                                ))}
                              </select>
                              <input
                                type="text"
                                disabled={isReportLocked}
                                value={goalRow.duration || ''}
                                onChange={(e) =>
                                  handleGoalChange(goalRow.id, 'duration', e.target.value)
                                }
                                placeholder="למשל: לאורך השנה / מחצית א׳..."
                                style={{
                                  width: '100%',
                                  padding: '4px 6px',
                                  borderRadius: '6px',
                                  border: '1px solid #cbd5e1',
                                  fontSize: '12px'
                                }}
                              />
                            </div>
                          </td>
                          <td data-label="אמצעים – מחנכת">
                            <textarea
                              rows={6}
                              disabled={isReportLocked}
                              value={goalRow.opportunities || ''}
                              onInput={handleTextareaAutoResize}
                              onChange={(e) =>
                                handleGoalChange(goalRow.id, 'opportunities', e.target.value)
                              }
                              placeholder="אמצעים ופעולות על-ידי המחנכת..."
                            />
                          </td>
                          <td data-label="אמצעים – מורת שילוב">
                            <textarea
                              rows={6}
                              disabled={isReportLocked}
                              value={goalRow.opportunitiesIntegration || ''}
                              onInput={handleTextareaAutoResize}
                              onChange={(e) =>
                                handleGoalChange(
                                  goalRow.id,
                                  'opportunitiesIntegration',
                                  e.target.value
                                )
                              }
                              placeholder="אמצעים ופעולות על-ידי מורת השילוב..."
                            />
                          </td>
                          <td data-label="אמצעים – מטפלת באומנויות">
                            <textarea
                              rows={6}
                              disabled={isReportLocked}
                              value={goalRow.opportunitiesTherapist || ''}
                              onInput={handleTextareaAutoResize}
                              onChange={(e) =>
                                handleGoalChange(
                                  goalRow.id,
                                  'opportunitiesTherapist',
                                  e.target.value
                                )
                              }
                              placeholder="אמצעים ופעולות על-ידי מטפלת באומנויות / רגשית..."
                            />
                          </td>
                          <td data-label="אמות מידה להערכה">
                            <textarea
                              rows={6}
                              disabled={isReportLocked}
                              value={goalRow.evaluationCriteria || ''}
                              onInput={handleTextareaAutoResize}
                              onChange={(e) =>
                                handleGoalChange(goalRow.id, 'evaluationCriteria', e.target.value)
                              }
                              placeholder="כיצד נדע שהמטרה הושגה?"
                            />
                          </td>
                          <td data-label="התאמות ללמידה ובדרכי ההיבחנות">
                            <textarea
                              rows={6}
                              disabled={isReportLocked}
                              value={goalRow.learningAccommodations || ''}
                              onInput={handleTextareaAutoResize}
                              onChange={(e) =>
                                handleGoalChange(
                                  goalRow.id,
                                  'learningAccommodations',
                                  e.target.value
                                )
                              }
                              placeholder="התאמות בדרכי הלמידה וההיבחנות..."
                            />
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  ) : (
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
                              disabled={isReportLocked}
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
                              disabled={isReportLocked}
                              value={goalRow.objectives || ''}
                              onInput={handleTextareaAutoResize}
                              onChange={(e) =>
                                handleGoalChange(goalRow.id, 'objectives', e.target.value)
                              }
                              placeholder="• יעד אופרטיבי 1&#10;• יעד אופרטיבי 2..."
                            />
                            {!isReportLocked && matchedBankItem?.suggestedObjectives?.length > 0 && (
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
                              disabled={isReportLocked}
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
                              disabled={isReportLocked}
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
                              disabled={isReportLocked}
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
                              disabled={isReportLocked}
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
                  )}
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

                      <div className="privacy-sensitive-info-note" style={{ margin: 0 }}>
                        🔒 <strong>שמירה על פרטיות:</strong> נא להימנע מהקלדת שמות מלאים או פרטים מזהים רגישים בהערכת המחצית / סוף השנה (מומלץ להשתמש ב"הילד/ה" או בראשי תיבות בלבד).
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
                                {loadingEvalAiKey === `${goalRow.id}_midYearEvaluation` ? (
                                  <Loader2 size={14} className="tala-spin-icon" />
                                ) : (
                                  <Sparkles size={14} />
                                )}
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
                                {loadingEvalAiKey === `${goalRow.id}_endYearEvaluation` ? (
                                  <Loader2 size={14} className="tala-spin-icon" />
                                ) : (
                                  <Sparkles size={14} />
                                )}
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
          <button
            type="button"
            className="btn-add-goal-block-large"
            onClick={handleAddGoalRow}
            disabled={isReportLocked}
          >
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
            disabled={isReportLocked}
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
            style={
              showEvalReportSection
                ? {
                    background: 'linear-gradient(135deg, #6d28d9 0%, #5b21b6 100%)',
                    color: '#ffffff',
                    borderColor: '#6d28d9',
                    fontWeight: 700
                  }
                : undefined
            }
          >
            <FileText size={18} />
            <span>הערכת מחצית / סוף שנה</span>
          </button>

          <button
            type="button"
            className="btn-print-doc"
            onClick={() => {
              const next = !showStatusReportSection;
              setShowStatusReportSection(next);
              if (next) {
                const currentSections = Array.isArray(formData.statusReportSections)
                  ? formData.statusReportSections.filter((s) => (s.content || '').trim())
                  : [];
                if (currentSections.length === 0 && !isGeneratingStatusReport) {
                  handleGenerateStatusReport();
                } else {
                  setTimeout(() => {
                    statusReportSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }, 80);
                }
              }
            }}
            style={{
              background: showStatusReportSection
                ? 'linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%)'
                : 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
              color: showStatusReportSection ? '#ffffff' : '#1e40af',
              borderColor: showStatusReportSection ? '#1d4ed8' : '#93c5fd',
              fontWeight: 700
            }}
            title="הפקת דו״ח מצב חינוכי-תפקודי עדכני ומקצועי מבוסס על נתוני הכרטיס, המטרות והערכת מחצית/סוף שנה"
          >
            <FileText size={18} />
            <span>דו"ח מצב</span>
          </button>

          <button type="button" className="btn-send-email-doc" onClick={() => handleOpenEmailModal('tala')}>
            <Mail size={18} />
            <span>שלח למייל</span>
          </button>
        </div>
      </section>
        </>
      )}

      {/* Separate Report Section: דוח הערכת מחצית / סוף שנה */}
      {showEvalReportSection && (
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
            <div className="privacy-sensitive-info-note">
              🔒 <strong>לתשומת לבך (שמירה על פרטיות):</strong> נא להימנע מהקלדת פרטים מזהים או מידע אישי רגיש בהערכת המחצית / סוף השנה (כגון שמות מלאים של הילד/ה או בני משפחה, מספרי תעודת זהות, טלפונים או כתובות). מומלץ להשתמש בתיאור כללי כגון "הילד/ה" או בראשי תיבות בלבד.
            </div>
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
                  {isProcessingFullEvalAi ? (
                    <Loader2 size={17} className="tala-spin-icon" />
                  ) : (
                    <Sparkles size={17} />
                  )}
                  <span>
                    {isProcessingFullEvalAi ? 'מעבד ומנתח מידע ב-AI...' : 'עיבוד מידע ב-AI'}
                  </span>
                </button>
              </div>
            )}

            {isProcessingFullEvalAi && (
              <div className="ai-busy-indicator-card" role="status" aria-live="polite">
                <div className="ai-busy-indicator-header">
                  <Loader2 size={19} className="tala-spin-icon" />
                  <Sparkles size={16} />
                  <span>
                    ה-AI מנתח את תיאור ההערכה ומנסח את דוח ההתקדמות למטרות... (נא להמתין מספר שניות)
                  </span>
                </div>
                <div className="ai-busy-progress-track">
                  <div className="ai-busy-progress-bar" />
                </div>
              </div>
            )}

            {evalReportAiBanner && !isProcessingFullEvalAi && (
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
                          {loadingEvalAiKey === `${goalRow.id}_midYearEvaluation` ? (
                            <Loader2 size={14} className="tala-spin-icon" />
                          ) : (
                            <Sparkles size={14} />
                          )}
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
                          {loadingEvalAiKey === `${goalRow.id}_endYearEvaluation` ? (
                            <Loader2 size={14} className="tala-spin-icon" />
                          ) : (
                            <Sparkles size={14} />
                          )}
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

      {/* Separate Report Section: דו"ח מצב חינוכי-תפקודי עדכני */}
      {showStatusReportSection && (
        <StatusReportPanel
          statusReportSectionRef={statusReportSectionRef}
          formData={formData}
          isGeneratingStatusReport={isGeneratingStatusReport}
          statusReportBanner={statusReportBanner}
          onGenerateStatusReport={handleGenerateStatusReport}
          onClose={() => setShowStatusReportSection(false)}
          onRemoveStatusSection={handleRemoveStatusSection}
          onUpdateStatusSectionContent={handleUpdateStatusSectionContent}
          onAddManualStatusSection={handleAddManualStatusSection}
          onTextareaAutoResize={handleTextareaAutoResize}
          onPrintStatusReport={handlePrintStatusReport}
          onDownloadWordStatusReport={() => {
            handleSaveProgress();
            downloadWordFile('status');
          }}
          onOpenEmailStatusReport={() => handleOpenEmailModal('status')}
        />
      )}

      {/* Team Sharing Modal ("שיתוף צוות") */}
      <ShareTeamModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        formData={formData}
        currentUser={currentUser}
        allowedUsers={allowedUsers}
        showAllShareUsers={showAllShareUsers}
        setShowAllShareUsers={setShowAllShareUsers}
        onToggleShareColleague={handleToggleShareColleague}
      />


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
                    {emailReportMode === 'status'
                      ? 'שליחת דו״ח מצב חינוכי-תפקודי במייל'
                      : emailReportMode === 'eval'
                        ? 'שליחת דוח הערכת מחצית / סוף שנה במייל'
                        : 'שליחת תוכנית עבודה במייל'}
                  </h3>
                  <p className="modal-subtitle">
                    {emailReportMode === 'status'
                      ? getStatusReportTitle()
                      : emailReportMode === 'eval'
                        ? getEvalReportTitle()
                        : getFullDocTitle()}{' '}
                    • <strong>{getDisplayStudentName()}</strong>
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
                    const activeMode =
                      emailReportMode === 'status'
                        ? 'status'
                        : emailReportMode === 'eval'
                          ? 'eval'
                          : 'tala';
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
