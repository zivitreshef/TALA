import React, { useState, useMemo, useEffect } from 'react';
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
  EyeOff
} from 'lucide-react';
import {
  BehaviorInterventionPlan,
  OngoingTrackingPoint,
  ReplacementBehaviorPlan,
  StudentProfile
} from '../../domain/types';
import {
  calculateBaselineStats,
  calculateTrackingStats,
  createEmptyBehaviorPlan,
  getBehaviorFunctionLabelHebrew,
  getMeasurementTypeLabelHebrew
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
}

export default function BehaviorInterventionPlanForm({
  student,
  allStudents = [],
  currentUser,
  onSaveStudentPlan,
  onGoBack,
  onDraftStateChange
}: BehaviorInterventionPlanFormProps) {
  // Initialize plan from student or clean template
  const [plan, setPlan] = useState<BehaviorInterventionPlan>(() => {
    if (student.behaviorPlan) {
      return {
        ...createEmptyBehaviorPlan(),
        ...student.behaviorPlan,
        targetBehaviors: student.behaviorPlan.targetBehaviors || [],
        replacementBehaviors: student.behaviorPlan.replacementBehaviors || [],
        ongoingTracking: student.behaviorPlan.ongoingTracking || []
      };
    }

    // Default target behaviors pulled from assessment if exists
    const initialTargets = student.behaviorAssessment?.targetBehaviors || [];

    return {
      ...createEmptyBehaviorPlan(),
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
    details: true,
    targetsAndReplacements: true,
    antecedents: true,
    reinforcementAndReactive: true,
    tracking: true
  });

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
    const newPoint: OngoingTrackingPoint = {
      id: 'track_' + Date.now(),
      date: newTrackingDate,
      period: newTrackingPeriod.trim(),
      targetBehaviorOccurrences: Number(newTrackingOccurrences) || 0,
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
      const targetName =
        plan.targetBehaviors[0]?.name ||
        student.behaviorAssessment?.targetBehaviors[0]?.name ||
        'התנהגות מאתגרת';
      const funcLabel = getBehaviorFunctionLabelHebrew(
        student.behaviorAssessment?.mainHypothesizedFunction || 'escape'
      );

      const strategies = await suggestInterventionStrategies(targetName, funcLabel, student);
      if (strategies) {
        setPlan((prev) => ({
          ...prev,
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

  const [hideDetailsOnExport, setHideDetailsOnExport] = useState(false);

  const handlePrint = () => {
    const exportStudent: StudentProfile = {
      ...student,
      ...studentDetails,
      behaviorPlan: plan
    };
    const printHtml = buildBehaviorPlanPrintHtml(exportStudent, hideDetailsOnExport);
    openHtmlPrintWindow(printHtml);
  };

  const handleDownloadWord = () => {
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
    <div className="plan-form-container" dir="rtl">
      {/* Top Header Card */}
      <header className="plan-form-header">
        <div className="plan-form-title-group">
          <div className="plan-form-icon-badge">
            <TrendingDown size={24} />
          </div>
          <div>
            <h1 className="plan-form-heading">תוכנית התערבות התנהגותית</h1>
            <p className="plan-form-subheading">
              תלמיד: <strong>{student.name || 'ללא שם'}</strong>
              {student.educationalFramework ? ` | ${student.educationalFramework}` : ''}
            </p>
          </div>
        </div>

        <div className="plan-form-actions">
          {saveSuccessNotice && (
            <span style={{ color: '#2e7d32', fontSize: '0.875rem', fontWeight: 600 }}>
              נשמר בהצלחה
            </span>
          )}
          {isDirty && (
            <span style={{ color: '#d97706', fontSize: '0.85rem' }}>שינויים טרם נשמרו</span>
          )}
          <button
            type="button"
            className={`btn-behavior-action ${isPlanLocked ? 'btn-behavior-locked' : 'btn-behavior-secondary'}`}
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
            title={isPlanLocked ? 'המסמך נעול לעריכה - לחץ לשחרור' : 'נעילת המסמך לעריכה'}
          >
            {isPlanLocked ? <Lock size={16} /> : <Unlock size={16} />}
            <span>{isPlanLocked ? 'מסמך נעול' : 'נעילת מסמך'}</span>
          </button>
          <button
            type="button"
            className={`btn-behavior-action ${hideDetailsOnExport ? 'btn-behavior-primary' : 'btn-behavior-secondary'}`}
            onClick={() => setHideDetailsOnExport((prev) => !prev)}
            title={hideDetailsOnExport ? 'פרטים מזהים מוסתרים בהדפסה ובייצוא' : 'הסתרת פרטים מזהים בהדפסה ובייצוא'}
          >
            {hideDetailsOnExport ? <EyeOff size={16} /> : <Eye size={16} />}
            <span>{hideDetailsOnExport ? 'פרטים מוסתרים' : 'הסתרת פרטים'}</span>
          </button>
          <button
            type="button"
            disabled={isPlanLocked}
            className="btn-behavior-action btn-behavior-ai"
            onClick={() => setShowAiModal(true)}
            title="הצעת תוכנית התערבות בעזרת בינה מלאכותית"
          >
            <Sparkles size={16} />
            <span>סיוע בינה מלאכותית</span>
          </button>
          <button
            type="button"
            className="btn-behavior-action btn-behavior-secondary"
            onClick={handleDownloadWord}
            title="הורדת תוכנית בפורמט וורד"
          >
            <FileDown size={16} />
            <span>הורדת וורד</span>
          </button>
          <button
            type="button"
            className="btn-behavior-action btn-behavior-secondary"
            onClick={handlePrint}
            title="הדפסת תוכנית התערבות"
          >
            <Printer size={16} />
            <span>הדפסה</span>
          </button>
          <button
            type="button"
            className="btn-behavior-action btn-behavior-primary"
            onClick={handleSave}
            title="שמירת תוכנית התערבות"
          >
            <Save size={16} />
            <span>שמירה</span>
          </button>
          {onGoBack && (
            <button
              type="button"
              className="btn-behavior-action btn-behavior-secondary"
              onClick={onGoBack}
              title="חזרה"
            >
              <span>סגירה</span>
            </button>
          )}
        </div>
      </header>

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
                <input
                  type="date"
                  className="behavior-input"
                  disabled={isPlanLocked}
                  value={plan.effectiveDate || ''}
                  onChange={(e) => handleFieldChange('effectiveDate', e.target.value)}
                />
              </div>
            </div>

            <div className="behavior-field-group" style={{ maxWidth: '300px' }}>
              <label className="behavior-field-label">תאריך יעד לבחינה והערכה מחודשת</label>
              <input
                type="date"
                className="behavior-input"
                disabled={isPlanLocked}
                value={plan.reviewDate || ''}
                onChange={(e) => handleFieldChange('reviewDate', e.target.value)}
              />
            </div>
          </div>
        )}
      </section>

      {/* Section 2: התנהגויות יעד והתנהגויות חלופיות */}
      <section className="plan-card">
        <div
          className="plan-card-header"
          onClick={() => toggleSection('targetsAndReplacements')}
        >
          <div className="plan-card-title-wrap">
            <span className="plan-section-badge">2</span>
            <h2 className="plan-card-title">
              התנהגויות יעד להפחתה והתנהגויות חלופיות להוראה
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

            {!showAddReplacementForm ? (
              <button
                type="button"
                disabled={isPlanLocked}
                className="btn-behavior-action btn-behavior-secondary"
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
                  gap: '0.85rem'
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

      {/* Section 3: אסטרטגיות מקדימות והתאמות סביבתיות */}
      <section className="plan-card">
        <div className="plan-card-header" onClick={() => toggleSection('antecedents')}>
          <div className="plan-card-title-wrap">
            <span className="plan-section-badge">3</span>
            <h2 className="plan-card-title">אסטרטגיות מקדימות והתאמות סביבתיות</h2>
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
            <div className="behavior-field-group">
              <label className="behavior-field-label">
                התאמות סביבתיות, הטרמות ושינוי נסיבות מפעילות
              </label>
              <textarea
                className="behavior-textarea"
                rows={4}
                disabled={isPlanLocked}
                value={plan.antecedentStrategies || ''}
                onChange={(e) => handleFieldChange('antecedentStrategies', e.target.value)}
                placeholder="פירוט התאמות: מיקום ישיבה מותאם, לוח זמנים חזותי, פירוק משימות למקטעים קצרים, מתן אפשרות בחירה והכנה מראש..."
              />
            </div>
          </div>
        )}
      </section>

      {/* Section 4: מערך חיזוקים ונוהל תגובה */}
      <section className="plan-card">
        <div
          className="plan-card-header"
          onClick={() => toggleSection('reinforcementAndReactive')}
        >
          <div className="plan-card-title-wrap">
            <span className="plan-section-badge">4</span>
            <h2 className="plan-card-title">מערך חיזוקים ונוהל תגובת צוות</h2>
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
                <label className="behavior-field-label">
                  מפת חיזוקים מועדפים בעלי ערך מניע
                </label>
                <textarea
                  className="behavior-textarea"
                  rows={3}
                  disabled={isPlanLocked}
                  value={plan.reinforcementSystem.preferredReinforcers || ''}
                  onChange={(e) =>
                    handleNestedFieldChange(
                      'reinforcementSystem',
                      'preferredReinforcers',
                      e.target.value
                    )
                  }
                  placeholder="פעילויות אהובות, זמן מסך מבוקר, משחק משותף, משוב חיובי ספציפי..."
                />
              </div>

              <div className="behavior-field-group">
                <label className="behavior-field-label">לוח זמנים למתן החיזוק</label>
                <textarea
                  className="behavior-textarea"
                  rows={3}
                  disabled={isPlanLocked}
                  value={plan.reinforcementSystem.scheduleOfReinforcement || ''}
                  onChange={(e) =>
                    handleNestedFieldChange(
                      'reinforcementSystem',
                      'scheduleOfReinforcement',
                      e.target.value
                    )
                  }
                  placeholder="מיידי על הפגנת ההתנהגות החלופית, חיזוק תקופתי בכל 15 דקות ללא אירוע..."
                />
              </div>
            </div>

            <div className="behavior-field-group" style={{ marginTop: '1.25rem' }}>
              <label className="behavior-field-label">
                פרוטוקול תגובה אחיד לצוות בעת התרחשות התנהגות היעד
              </label>
              <textarea
                className="behavior-textarea"
                rows={3}
                disabled={isPlanLocked}
                value={plan.reactiveProtocol.staffResponse || ''}
                onChange={(e) =>
                  handleNestedFieldChange(
                    'reactiveProtocol',
                    'staffResponse',
                    e.target.value
                  )
                }
                placeholder="הנחיות מדויקות: מה לעשות ומה לא לעשות (למשל: תגובה שקטה ללא תשומת לב מילולית מיותרת, הפניה מחדש לכרטיסיית הפסקה)..."
              />
            </div>

            <div className="behavior-field-group" style={{ marginTop: '1.25rem' }}>
              <label className="behavior-field-label">
                נוהל בטיחות והרגעה במצבי קיצון (במידת הצורך)
              </label>
              <textarea
                className="behavior-textarea"
                rows={2}
                disabled={isPlanLocked}
                value={plan.reactiveProtocol.crisisSafetyPlan || ''}
                onChange={(e) =>
                  handleNestedFieldChange(
                    'reactiveProtocol',
                    'crisisSafetyPlan',
                    e.target.value
                  )
                }
                placeholder="פינוי חפצים מסוכנים, מרחב שקט בליווי איש צוות קבוע, הודעה למנהל/ת..."
              />
            </div>
          </div>
        )}
      </section>

      {/* Section 5: טבלת מעקב שוטף ולוח התקדמות */}
      <section className="plan-card">
        <div className="plan-card-header" onClick={() => toggleSection('tracking')}>
          <div className="plan-card-title-wrap">
            <span className="plan-section-badge">5</span>
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
                    <input
                      type="date"
                      className="behavior-input"
                      value={newTrackingDate}
                      onChange={(e) => setNewTrackingDate(e.target.value)}
                      required
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
                      onChange={(e) => setNewTrackingOccurrences(e.target.value)}
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
    </div>
  );
}
