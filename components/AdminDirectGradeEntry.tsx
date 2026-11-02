import React, { useState, useMemo } from 'react';
import { StudentAccount, StudentResult, Course, GradeLevel, GradingCriterion } from '../types';
import { GRADE_ORDER, DEFAULT_GRADING_CRITERIA } from '../constants';
import { computeClassRankings, formatOrdinal } from '../utils/ranking';
import { formatSubjectName } from '../utils/resultFeeService';

interface AdminDirectGradeEntryProps {
  students: StudentAccount[];
  results: StudentResult[];
  courses: Course[];
  gradingCriteria?: GradingCriterion[];
  activeTerm?: string;
  onSaveResult: (result: Omit<StudentResult, 'id' | 'date'> & { id?: string; date?: string; teacherName?: string }) => void;
  onDeleteResult?: (id: string) => void;
  onBatchSaveResults?: (results: StudentResult[]) => void;
  adminName?: string;
}

export const AdminDirectGradeEntry: React.FC<AdminDirectGradeEntryProps> = ({
  students = [],
  results = [],
  courses = [],
  gradingCriteria = DEFAULT_GRADING_CRITERIA,
  activeTerm = 'First Term',
  onSaveResult,
  onDeleteResult,
  onBatchSaveResults,
  adminName = 'School Administrator'
}) => {
  // Main view mode
  const [activeSubTab, setActiveSubTab] = useState<'single' | 'batch' | 'ledger'>('single');

  // Single Student Entry State
  const [selectedStudentId, setSelectedStudentId] = useState<string>(students[0]?.id || '');
  const [singleGradeClass, setSingleGradeClass] = useState<string>('all');
  const [studentSearchQuery, setStudentSearchQuery] = useState<string>('');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [customSubject, setCustomSubject] = useState<string>('');
  const [selectedTerm, setSelectedTerm] = useState<string>(activeTerm);
  const [gradingMode, setGradingMode] = useState<'both' | 'test_only' | 'exam_only' | 'total_only'>('both');
  const [caScore, setCaScore] = useState<number>(0);
  const [examScore, setExamScore] = useState<number>(0);
  const [totalScore, setTotalScore] = useState<number>(0);
  const [examinerName, setExaminerName] = useState<string>(adminName);
  const [publishImmediately, setPublishImmediately] = useState<boolean>(true);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string>('');

  // Batch Grading State
  const [batchGrade, setBatchGrade] = useState<GradeLevel>('Primary 1');
  const [batchSubject, setBatchSubject] = useState<string>('Mathematics');
  const [customBatchSubject, setCustomBatchSubject] = useState<string>('');
  const [batchTerm, setBatchTerm] = useState<string>(activeTerm);
  const [batchMode, setBatchMode] = useState<'both' | 'test_only' | 'exam_only'>('both');
  const [batchScores, setBatchScores] = useState<{ [studentId: string]: { ca: number; exam: number; total?: number } }>({});
  const [batchSaveMsg, setBatchSaveMsg] = useState<string>('');

  // Ledger Filter State
  const [ledgerSearch, setLedgerSearch] = useState<string>('');
  const [ledgerGradeFilter, setLedgerGradeFilter] = useState<string>('all');
  const [ledgerTermFilter, setLedgerTermFilter] = useState<string>('all');
  const [editingResultId, setEditingResultId] = useState<string | null>(null);

  // Helper to determine Grade Letter & Remark from score
  const getGradeInfo = (score: number) => {
    const sorted = [...(gradingCriteria.length > 0 ? gradingCriteria : DEFAULT_GRADING_CRITERIA)].sort((a, b) => b.minScore - a.minScore);
    const found = sorted.find(c => score >= c.minScore);
    if (found) {
      return {
        letter: found.gradeLetter,
        remark: found.remark || (found.minScore >= 75 ? 'Excellence' : found.minScore >= 65 ? 'Very Good' : found.minScore >= 50 ? 'Credit' : 'Pass')
      };
    }
    return { letter: 'F9', remark: 'Remedial' };
  };

  // Selected student object
  const selectedStudentObj = useMemo(() => {
    return students.find(s => s.id === selectedStudentId) || students[0] || null;
  }, [students, selectedStudentId]);

  // Filter students for single entry dropdown
  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const matchGrade = singleGradeClass === 'all' || s.grade === singleGradeClass;
      const matchSearch = !studentSearchQuery.trim() || 
        s.name.toLowerCase().includes(studentSearchQuery.toLowerCase()) || 
        s.id.toLowerCase().includes(studentSearchQuery.toLowerCase());
      return matchGrade && matchSearch;
    });
  }, [students, singleGradeClass, studentSearchQuery]);

  // Clean deduplicated curriculum subject names without class suffixes
  const cleanCourseSubjects = useMemo(() => {
    const set = new Set<string>();
    courses.forEach(c => {
      const clean = formatSubjectName(c.name);
      if (clean) set.add(clean);
    });
    [
      'Mathematics',
      'English Studies',
      'Basic Science',
      'Social Studies',
      'Yoruba Language',
      'Civic Education',
      'Agricultural Science',
      'Physical & Health Education',
      'Christian Religious Studies (CRS)',
      'Islamic Religious Studies (IRS)',
      'Computer Studies / ICT'
    ].forEach(s => set.add(s));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [courses]);

  // Handle CA score changes in single entry
  const handleCaChange = (val: number) => {
    const clean = Math.max(0, Math.min(40, val));
    setCaScore(clean);
    if (gradingMode === 'test_only') {
      setTotalScore(clean);
    } else {
      setTotalScore(clean + examScore);
    }
  };

  // Handle Exam score changes in single entry
  const handleExamChange = (val: number) => {
    const clean = Math.max(0, Math.min(60, val));
    setExamScore(clean);
    if (gradingMode === 'exam_only') {
      setTotalScore(clean);
    } else {
      setTotalScore(caScore + clean);
    }
  };

  // Handle Total score change
  const handleTotalChange = (val: number) => {
    const clean = Math.max(0, Math.min(100, val));
    setTotalScore(clean);
    if (gradingMode === 'both') {
      const caPart = Math.min(40, Math.round(clean * 0.4));
      setCaScore(caPart);
      setExamScore(clean - caPart);
    }
  };

  // Switch grading mode
  const handleModeSwitch = (mode: 'both' | 'test_only' | 'exam_only' | 'total_only') => {
    setGradingMode(mode);
    if (mode === 'test_only') {
      setTotalScore(caScore);
      setExamScore(0);
    } else if (mode === 'exam_only') {
      setTotalScore(examScore);
      setCaScore(0);
    } else if (mode === 'both') {
      setTotalScore(caScore + examScore);
    }
  };

  // Submit Single Grade Entry
  const handleSaveSingleGrade = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentObj) {
      alert('Please select a student.');
      return;
    }
    const finalSubj = formatSubjectName((selectedSubject === '__custom__' ? customSubject.trim() : selectedSubject) || 'General Assessment');
    if (!finalSubj) {
      alert('Please specify a valid subject.');
      return;
    }

    let calculatedTotal = totalScore;
    if (gradingMode === 'both') {
      calculatedTotal = caScore + examScore;
    } else if (gradingMode === 'test_only') {
      calculatedTotal = caScore;
    } else if (gradingMode === 'exam_only') {
      calculatedTotal = examScore;
    }

    const newResultPayload: Omit<StudentResult, 'id' | 'date'> & { id?: string; date?: string; teacherName?: string } = {
      studentId: selectedStudentObj.id,
      studentName: selectedStudentObj.name,
      grade: selectedStudentObj.grade,
      subject: finalSubj,
      caScore: gradingMode === 'exam_only' ? undefined : caScore,
      examScore: gradingMode === 'test_only' ? undefined : examScore,
      score: calculatedTotal,
      term: selectedTerm,
      teacherName: examinerName.trim() || adminName,
      date: new Date().toLocaleDateString(),
      published: publishImmediately
    };

    onSaveResult(newResultPayload);
    const gradeInfo = getGradeInfo(calculatedTotal);
    setSaveSuccessMsg(`✓ Grade recorded for ${selectedStudentObj.name} in ${finalSubj}! Score: ${calculatedTotal}% (${gradeInfo.letter} - ${gradeInfo.remark})`);
    setTimeout(() => setSaveSuccessMsg(''), 5000);

    // Reset scores for next entry
    setCaScore(0);
    setExamScore(0);
    setTotalScore(0);
  };

  // Students in selected batch class
  const batchStudents = useMemo(() => {
    return students.filter(s => s.grade === batchGrade);
  }, [students, batchGrade]);

  // Existing results for batch class, subject, term
  const activeBatchSubjectName = formatSubjectName(customBatchSubject.trim() || batchSubject);
  const existingBatchResultsMap = useMemo(() => {
    const map = new Map<string, StudentResult>();
    results.forEach(r => {
      if (
        r.grade === batchGrade &&
        r.term.toLowerCase() === batchTerm.toLowerCase() &&
        r.subject.toLowerCase() === activeBatchSubjectName.toLowerCase()
      ) {
        if (r.studentId) map.set(r.studentId, r);
        else map.set(r.studentName.toLowerCase(), r);
      }
    });
    return map;
  }, [results, batchGrade, batchTerm, activeBatchSubjectName]);

  // Handle batch input change
  const handleBatchScoreInput = (studentId: string, field: 'ca' | 'exam' | 'total', val: number) => {
    setBatchScores(prev => {
      const current = prev[studentId] || { ca: 0, exam: 0, total: 0 };
      const updated = { ...current, [field]: val };
      if (field === 'ca' || field === 'exam') {
        updated.total = (field === 'ca' ? val : current.ca) + (field === 'exam' ? val : current.exam);
      }
      return { ...prev, [studentId]: updated };
    });
  };

  // Save All Batch Class Grades
  const handleSaveAllBatchGrades = () => {
    if (batchStudents.length === 0) {
      alert('No students found in this class.');
      return;
    }
    const finalSubj = activeBatchSubjectName;
    const resultsToSave: StudentResult[] = [];

    batchStudents.forEach(st => {
      const existing = existingBatchResultsMap.get(st.id) || existingBatchResultsMap.get(st.name.toLowerCase());
      const studentInput = batchScores[st.id];

      const currentCa = studentInput?.ca !== undefined ? studentInput.ca : (existing?.caScore ?? 0);
      const currentExam = studentInput?.exam !== undefined ? studentInput.exam : (existing?.examScore ?? 0);
      let finalScore = currentCa + currentExam;
      if (batchMode === 'test_only') finalScore = currentCa;
      if (batchMode === 'exam_only') finalScore = currentExam;

      if (studentInput || existing) {
        resultsToSave.push({
          id: existing?.id || `RES-ADM-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          studentId: st.id,
          studentName: st.name,
          grade: st.grade,
          subject: finalSubj,
          caScore: batchMode === 'exam_only' ? undefined : currentCa,
          examScore: batchMode === 'test_only' ? undefined : currentExam,
          score: finalScore,
          term: batchTerm,
          teacherName: adminName,
          date: new Date().toLocaleDateString(),
          published: true
        });
      }
    });

    if (resultsToSave.length === 0) {
      alert('Please enter at least one score in the sheet before saving.');
      return;
    }

    if (onBatchSaveResults) {
      onBatchSaveResults(resultsToSave);
    } else {
      resultsToSave.forEach(r => onSaveResult(r));
    }

    setBatchSaveMsg(`✓ Successfully recorded & synchronized grades for ${resultsToSave.length} pupils in ${batchGrade} (${finalSubj})!`);
    setTimeout(() => setBatchSaveMsg(''), 6000);
  };

  // Filtered recorded results for ledger
  const filteredLedgerResults = useMemo(() => {
    return results.filter(r => {
      const matchSearch = !ledgerSearch.trim() || 
        r.studentName.toLowerCase().includes(ledgerSearch.toLowerCase()) ||
        r.subject.toLowerCase().includes(ledgerSearch.toLowerCase());
      const matchGrade = ledgerGradeFilter === 'all' || r.grade === ledgerGradeFilter;
      const matchTerm = ledgerTermFilter === 'all' || r.term.toLowerCase() === ledgerTermFilter.toLowerCase();
      return matchSearch && matchGrade && matchTerm;
    });
  }, [results, ledgerSearch, ledgerGradeFilter, ledgerTermFilter]);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Top Header Card */}
      <div className="bg-gradient-to-r from-blue-950 via-blue-900 to-indigo-950 text-white rounded-[2.5rem] p-6 sm:p-10 border-4 border-yellow-400 shadow-2xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 bg-yellow-400 text-blue-950 rounded-full text-xs font-black uppercase tracking-wider">
              <span>✍️</span>
              <span>Authoritative Admin Grading Center</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-serif font-black text-yellow-300">
              Direct Student Grades & Assessment Entry
            </h2>
            <p className="text-xs sm:text-sm text-blue-200 max-w-2xl leading-relaxed">
              Input, modify, and publish terminal grades, Continuous Assessment (CA) tests, and examination scores directly for <strong>any pupil or student registered in the school</strong>.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="bg-white/10 p-4 rounded-2xl border border-white/15 text-center min-w-[130px]">
              <span className="block text-[10px] font-black uppercase text-blue-200">Registered Pupils</span>
              <span className="text-2xl font-black text-white font-serif">{students.length}</span>
            </div>
            <div className="bg-white/10 p-4 rounded-2xl border border-white/15 text-center min-w-[130px]">
              <span className="block text-[10px] font-black uppercase text-yellow-300">Recorded Scores</span>
              <span className="text-2xl font-black text-yellow-400 font-serif">{results.length}</span>
            </div>
          </div>
        </div>

        {/* View Mode Switcher */}
        <div className="relative z-10 mt-8 pt-6 border-t border-white/15 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setActiveSubTab('single')}
            className={`px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 shadow-sm ${
              activeSubTab === 'single'
                ? 'bg-yellow-400 text-blue-950 shadow-md scale-105'
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            <span>👤</span>
            <span>Single Student Entry</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('batch')}
            className={`px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 shadow-sm ${
              activeSubTab === 'batch'
                ? 'bg-yellow-400 text-blue-950 shadow-md scale-105'
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            <span>📋</span>
            <span>Batch Class Grade Sheet</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('ledger')}
            className={`px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 shadow-sm ${
              activeSubTab === 'ledger'
                ? 'bg-yellow-400 text-blue-950 shadow-md scale-105'
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            <span>📚</span>
            <span>All Recorded Grades Ledger ({results.length})</span>
          </button>
        </div>
      </div>

      {/* ======================================================================== */}
      {/* 1. SINGLE STUDENT GRADE ENTRY FORM */}
      {/* ======================================================================== */}
      {activeSubTab === 'single' && (
        <div className="grid lg:grid-cols-12 gap-8 items-start">
          {/* Form Side (7 Cols) */}
          <div className="lg:col-span-7 bg-white rounded-3xl p-6 sm:p-8 border-2 border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-xl font-serif font-black text-blue-950">
                  Input Assessment Score
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Select student, choose mode (Test only, Exam only, or Both), and record marks.
                </p>
              </div>
              <span className="px-3 py-1 bg-blue-100 text-blue-900 rounded-full text-[10px] font-black uppercase">
                Direct Entry
              </span>
            </div>

            {saveSuccessMsg && (
              <div className="p-4 bg-emerald-50 border-2 border-emerald-300 rounded-2xl text-emerald-900 text-xs font-bold flex items-center gap-2 animate-fade-in">
                <span className="text-lg">✓</span>
                <span>{saveSuccessMsg}</span>
              </div>
            )}

            <form onSubmit={handleSaveSingleGrade} className="space-y-6">
              {/* Filter & Select Student */}
              <div className="space-y-3 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                      Filter By Class
                    </label>
                    <select
                      value={singleGradeClass}
                      onChange={(e) => setSingleGradeClass(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-blue-900 outline-none"
                    >
                      <option value="all">All Classes ({students.length} pupils)</option>
                      {GRADE_ORDER.map(g => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                      Search Name / Student ID
                    </label>
                    <input
                      type="text"
                      placeholder="Type name or ID..."
                      value={studentSearchQuery}
                      onChange={(e) => setStudentSearchQuery(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-blue-900 outline-none placeholder-slate-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black text-blue-950 uppercase tracking-wider mb-1.5">
                    Select Target Student / Pupil *
                  </label>
                  <select
                    required
                    value={selectedStudentId}
                    onChange={(e) => setSelectedStudentId(e.target.value)}
                    className="w-full px-4 py-3 bg-white border-2 border-blue-900/20 rounded-xl font-black text-sm text-blue-950 outline-none focus:border-blue-900 shadow-sm"
                  >
                    <option value="">-- Choose Pupil ({filteredStudents.length} Available) --</option>
                    {filteredStudents.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.grade}) • ID: {s.id} {s.nin ? `• NIN: ${s.nin}` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Assessment Mode Selector */}
              <div className="space-y-2">
                <label className="block text-xs font-black text-blue-950 uppercase tracking-wider">
                  Assessment Input Mode
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => handleModeSwitch('both')}
                    className={`p-3 rounded-2xl border-2 font-black text-xs uppercase tracking-wider text-center transition-all ${
                      gradingMode === 'both'
                        ? 'bg-blue-900 text-yellow-300 border-blue-900 shadow-md'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <span className="block text-base mb-1">📊</span>
                    <span>Test & Exam</span>
                    <span className="block text-[9px] font-normal opacity-80">CA(40) + Exam(60)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleModeSwitch('test_only')}
                    className={`p-3 rounded-2xl border-2 font-black text-xs uppercase tracking-wider text-center transition-all ${
                      gradingMode === 'test_only'
                        ? 'bg-blue-900 text-yellow-300 border-blue-900 shadow-md'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <span className="block text-base mb-1">🧪</span>
                    <span>Test (CA) Only</span>
                    <span className="block text-[9px] font-normal opacity-80">Mid-Term Assessment</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleModeSwitch('exam_only')}
                    className={`p-3 rounded-2xl border-2 font-black text-xs uppercase tracking-wider text-center transition-all ${
                      gradingMode === 'exam_only'
                        ? 'bg-blue-900 text-yellow-300 border-blue-900 shadow-md'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <span className="block text-base mb-1">📝</span>
                    <span>Exam Only</span>
                    <span className="block text-[9px] font-normal opacity-80">Terminal Exam</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleModeSwitch('total_only')}
                    className={`p-3 rounded-2xl border-2 font-black text-xs uppercase tracking-wider text-center transition-all ${
                      gradingMode === 'total_only'
                        ? 'bg-blue-900 text-yellow-300 border-blue-900 shadow-md'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <span className="block text-base mb-1">🎯</span>
                    <span>Total Only</span>
                    <span className="block text-[9px] font-normal opacity-80">Direct Total (0-100)</span>
                  </button>
                </div>
              </div>

              {/* Subject Selection */}
              <div className="space-y-2">
                <label className="block text-xs font-black text-blue-950 uppercase tracking-wider">
                  Subject *
                </label>
                <div className="grid sm:grid-cols-2 gap-3">
                  <select
                    required
                    value={selectedSubject}
                    onChange={(e) => setSelectedSubject(e.target.value)}
                    className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl font-bold text-xs text-blue-900 outline-none focus:border-blue-900"
                  >
                    <option value="">-- Select Subject from Curriculum --</option>
                    {cleanCourseSubjects.map(subj => (
                      <option key={subj} value={subj}>{subj}</option>
                    ))}
                    <option value="__custom__">➕ Type Custom Subject Name...</option>
                  </select>

                  <select
                    value={selectedTerm}
                    onChange={(e) => setSelectedTerm(e.target.value)}
                    className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl font-bold text-xs text-blue-900 outline-none focus:border-blue-900"
                  >
                    <option value="First Term">First Term</option>
                    <option value="Second Term">Second Term</option>
                    <option value="Third Term">Third Term</option>
                  </select>
                </div>

                {selectedSubject === '__custom__' && (
                  <input
                    type="text"
                    required
                    placeholder="Enter custom subject name..."
                    value={customSubject}
                    onChange={(e) => setCustomSubject(e.target.value)}
                    className="w-full px-4 py-2.5 bg-yellow-50 border-2 border-yellow-400 rounded-xl text-xs font-bold text-blue-950 outline-none"
                  />
                )}
              </div>

              {/* Score Allocation Inputs */}
              <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <span className="text-xs font-black uppercase text-blue-950">
                    Scores Allocation ({gradingMode.replace('_', ' ').toUpperCase()})
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    Max: {gradingMode === 'test_only' ? '40' : gradingMode === 'exam_only' ? '60' : '100'}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  {/* CA Score */}
                  <div className={`space-y-1.5 ${gradingMode === 'exam_only' ? 'opacity-40 pointer-events-none' : ''}`}>
                    <label className="block text-[10px] font-black uppercase text-slate-500 text-center">
                      CA Test (0-40)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="40"
                      step="any"
                      required={gradingMode === 'both' || gradingMode === 'test_only'}
                      value={caScore}
                      onChange={(e) => handleCaChange(parseFloat(e.target.value) || 0)}
                      className="w-full py-3 px-2 bg-white border-2 border-slate-200 rounded-xl font-mono font-black text-center text-blue-950 text-base outline-none focus:border-blue-900"
                    />
                    <span className="block text-[9px] text-slate-400 text-center">Test Marks</span>
                  </div>

                  {/* Exam Score */}
                  <div className={`space-y-1.5 ${gradingMode === 'test_only' ? 'opacity-40 pointer-events-none' : ''}`}>
                    <label className="block text-[10px] font-black uppercase text-slate-500 text-center">
                      Exam (0-60)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="60"
                      step="any"
                      required={gradingMode === 'both' || gradingMode === 'exam_only'}
                      value={examScore}
                      onChange={(e) => handleExamChange(parseFloat(e.target.value) || 0)}
                      className="w-full py-3 px-2 bg-white border-2 border-slate-200 rounded-xl font-mono font-black text-center text-blue-950 text-base outline-none focus:border-blue-900"
                    />
                    <span className="block text-[9px] text-slate-400 text-center">Exam Marks</span>
                  </div>

                  {/* Total Cumulative Score */}
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-black uppercase text-blue-900 text-center">
                      Total (0-100)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="any"
                      required
                      value={totalScore}
                      onChange={(e) => handleTotalChange(parseFloat(e.target.value) || 0)}
                      className="w-full py-3 px-2 bg-yellow-100 border-2 border-yellow-400 rounded-xl font-mono font-black text-center text-blue-950 text-lg outline-none"
                    />
                    {(() => {
                      const info = getGradeInfo(totalScore);
                      return (
                        <span className="block text-[10px] font-black text-blue-900 text-center">
                          {info.letter} ({info.remark})
                        </span>
                      );
                    })()}
                  </div>
                </div>
              </div>

              {/* Examiner Name & Publish Toggle */}
              <div className="grid sm:grid-cols-2 gap-4 items-center">
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">
                    Recorded By / Examiner Signature
                  </label>
                  <input
                    type="text"
                    value={examinerName}
                    onChange={(e) => setExaminerName(e.target.value)}
                    placeholder="e.g. School Administrator"
                    className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-blue-950 outline-none"
                  />
                </div>

                <div className="flex items-center gap-2 pt-4">
                  <input
                    type="checkbox"
                    id="admin-publish-grade-imm"
                    checked={publishImmediately}
                    onChange={(e) => setPublishImmediately(e.target.checked)}
                    className="w-4 h-4 text-blue-900 rounded cursor-pointer"
                  />
                  <label htmlFor="admin-publish-grade-imm" className="text-xs font-black text-blue-950 cursor-pointer">
                    Publish immediately to student & parent portals
                  </label>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-4 bg-blue-900 hover:bg-blue-800 text-yellow-400 font-black text-sm uppercase tracking-wider rounded-2xl shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                <span>💾</span>
                <span>Save Assessment Mark Directly to System</span>
              </button>
            </form>
          </div>

          {/* Student Profile Preview & Recent Scores (5 Cols) */}
          <div className="lg:col-span-5 space-y-6">
            {selectedStudentObj ? (
              <div className="bg-gradient-to-br from-slate-900 to-blue-950 text-white rounded-3xl p-6 border-2 border-yellow-400/50 shadow-xl space-y-5">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-white/10 border-2 border-yellow-400 overflow-hidden flex items-center justify-center text-2xl font-black text-yellow-300 shrink-0">
                    {selectedStudentObj.photo ? (
                      <img src={selectedStudentObj.photo} alt={selectedStudentObj.name} className="w-full h-full object-cover" />
                    ) : (
                      <span>{selectedStudentObj.name.charAt(0)}</span>
                    )}
                  </div>
                  <div>
                    <h4 className="font-serif font-black text-xl text-yellow-300">
                      {selectedStudentObj.name}
                    </h4>
                    <p className="text-xs text-blue-200 font-mono">
                      ID: {selectedStudentObj.id} • Class: {selectedStudentObj.grade}
                    </p>
                    <p className="text-[11px] text-slate-300 mt-0.5">
                      {selectedStudentObj.nin ? `NIN: ${selectedStudentObj.nin}` : 'NIN: Not yet linked'}
                    </p>
                  </div>
                </div>

                <div className="border-t border-white/15 pt-4 space-y-3">
                  <h5 className="text-xs font-black uppercase text-yellow-400 tracking-wider">
                    Existing Terminal Marks for {selectedStudentObj.name.split(' ')[0]} ({selectedTerm})
                  </h5>
                  {(() => {
                    const studentTermResults = results.filter(
                      r => (r.studentId === selectedStudentObj.id || r.studentName.toLowerCase() === selectedStudentObj.name.toLowerCase()) &&
                           r.term.toLowerCase() === selectedTerm.toLowerCase()
                    );

                    if (studentTermResults.length === 0) {
                      return (
                        <p className="text-xs text-slate-400 italic">
                          No assessment marks recorded for {selectedTerm} yet.
                        </p>
                      );
                    }

                    return (
                      <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                        {studentTermResults.map(r => {
                          const info = getGradeInfo(r.score);
                          return (
                            <div key={r.id} className="p-3 bg-white/10 rounded-xl border border-white/10 flex items-center justify-between text-xs">
                              <div>
                                <p className="font-black text-white">{formatSubjectName(r.subject)}</p>
                                <p className="text-[10px] text-blue-200">
                                  CA: {r.caScore ?? '-'} • Exam: {r.examScore ?? '-'} • Total: {r.score}%
                                </p>
                              </div>
                              <div className="text-right flex items-center gap-2">
                                <span className="px-2.5 py-1 bg-yellow-400 text-blue-950 rounded-lg font-black text-xs">
                                  {info.letter}
                                </span>
                                {onDeleteResult && (
                                  <button
                                    type="button"
                                    onClick={() => onDeleteResult(r.id)}
                                    className="text-red-400 hover:text-red-300 font-black p-1"
                                    title="Delete this grade"
                                  >
                                    ✕
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              </div>
            ) : (
              <div className="p-8 bg-slate-100 rounded-3xl text-center text-slate-400 text-xs font-bold">
                No student selected.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================================== */}
      {/* 2. BATCH CLASS GRADE SHEET */}
      {/* ======================================================================== */}
      {activeSubTab === 'batch' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border-2 border-slate-200 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div>
              <h3 className="text-xl font-serif font-black text-blue-950">
                Batch Class Assessment Sheet
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Enter CA test and examination marks for an entire class at once, row by row.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleSaveAllBatchGrades}
                className="px-6 py-3 bg-blue-900 hover:bg-blue-800 text-yellow-400 rounded-2xl font-black text-xs uppercase tracking-wider transition-all shadow-md active:scale-95 flex items-center gap-2"
              >
                <span>💾</span>
                <span>Save All Class Marks ({batchStudents.length} Pupils)</span>
              </button>
            </div>
          </div>

          {batchSaveMsg && (
            <div className="p-4 bg-emerald-50 border-2 border-emerald-300 rounded-2xl text-emerald-900 text-xs font-bold flex items-center gap-2 animate-fade-in">
              <span className="text-lg">✓</span>
              <span>{batchSaveMsg}</span>
            </div>
          )}

          {/* Batch Selector Bar */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 grid sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">
                Class Grade
              </label>
              <select
                value={batchGrade}
                onChange={(e) => setBatchGrade(e.target.value as GradeLevel)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-blue-900 outline-none"
              >
                {GRADE_ORDER.map(g => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">
                Subject
              </label>
              <select
                value={batchSubject}
                onChange={(e) => setBatchSubject(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-blue-900 outline-none"
              >
                {cleanCourseSubjects.map(subj => (
                  <option key={subj} value={subj}>{subj}</option>
                ))}
                <option value="__custom__">➕ Custom Subject...</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">
                Academic Term
              </label>
              <select
                value={batchTerm}
                onChange={(e) => setBatchTerm(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-blue-900 outline-none"
              >
                <option value="First Term">First Term</option>
                <option value="Second Term">Second Term</option>
                <option value="Third Term">Third Term</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">
                Input Scope
              </label>
              <select
                value={batchMode}
                onChange={(e) => setBatchMode(e.target.value as any)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-blue-900 outline-none"
              >
                <option value="both">Both CA Test & Exam (100)</option>
                <option value="test_only">Test / CA Only (40)</option>
                <option value="exam_only">Exam Only (60)</option>
              </select>
            </div>
          </div>

          {batchSubject === '__custom__' && (
            <input
              type="text"
              placeholder="Enter custom subject for this class..."
              value={customBatchSubject}
              onChange={(e) => setCustomBatchSubject(e.target.value)}
              className="w-full px-4 py-2 bg-yellow-50 border-2 border-yellow-400 rounded-xl text-xs font-bold text-blue-950 outline-none"
            />
          )}

          {/* Students Class Table */}
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-left text-xs min-w-[700px]">
              <thead className="bg-slate-100 text-slate-500 text-[10px] font-black uppercase tracking-wider">
                <tr>
                  <th className="p-3 w-10 text-center">#</th>
                  <th className="p-3">Student Name</th>
                  <th className="p-3 w-36">Student ID</th>
                  {batchMode !== 'exam_only' && <th className="p-3 w-28 text-center">CA Test (0-40)</th>}
                  {batchMode !== 'test_only' && <th className="p-3 w-28 text-center">Exam (0-60)</th>}
                  <th className="p-3 w-28 text-center">Total (100)</th>
                  <th className="p-3 w-28 text-center">Grade & Remark</th>
                  <th className="p-3 w-32 text-center">Current Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {batchStudents.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-10 text-center text-slate-400 font-bold uppercase text-xs">
                      No pupils enrolled in {batchGrade}.
                    </td>
                  </tr>
                ) : (
                  batchStudents.map((st, idx) => {
                    const existing = existingBatchResultsMap.get(st.id) || existingBatchResultsMap.get(st.name.toLowerCase());
                    const input = batchScores[st.id] || {
                      ca: existing?.caScore ?? 0,
                      exam: existing?.examScore ?? 0,
                      total: existing?.score ?? 0
                    };
                    const computedTotal = (batchMode === 'test_only') ? input.ca : (batchMode === 'exam_only') ? input.exam : (input.ca + input.exam);
                    const gradeInfo = getGradeInfo(computedTotal);

                    return (
                      <tr key={st.id} className="hover:bg-blue-50/30 transition-colors">
                        <td className="p-3 text-center font-bold text-slate-400">{idx + 1}</td>
                        <td className="p-3 font-black text-blue-950">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-900 font-black text-[10px] flex items-center justify-center">
                              {st.name.charAt(0)}
                            </span>
                            <span>{st.name}</span>
                          </div>
                        </td>
                        <td className="p-3 font-mono text-[11px] text-slate-500">{st.id}</td>

                        {batchMode !== 'exam_only' && (
                          <td className="p-2 text-center">
                            <input
                              type="number"
                              min="0"
                              max="40"
                              value={input.ca}
                              onChange={(e) => handleBatchScoreInput(st.id, 'ca', parseFloat(e.target.value) || 0)}
                              className="w-20 px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-center font-mono font-bold text-xs text-blue-950 focus:bg-white focus:border-blue-900 outline-none"
                            />
                          </td>
                        )}

                        {batchMode !== 'test_only' && (
                          <td className="p-2 text-center">
                            <input
                              type="number"
                              min="0"
                              max="60"
                              value={input.exam}
                              onChange={(e) => handleBatchScoreInput(st.id, 'exam', parseFloat(e.target.value) || 0)}
                              className="w-20 px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-center font-mono font-bold text-xs text-blue-950 focus:bg-white focus:border-blue-900 outline-none"
                            />
                          </td>
                        )}

                        <td className="p-3 text-center font-mono font-black text-sm text-blue-900">
                          {computedTotal}%
                        </td>

                        <td className="p-3 text-center">
                          <span className="px-2 py-0.5 rounded font-black text-[10px] bg-blue-100 text-blue-900">
                            {gradeInfo.letter} - {gradeInfo.remark}
                          </span>
                        </td>

                        <td className="p-3 text-center">
                          {existing ? (
                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded text-[10px] font-bold">
                              ✓ Recorded
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-[10px] font-bold">
                              Pending
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={handleSaveAllBatchGrades}
              className="px-8 py-3.5 bg-blue-900 hover:bg-blue-800 text-yellow-400 rounded-2xl font-black text-xs uppercase tracking-wider transition-all shadow-md active:scale-95"
            >
              ✓ Save All Recorded Grades for {batchGrade}
            </button>
          </div>
        </div>
      )}

      {/* ======================================================================== */}
      {/* 3. ALL RECORDED GRADES LEDGER */}
      {/* ======================================================================== */}
      {activeSubTab === 'ledger' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border-2 border-slate-200 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div>
              <h3 className="text-xl font-serif font-black text-blue-950">
                School Master Grades Ledger
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Comprehensive database of all terminal and continuous assessment marks recorded in the system.
              </p>
            </div>
            <span className="px-3 py-1 bg-yellow-400 text-blue-950 font-black text-xs uppercase rounded-xl">
              {filteredLedgerResults.length} / {results.length} Records
            </span>
          </div>

          {/* Ledger Filter Row */}
          <div className="grid sm:grid-cols-3 gap-3">
            <input
              type="text"
              placeholder="Search student or subject..."
              value={ledgerSearch}
              onChange={(e) => setLedgerSearch(e.target.value)}
              className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-blue-900 outline-none focus:border-blue-900 placeholder-slate-400"
            />

            <select
              value={ledgerGradeFilter}
              onChange={(e) => setLedgerGradeFilter(e.target.value)}
              className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-blue-900 outline-none"
            >
              <option value="all">All Classes ({GRADE_ORDER.length})</option>
              {GRADE_ORDER.map(g => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>

            <select
              value={ledgerTermFilter}
              onChange={(e) => setLedgerTermFilter(e.target.value)}
              className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-blue-900 outline-none"
            >
              <option value="all">All Terms</option>
              <option value="First Term">First Term</option>
              <option value="Second Term">Second Term</option>
              <option value="Third Term">Third Term</option>
            </select>
          </div>

          {/* Ledger Table */}
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-left text-xs min-w-[750px]">
              <thead className="bg-slate-100 text-slate-500 text-[10px] font-black uppercase tracking-wider">
                <tr>
                  <th className="p-3 w-10 text-center">#</th>
                  <th className="p-3">Student Name</th>
                  <th className="p-3">Class</th>
                  <th className="p-3">Subject</th>
                  <th className="p-3 text-center">CA (40)</th>
                  <th className="p-3 text-center">Exam (60)</th>
                  <th className="p-3 text-center">Total (100)</th>
                  <th className="p-3 text-center">Grade</th>
                  <th className="p-3">Term</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLedgerResults.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="p-12 text-center text-slate-400 font-bold uppercase text-xs">
                      No assessment records match your filter criteria.
                    </td>
                  </tr>
                ) : (
                  filteredLedgerResults.map((r, idx) => {
                    const gradeInfo = getGradeInfo(r.score);
                    return (
                      <tr key={r.id || idx} className="hover:bg-blue-50/30 transition-colors">
                        <td className="p-3 text-center font-bold text-slate-400">{idx + 1}</td>
                        <td className="p-3 font-black text-blue-950">{r.studentName}</td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 bg-slate-100 rounded text-[10px] font-bold text-slate-700">
                            {r.grade}
                          </span>
                        </td>
                        <td className="p-3 font-bold text-blue-900">{formatSubjectName(r.subject)}</td>
                        <td className="p-3 text-center font-mono text-slate-600">{r.caScore ?? '-'}</td>
                        <td className="p-3 text-center font-mono text-slate-600">{r.examScore ?? '-'}</td>
                        <td className="p-3 text-center font-mono font-black text-sm text-blue-900">{r.score}%</td>
                        <td className="p-3 text-center">
                          <span className="px-2 py-0.5 bg-yellow-100 text-blue-950 font-black text-[10px] rounded">
                            {gradeInfo.letter}
                          </span>
                        </td>
                        <td className="p-3 text-[11px] text-slate-500 font-bold">{r.term}</td>
                        <td className="p-3 text-right">
                          {onDeleteResult && (
                            <button
                              type="button"
                              onClick={() => {
                                if (confirm(`Delete grade for ${r.studentName} (${r.subject})?`)) {
                                  onDeleteResult(r.id);
                                }
                              }}
                              className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-[10px] font-black uppercase transition-all"
                            >
                              Delete
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
