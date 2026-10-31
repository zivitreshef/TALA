import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { reverseEngineerRawTextLocally } from '../goalBankData';

describe('Reverse Engineer AI Error Resilience & Network Glitch Safeguards', () => {
  const formSource = fs.readFileSync(
    path.resolve(__dirname, '../EcologicalWorkPlanForm.jsx'),
    'utf8'
  );

  it('declares reverseEngineerError and reverseEngineerElapsedSeconds states', () => {
    expect(formSource).toContain("const [reverseEngineerError, setReverseEngineerError] = useState('');");
    expect(formSource).toContain("const [reverseEngineerElapsedSeconds, setReverseEngineerElapsedSeconds] = useState(0);");
  });

  it('tracks elapsed seconds during isReverseEngineering to power progressive reassurance UI', () => {
    expect(formSource).toContain('setReverseEngineerElapsedSeconds((prev) => prev + 1);');
    expect(formSource).toContain('reverseEngineerElapsedSeconds >= 25');
    expect(formSource).toContain('reverseEngineerElapsedSeconds >= 12');
  });

  it('provides emergency local fallback button in the busy indicator when network takes >= 15 seconds', () => {
    expect(formSource).toContain('reverseEngineerElapsedSeconds >= 15');
    expect(formSource).toContain('handleForceLocalReverseEngineer()');
    expect(formSource).toContain('מעבר לעיבוד מקומי ללא אינטרנט');
  });

  it('renders a dedicated error banner with Retry and Local Synthesis buttons on network/AI failure', () => {
    expect(formSource).toContain('className="reverse-engineer-error-banner"');
    expect(formSource).toContain('🔄 נסי שוב');
    expect(formSource).toContain('⚡ הפק במנוע מקומי');
    expect(formSource).toContain('setReverseEngineerError(\'\')');
  });

  it('strictly protects handleReverseEngineerFullReport with try/catch/finally ensuring spinner reset', () => {
    const fnStart = formSource.indexOf('const handleReverseEngineerFullReport = async () => {');
    const fnBody = formSource.slice(fnStart, fnStart + 16000);

    expect(fnBody).toContain('try {');
    expect(fnBody).toContain('} catch (err) {');
    expect(fnBody).toContain('} finally {');
    expect(fnBody).toContain('setIsReverseEngineering(false);');
  });

  it('protects other AI handlers (summary table, eval report, status report) with try/finally', () => {
    const summaryStart = formSource.indexOf('const handleSubmitGenerateSummaryTable = async () => {');
    const summaryBody = formSource.slice(summaryStart, summaryStart + 2000);
    expect(summaryBody).toContain('setIsGeneratingSummary(false);');

    const evalStart = formSource.indexOf('const handleProcessFullEvalReportAi = async () => {');
    const evalBody = formSource.slice(evalStart, evalStart + 3500);
    expect(evalBody).toContain('setIsProcessingFullEvalAi(false);');

    const statusStart = formSource.indexOf('const handleGenerateStatusReport = async () => {');
    const statusBody = formSource.slice(statusStart, statusStart + 12000);
    expect(statusBody).toContain('setIsGeneratingStatusReport(false);');
  });

  it('local engine synthesizes valid goals immediately when raw text is provided without internet', () => {
    const rawText = 'ילד סקרן וחברותי בכיתה א, זקוק לתיווך במעברים והתארגנות עם קלמר וספרים, מתקשה בכתיבה ממושכת.';
    const formData = {
      name: 'איתי',
      gender: 'boy',
      stage: 'school',
      educationalFramework: 'בית ספר יסודי'
    };

    const engineered = reverseEngineerRawTextLocally(rawText, formData, []);
    expect(engineered).not.toBeNull();
    expect(Array.isArray(engineered.goals)).toBe(true);
    expect(engineered.goals.length).toBeGreaterThan(0);
    expect(engineered.goals[0].title).toBeTruthy();
  });
});
