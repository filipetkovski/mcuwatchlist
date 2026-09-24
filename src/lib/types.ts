export type UserRole = "admin" | "user";

export interface UserSession {
  userId: string;
  username: string;
  role: UserRole;
  pathId: PathId | null;
  ratingsNoticeSeen: boolean;
  ticTacToeNoticeSeen: boolean;
  expiresAt: number;
}

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

export interface TitleRating {
  average: number | null;
  count: number;
  mine: number | null;
}

/** title_id -> aggregate rating info */
export type RatingsMap = Record<string, TitleRating>;

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

export type GameCell = "X" | "O" | null;
export type GameStatus = "pending" | "active" | "finished" | "declined";
export type GameResult = "win" | "draw";

export interface GamePlayer {
  id: string;
  username: string;
}

export interface GameQuestion {
  id: string;
  question: string;
  options: string[];
}

export interface TicTacToeGame {
  id: string;
  playerX: GamePlayer;
  playerO: GamePlayer;
  board: GameCell[];
  status: GameStatus;
  turn: string | null;
  winner: string | null;
  result: GameResult | null;
  /** Only present when it's the requesting user's turn. */
  question: GameQuestion | null;
  deadline: string | null;
  /** Missed turns (timed out) per player - 3 loses the game for that player. */
  misses: { x: number; o: number };
  /** Wrong answers per player - 3 ends the game as a draw. */
  wrongAnswers: { x: number; o: number };
  createdAt: string;
  updatedAt: string;
}

export interface LeaderboardEntry {
  id: string;
  username: string;
  vibranium: number;
  wins: number;
  losses: number;
  draws: number;
}
