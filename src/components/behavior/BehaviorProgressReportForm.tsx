import { useState, useMemo, useEffect, useRef } from 'react';
import {
  Save,
  Printer,
  Plus,
  Trash2,
  Sparkles,
  Loader2,
  Lock,
  Unlock,
  FileDown,
  Check,
  Mail,
  FileText,
  RefreshCw,
  TrendingUp,
  ChevronDown,
  Eye,
  EyeOff
} from 'lucide-react';
import {
  BehaviorProgressPeriod,
  BehaviorProgressReport,
  BehaviorTargetProgressSummary,
  ReplacementSkillAcquisitionSummary,
  StudentProfile
} from '../../domain/types';
import {
  calculateBaselineStats,
  calculateTrackingStats,
  createEmptyBehaviorProgressReport,
  getBehaviorProgressPeriodLabelHebrew
} from '../../domain/behaviorAnalysis';
import BehaviorStudentDetailsCard, { type BehaviorStudentDetailsData } from './BehaviorStudentDetailsCard';
import {
  BehaviorHourlyHeatmapChart,
  BehaviorAbcSequenceTable,
  BehaviorDurationIntensityChart,
  BehaviorReplacementLearningCurveChart,
  BehaviorStaffFidelityMeter,
  ProgressMonitoringDualLineChart
} from './BehaviorCharts';
import {
  buildBehaviorProgressReportWordDocumentHtml,
  buildBehaviorProgressReportPrintHtml,
  openHtmlPrintWindow,
  getSafeReportFilename
} from '../../export/wordAndPrintBuilders';
import { generatePdfBlobFromHtml } from '../../emailService';
import SendReportEmailModal from '../modals/SendReportEmailModal';
import './BehaviorAssessmentForm.css';
import './BehaviorInterventionPlanForm.css';
import './BehaviorProgressReportForm.css';

