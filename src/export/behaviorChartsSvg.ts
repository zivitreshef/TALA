import type { BaselineDataPoint, OngoingTrackingPoint, BehaviorFunction } from '../domain/types';

export const BEHAVIOR_FUNCTION_HEBREW_LABELS: Record<string, string> = {
  escape: 'הימנעות ממטלה',
  attention: 'קבלת תשומת לב',
  tangible: 'גישה לפריט או פעילות',
  sensory: 'ויסות חושי עצמי'
};

export interface ChartSvgOptions {
  isPrint?: boolean;
  title?: string;
  width?: number;
  height?: number;
}

/**
 * Generate standalone SVG for Graph 1: תדירות התנהגות מטרה בשלב קו הבסיס
 */
export function generateBaselineBarChartSvg(
  data: BaselineDataPoint[] = [],
  options: ChartSvgOptions = {}
): string {
  const isPrint = options.isPrint ?? true;
  const title = options.title || 'תדירות התנהגות מטרה בשלב קו הבסיס';

  if (!data || data.length < 3) {
    const count = data ? data.length : 0;
    return `
      <div style="border: 1.5px dashed #cbd5e1; border-radius: 8px; padding: 18px; text-align: center; background: #f8fafc; color: #475569; margin: 12px 0; font-family: Arial, sans-serif;">
        <div style="font-weight: 700; font-size: 13px; color: #1e293b; margin-bottom: 4px;">${title}</div>
        <div style="font-size: 12px;">נדרשות לפחות 3 נקודות תצפית להפקת תרשים מלא (כרגע נאספו ${count} מתוך 3).</div>
      </div>
    `.trim();
  }

  const values = data.map((d) => Number(d.value) || 0);
  const sum = values.reduce((a, b) => a + b, 0);
  const avg = Math.round((sum / values.length) * 10) / 10;
  const maxVal = Math.max(...values, 10);
  const yUpper = Math.ceil(maxVal * 1.15);

  const width = options.width || 620;
  const height = options.height || 320;
  const padding = { top: 50, right: 35, bottom: 65, left: 55 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const barWidth = Math.min(50, Math.max(26, (chartW / data.length) * 0.55));
  const slotWidth = chartW / data.length;

  const avgY = padding.top + chartH - (avg / yUpper) * chartH;

  const bgFill = isPrint ? '#ffffff' : '#1a202c';
  const borderStroke = isPrint ? '#cbd5e1' : '#2d3748';
  const gridStroke = isPrint ? '#e2e8f0' : '#2d3748';
  const textColor = isPrint ? '#1e293b' : '#f8fafc';
  const subtextColor = isPrint ? '#64748b' : '#94a3b8';
  const barFill = '#2563eb';
  const avgStroke = '#d97706';

  // Grid lines
  const gridLines = [0, 0.25, 0.5, 0.75, 1]
    .map((ratio) => {
      const tickVal = Math.round(yUpper * ratio);
      const yPos = padding.top + chartH - ratio * chartH;
      return `
        <line x1="${padding.left}" y1="${yPos}" x2="${padding.left + chartW}" y2="${yPos}" stroke="${gridStroke}" stroke-width="1" />
        <text x="${padding.left - 8}" y="${yPos + 4}" fill="${subtextColor}" font-size="11" text-anchor="end" font-family="Arial, sans-serif">${tickVal}</text>
      `;
    })
    .join('');

  // Bars
  const bars = data
    .map((d, idx) => {
      const val = Number(d.value) || 0;
      const barHeight = (val / yUpper) * chartH;
      const x = padding.left + idx * slotWidth + (slotWidth - barWidth) / 2;
      const y = padding.top + chartH - barHeight;
      const label = d.sessionOrPeriod || `יום ${idx + 1}`;

      return `
        <g>
          <rect x="${x}" y="${y}" width="${barWidth}" height="${Math.max(2, barHeight)}" rx="4" ry="4" fill="${barFill}" />
          <text x="${x + barWidth / 2}" y="${y - 6}" fill="${textColor}" font-size="11" font-weight="700" text-anchor="middle" font-family="Arial, sans-serif">${val}</text>
          <text x="${x + barWidth / 2}" y="${padding.top + chartH + 18}" fill="${subtextColor}" font-size="10.5" font-weight="600" text-anchor="middle" font-family="Arial, sans-serif">${label}</text>
        </g>
      `;
    })
    .join('');

  return `
    <div style="border: 1px solid ${borderStroke}; border-radius: 8px; background: ${bgFill}; padding: 12px; margin: 12px 0;">
      <div style="text-align: center; margin-bottom: 6px;">
        <span style="font-weight: 700; font-size: 13px; color: ${textColor}; font-family: Arial, sans-serif;">${title}</span>
      </div>
      <svg dir="ltr" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" style="width: 100%; max-width: ${width}px; height: auto; display: block; margin: 0 auto; direction: ltr;">
        ${gridLines}
        ${bars}
        <!-- Average line -->
        <line x1="${padding.left}" y1="${avgY}" x2="${padding.left + chartW}" y2="${avgY}" stroke="${avgStroke}" stroke-width="2" stroke-dasharray="5,4" />
        <rect x="${padding.left + chartW - 130}" y="${avgY - 20}" width="125" height="18" rx="4" fill="${avgStroke}" />
        <text x="${padding.left + chartW - 67}" y="${avgY - 7}" fill="#ffffff" font-size="10.5" font-weight="700" text-anchor="middle" font-family="Arial, sans-serif">ממוצע קו בסיס: ${avg}</text>
        <!-- Axis labels -->
        <text x="${padding.left + chartW / 2}" y="${height - 10}" fill="${subtextColor}" font-size="11" font-weight="600" text-anchor="middle" font-family="Arial, sans-serif">מועד / יום תצפית</text>
        <text transform="rotate(-90 18 ${height / 2})" x="18" y="${height / 2}" fill="${subtextColor}" font-size="11" font-weight="600" text-anchor="middle" font-family="Arial, sans-serif">מספר אירועים בשיעור</text>
      </svg>
    </div>
  `.trim();
}

/**
 * Generate standalone SVG for Graph 2: התפלגות התפקוד המשוער של ההתנהגות
 */
export function generateFunctionDistributionSvg(
  distribution?: Record<string, number>,
  mainFunction: BehaviorFunction = 'escape',
  totalEvents = 38,
  options: ChartSvgOptions = {}
): string {
  const isPrint = options.isPrint ?? true;
  const title = options.title || `התפלגות התפקוד המשוער של ההתנהגות (מתוך ${totalEvents} אירועים)`;

  const safeDist: Record<string, number> = distribution || {
    escape: mainFunction === 'escape' ? 74 : 10,
    attention: mainFunction === 'attention' ? 70 : 16,
    tangible: mainFunction === 'tangible' ? 65 : 5,
    sensory: mainFunction === 'sensory' ? 60 : 5
  };

  const keys: Array<keyof typeof BEHAVIOR_FUNCTION_HEBREW_LABELS> = [
    'escape',
    'attention',
    'tangible',
    'sensory'
  ];

  const width = options.width || 660;
  const height = options.height || 260;
  const padding = { top: 40, right: 40, bottom: 45, left: 190 };
  const chartW = width - padding.right - padding.left;
  const chartH = height - padding.top - padding.bottom;
  const rowHeight = chartH / keys.length;

  const bgFill = isPrint ? '#ffffff' : '#1a202c';
  const borderStroke = isPrint ? '#cbd5e1' : '#2d3748';
  const gridStroke = isPrint ? '#e2e8f0' : '#2d3748';
  const trackFill = isPrint ? '#f1f5f9' : '#334155';
  const textColor = isPrint ? '#1e293b' : '#f8fafc';
  const subtextColor = isPrint ? '#64748b' : '#94a3b8';
  const barFill = '#2563eb';

  // Grid lines
  const gridLines = [0, 20, 40, 60, 80, 100]
    .map((pct) => {
      const x = padding.left + (pct / 100) * chartW;
      return `
        <line x1="${x}" y1="${padding.top}" x2="${x}" y2="${padding.top + chartH}" stroke="${gridStroke}" stroke-width="1" />
        <text x="${x}" y="${padding.top + chartH + 16}" fill="${subtextColor}" font-size="10" text-anchor="middle" font-family="Arial, sans-serif">${pct}%</text>
      `;
    })
    .join('');

  // Horizontal bars
  const bars = keys
    .map((k, idx) => {
      const pct = Math.min(100, Math.max(0, safeDist[k] ?? 0));
      const barW = (pct / 100) * chartW;
      const y = padding.top + idx * rowHeight + 8;
      const barH = rowHeight - 16;
      const label = BEHAVIOR_FUNCTION_HEBREW_LABELS[k] || k;

      return `
        <g>
          <!-- Category label on the left of Y-axis line -->
          <text x="${padding.left - 12}" y="${y + barH / 2 + 4}" fill="${textColor}" font-size="11.5" font-weight="600" text-anchor="end" font-family="Arial, sans-serif">${label}</text>
          <!-- Track -->
          <rect x="${padding.left}" y="${y}" width="${chartW}" height="${barH}" rx="4" ry="4" fill="${trackFill}" />
          <!-- Active bar -->
          <rect x="${padding.left}" y="${y}" width="${Math.max(4, barW)}" height="${barH}" rx="4" ry="4" fill="${barFill}" />
          <!-- Percentage text -->
          <text x="${padding.left + barW + (pct > 14 ? -8 : 6)}" y="${y + barH / 2 + 4}" fill="${pct > 14 ? '#ffffff' : textColor}" font-size="10.5" font-weight="700" text-anchor="${pct > 14 ? 'end' : 'start'}" font-family="Arial, sans-serif">${pct}%</text>
        </g>
      `;
    })
    .join('');

  return `
    <div style="border: 1px solid ${borderStroke}; border-radius: 8px; background: ${bgFill}; padding: 12px; margin: 12px 0;">
      <div style="text-align: center; margin-bottom: 6px;">
        <span style="font-weight: 700; font-size: 13px; color: ${textColor}; font-family: Arial, sans-serif;">${title}</span>
      </div>
      <svg dir="ltr" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" style="width: 100%; max-width: ${width}px; height: auto; display: block; margin: 0 auto; direction: ltr;">
        <!-- Y Axis Vertical Title -->
        <text transform="rotate(-90 14 ${padding.top + chartH / 2})" x="14" y="${padding.top + chartH / 2}" fill="${subtextColor}" font-size="11" font-weight="600" text-anchor="middle" font-family="Arial, sans-serif">תפקוד ההתנהגות</text>
        ${gridLines}
        <!-- Y Axis Line -->
        <line x1="${padding.left}" y1="${padding.top}" x2="${padding.left}" y2="${padding.top + chartH}" stroke="#cbd5e1" stroke-width="1.5" />
        ${bars}
        <text x="${padding.left + chartW / 2}" y="${height - 8}" fill="${subtextColor}" font-size="11" font-weight="600" text-anchor="middle" font-family="Arial, sans-serif">אחוז מכלל האירועים (%)</text>
      </svg>
    </div>
  `.trim();
}

/**
 * Generate standalone SVG for Graph 3: מעקב התקדמות: קו בסיס מול שלב ההתערבות
 */
export function generateProgressMonitoringDualLineSvg(
  baselinePoints: BaselineDataPoint[] = [],
  ongoingPoints: OngoingTrackingPoint[] = [],
  options: ChartSvgOptions = {}
): string {
  const isPrint = options.isPrint ?? true;
  const title = options.title || 'מעקב התקדמות: קו בסיס מול שלב ההתערבות';

  interface UnifiedPoint {
    sessionLabel: string;
    phase: 'baseline' | 'intervention';
    challengingVal: number;
    replacementVal: number;
  }

  const combined: UnifiedPoint[] = [];

  if (baselinePoints && baselinePoints.length > 0) {
    baselinePoints.forEach((p, idx) => {
      combined.push({
        sessionLabel: `מפגש ${idx + 1} (בסיס)`,
        phase: 'baseline',
        challengingVal: Number(p.value) || 0,
        replacementVal: 0
      });
    });
  }

  if (ongoingPoints && ongoingPoints.length > 0) {
    ongoingPoints.forEach((p) => {
      const challenging = Number(p.targetBehaviorOccurrences ?? p.targetBehaviorCount) || 0;
      const replacement =
        typeof p.replacementBehaviorUsed === 'number'
          ? p.replacementBehaviorUsed
          : (p.replacementBehaviorCount ?? (p.replacementBehaviorUsed ? 1 : 0));

      combined.push({
        sessionLabel: `מפגש ${combined.length + 1} (התערבות)`,
        phase: 'intervention',
        challengingVal: challenging,
        replacementVal: Number(replacement) || 0
      });
    });
  }

  if (combined.length < 3) {
    return `
      <div style="border: 1.5px dashed #cbd5e1; border-radius: 8px; padding: 18px; text-align: center; background: #f8fafc; color: #475569; margin: 12px 0; font-family: Arial, sans-serif;">
        <div style="font-weight: 700; font-size: 13px; color: #1e293b; margin-bottom: 4px;">${title}</div>
        <div style="font-size: 12px;">נדרשות לפחות 3 נקודות מעקב להפקת תרשים התקדמות (כרגע נאספו ${combined.length} מתוך 3).</div>
      </div>
    `.trim();
  }

  const allVals = combined.flatMap((c) => [c.challengingVal, c.replacementVal]);
  const maxVal = Math.max(...allVals, 10);
  const yUpper = Math.ceil(maxVal * 1.2);

  const width = options.width || 720;
  const height = options.height || 360;
  const padding = { top: 60, right: 35, bottom: 75, left: 55 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;
  const slotW = chartW / (combined.length - 1 || 1);

  const splitIdx = combined.findIndex((p) => p.phase === 'intervention');
  const dividerX = splitIdx > 0 ? padding.left + (splitIdx - 0.5) * slotW : null;

  const bgFill = isPrint ? '#ffffff' : '#1a202c';
  const borderStroke = isPrint ? '#cbd5e1' : '#2d3748';
  const gridStroke = isPrint ? '#e2e8f0' : '#2d3748';
  const textColor = isPrint ? '#1e293b' : '#f8fafc';
  const subtextColor = isPrint ? '#64748b' : '#94a3b8';
  const challengingColor = '#ea580c';
  const replacementColor = '#2563eb';

  const getCoordinates = (val: number, idx: number) => {
    const x = padding.left + idx * slotW;
    const y = padding.top + chartH - (val / yUpper) * chartH;
    return { x, y };
  };

  const challengingCoords = combined.map((p, idx) => getCoordinates(p.challengingVal, idx));
  const replacementCoords = combined.map((p, idx) => getCoordinates(p.replacementVal, idx));

  const challengingPath = challengingCoords
    .map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x} ${c.y}`)
    .join(' ');

  const replacementPath = replacementCoords
    .map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x} ${c.y}`)
    .join(' ');

  // Grid lines
  const gridLines = [0, 0.25, 0.5, 0.75, 1]
    .map((ratio) => {
      const tickVal = Math.round(yUpper * ratio);
      const yPos = padding.top + chartH - ratio * chartH;
      return `
        <line x1="${padding.left}" y1="${yPos}" x2="${padding.left + chartW}" y2="${yPos}" stroke="${gridStroke}" stroke-width="1" />
        <text x="${padding.left - 8}" y="${yPos + 4}" fill="${subtextColor}" font-size="10.5" text-anchor="end" font-family="Arial, sans-serif">${tickVal}</text>
      `;
    })
    .join('');

  // Markers
  const challengingMarkers = challengingCoords
    .map((c, idx) => `
      <circle cx="${c.x}" cy="${c.y}" r="4" fill="${challengingColor}" />
      <text x="${c.x}" y="${c.y - 7}" fill="${challengingColor}" font-size="9.5" font-weight="700" text-anchor="middle" font-family="Arial, sans-serif">${combined[idx].challengingVal}</text>
    `)
    .join('');

  const replacementMarkers = replacementCoords
    .map((c, idx) => `
      <circle cx="${c.x}" cy="${c.y}" r="4" fill="${replacementColor}" />
      <text x="${c.x}" y="${c.y + 14}" fill="${replacementColor}" font-size="9.5" font-weight="700" text-anchor="middle" font-family="Arial, sans-serif">${combined[idx].replacementVal}</text>
    `)
    .join('');

  const xLabels = combined
    .map((_p, idx) => {
      const x = padding.left + idx * slotW;
      const y = padding.top + chartH + 18;
      const shortLabel = `מפגש ${idx + 1}`;
      return `
        <text x="${x}" y="${y}" fill="${subtextColor}" font-size="9.5" font-weight="500" text-anchor="middle" font-family="Arial, sans-serif">${shortLabel}</text>
      `;
    })
    .join('');

  const dividerHtml =
    dividerX !== null
      ? `
        <line x1="${dividerX}" y1="${padding.top}" x2="${dividerX}" y2="${padding.top + chartH}" stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="4,4" />
        <rect x="${dividerX - 60}" y="${padding.top - 20}" width="55" height="16" rx="3" fill="#f1f5f9" stroke="#cbd5e1" />
        <text x="${dividerX - 32}" y="${padding.top - 8}" fill="#475569" font-size="9.5" font-weight="700" text-anchor="middle" font-family="Arial, sans-serif">שלב בסיס</text>
        <rect x="${dividerX + 5}" y="${padding.top - 20}" width="65" height="16" rx="3" fill="#eff6ff" stroke="#bfdbfe" />
        <text x="${dividerX + 37}" y="${padding.top - 8}" fill="#1e40af" font-size="9.5" font-weight="700" text-anchor="middle" font-family="Arial, sans-serif">שלב התערבות</text>
      `
      : '';

  return `
    <div style="border: 1px solid ${borderStroke}; border-radius: 8px; background: ${bgFill}; padding: 12px; margin: 12px 0;">
      <!-- Title & Legend -->
      <div style="text-align: center; margin-bottom: 8px; font-family: Arial, sans-serif;">
        <div style="font-weight: 700; font-size: 13px; color: ${textColor}; margin-bottom: 4px;">${title}</div>
        <div style="display: flex; justify-content: center; gap: 20px; font-size: 11px;">
          <span style="display: inline-flex; align-items: center; gap: 5px; color: ${challengingColor}; font-weight: 600;">
            <span style="display: inline-block; width: 10px; height: 10px; background: ${challengingColor}; border-radius: 50%;"></span>
            התנהגות מאתגרת (יעד להפחתה)
          </span>
          <span style="display: inline-flex; align-items: center; gap: 5px; color: ${replacementColor}; font-weight: 600;">
            <span style="display: inline-block; width: 10px; height: 10px; background: ${replacementColor}; border-radius: 50%;"></span>
            התנהגות חלופית (יעד להגברה)
          </span>
        </div>
      </div>
      <svg dir="ltr" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" style="width: 100%; max-width: ${width}px; height: auto; display: block; margin: 0 auto; direction: ltr;">
        ${gridLines}
        ${dividerHtml}
        <!-- Paths -->
        <path d="${challengingPath}" fill="none" stroke="${challengingColor}" stroke-width="2.5" />
        <path d="${replacementPath}" fill="none" stroke="${replacementColor}" stroke-width="2.5" />
        <!-- Markers -->
        ${challengingMarkers}
        ${replacementMarkers}
        <!-- X Axis labels -->
        ${xLabels}
        <!-- Axis titles -->
        <text x="${padding.left + chartW / 2}" y="${height - 10}" fill="${subtextColor}" font-size="11" font-weight="600" text-anchor="middle" font-family="Arial, sans-serif">רצף מפגשי תצפית ומעקב</text>
        <text transform="rotate(-90 18 ${height / 2})" x="18" y="${height / 2}" fill="${subtextColor}" font-size="11" font-weight="600" text-anchor="middle" font-family="Arial, sans-serif">מספר אירועים</text>
      </svg>
    </div>
  `.trim();
}
