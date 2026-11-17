import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Save,
  Printer,
  Plus,
  Minus,
  Trash2,
  TrendingDown,
  Sparkles,
  Loader2,
  X,
  Lock,
  Unlock,
  FileDown,
  Eye,
  EyeOff,
  Check,
  ChevronDown,
  Mail,
  FileText,
  Users,
  TrendingUp,
  ShieldCheck,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { DEFAULT_SCHOOL_YEAR } from '../../domain/yearReport';
import { SCHOOL_YEARS_LIST } from '../../domain/schoolYearRollover';
import {
  BehaviorInterventionPlan,
  DifferentialReinforcementProcedure,
  OngoingTrackingPoint,
  ReplacementBehaviorPlan,
  StudentProfile
} from '../../domain/types';
import {
  calculateBaselineStats,
  calculateTrackingStats,
  createEmptyBehaviorPlan,
  getBehaviorFunctionLabelHebrew,
  getMeasurementTypeLabelHebrew,
  validateBehaviorPlanQuality
} from '../../domain/behaviorAnalysis';
import { suggestInterventionStrategies } from '../../services/behaviorAiService';
import BehaviorStudentDetailsCard, { type BehaviorStudentDetailsData } from './BehaviorStudentDetailsCard';
import type { StaffMergePayload } from '../form/StaffVoiceControl';
import { ProgressMonitoringDualLineChart } from './BehaviorCharts';
import {
  buildBehaviorPlanWordDocumentHtml,
  buildBehaviorPlanPrintHtml,
  openHtmlPrintWindow,
  getSafeReportFilename
} from '../../export/wordAndPrintBuilders';
import { generatePdfBlobFromHtml } from '../../emailService';
import SendReportEmailModal from '../modals/SendReportEmailModal';
import HebrewDatePicker from '../HebrewDatePicker';
import './BehaviorAssessmentForm.css';
import './BehaviorInterventionPlanForm.css';

export interface BehaviorInterventionPlanFormProps {
  student: StudentProfile;
  allStudents?: StudentProfile[];
  currentUser?: {
    name?: string;
    email?: string;
    role?: string;
    [key: string]: unknown;
  } | null;
  onSaveStudentPlan: (updatedStudent: StudentProfile) => void;
  onGoBack?: () => void;
  onDraftStateChange?: (state: { isDirty: boolean; draftData: any }) => void;
  onNavigateDocumentType?: (docType: 'behavior_assessment' | 'behavior_plan' | 'behavior_progress_report' | 'pedagogical_plan') => void;
  userPreferences?: any;
}

