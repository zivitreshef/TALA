/**
 * Pedagogical Environment & Goal Color Coding Themes.
 * Provides soft, accessible pastel palettes keyed by environment or domain
 * so teachers can visually distinguish and group related goals at a glance.
 */

export interface GoalEnvironmentTheme {
  bg: string;
  border: string;
  accent: string;
  badgeBg: string;
  badgeText: string;
}

const DEFAULT_THEME: GoalEnvironmentTheme = {
  bg: '#f8fafc',
  border: '#cbd5e1',
  accent: '#3b82f6',
  badgeBg: '#e2e8f0',
  badgeText: '#334155'
};

const PASTEL_PALETTES: GoalEnvironmentTheme[] = [
  // 0. Sky Blue (מפגש, קריאה)
  {
    bg: '#f0f9ff',
    border: '#bae6fd',
    accent: '#0284c7',
    badgeBg: '#e0f2fe',
    badgeText: '#0369a1'
  },
  // 1. Mint Green (חצר, שילוב)
  {
    bg: '#f0fdf4',
    border: '#bbf7d0',
    accent: '#16a34a',
    badgeBg: '#dcfce7',
    badgeText: '#15803d'
  },
  // 2. Lavender Purple (משחק במרחב, יצירה)
  {
    bg: '#faf5ff',
    border: '#e9d5ff',
    accent: '#9333ea',
    badgeBg: '#f3e8ff',
    badgeText: '#7e22ce'
  },
  // 3. Warm Honey / Amber (משחקי שולחן, ניהול עצמי)
  {
    bg: '#fffbeb',
    border: '#fde68a',
    accent: '#d97706',
    badgeBg: '#fef3c7',
    badgeText: '#b45309'
  },
  // 4. Teal / Aqua (שירותים, תקשורת בינאישית)
  {
    bg: '#f0fdfa',
    border: '#99f6e4',
    accent: '#0d9488',
    badgeBg: '#ccfbf1',
    badgeText: '#0f766e'
  },
  // 5. Blossom Rose (סדנא, כישורים חברתיים)
  {
    bg: '#fff1f2',
    border: '#fecdd3',
    accent: '#e11d48',
    badgeBg: '#ffe4e6',
    badgeText: '#be123c'
  },
  // 6. Indigo (פעילות שאינה בשגרה, כשירות לשונית)
  {
    bg: '#eef2ff',
    border: '#c7d2fe',
    accent: '#4f46e5',
    badgeBg: '#e0e7ff',
    badgeText: '#4338ca'
  },
  // 7. Peach / Coral (אוכל, ניידות)
  {
    bg: '#fff7ed',
    border: '#fed7aa',
    accent: '#ea580c',
    badgeBg: '#ffedd5',
    badgeText: '#c2410c'
  }
];

const CANONICAL_THEME_MAP: Record<string, GoalEnvironmentTheme> = {
  // Kindergarten environments
  'מפגש בגן': PASTEL_PALETTES[0],
  'מפגש': PASTEL_PALETTES[0],
  'חצר': PASTEL_PALETTES[1],
  'חצר הגן': PASTEL_PALETTES[1],
  'משחק במרחב הגן': PASTEL_PALETTES[2],
  'משחק במרחב': PASTEL_PALETTES[2],
  'משחקי שולחן, משחקי בנייה, הרכבה, לימודי דיגיטלי ואסטרטגיה': PASTEL_PALETTES[3],
  'משחקי שולחן': PASTEL_PALETTES[3],
  'סדנא / יצירה': PASTEL_PALETTES[5],
  'סדנא': PASTEL_PALETTES[5],
  'יצירה': PASTEL_PALETTES[5],
  'אוכל': PASTEL_PALETTES[7],
  'ארוחה': PASTEL_PALETTES[7],
  'שירותים': PASTEL_PALETTES[4],
  'פעילות שאינה בשגרה': PASTEL_PALETTES[6],

  // School environments
  'קריאה והפקת משמעות': PASTEL_PALETTES[0],
  'קריאה': PASTEL_PALETTES[0],
  'כתיבה': PASTEL_PALETTES[2],
  'האזנה ודיבור – כשירות תקשורתית': PASTEL_PALETTES[4],
  'האזנה ודיבור': PASTEL_PALETTES[4],
  'כשירות לשונית – ידע לשוני': PASTEL_PALETTES[6],
  'ידע לשוני': PASTEL_PALETTES[6],
  'ניהול עצמי': PASTEL_PALETTES[3],
  'תקשורת ויחסים בינאישיים': PASTEL_PALETTES[5],
  'ניידות וטיפול עצמי': PASTEL_PALETTES[7],
  'מתמטיקה': PASTEL_PALETTES[1]
};

/**
 * Deterministically computes a hash index for custom environments
 * so that any custom environment string always resolves to the exact same pastel theme.
 */
function hashStringToPaletteIndex(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) % PASTEL_PALETTES.length;
}

/**
 * Returns a soft pastel theme for a given environment.
 */
export function getGoalEnvironmentTheme(environment?: string | null): GoalEnvironmentTheme {
  const env = String(environment || '').trim();
  if (!env) {
    return DEFAULT_THEME;
  }

  // Exact or partial canonical match
  if (CANONICAL_THEME_MAP[env]) {
    return CANONICAL_THEME_MAP[env];
  }

  for (const [key, theme] of Object.entries(CANONICAL_THEME_MAP)) {
    if (env.includes(key) || key.includes(env)) {
      return theme;
    }
  }

  // Stable deterministic hash fallback for custom teacher entries
  const index = hashStringToPaletteIndex(env);
  return PASTEL_PALETTES[index] || DEFAULT_THEME;
}
