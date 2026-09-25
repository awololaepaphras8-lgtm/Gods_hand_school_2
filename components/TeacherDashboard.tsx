
import React, { useState, useEffect, useRef } from 'react';
import { Course, StudentResult, GradeLevel, StudentAccount, AttendanceRecord, StaffPagePermission, ALL_STAFF_PAGES, Announcement, ResultPublishRequest, TimedStaffDelegation, AdminSectionKey, ALL_ADMIN_SECTIONS, ClassTimetable, ParentStaffMessage, ParentAccount } from '../types';
import { GRADE_GROUPS, getNextGradeLevel } from '../constants';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { StandardReportCard } from './StandardReportCard';
import { computeClassRankings, computeSubjectRankings, formatOrdinal } from '../utils/ranking';
import { ClassTimetableManager } from './ClassTimetableManager';

interface TeacherDashboardProps {
  username: string;
  assignedGrades: GradeLevel[];
  allStudents: StudentAccount[];
  courses: Course[];
  results: StudentResult[];
  attendance: AttendanceRecord[];
  calendar?: string;
  announcements?: Announcement[];
  allowedPages?: StaffPagePermission[];
  resultPublishRequests?: ResultPublishRequest[];
  timedStaffDelegations?: TimedStaffDelegation[];
  timetables?: ClassTimetable[];
  parentMessages?: ParentStaffMessage[];
  parents?: ParentAccount[];
  onOpenAdminDelegation?: (sectionKey?: AdminSectionKey) => void;
  onAddCourse: (name: string, grade: GradeLevel, description: string) => void;
  onDuplicateCourse?: (courseId: string, targetGrades: GradeLevel[]) => void;
  onAddResult: (result: Omit<StudentResult, 'id' | 'date' | 'teacherName'>) => void;
  onMarkAttendance: (studentId: string, term?: string) => boolean;
  onBatchMarkAttendance?: (records: { studentId: string; date: string; term: string; markedBy: string }[]) => void;
  onShiftStudent: (studentId: string) => void;
  onBatchShiftStudents?: (studentIds: string[]) => void;
  onSaveTimetable?: (timetable: ClassTimetable) => void;
  onRequestPublishResults?: (grade: GradeLevel, term: string, subject?: string) => void;
  onSendResultsToPupils?: (grade: GradeLevel, term: string) => void;
  onSendParentMessage?: (msg: Omit<ParentStaffMessage, 'id' | 'timestamp'>) => void;
  onOpenParentMessaging?: () => void;
}

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({
  username,
  assignedGrades = [],
  allStudents,
  courses,
  results,
  attendance,
  calendar,
  announcements = [],
  allowedPages,
  resultPublishRequests = [],
  timedStaffDelegations = [],
  timetables = [],
  parentMessages = [],
  parents = [],
  onOpenAdminDelegation,
  onAddCourse,
  onDuplicateCourse,
  onAddResult,
  onMarkAttendance,
  onBatchMarkAttendance,
  onShiftStudent,
  onBatchShiftStudents,
  onSaveTimetable,
  onRequestPublishResults,
  onSendResultsToPupils,
  onSendParentMessage,
  onOpenParentMessaging
}) => {
  const [delegationNow, setDelegationNow] = useState<Date>(new Date());
  const [parentReplyText, setParentReplyText] = useState<{ [msgId: string]: string }>({});

  useEffect(() => {
    const timer = setInterval(() => {
      setDelegationNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const activeDelegation = (timedStaffDelegations || []).find(
    d => d.teacherUsername === username && d.status === 'active' && new Date(d.expiresAt).getTime() > delegationNow.getTime()
  );

  // Determine available tabs based on admin-configured page permissions
  const availableTabs = ALL_STAFF_PAGES.filter(p => !allowedPages || allowedPages.includes(p.id));
  const initialTab = availableTabs[0]?.id || 'overview';
  const [activeTab, setActiveTab] = useState<'overview' | 'courses' | 'students' | 'grading' | 'attendance' | 'termStats' | 'timetable' | 'parentMessages'>(initialTab as any);

  useEffect(() => {
    if (availableTabs.length > 0 && !availableTabs.some(t => t.id === activeTab)) {
      setActiveTab(availableTabs[0].id as any);
    }
  }, [allowedPages, availableTabs.length]);

  // Staff class assignment restriction: Staff can ONLY grade and manage their assigned class(es)
  const hasAssignedGrades = assignedGrades && assignedGrades.length > 0;
  const authorizedGrades: GradeLevel[] = hasAssignedGrades 
    ? assignedGrades 
    : (GRADE_GROUPS.flatMap(g => g.levels) as GradeLevel[]);
  
  // Only students belonging to the staff's assigned classes
  const staffStudents = hasAssignedGrades
    ? allStudents.filter(s => assignedGrades.includes(s.grade))
    : allStudents;
  
  // Course form state
  const [courseName, setCourseName] = useState('');
  const [courseGrade, setCourseGrade] = useState<GradeLevel>(authorizedGrades[0] || 'Primary 1');
  const [courseDesc, setCourseDesc] = useState('');

  // Course duplication state for teachers
  const [duplicateCourseId, setDuplicateCourseId] = useState<string | null>(null);
  const [targetDuplicateGrades, setTargetDuplicateGrades] = useState<GradeLevel[]>([]);

  // Grading form state with CA (40%), Exam (60%), and Total (100%)
  const [gradeClassFilter, setGradeClassFilter] = useState<string>(authorizedGrades[0] || 'all');
  const [selectedStudent, setSelectedStudent] = useState<string>('');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [customSubject, setCustomSubject] = useState<string>('');
  const [caScore, setCaScore] = useState<number>(0);
  const [examScore, setExamScore] = useState<number>(0);
  const [totalScore, setTotalScore] = useState<number>(0);
  const [term, setTerm] = useState<string>('First Term');
  const [publishFeedback, setPublishFeedback] = useState<string | null>(null);

  // Scanner status & Term state
  const [scannerTerm, setScannerTerm] = useState<string>('First Term');
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const [previewStudentReport, setPreviewStudentReport] = useState<StudentAccount | null>(null);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  // Attendance Sub-Mode: 'checklist' (Roll Call by Names) vs 'scanner' (QR Camera)
  const [attendanceMode, setAttendanceMode] = useState<'checklist' | 'scanner'>('checklist');
  const [checklistClass, setChecklistClass] = useState<GradeLevel>(authorizedGrades[0] || 'Basic 1');
  const [checklistDate, setChecklistDate] = useState<string>(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });
  const [checklistTerm, setChecklistTerm] = useState<string>('First Term');
  const [checkedStudentIds, setCheckedStudentIds] = useState<string[]>([]);
  const [attendanceSubmitSuccess, setAttendanceSubmitSuccess] = useState<string | null>(null);
  const [isSubmittingAttendance, setIsSubmittingAttendance] = useState(false);

  // Students in selected checklist class
  const checklistClassStudents = allStudents.filter(s => s.grade === checklistClass);

  // Synchronize checkedStudentIds with attendance state when class, date, or term changes
  useEffect(() => {
    if (!checklistDate) return;
    const [y, m, d] = checklistDate.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    const localeDate = dateObj.toLocaleDateString();

    const alreadyPresentSet = new Set(
      attendance
        .filter(a => (a.date === localeDate || a.date === checklistDate) && (a.term === checklistTerm || (!a.term && checklistTerm === 'First Term')))
        .map(a => a.studentId)
    );

    const classStudentIds = checklistClassStudents.map(s => s.id);
    const presentInClass = classStudentIds.filter(id => alreadyPresentSet.has(id));
    setCheckedStudentIds(presentInClass);
  }, [checklistClass, checklistDate, checklistTerm, attendance, checklistClassStudents.length]);

  const toggleStudentCheck = (studentId: string) => {
    setCheckedStudentIds(prev => 
      prev.includes(studentId) ? prev.filter(id => id !== studentId) : [...prev, studentId]
    );
    setAttendanceSubmitSuccess(null);
  };

  const handleSelectAllPresent = () => {
    setCheckedStudentIds(checklistClassStudents.map(s => s.id));
    setAttendanceSubmitSuccess(null);
  };

  const handleDeselectAll = () => {
    setCheckedStudentIds([]);
    setAttendanceSubmitSuccess(null);
  };

  const handleSubmitChecklistAttendance = () => {
    if (checklistClassStudents.length === 0) return;
    setIsSubmittingAttendance(true);

    const [y, m, d] = checklistDate.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    const localeDate = dateObj.toLocaleDateString();

    const recordsToSubmit = checkedStudentIds.map(studentId => ({
      studentId,
      date: localeDate,
      term: checklistTerm,
      markedBy: `${username} (Roll Call Checklist)`
    }));

    if (onBatchMarkAttendance) {
      onBatchMarkAttendance(recordsToSubmit);
    } else {
      recordsToSubmit.forEach(rec => {
        onMarkAttendance(rec.studentId, rec.term);
      });
    }

    setTimeout(() => {
      setIsSubmittingAttendance(false);
      setAttendanceSubmitSuccess(
        `✓ Daily attendance successfully submitted! ${checkedStudentIds.length} of ${checklistClassStudents.length} pupils in ${checklistClass} marked Present for ${localeDate} (${checklistTerm}).`
      );
    }, 250);
  };

  // Filter students strictly according to staff assigned classes
  const filteredStudents = gradeClassFilter === 'all' 
    ? staffStudents 
    : staffStudents.filter(s => s.grade === gradeClassFilter);
  const myResults = results.filter(r => r.teacherName === username);
  const today = new Date().toLocaleDateString();
  const presentToday = attendance.filter(a => a.date === today && filteredStudents.some(s => s.id === a.studentId));

  useEffect(() => {
    if (activeTab === 'attendance' && attendanceMode === 'scanner' && !scannerRef.current) {
      const scanner = new Html5QrcodeScanner(
        "reader", 
        { fps: 10, qrbox: { width: 250, height: 250 } },
        /* verbose= */ false
      );
      
      scanner.render((decodedText) => {
        if (decodedText.startsWith('GHS-ATT')) {
          let actualId = '';
          let recordTerm = scannerTerm;

          if (decodedText.includes('|')) {
            const parts = decodedText.split('|');
            // Format: GHS-ATT|STU-12345|First Term|1700000000
            actualId = parts[1];
            if (parts[2]) {
              recordTerm = parts[2];
            }
          } else if (decodedText.startsWith('GHS-ATT-')) {
            const parts = decodedText.split('-');
            // Format: GHS-ATT-STU-TIMESTAMP-VERSION
            actualId = `${parts[2]}-${parts[3]}`;
          }
          
          const student = allStudents.find(s => s.id === actualId);
          if (student) {
            const success = onMarkAttendance(actualId, recordTerm);
            if (success) {
              setLastScanned(`Success: ${student.name} marked present for ${recordTerm}!`);
              setTimeout(() => setLastScanned(null), 3000);
            } else {
              setLastScanned(`${student.name} already marked today for ${recordTerm}.`);
              setTimeout(() => setLastScanned(null), 3000);
            }
          } else {
            setLastScanned("Error: Invalid Student ID");
            setTimeout(() => setLastScanned(null), 3000);
          }
        }
      }, (error) => {
        // Handle scanning errors silently
      });
      
      scannerRef.current = scanner;
    }

    return () => {
      if (scannerRef.current && (activeTab !== 'attendance' || attendanceMode !== 'scanner')) {
        scannerRef.current.clear().catch(err => console.error("Failed to clear scanner", err));
        scannerRef.current = null;
      }
    };
  }, [activeTab, attendanceMode, scannerTerm]);

  const handleAddCourse = (e: React.FormEvent) => {
    e.preventDefault();
    if (courseName) {
      onAddCourse(courseName, courseGrade, courseDesc);
      setCourseName('');
      setCourseDesc('');
      alert("New course added to curriculum!");
    }
  };

  const handleCaChange = (val: number) => {
    const num = isNaN(val) ? 0 : Math.max(0, Math.min(40, val));
    setCaScore(num);
    setTotalScore(Math.min(100, Math.round((num + examScore) * 10) / 10));
  };

  const handleExamChange = (val: number) => {
    const num = isNaN(val) ? 0 : Math.max(0, Math.min(60, val));
    setExamScore(num);
    setTotalScore(Math.min(100, Math.round((caScore + num) * 10) / 10));
  };

  const handleTotalChange = (val: number) => {
    const num = isNaN(val) ? 0 : Math.max(0, Math.min(100, val));
    setTotalScore(num);
  };

  const handleAddGrade = (e: React.FormEvent) => {
    e.preventDefault();
    const student = allStudents.find(s => s.id === selectedStudent);
    const finalSubject = selectedSubject === '__custom__' ? customSubject.trim() : selectedSubject;

    if (!student) {
      alert("Please select a student or pupil.");
      return;
    }

    // Strict class restriction check: Staff can ONLY grade the class assigned to them!
    if (hasAssignedGrades && !assignedGrades.includes(student.grade)) {
      alert(`Access Denied: As a staff member, you are only authorized to grade students in your assigned class(es): ${assignedGrades.join(', ')}.`);
      return;
    }

    if (!finalSubject) {
      alert("Please specify a subject name.");
      return;
    }

    const calculatedTotal = parseFloat(totalScore.toString()) || (caScore + examScore);
    if (calculatedTotal < 0 || calculatedTotal > 100) {
      alert("Total score must be between 0 and 100.");
      return;
    }

    onAddResult({
      studentName: student.name,
      grade: student.grade,
      subject: finalSubject,
      caScore: caScore,
      examScore: examScore,
      score: calculatedTotal,
      term: term
    });

    setCaScore(0);
    setExamScore(0);
    setTotalScore(0);
    setCustomSubject('');
    alert(`Assessment successfully recorded for ${student.name} (${finalSubject})!\nCA: ${caScore}/40 • Exam: ${examScore}/60 • Total: ${calculatedTotal}%`);
  };

  // Active class for rankings and publication requests
  const activeClassForPublish: GradeLevel = (gradeClassFilter !== 'all' ? gradeClassFilter : (authorizedGrades[0] || 'Primary 1')) as GradeLevel;

  // Compute rankings for active class and term (positions 1st to last)
  const classRankingsMap = computeClassRankings(results, allStudents, activeClassForPublish, term);
  const classRankingsList = Array.from(classRankingsMap.values()).sort((a, b) => a.position - b.position);

  // Find latest publish request for active class and term
  const latestRequest = resultPublishRequests.find(
    req => req.grade === activeClassForPublish && req.term.toLowerCase() === term.toLowerCase()
  );

  const studentsInCurrentGrade = allStudents.filter(s => s.grade === activeClassForPublish);
  const resultsInCurrentGrade = results.filter(r => r.grade === activeClassForPublish && r.term.toLowerCase() === term.toLowerCase());

  const handleRequestPublish = (grade: GradeLevel, publishTerm: string) => {
    if (onRequestPublishResults) {
      onRequestPublishResults(grade, publishTerm);
      setPublishFeedback(`✓ Request dispatched to Administrator to allow publishing ${publishTerm} results to all pupils of ${grade}!`);
      setTimeout(() => setPublishFeedback(null), 6000);
    } else {
      alert(`Request dispatched to administrator for ${grade} (${publishTerm})!`);
    }
  };

  const handleSendToAllPupils = (grade: GradeLevel, publishTerm: string) => {
    if (onSendResultsToPupils) {
      onSendResultsToPupils(grade, publishTerm);
    }
    setPublishFeedback(`✓ Official ${publishTerm} results sent to all ${studentsInCurrentGrade.length} pupils of ${grade}!`);
    setTimeout(() => setPublishFeedback(null), 8000);
  };

  return (
    <div className="bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border-4 border-yellow-400">
      <div className="bg-blue-900 px-10 py-12 text-white relative">
        <div className="relative z-10">
          <h2 className="text-4xl font-black mb-2 font-serif">Welcome, {username}</h2>
          <div className="flex flex-wrap gap-2 mt-4">
            {assignedGrades.map(g => (
              <span key={g} className="px-3 py-1 bg-yellow-400 text-blue-900 rounded-lg text-[10px] font-black uppercase tracking-tighter shadow-md">
                Class: {g}
              </span>
            ))}
          </div>
          <p className="text-blue-200 font-bold uppercase text-xs tracking-[0.2em] mt-4">Academic Staff Portal • God's Hand International Model School</p>
        </div>
      </div>

      {/* Active Admin Delegation Banner */}
      {activeDelegation && (
        <div className="bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-400 p-6 sm:p-7 text-blue-950 border-b-4 border-yellow-600 shadow-inner">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1.5 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-950 text-yellow-400 text-xs font-black uppercase tracking-wider shadow-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Temporary Admin Access Granted</span>
                <span>•</span>
                <span>By: {activeDelegation.grantedBy}</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-serif font-black tracking-tight">
                Admin-Delegated Authority Active
              </h3>
              <p className="text-xs sm:text-sm font-bold text-blue-900/90 leading-snug">
                You have been granted temporary administrative privileges to {activeDelegation.grantedSections.length} admin panel module{activeDelegation.grantedSections.length === 1 ? '' : 's'}. 
                {activeDelegation.purpose && ` Purpose: "${activeDelegation.purpose}".`}
              </p>

              {/* Granted Modules Chips */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {activeDelegation.grantedSections.map(secKey => {
                  const config = ALL_ADMIN_SECTIONS.find(s => s.id === secKey);
                  return (
                    <span
                      key={secKey}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/90 text-blue-950 text-xs font-black shadow-xs"
                    >
                      <span>{config?.icon || '⚙️'}</span>
                      <span>{config?.label || secKey}</span>
                    </span>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 bg-white/95 p-4 rounded-2xl border-2 border-yellow-500/40 shadow-sm shrink-0">
              <div className="text-center sm:text-right pr-2">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Time Remaining</span>
                <span className="font-mono text-xl sm:text-2xl font-black text-blue-950">
                  {(() => {
                    const diff = new Date(activeDelegation.expiresAt).getTime() - delegationNow.getTime();
                    if (diff <= 0) return '00m 00s';
                    const totalSec = Math.floor(diff / 1000);
                    const m = Math.floor(totalSec / 60);
                    const s = totalSec % 60;
                    const h = Math.floor(m / 60);
                    if (h > 0) return `${h}h ${m % 60}m ${s}s`;
                    return `${m}m ${s}s`;
                  })()}
                </span>
              </div>

              {onOpenAdminDelegation && (
                <button
                  type="button"
                  onClick={() => onOpenAdminDelegation()}
                  className="px-5 py-3 bg-blue-950 hover:bg-blue-900 text-yellow-400 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg transition-all transform active:scale-95 flex items-center gap-2 border border-yellow-400"
                >
                  <span>🚀</span>
                  <span>Open Admin Panel</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {availableTabs.length > 0 ? (
        <div className="flex flex-wrap border-b-2 border-slate-100 bg-slate-50">
          {availableTabs.map(tab => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-7 py-5 font-black text-xs uppercase tracking-widest transition-all flex items-center space-x-2 ${
                activeTab === tab.id 
                  ? 'text-blue-900 border-b-4 border-blue-900 bg-white shadow-sm' 
                  : 'text-slate-400 hover:text-blue-700'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      ) : (
        <div className="p-12 text-center bg-amber-50 border-b-2 border-amber-200">
          <span className="text-4xl block mb-2">🔒</span>
          <h3 className="text-lg font-black text-amber-900 font-serif">Staff Module Access Restricted</h3>
          <p className="text-xs text-amber-700 font-medium max-w-md mx-auto mt-1">
            The School Administrator has not granted this account access to academic modules yet. Please contact the Proprietor or Admin to enable your module permissions.
          </p>
        </div>
      )}

      <div className="p-10">
        {availableTabs.length === 0 && (
          <div className="py-16 text-center text-slate-400">
            <p className="text-sm font-bold">No active permissions assigned. Access will appear once granted by Admin.</p>
          </div>
        )}

        {availableTabs.some(t => t.id === 'overview') && activeTab === 'overview' && (
          <div className="grid md:grid-cols-4 gap-8">
            <div className="p-8 bg-blue-50 rounded-3xl border-2 border-blue-100">
               <p className="text-slate-500 font-bold text-xs uppercase tracking-widest mb-2">Students & Pupils</p>
               <p className="text-5xl font-black text-blue-900">{filteredStudents.length}</p>
            </div>
            <div className="p-8 bg-green-50 rounded-3xl border-2 border-green-100">
               <p className="text-slate-500 font-bold text-xs uppercase tracking-widest mb-2">Present Today</p>
               <p className="text-5xl font-black text-green-700">{presentToday.length}</p>
            </div>
            <div className="p-8 bg-yellow-50 rounded-3xl border-2 border-yellow-100">
               <p className="text-slate-500 font-bold text-xs uppercase tracking-widest mb-2">Total Courses</p>
               <p className="text-5xl font-black text-blue-900">{courses.length}</p>
            </div>
            <div className="p-8 bg-indigo-50 rounded-3xl border-2 border-indigo-100">
               <p className="text-slate-500 font-bold text-xs uppercase tracking-widest mb-2">Results Uploaded</p>
               <p className="text-5xl font-black text-blue-900">{myResults.length}</p>
            </div>

            {/* Quick Pupil Promotion & Class Advancement Widget */}
            <div className="md:col-span-4 bg-gradient-to-r from-emerald-900 to-teal-950 text-white p-6 sm:p-8 rounded-3xl border-2 border-emerald-500/20 shadow-md">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-emerald-800/80 pb-4 mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">🎓</span>
                    <h4 className="font-serif font-black text-yellow-400 text-lg sm:text-xl">
                      Pupil Advancement & Next Class Promotion
                    </h4>
                  </div>
                  <p className="text-xs text-emerald-200 mt-0.5">
                    Move individual pupils or entire classes to the next academic grade level with 1-click.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('students')}
                  className="px-4 py-2 bg-yellow-400 hover:bg-yellow-300 text-blue-950 rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow-xs"
                >
                  View Full Registers & Promotion
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {authorizedGrades.map(g => {
                  const pupils = filteredStudents.filter(s => s.grade === g);
                  const nextG = getNextGradeLevel(g);
                  return (
                    <div key={g} className="bg-emerald-950/70 p-4 rounded-2xl border border-emerald-700/50 flex items-center justify-between gap-3">
                      <div>
                        <span className="text-xs font-black text-white block uppercase tracking-wider">{g}</span>
                        <span className="text-[11px] text-emerald-300 font-bold">{pupils.length} Pupils enrolled</span>
                      </div>
                      {pupils.length > 0 && nextG ? (
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`Advance all ${pupils.length} pupils in ${g} to ${nextG}?`)) {
                              if (onBatchShiftStudents) {
                                onBatchShiftStudents(pupils.map(p => p.id));
                              } else {
                                pupils.forEach(p => onShiftStudent(p.id));
                              }
                              alert(`Successfully promoted ${pupils.length} pupils from ${g} to ${nextG}!`);
                            }
                          }}
                          className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-[10px] font-black uppercase rounded-lg shadow-xs transition-all active:scale-95"
                          title={`Promote all ${g} pupils to ${nextG}`}
                        >
                          ➔ Next ({nextG})
                        </button>
                      ) : pupils.length > 0 ? (
                        <span className="text-[10px] text-emerald-300 font-bold">Graduating Class</span>
                      ) : (
                        <span className="text-[10px] text-emerald-400/60 italic">No pupils</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Live Academic Calendar & Notices */}
            <div className="md:col-span-4 grid lg:grid-cols-12 gap-8 mt-2">
              <div className="lg:col-span-7 bg-white p-8 rounded-3xl border-2 border-blue-100 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-3">
                    <span className="p-2.5 bg-yellow-400 text-blue-900 rounded-2xl text-xl">📅</span>
                    <div>
                      <h4 className="font-serif font-black text-blue-900 text-lg">School Academic Calendar</h4>
                      <p className="text-xs text-slate-400 font-bold">Term Resumption, Breaks, and Exams</p>
                    </div>
                  </div>
                  <span className="px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-[10px] font-black uppercase">
                    ● Realtime Live
                  </span>
                </div>
                {calendar ? (
                  <div className="p-5 bg-slate-50 rounded-2xl font-mono text-xs text-slate-700 whitespace-pre-wrap leading-relaxed border border-slate-200">
                    {calendar}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 font-bold italic">No calendar posted yet.</p>
                )}
              </div>

              <div className="lg:col-span-5 bg-white p-8 rounded-3xl border-2 border-blue-100 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-3">
                    <span className="p-2.5 bg-blue-900 text-yellow-400 rounded-2xl text-xl">📢</span>
                    <div>
                      <h4 className="font-serif font-black text-blue-900 text-lg">Staff & School Bulletins</h4>
                      <p className="text-xs text-slate-400 font-bold">{announcements.length} Published</p>
                    </div>
                  </div>
                </div>
                {announcements.length === 0 ? (
                  <p className="text-xs text-slate-400 font-bold italic">No bulletins published.</p>
                ) : (
                  <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
                    {announcements.map(ann => (
                      <div key={ann.id} className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100 space-y-1">
                        <div className="flex justify-between items-start">
                          <h5 className="font-serif font-black text-blue-950 text-xs">{ann.title}</h5>
                          <span className="text-[10px] text-slate-400 uppercase font-bold">{ann.date}</span>
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">{ann.content}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'attendance' && (
          <div className="space-y-8">
            {/* Top Mode Switcher Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b-2 border-slate-100 pb-4">
              <div>
                <h3 className="text-2xl font-black text-blue-900 font-serif">Staff Daily Attendance Portal</h3>
                <p className="text-xs text-slate-500 font-bold mt-1">
                  Mark daily student attendance either by roll call checklist or via student QR pass camera scanning.
                </p>
              </div>

              {/* Mode Toggle Tabs */}
              <div className="inline-flex p-1.5 bg-slate-100 rounded-2xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => setAttendanceMode('checklist')}
                  className={`px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                    attendanceMode === 'checklist'
                      ? 'bg-blue-900 text-yellow-400 shadow-md'
                      : 'text-slate-600 hover:text-blue-950'
                  }`}
                >
                  <span>📋</span>
                  <span>Checklist Roll Call</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAttendanceMode('scanner')}
                  className={`px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                    attendanceMode === 'scanner'
                      ? 'bg-blue-900 text-yellow-400 shadow-md'
                      : 'text-slate-600 hover:text-blue-950'
                  }`}
                >
                  <span>📷</span>
                  <span>QR Camera Scanner</span>
                </button>
              </div>
            </div>

            {/* CHECKLIST ROLL CALL MODE */}
            {attendanceMode === 'checklist' && (
              <div className="space-y-6">
                {/* Roll Call Controls Bar */}
                <div className="bg-slate-50 border-2 border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                    {/* Select Class */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-black text-blue-950 uppercase tracking-wider block">
                        Select Class / Grade
                      </label>
                      <select
                        value={checklistClass}
                        onChange={(e) => {
                          setChecklistClass(e.target.value as GradeLevel);
                          setAttendanceSubmitSuccess(null);
                        }}
                        className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-2xl font-black text-xs text-blue-950 outline-none focus:border-blue-900 transition-all"
                      >
                        {authorizedGrades.map(lvl => (
                          <option key={lvl} value={lvl}>{lvl}</option>
                        ))}
                      </select>
                    </div>

                    {/* Select Date */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <label className="text-xs font-black text-blue-950 uppercase tracking-wider block">
                          Attendance Date
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            const d = new Date();
                            const year = d.getFullYear();
                            const month = String(d.getMonth() + 1).padStart(2, '0');
                            const day = String(d.getDate()).padStart(2, '0');
                            setChecklistDate(`${year}-${month}-${day}`);
                          }}
                          className="text-[10px] font-black text-blue-700 hover:text-blue-900 uppercase underline"
                        >
                          Today
                        </button>
                      </div>
                      <input
                        type="date"
                        value={checklistDate}
                        onChange={(e) => {
                          setChecklistDate(e.target.value);
                          setAttendanceSubmitSuccess(null);
                        }}
                        className="w-full px-4 py-2.5 bg-white border-2 border-slate-200 rounded-2xl font-black text-xs text-blue-950 outline-none focus:border-blue-900 transition-all"
                      />
                    </div>

                    {/* Academic Term */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-black text-blue-950 uppercase tracking-wider block">
                        Academic Term
                      </label>
                      <select
                        value={checklistTerm}
                        onChange={(e) => {
                          setChecklistTerm(e.target.value);
                          setAttendanceSubmitSuccess(null);
                        }}
                        className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-2xl font-black text-xs text-blue-950 outline-none focus:border-blue-900 transition-all"
                      >
                        <option value="First Term">First Term</option>
                        <option value="Second Term">Second Term</option>
                        <option value="Third Term">Third Term</option>
                      </select>
                    </div>

                    {/* Quick Selection Helpers */}
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleSelectAllPresent}
                        disabled={checklistClassStudents.length === 0}
                        className="flex-1 py-3 px-3 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 rounded-2xl font-black text-xs uppercase tracking-wider transition-all shadow-xs active:scale-95 disabled:opacity-40"
                      >
                        ✓ Mark All Present
                      </button>
                      <button
                        type="button"
                        onClick={handleDeselectAll}
                        disabled={checklistClassStudents.length === 0}
                        className="py-3 px-3 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-2xl font-black text-xs uppercase tracking-wider transition-all shadow-xs active:scale-95 disabled:opacity-40"
                        title="Clear checklist / Mark all absent"
                      >
                        ✕ Clear
                      </button>
                    </div>
                  </div>

                  {/* Summary Metric Counters */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-200">
                    <div className="p-3 bg-white rounded-2xl border border-slate-200">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Class Roster</p>
                      <p className="text-xl font-black text-blue-950 mt-0.5">{checklistClassStudents.length} <span className="text-xs text-slate-400 font-bold">Enrolled</span></p>
                    </div>

                    <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200">
                      <p className="text-[10px] font-black text-emerald-700 uppercase tracking-wider">Checked Present</p>
                      <p className="text-xl font-black text-emerald-700 mt-0.5">{checkedStudentIds.length} <span className="text-xs text-emerald-600 font-bold">Pupils</span></p>
                    </div>

                    <div className="p-3 bg-slate-100 rounded-2xl border border-slate-200">
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Marked Absent</p>
                      <p className="text-xl font-black text-slate-700 mt-0.5">{Math.max(0, checklistClassStudents.length - checkedStudentIds.length)} <span className="text-xs text-slate-400 font-bold">Pupils</span></p>
                    </div>

                    <div className="p-3 bg-blue-900 text-white rounded-2xl">
                      <p className="text-[10px] font-black text-yellow-400 uppercase tracking-wider">Attendance Rate</p>
                      <p className="text-xl font-black text-yellow-300 mt-0.5">
                        {checklistClassStudents.length > 0 
                          ? Math.round((checkedStudentIds.length / checklistClassStudents.length) * 100) 
                          : 0}%
                      </p>
                    </div>
                  </div>
                </div>

                {/* Success Banner */}
                {attendanceSubmitSuccess && (
                  <div className="p-5 bg-emerald-50 border-2 border-emerald-300 text-emerald-950 rounded-3xl text-xs sm:text-sm font-black flex items-center justify-between gap-3 shadow-md animate-in fade-in">
                    <div className="flex items-center gap-2.5">
                      <span className="text-2xl">🎉</span>
                      <span>{attendanceSubmitSuccess}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAttendanceSubmitSuccess(null)}
                      className="text-emerald-700 hover:text-emerald-950 font-black text-xs px-2 py-1"
                    >
                      ✕
                    </button>
                  </div>
                )}

                {/* Interactive Checklist of Students */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-black text-slate-500 uppercase tracking-wider">
                      Student Roll Register: Click any row or checkbox to mark Present / Absent
                    </p>
                    <span className="text-xs font-bold text-blue-900">
                      {checkedStudentIds.length} of {checklistClassStudents.length} Selected
                    </span>
                  </div>

                  {checklistClassStudents.length === 0 ? (
                    <div className="p-16 text-center bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                      <span className="text-4xl block mb-2">🧑‍🎓</span>
                      <p className="font-black text-blue-950 text-base">No students enrolled in {checklistClass} yet</p>
                      <p className="text-xs text-slate-400 mt-1 font-medium">
                        Students added to this class will appear here automatically for morning attendance check-listing.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {checklistClassStudents.map((student) => {
                        const isChecked = checkedStudentIds.includes(student.id);
                        return (
                          <div
                            key={student.id}
                            onClick={() => toggleStudentCheck(student.id)}
                            className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-center justify-between select-none ${
                              isChecked
                                ? 'bg-emerald-50/70 border-emerald-400 shadow-xs'
                                : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                            }`}
                          >
                            <div className="flex items-center space-x-3">
                              {/* Checkbox input */}
                              <div className="shrink-0">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => {}} // Handled by container onClick
                                  className="w-5 h-5 rounded-md text-emerald-600 focus:ring-emerald-500 cursor-pointer accent-emerald-600"
                                />
                              </div>

                              {/* Student Avatar */}
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm uppercase shrink-0 ${
                                isChecked ? 'bg-emerald-600 text-white' : 'bg-blue-900 text-yellow-300'
                              }`}>
                                {student.name.charAt(0)}
                              </div>

                              {/* Student Information */}
                              <div className="overflow-hidden">
                                <p className="font-black text-blue-950 text-sm leading-snug truncate">
                                  {student.name}
                                </p>
                                <p className="text-[10px] text-slate-400 font-mono font-bold">
                                  ID: {student.id}
                                </p>
                              </div>
                            </div>

                            {/* Status Pill */}
                            <div className="shrink-0 pl-2">
                              <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1 ${
                                isChecked
                                  ? 'bg-emerald-200 text-emerald-950'
                                  : 'bg-slate-100 text-slate-400'
                              }`}>
                                <span>{isChecked ? '✓' : '✗'}</span>
                                <span>{isChecked ? 'Present' : 'Absent'}</span>
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Prominent Submit Attendance Button */}
                <div className="p-6 bg-blue-950 rounded-3xl border-4 border-yellow-400 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
                  <div>
                    <h4 className="text-white font-black text-base font-serif flex items-center gap-2">
                      <span>📝</span>
                      <span>Ready to Submit Daily Attendance?</span>
                    </h4>
                    <p className="text-xs text-yellow-300 font-medium mt-0.5">
                      Submitting records daily presence for <strong className="text-white">{checkedStudentIds.length} pupils</strong> in <strong className="text-white">{checklistClass}</strong> on {checklistDate} ({checklistTerm}).
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleSubmitChecklistAttendance}
                    disabled={isSubmittingAttendance || checklistClassStudents.length === 0}
                    className="w-full sm:w-auto px-8 py-4 bg-yellow-400 hover:bg-yellow-300 text-blue-950 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl transition-all hover:scale-[1.03] active:scale-[0.97] flex items-center justify-center gap-2 shrink-0 disabled:opacity-40"
                  >
                    <span>{isSubmittingAttendance ? '⏳' : '✓'}</span>
                    <span>{isSubmittingAttendance ? 'Submitting...' : `Submit Attendance (${checkedStudentIds.length} Present)`}</span>
                  </button>
                </div>
              </div>
            )}

            {/* QR CAMERA SCANNER MODE */}
            {attendanceMode === 'scanner' && (
              <div className="grid lg:grid-cols-2 gap-16">
                <div className="space-y-8">
                  <div className="flex justify-between items-center">
                    <h3 className="text-2xl font-black text-blue-900 font-serif">Daily Attendance Scanner</h3>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-slate-400 uppercase">Active Term:</span>
                      <select 
                        value={scannerTerm} 
                        onChange={(e) => setScannerTerm(e.target.value)}
                        className="px-3 py-2 bg-blue-50 border border-blue-200 rounded-xl font-black text-xs text-blue-900 outline-none"
                      >
                        <option value="First Term">First Term</option>
                        <option value="Second Term">Second Term</option>
                        <option value="Third Term">Third Term</option>
                      </select>
                    </div>
                  </div>
                  <p className="text-slate-500 text-sm font-medium">
                    Use your camera to scan a student or pupil's Daily Pass QR code for <strong className="text-blue-900">{scannerTerm}</strong>.
                  </p>
                  
                  <div id="reader" className="overflow-hidden rounded-3xl border-4 border-slate-100 shadow-xl bg-slate-50 min-h-[300px]"></div>
                  
                  {lastScanned && (
                    <div className={`p-6 rounded-2xl text-center font-black uppercase tracking-widest animate-pulse ${lastScanned.includes('Success') ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                      {lastScanned}
                    </div>
                  )}
                </div>

                <div className="space-y-8">
                  <div className="flex justify-between items-center border-b-2 border-slate-100 pb-4">
                    <h3 className="text-2xl font-black text-blue-900 font-serif text-nowrap">Present Today</h3>
                    <span className="bg-blue-900 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase">{today}</span>
                  </div>
                  
                  <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                    {presentToday.length === 0 ? (
                      <div className="p-12 text-center bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200 text-slate-400 font-bold uppercase text-xs tracking-widest">
                        No attendance recorded for your students and pupils yet today.
                      </div>
                    ) : (
                      presentToday.map((record, i) => {
                        const student = allStudents.find(s => s.id === record.studentId);
                        return (
                          <div key={i} className="p-5 bg-white border-2 border-slate-50 rounded-2xl flex items-center justify-between shadow-sm">
                            <div className="flex items-center">
                              <div className="w-10 h-10 bg-green-100 text-green-700 rounded-xl flex items-center justify-center font-black mr-4 border border-green-200">
                                {student?.name.charAt(0)}
                              </div>
                              <div>
                                <p className="font-black text-blue-900">{student?.name}</p>
                                <p className="text-[10px] text-slate-400 font-bold uppercase">{student?.grade}</p>
                              </div>
                            </div>
                            <span className="text-[10px] font-black text-green-600 bg-green-50 px-3 py-1 rounded-full uppercase">Verified</span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'students' && (
          <div className="space-y-8">
            <h3 className="text-2xl font-black text-blue-900 font-serif">Class Registers</h3>
            {assignedGrades.length === 0 ? (
              <div className="p-12 text-center bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200 text-slate-400 font-bold uppercase text-xs tracking-widest">No classes assigned to you yet.</div>
            ) : (
              <div className="grid gap-8">
                {assignedGrades.map(grade => {
                  const studentsInGrade = filteredStudents.filter(s => s.grade === grade);
                  return (
                    <div key={grade} className="bg-white rounded-3xl border-2 border-slate-100 overflow-hidden shadow-sm">
                      <div className="bg-slate-50 px-6 sm:px-8 py-4 border-b-2 border-slate-100 flex flex-wrap justify-between items-center gap-3">
                        <div className="flex items-center gap-3">
                          <h4 className="font-black text-blue-900 uppercase tracking-widest">{grade}</h4>
                          <span className="px-3 py-1 bg-blue-900 text-yellow-400 text-[10px] font-black rounded-full">{studentsInGrade.length} Students & Pupils</span>
                        </div>
                        {studentsInGrade.length > 0 && (() => {
                          const nextTarget = getNextGradeLevel(grade);
                          return nextTarget ? (
                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm(`⚡ ADVANCE ENTIRE CLASS: Are you sure you want to promote ALL ${studentsInGrade.length} pupils in ${grade} to ${nextTarget}? Each pupil's class grade and entry QR code will be upgraded automatically.`)) {
                                  if (onBatchShiftStudents) {
                                    onBatchShiftStudents(studentsInGrade.map(s => s.id));
                                  } else {
                                    studentsInGrade.forEach(s => onShiftStudent(s.id));
                                  }
                                  alert(`Success! All ${studentsInGrade.length} pupils in ${grade} have been promoted to ${nextTarget}!`);
                                }
                              }}
                              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-black uppercase tracking-wider rounded-xl transition-all shadow-sm flex items-center gap-1.5 active:scale-95"
                              title={`Promote all pupils to ${nextTarget}`}
                            >
                              <span>⚡ Promote All to {nextTarget}</span>
                            </button>
                          ) : (
                            <span className="px-3 py-1 bg-purple-100 text-purple-900 text-[10px] font-black uppercase rounded-lg border border-purple-200">
                              🎓 Final Class
                            </span>
                          );
                        })()}
                      </div>
                      <div className="divide-y divide-slate-50">
                        {studentsInGrade.length === 0 ? (
                          <p className="p-8 text-center text-slate-400 text-xs font-bold uppercase tracking-widest italic">No students or pupils registered in this grade yet.</p>
                        ) : (
                          studentsInGrade.map(student => {
                            const nextGrade = getNextGradeLevel(student.grade);
                            return (
                              <div key={student.id} className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50 transition-colors">
                                <div className="flex items-center">
                                  <div className="w-12 h-12 bg-yellow-100 text-blue-900 rounded-2xl flex items-center justify-center font-black mr-4 border-2 border-yellow-200 shrink-0">
                                    {student.name.charAt(0)}
                                  </div>
                                  <div>
                                    <p className="font-black text-blue-900 text-base sm:text-lg">{student.name}</p>
                                    <p className="text-xs text-slate-500 font-medium">{student.email}</p>
                                    <span className="inline-block mt-0.5 px-2 py-0.5 bg-slate-200 text-slate-700 text-[10px] font-bold rounded-md uppercase">
                                      Current Class: {student.grade}
                                    </span>
                                  </div>
                                </div>
                                <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                                  <div className="text-left sm:text-right">
                                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-0.5">Enrolled</p>
                                    <p className="text-xs font-bold text-blue-900">{new Date(student.createdAt).toLocaleDateString()}</p>
                                  </div>
                                  {nextGrade ? (
                                    <button 
                                      type="button"
                                      onClick={() => {
                                        if (window.confirm(`Are you sure you want to promote/move ${student.name} from ${student.grade} to ${nextGrade}? Their entry QR pass will be renewed immediately.`)) {
                                          onShiftStudent(student.id);
                                          alert(`Success! Pupil ${student.name} has been moved to ${nextGrade}.`);
                                        }
                                      }}
                                      className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-black uppercase tracking-wider rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-1.5"
                                      title={`Move pupil to ${nextGrade}`}
                                    >
                                      <span>Move to {nextGrade}</span>
                                      <span className="text-yellow-300 font-black">➔</span>
                                    </button>
                                  ) : (
                                    <span className="px-3.5 py-2 bg-purple-100 text-purple-900 text-[10px] font-black uppercase rounded-xl border border-purple-200">
                                      🎓 Graduating Class
                                    </span>
                                  )}
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
          </div>
        )}

        {activeTab === 'timetable' && (
          <ClassTimetableManager
            assignedGrades={authorizedGrades}
            courses={courses}
            timetables={timetables}
            currentUsername={username}
            onSaveTimetable={(tt) => {
              if (onSaveTimetable) {
                onSaveTimetable(tt);
              }
            }}
          />
        )}

        {activeTab === 'termStats' && (
          <div className="space-y-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b-2 border-slate-100 pb-6">
              <div>
                <h3 className="text-2xl font-black text-blue-900 font-serif">Students & Pupils Term Attendance Register</h3>
                <p className="text-slate-500 text-sm font-medium">Tracking total school days attended by students and pupils across 1st, 2nd, and 3rd terms.</p>
              </div>
              <div className="bg-yellow-400 text-blue-900 px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-wider">
                Staff Term Records
              </div>
            </div>

            <div className="bg-white rounded-[2rem] border-2 border-slate-100 overflow-x-auto shadow-sm">
              <table className="w-full text-left min-w-[700px]">
                <thead>
                  <tr className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-100">
                    <th className="px-8 py-5">Student / Pupil Name</th>
                    <th className="px-6 py-5">Class Grade</th>
                    <th className="px-6 py-5 text-center">1st Term</th>
                    <th className="px-6 py-5 text-center">2nd Term</th>
                    <th className="px-6 py-5 text-center">3rd Term</th>
                    <th className="px-8 py-5 text-right">Total Present</th>
                  </tr>
                </thead>
                <tbody className="divide-y-2 divide-slate-50">
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-20 text-center text-slate-400 font-bold uppercase text-xs">
                        No students or pupils enrolled in your assigned classes.
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map(student => {
                      const studentAtt = attendance.filter(a => a.studentId === student.id);
                      const term1Count = studentAtt.filter(a => a.term === 'First Term' || (!a.term)).length;
                      const term2Count = studentAtt.filter(a => a.term === 'Second Term').length;
                      const term3Count = studentAtt.filter(a => a.term === 'Third Term').length;
                      const totalDays = term1Count + term2Count + term3Count;

                      return (
                        <tr key={student.id} className="hover:bg-blue-50/40 transition-colors">
                          <td className="px-8 py-5 font-black text-blue-900">
                            <div className="flex items-center">
                              <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-900 flex items-center justify-center font-black mr-3 border border-blue-200">
                                {student.name.charAt(0)}
                              </div>
                              <span>{student.name}</span>
                            </div>
                          </td>
                          <td className="px-6 py-5">
                            <span className="px-3 py-1 bg-yellow-100 text-blue-900 text-[10px] font-black rounded-lg uppercase">{student.grade}</span>
                          </td>
                          <td className="px-6 py-5 text-center">
                            <span className={`px-3 py-1.5 rounded-xl font-black text-xs ${term1Count > 0 ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-400'}`}>
                              {term1Count} Days
                            </span>
                          </td>
                          <td className="px-6 py-5 text-center">
                            <span className={`px-3 py-1.5 rounded-xl font-black text-xs ${term2Count > 0 ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-400'}`}>
                              {term2Count} Days
                            </span>
                          </td>
                          <td className="px-6 py-5 text-center">
                            <span className={`px-3 py-1.5 rounded-xl font-black text-xs ${term3Count > 0 ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-400'}`}>
                              {term3Count} Days
                            </span>
                          </td>
                          <td className="px-8 py-5 text-right font-black text-blue-900 text-base">
                            <span className="bg-blue-900 text-yellow-400 px-4 py-1.5 rounded-2xl shadow-sm">
                              {totalDays} Days
                            </span>
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

        {activeTab === 'grading' && (
           <div className="space-y-12">
              {/* Staff Assigned Class Restriction Alert */}
              {hasAssignedGrades && (
                <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🔒</span>
                    <div>
                      <h4 className="font-serif font-black text-blue-900 text-sm">
                        Staff Grading Authority: Assigned Classes Only
                      </h4>
                      <p className="text-xs text-blue-700">
                        You are assigned to grade: <strong className="font-black text-blue-950">{assignedGrades.join(', ')}</strong>. You can only record and publish marks for pupils in your assigned classes.
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-black uppercase text-blue-950 bg-yellow-400 px-3 py-1 rounded-full shadow-xs">
                    {assignedGrades.length} Assigned Class{assignedGrades.length > 1 ? 'es' : ''}
                  </span>
                </div>
              )}

              {/* Publish Results to All Pupils Workflow Banner */}
              <div className="bg-gradient-to-br from-indigo-900 via-blue-900 to-slate-900 text-white rounded-3xl p-6 sm:p-8 border-2 border-yellow-400 shadow-xl space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-indigo-700/60 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-yellow-400 text-blue-950 flex items-center justify-center font-black text-2xl shadow-md">
                      📤
                    </div>
                    <div>
                      <h4 className="font-serif font-black text-lg sm:text-xl text-yellow-300">
                        Send Results to All Pupils
                      </h4>
                      <p className="text-xs text-blue-200">
                        Request administrative sign-off to distribute termly results to all pupils simultaneously
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-black uppercase text-yellow-300 bg-blue-950 px-3.5 py-1 rounded-full border border-yellow-400/40">
                      Class: {activeClassForPublish}
                    </span>
                    <span className="text-[11px] font-black uppercase text-blue-200 bg-indigo-800 px-3 py-1 rounded-full">
                      {term}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
                  <div className="p-3 bg-white/10 rounded-2xl border border-white/10">
                    <span className="block text-[10px] font-black uppercase tracking-wider text-blue-300">Enrolled Pupils</span>
                    <span className="font-serif font-black text-2xl text-white">{studentsInCurrentGrade.length}</span>
                  </div>
                  <div className="p-3 bg-white/10 rounded-2xl border border-white/10">
                    <span className="block text-[10px] font-black uppercase tracking-wider text-blue-300">Recorded Scores</span>
                    <span className="font-serif font-black text-2xl text-yellow-400">{resultsInCurrentGrade.length}</span>
                  </div>
                  <div className="p-3 bg-white/10 rounded-2xl border border-white/10">
                    <span className="block text-[10px] font-black uppercase tracking-wider text-blue-300">Admin Clearance</span>
                    <span className={`font-black text-xs px-2.5 py-1 rounded-full inline-block mt-1 ${
                      latestRequest?.status === 'approved' 
                        ? 'bg-emerald-500 text-white' 
                        : latestRequest?.status === 'pending' 
                          ? 'bg-amber-400 text-blue-950 animate-pulse' 
                          : latestRequest?.status === 'rejected'
                            ? 'bg-rose-500 text-white'
                            : 'bg-white/20 text-slate-200'
                    }`}>
                      {latestRequest?.status === 'approved' ? '✓ Authorized' : latestRequest?.status === 'pending' ? '⏳ Pending Approval' : latestRequest?.status === 'rejected' ? '✕ Revision Needed' : 'Not Requested'}
                    </span>
                  </div>
                </div>

                {/* Request Actions */}
                <div className="pt-2">
                  {latestRequest?.status === 'approved' ? (
                    <div className="space-y-3 bg-emerald-900/40 border border-emerald-400/60 p-5 rounded-2xl">
                      <div className="flex items-center gap-2 text-emerald-300 text-xs font-black">
                        <span>✅</span>
                        <span>Administrator clearance confirmed! You can now send results to all {studentsInCurrentGrade.length} pupils of {activeClassForPublish}.</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleSendToAllPupils(activeClassForPublish, term)}
                        className="w-full py-4 bg-yellow-400 hover:bg-yellow-300 text-blue-950 rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow-md active:scale-95 flex items-center justify-center gap-2"
                      >
                        <span>📢</span>
                        <span>Send / Broadcast Results to All Pupils at Once</span>
                      </button>
                    </div>
                  ) : latestRequest?.status === 'pending' ? (
                    <div className="p-5 bg-amber-500/20 border border-amber-400/40 rounded-2xl text-xs text-amber-200 space-y-2">
                      <div className="flex items-center gap-2 font-black">
                        <span className="text-base">⏳</span>
                        <span>Request Awaiting Administrator Approval</span>
                      </div>
                      <p className="text-[11px] text-amber-100/90 leading-relaxed">
                        Your request to release {resultsInCurrentGrade.length} recorded assessment grades for {activeClassForPublish} ({term}) is currently awaiting sign-off from the School Administrator. Once approved, you can send out results to all pupils with a single click.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {latestRequest?.status === 'rejected' && (
                        <p className="text-xs text-rose-200 font-bold bg-rose-900/50 p-3 rounded-xl border border-rose-500/40">
                          Admin Feedback: {latestRequest.adminFeedback || 'Please review scores before resubmitting.'}
                        </p>
                      )}
                      <button
                        type="button"
                        disabled={resultsInCurrentGrade.length === 0}
                        onClick={() => handleRequestPublish(activeClassForPublish, term)}
                        className={`w-full py-4 rounded-2xl font-black text-xs sm:text-sm uppercase tracking-wider transition-all shadow-lg flex items-center justify-center gap-2 ${
                          resultsInCurrentGrade.length > 0 
                            ? 'bg-yellow-400 hover:bg-yellow-300 text-blue-950 active:scale-95 cursor-pointer' 
                            : 'bg-white/20 text-white/50 cursor-not-allowed'
                        }`}
                      >
                        <span>📨</span>
                        <span>
                          {latestRequest?.status === 'rejected' 
                            ? 'Re-Submit Request to Admin to Allow Sending Results' 
                            : 'Request Admin Permission to Send Results to All Pupils at Once'}
                        </span>
                      </button>
                      {resultsInCurrentGrade.length === 0 && (
                        <p className="text-[10px] text-center text-blue-300">
                          Please record at least one grade for this class below before submitting publication request.
                        </p>
                      )}
                    </div>
                  )}
                  
                  {publishFeedback && (
                    <p className="mt-3 text-xs font-black text-emerald-300 text-center animate-fade-in bg-emerald-950/60 p-2 rounded-xl border border-emerald-500/30">
                      {publishFeedback}
                    </p>
                  )}
                </div>
              </div>

              {/* Assessment Form & Position Standings */}
              <div className="grid lg:grid-cols-2 gap-12">
                <div>
                  <h3 className="text-2xl font-black text-blue-900 mb-6 font-serif">Record Assessment Marks</h3>
                  <form onSubmit={handleAddGrade} className="space-y-6 bg-blue-50/70 p-8 rounded-[2rem] border-2 border-blue-100 shadow-sm">
                    {/* Class Filter - Restricted strictly to staff's assigned classes */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <label className="text-xs font-black text-blue-900 uppercase tracking-widest">
                          Assigned Class
                        </label>
                        <span className="text-[10px] font-bold text-slate-500">
                          {filteredStudents.length} pupil(s) eligible
                        </span>
                      </div>
                      <select
                        value={gradeClassFilter}
                        onChange={(e) => {
                          setGradeClassFilter(e.target.value);
                          setSelectedStudent('');
                        }}
                        className="w-full px-4 py-3 bg-white border-2 border-blue-100 rounded-2xl font-bold outline-none text-xs text-blue-950"
                      >
                        {hasAssignedGrades && authorizedGrades.length > 1 && (
                          <option value="all">-- All My Assigned Classes ({authorizedGrades.join(', ')}) --</option>
                        )}
                        {authorizedGrades.map(lvl => (
                          <option key={lvl} value={lvl}>{lvl} (My Assigned Class)</option>
                        ))}
                      </select>
                    </div>

                    {/* Pupil Selection */}
                    <div className="space-y-2">
                      <label className="text-xs font-black text-blue-900 uppercase tracking-widest">Select Student / Pupil</label>
                      <select 
                        required
                        value={selectedStudent}
                        onChange={(e) => setSelectedStudent(e.target.value)}
                        className="w-full px-4 py-3.5 bg-white border-2 border-blue-100 rounded-2xl font-bold outline-none text-xs text-blue-950"
                      >
                        <option value="">-- Choose Pupil from {gradeClassFilter === 'all' ? 'Assigned Classes' : gradeClassFilter} --</option>
                        {filteredStudents.map(s => (
                          <option key={s.id} value={s.id}>{s.name} ({s.grade}) • Started: {s.admissionYear || 2024} • ID: {s.id}</option>
                        ))}
                      </select>
                    </div>
                    
                    {/* Subject Selection */}
                    <div className="space-y-2">
                      <label className="text-xs font-black text-blue-900 uppercase tracking-widest">Subject</label>
                      <select 
                        required
                        value={selectedSubject}
                        onChange={(e) => setSelectedSubject(e.target.value)}
                        className="w-full px-4 py-3.5 bg-white border-2 border-blue-100 rounded-2xl font-bold outline-none text-xs text-blue-950"
                      >
                        <option value="">-- Choose Subject --</option>
                        {courses.map(c => (
                          <option key={c.id} value={c.name}>{c.name} ({c.grade})</option>
                        ))}
                        <option value="__custom__">➕ Type Custom Subject...</option>
                      </select>
                      {selectedSubject === '__custom__' && (
                        <input 
                          type="text"
                          required
                          placeholder="Enter subject name (e.g. Mathematics, English Studies, Yoruba)"
                          value={customSubject}
                          onChange={(e) => setCustomSubject(e.target.value)}
                          className="w-full mt-2 px-4 py-3 bg-white border-2 border-yellow-400 rounded-2xl font-bold outline-none text-blue-900 text-xs"
                        />
                      )}
                    </div>

                    {/* Academic Term */}
                    <div className="space-y-2">
                      <label className="text-xs font-black text-blue-900 uppercase tracking-widest">Academic Term</label>
                      <select 
                        value={term}
                        onChange={(e) => setTerm(e.target.value)}
                        className="w-full px-4 py-3.5 bg-white border-2 border-blue-100 rounded-2xl font-bold outline-none text-xs text-blue-950"
                      >
                        <option value="First Term">First Term</option>
                        <option value="Second Term">Second Term</option>
                        <option value="Third Term">Third Term</option>
                      </select>
                    </div>

                    {/* CA Test, Examination, and Total Mark Inputs */}
                    <div className="p-5 bg-white rounded-2xl border-2 border-blue-100 space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <span className="text-xs font-black text-blue-900 uppercase tracking-wider">Mark Allocation</span>
                        <span className="text-[10px] font-bold text-slate-400">CA: 40% | Exam: 60%</span>
                      </div>

                      <div className="grid grid-cols-3 gap-3">
                        {/* Continuous Assessment (CA) */}
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">
                            CA Test (0-40)
                          </label>
                          <input 
                            type="number" 
                            min="0" 
                            max="40" 
                            step="any" 
                            required
                            value={caScore}
                            onChange={(e) => handleCaChange(parseFloat(e.target.value) || 0)}
                            className="w-full px-3 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl font-mono font-black text-center text-blue-950 outline-none focus:bg-white focus:border-blue-900 transition-all text-sm"
                          />
                          <span className="text-[9px] text-slate-400 block text-center font-medium">Max 40</span>
                        </div>

                        {/* Examination */}
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">
                            Exam (0-60)
                          </label>
                          <input 
                            type="number" 
                            min="0" 
                            max="60" 
                            step="any" 
                            required
                            value={examScore}
                            onChange={(e) => handleExamChange(parseFloat(e.target.value) || 0)}
                            className="w-full px-3 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl font-mono font-black text-center text-blue-950 outline-none focus:bg-white focus:border-blue-900 transition-all text-sm"
                          />
                          <span className="text-[9px] text-slate-400 block text-center font-medium">Max 60</span>
                        </div>

                        {/* Total Score */}
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-blue-900 uppercase tracking-wider block">
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
                            className="w-full px-3 py-3 bg-yellow-50 border-2 border-yellow-400 rounded-xl font-mono font-black text-center text-blue-950 outline-none text-base"
                          />
                          <span className="text-[9px] font-black text-blue-900 block text-center">
                            {totalScore >= 75 ? 'A (Distinction)' : totalScore >= 65 ? 'B (Very Good)' : totalScore >= 50 ? 'C (Credit)' : totalScore >= 40 ? 'D (Pass)' : 'F (Fail)'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <button type="submit" className="w-full py-4.5 bg-blue-900 text-yellow-400 font-black text-base rounded-2xl shadow-xl hover:bg-blue-800 transition-all transform hover:-translate-y-0.5 active:scale-95">
                      Upload & Save Assessment
                    </button>
                  </form>
                </div>

                {/* Class Standings & Automatic Positions from First to Last */}
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-2xl font-black text-blue-900 font-serif">
                        Class Standings & Positions
                      </h3>
                      <p className="text-xs text-slate-500 font-medium">
                        System ranking from First to Last based on aggregate assessment scores
                      </p>
                    </div>
                    <span className="text-[11px] font-black bg-blue-100 text-blue-900 px-3 py-1 rounded-full uppercase">
                      {activeClassForPublish}
                    </span>
                  </div>

                  <div className="bg-white border-2 border-blue-100 rounded-3xl p-5 shadow-sm space-y-4">
                    <div className="flex items-center justify-between text-xs font-black text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-2 px-2">
                      <span>Pos • Student / Pupil</span>
                      <span>Avg • Total • Subjects</span>
                    </div>

                    {classRankingsList.length === 0 ? (
                      <div className="p-8 text-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 text-slate-400 font-bold uppercase text-xs tracking-wider">
                        No pupils or assessment grades recorded for {activeClassForPublish} ({term}) yet.
                      </div>
                    ) : (
                      <div className="space-y-2.5 max-h-[480px] overflow-y-auto pr-1 custom-scrollbar">
                        {classRankingsList.map((rank) => {
                          const isTop3 = rank.position <= 3;
                          const medal = rank.position === 1 ? '🥇' : rank.position === 2 ? '🥈' : rank.position === 3 ? '🥉' : `${rank.position}th`;

                          return (
                            <div 
                              key={rank.studentId}
                              className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between ${
                                rank.position === 1 
                                  ? 'bg-amber-50/80 border-amber-300 shadow-xs' 
                                  : isTop3 
                                    ? 'bg-blue-50/60 border-blue-200' 
                                    : 'bg-white border-slate-200 hover:border-blue-200'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs sm:text-sm ${
                                  rank.position === 1 
                                    ? 'bg-yellow-400 text-blue-950 shadow-xs font-serif text-lg' 
                                    : rank.position === 2 
                                      ? 'bg-slate-200 text-slate-800' 
                                      : rank.position === 3 
                                        ? 'bg-amber-200 text-amber-900' 
                                        : 'bg-slate-100 text-slate-600'
                                }`}>
                                  {isTop3 ? medal : rank.positionOrdinal}
                                </div>
                                <div>
                                  <p className="font-black text-blue-950 text-xs sm:text-sm">
                                    {rank.studentName}
                                  </p>
                                  <p className="text-[10px] text-slate-400 font-bold">
                                    ID: {rank.studentId} • Position: <strong className="text-blue-900">{rank.positionOrdinal}</strong> of {rank.totalStudentsInClass}
                                  </p>
                                </div>
                              </div>

                              <div className="text-right">
                                <span className="font-mono font-black text-sm text-blue-950 block">
                                  {rank.averageScore}%
                                </span>
                                <span className="text-[10px] text-slate-400 font-medium">
                                  {rank.totalScore} pts • {rank.subjectCount} subj
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Recently Uploaded by This Staff */}
                  <div className="pt-4 border-t border-slate-100">
                    <h4 className="font-serif font-black text-blue-900 text-base mb-3">Recently Uploaded Marks</h4>
                    <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                      {myResults.length === 0 ? (
                        <div className="p-6 text-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 text-slate-400 font-bold uppercase text-[11px]">
                          No assessment marks uploaded by you yet.
                        </div>
                      ) : (
                        myResults.slice(0, 10).map(res => {
                          const st = allStudents.find(s => s.name.toLowerCase() === res.studentName.toLowerCase());
                          const ca = res.caScore !== undefined ? res.caScore : Math.round(res.score * 0.4);
                          const ex = res.examScore !== undefined ? res.examScore : (res.score - ca);

                          return (
                            <div key={res.id} className="p-4 bg-white border border-slate-200 rounded-2xl shadow-2xs flex justify-between items-center">
                              <div>
                                <p className="font-black text-blue-950 text-xs">{res.studentName} ({res.grade})</p>
                                <p className="text-[10px] text-slate-400 font-bold">
                                  {res.subject} • {res.term}
                                </p>
                                <p className="text-[10px] text-slate-600 font-mono mt-0.5">
                                  CA: {ca}/40 • Exam: {ex}/60
                                </p>
                              </div>
                              <div className="text-right flex flex-col items-end gap-1">
                                <span className={`text-base font-black font-mono ${res.score >= 50 ? 'text-emerald-700' : 'text-rose-600'}`}>
                                  {res.score}%
                                </span>
                                {st && (
                                  <button
                                    type="button"
                                    onClick={() => setPreviewStudentReport(st)}
                                    className="text-[9px] font-black text-blue-900 bg-yellow-400 hover:bg-yellow-300 px-2 py-0.5 rounded uppercase tracking-wider transition-all"
                                  >
                                    Report PDF
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              </div>
           </div>
        )}

        {activeTab === 'courses' && (
          <div className="grid lg:grid-cols-2 gap-16">
             <div>
               <h3 className="text-2xl font-black text-blue-900 mb-8 font-serif">Contribute to Curriculum</h3>
               <form onSubmit={handleAddCourse} className="space-y-6 bg-slate-50 p-8 rounded-3xl border-2 border-slate-100">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Subject Title</label>
                    <input 
                      type="text" 
                      required
                      value={courseName}
                      onChange={(e) => setCourseName(e.target.value)}
                      placeholder="e.g. Basic Science"
                      className="w-full px-4 py-4 bg-white border-2 border-slate-200 rounded-2xl font-bold focus:ring-4 focus:ring-blue-100 outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Class / Grade</label>
                    <select 
                      value={courseGrade}
                      onChange={(e) => setCourseGrade(e.target.value as GradeLevel)}
                      className="w-full px-4 py-4 bg-white border-2 border-slate-200 rounded-2xl font-bold focus:ring-4 focus:ring-blue-100 outline-none"
                    >
                      {assignedGrades.map(lvl => (
                        <option key={lvl} value={lvl}>{lvl}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Course Objective</label>
                    <textarea 
                      value={courseDesc}
                      onChange={(e) => setCourseDesc(e.target.value)}
                      rows={3}
                      className="w-full px-4 py-4 bg-white border-2 border-slate-200 rounded-2xl font-bold focus:ring-4 focus:ring-blue-100 outline-none"
                      placeholder="What will students and pupils learn?"
                    />
                  </div>
                  <button type="submit" className="w-full py-5 bg-blue-900 text-yellow-400 font-black text-lg rounded-2xl shadow-xl hover:bg-blue-800 transition-all">
                    Register New Subject
                  </button>
               </form>
             </div>

             <div className="space-y-6">
                <h3 className="text-2xl font-black text-blue-900 font-serif">Academic Course List</h3>
                <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                  {courses.map(course => (
                    <div key={course.id} className="p-6 bg-white border-2 border-slate-100 rounded-2xl group hover:border-blue-200 transition-colors">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-black text-blue-900 text-lg">{course.name}</p>
                            <span className="text-[10px] font-black uppercase bg-blue-100 text-blue-800 px-3 py-1 rounded-full">{course.grade}</span>
                          </div>
                          <p className="text-xs text-slate-500 mt-1">{course.description || 'No description provided.'}</p>
                        </div>
                        {onDuplicateCourse && (
                          <button
                            onClick={() => {
                              if (duplicateCourseId === course.id) {
                                setDuplicateCourseId(null);
                              } else {
                                setDuplicateCourseId(course.id);
                                setTargetDuplicateGrades([...assignedGrades]);
                              }
                            }}
                            className="px-3 py-1.5 bg-yellow-400 text-blue-900 hover:bg-yellow-500 font-black text-[10px] uppercase rounded-xl transition-all shadow-sm"
                          >
                            📋 Duplicate
                          </button>
                        )}
                      </div>

                      {duplicateCourseId === course.id && onDuplicateCourse && (
                        <div className="mt-4 p-4 bg-yellow-50/80 rounded-2xl border-2 border-yellow-200">
                          <p className="text-xs font-black text-blue-900 uppercase mb-2">Duplicate "{course.name}" to target classes:</p>
                          <div className="grid grid-cols-2 gap-2 mb-3 bg-white p-2 rounded-xl border border-yellow-200 text-xs">
                            {assignedGrades.map(g => (
                              <label key={g} className="flex items-center space-x-2 font-bold text-slate-700 cursor-pointer">
                                <input 
                                  type="checkbox"
                                  checked={targetDuplicateGrades.includes(g)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setTargetDuplicateGrades(prev => [...prev, g]);
                                    } else {
                                      setTargetDuplicateGrades(prev => prev.filter(item => item !== g));
                                    }
                                  }}
                                  className="rounded text-blue-900"
                                />
                                <span>{g}</span>
                              </label>
                            ))}
                          </div>
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setDuplicateCourseId(null)}
                              className="px-3 py-1.5 bg-slate-200 text-slate-600 font-black text-[10px] uppercase rounded-lg"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (targetDuplicateGrades.length === 0) {
                                  alert("Please select at least one class.");
                                  return;
                                }
                                onDuplicateCourse(course.id, targetDuplicateGrades);
                                alert(`Course "${course.name}" duplicated to ${targetDuplicateGrades.length} classes!`);
                                setDuplicateCourseId(null);
                              }}
                              className="px-4 py-1.5 bg-blue-900 text-yellow-400 font-black text-[10px] uppercase rounded-lg shadow-md"
                            >
                              Confirm
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
             </div>
          </div>
        )}

        {/* TAB 8: PARENT MESSAGES DESK */}
        {activeTab === 'parentMessages' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50 p-6 rounded-3xl border border-slate-200">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xl">💬</span>
                  <h3 className="font-serif font-black text-blue-950 text-xl">
                    Parent Messages & Direct Inquiries
                  </h3>
                </div>
                <p className="text-xs text-slate-500 font-medium">
                  Direct inquiries from parents regarding pupils in your assigned class(es): <span className="font-bold text-blue-900">{assignedGrades.join(', ') || 'All Grades'}</span>.
                </p>
              </div>

              {onOpenParentMessaging && (
                <button
                  type="button"
                  onClick={onOpenParentMessaging}
                  className="px-5 py-2.5 bg-blue-900 hover:bg-blue-800 text-yellow-400 rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow-md flex items-center gap-2 active:scale-95 shrink-0"
                >
                  <span>Open Full Messaging Desk ➔</span>
                </button>
              )}
            </div>

            {/* Filtered Messages for this teacher */}
            {(() => {
              const myParentMessages = parentMessages.filter(m => 
                m.staffId === username || 
                m.staffId === 'staff' ||
                (m.studentGrade && assignedGrades.includes(m.studentGrade))
              );

              if (myParentMessages.length === 0) {
                return (
                  <div className="p-12 text-center bg-white rounded-3xl border-2 border-dashed border-slate-200 space-y-2">
                    <span className="text-4xl block mb-2">📬</span>
                    <h4 className="font-serif font-black text-blue-950 text-base">No Parent Inquiries Yet</h4>
                    <p className="text-xs text-slate-400 max-w-md mx-auto">
                      When parents message you about homework, attendance, or student progress, their inquiries will appear here in real-time.
                    </p>
                  </div>
                );
              }

              return (
                <div className="space-y-4">
                  {myParentMessages.map(msg => (
                    <div
                      key={msg.id}
                      className="bg-white rounded-3xl p-6 border-2 border-slate-100 shadow-md hover:border-blue-200 transition-all space-y-4"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-900 flex items-center justify-center font-black text-base shrink-0">
                            👨‍👩‍👧‍👦
                          </div>
                          <div>
                            <p className="font-serif font-black text-sm text-blue-950 leading-tight">
                              {msg.parentName}
                            </p>
                            <p className="text-[10px] text-slate-400 font-bold">
                              Regarding: <span className="text-blue-900 font-black">{msg.studentName || 'Pupil'}</span> ({msg.studentGrade || 'Class'})
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase ${
                            msg.priority === 'urgent' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-800'
                          }`}>
                            {msg.priority || 'Inquiry'}
                          </span>
                          <span className="text-[10px] font-bold text-slate-400">
                            {new Date(msg.timestamp).toLocaleString()}
                          </span>
                        </div>
                      </div>

                      <div>
                        {msg.subject && (
                          <h5 className="font-serif font-black text-xs text-blue-900 mb-1">
                            {msg.subject}
                          </h5>
                        )}
                        <p className="text-xs sm:text-sm text-slate-700 font-medium whitespace-pre-wrap leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-100">
                          {msg.message}
                        </p>
                      </div>

                      {/* Quick Reply Form */}
                      {onSendParentMessage && (
                        <div className="pt-2 flex flex-col sm:flex-row items-center gap-2">
                          <input
                            type="text"
                            value={parentReplyText[msg.id] || ''}
                            onChange={e => setParentReplyText(prev => ({ ...prev, [msg.id]: e.target.value }))}
                            placeholder={`Reply directly to ${msg.parentName}...`}
                            className="flex-1 w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-900"
                            onKeyDown={e => {
                              if (e.key === 'Enter' && (parentReplyText[msg.id] || '').trim()) {
                                onSendParentMessage({
                                  parentId: msg.parentId,
                                  parentName: msg.parentName,
                                  parentEmail: msg.parentEmail,
                                  staffId: username,
                                  staffName: username,
                                  studentId: msg.studentId,
                                  studentName: msg.studentName,
                                  studentGrade: msg.studentGrade,
                                  subject: `Re: ${msg.subject || 'Inquiry'}`,
                                  message: (parentReplyText[msg.id] || '').trim(),
                                  senderRole: 'teacher',
                                  priority: 'normal',
                                  read: false,
                                  replyToId: msg.id
                                });
                                setParentReplyText(prev => ({ ...prev, [msg.id]: '' }));
                                alert(`Reply sent to ${msg.parentName}!`);
                              }
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const text = (parentReplyText[msg.id] || '').trim();
                              if (!text) return;
                              onSendParentMessage({
                                parentId: msg.parentId,
                                parentName: msg.parentName,
                                parentEmail: msg.parentEmail,
                                staffId: username,
                                staffName: username,
                                studentId: msg.studentId,
                                studentName: msg.studentName,
                                studentGrade: msg.studentGrade,
                                subject: `Re: ${msg.subject || 'Inquiry'}`,
                                message: text,
                                senderRole: 'teacher',
                                priority: 'normal',
                                read: false,
                                replyToId: msg.id
                              });
                              setParentReplyText(prev => ({ ...prev, [msg.id]: '' }));
                              alert(`Reply sent to ${msg.parentName}!`);
                            }}
                            className="w-full sm:w-auto px-5 py-2.5 bg-blue-900 hover:bg-blue-800 text-yellow-400 rounded-xl font-black text-xs uppercase tracking-wider shadow-xs transition-all active:scale-95 shrink-0"
                          >
                            Send Reply
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        )}
      </div>

      {/* Official Standard Report Card Modal for Teachers to Preview / Print */}
      {previewStudentReport && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto print:p-0 print:bg-white print:static">
          <div className="bg-white rounded-3xl max-w-4xl w-full p-4 sm:p-6 shadow-2xl relative my-auto print:shadow-none print:border-none print:p-0">
            <StandardReportCard 
              student={previewStudentReport}
              results={results.filter(r => r.studentName.toLowerCase().trim() === previewStudentReport.name.toLowerCase().trim())}
              term="First Term"
              session="2025/2026 Academic Session"
              onClose={() => setPreviewStudentReport(null)}
              showControls={true}
            />
          </div>
        </div>
      )}
    </div>
  );
};
