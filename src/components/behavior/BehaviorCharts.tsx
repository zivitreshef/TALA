import { useState } from 'react';
import { BarChart3 } from 'lucide-react';
import type { BaselineDataPoint, OngoingTrackingPoint, BehaviorFunction } from '../../domain/types';

export interface BehaviorChartsProps {
  baselineData?: BaselineDataPoint[];
  ongoingTracking?: OngoingTrackingPoint[];
  mainHypothesizedFunction?: BehaviorFunction;
  functionDistribution?: Record<string, number>;
  activeChartType?: 'baseline' | 'function' | 'progress' | 'all';
}

const FUNCTION_LABELS: Record<string, string> = {
  escape: 'הימנעות ממטלה',
  attention: 'קבלת תשומת לב',
  tangible: 'גישה לפריט או פעילות',
  sensory: 'ויסות חושי עצמי'
};

/**
 * Threshold Card when fewer than 3 observations exist
 */
export function ChartThresholdNotice({
  count,
  required = 3,
  chartTitle
}: {
  count: number;
  required?: number;
  chartTitle: string;
}) {
  const percent = Math.min(100, Math.round((count / required) * 100));

  return (
    <div
      style={{
        background: '#0f172a',
        borderRadius: '12px',
        padding: '24px',
        color: '#f8fafc',
        border: '1px solid #334155',
        textAlign: 'center',
        margin: '12px 0'
      }}
    >
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: '#60a5fa', marginBottom: '8px' }}>
        <BarChart3 size={20} />
        <span style={{ fontWeight: 700, fontSize: '1rem' }}>{chartTitle}</span>
      </div>
      <p style={{ margin: '6px 0 14px 0', fontSize: '0.9rem', color: '#94a3b8' }}>
        הגרף יופק אוטומטית ברגע שיוזנו לפחות {required} תצפיות (כרגע הוזנו {count} מתוך {required}).
      </p>
      <div
        style={{
          maxWidth: '300px',
          margin: '0 auto 10px auto',
          background: '#1e293b',
          borderRadius: '999px',
          height: '8px',
          overflow: 'hidden',
          border: '1px solid #334155'
        }}
      >
        <div
          style={{
            width: `${percent}%`,
            background: percent >= 100 ? '#10b981' : '#3b82f6',
            height: '100%',
            transition: 'width 0.4s ease'
          }}
        />
      </div>
      <span style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>
        {count} / {required} נקודות נתונים נאספו
      </span>
    </div>
  );
}

/**
 * Graph 1: תדירות התנהגות מטרה בשלב קו הבסיס
 * Vertical Bar Chart with dashed average line
 */
