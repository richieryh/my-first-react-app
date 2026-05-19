'use client';

import { useState, useEffect } from 'react';
import { AttendanceRecord, MOOD_OPTIONS, EFFORT_OPTIONS, MoodLevel } from '@/types/attendance';
import { Lang, Translations } from '@/i18n/translations';
import MoodSelector from '@/components/MoodSelector';

interface Props {
  record?: AttendanceRecord;
  date: string;
  holidayName?: string;
  t: Translations;
  lang: Lang;
  onClose: () => void;
  onUpdateRecord: (record: AttendanceRecord) => void;
}

function getEmoji(level: MoodLevel, options: typeof MOOD_OPTIONS): string {
  return options.find((o) => o.level === level)!.emoji;
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

export default function RecordDetailModal({
  record,
  date,
  holidayName,
  t,
  lang,
  onClose,
  onUpdateRecord,
}: Props) {
  // retro clock-out (既存レコードに退勤を追記)
  const [retroTime, setRetroTime] = useState('');
  const [retroMood, setRetroMood] = useState<MoodLevel | null>(null);
  const [retroMessage, setRetroMessage] = useState('');

  // 新規レコード作成用 (出勤)
  const [newClockInTime, setNewClockInTime] = useState('');
  const [newClockInMood, setNewClockInMood] = useState<MoodLevel | null>(null);
  const [newClockInMessage, setNewClockInMessage] = useState('');

  useEffect(() => {
    setRetroTime('');
    setRetroMood(null);
    setRetroMessage('');
    setNewClockInTime('');
    setNewClockInMood(null);
    setNewClockInMessage('');
  }, [date]);

  function handleRetroClockOut() {
    if (!record || !retroTime || !retroMood) return;
    const updated: AttendanceRecord = {
      ...record,
      clockOut: {
        time: new Date(`${date}T${retroTime}:00`).toISOString(),
        mood: retroMood,
        message: retroMessage.trim() || t.efforts[retroMood],
      },
    };
    onUpdateRecord(updated);
    onClose();
  }

  function handleNewRecord() {
    const clockInFilled = newClockInTime && newClockInMood;
    const clockOutFilled = retroTime && retroMood;
    if (!clockInFilled && !clockOutFilled) return;

    const newRecord: AttendanceRecord = {
      id: crypto.randomUUID(),
      date,
      ...(clockInFilled
        ? {
            clockIn: {
              time: new Date(`${date}T${newClockInTime}:00`).toISOString(),
              mood: newClockInMood!,
              message: newClockInMessage.trim() || t.moods[newClockInMood!],
            },
          }
        : {}),
      ...(clockOutFilled
        ? {
            clockOut: {
              time: new Date(`${date}T${retroTime}:00`).toISOString(),
              mood: retroMood!,
              message: retroMessage.trim() || t.efforts[retroMood!],
            },
          }
        : {}),
    };
    onUpdateRecord(newRecord);
    onClose();
  }

  function handlePaidLeave() {
    onUpdateRecord({ id: crypto.randomUUID(), date, isPaidLeave: true });
    onClose();
  }

  const canSaveNew =
    !!(newClockInTime && newClockInMood) ||
    !!(retroTime && retroMood);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 px-4 pb-6 sm:pb-0"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-5 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-gray-800">{formatDate(date, lang)}</h3>
            {holidayName && (
              <p className="text-xs text-red-400 font-medium mt-0.5">{holidayName}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 text-lg transition-colors"
          >
            ×
          </button>
        </div>

        <div className="space-y-3">
          {/* ── 既存レコードがある場合 ── */}
          {record ? (
            record.isPaidLeave ? (
              <div className="bg-green-50 rounded-xl p-6 flex flex-col items-center gap-2">
                <span className="text-5xl">🏖️</span>
                <p className="font-bold text-green-700 text-lg">{t.status.paidLeave}</p>
              </div>
            ) : (
              <>
                {record.clockIn && (
                  <div className="bg-indigo-50 rounded-xl p-4">
                    <p className="text-xs text-indigo-600 font-semibold mb-2">
                      🌅 {t.status.clockInLabel}
                    </p>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-2xl">{getEmoji(record.clockIn.mood, MOOD_OPTIONS)}</span>
                      <div>
                        <p className="font-bold text-gray-800">{formatTime(record.clockIn.time)}</p>
                        <p className="text-xs text-gray-500">{t.moods[record.clockIn.mood]}</p>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600">&ldquo;{record.clockIn.message}&rdquo;</p>
                  </div>
                )}

                {record.clockOut ? (
                  <>
                    <div className="bg-purple-50 rounded-xl p-4">
                      <p className="text-xs text-purple-600 font-semibold mb-2">
                        🌙 {t.status.clockOutLabel}
                      </p>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-2xl">{getEmoji(record.clockOut.mood, EFFORT_OPTIONS)}</span>
                        <div>
                          <p className="font-bold text-gray-800">{formatTime(record.clockOut.time)}</p>
                          <p className="text-xs text-gray-500">{t.efforts[record.clockOut.mood]}</p>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600">&ldquo;{record.clockOut.message}&rdquo;</p>
                    </div>
                  </>
                ) : (
                  <div className="bg-purple-50 rounded-xl p-4 space-y-3">
                    <p className="text-xs text-purple-600 font-semibold">
                      🌙 {t.status.retroClockOut}
                    </p>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">{t.status.retroClockOutTime}</p>
                      <input
                        type="time"
                        value={retroTime}
                        onChange={(e) => setRetroTime(e.target.value)}
                        className="w-full border border-purple-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100"
                      />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-2">{t.clockOut.moodQuestion}</p>
                      <MoodSelector
                        selected={retroMood}
                        onChange={setRetroMood}
                        options={EFFORT_OPTIONS}
                        labels={t.efforts}
                      />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">{t.clockOut.messageLabel}</p>
                      <textarea
                        value={retroMessage}
                        onChange={(e) => setRetroMessage(e.target.value)}
                        placeholder={t.clockOut.messagePlaceholder}
                        rows={2}
                        className="w-full border border-purple-200 rounded-xl p-2 text-sm resize-none focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100"
                      />
                    </div>
                    <button
                      onClick={handleRetroClockOut}
                      disabled={!retroTime || !retroMood}
                      className="w-full bg-purple-600 text-white py-2 rounded-xl text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-purple-700 transition-colors"
                    >
                      {t.status.retroClockOutSave}
                    </button>
                  </div>
                )}
              </>
            )
          ) : (
            /* ── レコードがない場合: 出勤・退勤を後から入力 ── */
            <>
              {/* 出勤 */}
              <div className="bg-indigo-50 rounded-xl p-4 space-y-3">
                <p className="text-xs text-indigo-600 font-semibold">🌅 {t.status.retroClockIn}</p>
                <div>
                  <p className="text-xs text-gray-500 mb-1">{t.status.retroClockInTime}</p>
                  <input
                    type="time"
                    value={newClockInTime}
                    onChange={(e) => setNewClockInTime(e.target.value)}
                    className="w-full border border-indigo-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                  />
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-2">{t.clockIn.moodQuestion}</p>
                  <MoodSelector
                    selected={newClockInMood}
                    onChange={setNewClockInMood}
                    options={MOOD_OPTIONS}
                    labels={t.moods}
                  />
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">{t.clockIn.messageLabel}</p>
                  <textarea
                    value={newClockInMessage}
                    onChange={(e) => setNewClockInMessage(e.target.value)}
                    placeholder={t.clockIn.messagePlaceholder}
                    rows={2}
                    className="w-full border border-indigo-200 rounded-xl p-2 text-sm resize-none focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                  />
                </div>
              </div>

              {/* 退勤 */}
              <div className="bg-purple-50 rounded-xl p-4 space-y-3">
                <p className="text-xs text-purple-600 font-semibold">🌙 {t.status.retroClockOut}</p>
                <div>
                  <p className="text-xs text-gray-500 mb-1">{t.status.retroClockOutTime}</p>
                  <input
                    type="time"
                    value={retroTime}
                    onChange={(e) => setRetroTime(e.target.value)}
                    className="w-full border border-purple-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100"
                  />
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-2">{t.clockOut.moodQuestion}</p>
                  <MoodSelector
                    selected={retroMood}
                    onChange={setRetroMood}
                    options={EFFORT_OPTIONS}
                    labels={t.efforts}
                  />
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">{t.clockOut.messageLabel}</p>
                  <textarea
                    value={retroMessage}
                    onChange={(e) => setRetroMessage(e.target.value)}
                    placeholder={t.clockOut.messagePlaceholder}
                    rows={2}
                    className="w-full border border-purple-200 rounded-xl p-2 text-sm resize-none focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100"
                  />
                </div>
              </div>

              {/* 有給オプション */}
              <div className="flex items-center gap-3">
                <hr className="flex-1 border-gray-200" />
                <span className="text-xs text-gray-400">{t.status.paidLeaveOr}</span>
                <hr className="flex-1 border-gray-200" />
              </div>
              <button
                onClick={handlePaidLeave}
                className="w-full bg-green-500 text-white py-2 rounded-xl text-sm font-semibold hover:bg-green-600 transition-colors"
              >
                🏖️ {t.status.paidLeaveButton}
              </button>

              {/* 保存ボタン */}
              <button
                onClick={handleNewRecord}
                disabled={!canSaveNew}
                className="w-full bg-indigo-600 text-white py-2 rounded-xl text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-indigo-700 transition-colors"
              >
                {t.status.retroClockOutSave}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
