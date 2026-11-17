import { useState } from 'react';
import {
  User,
  Users,
  ChevronDown,
  ChevronUp,
  Check,
  Plus,
  Minus
} from 'lucide-react';
import { maskDateInput, normalizeDateOnBlur } from '../../utils/dateMask';
import { extractTeamDataFromStudent } from '../../domain/coworkerSuggestions';
import StaffVoiceControl, { type StaffMergePayload } from '../form/StaffVoiceControl';
import HebrewDatePicker from '../HebrewDatePicker';
import type { StudentProfile } from '../../domain/types';

export interface BehaviorStudentDetailsData {
  id?: string;
  name?: string;
  idNumber?: string;
  birthDate?: string;
  educationalFramework?: string;
  schoolYear?: string;
  reportDate?: string;
  address?: string;
  phone?: string;
  schoolName?: string;
  gradeClass?: string;
  educatorName?: string;
  assistantName?: string;
  educationalCounselor?: string;
  supportTeacher?: string;
  psychologistName?: string;
  otherStaff?: string;
  ownerEmail?: string;
  [key: string]: unknown;
}

export interface BehaviorStudentDetailsCardProps {
  studentData: BehaviorStudentDetailsData;
  onChangeField: (field: string, value: any) => void;
  allStudents?: StudentProfile[];
  currentUser?: {
    name?: string;
    email?: string;
    role?: string;
    [key: string]: unknown;
  } | null;
  disabled?: boolean;
  onMergeStaffFeedback?: (payload: StaffMergePayload) => void;
  titlePrefix?: string;
}

