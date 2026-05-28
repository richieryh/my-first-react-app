'use client';

import { useState } from 'react';
import { AttendanceRecord, MOOD_OPTIONS, EFFORT_OPTIONS, MoodLevel, calcBreakMinutes } from '@/types/attendance';
import { Lang, Translations } from '@/i18n/translations';
import HolidayJP from '@holiday-jp/holiday_jp';
import RecordDetailModal from '@/components/RecordDetailModal';

interface Props {
  records: AttendanceRecord[];
  t: Translations;
  lang: Lang;
  onUpdateRecord: (record: AttendanceRecord) => void;
}

function getEmoji(level: MoodLevel, options: typeof MOOD_OPTIONS): string {
  return options.find((o) => o.level === level)!.emoji;
}

// 出勤体調の背景色（緑系：好調 → 赤系：不調）
function getMoodBgColor(level: MoodLevel): string {
  switch (level) {
    case 5: return '#bbf7d0'; // 絶好調 — green-200
    case 4: return '#d1fae5'; // 好調   — emerald-100
    case 3: return '#f3f4f6'; // 普通   — gray-100
    case 2: return '#fed7aa'; // 不調   — orange-100
    case 1: return '#fecaca'; // 絶不調 — red-200
  }
}

// 退勤頑張り度の背景色（青紫系：頑張った → 橙赤系：あんまり）
function getEffortBgColor(level: MoodLevel): string {
  switch (level) {
    case 5: return '#c7d2fe'; // 超頑張った — indigo-200
    case 4: return '#bfdbfe'; // 頑張った   — blue-200
    case 3: return '#e0f2fe'; // まあまあ   — sky-100
    case 2: return '#fde68a'; // もうちょっと — amber-200
    case 1: return '#fca5a5'; // あんまり   — red-300
  }
}

function getCellBackground(
  record: { isPaidLeave?: boolean; clockIn?: { mood: MoodLevel }; clockOut?: { mood: MoodLevel } } | undefined,
  isToday: boolean
): string | undefined {
  if (record?.isPaidLeave) return isToday ? '#d1fae5' : '#ecfdf5';
  if (!record) return isToday ? '#eef2ff' : undefined;
  const left = record.clockIn ? getMoodBgColor(record.clockIn.mood) : '#ffffff';
  const right = record.clockOut ? getEffortBgColor(record.clockOut.mood) : '#ffffff';
  if (record.clockIn || record.clockOut) {
    return `linear-gradient(to right, ${left} 50%, ${right} 50%)`;
  }
  return isToday ? '#eef2ff' : '#f9fafb';
}

