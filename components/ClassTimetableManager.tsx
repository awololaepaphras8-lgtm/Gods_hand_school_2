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
  const [viewLayout, setViewLayout] = useState<'tabularMatrix' | 'tabularEditor' | 'dayCards'>('tabularMatrix');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Modal / Form state to add or edit a period
  const [isAddingPeriod, setIsAddingPeriod] = useState(false);
  const [editingPeriodId, setEditingPeriodId] = useState<string | null>(null);
  const [periodDay, setPeriodDay] = useState<'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday'>('Monday');
  const [periodStartTime, setPeriodStartTime] = useState('08:00');
  const [periodEndTime, setPeriodEndTime] = useState('08:45');
  const [periodSubject, setPeriodSubject] = useState('');
  const [customSubject, setCustomSubject] = useState('');
  const [periodTeacher, setPeriodTeacher] = useState(currentUsername || 'Class Teacher');
  const [periodRoom, setPeriodRoom] = useState(`Room ${initialGrade}`);

  // Day Time Configuration Modal State
  const [isDayTimeModalOpen, setIsDayTimeModalOpen] = useState(false);
  const [targetDayForTimes, setTargetDayForTimes] = useState<'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday'>('Friday');
  const [dayOpeningTime, setDayOpeningTime] = useState('08:00');
  const [dayLessonDurationMins, setDayLessonDurationMins] = useState(45);
  const [dayBreakStartTime, setDayBreakStartTime] = useState('09:30');
  const [dayBreakDurationMins, setDayBreakDurationMins] = useState(20);
  const [dayLunchStartTime, setDayLunchStartTime] = useState('12:05');
  const [dayLunchDurationMins, setDayLunchDurationMins] = useState(45);

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

  // Helper to format minutes to HH:mm string
  const addMinutesToTime = (timeStr: string, minutesToAdd: number): string => {
    const [hh, mm] = timeStr.split(':').map(Number);
    const totalMinutes = (hh * 60 + mm + minutesToAdd) % 1440;
    const newH = Math.floor(totalMinutes / 60);
    const newM = totalMinutes % 60;
    return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
  };

  // Direct inline update of a period's start and end times
  const handleUpdatePeriodTimes = (periodId: string, newStart: string, newEnd: string) => {
    setLocalPeriods(prev =>
      prev.map(p => (p.id === periodId ? { ...p, startTime: newStart, endTime: newEnd } : p))
    );
    setSaveSuccessMsg('Period time updated! Click "Save & Broadcast Timetable" to publish.');
  };

  // Direct inline update of a period's subject
  const handleUpdatePeriodSubject = (periodId: string, newSubject: string) => {
    setLocalPeriods(prev =>
      prev.map(p => (p.id === periodId ? { ...p, subject: newSubject } : p))
    );
  };

  // Open "Change Day Times" modal for a specific day
  const handleOpenDayTimesModal = (day: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday') => {
    setTargetDayForTimes(day);
    const dayPeriods = localPeriods.filter(p => p.day === day).sort((a, b) => a.startTime.localeCompare(b.startTime));
    if (dayPeriods.length > 0) {
      setDayOpeningTime(dayPeriods[0].startTime);
    } else {
      setDayOpeningTime(day === 'Friday' ? '08:00' : '08:00');
    }
    setIsDayTimeModalOpen(true);
  };

  // Batch apply timing rule to all periods of a specific day
  const handleApplyDayTimingBatch = () => {
    const dayPeriods = localPeriods.filter(p => p.day === targetDayForTimes).sort((a, b) => a.startTime.localeCompare(b.startTime));
    if (dayPeriods.length === 0) {
      alert(`No periods found for ${targetDayForTimes}. Please add periods first.`);
      return;
    }

    let currentTime = dayOpeningTime;
    const updatedDayPeriods = dayPeriods.map((period, idx) => {
      const isBreak = period.subject.toLowerCase().includes('break') || period.subject.toLowerCase().includes('snack');
      const isLunch = period.subject.toLowerCase().includes('lunch');

      let duration = dayLessonDurationMins;
      if (isBreak) duration = dayBreakDurationMins;
      if (isLunch) duration = dayLunchDurationMins;

      const startTime = currentTime;
      const endTime = addMinutesToTime(currentTime, duration);
      currentTime = endTime;

      return {
        ...period,
        startTime,
        endTime
      };
    });

    setLocalPeriods(prev => {
      const otherPeriods = prev.filter(p => p.day !== targetDayForTimes);
      return [...otherPeriods, ...updatedDayPeriods].sort((a, b) => a.startTime.localeCompare(b.startTime));
    });

    setIsDayTimeModalOpen(false);
    setSaveSuccessMsg(`Timing schedule for ${targetDayForTimes} updated successfully! Remember to click "Save & Broadcast Timetable" below.`);
  };

  const handleAddPeriodSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalSubject = (periodSubject === '__custom__' ? customSubject.trim() : periodSubject) || 'Independent Study';

    if (editingPeriodId) {
      // Edit existing period
      setLocalPeriods(prev =>
        prev.map(p =>
          p.id === editingPeriodId
            ? {
                ...p,
                day: periodDay,
                startTime: periodStartTime,
                endTime: periodEndTime,
                subject: finalSubject,
                teacherName: periodTeacher.trim() || currentUsername || 'Class Teacher',
                room: periodRoom.trim() || `Room ${selectedGrade}`
              }
            : p
        )
      );
      setEditingPeriodId(null);
      setSaveSuccessMsg('Period details updated.');
    } else {
      // Add new period
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
        return updated.sort((a, b) => a.startTime.localeCompare(b.startTime));
      });
      setSaveSuccessMsg('Period added to schedule.');
    }

    setIsAddingPeriod(false);
    setCustomSubject('');
  };

  const handleEditPeriodClick = (p: TimetablePeriod) => {
    setEditingPeriodId(p.id);
    setPeriodDay(p.day as any);
    setPeriodStartTime(p.startTime);
    setPeriodEndTime(p.endTime);
    if (defaultSubjectOptions.includes(p.subject) || relevantCourses.some(c => c.name === p.subject)) {
      setPeriodSubject(p.subject);
      setCustomSubject('');
    } else {
      setPeriodSubject('__custom__');
      setCustomSubject(p.subject);
    }
    setPeriodTeacher(p.teacherName || currentUsername || 'Class Teacher');
    setPeriodRoom(p.room || `Room ${selectedGrade}`);
    setIsAddingPeriod(true);
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
    if (!assignedGrades || assignedGrades.length === 0 || !assignedGrades.includes(selectedGrade)) {
      alert(`Access Restricted: You are only authorized to write and publish timetables for your assigned class(es): ${assignedGrades?.join(', ') || 'No assigned class'}.`);
      return;
    }

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

  // Grouping for Tabular Matrix
  const periodsByDay: Record<string, TimetablePeriod[]> = {};
  DAYS_OF_WEEK.forEach(d => {
    periodsByDay[d] = localPeriods.filter(p => p.day === d).sort((a, b) => a.startTime.localeCompare(b.startTime));
  });

  const maxPeriodsInAnyDay = Math.max(...DAYS_OF_WEEK.map(d => periodsByDay[d]?.length || 0), 8);
  const periodRows = Array.from({ length: maxPeriodsInAnyDay }, (_, idx) => idx);

  if (!assignedGrades || assignedGrades.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3 border-b-2 border-slate-100 pb-4">
          <span className="text-3xl">🗓️</span>
          <div>
            <h3 className="text-2xl font-black text-blue-900 font-serif">Class Timetable Manager</h3>
            <p className="text-xs text-slate-500 font-medium">Build, edit, and publish weekly lesson schedules.</p>
          </div>
        </div>
        <div className="bg-amber-50 border-2 border-amber-300 rounded-3xl p-8 text-amber-950 flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
          <span className="text-4xl">🔒</span>
          <div>
            <h4 className="font-serif font-black text-base uppercase">Assigned Class Required to Write Timetable</h4>
            <p className="text-xs text-amber-800 mt-1 max-w-xl">
              Staff members can only write and edit lesson timetables for their assigned class. You currently have no class assigned to your staff account. Please request the School Administrator to assign your class in Staff Management.
            </p>
          </div>
        </div>
      </div>
    );
  }

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
            Build and edit your weekly lesson timetable in tabular form with custom period times for each day (Monday to Friday).
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* View Layout Tabs */}
          <div className="bg-slate-100 p-1 rounded-2xl flex items-center gap-1 border border-slate-200">
            <button
              type="button"
              onClick={() => setViewLayout('tabularMatrix')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                viewLayout === 'tabularMatrix' ? 'bg-blue-900 text-yellow-400 shadow-sm' : 'text-slate-600 hover:text-blue-900'
              }`}
            >
              📊 Tabular Matrix
            </button>
            <button
              type="button"
              onClick={() => setViewLayout('tabularEditor')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                viewLayout === 'tabularEditor' ? 'bg-blue-900 text-yellow-400 shadow-sm' : 'text-slate-600 hover:text-blue-900'
              }`}
            >
              ✏️ Tabular Editor
            </button>
            <button
              type="button"
              onClick={() => setViewLayout('dayCards')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                viewLayout === 'dayCards' ? 'bg-blue-900 text-yellow-400 shadow-sm' : 'text-slate-600 hover:text-blue-900'
              }`}
            >
              📅 Day Cards
            </button>
          </div>

          <button
            type="button"
            onClick={handlePrintTimetable}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-blue-950 font-black text-xs uppercase rounded-xl transition-all shadow-xs flex items-center gap-1"
            title="Print or save timetable"
          >
            <span>🖨️</span>
            <span>Print</span>
          </button>
          <button
            type="button"
            onClick={handleSaveAndBroadcast}
            className="px-5 py-2 bg-blue-900 hover:bg-blue-800 text-yellow-400 font-black text-xs uppercase rounded-xl transition-all shadow-md active:scale-95 flex items-center gap-2"
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

      {/* Selector & Day Time Changer Toolbar */}
      <div className="bg-slate-50 border-2 border-slate-200 rounded-3xl p-6 shadow-xs space-y-5">
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
              onClick={() => {
                setEditingPeriodId(null);
                setPeriodSubject('');
                setCustomSubject('');
                setPeriodStartTime('08:00');
                setPeriodEndTime('08:45');
                setIsAddingPeriod(true);
              }}
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

        {/* Change Day's Times Quick Bar: Monday to Friday */}
        <div className="pt-4 border-t border-slate-200">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <span className="text-[11px] font-black text-blue-900 uppercase tracking-wider block">
                ⏰ Change Day's Schedule Times (Monday — Friday):
              </span>
              <p className="text-[11px] text-slate-500 font-medium">
                Customize opening hours, lesson durations, and interval times independently for each day of the week (e.g. Friday early closure).
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {DAYS_OF_WEEK.map(day => (
                <button
                  key={day}
                  type="button"
                  onClick={() => handleOpenDayTimesModal(day)}
                  className="px-3 py-1.5 bg-white hover:bg-blue-900 hover:text-yellow-400 text-slate-700 border-2 border-slate-200 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all shadow-2xs flex items-center gap-1"
                  title={`Change start/end times and period duration for ${day}`}
                >
                  <span>⏰</span>
                  <span>{day}</span>
                </button>
              ))}
            </div>
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

      {/* CHANGE DAY TIMES MODAL */}
      {isDayTimeModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl space-y-6 border-2 border-yellow-400 relative">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
              <div>
                <h4 className="font-serif font-black text-blue-950 text-xl flex items-center gap-2">
                  <span>⏰</span>
                  <span>Change Schedule Times for {targetDayForTimes}</span>
                </h4>
                <p className="text-xs text-slate-500 font-medium">
                  Set custom period times and duration specifically for {targetDayForTimes} in {selectedGrade}.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsDayTimeModalOpen(false)}
                className="text-slate-400 hover:text-rose-600 font-black text-xl p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-blue-50 rounded-2xl border border-blue-200 space-y-3">
                <span className="font-black text-xs text-blue-900 uppercase tracking-wider block">
                  ⚡ Quick Auto-Recalculate {targetDayForTimes} Periods
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase">Day Start Time</label>
                    <input
                      type="time"
                      value={dayOpeningTime}
                      onChange={(e) => setDayOpeningTime(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono text-xs font-bold text-blue-950"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase">Lesson Duration (Mins)</label>
                    <input
                      type="number"
                      min={20}
                      max={90}
                      step={5}
                      value={dayLessonDurationMins}
                      onChange={(e) => setDayLessonDurationMins(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono text-xs font-bold text-blue-950"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase">Short Break Duration (Mins)</label>
                    <input
                      type="number"
                      min={10}
                      max={45}
                      step={5}
                      value={dayBreakDurationMins}
                      onChange={(e) => setDayBreakDurationMins(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono text-xs font-bold text-blue-950"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase">Lunch Break Duration (Mins)</label>
                    <input
                      type="number"
                      min={20}
                      max={60}
                      step={5}
                      value={dayLunchDurationMins}
                      onChange={(e) => setDayLunchDurationMins(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono text-xs font-bold text-blue-950"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleApplyDayTimingBatch}
                  className="w-full py-2.5 bg-blue-900 hover:bg-blue-800 text-yellow-400 font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md mt-2 flex items-center justify-center gap-1.5"
                >
                  <span>⚡</span>
                  <span>Recalculate & Apply to All {targetDayForTimes} Lessons</span>
                </button>
              </div>

              {/* Individual Period Time Adjustment Table for this Day */}
              <div className="space-y-2">
                <span className="font-black text-xs text-slate-700 uppercase tracking-wider block">
                  Or Manually Adjust Each Period's Time for {targetDayForTimes}:
                </span>
                <div className="max-h-60 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                  {localPeriods
                    .filter(p => p.day === targetDayForTimes)
                    .sort((a, b) => a.startTime.localeCompare(b.startTime))
                    .map((p, idx) => (
                      <div key={p.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-2">
                        <div className="truncate max-w-[160px]">
                          <span className="text-[10px] font-black text-slate-400 uppercase block">Period {idx + 1}</span>
                          <strong className="text-xs text-blue-950">{p.subject}</strong>
                        </div>
                        <div className="flex items-center gap-1.5 font-mono">
                          <input
                            type="time"
                            value={p.startTime}
                            onChange={(e) => handleUpdatePeriodTimes(p.id, e.target.value, p.endTime)}
                            className="px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs font-bold text-blue-950"
                          />
                          <span className="text-xs text-slate-400">-</span>
                          <input
                            type="time"
                            value={p.endTime}
                            onChange={(e) => handleUpdatePeriodTimes(p.id, p.startTime, e.target.value)}
                            className="px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs font-bold text-blue-950"
                          />
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setIsDayTimeModalOpen(false)}
                className="px-6 py-2.5 bg-blue-900 text-yellow-400 font-black text-xs uppercase tracking-wider rounded-xl shadow-md"
              >
                Done Adjusting Times
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Period Modal */}
      {isAddingPeriod && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl space-y-6 border-2 border-yellow-400 relative">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
              <div>
                <h4 className="font-serif font-black text-blue-950 text-lg sm:text-xl">
                  {editingPeriodId ? 'Edit Period in Schedule' : `Add Period to ${selectedGrade}`}
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

              {/* Time Interval: Start & End */}
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
                  {editingPeriodId ? 'Update Period' : 'Add to Schedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW 1: TABULAR MATRIX (Monday - Friday) */}
      {viewLayout === 'tabularMatrix' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2">
            <div>
              <h4 className="font-serif font-black text-blue-950 text-base sm:text-lg">
                Weekly Tabular Timetable Matrix (Monday to Friday)
              </h4>
              <p className="text-xs text-slate-500 font-medium">
                Structured tabular timetable overview showing time, period, and scheduled subject across Monday to Friday.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500">
                Class: <strong className="text-blue-900">{selectedGrade}</strong> ({selectedTerm})
              </span>
            </div>
          </div>

          <div className="overflow-x-auto rounded-3xl border-2 border-slate-200 shadow-xs bg-white">
            <table className="w-full border-collapse text-left text-xs min-w-[760px]">
              <thead>
                <tr className="bg-blue-900 text-white border-b-2 border-blue-950">
                  <th className="py-3.5 px-3 font-black text-[11px] uppercase tracking-wider text-yellow-400 w-24 text-center">
                    Period
                  </th>
                  <th className="py-3.5 px-3 font-black text-[11px] uppercase tracking-wider text-blue-200 w-32 text-center">
                    Time Slot
                  </th>
                  {DAYS_OF_WEEK.map(day => (
                    <th key={day} className="py-3.5 px-3 font-black text-[11px] uppercase tracking-wider text-white">
                      <div className="flex items-center justify-between gap-1">
                        <span>{day}</span>
                        <button
                          type="button"
                          onClick={() => handleOpenDayTimesModal(day)}
                          className="px-1.5 py-0.5 bg-blue-800 hover:bg-yellow-400 hover:text-blue-950 text-[9px] font-black rounded uppercase transition-colors"
                          title={`Adjust times for ${day}`}
                        >
                          ⏰ Times
                        </button>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {periodRows.map((rowIdx) => {
                  const samplePeriod = DAYS_OF_WEEK.map(d => periodsByDay[d]?.[rowIdx]).find(Boolean);
                  if (!samplePeriod) return null;

                  const isAllBreak = DAYS_OF_WEEK.every(d => {
                    const p = periodsByDay[d]?.[rowIdx];
                    return p ? (p.subject.toLowerCase().includes('break') || p.subject.toLowerCase().includes('lunch')) : true;
                  });

                  return (
                    <tr 
                      key={rowIdx}
                      className={`transition-colors hover:bg-blue-50/40 ${isAllBreak ? 'bg-amber-50/70 font-bold' : ''}`}
                    >
                      <td className="py-3 px-3 text-center border-r border-slate-200 bg-slate-50 font-black text-slate-700 text-xs">
                        {isAllBreak ? (
                          <span className="px-2 py-1 bg-amber-200 text-amber-900 rounded-lg text-[10px] uppercase font-black tracking-wider inline-block">
                            Break
                          </span>
                        ) : (
                          <span className="font-mono text-blue-900 font-black">
                            Period {rowIdx + 1}
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-center border-r border-slate-200 font-mono text-[11px] font-bold text-slate-600 bg-slate-50/50 whitespace-nowrap">
                        ⏰ {samplePeriod.startTime} - {samplePeriod.endTime}
                      </td>

                      {DAYS_OF_WEEK.map(day => {
                        const p = periodsByDay[day]?.[rowIdx];
                        if (!p) {
                          return (
                            <td key={day} className="py-3 px-3 text-slate-300 italic text-[11px]">
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
                            className={`py-3 px-3 align-top transition-colors group relative ${
                              isBreak ? 'bg-amber-50/80 text-amber-950' : ''
                            }`}
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
                              {p.teacherName && !isBreak && (
                                <p className="text-[10px] text-slate-500 font-medium truncate max-w-[110px]">
                                  👨‍🏫 {p.teacherName}
                                </p>
                              )}
                              <div className="pt-1 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleEditPeriodClick(p)}
                                  className="text-[10px] font-bold text-blue-800 hover:underline"
                                >
                                  ✏️ Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeletePeriod(p.id)}
                                  className="text-[10px] font-bold text-rose-600 hover:underline"
                                >
                                  ✕ Del
                                </button>
                              </div>
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
        </div>
      )}

      {/* VIEW 2: TABULAR EDITOR (Interactive table with inline Time, Subject & Teacher editing) */}
      {viewLayout === 'tabularEditor' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2">
            <div>
              <h4 className="font-serif font-black text-blue-950 text-base sm:text-lg">
                Interactive Tabular Schedule Editor
              </h4>
              <p className="text-xs text-slate-500 font-medium">
                Change each day's start and end times, update subjects, and adjust periods directly in this tabular form.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsAddingPeriod(true)}
                className="px-3.5 py-1.5 bg-yellow-400 hover:bg-yellow-300 text-blue-950 font-black text-xs uppercase rounded-xl transition-all shadow-xs"
              >
                + Add Period
              </button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-3xl border-2 border-slate-200 shadow-xs bg-white">
            <table className="w-full border-collapse text-left text-xs min-w-[740px]">
              <thead>
                <tr className="bg-blue-900 text-white">
                  <th className="py-3 px-3 font-black text-[10px] uppercase tracking-wider text-yellow-400 w-28">
                    Day (Mon-Fri)
                  </th>
                  <th className="py-3 px-3 font-black text-[10px] uppercase tracking-wider text-blue-200 w-20">
                    Period
                  </th>
                  <th className="py-3 px-3 font-black text-[10px] uppercase tracking-wider text-yellow-400 w-52">
                    Time Interval (Start — End)
                  </th>
                  <th className="py-3 px-4 font-black text-[10px] uppercase tracking-wider text-white">
                    Subject / Activity
                  </th>
                  <th className="py-3 px-3 font-black text-[10px] uppercase tracking-wider text-blue-200 w-36">
                    Instructor
                  </th>
                  <th className="py-3 px-3 font-black text-[10px] uppercase tracking-wider text-blue-200 w-24">
                    Venue
                  </th>
                  <th className="py-3 px-3 font-black text-[10px] uppercase tracking-wider text-right w-20">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {localPeriods
                  .filter(p => activeDayView === 'All' || p.day === activeDayView)
                  .sort((a, b) => {
                    const dayOrder = DAYS_OF_WEEK.indexOf(a.day as any) - DAYS_OF_WEEK.indexOf(b.day as any);
                    if (dayOrder !== 0) return dayOrder;
                    return a.startTime.localeCompare(b.startTime);
                  })
                  .map((period, idx) => {
                    const isBreak = period.subject.toLowerCase().includes('break') || period.subject.toLowerCase().includes('lunch');

                    return (
                      <tr key={period.id || idx} className={`hover:bg-blue-50/50 transition-colors ${isBreak ? 'bg-amber-50/60' : ''}`}>
                        <td className="py-3 px-3 font-black text-blue-900">
                          {period.day}
                        </td>
                        <td className="py-3 px-3 font-mono font-bold text-slate-500">
                          {isBreak ? 'Interval' : `P${idx + 1}`}
                        </td>
                        {/* Editable Start and End Times */}
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-1 font-mono">
                            <input
                              type="time"
                              value={period.startTime}
                              onChange={(e) => handleUpdatePeriodTimes(period.id, e.target.value, period.endTime)}
                              className="px-2 py-1 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-blue-950 focus:border-blue-900 outline-none w-24"
                              title="Change start time for this period"
                            />
                            <span className="text-slate-400 font-bold">-</span>
                            <input
                              type="time"
                              value={period.endTime}
                              onChange={(e) => handleUpdatePeriodTimes(period.id, period.startTime, e.target.value)}
                              className="px-2 py-1 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-blue-950 focus:border-blue-900 outline-none w-24"
                              title="Change end time for this period"
                            />
                          </div>
                        </td>
                        {/* Subject */}
                        <td className="py-3 px-4">
                          <input
                            type="text"
                            value={period.subject}
                            onChange={(e) => handleUpdatePeriodSubject(period.id, e.target.value)}
                            className="w-full px-2 py-1 bg-transparent hover:bg-slate-100 focus:bg-white border border-transparent focus:border-slate-300 rounded-lg font-black text-blue-950 text-xs outline-none"
                          />
                        </td>
                        {/* Instructor */}
                        <td className="py-3 px-3 text-slate-600 font-medium">
                          {period.teacherName || 'Class Teacher'}
                        </td>
                        {/* Room */}
                        <td className="py-3 px-3 text-slate-500 font-mono text-[11px]">
                          {period.room || `Room ${selectedGrade}`}
                        </td>
                        {/* Actions */}
                        <td className="py-3 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleDeletePeriod(period.id)}
                            className="text-rose-500 hover:text-rose-700 font-black text-xs p-1"
                            title="Delete period"
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 3: DAY CARDS VIEW */}
      {viewLayout === 'dayCards' && (
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
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleOpenDayTimesModal(day)}
                      className="px-2 py-1 rounded-lg bg-blue-800 hover:bg-yellow-400 hover:text-blue-950 text-white font-black text-[10px] transition-all"
                      title={`Change schedule times for ${day}`}
                    >
                      ⏰ Times
                    </button>
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

                            <div className="flex items-center gap-1 opacity-40 group-hover:opacity-100 transition-opacity">
                              <button
                                type="button"
                                onClick={() => handleEditPeriodClick(period)}
                                className="text-blue-700 hover:text-blue-900 p-1 text-xs font-black"
                                title="Edit period"
                              >
                                ✏️
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeletePeriod(period.id)}
                                className="text-rose-500 hover:text-rose-700 p-1 text-xs font-black"
                                title="Delete period"
                              >
                                ✕
                              </button>
                            </div>
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
      )}

      {/* Class Notes / Instructions */}
      <div className="bg-white rounded-3xl border-2 border-slate-200 p-6 shadow-xs space-y-3">
        <label className="text-xs font-black text-blue-950 uppercase tracking-wider block">
          Class Instructions & Assembly Notices for {selectedGrade} ({selectedTerm})
        </label>
        <textarea
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g. Please ensure all pupils arrive before 7:45 AM for morning devotion. Friday sports wear required."
          className="w-full p-4 bg-slate-50 border-2 border-slate-200 rounded-2xl text-xs sm:text-sm font-medium text-blue-950 outline-none focus:border-blue-900 transition-all resize-none"
        />
        <div className="flex justify-between items-center pt-2">
          <span className="text-[11px] text-slate-400 font-bold">
            Notes will appear directly on the student portal and report cards.
          </span>
          <button
            type="button"
            onClick={handleSaveAndBroadcast}
            className="px-6 py-2.5 bg-blue-900 hover:bg-blue-800 text-yellow-400 font-black text-xs uppercase rounded-xl transition-all shadow-md active:scale-95 flex items-center gap-2"
          >
            <span>💾</span>
            <span>Save & Broadcast Timetable</span>
          </button>
        </div>
      </div>
    </div>
  );
};
