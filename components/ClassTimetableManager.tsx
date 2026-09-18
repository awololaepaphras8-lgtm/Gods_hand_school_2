import React, { useState } from 'react';
import { ClassTimetable, Course, GradeLevel, TimetablePeriod } from '../types';
import { DAYS_OF_WEEK, createDefaultClassTimetable } from '../constants/timetableDefaults';

interface ClassTimetableManagerProps {
  assignedGrades: GradeLevel[];
  courses: Course[];
  timetables: ClassTimetable[];
  currentUsername: string;
  onSaveTimetable: (timetable: ClassTimetable) => void;
}

export const ClassTimetableManager: React.FC<ClassTimetableManagerProps> = ({
  assignedGrades,
  courses,
  timetables,
  currentUsername,
  onSaveTimetable,
}) => {
  const initialGrade = assignedGrades[0] || 'Primary 1';
  const [selectedGrade, setSelectedGrade] = useState<GradeLevel>(initialGrade);
  const [selectedTerm, setSelectedTerm] = useState<string>('First Term');
  const [activeDayView, setActiveDayView] = useState<'All' | 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday'>('All');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Modal / Form state to add or edit a period
  const [isAddingPeriod, setIsAddingPeriod] = useState(false);
  const [periodDay, setPeriodDay] = useState<'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday'>('Monday');
  const [periodStartTime, setPeriodStartTime] = useState('08:00');
  const [periodEndTime, setPeriodEndTime] = useState('08:45');
  const [periodSubject, setPeriodSubject] = useState('');
  const [customSubject, setCustomSubject] = useState('');
  const [periodTeacher, setPeriodTeacher] = useState(currentUsername || 'Class Teacher');
  const [periodRoom, setPeriodRoom] = useState(`Room ${initialGrade}`);

  // Find existing timetable or generate default for selected grade
  const existingTimetable = timetables.find(
    t => t.grade === selectedGrade && (t.term || 'First Term') === selectedTerm
  );

  // Local draft periods
  const [localPeriods, setLocalPeriods] = useState<TimetablePeriod[]>(() => {
    if (existingTimetable && existingTimetable.periods && existingTimetable.periods.length > 0) {
      return existingTimetable.periods;
    }
    return createDefaultClassTimetable(initialGrade, 'First Term').periods;
  });

  const [notes, setNotes] = useState<string>(() => {
    return existingTimetable?.notes || `Official Class Timetable for ${initialGrade}.`;
  });

  // When selectedGrade or selectedTerm changes, sync local periods
  const handleGradeOrTermChange = (newGrade: GradeLevel, newTerm: string) => {
    setSelectedGrade(newGrade);
    setSelectedTerm(newTerm);
    setSaveSuccessMsg(null);
    setPeriodRoom(`Room ${newGrade}`);

    const match = timetables.find(t => t.grade === newGrade && (t.term || 'First Term') === newTerm);
    if (match && match.periods && match.periods.length > 0) {
      setLocalPeriods(match.periods);
      setNotes(match.notes || `Official Class Timetable for ${newGrade}.`);
    } else {
      const generated = createDefaultClassTimetable(newGrade, newTerm);
      setLocalPeriods(generated.periods);
      setNotes(generated.notes || `Official Class Timetable for ${newGrade}.`);
    }
  };

  // Filter courses for subject dropdown
  const relevantCourses = courses.filter(c => c.grade === selectedGrade || c.grade === 'all' || !c.grade);

  // Common subjects for quick select
  const defaultSubjectOptions = [
    'Mathematics',
    'English Studies',
    'Basic Science & Tech',
    'Social Studies',
    'Civic Education',
    'Agricultural Science',
    'Home Economics',
    'ICT / Computer Studies',
    'Quantitative Reasoning',
    'Verbal Reasoning',
    'Physical & Health Education',
    'Christian Rel. Knowledge',
    'Islamic Rel. Studies',
    'French Language',
    'Yoruba Language',
    'Cultural & Creative Art',
    'Music',
    'Handwriting & Phonics',
    'Library & Reading',
    'Morning Devotion / Assembly',
    'Short Break / Snack',
    'Long Break & Lunch'
  ];

  const handleAddPeriodSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalSubject = (periodSubject === '__custom__' ? customSubject.trim() : periodSubject) || 'Independent Study';

    const newPeriod: TimetablePeriod = {
      id: `P-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      day: periodDay,
      startTime: periodStartTime,
      endTime: periodEndTime,
      subject: finalSubject,
      teacherName: periodTeacher.trim() || currentUsername || 'Class Teacher',
      room: periodRoom.trim() || `Room ${selectedGrade}`
    };

    setLocalPeriods(prev => {
      const updated = [...prev, newPeriod];
      // Sort chronologically by start time
      return updated.sort((a, b) => a.startTime.localeCompare(b.startTime));
    });

    setIsAddingPeriod(false);
    setCustomSubject('');
    setSaveSuccessMsg('Period added to schedule. Remember to click "Save & Broadcast Timetable" below.');
  };

  const handleDeletePeriod = (periodId: string) => {
    setLocalPeriods(prev => prev.filter(p => p.id !== periodId));
    setSaveSuccessMsg('Period removed. Click "Save & Broadcast Timetable" to update.');
  };

  const handleResetToStandardSchedule = () => {
    if (window.confirm(`Reset timetable for ${selectedGrade} (${selectedTerm}) to standard default schedule? Any unsaved edits will be replaced.`)) {
      const standard = createDefaultClassTimetable(selectedGrade, selectedTerm);
      setLocalPeriods(standard.periods);
      setNotes(standard.notes || '');
      setSaveSuccessMsg('Standard curriculum schedule generated! Review and click "Save & Broadcast Timetable".');
    }
  };

  const handleSaveAndBroadcast = () => {
    const payload: ClassTimetable = {
      id: existingTimetable?.id || `TT-${selectedGrade.replace(/[^a-zA-Z0-9]/g, '-')}-${selectedTerm.replace(/\s+/g, '')}`,
      grade: selectedGrade,
      term: selectedTerm,
      academicYear: '2026/2027',
      periods: localPeriods,
      notes,
      updatedAt: new Date().toISOString(),
      updatedBy: currentUsername || 'Staff Teacher'
    };

    onSaveTimetable(payload);
    setSaveSuccessMsg(`Class timetable for ${selectedGrade} (${selectedTerm}) has been saved and published to all pupils in real time!`);
    setTimeout(() => {
      setSaveSuccessMsg(null);
    }, 6000);
  };

  const handlePrintTimetable = () => {
    window.print();
  };

  return (
    <div className="space-y-8">
      {/* Header & Description */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b-2 border-slate-100 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-3xl">🗓️</span>
            <h3 className="text-2xl sm:text-3xl font-black text-blue-900 font-serif">
              Class Timetable Manager
            </h3>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
            Build, edit, and publish weekly lesson schedules. Once published, your timetable appears immediately on every student's dashboard in this class.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrintTimetable}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-blue-950 font-black text-xs uppercase rounded-xl transition-all shadow-xs flex items-center gap-1.5"
            title="Print or save timetable"
          >
            <span>🖨️</span>
            <span>Print View</span>
          </button>
          <button
            type="button"
            onClick={handleSaveAndBroadcast}
            className="px-5 py-2.5 bg-blue-900 hover:bg-blue-800 text-yellow-400 font-black text-xs uppercase rounded-xl transition-all shadow-md active:scale-95 flex items-center gap-2"
          >
            <span>💾</span>
            <span>Save & Broadcast Timetable</span>
          </button>
        </div>
      </div>

      {/* Success Confirmation Toast */}
      {saveSuccessMsg && (
        <div className="p-4 bg-emerald-50 border-2 border-emerald-300 text-emerald-950 rounded-2xl text-xs sm:text-sm font-black flex items-center justify-between shadow-sm animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">✅</span>
            <span>{saveSuccessMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setSaveSuccessMsg(null)}
            className="text-emerald-700 hover:text-emerald-950 text-xs font-black px-2 py-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* Selector Toolbar */}
      <div className="bg-slate-50 border-2 border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
          {/* Class Grade */}
          <div className="space-y-1.5">
            <label className="text-xs font-black text-blue-950 uppercase tracking-wider block">
              Assigned Class / Grade
            </label>
            <select
              value={selectedGrade}
              onChange={(e) => handleGradeOrTermChange(e.target.value as GradeLevel, selectedTerm)}
              className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-2xl font-black text-xs text-blue-950 outline-none focus:border-blue-900 transition-all"
            >
              {assignedGrades.map(g => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>

          {/* Academic Term */}
          <div className="space-y-1.5">
            <label className="text-xs font-black text-blue-950 uppercase tracking-wider block">
              Academic Term
            </label>
            <select
              value={selectedTerm}
              onChange={(e) => handleGradeOrTermChange(selectedGrade, e.target.value)}
              className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-2xl font-black text-xs text-blue-950 outline-none focus:border-blue-900 transition-all"
            >
              <option value="First Term">First Term</option>
              <option value="Second Term">Second Term</option>
              <option value="Third Term">Third Term</option>
            </select>
          </div>

          {/* Quick Actions */}
          <div className="flex gap-2 sm:col-span-2">
            <button
              type="button"
              onClick={() => setIsAddingPeriod(true)}
              className="flex-1 py-3 px-4 bg-yellow-400 hover:bg-yellow-300 text-blue-950 rounded-2xl font-black text-xs uppercase tracking-wider transition-all shadow-md active:scale-95 flex items-center justify-center gap-2"
            >
              <span>➕</span>
              <span>Add Lesson / Period</span>
            </button>
            <button
              type="button"
              onClick={handleResetToStandardSchedule}
              className="py-3 px-4 bg-blue-100 hover:bg-blue-200 text-blue-950 rounded-2xl font-black text-xs uppercase tracking-wider transition-all shadow-xs active:scale-95"
              title="Reset or autofill standard 8-period timetable"
            >
              <span>⚡ Autofill Standard</span>
            </button>
          </div>
        </div>

        {/* Day Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 pt-3 border-t border-slate-200">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider mr-2">Filter Day:</span>
          {(['All', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'] as const).map(day => (
            <button
              key={day}
              type="button"
              onClick={() => setActiveDayView(day)}
              className={`px-3.5 py-1.5 rounded-xl font-black text-[11px] uppercase tracking-wider transition-all ${
                activeDayView === day
                  ? 'bg-blue-900 text-yellow-400 shadow-sm'
                  : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              {day}
            </button>
          ))}
          <span className="ml-auto text-[11px] font-bold text-slate-500">
            {localPeriods.length} total periods scheduled
          </span>
        </div>
      </div>

      {/* Add Period Modal */}
      {isAddingPeriod && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl space-y-6 border-2 border-yellow-400 relative">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
              <div>
                <h4 className="font-serif font-black text-blue-950 text-lg sm:text-xl">
                  Add Period to {selectedGrade}
                </h4>
                <p className="text-xs text-slate-400 font-bold">{selectedTerm} Timetable</p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddingPeriod(false)}
                className="text-slate-400 hover:text-rose-600 font-black text-xl p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddPeriodSubmit} className="space-y-4">
              {/* Day of Week */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Day of Week</label>
                <select
                  value={periodDay}
                  onChange={(e) => setPeriodDay(e.target.value as any)}
                  className="w-full px-4 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold text-xs text-blue-950 outline-none focus:border-blue-900"
                >
                  {DAYS_OF_WEEK.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              {/* Time Interval */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Start Time</label>
                  <input
                    type="time"
                    required
                    value={periodStartTime}
                    onChange={(e) => setPeriodStartTime(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-50 border-2 border-slate-200 rounded-xl font-mono font-bold text-xs text-blue-950 outline-none focus:border-blue-900"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">End Time</label>
                  <input
                    type="time"
                    required
                    value={periodEndTime}
                    onChange={(e) => setPeriodEndTime(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-50 border-2 border-slate-200 rounded-xl font-mono font-bold text-xs text-blue-950 outline-none focus:border-blue-900"
                  />
                </div>
              </div>

              {/* Subject */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Subject / Activity</label>
                <select
                  value={periodSubject}
                  onChange={(e) => setPeriodSubject(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold text-xs text-blue-950 outline-none focus:border-blue-900"
                >
                  <option value="">-- Choose Subject / Activity --</option>
                  <optgroup label="Class Curriculum Subjects">
                    {relevantCourses.map(c => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </optgroup>
                  <optgroup label="Standard School Subjects & Intervals">
                    {defaultSubjectOptions.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </optgroup>
                  <option value="__custom__">✍️ Custom Subject Name...</option>
                </select>

                {periodSubject === '__custom__' && (
                  <input
                    type="text"
                    required
                    placeholder="Enter custom subject / activity name"
                    value={customSubject}
                    onChange={(e) => setCustomSubject(e.target.value)}
                    className="mt-2 w-full px-4 py-2 bg-yellow-50 border-2 border-yellow-400 rounded-xl font-bold text-xs text-blue-950 outline-none"
                  />
                )}
              </div>

              {/* Teacher & Room */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Instructor / Note</label>
                  <input
                    type="text"
                    value={periodTeacher}
                    onChange={(e) => setPeriodTeacher(e.target.value)}
                    placeholder="e.g. Mr. Ade or Class Teacher"
                    className="w-full px-4 py-2 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold text-xs text-blue-950 outline-none focus:border-blue-900"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Venue / Classroom</label>
                  <input
                    type="text"
                    value={periodRoom}
                    onChange={(e) => setPeriodRoom(e.target.value)}
                    placeholder="e.g. Primary 4 Classroom"
                    className="w-full px-4 py-2 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold text-xs text-blue-950 outline-none focus:border-blue-900"
                  />
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddingPeriod(false)}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-black text-xs uppercase rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-blue-900 hover:bg-blue-800 text-yellow-400 font-black text-xs uppercase rounded-xl transition-all shadow-md"
                >
                  Add to Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Weekly Timetable Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {DAYS_OF_WEEK.filter(d => activeDayView === 'All' || activeDayView === d).map(day => {
          const dayPeriods = localPeriods
            .filter(p => p.day === day)
            .sort((a, b) => a.startTime.localeCompare(b.startTime));

          return (
            <div
              key={day}
              className="bg-white rounded-3xl border-2 border-slate-200 overflow-hidden shadow-xs flex flex-col transition-all hover:border-blue-200"
            >
              {/* Day Header */}
              <div className="bg-gradient-to-r from-blue-900 to-indigo-950 text-white px-4 py-3 flex items-center justify-between">
                <div>
                  <h4 className="font-serif font-black text-sm tracking-wide text-yellow-400">{day}</h4>
                  <span className="text-[10px] text-blue-200 font-bold">{dayPeriods.length} Lessons</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setPeriodDay(day);
                    setIsAddingPeriod(true);
                  }}
                  className="w-7 h-7 rounded-lg bg-yellow-400 hover:bg-yellow-300 text-blue-950 font-black text-xs flex items-center justify-center transition-all shadow-xs"
                  title={`Add period to ${day}`}
                >
                  +
                </button>
              </div>

              {/* Day Periods List */}
              <div className="p-3 space-y-2.5 flex-1 divide-y divide-slate-100 overflow-y-auto max-h-[580px] custom-scrollbar">
                {dayPeriods.length === 0 ? (
                  <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-400 text-xs font-bold">
                    No periods set for {day}.
                    <button
                      type="button"
                      onClick={() => {
                        setPeriodDay(day);
                        setIsAddingPeriod(true);
                      }}
                      className="mt-2 block mx-auto text-[10px] text-blue-800 font-black underline"
                    >
                      + Add Period
                    </button>
                  </div>
                ) : (
                  dayPeriods.map((period, idx) => {
                    const isBreak = period.subject.toLowerCase().includes('break') || period.subject.toLowerCase().includes('lunch');
                    const isDevotion = period.subject.toLowerCase().includes('devotion') || period.subject.toLowerCase().includes('assembly');

                    return (
                      <div
                        key={period.id || idx}
                        className={`pt-2.5 first:pt-0 group relative p-2.5 rounded-xl transition-all ${
                          isBreak
                            ? 'bg-amber-50/70 border border-amber-200'
                            : isDevotion
                              ? 'bg-purple-50/70 border border-purple-200'
                              : 'bg-slate-50/80 border border-slate-200 hover:bg-blue-50/60 hover:border-blue-200'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-1">
                          <div>
                            <span className="font-mono text-[10px] font-black text-slate-500 block">
                              {period.startTime} - {period.endTime}
                            </span>
                            <p className="font-black text-xs text-blue-950 mt-0.5 leading-snug">
                              {period.subject}
                            </p>
                            {period.teacherName && (
                              <p className="text-[10px] text-slate-500 font-medium">
                                👨‍🏫 {period.teacherName}
                              </p>
                            )}
                            {period.room && (
                              <span className="text-[9px] text-slate-400 font-medium">
                                📍 {period.room}
                              </span>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() => handleDeletePeriod(period.id)}
                            className="opacity-40 group-hover:opacity-100 text-rose-500 hover:text-rose-700 p-1 text-xs font-black transition-opacity"
                            title="Delete period"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Timetable Notes & Instructions */}
      <div className="bg-white rounded-3xl border-2 border-slate-200 p-6 space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-black text-blue-950 uppercase tracking-wider block">
            Class Teacher's Timetable Guidelines / Note for Pupils:
          </label>
          <span className="text-[11px] text-slate-400 font-medium">
            Shown to all students below their timetable
          </span>
        </div>
        <textarea
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g. Please bring drawing materials on Wednesdays. Morning assembly begins at 7:45 AM prompt."
          className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-2xl font-bold text-xs text-blue-950 outline-none focus:bg-white focus:border-blue-900 transition-all"
        />

        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={handleSaveAndBroadcast}
            className="px-6 py-3.5 bg-blue-900 hover:bg-blue-800 text-yellow-400 font-black text-xs uppercase rounded-xl transition-all shadow-md active:scale-95 flex items-center gap-2"
          >
            <span>💾</span>
            <span>Save & Broadcast Timetable to Pupils Now</span>
          </button>
        </div>
      </div>
    </div>
  );
};
