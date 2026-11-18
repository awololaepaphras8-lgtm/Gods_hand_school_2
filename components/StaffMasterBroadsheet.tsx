import React, { useState, useEffect, useMemo, useRef } from 'react';
import { GradeLevel, StudentAccount, StudentResult, Course, GradingCriterion } from '../types';
import { DEFAULT_GRADING_CRITERIA } from '../constants';
import { formatSubjectName } from '../utils/resultFeeService';
import { normalizeCourseName, getStaffAssignedCourses } from '../utils/courseUtils';
import { formatOrdinal } from '../utils/ranking';

interface StaffMasterBroadsheetProps {
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

type BroadsheetEntryMode = 'split_ca_exam' | 'ca_only' | 'exam_only' | 'total_100';

interface CellDraft {
  ca: string;
  exam: string;
  total: string;
}

export const StaffMasterBroadsheet: React.FC<StaffMasterBroadsheetProps> = ({
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
  const storageKey = `ghs_staff_broadsheet_draft_${teacherUsername.trim().toLowerCase()}`;

  const [selectedGrade, setSelectedGrade] = useState<GradeLevel>(assignedGrades[0] || 'Primary 1');
  const [selectedTerm, setSelectedTerm] = useState<string>(activeTerm);
  const [entryMode, setEntryMode] = useState<BroadsheetEntryMode>('split_ca_exam');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [extraSubjectInput, setExtraSubjectInput] = useState<string>('');
  const [customSubjectsList, setCustomSubjectsList] = useState<string[]>([]);

  // Draft map: `${studentId}::${subjectKey}` -> CellDraft
  const [draftCells, setDraftCells] = useState<{ [key: string]: CellDraft }>({});
  const [hasUnsavedDraft, setHasUnsavedDraft] = useState<boolean>(false);
  const [saveToast, setSaveToast] = useState<string | null>(null);
  const [focusedCellKey, setFocusedCellKey] = useState<string | null>(null);

  const cellRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  // Keep selectedGrade aligned with assignedGrades
  useEffect(() => {
    if (assignedGrades.length > 0 && !assignedGrades.includes(selectedGrade)) {
      setSelectedGrade(assignedGrades[0]);
    }
  }, [assignedGrades, selectedGrade]);

  // Restore saved draft from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.draftCells && Object.keys(parsed.draftCells).length > 0) {
          if (parsed.selectedGrade && (assignedGrades.length === 0 || assignedGrades.includes(parsed.selectedGrade))) {
            setSelectedGrade(parsed.selectedGrade);
          }
          if (parsed.selectedTerm) setSelectedTerm(parsed.selectedTerm);
          if (parsed.entryMode) setEntryMode(parsed.entryMode);
          if (Array.isArray(parsed.customSubjectsList)) setCustomSubjectsList(parsed.customSubjectsList);
          setDraftCells(parsed.draftCells);
          setHasUnsavedDraft(true);
        }
      }
    } catch (e) {
      console.warn('Could not restore broadsheet draft:', e);
    }
  }, [storageKey]);

  // Class students sorted alphabetically
  const classStudents = useMemo(() => {
    return allStudents
      .filter(s => s.grade === selectedGrade)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [allStudents, selectedGrade]);

  const filteredStudents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return classStudents;
    return classStudents.filter(
      s => s.name.toLowerCase().includes(q) || s.id.toLowerCase().includes(q)
    );
  }, [classStudents, searchQuery]);

  // Deduplicated subjects strictly for this staff + selectedGrade
  const sheetSubjects = useMemo(() => {
    const map = new Map<string, string>();

    // 1. Assigned subjects explicitly configured on staff account
    (assignedSubjects || []).forEach(subj => {
      const clean = normalizeCourseName(subj);
      if (clean) map.set(clean.toLowerCase(), clean);
    });

    // 2. Class curriculum courses filtered strictly for selectedGrade (or staff assigned courses)
    const staffClassCourses = getStaffAssignedCourses(courses, {
      assignedGrades: [selectedGrade],
      assignedSubjects
    });
    staffClassCourses.forEach(c => {
      const clean = normalizeCourseName(c.name);
      if (clean) map.set(clean.toLowerCase(), clean);
    });

    // Fallback: Also include courses registered directly for selectedGrade if teacher is a class teacher with no courses filtered yet
    if (map.size === 0) {
      courses
        .filter(c => c.grade === selectedGrade)
        .forEach(c => {
          const clean = normalizeCourseName(c.name);
          if (clean) map.set(clean.toLowerCase(), clean);
        });
    }

    // 3. Any existing saved result subjects for this class + term so saved marks never hide
    results
      .filter(r => r.grade === selectedGrade && r.term.toLowerCase() === selectedTerm.toLowerCase())
      .forEach(r => {
        const clean = normalizeCourseName(r.subject);
        if (clean) map.set(clean.toLowerCase(), clean);
      });

    // 4. Extra custom columns added by teacher during this session
    customSubjectsList.forEach(subj => {
      const clean = normalizeCourseName(subj);
      if (clean) map.set(clean.toLowerCase(), clean);
    });

    return Array.from(map.values()).sort((a, b) => a.localeCompare(b));
  }, [courses, assignedSubjects, selectedGrade, selectedTerm, results, customSubjectsList]);

  // Helper for grading criteria
  const getGradeInfo = (score: number) => {
    const criteria = gradingCriteria && gradingCriteria.length > 0 ? gradingCriteria : DEFAULT_GRADING_CRITERIA;
    const sorted = [...criteria].sort((a, b) => b.minScore - a.minScore);
    const found = sorted.find(c => score >= c.minScore);
    if (found) {
      return {
        letter: found.gradeLetter,
        remark: found.remark || (found.minScore >= 75 ? 'Excellence' : found.minScore >= 60 ? 'Very Good' : found.minScore >= 50 ? 'Credit' : 'Pass')
      };
    }
    return { letter: 'F9', remark: 'Remedial' };
  };

  // Lookup existing saved score from database for (student, subject, term)
  const getExistingResult = (stu: StudentAccount, subjectName: string): StudentResult | undefined => {
    const targetSubj = normalizeCourseName(subjectName).toLowerCase();
    return results.find(
      r =>
        (r.studentId === stu.id || r.studentName.trim().toLowerCase() === stu.name.trim().toLowerCase()) &&
        r.grade === selectedGrade &&
        normalizeCourseName(r.subject).toLowerCase() === targetSubj &&
        r.term.toLowerCase() === selectedTerm.toLowerCase()
    );
  };

  const makeKey = (studentId: string, subjectName: string) =>
    `${studentId}::${normalizeCourseName(subjectName).toLowerCase()}`;

  const getCellDisplayValues = (stu: StudentAccount, subjectName: string): CellDraft => {
    const key = makeKey(stu.id, subjectName);
    if (draftCells[key]) {
      return draftCells[key];
    }
    const existing = getExistingResult(stu, subjectName);
    if (existing) {
      const caVal = existing.caScore !== undefined ? existing.caScore : Math.round(existing.score * 0.4);
      const examVal = existing.examScore !== undefined ? existing.examScore : Math.max(0, existing.score - caVal);
      return {
        ca: String(caVal),
        exam: String(examVal),
        total: String(existing.score)
      };
    }
    return { ca: '', exam: '', total: '' };
  };

  const computeCellTotal = (cell: CellDraft): number | null => {
    if (entryMode === 'ca_only') {
      const val = parseFloat(cell.ca);
      return isNaN(val) ? null : Math.min(40, Math.max(0, Math.round(val * 10) / 10));
    }
    if (entryMode === 'exam_only') {
      const val = parseFloat(cell.exam);
      return isNaN(val) ? null : Math.min(60, Math.max(0, Math.round(val * 10) / 10));
    }
    if (entryMode === 'total_100') {
      const val = parseFloat(cell.total);
      return isNaN(val) ? null : Math.min(100, Math.max(0, Math.round(val * 10) / 10));
    }
    // split_ca_exam
    const hasCa = cell.ca !== '' && !isNaN(parseFloat(cell.ca));
    const hasExam = cell.exam !== '' && !isNaN(parseFloat(cell.exam));
    if (!hasCa && !hasExam) return null;
    const caNum = hasCa ? Math.min(40, Math.max(0, parseFloat(cell.ca))) : 0;
    const examNum = hasExam ? Math.min(60, Math.max(0, parseFloat(cell.exam))) : 0;
    return Math.min(100, Math.round((caNum + examNum) * 10) / 10);
  };

  const persistDraft = (nextDrafts: { [key: string]: CellDraft }, nextCustomSubjects = customSubjectsList) => {
    try {
      localStorage.setItem(
        storageKey,
        JSON.stringify({
          selectedGrade,
          selectedTerm,
          entryMode,
          customSubjectsList: nextCustomSubjects,
          draftCells: nextDrafts,
          updatedAt: new Date().toISOString()
        })
      );
      setHasUnsavedDraft(true);
    } catch (e) {
      console.warn('Broadsheet draft autosave failed:', e);
    }
  };

  const handleCellInput = (
    stu: StudentAccount,
    subjectName: string,
    field: 'ca' | 'exam' | 'total',
    rawVal: string
  ) => {
    let sanitized = rawVal;
    if (sanitized !== '') {
      const num = parseFloat(sanitized);
      if (!isNaN(num)) {
        if (field === 'ca') {
          if (num > 40) sanitized = '40';
          else if (num < 0) sanitized = '0';
        } else if (field === 'exam') {
          if (num > 60) sanitized = '60';
          else if (num < 0) sanitized = '0';
        } else {
          if (num > 100) sanitized = '100';
          else if (num < 0) sanitized = '0';
        }
      }
    }

    const key = makeKey(stu.id, subjectName);
    const current = getCellDisplayValues(stu, subjectName);

    let nextCell: CellDraft = { ...current, [field]: sanitized };

    if (field === 'total') {
      const t = parseFloat(sanitized);
      if (!isNaN(t)) {
        const clamped = Math.min(100, Math.max(0, t));
        const autoCa = Math.min(40, Math.round(clamped * 0.4 * 10) / 10);
        const autoExam = Math.round((clamped - autoCa) * 10) / 10;
        nextCell = {
          ca: String(autoCa),
          exam: String(autoExam),
          total: sanitized
        };
      } else {
        nextCell = { ca: '', exam: '', total: '' };
      }
    } else {
      const cVal = nextCell.ca !== '' && !isNaN(parseFloat(nextCell.ca)) ? parseFloat(nextCell.ca) : 0;
      const eVal = nextCell.exam !== '' && !isNaN(parseFloat(nextCell.exam)) ? parseFloat(nextCell.exam) : 0;
      const hasAny = nextCell.ca !== '' || nextCell.exam !== '';
      nextCell.total = hasAny ? String(Math.min(100, Math.round((cVal + eVal) * 10) / 10)) : '';
    }

    const nextDrafts = {
      ...draftCells,
      [key]: nextCell
    };

    setDraftCells(nextDrafts);
    persistDraft(nextDrafts);
  };

  // Excel-like Keyboard Navigation (Enter / ArrowUp / ArrowDown)
  const handleCellKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    rowIdx: number,
    colIdx: number,
    subField: 'ca' | 'exam' | 'total'
  ) => {
    if (e.key === 'Enter' || e.key === 'ArrowDown') {
      e.preventDefault();
      const nextRow = Math.min(filteredStudents.length - 1, rowIdx + 1);
      const refId = `cell-${nextRow}-${colIdx}-${subField}`;
      cellRefs.current[refId]?.focus();
      cellRefs.current[refId]?.select();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevRow = Math.max(0, rowIdx - 1);
      const refId = `cell-${prevRow}-${colIdx}-${subField}`;
      cellRefs.current[refId]?.focus();
      cellRefs.current[refId]?.select();
    }
  };

  // Compute live summaries & class ranking per pupil across all visible subjects
  const pupilSummaries = useMemo(() => {
    const rawSummaries = classStudents.map(stu => {
      let totalPoints = 0;
      let subjectsGraded = 0;

      sheetSubjects.forEach(subj => {
        const cell = getCellDisplayValues(stu, subj);
        const val = computeCellTotal(cell);
        if (val !== null) {
          totalPoints += val;
          subjectsGraded++;
        }
      });

      const average = subjectsGraded > 0 ? Math.round((totalPoints / subjectsGraded) * 10) / 10 : 0;
      return {
        studentId: stu.id,
        totalPoints: Math.round(totalPoints * 10) / 10,
        subjectsGraded,
        average
      };
    });

    // Rank by average descending
    const sortedForRank = [...rawSummaries]
      .filter(r => r.subjectsGraded > 0)
      .sort((a, b) => b.average - a.average || b.totalPoints - a.totalPoints);

    const rankMap = new Map<string, number>();
    sortedForRank.forEach((item, index) => {
      if (index > 0 && item.average === sortedForRank[index - 1].average) {
        rankMap.set(item.studentId, rankMap.get(sortedForRank[index - 1].studentId) || index + 1);
      } else {
        rankMap.set(item.studentId, index + 1);
      }
    });

    const summaryMap = new Map<
      string,
      { totalPoints: number; subjectsGraded: number; average: number; rank: number | null }
    >();
    rawSummaries.forEach(r => {
      summaryMap.set(r.studentId, {
        ...r,
        rank: rankMap.get(r.studentId) || null
      });
    });

    return summaryMap;
  }, [classStudents, sheetSubjects, draftCells, results, selectedGrade, selectedTerm, entryMode]);

  const handleAddExtraSubject = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = normalizeCourseName(extraSubjectInput);
    if (!clean) return;
    if (!sheetSubjects.some(s => s.toLowerCase() === clean.toLowerCase())) {
      const updated = [...customSubjectsList, clean];
      setCustomSubjectsList(updated);
      persistDraft(draftCells, updated);
    }
    setExtraSubjectInput('');
  };

  const handleSaveEntireBroadsheet = () => {
    if (classStudents.length === 0 || sheetSubjects.length === 0) {
      alert('Please ensure there are pupils and at least one subject column on the broadsheet.');
      return;
    }

    const recordsToSave: StudentResult[] = [];

    classStudents.forEach(stu => {
      sheetSubjects.forEach(subj => {
        const key = makeKey(stu.id, subj);
        const draft = draftCells[key];
        const existing = getExistingResult(stu, subj);

        // Save if modified in draft OR if we want to ensure current value is persisted
        if (!draft) return;

        const hasCa = draft.ca !== '' && !isNaN(parseFloat(draft.ca));
        const hasExam = draft.exam !== '' && !isNaN(parseFloat(draft.exam));
        const hasTotal = draft.total !== '' && !isNaN(parseFloat(draft.total));

        if (!hasCa && !hasExam && !hasTotal) return;

        let caVal = hasCa ? Math.min(40, Math.max(0, parseFloat(draft.ca))) : 0;
        let examVal = hasExam ? Math.min(60, Math.max(0, parseFloat(draft.exam))) : 0;
        let finalScore = 0;

        if (entryMode === 'ca_only') {
          examVal = existing?.examScore || 0;
          finalScore = Math.min(100, caVal + examVal);
        } else if (entryMode === 'exam_only') {
          caVal = existing?.caScore || 0;
          finalScore = Math.min(100, caVal + examVal);
        } else if (entryMode === 'total_100') {
          finalScore = hasTotal ? Math.min(100, Math.max(0, parseFloat(draft.total))) : Math.min(100, caVal + examVal);
        } else {
          finalScore = Math.min(100, Math.round((caVal + examVal) * 10) / 10);
        }

        const gradeInfo = getGradeInfo(finalScore);

        recordsToSave.push({
          id: existing?.id || `RES-${stu.id}-${subj.replace(/\s+/g, '')}-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
          studentId: stu.id,
          studentName: stu.name,
          grade: selectedGrade,
          subject: formatSubjectName(subj),
          score: finalScore,
          caScore: caVal,
          examScore: examVal,
          gradeLetter: gradeInfo.letter,
          remark: gradeInfo.remark,
          teacherComment: existing?.teacherComment || gradeInfo.remark,
          term: selectedTerm,
          published: existing?.published || false,
          teacherName: teacherUsername,
          date: new Date().toLocaleDateString()
        });
      });
    });

    if (recordsToSave.length === 0) {
      alert('No new scores entered yet. Click any cell in the sheet and type a score to update.');
      return;
    }

    if (onBatchSaveResults) {
      onBatchSaveResults(recordsToSave);
    } else {
      recordsToSave.forEach(r => onAddResult(r));
    }

    localStorage.removeItem(storageKey);
    setHasUnsavedDraft(false);
    setSaveToast(`✅ Saved ${recordsToSave.length} subject grades across ${selectedGrade} (${selectedTerm}) directly from the sheet!`);
    setTimeout(() => setSaveToast(null), 6000);
  };

  const handleExportBroadsheetCsv = () => {
    const headers = ['S/N', 'Student ID', 'Student Name', ...sheetSubjects, 'Total Score', 'Average (%)', 'Position'];
    const rows = classStudents.map((stu, idx) => {
      const summary = pupilSummaries.get(stu.id);
      const subjScores = sheetSubjects.map(subj => {
        const cell = getCellDisplayValues(stu, subj);
        const val = computeCellTotal(cell);
        return val !== null ? String(val) : '';
      });
      return [
        String(idx + 1),
        stu.id,
        `"${stu.name.replace(/"/g, '""')}"`,
        ...subjScores,
        summary ? String(summary.totalPoints) : '0',
        summary ? String(summary.average) : '0',
        summary?.rank ? formatOrdinal(summary.rank) : '-'
      ].join(',');
    });

    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `GodsHand_${selectedGrade.replace(/\s+/g, '_')}_${selectedTerm.replace(/\s+/g, '_')}_Broadsheet.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDiscardDraft = () => {
    if (window.confirm('Discard all unsaved sheet edits and revert to database scores?')) {
      localStorage.removeItem(storageKey);
      setDraftCells({});
      setHasUnsavedDraft(false);
    }
  };

  return (
    <div className="w-full max-w-full space-y-5">
      {/* Save Banner Toast */}
      {saveToast && (
        <div className="p-4 bg-blue-900 border-2 border-yellow-400 text-yellow-300 rounded-2xl font-black text-xs sm:text-sm flex items-start sm:items-center justify-between gap-3 shadow-xl animate-in fade-in">
          <div className="flex items-start sm:items-center gap-3 min-w-0">
            <span className="text-xl shrink-0">💾</span>
            <span className="break-words">{saveToast}</span>
          </div>
          <button
            type="button"
            onClick={() => setSaveToast(null)}
            aria-label="Dismiss save notice"
            className="min-h-[44px] min-w-[44px] shrink-0 text-white hover:text-yellow-400 font-black flex items-center justify-center rounded-xl hover:bg-white/10"
          >
            ✕
          </button>
        </div>
      )}

      {/* Control Header */}
      <div className="bg-white rounded-3xl p-4 sm:p-6 border-2 border-slate-100 shadow-md space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-start sm:items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-emerald-700 text-yellow-300 flex items-center justify-center font-black text-xl shadow-md shrink-0">
              📊
            </div>
            <div className="min-w-0">
              <h3 className="font-serif font-black text-lg sm:text-xl text-blue-950 break-words">
                Multi-Subject Master Broadsheet (Direct Spreadsheet Format)
              </h3>
              <p className="text-xs text-slate-500 font-medium break-words">
                Grade all pupils across multiple subjects directly on a single spreadsheet grid. Press <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-300 rounded text-[10px] font-mono font-bold">Enter</kbd> or <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-300 rounded text-[10px] font-mono font-bold">↓</kbd> to move straight down rows.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleExportBroadsheetCsv}
              className="min-h-[44px] px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-xl font-black text-[11px] uppercase tracking-wider transition-all flex items-center gap-1.5"
            >
              <span>📥</span>
              <span>Export CSV Sheet</span>
            </button>
            <button
              type="button"
              onClick={handleSaveEntireBroadsheet}
              className="min-h-[44px] px-5 py-2.5 bg-blue-900 hover:bg-blue-800 text-yellow-400 rounded-xl font-black text-xs uppercase tracking-wider shadow-md transition-all active:scale-95 flex items-center gap-2"
            >
              <span>💾</span>
              <span>Save Entire Sheet</span>
            </button>
          </div>
        </div>

        {/* Selectors Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Class Selector */}
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
              Class / Grade *
            </label>
            <select
              value={selectedGrade}
              onChange={(e) => setSelectedGrade(e.target.value as GradeLevel)}
              className="min-h-[44px] w-full px-3.5 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl text-xs font-black text-blue-950 outline-none focus:bg-white focus:border-blue-900"
            >
              {assignedGrades.map(g => (
                <option key={g} value={g}>
                  {g} ({allStudents.filter(s => s.grade === g).length} pupils)
                </option>
              ))}
            </select>
          </div>

          {/* Term Selector */}
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
              Academic Term *
            </label>
            <select
              value={selectedTerm}
              onChange={(e) => setSelectedTerm(e.target.value)}
              className="min-h-[44px] w-full px-3.5 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl text-xs font-black text-blue-950 outline-none focus:bg-white focus:border-blue-900"
            >
              <option value="First Term">First Term</option>
              <option value="Second Term">Second Term</option>
              <option value="Third Term">Third Term</option>
            </select>
          </div>

          {/* Cell Format Selector */}
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
              Sheet Score Columns *
            </label>
            <select
              value={entryMode}
              onChange={(e) => setEntryMode(e.target.value as BroadsheetEntryMode)}
              className="min-h-[44px] w-full px-3.5 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl text-xs font-black text-blue-950 outline-none focus:bg-white focus:border-blue-900"
            >
              <option value="split_ca_exam">Split CA (40) + Exam (60)</option>
              <option value="total_100">Direct Total Score (0–100)</option>
              <option value="ca_only">CA Test Column Only (0–40)</option>
              <option value="exam_only">Exam Column Only (0–60)</option>
            </select>
          </div>

          {/* Search Filter */}
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
              Filter Pupils
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search pupil name or ID..."
              className="min-h-[44px] w-full px-3.5 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl text-xs font-bold text-blue-950 outline-none focus:bg-white focus:border-blue-900"
            />
          </div>
        </div>

        {/* Add Subject Column Bar + Status */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
          <form onSubmit={handleAddExtraSubject} className="flex flex-wrap sm:flex-nowrap items-center gap-2 flex-1 max-w-md">
            <input
              type="text"
              value={extraSubjectInput}
              onChange={(e) => setExtraSubjectInput(e.target.value)}
              placeholder="Add another subject column (e.g. Civic Education)..."
              className="min-h-[44px] flex-1 min-w-[180px] px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-blue-950 outline-none focus:bg-white focus:border-blue-900"
            />
            <button
              type="submit"
              className="min-h-[44px] px-4 py-2 bg-slate-800 hover:bg-blue-900 text-white rounded-xl text-[11px] font-black uppercase tracking-wider transition-all shrink-0"
            >
              + Column
            </button>
          </form>

          <div className="flex flex-wrap items-center gap-3 text-xs">
            <span className="inline-flex items-center gap-1.5 font-bold text-slate-600 break-words">
              <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${hasUnsavedDraft ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`}></span>
              {hasUnsavedDraft ? 'Draft edits auto-saved locally (click Save Entire Sheet to sync)' : 'Synced with database'}
            </span>
            {hasUnsavedDraft && (
              <button
                type="button"
                onClick={handleDiscardDraft}
                className="min-h-[44px] px-3 text-[11px] font-black text-rose-600 hover:underline uppercase"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Spreadsheet Grid Table */}
      <div className="bg-white rounded-3xl border-2 border-slate-200 shadow-lg">
        {classStudents.length === 0 ? (
          <div className="p-8 sm:p-12 text-center text-slate-400 space-y-2">
            <span className="text-4xl block">🧑‍🎓</span>
            <p className="font-serif font-black text-blue-900 text-base break-words">
              No pupils enrolled in {selectedGrade} yet
            </p>
            <p className="text-xs break-words">Select another assigned class or add students to view their grading sheet.</p>
          </div>
        ) : sheetSubjects.length === 0 ? (
          <div className="p-8 sm:p-12 text-center text-slate-400 space-y-2">
            <span className="text-4xl block">📚</span>
            <p className="font-serif font-black text-blue-900 text-base break-words">
              No subject columns found for {selectedGrade}
            </p>
            <p className="text-xs break-words">Use the "+ Column" input above to add a subject column to this spreadsheet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto w-full rounded-t-3xl">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="bg-blue-950 text-yellow-300 border-b-2 border-yellow-400">
                  <th className="md:sticky md:left-0 z-20 bg-blue-950 py-3 px-3 border-r border-blue-800 text-center w-10 font-mono text-[10px] font-black uppercase">
                    S/N
                  </th>
                  <th className="md:sticky md:left-10 z-20 bg-blue-950 py-3 px-3 border-r-2 border-yellow-400/60 min-w-[175px] font-black uppercase text-[11px] tracking-wider md:shadow-[2px_0_8px_rgba(0,0,0,0.18)]">
                    Pupil Name & ID
                  </th>
                  {sheetSubjects.map(subj => (
                    <th
                      key={subj}
                      className={`py-2.5 px-2.5 border-r border-blue-800 text-center ${
                        entryMode === 'split_ca_exam' ? 'min-w-[168px]' : 'min-w-[104px]'
                      }`}
                    >
                      <span className="block font-black text-[11px] uppercase tracking-wide text-white break-words whitespace-normal max-w-[170px] mx-auto" title={subj}>
                        {subj}
                      </span>
                      <span className="block text-[9px] font-bold text-yellow-300/90 mt-0.5">
                        {entryMode === 'split_ca_exam'
                          ? 'CA (40) | Exam (60)'
                          : entryMode === 'ca_only'
                          ? 'CA (0–40)'
                          : entryMode === 'exam_only'
                          ? 'Exam (0–60)'
                          : 'Total (0–100)'}
                      </span>
                    </th>
                  ))}
                  <th className="py-3 px-3 bg-blue-900 text-center min-w-[78px] font-black uppercase text-[10px] border-r border-blue-800">
                    Total
                  </th>
                  <th className="py-3 px-3 bg-blue-900 text-center min-w-[74px] font-black uppercase text-[10px] border-r border-blue-800">
                    Avg %
                  </th>
                  <th className="py-3 px-3 bg-blue-900 text-center min-w-[70px] font-black uppercase text-[10px]">
                    Pos
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredStudents.map((stu, rowIdx) => {
                  const summary = pupilSummaries.get(stu.id);
                  const rowBg = rowIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/70';

                  return (
                    <tr key={stu.id} className={`${rowBg} hover:bg-blue-50/50 transition-colors`}>
                      {/* S/N */}
                      <td className={`md:sticky md:left-0 z-10 ${rowBg} py-2.5 px-2 border-r border-slate-200 text-center font-mono font-bold text-slate-400 text-[11px]`}>
                        {rowIdx + 1}
                      </td>

                      {/* Student Name & ID */}
                      <td className={`md:sticky md:left-10 z-10 ${rowBg} py-2.5 px-3 border-r-2 border-slate-300 md:shadow-[2px_0_6px_rgba(0,0,0,0.05)]`}>
                        <p className="font-serif font-black text-blue-950 text-xs leading-tight break-words whitespace-normal max-w-[195px]" title={stu.name}>
                          {stu.name}
                        </p>
                        <p className="font-mono text-[10px] text-slate-400 font-bold break-all">
                          {stu.id}
                        </p>
                      </td>

                      {/* Subject Cells */}
                      {sheetSubjects.map((subj, colIdx) => {
                        const cell = getCellDisplayValues(stu, subj);
                        const cellTotal = computeCellTotal(cell);

                        return (
                          <td key={`${stu.id}-${subj}`} className="py-2 px-2 border-r border-slate-200 text-center align-middle">
                            {entryMode === 'split_ca_exam' ? (
                              <div className="flex items-center justify-center gap-1">
                                <input
                                  ref={el => {
                                    cellRefs.current[`cell-${rowIdx}-${colIdx}-ca`] = el;
                                  }}
                                  type="number"
                                  min="0"
                                  max="40"
                                  step="any"
                                  value={cell.ca}
                                  onFocus={() => setFocusedCellKey(`cell-${rowIdx}-${colIdx}-ca`)}
                                  onBlur={() => setFocusedCellKey(null)}
                                  onKeyDown={(e) => handleCellKeyDown(e, rowIdx, colIdx, 'ca')}
                                  onChange={(e) => handleCellInput(stu, subj, 'ca', e.target.value)}
                                  placeholder="CA"
                                  title={`${stu.name} - ${subj} CA (0-40)`}
                                  className={`min-h-[44px] w-14 px-1 py-1.5 border rounded-lg text-center font-mono font-bold text-xs outline-none transition-all tabular-nums ${
                                    focusedCellKey === `cell-${rowIdx}-${colIdx}-ca`
                                      ? 'border-blue-900 bg-amber-50 ring-2 ring-blue-200'
                                      : 'border-amber-200 bg-amber-50/40 text-amber-950'
                                  }`}
                                />
                                <input
                                  ref={el => {
                                    cellRefs.current[`cell-${rowIdx}-${colIdx}-exam`] = el;
                                  }}
                                  type="number"
                                  min="0"
                                  max="60"
                                  step="any"
                                  value={cell.exam}
                                  onFocus={() => setFocusedCellKey(`cell-${rowIdx}-${colIdx}-exam`)}
                                  onBlur={() => setFocusedCellKey(null)}
                                  onKeyDown={(e) => handleCellKeyDown(e, rowIdx, colIdx, 'exam')}
                                  onChange={(e) => handleCellInput(stu, subj, 'exam', e.target.value)}
                                  placeholder="Ex"
                                  title={`${stu.name} - ${subj} Exam (0-60)`}
                                  className={`min-h-[44px] w-14 px-1 py-1.5 border rounded-lg text-center font-mono font-bold text-xs outline-none transition-all tabular-nums ${
                                    focusedCellKey === `cell-${rowIdx}-${colIdx}-exam`
                                      ? 'border-blue-900 bg-indigo-50 ring-2 ring-blue-200'
                                      : 'border-indigo-200 bg-indigo-50/40 text-indigo-950'
                                  }`}
                                />
                                <span
                                  className={`w-8 text-[10px] font-mono font-black tabular-nums ${
                                    cellTotal === null
                                      ? 'text-slate-300'
                                      : cellTotal >= 75
                                      ? 'text-emerald-700'
                                      : cellTotal >= 50
                                      ? 'text-blue-900'
                                      : 'text-rose-600'
                                  }`}
                                  title="Total"
                                >
                                  {cellTotal !== null ? cellTotal : '—'}
                                </span>
                              </div>
                            ) : (
                              <input
                                ref={el => {
                                  const subField = entryMode === 'ca_only' ? 'ca' : entryMode === 'exam_only' ? 'exam' : 'total';
                                  cellRefs.current[`cell-${rowIdx}-${colIdx}-${subField}`] = el;
                                }}
                                type="number"
                                min="0"
                                max={entryMode === 'ca_only' ? 40 : entryMode === 'exam_only' ? 60 : 100}
                                step="any"
                                value={
                                  entryMode === 'ca_only'
                                    ? cell.ca
                                    : entryMode === 'exam_only'
                                    ? cell.exam
                                    : cell.total
                                }
                                onKeyDown={(e) => {
                                  const subField = entryMode === 'ca_only' ? 'ca' : entryMode === 'exam_only' ? 'exam' : 'total';
                                  handleCellKeyDown(e, rowIdx, colIdx, subField);
                                }}
                                onChange={(e) => {
                                  const subField = entryMode === 'ca_only' ? 'ca' : entryMode === 'exam_only' ? 'exam' : 'total';
                                  handleCellInput(stu, subj, subField, e.target.value);
                                }}
                                placeholder="—"
                                title={`${stu.name} - ${subj}`}
                                className="min-h-[44px] w-16 px-2 py-1.5 bg-slate-50 border border-slate-300 focus:bg-white focus:border-blue-900 focus:ring-2 focus:ring-blue-200 rounded-lg text-center font-mono font-black text-xs text-blue-950 outline-none tabular-nums"
                              />
                            )}
                          </td>
                        );
                      })}

                      {/* Student Aggregate Columns */}
                      <td className="py-2.5 px-3 text-center font-mono font-black text-blue-950 border-r border-slate-200 tabular-nums">
                        {summary && summary.subjectsGraded > 0 ? summary.totalPoints : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono font-black border-r border-slate-200 tabular-nums">
                        {summary && summary.subjectsGraded > 0 ? (
                          <span
                            className={`px-2 py-0.5 rounded-md text-[11px] ${
                              summary.average >= 75
                                ? 'bg-emerald-100 text-emerald-800'
                                : summary.average >= 50
                                ? 'bg-blue-100 text-blue-900'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {summary.average}%
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center font-black text-xs text-blue-900">
                        {summary?.rank ? formatOrdinal(summary.rank) : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Sticky Sheet Footer */}
        <div className="p-4 sm:p-5 bg-slate-50 border-t-2 border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="text-xs text-slate-600 font-bold break-words">
            <span className="text-blue-950 font-black">{filteredStudents.length} Pupils</span> •{' '}
            <span className="text-blue-950 font-black">{sheetSubjects.length} Subject Columns</span> •{' '}
            <span>{selectedGrade} ({selectedTerm})</span>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            {hasUnsavedDraft && (
              <button
                type="button"
                onClick={handleDiscardDraft}
                className="min-h-[44px] px-4 py-2.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl font-black text-xs uppercase tracking-wider transition-all"
              >
                Discard Edits
              </button>
            )}
            <button
              type="button"
              onClick={handleSaveEntireBroadsheet}
              className="min-h-[44px] flex-1 sm:flex-none px-6 sm:px-7 py-3 bg-yellow-400 hover:bg-yellow-300 text-blue-950 border-2 border-yellow-500 rounded-xl font-black text-xs sm:text-sm uppercase tracking-wider shadow-md transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <span>💾</span>
              <span>Save & Sync Entire Broadsheet</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
