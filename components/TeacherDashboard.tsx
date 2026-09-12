
import React, { useState, useEffect, useRef } from 'react';
import { Course, StudentResult, GradeLevel, StudentAccount, AttendanceRecord, StaffPagePermission, ALL_STAFF_PAGES, Announcement, ResultPublishRequest } from '../types';
import { GRADE_GROUPS } from '../constants';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { StandardReportCard } from './StandardReportCard';
import { computeClassRankings, computeSubjectRankings, formatOrdinal } from '../utils/ranking';

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
  onAddCourse: (name: string, grade: GradeLevel, description: string) => void;
  onDuplicateCourse?: (courseId: string, targetGrades: GradeLevel[]) => void;
  onAddResult: (result: Omit<StudentResult, 'id' | 'date' | 'teacherName'>) => void;
  onMarkAttendance: (studentId: string, term?: string) => boolean;
  onShiftStudent: (studentId: string) => void;
  onRequestPublishResults?: (grade: GradeLevel, term: string, subject?: string) => void;
  onSendResultsToPupils?: (grade: GradeLevel, term: string) => void;
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
  onAddCourse,
  onDuplicateCourse,
  onAddResult,
  onMarkAttendance,
  onShiftStudent,
  onRequestPublishResults,
  onSendResultsToPupils
}) => {
  // Determine available tabs based on admin-configured page permissions
  const availableTabs = ALL_STAFF_PAGES.filter(p => !allowedPages || allowedPages.includes(p.id));
  const initialTab = availableTabs[0]?.id || 'overview';
  const [activeTab, setActiveTab] = useState<'overview' | 'courses' | 'students' | 'grading' | 'attendance' | 'termStats'>(initialTab);

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

  // Filter students strictly according to staff assigned classes
  const filteredStudents = gradeClassFilter === 'all' 
    ? staffStudents 
    : staffStudents.filter(s => s.grade === gradeClassFilter);
  const myResults = results.filter(r => r.teacherName === username);
  const today = new Date().toLocaleDateString();
  const presentToday = attendance.filter(a => a.date === today && filteredStudents.some(s => s.id === a.studentId));

  useEffect(() => {
    if (activeTab === 'attendance' && !scannerRef.current) {
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
      if (scannerRef.current && activeTab !== 'attendance') {
        scannerRef.current.clear().catch(err => console.error("Failed to clear scanner", err));
        scannerRef.current = null;
      }
    };
  }, [activeTab, scannerTerm]);

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
              <p className="text-slate-500 text-sm font-medium">Use your camera to scan a student or pupil's Daily Pass QR code for <strong className="text-blue-900">{scannerTerm}</strong>.</p>
              
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
                  <div className="p-12 text-center bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200 text-slate-400 font-bold uppercase text-xs tracking-widest">No attendance recorded for your students and pupils yet today.</div>
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
                      <div className="bg-slate-50 px-8 py-4 border-b-2 border-slate-100 flex justify-between items-center">
                        <h4 className="font-black text-blue-900 uppercase tracking-widest">{grade}</h4>
                        <span className="px-3 py-1 bg-blue-900 text-yellow-400 text-[10px] font-black rounded-full">{studentsInGrade.length} Students & Pupils</span>
                      </div>
                      <div className="divide-y divide-slate-50">
                        {studentsInGrade.length === 0 ? (
                          <p className="p-8 text-center text-slate-400 text-xs font-bold uppercase tracking-widest italic">No students or pupils registered in this grade yet.</p>
                        ) : (
                          studentsInGrade.map(student => (
                            <div key={student.id} className="p-6 flex items-center justify-between hover:bg-slate-50 transition-colors">
                              <div className="flex items-center">
                                <div className="w-12 h-12 bg-yellow-100 text-blue-900 rounded-2xl flex items-center justify-center font-black mr-4 border-2 border-yellow-200">
                                  {student.name.charAt(0)}
                                </div>
                                <div>
                                  <p className="font-black text-blue-900 text-lg">{student.name}</p>
                                  <p className="text-xs text-slate-500 font-medium">{student.email}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-4">
                                <div className="text-right">
                                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Enrolled Since</p>
                                  <p className="text-xs font-bold text-blue-900">{new Date(student.createdAt).toLocaleDateString()}</p>
                                </div>
                                <button 
                                  onClick={() => {
                                    if (window.confirm(`Are you sure you want to shift ${student.name} to the next class? This will also regenerate their QR code.`)) {
                                      onShiftStudent(student.id);
                                      alert(`${student.name} has been shifted!`);
                                    }
                                  }}
                                  className="px-4 py-2 bg-green-600 text-white text-[10px] font-black uppercase rounded-xl shadow-md hover:bg-green-700 transition-all"
                                >
                                  Shift Class
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
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