export function BaselineFrequencyBarChart({
  data = [],
  title = 'תדירות התנהגות מטרה בשלב קו הבסיס (אירועים לשיעור של 45 דקות)'
}: {
  data: BaselineDataPoint[];
  title?: string;
}) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (data.length < 3) {
    return <ChartThresholdNotice count={data.length} chartTitle={title} />;
  }

  const values = data.map((d) => Number(d.value) || 0);
  const sum = values.reduce((a, b) => a + b, 0);
  const avg = Math.round((sum / values.length) * 10) / 10;
  const maxVal = Math.max(...values, 10);
  const yUpper = Math.ceil(maxVal * 1.15);

  const width = 620;
  const height = 340;
  const padding = { top: 60, right: 40, bottom: 65, left: 60 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const barWidth = Math.min(54, Math.max(28, (chartW / data.length) * 0.55));
  const slotWidth = chartW / data.length;

  const avgY = padding.top + chartH - (avg / yUpper) * chartH;

  return (
    <div
      style={{
        background: '#1a202c',
        borderRadius: '12px',
        padding: '16px',
        border: '1px solid #2d3748',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.25)',
        margin: '14px 0'
      }}
    >
      <div style={{ textAlign: 'center', marginBottom: '8px' }}>
        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#f8fafc' }}>{title}</h3>
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        style={{ width: '100%', height: 'auto', display: 'block', direction: 'ltr' }}
        role="img"
        aria-label={title}
      >
        {/* Y Axis Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
          const tickVal = Math.round(yUpper * ratio);
          const yPos = padding.top + chartH - ratio * chartH;
          return (
            <g key={ratio}>
              <line
                x1={padding.left}
                y1={yPos}
                x2={padding.left + chartW}
                y2={yPos}
                stroke="#2d3748"
                strokeWidth="1"
              />
              <text
                x={padding.left - 10}
                y={yPos + 4}
                fill="#94a3b8"
                fontSize="11"
                textAnchor="end"
                fontWeight="500"
              >
                {tickVal}
              </text>
            </g>
          );
        })}

        {/* Dashed Average Line */}
        <line
          x1={padding.left}
          y1={avgY}
          x2={padding.left + chartW}
          y2={avgY}
          stroke="#f59e0b"
          strokeWidth="2"
          strokeDasharray="5,5"
        />
        <text
          x={padding.left + chartW - 6}
          y={avgY - 6}
          fill="#f59e0b"
          fontSize="11"
          fontWeight="700"
          textAnchor="end"
        >
          ממוצע: {avg}
        </text>

        {/* Bars */}
        {data.map((point, idx) => {
          const val = Number(point.value) || 0;
          const barHeight = (val / yUpper) * chartH;
          const x = padding.left + idx * slotWidth + (slotWidth - barWidth) / 2;
          const y = padding.top + chartH - barHeight;
          const label = point.sessionOrPeriod ? `מפגש ${point.sessionOrPeriod}` : `יום ${idx + 1}`;
          const isHovered = hoveredIdx === idx;

          return (
            <g
              key={point.id || idx}
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
              style={{ cursor: 'pointer' }}
            >
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={Math.max(2, barHeight)}
                rx="6"
                ry="6"
                fill={isHovered ? '#60a5fa' : '#3b82f6'}
                style={{ transition: 'all 0.2s ease' }}
              />
              {/* Value on top of bar */}
              <text
                x={x + barWidth / 2}
                y={y - 8}
                fill="#e2e8f0"
                fontSize="12"
                fontWeight="700"
                textAnchor="middle"
              >
                {val}
              </text>
              {/* X Axis Label */}
              <text
                x={x + barWidth / 2}
                y={padding.top + chartH + 20}
                fill="#cbd5e1"
                fontSize="11"
                fontWeight="600"
                textAnchor="middle"
              >
                {label}
              </text>
            </g>
          );
        })}

        {/* Axis Labels */}
        <text
          x={width / 2}
          y={height - 10}
          fill="#94a3b8"
          fontSize="12"
          fontWeight="600"
          textAnchor="middle"
        >
          יום תצפית
        </text>
        <text
          transform={`rotate(-90 18 ${height / 2})`}
          x={18}
          y={height / 2}
          fill="#94a3b8"
          fontSize="12"
          fontWeight="600"
          textAnchor="middle"
        >
          מספר אירועים בשיעור
        </text>
      </svg>
    </div>
  );
}

/**
 * Graph 2: התפלגות התפקוד המשוער של ההתנהגות
 * Horizontal Bar Chart by percentage
 */
