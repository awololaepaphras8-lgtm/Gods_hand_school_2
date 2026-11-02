import React, { useState, useEffect, useMemo, useRef } from 'react';
import { GradeLevel, StudentAccount, StudentResult, Course, GradingCriterion } from '../types';
import { DEFAULT_GRADING_CRITERIA } from '../constants';
import { formatSubjectName } from '../utils/resultFeeService';

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
  scores: { [studentId: string]: PupilDraftRow };
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
  const defaultSubject: string = assignedSubjects[0] || courses[0]?.name || 'Mathematics';

  // State
  const [selectedGrade, setSelectedGrade] = useState<GradeLevel>(defaultGrade);
  const [selectedSubject, setSelectedSubject] = useState<string>(defaultSubject);
  const [customSubject, setCustomSubject] = useState<string>('');
  const [selectedTerm, setSelectedTerm] = useState<string>(activeTerm);
  const [sheetMode, setSheetMode] = useState<'test_only' | 'full_sheet'>('test_only');

  // Pagination for mobile convenience (5 or 10 pupils per page so teachers on phones don't scroll infinitely)
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(5);
  const [lastActivePupilIndex, setLastActivePupilIndex] = useState<number>(0);

  // Draft Scores: { [studentId]: PupilDraftRow }
  const [draftScores, setDraftScores] = useState<{ [studentId: string]: PupilDraftRow }>({});

  // Mobile Session Resume indicator
  const [resumedMessage, setResumedMessage] = useState<string | null>(null);
  const [saveToast, setSaveToast] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);

  // Quick remarks options
  const quickRemarks = ['Excellence', 'Very Good', 'Good Effort', 'Credit', 'Pass', 'Needs Improvement'];

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
            `📱 Session Restored: Continued from Page ${parsed.page || 1} (Pupil #${(parsed.lastPupilNumber || 0) + 1}) • Last autosaved at ${timeStr}.`
          );
        }
      }
    } catch (e) {
      console.warn("Failed to restore teacher marksheet session", e);
    }
  }, [storageKey]);

  // Students in selected class
  const classStudents = useMemo(() => {
    return allStudents
      .filter(s => s.grade === selectedGrade)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [allStudents, selectedGrade]);

  // Deduplicate and sanitize curriculum subjects (removing class suffixes like Primary 1)
  const cleanCurriculumSubjects = useMemo(() => {
    const set = new Set<string>();
    courses.forEach(c => {
      const clean = formatSubjectName(c.name);
      if (clean) set.add(clean);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [courses]);

  const activeSubjectName = formatSubjectName(selectedSubject === '__custom__' ? customSubject.trim() : selectedSubject);

  // Initialize draft scores with existing database records if not already in draft
  useEffect(() => {
    if (!activeSubjectName) return;

    setDraftScores(prev => {
      let changed = false;
      const next = { ...prev };

      classStudents.forEach(stu => {
        if (!next[stu.id]) {
          // Look for existing saved result
          const existing = results.find(r => 
            (r.studentId === stu.id || r.studentName.toLowerCase() === stu.name.toLowerCase()) &&
            r.grade === selectedGrade &&
            r.subject.toLowerCase() === activeSubjectName.toLowerCase() &&
            r.term.toLowerCase() === selectedTerm.toLowerCase()
          );

          if (existing) {
            const existingCa = existing.caScore !== undefined 
              ? String(existing.caScore) 
              : String(Math.round(existing.score * 0.4));
            const existingExam = existing.examScore !== undefined 
              ? String(existing.examScore) 
              : String(Math.max(0, existing.score - (parseFloat(existingCa) || 0)));

            next[stu.id] = {
              caScore: existingCa,
              examScore: existingExam,
              remark: existing.teacherComment || existing.remark || ''
            };
            changed = true;
          } else {
            next[stu.id] = {
              caScore: '',
              examScore: '',
              remark: ''
            };
            changed = true;
          }
        }
      });

      return changed ? next : prev;
    });
  }, [classStudents, selectedGrade, activeSubjectName, selectedTerm, results]);

  // Autosave to localStorage on change
  const saveSessionToStorage = (updatedScores: { [studentId: string]: PupilDraftRow }, page: number, pupilIndex: number) => {
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
      console.warn("Autosave marksheet error", e);
    }
  };

  // Update a single pupil's field
  const handleScoreChange = (
    studentId: string, 
    field: 'caScore' | 'examScore' | 'remark', 
    val: string,
    pupilGlobalIndex: number
  ) => {
    // CA Test is strictly 0 to 40 max
    if (field === 'caScore') {
      const num = parseFloat(val);
      if (!isNaN(num) && num > 40) {
        val = '40'; // Strict clamp: CA test is out of 40 only
      } else if (!isNaN(num) && num < 0) {
        val = '0';
      }
    }

    // Exam is strictly 0 to 60 max
    if (field === 'examScore') {
      const num = parseFloat(val);
      if (!isNaN(num) && num > 60) {
        val = '60';
      } else if (!isNaN(num) && num < 0) {
        val = '0';
      }
    }

    const updated = {
      ...draftScores,
      [studentId]: {
        ...(draftScores[studentId] || { caScore: '', examScore: '', remark: '' }),
        [field]: val
      }
    };

    setDraftScores(updated);
    setLastActivePupilIndex(pupilGlobalIndex);
    saveSessionToStorage(updated, currentPage, pupilGlobalIndex);
  };

  // Grade info helper
  const getGradeInfo = (score: number) => {
    const sorted = [...gradingCriteria].sort((a, b) => b.minScore - a.minScore);
    const found = sorted.find(c => score >= c.minScore);
    if (found) {
      return {
        letter: found.gradeLetter,
        remark: found.remark || (found.minScore >= 75 ? 'Excellence' : found.minScore >= 60 ? 'Very Good' : found.minScore >= 50 ? 'Credit' : 'Pass')
      };
    }
    return { letter: 'F9', remark: 'Remedial' };
  };

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
    // Smooth scroll to top of table on page change
    const tableEl = document.getElementById('ghs-marksheet-table-container');
    if (tableEl) {
      tableEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  };

  // Clear draft
  const handleClearDraft = () => {
    if (window.confirm("Are you sure you want to discard your unsaved draft and reload saved records?")) {
      localStorage.removeItem(storageKey);
      setDraftScores({});
      setHasUnsavedChanges(false);
      setResumedMessage(null);
    }
  };

  // Save all marks from sheet to official records
  const handleSaveAllRecords = () => {
    if (!activeSubjectName) {
      alert("Please select or enter a subject name first.");
      return;
    }

    const recordsToSave: StudentResult[] = [];
    let savedCount = 0;

    classStudents.forEach(stu => {
      const draft = draftScores[stu.id];
      if (!draft) return;

      const hasCa = draft.caScore !== '' && !isNaN(parseFloat(draft.caScore));
      const hasExam = draft.examScore !== '' && !isNaN(parseFloat(draft.examScore));

      // In test_only mode, require at least CA score. In full sheet, require at least one.
      if (!hasCa && !hasExam) return;

      const caVal = hasCa ? Math.min(40, Math.max(0, parseFloat(draft.caScore))) : 0;
      const examVal = hasExam ? Math.min(60, Math.max(0, parseFloat(draft.examScore))) : 0;

      // Total score is sum of CA test (out of 40) + Exam (out of 60) = 100
      let totalVal = 0;
      if (sheetMode === 'test_only') {
        // If staff records only CA test, keep test out of 40. Total reflects CA or CA + existing exam
        totalVal = caVal + examVal;
      } else {
        totalVal = Math.min(100, caVal + examVal);
      }

      const gradeInfo = getGradeInfo(totalVal);
      const remark = draft.remark.trim() || gradeInfo.remark;

      const existing = results.find(r => 
        (r.studentId === stu.id || r.studentName.toLowerCase() === stu.name.toLowerCase()) &&
        r.grade === selectedGrade &&
        r.subject.toLowerCase() === activeSubjectName.toLowerCase() &&
        r.term.toLowerCase() === selectedTerm.toLowerCase()
      );

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
      alert("No marks entered to save. Please enter test or examination scores for at least one pupil on the sheet.");
      return;
    }

    if (onBatchSaveResults) {
      onBatchSaveResults(recordsToSave);
    } else {
      recordsToSave.forEach(r => onAddResult(r));
    }

    // Update storage to mark changes committed
    saveSessionToStorage(draftScores, currentPage, lastActivePupilIndex);
    setHasUnsavedChanges(false);

    setSaveToast(`✅ Successfully saved and published ${savedCount} pupil marks for ${selectedGrade} • ${activeSubjectName} (${selectedTerm}) to the school database!`);
    setTimeout(() => setSaveToast(null), 6000);
  };

  return (
    <div className="space-y-6">
      {/* Session Resume Alert Banner */}
      {resumedMessage && (
        <div className="p-4 bg-emerald-50 border-2 border-emerald-300 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-emerald-950 animate-in fade-in duration-300 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📱</span>
            <div>
              <p className="font-serif font-black text-xs sm:text-sm">
                Mobile Auto-Save Active & Resumed
              </p>
              <p className="text-[11px] text-emerald-800 font-medium">
                {resumedMessage} Even if you close your phone browser, your marks and page will not be lost.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
            <button
              type="button"
              onClick={handleClearDraft}
              className="px-3 py-1.5 bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all"
            >
              Discard Draft
            </button>
            <button
              type="button"
              onClick={() => setResumedMessage(null)}
              className="px-3 py-1.5 bg-emerald-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Save Toast */}
      {saveToast && (
        <div className="p-4 bg-blue-900 border-2 border-yellow-400 text-yellow-300 rounded-2xl font-black text-xs sm:text-sm flex items-center justify-between shadow-xl animate-in fade-in duration-300">
          <div className="flex items-center gap-3">
            <span className="text-2xl">💾</span>
            <span>{saveToast}</span>
          </div>
          <button
            type="button"
            onClick={() => setSaveToast(null)}
            className="text-white hover:text-yellow-400 font-black text-sm p-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* Control Bar: Class, Subject, Term & Scope Selector */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border-2 border-slate-100 shadow-md space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-900 text-yellow-400 flex items-center justify-center font-black text-2xl shadow-md">
              📋
            </div>
            <div>
              <h3 className="font-serif font-black text-xl text-blue-950">
                Staff Class Marksheet & Grade Ledger
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Record Continuous Assessment (CA) test marks and terminal examination scores for all pupils on a single sheet.
              </p>
            </div>
          </div>

          {/* Scope Selector: Test Only vs Full Sheet */}
          <div className="bg-slate-100 p-1.5 rounded-2xl flex items-center gap-1.5 border border-slate-200 shrink-0">
            <button
              type="button"
              onClick={() => {
                setSheetMode('test_only');
                saveSessionToStorage(draftScores, currentPage, lastActivePupilIndex);
              }}
              className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                sheetMode === 'test_only'
                  ? 'bg-amber-500 text-white shadow-md'
                  : 'text-slate-600 hover:text-blue-950 hover:bg-white'
              }`}
            >
              <span>🧪</span>
              <span>CA Test Only (Max 40)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setSheetMode('full_sheet');
                saveSessionToStorage(draftScores, currentPage, lastActivePupilIndex);
              }}
              className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
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
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
              className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-2xl text-xs font-black text-blue-950 outline-none focus:bg-white focus:border-blue-900"
            >
              {assignedGrades.map(g => (
                <option key={g} value={g}>{g} ({allStudents.filter(s => s.grade === g).length} pupils)</option>
              ))}
            </select>
          </div>

          {/* Subject Selector */}
          <div>
            <label className="block text-[11px] font-black uppercase tracking-wider text-slate-600 mb-1.5 flex items-center justify-between">
              <span>Subject *</span>
              {assignedSubjects && assignedSubjects.length > 0 && (
                <span className="text-[10px] text-indigo-700 font-bold">★ {assignedSubjects.length} Assigned</span>
              )}
            </label>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-2xl text-xs font-black text-blue-950 outline-none focus:bg-white focus:border-blue-900"
            >
              {assignedSubjects.length > 0 && (
                <optgroup label="★ Your Assigned Subjects">
                  {assignedSubjects.map(subj => {
                    const clean = formatSubjectName(subj);
                    return <option key={`my-sub-${clean}`} value={clean}>★ {clean}</option>;
                  })}
                </optgroup>
              )}
              <optgroup label="School Curriculum">
                {cleanCurriculumSubjects.map(subj => (
                  <option key={subj} value={subj}>{subj}</option>
                ))}
              </optgroup>
              <option value="__custom__">➕ Type Custom Subject...</option>
            </select>
            {selectedSubject === '__custom__' && (
              <input
                type="text"
                value={customSubject}
                onChange={(e) => setCustomSubject(e.target.value)}
                placeholder="Enter subject name..."
                className="w-full mt-2 px-3 py-2 bg-yellow-50 border-2 border-yellow-400 rounded-xl text-xs font-black text-blue-950 outline-none"
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
              className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-2xl text-xs font-black text-blue-950 outline-none focus:bg-white focus:border-blue-900"
            >
              <option value="First Term">First Term</option>
              <option value="Second Term">Second Term</option>
              <option value="Third Term">Third Term</option>
            </select>
          </div>
        </div>

        {/* Quick info chip */}
        <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-blue-950 font-bold">
            <span className="px-2 py-0.5 bg-blue-900 text-yellow-300 rounded-md font-mono text-[10px] font-black uppercase">
              {sheetMode === 'test_only' ? 'CA TEST ONLY: MAX 40 MARKS' : 'FULL DOSSIER: CA 40 + EXAM 60 = 100'}
            </span>
            <span>
              {sheetMode === 'test_only' 
                ? 'Test marks are strictly graded over 40 (0 to 40). Continuous Assessment is immediately accessible to parents.' 
                : 'Terminal Examination is out of 60, aggregating to 100 total with automated letter grades.'}
            </span>
          </div>

          {/* Unsaved indicator */}
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${hasUnsavedChanges ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`}></span>
            <span className="text-[11px] font-black text-slate-600">
              {hasUnsavedChanges ? 'Draft in Local Storage (Not yet committed)' : 'All Marks Committed'}
            </span>
          </div>
        </div>
      </div>

      {/* Pagination & Mobile Control Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs">
          <span className="font-black text-slate-500 uppercase tracking-wider text-[11px]">Pupils per page:</span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="px-2.5 py-1 bg-slate-100 border border-slate-300 rounded-xl text-xs font-black text-blue-950 outline-none"
          >
            <option value={5}>5 (Recommended for Mobile)</option>
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={500}>All ({classStudents.length})</option>
          </select>
          <span className="text-slate-400 font-bold ml-2">
            Showing {(safeCurrentPage - 1) * pageSize + 1} - {Math.min(safeCurrentPage * pageSize, totalStudents)} of {totalStudents} pupils
          </span>
        </div>

        {/* Page Switcher */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            disabled={safeCurrentPage <= 1}
            onClick={() => handlePageChange(safeCurrentPage - 1)}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-30 rounded-xl font-black text-xs text-blue-950 transition-all cursor-pointer"
          >
            ← Prev
          </button>
          <span className="px-3 py-1 bg-blue-900 text-yellow-400 font-mono font-black text-xs rounded-xl">
            Page {safeCurrentPage} / {totalPages}
          </span>
          <button
            type="button"
            disabled={safeCurrentPage >= totalPages}
            onClick={() => handlePageChange(safeCurrentPage + 1)}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-30 rounded-xl font-black text-xs text-blue-950 transition-all cursor-pointer"
          >
            Next →
          </button>
        </div>
      </div>

      {/* Sheet Table */}
      <div id="ghs-marksheet-table-container" className="bg-white rounded-3xl border-2 border-slate-100 shadow-md overflow-hidden">
        {classStudents.length === 0 ? (
          <div className="p-16 text-center text-slate-400 space-y-2">
            <span className="text-4xl block">🧑‍🎓</span>
            <p className="font-serif font-black text-blue-900 text-base">No pupils enrolled in {selectedGrade} yet</p>
            <p className="text-xs">Once pupils are added to this class, their marksheet rows will display here automatically.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[720px]">
              <thead>
                <tr className="bg-slate-50 border-b-2 border-slate-100 text-[10px] font-black uppercase tracking-wider text-slate-500">
                  <th className="py-4 px-4 w-12 text-center">#</th>
                  <th className="py-4 px-4">Pupil Details</th>
                  <th className="py-4 px-4 w-36 text-center">
                    <span className="block text-amber-700 font-black">CA Test (0-40) *</span>
                    <span className="text-[9px] text-slate-400 font-normal lowercase">max 40 marks</span>
                  </th>
                  {sheetMode === 'full_sheet' && (
                    <th className="py-4 px-4 w-36 text-center">
                      <span className="block text-indigo-700 font-black">Exam (0-60)</span>
                      <span className="text-[9px] text-slate-400 font-normal lowercase">max 60 marks</span>
                    </th>
                  )}
                  {sheetMode === 'full_sheet' && (
                    <th className="py-4 px-4 w-28 text-center">Total (/100)</th>
                  )}
                  {sheetMode === 'full_sheet' && (
                    <th className="py-4 px-4 w-20 text-center">Grade</th>
                  )}
                  <th className="py-4 px-4 min-w-[180px]">Teacher Remark / Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {displayedStudents.map((stu, pageIndex) => {
                  const globalIndex = (safeCurrentPage - 1) * pageSize + pageIndex;
                  const row = draftScores[stu.id] || { caScore: '', examScore: '', remark: '' };

                  const caNum = parseFloat(row.caScore) || 0;
                  const examNum = parseFloat(row.examScore) || 0;
                  const totalNum = Math.min(100, Math.round((caNum + examNum) * 10) / 10);
                  const gradeInfo = getGradeInfo(totalNum);

                  const isCurrentActive = lastActivePupilIndex === globalIndex;

                  return (
                    <tr 
                      key={stu.id} 
                      className={`transition-colors ${
                        isCurrentActive ? 'bg-amber-50/50' : 'hover:bg-slate-50/60'
                      }`}
                    >
                      {/* Pupil Number */}
                      <td className="py-4 px-4 text-center font-mono font-black text-slate-400">
                        #{globalIndex + 1}
                      </td>

                      {/* Pupil Info */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-blue-900 text-yellow-300 font-black flex items-center justify-center shrink-0 uppercase shadow-xs">
                            {stu.photo ? (
                              <img src={stu.photo} alt={stu.name} className="w-full h-full object-cover rounded-xl" />
                            ) : (
                              stu.name.charAt(0)
                            )}
                          </div>
                          <div className="overflow-hidden">
                            <p className="font-serif font-black text-blue-950 text-xs leading-snug truncate">
                              {stu.name}
                            </p>
                            <p className="text-[10px] font-mono text-slate-400 font-bold">
                              ID: {stu.id}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* CA Test Score Input (Strictly 0 to 40) */}
                      <td className="py-4 px-4 text-center">
                        <div className="space-y-1">
                          <input
                            type="number"
                            min="0"
                            max="40"
                            step="any"
                            value={row.caScore}
                            onChange={(e) => handleScoreChange(stu.id, 'caScore', e.target.value, globalIndex)}
                            placeholder="0-40"
                            className="w-24 px-3 py-2 bg-amber-50/70 border-2 border-amber-300 rounded-xl font-mono font-black text-center text-amber-950 outline-none focus:bg-white focus:border-amber-600 transition-all text-sm mx-auto block"
                          />
                          {row.caScore !== '' && parseFloat(row.caScore) > 40 && (
                            <span className="text-[9px] text-rose-600 font-bold block">Max 40 only!</span>
                          )}
                        </div>
                      </td>

                      {/* Exam Score Input (Strictly 0 to 60) - Full Sheet mode */}
                      {sheetMode === 'full_sheet' && (
                        <td className="py-4 px-4 text-center">
                          <div className="space-y-1">
                            <input
                              type="number"
                              min="0"
                              max="60"
                              step="any"
                              value={row.examScore}
                              onChange={(e) => handleScoreChange(stu.id, 'examScore', e.target.value, globalIndex)}
                              placeholder="0-60"
                              className="w-24 px-3 py-2 bg-indigo-50/70 border-2 border-indigo-300 rounded-xl font-mono font-black text-center text-indigo-950 outline-none focus:bg-white focus:border-indigo-600 transition-all text-sm mx-auto block"
                            />
                            {row.examScore !== '' && parseFloat(row.examScore) > 60 && (
                              <span className="text-[9px] text-rose-600 font-bold block">Max 60 only!</span>
                            )}
                          </div>
                        </td>
                      )}

                      {/* Total Score - Full Sheet mode */}
                      {sheetMode === 'full_sheet' && (
                        <td className="py-4 px-4 text-center">
                          <span className={`font-mono font-black text-sm px-2.5 py-1 rounded-xl inline-block ${
                            totalNum >= 75 ? 'bg-emerald-100 text-emerald-800' : totalNum >= 60 ? 'bg-blue-100 text-blue-800' : totalNum >= 50 ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'
                          }`}>
                            {row.caScore !== '' || row.examScore !== '' ? `${totalNum}%` : '—'}
                          </span>
                        </td>
                      )}

                      {/* Letter Grade */}
                      {sheetMode === 'full_sheet' && (
                        <td className="py-4 px-4 text-center">
                          <span className={`font-black text-xs px-2 py-0.5 rounded-lg ${
                            gradeInfo.letter.startsWith('A') ? 'bg-emerald-600 text-white' : gradeInfo.letter.startsWith('B') ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-800'
                          }`}>
                            {row.caScore !== '' || row.examScore !== '' ? gradeInfo.letter : '—'}
                          </span>
                        </td>
                      )}

                      {/* Teacher Remark */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            value={row.remark}
                            onChange={(e) => handleScoreChange(stu.id, 'remark', e.target.value, globalIndex)}
                            placeholder="e.g. Excellent progress..."
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:bg-white focus:border-blue-900"
                          />
                          {/* Quick preset dropdown button */}
                          <select
                            value=""
                            onChange={(e) => {
                              if (e.target.value) {
                                handleScoreChange(stu.id, 'remark', e.target.value, globalIndex);
                              }
                            }}
                            className="px-2 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 rounded-xl text-[10px] font-black uppercase outline-none cursor-pointer"
                            title="Quick remarks"
                          >
                            <option value="">▼</option>
                            {quickRemarks.map(qr => (
                              <option key={qr} value={qr}>{qr}</option>
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
        <div className="p-6 bg-slate-50 border-t-2 border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-slate-500 font-medium">
            <span className="font-black text-blue-950 uppercase">{classStudents.length} Total Pupils</span> in {selectedGrade} • Page {safeCurrentPage} of {totalPages}
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleClearDraft}
              className="px-4 py-3 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-2xl font-black text-xs uppercase tracking-wider transition-all"
            >
              Reset Draft
            </button>

            <button
              type="button"
              onClick={handleSaveAllRecords}
              className="flex-1 sm:flex-none px-8 py-3.5 bg-yellow-400 hover:bg-yellow-300 text-blue-950 rounded-2xl font-black text-xs sm:text-sm uppercase tracking-wider shadow-lg transition-all transform active:scale-95 flex items-center justify-center gap-2 border-2 border-yellow-500"
            >
              <span>💾</span>
              <span>Save & Publish Sheet Marks to Database</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
