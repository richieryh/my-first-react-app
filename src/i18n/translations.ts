import { MoodLevel } from '@/types/attendance';

export type Lang = 'ja' | 'en';

export interface Translations {
  appName: string;
  toggleLang: string;
  clockIn: {
    title: string;
    moodQuestion: string;
    messageLabel: string;
    messagePlaceholder: string;
    button: string;
  };
  clockOut: {
    title: string;
    moodQuestion: string;
    messageLabel: string;
    messagePlaceholder: string;
    button: string;
  };
  status: {
    clockedIn: string;
    todayRecord: string;
    pastRecords: string;
    completed: string;
    missingClockOut: string;
    clockInLabel: string;
    clockOutLabel: string;
    retroClockIn: string;
    retroClockInTime: string;
    retroClockOut: string;
    retroClockOutTime: string;
    retroClockOutSave: string;
    paidLeave: string;
    paidLeaveButton: string;
    paidLeaveOr: string;
    futurePaidLeave: string;
    futurePaidLeaveDate: string;
    futurePaidLeaveButton: string;
    futurePaidLeaveAlreadyExists: string;
    missedClockOutTitle: string;
    missedClockOutFix: string;
  };
  paidLeaveBalance: {
    title: string;
    granted: string;
    used: string;
    remaining: string;
    editTitle: string;
    save: string;
    cancel: string;
    daysUnit: string;
    yearLabel: (year: number) => string;
    overUsed: string;
  };
  moods: Record<MoodLevel, string>;
  efforts: Record<MoodLevel, string>;
  breakTime: {
    start: string;
    end: string;
    label: string;
    onBreak: string;
    actual: string;
  };
  calendar: {
    title: string;
    weekdays: string[];
  };
}

export const translations: Record<Lang, Translations> = {
  ja: {
    appName: '勤怠打刻',
    toggleLang: 'EN',
    clockIn: {
      title: '出勤打刻',
      moodQuestion: '今日の調子は？',
      messageLabel: '今日の意気込みを一言（任意）',
      messagePlaceholder: '今日も頑張ります！',
      button: '出勤打刻する',
    },
    clockOut: {
      title: '退勤打刻',
      moodQuestion: '今日の仕事はどうだった？',
      messageLabel: '今日を振り返って一言（任意）',
      messagePlaceholder: '今日もお疲れ様でした！',
      button: '退勤打刻する',
    },
    status: {
      clockedIn: '出勤済み',
      todayRecord: '今日の記録',
      pastRecords: '過去の記録',
      completed: '完了',
      missingClockOut: '退勤未記録',
      clockInLabel: '出勤',
      clockOutLabel: '退勤',
      retroClockIn: '出勤を後から入力',
      retroClockInTime: '出勤時刻',
      retroClockOut: '後から退勤を入力',
      retroClockOutTime: '退勤時刻',
      retroClockOutSave: '保存する',
      paidLeave: '有給取得',
      paidLeaveButton: '有給を取得する',
      paidLeaveOr: 'または',
      futurePaidLeave: '有給の事前登録',
      futurePaidLeaveDate: '有給取得日',
      futurePaidLeaveButton: '事前登録する',
      futurePaidLeaveAlreadyExists: 'この日付はすでに記録があります',
      missedClockOutTitle: 'の退勤が記録されていません',
      missedClockOutFix: '退勤を入力する',
    },
    paidLeaveBalance: {
      title: '有給残日数',
      granted: '付与日数',
      used: '取得済み',
      remaining: '残日数',
      editTitle: '年間付与日数を設定',
      save: '保存',
      cancel: 'キャンセル',
      daysUnit: '日',
      yearLabel: (year: number) => `${year}年の有給`,
      overUsed: '超過',
    },
    moods: { 5: '絶好調', 4: '好調', 3: '普通', 2: '不調', 1: '絶不調' },
    efforts: { 5: '超頑張った', 4: '頑張った', 3: 'まあまあ', 2: 'もうちょっと', 1: 'あんまり' },
    breakTime: {
      start: '休憩開始',
      end: '休憩終了',
      label: '休憩時間',
      onBreak: '休憩中',
      actual: '実働時間',
    },
    calendar: {
      title: 'カレンダー',
      weekdays: ['日', '月', '火', '水', '木', '金', '土'],
    },
  },
  en: {
    appName: 'Attendance',
    toggleLang: '日本語',
    clockIn: {
      title: 'Clock In',
      moodQuestion: 'How are you feeling today?',
      messageLabel: 'Your motivation for today (optional)',
      messagePlaceholder: "Let's have a great day!",
      button: 'Clock In',
    },
    clockOut: {
      title: 'Clock Out',
      moodQuestion: 'How was work today?',
      messageLabel: 'A word to wrap up your day (optional)',
      messagePlaceholder: 'Great work today!',
      button: 'Clock Out',
    },
    status: {
      clockedIn: 'Clocked In',
      todayRecord: "Today's Record",
      pastRecords: 'Past Records',
      completed: 'Done',
      missingClockOut: 'Clock-out Missing',
      clockInLabel: 'In',
      clockOutLabel: 'Out',
      retroClockIn: 'Add Missed Clock-in',
      retroClockInTime: 'Clock-in Time',
      retroClockOut: 'Add Missed Clock-out',
      retroClockOutTime: 'Clock-out Time',
      retroClockOutSave: 'Save',
      paidLeave: 'Paid Leave',
      paidLeaveButton: 'Take Paid Leave',
      paidLeaveOr: 'or',
      futurePaidLeave: 'Register Future Leave',
      futurePaidLeaveDate: 'Leave Date',
      futurePaidLeaveButton: 'Register',
      futurePaidLeaveAlreadyExists: 'A record already exists for this date',
      missedClockOutTitle: 'clock-out is not recorded',
      missedClockOutFix: 'Enter Clock-out',
    },
    paidLeaveBalance: {
      title: 'Paid Leave Balance',
      granted: 'Granted',
      used: 'Used',
      remaining: 'Remaining',
      editTitle: 'Set Annual Paid Leave Days',
      save: 'Save',
      cancel: 'Cancel',
      daysUnit: ' days',
      yearLabel: (year: number) => `${year} Paid Leave`,
      overUsed: 'Over',
    },
    moods: { 5: 'Amazing', 4: 'Good', 3: 'Okay', 2: 'Not Great', 1: 'Rough' },
    efforts: { 5: 'Crushed It', 4: 'Worked Hard', 3: 'Did Okay', 2: 'Could Do More', 1: 'Took It Easy' },
    breakTime: {
      start: 'Start Break',
      end: 'End Break',
      label: 'Break Time',
      onBreak: 'On Break',
      actual: 'Actual Work',
    },
    calendar: {
      title: 'Calendar',
      weekdays: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    },
  },
};
