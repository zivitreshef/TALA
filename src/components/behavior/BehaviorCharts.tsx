import { useState } from 'react';
import {
  BarChart3,
  Calendar,
  Clock,
  CheckCircle2,
  TrendingUp,
  AlertTriangle,
  Flame,
  ShieldCheck
} from 'lucide-react';
import type {
  BaselineDataPoint,
  OngoingTrackingPoint,
  BehaviorFunction,
  BehaviorObservation
} from '../../domain/types';
import {
  computeHourlyHeatmapMatrix,
  computeAbcSequenceSummary,
  computeDurationAndIntensityData,
  computeReplacementSkillCurve,
  computeStaffFidelityMetrics
} from '../../domain/behaviorAnalysis';

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

/**
 * 1. מפת פיזור שעתית לאורך ימות השבוע
 * Visualizes occurrences across days and school periods to detect temporal patterns and transitions.
 */
export function BehaviorHourlyHeatmapChart({
  trackingData = [],
  observations = [],
  title = 'מפת פיזור שעתית לאורך ימות השבוע',
  subtitle = 'הצלבת שעות המערכת וימי השבוע לזיהוי דפוסי זמנים ומעברים'
}: {
  trackingData?: OngoingTrackingPoint[];
  observations?: BehaviorObservation[];
  title?: string;
  subtitle?: string;
}) {
  const result = computeHourlyHeatmapMatrix(trackingData, observations);

  if (!result.hasData) {
    return null;
  }

  const getCellBg = (occurrences: number) => {
    if (occurrences === 0) return '#f8fafc';
    if (result.maxCellOccurrences === 0) return '#f8fafc';
    const ratio = Math.min(1, occurrences / result.maxCellOccurrences);
    if (ratio < 0.25) return '#ffedd5';
    if (ratio < 0.5) return '#fdba74';
    if (ratio < 0.75) return '#fb923c';
    return '#ea580c';
  };

  const getCellTextColor = (occurrences: number) => {
    if (occurrences === 0) return '#94a3b8';
    const ratio = result.maxCellOccurrences > 0 ? occurrences / result.maxCellOccurrences : 0;
    return ratio >= 0.5 ? '#ffffff' : '#431407';
  };

  return (
    <div
      style={{
        background: '#ffffff',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        padding: '20px',
        margin: '16px 0',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        direction: 'rtl'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Calendar size={18} style={{ color: '#ea580c' }} />
            <span>{title}</span>
          </h3>
          {subtitle && (
            <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>
              {subtitle}
            </p>
          )}
        </div>
        {result.peakDay && result.peakPeriod && (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: '#fff7ed',
              border: '1px solid #fed7aa',
              padding: '4px 10px',
              borderRadius: '8px',
              fontSize: '0.8rem',
              color: '#c2410c',
              fontWeight: 600
            }}
          >
            <Flame size={14} />
            <span>מוקד שיא: יום {result.peakDay}, {result.peakPeriod}</span>
          </div>
        )}
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table
          style={{
            width: '100%',
            borderCollapse: 'separate',
            borderSpacing: '4px',
            textAlign: 'center',
            fontSize: '0.85rem'
          }}
        >
          <thead>
            <tr>
              <th style={{ padding: '8px', background: '#f1f5f9', borderRadius: '6px', color: '#475569', fontWeight: 600, minWidth: '80px' }}>
                שיעור / יום
              </th>
              {result.days.map((day) => (
                <th
                  key={day}
                  style={{
                    padding: '8px',
                    background: '#f1f5f9',
                    borderRadius: '6px',
                    color: '#334155',
                    fontWeight: 700,
                    minWidth: '70px'
                  }}
                >
                  יום {day}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {result.periods.map((period, pIdx) => (
              <tr key={period}>
                <td style={{ padding: '8px', background: '#f8fafc', borderRadius: '6px', fontWeight: 600, color: '#334155' }}>
                  {period}
                </td>
                {result.days.map((_, dIdx) => {
                  const cell = result.cells.find((c) => c.dayIndex === dIdx && c.periodIndex === pIdx);
                  const occ = cell ? cell.occurrences : 0;
                  return (
                    <td
                      key={dIdx}
                      style={{
                        padding: '10px 4px',
                        borderRadius: '6px',
                        background: getCellBg(occ),
                        color: getCellTextColor(occ),
                        fontWeight: occ > 0 ? 700 : 500,
                        border: '1px solid',
                        borderColor: occ > 0 ? 'rgba(234, 88, 12, 0.3)' : '#f1f5f9',
                        transition: 'all 0.15s ease'
                      }}
                      title={`יום ${result.days[dIdx]}, ${period}: ${occ} מופעים`}
                    >
                      {occ > 0 ? `${occ}` : '—'}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend & Summary */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '12px', flexWrap: 'wrap', gap: '8px', fontSize: '0.8rem', color: '#64748b' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span>מקרא שכיחות:</span>
          <span style={{ display: 'inline-block', width: '14px', height: '14px', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '3px' }} />
          <span>0</span>
          <span style={{ display: 'inline-block', width: '14px', height: '14px', background: '#ffedd5', borderRadius: '3px' }} />
          <span>נמוכה</span>
          <span style={{ display: 'inline-block', width: '14px', height: '14px', background: '#fdba74', borderRadius: '3px' }} />
          <span>בינונית</span>
          <span style={{ display: 'inline-block', width: '14px', height: '14px', background: '#ea580c', borderRadius: '3px' }} />
          <span>גבוהה</span>
        </div>
        <div>
          <span>סך כל המופעים הממופים: <strong>{result.totalOccurrences}</strong></span>
        </div>
      </div>
    </div>
  );
}

/**
 * 2. טבלת רצף תנאי מקדים, התנהגות ותוצאה סביבתית
 * Quantitative cross-tabulation of antecedents vs. environmental responses.
 */
export function BehaviorAbcSequenceTable({
  observations = [],
  title = 'טבלת רצף תנאי מקדים, התנהגות ותוצאה סביבתית',
  subtitle = 'הצלבה כמותית של הגורמים המעוררים מול התגובות הסביבתיות שנצפו'
}: {
  observations?: BehaviorObservation[];
  title?: string;
  subtitle?: string;
}) {
  const result = computeAbcSequenceSummary(observations);

  if (!result.hasData) {
    return null;
  }

  return (
    <div
      style={{
        background: '#ffffff',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        padding: '20px',
        margin: '16px 0',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        direction: 'rtl'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle size={18} style={{ color: '#d97706' }} />
            <span>{title}</span>
          </h3>
          {subtitle && (
            <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>
              {subtitle}
            </p>
          )}
        </div>
        <div style={{ fontSize: '0.8rem', color: '#475569', background: '#f8fafc', padding: '4px 10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
          סך אירועים מנותחים: <strong>{result.totalIncidents}</strong>
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
              <th style={{ padding: '10px 12px', textAlign: 'right', color: '#334155', fontWeight: 700 }}>תנאי מקדים</th>
              <th style={{ padding: '10px 12px', textAlign: 'right', color: '#334155', fontWeight: 700 }}>תגובה סביבתית או תוצאה</th>
              <th style={{ padding: '10px 12px', textAlign: 'right', color: '#334155', fontWeight: 700 }}>תפקוד משוער</th>
              <th style={{ padding: '10px 12px', textAlign: 'center', color: '#334155', fontWeight: 700, width: '100px' }}>מופעים</th>
              <th style={{ padding: '10px 12px', textAlign: 'right', color: '#334155', fontWeight: 700, width: '140px' }}>שכיחות יחסית</th>
            </tr>
          </thead>
          <tbody>
            {result.rows.map((row, idx) => (
              <tr
                key={idx}
                style={{
                  borderBottom: '1px solid #f1f5f9',
                  background: idx % 2 === 0 ? '#ffffff' : '#fafafa'
                }}
              >
                <td style={{ padding: '10px 12px', color: '#1e293b', fontWeight: 600 }}>{row.antecedent}</td>
                <td style={{ padding: '10px 12px', color: '#334155' }}>{row.consequence}</td>
                <td style={{ padding: '10px 12px', color: '#0369a1', fontWeight: 600 }}>{row.perceivedFunctionLabel}</td>
                <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 700, color: '#0f172a' }}>{row.count}</td>
                <td style={{ padding: '10px 12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ flex: 1, background: '#f1f5f9', borderRadius: '999px', height: '6px', overflow: 'hidden' }}>
                      <div
                        style={{
                          width: `${row.percentage}%`,
                          background: row.percentage > 40 ? '#d97706' : '#3b82f6',
                          height: '100%',
                          borderRadius: '999px'
                        }}
                      />
                    </div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', minWidth: '32px' }}>
                      {row.percentage}%
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {(result.dominantAntecedent || result.dominantConsequence) && (
        <div style={{ marginTop: '12px', padding: '10px 12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', flexWrap: 'wrap', gap: '16px', fontSize: '0.825rem' }}>
          {result.dominantAntecedent && (
            <div>
              <span style={{ color: '#64748b' }}>גורם מעורר דומיננטי: </span>
              <strong style={{ color: '#0f172a' }}>{result.dominantAntecedent}</strong>
            </div>
          )}
          {result.dominantConsequence && (
            <div>
              <span style={{ color: '#64748b' }}>תגובה סביבתית שכיחה: </span>
              <strong style={{ color: '#0f172a' }}>{result.dominantConsequence}</strong>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * 3. גרף משך זמן ועוצמת אירוע
 * Combined duration in minutes and intensity tracking.
 */
export function BehaviorDurationIntensityChart({
  trackingData = [],
  observations = [],
  title = 'גרף משך זמן ועוצמת אירוע',
  subtitle = 'מדידת דקות רצופות ועוצמה לאיתור התקפי זעם או הסתגרות'
}: {
  trackingData?: OngoingTrackingPoint[];
  observations?: BehaviorObservation[];
  title?: string;
  subtitle?: string;
}) {
  const result = computeDurationAndIntensityData(trackingData, observations);

  if (!result.hasData || result.points.length === 0) {
    return null;
  }

  const maxVal = Math.max(result.maxDurationMinutes, 10);
  const chartHeight = 180;
  const chartWidth = 540;
  const paddingX = 40;
  const paddingY = 25;
  const plotWidth = chartWidth - paddingX * 2;
  const plotHeight = chartHeight - paddingY * 2;

  const pointsCount = result.points.length;
  const barWidth = Math.max(12, Math.min(36, Math.floor(plotWidth / pointsCount) - 8));

  const getIntensityColor = (intensity: string) => {
    switch (intensity) {
      case 'severe':
        return '#ef4444';
      case 'mild':
        return '#10b981';
      case 'moderate':
      default:
        return '#f59e0b';
    }
  };

  return (
    <div
      style={{
        background: '#ffffff',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        padding: '20px',
        margin: '16px 0',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        direction: 'rtl'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Clock size={18} style={{ color: '#0284c7' }} />
            <span>{title}</span>
          </h3>
          {subtitle && (
            <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>
              {subtitle}
            </p>
          )}
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '8px', padding: '4px 10px', textAlign: 'center' }}>
            <div style={{ fontSize: '0.7rem', color: '#0369a1' }}>משך ממוצע</div>
            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0c4a6e' }}>{result.averageDurationMinutes} דק׳</div>
          </div>
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '4px 10px', textAlign: 'center' }}>
            <div style={{ fontSize: '0.7rem', color: '#b91c1c' }}>משך שיא</div>
            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#7f1d1d' }}>{result.maxDurationMinutes} דק׳</div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          style={{ width: '100%', maxWidth: '640px', height: 'auto', overflow: 'visible' }}
          role="img"
          aria-label={title}
        >
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((r, idx) => {
            const y = paddingY + plotHeight * (1 - r);
            const valLabel = Math.round(maxVal * r);
            return (
              <g key={idx}>
                <line
                  x1={paddingX}
                  y1={y}
                  x2={chartWidth - paddingX}
                  y2={y}
                  stroke="#e2e8f0"
                  strokeDasharray="4 4"
                />
                <text
                  x={paddingX - 8}
                  y={y + 4}
                  textAnchor="end"
                  fontSize="10"
                  fill="#94a3b8"
                >
                  {valLabel}
                </text>
              </g>
            );
          })}

          {/* Bars */}
          {result.points.map((pt, idx) => {
            const x = paddingX + (idx + 0.5) * (plotWidth / pointsCount) - barWidth / 2;
            const h = (pt.durationMinutes / maxVal) * plotHeight;
            const y = paddingY + plotHeight - h;
            const color = getIntensityColor(pt.intensity);

            return (
              <g key={pt.id}>
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={Math.max(3, h)}
                  rx={4}
                  fill={color}
                  opacity={0.9}
                />
                {/* Duration text */}
                <text
                  x={x + barWidth / 2}
                  y={Math.max(paddingY - 6, y - 5)}
                  textAnchor="middle"
                  fontSize="10"
                  fontWeight="bold"
                  fill={color}
                >
                  {pt.durationMinutes > 0 ? `${pt.durationMinutes}׳` : ''}
                </text>
                {/* Date label */}
                <text
                  x={x + barWidth / 2}
                  y={chartHeight - 6}
                  textAnchor="middle"
                  fontSize="9"
                  fill="#64748b"
                >
                  {pt.date ? pt.date.slice(5) : ''}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', marginTop: '10px', fontSize: '0.8rem', color: '#64748b' }}>
        <span>מקרא עוצמה:</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ width: '10px', height: '10px', background: '#10b981', borderRadius: '2px' }} />
          <span>קלה</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ width: '10px', height: '10px', background: '#f59e0b', borderRadius: '2px' }} />
          <span>בינונית</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ width: '10px', height: '10px', background: '#ef4444', borderRadius: '2px' }} />
          <span>גבוהה</span>
        </div>
      </div>
    </div>
  );
}

/**
 * 4. עקומת למידה מצטברת של מיומנות חלופית
 * Visualizes cumulative acquisition curve of replacement behavior.
 */
export function BehaviorReplacementLearningCurveChart({
  trackingData = [],
  title = 'עקומת למידה מצטברת של מיומנות חלופית',
  subtitle = 'מעקב עצמאות ורכישה מתמדת של המיומנות הרצויה לאורך זמן'
}: {
  trackingData?: OngoingTrackingPoint[];
  title?: string;
  subtitle?: string;
}) {
  const result = computeReplacementSkillCurve(trackingData);

  if (!result.hasData || result.points.length === 0) {
    return null;
  }

  const maxVal = Math.max(result.totalReplacementDemonstrations, 5);
  const chartHeight = 180;
  const chartWidth = 540;
  const paddingX = 40;
  const paddingY = 25;
  const plotWidth = chartWidth - paddingX * 2;
  const plotHeight = chartHeight - paddingY * 2;

  const pointsCount = result.points.length;
  const stepX = plotWidth / Math.max(1, pointsCount - 1);

  const coords = result.points.map((pt, idx) => {
    const x = paddingX + idx * stepX;
    const y = paddingY + plotHeight - (pt.cumulativeCount / maxVal) * plotHeight;
    return { x, y, pt };
  });

  const pathD = coords.reduce((acc, curr, idx) => {
    return idx === 0 ? `M ${curr.x} ${curr.y}` : `${acc} L ${curr.x} ${curr.y}`;
  }, '');

  const areaD = `${pathD} L ${coords[coords.length - 1].x} ${paddingY + plotHeight} L ${coords[0].x} ${paddingY + plotHeight} Z`;

  return (
    <div
      style={{
        background: '#ffffff',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        padding: '20px',
        margin: '16px 0',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        direction: 'rtl'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TrendingUp size={18} style={{ color: '#16a34a' }} />
            <span>{title}</span>
          </h3>
          {subtitle && (
            <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>
              {subtitle}
            </p>
          )}
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '4px 10px', textAlign: 'center' }}>
            <div style={{ fontSize: '0.7rem', color: '#15803d' }}>סך שימושים חלופיים</div>
            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#166534' }}>{result.totalReplacementDemonstrations}</div>
          </div>
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '4px 10px', textAlign: 'center' }}>
            <div style={{ fontSize: '0.7rem', color: '#475569' }}>קצב רכישה כללי</div>
            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a' }}>{result.acquisitionRatePercentage}%</div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          style={{ width: '100%', maxWidth: '640px', height: 'auto', overflow: 'visible' }}
          role="img"
          aria-label={title}
        >
          {/* Horizontal gridlines */}
          {[0, 0.25, 0.5, 0.75, 1].map((r, idx) => {
            const y = paddingY + plotHeight * (1 - r);
            const valLabel = Math.round(maxVal * r);
            return (
              <g key={idx}>
                <line
                  x1={paddingX}
                  y1={y}
                  x2={chartWidth - paddingX}
                  y2={y}
                  stroke="#e2e8f0"
                  strokeDasharray="4 4"
                />
                <text
                  x={paddingX - 8}
                  y={y + 4}
                  textAnchor="end"
                  fontSize="10"
                  fill="#94a3b8"
                >
                  {valLabel}
                </text>
              </g>
            );
          })}

          {/* Area fill */}
          <path d={areaD} fill="rgba(22, 163, 74, 0.12)" />

          {/* Line curve */}
          <path d={pathD} fill="none" stroke="#16a34a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

          {/* Dots on points */}
          {coords.map((c, idx) => (
            <circle
              key={idx}
              cx={c.x}
              cy={c.y}
              r={c.pt.usedInSession ? 4.5 : 3}
              fill={c.pt.usedInSession ? '#16a34a' : '#ffffff'}
              stroke="#16a34a"
              strokeWidth="2"
            />
          ))}
        </svg>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '10px', fontSize: '0.8rem', color: '#64748b' }}>
        <span>התחלת מעקב: {result.points[0]?.date || ''}</span>
        <span>נקודה אחרונה: {result.points[result.points.length - 1]?.date || ''}</span>
      </div>
    </div>
  );
}

/**
 * 5. טבלת נאמנות יישום של צוות בית הספר
 * Staff protocol consistency tracking meter and breakdown.
 */
export function BehaviorStaffFidelityMeter({
  trackingData = [],
  title = 'טבלת נאמנות יישום של צוות בית הספר',
  subtitle = 'בדיקת אחוז העקביות של צוות ההוראה ביישום פרוטוקול ההתערבות'
}: {
  trackingData?: OngoingTrackingPoint[];
  title?: string;
  subtitle?: string;
}) {
  const result = computeStaffFidelityMetrics(trackingData);

  if (!result.hasData || result.totalTrackedSessions === 0) {
    return null;
  }

  const getStatusBadge = () => {
    if (result.overallFidelityPercentage >= 80) {
      return { bg: '#f0fdf4', border: '#bbf7d0', color: '#15803d', icon: <ShieldCheck size={16} /> };
    }
    if (result.overallFidelityPercentage >= 50) {
      return { bg: '#fefce8', border: '#fef08a', color: '#a16207', icon: <CheckCircle2 size={16} /> };
    }
    return { bg: '#fef2f2', border: '#fecaca', color: '#b91c1c', icon: <AlertTriangle size={16} /> };
  };

  const badge = getStatusBadge();

  return (
    <div
      style={{
        background: '#ffffff',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        padding: '20px',
        margin: '16px 0',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        direction: 'rtl'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldCheck size={18} style={{ color: '#059669' }} />
            <span>{title}</span>
          </h3>
          {subtitle && (
            <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>
              {subtitle}
            </p>
          )}
        </div>

        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: badge.bg,
            border: `1px solid ${badge.border}`,
            color: badge.color,
            padding: '5px 12px',
            borderRadius: '999px',
            fontSize: '0.85rem',
            fontWeight: 700
          }}
        >
          {badge.icon}
          <span>{result.ratingLabel}</span>
        </div>
      </div>

      {/* Main Gauge / Meter */}
      <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#334155' }}>עקביות כוללת במתן מענה וחיזוק:</span>
          <span style={{ fontSize: '1.3rem', fontWeight: 800, color: badge.color }}>{result.overallFidelityPercentage}%</span>
        </div>
        <div style={{ background: '#e2e8f0', height: '10px', borderRadius: '999px', overflow: 'hidden' }}>
          <div
            style={{
              width: `${result.overallFidelityPercentage}%`,
              background: result.overallFidelityPercentage >= 80 ? '#10b981' : result.overallFidelityPercentage >= 50 ? '#f59e0b' : '#ef4444',
              height: '100%',
              borderRadius: '999px',
              transition: 'width 0.4s ease'
            }}
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '0.785rem', color: '#64748b' }}>
          <span>{result.reinforcedSessions} מתוך {result.totalTrackedSessions} מפגשים יושמו בהתאם לתוכנית</span>
          <span>יעד מומלץ: מעל 80%</span>
        </div>
      </div>

      {/* Breakdown by period table */}
      {result.periodBreakdowns.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.825rem' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ padding: '8px 10px', textAlign: 'right', color: '#475569', fontWeight: 600 }}>שיעור / מסגרת</th>
                <th style={{ padding: '8px 10px', textAlign: 'center', color: '#475569', fontWeight: 600 }}>מפגשים שנבדקו</th>
                <th style={{ padding: '8px 10px', textAlign: 'center', color: '#475569', fontWeight: 600 }}>יישום תקין</th>
                <th style={{ padding: '8px 10px', textAlign: 'right', color: '#475569', fontWeight: 600, width: '130px' }}>אחוז עקביות</th>
              </tr>
            </thead>
            <tbody>
              {result.periodBreakdowns.map((b, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '8px 10px', color: '#1e293b', fontWeight: 600 }}>{b.period}</td>
                  <td style={{ padding: '8px 10px', textAlign: 'center', color: '#475569' }}>{b.totalSessions}</td>
                  <td style={{ padding: '8px 10px', textAlign: 'center', color: '#15803d', fontWeight: 700 }}>{b.reinforcedSessions}</td>
                  <td style={{ padding: '8px 10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div style={{ flex: 1, background: '#f1f5f9', height: '6px', borderRadius: '999px', overflow: 'hidden' }}>
                        <div
                          style={{
                            width: `${b.fidelityPercentage}%`,
                            background: b.fidelityPercentage >= 80 ? '#10b981' : b.fidelityPercentage >= 50 ? '#f59e0b' : '#ef4444',
                            height: '100%'
                          }}
                        />
                      </div>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#334155', minWidth: '28px' }}>
                        {b.fidelityPercentage}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

