export type TitleType = "movie" | "tv" | "special";
export type Universe = "mcu" | "non_marvel_studios";
export type Importance = "essential" | "recommended" | "optional" | "unconfirmed";
export type OrderType = "story" | "release";
export type ScheduleMode = "strict" | "flexible";
export type PathId = "new-to-marvel" | "prepare-for-doomsday" | "rewatch-essentials";
export type ScopeId = PathId;

export interface Title {
  id: string;
  title: string;
  type: TitleType;
  release_date: string;
  story_order_index: number;
  runtime_minutes: number;
  universe: Universe;
  importance: Importance;
  poster_url: string | null;
  leads_into_doomsday: boolean;
}

/** title_id -> ISO timestamp of when it was marked watched (one map per path) */
export type WatchedMap = Record<string, string>;

export interface ScheduleSettings {
  scope: ScopeId;
  orderType: OrderType;
  mode: ScheduleMode;
  paceType: "hours" | "titles";
  weeklyHours: number | null;
  titlesPerWeek: number | null;
  targetFinishDate: string | null;
  /** 0 = Sunday ... 6 = Saturday */
  viewingDays: number[];
  startDate: string;
}

export interface ScheduleItem {
  titleId: string;
  title: string;
  type: TitleType;
  runtimeMinutes: number;
}

export interface ScheduleDay {
  date: string;
  items: ScheduleItem[];
  minutes: number;
}

export interface ScheduleSummary {
  totalTitles: number;
  totalMinutes: number;
  startDate: string;
  finishDate: string | null;
  weeklyHours: number | null;
  titlesPerWeek: number | null;
  onTrack: boolean | null;
  daysOverTarget: number | null;
  requiredWeeklyHours: number | null;
  requiredTitlesPerWeek: number | null;
  truncated: boolean;
}

export interface GeneratedSchedule {
  version: 1;
  generatedAt: string;
  /** Every title this plan covers when it was saved, so the path keeps its full list after recalculating. */
  titleIds: string[];
  settings: ScheduleSettings;
  days: ScheduleDay[];
  summary: ScheduleSummary;
}

export interface SavedSchedule {
  id: string;
  name: string;
  created_at: string;
  schedule: GeneratedSchedule;
}
