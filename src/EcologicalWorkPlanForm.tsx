import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Save,
  Printer,
  Sparkles,
  Plus,
  Minus,
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
  Unlock,
    MessageSquare,
  ClipboardCopy,
      FolderOpen
} from 'lucide-react';
import {
  ENVIRONMENTS_LIST,
  SCHOOL_YEARS_LIST,
    TALA_FOCUS_DOMAINS,
  buildDefaultTalaProfileRows,
  isTalaPlanType,
  getSortedGoalBank,
  canonicalizeEnvironment,
  getCanonicalEnvironmentsForStage,
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
    maskSensitiveValue,
    maskPromptForAi,
  getNextSchoolYear,
  buildRolloverStudentForNextYear,
    sanitizeStatusReportSections,
  generateStatusReportLocally
} from './goalBankData';
import {
    loadEmailEngineConfig,
  isDirectEmailEngineConfigured,
  generatePdfBlobFromHtml,
  sendReportEmailInBackground
} from './emailService';
import { extractCoworkerSuggestions, getStudentsWithTeamData, extractTeamDataFromStudent } from './domain/coworkerSuggestions';
import {
  getFullDocTitle as buildFullDocTitle,
  getEvalReportTitle as buildEvalReportTitle,
  getStatusReportTitle as buildStatusReportTitle,
  getDisplayStudentName as buildDisplayStudentName,
  getDisplayMaskedField as buildDisplayMaskedField,
  getRedactedText as buildRedactedText,
  getSafeReportFilename as buildSafeReportFilename,
  getAdditionalMetadataItems,
  getEffectiveStudentProfileForTala,
  getEffectiveTalaProfileRows,
    openHtmlPrintWindow,
  buildWorkPlanPrintHtml,
  buildEvalReportPrintHtml,
  buildStatusReportPrintHtml,
  buildWordDocumentHtml as renderWordDocumentHtml,
  buildEvalWordDocumentHtml as renderEvalWordDocumentHtml,
  buildStatusReportWordDocumentHtml as renderStatusReportWordDocumentHtml
} from './export/wordAndPrintBuilders';
import {
    formatPromptWithStudentContext,
  getEffectiveStudentStage,
  isGoalRelevantForStage
} from './studentStage.js';
import {
  buildBankReferenceForPrompt,
  buildStageRulesBlock,
  enforceGoalStage,
  getCuratedTitlesExclusiveToStage,
  getDefaultEnvironmentForStage,
  getDefaultPartnersForStage,
  resolveGoalStageForBank,
  getStageLabelHe,
  textHasKindergartenMarker,
  adaptTextToSchoolStage
} from './domain/stageGuard';
import { INITIAL_GOAL_BANK } from './goalBankData';
import { canLockReport, isStudentPlanShared } from './domain/permissions';
import StatusReportPanel from './components/form/StatusReportPanel';
import ShareTeamModal from './components/form/ShareTeamModal';
import TeamChatDrawer from './components/form/TeamChatDrawer';
import ParentVoiceControl from './components/form/ParentVoiceControl';
import MinistryCopyModal from './components/form/MinistryCopyModal';
import QuickObservationModal from './components/form/QuickObservationModal';
import DiagnosticIntakeModal from './components/form/DiagnosticIntakeModal';
import PedagogicalFeed from './components/form/PedagogicalFeed';
import {
  migrateLegacyFreeTextToSnippets,
  aggregateSnippetsForAiPrompt,
  syncSnippetsToCombinedText,
  addSnippet,
  removeSnippet
} from './domain/pedagogicalFeed';
import type { PedagogicalSnippet } from './domain/types';
import { removeDiagnosticDocumentFromStudent } from './domain/diagnosticIntake';
import {
  deleteDossierFileBlob,
  deleteDossierFileFromCloud,
  triggerDossierDownload,
  openDossierFilePreview
} from './services/dossierFileStorage';
import { appendToFreeText } from './domain/parentInvite';
import { addObservationToGoal } from './domain/goalObservations';
import { DISCIPLINE_LEAD_OPTIONS } from './domain/studentSyncMerge';
import { callAiProxyEndpoint } from './services/aiProxyClient';
import { usageTelemetryService } from './services/usageTelemetryService';
import { TELEMETRY_EVENTS } from './domain/telemetryTaxonomy';
import { reportHealthEvent } from './services/healthTelemetry';
import { HEALTH_EVENT_KINDS } from './domain/healthEvents';

// NEW: Firebase Functions imports
import {
    DEFAULT_PLAN_TYPE,
  TACHI_PLAN_TYPE,
      extractYearReportFromFormData,
  isRawFreeTextAlreadyAnalyzed,
  hasContentInYearReport,
  normalizeStudentForForm,
  syncActiveReportSnapshot
} from './domain/yearReport';
import { switchPlanType, switchSchoolYear } from './domain/reportSwitching';
import {
  LOCKED_EDITABLE_FIELDS,
  EVAL_GOAL_FIELDS,
  applyFieldChange,
  updateTalaProfileRow,
  toggleFocusDomain,
  applyGoalChange,
  toggleGoalAiLock,
  removeGoalRow,
  buildNewGoalRow,
  applyShareToggle,
  applyShareSettings,
  createTeamMessage,
  appendTeamMessage,
  retractTeamMessage,
  updateStatusSection,
  removeStatusSection,
  addManualStatusSection
} from './domain/workPlanEdits';
import { personalizeBankItem, fillGoalRowFromBank } from './domain/bankGoalApplication';
import { callAiJson } from './services/aiJsonClient';
import { isDemoStudent } from './domain/onboardingJourney';
import { advanceOnboardingStep } from './services/onboardingStorage';

const DURATION_TSHIRT_OPTIONS = [
  { size: 'S', label: 'חודש (קצר/ממוקד)', value: 'חודש' },
  { size: 'S+', label: 'חודשיים', value: 'חודשיים' },
  { size: 'M', label: '3 חודשים', value: '3 חודשים' },
  { size: 'M+', label: '4 חודשים', value: '4 חודשים' },
  { size: 'L', label: 'חצי שנה (מחצית)', value: 'חצי שנה' },
  { size: 'XL', label: 'עד סוף השנה (שנתי)', value: 'עד סוף השנה' }
];



export interface EcologicalWorkPlanFormProps {
  student?: any;
  allStudents?: any[];
  externalRevision?: number;
  goalBank?: any;
  geminiApiKey?: string;
  isAdmin?: boolean;
  currentUser?: any;
  allowedUsers?: any[];
  onOpenGoalBankManager?: () => void;
  onSaveStudentPlan?: any;
  onUseOrAddGoalToBank?: any;
  onDraftStateChange?: any;
  onNotifySharedColleague?: any;
  emailEngineConfig?: any;
  onUpdateEmailEngineConfig?: any;
  activeOnboardingStep?: number;
  onboardingSpotlightTick?: number;
  onGoHome?: any;
  userPreferences?: any;
  privateGoals?: any[];
  [key: string]: any;
}

