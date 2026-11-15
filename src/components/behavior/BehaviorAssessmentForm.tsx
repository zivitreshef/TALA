import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Save,
  Printer,
  Plus,
  Minus,
  Trash2,
  FileText,
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
  Mail
} from 'lucide-react';
import {
  BehaviorAssessmentReport,
  BehaviorFunction,
  BehaviorMeasurementType,
  BehaviorTarget,
  BaselineDataPoint,
  StudentProfile
} from '../../domain/types';
import {
  calculateBaselineStats,
  createEmptyBehaviorAssessment,
  getBehaviorFunctionLabelHebrew,
  getMeasurementTypeLabelHebrew
} from '../../domain/behaviorAnalysis';
import {
  generateBehaviorAssessmentDraft,
  refineOperationalDefinition,
  formulateHypothesisNarrative,
  suggestInterventionStrategies
} from '../../services/behaviorAiService';
import BehaviorStudentDetailsCard, { type BehaviorStudentDetailsData } from './BehaviorStudentDetailsCard';
import type { StaffMergePayload } from '../form/StaffVoiceControl';
import ParentVoiceControl from '../form/ParentVoiceControl';
import PedagogicalFeed from '../form/PedagogicalFeed';
import DiagnosticIntakeModal from '../form/DiagnosticIntakeModal';
import {
  addSnippet,
  removeSnippet,
  updateSnippet,
  createParentVoiceSnippet
} from '../../domain/pedagogicalFeed';
import {
  buildBehaviorAssessmentWordDocumentHtml,
  buildBehaviorAssessmentPrintHtml,
  openHtmlPrintWindow,
  getSafeReportFilename
} from '../../export/wordAndPrintBuilders';
import { generatePdfBlobFromHtml } from '../../emailService';
import SendReportEmailModal from '../modals/SendReportEmailModal';
import { BaselineFrequencyBarChart, FunctionDistributionHorizontalBarChart } from './BehaviorCharts';
import type { PedagogicalSnippet } from '../../domain/types';
import './BehaviorAssessmentForm.css';

export interface BehaviorAssessmentFormProps {
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
}

