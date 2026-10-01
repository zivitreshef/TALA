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
  ShieldAlert
} from 'lucide-react';
import {
  ENVIRONMENTS_LIST,
  getSortedGoalBank,
  generateDefaultQuestionsForCustomGoal,
  reverseEngineerRawTextLocally,
  toHebrewAcronym,
  maskSensitiveValue,
  redactStudentNameInText
} from './goalBankData';

export default function EcologicalWorkPlanForm({
  student,
  goalBank,
  geminiApiKey,
  isAdmin,
  onOpenGoalBankManager,
  onSaveStudentPlan,
  onUseOrAddGoalToBank
}) {
  const [formData, setFormData] = useState(() => ({ ...student }));
  const [hideStudentDetailsOnPrint, setHideStudentDetailsOnPrint] = useState(true); // Default: checked!
  const [saveBanner, setSaveBanner] = useState(false);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [isReverseEngineering, setIsReverseEngineering] = useState(false);
  const [reverseEngineerBanner, setReverseEngineerBanner] = useState('');
  const [showFullDocPreview, setShowFullDocPreview] = useState(false);

  // State for Goal Picker / Autocomplete per goal card
  const [openPickerGoalId, setOpenPickerGoalId] = useState(null);
  const [pickerEnvFilter, setPickerEnvFilter] = useState('הכל');
  const [pickerSearch, setPickerSearch] = useState('');

  // State for AI Facilitating Questions per goal card
  const [activeAiGoalId, setActiveAiGoalId] = useState(null);
  const [aiQuestionsMap, setAiQuestionsMap] = useState({});
  const [aiAnswersMap, setAiAnswersMap] = useState({});
  const [loadingAiForGoalId, setLoadingAiForGoalId] = useState(null);

  // Sync when switching selected student from the sidebar list
  useEffect(() => {
    setFormData({ ...student });
    setOpenPickerGoalId(null);
    setActiveAiGoalId(null);
  }, [student?.id]);

  // Sorted goal bank (most common first, lowest rated at the bottom)
  const sortedGoals = getSortedGoalBank(goalBank);

  // Update personal or top-level field
  const handleFieldChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value
    }));
  };

  // Update specific goal row
  const handleGoalChange = (goalId, field, value) => {
    setFormData((prev) => ({
      ...prev,
      goals: (prev.goals || []).map((g) =>
        g.id === goalId ? { ...g, [field]: value } : g
      )
    }));
  };

  // Add a new empty goal block and open the smart Goal Picker immediately
  const handleAddGoalRow = () => {
    const newId = 'g_row_' + Date.now();
    const newGoalObj = {
      id: newId,
      environment: 'מרחב הגן',
      activityParticipation: '',
      title: '',
      objectives: '',
      opportunities: '',
      partners: 'צוות הגן, סייעת אישית',
      duration: 'עד סוף השנה',
      evaluationCriteria: ''
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
    setFormData((prev) => ({
      ...prev,
      goals: (prev.goals || []).filter((g) => g.id !== goalId)
    }));
  };

  // Select a goal from the Dynamic Goal Bank
  const handleSelectGoalFromBank = (goalRowId, bankItem, fillTemplate = true) => {
    const studentFirstName = (formData.name || 'הילד/ה').trim().split(/\s+/)[0];
    const personalizedOpportunities = (bankItem.defaultOpportunities || '').replace(
      /הילד/g,
      studentFirstName
    );

    setFormData((prev) => ({
      ...prev,
      goals: (prev.goals || []).map((g) => {
        if (g.id !== goalRowId) return g;
        if (!fillTemplate) {
          return {
            ...g,
            title: bankItem.title,
            environment: bankItem.environment || g.environment
          };
        }
        return {
          ...g,
          title: bankItem.title,
          environment: bankItem.environment || g.environment,
          activityParticipation: g.activityParticipation || bankItem.defaultActivity || '',
          objectives:
            g.objectives ||
            (bankItem.suggestedObjectives || []).map((o) => `• ${o}`).join('\n'),
          opportunities: g.opportunities || personalizedOpportunities || '',
          partners: g.partners || bankItem.defaultPartners || 'צוות חינוכי, הורים',
          duration: g.duration || bankItem.defaultDuration || 'עד סוף השנה',
          evaluationCriteria: g.evaluationCriteria || bankItem.defaultEvaluation || ''
        };
      })
    }));

    // Increment usage count in global bank
    onUseOrAddGoalToBank({
      title: bankItem.title,
      environment: bankItem.environment
    });

    // Load the 3 Facilitating Questions for this HL Goal
    const questions =
      bankItem.facilitatingQuestions && bankItem.facilitatingQuestions.length > 0
        ? bankItem.facilitatingQuestions.slice(0, 3)
        : generateDefaultQuestionsForCustomGoal(bankItem.title, bankItem.environment);

    setAiQuestionsMap((prev) => ({
      ...prev,
      [goalRowId]: questions
    }));
    setActiveAiGoalId(goalRowId);
    setOpenPickerGoalId(null);
  };

  // Define a brand new custom HL Goal and trigger AI Facilitating Questions
  const handleConfirmCustomGoal = async (goalRow) => {
    if (!goalRow.title || !goalRow.title.trim()) return;

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

    // Check if bank already has tailored questions and no API key is set
    const existingBankItem = sortedGoals.find((b) => b.title.trim() === goalTitle);
    const fallbackQuestions =
      existingBankItem?.facilitatingQuestions?.slice(0, 3) ||
      generateDefaultQuestionsForCustomGoal(goalTitle, goalRow.environment);

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
      const prompt = `אתה מדריך פדגוגי מומחה לבניית "תכנית עבודה משותפת ואינטגרטיבית ברוח הגישה האקולוגית" ותח"י.
המורה הגדירה את המטרה העליונה (HL Goal) הבאה:
מטרה: "${goalTitle}"
סביבה / תחום: "${goalRow.environment || 'מרחב הגן / הכיתה'}"
מידע חופשי על הילד: "${formData.teacherFreeText || ''}"

נסח בדיוק 3 שאלות מנחות (Facilitating Questions) קצרות, מכוונות ומעשיות בעברית שיסייעו למורה לדייק את מילוי השדות של מטרה זו בטבלה:
- שאלה 1: על התפקוד הנוכחי של הילד והגורמים המאפשרים/המגבילים בסביבה (עבור שדה "פעילות והשתתפות").
- שאלה 2: על צעדים אופרטיביים הדרגתיים ואמצעי תיווך של הצוות (עבור שדות "יעדים וציוני דרך" ו-"הזדמנויות ואמצעים").
- שאלה 3: על השותפים לתהליך ואמות המידה להערכה בסוף התקופה.

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
    const firstName = (formData.name || 'הילד/ה').trim().split(/\s+/)[0];

    setLoadingAiForGoalId(goalRow.id);

    if (geminiApiKey && (ans1 || ans2 || ans3)) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`;
        const prompt = `אתה מומחה לכתיבת תכנית עבודה אקולוגית ותח"י בעברית.
שם הילד/ה: ${firstName}
סביבה: ${goalRow.environment}
מטרה (מה אנחנו רוצים שיקרה?): ${goalRow.title}

תשובות המורה ל-3 השאלות המנחות:
1. תפקוד בסביבה וגורמים מאפשרים/מגבילים: ${ans1 || 'לא צוין'}
2. צעדים אופרטיביים ואמצעי תיווך: ${ans2 || 'לא צוין'}
3. שותפים, משך ואמות מידה להערכה: ${ans3 || 'לא צוין'}

נסח באופן מקצועי, בהיר ומותאם לטבלה האקולוגית את השדות הבאים והחזר JSON בלבד:
{
  "activityParticipation": "תיאור פעילות והשתתפות בסביבה...",
  "objectives": "• יעד 1\\n• יעד 2\\n• יעד 3",
  "opportunities": "• הזדמנות ותיווך 1\\n• הזדמנות ותיווך 2",
  "partners": "שותפים לתהליך...",
  "duration": "משך הזמן...",
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
              goals: (prev.goals || []).map((g) =>
                g.id === goalRow.id
                  ? {
                      ...g,
                      activityParticipation: enriched.activityParticipation || g.activityParticipation,
                      objectives: enriched.objectives || g.objectives,
                      opportunities: enriched.opportunities || g.opportunities,
                      partners: enriched.partners || g.partners,
                      duration: enriched.duration || g.duration,
                      evaluationCriteria: enriched.evaluationCriteria || g.evaluationCriteria
                    }
                  : g
              )
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
        return {
          ...g,
          activityParticipation:
            ans1
              ? `${ans1}${g.activityParticipation ? `\n${g.activityParticipation}` : ''}`
              : g.activityParticipation || `בסביבת ${g.environment}, ${firstName} מתנסה בפעילות עם תיווך מותאם של הצוות.`,
          objectives:
            ans2
              ? `${g.objectives ? g.objectives + '\n' : ''}• ${ans2}`
              : g.objectives || `• יתקדם בהדרגה לעבר המטרה: ${g.title}.`,
          opportunities:
            ans2
              ? `${g.opportunities ? g.opportunities + '\n' : ''}• הצוות יתווך ל${firstName} באמצעות: ${ans2}.`
              : g.opportunities || `• המבוגר יזמין ויתווך ל${firstName} באופן יומיומי ומדורג.`,
          partners: ans3 ? ans3 : g.partners || 'צוות הגן / הכיתה, סייעת אישית, הורים',
          duration: g.duration || 'עד סוף השנה',
          evaluationCriteria:
            ans3 && ans3.length > 15
              ? ans3
              : g.evaluationCriteria || `יישום עצמאי ועקבי של המטרה (${g.title}) בסביבת ${g.environment}.`
        };
      })
    }));
    setLoadingAiForGoalId(null);
  };

  // Toggle an operative objective chip from the Matya/Ecological bank
  const handleAddSuggestedObjective = (goalRowId, objText) => {
    setFormData((prev) => ({
      ...prev,
      goals: (prev.goals || []).map((g) => {
        if (g.id !== goalRowId) return g;
        const current = (g.objectives || '').trim();
        if (current.includes(objText)) return g;
        const nextObjectives = current ? `${current}\n• ${objText}` : `• ${objText}`;
        return { ...g, objectives: nextObjectives };
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
בהתבסס על הטקסט החופשי שכתבה המורה על הילד/ה ועל כלל המטרות שהוגדרו בתכנית, נסח בשפה פדגוגית מקצועית, קוהרנטית ומדויקת את טבלת הסיכום העליונה של המסמך המורכבת משתי עמודות:
1. "strengthsExisting": מוקדי כוח וכוחות קיימים של התלמיד/ה (ניסוח פדגוגי מקצועי ומכבד, נקודות • מופרדות בשורות חדשות).
2. "strengthsToEmpower": כוחות להעצמה וחיזוק (התחומים והמיומנויות שדורשים חיזוק והעצמה, מנוסחים באופן מקצועי ונגזרים מהטקסט החופשי ומהמטרות שהוגדרו).

טקסט חופשי של המורה:
"${freeText}"

המטרות שהוגדרו לתלמיד/ה:
${goalsSummary}

החזר JSON בלבד:
{
  "strengthsExisting": "• נקודת חוזק 1\\n• נקודת חוזק 2...",
  "strengthsToEmpower": "• תחום להעצמה 1\\n• תחום להעצמה 2..."
}`;

      const parsed = await callGeminiJson(prompt);
      if (parsed && (parsed.strengthsExisting || parsed.strengthsToEmpower)) {
        const updated = {
          ...formData,
          strengthsExisting: parsed.strengthsExisting || formData.strengthsExisting,
          strengthsToEmpower: parsed.strengthsToEmpower || formData.strengthsToEmpower,
          status: 'מוכן להדפסה',
          lastSavedAt: new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })
        };
        setFormData(updated);
        onSaveStudentPlan(updated);
        setIsGeneratingSummary(false);
        setSaveBanner(true);
        setTimeout(() => setSaveBanner(false), 3000);
        return;
      }
    }

    // Use the coherent Hebrew Pedagogical NLP Synthesizer
    const engineered = reverseEngineerRawTextLocally(freeText, formData, goalBank);
    const empowerFromGoals = goalsList.map(
      (g) => `• ${g.environment ? g.environment + ': ' : ''}${g.title.replace(/^(?:התלמיד\/ה|התלמיד|התלמידה|הילד\/ה|הילד|הילדה)\s+/, '')}`
    );

    const baseEmpowerLines = engineered?.strengthsToEmpower
      ? engineered.strengthsToEmpower.split('\n').filter(Boolean)
      : [];

    empowerFromGoals.forEach((line) => {
      if (!baseEmpowerLines.some((existing) => existing.includes(line.slice(0, 14)))) {
        baseEmpowerLines.push(line);
      }
    });

    const updated = {
      ...formData,
      name: engineered?.name || formData.name,
      educationalFramework: engineered?.educationalFramework || formData.educationalFramework,
      strengthsExisting: engineered?.strengthsExisting || formData.strengthsExisting,
      strengthsToEmpower:
        baseEmpowerLines.length > 0
          ? baseEmpowerLines.join('\n')
          : engineered?.strengthsToEmpower || formData.strengthsToEmpower,
      status: 'מוכן להדפסה',
      lastSavedAt: new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })
    };

    setFormData(updated);
    onSaveStudentPlan(updated);
    setIsGeneratingSummary(false);
    setSaveBanner(true);
    setTimeout(() => setSaveBanner(false), 3000);
  };

  // === NEW FEATURE: AI Reverse Engineering from Raw Data Text to Full Formal Report ===
  const handleReverseEngineerFullReport = async () => {
    const rawText = (formData.teacherFreeText || '').trim();
    if (!rawText) {
      window.alert('נא להזין טקסט גולמי על התלמיד/ה בתיבת התיאור החופשי כדי שה-AI יוכל להפיק ממנו דוח רשמי מלא.');
      return;
    }

    setIsReverseEngineering(true);
    setReverseEngineerBanner('');

    // 1. Try Live Gemini AI if API key is provided
    if (geminiApiKey && geminiApiKey.trim()) {
      const bankReference = sortedGoals
        .slice(0, 20)
        .map((b) => `- סביבה: "${b.environment}" | מטרה: "${b.title}"`)
        .join('\n');

      const prompt = `אתה מומחה פדגוגי בכיר לכתיבת "תוכנית עבודה שנתית" (תל"א / תח"י ברוח הגישה האקולוגית) במשרד החינוך.
המורה הזינה טקסט גולמי ("Raw Data") המתאר תלמיד/ה במילים חופשיות.
עליך לבצע "הנדסה לאחור" (Reverse Engineering) מעמיקה: לנתח את המידע הגולמי ולנסח אותו מחדש בשפה פדגוגית מקצועית, רהוטה, קוהרנטית ומדויקת לחלוטין לתלמיד/ה המתואר/ת (כולל התאמת לשון זכר/נקבה, גיל ומסגרת חינוכית). אל תעתיק משפטים גולמיים כמו שהם אלא נסח אותם כדוח חינוכי רשמי!

הדוח הרשמי חייב לכלול:
1. "name": שם התלמיד/ה אם הוזכר בטקסט (או השאר ריק אם לא הוזכר).
2. "educationalFramework": מסגרת חינוכית/כיתה/גן אם הוזכרו בטקסט (או השאר ריק).
3. "strengthsExisting": מוקדי כוח וכוחות קיימים של התלמיד/ה המנוסחים באופן פדגוגי מקצועי ומכבד (נקודות • מופרדות בשורות חדשות).
4. "strengthsToEmpower": כוחות להעצמה וחיזוק הנגזרים באופן מדויק מהקשיים שתוארו בטקסט (נקודות • מופרדות בשורות חדשות).
5. "goals": מערך של 2 עד 4 מטרות מלאות, קוהרנטיות ומדויקות לקשיים הספציפיים של התלמיד/ה בטקסט. לכל מטרה מלא את כל 6 העמודות:
   - "environment": סביבה / תחום ספציפי
   - "activityParticipation": תיאור קוהרנטי ומקצועי של התפקוד הנוכחי של התלמיד/ה בסביבה זו (גורמים מאפשרים ומגבילים על סמך הטקסט של המורה)
   - "title": מטרה עליונה מנוסחת היטב (מה אנחנו רוצים שיקרה?)
   - "objectives": 3 יעדים אופרטיביים מדורגים ומותאמים אישית לתלמיד/ה (נקודות • מופרדות בשורות חדשות)
   - "opportunities": הזדמנויות, אמצעים ודרכי תיווך מעשיות של הצוות עבור התלמיד/ה (נקודות • מופרדות בשורות חדשות)
   - "partners": שותפים לתהליך
   - "duration": משך הזמן
   - "evaluationCriteria": אמות מידה ברורות להערכה
6. "recommendations": המלצות מערכתיות מנוסחות היטב לצוות החינוכי ולהורים.

שם התלמיד/ה הנוכחי בטופס: "${formData.name || ''}"
הטקסט הגולמי של המורה:
"""
${rawText}
"""

מטרות קיימות במאגר להשראה (התאם אותן ספציפית לתלמיד/ה או נסח מטרות חדשות מדויקות):
${bankReference}

החזר JSON תקין בלבד:
{
  "name": "",
  "educationalFramework": "",
  "strengthsExisting": "• חוזק מנוסח מקצועית 1\\n• חוזק מנוסח מקצועית 2",
  "strengthsToEmpower": "• מוקד להעצמה מנוסח מקצועית 1\\n• מוקד להעצמה 2",
  "goals": [
    {
      "environment": "...",
      "activityParticipation": "...",
      "title": "...",
      "objectives": "• יעד 1\\n• יעד 2\\n• יעד 3",
      "opportunities": "• אמצעי תיווך 1\\n• אמצעי תיווך 2",
      "partners": "...",
      "duration": "...",
      "evaluationCriteria": "..."
    }
  ],
  "recommendations": "..."
}`;

      const parsed = await callGeminiJson(prompt);
      if (parsed && Array.isArray(parsed.goals) && parsed.goals.length > 0) {
        const formattedGoals = parsed.goals.map((g, i) => ({
          id: 'g_airev_' + Date.now() + '_' + i,
          environment: g.environment || 'מרחב הגן / הכיתה',
          activityParticipation: g.activityParticipation || '',
          title: g.title || '',
          objectives: g.objectives || '',
          opportunities: g.opportunities || '',
          partners: g.partners || 'צוות חינוכי, הורים',
          duration: g.duration || 'עד סוף השנה',
          evaluationCriteria: g.evaluationCriteria || ''
        }));

        const updated = {
          ...formData,
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
          goals: formattedGoals,
          recommendations: parsed.recommendations || formData.recommendations,
          status: 'מוכן להדפסה',
          lastSavedAt: new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })
        };

        setFormData(updated);
        onSaveStudentPlan(updated);
        formattedGoals.forEach((g) => {
          if (g.title) onUseOrAddGoalToBank(g);
        });
        setIsReverseEngineering(false);
        setReverseEngineerBanner(
          `✨ הדוח הרשמי הופק בהצלחה ב-Gemini AI מתוך הטקסט הגולמי! נוסחו באופן קוהרנטי טבלת מוקדי הכוח, ${formattedGoals.length} מטרות מותאמות אישית ופרק ההמלצות.`
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
        name: engineered.name || formData.name,
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
      setReverseEngineerBanner(
        `✨ הדוח הרשמי הופק בהצלחה מתוך הטקסט הגולמי! נוסחו באופן פדגוגי קוהרנטי טבלת מוקדי הכוח, ${engineered.goals.length} מטרות רשמיות מותאמות לתלמיד/ה (6 עמודות) ופרק ההמלצות.`
      );
      setSaveBanner(true);
      setTimeout(() => setSaveBanner(false), 3500);
    }

    setIsReverseEngineering(false);
  };

  // Save Progress explicitly
  const handleSaveProgress = () => {
    const updated = {
      ...formData,
      lastSavedAt: new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })
    };
    setFormData(updated);
    onSaveStudentPlan(updated);
    // Also record usage for all defined goals
    (updated.goals || []).forEach((g) => {
      if (g.title && g.title.trim()) {
        onUseOrAddGoalToBank(g);
      }
    });
    setSaveBanner(true);
    setTimeout(() => setSaveBanner(false), 2500);
  };

  // === Build Official Document HTML (with or without Privacy Redaction) ===
  const getFullDocTitle = () => {
    return formData.planType
      ? `תוכנית עבודה שנתית – ${formData.planType}`
      : 'תוכנית עבודה שנתית';
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

  // Print the official Ecological Work Plan document with TALA Logo & Theme Colors
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
    const logoUrl = new URL('./tala-logo.jpg', window.location.href).href;

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
                    <span class="sub-instruction">תיאור תוך התייחסות לפעילות הספציפית ולתחומי התפקוד השונים במהלך הפעילות (התייחסות לגורמים המאפשרים והמגבילים בסביבה):</span>
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
              color: #13233a;
              background: #fffdf9;
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
              background: linear-gradient(90deg, #d14928 0%, #f4b942 24%, #216e55 50%, #154c99 76%, #664b8e 100%);
              border-radius: 6px 6px 0 0;
            }
            .print-banner {
              background: linear-gradient(135deg, #0d2b56 0%, #154c99 52%, #216e55 100%);
              color: #ffffff;
              padding: 14px 20px;
              border-bottom: 4px solid #f4b942;
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
              width: 54px;
              height: 54px;
              border-radius: 50%;
              object-fit: cover;
              border: 2px solid #f4b942;
              background: #fff;
            }
            .doc-main-title {
              margin: 0;
              font-size: 19px;
              font-weight: 700;
              color: #fffdf9;
            }
            .doc-meta-side {
              font-size: 12.5px;
              color: #fef7e6;
            }
            .student-details-bar {
              display: flex;
              flex-wrap: wrap;
              gap: 20px;
              padding: 10px 14px;
              border: 1.5px solid #0d2b56;
              border-right: 5px solid #d14928;
              background: #faf6ee;
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
              border: 1.5px solid #1e293b;
              padding: 8px 10px;
              vertical-align: top;
              text-align: right;
              white-space: pre-line;
            }
            .summary-table th.th-existing {
              background: #216e55;
              color: #ffffff;
              font-size: 13.5px;
              font-weight: 700;
              text-align: center;
            }
            .summary-table th.th-empower {
              background: #154c99;
              color: #ffffff;
              font-size: 13.5px;
              font-weight: 700;
              text-align: center;
            }
            .env-header-row td {
              background: #faf6ee;
              border-top: 3px solid #154c99;
            }
            .sub-instruction {
              font-size: 11px;
              color: #4b5b70;
              font-weight: normal;
            }
            .columns-header-row th {
              background: #dce9f9;
              color: #0d2b56;
              font-weight: 700;
              font-size: 12.5px;
              text-align: center;
            }
            .th-sub {
              font-weight: 400;
              font-size: 10.5px;
              display: block;
              color: #2c4668;
            }
            .doc-footer-section {
              margin-top: 14px;
              page-break-inside: avoid;
            }
            .recommendations-box {
              border: 1.5px solid #0d2b56;
              background: #faf6ee;
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
              color: #0d2b56;
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

  return (
    <div className="workplan-form-container" dir="rtl">
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

          {formData.lastSavedAt && !saveBanner && (
            <span className="last-saved-hint">שמירה אחרונה: {formData.lastSavedAt}</span>
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
              הסתר פרטים מזהים בהדפסה (ראשי תיבות: <strong>{toHebrewAcronym(formData.name)}</strong> והשחרת פרטים)
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
            <img src="./tala-logo.jpg" alt="TALA Emblem" className="doc-banner-logo" />
            <h2 className="main-ecological-heading">
              {getFullDocTitle()}
            </h2>
          </div>
          <div className="inline-meta-field">
            <label>שנת לימודים:</label>
            <input
              type="text"
              value={formData.schoolYear || ''}
              onChange={(e) => handleFieldChange('schoolYear', e.target.value)}
              placeholder='למשל: תשפ"ז'
            />
          </div>
        </div>
      </div>

      {/* Section 1: Student Personal Details & Plan Type Radio Selector */}
      <section className="form-section-card">
        <div className="section-header-line">
          <h3>1. פרטים אישיים של הילד/ה ומסגרת חינוכית</h3>
          {hideStudentDetailsOnPrint && (
            <span className="privacy-active-pill">
              🔒 מצב חיסיון בהדפסה פעיל: יודפס כ-"{toHebrewAcronym(formData.name)}" ופרטים אישיים יושחרו (████████)
            </span>
          )}
        </div>

        {/* Radio Buttons for תל"א OR תח"י */}
        <div className="plan-type-radio-bar">
          <span className="plan-type-label">סוג התוכנית (מתעדכן אוטומטית בכותרת המסמך):</span>
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
              <span>תל"א (תוכנית לימודים אישית)</span>
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
              <span>תח"י (תוכנית חינוכית יחידנית)</span>
            </label>
          </div>
        </div>

        <div className="personal-details-grid">
          <div className="form-field">
            <label>שם הילד/ה:</label>
            <input
              type="text"
              value={formData.name || ''}
              onChange={(e) => handleFieldChange('name', e.target.value)}
              placeholder="שם פרטי ושם משפחה"
            />
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
            <label>ת.ל (תאריך לידה):</label>
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

      {/* Section 2: Teacher Free Text (Raw Data) + AI Reverse Engineering + Submit Button + Top Summary Table */}
      <section className="form-section-card highlight-summary-section">
        <div className="section-header-line">
          <h3>2. תיאור חופשי של המורה וטבלת מוקדי כוח מסכמת (בראש המסמך)</h3>
          <span className="ai-raw-data-badge">
            ✨ חדש: ניתן להזין כאן מידע גולמי (Raw Data) ולהפיק ממנו דוח רשמי מלא בלחיצה!
          </span>
        </div>

        <div className="free-text-area-box">
          <label className="bold-label">
            ✍️ תיאור חופשי / מידע גולמי (Raw Data) של המורה על הילד/ה (אופי, תחומי עניין, חוזקות, קשיים ותפקוד יומיומי):
          </label>
          <textarea
            rows={4}
            value={formData.teacherFreeText || ''}
            onChange={(e) => handleFieldChange('teacherFreeText', e.target.value)}
            placeholder="הזיני כאן מידע גולמי וחופשי על התלמיד/ה... למשל: ילד נעים, חברותי וסקרן בעל יכולת ריכוז טובה, וורבלי ומלא אנרגיות. מתקשה במשחק משותף עם חברים ומשחק לידם באופן תבניתי, לא ניגש לשולחן הסדנא מיוזמתו ומתקשה בתכנון והתארגנות, וזקוק לתיווך בגמילה בשירותים ובוויסות רגשי..."
          />

          <div className="submit-summary-action-row">
            <span className="submit-helper-text">
              בחרי האם להפוך את הטקסט הגולמי לתוכנית עבודה רשמית מלאה (הנדסה לאחור ב-AI של כל הטופס והמטרות) או לעדכן את טבלת הסיכום העליונה:
            </span>
            <div className="raw-data-ai-buttons-group">
              <button
                type="button"
                className="btn-reverse-engineer-report"
                onClick={handleReverseEngineerFullReport}
                disabled={isReverseEngineering || isGeneratingSummary}
                title="מנתח את הטקסט הגולמי וממלא אוטומטית את כל הדוח הרשמי: מוקדי כוח, מטרות ויעדים ב-6 עמודות והמלצות"
              >
                <Wand2 size={17} />
                <span>
                  {isReverseEngineering
                    ? 'מבצע הנדסה לאחור ומייצר דוח רשמי מלא...'
                    : '✨ הנדסה לאחור ב-AI – הפוך מידע גולמי לדוח רשמי מלא'}
                </span>
              </button>

              <button
                type="button"
                className="btn-submit-generate-summary"
                onClick={handleSubmitGenerateSummaryTable}
                disabled={isGeneratingSummary || isReverseEngineering}
              >
                <Sparkles size={17} />
                <span>
                  {isGeneratingSummary
                    ? 'מנתח מטרות וטקסט חופשי...'
                    : 'Submit – צור/עדכן טבלת מוקדי כוח וסיכום בראש המסמך'}
                </span>
              </button>
            </div>
          </div>

          {reverseEngineerBanner && (
            <div className="reverse-engineer-success-banner">
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
                <td>
                  <textarea
                    rows={5}
                    value={formData.strengthsExisting || ''}
                    onChange={(e) => handleFieldChange('strengthsExisting', e.target.value)}
                    placeholder="כוחות קיימים של הילד/ה (מתמלא אוטומטית בלחיצה על Submit וניתן לעריכה חופשית)..."
                  />
                </td>
                <td>
                  <textarea
                    rows={5}
                    value={formData.strengthsToEmpower || ''}
                    onChange={(e) => handleFieldChange('strengthsToEmpower', e.target.value)}
                    placeholder="כוחות להעצמה וחיזוק (מתמלא אוטומטית מתוך הטקסט החופשי וכל המטרות שהוגדרו)..."
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
          <div className="section-header-line">
            <h3>📄 תצוגה מקדימה של המסמך המלא להדפסה ({hideStudentDetailsOnPrint ? 'מצב חסוי – ראשי תיבות והשחרה' : 'מצב גלוי מלא'})</h3>
            <button type="button" className="btn-print-doc" onClick={handlePrintDocument}>
              <Printer size={16} />
              <span>שלח להדפסה כעת</span>
            </button>
          </div>

          <div className="preview-paper-sheet">
            <div className="stained-glass-top-strip" style={{ borderRadius: '6px 6px 0 0' }} />
            <div style={{ background: 'linear-gradient(135deg, #0d2b56 0%, #154c99 52%, #216e55 100%)', color: '#fff', padding: '12px 18px', borderBottom: '3px solid #f4b942', borderRadius: '0 0 8px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span style={{ fontSize: '12.5px' }}><strong>תאריך:</strong> {formData.date}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <img src="./tala-logo.jpg" alt="TALA Logo" style={{ width: '44px', height: '44px', borderRadius: '50%', border: '2px solid #f4b942', objectFit: 'cover' }} />
                <h4 style={{ margin: 0, fontSize: '17px', color: '#fffdf9' }}>
                  {getFullDocTitle()}
                </h4>
              </div>
              <span style={{ fontSize: '12.5px' }}><strong>שנת לימודים:</strong> {formData.schoolYear}</span>
            </div>
            <div style={{ display: 'flex', gap: '18px', flexWrap: 'wrap', padding: '8px 12px', background: '#faf6ee', border: '1.5px solid #0d2b56', borderRight: '4px solid #d14928', borderRadius: '6px', marginBottom: '12px', fontSize: '13px' }}>
              <span><strong>שם הילד/ה:</strong> {getDisplayStudentName()}</span>
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
                  <th style={{ width: '50%', background: '#216e55', color: '#fff', textAlign: 'center' }}>מוקדי כוח: כוחות קיימים</th>
                  <th style={{ width: '50%', background: '#154c99', color: '#fff', textAlign: 'center' }}>כוחות להעצמה וחיזוק</th>
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
                  <tr style={{ background: '#faf6ee' }}>
                    <td colSpan={6}>
                      <strong>סביבה: {g.environment}</strong> | <strong>פעילות והשתתפות:</strong> {getRedactedText(g.activityParticipation)}
                    </td>
                  </tr>
                  <tr style={{ background: '#dce9f9', color: '#0d2b56', fontWeight: 'bold' }}>
                    <td>מטרה (מה אנחנו רוצים שיקרה?)</td>
                    <td>יעדים, ציוני דרך (צעדים אופרטיביים)</td>
                    <td>הזדמנויות, אמצעים ואיך נגרום לזה לקרות?</td>
                    <td>שותפים (מי ובאיזה אופן?)</td>
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
              בחרי מטרה מתוך מאגר המטרות הדינמי (המטרות הנפוצות ביותר מופיעות ראשונות) או הקלידי מטרה חדשה שתישמר אוטומטית לשימוש עתידי.
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
            const matchedBankItem = sortedGoals.find(
              (b) => b.title.trim() === (goalRow.title || '').trim()
            );
            const currentQuestions =
              aiQuestionsMap[goalRow.id] ||
              matchedBankItem?.facilitatingQuestions?.slice(0, 3) ||
              generateDefaultQuestionsForCustomGoal(goalRow.title, goalRow.environment);

            // Filter goals in picker by search & environment, preserving popularity sort
            const filteredBankGoals = sortedGoals.filter((item) => {
              const matchesEnv =
                pickerEnvFilter === 'הכל' || item.environment === pickerEnvFilter;
              const q = (pickerSearch || '').trim();
              const matchesQuery =
                !q ||
                item.title.includes(q) ||
                (item.environment && item.environment.includes(q)) ||
                (item.suggestedObjectives || []).some((o) => o.includes(q));
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
                      <option value="__custom__">אחר (הקלדה חופשית)...</option>
                    </select>
                    <input
                      type="text"
                      value={goalRow.environment || ''}
                      onChange={(e) => handleGoalChange(goalRow.id, 'environment', e.target.value)}
                      placeholder="הקלד סביבה (למשל: שירותים, סדנא, מרחב הגן)..."
                      className="env-text-input"
                    />
                  </div>

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

                {/* Row 1 (Colspan 6 in Doc): Activity & Participation */}
                <div className="activity-participation-box">
                  <label>
                    <strong>פעילות והשתתפות בסביבה ({goalRow.environment || 'כללי'}): </strong>
                    <span>
                      תיאור תוך התייחסות לפעילות הספציפית ולתחומי התפקוד השונים במהלך הפעילות (התייחסי לגורמים המאפשרים והמגבילים בסביבה):
                    </span>
                  </label>
                  <textarea
                    rows={2}
                    value={goalRow.activityParticipation || ''}
                    onChange={(e) =>
                      handleGoalChange(goalRow.id, 'activityParticipation', e.target.value)
                    }
                    placeholder="תארי כיצד הילד/ה מתפקד/ת בסביבה זו כיום, מה מאפשר ומה מגביל..."
                  />
                </div>

                {/* HL Goal Selector / Autocomplete Bar */}
                <div className="hl-goal-selector-section">
                  <div className="hl-goal-header-row">
                    <label className="hl-goal-label">
                      🎯 מטרה עליונה (HL Goal) – מה אנחנו רוצים שיקרה?
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
                            : `בחר ממאגר המטרות הדינמי (${sortedGoals.length} מטרות לפי פופולריות)`}
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
                        <span>3 שאלות מנחות AI למילוי המטרה</span>
                      </button>

                      {isAdmin && onOpenGoalBankManager && (
                        <button
                          type="button"
                          className="btn-admin-manage-bank-inline"
                          onClick={onOpenGoalBankManager}
                          title="הוסף, ערוך או הסר מטרות במאגר המטרות הדינמי (Admin)"
                        >
                          <span>👑 עריכת מאגר מטרות (Admin)</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Autocomplete / Free-define Input for HL Goal */}
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
                    {goalRow.title && !matchedBankItem && (
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
                            כל המטרות ({sortedGoals.length})
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
                        {filteredBankGoals.map((bankItem, rankIdx) => (
                          <div key={bankItem.id} className="goal-bank-option-row">
                            <div
                              className="goal-bank-option-main"
                              onClick={() => handleSelectGoalFromBank(goalRow.id, bankItem, true)}
                            >
                              <div className="goal-option-title-line">
                                <span className="popularity-rank-badge">
                                  #{rankIdx + 1}
                                </span>
                                <strong>{bankItem.title}</strong>
                                <span className="env-tag-chip">{bankItem.environment}</span>
                                <span className="usage-count-badge">
                                  <TrendingUp size={12} />
                                  <span>נבחר {bankItem.usageCount || 1} פעמים</span>
                                </span>
                              </div>
                              {bankItem.suggestedObjectives && bankItem.suggestedObjectives.length > 0 && (
                                <div className="goal-option-sub-preview">
                                  יעדים במאגר: {bankItem.suggestedObjectives.slice(0, 2).join(' | ')}
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
                        ))}

                        {pickerSearch.trim() &&
                          !sortedGoals.some((b) => b.title.trim() === pickerSearch.trim()) && (
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
                                  {qObj.suggestions.map((sug, sIdx) => (
                                    <button
                                      key={sIdx}
                                      type="button"
                                      className="ai-sug-chip"
                                      onClick={() => {
                                        const prevAns = aiAnswersMap[goalRow.id] || {};
                                        const nextVal = prevAns[qIdx]
                                          ? `${prevAns[qIdx]}, ${sug}`
                                          : sug;
                                        setAiAnswersMap({
                                          ...aiAnswersMap,
                                          [goalRow.id]: { ...prevAns, [qIdx]: nextVal }
                                        });
                                      }}
                                    >
                                      + {sug}
                                    </button>
                                  ))}
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
                        <th style={{ width: '18%' }}>
                          מטרה
                          <span className="col-sub">מה אנחנו רוצים שיקרה?</span>
                        </th>
                        <th style={{ width: '23%' }}>
                          יעדים, ציוני דרך
                          <span className="col-sub">פירוט צעדים אופרטיביים</span>
                        </th>
                        <th style={{ width: '23%' }}>
                          הזדמנויות, אמצעים
                          <span className="col-sub">ואיך נגרום לזה לקרות?</span>
                        </th>
                        <th style={{ width: '13%' }}>
                          שותפים
                          <span className="col-sub">מי ובאיזה אופן?</span>
                        </th>
                        <th style={{ width: '9%' }}>משך</th>
                        <th style={{ width: '14%' }}>אמות מידה להערכה</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>
                          <textarea
                            rows={5}
                            value={goalRow.title || ''}
                            onChange={(e) =>
                              handleGoalChange(goalRow.id, 'title', e.target.value)
                            }
                            placeholder="המטרה העליונה..."
                            style={{ fontWeight: 600 }}
                          />
                        </td>
                        <td>
                          <textarea
                            rows={5}
                            value={goalRow.objectives || ''}
                            onChange={(e) =>
                              handleGoalChange(goalRow.id, 'objectives', e.target.value)
                            }
                            placeholder="• יעד אופרטיבי 1&#10;• יעד אופרטיבי 2..."
                          />
                          {matchedBankItem?.suggestedObjectives?.length > 0 && (
                            <div className="quick-objectives-bank">
                              <small>הוסף יעד מהמאגר בלחיצה:</small>
                              <div className="quick-obj-chips">
                                {matchedBankItem.suggestedObjectives.map((obj, oIdx) => (
                                  <button
                                    key={oIdx}
                                    type="button"
                                    className="chip-add-obj"
                                    onClick={() => handleAddSuggestedObjective(goalRow.id, obj)}
                                  >
                                    + {obj}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </td>
                        <td>
                          <textarea
                            rows={5}
                            value={goalRow.opportunities || ''}
                            onChange={(e) =>
                              handleGoalChange(goalRow.id, 'opportunities', e.target.value)
                            }
                            placeholder="אמצעים, תיווך והזדמנויות בסדר היום..."
                          />
                        </td>
                        <td>
                          <textarea
                            rows={5}
                            value={goalRow.partners || ''}
                            onChange={(e) =>
                              handleGoalChange(goalRow.id, 'partners', e.target.value)
                            }
                            placeholder="צוות הגן, סייעת, מרפאה בעיסוק..."
                          />
                        </td>
                        <td>
                          <textarea
                            rows={5}
                            value={goalRow.duration || ''}
                            onChange={(e) =>
                              handleGoalChange(goalRow.id, 'duration', e.target.value)
                            }
                            placeholder="כשלושה חודשים / עד סוף השנה"
                          />
                        </td>
                        <td>
                          <textarea
                            rows={5}
                            value={goalRow.evaluationCriteria || ''}
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
          <h3>4. המלצות וחתימות</h3>
        </div>
        <div className="form-field">
          <label>המלצות להמשך (לצוות החינוכי ולהורים):</label>
          <textarea
            rows={3}
            value={formData.recommendations || ''}
            onChange={(e) => handleFieldChange('recommendations', e.target.value)}
            placeholder="המלצות יישומיות להמשך הליווי והעבודה המשותפת..."
          />
        </div>

        <div className="bottom-signatures-preview">
          <div>חתימת הצוות החינוכי: _________________________</div>
          <div>חתימת הורים: _________________________</div>
        </div>

        <div className="bottom-final-actions">
          <button type="button" className="btn-save-progress" onClick={handleSaveProgress}>
            <Save size={18} />
            <span>שמור התקדמות לעריכה עתידית</span>
          </button>

          <button
            type="button"
            className="btn-submit-generate-summary"
            onClick={handleSubmitGenerateSummaryTable}
          >
            <Sparkles size={18} />
            <span>Submit – עדכן טבלת סיכום עליונה ושמור הכל</span>
          </button>

          <button type="button" className="btn-print-doc" onClick={handlePrintDocument}>
            <Printer size={18} />
            <span>
              הדפס מסמך ({hideStudentDetailsOnPrint ? 'במצב חסוי: ראשי תיבות והשחרה' : 'במצב גלוי מלא'})
            </span>
          </button>
        </div>
      </section>
    </div>
  );
}
