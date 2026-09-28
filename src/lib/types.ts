export type UserRole = "admin" | "user";

export interface UserSession {
  userId: string;
  username: string;
  role: UserRole;
  pathId: PathId | null;
  ratingsNoticeSeen: boolean;
  ticTacToeNoticeSeen: boolean;
  draftNoticeSeen: boolean;
  expiresAt: number;
}

export type TitleType = "movie" | "tv" | "special";
export type Universe = "mcu" | "non_marvel_studios";
export type Importance = "essential" | "recommended" | "optional" | "unconfirmed";
export type OrderType = "story" | "release";
export type ScheduleMode = "strict" | "flexible";
export type PathId = "new-to-marvel" | "prepare-for-doomsday" | "rewatch-essentials";
/** What the planner can build a schedule from: the three built-in paths, plus two narrower filters. */
export type ScopeId = PathId | "mcu-only" | "xmen-only";

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
export type DraftStatus = "pending" | "active" | "lineup" | "finished" | "declined";
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

export type DraftAlignment = "hero" | "villain";

export interface DraftCharacter {
  id: string;
  name: string;
  alignment: DraftAlignment;
  /** 1-100 - shown for flavor and used to decide the winner when the draft ends. */
  power: number;
}

/** One of the 10 characters up for bid in a draft game, once picked. */
export interface DraftPick {
  characterId: string;
  /** What the winner paid for it - 0 when it was handed over for free or auto-assigned. */
  price: number;
}

export interface DraftGame {
  id: string;
  playerX: GamePlayer;
  playerO: GamePlayer;
  status: DraftStatus;
  /** The 10 characters in this game, in reveal order. */
  characterIds: string[];
  /** Index into characterIds of the one currently up for bid (or characterIds.length once done). */
  round: number;
  turn: string | null;
  currentBid: number;
  currentBidder: string | null;
  budgets: { x: number; o: number };
  picks: { x: DraftPick[]; o: DraftPick[] };
  /** Player's submitted lineup order (characterIds). Opponent's is hidden during lineup phase. */
  lineupX: string[] | null;
  lineupO: string[] | null;
  winner: string | null;
  result: GameResult | null;
  createdAt: string;
  updatedAt: string;
}
