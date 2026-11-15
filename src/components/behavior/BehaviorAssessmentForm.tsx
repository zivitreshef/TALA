import React, { useState, useMemo, useEffect } from 'react';
import {
  Save,
  Printer,
  Plus,
  Minus,
  Trash2,
  FileText
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
  getMeasurementTypeLabelHebrew
} from '../../domain/behaviorAnalysis';
import './BehaviorAssessmentForm.css';

export interface BehaviorAssessmentFormProps {
  student: StudentProfile;
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
                      className="btn-collapse-toggle-32"
                      onClick={() => handleRemoveTargetBehavior(target.id)}
                      title="מחיקת התנהגות יעד"
                    >
                      <Trash2 size={15} color="#d9534f" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {!showAddTargetForm ? (
              <button
                type="button"
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
                  <label className="behavior-field-label">הגדרה אופרציונלית מפורטת</label>
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
                            className="btn-collapse-toggle-32"
                            onClick={() => handleRemoveBaselinePoint(point.id)}
                            title="מחיקת רשומת קו בסיס"
                          >
                            <Trash2 size={14} color="#d9534f" />
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
                value={report.antecedentAnalysis || ''}
                onChange={(e) => handleFieldChange('antecedentAnalysis', e.target.value)}
                placeholder="זיהוי זמנים מועדים, מעברים בין פעילויות, דרישות לימודיות מורכבות, או גורמים סביבתיים..."
              />
            </div>

            <div className="behavior-field-group" style={{ marginBottom: '1.25rem' }}>
              <label className="behavior-field-label">תפקיד ההתנהגות המרכזי שזוהה</label>
              <select
                className="behavior-select"
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
              <label className="behavior-field-label">
                ניסוח מילולי של השערת התפקוד המנומקת
              </label>
              <textarea
                className="behavior-textarea"
                rows={3}
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
              <label className="behavior-field-label">
                המלצות ראשוניות להתאמות סביבתיות ולהתנהגויות חלופיות
              </label>
              <textarea
                className="behavior-textarea"
                rows={4}
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
