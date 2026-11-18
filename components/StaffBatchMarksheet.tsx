import React, { useState, useEffect, useMemo, useRef } from 'react';
import { GradeLevel, StudentAccount, StudentResult, Course, GradingCriterion } from '../types';
import { DEFAULT_GRADING_CRITERIA } from '../constants';
import { formatSubjectName } from '../utils/resultFeeService';
import { getStaffAssignedCourses, normalizeCourseName } from '../utils/courseUtils';
import { formatOrdinal } from '../utils/ranking';

interface StaffBatchMarksheetProps {
  teacherUsername: string;
  assignedGrades: GradeLevel[];
  assignedSubjects?: string[];
  allStudents: StudentAccount[];
  courses: Course[];
  results: StudentResult[];
  activeTerm?: string;
  gradingCriteria?: GradingCriterion[];
  onBatchSaveResults?: (results: StudentResult[]) => void;
  onAddResult: (result: Omit<StudentResult, 'id' | 'date' | 'teacherName'>) => void;
}

interface PupilDraftRow {
  caScore: string;    // CA test strictly out of 40 (0-40)
  examScore: string;  // Exam strictly out of 60 (0-60)
  remark: string;
}

interface SavedSessionState {
  grade: GradeLevel;
  subject: string;
  customSubject: string;
  term: string;
  mode: 'test_only' | 'full_sheet';
  page: number;
  pageSize: number;
  lastPupilNumber: number;
  scores: { [key: string]: PupilDraftRow };
  updatedAt: string;
}