export interface BehaviorProgressReportFormProps {
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

export default function BehaviorProgressReportForm({
  student,
  allStudents = [],
  currentUser,
  onSaveStudentPlan,
  onGoBack,
  onDraftStateChange
}: BehaviorProgressReportFormProps) {
  // Period Selection: mid_year, end_year, or periodic
  const [selectedPeriod, setSelectedPeriod] = useState<BehaviorProgressPeriod>(() => {
    return student.behaviorProgressReport?.period || 'mid_year';
  });

  // Initialize report from student or clean template
  const [report, setReport] = useState<BehaviorProgressReport>(() => {
    if (student.behaviorProgressReport) {
      return {
        ...createEmptyBehaviorProgressReport(student.behaviorProgressReport.period || 'mid_year'),
        ...student.behaviorProgressReport,
        targetBehaviorsProgress: student.behaviorProgressReport.targetBehaviorsProgress || [],
        replacementBehaviorsAcquisition: student.behaviorProgressReport.replacementBehaviorsAcquisition || []
      };
    }

    return {
      ...createEmptyBehaviorProgressReport('mid_year'),
      assessorName: currentUser?.name || student.behaviorPlan?.analystName || student.behaviorAssessment?.assessorName || '',
      reportDate: new Date().toISOString().split('T')[0]
    };
  });

  // Student details state for header & metadata
  const [studentDetails, setStudentDetails] = useState<BehaviorStudentDetailsData>(() => ({
    id: student.id,
    name: student.name || '',
    idNumber: student.idNumber || '',
    birthDate: student.birthDate || '',
    educationalFramework: student.educationalFramework || '',
    schoolYear: student.schoolYear || '',
    reportDate: student.reportDate || report.reportDate || new Date().toISOString().split('T')[0],
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
  };

  // UI state
  const [showFullDocPreview, setShowFullDocPreview] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [hideDetailsOnExport, setHideDetailsOnExport] = useState(false);
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const [showBottomExportDropdown, setShowBottomExportDropdown] = useState(false);
  const [saveToast, setSaveToast] = useState('');
  const [isAiDrafting, setIsAiDrafting] = useState(false);

  const exportDropdownRef = useRef<HTMLDivElement>(null);
  const bottomExportDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (exportDropdownRef.current && !exportDropdownRef.current.contains(e.target as Node)) {
        setShowExportDropdown(false);
      }
      if (bottomExportDropdownRef.current && !bottomExportDropdownRef.current.contains(e.target as Node)) {
        setShowBottomExportDropdown(false);
      }
    };
    if (showExportDropdown || showBottomExportDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showExportDropdown, showBottomExportDropdown]);

  // Baseline and ongoing tracking data from student
  const baselineData = useMemo(() => student.behaviorAssessment?.baselineData || [], [student.behaviorAssessment?.baselineData]);
  const ongoingTracking = useMemo(() => student.behaviorPlan?.ongoingTracking || [], [student.behaviorPlan?.ongoingTracking]);
  const behaviorObservations = useMemo(() => student.behaviorObservations || [], [student.behaviorObservations]);

  const baselineStats = useMemo(() => calculateBaselineStats(baselineData), [baselineData]);
  const trackingStats = useMemo(() => calculateTrackingStats(ongoingTracking, baselineStats.average), [ongoingTracking, baselineStats.average]);

  // Synchronize draft state to prevent losing unsaved work
  useEffect(() => {
    onDraftStateChange?.({
      isDirty: true,
      draftData: { ...report, studentDetails }
    });
  }, [report, studentDetails, onDraftStateChange]);

  // Handle switching periods
  const handlePeriodChange = (newPeriod: BehaviorProgressPeriod) => {
    setSelectedPeriod(newPeriod);
    setReport((prev) => ({
      ...prev,
      period: newPeriod,
      reviewPeriodLabel: newPeriod === 'mid_year'
        ? 'מחצית ראשונה (ספטמבר - ינואר)'
        : newPeriod === 'end_year'
        ? 'סיכום שנתי מלא (ספטמבר - יוני)'
        : 'דוח מעקב תקופתי'
    }));
  };

  // Pull latest tracking data and target behaviors into the report
  const handlePullTrackingData = () => {
    const targets: BehaviorTargetProgressSummary[] = [];
    const sourceTargets = student.behaviorPlan?.targetBehaviors || student.behaviorAssessment?.targetBehaviors || [];

    if (sourceTargets.length > 0) {
      sourceTargets.forEach((t) => {
        const bAvg = Number(t.baselineAverage) || baselineStats.average || 0;
        const curAvg = trackingStats.averageOccurrences || 0;
        const reduction = bAvg > 0 ? Math.round(((bAvg - curAvg) / bAvg) * 100) : 0;
        const trend = reduction > 10 ? 'improving' : reduction < -10 ? 'deteriorating' : 'stable';

        targets.push({
          id: t.id || 'target_' + Math.random(),
          behaviorName: t.name || 'התנהגות מטרה',
          baselineAverage: bAvg,
          currentAverage: curAvg,
          reductionPercent: reduction,
          trend,
          statusNotes: `נרשמו ${trackingStats.totalOccurrences} מופעים במעקב השוטף לאורך ${ongoingTracking.length} מפגשי ניטור.`
        });
      });
    } else {
      targets.push({
        id: 'target_default',
        behaviorName: 'התנהגות מטרה כללית',
        baselineAverage: baselineStats.average,
        currentAverage: trackingStats.averageOccurrences,
        reductionPercent: trackingStats.reductionPercentage,
        trend: trackingStats.reductionPercentage > 0 ? 'improving' : 'stable',
        statusNotes: `ממוצע קו בסיס עמד על ${baselineStats.average}. במעקב השוטף הממוצע הוא ${trackingStats.averageOccurrences}.`
      });
    }

    const replacements: ReplacementSkillAcquisitionSummary[] = [];
    const sourceReplacements = student.behaviorPlan?.replacementBehaviors || [];
    if (sourceReplacements.length > 0) {
      sourceReplacements.forEach((r) => {
        replacements.push({
          id: 'rep_' + Math.random(),
          skillName: r.replacementSkill || 'מיומנות חלופית',
          masteryLevel: trackingStats.replacementSuccessRate >= 70 ? 'עצמאי לחלוטין' : trackingStats.replacementSuccessRate >= 40 ? 'תיווך חלקי' : 'תזכורת מילולית',
          acquisitionNotes: `שיעור שימוש עצמאי עומד על ${trackingStats.replacementSuccessRate}% מכלל מפגשי הניטור.`
        });
      });
    }

    setReport((prev) => ({
      ...prev,
      targetBehaviorsProgress: targets,
      replacementBehaviorsAcquisition: replacements
    }));

    setSaveToast('נתוני המעקב והמדדים נמשכו בהצלחה');
    setTimeout(() => setSaveToast(''), 3000);
  };

  // AI draft assistant for executive summary
  const handleGenerateAiExecutiveSummary = () => {
    setIsAiDrafting(true);
    setTimeout(() => {
      const studentName = studentDetails.name || 'התלמיד';
      const periodName = getBehaviorProgressPeriodLabelHebrew(selectedPeriod);
      const reductionText = trackingStats.reductionPercentage > 0
        ? `נרשמה מגמת הפחתה ברורה של ${trackingStats.reductionPercentage}% בהתנהגויות המטרה בהשוואה לנתוני קו הבסיס.`
        : `התנהגויות המטרה נשמרות ברמה יציבה, ודרוש חידוד של מערך החיזוקים והמענים הסביבתיים.`;

      const replacementText = trackingStats.replacementSuccessRate > 0
        ? `התלמיד מפגין שימוש גובר במיומנויות החלופיות בשיעור הצלחה של כ-${trackingStats.replacementSuccessRate}%.`
        : `רכישת ההתנהגות החלופית נמצאת בתחילתה ומומלץ להגביר את התרגול המתווך.`;

      const draft = `במהלך ${periodName}, נערך מעקב שיטתי ומובנה אחר תפקודו של ${studentName} בכיתה ובמרחבי בית הספר. ${reductionText} ${replacementText} שיתוף הפעולה של צוות ההוראה בעקביות היישום סייע לביסוס סביבה בטוחה, מובנית ומעצימה.`;

      setReport((prev) => ({
        ...prev,
        executiveSummary: draft
      }));
      setIsAiDrafting(false);
      setSaveToast('תמצית המנהלים נוסחה בהצלחה');
      setTimeout(() => setSaveToast(''), 3000);
    }, 400);
  };

  // Add & remove rows
  const handleAddTargetRow = () => {
    setReport((prev) => ({
      ...prev,
      targetBehaviorsProgress: [
        ...(prev.targetBehaviorsProgress || []),
        {
          id: 'target_' + Date.now(),
          behaviorName: '',
          baselineAverage: 0,
          currentAverage: 0,
          reductionPercent: 0,
          trend: 'stable',
          statusNotes: ''
        }
      ]
    }));
  };

  const handleRemoveTargetRow = (id?: string) => {
    setReport((prev) => ({
      ...prev,
      targetBehaviorsProgress: (prev.targetBehaviorsProgress || []).filter((t) => t.id !== id)
    }));
  };

  const handleUpdateTargetRow = (index: number, field: keyof BehaviorTargetProgressSummary, value: any) => {
    setReport((prev) => {
      const list = [...(prev.targetBehaviorsProgress || [])];
      list[index] = { ...list[index], [field]: value };
      return { ...prev, targetBehaviorsProgress: list };
    });
  };

  const handleAddReplacementRow = () => {
    setReport((prev) => ({
      ...prev,
      replacementBehaviorsAcquisition: [
        ...(prev.replacementBehaviorsAcquisition || []),
        {
          id: 'rep_' + Date.now(),
          skillName: '',
          masteryLevel: 'בתהליך למידה',
          acquisitionNotes: ''
        }
      ]
    }));
  };

  const handleRemoveReplacementRow = (id?: string) => {
    setReport((prev) => ({
      ...prev,
      replacementBehaviorsAcquisition: (prev.replacementBehaviorsAcquisition || []).filter((r) => r.id !== id)
    }));
  };

  const handleUpdateReplacementRow = (index: number, field: keyof ReplacementSkillAcquisitionSummary, value: any) => {
    setReport((prev) => {
      const list = [...(prev.replacementBehaviorsAcquisition || [])];
      list[index] = { ...list[index], [field]: value };
      return { ...prev, replacementBehaviorsAcquisition: list };
    });
  };

  // Save report
  const handleSave = () => {
    const updatedStudent: StudentProfile = {
      ...student,
      name: studentDetails.name,
      idNumber: studentDetails.idNumber,
      birthDate: studentDetails.birthDate,
      educationalFramework: studentDetails.educationalFramework,
      schoolYear: studentDetails.schoolYear,
      address: studentDetails.address,
      phone: studentDetails.phone,
      schoolName: studentDetails.schoolName,
      gradeClass: studentDetails.gradeClass,
      educatorName: studentDetails.educatorName,
      assistantName: studentDetails.assistantName,
      educationalCounselor: studentDetails.educationalCounselor,
      supportTeacher: studentDetails.supportTeacher,
      psychologistName: studentDetails.psychologistName,
      otherStaff: studentDetails.otherStaff,
      behaviorProgressReport: {
        ...report,
        updatedAt: new Date().toISOString()
      },
      updatedAt: new Date().toISOString()
    };

    onSaveStudentPlan(updatedStudent);
    setSaveToast('דוח ההתקדמות נשמר בהצלחה');
    setTimeout(() => setSaveToast(''), 3000);
  };

  // Toggle lock
  const handleToggleLock = () => {
    const isCurrentlyLocked = report.isLocked;
    const updated = {
      ...report,
      isLocked: !isCurrentlyLocked,
      lockedAt: !isCurrentlyLocked ? new Date().toISOString() : undefined,
      lockedBy: !isCurrentlyLocked ? currentUser?.name || 'מנתחת התנהגות' : undefined
    };
    setReport(updated);

    const updatedStudent: StudentProfile = {
      ...student,
      behaviorProgressReport: updated
    };
    onSaveStudentPlan(updatedStudent);
    setSaveToast(isCurrentlyLocked ? 'הדוח נפתח לעריכה' : 'הדוח ננעל בהצלחה');
    setTimeout(() => setSaveToast(''), 3000);
  };

  // Export to Word
  const createWordBlob = () => {
    const mergedData = {
      ...student,
      ...studentDetails,
      behaviorProgressReport: report,
      ongoingTracking,
      behaviorObservations,
      baselineData
    };
    const wordHtml = buildBehaviorProgressReportWordDocumentHtml(mergedData, hideDetailsOnExport);
    const blob = new Blob(['\ufeff', wordHtml], {
      type: 'application/msword;charset=utf-8'
    });
    const filename = getSafeReportFilename(mergedData, hideDetailsOnExport, 'doc', 'behavior_progress');
    return { blob, filename, mimeType: 'application/msword', htmlContent: wordHtml };
  };

  const createPdfBlob = async () => {
    const mergedData = {
      ...student,
      ...studentDetails,
      behaviorProgressReport: report,
      ongoingTracking,
      behaviorObservations,
      baselineData
    };
    const printHtml = buildBehaviorProgressReportPrintHtml(mergedData, hideDetailsOnExport);
    const filename = getSafeReportFilename(mergedData, hideDetailsOnExport, 'pdf', 'behavior_progress');
    const blob = await generatePdfBlobFromHtml(printHtml, filename, 'portrait');
    return { blob, filename, mimeType: 'application/pdf', htmlContent: printHtml };
  };

  const handleExportWord = () => {
    const { blob, filename } = createWordBlob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportPdf = async () => {
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

  // Print
  const handlePrint = () => {
    const mergedData = {
      ...student,
      ...studentDetails,
      behaviorProgressReport: report,
      ongoingTracking,
      behaviorObservations,
      baselineData
    };
    const html = buildBehaviorProgressReportPrintHtml(mergedData, hideDetailsOnExport);
    openHtmlPrintWindow(html);
  };

  const isLocked = Boolean(report.isLocked);

  return (
    <div className="progress-report-container" dir="rtl">
      {/* Save Toast Feedback */}
      {saveToast && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#0f172a',
            color: '#ffffff',
            padding: '10px 20px',
            borderRadius: '999px',
            fontSize: '0.9rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            zIndex: 1000
          }}
        >
          <Check size={16} style={{ color: '#22c55e' }} />
          <span>{saveToast}</span>
        </div>
      )}

      {/* Top Header Card - Exactly matching Image 1 & Teacher Workspace */}
      <header className="plan-form-header">
        <div className="plan-form-title-group">
          <div className="plan-form-icon-badge" style={{ background: '#eff6ff', color: '#2563eb' }}>
            <TrendingUp size={24} />
          </div>
          <div>
            <h1 className="plan-form-heading">דוח סיכום והערכת התקדמות התנהגותית</h1>
            <p className="plan-form-subheading">
              תלמיד: <strong>{studentDetails.name || student.name || 'ללא שם'}</strong>
              {studentDetails.educationalFramework || student.educationalFramework
                ? ` | ${studentDetails.educationalFramework || student.educationalFramework}`
                : ''}
            </p>
          </div>
        </div>

        <div className="plan-form-actions" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {saveToast && (
            <span
              className="save-toast-badge"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '6px 12px' }}
            >
              <Check size={14} />
              <span>{saveToast}</span>
            </span>
          )}

          {/* Yellow Lock / Unlock Button (matching Image 1) */}
          <div className="report-lock-toggle-wrapper">
            <button
              type="button"
              className={`btn-report-lock-icon ${isLocked ? 'locked' : 'unlocked'}`}
              onClick={handleToggleLock}
              aria-label={isLocked ? 'המסמך נעול לעריכה' : 'המסמך פתוח לעריכה'}
              title={isLocked ? 'המסמך נעול לעריכה - לחצי לפתיחה' : 'נעילת המסמך לעריכה'}
            >
              {isLocked ? <Lock size={19} /> : <Unlock size={19} />}
            </button>
            <div className="report-lock-hover-tooltip" role="tooltip">
              <div className="report-lock-tooltip-title">
                {isLocked ? '🔒 המסמך נעול לעריכה' : '🔓 המסמך פתוח לעריכה'}
              </div>
              <div className="report-lock-tooltip-body">
                {isLocked
                  ? 'המסמך נעול לעריכה. לחצי על הסמל לפתיחת הנעילה.'
                  : 'המסמך פתוח לעריכה. לחצי על הסמל לנעילת המסמך.'}
              </div>
            </div>
          </div>

          {/* Primary Save Button (matching Image 1) */}
          <button
            type="button"
            className="btn-save-progress"
            onClick={handleSave}
            title="שמירת דוח סיכום והערכת התקדמות התנהגותית"
            disabled={isLocked}
          >
            <Save size={17} />
            <span>שמור התקדמות</span>
          </button>

          {/* Full Document Preview Toggle (matching Image 1) */}
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
            <span>תצוגת מסמך מלאה</span>
          </button>

          {/* Unified Export & Print Dropdown (matching Image 1) */}
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
                  <span>הדפס דוח התקדמות</span>
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
                    handleExportWord();
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
                    await handleExportPdf();
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

          {/* Close Button (matching Image 1) */}
          {onGoBack && (
            <button
              type="button"
              className="btn-export-dropdown"
              onClick={onGoBack}
              title="סגירה"
            >
              <span>סגירה</span>
            </button>
          )}
        </div>
      </header>

      {/* Period Selection Bar */}
      <div className="progress-period-bar">
        <div className="progress-period-group">
          <span className="progress-period-label">תקופת הדוח:</span>
          <div className="progress-period-pill-box">
            <button
              type="button"
              onClick={() => handlePeriodChange('mid_year')}
              className={`progress-period-pill ${selectedPeriod === 'mid_year' ? 'active' : ''}`}
            >
              סיכום אמצע שנה
            </button>
            <button
              type="button"
              onClick={() => handlePeriodChange('end_year')}
              className={`progress-period-pill ${selectedPeriod === 'end_year' ? 'active' : ''}`}
            >
              סיכום סוף שנה
            </button>
            <button
              type="button"
              onClick={() => handlePeriodChange('periodic')}
              className={`progress-period-pill ${selectedPeriod === 'periodic' ? 'active' : ''}`}
            >
              דוח תקופתי
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={handlePullTrackingData}
          disabled={isLocked}
          className="btn-progress-pull"
        >
          <RefreshCw size={15} />
          <span>משיכת נתוני מעקב מעודכנים מתיק התלמיד</span>
        </button>
      </div>

      {/* Student Details and Team Card */}
      <BehaviorStudentDetailsCard
        studentData={studentDetails}
        onChangeField={handleStudentDetailChange}
        allStudents={allStudents}
        currentUser={currentUser}
        disabled={isLocked}
      />

      {/* Section 1: Report Metadata */}
      <div className="progress-card">
        <div className="progress-card-header">
          <div className="progress-card-title-wrap">
            <span className="progress-section-badge">1</span>
            <div>
              <h2 className="progress-card-title">פרטי הדוח והתקופה</h2>
              <p className="progress-card-subtitle">מועד הפקה, מנתחת עורכת וטווח תקופת המעקב</p>
            </div>
          </div>
        </div>
        <div className="progress-card-body">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
            <div>
              <label className="progress-field-label">תאריך עריכת הדוח:</label>
              <input
                type="date"
                className="progress-input"
                value={report.reportDate || ''}
                onChange={(e) => setReport((prev) => ({ ...prev, reportDate: e.target.value }))}
                disabled={isLocked}
              />
            </div>
            <div>
              <label className="progress-field-label">מנתחת התנהגות עורכת:</label>
              <input
                type="text"
                className="progress-input"
                value={report.assessorName || ''}
                onChange={(e) => setReport((prev) => ({ ...prev, assessorName: e.target.value }))}
                placeholder="שם מנתחת ההתנהגות"
                disabled={isLocked}
              />
            </div>
            <div>
              <label className="progress-field-label">הגדרת טווח התקופה:</label>
              <input
                type="text"
                className="progress-input"
                value={report.reviewPeriodLabel || ''}
                onChange={(e) => setReport((prev) => ({ ...prev, reviewPeriodLabel: e.target.value }))}
                placeholder="למשל: מחצית א׳ (ספטמבר - ינואר)"
                disabled={isLocked}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Section 2: Executive Summary */}
      <div className="progress-card">
        <div className="progress-card-header">
          <div className="progress-card-title-wrap">
            <span className="progress-section-badge">2</span>
            <div>
              <h2 className="progress-card-title">תמצית מנהלים והערכת התקדמות כללית</h2>
              <p className="progress-card-subtitle">סיכום איכותי של המגמות, ההישגים והאתגרים העיקריים</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleGenerateAiExecutiveSummary}
            disabled={isLocked || isAiDrafting}
            className="btn-progress-ai"
          >
            {isAiDrafting ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            <span>ניסוח תמצית מסייע בבינה מלאכותית</span>
          </button>
        </div>
        <div className="progress-card-body">
          <textarea
            className="progress-textarea"
            rows={4}
            value={report.executiveSummary || ''}
            onChange={(e) => setReport((prev) => ({ ...prev, executiveSummary: e.target.value }))}
            placeholder="תאר/י בקצרה את תמצית ההתקדמות, רמת ההיענות, מגמת התנהגויות המטרה ושילוב המיומנויות החלופיות..."
            disabled={isLocked}
          />
        </div>
      </div>

      {/* Section 3: Target Behaviors Progress Table */}
      <div className="progress-card">
        <div className="progress-card-header">
          <div className="progress-card-title-wrap">
            <span className="progress-section-badge">3</span>
            <div>
              <h2 className="progress-card-title">מעקב והתקדמות בהתנהגויות המטרה</h2>
              <p className="progress-card-subtitle">השוואת ממוצע קו הבסיס לביצועים בפועל בתקופת המעקב</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleAddTargetRow}
            disabled={isLocked}
            className="btn-progress-secondary"
            style={{ padding: '6px 12px', fontSize: '0.85rem' }}
          >
            <Plus size={14} />
            <span>הוסף שורת התנהגות</span>
          </button>
        </div>

        <div className="progress-card-body">
          {(!report.targetBehaviorsProgress || report.targetBehaviorsProgress.length === 0) ? (
            <div style={{ textAlign: 'center', padding: '24px', background: '#f8fafc', borderRadius: '10px', border: '1px dashed #cbd5e1' }}>
              <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>
                טרם הוגדרו נתוני התקדמות. לחצו על "משיכת נתוני מעקב מעודכנים" לשאיבה אוטומטית, או הוסיפו שורה ידנית.
              </p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569' }}>
                    <th style={{ padding: '10px 12px', textAlign: 'right', minWidth: '160px' }}>התנהגות מטרה</th>
                    <th style={{ padding: '10px 12px', textAlign: 'center', width: '100px' }}>קו בסיס</th>
                    <th style={{ padding: '10px 12px', textAlign: 'center', width: '100px' }}>ממוצע נוכחי</th>
                    <th style={{ padding: '10px 12px', textAlign: 'center', width: '110px' }}>אחוז הפחתה</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right', minWidth: '220px' }}>הערות והערכת מגמה</th>
                    <th style={{ padding: '10px 12px', textAlign: 'center', width: '50px' }}>פעולות</th>
                  </tr>
                </thead>
                <tbody>
                  {report.targetBehaviorsProgress.map((row, idx) => (
                    <tr key={row.id || idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '8px' }}>
                        <input
                          type="text"
                          className="progress-input"
                          value={row.behaviorName}
                          onChange={(e) => handleUpdateTargetRow(idx, 'behaviorName', e.target.value)}
                          placeholder="שם התנהגות"
                          disabled={isLocked}
                        />
                      </td>
                      <td style={{ padding: '8px' }}>
                        <input
                          type="number"
                          step="0.1"
                          className="progress-input"
                          style={{ textAlign: 'center' }}
                          value={row.baselineAverage ?? ''}
                          onChange={(e) => handleUpdateTargetRow(idx, 'baselineAverage', Number(e.target.value))}
                          disabled={isLocked}
                        />
                      </td>
                      <td style={{ padding: '8px' }}>
                        <input
                          type="number"
                          step="0.1"
                          className="progress-input"
                          style={{ textAlign: 'center', fontWeight: 'bold' }}
                          value={row.currentAverage ?? ''}
                          onChange={(e) => handleUpdateTargetRow(idx, 'currentAverage', Number(e.target.value))}
                          disabled={isLocked}
                        />
                      </td>
                      <td style={{ padding: '8px', textAlign: 'center' }}>
                        <span
                          style={{
                            fontWeight: 700,
                            color: (row.reductionPercent || 0) > 0 ? '#16a34a' : '#dc2626'
                          }}
                        >
                          {row.reductionPercent != null ? `${row.reductionPercent}%` : '—'}
                        </span>
                      </td>
                      <td style={{ padding: '8px' }}>
                        <input
                          type="text"
                          className="progress-input"
                          value={row.statusNotes || ''}
                          onChange={(e) => handleUpdateTargetRow(idx, 'statusNotes', e.target.value)}
                          placeholder="תיאור מגמה..."
                          disabled={isLocked}
                        />
                      </td>
                      <td style={{ padding: '8px', textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => handleRemoveTargetRow(row.id)}
                          disabled={isLocked}
                          style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '6px' }}
                          title="מחק שורה"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Section 4: Replacement Behaviors Acquisition Table */}
      <div className="progress-card">
        <div className="progress-card-header">
          <div className="progress-card-title-wrap">
            <span className="progress-section-badge">4</span>
            <div>
              <h2 className="progress-card-title">רכישת מיומנויות והתנהגויות חלופיות</h2>
              <p className="progress-card-subtitle">מעקב אחר עצמאות בשימוש במיומנות החדשה שנלמדה</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleAddReplacementRow}
            disabled={isLocked}
            className="btn-progress-secondary"
            style={{ padding: '6px 12px', fontSize: '0.85rem' }}
          >
            <Plus size={14} />
            <span>הוסף מיומנות חלופית</span>
          </button>
        </div>

        <div className="progress-card-body">
          {(!report.replacementBehaviorsAcquisition || report.replacementBehaviorsAcquisition.length === 0) ? (
            <div style={{ textAlign: 'center', padding: '24px', background: '#f8fafc', borderRadius: '10px', border: '1px dashed #cbd5e1' }}>
              <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>
                טרם הוגדרו נתוני מיומנויות חלופיות. לחצו על "הוסף מיומנות חלופית" או שאבו מתוכנית ההתערבות.
              </p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569' }}>
                    <th style={{ padding: '10px 12px', textAlign: 'right', minWidth: '180px' }}>מיומנות חלופית</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right', width: '180px' }}>רמת שליטה ועצמאות</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right', minWidth: '220px' }}>הערות התקדמות</th>
                    <th style={{ padding: '10px 12px', textAlign: 'center', width: '50px' }}>פעולות</th>
                  </tr>
                </thead>
                <tbody>
                  {report.replacementBehaviorsAcquisition.map((row, idx) => (
                    <tr key={row.id || idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '8px' }}>
                        <input
                          type="text"
                          className="progress-input"
                          value={row.skillName}
                          onChange={(e) => handleUpdateReplacementRow(idx, 'skillName', e.target.value)}
                          placeholder="שם המיומנות החלופית"
                          disabled={isLocked}
                        />
                      </td>
                      <td style={{ padding: '8px' }}>
                        <select
                          className="progress-input"
                          value={row.masteryLevel || 'בתהליך למידה'}
                          onChange={(e) => handleUpdateReplacementRow(idx, 'masteryLevel', e.target.value)}
                          disabled={isLocked}
                        >
                          <option value="בתהליך למידה ראשוני">בתהליך למידה ראשוני</option>
                          <option value="הדגמה וליווי מלא">הדגמה וליווי מלא</option>
                          <option value="תיווך חלקי">תיווך חלקי</option>
                          <option value="תזכורת מילולית">תזכורת מילולית</option>
                          <option value="עצמאי לחלוטין">עצמאי לחלוטין</option>
                        </select>
                      </td>
                      <td style={{ padding: '8px' }}>
                        <input
                          type="text"
                          className="progress-input"
                          value={row.acquisitionNotes || ''}
                          onChange={(e) => handleUpdateReplacementRow(idx, 'acquisitionNotes', e.target.value)}
                          placeholder="הערות ודוגמאות..."
                          disabled={isLocked}
                        />
                      </td>
                      <td style={{ padding: '8px', textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => handleRemoveReplacementRow(row.id)}
                          disabled={isLocked}
                          style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '6px' }}
                          title="מחק שורה"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Section 5: Advanced Visual Analytics (Data-Driven, Conditional) */}
      <div className="progress-card">
        <div className="progress-card-header">
          <div className="progress-card-title-wrap">
            <span className="progress-section-badge">5</span>
            <div>
              <h2 className="progress-card-title">ניתוחים חזותיים מתקדמים</h2>
              <p className="progress-card-subtitle">
                גרפים וטבלאות דינמיים המבוססים על נתוני התצפית והמעקב השוטף
              </p>
            </div>
          </div>
        </div>

        <div className="progress-card-body" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* 1. מפת פיזור שעתית */}
          <BehaviorHourlyHeatmapChart
            trackingData={ongoingTracking}
            observations={behaviorObservations}
          />

          {/* 2. טבלת רצף תנאי מקדים, התנהגות ותוצאה סביבתית */}
          <BehaviorAbcSequenceTable
            observations={behaviorObservations}
          />

          {/* 3. גרף משך זמן ועוצמת אירוע */}
          <BehaviorDurationIntensityChart
            trackingData={ongoingTracking}
            observations={behaviorObservations}
          />

          {/* 4. עקומת למידה מצטברת של מיומנות חלופית */}
          <BehaviorReplacementLearningCurveChart
            trackingData={ongoingTracking}
          />

          {/* 5. טבלת נאמנות יישום של צוות בית הספר */}
          <BehaviorStaffFidelityMeter
            trackingData={ongoingTracking}
          />

          {/* 6. גרף ניטור התקדמות כפול (קו בסיס מול התערבות) */}
          {ongoingTracking.length > 0 && (
            <div style={{ marginTop: '8px' }}>
              <ProgressMonitoringDualLineChart
                baselinePoints={baselineData}
                ongoingPoints={ongoingTracking}
              />
            </div>
          )}
        </div>
      </div>

      {/* Section 6: Environmental Adjustments & Staff Fidelity Notes */}
      <div className="progress-card">
        <div className="progress-card-header">
          <div className="progress-card-title-wrap">
            <span className="progress-section-badge">6</span>
            <div>
              <h2 className="progress-card-title">התאמות סביבתיות ונהלי צוות</h2>
              <p className="progress-card-subtitle">שינויים שנערכו בסביבת הלמידה, התאמות מערכת שעות והטרמות</p>
            </div>
          </div>
        </div>
        <div className="progress-card-body">
          <label className="progress-field-label">תיאור ההתאמות הסביבתיות והשפעתן:</label>
          <textarea
            className="progress-textarea"
            rows={3}
            value={report.environmentalAdjustments || ''}
            onChange={(e) => setReport((prev) => ({ ...prev, environmentalAdjustments: e.target.value }))}
            placeholder="תאר/י שינויים שנערכו בסביבת הלמידה, לוח זמנים מותאם, הטרמות ושינויי עומס..."
            disabled={isLocked}
          />
        </div>
      </div>

      {/* Section 7: Staff Fidelity & Protocol Observations */}
      <div className="progress-card">
        <div className="progress-card-header">
          <div className="progress-card-title-wrap">
            <span className="progress-section-badge">7</span>
            <div>
              <h2 className="progress-card-title">נאמנות יישום ועקביות הצוות</h2>
              <p className="progress-card-subtitle">עקביות צוות ההוראה והסייעות ביישום עקרונות תוכנית ההתערבות</p>
            </div>
          </div>
        </div>
        <div className="progress-card-body">
          <label className="progress-field-label">תצפיות ומשוב על יישום הצוות:</label>
          <textarea
            className="progress-textarea"
            rows={3}
            value={report.staffFidelityObservations || ''}
            onChange={(e) => setReport((prev) => ({ ...prev, staffFidelityObservations: e.target.value }))}
            placeholder="תאר/י את מידת העקביות של צוות הכיתה, שילוב סייעות, דיוק מתן החיזוקים והאתגרים שעלו..."
            disabled={isLocked}
          />
        </div>
      </div>

      {/* Section 8: Future Recommendations */}
      <div className="progress-card">
        <div className="progress-card-header">
          <div className="progress-card-title-wrap">
            <span className="progress-section-badge">8</span>
            <div>
              <h2 className="progress-card-title">המלצות להמשך תוכנית ההתערבות וישיבות רב-מקצועיות</h2>
              <p className="progress-card-subtitle">יעדים להמשך, דיוק מענים, והמלצות לקראת ועדות אפיון וזכאות</p>
            </div>
          </div>
        </div>
        <div className="progress-card-body">
          <label className="progress-field-label">פירוט המלצות פרקטיות ושלבי המשך:</label>
          <textarea
            className="progress-textarea"
            rows={4}
            value={report.recommendations || ''}
            onChange={(e) => setReport((prev) => ({ ...prev, recommendations: e.target.value }))}
            placeholder="המלצות פרקטיות: האם להמשיך בתוכנית כפי שהיא, להפחית תדירות חיזוקים, לעדכן יעדים בוועדת אפיון וזכאות..."
            disabled={isLocked}
          />
        </div>
      </div>

      {/* Bottom Sticky Action Bar */}
      <div className="progress-bottom-bar">
        <div className="progress-bottom-group">
          <button
            type="button"
            className="btn-save-progress"
            onClick={handleSave}
            disabled={isLocked}
          >
            <Save size={17} />
            <span>שמור התקדמות</span>
          </button>
        </div>

        <div className="progress-bottom-group">
          <button
            type="button"
            className="btn-preview-doc"
            onClick={() => setShowFullDocPreview(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 14px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              color: '#334155',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer'
            }}
          >
            <FileText size={16} />
            <span>תצוגת מסמך מלאה</span>
          </button>

          <div className="export-dropdown-wrapper" ref={bottomExportDropdownRef}>
            <button
              type="button"
              className={`btn-export-dropdown ${showBottomExportDropdown ? 'active' : ''}`}
              onClick={() => setShowBottomExportDropdown((prev) => !prev)}
              title="הדפסה וייצוא"
            >
              <Printer size={16} />
              <span>הדפסה וייצוא</span>
              <ChevronDown size={14} className={`export-dropdown-arrow ${showBottomExportDropdown ? 'open' : ''}`} />
            </button>
            {showBottomExportDropdown && (
              <div
                className="export-dropdown-menu"
                style={{ bottom: '100%', top: 'auto', marginBottom: '8px' }}
                role="menu"
              >
                <button
                  type="button"
                  className="export-dropdown-item"
                  onClick={() => {
                    setShowBottomExportDropdown(false);
                    handlePrint();
                  }}
                >
                  <Printer size={15} style={{ color: '#2563eb' }} />
                  <span>הדפס דוח התקדמות</span>
                </button>
                <button
                  type="button"
                  className="export-dropdown-item"
                  onClick={() => {
                    setShowBottomExportDropdown(false);
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
                    setShowBottomExportDropdown(false);
                    handleExportWord();
                  }}
                >
                  <FileDown size={15} style={{ color: '#059669' }} />
                  <span>הורד קובץ Word (.doc)</span>
                </button>
                <button
                  type="button"
                  className="export-dropdown-item"
                  onClick={async () => {
                    setShowBottomExportDropdown(false);
                    await handleExportPdf();
                  }}
                >
                  <FileText size={15} style={{ color: '#dc2626' }} />
                  <span>הורד קובץ PDF (.pdf)</span>
                </button>
              </div>
            )}
          </div>

          {onGoBack && (
            <button
              type="button"
              className="btn-export-dropdown"
              onClick={onGoBack}
              title="סגירה"
            >
              <span>סגירה</span>
            </button>
          )}
        </div>
      </div>

      {/* Full Document Preview Modal */}
      {showFullDocPreview && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100,
            padding: '20px'
          }}
          onClick={() => setShowFullDocPreview(false)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              maxWidth: '900px',
              width: '100%',
              maxHeight: '90vh',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 24px',
                borderBottom: '1px solid #e2e8f0',
                background: '#f8fafc'
              }}
            >
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>
                תצוגת מסמך מלאה: דוח סיכום והערכת התקדמות התנהגותית
              </h3>
              <button
                type="button"
                onClick={() => setShowFullDocPreview(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                ✕
              </button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
              <div
                dangerouslySetInnerHTML={{
                  __html: buildBehaviorProgressReportPrintHtml(
                    {
                      ...student,
                      ...studentDetails,
                      behaviorProgressReport: report,
                      ongoingTracking,
                      behaviorObservations,
                      baselineData
                    },
                    false
                  )
                }}
              />
            </div>
            <div
              style={{
                padding: '12px 24px',
                borderTop: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '8px',
                background: '#f8fafc'
              }}
            >
              <button type="button" onClick={handlePrint} className="btn-export-dropdown">
                <Printer size={16} />
                <span>הדפס</span>
              </button>
              <button type="button" onClick={handleExportWord} className="btn-export-dropdown">
                <FileDown size={16} />
                <span>ייצא לוורד</span>
              </button>
              <button
                type="button"
                onClick={() => setShowFullDocPreview(false)}
                className="btn-export-dropdown"
              >
                <span>סגירה</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Send Email Modal */}
      {showEmailModal && (
        <SendReportEmailModal
          isOpen={showEmailModal}
          onClose={() => setShowEmailModal(false)}
          reportTitle="דוח סיכום והערכת התקדמות התנהגותית"
          studentName={studentDetails.name || student.name || 'תלמיד/ה'}
          schoolYear={studentDetails.schoolYear || student.schoolYear || ''}
          currentUser={currentUser}
          hideDetails={hideDetailsOnExport}
          onToggleHideDetails={setHideDetailsOnExport}
          getWordAttachment={createWordBlob}
          getPdfAttachment={createPdfBlob}
        />
      )}
    </div>
  );
}
