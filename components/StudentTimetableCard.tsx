import React, { useState } from 'react';
import { ClassTimetable, GradeLevel, TimetablePeriod } from '../types';
import { DAYS_OF_WEEK } from '../constants/timetableDefaults';

interface StudentTimetableCardProps {
  grade: GradeLevel | string;
  activeTerm?: string;
  timetables?: ClassTimetable[];
}

export const StudentTimetableCard: React.FC<StudentTimetableCardProps> = ({
  grade,
  activeTerm = 'First Term',
  timetables = []
}) => {
  // Determine current day of week
  const todayName = new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(new Date());
  const isSchoolDay = DAYS_OF_WEEK.includes(todayName as any);
  const defaultTab = isSchoolDay ? todayName : 'Monday';

  const [selectedDay, setSelectedDay] = useState<string>(defaultTab);
  const [viewMode, setViewMode] = useState<'tabular' | 'day' | 'scheduleList'>('tabular');

  // Find class timetable for this grade & term (with fallback for any term)
  const classTimetable = timetables.find(
    t => t.grade === grade && (t.term || 'First Term') === activeTerm
  ) || timetables.find(t => t.grade === grade);

  const periods: TimetablePeriod[] = classTimetable?.periods || [];

  // Group periods by period index or time slot across Monday to Friday
  const uniqueTimes = Array.from(new Set(periods.map(p => `${p.startTime}-${p.endTime}`))).sort();

  // Or better: determine max periods per day and map 1..N
  const periodsByDay: Record<string, TimetablePeriod[]> = {};
  DAYS_OF_WEEK.forEach(d => {
    periodsByDay[d] = periods.filter(p => p.day === d).sort((a, b) => a.startTime.localeCompare(b.startTime));
  });

  const maxPeriodsInAnyDay = Math.max(...DAYS_OF_WEEK.map(d => periodsByDay[d]?.length || 0), 8);
  const periodRows = Array.from({ length: maxPeriodsInAnyDay }, (_, idx) => idx);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="bg-white rounded-3xl border-2 border-blue-900/10 shadow-md overflow-hidden space-y-0">
      {/* Card Header */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-950 to-blue-950 text-white p-6 sm:p-7 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">🗓️</span>
            <h3 className="text-xl sm:text-2xl font-black font-serif text-yellow-400">
              Class Weekly Timetable
            </h3>
          </div>
          <p className="text-xs sm:text-sm text-blue-200 font-medium mt-1">
            Official lesson schedule for <span className="font-bold text-white">{grade}</span> ({activeTerm})
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* View Mode Toggle */}
          <div className="bg-blue-950/80 p-1 rounded-xl border border-blue-800/60 flex items-center gap-1">
            <button
              type="button"
              onClick={() => setViewMode('tabular')}
              className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1 ${
                viewMode === 'tabular' ? 'bg-yellow-400 text-blue-950 shadow-xs' : 'text-blue-200 hover:text-white'
              }`}
            >
              <span>📊</span>
              <span>Tabular Form</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('scheduleList')}
              className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1 ${
                viewMode === 'scheduleList' ? 'bg-yellow-400 text-blue-950 shadow-xs' : 'text-blue-200 hover:text-white'
              }`}
            >
              <span>📋</span>
              <span>Schedule Table</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('day')}
              className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1 ${
                viewMode === 'day' ? 'bg-yellow-400 text-blue-950 shadow-xs' : 'text-blue-200 hover:text-white'
              }`}
            >
              <span>📅</span>
              <span>Day Focus</span>
            </button>
          </div>

          <button
            type="button"
            onClick={handlePrint}
            className="p-2.5 bg-blue-800/80 hover:bg-blue-700 text-white rounded-xl text-xs font-black transition-all shadow-xs flex items-center gap-1"
            title="Print or Save Timetable"
          >
            <span>🖨️</span>
            <span className="hidden sm:inline text-[11px] uppercase tracking-wider">Print</span>
          </button>
        </div>
      </div>

      {/* Quick Day Selector Tabs (for Day Focus or Table Filtering) */}
      {viewMode === 'day' && (
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-3 flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider mr-1">Select Day:</span>
          {DAYS_OF_WEEK.map(day => {
            const isToday = isSchoolDay && todayName === day;
            const isSelected = selectedDay === day;
            const count = periods.filter(p => p.day === day).length;

            return (
              <button
                key={day}
                type="button"
                onClick={() => setSelectedDay(day)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-blue-900 text-yellow-400 shadow-xs'
                    : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
                }`}
              >
                <span>{day}</span>
                {isToday && (
                  <span className="px-1.5 py-0.2 bg-emerald-500 text-white text-[9px] font-black rounded-md">
                    Today
                  </span>
                )}
                <span className="text-[10px] opacity-75 font-mono">({count})</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Content Area */}
      <div className="p-6 sm:p-7">
        {periods.length === 0 ? (
          <div className="p-10 text-center bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200 space-y-3">
            <span className="text-4xl block">📋</span>
            <h4 className="font-serif font-black text-blue-950 text-lg">
              Timetable Being Prepared
            </h4>
            <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
              Your class teacher is currently organizing the academic schedule for <span className="font-bold text-blue-900">{grade}</span>.
              Please check back shortly or consult with your class teacher!
            </p>
          </div>
        ) : viewMode === 'tabular' ? (
          /* TABULAR FORM: Monday to Friday Matrix with Time, Period, and Subject */
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
              <div>
                <h4 className="font-serif font-black text-blue-950 text-base sm:text-lg flex items-center gap-2">
                  <span>Weekly Tabular Schedule Matrix</span>
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-900 text-[10px] font-black rounded-lg uppercase">
                    Monday — Friday
                  </span>
                </h4>
                <p className="text-xs text-slate-500 font-medium">
                  Showing period numbers, active time intervals, and scheduled subjects for each day of the week.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 font-medium">
                  Today is <strong className="text-blue-900">{todayName}</strong> {isSchoolDay ? '(School Day)' : '(Weekend)'}
                </span>
              </div>
            </div>

            {/* Responsive Table Wrapper */}
            <div className="overflow-x-auto rounded-2xl border-2 border-slate-200 shadow-xs">
              <table className="w-full border-collapse text-left text-xs min-w-[760px]">
                <thead>
                  <tr className="bg-blue-900 text-white border-b-2 border-blue-950">
                    <th className="py-3.5 px-3 font-black text-[11px] uppercase tracking-wider text-yellow-400 w-24 text-center">
                      Period
                    </th>
                    <th className="py-3.5 px-3 font-black text-[11px] uppercase tracking-wider text-blue-200 w-32 text-center">
                      Time Slot
                    </th>
                    {DAYS_OF_WEEK.map(day => {
                      const isToday = isSchoolDay && todayName === day;
                      return (
                        <th 
                          key={day} 
                          className={`py-3.5 px-3 font-black text-[11px] uppercase tracking-wider ${
                            isToday ? 'bg-indigo-950 text-yellow-400 border-x border-indigo-800' : 'text-white'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span>{day}</span>
                            {isToday && (
                              <span className="px-1.5 py-0.2 bg-emerald-500 text-white text-[8px] font-black rounded uppercase">
                                Today
                              </span>
                            )}
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {periodRows.map((rowIdx) => {
                    // Representative period for time / label (search across days)
                    const samplePeriod = DAYS_OF_WEEK.map(d => periodsByDay[d]?.[rowIdx]).find(Boolean);
                    if (!samplePeriod) return null;

                    const periodNumberLabel = `Period ${rowIdx + 1}`;
                    const isAllBreak = DAYS_OF_WEEK.every(d => {
                      const p = periodsByDay[d]?.[rowIdx];
                      return p ? (p.subject.toLowerCase().includes('break') || p.subject.toLowerCase().includes('lunch')) : true;
                    });

                    return (
                      <tr 
                        key={rowIdx}
                        className={`transition-colors hover:bg-blue-50/40 ${isAllBreak ? 'bg-amber-50/70 font-bold' : ''}`}
                      >
                        {/* Period Column */}
                        <td className="py-3 px-3 text-center border-r border-slate-200 bg-slate-50 font-black text-slate-700 text-xs">
                          {isAllBreak ? (
                            <span className="px-2 py-1 bg-amber-200 text-amber-900 rounded-lg text-[10px] uppercase font-black tracking-wider inline-block">
                              Break
                            </span>
                          ) : (
                            <span className="font-mono text-blue-900 font-black">
                              {periodNumberLabel}
                            </span>
                          )}
                        </td>

                        {/* Standard / Representative Time */}
                        <td className="py-3 px-3 text-center border-r border-slate-200 font-mono text-[11px] font-bold text-slate-600 bg-slate-50/50 whitespace-nowrap">
                          ⏰ {samplePeriod.startTime} - {samplePeriod.endTime}
                        </td>

                        {/* Monday to Friday Cells */}
                        {DAYS_OF_WEEK.map(day => {
                          const p = periodsByDay[day]?.[rowIdx];
                          const isToday = isSchoolDay && todayName === day;

                          if (!p) {
                            return (
                              <td key={day} className={`py-3 px-3 text-slate-400 italic text-[11px] ${isToday ? 'bg-indigo-50/40' : ''}`}>
                                —
                              </td>
                            );
                          }

                          const isBreak = p.subject.toLowerCase().includes('break') || p.subject.toLowerCase().includes('lunch');
                          const isDevotion = p.subject.toLowerCase().includes('devotion') || p.subject.toLowerCase().includes('assembly');
                          const hasCustomTime = p.startTime !== samplePeriod.startTime || p.endTime !== samplePeriod.endTime;

                          return (
                            <td 
                              key={day} 
                              className={`py-3 px-3 align-top transition-colors ${
                                isToday ? 'bg-indigo-50/50 border-x border-indigo-100' : ''
                              } ${isBreak ? 'bg-amber-50/80 text-amber-950' : ''}`}
                            >
                              <div className="space-y-1">
                                {hasCustomTime && (
                                  <span className="inline-block px-1.5 py-0.5 bg-yellow-100 text-yellow-900 font-mono text-[9px] font-black rounded">
                                    ⏰ {p.startTime} - {p.endTime}
                                  </span>
                                )}
                                <div className={`font-black text-xs leading-snug ${
                                  isBreak ? 'text-amber-900 italic' : isDevotion ? 'text-purple-900' : 'text-blue-950'
                                }`}>
                                  {p.subject}
                                </div>
                                {(p.teacherName || p.room) && !isBreak && (
                                  <div className="text-[10px] text-slate-500 font-medium flex items-center justify-between gap-1">
                                    {p.teacherName && (
                                      <span className="truncate max-w-[90px]">{p.teacherName}</span>
                                    )}
                                    {p.room && (
                                      <span className="text-slate-400 font-mono text-[9px]">{p.room}</span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Tabular Schedule Legend & Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-2xl text-xs">
                <span className="font-black text-blue-900 uppercase tracking-wider block text-[10px]">
                  ⏰ Standard School Day Timing
                </span>
                <p className="text-slate-600 mt-1 font-medium">
                  Morning assembly: <strong>07:45 AM</strong>. Lessons commence promptly at <strong>08:00 AM</strong>.
                </p>
              </div>
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-xs">
                <span className="font-black text-amber-900 uppercase tracking-wider block text-[10px]">
                  ☕ Daily Intervals & Lunch
                </span>
                <p className="text-amber-900 mt-1 font-medium">
                  Short snack break followed by standard midday lunch. Pupils must remain within school grounds.
                </p>
              </div>
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs">
                <span className="font-black text-emerald-900 uppercase tracking-wider block text-[10px]">
                  📌 Class Teacher Synchronization
                </span>
                <p className="text-emerald-900 mt-1 font-medium">
                  Timetable updates by your class teacher or admin are published in real time to this board.
                </p>
              </div>
            </div>
          </div>
        ) : viewMode === 'scheduleList' ? (
          /* SCHEDULE TABLE: Detailed Tabular List with Time, Period, and Subject */
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
              <div>
                <h4 className="font-serif font-black text-blue-950 text-base sm:text-lg">
                  Full Lesson Schedule Table
                </h4>
                <p className="text-xs text-slate-500 font-medium">
                  Filter by day or view all scheduled periods from Monday to Friday.
                </p>
              </div>

              {/* Day filter pills */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => setSelectedDay('All')}
                  className={`px-3 py-1 rounded-xl text-xs font-black uppercase transition-all ${
                    selectedDay === 'All' ? 'bg-blue-900 text-yellow-400 shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  All Days
                </button>
                {DAYS_OF_WEEK.map(d => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setSelectedDay(d)}
                    className={`px-3 py-1 rounded-xl text-xs font-black uppercase transition-all ${
                      selectedDay === d ? 'bg-blue-900 text-yellow-400 shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {d.slice(0, 3)}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto rounded-2xl border-2 border-slate-200 shadow-xs">
              <table className="w-full border-collapse text-left text-xs min-w-[650px]">
                <thead>
                  <tr className="bg-blue-900 text-white">
                    <th className="py-3 px-3 font-black text-[10px] uppercase tracking-wider text-yellow-400 w-24">
                      Day
                    </th>
                    <th className="py-3 px-3 font-black text-[10px] uppercase tracking-wider text-blue-200 w-24">
                      Period
                    </th>
                    <th className="py-3 px-3 font-black text-[10px] uppercase tracking-wider text-yellow-400 w-32">
                      Time Interval
                    </th>
                    <th className="py-3 px-4 font-black text-[10px] uppercase tracking-wider text-white">
                      Subject / Activity
                    </th>
                    <th className="py-3 px-3 font-black text-[10px] uppercase tracking-wider text-blue-200">
                      Instructor
                    </th>
                    <th className="py-3 px-3 font-black text-[10px] uppercase tracking-wider text-blue-200">
                      Venue
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {periods
                    .filter(p => selectedDay === 'All' || p.day === selectedDay)
                    .sort((a, b) => {
                      const dayOrder = DAYS_OF_WEEK.indexOf(a.day as any) - DAYS_OF_WEEK.indexOf(b.day as any);
                      if (dayOrder !== 0) return dayOrder;
                      return a.startTime.localeCompare(b.startTime);
                    })
                    .map((p, idx) => {
                      const isBreak = p.subject.toLowerCase().includes('break') || p.subject.toLowerCase().includes('lunch');
                      const isDevotion = p.subject.toLowerCase().includes('devotion') || p.subject.toLowerCase().includes('assembly');

                      return (
                        <tr 
                          key={p.id || idx}
                          className={`hover:bg-blue-50/40 transition-colors ${
                            isBreak ? 'bg-amber-50/60 font-semibold text-amber-950' : isDevotion ? 'bg-purple-50/40' : ''
                          }`}
                        >
                          <td className="py-2.5 px-3 font-black text-blue-900">
                            {p.day}
                          </td>
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-500">
                            {isBreak ? 'Interval' : `Period ${idx + 1}`}
                          </td>
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-700 whitespace-nowrap">
                            <span className="px-2 py-0.5 bg-slate-100 rounded-md border border-slate-200">
                              ⏰ {p.startTime} - {p.endTime}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 font-black text-blue-950 text-sm">
                            {p.subject}
                          </td>
                          <td className="py-2.5 px-3 text-slate-600 font-medium">
                            {p.teacherName || 'Class Teacher'}
                          </td>
                          <td className="py-2.5 px-3 text-slate-500 font-mono text-[11px]">
                            {p.room || `Room ${grade}`}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* DAY TIMELINE / DAY CARDS FOCUS */
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h4 className="font-serif font-black text-blue-950 text-base sm:text-lg flex items-center gap-2">
                <span>{selectedDay}'s Lessons</span>
                {isSchoolDay && todayName === selectedDay && (
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-black rounded-lg uppercase">
                    Active Today
                  </span>
                )}
              </h4>
              <span className="text-xs text-slate-400 font-bold">
                {periods.filter(p => p.day === selectedDay).length} Scheduled Sessions
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {periods
                .filter(p => p.day === selectedDay)
                .sort((a, b) => a.startTime.localeCompare(b.startTime))
                .map((period, idx) => {
                  const isBreak = period.subject.toLowerCase().includes('break') || period.subject.toLowerCase().includes('lunch');
                  const isDevotion = period.subject.toLowerCase().includes('devotion') || period.subject.toLowerCase().includes('assembly');

                  return (
                    <div
                      key={period.id || idx}
                      className={`p-4 rounded-2xl border-2 transition-all ${
                        isBreak
                          ? 'bg-amber-50/60 border-amber-200 text-amber-950'
                          : isDevotion
                            ? 'bg-purple-50/60 border-purple-200 text-purple-950'
                            : 'bg-slate-50 border-slate-200 hover:border-blue-900/30'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="font-mono text-xs font-black px-2.5 py-1 bg-white rounded-lg border border-slate-200 text-blue-900 shadow-2xs">
                          ⏰ {period.startTime} - {period.endTime}
                        </span>
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                          {isBreak ? '☕ Interval' : `Period ${idx + 1}`}
                        </span>
                      </div>

                      <h5 className="font-black text-sm sm:text-base text-blue-950 leading-snug">
                        {period.subject}
                      </h5>

                      <div className="mt-3 pt-2.5 border-t border-slate-200/60 flex items-center justify-between text-xs text-slate-500 font-medium">
                        {period.teacherName && (
                          <span className="truncate max-w-[150px]">
                            👨‍🏫 {period.teacherName}
                          </span>
                        )}
                        {period.room && (
                          <span className="text-[11px] text-slate-400">
                            📍 {period.room}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* Notes from Class Teacher */}
        {classTimetable?.notes && (
          <div className="mt-6 p-4 bg-yellow-50 border-2 border-yellow-200 rounded-2xl text-xs sm:text-sm text-yellow-950 font-medium flex items-start gap-3">
            <span className="text-xl shrink-0">📌</span>
            <div>
              <span className="font-black uppercase tracking-wider text-[10px] text-yellow-800 block mb-0.5">
                Class Teacher Note
              </span>
              <p>{classTimetable.notes}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