export const StaffBatchMarksheet: React.FC<StaffBatchMarksheetProps> = ({
  teacherUsername,
  assignedGrades = [],
  assignedSubjects = [],
  allStudents = [],
  courses = [],
  results = [],
  activeTerm = 'First Term',
  gradingCriteria = DEFAULT_GRADING_CRITERIA,
  onBatchSaveResults,
  onAddResult
}) => {
  const storageKey = `ghs_teacher_marksheet_progress_${teacherUsername.trim().toLowerCase()}`;

  // Default initial class selection
  const defaultGrade: GradeLevel = assignedGrades[0] || 'Primary 1';

  // Courses strictly assigned to this staff member's class(es)
  const staffClassCourses = useMemo(() => {
    return getStaffAssignedCourses(courses, {
      assignedGrades,
      assignedSubjects
    });
  }, [courses, assignedGrades, assignedSubjects]);

  const defaultSubject: string =
    (assignedSubjects && assignedSubjects[0] ? normalizeCourseName(assignedSubjects[0]) : '') ||
    staffClassCourses[0]?.name ||
    'Mathematics';

  // State
  const [selectedGrade, setSelectedGrade] = useState<GradeLevel>(defaultGrade);
  const [selectedSubject, setSelectedSubject] = useState<string>(defaultSubject);
  const [customSubject, setCustomSubject] = useState<string>('');
  const [selectedTerm, setSelectedTerm] = useState<string>(activeTerm);
  const [sheetMode, setSheetMode] = useState<'test_only' | 'full_sheet'>('full_sheet');

  // Sheet pagination (default 500 = direct full-class spreadsheet view; user can switch to 5/10/20 on mobile)
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(500);
  const [lastActivePupilIndex, setLastActivePupilIndex] = useState<number>(0);

  // Draft Scores keyed by `${grade}::${subjectLower}::${term}::${studentId}`
  const [draftScores, setDraftScores] = useState<{ [key: string]: PupilDraftRow }>({});

  // Mobile Session Resume indicator
  const [resumedMessage, setResumedMessage] = useState<string | null>(null);
  const [saveToast, setSaveToast] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);

  // Refs for spreadsheet keyboard navigation (Enter / ArrowUp / ArrowDown)
  const cellRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  // Quick remarks options
  const quickRemarks = ['Excellence', 'Very Good', 'Good Effort', 'Credit', 'Pass', 'Needs Improvement'];

  // Keep selectedGrade aligned with assignedGrades
  useEffect(() => {
    if (assignedGrades.length > 0 && !assignedGrades.includes(selectedGrade)) {
      setSelectedGrade(assignedGrades[0]);
    }
  }, [assignedGrades, selectedGrade]);

  // 1. Restore previous session from localStorage on mount
  useEffect(() => {
    try {
      const savedRaw = localStorage.getItem(storageKey);
      if (savedRaw) {
        const parsed: SavedSessionState = JSON.parse(savedRaw);
        if (parsed && parsed.scores && Object.keys(parsed.scores).length > 0) {
          if (assignedGrades.length === 0 || assignedGrades.includes(parsed.grade)) {
            setSelectedGrade(parsed.grade);
          }
          if (parsed.subject) setSelectedSubject(parsed.subject);
          if (parsed.customSubject) setCustomSubject(parsed.customSubject);
          if (parsed.term) setSelectedTerm(parsed.term);
          if (parsed.mode) setSheetMode(parsed.mode);
          if (parsed.pageSize) setPageSize(parsed.pageSize);
          if (parsed.page) setCurrentPage(parsed.page);
          if (parsed.lastPupilNumber !== undefined) setLastActivePupilIndex(parsed.lastPupilNumber);
          setDraftScores(parsed.scores);
          setHasUnsavedChanges(true);

          const timeStr = parsed.updatedAt ? new Date(parsed.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
          setResumedMessage(
            `Session Restored: Continued from Page ${parsed.page || 1} (Pupil #${(parsed.lastPupilNumber || 0) + 1}) • Last autosaved at ${timeStr}.`
          );
        }
      }
    } catch (e) {
      console.warn('Failed to restore teacher marksheet session', e);
    }
  }, [storageKey]);

  // Students in selected class
  const classStudents = useMemo(() => {
    return allStudents
      .filter(s => s.grade === selectedGrade)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [allStudents, selectedGrade]);

  // Deduplicated and class-filtered curriculum subjects strictly for selectedGrade
  const cleanClassCurriculumSubjects = useMemo(() => {
    const map = new Map<string, string>();

    const gradeSpecific = getStaffAssignedCourses(courses, {
      assignedGrades: [selectedGrade],
      assignedSubjects
    });
    gradeSpecific.forEach(c => {
      const clean = normalizeCourseName(c.name);
      if (clean) map.set(clean.toLowerCase(), clean);
    });

    if (map.size === 0) {
      courses
        .filter(c => c.grade === selectedGrade)
        .forEach(c => {
          const clean = normalizeCourseName(c.name);
          if (clean) map.set(clean.toLowerCase(), clean);
        });
    }

    (assignedSubjects || []).forEach(subj => {
      const clean = normalizeCourseName(subj);
      if (clean) map.set(clean.toLowerCase(), clean);
    });

    return Array.from(map.values()).sort((a, b) => a.localeCompare(b));
  }, [courses, selectedGrade, assignedSubjects]);

  const activeSubjectName = formatSubjectName(selectedSubject === '__custom__' ? customSubject.trim() : selectedSubject);

  const makeRowKey = (studentId: string) =>
    `${selectedGrade}::${activeSubjectName.toLowerCase()}::${selectedTerm}::${studentId}`;

  // Lookup existing database record for a pupil in current grade/subject/term
  const getExistingResult = (stu: StudentAccount): StudentResult | undefined => {
    if (!activeSubjectName) return undefined;
    return results.find(
      r =>
        (r.studentId === stu.id || r.studentName.trim().toLowerCase() === stu.name.trim().toLowerCase()) &&
        r.grade === selectedGrade &&
        normalizeCourseName(r.subject).toLowerCase() === normalizeCourseName(activeSubjectName).toLowerCase() &&
        r.term.toLowerCase() === selectedTerm.toLowerCase()
    );
  };

  // Resolve row value: unsaved draft first, else database record, else empty
  const getRowValues = (stu: StudentAccount): PupilDraftRow => {
    const key = makeRowKey(stu.id);
    if (draftScores[key]) {
      return draftScores[key];
    }
    const existing = getExistingResult(stu);
    if (existing) {
      const existingCa =
        existing.caScore !== undefined ? String(existing.caScore) : String(Math.round(existing.score * 0.4));
      const existingExam =
        existing.examScore !== undefined
          ? String(existing.examScore)
          : String(Math.max(0, existing.score - (parseFloat(existingCa) || 0)));
      return {
        caScore: existingCa,
        examScore: existingExam,
        remark: existing.teacherComment || existing.remark || ''
      };
    }
    return { caScore: '', examScore: '', remark: '' };
  };

  // Autosave to localStorage on change
  const saveSessionToStorage = (
    updatedScores: { [key: string]: PupilDraftRow },
    page: number,
    pupilIndex: number
  ) => {
    try {
      const payload: SavedSessionState = {
        grade: selectedGrade,
        subject: selectedSubject,
        customSubject,
        term: selectedTerm,
        mode: sheetMode,
        page,
        pageSize,
        lastPupilNumber: pupilIndex,
        scores: updatedScores,
        updatedAt: new Date().toISOString()
      };
      localStorage.setItem(storageKey, JSON.stringify(payload));
      setHasUnsavedChanges(true);
    } catch (e) {
      console.warn('Autosave marksheet error', e);
    }
  };

  // Update a single pupil's field
  const handleScoreChange = (
    stu: StudentAccount,
    field: 'caScore' | 'examScore' | 'remark',
    val: string,
    pupilGlobalIndex: number
  ) => {
    if (field === 'caScore' && val !== '') {
      const num = parseFloat(val);
      if (!isNaN(num) && num > 40) val = '40';
      else if (!isNaN(num) && num < 0) val = '0';
    }

    if (field === 'examScore' && val !== '') {
      const num = parseFloat(val);
      if (!isNaN(num) && num > 60) val = '60';
      else if (!isNaN(num) && num < 0) val = '0';
    }

    const key = makeRowKey(stu.id);
    const currentRow = getRowValues(stu);

    const updated = {
      ...draftScores,
      [key]: {
        ...currentRow,
        [field]: val
      }
    };

    setDraftScores(updated);
    setLastActivePupilIndex(pupilGlobalIndex);
    saveSessionToStorage(updated, currentPage, pupilGlobalIndex);
  };

  // Keyboard navigation between spreadsheet rows
  const handleCellKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    pageRowIdx: number,
    col: 'ca' | 'exam' | 'remark'
  ) => {
    if (e.key === 'Enter' || e.key === 'ArrowDown') {
      e.preventDefault();
      const nextRow = Math.min(displayedStudents.length - 1, pageRowIdx + 1);
      const target = cellRefs.current[`${col}-${nextRow}`];
      target?.focus();
      target?.select();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevRow = Math.max(0, pageRowIdx - 1);
      const target = cellRefs.current[`${col}-${prevRow}`];
      target?.focus();
      target?.select();
    }
  };

  // Grade info helper
  const getGradeInfo = (score: number) => {
    const criteria = gradingCriteria && gradingCriteria.length > 0 ? gradingCriteria : DEFAULT_GRADING_CRITERIA;
    const sorted = [...criteria].sort((a, b) => b.minScore - a.minScore);
    const found = sorted.find(c => score >= c.minScore);
    if (found) {
      return {
        letter: found.gradeLetter,
        remark:
          found.remark ||
          (found.minScore >= 75 ? 'Excellence' : found.minScore >= 60 ? 'Very Good' : found.minScore >= 50 ? 'Credit' : 'Pass')
      };
    }
    return { letter: 'F9', remark: 'Remedial' };
  };

  // Live Sheet Analytics & Rank Map
  const { sheetStats, studentRankMap } = useMemo(() => {
    const totals: { studentId: string; score: number }[] = [];

    classStudents.forEach(stu => {
      const row = getRowValues(stu);
      const hasCa = row.caScore !== '' && !isNaN(parseFloat(row.caScore));
      const hasExam = row.examScore !== '' && !isNaN(parseFloat(row.examScore));
      if (!hasCa && !hasExam) return;

      const caNum = hasCa ? Math.min(40, Math.max(0, parseFloat(row.caScore))) : 0;
      const examNum = hasExam ? Math.min(60, Math.max(0, parseFloat(row.examScore))) : 0;
      const total = sheetMode === 'test_only' ? caNum : Math.min(100, Math.round((caNum + examNum) * 10) / 10);
      totals.push({ studentId: stu.id, score: total });
    });

    const sorted = [...totals].sort((a, b) => b.score - a.score);
    const ranks = new Map<string, number>();
    sorted.forEach((item, idx) => {
      if (idx > 0 && item.score === sorted[idx - 1].score) {
        ranks.set(item.studentId, ranks.get(sorted[idx - 1].studentId) || idx + 1);
      } else {
        ranks.set(item.studentId, idx + 1);
      }
    });

    const sum = totals.reduce((acc, item) => acc + item.score, 0);
    const avg = totals.length > 0 ? Math.round((sum / totals.length) * 10) / 10 : 0;
    const highest = sorted.length > 0 ? sorted[0].score : 0;
    const lowest = sorted.length > 0 ? sorted[sorted.length - 1].score : 0;

    return {
      sheetStats: {
        gradedCount: totals.length,
        average: avg,
        highest,
        lowest
      },
      studentRankMap: ranks
    };
  }, [classStudents, draftScores, results, selectedGrade, activeSubjectName, selectedTerm, sheetMode]);

  // Pagination calculation
  const totalStudents = classStudents.length;
  const totalPages = Math.max(1, Math.ceil(totalStudents / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const displayedStudents = useMemo(() => {
    if (pageSize >= 100) return classStudents;
    const start = (safeCurrentPage - 1) * pageSize;
    return classStudents.slice(start, start + pageSize);
  }, [classStudents, safeCurrentPage, pageSize]);

  const handlePageChange = (newPage: number) => {
    const clamped = Math.max(1, Math.min(totalPages, newPage));
    setCurrentPage(clamped);
    saveSessionToStorage(draftScores, clamped, lastActivePupilIndex);
    const tableEl = document.getElementById('ghs-marksheet-table-container');
    if (tableEl) {
      tableEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  };

  // Clear draft
  const handleClearDraft = () => {
    if (window.confirm('Are you sure you want to discard your unsaved draft and reload saved records?')) {
      localStorage.removeItem(storageKey);
      setDraftScores({});
      setHasUnsavedChanges(false);
      setResumedMessage(null);
    }
  };

  // Export current sheet to CSV
  const handleExportCsv = () => {
    if (!activeSubjectName) return;
    const headers = ['S/N', 'Student ID', 'Student Name', 'CA Test (40)', 'Exam (60)', 'Total (100)', 'Grade', 'Position', 'Remark'];
    const rows = classStudents.map((stu, idx) => {
      const row = getRowValues(stu);
      const caNum = parseFloat(row.caScore) || 0;
      const examNum = parseFloat(row.examScore) || 0;
      const hasScore = row.caScore !== '' || row.examScore !== '';
      const total = Math.min(100, Math.round((caNum + examNum) * 10) / 10);
      const gradeInfo = getGradeInfo(total);
      const pos = studentRankMap.get(stu.id);
      return [
        String(idx + 1),
        stu.id,
        `"${stu.name.replace(/"/g, '""')}"`,
        row.caScore || '',
        row.examScore || '',
        hasScore ? String(total) : '',
        hasScore ? gradeInfo.letter : '',
        pos ? formatOrdinal(pos) : '',
        `"${(row.remark || (hasScore ? gradeInfo.remark : '')).replace(/"/g, '""')}"`
      ].join(',');
    });
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `GodsHand_${selectedGrade.replace(/\s+/g, '_')}_${activeSubjectName.replace(/\s+/g, '_')}_${selectedTerm.replace(/\s+/g, '_')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Save all marks from sheet to official records
  const handleSaveAllRecords = () => {
    if (!activeSubjectName) {
      alert('Please select or enter a subject name first.');
      return;
    }

    const recordsToSave: StudentResult[] = [];
    let savedCount = 0;

    classStudents.forEach(stu => {
      const row = getRowValues(stu);
      const hasCa = row.caScore !== '' && !isNaN(parseFloat(row.caScore));
      const hasExam = row.examScore !== '' && !isNaN(parseFloat(row.examScore));

      if (!hasCa && !hasExam) return;

      const existing = getExistingResult(stu);
      const caVal = hasCa ? Math.min(40, Math.max(0, parseFloat(row.caScore))) : 0;
      const examVal =
        sheetMode === 'test_only'
          ? existing?.examScore || 0
          : hasExam
          ? Math.min(60, Math.max(0, parseFloat(row.examScore)))
          : 0;

      const totalVal = Math.min(100, Math.round((caVal + examVal) * 10) / 10);
      const gradeInfo = getGradeInfo(totalVal);
      const remark = row.remark.trim() || gradeInfo.remark;

      const resultItem: StudentResult = {
        id: existing?.id || `RES-${stu.id}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        studentId: stu.id,
        studentName: stu.name,
        grade: selectedGrade,
        subject: activeSubjectName,
        score: totalVal,
        caScore: caVal,
        examScore: examVal,
        gradeLetter: gradeInfo.letter,
        remark: remark,
        teacherComment: remark,
        term: selectedTerm,
        published: existing?.published || false,
        teacherName: teacherUsername,
        date: new Date().toLocaleDateString()
      };

      recordsToSave.push(resultItem);
      savedCount++;
    });

    if (recordsToSave.length === 0) {
      alert('No marks entered to save. Please enter test or examination scores for at least one pupil on the sheet.');
      return;
    }

    if (onBatchSaveResults) {
      onBatchSaveResults(recordsToSave);
    } else {
      recordsToSave.forEach(r => onAddResult(r));
    }

    localStorage.removeItem(storageKey);
    setHasUnsavedChanges(false);

    setSaveToast(
      `✅ Successfully saved ${savedCount} pupil marks for ${selectedGrade} • ${activeSubjectName} (${selectedTerm}) to the school database!`
    );
    setTimeout(() => setSaveToast(null), 6000);
  };

  return (
    <div className="w-full max-w-full space-y-6">
      {/* Session Resume Alert Banner */}
      {resumedMessage && (
        <div className="p-4 bg-emerald-50 border-2 border-emerald-300 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-emerald-950 animate-in fade-in duration-300 shadow-sm">
          <div className="flex items-start sm:items-center gap-3 min-w-0">
            <span className="text-2xl shrink-0">📱</span>
            <div className="min-w-0">
              <p className="font-serif font-black text-xs sm:text-sm break-words">
                Auto-Save Active & Resumed
              </p>
              <p className="text-[11px] text-emerald-800 font-medium break-words">
                {resumedMessage}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 self-end sm:self-center shrink-0">
            <button
              type="button"
              onClick={handleClearDraft}
              className="min-h-[44px] px-3.5 py-2 bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all"
            >
              Discard Draft
            </button>
            <button
              type="button"
              onClick={() => setResumedMessage(null)}
              className="min-h-[44px] px-3.5 py-2 bg-emerald-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Save Toast */}
      {saveToast && (
        <div className="p-4 bg-blue-900 border-2 border-yellow-400 text-yellow-300 rounded-2xl font-black text-xs sm:text-sm flex items-start sm:items-center justify-between gap-3 shadow-xl animate-in fade-in duration-300">
          <div className="flex items-start sm:items-center gap-3 min-w-0">
            <span className="text-2xl shrink-0">💾</span>
            <span className="break-words">{saveToast}</span>
          </div>
          <button
            type="button"
            onClick={() => setSaveToast(null)}
            aria-label="Dismiss save notice"
            className="min-h-[44px] min-w-[44px] shrink-0 text-white hover:text-yellow-400 font-black text-sm flex items-center justify-center rounded-xl hover:bg-white/10"
          >
            ✕
          </button>
        </div>
      )}

      {/* Control Bar: Class, Subject, Term & Scope Selector */}
      <div className="bg-white rounded-3xl p-4 sm:p-7 border-2 border-slate-100 shadow-md space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="flex items-start sm:items-center gap-3 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-blue-900 text-yellow-400 flex items-center justify-center font-black text-2xl shadow-md shrink-0">
              📋
            </div>
            <div className="min-w-0">
              <h3 className="font-serif font-black text-lg sm:text-xl text-blue-950 break-words">
                Direct Subject Marksheet (Spreadsheet Format)
              </h3>
              <p className="text-xs text-slate-500 font-medium break-words">
                Enter CA (40), Exam (60) and remarks directly down the sheet. Use <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-300 rounded text-[10px] font-mono">Enter</kbd> or <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-300 rounded text-[10px] font-mono">↓</kbd> to step down rows.
              </p>
            </div>
          </div>

          {/* Scope Selector: Test Only vs Full Sheet */}
          <div className="bg-slate-100 p-1.5 rounded-2xl flex flex-wrap items-center gap-1.5 border border-slate-200">
            <button
              type="button"
              onClick={() => {
                setSheetMode('test_only');
                saveSessionToStorage(draftScores, currentPage, lastActivePupilIndex);
              }}
              className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                sheetMode === 'test_only'
                  ? 'bg-amber-500 text-white shadow-md'
                  : 'text-slate-600 hover:text-blue-950 hover:bg-white'
              }`}
            >
              <span>🧪</span>
              <span>CA Test Only (40)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setSheetMode('full_sheet');
                saveSessionToStorage(draftScores, currentPage, lastActivePupilIndex);
              }}
              className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                sheetMode === 'full_sheet'
                  ? 'bg-blue-900 text-yellow-400 shadow-md'
                  : 'text-slate-600 hover:text-blue-950 hover:bg-white'
              }`}
            >
              <span>📊</span>
              <span>Full Sheet (CA 40 + Exam 60)</span>
            </button>
          </div>
        </div>

        {/* Configuration Row: Class, Subject, Term */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Class Selector */}
          <div>
            <label className="block text-[11px] font-black uppercase tracking-wider text-slate-600 mb-1.5">
              Select Class / Grade *
            </label>
            <select
              value={selectedGrade}
              onChange={(e) => {
                const nextGrade = e.target.value as GradeLevel;
                setSelectedGrade(nextGrade);
                setCurrentPage(1);
                setLastActivePupilIndex(0);
              }}
              className="min-h-[44px] w-full px-4 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-2xl text-xs font-black text-blue-950 outline-none focus:bg-white focus:border-blue-900"
            >
              {assignedGrades.map(g => (
                <option key={g} value={g}>
                  {g} ({allStudents.filter(s => s.grade === g).length} pupils)
                </option>
              ))}
            </select>
          </div>

          {/* Subject Selector */}
          <div>
            <label className="text-[11px] font-black uppercase tracking-wider text-slate-600 mb-1.5 flex flex-wrap items-center justify-between gap-1">
              <span>Assigned Subject *</span>
              <span className="text-[10px] text-indigo-700 font-bold">
                {cleanClassCurriculumSubjects.length} Available
              </span>
            </label>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="min-h-[44px] w-full px-4 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-2xl text-xs font-black text-blue-950 outline-none focus:bg-white focus:border-blue-900"
            >
              {cleanClassCurriculumSubjects.map(subj => (
                <option key={subj} value={subj}>
                  {subj}
                </option>
              ))}
              <option value="__custom__">➕ Type Custom Subject...</option>
            </select>
            {selectedSubject === '__custom__' && (
              <input
                type="text"
                value={customSubject}
                onChange={(e) => setCustomSubject(e.target.value)}
                placeholder="Enter subject name..."
                className="min-h-[44px] w-full mt-2 px-3 py-2 bg-yellow-50 border-2 border-yellow-400 rounded-xl text-xs font-black text-blue-950 outline-none"
              />
            )}
          </div>

          {/* Academic Term */}
          <div>
            <label className="block text-[11px] font-black uppercase tracking-wider text-slate-600 mb-1.5">
              Academic Term *
            </label>
            <select
              value={selectedTerm}
              onChange={(e) => setSelectedTerm(e.target.value)}
              className="min-h-[44px] w-full px-4 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-2xl text-xs font-black text-blue-950 outline-none focus:bg-white focus:border-blue-900"
            >
              <option value="First Term">First Term</option>
              <option value="Second Term">Second Term</option>
              <option value="Third Term">Third Term</option>
            </select>
          </div>
        </div>

        {/* Live Analytics Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
          <div className="p-3 bg-blue-50/70 rounded-2xl border border-blue-100 text-center">
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Pupils Graded</p>
            <p className="text-lg font-black text-blue-950 tabular-nums">
              {sheetStats.gradedCount} <span className="text-xs text-slate-400 font-bold">/ {classStudents.length}</span>
            </p>
          </div>
          <div className="p-3 bg-emerald-50/70 rounded-2xl border border-emerald-100 text-center">
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Class Average</p>
            <p className="text-lg font-black text-emerald-800 tabular-nums">{sheetStats.average}%</p>
          </div>
          <div className="p-3 bg-amber-50/70 rounded-2xl border border-amber-100 text-center">
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Highest Score</p>
            <p className="text-lg font-black text-amber-800 tabular-nums">{sheetStats.highest}%</p>
          </div>
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-center flex flex-col justify-center">
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Sync Status</p>
            <p className="text-xs font-black text-blue-950 flex items-center justify-center gap-1.5 mt-0.5">
              <span className={`w-2 h-2 rounded-full ${hasUnsavedChanges ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`}></span>
              {hasUnsavedChanges ? 'Unsaved Edits' : 'Synced'}
            </p>
          </div>
        </div>
      </div>

      {/* Pagination & Export Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="font-black text-slate-500 uppercase tracking-wider text-[11px]">Sheet Rows:</span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="min-h-[44px] px-3 py-2 bg-slate-100 border border-slate-300 rounded-xl text-xs font-black text-blue-950 outline-none"
          >
            <option value={500}>All Pupils on Sheet ({classStudents.length})</option>
            <option value={10}>10 per page</option>
            <option value={5}>5 per page (Compact Phone)</option>
            <option value={20}>20 per page</option>
          </select>
          <span className="text-slate-500 font-bold">
            Showing {totalStudents === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1} -{' '}
            {Math.min(safeCurrentPage * pageSize, totalStudents)} of {totalStudents}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleExportCsv}
            className="min-h-[44px] px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 rounded-xl font-black text-[11px] uppercase tracking-wider transition-all"
          >
            📥 Export CSV
          </button>

          {totalPages > 1 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                disabled={safeCurrentPage <= 1}
                onClick={() => handlePageChange(safeCurrentPage - 1)}
                className="min-h-[44px] px-3.5 py-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-30 rounded-xl font-black text-xs text-blue-950 transition-all cursor-pointer"
              >
                ← Prev
              </button>
              <span className="min-h-[44px] px-3.5 py-2 inline-flex items-center bg-blue-900 text-yellow-400 font-mono font-black text-xs rounded-xl">
                {safeCurrentPage} / {totalPages}
              </span>
              <button
                type="button"
                disabled={safeCurrentPage >= totalPages}
                onClick={() => handlePageChange(safeCurrentPage + 1)}
                className="min-h-[44px] px-3.5 py-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-30 rounded-xl font-black text-xs text-blue-950 transition-all cursor-pointer"
              >
                Next →
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Sheet Table */}
      <div id="ghs-marksheet-table-container" className="bg-white rounded-3xl border-2 border-slate-200 shadow-md">
        {classStudents.length === 0 ? (
          <div className="p-8 sm:p-16 text-center text-slate-400 space-y-2">
            <span className="text-4xl block">🧑‍🎓</span>
            <p className="font-serif font-black text-blue-900 text-base break-words">No pupils enrolled in {selectedGrade} yet</p>
            <p className="text-xs break-words">Once pupils are added to this class, their marksheet rows will display here automatically.</p>
          </div>
        ) : (
          <div className="overflow-x-auto w-full rounded-t-3xl">
            <table className="w-full text-left border-collapse min-w-[780px]">
              <thead>
                <tr className="bg-blue-950 text-yellow-300 border-b-2 border-yellow-400 text-[10px] font-black uppercase tracking-wider">
                  <th className="md:sticky md:left-0 z-20 bg-blue-950 py-3.5 px-3 w-12 text-center border-r border-blue-800">#</th>
                  <th className="md:sticky md:left-12 z-20 bg-blue-950 py-3.5 px-4 min-w-[200px] border-r-2 border-yellow-400/50 md:shadow-[2px_0_8px_rgba(0,0,0,0.18)]">
                    Pupil Name & ID
                  </th>
                  <th className="py-3.5 px-3 w-32 text-center border-r border-blue-800">
                    <span className="block text-yellow-300 font-black">CA Test (0–40)</span>
                    <span className="text-[9px] text-blue-200 font-normal lowercase">max 40 marks</span>
                  </th>
                  {sheetMode === 'full_sheet' && (
                    <th className="py-3.5 px-3 w-32 text-center border-r border-blue-800">
                      <span className="block text-white font-black">Exam (0–60)</span>
                      <span className="text-[9px] text-blue-200 font-normal lowercase">max 60 marks</span>
                    </th>
                  )}
                  {sheetMode === 'full_sheet' && (
                    <th className="py-3.5 px-3 w-24 text-center border-r border-blue-800">Total (/100)</th>
                  )}
                  {sheetMode === 'full_sheet' && (
                    <th className="py-3.5 px-3 w-20 text-center border-r border-blue-800">Grade</th>
                  )}
                  <th className="py-3.5 px-3 w-20 text-center border-r border-blue-800">Pos</th>
                  <th className="py-3.5 px-4 min-w-[200px]">Teacher Remark / Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs">
                {displayedStudents.map((stu, pageIndex) => {
                  const globalIndex = (safeCurrentPage - 1) * pageSize + pageIndex;
                  const row = getRowValues(stu);

                  const caNum = parseFloat(row.caScore) || 0;
                  const examNum = parseFloat(row.examScore) || 0;
                  const totalNum = Math.min(100, Math.round((caNum + examNum) * 10) / 10);
                  const gradeInfo = getGradeInfo(totalNum);
                  const pos = studentRankMap.get(stu.id);
                  const rowBg = pageIndex % 2 === 0 ? 'bg-white' : 'bg-slate-50/70';

                  return (
                    <tr key={stu.id} className={`${rowBg} hover:bg-blue-50/40 transition-colors`}>
                      {/* Pupil Number */}
                      <td className={`md:sticky md:left-0 z-10 ${rowBg} py-3 px-2 text-center font-mono font-black text-slate-400 border-r border-slate-200`}>
                        #{globalIndex + 1}
                      </td>

                      {/* Pupil Info */}
                      <td className={`md:sticky md:left-12 z-10 ${rowBg} py-3 px-3 border-r-2 border-slate-300 md:shadow-[2px_0_6px_rgba(0,0,0,0.05)]`}>
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-blue-900 text-yellow-300 font-black flex items-center justify-center shrink-0 uppercase text-xs overflow-hidden">
                            {stu.photo ? (
                              <img src={stu.photo} alt={stu.name} className="w-full h-full object-cover" />
                            ) : (
                              stu.name.charAt(0)
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-serif font-black text-blue-950 text-xs leading-snug break-words whitespace-normal" title={stu.name}>
                              {stu.name}
                            </p>
                            <p className="text-[10px] font-mono text-slate-400 font-bold break-all">
                              {stu.id}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* CA Test Score Input (Strictly 0 to 40) */}
                      <td className="py-2.5 px-3 text-center border-r border-slate-200">
                        <input
                          ref={el => {
                            cellRefs.current[`ca-${pageIndex}`] = el;
                          }}
                          type="number"
                          min="0"
                          max="40"
                          step="any"
                          value={row.caScore}
                          onKeyDown={(e) => handleCellKeyDown(e, pageIndex, 'ca')}
                          onChange={(e) => handleScoreChange(stu, 'caScore', e.target.value, globalIndex)}
                          placeholder="0-40"
                          className="min-h-[44px] w-20 px-2.5 py-2 bg-amber-50/70 border-2 border-amber-300 rounded-xl font-mono font-black text-center text-amber-950 outline-none focus:bg-white focus:border-amber-600 transition-all text-sm mx-auto block tabular-nums"
                        />
                      </td>

                      {/* Exam Score Input (Strictly 0 to 60) - Full Sheet mode */}
                      {sheetMode === 'full_sheet' && (
                        <td className="py-2.5 px-3 text-center border-r border-slate-200">
                          <input
                            ref={el => {
                              cellRefs.current[`exam-${pageIndex}`] = el;
                            }}
                            type="number"
                            min="0"
                            max="60"
                            step="any"
                            value={row.examScore}
                            onKeyDown={(e) => handleCellKeyDown(e, pageIndex, 'exam')}
                            onChange={(e) => handleScoreChange(stu, 'examScore', e.target.value, globalIndex)}
                            placeholder="0-60"
                            className="min-h-[44px] w-20 px-2.5 py-2 bg-indigo-50/70 border-2 border-indigo-300 rounded-xl font-mono font-black text-center text-indigo-950 outline-none focus:bg-white focus:border-indigo-600 transition-all text-sm mx-auto block tabular-nums"
                          />
                        </td>
                      )}

                      {/* Total Score - Full Sheet mode */}
                      {sheetMode === 'full_sheet' && (
                        <td className="py-2.5 px-3 text-center border-r border-slate-200">
                          <span
                            className={`font-mono font-black text-sm px-2.5 py-1 rounded-xl inline-block tabular-nums ${
                              totalNum >= 75
                                ? 'bg-emerald-100 text-emerald-800'
                                : totalNum >= 60
                                ? 'bg-blue-100 text-blue-800'
                                : totalNum >= 50
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {row.caScore !== '' || row.examScore !== '' ? `${totalNum}%` : '—'}
                          </span>
                        </td>
                      )}

                      {/* Letter Grade */}
                      {sheetMode === 'full_sheet' && (
                        <td className="py-2.5 px-3 text-center border-r border-slate-200">
                          <span
                            className={`font-black text-xs px-2 py-0.5 rounded-lg ${
                              gradeInfo.letter.startsWith('A')
                                ? 'bg-emerald-600 text-white'
                                : gradeInfo.letter.startsWith('B')
                                ? 'bg-blue-600 text-white'
                                : 'bg-slate-200 text-slate-800'
                            }`}
                          >
                            {row.caScore !== '' || row.examScore !== '' ? gradeInfo.letter : '—'}
                          </span>
                        </td>
                      )}

                      {/* Position */}
                      <td className="py-2.5 px-3 text-center font-black text-xs text-blue-900 border-r border-slate-200">
                        {pos ? formatOrdinal(pos) : '—'}
                      </td>

                      {/* Teacher Remark */}
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1.5">
                          <input
                            ref={el => {
                              cellRefs.current[`remark-${pageIndex}`] = el;
                            }}
                            type="text"
                            value={row.remark}
                            onKeyDown={(e) => handleCellKeyDown(e, pageIndex, 'remark')}
                            onChange={(e) => handleScoreChange(stu, 'remark', e.target.value, globalIndex)}
                            placeholder="e.g. Excellent progress..."
                            className="min-h-[44px] w-full min-w-[140px] px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:bg-white focus:border-blue-900"
                          />
                          <select
                            value=""
                            onChange={(e) => {
                              if (e.target.value) {
                                handleScoreChange(stu, 'remark', e.target.value, globalIndex);
                              }
                            }}
                            className="min-h-[44px] min-w-[44px] px-2.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 rounded-xl text-[10px] font-black uppercase outline-none cursor-pointer"
                            title="Quick remarks"
                          >
                            <option value="">▼</option>
                            {quickRemarks.map(qr => (
                              <option key={qr} value={qr}>
                                {qr}
                              </option>
                            ))}
                          </select>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer Bar with Action Buttons */}
        <div className="p-4 sm:p-6 bg-slate-50 border-t-2 border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="text-xs text-slate-500 font-medium break-words">
            <span className="font-black text-blue-950 uppercase">{classStudents.length} Total Pupils</span> in {selectedGrade} •{' '}
            {activeSubjectName} ({selectedTerm})
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleClearDraft}
              className="min-h-[44px] px-4 py-2.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-2xl font-black text-xs uppercase tracking-wider transition-all"
            >
              Reset Draft
            </button>

            <button
              type="button"
              onClick={handleSaveAllRecords}
              className="min-h-[48px] flex-1 sm:flex-none px-6 sm:px-8 py-3 bg-yellow-400 hover:bg-yellow-300 text-blue-950 rounded-2xl font-black text-xs sm:text-sm uppercase tracking-wider shadow-lg transition-all transform active:scale-95 flex items-center justify-center gap-2 border-2 border-yellow-500"
            >
              <span>💾</span>
              <span>Save & Sync Subject Sheet</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
