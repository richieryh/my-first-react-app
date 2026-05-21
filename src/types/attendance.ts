export type MoodLevel = 1 | 2 | 3 | 4 | 5;

export interface MoodOption {
  level: MoodLevel;
  emoji: string;
}

export const MOOD_OPTIONS: MoodOption[] = [
  { level: 5, emoji: '😄' },
  { level: 4, emoji: '😊' },
  { level: 3, emoji: '😐' },
  { level: 2, emoji: '😔' },
  { level: 1, emoji: '😞' },
];

// 退勤時の「頑張り度」用絵文字
export const EFFORT_OPTIONS: MoodOption[] = [
  { level: 5, emoji: '🔥' },
  { level: 4, emoji: '💪' },
  { level: 3, emoji: '😊' },
  { level: 2, emoji: '😓' },
  { level: 1, emoji: '😴' },
];

export interface ClockEntry {
  time: string; // ISO string
  mood: MoodLevel;
  message: string;
}

export interface BreakEntry {
  start: string; // ISO string
  end?: string;  // ISO string (undefined = 休憩中)
}

export function calcBreakMinutes(breaks?: BreakEntry[]): number {
  if (!breaks) return 0;
  return breaks.reduce((sum, b) => {
    if (!b.end) return sum;
    return sum + Math.floor((new Date(b.end).getTime() - new Date(b.start).getTime()) / 60000);
  }, 0);
}

export interface AttendanceRecord {
  id: string;
  date: string; // YYYY-MM-DD
  isPaidLeave?: boolean;
  clockIn?: ClockEntry;
  clockOut?: ClockEntry;
  breaks?: BreakEntry[];
}
