'use client';

import { useState, useEffect } from 'react';
import MoodSelector from '@/components/MoodSelector';
import CalendarView from '@/components/CalendarView';
import RecordDetailModal from '@/components/RecordDetailModal';
import { AttendanceRecord, MoodLevel, MOOD_OPTIONS, EFFORT_OPTIONS } from '@/types/attendance';
import { Lang, translations } from '@/i18n/translations';

const STORAGE_KEY = 'attendance_records';
const LANG_KEY = 'attendance_lang';

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

  useEffect(() => {
    setMounted(true);
    const storedRecords = localStorage.getItem(STORAGE_KEY);
    if (storedRecords) setRecords(JSON.parse(storedRecords));
    const storedLang = localStorage.getItem(LANG_KEY) as Lang | null;
    if (storedLang) setLang(storedLang);

    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const t = translations[lang];
  const today = getToday();
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
          </div>
        )}

        {/* カレンダー */}
        <div className="space-y-2">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-1">
            {t.calendar.title}
          </h2>
          <CalendarView records={records} t={t} lang={lang} onUpdateRecord={handleUpdateRecord} />
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