export default function EcologicalWorkPlanForm({
  student,
  allStudents = [],
  externalRevision = 0,
  goalBank,
  geminiApiKey,
  isAdmin: _isAdmin,
  currentUser,
  allowedUsers = [],
  onOpenGoalBankManager: _onOpenGoalBankManager,
  onSaveStudentPlan,
  onUseOrAddGoalToBank,
  onDraftStateChange,
  onNotifySharedColleague,
  emailEngineConfig,
  onUpdateEmailEngineConfig,
  activeOnboardingStep = 0,
  onboardingSpotlightTick = 0,
  onGoHome,
  userPreferences = {},
  privateGoals = []
}: EcologicalWorkPlanFormProps) {
  const containerRef = useRef<any>(null);
  const section1Ref = useRef<any>(null);
  const section2Ref = useRef<any>(null);
  const section3Ref = useRef<any>(null);
  const section4Ref = useRef<any>(null);
    const evalReportSectionRef = useRef<any>(null);
  const statusReportSectionRef = useRef<any>(null);



  const [formData, setFormData] = useState(() => normalizeStudentForForm(student));
  const savedSnapshotRef = useRef(JSON.stringify(normalizeStudentForForm(student)));
  const [hideStudentDetailsOnPrint, setHideStudentDetailsOnPrint] = useState(
    () => userPreferences?.defaultPrivacyMode === 'acronym'
  );

  // Sync privacy mode immediately when preferences change or when selecting any student plan
  useEffect(() => {
    setHideStudentDetailsOnPrint(userPreferences?.defaultPrivacyMode === 'acronym');
  }, [userPreferences?.defaultPrivacyMode, student?.id]);
  const [showMinistryCopyModal, setShowMinistryCopyModal] = useState(false);
  const [observationModalGoalId, setObservationModalGoalId] = useState<any>(null);
  const [showDiagnosticIntakeModal, setShowDiagnosticIntakeModal] = useState(false);
  const [selectedIntakeDoc, setSelectedIntakeDoc] = useState<any>(null);
  const [viewingDocText, setViewingDocText] = useState<any>(null);
  const [saveBanner, setSaveBanner] = useState(false);
  const [autoSavedTime, setAutoSavedTime] = useState('');
    const [isReverseEngineering, setIsReverseEngineering] = useState(false);
  const [reverseEngineerStepIdx, setReverseEngineerStepIdx] = useState(0);
  const [reverseEngineerBanner, setReverseEngineerBanner] = useState('');
  const [reverseEngineerError, setReverseEngineerError] = useState('');
  const [reverseEngineerElapsedSeconds, setReverseEngineerElapsedSeconds] = useState(0);
  const [showFullDocPreview, setShowFullDocPreview] = useState(() =>
    Boolean(student?.isLocked)
  );
  const [isFreeTextCollapsed, setIsFreeTextCollapsed] = useState(true); // Default - collapsed
  const [isAdditionalInfoOpen, setIsAdditionalInfoOpen] = useState(false); // Collapsed by default ("מידע נוסף")
  const [isDossierOpen, setIsDossierOpen] = useState(false); // Collapsed by default ("תיק מסמכי אבחון")
  const [copyTeamSuccessMsg, setCopyTeamSuccessMsg] = useState('');

  const attachedDocs = Array.isArray(formData.diagnosticDocuments) ? formData.diagnosticDocuments : [];

  const activeSnippets = useMemo<PedagogicalSnippet[]>(() => {
    return migrateLegacyFreeTextToSnippets(
      formData.teacherFreeText,
      formData.pedagogicalSnippets,
      userPreferences?.fullName || currentUser?.name
    );
  }, [formData.teacherFreeText, formData.pedagogicalSnippets, userPreferences?.fullName, currentUser?.name]);

  const handleAddSnippet = (snippet: PedagogicalSnippet) => {
    const currentList = formData.pedagogicalSnippets && formData.pedagogicalSnippets.length > 0
      ? formData.pedagogicalSnippets
      : activeSnippets;
    const nextSnippets = addSnippet(currentList, snippet);
    const combinedText = syncSnippetsToCombinedText(nextSnippets);
    setFormData((prev: any) => ({
      ...prev,
      pedagogicalSnippets: nextSnippets,
      teacherFreeText: combinedText
    }));
  };

  const handleRemoveSnippet = (snippetId: string) => {
    const currentList = formData.pedagogicalSnippets && formData.pedagogicalSnippets.length > 0
      ? formData.pedagogicalSnippets
      : activeSnippets;
    const nextSnippets = removeSnippet(currentList, snippetId);
    const combinedText = syncSnippetsToCombinedText(nextSnippets);
    setFormData((prev: any) => ({
      ...prev,
      pedagogicalSnippets: nextSnippets,
      teacherFreeText: combinedText
    }));
  };

  const handleSaveDraft = () => {
    const snippets = formData.pedagogicalSnippets && formData.pedagogicalSnippets.length > 0
      ? formData.pedagogicalSnippets
      : activeSnippets;
    const combinedText = syncSnippetsToCombinedText(snippets);
    const updated = {
      ...formData,
      pedagogicalSnippets: snippets,
      teacherFreeText: combinedText
    };
    setFormData(updated);
    onSaveStudentPlan?.(updated);
  };

  const handleRemoveDiagnosticDoc = async (docId: any, fileName: any, storagePath: any) => {
    if (window.confirm(`האם את בטוחה שברצונך להסיר את המסמך "${fileName}" מתיק התלמיד/ה?`)) {
      try {
        await deleteDossierFileBlob(docId);
      } catch (_) {}
      if (storagePath) {
        try {
          await deleteDossierFileFromCloud(storagePath);
        } catch (_) {}
      }
      const updated = removeDiagnosticDocumentFromStudent(formData, docId);
      setFormData(updated);
      onSaveStudentPlan?.(updated);
    }
  };

  const coworkerSuggestions = useMemo(
    () => extractCoworkerSuggestions(allStudents, allowedUsers, currentUser),
    [allStudents, allowedUsers, currentUser]
  );

  const studentsWithTeam = useMemo(
    () => getStudentsWithTeamData(allStudents, student?.id, currentUser, allowedUsers),
    [allStudents, student?.id, currentUser, allowedUsers]
  );

  const AI_BUSY_STEPS = [
    'שלב 1/3: מנתח את התיאור החופשי ומזהה מוקדי כוח, תחומי תפקוד ואתגרים של הילד/ה...',
    'שלב 2/3: מתאים מטרות ויעדים לפי גיל ורמת הילד/ה ומחשב משך זמן יחסי (T-Shirt Size)...',
    'שלב 3/3: מנסח בעברית פדגוגית תקנית את טבלת המטרות, היעדים ופרק ההמלצות...'
  ];

  useEffect(() => {
    if (!isReverseEngineering) {
      setReverseEngineerStepIdx(0);
      setReverseEngineerElapsedSeconds(0);
      return;
    }
    const stepTimer = setInterval(() => {
      setReverseEngineerStepIdx((prev) => (prev + 1) % 3);
    }, 1800);
    const secTimer = setInterval(() => {
      setReverseEngineerElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => {
      clearInterval(stepTimer);
      clearInterval(secTimer);
    };
  }, [isReverseEngineering]);

  // State for Separate Mid-Year / End-of-Year Evaluation Report & AI Processing
  const [showEvalReportSection, setShowEvalReportSection] = useState(false);
  const [loadingEvalAiKey, setLoadingEvalAiKey] = useState<any>(null);
  const [evalAiSuccessKey, setEvalAiSuccessKey] = useState<any>(null);
  const [isProcessingFullEvalAi, setIsProcessingFullEvalAi] = useState(false);
  const [evalReportAiBanner, setEvalReportAiBanner] = useState('');
  const [emailReportMode, setEmailReportMode] = useState('tala'); // 'tala' | 'eval' | 'status'

  // State for Separate Status Report ("דו"ח מצב")
  const [showStatusReportSection, setShowStatusReportSection] = useState(false);
  const [isGeneratingStatusReport, setIsGeneratingStatusReport] = useState(false);
    const [statusReportBanner, setStatusReportBanner] = useState('');
  
  // Auto-scroll smooth effect when onboarding tour step advances or "הראה לי במסך" is pressed
  useEffect(() => {
    if (activeOnboardingStep) {
      if (activeOnboardingStep === 2) {
        section1Ref.current?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
      } else if (activeOnboardingStep === 3) {
        setIsFreeTextCollapsed(false);
        setTimeout(() => section2Ref.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' }), 80);
      } else if (activeOnboardingStep === 4) {
        section3Ref.current?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
      } else if (activeOnboardingStep === 6 || activeOnboardingStep === 10) {
        window.scrollTo?.({ top: 0, behavior: 'smooth' });
      } else if (activeOnboardingStep === 7) {
        const pvEl = document.querySelector('[data-testid="onboarding-step7-parent-voice"]');
        if (pvEl?.scrollIntoView) {
          pvEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
          section1Ref.current?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
        }
      } else if (activeOnboardingStep === 8) {
        setShowEvalReportSection(true);
        setTimeout(() => evalReportSectionRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'center' }), 90);
      } else if (activeOnboardingStep === 9) {
        setShowStatusReportSection(true);
        setTimeout(() => statusReportSectionRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'center' }), 90);
      }
      return;
    }
  }, [activeOnboardingStep, onboardingSpotlightTick]);

  
  
  // State for lightweight Team Sharing modal (Option C)
  const [showShareModal, setShowShareModal] = useState(false);
  const [showTeamChatDrawer, setShowTeamChatDrawer] = useState(false);
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const exportDropdownRef = useRef<any>(null);

  useEffect(() => {
    if (!showExportDropdown) return;
    const handleClickOutside = (e: any) => {
      if (exportDropdownRef.current && !exportDropdownRef.current.contains(e.target)) {
        setShowExportDropdown(false);
      }
    };
    const handleKeyDown = (e: any) => {
      if (e.key === 'Escape') {
        setShowExportDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showExportDropdown]);

  // State for Collapsible Mid-Year / End-of-Year Evaluation per goal card (Option A)
  const [expandedEvalMap, setExpandedEvalMap] = useState<any>({});

  // State for "Send to Email" (שלח למייל) modal
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailRecipient, setEmailRecipient] = useState('');
  const [emailFormat, setEmailFormat] = useState('docx'); // 'docx' | 'pdf'
  const [emailStatusMsg, setEmailStatusMsg] = useState('');
  const [emailError, setEmailError] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);
    const [localEngineDraft, setLocalEngineDraft] = useState(() =>
    emailEngineConfig || loadEmailEngineConfig()
  );
  
  // State for Goal Picker / Autocomplete per goal card
  const [openPickerGoalId, setOpenPickerGoalId] = useState<any>(null);
  const [pickerEnvFilter, setPickerEnvFilter] = useState('הכל');
  const [pickerStageFilter, setPickerStageFilter] = useState<any>(null); // null = auto based on student stage
  const [pickerSearch, setPickerSearch] = useState('');
  const [expandedQuickObjMap, setExpandedQuickObjMap] = useState<any>({});

  // State for AI Facilitating Questions per goal card
  const [activeAiGoalId, setActiveAiGoalId] = useState<any>(null);
  const [aiQuestionsMap, setAiQuestionsMap] = useState<any>({});
  const [aiAnswersMap, setAiAnswersMap] = useState<any>({});
  const [loadingAiForGoalId, setLoadingAiForGoalId] = useState<any>(null);

  // Sync when switching selected student from the sidebar list
  useEffect(() => {
    const normalized = normalizeStudentForForm(student);
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

  // Sync background collaboration metadata (teamMessages, sharedReadBy, sharedWith) when student prop updates in real-time
  useEffect(() => {
    if (!student || !student.id) return;
    setFormData((prev: any) => {
      if (!prev || prev.id !== student.id) return prev;
      const prevMsgs = prev.teamMessages || [];
      const newMsgs = student.teamMessages || [];
      const prevReadBy = (prev.sharedReadBy || []).join(',');
      const newReadBy = (student.sharedReadBy || []).join(',');
      const prevSharedWith = (prev.sharedWith || []).join(',');
      const newSharedWith = (student.sharedWith || []).join(',');
      if (
        prevMsgs.length !== newMsgs.length ||
        prevReadBy !== newReadBy ||
        prevSharedWith !== newSharedWith ||
        JSON.stringify(prevMsgs) !== JSON.stringify(newMsgs)
      ) {
        const next = {
          ...prev,
          sharedWith: student.sharedWith || prev.sharedWith,
          sharedReadBy: student.sharedReadBy || prev.sharedReadBy,
          teamMessages: student.teamMessages || prev.teamMessages
        };
        try {
          const parsed = JSON.parse(savedSnapshotRef.current || '{}');
          parsed.sharedWith = next.sharedWith;
          parsed.sharedReadBy = next.sharedReadBy;
          parsed.teamMessages = next.teamMessages;
          savedSnapshotRef.current = JSON.stringify(parsed);
        } catch (_) {}
        return next;
      }
      return prev;
    });
  }, [student?.teamMessages, student?.sharedReadBy, student?.sharedWith]);

  // Report whether current formData has unsaved changes & perform quiet debounced Auto-Save (Option E)
  useEffect(() => {
    const syncedDraft = syncActiveReportSnapshot(formData);
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
      const updated = syncActiveReportSnapshot(updatedWithTime);
      if (isDemoStudent(updated)) {
        if (updated.goals && updated.goals.length > 0) {
          updated.goals[0].observations = [
            {
              id: 'obs_demo_auto_1',
              date: new Date().toLocaleDateString('he-IL'),
              timestamp: new Date().toISOString(),
              authorName: 'שרה כהן (מורת שילוב)',
              supportLevel: 'עצמאי לחלוטין',
              note: 'השתתף בפעילות באופן עצמאי וממוקד, נעזר בכרטיסיית הניווט.'
            }
          ];
        }
      }
      savedSnapshotRef.current = JSON.stringify(updated);
      setFormData(updated);
      onSaveStudentPlan(updated);
      setTimeout(() => {
        section3Ref.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
      }, 300);
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
      allTextareas.forEach((ta: any) => {
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
  const combinedGoalBank = React.useMemo(() => {
    if (!Array.isArray(privateGoals) || privateGoals.length === 0) {
      return goalBank;
    }
    const mappedPrivate = privateGoals.map((pg) => ({
      ...pg,
      isPrivate: true,
      category: pg.domain || 'כללי',
      environment: pg.environment || 'כללי',
      title: pg.text,
      goal: pg.text
    }));
    return [...mappedPrivate, ...(goalBank || [])];
  }, [goalBank, privateGoals]);
  const sortedGoals = getSortedGoalBank(combinedGoalBank);
  const currentGender = formData.gender || 'boy';
  const currentStage = formData.stage === 'kindergarten' ? 'kindergarten' : 'school';
  const isKindergarten = currentStage === 'kindergarten';
  const isReportLocked = Boolean(formData.isLocked);
  const userCanLockReport = canLockReport(formData, currentUser);
  const isTalaMode = isTalaPlanType(formData.planType);
  const isPlanShared = isStudentPlanShared(formData, currentUser);

  // === Stage guard helpers (the student's stage is chosen explicitly by the teacher) ===
  // Every write to the shared goal bank carries the stage the goal actually belongs to.
  const recordGoalInBank = (goal: any) => {
    if (!goal) return;
    onUseOrAddGoalToBank({ ...goal, stage: resolveGoalStageForBank(goal, currentStage) });
  };

  // Validates AI / local generated goals against the student's stage. Teacher-protected goals are
  // returned untouched; corrected goals are re-baselined so they are not mistaken for teacher edits.
  const enforceStageOnGeneratedGoals = (goals: any) => {
    const curatedOtherStageTitles = getCuratedTitlesExclusiveToStage(
      INITIAL_GOAL_BANK,
      currentStage === 'school' ? 'kindergarten' : 'school'
    );
    let droppedCount = 0;
    let correctedCount = 0;
    const kept: any[] = [];
    (goals || []).forEach((g: any) => {
      if (isGoalProtectedFromAiOverwrite(g)) {
        kept.push(g);
        return;
      }
      const r = enforceGoalStage(g, currentStage, {
        curatedOtherStageTitles,
        isTalaMode,
        // If the teacher mentions kindergarten (e.g. the child's history), keep "בגן/מהגן" wording as-is.
        includeBarePlaceWords: !textHasKindergartenMarker(formData.teacherFreeText)
      });
      if (r.dropped) {
        droppedCount += 1;
        return;
      }
      if (r.corrected) correctedCount += 1;
      kept.push(r.corrected && r.goal.aiSnapshot ? attachAiBaselineToGoal(r.goal) : r.goal);
    });
    return { goals: kept, droppedCount, correctedCount };
  };

  // Toggle report lock (only owning teacher can lock/unlock; when locked, only Mid-Year/End-Year Evaluation remains editable)
  const handleToggleReportLock = () => {
    if (!userCanLockReport) return;
    const nextLocked = !Boolean(formData.isLocked);
    const nowTime = new Date().toLocaleTimeString('he-IL', {
      hour: '2-digit',
      minute: '2-digit'
    });
    const nowDate = new Date().toLocaleDateString('he-IL');
    const updatedWithLock = {
      ...formData,
      isLocked: nextLocked,
      lockedAt: nextLocked ? `${nowDate} ${nowTime}` : '',
      lockedBy: nextLocked ? (currentUser?.name || currentUser?.email || '') : '',
      lastSavedAt: nowTime
    };
    const updated = syncActiveReportSnapshot(updatedWithLock);

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

  // Automatically unlock report when teacher accesses evaluation or quick observation on a locked report
  const handleAutoUnlockReport = (_triggerReason = '') => {
    if (!formData.isLocked) return formData;
    const nowTime = new Date().toLocaleTimeString('he-IL', {
      hour: '2-digit',
      minute: '2-digit'
    });
    const updatedWithLock = {
      ...formData,
      isLocked: false,
      lockedAt: '',
      lockedBy: '',
      lastSavedAt: nowTime
    };
    const updated = syncActiveReportSnapshot(updatedWithLock);

    setShowFullDocPreview(false);
    savedSnapshotRef.current = JSON.stringify(updated);
    setFormData(updated);
    onSaveStudentPlan?.(updated);
    if (onDraftStateChange) {
      onDraftStateChange({ isDirty: false, draftData: updated });
    }
    setSaveBanner(true);
    setTimeout(() => setSaveBanner(false), 2500);
    return updated;
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
    const syncedCurrent = syncActiveReportSnapshot(formData);
    const rolled = buildRolloverStudentForNextYear(syncedCurrent, currentYear, nextYear);
    if (!rolled) return;
    savedSnapshotRef.current = JSON.stringify(rolled);
    setFormData(rolled);
    setShowFullDocPreview(Boolean(rolled.isLocked));
    onSaveStudentPlan(rolled);
    setSaveBanner(true);
    setTimeout(() => setSaveBanner(false), 2500);
  };

  // Save all sharing settings and deliver handoff note atomically
  const handleSaveShareSettings = ({ selectedEmails, handoffNote }: any) => {
    const nowStamp = new Date().toLocaleString('he-IL', {
      dateStyle: 'short',
      timeStyle: 'short'
    });
    const res = applyShareSettings(formData, {
      selectedEmails,
      handoffNote,
      actor: currentUser,
      nowStamp,
      allowedUsers
    });
    if (!res) return;
    savedSnapshotRef.current = JSON.stringify(res.next);
    setFormData(res.next);
    onSaveStudentPlan(res.next);
    if (onNotifySharedColleague) {
      const targets = res.notifiedEmails || res.newlyAdded || [];
      targets.forEach((email) => {
        onNotifySharedColleague(formData.id, email, true);
      });
    }
  };

  // Toggle sharing this student with a colleague email (Option C)
  const handleToggleShareColleague = (colleagueEmail: any, messageText = '') => {
    const nowStamp = new Date().toLocaleString('he-IL', {
      dateStyle: 'short',
      timeStyle: 'short'
    });
    const targetColleague = (allowedUsers || []).find(
      (u) => (u.email || '').trim().toLowerCase() === String(colleagueEmail || '').trim().toLowerCase()
    );
    const effectiveActor = {
      ...currentUser,
      name: userPreferences?.fullName || currentUser?.name,
      title: [userPreferences?.professionalTitle || currentUser?.title, userPreferences?.institutionalAffiliation || currentUser?.group].filter(Boolean).join(' • ')
    };
    const res = applyShareToggle(formData, colleagueEmail, effectiveActor, nowStamp, {
      allowedUsers,
      handoffNote: messageText,
      recipientName: targetColleague?.name || ''
    });
    if (!res) return;
    savedSnapshotRef.current = JSON.stringify(res.next);
    setFormData(res.next);
    onSaveStudentPlan(res.next);
    if (onNotifySharedColleague) {
      onNotifySharedColleague(formData.id, res.cleanEmail, res.isNewlyShared);
    }
  };

  // Send a message in the Team Collaboration Thread
  const handleSendTeamMessage = (text: any) => {
    const authorName = userPreferences?.fullName || currentUser?.name || currentUser?.email || 'צוות חינוכי';
    const authorRole = [userPreferences?.professionalTitle || currentUser?.title, userPreferences?.institutionalAffiliation || currentUser?.group]
      .filter(Boolean)
      .join(' • ') || currentUser?.role || 'צוות';
    const msg = createTeamMessage({
      authorEmail: currentUser?.email || '',
      authorName,
      authorRole,
      text,
      type: 'comment',
      schoolYear: formData?.schoolYear || ''
    });
    if (!msg) return;
    const next = appendTeamMessage(formData, msg);
    savedSnapshotRef.current = JSON.stringify(next);
    setFormData(next);
    onSaveStudentPlan(next);

    // Immediately alert all other team members in real-time
    if (onNotifySharedColleague) {
      const currentEmail = (currentUser?.email || '').trim().toLowerCase();
      const allMembers = [
        ...(Array.isArray(formData.sharedWith) ? formData.sharedWith : []),
        formData.ownerEmail
      ].filter(Boolean);
      const uniqueRecipients = [...new Set(allMembers.map((e) => e.trim().toLowerCase()))].filter(
        (e) => e && e !== currentEmail
      );
      uniqueRecipients.forEach((recipientEmail) => {
        onNotifySharedColleague(formData.id, recipientEmail, true);
      });
    }
  };

  // Synchronize incoming team messages from other colleagues in real-time
  useEffect(() => {
    if (student && student.id === formData.id && Array.isArray(student.teamMessages)) {
      const currentMsgCount = (formData.teamMessages || []).length;
      const incomingMsgCount = student.teamMessages.length;
      if (incomingMsgCount !== currentMsgCount || student.lastTeamMessageAt !== formData.lastTeamMessageAt) {
        setFormData((prev: any) => ({
          ...prev,
          teamMessages: student.teamMessages,
          lastTeamMessageAt: student.lastTeamMessageAt,
          lastTeamMessageBy: student.lastTeamMessageBy
        }));
      }
    }
  }, [student?.teamMessages, student?.lastTeamMessageAt]);

  // Retract author's own message in the Team Collaboration Thread
  const handleRetractTeamMessage = (messageId: any) => {
    const next = retractTeamMessage(formData, messageId, currentUser?.email || '');
    if (next === formData) return;
    savedSnapshotRef.current = JSON.stringify(next);
    setFormData(next);
    onSaveStudentPlan(next);
  };

  // Switch between תל"א and תח"י: keep each plan type completely separate (empty form if the target plan type hasn't been created yet)
  const handlePlanTypeChange = (newPlanType: any) => {
    if (formData.isLocked) return;
    const next = switchPlanType(formData, newPlanType);
    if (next === formData) return;
    setFormData(next);
    setShowFullDocPreview(Boolean(next.isLocked));
    setIsFreeTextCollapsed(isRawFreeTextAlreadyAnalyzed(next));
    setOpenPickerGoalId(null);
    setActiveAiGoalId(null);
    setReverseEngineerBanner('');
    setEvalReportAiBanner('');
    setStatusReportBanner('');
  };

  // Switch school year: snapshot current year's report and load (or create) the selected year's report
  const handleSchoolYearChange = (newYear: any) => {
    const next = switchSchoolYear(formData, newYear);
    if (next === formData) return;
    setFormData(next);
    setShowFullDocPreview(Boolean(next.isLocked));
    setIsFreeTextCollapsed(isRawFreeTextAlreadyAnalyzed(next));
    setOpenPickerGoalId(null);
    setActiveAiGoalId(null);
  };

  // Update personal or top-level field (when report is locked, only Evaluation Report fields may be updated)
  const handleFieldChange = (field: any, value: any) => {
    if (formData.isLocked && !LOCKED_EDITABLE_FIELDS.has(field)) return;
    setFormData((prev: any) => applyFieldChange(prev, field, value));
  };

  // Append parent / student answers to the teacher free text, then surface that section
  const handleMergeParentVoice = (block: any) => {
    if (formData.isLocked || !block) return;
    handleFieldChange('teacherFreeText', appendToFreeText(formData.teacherFreeText, block));
    setIsFreeTextCollapsed(false);
    setTimeout(() => section2Ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
  };

  // Update a row in the 8-row functional profile table (for תל"א)
  const handleTalaProfileRowChange = (rowIdOrDomain: any, field: any, value: any) => {
    if (formData.isLocked) return;
    setFormData((prev: any) => updateTalaProfileRow(prev, rowIdOrDomain, field, value));
  };

  // Toggle selection of a focus domain for the תל"א work plan
  const handleToggleTalaFocusDomain = (domain: any) => {
    if (formData.isLocked) return;
    setFormData((prev: any) => toggleFocusDomain(prev, domain));
  };

  // Update student gender ('boy' = בן / זכר, 'girl' = בת / נקבה) and automatically inflect all goals & objectives
  const handleGenderChange = (newGender: any) => {
    if (formData.isLocked) return;
    setFormData((prev: any) => ({
      ...prev,
      gender: newGender,
      goals: (prev.goals || []).map((g: any) => adaptGoalToGender(g, newGender))
    }));
  };

  // Update specific goal row (when report is locked, only Mid-Year / End-of-Year Evaluation fields can be updated!)
  const handleGoalChange = (goalId: any, field: any, value: any) => {
    const isEvalField = EVAL_GOAL_FIELDS.has(field);
    if (formData.isLocked) {
      if (isEvalField) {
        handleAutoUnlockReport('evalEdit');
      } else {
        return;
      }
    }
    setFormData((prev: any) => applyGoalChange(prev, goalId, field, value));
  };

  // Toggle whether a specific goal is locked against AI re-analysis
  const handleToggleGoalLock = (goalId: any) => {
    if (formData.isLocked) return;
    setFormData((prev: any) => toggleGoalAiLock(prev, goalId));
  };

  // Add a new empty goal block and open the smart Goal Picker immediately
  const handleAddGoalRow = () => {
    if (formData.isLocked) return;
    const newId = 'g_row_' + Date.now();
    const dateInfo = resolveStudentAgeAndDateInfo(formData, formData.teacherFreeText || '');
    const newGoalObj = buildNewGoalRow({
      id: newId,
      stage: currentStage,
      isTalaMode,
      isKindergarten,
      plus3Months: dateInfo.plus3Months
    });
    setFormData((prev: any) => ({
      ...prev,
      goals: [...(prev.goals || []), newGoalObj]
    }));
    setOpenPickerGoalId(newId);
    setPickerSearch('');
    setPickerEnvFilter('הכל');
    setTimeout(() => {
      const el = document.getElementById(newId) || document.querySelector('.ecological-goal-card:last-child');
      if (el?.scrollIntoView) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.style.transition = 'box-shadow 0.4s ease, border-color 0.4s ease';
        el.style.boxShadow = '0 0 0 4px #86efac, 0 4px 16px rgba(22, 163, 74, 0.35)';
        el.style.borderColor = '#16a34a';
        setTimeout(() => {
          if (el) {
            el.style.boxShadow = '';
            el.style.borderColor = '';
          }
        }, 2200);
      }
    }, 150);


  };

  const handleDeleteGoalRow = (goalId: any) => {
    if (formData.isLocked) return;
    if ((formData.goals || []).length <= 1) {
      if (!window.confirm('זוהי המטרה היחידה בתכנית. האם למחוק אותה?')) return;
    }
    setFormData((prev: any) => removeGoalRow(prev, goalId));
  };

  // Select a goal from the Dynamic Goal Bank (automatically adjusted to student's gender!)
  const handleSelectGoalFromBank = (goalRowId: any, bankItem: any, fillTemplate = true) => {
    if (formData.isLocked) return;
    setFormData((prev: any) => ({
      ...prev,
      goals: (prev.goals || []).map((g: any) =>
        g.id === goalRowId
          ? fillGoalRowFromBank(g, bankItem, prev, { fillTemplate, isTalaMode })
          : g
      )
    }));

    // Increment usage count in global bank
    recordGoalInBank({
      title: bankItem.title,
      environment: bankItem.environment
    });

    const genderTitle = personalizeBankItem(bankItem, formData).title;

    // Load the 3 Facilitating Questions for this Goal
    const questions =
      bankItem.facilitatingQuestions && bankItem.facilitatingQuestions.length > 0
        ? bankItem.facilitatingQuestions.slice(0, 3)
        : generateDefaultQuestionsForCustomGoal(genderTitle, bankItem.environment, formData);

    setAiQuestionsMap((prev: any) => ({
      ...prev,
      [goalRowId]: questions
    }));
    setActiveAiGoalId(goalRowId);
    setOpenPickerGoalId(null);
  };

  // Define a brand new custom Goal and trigger AI Facilitating Questions
  const handleConfirmCustomGoal = async (goalRow: any) => {
    if (formData.isLocked) return;
    if (!goalRow.title || !goalRow.title.trim()) return;

    setFormData((prev: any) => ({
      ...prev,
      goals: (prev.goals || []).map((g: any) =>
        g.id === goalRow.id ? { ...g, isTeacherModified: true } : g
      )
    }));

    // Save to global Goal Bank for future usage
    recordGoalInBank(goalRow);
    setOpenPickerGoalId(null);

    // Open AI Facilitating Questions panel and generate up to 3 tailored questions
    setActiveAiGoalId(goalRow.id);
    await handleGenerateAiQuestionsForGoal(goalRow);
  };

  // Generate up to 3 Facilitating Questions via Gemini AI (or smart fallback)
  async function handleGenerateAiQuestionsForGoal(goalRow: any) {
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
      setAiQuestionsMap((prev: any) => ({
        ...prev,
        [goalRow.id]: fallbackQuestions
      }));
      setLoadingAiForGoalId(null);
      return;
    }

    try {
      const hints = {
        gender: currentGender,
        name: formData.name,
        idNumber: formData.idNumber,
        birthDate: formData.birthDate,
        address: formData.address,
        phone: formData.phone,
        educationalFramework: formData.educationalFramework
      };

      const parsed = await callAiProxyEndpoint({
        operation: 'facilitate',
        payload: {
          goalTitle,
          environment: goalRow.environment || (isKindergarten ? 'מרחב הגן' : 'הכיתה בבית הספר'),
          teacherFreeText: formData.teacherFreeText || '',
          gender: currentGender,
          ageDescription: dateInfo.ageDescription,
          entryDateFormatted: dateInfo.entryDateFormatted
        },
        hints
      });

      if (Array.isArray(parsed) && parsed.length > 0) {
        setAiQuestionsMap((prev: any) => ({
          ...prev,
          [goalRow.id]: parsed.slice(0, 3)
        }));
        setLoadingAiForGoalId(null);
        return;
      }
      setAiQuestionsMap((prev: any) => ({
        ...prev,
        [goalRow.id]: fallbackQuestions
      }));
    } catch (e: any) {
      setAiQuestionsMap((prev: any) => ({
        ...prev,
        [goalRow.id]: fallbackQuestions
      }));
    } finally {
      setLoadingAiForGoalId(null);
    }
  };

  // Apply teacher's answers to the 3 Facilitating Questions to auto-fill/enrich the goal columns!
  const handleApplyFacilitatingAnswers = async (goalRow: any) => {
    if (formData.isLocked) return;
    const answers = aiAnswersMap[goalRow.id] || {};
    const ans1 = (answers[0] || '').trim();
    const ans2 = (answers[1] || '').trim();
    const ans3 = (answers[2] || '').trim();
    const genderToUse = formData.gender || 'boy';
        const childLabel = genderToUse === 'girl' ? 'הילדה' : 'הילד';
    const dateInfo = resolveStudentAgeAndDateInfo(formData, formData.teacherFreeText || '');

    setLoadingAiForGoalId(goalRow.id);

    if (ans1 || ans2 || ans3) {
      try {
        const hints = {
          gender: genderToUse,
          name: formData.name,
          idNumber: formData.idNumber,
          birthDate: formData.birthDate,
          address: formData.address,
          phone: formData.phone,
          educationalFramework: formData.educationalFramework
        };

        const enriched: any = await callAiProxyEndpoint({
          operation: 'applyAnswers',
          payload: {
            goalRow,
            answers: [ans1, ans2, ans3],
            gender: genderToUse,
            ageDescription: dateInfo.ageDescription,
            entryDateFormatted: dateInfo.entryDateFormatted
          },
          hints
        });

        if (enriched) {
          setFormData((prev: any) => ({
            ...prev,
            goals: (prev.goals || []).map((g: any) => {
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
      } catch (err: any) {
        console.warn('Fallback to local synthesis for facilitating answers', err);
      }
    }

    // Smart deterministic synthesis from the 3 answers
    setFormData((prev: any) => ({
      ...prev,
      goals: (prev.goals || []).map((g: any) => {
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
            ? `${g.opportunities ? g.opportunities + '\n' : ''}• ${isKindergarten ? 'הגננת' : 'המחנכת'} תתווך ל${childLabel} באמצעות: ${ans2}.`
            : g.opportunities || `• המבוגר יזמין ויתווך ל${childLabel} באופן יומיומי ומדורג.`,
          opportunitiesIntegration: g.opportunitiesIntegration || (isKindergarten ? '• גננת השילוב תחזק מיומנויות תומכות בקבוצה קטנה.' : '• מורת השילוב תחזק מיומנויות תומכות בקבוצה קטנה.'),
          opportunitiesTherapist: g.opportunitiesTherapist || `• עיבוד חווית ההצלחה וחיזוק הוויסות בחדר הטיפולים.`,
          learningAccommodations: g.learningAccommodations || `• תיווך מילאי, חלוקת משימות לצעדים קטנים והארכת זמן.`,
          partners: ans3 ? ans3 : g.partners || getDefaultPartnersForStage(currentStage, isTalaMode),
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
  const handleAddSuggestedObjective = (goalRowId: any, objText: any) => {
    if (formData.isLocked) return;
    const genderToUse = formData.gender || 'boy';
    const genderAdjustedObj = adaptTextToGender(objText, genderToUse);

    setFormData((prev: any) => ({
      ...prev,
      goals: (prev.goals || []).map((g: any) => {
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
  const callGeminiJson = (promptText: any) =>
    callAiJson(promptText, {
      ...formData,
      privacyMode: userPreferences?.defaultPrivacyMode || formData.privacyMode || 'full_name'
    });

  
  // === AI Reverse Engineering from Raw Data Text to Full Formal Report ===
  // Helper to apply local reverse engineered plan to student state
  const applyEngineeredPlan = (engineered: any, _isLocal = false) => {
    if (!engineered) return;
    const existingGoals = formData.goals || [];
    const protectedGoals = existingGoals.filter((g: any) => isGoalProtectedFromAiOverwrite(g));
    const stageCheck = enforceStageOnGeneratedGoals(engineered.goals || []);
    const candidateGoals = stageCheck.goals;
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
      goals: candidateGoals,
      recommendations: engineered.recommendations,
      status: 'מוכן להדפסה',
      lastSavedAt: new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })
    };
    const updated = syncActiveReportSnapshot(updatedBase);

    if (isDemoStudent(updated)) {
      if (updated.goals && updated.goals.length > 0) {
        updated.goals[0].observations = [
          {
            id: 'obs_demo_auto_1',
            date: new Date().toLocaleDateString('he-IL'),
            timestamp: new Date().toISOString(),
            authorName: 'שרה כהן (מורת שילוב)',
            supportLevel: 'עצמאי לחלוטין',
            note: 'השתתף בפעילות באופן עצמאי וממוקד, נעזר בכרטיסיית הניווט.'
          }
        ];
      }
    }
    savedSnapshotRef.current = JSON.stringify(updated);
    setFormData(updated);
    try {
      onSaveStudentPlan?.(updated);
    } catch (saveErr) {
      console.warn('[applyEngineeredPlan] onSaveStudentPlan error:', saveErr);
    }
    setTimeout(() => {
      section3Ref.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
    }, 300);
    (candidateGoals || []).forEach((g) => {
      try {
        if (g.title) recordGoalInBank(g);
      } catch (bankErr) {
        console.warn('[applyEngineeredPlan] recordGoalInBank error:', bankErr);
      }
    });
    setIsFreeTextCollapsed(true);
    const preservedNote =
      protectedGoals.length > 0
        ? ` (${protectedGoals.length} מטרות שנערכו על ידי המורה נשמרו ללא כל שינוי)`
        : '';
    setReverseEngineerBanner(
      `✨ הדוח הרשמי הופק בהצלחה מתוך הטקסט הגולמי! הותאמו זמני יעד יחסיים לפי גודל המטרה (T-Shirt Size), נוסחו ${isTalaMode ? 'פרופיל התלמיד/ה' : 'טבלת מוקדי הכוח'}, ${candidateGoals.length} מטרות רשמיות${preservedNote} ופרק ההמלצות. (שירות ה-AI לא היה זמין – הדוח הופק במנוע המקומי, מותאם לשלב החינוכי: ${getStageLabelHe(currentStage)}. ניתן לנסות שוב מאוחר יותר.)`
    );
    setSaveBanner(true);
    setTimeout(() => setSaveBanner(false), 3500);
  };

  // Fallback trigger that allows teacher to immediately exit AI waiting and synthesize locally
  const handleForceLocalReverseEngineer = () => {
    setIsReverseEngineering(false);
    setReverseEngineerError('');
    const snippetsToUse = formData.pedagogicalSnippets && formData.pedagogicalSnippets.length > 0
      ? formData.pedagogicalSnippets
      : activeSnippets;
    const aggregatedText = aggregateSnippetsForAiPrompt(snippetsToUse);
    const rawText = (aggregatedText || formData.teacherFreeText || '').trim();
    if (!rawText) return;
    const engineered = reverseEngineerRawTextLocally(rawText, formData, goalBank);
    if (engineered) {
      applyEngineeredPlan(engineered, true);
    }
  };

  async function handleReverseEngineerFullReport() {
    if (formData.isLocked) return;
    const snippetsToUse = formData.pedagogicalSnippets && formData.pedagogicalSnippets.length > 0
      ? formData.pedagogicalSnippets
      : activeSnippets;
    const aggregatedText = aggregateSnippetsForAiPrompt(snippetsToUse);
    const rawText = (aggregatedText || formData.teacherFreeText || '').trim();
    if (!rawText) {
      window.alert('נא להזין תצפית או לצרף מסמך בציר התובנות כדי שה-AI יוכל להפיק ממנו דוח ומטרות.');
      return;
    }

    setIsReverseEngineering(true);
    setReverseEngineerBanner('');
    setReverseEngineerError('');
    try {

    const genderToUse = formData.gender || 'boy';
    const genderInstruction =
      genderToUse === 'girl'
        ? 'בת (נקבה) – חובה לנסח את כל המטרות, היעדים והתיאורים בלשון נקבה בלבד (למשל: תשתתף, תמתין, תבחר, תגיב)!'
        : 'בן (זכר) – חובה לנסח את כל המטרות, היעדים והתיאורים בלשון זכר בלבד (למשל: ישתתף, ימתין, יבחר, יגיב)!';

    const dateInfo = resolveStudentAgeAndDateInfo(formData, rawText);
    const existingGoals = formData.goals || [];
    const protectedGoals = existingGoals.filter((g: any) => isGoalProtectedFromAiOverwrite(g));
    const unprotectedGoals = existingGoals.filter(
      (g: any) => !isGoalEmpty(g) && !isGoalProtectedFromAiOverwrite(g)
    );
    const removedGoals = Array.isArray(formData.removedAiGoals) ? formData.removedAiGoals : [];

    // 1. Try Live Gemini AI via backend proxy (with local synthesis fallback)
    let aiParsedResult = null;
    if (rawText) {

      const protectedGoalsPromptBlock =
        protectedGoals.length > 0
          ? `\nהנחיה קריטית – מטרות שנערכו או נוספו על ידי המורה (נעולות לשינוי!):
המורה ערכה או הוסיפה ידנית את ${protectedGoals.length} המטרות הבאות לאחר ניתוח קודם:
${protectedGoals
  .map((pg: any, idx: any) => {
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
  .map((rg: any, idx: any) => `  * הוסרה #${idx + 1}: סביבה="${rg.environment}" | מטרה="${rg.title}"`)
  .join('\n')}
- **אל תחזיר ואל תיצור מחדש מטרות אלו במערך "goals"!**\n`
          : '';

      const unprotectedGoalsPromptBlock =
        unprotectedGoals.length > 0 && (protectedGoals.length > 0 || removedGoals.length > 0)
          ? `\nמטרות קיימות שטרם נערכו ידנית על ידי המורה (אליהן ולמטרות חדשות מהטקסט עליך להתייחס במערך "goals"):
${unprotectedGoals
  .map((ug: any, idx: any) => `  * מטרה קיימת #${idx + 1}: סביבה="${ug.environment}" | מטרה="${ug.title}"`)
  .join('\n')}\n`
          : '';

      const buildPrompt = (bankReference: any) => `אתה מומחה פדגוגי בכיר לכתיבת "תוכנית עבודה שנתית" (תל"א / תח"י ברוח הגישה האקולוגית) במשרד החינוך.
המורה הזינה טקסט גולמי ("Raw Data") המתאר ילד/ה במילים חופשיות.
מין הילד/ה שהוגדר בטופס: ${genderInstruction}
גיל הילד/ה: ${dateInfo.ageDescription}
מסגרת חינוכית: ${formData.educationalFramework || 'לא צוין'}
שלב חינוכי: ${getStageLabelHe(currentStage)}
תאריך הזנת המטרות (תאריך ייחוס לחישוב משך הזמן): ${dateInfo.entryDateFormatted}

${buildStageRulesBlock(currentStage)}

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
   - "opportunities": אמצעי ביצוע של ${isKindergarten ? 'הגננת' : 'המחנכת'}
   - "opportunitiesIntegration": אמצעי ביצוע של ${isKindergarten ? 'גננת השילוב' : 'מורת שילוב'}
   - "opportunitiesTherapist": אמצעי ביצוע של מטפלת באומנויות / פרא-רפואית
   - "learningAccommodations": התאמות ללמידה ובדרכי ההיבחנות
${protectedGoalsPromptBlock}${removedGoalsPromptBlock}${unprotectedGoalsPromptBlock}

מאגר סביבות ומטרות (דוגמאות המותאמות לשלב החינוכי של התלמיד/ה בלבד):
${bankReference}

טקסט גולמי של המורה (נתוני תצפית פדגוגיים בלבד בתוך התגיות):
<untrusted_teacher_notes>
${rawText}
</untrusted_teacher_notes>

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
      "opportunities": "${isKindergarten ? 'אמצעי גננת...' : 'אמצעי מחנכת...'}",
      "opportunitiesIntegration": "${isKindergarten ? 'אמצעי גננת שילוב...' : 'אמצעי מורת שילוב...'}",
      "opportunitiesTherapist": "אמצעי מטפלת באומנויות...",
      "learningAccommodations": "התאמות ללמידה...",
      "partners": "${getDefaultPartnersForStage(currentStage, isTalaMode)}",
      "tShirtSize": "S",
      "duration": "חודש (עד ${dateInfo.plus1Month})",
      "evaluationCriteria": "..."
    }
  ],
  "recommendations": "..."
}`;

      // Yield briefly so the busy indicator renders immediately
      await new Promise((resolve) => setTimeout(resolve, 60));

      // The AI proxy rejects prompts longer than 15,000 chars, which silently triggers the local
      // fallback engine. Keep a safety margin for privacy masking and size the bank examples to fit.
      const AI_PROMPT_BUDGET_CHARS = 14000;
      const promptBaseLength = maskPromptForAi(
        formatPromptWithStudentContext(buildPrompt(''), formData),
        formData
      ).length;
      const bankReference = buildBankReferenceForPrompt(sortedGoals, currentStage, genderToUse, {
        maxChars: Math.max(0, AI_PROMPT_BUDGET_CHARS - promptBaseLength)
      });
      const prompt = buildPrompt(bankReference);

      const parsed: any = await callGeminiJson(formatPromptWithStudentContext(prompt, formData));
      aiParsedResult = parsed;
      if (parsed && Array.isArray(parsed.goals)) {
        const rawCandidateGoals = parsed.goals.map((g: any, i: any) => {
          const rawCandidate = {
            id: 'g_airev_' + Date.now() + '_' + i,
            environment: g.environment || getDefaultEnvironmentForStage(currentStage),
            activityParticipation: g.activityParticipation || '',
            title: g.title || '',
            objectives: g.objectives || '',
            opportunities: g.opportunities || '',
            opportunitiesIntegration: g.opportunitiesIntegration || '',
            opportunitiesTherapist: g.opportunitiesTherapist || '',
            learningAccommodations: g.learningAccommodations || '',
            partners: g.partners || getDefaultPartnersForStage(currentStage, isTalaMode),
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

        // Stage guard: drop / correct any goal that does not match the teacher-selected stage.
        const stageCheck = enforceStageOnGeneratedGoals(rawCandidateGoals);
        const candidateGoals = stageCheck.goals;
        if (stageCheck.droppedCount > 0 || stageCheck.correctedCount > 0) {
          console.warn(
            `[StageGuard] stage=${currentStage}: dropped ${stageCheck.droppedCount}, corrected ${stageCheck.correctedCount} AI goals.`
          );
        }
        if (candidateGoals.length === 0 && stageCheck.droppedCount > 0) {
          reportHealthEvent({
            kind: HEALTH_EVENT_KINDS.AI_EMPTY_RESPONSE,
            operation: 'reverseEngineerFullReport',
            extra: { reason: 'stage_guard_dropped_all_goals', stage: currentStage }
          });
        }
        // An empty AI list with protected goals means "all topics already covered". But if the stage
        // guard removed every AI goal, fall back to the local engine instead of wiping unprotected goals.
        if (candidateGoals.length > 0 || (protectedGoals.length > 0 && stageCheck.droppedCount === 0)) {
          const mergedGoals = mergeReanalyzedGoals({
            existingGoals,
            candidateNewGoals: candidateGoals,
            removedGoals,
            gender: genderToUse
          });

          const nextExisting = parsed.strengthsExisting || formData.strengthsExisting;
          const nextEmpower = parsed.strengthsToEmpower || formData.strengthsToEmpower;
                    
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
            recommendations: parsed.recommendations
              ? isKindergarten
                ? parsed.recommendations
                : adaptTextToSchoolStage(parsed.recommendations, { includeBarePlaceWords: false })
              : formData.recommendations,
            status: 'מוכן להדפסה',
            lastSavedAt: new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })
          };
          const updated = syncActiveReportSnapshot(updatedBase);

          savedSnapshotRef.current = JSON.stringify(updated);
          setFormData(updated);
          try {
            onSaveStudentPlan?.(updated);
          } catch (saveErr) {
            console.warn('[handleReverseEngineerFullReport] onSaveStudentPlan error:', saveErr);
          }
          mergedGoals.forEach((g) => {
            try {
              if (g.title) recordGoalInBank(g);
            } catch (bankErr) {
              console.warn('[handleReverseEngineerFullReport] recordGoalInBank error:', bankErr);
            }
          });
          setIsReverseEngineering(false);
          setIsFreeTextCollapsed(true);
          if (activeOnboardingStep === 3 && currentUser?.email) {
            try {
              advanceOnboardingStep(currentUser.email);
            } catch (_) {}
          }
          const preservedNote =
            protectedGoals.length > 0
              ? ` (${protectedGoals.length} מטרות שנערכו על ידי המורה נשמרו ללא כל שינוי)`
              : '';
          const stageNote =
            stageCheck.droppedCount > 0 || stageCheck.correctedCount > 0
              ? ` 🎯 אימות שלב חינוכי (${getStageLabelHe(currentStage)}): הוסרו ${stageCheck.droppedCount} מטרות לא מתאימות, תוקנו ${stageCheck.correctedCount}.`
              : '';
          setReverseEngineerBanner(
            `✨ הדוח הרשמי הופק בהצלחה ב-Gemini AI מתוך הטקסט הגולמי! הותאמו זמני יעד יחסיים לפי גודל המטרה (T-Shirt Size), נוסחו פרופיל התלמיד/ה, ${mergedGoals.length} מטרות${preservedNote} ופרק ההמלצות.${stageNote}`
          );
          setSaveBanner(true);
          setTimeout(() => setSaveBanner(false), 3500);
          return;
        }
      }
    }

    // 2. Coherent Built-in Hebrew Pedagogical NLP & Synthesis Engine
    await new Promise((resolve) => setTimeout(resolve, 1400));

    reportHealthEvent({
      kind: HEALTH_EVENT_KINDS.AI_LOCAL_FALLBACK,
      operation: 'reverseEngineerFullReport',
      extra: {
        reason: aiParsedResult ? (aiParsedResult.raw ? 'ai_raw_output_not_json' : 'ai_missing_goals') : 'local_engine_used',
        stage: currentStage,
        promptLength: rawText.length,
        category: aiParsedResult ? 'empty_response' : 'unknown'
      }
    });

    const engineered = reverseEngineerRawTextLocally(rawText, formData, goalBank);
    if (engineered) {
      applyEngineeredPlan(engineered, true);
      return;
    }
    } catch (err: any) {
      console.warn('[handleReverseEngineerFullReport] AI processing encountered error, attempting graceful local fallback:', err);
      reportHealthEvent({
        kind: HEALTH_EVENT_KINDS.AI_CLIENT_PROCESSING_ERROR,
        operation: 'reverseEngineerFullReport',
        error: err,
        extra: {
          stage: currentStage,
          promptLength: rawText ? rawText.length : 0,
          errorMessage: err?.message || String(err)
        }
      });
      try {
        usageTelemetryService.track(TELEMETRY_EVENTS.CLIENT_JS_ERROR, {
          errorType: err?.name || 'Error',
          operation: 'reverseEngineerFullReport'
        });
      } catch (_) {}
      try {
        const localEngineered = reverseEngineerRawTextLocally(rawText, formData, goalBank);
        if (localEngineered && Array.isArray(localEngineered.goals) && localEngineered.goals.length > 0) {
          applyEngineeredPlan(localEngineered, true);
          return;
        }
      } catch (localErr) {
        console.error('[handleReverseEngineerFullReport] Local fallback failed:', localErr);
      }
      setReverseEngineerError(
        'חלה בעיית תקשורת בעת העיבוד ב-AI (ייתכן שיבוש זמני בחיבור הרשת או עומס רגעי). תוכלי לנסות שוב או להפיק מיידית במנוע המקומי ללא רשת.'
      );
    } finally {
      setIsReverseEngineering(false);
    }
  };

  // Save Progress explicitly
  const handleSaveProgress = () => {
    const nowTime = new Date().toLocaleTimeString('he-IL', {
      hour: '2-digit',
      minute: '2-digit'
    });
    const updatedWithTime = {
      ...formData,
      lastSavedAt: nowTime
    };
    const updated = syncActiveReportSnapshot(updatedWithTime);
    savedSnapshotRef.current = JSON.stringify(updated);
    setFormData(updated);
    onSaveStudentPlan(updated);
    if (onDraftStateChange) {
      onDraftStateChange({ isDirty: false, draftData: updated });
    }
    // Also record usage for all defined goals
    (updated.goals || []).forEach((g: any) => {
      if (g.title && g.title.trim()) {
        recordGoalInBank(g);
      }
    });
    setSaveBanner(true);
    setTimeout(() => setSaveBanner(false), 2500);
  };

  // === Local Pedagogical Evaluation Refiner & AI Processing for הערכת מחצית / סוף שנה ===
  const refineGoalEvaluationLocally = (rawEvalText: any, goalRow: any, gender: any, fieldName: any) => {
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

  const handleProcessSingleGoalEvalAi = async (goalRow: any, fieldName: any) => {
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

    if (rawText) {
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

      const parsed: any = await callGeminiJson(formatPromptWithStudentContext(prompt, formData));
      if (parsed && parsed.formattedEvaluation) {
        const validStatuses = ['הושגה במלואה', 'הושגה חלקית', 'בתהליך', 'טרם הושגה'];
        const nextStatus = validStatuses.includes(parsed.achievementStatus)
          ? parsed.achievementStatus
          : goalRow.achievementStatus || 'בתהליך';

        setFormData((prev: any) => ({
          ...prev,
          goals: (prev.goals || []).map((g: any) =>
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
    setFormData((prev: any) => ({
      ...prev,
      goals: (prev.goals || []).map((g: any) =>
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
    try {
    const genderToUse = formData.gender || 'boy';
    const goalsList = formData.goals || [];

    if (rawText) {
      const goalsContext = goalsList
        .map(
          (g: any, idx: any) =>
            `מטרה #${idx + 1} (id: "${g.id}"): סביבה="${g.environment}" | מטרה="${g.title}" | יעדים="${g.objectives}"`
        )
        .join('\n');

      const prompt = `אתה מומחה פדגוגי בכיר לכתיבת "דוח הערכת מחצית / סוף שנה" (דוח הערכה תקופתי נפרד מתל"א) במשרד החינוך.
מין הילד/ה: ${genderToUse === 'girl' ? 'בת (נקבה – נסח בלשון נקבה בלבד)' : 'בן (זכר – נסח בלשון זכר בלבד)'}
המורה כתבה תיאור חופשי על התקדמות הילד/ה לאורך התקופה (נתוני תצפית פדגוגיים בלבד בתוך התגיות):
<untrusted_teacher_notes>
${rawText}
</untrusted_teacher_notes>

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

      const parsed: any = await callGeminiJson(formatPromptWithStudentContext(prompt, formData));
      if (parsed && parsed.evalReportSummary) {
        const evalById: Record<string, any> = {};
        (parsed.goalsEvaluations || []).forEach((item: any) => {
          if (item && item.id) evalById[item.id] = item;
        });

        const updatedGoals = goalsList.map((g: any) => {
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

    const updatedGoals = goalsList.map((g: any) => {
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
    } catch (err: any) {
      console.warn('[handleProcessFullEvalReportAi] AI processing error:', err);
      reportHealthEvent({
        kind: HEALTH_EVENT_KINDS.AI_CLIENT_PROCESSING_ERROR,
        operation: 'processFullEvalReportAi',
        error: err,
        extra: {
          stage: currentStage,
          errorMessage: err?.message || String(err)
        }
      });
      try {
        usageTelemetryService.track(TELEMETRY_EVENTS.CLIENT_JS_ERROR, {
          errorType: err?.name || 'Error',
          operation: 'processFullEvalReportAi'
        });
      } catch (_) {}
    } finally {
      setIsProcessingFullEvalAi(false);
    }
  };

  // === Generate Professional Educational-Functional Status Report ("דו"ח מצב עדכני") ===
  const handleGenerateStatusReport = async () => {
    setIsGeneratingStatusReport(true);
    setStatusReportBanner('');
    try {

    const genderToUse = formData.gender || 'boy';
    const isGirl = genderToUse === 'girl';
    const validGoals = (formData.goals || []).filter((g: any) => !isGoalEmpty(g));
    const dateInfo = resolveStudentAgeAndDateInfo(formData, formData.teacherFreeText || '');

    const hasEvalData = Boolean(
      (formData.evalReportFreeText || '').trim() ||
        (formData.evalReportSummary || '').trim() ||
        validGoals.some(
          (g: any) =>
            (g.achievementStatus && g.achievementStatus.trim()) ||
            (g.midYearEvaluation && g.midYearEvaluation.trim()) ||
            (g.endYearEvaluation && g.endYearEvaluation.trim())
        )
    );

    if (validGoals) {
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
        goals: validGoals.map((g: any, idx: any) => ({
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
      const parsed: any = await callGeminiJson(formatPromptWithStudentContext(prompt, formData));
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
} catch (err: any) {
      console.warn('[handleGenerateStatusReport] AI processing error:', err);
      reportHealthEvent({
        kind: HEALTH_EVENT_KINDS.AI_CLIENT_PROCESSING_ERROR,
        operation: 'generateStatusReport',
        error: err,
        extra: {
          errorMessage: err?.message || String(err)
        }
      });
      try {
        usageTelemetryService.track(TELEMETRY_EVENTS.CLIENT_JS_ERROR, {
          errorType: err?.name || 'Error',
          operation: 'generateStatusReport'
        });
      } catch (_) {}
    } finally {
      setIsGeneratingStatusReport(false);
    }
    setStatusReportBanner(
      '✨ דו"ח המצב העדכני הופק בהצלחה.'
    );
  };

  const handleUpdateStatusSectionContent = (sectionNumber: any, newContent: any) => {
    setFormData((prev: any) => updateStatusSection(prev, sectionNumber, newContent));
  };

  const handleRemoveStatusSection = (sectionNumber: any) => {
    setFormData((prev: any) => removeStatusSection(prev, sectionNumber));
  };

  const handleAddManualStatusSection = (sectionNumber: any) => {
    setFormData((prev: any) => addManualStatusSection(prev, sectionNumber));
      };

  // === Build Official Document HTML (with or without Privacy Redaction) ===
  const getFullDocTitle = () => buildFullDocTitle(formData);
  const getEvalReportTitle = () => buildEvalReportTitle();
  const getStatusReportTitle = () => buildStatusReportTitle();
  const getDisplayStudentName = () => buildDisplayStudentName(formData, hideStudentDetailsOnPrint);
  const getDisplayMaskedField = (val: any) => buildDisplayMaskedField(val, hideStudentDetailsOnPrint);
  const getRedactedText = (text: any) => buildRedactedText(text, formData, hideStudentDetailsOnPrint);
  const getSafeReportFilename = (ext = 'doc', mode = 'tala') => buildSafeReportFilename(formData, hideStudentDetailsOnPrint, ext, mode);
  
  const getExportPayload = (baseData = formData) => ({
    ...baseData,
    showBesad: userPreferences?.showBesad,
    besadText: userPreferences?.besadText,
    signatureImage: userPreferences?.signatureImage,
    reportDateFormat: userPreferences?.reportDateFormat || 'both',
    teacherName: userPreferences?.fullName || currentUser?.name || baseData.teacherName,
    teacherTitle: userPreferences?.professionalTitle || currentUser?.title || baseData.teacherTitle || '',
    institutionalAffiliation: userPreferences?.institutionalAffiliation || currentUser?.group || baseData.institutionalAffiliation || ''
  });

  const buildWordDocumentHtml = () => renderWordDocumentHtml(getExportPayload(), hideStudentDetailsOnPrint);
  const buildEvalWordDocumentHtml = () => renderEvalWordDocumentHtml(getExportPayload(), hideStudentDetailsOnPrint);
  const buildStatusReportWordDocumentHtml = () => renderStatusReportWordDocumentHtml(getExportPayload(), hideStudentDetailsOnPrint);

  const handlePrintDocument = () => {
    handleSaveProgress();
    const logoUrl = new URL('./tala-logo.png', window.location.href).href;
    openHtmlPrintWindow(buildWorkPlanPrintHtml(getExportPayload(), hideStudentDetailsOnPrint, logoUrl));
  };

  const handlePrintEvalReport = () => {
    handleSaveProgress();
    const logoUrl = new URL('./tala-logo.png', window.location.href).href;
    openHtmlPrintWindow(buildEvalReportPrintHtml(getExportPayload(), hideStudentDetailsOnPrint, logoUrl));
  };

  const handlePrintStatusReport = () => {
    handleSaveProgress();
    const logoUrl = new URL('./tala-logo.png', window.location.href).href;
    openHtmlPrintWindow(buildStatusReportPrintHtml(getExportPayload(), hideStudentDetailsOnPrint, logoUrl));
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
        setShowEmailModal(true);
  };

  
  
  const handleSendReportByEmail = async (e: any) => {
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

      const senderSignOff = [
        userPreferences?.fullName || currentUser?.name || activeEngineCfg.senderName || 'מערכת TALA – תוכנית עבודה אקולוגית',
        [userPreferences?.professionalTitle || currentUser?.title, userPreferences?.institutionalAffiliation || currentUser?.group]
          .filter(Boolean)
          .join(' • ')
      ].filter(Boolean).join('\r\n');

      const textBody = [
        'שלום רב,',
        '',
        `מצורף ${fullDocTitle} עבור ${displayName} לשנת הלימודים ${formData.schoolYear || ''} בפורמט ${formatLabel}.`,
        hideStudentDetailsOnPrint
          ? '(המסמך הופק במצב הגנת פרטיות – ראשי תיבות והשחרת פרטים מזהים).'
          : '',
        '',
        'בברכה,',
        senderSignOff
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
          <div style="margin: 14px 0; padding: 10px 14px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px;">
            <div style="font-weight: 700; color: #1e3a5f;">בברכה, ${userPreferences?.fullName || currentUser?.name || 'צוות חינוכי'}</div>
            ${(userPreferences?.professionalTitle || currentUser?.title) ? `<div style="font-size: 12px; color: #475569;">${userPreferences?.professionalTitle || currentUser?.title}</div>` : ''}
            ${(userPreferences?.institutionalAffiliation || currentUser?.group) ? `<div style="font-size: 12px; color: #64748b;">${userPreferences?.institutionalAffiliation || currentUser?.group}</div>` : ''}
          </div>
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
    } catch (err: any) {
      console.error('Direct background email send error:', err);
      setEmailError(
        `שגיאה בשליחת המייל ברקע: ${err?.message || 'בדוק את חיבור האינטרנט או את הגדרת מנוע המייל.'}`
      );
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleTextareaAutoResize = (e: any) => {
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
          {onGoHome && (
            <button
              type="button"
              className="btn-print-doc btn-home-nav-form"
              onClick={onGoHome}
              title="חזרה לניהול תלמידים (הוספת תלמיד/ה חדש/ה או פתיחת דוח קיים)"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                color: '#1e293b',
                fontWeight: 700,
                cursor: 'pointer',
                borderRadius: '8px',
                padding: '6px 12px'
              }}
            >
              <Users size={16} style={{ color: '#2563eb' }} />
              <span>ניהול תלמידים</span>
            </button>
          )}

          {/* Yellow Lock / Unlocked Icon at Top of Report (No Labels, Hover Explanation Tooltip) */}
          <div className="report-lock-toggle-wrapper">
            <button
              type="button"
              className={`btn-report-lock-icon ${isReportLocked ? 'locked' : 'unlocked'} ${
                !userCanLockReport ? 'readonly-lock' : ''
              } ${activeOnboardingStep === 6 ? 'tour-highlight-btn' : ''}`}
              onClick={handleToggleReportLock}
              disabled={!userCanLockReport}
              aria-label={isReportLocked ? 'הדו"ח נעול לעריכה' : 'הדו"ח פתוח לעריכה'}
              title={
                isReportLocked
                  ? userCanLockReport
                    ? 'הדו"ח נעול לעריכה (מוסכם וסגור). כפתורי "הערכת מחצית / סוף שנה" ו"תצפית מהירה" זמינים לשימוש – לחיצה עליהם תפתח את הדו"ח לעריכה באופן אוטומטי.'
                    : 'הדו"ח נעול לעריכה. כפתורי "הערכת מחצית / סוף שנה" ו"תצפית מהירה" זמינים לשימוש – לחיצה עליהם תפתח את הדו"ח לעריכה באופן אוטומטי.'
                  : userCanLockReport
                    ? 'הדו"ח פתוח לעריכה ולסקירה משותפת. לחצי לנעילת הדו"ח לאחר הסכמת הצוות (גם במצב נעול "הערכת מחצית / סוף שנה" ו"תצפית מהירה" זמינות ויפתחו את הנעילה).'
                    : 'הדו"ח פתוח לעריכה משותפת. רק המורה האחראי/ת על הדו"ח יכול/ה לנעול אותו.'
              }
            >
              {isReportLocked ? <Lock size={19} /> : <Unlock size={19} />}
            </button>
            <div className="report-lock-hover-tooltip" role="tooltip">
              {isReportLocked ? (
                <>
                  <div className="report-lock-tooltip-title">
                    🔒 הדו"ח נעול לעריכה
                  </div>
                  <div className="report-lock-tooltip-body">
                    תכנית העבודה אושרה וננעלה. כפתורי{' '}
                    <strong>"הערכת מחצית / סוף שנה"</strong> ו<strong>"תצפית מהירה"</strong>{' '}
                    נותרים זמינים לשימוש, ולחיצה עליהם תפתח את הדו"ח לעריכה באופן אוטומטי.
                    {userCanLockReport
                      ? ' לחצי על הסמל לפתיחת הנעילה.'
                      : ' רק המורה האחראי/ת על הדו"ח יכול/ה לפתוח או לנעול אותו.'}
                  </div>
                </>
              ) : (
                <>
                  <div className="report-lock-tooltip-title">
                    🔓 הדו"ח פתוח לעריכה
                  </div>
                  <div className="report-lock-tooltip-body">
                    הדו"ח פתוח לעריכה ולסקירה משותפת.
                    {userCanLockReport
                      ? ' לאחר הסכמת הצוות, לחצי על הסמל לנעילת הדו"ח (גם במצב נעול ניתן לעדכן "הערכת מחצית / סוף שנה").'
                      : ' רק המורה האחראי/ת על הדו"ח יכול/ה לנעול אותו.'}
                  </div>
                </>
              )}
            </div>
          </div>

          <div style={{ position: 'relative', display: 'inline-block' }}>
            {activeOnboardingStep === 6 && (
              <div className="onboarding-tour-arrow-box" style={{ top: '44px', right: '0' }}>
                <span className="tour-arrow-anim">☝️</span>
                <span>שלב 6: לחצי כאן לשמירת התוכנית בענן (או על המנעול לקראת ועדות)!</span>
              </div>
            )}
            <button
              type="button"
              className={`btn-save-progress ${activeOnboardingStep === 6 ? 'tour-highlight-btn' : ''}`}
              onClick={() => {
                handleSaveProgress();
              }}
            >
              <Save size={17} />
              <span>שמור התקדמות</span>
            </button>
          </div>

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
          {/* Team Chat Button (Visible only when document is shared) */}
          {isPlanShared && (
            <button
              type="button"
              className="btn-team-chat"
              data-testid="top-action-bar-team-chat-btn"
              onClick={() => setShowTeamChatDrawer(true)}
              title="שיח צוות ותיעוד שיתוף"
            >
              <MessageSquare size={16} style={{ color: '#2563eb' }} />
              <span>שיח צוות</span>
              {Array.isArray(formData.teamMessages) && formData.teamMessages.filter((m: any) => !m.isDeleted).length > 0 && (
                <span className="team-chat-badge">
                  {formData.teamMessages.filter((m: any) => !m.isDeleted).length}
                </span>
              )}
            </button>
          )}

          {/* Full Document Preview Toggle */}
          <button
            type="button"
            className="btn-preview-doc"
            onClick={() => setShowFullDocPreview(!showFullDocPreview)}
          >
            <FileText size={16} />
            <span>
              {showFullDocPreview
                ? (isReportLocked ? 'חזרה לתצוגת סעיפים' : 'חזרה לתצוגת עריכה')
                : 'תצוגת מסמך מלאה'}
            </span>
          </button>

          {/* Unified Export & Print Dropdown */}
          <div className="export-dropdown-wrapper" ref={exportDropdownRef}>
            <button
              type="button"
              className={`btn-export-dropdown ${showExportDropdown ? 'active' : ''}`}
              data-testid="top-action-bar-export-dropdown-btn"
              onClick={() => setShowExportDropdown((prev) => !prev)}
              title="הדפסה, הורדת Word ושליחה למייל"
              aria-expanded={showExportDropdown}
            >
              <Printer size={16} />
              <span>הדפסה וייצוא</span>
              <ChevronDown size={14} className={`export-dropdown-arrow ${showExportDropdown ? 'open' : ''}`} />
            </button>

            {showExportDropdown && (
              <div className="export-dropdown-menu" role="menu" data-testid="top-action-bar-export-menu">
                <button
                  type="button"
                  className="export-dropdown-item"
                  data-testid="export-menu-print-btn"
                  onClick={() => {
                    setShowExportDropdown(false);
                    handlePrintDocument();
                  }}
                >
                  <Printer size={15} style={{ color: '#2563eb' }} />
                  <span>הדפס תוכנית עבודה</span>
                </button>

                <button
                  type="button"
                  className="export-dropdown-item"
                  data-testid="export-menu-email-btn"
                  onClick={() => {
                    setShowExportDropdown(false);
                    handleOpenEmailModal('tala');
                  }}
                >
                  <Mail size={15} style={{ color: '#7c3aed' }} />
                  <span>שלח למייל (Word / PDF)</span>
                </button>

                <button
                  type="button"
                  className="export-dropdown-item"
                  data-testid="export-menu-word-btn"
                  onClick={() => {
                    setShowExportDropdown(false);
                    downloadWordFile('tala');
                  }}
                >
                  <Download size={15} style={{ color: '#059669' }} />
                  <span>הורד קובץ Word (.doc)</span>
                </button>

                <div className="export-dropdown-divider" />

                <label
                  className={`export-dropdown-privacy ${hideStudentDetailsOnPrint ? 'checked' : 'unchecked'}`}
                  title="כאשר מסומן, בהדפסה ובייצוא יוצגו ראשי תיבות במקום שם הילד ויושחרו פרטים מזהים"
                >
                  <input
                    type="checkbox"
                    checked={hideStudentDetailsOnPrint}
                    onChange={(e) => setHideStudentDetailsOnPrint(e.target.checked)}
                  />
                  {hideStudentDetailsOnPrint ? <EyeOff size={15} style={{ color: '#7c3aed' }} /> : <Eye size={15} />}
                  <span>הסתר פרטים מזהים בהדפסה</span>
                </label>
              </div>
            )}
          </div>
        </div>
      </div>

      {isReportLocked && !userCanLockReport && (
        <div
          data-testid="readonly-shared-plan-banner"
          style={{
            background: '#fffbeb',
            border: '1.5px solid #fde68a',
            borderRadius: '10px',
            padding: '10px 16px',
            margin: '0 0 12px 0',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            color: '#92400e',
            fontSize: '13.5px',
            fontWeight: 600,
            boxShadow: '0 1px 3px rgba(217, 119, 6, 0.08)'
          }}
        >
          <Lock size={18} style={{ color: '#d97706', flexShrink: 0 }} />
          <span>
            תוכנית עבודה זו שותפה עמך במצב <strong>קריאה בלבד</strong> (התוכנית נעולה לעריכה על ידי המורה האחראי/ת). ניתן לצפות בכל הסעיפים, לשלוח הודעות בשיח הצוות, או להדפיס.
          </span>
        </div>
      )}

      {/* Mobile-Friendly Quick Section Navigator Bar */}
      <nav className="form-section-nav-bar" aria-label="ניווט מהיר בין סעיפי התוכנית">
        <button
          type="button"
          className="section-nav-pill"
          onClick={() => section1Ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
        >
          1. פרטים
        </button>
        <button
          type="button"
          className="section-nav-pill"
          onClick={() => section2Ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
        >
          2. תיאור ומוקדי כוח
        </button>
        <button
          type="button"
          className="section-nav-pill"
          onClick={() => section3Ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
        >
          3. מטרות ({(formData.goals || []).filter((g: any) => g.title).length})
        </button>
        <button
          type="button"
          className="section-nav-pill"
          onClick={() => section4Ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
        >
          4. המלצות
        </button>
        <button
          type="button"
          className="section-nav-pill"
          onClick={() => {
            if (formData.isLocked) {
              handleAutoUnlockReport('evalSectionPill');
            }
            setShowEvalReportSection(true);
            setTimeout(() => {
              evalReportSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 50);
          }}
        >
          5. הערכת מחצית/שנה
        </button>
      </nav>

      {/* Document Title Banner */}
      <div className="document-title-card">
        <div className="doc-title-top-row">
          <div className="inline-meta-field banner-slot-date">
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
          <div className="inline-meta-field banner-slot-controls" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'nowrap' }}>
            <label style={{ whiteSpace: 'nowrap' }}>שנת לימודים:</label>
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
                onClick={() => handleRolloverToNextYear()}
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
                onClick={() => {
                  setIsDossierOpen(true);
                  const dossierEl = document.getElementById('full-preview-dossier-section');
                  dossierEl?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: attachedDocs.length > 0 ? '#ede9fe' : '#f1f5f9',
                  color: attachedDocs.length > 0 ? '#5b21b6' : '#475569',
                  border: attachedDocs.length > 0 ? '1px solid #c4b5fd' : '1px solid #cbd5e1',
                  borderRadius: '8px',
                  padding: '6px 12px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
                title="צפייה והורדה של מסמכי האבחון והנספחים של התלמיד/ה"
              >
                <FolderOpen size={15} />
                <span>
                  תיק מסמכים
                  {attachedDocs.length > 0 ? ` • ${attachedDocs.length}` : ''}
                </span>
              </button>
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
              {isPlanShared && (
              <button
                type="button"
                onClick={() => setShowTeamChatDrawer(true)}
                title="שיח צוות ותיעוד שיתוף"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: Array.isArray(formData.teamMessages) && formData.teamMessages.length > 0 ? '#eff6ff' : '#f1f5f9',
                  color: Array.isArray(formData.teamMessages) && formData.teamMessages.length > 0 ? '#1d4ed8' : '#334155',
                  border: Array.isArray(formData.teamMessages) && formData.teamMessages.length > 0 ? '1px solid #bfdbfe' : '1px solid #cbd5e1',
                  borderRadius: '8px',
                  padding: '6px 12px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                <MessageSquare size={15} />
                <span>
                  שיח צוות
                  {Array.isArray(formData.teamMessages) && formData.teamMessages.length > 0
                    ? ` • ${formData.teamMessages.length}`
                    : ''}
                </span>
              </button>
            )}
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
              <span><strong>שלב חינוכי:</strong> {isKindergarten ? 'גן ילדים' : 'בית ספר'}</span>
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
                  {previewAdditionalItems.map((it: any, idx: number) => (
                    <span key={idx}>
                      <strong>{it.label}:</strong> {it.value}
                    </span>
                  ))}
                </div>
              );
            })()}

                        {/* Dossier Card: Assessment documents & attachments in Full Document View */}
            <div
              id="full-preview-dossier-section"
              className="diagnostic-dossier-card"
              style={{
                background: isDossierOpen
                  ? 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)'
                  : '#f8fafc',
                border: isDossierOpen ? '1.5px solid #cbd5e1' : '1px solid #e2e8f0',
                borderRadius: '10px',
                padding: isDossierOpen ? '14px 18px' : '10px 16px',
                marginBottom: '14px',
                boxShadow: isDossierOpen ? '0 1px 3px rgba(0,0,0,0.05)' : 'none',
                transition: 'all 0.2s ease'
              }}
            >
              <div
                onClick={() => setIsDossierOpen((prev) => !prev)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  userSelect: 'none',
                  flexWrap: 'wrap',
                  gap: '10px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '7px',
                      background: isDossierOpen || attachedDocs.length > 0 ? '#e0e7ff' : '#f1f5f9',
                      color: isDossierOpen || attachedDocs.length > 0 ? '#4338ca' : '#64748b',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}
                  >
                    <FolderOpen size={18} />
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b' }}>
                        תיק מסמכי אבחון, חוות דעת וסיכומי ועדות
                      </span>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 600,
                          color: attachedDocs.length > 0 ? '#15803d' : '#64748b',
                          background: attachedDocs.length > 0 ? '#dcfce7' : '#e2e8f0',
                          borderRadius: '999px',
                          padding: '1px 8px'
                        }}
                      >
                        {attachedDocs.length > 0 ? `${attachedDocs.length} מסמכים שמורים` : '0 מסמכים'}
                      </span>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsDossierOpen((prev) => !prev);
                    }}
                    title={isDossierOpen ? 'סגירת תיק מסמכים' : 'פתיחת תיק מסמכים'}
                    aria-label={isDossierOpen ? 'סגירת תיק מסמכים' : 'פתיחת תיק מסמכים'}
                    style={{
                      width: '32px',
                      height: '32px',
                      minWidth: '32px',
                      borderRadius: '8px',
                      background: isDossierOpen ? '#ede9fe' : '#f4f7fc',
                      border: isDossierOpen ? '1px solid #c4b5fd' : '1px solid #d3dff0',
                      color: isDossierOpen ? '#5b21b6' : '#2b4c73',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.15s ease',
                      boxShadow: '0 1px 2px rgba(43, 76, 115, 0.04)'
                    }}
                  >
                    {isDossierOpen ? <Minus size={16} /> : <Plus size={16} />}
                  </button>
                </div>
              </div>

              {isDossierOpen && (
                <div style={{ marginTop: '14px', borderTop: '1px solid #e2e8f0', paddingTop: '12px' }}>
                  {attachedDocs.length === 0 ? (
                    <div
                      style={{
                        background: '#ffffff',
                        border: '1px dashed #cbd5e1',
                        borderRadius: '8px',
                        padding: '12px 16px',
                        textAlign: 'center',
                        color: '#64748b',
                        fontSize: '13px'
                      }}
                    >
                      טרם נשמרו מסמכי אבחון לתלמיד/ה זה.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {attachedDocs.map((doc: any) => (
                        <div
                          key={doc.id}
                          style={{
                            background: '#ffffff',
                            border: '1px solid #e2e8f0',
                            borderRadius: '8px',
                            padding: '10px 14px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            flexWrap: 'wrap',
                            gap: '10px'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: '220px' }}>
                            <FileText size={18} color="#5b9bd5" />
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ fontWeight: 600, fontSize: '13.5px', color: '#1e293b' }}>
                                  {doc.fileName || 'מסמך ללא שם'}
                                </span>
                                <span
                                  style={{
                                    fontSize: '10.5px',
                                    fontWeight: 700,
                                    color: '#4338ca',
                                    background: '#e0e7ff',
                                    borderRadius: '4px',
                                    padding: '1px 5px',
                                    textTransform: 'uppercase'
                                  }}
                                >
                                  {doc.fileType || 'DOC'}
                                </span>
                              </div>
                              <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '2px' }}>
                                נשמר בתאריך: {new Date(doc.uploadedAt || Date.now()).toLocaleDateString('he-IL')}
                                {doc.fileSizeFormatted ? ` • ${doc.fileSizeFormatted}` : ''}
                              </div>
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <button
                              type="button"
                              onClick={async () => {
                                const opened = await openDossierFilePreview(doc);
                                if (!opened) {
                                  setViewingDocText(doc);
                                }
                              }}
                              title="צפייה במסמך או בטקסט שחולץ"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                background: '#f8fafc',
                                border: '1px solid #cbd5e1',
                                borderRadius: '6px',
                                padding: '5px 10px',
                                fontSize: '12px',
                                fontWeight: 600,
                                color: '#334155',
                                cursor: 'pointer',
                                transition: 'background 0.15s'
                              }}
                            >
                              <Eye size={13} />
                              <span>צפייה</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => triggerDossierDownload(doc)}
                              title="הורדת הקובץ"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                background: '#f8fafc',
                                border: '1px solid #cbd5e1',
                                borderRadius: '6px',
                                padding: '5px 10px',
                                fontSize: '12px',
                                fontWeight: 600,
                                color: '#334155',
                                cursor: 'pointer',
                                transition: 'background 0.15s'
                              }}
                            >
                              <Download size={13} />
                              <span>הורדה</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

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
                          {(formData.goals || []).map((g: any) => {
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
                                  <div style={{ marginTop: '8px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        handleAutoUnlockReport('evalToggle');
                                        setExpandedEvalMap((prev: any) => ({
                                          ...prev,
                                          [g.id]: true
                                        }));
                                      }}
                                      style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        background: '#ede9fe',
                                        color: '#5b21b6',
                                        border: '1px solid #c4b5fd',
                                        borderRadius: '6px',
                                        padding: '4px 8px',
                                        fontSize: '11.5px',
                                        fontWeight: 600,
                                        cursor: 'pointer'
                                      }}
                                      title="פתיחת הדו״ח ומעבר להערכת מחצית / סוף שנה למטרה זו"
                                    >
                                      <ChevronDown size={13} />
                                      <span>+ הערכת מחצית / סוף שנה</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        handleAutoUnlockReport('observation');
                                        setObservationModalGoalId(g.id);
                                      }}
                                      style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        background: '#f0f9ff',
                                        color: '#0369a1',
                                        border: '1px solid #bae6fd',
                                        borderRadius: '6px',
                                        padding: '4px 8px',
                                        fontSize: '11.5px',
                                        fontWeight: 600,
                                        cursor: 'pointer'
                                      }}
                                      title="תיעוד תצפית מהירה מהשטח ושילוב בהערכת מחצית/סוף שנה"
                                    >
                                      <Plus size={13} />
                                      <span>
                                        תצפית מהירה
                                        {Array.isArray(g.observations) && g.observations.length > 0
                                          ? ` (${g.observations.length})`
                                          : ''}
                                      </span>
                                    </button>
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

                {(formData.goals || []).map((g: any) => (
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
                        <td>
                          <strong>{getRedactedText(g.title)}</strong>
                          <div style={{ marginTop: '8px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            <button
                              type="button"
                              onClick={() => {
                                handleAutoUnlockReport('evalToggle');
                                setExpandedEvalMap((prev: any) => ({
                                  ...prev,
                                  [g.id]: true
                                }));
                              }}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                background: '#ede9fe',
                                color: '#5b21b6',
                                border: '1px solid #c4b5fd',
                                borderRadius: '6px',
                                padding: '4px 8px',
                                fontSize: '11.5px',
                                fontWeight: 600,
                                cursor: 'pointer'
                              }}
                              title="פתיחת הדו״ח ומעבר להערכת מחצית / סוף שנה למטרה זו"
                            >
                              <ChevronDown size={13} />
                              <span>+ הערכת מחצית / סוף שנה</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                handleAutoUnlockReport('observation');
                                setObservationModalGoalId(g.id);
                              }}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                background: '#f0f9ff',
                                color: '#0369a1',
                                border: '1px solid #bae6fd',
                                borderRadius: '6px',
                                padding: '4px 8px',
                                fontSize: '11.5px',
                                fontWeight: 600,
                                cursor: 'pointer'
                              }}
                              title="תיעוד תצפית מהירה מהשטח ושילוב בהערכת מחצית/סוף שנה"
                            >
                              <Plus size={13} />
                              <span>
                                תצפית מהירה
                                {Array.isArray(g.observations) && g.observations.length > 0
                                  ? ` (${g.observations.length})`
                                  : ''}
                              </span>
                            </button>
                          </div>
                        </td>
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
                handleSaveProgress();
                setShowMinistryCopyModal(true);
              }}
              title="העתקת סעיפי התוכנית כטקסט נקי להדבקה במנב״ס / משו״ב"
            >
              <ClipboardCopy size={18} />
              <span>העתקה למנב&quot;ס</span>
            </button>

            <button
              type="button"
              className="btn-print-doc"
              onClick={() => {
                if (formData.isLocked) {
                  handleAutoUnlockReport('evalSectionDocPreview');
                }
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
                if (formData.isLocked) {
                  handleAutoUnlockReport('observation');
                }
                const targetGoalId = (formData.goals && formData.goals[0]?.id) || 'goal-1';
                setObservationModalGoalId(targetGoalId);
              }}
              style={{
                background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
                color: '#15803d',
                borderColor: '#86efac',
                fontWeight: 600
              }}
              title="תיעוד תצפית מהירה מהשטח"
            >
              <Plus size={18} />
              <span>תצפית מהירה</span>
            </button>

            <button
              type="button"
              className="btn-print-doc"
              onClick={() => {
                const next = !showStatusReportSection;
                setShowStatusReportSection(next);
                if (next) {
                  const currentSections = Array.isArray(formData.statusReportSections)
                    ? formData.statusReportSections.filter((s: any) => (s.content || '').trim())
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
          <section className="form-section-card" ref={section1Ref}>
        <div className="section-header-line" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          <h3>1. פרטים אישיים של הילד/ה ומסגרת חינוכית</h3>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', display: 'inline-block', borderRadius: '8px' }}>
            {activeOnboardingStep === 7 && (
              <div className="onboarding-tour-arrow-box" style={{ top: '-44px', right: '0' }}>
                <span className="tour-arrow-anim">👇</span>
                <span>שלב 7: לחצי כאן לשליחת שאלון "קול ההורה" המאובטח בוואטסאפ!</span>
              </div>
            )}
            <ParentVoiceControl
              student={formData}
              currentUser={currentUser}
              disabled={isReportLocked}
              onMerge={handleMergeParentVoice}
              highlight={activeOnboardingStep === 7}
            />
          </div>
          <div style={{ position: 'relative', display: 'inline-block' }}>
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
          <button
            type="button"
            onClick={() => {
              section2Ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }}
            title="מסמכי אבחון וסיכומי ועדות שמורים – לחצי למעבר לחלק 2"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: attachedDocs.length > 0 ? '#f0fdf4' : '#f8fafc',
              color: attachedDocs.length > 0 ? '#166534' : '#475569',
              border: attachedDocs.length > 0 ? '1px solid #86efac' : '1px solid #cbd5e1',
              borderRadius: '8px',
              padding: '6px 12px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            <FileText size={15} style={{ color: attachedDocs.length > 0 ? '#15803d' : '#64748b' }} />
            <span>
              {attachedDocs.length > 0 ? `מסמכי אבחון • ${attachedDocs.length}` : 'מסמכי אבחון'}
            </span>
          </button>
          </div>
        </div>

        {/* Radio Buttons for תל"א OR תח"י */}
        <div className="plan-type-radio-bar" style={{ position: 'relative' }}>
          {activeOnboardingStep === 2 && (
            <div className="onboarding-tour-arrow-box" style={{ top: '-42px', right: '0' }}>
              <span className="tour-arrow-anim">👇</span>
              <span>שלב 2: כאן בוחרים סוג תוכנית ומזינים את פרטי הילד/ה, השלב והמסגרת החינוכית!</span>
            </div>
          )}
          <span className="plan-type-label">סוג התוכנית:</span>
          <div className="plan-type-options">
            <label
              className={`plan-type-radio-card ${
                isTalaMode ? 'selected' : ''
              } ${activeOnboardingStep === 2 ? 'tour-highlight-input' : ''}`}
            >
              <input
                type="radio"
                name="planType"
                value={DEFAULT_PLAN_TYPE}
                disabled={isReportLocked}
                checked={isTalaMode}
                onChange={(e) => {
                  handlePlanTypeChange(e.target.value);
                  
                }}
              />
              <span>{DEFAULT_PLAN_TYPE}</span>
            </label>

            <label
              className={`plan-type-radio-card ${
                !isTalaMode ? 'selected' : ''
              } `}
            >
              <input
                type="radio"
                name="planType"
                value={TACHI_PLAN_TYPE}
                disabled={isReportLocked}
                checked={!isTalaMode}
                onChange={(e) => {
                  handlePlanTypeChange(e.target.value);
                  
                }}
              />
              <span>{TACHI_PLAN_TYPE}</span>
            </label>
          </div>
        </div>

        <div className="personal-details-grid">
          <div className="form-field" style={{ position: 'relative' }}>
            
            <label>שם הילד/ה:</label>
            <input
              type="text"
              disabled={isReportLocked}
              className={activeOnboardingStep === 2 ? 'tour-highlight-input' : ''}
              value={formData.name === 'תלמיד/ה חדש/ה' ? '' : (formData.name || '')}
              onChange={(e) => {
                handleFieldChange('name', e.target.value);
              }}
              placeholder="שם פרטי ושם משפחה"
            />
          </div>

          <div className="form-field" style={{ position: 'relative' }}>
            
            <label>מין הילד/ה:</label>
            <div className="gender-radio-group" role="radiogroup" aria-label="מין הילד/ה">
              <label className={`gender-radio-option ${currentGender === 'boy' ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name="studentGender"
                  value="boy"
                  disabled={isReportLocked}
                  checked={currentGender === 'boy'}
                  onChange={() => {
                    handleGenderChange('boy');
                    
                  }}
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
                  onChange={() => {
                    handleGenderChange('girl');
                    
                  }}
                />
                <span>בת</span>
              </label>
            </div>
          </div>

          <div className="form-field" style={{ position: 'relative' }}>
            
            <label>
              שלב חינוכי: <span style={{ color: '#e11d48', fontWeight: 'bold' }} title="שדה חובה">*</span>
            </label>
            <div className="gender-radio-group" role="radiogroup" aria-label="שלב חינוכי">
              <label className={`gender-radio-option ${currentStage === 'school' ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name="studentStage"
                  value="school"
                  disabled={isReportLocked}
                  checked={currentStage === 'school'}
                  onChange={() => {
                    handleFieldChange('stage', 'school');
                    setPickerStageFilter(null);
                    
                  }}
                />
                <span>בית ספר</span>
              </label>
              <label className={`gender-radio-option ${currentStage === 'kindergarten' ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name="studentStage"
                  value="kindergarten"
                  disabled={isReportLocked}
                  checked={currentStage === 'kindergarten'}
                  onChange={() => {
                    handleFieldChange('stage', 'kindergarten');
                    setPickerStageFilter(null);
                    
                  }}
                />
                <span>גן ילדים</span>
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

          <div className="form-field" style={{ position: 'relative' }}>
            
            <label>מסגרת חינוכית:</label>
            <input
              type="text"
              disabled={isReportLocked}
              className=""
              value={formData.educationalFramework || ''}
              onChange={(e) => {
                handleFieldChange('educationalFramework', e.target.value);
              }}
              placeholder={isKindergarten ? 'שם הגן' : 'שם בית הספר והכיתה'}
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
                {isKindergarten
                  ? 'פרטי מסגרת, צוות הגן ושותפים חינוכיים לתהליך (אופציונלי):'
                  : 'פרטי מסגרת, צוות כיתה ושותפים חינוכיים לתהליך (אופציונלי):'}
              </div>
              {studentsWithTeam.length > 0 && !isReportLocked && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '10px',
                    marginBottom: '14px',
                    padding: '9px 13px',
                    background: '#ede9fe',
                    border: '1px solid #c4b5fd',
                    borderRadius: '8px',
                    fontSize: '13px'
                  }}
                >
                  <span style={{ fontWeight: 600, color: '#4c1d95', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Users size={16} />
                    <span>שכפול פרטי צוות ומסגרת מתלמיד/ה קיים/ת:</span>
                  </span>
                  <select
                    defaultValue=""
                    onChange={(e) => {
                      const sourceId = e.target.value;
                      if (!sourceId) return;
                      const sourceStudent = allStudents.find((s) => s.id === sourceId);
                      if (!sourceStudent) return;
                      const teamData = extractTeamDataFromStudent(sourceStudent);
                      setFormData((prev: any) => ({
                        ...prev,
                        ...teamData
                      }));
                      setCopyTeamSuccessMsg(`פרטי הצוות והמסגרת שוכפלו בהצלחה מ-${sourceStudent.name || 'התלמיד/ה'}`);
                      setTimeout(() => setCopyTeamSuccessMsg(''), 4000);
                      e.target.value = '';
                    }}
                    style={{
                      padding: '5px 10px',
                      borderRadius: '6px',
                      border: '1px solid #a78bfa',
                      fontSize: '12.5px',
                      background: '#ffffff',
                      color: '#1e1b4b',
                      cursor: 'pointer',
                      minWidth: '220px'
                    }}
                  >
                    <option value="">-- בחר/י תלמיד/ה לשכפול צוות --</option>
                    {studentsWithTeam.map((cand) => (
                      <option key={cand.id} value={cand.id}>
                        {cand.name} {cand.schoolName ? `(${cand.schoolName})` : ''}
                      </option>
                    ))}
                  </select>
                  {copyTeamSuccessMsg && (
                    <span style={{ color: '#15803d', fontWeight: 600, fontSize: '12.5px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Check size={14} />
                      {copyTeamSuccessMsg}
                    </span>
                  )}
                </div>
              )}

              <div className="personal-details-grid">
                <div className="form-field">
                  <label>{isKindergarten ? 'גן:' : 'בית הספר:'}</label>
                  <input
                    type="text"
                    disabled={isReportLocked}
                    value={formData.schoolName || ''}
                    onChange={(e) => handleFieldChange('schoolName', e.target.value)}
                    placeholder={isKindergarten ? 'שם הגן' : 'שם בית הספר / המוסד החינוכי'}
                    list="tala-suggestions-schoolName"
                  />
                  <datalist id="tala-suggestions-schoolName">
                    {(coworkerSuggestions.schoolName || []).map((val) => (
                      <option key={val} value={val} />
                    ))}
                  </datalist>
                </div>
                <div className="form-field">
                  <label>{isKindergarten ? 'שלב גן:' : 'כיתה:'}</label>
                  {isKindergarten ? (
                    <select
                      disabled={isReportLocked}
                      value={formData.gradeClass || ''}
                      onChange={(e) => handleFieldChange('gradeClass', e.target.value)}
                    >
                      <option value="">-- בחרי שלב גן --</option>
                      <option value="טרום-טרום חובה: גילאי 3–4">טרום-טרום חובה: גילאי 3–4</option>
                      <option value="טרום חובה: גילאי 4–5">טרום חובה: גילאי 4–5</option>
                      <option value="גן חובה: גילאי 5–6">גן חובה: גילאי 5–6</option>
                      {formData.gradeClass &&
                        !['טרום-טרום חובה: גילאי 3–4', 'טרום חובה: גילאי 4–5', 'גן חובה: גילאי 5–6'].includes(formData.gradeClass) && (
                          <option value={formData.gradeClass}>{formData.gradeClass}</option>
                        )}
                    </select>
                  ) : (
                    <>
                      <input
                        type="text"
                        disabled={isReportLocked}
                        value={formData.gradeClass || ''}
                        onChange={(e) => handleFieldChange('gradeClass', e.target.value)}
                        placeholder="למשל: א׳1 / גן שקד"
                        list="tala-suggestions-gradeClass"
                      />
                      <datalist id="tala-suggestions-gradeClass">
                        {(coworkerSuggestions.gradeClass || []).map((val) => (
                          <option key={val} value={val} />
                        ))}
                      </datalist>
                    </>
                  )}
                </div>
                <div className="form-field">
                  <label>{isKindergarten ? 'גננת:' : 'מחנכת:'}</label>
                  <input
                    type="text"
                    disabled={isReportLocked}
                    value={formData.homeroomTeacher || ''}
                    onChange={(e) => handleFieldChange('homeroomTeacher', e.target.value)}
                    placeholder={isKindergarten ? 'שם הגננת' : 'שם מחנכת הכיתה / הגננת'}
                    list="tala-suggestions-homeroomTeacher"
                  />
                  <datalist id="tala-suggestions-homeroomTeacher">
                    {(coworkerSuggestions.homeroomTeacher || []).map((val) => (
                      <option key={val} value={val} />
                    ))}
                  </datalist>
                </div>
                <div className="form-field">
                  <label>{isKindergarten ? 'גננת שילוב:' : 'מורת שילוב:'}</label>
                  <input
                    type="text"
                    disabled={isReportLocked}
                    value={formData.integrationTeacher || ''}
                    onChange={(e) => handleFieldChange('integrationTeacher', e.target.value)}
                    placeholder={isKindergarten ? 'שם גננת השילוב' : 'שם מורת השילוב'}
                    list="tala-suggestions-integrationTeacher"
                  />
                  <datalist id="tala-suggestions-integrationTeacher">
                    {(coworkerSuggestions.integrationTeacher || []).map((val) => (
                      <option key={val} value={val} />
                    ))}
                  </datalist>
                </div>
                <div className="form-field">
                  <label>תומכת למידה:</label>
                  <input
                    type="text"
                    disabled={isReportLocked}
                    value={formData.learningSupportAssistant || ''}
                    onChange={(e) => handleFieldChange('learningSupportAssistant', e.target.value)}
                    placeholder="שם תומכת הלמידה / סייעת"
                    list="tala-suggestions-learningSupportAssistant"
                  />
                  <datalist id="tala-suggestions-learningSupportAssistant">
                    {(coworkerSuggestions.learningSupportAssistant || []).map((val) => (
                      <option key={val} value={val} />
                    ))}
                  </datalist>
                </div>
                <div className="form-field">
                  <label>יועצת:</label>
                  <input
                    type="text"
                    disabled={isReportLocked}
                    value={formData.counselorName || ''}
                    onChange={(e) => handleFieldChange('counselorName', e.target.value)}
                    placeholder="שם היועצת החינוכית"
                    list="tala-suggestions-counselorName"
                  />
                  <datalist id="tala-suggestions-counselorName">
                    {(coworkerSuggestions.counselorName || []).map((val) => (
                      <option key={val} value={val} />
                    ))}
                  </datalist>
                </div>
                <div className="form-field">
                  <label>פסיכולוגית:</label>
                  <input
                    type="text"
                    disabled={isReportLocked}
                    value={formData.psychologistName || ''}
                    onChange={(e) => handleFieldChange('psychologistName', e.target.value)}
                    placeholder="שם הפסיכולוג/ית"
                    list="tala-suggestions-psychologistName"
                  />
                  <datalist id="tala-suggestions-psychologistName">
                    {(coworkerSuggestions.psychologistName || []).map((val) => (
                      <option key={val} value={val} />
                    ))}
                  </datalist>
                </div>
                <div className="form-field">
                  <label>מתכללת מטעם המתי"א:</label>
                  <input
                    type="text"
                    disabled={isReportLocked}
                    value={formData.matyaCoordinator || ''}
                    onChange={(e) => handleFieldChange('matyaCoordinator', e.target.value)}
                    placeholder="שם מתכללת המתי״א"
                    list="tala-suggestions-matyaCoordinator"
                  />
                  <datalist id="tala-suggestions-matyaCoordinator">
                    {(coworkerSuggestions.matyaCoordinator || []).map((val) => (
                      <option key={val} value={val} />
                    ))}
                  </datalist>
                </div>
                <div className="form-field">
                  <label>מטפלת רגשית / באומנויות:</label>
                  <input
                    type="text"
                    disabled={isReportLocked}
                    value={formData.emotionalTherapist || ''}
                    onChange={(e) => handleFieldChange('emotionalTherapist', e.target.value)}
                    placeholder="שם המטפל/ת הרגשי/ת או באומנויות"
                    list="tala-suggestions-emotionalTherapist"
                  />
                  <datalist id="tala-suggestions-emotionalTherapist">
                    {(coworkerSuggestions.emotionalTherapist || []).map((val) => (
                      <option key={val} value={val} />
                    ))}
                  </datalist>
                </div>
                <div className="form-field">
                  <label>צוות פרא רפואי:</label>
                  <input
                    type="text"
                    disabled={isReportLocked}
                    value={formData.paraMedicalTeam || ''}
                    onChange={(e) => handleFieldChange('paraMedicalTeam', e.target.value)}
                    placeholder="קלינאית תקשורת, מרפאה בעיסוק..."
                    list="tala-suggestions-paraMedicalTeam"
                  />
                  <datalist id="tala-suggestions-paraMedicalTeam">
                    {(coworkerSuggestions.paraMedicalTeam || []).map((val) => (
                      <option key={val} value={val} />
                    ))}
                  </datalist>
                </div>
                <div className="form-field">
                  <label>שותפים נוספים לכתיבת התוכנית:</label>
                  <input
                    type="text"
                    disabled={isReportLocked}
                    value={formData.additionalPartners || ''}
                    onChange={(e) => handleFieldChange('additionalPartners', e.target.value)}
                    placeholder="מורים מקצועיים, הורים, גורמי חוץ..."
                    list="tala-suggestions-additionalPartners"
                  />
                  <datalist id="tala-suggestions-additionalPartners">
                    {(coworkerSuggestions.additionalPartners || []).map((val) => (
                      <option key={val} value={val} />
                    ))}
                  </datalist>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Section 2: Assessment Dossier + Teacher Free Text + AI Processing + Student Profile / Strengths */}
      <section className="form-section-card highlight-summary-section" ref={section2Ref}>
        <div className="section-header-line">
          <h3>
            {isTalaMode
              ? '2. מסמכי אבחון, תיאור תפקוד ומוקדי כוח של התלמיד/ה'
              : '2. מסמכי אבחון, תיאור חופשי וטבלת מוקדי כוח מסכמת'}
          </h3>
        </div>

        {/* Dossier Card: Assessment documents & committee summaries (Collapsible Accordion) */}
        <div
          className="diagnostic-dossier-card"
          style={{
            background: isDossierOpen
              ? 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)'
              : '#f8fafc',
            border: isDossierOpen ? '1.5px solid #cbd5e1' : '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: isDossierOpen ? '14px 18px' : '10px 16px',
            marginBottom: '18px',
            boxShadow: isDossierOpen ? '0 1px 3px rgba(0,0,0,0.05)' : 'none',
            transition: 'all 0.2s ease'
          }}
        >
          {/* Collapsible Header Row (Clickable to toggle) */}
          <div
            onClick={() => setIsDossierOpen((prev) => !prev)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              userSelect: 'none',
              flexWrap: 'wrap',
              gap: '10px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '7px',
                  background: isDossierOpen || attachedDocs.length > 0 ? '#e0e7ff' : '#f1f5f9',
                  color: isDossierOpen || attachedDocs.length > 0 ? '#4338ca' : '#64748b',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
              >
                <FolderOpen size={18} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b' }}>
                    תיק מסמכי אבחון, חוות דעת וסיכומי ועדות
                  </span>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      color: attachedDocs.length > 0 ? '#15803d' : '#64748b',
                      background: attachedDocs.length > 0 ? '#dcfce7' : '#e2e8f0',
                      borderRadius: '999px',
                      padding: '1px 8px'
                    }}
                  >
                    {attachedDocs.length > 0 ? `${attachedDocs.length} מסמכים שמורים` : '0 מסמכים'}
                  </span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsDossierOpen((prev) => !prev);
                }}
                title={isDossierOpen ? 'סגירת תיק מסמכים' : 'פתיחת תיק מסמכים'}
                aria-label={isDossierOpen ? 'סגירת תיק מסמכים' : 'פתיחת תיק מסמכים'}
                style={{
                  width: '32px',
                  height: '32px',
                  minWidth: '32px',
                  borderRadius: '8px',
                  background: isDossierOpen ? '#ede9fe' : '#f4f7fc',
                  border: isDossierOpen ? '1px solid #c4b5fd' : '1px solid #d3dff0',
                  color: isDossierOpen ? '#5b21b6' : '#2b4c73',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.15s ease',
                  boxShadow: '0 1px 2px rgba(43, 76, 115, 0.04)'
                }}
              >
                {isDossierOpen ? <Minus size={16} /> : <Plus size={16} />}
              </button>
            </div>
          </div>

          {/* Expanded Content */}
          {isDossierOpen && (
            <div style={{ marginTop: '14px', borderTop: '1px solid #e2e8f0', paddingTop: '12px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '12px',
                  marginBottom: '12px'
                }}
              >
                <p style={{ margin: 0, fontSize: '12.5px', color: '#64748b', maxWidth: '650px' }}>
                  העלי אבחונים ומסמכי רקע (Word, PDF או טקסט עד 20MB) כדי לשמור אותם בתיק התלמיד/ה ולגזור מהם רקע ומטרות בעזרת AI
                </p>

                {!isReportLocked && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedIntakeDoc(null);
                      setShowDiagnosticIntakeModal(true);
                    }}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      background: 'linear-gradient(135deg, #5b9bd5 0%, #8b6fc0 100%)',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '8px 16px',
                      fontSize: '13px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      boxShadow: '0 2px 6px rgba(91, 155, 213, 0.28)',
                      transition: 'opacity 0.2s'
                    }}
                    title="העלאת מסמך אבחון וניתוח פדגוגי אוטומטי בעזרת AI"
                  >
                    <Sparkles size={16} />
                    <span>העלאת ועיבוד מסמכים</span>
                  </button>
                )}
              </div>

              {/* Documents list or empty state */}
              {attachedDocs.length === 0 ? (
                <div
                  style={{
                    background: '#ffffff',
                    border: '1px dashed #cbd5e1',
                    borderRadius: '8px',
                    padding: '14px 16px',
                    textAlign: 'center',
                    color: '#64748b',
                    fontSize: '13px'
                  }}
                >
                  טרם נשמרו מסמכי אבחון לתלמיד/ה זה. לחצי על ״העלאת ועיבוד מסמכים״ כדי לצרף אבחון פסיכודידקטי, סיכום ועדת אפיון וזכאות או דוח טיפולי.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {attachedDocs.map((doc: any) => (
                    <div
                      key={doc.id}
                      style={{
                        background: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        padding: '10px 14px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '10px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: '220px' }}>
                        <FileText size={18} color="#5b9bd5" />
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontWeight: 600, fontSize: '13.5px', color: '#1e293b' }}>
                              {doc.fileName || 'מסמך ללא שם'}
                            </span>
                            <span
                              style={{
                                fontSize: '10.5px',
                                fontWeight: 700,
                                color: '#4338ca',
                                background: '#e0e7ff',
                                borderRadius: '4px',
                                padding: '1px 5px',
                                textTransform: 'uppercase'
                              }}
                            >
                              {doc.fileType || 'DOC'}
                            </span>
                          </div>
                          <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '2px' }}>
                            נשמר בתאריך: {new Date(doc.uploadedAt || Date.now()).toLocaleDateString('he-IL')}
                            {doc.fileSizeFormatted ? ` • ${doc.fileSizeFormatted}` : ''}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <button
                          type="button"
                          onClick={async () => {
                            const opened = await openDossierFilePreview(doc);
                            if (!opened) {
                              setViewingDocText(doc);
                            }
                          }}
                          title="צפייה במסמך או בטקסט שחולץ"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            background: '#f8fafc',
                            border: '1px solid #cbd5e1',
                            borderRadius: '6px',
                            padding: '5px 10px',
                            fontSize: '12px',
                            fontWeight: 600,
                            color: '#334155',
                            cursor: 'pointer',
                            transition: 'background 0.15s'
                          }}
                        >
                          <Eye size={13} />
                          <span>צפייה</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => triggerDossierDownload(doc)}
                          title="הורדת הקובץ"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            background: '#f8fafc',
                            border: '1px solid #cbd5e1',
                            borderRadius: '6px',
                            padding: '5px 10px',
                            fontSize: '12px',
                            fontWeight: 600,
                            color: '#334155',
                            cursor: 'pointer',
                            transition: 'background 0.15s'
                          }}
                        >
                          <Download size={13} />
                          <span>הורדה</span>
                        </button>

                        {!isReportLocked && (
                          <button
                            type="button"
                            onClick={() => handleRemoveDiagnosticDoc(doc.id, doc.fileName, doc.storagePath)}
                            title="הסרת מסמך זה מתיק התלמיד/ה"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              background: '#f8fafc',
                              border: '1px solid #e2e8f0',
                              borderRadius: '6px',
                              padding: '5px 9px',
                              fontSize: '12px',
                              fontWeight: 600,
                              color: '#64748b',
                              cursor: 'pointer',
                              transition: 'all 0.15s'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.color = '#be123c';
                              e.currentTarget.style.borderColor = '#fecdd3';
                              e.currentTarget.style.background = '#fff1f2';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.color = '#64748b';
                              e.currentTarget.style.borderColor = '#e2e8f0';
                              e.currentTarget.style.background = '#f8fafc';
                            }}
                          >
                            <Trash2 size={13} />
                            <span>הסרה</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div
          className="free-text-area-box pedagogical-feed-collapsible-card"
          style={{
            background: !isFreeTextCollapsed
              ? 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)'
              : '#f8fafc',
            border: !isFreeTextCollapsed ? '1.5px solid #cbd5e1' : '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: !isFreeTextCollapsed ? '14px 18px' : '10px 16px',
            marginBottom: '18px',
            boxShadow: !isFreeTextCollapsed ? '0 1px 3px rgba(0,0,0,0.05)' : 'none',
            transition: 'all 0.2s ease'
          }}
        >
          <div
            onClick={() => setIsFreeTextCollapsed((prev) => !prev)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              userSelect: 'none',
              flexWrap: 'wrap',
              gap: '10px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '7px',
                  background: !isFreeTextCollapsed || activeSnippets.length > 0 ? '#ede9fe' : '#f1f5f9',
                  color: !isFreeTextCollapsed || activeSnippets.length > 0 ? '#6d28d9' : '#64748b',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
              >
                <Sparkles size={16} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b' }}>
                  ציר תובנות פדגוגי ומסמכי רקע
                </span>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    color: activeSnippets.length > 0 ? '#047857' : '#64748b',
                    background: activeSnippets.length > 0 ? '#ecfdf5' : '#e2e8f0',
                    border: activeSnippets.length > 0 ? '1px solid #a7f3d0' : '1px solid #cbd5e1',
                    borderRadius: '999px',
                    padding: '1px 8px'
                  }}
                >
                  {activeSnippets.length > 0 ? `${activeSnippets.length} מקורות פעילים` : '0 מקורות'}
                </span>
                {isRawFreeTextAlreadyAnalyzed(formData) && (
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      color: '#5b21b6',
                      background: '#f3eefc',
                      border: '1px solid #d8b4fe',
                      borderRadius: '999px',
                      padding: '1px 8px'
                    }}
                  >
                    ✓ עובד ב-AI
                  </span>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsFreeTextCollapsed((prev) => !prev);
                }}
                title={isFreeTextCollapsed ? 'פתיחת ציר תובנות' : 'סגירת ציר תובנות'}
                aria-label={isFreeTextCollapsed ? 'פתיחת ציר תובנות' : 'סגירת ציר תובנות'}
                style={{
                  width: '32px',
                  height: '32px',
                  minWidth: '32px',
                  borderRadius: '8px',
                  background: !isFreeTextCollapsed ? '#ede9fe' : '#f4f7fc',
                  border: !isFreeTextCollapsed ? '1px solid #c4b5fd' : '1px solid #d3dff0',
                  color: !isFreeTextCollapsed ? '#5b21b6' : '#2b4c73',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.15s ease',
                  boxShadow: '0 1px 2px rgba(43, 76, 115, 0.04)'
                }}
              >
                {isFreeTextCollapsed ? <Plus size={16} /> : <Minus size={16} />}
              </button>
            </div>
          </div>

          {!isFreeTextCollapsed && (
            <div style={{ marginTop: '14px' }}>
              <PedagogicalFeed
                snippets={activeSnippets}
                onAddSnippet={handleAddSnippet}
                onRemoveSnippet={handleRemoveSnippet}
                onOpenUploadModal={() => {
                  setSelectedIntakeDoc(null);
                  setShowDiagnosticIntakeModal(true);
                }}
                onSaveDraft={handleSaveDraft}
                onTriggerAiAnalysis={() => handleReverseEngineerFullReport()}
                isAnalyzing={isReverseEngineering}
                isLocked={isReportLocked}
                currentUserName={userPreferences?.fullName || currentUser?.name || ''}
                onboardingStep={activeOnboardingStep}
              />
            </div>
          )}

          {isReverseEngineering && (
            <div className="ai-busy-indicator-card" role="status" aria-live="polite">
              <div className="ai-busy-indicator-header">
                <Loader2 size={19} className="tala-spin-icon" />
                <Sparkles size={16} />
                <span>
                  {reverseEngineerElapsedSeconds >= 25
                    ? 'העיבוד מתעכב מעבר לרגיל (ייתכן חיבור רשת איטי)... המערכת ממשיכה לנסות.'
                    : reverseEngineerElapsedSeconds >= 12
                    ? 'ה-AI מעבד ניתוח מעמיק ומפורט לכל תחומי הפרופיל והמטרות, אנא המתיני...'
                    : 'ה-AI מנתח את התיאור החופשי ובונה את תוכנית העבודה... (התהליך עשוי להימשך מספר שניות, נא להמתין)'}
                </span>
              </div>
              <div className="ai-busy-indicator-sub">
                {AI_BUSY_STEPS[reverseEngineerStepIdx]}
                {reverseEngineerElapsedSeconds > 0 && ` (${reverseEngineerElapsedSeconds} שניות)`}
              </div>
              <div className="ai-busy-progress-track">
                <div className="ai-busy-progress-bar" />
              </div>

              {reverseEngineerElapsedSeconds >= 15 && (
                <div
                  style={{
                    marginTop: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '8px',
                    flexWrap: 'wrap',
                    paddingTop: '8px',
                    borderTop: '1px dashed #cbd5e1'
                  }}
                >
                  <span style={{ fontSize: '11.5px', color: '#64748b' }}>
                    {reverseEngineerElapsedSeconds >= 25
                      ? 'אם חיבור הרשת מתעכב, תוכלי לעבור מיידית להפקה מקומית:'
                      : 'אם את ממהרת, ניתן לעבור למנוע הפדגוגי המקומי בכל שלב:'}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleForceLocalReverseEngineer()}
                    style={{
                      background: '#ffffff',
                      color: '#4338ca',
                      border: '1.5px solid #a5b4fc',
                      borderRadius: '8px',
                      padding: '4px 10px',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px'
                    }}
                  >
                    ⚡ מעבר לעיבוד מקומי ללא אינטרנט
                  </button>
                </div>
              )}
            </div>
          )}

          {reverseEngineerError && !isReverseEngineering && (
            <div
              className="reverse-engineer-error-banner"
              style={{
                marginTop: isFreeTextCollapsed ? '10px' : undefined,
                background: '#fef2f2',
                border: '1.5px solid #fca5a5',
                borderRadius: '10px',
                padding: '12px 14px',
                color: '#991b1b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                flexWrap: 'wrap'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '220px' }}>
                <ShieldAlert size={18} color="#dc2626" />
                <span style={{ fontSize: '13px', fontWeight: 500 }}>{reverseEngineerError}</span>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={() => handleReverseEngineerFullReport()}
                  style={{
                    background: '#dc2626',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '5px 12px',
                    fontSize: '12.5px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  🔄 נסי שוב
                </button>
                <button
                  type="button"
                  onClick={() => handleForceLocalReverseEngineer()}
                  style={{
                    background: '#ffffff',
                    color: '#991b1b',
                    border: '1px solid #f87171',
                    borderRadius: '6px',
                    padding: '5px 12px',
                    fontSize: '12.5px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  ⚡ הפק במנוע מקומי
                </button>
                <button
                  type="button"
                  onClick={() => setReverseEngineerError('')}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#6b7280',
                    cursor: 'pointer',
                    fontSize: '16px',
                    padding: '2px 6px'
                  }}
                  title="סגור הודעה"
                >
                  ✕
                </button>
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
      <section className="form-section-card" ref={section3Ref}>
        <div className="section-header-line">
          <div>
            <h3>
              {isTalaMode
                ? '3. תכנית עבודה – תכנית לימודית יחידנית (תל"א)'
                : '3. הגדרת מטרות ויעדים לפי סביבות פעילות ותחומי תפקוד (תח"י)'}
            </h3>
            <p className="section-sub-desc">
              {isTalaMode
                ? 'תל"א מיועדת לתלמידים בחינוך המיוחד / גני שילוב. בחרי מטרה מתוך מאגר המטרות הדינמי או הקלידי מטרה חדשה.'
                : 'תח"י מיועדת לתלמידי שילוב בחינוך הרגיל. בחרי מטרה מתוך מאגר המטרות הדינמי לפי סביבות פעילות ותחומי תפקוד.'}
            </p>
          </div>
          {Array.isArray(formData.goals) && formData.goals.length > 0 && (
            <div style={{ position: 'relative' }}>
              {activeOnboardingStep === 4 && (
                <div className="onboarding-tour-arrow-box" style={{ top: '-44px', left: '0' }}>
                  <span className="tour-arrow-anim">👇</span>
                  <span>שלב 4: המטרות נגזרו בהצלחה! לחצי כאן להוספת מטרה נוספת מתוך המאגר האקולוגי!</span>
                </div>
              )}
              <button
                type="button"
                className={`btn-add-goal-block ${activeOnboardingStep === 4 ? 'tour-highlight-btn' : ''}`}
                onClick={handleAddGoalRow}
                disabled={isReportLocked}
              >
                <Plus size={18} />
                <span>הוסף מטרה / סביבה חדשה</span>
              </button>
            </div>
          )}
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

        {(!formData.goals || formData.goals.length === 0) && (
          <div
            style={{
              padding: '36px 20px',
              textAlign: 'center',
              background: '#f8fafc',
              border: '2px dashed #cbd5e1',
              borderRadius: '12px',
              marginBottom: '20px'
            }}
          >
            <div style={{ fontSize: '15px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
              {isTalaMode
                ? 'טרם הוגדרו מטרות בתכנית הלימודית היחידנית (תל"א)'
                : 'טרם הוגדרו מטרות בתכנית החינוכית היחידנית (תח"י)'}
            </div>
            <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 16px 0' }}>
              תוכל לבחור מטרה מתוך מאגר המטרות הדינמי לפי סביבה ותחום לימודי או להגדיר מטרה חדשה.
            </p>
            <div style={{ position: 'relative', display: 'inline-block' }}>
              {activeOnboardingStep === 4 && (
                <div className="onboarding-tour-arrow-box" style={{ top: '-48px', left: '50%', transform: 'translateX(-50%)' }}>
                  <span className="tour-arrow-anim">👇</span>
                  <span>שלב 4: לחצי כאן להוספת מטרות מהמאגר האקולוגי!</span>
                </div>
              )}
              <button
                type="button"
                className={`btn-add-goal-block-large ${activeOnboardingStep === 4 ? 'tour-highlight-btn' : ''}`}
                onClick={() => {
                  handleAddGoalRow();
                }}
                disabled={isReportLocked}
                style={{ display: 'inline-flex', width: 'auto', padding: '10px 24px' }}
              >
                <Plus size={18} />
                <span>
                  {isTalaMode ? '+ הוסף מטרה ראשונה לתל"א' : '+ הוסף מטרה ראשונה לתח"י'}
                </span>
              </button>
            </div>
          </div>
        )}

        <div className="goals-blocks-list">
          {(formData.goals || []).map((goalRow: any, index: any) => {
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
              generateDefaultQuestionsForCustomGoal(goalRow.title, goalRow.environment, formData);

            // Determine effective student stage and filter goals in picker
            const effectiveStage = getEffectiveStudentStage(formData);
            const activeStageFilter = pickerStageFilter !== null ? pickerStageFilter : effectiveStage;

            // Filter goals in picker by stage, search & environment, preserving popularity sort
            const filteredBankGoals = sortedGoals.filter((item) => {
              const matchesStage = isGoalRelevantForStage(item, activeStageFilter);
              const matchesEnv =
                pickerEnvFilter === 'הכל' ||
                canonicalizeEnvironment(item.environment) === pickerEnvFilter ||
                (item.environment && item.environment.includes(pickerEnvFilter));
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
              return matchesStage && matchesEnv && matchesQuery;
            });

            return (
              <div key={goalRow.id} id={goalRow.id} className="ecological-goal-card">
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

                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', marginRight: '6px' }}>
                      <label style={{ fontWeight: 600, fontSize: '12.5px', color: '#475569' }}>מוביל/ת מטרה:</label>
                      <select
                        disabled={isReportLocked}
                        value={goalRow.leadProfessional || 'צוות משותף'}
                        onChange={(e) => handleGoalChange(goalRow.id, 'leadProfessional', e.target.value)}
                        style={{
                          padding: '3px 8px',
                          fontSize: '12px',
                          borderRadius: '6px',
                          border: '1px solid #cbd5e1',
                          background: goalRow.leadProfessional && goalRow.leadProfessional !== 'צוות משותף' ? '#eff6ff' : '#ffffff',
                          color: goalRow.leadProfessional && goalRow.leadProfessional !== 'צוות משותף' ? '#1d4ed8' : '#334155',
                          fontWeight: goalRow.leadProfessional && goalRow.leadProfessional !== 'צוות משותף' ? 700 : 500
                        }}
                      >
                        {DISCIPLINE_LEAD_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    </div>
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
                        <div className="bank-env-pills" style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                          {/* Stage filter pills: גן / בית ספר / הכל */}
                          <div style={{ display: 'inline-flex', gap: '4px', background: '#e2e8f0', padding: '2px', borderRadius: '999px', marginLeft: '6px' }}>
                            <button
                              type="button"
                              className={`env-pill ${activeStageFilter === 'kindergarten' ? 'active' : ''}`}
                              onClick={() => setPickerStageFilter('kindergarten')}
                              style={{ padding: '3px 10px', fontSize: '11px', margin: 0 }}
                            >
                              גן
                            </button>
                            <button
                              type="button"
                              className={`env-pill ${activeStageFilter === 'school' ? 'active' : ''}`}
                              onClick={() => setPickerStageFilter('school')}
                              style={{ padding: '3px 10px', fontSize: '11px', margin: 0 }}
                            >
                              בית ספר
                            </button>
                            <button
                              type="button"
                              className={`env-pill ${activeStageFilter === 'all' ? 'active' : ''}`}
                              onClick={() => setPickerStageFilter('all')}
                              style={{ padding: '3px 10px', fontSize: '11px', margin: 0 }}
                            >
                              הכל
                            </button>
                          </div>

                          <button
                            type="button"
                            className={`env-pill ${pickerEnvFilter === 'הכל' ? 'active' : ''}`}
                            onClick={() => setPickerEnvFilter('הכל')}
                          >
                            כל הסביבות
                          </button>
                          {getCanonicalEnvironmentsForStage(activeStageFilter).filter((e) => e !== 'הכל').map((env) => (
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
                          const itemStages = Array.isArray(bankItem.stages) && bankItem.stages.length > 0
                            ? bankItem.stages
                            : (bankItem.stage ? [bankItem.stage] : ['kindergarten']);

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
                                  {itemStages.includes('kindergarten') && (
                                    <span className="stage-chip stage-chip-kdg">גן</span>
                                  )}
                                  {itemStages.includes('school') && (
                                    <span className="stage-chip stage-chip-school">בית ספר</span>
                                  )}
                                  <strong>{displayBankTitle}</strong>
                                  <span className="env-tag-chip">{canonicalizeEnvironment(bankItem.environment)}</span>
                                  <span className="usage-count-badge">
                                    <TrendingUp size={12} />
                                    <span>נבחר {bankItem.usageCount ?? 0} פעמים</span>
                                  </span>
                                </div>
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
                        {currentQuestions.slice(0, 3).map((qObj: any, qIdx: any) => {
                          const currentVal = (aiAnswersMap[goalRow.id] || {})[qIdx] || '';
                          return (
                            <div key={qIdx} className="ai-question-box">
                              <label className="ai-q-text">{qObj.q}</label>
                              {qObj.suggestions && qObj.suggestions.length > 0 && (
                                <div className="ai-suggestion-chips">
                                  {qObj.suggestions.map((sug: any, sIdx: any) => {
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
                            {!isReportLocked && (matchedBankItem?.suggestedObjectives?.length || 0) > 0 && (
                              <div className="quick-objectives-bank">
                                <div
                                  className="quick-objectives-toggle-header"
                                  onClick={() =>
                                    setExpandedQuickObjMap((prev: any) => ({
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
                                    {matchedBankItem?.suggestedObjectives?.map((obj, oIdx) => {
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
                            {!isReportLocked && (matchedBankItem?.suggestedObjectives?.length || 0) > 0 && (
                              <div className="quick-objectives-bank">
                                <div
                                  className="quick-objectives-toggle-header"
                                  onClick={() =>
                                    setExpandedQuickObjMap((prev: any) => ({
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
                                    {matchedBankItem?.suggestedObjectives?.map((obj, oIdx) => {
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        onClick={() => {
                          if (formData.isLocked) {
                            handleAutoUnlockReport('evalToggle');
                          }
                          setExpandedEvalMap((prev: any) => ({
                            ...prev,
                            [goalRow.id]: !prev[goalRow.id]
                          }));
                        }}
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

                      <button
                        type="button"
                        onClick={() => {
                          if (formData.isLocked) {
                            handleAutoUnlockReport('observation');
                          }
                          setObservationModalGoalId(goalRow.id);
                        }}
                        title="תיעוד תצפית מהירה מהשטח ושילוב בהערכת מחצית/סוף שנה"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          background: '#f0f9ff',
                          color: '#0369a1',
                          border: '1px solid #bae6fd',
                          borderRadius: '6px',
                          padding: '5px 11px',
                          fontSize: '12.5px',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        <Plus size={14} />
                        <span>
                          תצפית מהירה
                          {Array.isArray(goalRow.observations) && goalRow.observations.length > 0
                            ? ` (${goalRow.observations.length})`
                            : ''}
                        </span>
                      </button>
                    </div>

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

        {Array.isArray(formData.goals) && formData.goals.length > 0 && (
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
        )}
      </section>

      {/* Section 4: Recommendations & Bottom Actions */}
      <section className="form-section-card" ref={section4Ref}>
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
              handleSaveProgress();
              setShowMinistryCopyModal(true);
            }}
            title="העתקת סעיפי התוכנית כטקסט נקי להדבקה במנב״ס / משו״ב"
          >
            <ClipboardCopy size={18} />
            <span>העתקה למנב&quot;ס</span>
          </button>

          <button
            type="button"
            className="btn-print-doc"
            onClick={() => {
              if (formData.isLocked) {
                handleAutoUnlockReport('evalSectionBottom');
              }
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
                  ? formData.statusReportSections.filter((s: any) => (s.content || '').trim())
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
          <div className="free-text-area-box" style={{ marginBottom: '16px', position: 'relative' }}>
            {activeOnboardingStep === 8 && (
              <div className="onboarding-tour-arrow-box" style={{ top: '-44px', right: '0' }}>
                <span className="tour-arrow-anim">👇</span>
                <span>שלב 8: כאן מפיקים הערכת מחצית וסוף שנה ומעבדים ב-AI!</span>
              </div>
            )}
            <label className="bold-label">
              ✍️ תיאור חופשי להערכת מחצית / סוף שנה:
            </label>
            <div className="privacy-sensitive-info-note">
              🔒 <strong>לתשומת לבך (שמירה על פרטיות):</strong> נא להימנע מהקלדת פרטים מזהים או מידע אישי רגיש בהערכת המחצית / סוף השנה (כגון שמות מלאים של הילד/ה או בני משפחה, מספרי תעודת זהות, טלפונים או כתובות). מומלץ להשתמש בתיאור כללי כגון "הילד/ה" או בראשי תיבות בלבד.
            </div>
            <textarea
              rows={3}
              className={activeOnboardingStep === 8 ? 'tour-highlight-input' : ''}
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
                  className={`btn-submit-generate-summary ${activeOnboardingStep === 8 ? 'tour-highlight-btn' : ''}`}
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
            {(formData.goals || []).map((goalRow: any, idx: any) => (
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
        <div style={{ position: 'relative' }}>
          {activeOnboardingStep === 9 && (
            <div className="onboarding-tour-arrow-box" style={{ top: '-44px', right: '20px', zIndex: 10 }}>
              <span className="tour-arrow-anim">👇</span>
              <span>שלב 9: כאן ה-AI מצליב את כל התצפיות והיעדים לדו"ח מצב בן 15 סעיפים!</span>
            </div>
          )}
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
        </div>
      )}

      {/* Team Sharing Modal ("שיתוף צוות") */}
      <ShareTeamModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        formData={formData}
        currentUser={currentUser}
        allowedUsers={allowedUsers}
        onSaveShareSettings={handleSaveShareSettings}
        onToggleShareColleague={handleToggleShareColleague}
      />

      {/* Team Chat Drawer ("שיח צוות") */}
      <TeamChatDrawer
        isOpen={showTeamChatDrawer}
        onClose={() => setShowTeamChatDrawer(false)}
        studentName={formData.name || ''}
        teamMessages={formData.teamMessages || []}
        currentUser={currentUser}
        sharedWith={formData.sharedWith || []}
        onSendMessage={handleSendTeamMessage}
        onRetractMessage={handleRetractTeamMessage}
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

      
      {showMinistryCopyModal && (
        <MinistryCopyModal
          formData={formData}
          hideDetails={hideStudentDetailsOnPrint}
          onToggleHideDetails={setHideStudentDetailsOnPrint}
          onClose={() => setShowMinistryCopyModal(false)}
        />
      )}
      {observationModalGoalId &&
        (() => {
          const targetGoal = (formData.goals || []).find((g: any) => g.id === observationModalGoalId);
          if (!targetGoal) return null;
          return (
            <QuickObservationModal
              goalRow={targetGoal}
              authorName={currentUser?.name || currentUser?.email || ''}
              onAddObservation={(obsInput) => {
                const { updatedGoal } = addObservationToGoal(targetGoal, obsInput);
                const nextGoals = (formData.goals || []).map((g: any) =>
                  g.id === targetGoal.id ? updatedGoal : g
                );
                const nextData = {
                  ...formData,
                  isLocked: false,
                  lockedAt: '',
                  lockedBy: '',
                  goals: nextGoals,
                  lastSavedAt: new Date().toISOString()
                };
                setFormData(nextData);
                onSaveStudentPlan?.(nextData);
                if (onDraftStateChange) {
                  onDraftStateChange({ isDirty: false, draftData: nextData });
                }
              }}
              onDeleteObservation={(obsId) => {
                const nextGoals = (formData.goals || []).map((g: any) =>
                  g.id === targetGoal.id
                    ? {
                        ...g,
                        observations: (g.observations || []).filter((o: any) => o.id !== obsId)
                      }
                    : g
                );
                const nextData = {
                  ...formData,
                  goals: nextGoals,
                  lastSavedAt: new Date().toISOString()
                };
                setFormData(nextData);
                onSaveStudentPlan?.(nextData);
              }}
              onClose={() => setObservationModalGoalId(null)}
            />
          );
        })()}
      {showDiagnosticIntakeModal && (
        <DiagnosticIntakeModal
          formData={formData}
          initialText={selectedIntakeDoc?.fullText || ''}
          initialDocName={selectedIntakeDoc?.fileName || ''}
          authorName={userPreferences?.fullName || currentUser?.name || ''}
          onApplyIntake={(updatedStudent) => {
            setFormData(updatedStudent);
            setIsDossierOpen(true);
            onSaveStudentPlan?.(updatedStudent);
            setShowDiagnosticIntakeModal(false);
            setSelectedIntakeDoc(null);
          }}
          onClose={() => {
            setShowDiagnosticIntakeModal(false);
            setSelectedIntakeDoc(null);
          }}
        />
      )}

      {/* Reader Modal for Diagnostic Document Full Text */}
      {viewingDocText && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(3px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px'
          }}
          onClick={() => setViewingDocText(null)}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '14px',
              maxWidth: '750px',
              width: '100%',
              maxHeight: '85vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)',
              overflow: 'hidden',
              direction: 'rtl'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 20px',
                borderBottom: '1px solid #e2e8f0',
                background: '#f8fafc'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <FileText size={20} color="#4f46e5" />
                <div>
                  <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#1e293b' }}>
                    {viewingDocText.fileName || 'מסמך אבחון'}
                  </h4>
                  <span style={{ fontSize: '12px', color: '#64748b' }}>
                    הועלה בתאריך {new Date(viewingDocText.uploadedAt || Date.now()).toLocaleDateString('he-IL')}
                    {viewingDocText.fileSizeFormatted ? ` • ${viewingDocText.fileSizeFormatted}` : ''}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewingDocText(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#64748b',
                  padding: '4px'
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Body */}
            <div
              style={{
                padding: '20px',
                overflowY: 'auto',
                flex: 1,
                fontSize: '14px',
                lineHeight: 1.7,
                whiteSpace: 'pre-wrap',
                color: '#334155',
                background: '#fafafa',
                fontFamily: 'inherit',
                maxHeight: '60vh'
              }}
            >
              {viewingDocText.fullText || viewingDocText.textSnippet || 'אין טקסט זמין במסמך זה.'}
            </div>

            {/* Footer */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 20px',
                borderTop: '1px solid #e2e8f0',
                background: '#ffffff'
              }}
            >
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText(viewingDocText.fullText || '');
                  alert('הטקסט הועתק ללוח בהצלחה!');
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: '#f1f5f9',
                  color: '#334155',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  padding: '6px 14px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                <ClipboardCopy size={15} />
                <span>העתק טקסט</span>
              </button>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => triggerDossierDownload(viewingDocText)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: '#f8fafc',
                    color: '#334155',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    padding: '6px 14px',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  <Download size={15} />
                  <span>הורדת הקובץ</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewingDocText(null)}
                  style={{
                    background: '#f8fafc',
                    color: '#475569',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    padding: '6px 14px',
                    fontSize: '13px',
                    fontWeight: 500,
                    cursor: 'pointer'
                  }}
                >
                  סגור
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
