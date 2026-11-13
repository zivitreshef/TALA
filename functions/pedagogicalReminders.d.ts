export declare const DEFAULT_APPS_SCRIPT_URL: string;
export declare const DEFAULT_SITE_URL: string;
export declare const DAYS_MAP: Record<string, number>;

export declare function getIsraelTimeComponents(date?: Date): {
  dayOfWeek: number;
  dayOfMonth: number;
  hour: number;
  minute: number;
  dateString: string;
};

export declare function toHebrewAcronymServer(name?: string | null): string;

export declare function isDueForPedagogicalReminderServer(
  prefs?: Record<string, any> | null,
  now?: Date
): boolean;

export declare function calculateObservationGapsServer(
  students?: Array<Record<string, any>>,
  thresholdDays?: number,
  referenceDate?: Date
): Array<{
  studentId: string;
  studentName: string;
  goalTitle: string;
  daysSinceObservation: number;
}>;

export declare function calculateAccomplishmentsServer(
  students?: Array<Record<string, any>>,
  windowDays?: number,
  referenceDate?: Date
): {
  recentObservationsCount: number;
  completedGoalsCount: number;
  activeGoalsCount: number;
};

export declare function buildPedagogicalReminderEmailHtmlServer(params: {
  teacherName?: string;
  gaps?: Array<any>;
  accomplishments?: any;
  totalStudents?: number;
  privacyMode?: string;
  siteUrl?: string;
}): string;

export declare function dispatchPedagogicalRemindersServer(options?: {
  dryRun?: boolean;
  db?: any;
  appsScriptUrl?: string;
  referenceDate?: Date;
}): Promise<{
  processed: number;
  sent: number;
  teachers: string[];
  errors: Array<{ email: string; error: string }>;
}>;
