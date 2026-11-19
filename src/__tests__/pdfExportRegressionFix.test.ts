import { describe, it, expect, vi } from 'vitest';
import {
  buildWorkPlanPrintHtml,
  buildEvalReportPrintHtml,
  buildStatusReportPrintHtml,
  buildWordDocumentHtml
} from '../export/wordAndPrintBuilders';
import { generatePdfBlobFromHtml } from '../emailService';

describe('PDF Export & Empty White PDF Regression Guard (v3.0.86)', () => {
  const sampleStudentData = {
    idNumber: '312456789',
    studentName: 'יונתן כהן',
    studentMainGoal: 'שיפור מיומנויות תקשורת וקריאה שוטפת',
    schoolYear: 'תשפ״ו',
    educationalFramework: 'כיתת שילוב',
    goals: [
      {
        id: 'g1',
        title: 'יונתן יקרא קטע קצר ויענה על 3 שאלות הבנה',
        environment: 'כיתת אם',
        status: 'בביצוע'
      }
    ],
    statusReportSections: [
      {
        title: 'תמונת מצב כללית',
        content: 'התלמיד משתלב היטב ומגלה מוטיבציה גבוהה.'
      }
    ]
  };

  it('1. verifies print HTML builders produce standard web HTML without Word XML Office artifacts', () => {
    const workPlanPrint = buildWorkPlanPrintHtml(sampleStudentData, false, 'https://example.com/logo.png');
    const evalPrint = buildEvalReportPrintHtml(sampleStudentData, false, 'https://example.com/logo.png');
    const statusPrint = buildStatusReportPrintHtml(sampleStudentData, false, 'https://example.com/logo.png');

    // All print builders MUST produce clean web documents
    for (const html of [workPlanPrint, evalPrint, statusPrint]) {
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('dir="rtl"');
      expect(html).toContain('lang="he"');
      // Must NOT contain Word XML schemas or mso conditionals which corrupt browser canvas rendering
      expect(html).not.toContain('xmlns:o="urn:schemas-microsoft-com:office:office"');
      expect(html).not.toContain('<!--[if gte mso 9]>');
      expect(html).not.toContain('<w:WordDocument>');
    }

    // Conversely, Word HTML builders DO contain Word schemas (for Word (.doc) only)
    const wordDoc = buildWordDocumentHtml(sampleStudentData, false);
    expect(wordDoc).toContain('xmlns:o="urn:schemas-microsoft-com:office:office"');
    expect(wordDoc).toContain('<!--[if gte mso 9]>');
  });

  it('2. verifies generatePdfBlobFromHtml detects portrait vs landscape from CSS or forced orientation', async () => {
    let capturedOptions: any = null;
    const mockOutputPdf = vi.fn().mockResolvedValue(new Blob(['valid-pdf-bytes-1234567890'.repeat(30)], { type: 'application/pdf' }));
    const mockFrom = vi.fn().mockReturnValue({ outputPdf: mockOutputPdf });
    const mockSet = vi.fn().mockImplementation((opt: any) => {
      capturedOptions = opt;
      return { from: mockFrom };
    });
    const mockHtml2Pdf = vi.fn().mockReturnValue({ set: mockSet });

    const fakeContainer: any = {
      style: {},
      querySelectorAll: vi.fn().mockReturnValue([]),
      parentNode: { removeChild: vi.fn() }
    };
    const fakeDoc: any = {
      createElement: vi.fn().mockReturnValue(fakeContainer),
      body: { appendChild: vi.fn() }
    };

    const prevDoc = (globalThis as any).document;
    (globalThis as any).document = fakeDoc;
    vi.doMock('html2pdf.js', () => ({ default: mockHtml2Pdf }));

    try {
      // Landscape test (Work Plan)
      const landscapeHtml = '<!DOCTYPE html><html><head><style>@page { size: A4 landscape; }</style></head><body>Landscape content</body></html>';
      const landscapeBlob = await generatePdfBlobFromHtml(landscapeHtml, 'workplan.pdf');
      expect(landscapeBlob).toBeDefined();
      expect(capturedOptions.jsPDF.orientation).toBe('landscape');
      expect(capturedOptions.html2canvas.windowWidth).toBe(1060);
      expect(fakeContainer.style.width).toBe('1060px');

      // Portrait test with forced orientation (Status Report)
      const statusHtml = '<!DOCTYPE html><html><head><style>@page { size: A4 portrait; }</style></head><body>Portrait content</body></html>';
      const portraitBlob = await generatePdfBlobFromHtml(statusHtml, 'status.pdf', 'portrait');
      expect(portraitBlob).toBeDefined();
      expect(capturedOptions.jsPDF.orientation).toBe('portrait');
      expect(capturedOptions.html2canvas.windowWidth).toBe(794);
      expect(fakeContainer.style.width).toBe('794px');
    } finally {
      (globalThis as any).document = prevDoc;
      vi.restoreAllMocks();
      vi.doUnmock('html2pdf.js');
    }
  });

  it('3. rejects empty or corrupted PDF blobs smaller than 500 bytes to prevent teacher blank PDF delivery', async () => {
    const mockEmptyOutputPdf = vi.fn().mockResolvedValue(new Blob(['tiny'], { type: 'application/pdf' }));
    const mockFrom = vi.fn().mockReturnValue({ outputPdf: mockEmptyOutputPdf });
    const mockSet = vi.fn().mockReturnValue({ from: mockFrom });
    const mockHtml2Pdf = vi.fn().mockReturnValue({ set: mockSet });

    const fakeContainer: any = {
      style: {},
      querySelectorAll: vi.fn().mockReturnValue([]),
      parentNode: { removeChild: vi.fn() }
    };
    const fakeDoc: any = {
      createElement: vi.fn().mockReturnValue(fakeContainer),
      body: { appendChild: vi.fn() }
    };

    const prevDoc = (globalThis as any).document;
    (globalThis as any).document = fakeDoc;
    vi.doMock('html2pdf.js', () => ({ default: mockHtml2Pdf }));

    try {
      await expect(
        generatePdfBlobFromHtml('<html><body><h1>Test</h1></body></html>', 'empty_test.pdf')
      ).rejects.toThrow('הפקת קובץ ה-PDF נכשלה או שהקובץ ריק');
    } finally {
      (globalThis as any).document = prevDoc;
      vi.restoreAllMocks();
      vi.doUnmock('html2pdf.js');
    }
  });

  it('4. ensures body CSS rules are adapted so container retains full typography and text direction', async () => {
    let capturedContainer: any = null;
    const mockOutputPdf = vi.fn().mockResolvedValue(new Blob(['valid-pdf-bytes-1234567890'.repeat(30)], { type: 'application/pdf' }));
    const mockFrom = vi.fn().mockReturnValue({ outputPdf: mockOutputPdf });
    const mockSet = vi.fn().mockReturnValue({ from: mockFrom });
    const mockHtml2Pdf = vi.fn().mockReturnValue({ set: mockSet });

    const fakeContainer: any = {
      style: {},
      querySelectorAll: vi.fn().mockReturnValue([]),
      parentNode: { removeChild: vi.fn() }
    };
    const fakeDoc: any = {
      createElement: vi.fn().mockImplementation(() => {
        capturedContainer = fakeContainer;
        return fakeContainer;
      }),
      body: { appendChild: vi.fn() }
    };

    const prevDoc = (globalThis as any).document;
    (globalThis as any).document = fakeDoc;
    vi.doMock('html2pdf.js', () => ({ default: mockHtml2Pdf }));

    try {
      const styledHtml = '<!DOCTYPE html><html><head><style>body { font-family: "Rubik", sans-serif; color: #243b47; }</style></head><body><h1>בדיקת סגנון</h1></body></html>';
      await generatePdfBlobFromHtml(styledHtml, 'styled.pdf');

      expect(capturedContainer.className).toBe('tala-pdf-export-container');
      expect(capturedContainer.innerHTML).toContain('body, .tala-pdf-export-container');
      // Must NOT apply position: fixed (which causes 0-height parent collapse in html2canvas)
      expect(capturedContainer.style.position).not.toBe('fixed');
      expect(capturedContainer.style.zIndex).not.toBe('-99999');
    } finally {
      (globalThis as any).document = prevDoc;
      vi.restoreAllMocks();
      vi.doUnmock('html2pdf.js');
    }
  });
});
