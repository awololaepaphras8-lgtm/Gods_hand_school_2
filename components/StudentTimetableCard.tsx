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
  const [viewMode, setViewMode] = useState<'day' | 'week'>('day');

  // Find class timetable for this grade & term (with fallback for any term)
  const classTimetable = timetables.find(
    t => t.grade === grade && (t.term || 'First Term') === activeTerm
  ) || timetables.find(t => t.grade === grade);

  const periods: TimetablePeriod[] = classTimetable?.periods || [];

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
            Weekly lesson timetable for <span className="font-bold text-white">{grade}</span> ({activeTerm})
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="bg-blue-950/80 p-1 rounded-xl border border-blue-800/60 flex items-center gap-1">
            <button
              type="button"
              onClick={() => setViewMode('day')}
              className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
                viewMode === 'day' ? 'bg-yellow-400 text-blue-950 shadow-xs' : 'text-blue-200 hover:text-white'
              }`}
            >
              Day View
            </button>
            <button
              type="button"
              onClick={() => setViewMode('week')}
              className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
                viewMode === 'week' ? 'bg-yellow-400 text-blue-950 shadow-xs' : 'text-blue-200 hover:text-white'
              }`}
            >
              Full Week
            </button>
          </div>

          <button
            type="button"
            onClick={handlePrint}
            className="p-2.5 bg-blue-800/80 hover:bg-blue-700 text-white rounded-xl text-xs font-black transition-all shadow-xs"
            title="Print or Save Timetable"
          >
            🖨️
          </button>
        </div>
      </div>

      {/* Day Selector Tabs (only shown in Day view) */}
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
        ) : viewMode === 'day' ? (
          /* Day Timeline View */
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
        ) : (
          /* Full Week Grid View */
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            {DAYS_OF_WEEK.map(day => {
              const dayLessons = periods
                .filter(p => p.day === day)
                .sort((a, b) => a.startTime.localeCompare(b.startTime));

              return (
                <div key={day} className="bg-slate-50 rounded-2xl border-2 border-slate-200 overflow-hidden flex flex-col">
                  <div className="bg-blue-900 text-white px-3 py-2 flex items-center justify-between">
                    <span className="font-serif font-black text-xs text-yellow-400">{day}</span>
                    <span className="text-[9px] text-blue-200 font-bold">{dayLessons.length}</span>
                  </div>

                  <div className="p-2 space-y-2 flex-1 overflow-y-auto max-h-[420px]">
                    {dayLessons.map((p, i) => {
                      const isBreak = p.subject.toLowerCase().includes('break') || p.subject.toLowerCase().includes('lunch');
                      return (
                        <div
                          key={p.id || i}
                          className={`p-2 rounded-xl text-xs ${
                            isBreak
                              ? 'bg-amber-100/60 border border-amber-200'
                              : 'bg-white border border-slate-200'
                          }`}
                        >
                          <div className="font-mono text-[9px] font-black text-slate-400">
                            {p.startTime} - {p.endTime}
                          </div>
                          <div className="font-black text-blue-950 text-xs mt-0.5">
                            {p.subject}
                          </div>
                          {p.room && (
                            <div className="text-[9px] text-slate-400 mt-0.5">
                              {p.room}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
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
