'use client';

import { useState, useEffect } from 'react';
import MoodSelector from '@/components/MoodSelector';
import CalendarView from '@/components/CalendarView';
import RecordDetailModal from '@/components/RecordDetailModal';
import { AttendanceRecord, MoodLevel, MOOD_OPTIONS, EFFORT_OPTIONS, calcBreakMinutes } from '@/types/attendance';
import { Lang, translations } from '@/i18n/translations';

const STORAGE_KEY = 'attendance_records';
const LANG_KEY = 'attendance_lang';
const PAID_LEAVE_GRANTED_KEY = 'paid_leave_granted_days';

function getToday(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getTomorrow(): string {
  const now = new Date();
  now.setDate(now.getDate() + 1);
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatTime(isoString: string): string {
  return new Date(isoString).toLocaleTimeString('ja-JP', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDate(dateStr: string, lang: Lang): string {
  const [y, m, d] = dateStr.split('-');
  if (lang === 'ja') return `${y}年${m}月${d}日`;
  const date = new Date(`${dateStr}T00:00:00`);
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function getEmoji(level: MoodLevel, options: typeof MOOD_OPTIONS): string {
  return options.find((o) => o.level === level)!.emoji;
}

function formatMinutes(mins: number, lang: Lang): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (lang === 'ja') return h > 0 ? `${h}時間${m}分` : `${m}分`;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export default function Home() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [lang, setLang] = useState<Lang>('ja');
  const [clockInMood, setClockInMood] = useState<MoodLevel | null>(null);
  const [clockInMessage, setClockInMessage] = useState('');
  const [clockOutMood, setClockOutMood] = useState<MoodLevel | null>(null);
  const [clockOutMessage, setClockOutMessage] = useState('');
  const [now, setNow] = useState(new Date());
  const [mounted, setMounted] = useState(false);
  const [selectedPastRecord, setSelectedPastRecord] = useState<AttendanceRecord | null>(null);
  const [futurePaidLeaveDate, setFuturePaidLeaveDate] = useState<string>(getTomorrow());
  const [dismissedWarningIds, setDismissedWarningIds] = useState<Set<string>>(new Set());
  const [grantedDays, setGrantedDays] = useState<number>(20);
  const [editingGranted, setEditingGranted] = useState(false);
  const [grantedInput, setGrantedInput] = useState('20');

  useEffect(() => {
    setMounted(true);
    const storedRecords = localStorage.getItem(STORAGE_KEY);
    if (storedRecords) setRecords(JSON.parse(storedRecords));
    const storedLang = localStorage.getItem(LANG_KEY) as Lang | null;
    if (storedLang) setLang(storedLang);
    const storedGranted = localStorage.getItem(PAID_LEAVE_GRANTED_KEY);
    if (storedGranted) {
      const n = parseInt(storedGranted, 10);
      if (!isNaN(n) && n >= 0) { setGrantedDays(n); setGrantedInput(String(n)); }
    }

    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const t = translations[lang];
  const today = getToday();
  const currentYear = today.substring(0, 4);
  const usedDays = records.filter((r) => r.isPaidLeave && r.date.startsWith(currentYear)).length;
  const remainingDays = grantedDays - usedDays;
  const todayRecord = records.find((r) => r.date === today);
  const hasClockedIn = !!(todayRecord?.clockIn || todayRecord?.isPaidLeave);
  const hasClockedOut = !!todayRecord?.clockOut;
  const pastRecords = records
    .filter((r) => r.date !== today)
    .sort((a, b) => b.date.localeCompare(a.date));
  const missedClockOutRecords = pastRecords.filter(
    (r) => r.clockIn && !r.clockOut && !r.isPaidLeave && !dismissedWarningIds.has(r.id)
  );
  const futurePaidLeaveHasRecord = !!records.find((r) => r.date === futurePaidLeaveDate);

  const isOnBreak = !!(todayRecord?.breaks?.some((b) => !b.end));

  function handleBreakStart() {
    if (!todayRecord) return;
    const updated: AttendanceRecord = {
      ...todayRecord,
      breaks: [...(todayRecord.breaks ?? []), { start: new Date().toISOString() }],
    };
    saveRecords(records.map((r) => (r.id === todayRecord.id ? updated : r)));
  }

  function handleBreakEnd() {
    if (!todayRecord?.breaks) return;
    const updated: AttendanceRecord = {
      ...todayRecord,
      breaks: todayRecord.breaks.map((b, i) =>
        i === todayRecord.breaks!.length - 1 && !b.end
          ? { ...b, end: new Date().toISOString() }
          : b
      ),
    };
    saveRecords(records.map((r) => (r.id === todayRecord.id ? updated : r)));
  }

  function toggleLang() {
    const next: Lang = lang === 'ja' ? 'en' : 'ja';
    setLang(next);
    localStorage.setItem(LANG_KEY, next);
  }

  function saveRecords(next: AttendanceRecord[]) {
    setRecords(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  function handleUpdateRecord(updated: AttendanceRecord) {
    const exists = records.some((r) => r.id === updated.id);
    if (exists) {
      saveRecords(records.map((r) => (r.id === updated.id ? updated : r)));
    } else {
      saveRecords([updated, ...records]);
    }
  }

  function handlePaidLeave() {
    const record: AttendanceRecord = {
      id: crypto.randomUUID(),
      date: today,
      isPaidLeave: true,
    };
    saveRecords([record, ...records]);
  }

  function handleSaveGrantedDays() {
    const n = parseInt(grantedInput, 10);
    if (isNaN(n) || n < 0) return;
    setGrantedDays(n);
    localStorage.setItem(PAID_LEAVE_GRANTED_KEY, String(n));
    setEditingGranted(false);
  }

  function handleFuturePaidLeave() {
    if (futurePaidLeaveHasRecord) return;
    const record: AttendanceRecord = {
      id: crypto.randomUUID(),
      date: futurePaidLeaveDate,
      isPaidLeave: true,
    };
    saveRecords([record, ...records]);
    setFuturePaidLeaveDate(getTomorrow());
  }

  function handleClockIn() {
    if (!clockInMood) return;
    const record: AttendanceRecord = {
      id: crypto.randomUUID(),
      date: today,
      clockIn: {
        time: new Date().toISOString(),
        mood: clockInMood,
        message: clockInMessage.trim() || t.moods[clockInMood],
      },
    };
    saveRecords([record, ...records]);
    setClockInMood(null);
    setClockInMessage('');
  }

  function handleClockOut() {
    if (!clockOutMood || !todayRecord) return;
    const updated: AttendanceRecord = {
      ...todayRecord,
      clockOut: {
        time: new Date().toISOString(),
        mood: clockOutMood,
        message: clockOutMessage.trim() || t.efforts[clockOutMood],
      },
    };
    saveRecords(records.map((r) => (r.id === todayRecord.id ? updated : r)));
    setClockOutMood(null);
    setClockOutMessage('');
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-800">{t.appName}</h1>
            {mounted && (
              <p className="text-sm text-gray-500">{formatDate(today, lang)}</p>
            )}
          </div>
          <div className="flex items-center gap-3">
            {mounted && (
              <p className="text-2xl font-mono font-bold text-indigo-600" suppressHydrationWarning>
                {now.toLocaleTimeString('ja-JP', {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                })}
              </p>
            )}
            <button
              onClick={toggleLang}
              className="text-sm font-semibold px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-indigo-300 hover:text-indigo-600 transition-colors"
            >
              {t.toggleLang}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-4 py-6 space-y-5">
        {/* 退勤未記録バナー */}
        {mounted && missedClockOutRecords.map((record) => (
          <div
            key={record.id}
            className="bg-amber-50 border border-amber-300 rounded-2xl p-4 flex items-start gap-3"
          >
            <span className="text-2xl">⚠️</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-amber-800">
                {formatDate(record.date, lang)}&nbsp;{t.status.missedClockOutTitle}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setSelectedPastRecord(record)}
                className="text-xs font-semibold bg-amber-500 text-white px-3 py-1.5 rounded-lg hover:bg-amber-600 transition-colors"
              >
                {t.status.missedClockOutFix}
              </button>
              <button
                onClick={() => setDismissedWarningIds((prev) => new Set([...prev, record.id]))}
                className="text-xs font-semibold text-amber-600 hover:text-amber-800 transition-colors px-1"
              >
                ✕
              </button>
            </div>
          </div>
        ))}

        {/* 出勤前: 出勤フォーム */}
        {!hasClockedIn && (
          <div className="bg-white rounded-2xl shadow-sm p-6 space-y-5">
            <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <span>🌅</span> {t.clockIn.title}
            </h2>
            <div>
              <p className="text-sm font-medium text-gray-500 mb-3">{t.clockIn.moodQuestion}</p>
              <MoodSelector
                selected={clockInMood}
                onChange={setClockInMood}
                options={MOOD_OPTIONS}
                labels={t.moods}
              />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 mb-2">{t.clockIn.messageLabel}</p>
              <textarea
                value={clockInMessage}
                onChange={(e) => setClockInMessage(e.target.value)}
                placeholder={t.clockIn.messagePlaceholder}
                rows={2}
                className="w-full border border-gray-200 rounded-xl p-3 text-sm resize-none focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              />
            </div>
            <button
              onClick={handleClockIn}
              disabled={!clockInMood}
              className="w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-indigo-700 transition-colors"
            >
              {t.clockIn.button}
            </button>
            <div className="flex items-center gap-3">
              <hr className="flex-1 border-gray-200" />
              <span className="text-xs text-gray-400">{t.status.paidLeaveOr}</span>
              <hr className="flex-1 border-gray-200" />
            </div>
            <button
              onClick={handlePaidLeave}
              className="w-full bg-green-500 text-white py-3 rounded-xl font-semibold hover:bg-green-600 transition-colors"
            >
              🏖️ {t.status.paidLeaveButton}
            </button>
          </div>
        )}

        {/* 有給取得済み */}
        {todayRecord?.isPaidLeave && (
          <div className="bg-green-500 text-white rounded-2xl p-4 flex items-center gap-4">
            <span className="text-4xl">🏖️</span>
            <div>
              <p className="text-xs opacity-75 font-medium">{t.status.paidLeave}</p>
              <p className="text-lg font-bold">
                {lang === 'ja' ? '本日は有給取得です' : 'On paid leave today'}
              </p>
            </div>
          </div>
        )}

        {/* 出勤後・退勤前 */}
        {hasClockedIn && !hasClockedOut && todayRecord && !todayRecord.isPaidLeave && todayRecord.clockIn && (
          <>
            <div className="bg-indigo-600 text-white rounded-2xl p-4 flex items-center gap-4">
              <span className="text-4xl">{getEmoji(todayRecord.clockIn.mood, MOOD_OPTIONS)}</span>
              <div>
                <p className="text-xs opacity-75 font-medium">{t.status.clockedIn}</p>
                <p className="text-lg font-bold">{formatTime(todayRecord.clockIn.time)}</p>
                <p className="text-sm opacity-90 mt-0.5">
                  &ldquo;{todayRecord.clockIn.message}&rdquo;
                </p>
              </div>
            </div>

            {/* 休憩ボタン */}
            <button
              onClick={isOnBreak ? handleBreakEnd : handleBreakStart}
              className={`w-full py-3 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2 ${
                isOnBreak
                  ? 'bg-orange-500 text-white hover:bg-orange-600'
                  : 'bg-orange-50 text-orange-600 border border-orange-200 hover:bg-orange-100'
              }`}
            >
              <span>{isOnBreak ? '🔙' : '☕'}</span>
              {isOnBreak ? t.breakTime.end : t.breakTime.start}
              {isOnBreak && todayRecord.breaks && (
                <span className="text-xs opacity-75 ml-1">
                  ({formatMinutes(
                    Math.floor((now.getTime() - new Date(todayRecord.breaks[todayRecord.breaks.length - 1].start).getTime()) / 60000),
                    lang
                  )})
                </span>
              )}
            </button>

            <div className="bg-white rounded-2xl shadow-sm p-6 space-y-5">
              <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <span>🌙</span> {t.clockOut.title}
              </h2>
              <div>
                <p className="text-sm font-medium text-gray-500 mb-3">{t.clockOut.moodQuestion}</p>
                <MoodSelector
                  selected={clockOutMood}
                  onChange={setClockOutMood}
                  options={EFFORT_OPTIONS}
                  labels={t.efforts}
                />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 mb-2">{t.clockOut.messageLabel}</p>
                <textarea
                  value={clockOutMessage}
                  onChange={(e) => setClockOutMessage(e.target.value)}
                  placeholder={t.clockOut.messagePlaceholder}
                  rows={2}
                  className="w-full border border-gray-200 rounded-xl p-3 text-sm resize-none focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100"
                />
              </div>
              <button
                onClick={handleClockOut}
                disabled={!clockOutMood}
                className="w-full bg-purple-600 text-white py-3 rounded-xl font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-purple-700 transition-colors"
              >
                {t.clockOut.button}
              </button>
            </div>
          </>
        )}

        {/* 退勤完了: 今日のサマリー */}
        {hasClockedIn && hasClockedOut && todayRecord?.clockOut && todayRecord.clockIn && (
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h2 className="text-base font-semibold text-gray-700 mb-4">{t.status.todayRecord}</h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-indigo-50 rounded-xl p-4">
                <p className="text-xs text-indigo-600 font-semibold mb-2">
                  🌅 {t.status.clockInLabel}
                </p>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">{getEmoji(todayRecord.clockIn.mood, MOOD_OPTIONS)}</span>
                  <div>
                    <p className="font-bold text-gray-800">{formatTime(todayRecord.clockIn.time)}</p>
                    <p className="text-xs text-gray-500">{t.moods[todayRecord.clockIn.mood]}</p>
                  </div>
                </div>
                <p className="text-xs text-gray-600">&ldquo;{todayRecord.clockIn.message}&rdquo;</p>
              </div>
              <div className="bg-purple-50 rounded-xl p-4">
                <p className="text-xs text-purple-600 font-semibold mb-2">
                  🌙 {t.status.clockOutLabel}
                </p>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">{getEmoji(todayRecord.clockOut.mood, EFFORT_OPTIONS)}</span>
                  <div>
                    <p className="font-bold text-gray-800">
                      {formatTime(todayRecord.clockOut.time)}
                    </p>
                    <p className="text-xs text-gray-500">{t.efforts[todayRecord.clockOut.mood]}</p>
                  </div>
                </div>
                <p className="text-xs text-gray-600">
                  &ldquo;{todayRecord.clockOut.message}&rdquo;
                </p>
              </div>
            </div>
            {todayRecord.breaks && todayRecord.breaks.filter((b) => b.end).length > 0 && (() => {
              const breakMins = calcBreakMinutes(todayRecord.breaks);
              const totalMins = Math.floor(
                (new Date(todayRecord.clockOut.time).getTime() - new Date(todayRecord.clockIn.time).getTime()) / 60000
              );
              const actualMins = totalMins - breakMins;
              return (
                <div className="mt-3 space-y-2">
                  <div className="flex items-center justify-between bg-orange-50 rounded-xl px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <span>☕</span>
                      <p className="text-sm text-orange-700 font-medium">{t.breakTime.label}</p>
                    </div>
                    <p className="text-sm font-bold text-orange-700">{formatMinutes(breakMins, lang)}</p>
                  </div>
                  <div className="flex items-center justify-between bg-indigo-50 rounded-xl px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <span>⏱️</span>
                      <p className="text-sm text-indigo-700 font-medium">{t.breakTime.actual}</p>
                    </div>
                    <p className="text-sm font-bold text-indigo-700">{formatMinutes(actualMins, lang)}</p>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* カレンダー */}
        <div className="space-y-2">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-1">
            {t.calendar.title}
          </h2>
          <CalendarView records={records} t={t} lang={lang} onUpdateRecord={handleUpdateRecord} />
        </div>

        {/* 有給残日数 */}
        <div className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <span>🏖️</span> {t.paidLeaveBalance.title}
            </h2>
            {!editingGranted && (
              <button
                onClick={() => { setGrantedInput(String(grantedDays)); setEditingGranted(true); }}
                className="text-xs font-semibold text-gray-400 hover:text-indigo-600 transition-colors border border-gray-200 hover:border-indigo-300 px-2.5 py-1 rounded-lg"
              >
                {t.paidLeaveBalance.editTitle}
              </button>
            )}
          </div>

          {mounted && (
            <p className="text-xs text-gray-400 font-medium -mt-2">
              {t.paidLeaveBalance.yearLabel(parseInt(currentYear, 10))}
            </p>
          )}

          {/* 付与日数編集フォーム */}
          {editingGranted && (
            <div className="flex items-center gap-3">
              <input
                type="number"
                min={0}
                max={365}
                value={grantedInput}
                onChange={(e) => setGrantedInput(e.target.value)}
                className="w-24 border border-gray-200 rounded-xl p-2 text-sm text-center focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              />
              <span className="text-sm text-gray-500">{t.paidLeaveBalance.daysUnit}</span>
              <button
                onClick={handleSaveGrantedDays}
                className="text-sm font-semibold bg-indigo-600 text-white px-4 py-2 rounded-xl hover:bg-indigo-700 transition-colors"
              >
                {t.paidLeaveBalance.save}
              </button>
              <button
                onClick={() => setEditingGranted(false)}
                className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
              >
                {t.paidLeaveBalance.cancel}
              </button>
            </div>
          )}

          {/* 統計グリッド */}
          {mounted && (
            <div className="grid grid-cols-3 divide-x divide-gray-100 bg-gray-50 rounded-xl py-3">
              <div className="text-center px-2">
                <p className="text-[10px] text-gray-400 font-semibold mb-1">{t.paidLeaveBalance.granted}</p>
                <p className="text-xl font-bold text-gray-700">{grantedDays}<span className="text-xs font-normal text-gray-400 ml-0.5">{t.paidLeaveBalance.daysUnit}</span></p>
              </div>
              <div className="text-center px-2">
                <p className="text-[10px] text-green-500 font-semibold mb-1">{t.paidLeaveBalance.used}</p>
                <p className="text-xl font-bold text-green-600">{usedDays}<span className="text-xs font-normal text-green-400 ml-0.5">{t.paidLeaveBalance.daysUnit}</span></p>
              </div>
              <div className="text-center px-2">
                <p className={`text-[10px] font-semibold mb-1 ${remainingDays < 0 ? 'text-red-400' : 'text-indigo-400'}`}>
                  {remainingDays < 0 ? t.paidLeaveBalance.overUsed : t.paidLeaveBalance.remaining}
                </p>
                <p className={`text-xl font-bold ${remainingDays < 0 ? 'text-red-500' : 'text-indigo-600'}`}>
                  {Math.abs(remainingDays)}<span className={`text-xs font-normal ml-0.5 ${remainingDays < 0 ? 'text-red-300' : 'text-indigo-300'}`}>{t.paidLeaveBalance.daysUnit}</span>
                </p>
              </div>
            </div>
          )}

          {/* プログレスバー */}
          {mounted && grantedDays > 0 && (
            <div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${remainingDays < 0 ? 'bg-red-400' : 'bg-green-400'}`}
                  style={{ width: `${Math.min((usedDays / grantedDays) * 100, 100)}%` }}
                />
              </div>
              <p className="text-[10px] text-gray-400 mt-1 text-right">
                {Math.round((usedDays / grantedDays) * 100)}% {t.paidLeaveBalance.used}
              </p>
            </div>
          )}
        </div>

        {/* 有給の事前登録 */}
        <div className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <span>📅</span> {t.status.futurePaidLeave}
          </h2>
          <div>
            <p className="text-sm font-medium text-gray-500 mb-2">{t.status.futurePaidLeaveDate}</p>
            <input
              type="date"
              min={getTomorrow()}
              value={futurePaidLeaveDate}
              onChange={(e) => setFuturePaidLeaveDate(e.target.value)}
              className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-green-400 focus:ring-2 focus:ring-green-100"
            />
          </div>
          {futurePaidLeaveHasRecord && (
            <p className="text-sm text-red-500">{t.status.futurePaidLeaveAlreadyExists}</p>
          )}
          <button
            onClick={handleFuturePaidLeave}
            disabled={futurePaidLeaveHasRecord}
            className="w-full bg-green-500 text-white py-3 rounded-xl font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-green-600 transition-colors"
          >
            🏖️ {t.status.futurePaidLeaveButton}
          </button>
        </div>

        {/* 過去の記録 */}
        {pastRecords.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-1">
              {t.status.pastRecords}
            </h2>
            {pastRecords.slice(0, 10).map((record) => (
              <div
                key={record.id}
                onClick={() => setSelectedPastRecord(record)}
                className="bg-white rounded-2xl shadow-sm p-4 cursor-pointer hover:bg-indigo-50 transition-colors"
              >
                <div className="flex items-center justify-between mb-3">
                  <p className="font-semibold text-gray-700 text-sm">
                    {formatDate(record.date, lang)}
                  </p>
                  {record.isPaidLeave ? (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                      🏖️ {t.status.paidLeave}
                    </span>
                  ) : record.clockOut ? (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                      {t.status.completed}
                    </span>
                  ) : (
                    <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-medium">
                      {t.status.missingClockOut}
                    </span>
                  )}
                </div>
                {record.isPaidLeave ? (
                  <div className="flex items-center gap-2 text-green-600">
                    <span className="text-2xl">🏖️</span>
                    <p className="text-sm font-medium">{t.status.paidLeave}</p>
                  </div>
                ) : (
                <div className="grid grid-cols-2 gap-3">
                  {record.clockIn && (
                  <div className="flex items-start gap-2">
                    <span className="text-xl">{getEmoji(record.clockIn.mood, MOOD_OPTIONS)}</span>
                    <div>
                      <p className="text-xs text-indigo-600 font-medium">
                        {t.status.clockInLabel} {formatTime(record.clockIn.time)}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        &ldquo;{record.clockIn.message}&rdquo;
                      </p>
                    </div>
                  </div>
                  )}
                  {record.clockOut && (
                    <div className="flex items-start gap-2">
                      <span className="text-xl">{getEmoji(record.clockOut.mood, EFFORT_OPTIONS)}</span>
                      <div>
                        <p className="text-xs text-purple-600 font-medium">
                          {t.status.clockOutLabel} {formatTime(record.clockOut.time)}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          &ldquo;{record.clockOut.message}&rdquo;
                        </p>
                      </div>
                    </div>
                  )}
                </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Past RECORDSの詳細モーダル */}
        {selectedPastRecord && (
          <RecordDetailModal
            record={selectedPastRecord}
            date={selectedPastRecord.date}
            t={t}
            lang={lang}
            onClose={() => setSelectedPastRecord(null)}
            onUpdateRecord={(updated) => {
              handleUpdateRecord(updated);
              setSelectedPastRecord(null);
            }}
          />
        )}
      </main>
    </div>
  );
}