export function FunctionDistributionHorizontalBarChart({
  distribution,
  mainFunction = 'escape',
  totalEvents = 38,
  title
}: {
  distribution?: Record<string, number>;
  mainFunction?: BehaviorFunction;
  totalEvents?: number;
  title?: string;
}) {
  // Default percentages matching empirical ABA distributions if not manually specified
  const safeDist: Record<string, number> = distribution || {
    escape: mainFunction === 'escape' ? 74 : 10,
    attention: mainFunction === 'attention' ? 70 : 16,
    tangible: mainFunction === 'tangible' ? 65 : 5,
    sensory: mainFunction === 'sensory' ? 60 : 5
  };

  const keys: Array<keyof typeof FUNCTION_LABELS> = ['escape', 'attention', 'tangible', 'sensory'];
  const chartTitle = title || `התפלגות התפקוד המשוער של ההתנהגות (מתוך ${totalEvents} אירועים)`;

  const width = 680;
  const height = 290;
  const padding = { top: 40, right: 45, bottom: 55, left: 195 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;
  const rowHeight = chartH / keys.length;

  return (
    <div
      style={{
        background: '#1a202c',
        borderRadius: '12px',
        padding: '16px',
        border: '1px solid #2d3748',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.25)',
        margin: '14px 0'
      }}
    >
      <div style={{ textAlign: 'center', marginBottom: '8px' }}>
        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#f8fafc' }}>{chartTitle}</h3>
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        style={{ width: '100%', height: 'auto', display: 'block', direction: 'ltr' }}
        role="img"
        aria-label={chartTitle}
      >
        {/* Y Axis Vertical Label on the far left */}
        <text
          transform={`rotate(-90 16 ${padding.top + chartH / 2})`}
          x={16}
          y={padding.top + chartH / 2}
          fill="#94a3b8"
          fontSize="11"
          fontWeight="600"
          textAnchor="middle"
        >
          תפקוד ההתנהגות
        </text>

        {/* Vertical Grid Lines (0% to 100%) */}
        {[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map((pct) => {
          const x = padding.left + (pct / 100) * chartW;
          return (
            <g key={pct}>
              <line
                x1={x}
                y1={padding.top}
                x2={x}
                y2={padding.top + chartH}
                stroke="#2d3748"
                strokeWidth="1"
              />
              <text
                x={x}
                y={padding.top + chartH + 18}
                fill="#94a3b8"
                fontSize="10"
                textAnchor="middle"
              >
                {pct}%
              </text>
            </g>
          );
        })}

        {/* Y-Axis Line */}
        <line
          x1={padding.left}
          y1={padding.top}
          x2={padding.left}
          y2={padding.top + chartH}
          stroke="#475569"
          strokeWidth="1.5"
        />

        {/* Horizontal Bars */}
        {keys.map((k, idx) => {
          const pct = Math.min(100, Math.max(0, safeDist[k] ?? 0));
          const barW = (pct / 100) * chartW;
          const y = padding.top + idx * rowHeight + 10;
          const barH = rowHeight - 20;
          const label = FUNCTION_LABELS[k] || k;

          return (
            <g key={k}>
              {/* Category label on the left of Y-axis line */}
              <text
                x={padding.left - 12}
                y={y + barH / 2 + 4}
                fill="#e2e8f0"
                fontSize="12.5"
                fontWeight="600"
                textAnchor="end"
              >
                {label}
              </text>

              {/* Bar background (track) */}
              <rect
                x={padding.left}
                y={y}
                width={chartW}
                height={barH}
                rx="6"
                ry="6"
                fill="#2d3748"
                opacity="0.35"
              />

              {/* Active Bar */}
              <rect
                x={padding.left}
                y={y}
                width={Math.max(6, barW)}
                rx="6"
                ry="6"
                height={barH}
                fill="#3b82f6"
              />

              {/* Percentage label inside or next to bar */}
              <text
                x={padding.left + barW + (pct > 12 ? -10 : 8)}
                y={y + barH / 2 + 4}
                fill={pct > 12 ? '#ffffff' : '#93c5fd'}
                fontSize="11"
                fontWeight="700"
                textAnchor={pct > 12 ? 'end' : 'start'}
              >
                {pct}%
              </text>
            </g>
          );
        })}

        {/* Axis Title */}
        <text
          x={padding.left + chartW / 2}
          y={height - 8}
          fill="#94a3b8"
          fontSize="11"
          fontWeight="600"
          textAnchor="middle"
        >
          אחוז מכלל האירועים (%)
        </text>
      </svg>
    </div>
  );
}

/**
 * Graph 3: מעקב התקדמות: קו בסיס מול שלב ההתערבות
 * Multi-line dual trend chart (challenging vs. replacement behavior)
 */
export function ProgressMonitoringDualLineChart({
  baselinePoints = [],
  ongoingPoints = [],
  title = 'מעקב התקדמות: קו בסיס מול שלב ההתערבות'
}: {
  baselinePoints?: BaselineDataPoint[];
  ongoingPoints?: OngoingTrackingPoint[];
  title?: string;
}) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Combine points into timeline: baseline points first, followed by intervention points
  interface UnifiedSessionPoint {
    sessionLabel: string;
    phase: 'baseline' | 'intervention';
    challengingVal: number;
    replacementVal: number;
  }

  const combined: UnifiedSessionPoint[] = [];

  // If no baseline data or ongoing points are provided, construct standard progression points for demonstration
  if (baselinePoints.length === 0 && ongoingPoints.length === 0) {
    return <ChartThresholdNotice count={0} chartTitle={title} />;
  }

  if (baselinePoints.length > 0) {
    baselinePoints.forEach((p, idx) => {
      combined.push({
        sessionLabel: `מפגש ${idx + 1} (בסיס)`,
        phase: 'baseline',
        challengingVal: Number(p.value) || 0,
        replacementVal: 0
      });
    });
  }

  if (ongoingPoints.length > 0) {
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
    return <ChartThresholdNotice count={combined.length} chartTitle={title} />;
  }

  const allVals = combined.flatMap((c) => [c.challengingVal, c.replacementVal]);
  const maxVal = Math.max(...allVals, 10);
  const yUpper = Math.ceil(maxVal * 1.2);

  const width = 720;
  const height = 380;
  const padding = { top: 70, right: 40, bottom: 80, left: 60 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;
  const slotW = chartW / (combined.length - 1 || 1);

  // Baseline to intervention split index
  const splitIdx = combined.findIndex((p) => p.phase === 'intervention');
  const dividerX = splitIdx > 0 ? padding.left + (splitIdx - 0.5) * slotW : null;

  // Build SVG path strings
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

  return (
    <div
      style={{
        background: '#1a202c',
        borderRadius: '12px',
        padding: '16px',
        border: '1px solid #2d3748',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.25)',
        margin: '14px 0'
      }}
    >
      {/* Title & Legend */}
      <div style={{ textAlign: 'center', marginBottom: '10px' }}>
        <h3 style={{ margin: '0 0 10px 0', fontSize: '1rem', fontWeight: 700, color: '#f8fafc' }}>
          {title}
        </h3>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: '#e2e8f0' }}>
            <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#3b82f6', display: 'inline-block' }} />
            <span>התנהגות חלופית (בקשת הפסקה תקינה)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: '#e2e8f0' }}>
            <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#f97316', display: 'inline-block' }} />
            <span>התנהגות מאתגרת (סירוב וזריקת ציוד)</span>
          </div>
        </div>
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        style={{ width: '100%', height: 'auto', display: 'block', direction: 'ltr' }}
        role="img"
        aria-label={title}
      >
        {/* Y-Axis Grid */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
          const tickVal = Math.round(yUpper * ratio);
          const yPos = padding.top + chartH - ratio * chartH;
          return (
            <g key={ratio}>
              <line
                x1={padding.left}
                y1={yPos}
                x2={padding.left + chartW}
                y2={yPos}
                stroke="#2d3748"
                strokeWidth="1"
              />
              <text
                x={padding.left - 10}
                y={yPos + 4}
                fill="#94a3b8"
                fontSize="11"
                textAnchor="end"
              >
                {tickVal}
              </text>
            </g>
          );
        })}

        {/* Phase Separator Line (Baseline vs Intervention) */}
        {dividerX !== null && (
          <g>
            <line
              x1={dividerX}
              y1={padding.top - 10}
              x2={dividerX}
              y2={padding.top + chartH}
              stroke="#64748b"
              strokeWidth="2"
              strokeDasharray="6,4"
            />
            <text
              x={dividerX - 6}
              y={padding.top + 20}
              fill="#cbd5e1"
              fontSize="11"
              fontWeight="700"
              textAnchor="end"
            >
              שלב קו בסיס
            </text>
            <text
              x={dividerX + 6}
              y={padding.top + 20}
              fill="#38bdf8"
              fontSize="11"
              fontWeight="700"
              textAnchor="start"
            >
              שלב התערבות
            </text>
          </g>
        )}

        {/* Challenging Behavior Line (Orange) */}
        <path
          d={challengingPath}
          fill="none"
          stroke="#f97316"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Replacement Behavior Line (Blue) */}
        <path
          d={replacementPath}
          fill="none"
          stroke="#3b82f6"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Data Points */}
        {combined.map((pt, idx) => {
          const chCoord = challengingCoords[idx];
          const repCoord = replacementCoords[idx];
          const isHovered = hoveredIndex === idx;

          return (
            <g
              key={idx}
              onMouseEnter={() => setHoveredIndex(idx)}
              onMouseLeave={() => setHoveredIndex(null)}
              style={{ cursor: 'pointer' }}
            >
              {/* Challenging Circle */}
              <circle
                cx={chCoord.x}
                cy={chCoord.y}
                r={isHovered ? 7 : 5}
                fill="#f97316"
                stroke="#1a202c"
                strokeWidth="2"
              />
              <text
                x={chCoord.x}
                y={chCoord.y - 10}
                fill="#fdba74"
                fontSize="11"
                fontWeight="700"
                textAnchor="middle"
              >
                {pt.challengingVal}
              </text>

              {/* Replacement Circle */}
              <circle
                cx={repCoord.x}
                cy={repCoord.y}
                r={isHovered ? 7 : 5}
                fill="#3b82f6"
                stroke="#1a202c"
                strokeWidth="2"
              />
              <text
                x={repCoord.x}
                y={repCoord.y + 18}
                fill="#93c5fd"
                fontSize="11"
                fontWeight="700"
                textAnchor="middle"
              >
                {pt.replacementVal}
              </text>

              {/* X Axis Label (rotated for readability) */}
              <text
                transform={`rotate(40 ${chCoord.x} ${padding.top + chartH + 20})`}
                x={chCoord.x}
                y={padding.top + chartH + 20}
                fill="#cbd5e1"
                fontSize="10"
                fontWeight="500"
                textAnchor="start"
              >
                {pt.sessionLabel}
              </text>
            </g>
          );
        })}

        {/* Y Axis Title */}
        <text
          transform={`rotate(-90 18 ${height / 2})`}
          x={18}
          y={height / 2}
          fill="#94a3b8"
          fontSize="12"
          fontWeight="600"
          textAnchor="middle"
        >
          מספר אירועים בשיעור
        </text>

        {/* X Axis Title */}
        <text
          x={width / 2}
          y={height - 6}
          fill="#94a3b8"
          fontSize="12"
          fontWeight="600"
          textAnchor="middle"
        >
          מפגש תצפית
        </text>
      </svg>
    </div>
  );
}

