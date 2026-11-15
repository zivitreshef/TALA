import React, { useState, useMemo, useEffect } from 'react';
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
  Unlock
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
      const draft = await generateBehaviorAssessmentDraft(aiPromptNotes, student);
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

  const handlePrint = () => {
    window.print();
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

        <div className="behavior-form-actions">
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
            className={`btn-behavior-action ${isReportLocked ? 'btn-behavior-locked' : 'btn-behavior-secondary'}`}
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
            title={isReportLocked ? 'המסמך נעול לעריכה - לחץ לשחרור' : 'נעילת המסמך לעריכה'}
          >
            {isReportLocked ? <Lock size={16} /> : <Unlock size={16} />}
            <span>{isReportLocked ? 'מסמך נעול' : 'נעילת מסמך'}</span>
          </button>
          <button
            type="button"
            disabled={isReportLocked}
            className="btn-behavior-action btn-behavior-ai"
            onClick={() => setShowAiModal(true)}
            title="ניסוח דוח בעזרת בינה מלאכותית"
          >
            <Sparkles size={16} />
            <span>ניסוח בעזרת בינה מלאכותית</span>
          </button>
          <button
            type="button"
            className="btn-behavior-action btn-behavior-secondary"
            onClick={handlePrint}
            title="הדפסת דוח הערכה"
          >
            <Printer size={16} />
            <span>הדפסה</span>
          </button>
          <button
            type="button"
            className="btn-behavior-action btn-behavior-primary"
            onClick={handleSave}
            title="שמירת הערכת תפקוד"
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
                {report.targetBehaviors.map((target) => (
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
                    {report.baselineData.map((point) => (
                      <tr key={point.id}>
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
    </div>
  );
}