export default function BehaviorStudentDetailsCard({
  studentData = {} as Partial<StudentProfile>,
  onChangeField,
  allStudents = [],
  currentUser,
  disabled = false,
  onMergeStaffFeedback,
  titlePrefix = 'פרטי התלמיד והמסגרת החינוכית'
}: BehaviorStudentDetailsCardProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [isAdditionalInfoOpen, setIsAdditionalInfoOpen] = useState(false);
  const [copySuccessMsg, setCopySuccessMsg] = useState('');

  const isKindergarten = Boolean(
    studentData.educationalFramework?.includes('גן') ||
    (studentData as any).planType?.includes('גן') ||
    (studentData as any).planType?.includes('תח"י')
  );

  const studentsWithTeam = allStudents.filter(
    (s) => s.id !== studentData.id && (s.schoolName || s.educatorName || s.assistantName || s.gradeClass)
  );

  // Count active team members filled
  const activeTeamCount = [
    studentData.schoolName,
    studentData.gradeClass,
    studentData.educatorName,
    studentData.assistantName,
    studentData.educationalCounselor,
    studentData.supportTeacher,
    studentData.psychologistName,
    studentData.otherStaff
  ].filter(Boolean).length;

  return (
    <section className="behavior-card" style={{ marginBottom: '1.25rem' }}>
      <div
        className="behavior-card-header"
        onClick={() => setIsOpen((prev) => !prev)}
        style={{ cursor: 'pointer', userSelect: 'none' }}
      >
        <div className="behavior-card-title-wrap">
          <span
            className="behavior-section-badge"
            style={{ background: '#3b82f6', color: '#ffffff' }}
          >
            <User size={14} />
          </span>
          <h2 className="behavior-card-title">{titlePrefix}</h2>
          <span
            style={{
              fontSize: '0.78rem',
              fontWeight: 600,
              color: '#475569',
              background: '#f1f5f9',
              border: '1px solid #e2e8f0',
              padding: '2px 9px',
              borderRadius: '999px'
            }}
          >
            {studentData.name || 'ללא שם'}
            {studentData.educationalFramework ? ` • ${studentData.educationalFramework}` : ''}
          </span>
        </div>

        <button
          type="button"
          className="btn-collapse-toggle-32"
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen((prev) => !prev);
          }}
          aria-label={isOpen ? 'כיווץ פרטי תלמיד' : 'הרחבת פרטי תלמיד'}
        >
          {isOpen ? <Minus size={16} /> : <Plus size={16} />}
        </button>
      </div>

      {isOpen && (
        <div className="behavior-card-body">
          {/* Core Student Grid */}
          <div className="behavior-form-grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
            <div className="behavior-field-group">
              <label className="behavior-field-label">שם התלמיד או התלמידה:</label>
              <input
                type="text"
                className="behavior-input"
                disabled={disabled}
                value={studentData.name || ''}
                onChange={(e) => onChangeField('name', e.target.value)}
                placeholder="שם מלא"
              />
            </div>

            <div className="behavior-field-group">
              <label className="behavior-field-label">מספר תעודת זהות:</label>
              <input
                type="text"
                className="behavior-input"
                disabled={disabled}
                value={studentData.idNumber || ''}
                onChange={(e) => onChangeField('idNumber', e.target.value)}
                placeholder="9 ספרות"
                maxLength={9}
              />
            </div>

            <div className="behavior-field-group">
              <label className="behavior-field-label">תאריך לידה:</label>
              <input
                type="text"
                className="behavior-input"
                disabled={disabled}
                value={studentData.birthDate || ''}
                onChange={(e) => {
                  const masked = maskDateInput(e.target.value, studentData.birthDate || '');
                  onChangeField('birthDate', masked);
                }}
                onBlur={() => {
                  const normalized = normalizeDateOnBlur(studentData.birthDate || '');
                  if (normalized !== studentData.birthDate) {
                    onChangeField('birthDate', normalized);
                  }
                }}
                placeholder="DD/MM/YYYY"
                maxLength={10}
              />
            </div>

            <div className="behavior-field-group">
              <label className="behavior-field-label">מסגרת חינוכית:</label>
              <input
                type="text"
                className="behavior-input"
                disabled={disabled}
                value={studentData.educationalFramework || ''}
                onChange={(e) => onChangeField('educationalFramework', e.target.value)}
                placeholder={isKindergarten ? 'שם הגן' : 'שם בית הספר / מתי"א'}
              />
            </div>

            <div className="behavior-field-group">
              <label className="behavior-field-label">שנת לימודים:</label>
              <input
                type="text"
                className="behavior-input"
                disabled={disabled}
                value={studentData.schoolYear || ''}
                onChange={(e) => onChangeField('schoolYear', e.target.value)}
                placeholder="למשל: תשפ״ו (2025-2026)"
              />
            </div>

            <div className="behavior-field-group">
              <label className="behavior-field-label">תאריך הערכה או פתיחת דוח:</label>
              <HebrewDatePicker
                value={studentData.reportDate || ''}
                onChange={(date) => onChangeField('reportDate', date)}
                disabled={disabled}
                fullWidth={true}
                placeholder="בחר תאריך"
                ariaLabel="תאריך הערכה או פתיחת דוח"
              />
            </div>

            <div className="behavior-field-group">
              <label className="behavior-field-label">כתובת מגורים:</label>
              <input
                type="text"
                className="behavior-input"
                disabled={disabled}
                value={studentData.address || ''}
                onChange={(e) => onChangeField('address', e.target.value)}
                placeholder="עיר, רחוב ומספר"
              />
            </div>

            <div className="behavior-field-group">
              <label className="behavior-field-label">טלפון הורים או איש קשר:</label>
              <input
                type="text"
                className="behavior-input"
                disabled={disabled}
                value={studentData.phone || ''}
                onChange={(e) => onChangeField('phone', e.target.value)}
                placeholder="050-0000000"
              />
            </div>
          </div>

          {/* Collapsible: מידע נוסף ופרטי צוות */}
          <div style={{ marginTop: '14px', borderTop: '1px dashed #cbd5e1', paddingTop: '10px' }}>
            <button
              type="button"
              onClick={() => setIsAdditionalInfoOpen((prev) => !prev)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '7px',
                background: isAdditionalInfoOpen ? '#eff6ff' : '#f8fafc',
                color: isAdditionalInfoOpen ? '#1d4ed8' : '#334155',
                border: isAdditionalInfoOpen ? '1px solid #93c5fd' : '1px solid #cbd5e1',
                borderRadius: '8px',
                padding: '6px 14px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              {isAdditionalInfoOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
              <span>מידע נוסף וצוות חינוכי</span>
              {activeTeamCount > 0 && (
                <span
                  style={{
                    background: '#2563eb',
                    color: '#ffffff',
                    borderRadius: '999px',
                    padding: '1px 8px',
                    fontSize: '11px',
                    fontWeight: 700
                  }}
                >
                  {activeTeamCount}
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
                {/* Team Duplication Row */}
                {studentsWithTeam.length > 0 && !disabled && (
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
                        const teamData = extractTeamDataFromStudent(sourceStudent as any);
                        Object.entries(teamData).forEach(([k, v]) => {
                          if (v) onChangeField(k, v);
                        });
                        setCopySuccessMsg(`פרטי הצוות שוכפלו בהצלחה מ-${sourceStudent.name || 'התלמיד/ה'}`);
                        setTimeout(() => setCopySuccessMsg(''), 4000);
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
                    {copySuccessMsg && (
                      <span style={{ color: '#15803d', fontWeight: 600, fontSize: '12.5px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Check size={14} />
                        {copySuccessMsg}
                      </span>
                    )}
                  </div>
                )}

                {/* Team Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                  <div className="behavior-field-group">
                    <label className="behavior-field-label">{isKindergarten ? 'שם הגן:' : 'בית הספר:'}</label>
                    <input
                      type="text"
                      className="behavior-input"
                      disabled={disabled}
                      value={studentData.schoolName || ''}
                      onChange={(e) => onChangeField('schoolName', e.target.value)}
                      placeholder={isKindergarten ? 'שם הגן' : 'שם המוסד החינוכי'}
                    />
                  </div>

                  <div className="behavior-field-group">
                    <label className="behavior-field-label">{isKindergarten ? 'שלב גן:' : 'כיתה:'}</label>
                    <input
                      type="text"
                      className="behavior-input"
                      disabled={disabled}
                      value={studentData.gradeClass || ''}
                      onChange={(e) => onChangeField('gradeClass', e.target.value)}
                      placeholder={isKindergarten ? 'טרום חובה / חובה' : 'למשל: ג׳2'}
                    />
                  </div>

                  <div className="behavior-field-group">
                    <label className="behavior-field-label">{isKindergarten ? 'גננת מובילה:' : 'מחנכ/ת הכיתה:'}</label>
                    <input
                      type="text"
                      className="behavior-input"
                      disabled={disabled}
                      value={studentData.educatorName || ''}
                      onChange={(e) => onChangeField('educatorName', e.target.value)}
                      placeholder="שם מלא"
                    />
                  </div>

                  <div className="behavior-field-group">
                    <label className="behavior-field-label">סייע/ת או תומכ/ת הוראה:</label>
                    <input
                      type="text"
                      className="behavior-input"
                      disabled={disabled}
                      value={studentData.assistantName || ''}
                      onChange={(e) => onChangeField('assistantName', e.target.value)}
                      placeholder="שם מלא"
                    />
                  </div>

                  <div className="behavior-field-group">
                    <label className="behavior-field-label">מורת שילוב:</label>
                    <input
                      type="text"
                      className="behavior-input"
                      disabled={disabled}
                      value={studentData.supportTeacher || ''}
                      onChange={(e) => onChangeField('supportTeacher', e.target.value)}
                      placeholder="שם מלא"
                    />
                  </div>

                  <div className="behavior-field-group">
                    <label className="behavior-field-label">יועצ/ת חינוכית:</label>
                    <input
                      type="text"
                      className="behavior-input"
                      disabled={disabled}
                      value={studentData.educationalCounselor || ''}
                      onChange={(e) => onChangeField('educationalCounselor', e.target.value)}
                      placeholder="שם מלא"
                    />
                  </div>

                  <div className="behavior-field-group">
                    <label className="behavior-field-label">פסיכולוג/ית חינוכית:</label>
                    <input
                      type="text"
                      className="behavior-input"
                      disabled={disabled}
                      value={studentData.psychologistName || ''}
                      onChange={(e) => onChangeField('psychologistName', e.target.value)}
                      placeholder="שם מלא"
                    />
                  </div>

                  <div className="behavior-field-group">
                    <label className="behavior-field-label">אנשי צוות נוספים ומטפלים:</label>
                    <input
                      type="text"
                      className="behavior-input"
                      disabled={disabled}
                      value={studentData.otherStaff || ''}
                      onChange={(e) => onChangeField('otherStaff', e.target.value)}
                      placeholder="ריפוי בעיסוק, קלינאית תקשורת וכו׳"
                    />
                  </div>
                </div>

                {/* Staff Feedback Collection Module */}
                <div
                  style={{
                    marginTop: '16px',
                    padding: '12px 16px',
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '10px'
                  }}
                >
                  <div style={{ fontSize: '13px', color: '#334155' }}>
                    <strong style={{ color: '#1e3a8a' }}>איסוף משוב מצוות התלמיד:</strong>
                    <span style={{ marginRight: '6px', color: '#64748b' }}>
                      שליחת קישור קצר לאנשי צוות שאינם רשומים במערכת לאיסוף תצפיות ופידבק ממוקד.
                    </span>
                  </div>

                  <StaffVoiceControl
                    student={{
                      ...studentData,
                      id: studentData.id,
                      ownerEmail: studentData.ownerEmail || currentUser?.email
                    }}
                    currentUser={currentUser}
                    disabled={disabled}
                    isKindergarten={isKindergarten}
                    onMergeStaffFeedback={onMergeStaffFeedback}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