function formatTime(isoString: string): string {
  return new Date(isoString).toLocaleTimeString('ja-JP', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function toDateStr(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export default function CalendarView({ records, t, lang, onUpdateRecord }: Props) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const recordMap = new Map<string, AttendanceRecord>();
  records.forEach((r) => recordMap.set(r.date, r));

  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const todayStr = toDateStr(today.getFullYear(), today.getMonth(), today.getDate());

  function closeModal() {
    setSelectedDate(null);
  }

  function prevMonth() {
    if (viewMonth === 0) { setViewYear((y) => y - 1); setViewMonth(11); }
    else setViewMonth((m) => m - 1);
  }

  function nextMonth() {
    if (viewMonth === 11) { setViewYear((y) => y + 1); setViewMonth(0); }
    else setViewMonth((m) => m + 1);
  }

  const monthTitle = lang === 'ja'
    ? `${viewYear}年${viewMonth + 1}月`
    : new Date(viewYear, viewMonth).toLocaleDateString('en-US', { year: 'numeric', month: 'long' });

  const cells: (number | null)[] = [
    ...Array(firstDayOfWeek).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  // 7日ごとの週に分割し、端数は null でパディング
  const weeks: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    const week = cells.slice(i, i + 7);
    while (week.length < 7) week.push(null);
    weeks.push(week);
  }

  function calcWeekMinutes(week: (number | null)[]): number {
    return week.reduce<number>((sum, day) => {
      if (!day) return sum;
      const dateStr = toDateStr(viewYear, viewMonth, day);
      const record = recordMap.get(dateStr);
      if (!record?.clockIn || !record?.clockOut) return sum;
      const diff = new Date(record.clockOut.time).getTime() - new Date(record.clockIn.time).getTime();
      return sum + Math.floor(diff / 60000) - calcBreakMinutes(record.breaks);
    }, 0);
  }

  const selectedRecord = selectedDate ? recordMap.get(selectedDate) : null;

  // 表示月の祝日マップ: dateStr -> holiday name
  const holidayMap = new Map<string, string>();
  const monthStart = new Date(viewYear, viewMonth, 1);
  const monthEnd = new Date(viewYear, viewMonth + 1, 0);
  HolidayJP.between(monthStart, monthEnd).forEach((h) => {
    const key = toDateStr(h.date.getFullYear(), h.date.getMonth(), h.date.getDate());
    holidayMap.set(key, h.name);
  });

  // 表示月の勤務時間を集計
  const monthPrefix = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}`;
  const allMonthRecords = records.filter((r) => r.date.startsWith(monthPrefix));
  const monthRecords = allMonthRecords.filter((r) => r.clockOut && r.clockIn);
  const paidLeaveCount = allMonthRecords.filter((r) => r.isPaidLeave).length;
  const totalMinutes = monthRecords.reduce((sum, r) => {
    const diff = new Date(r.clockOut!.time).getTime() - new Date(r.clockIn!.time).getTime();
    return sum + Math.floor(diff / 60000) - calcBreakMinutes(r.breaks);
  }, 0);
  const totalHours = Math.floor(totalMinutes / 60);
  const totalMins = totalMinutes % 60;
  const daysWorked = monthRecords.length;
  const avgMinutes = daysWorked > 0 ? Math.floor(totalMinutes / daysWorked) : 0;
  const avgHours = Math.floor(avgMinutes / 60);
  const avgMins = avgMinutes % 60;

  const totalLabel = lang === 'ja'
    ? `${totalHours}時間${totalMins}分`
    : `${totalHours}h ${totalMins}m`;
  const avgLabel = lang === 'ja'
    ? `${avgHours}時間${avgMins}分`
    : `${avgHours}h ${avgMins}m`;
  const daysLabel = lang === 'ja' ? `${daysWorked}日` : `${daysWorked} days`;

  return (
    <>
      <div className="bg-white rounded-2xl shadow-sm p-4">
        {/* 月ナビゲーション */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={prevMonth}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500 text-lg transition-colors"
          >
            ‹
          </button>
          <h2 className="font-bold text-gray-800">{monthTitle}</h2>
          <button
            onClick={nextMonth}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500 text-lg transition-colors"
          >
            ›
          </button>
        </div>

        {/* 曜日ヘッダー */}
        <div className="grid grid-cols-8 mb-1">
          {t.calendar.weekdays.map((day, i) => (
            <div
              key={day}
              className={`text-center text-xs font-semibold py-1 ${
                i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-gray-400'
              }`}
            >
              {day}
            </div>
          ))}
          <div className="text-center text-xs font-semibold py-1 text-indigo-400">
            {lang === 'ja' ? '週計' : 'Wk'}
          </div>
        </div>

        {/* 月次集計 */}
        {(daysWorked > 0 || paidLeaveCount > 0) && (
          <div className="mb-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-3">
            {daysWorked > 0 && (
              <div className="grid grid-cols-3 divide-x divide-indigo-100">
                <div className="text-center px-2">
                  <p className="text-[10px] text-indigo-400 font-semibold mb-0.5">
                    {lang === 'ja' ? '総勤務時間' : 'Total'}
                  </p>
                  <p className="text-sm font-bold text-indigo-700">{totalLabel}</p>
                </div>
                <div className="text-center px-2">
                  <p className="text-[10px] text-purple-400 font-semibold mb-0.5">
                    {lang === 'ja' ? '出勤日数' : 'Days'}
                  </p>
                  <p className="text-sm font-bold text-purple-700">{daysLabel}</p>
                </div>
                <div className="text-center px-2">
                  <p className="text-[10px] text-indigo-400 font-semibold mb-0.5">
                    {lang === 'ja' ? '1日平均' : 'Avg/Day'}
                  </p>
                  <p className="text-sm font-bold text-indigo-700">{avgLabel}</p>
                </div>
              </div>
            )}
            {paidLeaveCount > 0 && (
              <div className={`text-center ${daysWorked > 0 ? 'mt-2 pt-2 border-t border-indigo-100' : ''}`}>
                <p className="text-[10px] text-green-500 font-semibold">
                  🏖️ {lang === 'ja' ? `有給取得 ${paidLeaveCount}日` : `Paid Leave: ${paidLeaveCount} day(s)`}
                </p>
              </div>
            )}
          </div>
        )}

        {/* カレンダーグリッド */}
        <div className="space-y-0.5">
          {weeks.map((week, weekIdx) => {
            const weekMinutes = calcWeekMinutes(week);
            const weekHours = Math.floor(weekMinutes / 60);
            const weekMins = weekMinutes % 60;
            return (
              <div key={weekIdx} className="grid grid-cols-8 gap-0.5">
                {week.map((day, dayIdx) => {
                  if (day === null) return <div key={`empty-${weekIdx}-${dayIdx}`} />;

                  const dateStr = toDateStr(viewYear, viewMonth, day);
                  const record = recordMap.get(dateStr);
                  const isToday = dateStr === todayStr;
                  const dayOfWeek = (firstDayOfWeek + day - 1) % 7;
                  const holidayName = holidayMap.get(dateStr);
                  const isHoliday = !!holidayName;
                  const isWeekday = dayOfWeek !== 0 && dayOfWeek !== 6 && !isHoliday;
                  const cellBg = getCellBackground(record, isToday);

                  return (
                    <div
                      key={dateStr}
                      onClick={() => isWeekday && setSelectedDate(dateStr)}
                      style={cellBg ? { background: cellBg } : undefined}
                      className={`rounded-lg p-1 min-h-14 flex flex-col ${isToday ? 'ring-2 ring-indigo-400' : ''} ${isWeekday ? 'cursor-pointer hover:shadow-sm transition-shadow' : ''}`}
                    >
                      {/* 日付番号 */}
                      <span
                        className={`text-xs font-semibold w-5 h-5 flex items-center justify-center rounded-full mb-0.5 ${
                          isToday
                            ? 'bg-indigo-600 text-white'
                            : dayOfWeek === 0 || isHoliday
                            ? 'text-red-400'
                            : dayOfWeek === 6
                            ? 'text-blue-400'
                            : 'text-gray-600'
                        }`}
                      >
                        {day}
                      </span>
                      {/* 祝日名 */}
                      {isHoliday && (
                        <span className="text-[9px] leading-tight text-red-400 font-medium break-all">
                          {holidayName}
                        </span>
                      )}
                      {/* 打刻情報 */}
                      {record && (
                        <div className="space-y-0.5">
                          {record.isPaidLeave ? (
                            <div className="flex items-center gap-0.5">
                              <span className="text-xs leading-none">🏖️</span>
                              <span className="text-[10px] text-green-500 leading-none font-medium">
                                {lang === 'ja' ? '有給' : 'PL'}
                              </span>
                            </div>
                          ) : (
                            <>
                              {record.clockIn && (
                                <div className="flex items-center gap-0.5">
                                  <span className="text-xs leading-none">
                                    {getEmoji(record.clockIn.mood, MOOD_OPTIONS)}
                                  </span>
                                  <span className="text-[10px] text-indigo-500 leading-none font-medium">
                                    {formatTime(record.clockIn.time)}
                                  </span>
                                </div>
                              )}
                              {record.clockOut && (
                                <div className="flex items-center gap-0.5">
                                  <span className="text-xs leading-none">
                                    {getEmoji(record.clockOut.mood, EFFORT_OPTIONS)}
                                  </span>
                                  <span className="text-[10px] text-purple-500 leading-none font-medium">
                                    {formatTime(record.clockOut.time)}
                                  </span>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
                {/* 週次合計セル */}
                <div className="rounded-lg min-h-14 flex flex-col items-center justify-center bg-indigo-50">
                  {weekMinutes > 0 && (
                    <>
                      <span className="text-[11px] font-bold text-indigo-600 leading-tight">
                        {weekHours}h
                      </span>
                      {weekMins > 0 && (
                        <span className="text-[10px] text-indigo-400 leading-tight">
                          {weekMins}m
                        </span>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 日付詳細モーダル */}
      {selectedDate && (
        <RecordDetailModal
          record={selectedRecord ?? undefined}
          date={selectedDate}
          holidayName={holidayMap.get(selectedDate)}
          t={t}
          lang={lang}
          onClose={closeModal}
          onUpdateRecord={onUpdateRecord}
        />
      )}
    </>
  );
}