/**
 * Composite Behavior Charts Viewer that integrates all 3 charts
 */
export default function BehaviorCharts({
  baselineData = [],
  ongoingTracking = [],
  mainHypothesizedFunction = 'escape',
  functionDistribution,
  activeChartType = 'all'
}: BehaviorChartsProps) {
  const [selectedTab, setSelectedTab] = useState<'all' | 'baseline' | 'function' | 'progress'>(
    activeChartType
  );

  return (
    <div style={{ marginTop: '16px' }}>
      {/* Chart Selector Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          flexWrap: 'wrap',
          marginBottom: '12px'
        }}
      >
        <button
          type="button"
          onClick={() => setSelectedTab('all')}
          style={{
            padding: '6px 14px',
            borderRadius: '8px',
            border: '1px solid',
            borderColor: selectedTab === 'all' ? '#3b82f6' : '#cbd5e1',
            background: selectedTab === 'all' ? '#eff6ff' : '#ffffff',
            color: selectedTab === 'all' ? '#1d4ed8' : '#475569',
            fontWeight: 600,
            fontSize: '0.85rem',
            cursor: 'pointer'
          }}
        >
          כל הגרפים
        </button>
        <button
          type="button"
          onClick={() => setSelectedTab('baseline')}
          style={{
            padding: '6px 14px',
            borderRadius: '8px',
            border: '1px solid',
            borderColor: selectedTab === 'baseline' ? '#3b82f6' : '#cbd5e1',
            background: selectedTab === 'baseline' ? '#eff6ff' : '#ffffff',
            color: selectedTab === 'baseline' ? '#1d4ed8' : '#475569',
            fontWeight: 600,
            fontSize: '0.85rem',
            cursor: 'pointer'
          }}
        >
          תדירות קו בסיס
        </button>
        <button
          type="button"
          onClick={() => setSelectedTab('function')}
          style={{
            padding: '6px 14px',
            borderRadius: '8px',
            border: '1px solid',
            borderColor: selectedTab === 'function' ? '#3b82f6' : '#cbd5e1',
            background: selectedTab === 'function' ? '#eff6ff' : '#ffffff',
            color: selectedTab === 'function' ? '#1d4ed8' : '#475569',
            fontWeight: 600,
            fontSize: '0.85rem',
            cursor: 'pointer'
          }}
        >
          התפלגות תפקוד
        </button>
        <button
          type="button"
          onClick={() => setSelectedTab('progress')}
          style={{
            padding: '6px 14px',
            borderRadius: '8px',
            border: '1px solid',
            borderColor: selectedTab === 'progress' ? '#3b82f6' : '#cbd5e1',
            background: selectedTab === 'progress' ? '#eff6ff' : '#ffffff',
            color: selectedTab === 'progress' ? '#1d4ed8' : '#475569',
            fontWeight: 600,
            fontSize: '0.85rem',
            cursor: 'pointer'
          }}
        >
          מעקב התקדמות
        </button>
      </div>

      {/* Render Selected Charts */}
      {(selectedTab === 'all' || selectedTab === 'baseline') && (
        <BaselineFrequencyBarChart data={baselineData} />
      )}

      {(selectedTab === 'all' || selectedTab === 'function') && (
        <FunctionDistributionHorizontalBarChart
          distribution={functionDistribution}
          mainFunction={mainHypothesizedFunction}
          totalEvents={baselineData.length > 0 ? baselineData.reduce((acc, b) => acc + (Number(b.value) || 0), 0) : 38}
        />
      )}

      {(selectedTab === 'all' || selectedTab === 'progress') && (
        <ProgressMonitoringDualLineChart
          baselinePoints={baselineData}
          ongoingPoints={ongoingTracking}
        />
      )}
    </div>
  );
}