export default function BehaviorAssessmentForm({
  student,
  allStudents = [],
  currentUser,
  onSaveStudentPlan,
  onGoBack,
  onDraftStateChange
}: BehaviorAssessmentFormProps) {
  // Local state initialized from student's behaviorAssessment or clean template
  const [report, setReport] = useState<BehaviorAssessmentReport>(() => {
    if (student.behaviorAssessment) {
      return {
        ...createEmptyBehaviorAssessment(),
        ...student.behaviorAssessment,
        targetBehaviors: student.behaviorAssessment.targetBehaviors || [],
        baselineData: student.behaviorAssessment.baselineData || []
      };
    }
    return {
      ...createEmptyBehaviorAssessment(),
      assessorName: currentUser?.name || '',
      assessmentDate: new Date().toISOString().split('T')[0]
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
    reportDate: student.reportDate || report.assessmentDate || new Date().toISOString().split('T')[0],
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
    setReport((prev) => ({
      ...prev,
      backgroundInfo: (prev.backgroundInfo ? prev.backgroundInfo + '\n' : '') + addition,
      updatedAt: new Date().toISOString()
    }));
    setIsDirty(true);
  };

  const isReportLocked = Boolean(report.isLocked);

  // Pedagogical Feed & Diagnostic Intake State
  const [activeSnippets, setActiveSnippets] = useState<PedagogicalSnippet[]>(
    () => student.pedagogicalSnippets || []
  );
  const [isPedagogicalFeedOpen, setIsPedagogicalFeedOpen] = useState<boolean>(true);
  const [showDiagnosticIntakeModal, setShowDiagnosticIntakeModal] = useState<boolean>(false);

  const handleAddSnippet = (snippet: PedagogicalSnippet) => {
    setActiveSnippets((prev) => addSnippet(prev, snippet));
    setIsDirty(true);
  };

  const handleUpdateSnippet = (snippetId: string, updatedContent: string) => {
    setActiveSnippets((prev) => updateSnippet(prev, snippetId, updatedContent));
    setIsDirty(true);
  };

  const handleRemoveSnippet = (snippetId: string) => {
    setActiveSnippets((prev) => removeSnippet(prev, snippetId));
    setIsDirty(true);
  };

  const handleMergeParentVoice = (mergedText: string) => {
    setReport((prev) => ({
      ...prev,
      backgroundInfo: (prev.backgroundInfo ? prev.backgroundInfo + '\n\n' : '') + mergedText,
      updatedAt: new Date().toISOString()
    }));
    const parentSnippet = createParentVoiceSnippet(
      mergedText,
      currentUser?.name || 'הורי התלמיד',
      new Date().toISOString()
    );
    setActiveSnippets((prev) => addSnippet(prev, parentSnippet));
    setIsDirty(true);
  };

  const [isDirty, setIsDirty] = useState<boolean>(false);
  const [saveSuccessNotice, setSaveSuccessNotice] = useState<boolean>(false);

  // Progressive Disclosure: Collapsible Card Sections (Default open)
  const [openSections, setOpenSections] = useState<{ [key: string]: boolean }>({
    background: true,
    targets: true,
    baseline: true,
    functionAnalysis: true,
    recommendations: true
  });

  // Target Behavior inline input form state
  const [newTargetName, setNewTargetName] = useState<string>('');
  const [newTargetDef, setNewTargetDef] = useState<string>('');
  const [newTargetType, setNewTargetType] = useState<BehaviorMeasurementType>('frequency');
  const [newTargetGoal, setNewTargetGoal] = useState<string>('');
  const [showAddTargetForm, setShowAddTargetForm] = useState<boolean>(false);

  // Baseline data point inline input state
  const [newBaselineDate, setNewBaselineDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [newBaselinePeriod, setNewBaselinePeriod] = useState<string>('שיעור 1');
  const [newBaselineValue, setNewBaselineValue] = useState<string>('');
  const [newBaselineNotes, setNewBaselineNotes] = useState<string>('');
  const [showAddBaselineForm, setShowAddBaselineForm] = useState<boolean>(false);

  // Notify parent of unsaved draft state
  useEffect(() => {
    if (onDraftStateChange) {
      onDraftStateChange({ isDirty, draftData: isDirty ? report : null });
    }
  }, [isDirty, report, onDraftStateChange]);

  const toggleSection = (sectionKey: string) => {
    setOpenSections((prev) => ({
      ...prev,
      [sectionKey]: !prev[sectionKey]
    }));
  };

  const handleFieldChange = (field: keyof BehaviorAssessmentReport, value: unknown) => {
    setReport((prev) => ({
      ...prev,
      [field]: value,
      updatedAt: new Date().toISOString()
    }));
    setIsDirty(true);
    setSaveSuccessNotice(false);
  };

  // Export, Print & Document Preview States
  const [showEmailModal, setShowEmailModal] = useState<boolean>(false);
  const [showFullDocPreview, setShowFullDocPreview] = useState<boolean>(false);

  // AI Assistance states & handlers
  const [showAiModal, setShowAiModal] = useState<boolean>(false);
  const [aiPromptNotes, setAiPromptNotes] = useState<string>('');
  const [isAiGenerating, setIsAiGenerating] = useState<boolean>(false);
  const [isRefiningTarget, setIsRefiningTarget] = useState<boolean>(false);
  const [isFormulatingHypothesis, setIsFormulatingHypothesis] = useState<boolean>(false);
  const [isSuggestingRecommendations, setIsSuggestingRecommendations] = useState<boolean>(false);

  const handleRunFullAiDraft = async () => {
    if (!aiPromptNotes.trim()) return;
    setIsAiGenerating(true);
    try {
      const studentWithSnippets: StudentProfile = {
        ...student,
        ...studentDetails,
        pedagogicalSnippets: activeSnippets
      };
      const draft = await generateBehaviorAssessmentDraft(aiPromptNotes, studentWithSnippets);
      if (draft) {
        setReport((prev) => ({
          ...prev,
          backgroundInfo: draft.backgroundSummary || prev.backgroundInfo,
          targetBehaviors: draft.targetBehaviors?.length
            ? draft.targetBehaviors.map((tb, idx) => ({
                id: 'target_ai_' + Date.now() + '_' + idx,
                name: tb.name,
                operationalDefinition: tb.operationalDefinition,
                measurementType: tb.measurementType || 'frequency',
                targetGoal: tb.suggestedTargetGoal
              }))
            : prev.targetBehaviors,
          antecedentAnalysis: draft.antecedentAnalysis || prev.antecedentAnalysis,
          mainHypothesizedFunction: draft.mainHypothesizedFunction || prev.mainHypothesizedFunction,
          functionalHypothesisNarrative:
            draft.functionalHypothesisNarrative || prev.functionalHypothesisNarrative,
          initialRecommendations:
            draft.initialRecommendations || prev.initialRecommendations,
          updatedAt: new Date().toISOString()
        }));
        setIsDirty(true);
        setShowAiModal(false);
        setAiPromptNotes('');
        setSaveSuccessNotice(false);
      }
    } finally {
      setIsAiGenerating(false);
    }
  };

  const handleRefineTargetDefinition = async () => {
    const textToRefine = newTargetDef || newTargetName;
    if (!textToRefine.trim()) return;
    setIsRefiningTarget(true);
    try {
      const refined = await refineOperationalDefinition(textToRefine, student);
      if (refined) {
        setNewTargetDef(refined);
      }
    } finally {
      setIsRefiningTarget(false);
    }
  };

  const handleFormulateHypothesis = async () => {
    setIsFormulatingHypothesis(true);
    try {
      const targetName = report.targetBehaviors[0]?.name || 'התנהגות מאתגרת';
      const funcLabel = getBehaviorFunctionLabelHebrew(report.mainHypothesizedFunction);
      const formulated = await formulateHypothesisNarrative(
        report.antecedentAnalysis || '',
        targetName,
        funcLabel,
        student
      );
      if (formulated) {
        handleFieldChange('functionalHypothesisNarrative', formulated);
      }
    } finally {
      setIsFormulatingHypothesis(false);
    }
  };

  const handleSuggestRecommendations = async () => {
    setIsSuggestingRecommendations(true);
    try {
      const targetName = report.targetBehaviors[0]?.name || '';
      const funcLabel = getBehaviorFunctionLabelHebrew(report.mainHypothesizedFunction);
      const res = await suggestInterventionStrategies(targetName, funcLabel, student);
      if (res) {
        const textParts = [
          res.replacementSkill ? `התנהגות חלופית: ${res.replacementSkill}` : '',
          res.antecedentStrategies ? `התאמות סביבתיות: ${res.antecedentStrategies}` : '',
          res.preferredReinforcers ? `מערך חיזוקים: ${res.preferredReinforcers}` : '',
          res.staffResponse ? `תגובת צוות: ${res.staffResponse}` : ''
        ]
          .filter(Boolean)
          .join('\n\n');
        if (textParts) {
          handleFieldChange('initialRecommendations', textParts);
        }
      }
    } finally {
      setIsSuggestingRecommendations(false);
    }
  };

  // Automated Statistical Calculation
  const baselineStats = useMemo(() => {
    return calculateBaselineStats(report.baselineData);
  }, [report.baselineData]);

  // Target Behaviors Management
  const handleAddTargetBehavior = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTargetName.trim()) return;

    const newTarget: BehaviorTarget = {
      id: 'target_' + Date.now(),
      name: newTargetName.trim(),
      operationalDefinition: newTargetDef.trim(),
      measurementType: newTargetType,
      baselineAverage: baselineStats.average || undefined,
      targetGoal: newTargetGoal ? Number(newTargetGoal) : undefined
    };

    setReport((prev) => ({
      ...prev,
      targetBehaviors: [...prev.targetBehaviors, newTarget],
      updatedAt: new Date().toISOString()
    }));

    setNewTargetName('');
    setNewTargetDef('');
    setNewTargetGoal('');
    setShowAddTargetForm(false);
    setIsDirty(true);
  };

  const handleRemoveTargetBehavior = (id: string) => {
    setReport((prev) => ({
      ...prev,
      targetBehaviors: prev.targetBehaviors.filter((t) => t.id !== id),
      updatedAt: new Date().toISOString()
    }));
    setIsDirty(true);
  };

  // Baseline Data Management
  const handleAddBaselinePoint = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBaselineValue || isNaN(Number(newBaselineValue))) return;

    const newPoint: BaselineDataPoint = {
      id: 'base_' + Date.now(),
      date: newBaselineDate,
      sessionOrPeriod: newBaselinePeriod.trim(),
      value: Number(newBaselineValue),
      notes: newBaselineNotes.trim() || undefined
    };

    setReport((prev) => ({
      ...prev,
      baselineData: [...prev.baselineData, newPoint],
      updatedAt: new Date().toISOString()
    }));

    setNewBaselineValue('');
    setNewBaselineNotes('');
    setShowAddBaselineForm(false);
    setIsDirty(true);
  };

  const handleRemoveBaselinePoint = (id: string) => {
    setReport((prev) => ({
      ...prev,
      baselineData: prev.baselineData.filter((b) => b.id !== id),
      updatedAt: new Date().toISOString()
    }));
    setIsDirty(true);
  };

  // Save operation
  const handleSave = () => {
    const updatedStudent: StudentProfile = {
      ...student,
      ...studentDetails,
      pedagogicalSnippets: activeSnippets,
      behaviorAssessment: report,
      updatedAt: new Date().toISOString()
    };

    onSaveStudentPlan(updatedStudent);
    setIsDirty(false);
    setSaveSuccessNotice(true);
    setTimeout(() => {
      setSaveSuccessNotice(false);
    }, 3500);
  };

  const [hideDetailsOnExport, setHideDetailsOnExport] = useState(false);
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
      behaviorAssessment: report
    };
    const printHtml = buildBehaviorAssessmentPrintHtml(exportStudent, hideDetailsOnExport);
    openHtmlPrintWindow(printHtml);
  };

  const createWordBlob = () => {
    const exportStudent: StudentProfile = {
      ...student,
      ...studentDetails,
      behaviorAssessment: report
    };
    const wordHtml = buildBehaviorAssessmentWordDocumentHtml(exportStudent, hideDetailsOnExport);
    const blob = new Blob(['\ufeff', wordHtml], {
      type: 'application/msword;charset=utf-8'
    });
    const filename = getSafeReportFilename(exportStudent, hideDetailsOnExport, 'doc', 'behavior_assessment');
    return { blob, filename, mimeType: 'application/msword', htmlContent: wordHtml };
  };

  const createPdfBlob = async () => {
    const exportStudent: StudentProfile = {
      ...student,
      ...studentDetails,
      behaviorAssessment: report
    };
    const printHtml = buildBehaviorAssessmentPrintHtml(exportStudent, hideDetailsOnExport);
    const filename = getSafeReportFilename(exportStudent, hideDetailsOnExport, 'pdf', 'behavior_assessment');
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
    <div className="behavior-form-container" dir="rtl">
      {/* Top Header Card */}
      <header className="behavior-form-header">
        <div className="behavior-form-title-group">
          <div className="behavior-form-icon-badge">
            <FileText size={24} />
          </div>
          <div>
            <h1 className="behavior-form-heading">הערכת תפקוד התנהגותי</h1>
            <p className="behavior-form-subheading">
              תלמיד: <strong>{student.name || 'ללא שם'}</strong>
              {student.educationalFramework ? ` | ${student.educationalFramework}` : ''}
            </p>
          </div>
        </div>

        <div className="behavior-form-actions" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
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

          {/* Yellow Lock / Unlock Button (matching teacher workspace) */}
          <div className="report-lock-toggle-wrapper">
            <button
              type="button"
              className={`btn-report-lock-icon ${isReportLocked ? 'locked' : 'unlocked'}`}
              onClick={() => {
                const nextLocked = !isReportLocked;
                setReport((prev) => ({
                  ...prev,
                  isLocked: nextLocked,
                  lockedAt: nextLocked ? new Date().toISOString() : undefined,
                  lockedBy: nextLocked ? (currentUser?.name || 'מנתחת התנהגות') : undefined,
                  updatedAt: new Date().toISOString()
                }));
                setIsDirty(true);
              }}
              aria-label={isReportLocked ? 'המסמך נעול לעריכה' : 'המסמך פתוח לעריכה'}
              title={isReportLocked ? 'המסמך נעול לעריכה - לחצי לפתיחה' : 'נעילת המסמך לעריכה'}
            >
              {isReportLocked ? <Lock size={19} /> : <Unlock size={19} />}
            </button>
            <div className="report-lock-hover-tooltip" role="tooltip">
              <div className="report-lock-tooltip-title">
                {isReportLocked ? '🔒 המסמך נעול לעריכה' : '🔓 המסמך פתוח לעריכה'}
              </div>
              <div className="report-lock-tooltip-body">
                {isReportLocked
                  ? 'המסמך נעול לעריכה. לחצי על הסמל לפתיחת הנעילה.'
                  : 'המסמך פתוח לעריכה. לחצי על הסמל לנעילת המסמך.'}
              </div>
            </div>
          </div>

          {/* Primary Save Button (matching teacher workspace) */}
          <button
            type="button"
            className="btn-save-progress"
            onClick={handleSave}
            title="שמירת הערכת תפקוד התנהגותי"
          >
            <Save size={17} />
            <span>שמור התקדמות</span>
          </button>

          {/* Full Document Preview Toggle */}
          <button
            type="button"
            className="btn-preview-doc"
            onClick={() => setShowFullDocPreview((prev) => !prev)}
            title={showFullDocPreview ? 'חזרה לתצוגת עריכה' : 'תצוגת מסמך מלאה'}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 14px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              background: showFullDocPreview ? '#eff6ff' : '#ffffff',
              color: showFullDocPreview ? '#1d4ed8' : '#334155',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <FileText size={16} />
            <span>{showFullDocPreview ? 'חזרה לתצוגת עריכה' : 'תצוגת מסמך מלאה'}</span>
          </button>

          {/* Unified Export & Print Dropdown (matching teacher workspace) */}
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
                  <span>הדפס הערכת תפקוד</span>
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

          {/* Close Button */}
          {onGoBack && (
            <button
              type="button"
              className="btn-export-dropdown"
              onClick={onGoBack}
              title="חזרה לרשימת תלמידים"
            >
              <span>סגירה</span>
            </button>
          )}
        </div>
      </header>

      {isReportLocked && (
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
            מסמך זה נעול לעריכה{report.lockedBy ? ` על ידי ${report.lockedBy}` : ''}. כדי לערוך, לחצי על כפתור ״מסמך נעול״ בסרגל הפעולות.
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
              📄 תצוגת מסמך מלאה: הערכת תפקוד התנהגותי
            </h3>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
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
              __html: buildBehaviorAssessmentPrintHtml(
                { ...student, ...studentDetails, behaviorAssessment: report },
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
        disabled={isReportLocked}
        onMergeStaffFeedback={handleMergeStaffFeedback}
        titlePrefix="פרטי התלמיד והמסגרת החינוכית"
      />

      {/* AI Assistant Modal */}
      {showAiModal && (
        <div
          className="behavior-ai-modal-backdrop"
          onClick={() => !isAiGenerating && setShowAiModal(false)}
        >
          <div className="behavior-ai-modal" onClick={(e) => e.stopPropagation()}>
            <div className="behavior-ai-modal-header">
              <h3 className="behavior-ai-modal-title">
                <Sparkles size={20} color="#7c65b8" />
                <span>ניסוח דוח הערכה בעזרת בינה מלאכותית</span>
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
            <p
              style={{
                margin: 0,
                fontSize: '0.875rem',
                color: 'var(--text-muted, #5c6f8c)'
              }}
            >
              הדבק כאן תיאור חופשי של המקרה, תצפיות גולמיות או נקודות מתוך שיחות עם הצוות,
              והמערכת תנתח ותמלא את כל מקטעי הדוח באופן מקצועי.
            </p>
            <textarea
              className="behavior-textarea"
              style={{ minHeight: '140px' }}
              value={aiPromptNotes}
              onChange={(e) => setAiPromptNotes(e.target.value)}
              placeholder="למשל: התלמיד יוצא מהכיתה כשמבקשים ממנו לפתוח חוברת חשבון, זה קורה כמעט כל יום בעיקר בשיעור שני. כשהוא יוצא הצוות הולך אחריו למסדרון ומנסה להרגיע אותו..."
              disabled={isAiGenerating}
            />
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
                onClick={handleRunFullAiDraft}
                disabled={isAiGenerating || !aiPromptNotes.trim()}
              >
                {isAiGenerating ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Sparkles size={16} />
                )}
                <span>{isAiGenerating ? 'מנתח ומנסח...' : 'יצירת טיוטת דוח'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pedagogical Feed, Voice Capture & Diagnostic Documents Section */}
      <section className="behavior-card" style={{ marginBottom: '1.25rem' }}>
        <div
          className="behavior-card-header"
          onClick={() => setIsPedagogicalFeedOpen((prev) => !prev)}
          style={{ cursor: 'pointer', userSelect: 'none' }}
        >
          <div className="behavior-card-title-wrap">
            <span className="behavior-section-badge" style={{ background: '#0d9488', color: '#ffffff' }}>
              <Sparkles size={14} />
            </span>
            <h2 className="behavior-card-title">ציר תובנות פדגוגי ומסמכי רקע</h2>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569', background: '#f1f5f9', border: '1px solid #e2e8f0', padding: '2px 9px', borderRadius: '999px' }}>
              {activeSnippets.length} תובנות ומסמכים
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }} onClick={(e) => e.stopPropagation()}>
            <ParentVoiceControl
              student={student}
              currentUser={currentUser}
              disabled={isReportLocked}
              mode="behavior"
              onMerge={handleMergeParentVoice}
            />
            <button
              type="button"
              className="btn-collapse-toggle-32"
              onClick={() => setIsPedagogicalFeedOpen((prev) => !prev)}
              aria-label={isPedagogicalFeedOpen ? 'כיווץ ציר תובנות' : 'הרחבת ציר תובנות'}
            >
              {isPedagogicalFeedOpen ? <Minus size={16} /> : <Plus size={16} />}
            </button>
          </div>
        </div>

        {isPedagogicalFeedOpen && (
          <div className="behavior-card-body">
            <p style={{ margin: '0 0 12px 0', fontSize: '0.85rem', color: '#64748b' }}>
              איסוף תצפיות יומיומיות, הקלטות קוליות, חוות דעת מקצועיות ומסמכי אבחון. כל המידע המצטבר מוזן ישירות כהקשר למנוע הבינה המלאכותית בעת ניסוח הדוח.
            </p>
            <PedagogicalFeed
              snippets={activeSnippets}
              onAddSnippet={handleAddSnippet}
              onUpdateSnippet={handleUpdateSnippet}
              onRemoveSnippet={handleRemoveSnippet}
              onOpenUploadModal={() => setShowDiagnosticIntakeModal(true)}
              onTriggerAiAnalysis={(overrideSnippets) => {
                if (overrideSnippets) {
                  setActiveSnippets(overrideSnippets);
                }
                setShowAiModal(true);
              }}
              isAnalyzing={isAiGenerating}
              isLocked={isReportLocked}
              currentUserName={currentUser?.name}
            />
          </div>
        )}
      </section>

      {/* Diagnostic Intake Modal */}
      {showDiagnosticIntakeModal && (
        <DiagnosticIntakeModal
          formData={{
            id: student.id,
            name: student.name,
            gender: (student as any).gender || 'boy',
            pedagogicalSnippets: activeSnippets
          }}
          isOpen={showDiagnosticIntakeModal}
          onApplyIntake={(_updated, newSnippet) => {
            if (newSnippet) {
              setActiveSnippets((prev) => addSnippet(prev, newSnippet));
              setIsDirty(true);
            }
            setShowDiagnosticIntakeModal(false);
          }}
          onClose={() => setShowDiagnosticIntakeModal(false)}
          authorName={currentUser?.name}
        />
      )}

      {/* Section 1: פרטי רקע והערכה */}
      <section className="behavior-card">
        <div className="behavior-card-header" onClick={() => toggleSection('background')}>
          <div className="behavior-card-title-wrap">
            <span className="behavior-section-badge">1</span>
            <h2 className="behavior-card-title">פרטי רקע והערכה</h2>
          </div>
          <button
            type="button"
            className="btn-collapse-toggle-32"
            aria-label={openSections.background ? 'כיווץ מקטע' : 'הרחבת מקטע'}
          >
            {openSections.background ? <Minus size={16} /> : <Plus size={16} />}
          </button>
        </div>

        {openSections.background && (
          <div className="behavior-card-body">
            <div className="behavior-form-grid-2">
              <div className="behavior-field-group">
                <label className="behavior-field-label">שם מנתח או מעריך ההתנהגות</label>
                <input
                  type="text"
                  className="behavior-input"
                  disabled={isReportLocked}
                  value={report.assessorName || ''}
                  onChange={(e) => handleFieldChange('assessorName', e.target.value)}
                  placeholder="למשל: דנה כהן"
                />
              </div>

              <div className="behavior-field-group">
                <label className="behavior-field-label">תאריך ביצוע ההערכה</label>
                <input
                  type="date"
                  className="behavior-input"
                  disabled={isReportLocked}
                  value={report.assessmentDate || ''}
                  onChange={(e) => handleFieldChange('assessmentDate', e.target.value)}
                />
              </div>
            </div>

            <div className="behavior-field-group">
              <label className="behavior-field-label">
                רקע חינוכי, התפתחותי ומשתנים סביבתיים
              </label>
              <textarea
                className="behavior-textarea"
                rows={3}
                disabled={isReportLocked}
                value={report.backgroundInfo || ''}
                onChange={(e) => handleFieldChange('backgroundInfo', e.target.value)}
                placeholder="פירוט תנאים סביבתיים, דפוסי שינה, תרופות, שינויים במערכת ומקורות מידע שנאספו..."
              />
            </div>
          </div>
        )}
      </section>

      {/* Section 2: הגדרת התנהגויות יעד */}
      <section className="behavior-card">
        <div className="behavior-card-header" onClick={() => toggleSection('targets')}>
          <div className="behavior-card-title-wrap">
            <span className="behavior-section-badge">2</span>
            <h2 className="behavior-card-title">הגדרת התנהגויות יעד</h2>
          </div>
          <button
            type="button"
            className="btn-collapse-toggle-32"
            aria-label={openSections.targets ? 'כיווץ מקטע' : 'הרחבת מקטע'}
          >
            {openSections.targets ? <Minus size={16} /> : <Plus size={16} />}
          </button>
        </div>

        {openSections.targets && (
          <div className="behavior-card-body">
            {report.targetBehaviors.length === 0 ? (
              <div className="behavior-empty-box">
                טרם הוגדרו התנהגויות יעד. לחץ על הכפתור מטה להוספת התנהגות ראשונה.
              </div>
            ) : (
              <div className="behavior-targets-list">
                {report.targetBehaviors.map((target, idx) => (
                  <div key={target.id || `target-${idx}`} className="behavior-target-row">
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
                    <button
                      type="button"
                      disabled={isReportLocked}
                      className="btn-collapse-toggle-32"
                      onClick={() => handleRemoveTargetBehavior(target.id)}
                      title="מחיקת התנהגות יעד"
                    >
                      <Trash2 size={15} color={isReportLocked ? '#94a3b8' : '#d9534f'} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {!showAddTargetForm ? (
              <button
                type="button"
                disabled={isReportLocked}
                className="btn-behavior-action btn-behavior-secondary"
                onClick={() => setShowAddTargetForm(true)}
              >
                <Plus size={16} />
                <span>הוספת התנהגות יעד</span>
              </button>
            ) : (
              <form
                onSubmit={handleAddTargetBehavior}
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
                  הוספת התנהגות יעד חדשה
                </h4>
                <div className="behavior-form-grid-2">
                  <div className="behavior-field-group">
                    <label className="behavior-field-label">שם ההתנהגות</label>
                    <input
                      type="text"
                      className="behavior-input"
                      value={newTargetName}
                      onChange={(e) => setNewTargetName(e.target.value)}
                      placeholder="למשל: עזיבת מקום ללא אישור"
                      required
                    />
                  </div>
                  <div className="behavior-field-group">
                    <label className="behavior-field-label">מדד מדידה</label>
                    <select
                      className="behavior-select"
                      value={newTargetType}
                      onChange={(e) =>
                        setNewTargetType(e.target.value as BehaviorMeasurementType)
                      }
                    >
                      <option value="frequency">תדירות מופעים</option>
                      <option value="duration">משך זמן בדקות</option>
                      <option value="interval">דגימת זמנים</option>
                    </select>
                  </div>
                </div>

                <div className="behavior-field-group">
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '4px'
                    }}
                  >
                    <label className="behavior-field-label">הגדרה אופרציונלית מפורטת</label>
                    <button
                      type="button"
                      className="btn-behavior-inline-ai"
                      onClick={handleRefineTargetDefinition}
                      disabled={
                        isRefiningTarget || (!newTargetDef.trim() && !newTargetName.trim())
                      }
                      title="דיוק הגדרה אופרציונלית בעזרת בינה מלאכותית"
                    >
                      {isRefiningTarget ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        <Sparkles size={13} />
                      )}
                      <span>דיוק הגדרה בבינה מלאכותית</span>
                    </button>
                  </div>
                  <textarea
                    className="behavior-textarea"
                    rows={2}
                    value={newTargetDef}
                    onChange={(e) => setNewTargetDef(e.target.value)}
                    placeholder="תיאור התנהגותי מוחשי, אובייקטיבי ובר-מדידה של מה שהתלמיד עושה..."
                  />
                </div>

                <div className="behavior-field-group" style={{ maxWidth: '200px' }}>
                  <label className="behavior-field-label">יעד מספרי רצוי</label>
                  <input
                    type="number"
                    className="behavior-input"
                    value={newTargetGoal}
                    onChange={(e) => setNewTargetGoal(e.target.value)}
                    placeholder="למשל: 1"
                  />
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <button
                    type="submit"
                    className="btn-behavior-action btn-behavior-primary"
                  >
                    <span>אישור והוספה</span>
                  </button>
                  <button
                    type="button"
                    className="btn-behavior-action btn-behavior-secondary"
                    onClick={() => setShowAddTargetForm(false)}
                  >
                    <span>ביטול</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </section>

      {/* Section 3: נתוני קו בסיס ומדדי מדידה */}
      <section className="behavior-card">
        <div className="behavior-card-header" onClick={() => toggleSection('baseline')}>
          <div className="behavior-card-title-wrap">
            <span className="behavior-section-badge">3</span>
            <h2 className="behavior-card-title">נתוני קו בסיס ומדדי מדידה</h2>
          </div>
          <button
            type="button"
            className="btn-collapse-toggle-32"
            aria-label={openSections.baseline ? 'כיווץ מקטע' : 'הרחבת מקטע'}
          >
            {openSections.baseline ? <Minus size={16} /> : <Plus size={16} />}
          </button>
        </div>

        {openSections.baseline && (
          <div className="behavior-card-body">
            {/* Automated Statistical Summary Banner */}
            <div className="baseline-stats-banner">
              <div className="baseline-stat-item">
                <span className="baseline-stat-label">מספר מדידות</span>
                <span className="baseline-stat-value">{baselineStats.count}</span>
              </div>
              <div className="baseline-stat-item">
                <span className="baseline-stat-label">ממוצע קו בסיס</span>
                <span className="baseline-stat-value">{baselineStats.average}</span>
              </div>
              <div className="baseline-stat-item">
                <span className="baseline-stat-label">ערך מינימום</span>
                <span className="baseline-stat-value">{baselineStats.min}</span>
              </div>
              <div className="baseline-stat-item">
                <span className="baseline-stat-label">ערך מקסימום</span>
                <span className="baseline-stat-value">{baselineStats.max}</span>
              </div>
            </div>

            {report.baselineData.length === 0 ? (
              <div className="behavior-empty-box">
                טרם הוזנו נתוני קו בסיס. מומלץ להזין 5 עד 10 מדידות לקבלת תמונת מצב מהימנה.
              </div>
            ) : (
              <div className="baseline-table-wrapper">
                <table className="baseline-data-table">
                  <thead>
                    <tr>
                      <th>תאריך</th>
                      <th>שיעור או פעילות</th>
                      <th>ערך שנמדד</th>
                      <th>הערות</th>
                      <th style={{ width: '40px' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.baselineData.map((point, idx) => (
                      <tr key={point.id || `pt-${idx}`}>
                        <td>{point.date}</td>
                        <td>{point.sessionOrPeriod}</td>
                        <td>
                          <strong>{point.value}</strong>
                        </td>
                        <td>{point.notes || '—'}</td>
                        <td>
                          <button
                            type="button"
                            disabled={isReportLocked}
                            className="btn-collapse-toggle-32"
                            onClick={() => handleRemoveBaselinePoint(point.id)}
                            title="מחיקת רשומת קו בסיס"
                          >
                            <Trash2 size={14} color={isReportLocked ? '#94a3b8' : '#d9534f'} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {!showAddBaselineForm ? (
              <button
                type="button"
                disabled={isReportLocked}
                className="btn-behavior-action btn-behavior-secondary"
                onClick={() => setShowAddBaselineForm(true)}
              >
                <Plus size={16} />
                <span>הוספת מדידת קו בסיס</span>
              </button>
            ) : (
              <form
                onSubmit={handleAddBaselinePoint}
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
                  רישום מדידת קו בסיס
                </h4>
                <div className="behavior-form-grid-2">
                  <div className="behavior-field-group">
                    <label className="behavior-field-label">תאריך המדידה</label>
                    <input
                      type="date"
                      className="behavior-input"
                      value={newBaselineDate}
                      onChange={(e) => setNewBaselineDate(e.target.value)}
                      required
                    />
                  </div>
                  <div className="behavior-field-group">
                    <label className="behavior-field-label">שיעור, מועד או פעילות</label>
                    <input
                      type="text"
                      className="behavior-input"
                      value={newBaselinePeriod}
                      onChange={(e) => setNewBaselinePeriod(e.target.value)}
                      placeholder="למשל: שיעור 2, הפסקת עשר"
                      required
                    />
                  </div>
                </div>

                <div className="behavior-form-grid-2">
                  <div className="behavior-field-group">
                    <label className="behavior-field-label">
                      ערך מספרי שנמדד (תדירות או דקות)
                    </label>
                    <input
                      type="number"
                      step="any"
                      className="behavior-input"
                      value={newBaselineValue}
                      onChange={(e) => setNewBaselineValue(e.target.value)}
                      placeholder="למשל: 5"
                      required
                    />
                  </div>
                  <div className="behavior-field-group">
                    <label className="behavior-field-label">הערות על ההתרחשות</label>
                    <input
                      type="text"
                      className="behavior-input"
                      value={newBaselineNotes}
                      onChange={(e) => setNewBaselineNotes(e.target.value)}
                      placeholder="נסיבות חריגות או אירוע מיוחד"
                    />
                  </div>
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
                    onClick={() => setShowAddBaselineForm(false)}
                  >
                    <span>ביטול</span>
                  </button>
                </div>
              </form>
            )}

            {/* Visual Chart 1: Baseline Frequency Bar Chart */}
            <div style={{ marginTop: '24px' }}>
              <BaselineFrequencyBarChart data={report.baselineData} />
            </div>
          </div>
        )}
      </section>

      {/* Section 4: ניתוח תנאים מקדימים והשערת תפקוד */}
      <section className="behavior-card">
        <div className="behavior-card-header" onClick={() => toggleSection('functionAnalysis')}>
          <div className="behavior-card-title-wrap">
            <span className="behavior-section-badge">4</span>
            <h2 className="behavior-card-title">ניתוח תנאים מקדימים והשערת תפקוד</h2>
          </div>
          <button
            type="button"
            className="btn-collapse-toggle-32"
            aria-label={openSections.functionAnalysis ? 'כיווץ מקטע' : 'הרחבת מקטע'}
          >
            {openSections.functionAnalysis ? <Minus size={16} /> : <Plus size={16} />}
          </button>
        </div>

        {openSections.functionAnalysis && (
          <div className="behavior-card-body">
            <div className="behavior-field-group" style={{ marginBottom: '1.25rem' }}>
              <label className="behavior-field-label">
                ניתוח אירועים מקדימים וטריגרים מפעילים
              </label>
              <textarea
                className="behavior-textarea"
                rows={3}
                disabled={isReportLocked}
                value={report.antecedentAnalysis || ''}
                onChange={(e) => handleFieldChange('antecedentAnalysis', e.target.value)}
                placeholder="זיהוי זמנים מועדים, מעברים בין פעילויות, דרישות לימודיות מורכבות, או גורמים סביבתיים..."
              />
            </div>

            <div className="behavior-field-group" style={{ marginBottom: '1.25rem' }}>
              <label className="behavior-field-label">תפקיד ההתנהגות המרכזי שזוהה</label>
              <select
                className="behavior-select"
                disabled={isReportLocked}
                value={report.mainHypothesizedFunction || 'escape'}
                onChange={(e) =>
                  handleFieldChange(
                    'mainHypothesizedFunction',
                    e.target.value as BehaviorFunction
                  )
                }
              >
                <option value="escape">הימנעות או בריחה ממטלה</option>
                <option value="attention">השגת תשומת לב</option>
                <option value="tangible">השגת חפץ או פעילות</option>
                <option value="sensory">ויסות או גירוי חושי</option>
                <option value="other">אחר או משולב</option>
              </select>
            </div>

            {/* Visual Chart 2: Hypothesized Function Horizontal Bar Chart */}
            <div style={{ marginTop: '16px', marginBottom: '1.25rem' }}>
              <FunctionDistributionHorizontalBarChart
                mainFunction={report.mainHypothesizedFunction}
                totalEvents={
                  report.baselineData.length > 0
                    ? report.baselineData.reduce((acc, b) => acc + (Number(b.value) || 0), 0)
                    : 38
                }
              />
            </div>

            <div className="behavior-field-group">
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '4px'
                }}
              >
                <label className="behavior-field-label">
                  ניסוח מילולי של השערת התפקוד המנומקת
                </label>
                <button
                  type="button"
                  className="btn-behavior-inline-ai"
                  onClick={handleFormulateHypothesis}
                  disabled={isFormulatingHypothesis || isReportLocked}
                  title="ניסוח משפט השערה בעזרת בינה מלאכותית"
                >
                  {isFormulatingHypothesis ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : (
                    <Sparkles size={13} />
                  )}
                  <span>ניסוח משפט השערה בבינה מלאכותית</span>
                </button>
              </div>
              <textarea
                className="behavior-textarea"
                rows={3}
                disabled={isReportLocked}
                value={report.functionalHypothesisNarrative || ''}
                onChange={(e) =>
                  handleFieldChange('functionalHypothesisNarrative', e.target.value)
                }
                placeholder="ניסוח משפט ההשערה: כאשר מתרחש [אירוע מקדים], התלמיד מגיב ב-[התנהגות], על מנת להשיג/להימנע מ-[תפקיד]..."
              />
            </div>
          </div>
        )}
      </section>

      {/* Section 5: עוגנים והמלצות לתוכנית ההתערבות */}
      <section className="behavior-card">
        <div className="behavior-card-header" onClick={() => toggleSection('recommendations')}>
          <div className="behavior-card-title-wrap">
            <span className="behavior-section-badge">5</span>
            <h2 className="behavior-card-title">עוגנים והמלצות לתוכנית ההתערבות</h2>
          </div>
          <button
            type="button"
            className="btn-collapse-toggle-32"
            aria-label={openSections.recommendations ? 'כיווץ מקטע' : 'הרחבת מקטע'}
          >
            {openSections.recommendations ? <Minus size={16} /> : <Plus size={16} />}
          </button>
        </div>

        {openSections.recommendations && (
          <div className="behavior-card-body">
            <div className="behavior-field-group">
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '4px'
                }}
              >
                <label className="behavior-field-label">
                  המלצות ראשוניות להתאמות סביבתיות ולהתנהגויות חלופיות
                </label>
                <button
                  type="button"
                  className="btn-behavior-inline-ai"
                  onClick={handleSuggestRecommendations}
                  disabled={isSuggestingRecommendations || isReportLocked}
                  title="הצעת עוגנים והמלצות בעזרת בינה מלאכותית"
                >
                  {isSuggestingRecommendations ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : (
                    <Sparkles size={13} />
                  )}
                  <span>הצעת עוגנים בבינה מלאכותית</span>
                </button>
              </div>
              <textarea
                className="behavior-textarea"
                rows={4}
                disabled={isReportLocked}
                value={report.initialRecommendations || ''}
                onChange={(e) =>
                  handleFieldChange('initialRecommendations', e.target.value)
                }
                placeholder="עוגנים לבניית תוכנית ההתערבות: שינויי סביבה מומלצים, התנהגות חלופית תואמת תפקוד להוראה, וחיזוקים בעלי ערך מניע..."
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
        reportTitle="הערכת תפקוד התנהגותי"
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