export default function BehaviorInterventionPlanForm({
  student,
  allStudents = [],
  currentUser,
  onSaveStudentPlan,
  onGoBack,
  onDraftStateChange,
  onNavigateDocumentType,
  userPreferences
}: BehaviorInterventionPlanFormProps) {
  // Initialize plan from student or clean template
  const [plan, setPlan] = useState<BehaviorInterventionPlan>(() => {
    const empty = createEmptyBehaviorPlan();
    if (student.behaviorPlan) {
      return {
        ...empty,
        ...student.behaviorPlan,
        antecedentStructured: {
          ...empty.antecedentStructured,
          ...(student.behaviorPlan.antecedentStructured || {})
        },
        stagedReactiveProtocol: {
          ...empty.stagedReactiveProtocol,
          ...(student.behaviorPlan.stagedReactiveProtocol || {})
        },
        smartGoalsNarrative: {
          ...empty.smartGoalsNarrative,
          ...(student.behaviorPlan.smartGoalsNarrative || {})
        },
        replacementAcquisition: {
          ...empty.replacementAcquisition,
          ...(student.behaviorPlan.replacementAcquisition || {})
        },
        differentialReinforcement: {
          ...empty.differentialReinforcement,
          ...(student.behaviorPlan.differentialReinforcement || {})
        },
        classroomCheatSheet: {
          ...empty.classroomCheatSheet,
          ...(student.behaviorPlan.classroomCheatSheet || {})
        },
        targetBehaviors: student.behaviorPlan.targetBehaviors || [],
        replacementBehaviors: student.behaviorPlan.replacementBehaviors || [],
        ongoingTracking: student.behaviorPlan.ongoingTracking || []
      };
    }

    // Default target behaviors pulled from assessment if exists
    const initialTargets = student.behaviorAssessment?.targetBehaviors || [];

    return {
      ...empty,
      analystName: currentUser?.name || student.behaviorAssessment?.assessorName || '',
      effectiveDate: new Date().toISOString().split('T')[0],
      targetBehaviors: [...initialTargets],
      antecedentStrategies: student.behaviorAssessment?.initialRecommendations || '',
      updatedAt: new Date().toISOString()
    };
  });

  // Local student metadata state for editing details & team
  const [studentDetails, setStudentDetails] = useState<BehaviorStudentDetailsData>(() => ({
    id: student.id,
    name: student.name || '',
    idNumber: student.idNumber || '',
    birthDate: student.birthDate || '',
    educationalFramework: student.educationalFramework || '',
    schoolYear: student.schoolYear || '',
    reportDate: student.reportDate || plan.effectiveDate || new Date().toISOString().split('T')[0],
    address: student.address || '',
    phone: student.phone || '',
    schoolName: student.schoolName || '',
    gradeClass: student.gradeClass || '',
    educatorName: student.educatorName || '',
    assistantName: student.assistantName || '',
    educationalCounselor: student.educationalCounselor || '',
    supportTeacher: student.supportTeacher || '',
    psychologistName: student.psychologistName || '',
    otherStaff: student.otherStaff || '',
    ownerEmail: (student as any).ownerEmail
  }));

  const handleStudentDetailChange = (field: string, value: any) => {
    setStudentDetails((prev) => ({ ...prev, [field]: value }));
    setIsDirty(true);
  };

  const handleMergeStaffFeedback = (payload: StaffMergePayload) => {
    const addition = `\n[משוב מצוות: ${payload.authorName} (${payload.recipientRole})]: ${payload.observationNote || payload.mergedText}`;
    setPlan((prev) => ({
      ...prev,
      antecedentStrategies: (prev.antecedentStrategies ? prev.antecedentStrategies + '\n' : '') + addition,
      updatedAt: new Date().toISOString()
    }));
    setIsDirty(true);
  };

  const isPlanLocked = Boolean(plan.isLocked);

  const [isDirty, setIsDirty] = useState<boolean>(false);
  const [saveSuccessNotice, setSaveSuccessNotice] = useState<boolean>(false);

  // Progressive Disclosure: Collapsible Card Sections (Default open)
  const [openSections, setOpenSections] = useState<{ [key: string]: boolean }>({
    quality: true,
    details: true,
    smartGoals: true,
    targetsAndReplacements: true,
    antecedents: true,
    reinforcementAndReactive: true,
    classroomCheatSheet: true,
    tracking: true
  });

  const qualityResult = useMemo(() => {
    return validateBehaviorPlanQuality(plan, student.behaviorAssessment);
  }, [plan, student.behaviorAssessment]);

  const handleStructuredFieldChange = (
    parent: keyof BehaviorInterventionPlan,
    field: string,
    value: any
  ) => {
    setPlan((prev) => ({
      ...prev,
      [parent]: {
        ...((prev[parent] as any) || {}),
        [field]: value
      },
      updatedAt: new Date().toISOString()
    }));
    setIsDirty(true);
  };

  // Inline forms state
  const [showAddReplacementForm, setShowAddReplacementForm] = useState<boolean>(false);
  const [newReplacementSkill, setNewReplacementSkill] = useState<string>('');
  const [newTeachingStrategies, setNewTeachingStrategies] = useState<string>('');

  const [showAddTrackingForm, setShowAddTrackingForm] = useState<boolean>(false);
  const [newTrackingDate, setNewTrackingDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [newTrackingPeriod, setNewTrackingPeriod] = useState<string>('שיעור 1');
  const [newTrackingOccurrences, setNewTrackingOccurrences] = useState<string>('0');
  const [newTrackingReplacementUsed, setNewTrackingReplacementUsed] = useState<boolean>(true);
  const [newTrackingReinforcement, setNewTrackingReinforcement] = useState<boolean>(true);
  const [newTrackingNotes, setNewTrackingNotes] = useState<string>('');

  // Export, Print & Document Preview States
  const [showEmailModal, setShowEmailModal] = useState<boolean>(false);
  const [showFullDocPreview, setShowFullDocPreview] = useState<boolean>(false);

  // AI Assistance states
  const [isAiGenerating, setIsAiGenerating] = useState<boolean>(false);
  const [showAiModal, setShowAiModal] = useState<boolean>(false);

  // Baseline calculation from assessment to compute comparative reduction
  const baselineStats = useMemo(() => {
    return calculateBaselineStats(student.behaviorAssessment?.baselineData);
  }, [student.behaviorAssessment?.baselineData]);

  // Real-time tracking progress stats
  const trackingStats = useMemo(() => {
    return calculateTrackingStats(plan.ongoingTracking, baselineStats.average);
  }, [plan.ongoingTracking, baselineStats.average]);

  // Draft state notification
  useEffect(() => {
    if (onDraftStateChange) {
      onDraftStateChange({ isDirty, draftData: isDirty ? plan : null });
    }
  }, [isDirty, plan, onDraftStateChange]);

  const toggleSection = (sectionKey: string) => {
    setOpenSections((prev) => ({
      ...prev,
      [sectionKey]: !prev[sectionKey]
    }));
  };

  const handleFieldChange = (field: keyof BehaviorInterventionPlan, value: unknown) => {
    setPlan((prev) => ({
      ...prev,
      [field]: value,
      updatedAt: new Date().toISOString()
    }));
    setIsDirty(true);
    setSaveSuccessNotice(false);
  };

  const handleNestedFieldChange = (
    group: 'reinforcementSystem' | 'reactiveProtocol',
    subField: string,
    value: string
  ) => {
    setPlan((prev) => ({
      ...prev,
      [group]: {
        ...prev[group],
        [subField]: value
      },
      updatedAt: new Date().toISOString()
    }));
    setIsDirty(true);
    setSaveSuccessNotice(false);
  };

  // Add Replacement Behavior
  const handleAddReplacement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReplacementSkill.trim()) return;

    const newRep: ReplacementBehaviorPlan = {
      replacementSkill: newReplacementSkill.trim(),
      teachingStrategies: newTeachingStrategies.trim()
    };

    setPlan((prev) => ({
      ...prev,
      replacementBehaviors: [...prev.replacementBehaviors, newRep],
      updatedAt: new Date().toISOString()
    }));

    setNewReplacementSkill('');
    setNewTeachingStrategies('');
    setShowAddReplacementForm(false);
    setIsDirty(true);
  };

  const handleRemoveReplacement = (idx: number) => {
    setPlan((prev) => ({
      ...prev,
      replacementBehaviors: prev.replacementBehaviors.filter((_, i) => i !== idx),
      updatedAt: new Date().toISOString()
    }));
    setIsDirty(true);
  };

  // Add Ongoing Tracking Point
  const handleAddTrackingPoint = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedOccurrences = Math.max(0, Math.abs(Number(newTrackingOccurrences)) || 0);
    const newPoint: OngoingTrackingPoint = {
      id: 'track_' + Date.now(),
      date: newTrackingDate,
      period: newTrackingPeriod.trim(),
      targetBehaviorOccurrences: parsedOccurrences,
      replacementBehaviorUsed: newTrackingReplacementUsed,
      reinforcementDelivered: newTrackingReinforcement,
      notes: newTrackingNotes.trim() || undefined
    };

    setPlan((prev) => ({
      ...prev,
      ongoingTracking: [...prev.ongoingTracking, newPoint],
      updatedAt: new Date().toISOString()
    }));

    setNewTrackingOccurrences('0');
    setNewTrackingNotes('');
    setShowAddTrackingForm(false);
    setIsDirty(true);
  };

  const handleRemoveTrackingPoint = (id: string) => {
    setPlan((prev) => ({
      ...prev,
      ongoingTracking: prev.ongoingTracking.filter((p) => p.id !== id),
      updatedAt: new Date().toISOString()
    }));
    setIsDirty(true);
  };

  // AI Generator: Proposes comprehensive strategies based on assessment
  const handleRunAiStrategies = async () => {
    setIsAiGenerating(true);
    try {
      const targetObj =
        plan.targetBehaviors[0] ||
        student.behaviorAssessment?.targetBehaviors?.[0];
      const targetName = targetObj?.name || 'התנהגות מאתגרת';
      const funcLabel = getBehaviorFunctionLabelHebrew(
        student.behaviorAssessment?.mainHypothesizedFunction || 'escape'
      );

      const strategies = await suggestInterventionStrategies(targetName, funcLabel, student, {
        targetBehaviorName: targetName,
        operationalDefinition: targetObj?.operationalDefinition,
        baselineAverage:
          targetObj?.baselineAverage ??
          student.behaviorAssessment?.targetBehaviors?.[0]?.baselineAverage,
        targetGoal: targetObj?.targetGoal,
        antecedentAnalysis:
          student.behaviorAssessment?.antecedentAnalysis ||
          student.behaviorAssessment?.initialRecommendations,
        functionalHypothesis: student.behaviorAssessment?.functionalHypothesisNarrative,
        backgroundSummary: student.behaviorAssessment?.backgroundInfo
      });

      if (strategies) {
        setPlan((prev) => ({
          ...prev,
          smartGoalsNarrative: strategies.smartGoalsNarrative || prev.smartGoalsNarrative,
          antecedentStructured: strategies.antecedentStructured || prev.antecedentStructured,
          replacementAcquisition: strategies.replacementAcquisition || prev.replacementAcquisition,
          differentialReinforcement:
            strategies.differentialReinforcement || prev.differentialReinforcement,
          stagedReactiveProtocol:
            strategies.stagedReactiveProtocol || prev.stagedReactiveProtocol,
          classroomCheatSheet:
            strategies.classroomCheatSheet || prev.classroomCheatSheet,
          replacementBehaviors: strategies.replacementSkill
            ? [
                ...prev.replacementBehaviors,
                {
                  replacementSkill: strategies.replacementSkill,
                  teachingStrategies: strategies.teachingStrategies || ''
                }
              ]
            : prev.replacementBehaviors,
          antecedentStrategies:
            strategies.antecedentStrategies || prev.antecedentStrategies,
          reinforcementSystem: {
            preferredReinforcers:
              strategies.preferredReinforcers || prev.reinforcementSystem.preferredReinforcers,
            scheduleOfReinforcement:
              strategies.scheduleOfReinforcement ||
              prev.reinforcementSystem.scheduleOfReinforcement
          },
          reactiveProtocol: {
            staffResponse:
              strategies.staffResponse || prev.reactiveProtocol.staffResponse,
            crisisSafetyPlan:
              strategies.crisisSafetyPlan || prev.reactiveProtocol.crisisSafetyPlan
          },
          updatedAt: new Date().toISOString()
        }));
        setIsDirty(true);
        setShowAiModal(false);
        setSaveSuccessNotice(false);
      }
    } finally {
      setIsAiGenerating(false);
    }
  };

  // Save operation
  const handleSave = () => {
    const updatedStudent: StudentProfile = {
      ...student,
      ...studentDetails,
      behaviorPlan: plan,
      updatedAt: new Date().toISOString()
    };

    onSaveStudentPlan(updatedStudent);
    setIsDirty(false);
    setSaveSuccessNotice(true);
    setTimeout(() => {
      setSaveSuccessNotice(false);
    }, 3500);
  };

  const [hideDetailsOnExport, setHideDetailsOnExport] = useState(
    () => userPreferences?.defaultPrivacyMode === 'acronym'
  );

  useEffect(() => {
    if (userPreferences?.defaultPrivacyMode === 'acronym') {
      setHideDetailsOnExport(true);
    }
  }, [userPreferences?.defaultPrivacyMode]);
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const exportDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (exportDropdownRef.current && !exportDropdownRef.current.contains(e.target as Node)) {
        setShowExportDropdown(false);
      }
    };
    if (showExportDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showExportDropdown]);

  const handlePrint = () => {
    const exportStudent: StudentProfile = {
      ...student,
      ...studentDetails,
      behaviorPlan: plan
    };
    const printHtml = buildBehaviorPlanPrintHtml(exportStudent, hideDetailsOnExport);
    openHtmlPrintWindow(printHtml);
  };

  const createWordBlob = () => {
    const exportStudent: StudentProfile = {
      ...student,
      ...studentDetails,
      behaviorPlan: plan
    };
    const wordHtml = buildBehaviorPlanWordDocumentHtml(exportStudent, hideDetailsOnExport);
    const blob = new Blob(['\ufeff', wordHtml], {
      type: 'application/msword;charset=utf-8'
    });
    const filename = getSafeReportFilename(exportStudent, hideDetailsOnExport, 'doc', 'behavior_plan');
    return { blob, filename, mimeType: 'application/msword', htmlContent: wordHtml };
  };

  const createPdfBlob = async () => {
    const exportStudent: StudentProfile = {
      ...student,
      ...studentDetails,
      behaviorPlan: plan
    };
    const printHtml = buildBehaviorPlanPrintHtml(exportStudent, hideDetailsOnExport);
    const filename = getSafeReportFilename(exportStudent, hideDetailsOnExport, 'pdf', 'behavior_plan');
    const blob = await generatePdfBlobFromHtml(printHtml, filename);
    return { blob, filename, mimeType: 'application/pdf', htmlContent: printHtml };
  };

  const handleDownloadWord = () => {
    const { blob, filename } = createWordBlob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 200);
  };

  const handleDownloadPdf = async () => {
    const { blob, filename } = await createPdfBlob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 200);
  };

  return (
    <div className="workplan-form-container plan-form-container" dir="rtl">
      {/* 1. Sticky Top Action Bar */}
      <div className="sticky-action-bar">
        <div className="action-bar-right">
          {onGoBack && (
            <button
              type="button"
              className="btn-print-doc btn-home-nav-form"
              onClick={onGoBack}
              title="חזרה לניהול תלמידים"
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

          {/* Yellow Lock / Unlock Button */}
          <div className="report-lock-toggle-wrapper">
            <button
              type="button"
              className={`btn-report-lock-icon ${isPlanLocked ? 'locked' : 'unlocked'}`}
              onClick={() => {
                const nextLocked = !isPlanLocked;
                setPlan((prev) => ({
                  ...prev,
                  isLocked: nextLocked,
                  lockedAt: nextLocked ? new Date().toISOString() : undefined,
                  lockedBy: nextLocked ? (currentUser?.name || 'מנתחת התנהגות') : undefined,
                  updatedAt: new Date().toISOString()
                }));
                setIsDirty(true);
              }}
              aria-label={isPlanLocked ? 'המסמך נעול לעריכה' : 'המסמך פתוח לעריכה'}
              title={isPlanLocked ? 'המסמך נעול לעריכה - לחצי לפתיחה' : 'נעילת המסמך לעריכה'}
            >
              {isPlanLocked ? <Lock size={19} /> : <Unlock size={19} />}
            </button>
            <div className="report-lock-hover-tooltip" role="tooltip">
              <div className="report-lock-tooltip-title">
                {isPlanLocked ? '🔒 המסמך נעול לעריכה' : '🔓 המסמך פתוח לעריכה'}
              </div>
              <div className="report-lock-tooltip-body">
                {isPlanLocked
                  ? 'המסמך נעול לעריכה. לחצי על הסמל לפתיחת הנעילה.'
                  : 'המסמך פתוח לעריכה. לחצי על הסמל לנעילת המסמך.'}
              </div>
            </div>
          </div>

          {/* Primary Save Button */}
          <button
            type="button"
            className="btn-save-progress"
            onClick={handleSave}
            title="שמירת תוכנית התערבות התנהגותית"
          >
            <Save size={17} />
            <span>שמור התקדמות</span>
          </button>

          {saveSuccessNotice && (
            <span
              className="save-toast-badge"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '6px 12px' }}
            >
              <Check size={14} />
              <span>נשמר בהצלחה</span>
            </span>
          )}
          {isDirty && !saveSuccessNotice && (
            <span className="last-saved-hint" style={{ color: '#d97706' }}>
              שינויים טרם נשמרו
            </span>
          )}
        </div>

        <div className="action-bar-left">
          {/* Full Document Preview Toggle */}
          <button
            type="button"
            className="btn-preview-doc"
            onClick={() => setShowFullDocPreview((prev) => !prev)}
            title={showFullDocPreview ? 'חזרה לתצוגת עריכה' : 'תצוגת מסמך מלאה'}
          >
            <FileText size={16} />
            <span>{showFullDocPreview ? 'חזרה לתצוגת עריכה' : 'תצוגת מסמך מלאה'}</span>
          </button>

          {/* Unified Export & Print Dropdown */}
          <div className="export-dropdown-wrapper" ref={exportDropdownRef}>
            <button
              type="button"
              className={`btn-export-dropdown ${showExportDropdown ? 'active' : ''}`}
              onClick={() => setShowExportDropdown((prev) => !prev)}
              title="הדפסה, הורדת Word, הורדת PDF ושליחה למייל"
              aria-expanded={showExportDropdown}
            >
              <Printer size={16} />
              <span>הדפסה וייצוא</span>
              <ChevronDown size={14} className={`export-dropdown-arrow ${showExportDropdown ? 'open' : ''}`} />
            </button>

            {showExportDropdown && (
              <div className="export-dropdown-menu" role="menu">
                <button
                  type="button"
                  className="export-dropdown-item"
                  onClick={() => {
                    setShowExportDropdown(false);
                    handlePrint();
                  }}
                >
                  <Printer size={15} style={{ color: '#2563eb' }} />
                  <span>הדפס תוכנית התערבות</span>
                </button>

                <button
                  type="button"
                  className="export-dropdown-item"
                  onClick={() => {
                    setShowExportDropdown(false);
                    setShowEmailModal(true);
                  }}
                >
                  <Mail size={15} style={{ color: '#7c3aed' }} />
                  <span>שלח למייל (Word / PDF)</span>
                </button>

                <button
                  type="button"
                  className="export-dropdown-item"
                  onClick={() => {
                    setShowExportDropdown(false);
                    handleDownloadWord();
                  }}
                >
                  <FileDown size={15} style={{ color: '#059669' }} />
                  <span>הורד קובץ Word (.doc)</span>
                </button>

                <button
                  type="button"
                  className="export-dropdown-item"
                  onClick={async () => {
                    setShowExportDropdown(false);
                    await handleDownloadPdf();
                  }}
                >
                  <FileText size={15} style={{ color: '#dc2626' }} />
                  <span>הורד קובץ PDF (.pdf)</span>
                </button>

                <div className="export-dropdown-divider" />

                <label
                  className={`export-dropdown-privacy ${hideDetailsOnExport ? 'checked' : 'unchecked'}`}
                  title="כאשר מסומן, בהדפסה ובייצוא יוצגו ראשי תיבות ויוסתר מידע מזהה"
                >
                  <input
                    type="checkbox"
                    checked={hideDetailsOnExport}
                    onChange={(e) => setHideDetailsOnExport(e.target.checked)}
                  />
                  {hideDetailsOnExport ? <EyeOff size={15} style={{ color: '#7c3aed' }} /> : <Eye size={15} />}
                  <span>הסתר פרטים מזהים בהדפסה</span>
                </label>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. Master Document Mode Tabs */}
      <div className="workplan-mode-tabs-container" role="tablist" aria-label="סוגי דוחות מנתחת התנהגות">
        <button
          type="button"
          role="tab"
          aria-selected={false}
          className="workplan-mode-tab"
          onClick={() => onNavigateDocumentType?.('behavior_assessment')}
        >
          <FileText size={17} />
          <span>הערכת תפקוד התנהגותי</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={true}
          className="workplan-mode-tab reports-mode active"
        >
          <TrendingDown size={17} />
          <span>תוכנית התערבות התנהגותית</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={false}
          className="workplan-mode-tab"
          onClick={() => onNavigateDocumentType?.('behavior_progress_report')}
        >
          <TrendingUp size={17} />
          <span>דוח התקדמות תקופתי</span>
        </button>
      </div>

      {/* 3. Document Title Banner */}
      <div className="document-title-card">
        <div className="doc-title-top-row">
          <div className="inline-meta-field banner-slot-date">
            <label htmlFor="behavior-plan-date-input">תאריך:</label>
            <input
              id="behavior-plan-date-input"
              type="text"
              value={plan.effectiveDate || '14.11.2026'}
              onChange={(e) => handleFieldChange('effectiveDate', e.target.value)}
              placeholder="DD.MM.YYYY"
              maxLength={10}
            />
          </div>

          <div className="doc-banner-center-brand">
            <img src="./tala-logo.png" alt="TALA Emblem" className="doc-banner-logo" />
            <h2 className="main-ecological-heading">
              {`תוכנית התערבות התנהגותית – ${student.name || 'ללא שם'}${student.educationalFramework ? ' | ' + student.educationalFramework : ''}`}
            </h2>
          </div>

          <div className="inline-meta-field banner-slot-controls">
            <label>שנת לימודים:</label>
            <select
              value={student.schoolYear || DEFAULT_SCHOOL_YEAR}
              onChange={(e) => {
                const nextYear = e.target.value;
                onSaveStudentPlan({ ...student, schoolYear: nextYear });
                setIsDirty(true);
              }}
              title="בחר שנת לימודים"
            >
              {!(SCHOOL_YEARS_LIST as readonly string[]).includes(student.schoolYear || DEFAULT_SCHOOL_YEAR) && (
                <option value={student.schoolYear}>{student.schoolYear}</option>
              )}
              {SCHOOL_YEARS_LIST.map((yr) => (
                <option key={yr} value={yr} style={{ color: '#24344d', background: '#ffffff' }}>
                  {yr}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {isPlanLocked && (
        <div
          className="behavior-locked-notice-banner"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: '#fef3c7',
            border: '1px solid #f59e0b',
            color: '#92400e',
            padding: '10px 16px',
            borderRadius: '10px',
            fontSize: '0.875rem',
            fontWeight: 600
          }}
        >
          <Lock size={16} />
          <span>
            מסמך זה נעול לעריכה{plan.lockedBy ? ` על ידי ${plan.lockedBy}` : ''}. כדי לערוך, לחצי על כפתור ״מסמך נעול״ בסרגל הפעולות.
          </span>
        </div>
      )}

      {showFullDocPreview ? (
        <section
          className="form-section-card live-print-preview-card"
          style={{
            background: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #cbd5e1',
            padding: '24px',
            marginTop: '16px'
          }}
        >
          <div
            className="section-header-line"
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '8px',
              paddingBottom: '14px',
              borderBottom: '1px solid #e2e8f0',
              marginBottom: '18px'
            }}
          >
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>
              📄 תצוגת מסמך מלאה: תוכנית התערבות התנהגותית
            </h3>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
              <label
                className={`export-dropdown-privacy ${hideDetailsOnExport ? 'checked' : 'unchecked'}`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  background: hideDetailsOnExport ? '#f5f3ff' : '#ffffff',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: hideDetailsOnExport ? '#6d28d9' : '#475569'
                }}
                title="כאשר מסומן, במסמך ובהדפסה יוצגו ראשי תיבות ויוסתר מידע מזהה"
              >
                <input
                  type="checkbox"
                  checked={hideDetailsOnExport}
                  onChange={(e) => setHideDetailsOnExport(e.target.checked)}
                  style={{ cursor: 'pointer' }}
                />
                {hideDetailsOnExport ? <EyeOff size={15} style={{ color: '#7c3aed' }} /> : <Eye size={15} />}
                <span>הסתר פרטים מזהים בהדפסה</span>
              </label>

              <button
                type="button"
                onClick={handlePrint}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: '#1d4ed8',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '7px 14px',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                <Printer size={15} />
                <span>הדפס</span>
              </button>
              <button
                type="button"
                onClick={handleDownloadPdf}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: '#f1f5f9',
                  color: '#0f172a',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  padding: '7px 14px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                <FileText size={15} style={{ color: '#dc2626' }} />
                <span>הורד קובץ PDF</span>
              </button>
              <button
                type="button"
                onClick={handleDownloadWord}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: '#f1f5f9',
                  color: '#0f172a',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  padding: '7px 14px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                <FileDown size={15} style={{ color: '#059669' }} />
                <span>הורד קובץ Word</span>
              </button>
              <button
                type="button"
                onClick={() => setShowEmailModal(true)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: '#f1f5f9',
                  color: '#7c3aed',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  padding: '7px 14px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                <Mail size={15} />
                <span>שלח למייל</span>
              </button>
              <button
                type="button"
                className="btn-preview-doc"
                onClick={() => setShowFullDocPreview(false)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: '#f8fafc',
                  color: '#334155',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  padding: '7px 14px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                <FileText size={15} />
                <span>חזרה לתצוגת עריכה</span>
              </button>
            </div>
          </div>
          <div
            className="preview-paper-sheet"
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '24px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
            }}
            dangerouslySetInnerHTML={{
              __html: buildBehaviorPlanPrintHtml(
                { ...student, ...studentDetails, behaviorPlan: plan },
                hideDetailsOnExport
              )
            }}
          />
        </section>
      ) : (
        <>

      {/* Student Details and Team Card */}
      <BehaviorStudentDetailsCard
        studentData={studentDetails}
        onChangeField={handleStudentDetailChange}
        allStudents={allStudents}
        currentUser={currentUser}
        disabled={isPlanLocked}
        onMergeStaffFeedback={handleMergeStaffFeedback}
        titlePrefix="פרטי התלמיד והמסגרת החינוכית"
      />

      {/* AI Modal Confirmation */}
      {showAiModal && (
        <div
          className="behavior-ai-modal-backdrop"
          onClick={() => !isAiGenerating && setShowAiModal(false)}
        >
          <div className="behavior-ai-modal" onClick={(e) => e.stopPropagation()}>
            <div className="behavior-ai-modal-header">
              <h3 className="behavior-ai-modal-title">
                <Sparkles size={20} color="#7c65b8" />
                <span>הצעת תוכנית התערבות בבינה מלאכותית</span>
              </h3>
              <button
                type="button"
                className="btn-collapse-toggle-32"
                onClick={() => !isAiGenerating && setShowAiModal(false)}
                title="סגירה"
              >
                <X size={16} />
              </button>
            </div>
            <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-muted, #5c6f8c)' }}>
              המערכת תסרוק את התנהגויות היעד והשערת התפקוד מתוך דוח ההערכה של התלמיד,
              ותציע התנהגות חלופית תואמת תפקוד, אסטרטגיות מניעה מקדימות, מערך חיזוקים ונוהל תגובת צוות.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                className="btn-behavior-action btn-behavior-secondary"
                onClick={() => setShowAiModal(false)}
                disabled={isAiGenerating}
              >
                <span>ביטול</span>
              </button>
              <button
                type="button"
                className="btn-behavior-action btn-behavior-ai"
                onClick={handleRunAiStrategies}
                disabled={isAiGenerating}
              >
                {isAiGenerating ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Sparkles size={16} />
                )}
                <span>{isAiGenerating ? 'מנתח ובונה תוכנית...' : 'בניית הצעת תוכנית'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quality and Readiness Checklist */}
      <section className="plan-quality-card">
        <div className="plan-quality-header">
          <div className="plan-quality-title">
            <ShieldCheck size={20} color="#2563eb" />
            <span>בקרת איכות מקצועית של תוכנית ההתערבות</span>
            <span style={{ fontSize: '0.8rem', color: qualityResult.isReady ? '#16a34a' : '#d97706', fontWeight: 600 }}>
              {qualityResult.isReady ? '• מוכנה ליישום' : '• נדרשת השלמת רכיבים'}
            </span>
          </div>
          <div className="plan-quality-meter-wrap">
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155' }}>
              {qualityResult.score} מתוך {qualityResult.total} מדדים ({qualityResult.percentage}%)
            </span>
            <div className="plan-quality-meter-bar">
              <div
                className="plan-quality-meter-fill"
                style={{
                  width: `${qualityResult.percentage}%`,
                  background: qualityResult.percentage >= 80 ? '#10b981' : qualityResult.percentage >= 50 ? '#f59e0b' : '#ef4444'
                }}
              />
            </div>
          </div>
        </div>
        <div className="plan-quality-grid">
          {qualityResult.items.map((item) => (
            <div
              key={item.id}
              className={`plan-quality-item ${item.isMet ? 'passed' : ''}`}
              title={item.hint}
            >
              {item.isMet ? (
                <CheckCircle2 size={16} color="#16a34a" />
              ) : (
                <AlertCircle size={16} color="#94a3b8" />
              )}
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Section 1: פרטי התוכנית וצוות יישום */}
      <section className="plan-card">
        <div className="plan-card-header" onClick={() => toggleSection('details')}>
          <div className="plan-card-title-wrap">
            <span className="plan-section-badge">1</span>
            <h2 className="plan-card-title">פרטי התוכנית וצוות יישום</h2>
          </div>
          <button
            type="button"
            className="btn-collapse-toggle-32"
            aria-label={openSections.details ? 'כיווץ מקטע' : 'הרחבת מקטע'}
          >
            {openSections.details ? <Minus size={16} /> : <Plus size={16} />}
          </button>
        </div>

        {openSections.details && (
          <div className="plan-card-body">
            <div className="behavior-form-grid-2">
              <div className="behavior-field-group">
                <label className="behavior-field-label">שם מנתח או מוביל ההתערבות</label>
                <input
                  type="text"
                  className="behavior-input"
                  disabled={isPlanLocked}
                  value={plan.analystName || ''}
                  onChange={(e) => handleFieldChange('analystName', e.target.value)}
                  placeholder="למשל: דנה כהן"
                />
              </div>

              <div className="behavior-field-group">
                <label className="behavior-field-label">תאריך תחילת יישום התוכנית</label>
                <HebrewDatePicker
                  value={plan.effectiveDate || ''}
                  onChange={(date) => handleFieldChange('effectiveDate', date)}
                  disabled={isPlanLocked}
                  fullWidth={true}
                  placeholder="בחר תאריך"
                  ariaLabel="תאריך תחילת יישום התוכנית"
                />
              </div>
            </div>

            <div className="behavior-field-group" style={{ maxWidth: '300px' }}>
              <label className="behavior-field-label">תאריך יעד לבחינה והערכה מחודשת</label>
              <HebrewDatePicker
                value={plan.reviewDate || ''}
                onChange={(date) => handleFieldChange('reviewDate', date)}
                disabled={isPlanLocked}
                fullWidth={true}
                placeholder="בחר תאריך"
                ariaLabel="תאריך יעד לבחינה והערכה מחודשת"
              />
            </div>
          </div>
        )}
      </section>

      {/* Section 2: מטרות ההתערבות ויעדים משלימים */}
      <section className="plan-card">
        <div className="plan-card-header" onClick={() => toggleSection('smartGoals')}>
          <div className="plan-card-title-wrap">
            <span className="plan-section-badge">2</span>
            <h2 className="plan-card-title">מטרות ההתערבות ויעדים משלימים</h2>
          </div>
          <button
            type="button"
            className="btn-collapse-toggle-32"
            aria-label={openSections.smartGoals ? 'כיווץ מקטע' : 'הרחבת מקטע'}
          >
            {openSections.smartGoals ? <Minus size={16} /> : <Plus size={16} />}
          </button>
        </div>

        {openSections.smartGoals && (
          <div className="plan-card-body">
            <p style={{ margin: '0 0 1rem', fontSize: '0.85rem', color: '#64748b' }}>
              הגדרת שתי מטרות משלימות, ממוקדות ומדידות: הפחתת ההתנהגות המאתגרת ביחס לקו הבסיס, לצד הקניית התנהגות חלופית תואמת תפקוד.
            </p>
            <div className="behavior-form-grid-2">
              <div className="behavior-field-group">
                <label className="behavior-field-label">
                  מטרת הפחתה מדידה המקושרת לנתוני הבסיס
                </label>
                <textarea
                  className="behavior-textarea"
                  rows={3}
                  disabled={isPlanLocked}
                  value={plan.smartGoalsNarrative?.reductionGoal || ''}
                  onChange={(e) =>
                    handleStructuredFieldChange('smartGoalsNarrative', 'reductionGoal', e.target.value)
                  }
                  placeholder="למשל: הפחתת אירועי עזיבת כיסא במהלך שיעור פרונטלי מ-7 אירועים בממוצע לקו בסיס לעד אירוע 1 ביום..."
                />
              </div>

              <div className="behavior-field-group">
                <label className="behavior-field-label">
                  מטרת רכישה ושליטה של ההתנהגות החלופית
                </label>
                <textarea
                  className="behavior-textarea"
                  rows={3}
                  disabled={isPlanLocked}
                  value={plan.smartGoalsNarrative?.acquisitionGoal || ''}
                  onChange={(e) =>
                    handleStructuredFieldChange('smartGoalsNarrative', 'acquisitionGoal', e.target.value)
                  }
                  placeholder="למשל: בתוך 8 שבועות, התלמיד יבקש הפסקה יזומה באמצעות כרטיסייה ב-4 מתוך 5 הזדמנויות של מטלה מאתגרת..."
                />
              </div>
            </div>

            <div className="behavior-field-group" style={{ maxWidth: '240px', marginTop: '0.75rem' }}>
              <label className="behavior-field-label">טווח זמן מוגדר להשגת היעד (בשבועות)</label>
              <input
                type="number"
                min="1"
                className="behavior-input"
                disabled={isPlanLocked}
                value={plan.smartGoalsNarrative?.timeFrameWeeks ?? 8}
                onChange={(e) => {
                  const val = Math.max(1, Math.abs(Number(e.target.value)) || 8);
                  handleStructuredFieldChange('smartGoalsNarrative', 'timeFrameWeeks', val);
                }}
                onKeyDown={(e) => {
                  if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault();
                }}
              />
            </div>
          </div>
        )}
      </section>

      {/* Section 3: התנהגויות יעד והליך הקניית התנהגות חלופית */}
      <section className="plan-card">
        <div
          className="plan-card-header"
          onClick={() => toggleSection('targetsAndReplacements')}
        >
          <div className="plan-card-title-wrap">
            <span className="plan-section-badge">3</span>
            <h2 className="plan-card-title">
              התנהגויות יעד להפחתה והליך הקניית התנהגות חלופית
            </h2>
          </div>
          <button
            type="button"
            className="btn-collapse-toggle-32"
            aria-label={openSections.targetsAndReplacements ? 'כיווץ מקטע' : 'הרחבת מקטע'}
          >
            {openSections.targetsAndReplacements ? <Minus size={16} /> : <Plus size={16} />}
          </button>
        </div>

        {openSections.targetsAndReplacements && (
          <div className="plan-card-body">
            <h4 style={{ margin: '0 0 0.5rem', fontSize: '0.9rem', color: '#166534' }}>
              התנהגויות יעד להפחתה (מתוך הערכת התפקוד)
            </h4>
            {plan.targetBehaviors.length === 0 ? (
              <div className="behavior-empty-box">
                טרם קושרו התנהגויות יעד מדוח ההערכה.
              </div>
            ) : (
              <div className="behavior-targets-list">
                {plan.targetBehaviors.map((target) => (
                  <div key={target.id} className="behavior-target-row">
                    <div className="behavior-target-info">
                      <span className="behavior-target-name">{target.name}</span>
                      <span className="behavior-target-def">
                        {target.operationalDefinition || 'ללא הגדרה מפורטת'}
                      </span>
                      <div className="behavior-target-meta">
                        <span>מדד: {getMeasurementTypeLabelHebrew(target.measurementType)}</span>
                        {typeof target.targetGoal === 'number' && (
                          <span>יעד מבוקש: {target.targetGoal}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <h4 style={{ margin: '1.25rem 0 0.5rem', fontSize: '0.9rem', color: '#166534' }}>
              התנהגויות חלופיות תואמות תפקוד להוראה
            </h4>
            {plan.replacementBehaviors.length === 0 ? (
              <div className="behavior-empty-box">
                טרם הוגדרו התנהגויות חלופיות. לחץ על הכפתור מטה או השתמש בסיוע בינה מלאכותית.
              </div>
            ) : (
              plan.replacementBehaviors.map((rep, idx) => (
                <div key={idx} className="replacement-skill-card">
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start'
                    }}
                  >
                    <strong>מיומנות חלופית: {rep.replacementSkill}</strong>
                    <button
                      type="button"
                      disabled={isPlanLocked}
                      className="btn-collapse-toggle-32"
                      onClick={() => handleRemoveReplacement(idx)}
                      title="מחיקה"
                    >
                      <Trash2 size={14} color={isPlanLocked ? '#94a3b8' : '#d9534f'} />
                    </button>
                  </div>
                  {rep.teachingStrategies && (
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted, #5c6f8c)' }}>
                      שלבי הוראה ותרגול: {rep.teachingStrategies}
                    </div>
                  )}
                </div>
              ))
            )}

            {/* Detailed Replacement Acquisition Hierarchy */}
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1rem', marginTop: '1rem' }}>
              <h5 style={{ margin: '0 0 0.75rem', fontSize: '0.88rem', fontWeight: 700, color: '#1e293b' }}>
                פירוט שלבי ההקניה וההכללה של ההתנהגות החלופית
              </h5>
              <div className="behavior-form-grid-2">
                <div className="behavior-field-group">
                  <label className="behavior-field-label">הדגמה ומידול (כיצד מדגימים לתלמיד)</label>
                  <input
                    type="text"
                    className="behavior-input"
                    disabled={isPlanLocked}
                    value={plan.replacementAcquisition?.modelingSteps || ''}
                    onChange={(e) =>
                      handleStructuredFieldChange('replacementAcquisition', 'modelingSteps', e.target.value)
                    }
                    placeholder="הדגמה חזותית ומשחק תפקידים לפני תחילת המשימה..."
                  />
                </div>
                <div className="behavior-field-group">
                  <label className="behavior-field-label">רמזים וסיוע (איזה רמז ניתן בזמן אמת)</label>
                  <input
                    type="text"
                    className="behavior-input"
                    disabled={isPlanLocked}
                    value={plan.replacementAcquisition?.promptingHierarchy || ''}
                    onChange={(e) =>
                      handleStructuredFieldChange('replacementAcquisition', 'promptingHierarchy', e.target.value)
                    }
                    placeholder="הצבעה על כרטיסיית הפסקה או רמז מילולי קצר..."
                  />
                </div>
              </div>

              <div className="behavior-form-grid-2" style={{ marginTop: '0.75rem' }}>
                <div className="behavior-field-group">
                  <label className="behavior-field-label">דעיכת רמזים (הפחתה הדרגתית של התלות בתיווך)</label>
                  <input
                    type="text"
                    className="behavior-input"
                    disabled={isPlanLocked}
                    value={plan.replacementAcquisition?.fadingPlan || ''}
                    onChange={(e) =>
                      handleStructuredFieldChange('replacementAcquisition', 'fadingPlan', e.target.value)
                    }
                    placeholder="מעבר מרמז ישיר להמתנה של 5 שניות ליוזמה עצמאית..."
                  />
                </div>
                <div className="behavior-field-group">
                  <label className="behavior-field-label">הכללה לסביבות ולאנשים נוספים</label>
                  <input
                    type="text"
                    className="behavior-input"
                    disabled={isPlanLocked}
                    value={plan.replacementAcquisition?.generalizationPlan || ''}
                    onChange={(e) =>
                      handleStructuredFieldChange('replacementAcquisition', 'generalizationPlan', e.target.value)
                    }
                    placeholder="תרגול בחצר, בשיעורים מקצועיים ועם הסייעת..."
                  />
                </div>
              </div>
            </div>

            {!showAddReplacementForm ? (
              <button
                type="button"
                disabled={isPlanLocked}
                className="btn-behavior-action btn-behavior-secondary"
                style={{ marginTop: '1rem' }}
                onClick={() => setShowAddReplacementForm(true)}
              >
                <Plus size={16} />
                <span>הוספת התנהגות חלופית</span>
              </button>
            ) : (
              <form
                onSubmit={handleAddReplacement}
                style={{
                  background: '#fbfcfe',
                  border: '1px solid #d3dff0',
                  padding: '1rem',
                  borderRadius: '8px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.85rem',
                  marginTop: '1rem'
                }}
              >
                <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700 }}>
                  הגדרת התנהגות חלופית חדשה
                </h4>
                <div className="behavior-field-group">
                  <label className="behavior-field-label">התנהגות חלופית תואמת תפקוד</label>
                  <input
                    type="text"
                    className="behavior-input"
                    value={newReplacementSkill}
                    onChange={(e) => setNewReplacementSkill(e.target.value)}
                    placeholder="למשל: שימוש בכרטיסיית הפסקה או פנייה מילולית לעזרה"
                    required
                  />
                </div>
                <div className="behavior-field-group">
                  <label className="behavior-field-label">שיטות ושלבים להוראה ותרגול</label>
                  <textarea
                    className="behavior-textarea"
                    rows={2}
                    value={newTeachingStrategies}
                    onChange={(e) => setNewTeachingStrategies(e.target.value)}
                    placeholder="הדגמה מראש, משחק תפקידים, הטרמה לפני מעבר, סיוע מילולי או פיזי מדורג..."
                  />
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    type="submit"
                    className="btn-behavior-action btn-behavior-primary"
                  >
                    <span>אישור והוספה</span>
                  </button>
                  <button
                    type="button"
                    className="btn-behavior-action btn-behavior-secondary"
                    onClick={() => setShowAddReplacementForm(false)}
                  >
                    <span>ביטול</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </section>

      {/* Section 4: התערבות מניעתית והתאמות סביבתיות */}
      <section className="plan-card">
        <div className="plan-card-header" onClick={() => toggleSection('antecedents')}>
          <div className="plan-card-title-wrap">
            <span className="plan-section-badge">4</span>
            <h2 className="plan-card-title">התערבות מניעתית והתאמות סביבתיות</h2>
          </div>
          <button
            type="button"
            className="btn-collapse-toggle-32"
            aria-label={openSections.antecedents ? 'כיווץ מקטע' : 'הרחבת מקטע'}
          >
            {openSections.antecedents ? <Minus size={16} /> : <Plus size={16} />}
          </button>
        </div>

        {openSections.antecedents && (
          <div className="plan-card-body">
            <p style={{ margin: '0 0 1rem', fontSize: '0.85rem', color: '#64748b' }}>
              תכנון מניעתי של הסביבה והדרישות כדי להפחית מלכתחילה את הצורך בהתנהגות המאתגרת. כל המלצה כוללת פעולה קונקרטית, מועד, אופן ביצוע והקשר לפונקציה.
            </p>

            <div className="behavior-form-grid-2">
              <div className="behavior-field-group">
                <label className="behavior-field-label">א. הטרמה והכנה מראש</label>
                <textarea
                  className="behavior-textarea"
                  rows={2}
                  disabled={isPlanLocked}
                  value={plan.antecedentStructured?.prepAndWarmup || ''}
                  onChange={(e) =>
                    handleStructuredFieldChange('antecedentStructured', 'prepAndWarmup', e.target.value)
                  }
                  placeholder="התראה מוקדמת לפני מעבר פעילות, תיאום ציפיות, הכנה לסיום פעילות מועדפת..."
                />
              </div>

              <div className="behavior-field-group">
                <label className="behavior-field-label">ב. אמצעים חזותיים</label>
                <textarea
                  className="behavior-textarea"
                  rows={2}
                  disabled={isPlanLocked}
                  value={plan.antecedentStructured?.visualSupports || ''}
                  onChange={(e) =>
                    handleStructuredFieldChange('antecedentStructured', 'visualSupports', e.target.value)
                  }
                  placeholder="לוח סדר יום חזותי, טיימר חזותי, כרטיסי בחירה, כרטיס בקשת עזרה או הפסקה..."
                />
              </div>
            </div>

            <div className="behavior-form-grid-2" style={{ marginTop: '0.75rem' }}>
              <div className="behavior-field-group">
                <label className="behavior-field-label">ג. התאמת דרישות ומטלות</label>
                <textarea
                  className="behavior-textarea"
                  rows={2}
                  disabled={isPlanLocked}
                  value={plan.antecedentStructured?.taskAdjustments || ''}
                  onChange={(e) =>
                    handleStructuredFieldChange('antecedentStructured', 'taskAdjustments', e.target.value)
                  }
                  placeholder="פירוק מטלה לשלבים קצרים, קיצור משך המשימה, מתן בחירה בתוך המטלה, קצב מותאם..."
                />
              </div>

              <div className="behavior-field-group">
                <label className="behavior-field-label">ד. ארגון הסביבה הפיזית</label>
                <textarea
                  className="behavior-textarea"
                  rows={2}
                  disabled={isPlanLocked}
                  value={plan.antecedentStructured?.environmentOrg || ''}
                  onChange={(e) =>
                    handleStructuredFieldChange('antecedentStructured', 'environmentOrg', e.target.value)
                  }
                  placeholder="צמצום מסיחים, מיקום ישיבה מותאם, הכנת חומרי עבודה מראש..."
                />
              </div>
            </div>

            <div className="behavior-field-group" style={{ marginTop: '0.75rem' }}>
              <label className="behavior-field-label">ה. תפקידים ופעילות חלופית</label>
              <textarea
                className="behavior-textarea"
                rows={2}
                disabled={isPlanLocked}
                value={plan.antecedentStructured?.rolesAndActivities || ''}
                onChange={(e) =>
                  handleStructuredFieldChange('antecedentStructured', 'rolesAndActivities', e.target.value)
                }
                placeholder="מתן תפקיד תפעולי (חלוקת דפים), שילוב פעילות מוטורית יזומה, הזדמנויות השתתפות..."
              />
            </div>

            <div className="behavior-field-group" style={{ marginTop: '1rem' }}>
              <label className="behavior-field-label">
                סיכום משולב של אסטרטגיות מקדימות והתאמות סביבתיות
              </label>
              <textarea
                className="behavior-textarea"
                rows={3}
                disabled={isPlanLocked}
                value={plan.antecedentStrategies || ''}
                onChange={(e) => handleFieldChange('antecedentStrategies', e.target.value)}
                placeholder="פירוט התאמות סביבתיות ופדגוגיות..."
              />
            </div>
          </div>
        )}
      </section>

      {/* Section 5: מערך חיזוקים וחיזוק דיפרנציאלי */}
      <section className="plan-card">
        <div
          className="plan-card-header"
          onClick={() => toggleSection('reinforcementAndReactive')}
        >
          <div className="plan-card-title-wrap">
            <span className="plan-section-badge">5</span>
            <h2 className="plan-card-title">מערך חיזוקים וחיזוק דיפרנציאלי</h2>
          </div>
          <button
            type="button"
            className="btn-collapse-toggle-32"
            aria-label={openSections.reinforcementAndReactive ? 'כיווץ מקטע' : 'הרחבת מקטע'}
          >
            {openSections.reinforcementAndReactive ? <Minus size={16} /> : <Plus size={16} />}
          </button>
        </div>

        {openSections.reinforcementAndReactive && (
          <div className="plan-card-body">
            <div className="behavior-form-grid-2">
              <div className="behavior-field-group">
                <label className="behavior-field-label">סוג הליך חיזוק דיפרנציאלי מותאם</label>
                <select
                  className="behavior-select"
                  disabled={isPlanLocked}
                  value={plan.differentialReinforcement?.procedureType || 'DRA'}
                  onChange={(e) =>
                    handleStructuredFieldChange(
                      'differentialReinforcement',
                      'procedureType',
                      e.target.value as DifferentialReinforcementProcedure
                    )
                  }
                >
                  <option value="DRA">חיזוק דיפרנציאלי של התנהגות חלופית</option>
                  <option value="DRI">חיזוק דיפרנציאלי של התנהגות בלתי תואמת</option>
                  <option value="DRO">חיזוק דיפרנציאלי של התנהגות אחרת</option>
                  <option value="FCT">אימון לתקשורת תפקודית מותאמת</option>
                </select>
              </div>

              <div className="behavior-field-group">
                <label className="behavior-field-label">נימוק מקצועי לבחירת ההליך</label>
                <input
                  type="text"
                  className="behavior-input"
                  disabled={isPlanLocked}
                  value={plan.differentialReinforcement?.rationale || ''}
                  onChange={(e) =>
                    handleStructuredFieldChange('differentialReinforcement', 'rationale', e.target.value)
                  }
                  placeholder="מדוע הליך זה מתאים לפונקציה ולממצאי ההערכה..."
                />
              </div>
            </div>

            <div className="behavior-form-grid-2" style={{ marginTop: '0.75rem' }}>
              <div className="behavior-field-group">
                <label className="behavior-field-label">מפת מחזקים מועדפים בעלי ערך מניע</label>
                <textarea
                  className="behavior-textarea"
                  rows={2}
                  disabled={isPlanLocked}
                  value={plan.reinforcementSystem.preferredReinforcers || ''}
                  onChange={(e) =>
                    handleNestedFieldChange('reinforcementSystem', 'preferredReinforcers', e.target.value)
                  }
                  placeholder="פעילויות אהובות, זמן מועדף, משחק משותף, תפקיד כיתתי, מחזקים חברתיים..."
                />
              </div>

              <div className="behavior-field-group">
                <label className="behavior-field-label">לוח זמנים למתן החיזוק ודילול מדורג</label>
                <textarea
                  className="behavior-textarea"
                  rows={2}
                  disabled={isPlanLocked}
                  value={plan.reinforcementSystem.scheduleOfReinforcement || ''}
                  onChange={(e) =>
                    handleNestedFieldChange('reinforcementSystem', 'scheduleOfReinforcement', e.target.value)
                  }
                  placeholder="מיידי על שימוש בחלופה, חיזוק רציף בתחילת הדרך ודילול הדרגתי..."
                />
              </div>
            </div>

            {/* Praise Examples */}
            {Array.isArray(plan.differentialReinforcement?.praiseExamples) &&
              plan.differentialReinforcement!.praiseExamples.length > 0 && (
                <div style={{ marginTop: '0.75rem', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '0.75rem 1rem' }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#166534', display: 'block', marginBottom: '0.35rem' }}>
                    דוגמאות למשפטי שבח תיאורי ספציפי לשימוש הצוות:
                  </label>
                  <ul style={{ margin: 0, paddingRight: '1.25rem', fontSize: '0.85rem', color: '#14532d' }}>
                    {plan.differentialReinforcement!.praiseExamples.map((praise, pIdx) => (
                      <li key={pIdx} style={{ marginBottom: '0.25rem' }}>
                        "{praise}"
                      </li>
                    ))}
                  </ul>
                </div>
              )}
          </div>
        )}
      </section>

      {/* Section 6: פרוטוקול תגובה מדורג ב-4 מצבים ונוהל בטיחות */}
      <section className="plan-card">
        <div
          className="plan-card-header"
          onClick={() => toggleSection('stagedReactive')}
        >
          <div className="plan-card-title-wrap">
            <span className="plan-section-badge">6</span>
            <h2 className="plan-card-title">פרוטוקול תגובה מדורג ב-4 מצבים ונוהל בטיחות</h2>
          </div>
          <button
            type="button"
            className="btn-collapse-toggle-32"
            aria-label={openSections.stagedReactive ? 'כיווץ מקטע' : 'הרחבת מקטע'}
          >
            {openSections.stagedReactive ? <Minus size={16} /> : <Plus size={16} />}
          </button>
        </div>

        {openSections.stagedReactive && (
          <div className="plan-card-body">
            <p style={{ margin: '0 0 1rem', fontSize: '0.85rem', color: '#64748b' }}>
              פרוטוקול תגובה מדורג לצוות החינוכי להבטחת תגובה אחידה שאינה משמרת את ההתנהגות המאתגרת, תוך מניעת מאבקי כוח ושמירה מוחלטת על בטיחות.
            </p>

            <div className="staged-protocol-grid">
              <div className="staged-phase-card phase-a">
                <div className="staged-phase-header">
                  <span>מצב א' - הופעה ראשונית</span>
                </div>
                <textarea
                  className="behavior-textarea"
                  rows={3}
                  disabled={isPlanLocked}
                  value={plan.stagedReactiveProtocol?.phaseAInitial || ''}
                  onChange={(e) =>
                    handleStructuredFieldChange('stagedReactiveProtocol', 'phaseAInitial', e.target.value)
                  }
                  placeholder="הוראה מילולית קצרה, רמז חזותי שקט, תגובה ניטרלית, הימנעות מתשומת לב עודפת..."
                />
              </div>

              <div className="staged-phase-card phase-b">
                <div className="staged-phase-header">
                  <span>מצב ב' - הפסקה או ירידה בעוצמה</span>
                </div>
                <textarea
                  className="behavior-textarea"
                  rows={3}
                  disabled={isPlanLocked}
                  value={plan.stagedReactiveProtocol?.phaseBDeescalation || ''}
                  onChange={(e) =>
                    handleStructuredFieldChange('stagedReactiveProtocol', 'phaseBDeescalation', e.target.value)
                  }
                  placeholder="זיהוי רגע ההירגעות, חיזוק מיידי על חזרה לוויסות, חזרה מותאמת לפעילות..."
                />
              </div>

              <div className="staged-phase-card phase-c">
                <div className="staged-phase-header">
                  <span>מצב ג' - המשכיות ההתנהגות</span>
                </div>
                <textarea
                  className="behavior-textarea"
                  rows={3}
                  disabled={isPlanLocked}
                  value={plan.stagedReactiveProtocol?.phaseCContinuation || ''}
                  onChange={(e) =>
                    handleStructuredFieldChange('stagedReactiveProtocol', 'phaseCContinuation', e.target.value)
                  }
                  placeholder="שינוי סביבתי, התאמת דרישה ללא מאבקי כוח, הצגה מחדש של ההתנהגות החלופית..."
                />
              </div>

              <div className="staged-phase-card phase-d">
                <div className="staged-phase-header">
                  <span>מצב ד' - הסלמה ובטיחות</span>
                </div>
                <textarea
                  className="behavior-textarea"
                  rows={3}
                  disabled={isPlanLocked}
                  value={plan.stagedReactiveProtocol?.phaseDCrisis || plan.reactiveProtocol.crisisSafetyPlan || ''}
                  onChange={(e) => {
                    handleStructuredFieldChange('stagedReactiveProtocol', 'phaseDCrisis', e.target.value);
                    handleNestedFieldChange('reactiveProtocol', 'crisisSafetyPlan', e.target.value);
                  }}
                  placeholder="בטיחות הילד והסביבה, הפחתת גירויים, עצירת הדרישה, גורם אחראי. ללא כפייה פיזית..."
                />
              </div>
            </div>

            <div className="behavior-field-group" style={{ marginTop: '1.25rem' }}>
              <label className="behavior-field-label">
                סיכום פרוטוקול תגובה אחיד לצוות בעת התרחשות התנהגות היעד
              </label>
              <textarea
                className="behavior-textarea"
                rows={2}
                disabled={isPlanLocked}
                value={plan.reactiveProtocol.staffResponse || ''}
                onChange={(e) =>
                  handleNestedFieldChange('reactiveProtocol', 'staffResponse', e.target.value)
                }
                placeholder="הנחיות מדויקות: מה לעשות ומה לא לעשות..."
              />
            </div>
          </div>
        )}
      </section>

      {/* Section 7: פרוטוקול יישום מעשי לצוות ולסייעת */}
      <section className="plan-card">
        <div
          className="plan-card-header"
          onClick={() => toggleSection('classroomCheatSheet')}
        >
          <div className="plan-card-title-wrap">
            <span className="plan-section-badge">7</span>
            <h2 className="plan-card-title">פרוטוקול יישום מעשי לכיתה ולצוות החינוכי</h2>
          </div>
          <button
            type="button"
            className="btn-collapse-toggle-32"
            aria-label={openSections.classroomCheatSheet ? 'כיווץ מקטע' : 'הרחבת מקטע'}
          >
            {openSections.classroomCheatSheet ? <Minus size={16} /> : <Plus size={16} />}
          </button>
        </div>

        {openSections.classroomCheatSheet && (
          <div className="plan-card-body">
            <p style={{ margin: '0 0 1rem', fontSize: '0.85rem', color: '#64748b' }}>
              תרגום ההתערבות להנחיות פעולה תמציתיות, ישירות ומעשיות עבור המורה, הסייעת וההורים בסביבה הטבעית.
            </p>

            <div className="cheat-sheet-container">
              <div className="cheat-sheet-row">
                <div className="cheat-sheet-label">לפני המעבר או הפעילות:</div>
                <input
                  type="text"
                  className="behavior-input"
                  disabled={isPlanLocked}
                  value={plan.classroomCheatSheet?.beforeTransition || ''}
                  onChange={(e) =>
                    handleStructuredFieldChange('classroomCheatSheet', 'beforeTransition', e.target.value)
                  }
                  placeholder="הצגת טיימר חזותי והתראה 2 דקות לפני סיום הפעילות..."
                />
              </div>

              <div className="cheat-sheet-row">
                <div className="cheat-sheet-label">בזמן המעבר או ההוראה:</div>
                <input
                  type="text"
                  className="behavior-input"
                  disabled={isPlanLocked}
                  value={plan.classroomCheatSheet?.duringTransition || ''}
                  onChange={(e) =>
                    handleStructuredFieldChange('classroomCheatSheet', 'duringTransition', e.target.value)
                  }
                  placeholder="הצגת לוח רצף והוראה קצרה ועניינית..."
                />
              </div>

              <div className="cheat-sheet-row">
                <div className="cheat-sheet-label">בעת שיתוף פעולה והיענות:</div>
                <input
                  type="text"
                  className="behavior-input"
                  disabled={isPlanLocked}
                  value={plan.classroomCheatSheet?.onCooperation || ''}
                  onChange={(e) =>
                    handleStructuredFieldChange('classroomCheatSheet', 'onCooperation', e.target.value)
                  }
                  placeholder="מתן שבח תיאורי ספציפי וחיזוק מיידי שנקבע..."
                />
              </div>

              <div className="cheat-sheet-row">
                <div className="cheat-sheet-label">בעת סירוב או קושי ראשוני:</div>
                <input
                  type="text"
                  className="behavior-input"
                  disabled={isPlanLocked}
                  value={plan.classroomCheatSheet?.onRefusal || ''}
                  onChange={(e) =>
                    handleStructuredFieldChange('classroomCheatSheet', 'onRefusal', e.target.value)
                  }
                  placeholder="הימנעות מוויכוח ממושך, הוראה קצרה והפניה לכרטיסייה חלופית..."
                />
              </div>

              <div className="cheat-sheet-row">
                <div className="cheat-sheet-label">בעת הסלמה או אירוע חריג:</div>
                <input
                  type="text"
                  className="behavior-input"
                  disabled={isPlanLocked}
                  value={plan.classroomCheatSheet?.onCrisis || ''}
                  onChange={(e) =>
                    handleStructuredFieldChange('classroomCheatSheet', 'onCrisis', e.target.value)
                  }
                  placeholder="פעולה בהתאם לתוכנית הבטיחות המוסדית ושמירה על סביבה בטוחה..."
                />
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Section 8: טבלת מעקב שוטף ולוח התקדמות */}
      <section className="plan-card">
        <div className="plan-card-header" onClick={() => toggleSection('tracking')}>
          <div className="plan-card-title-wrap">
            <span className="plan-section-badge">8</span>
            <h2 className="plan-card-title">טבלת מעקב שוטף ולוח התקדמות מול קו הבסיס</h2>
          </div>
          <button
            type="button"
            className="btn-collapse-toggle-32"
            aria-label={openSections.tracking ? 'כיווץ מקטע' : 'הרחבת מקטע'}
          >
            {openSections.tracking ? <Minus size={16} /> : <Plus size={16} />}
          </button>
        </div>

        {openSections.tracking && (
          <div className="plan-card-body">
            {/* Progress and Comparison Dashboard Banner */}
            <div className="plan-progress-dashboard">
              <div className="plan-progress-item">
                <span className="plan-progress-label">ממוצע קו בסיס מקורי</span>
                <span className="plan-progress-value">{baselineStats.average || '—'}</span>
              </div>
              <div className="plan-progress-item">
                <span className="plan-progress-label">ממוצע נוכחי בהתערבות</span>
                <span className="plan-progress-value">{trackingStats.averageOccurrences}</span>
              </div>
              <div className="plan-progress-item">
                <span className="plan-progress-label">אחוז הפחתה מקו הבסיס</span>
                <span
                  className={`plan-progress-value ${
                    trackingStats.reductionPercentage > 0 ? 'positive' : ''
                  }`}
                >
                  {trackingStats.reductionPercentage > 0 ? '+' : ''}
                  {trackingStats.reductionPercentage}%
                </span>
              </div>
              <div className="plan-progress-item">
                <span className="plan-progress-label">שיעור שימוש בהתנהגות חלופית</span>
                <span className="plan-progress-value">
                  {trackingStats.replacementSuccessRate}%
                </span>
              </div>
            </div>

            {plan.ongoingTracking.length === 0 ? (
              <div className="behavior-empty-box">
                טרם הוזנו רשומות מעקב שוטף. ניתן לתעד אירועים יומיומיים או לפי שיעורים.
              </div>
            ) : (
              <div className="baseline-table-wrapper">
                <table className="baseline-data-table">
                  <thead>
                    <tr>
                      <th>תאריך</th>
                      <th>שיעור או מועד</th>
                      <th>מופעי התנהגות יעד</th>
                      <th>התנהגות חלופית</th>
                      <th>חיזוק ניתן</th>
                      <th>הערות</th>
                      <th style={{ width: '40px' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {plan.ongoingTracking.map((point) => (
                      <tr key={point.id}>
                        <td>{point.date}</td>
                        <td>{point.period}</td>
                        <td>
                          <strong>{point.targetBehaviorOccurrences}</strong>
                        </td>
                        <td>
                          {point.replacementBehaviorUsed ? (
                            <span style={{ color: '#16a34a', fontWeight: 600 }}>כן</span>
                          ) : (
                            <span style={{ color: '#dc2626' }}>לא</span>
                          )}
                        </td>
                        <td>
                          {point.reinforcementDelivered ? (
                            <span style={{ color: '#16a34a', fontWeight: 600 }}>כן</span>
                          ) : (
                            <span style={{ color: '#64748b' }}>לא</span>
                          )}
                        </td>
                        <td>{point.notes || '—'}</td>
                        <td>
                          <button
                            type="button"
                            disabled={isPlanLocked}
                            className="btn-collapse-toggle-32"
                            onClick={() => handleRemoveTrackingPoint(point.id)}
                            title="מחיקת רשומת מעקב"
                          >
                            <Trash2 size={14} color={isPlanLocked ? '#94a3b8' : '#d9534f'} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {!showAddTrackingForm ? (
              <button
                type="button"
                disabled={isPlanLocked}
                className="btn-behavior-action btn-behavior-secondary"
                onClick={() => setShowAddTrackingForm(true)}
              >
                <Plus size={16} />
                <span>הוספת רשומת מעקב שוטף</span>
              </button>
            ) : (
              <form
                onSubmit={handleAddTrackingPoint}
                style={{
                  background: '#fbfcfe',
                  border: '1px solid #d3dff0',
                  padding: '1rem',
                  borderRadius: '8px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.85rem'
                }}
              >
                <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700 }}>
                  רישום מעקב יומי או לפי שיעור
                </h4>
                <div className="behavior-form-grid-2">
                  <div className="behavior-field-group">
                    <label className="behavior-field-label">תאריך</label>
                    <HebrewDatePicker
                      value={newTrackingDate}
                      onChange={setNewTrackingDate}
                      fullWidth={true}
                      ariaLabel="תאריך מעקב"
                    />
                  </div>
                  <div className="behavior-field-group">
                    <label className="behavior-field-label">שיעור, מועד או פעילות</label>
                    <input
                      type="text"
                      className="behavior-input"
                      value={newTrackingPeriod}
                      onChange={(e) => setNewTrackingPeriod(e.target.value)}
                      placeholder="למשל: שיעור 2, חצר"
                      required
                    />
                  </div>
                </div>

                <div className="behavior-form-grid-2">
                  <div className="behavior-field-group">
                    <label className="behavior-field-label">
                      מספר מופעי התנהגות היעד
                    </label>
                    <input
                      type="number"
                      min="0"
                      className="behavior-input"
                      value={newTrackingOccurrences}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === '' || Number(val) >= 0) {
                          setNewTrackingOccurrences(val);
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === '-' || e.key === 'e' || e.key === 'E') {
                          e.preventDefault();
                        }
                      }}
                      required
                    />
                  </div>
                  <div className="behavior-field-group">
                    <label className="behavior-field-label">הערות על האירוע</label>
                    <input
                      type="text"
                      className="behavior-input"
                      value={newTrackingNotes}
                      onChange={(e) => setNewTrackingNotes(e.target.value)}
                      placeholder="הקשר, טריגר מיוחד או מענה מוצלח"
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      cursor: 'pointer',
                      fontSize: '0.875rem'
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={newTrackingReplacementUsed}
                      onChange={(e) => setNewTrackingReplacementUsed(e.target.checked)}
                    />
                    <span>נעשה שימוש בהתנהגות החלופית</span>
                  </label>

                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      cursor: 'pointer',
                      fontSize: '0.875rem'
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={newTrackingReinforcement}
                      onChange={(e) => setNewTrackingReinforcement(e.target.checked)}
                    />
                    <span>ניתן חיזוק על פי התוכנית</span>
                  </label>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <button
                    type="submit"
                    className="btn-behavior-action btn-behavior-primary"
                  >
                    <span>הוספה לטבלה</span>
                  </button>
                  <button
                    type="button"
                    className="btn-behavior-action btn-behavior-secondary"
                    onClick={() => setShowAddTrackingForm(false)}
                  >
                    <span>ביטול</span>
                  </button>
                </div>
              </form>
            )}

            {/* Visual Chart 3: Progress Monitoring Baseline vs. Intervention Dual Line Chart */}
            <div style={{ marginTop: '24px' }}>
              <ProgressMonitoringDualLineChart
                baselinePoints={student.behaviorAssessment?.baselineData || []}
                ongoingPoints={plan.ongoingTracking}
              />
            </div>
          </div>
        )}
      </section>
      </>
      )}

      {/* Send Report to Email Modal */}
      <SendReportEmailModal
        isOpen={showEmailModal}
        onClose={() => setShowEmailModal(false)}
        reportTitle="תוכנית התערבות התנהגותית"
        studentName={studentDetails.name || student.name || 'תלמיד/ה'}
        schoolYear={studentDetails.schoolYear || student.schoolYear || ''}
        currentUser={currentUser}
        hideDetails={hideDetailsOnExport}
        onToggleHideDetails={setHideDetailsOnExport}
        getWordAttachment={createWordBlob}
        getPdfAttachment={createPdfBlob}
      />
    </div>
  );
}
