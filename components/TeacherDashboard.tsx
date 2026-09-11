
import React, { useState, useEffect, useRef } from 'react';
import { Course, StudentResult, GradeLevel, StudentAccount, AttendanceRecord, StaffPagePermission, ALL_STAFF_PAGES, Announcement } from '../types';
import { Html5QrcodeScanner } from 'html5-qrcode';

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
  onAddCourse: (name: string, grade: GradeLevel, description: string) => void;
  onDuplicateCourse?: (courseId: string, targetGrades: GradeLevel[]) => void;
  onAddResult: (result: Omit<StudentResult, 'id' | 'date' | 'teacherName'>) => void;
  onMarkAttendance: (studentId: string, term?: string) => boolean;
  onShiftStudent: (studentId: string) => void;
}

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({
  username,
  assignedGrades,
  allStudents,
  courses,
  results,
  attendance,
  calendar,
  announcements = [],
  allowedPages,
  onAddCourse,
  onDuplicateCourse,
  onAddResult,
  onMarkAttendance,
  onShiftStudent
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
  
  // Course form state
  const [courseName, setCourseName] = useState('');
  const [courseGrade, setCourseGrade] = useState<GradeLevel>(assignedGrades[0] || 'Primary 1');
  const [courseDesc, setCourseDesc] = useState('');

  // Course duplication state for teachers
  const [duplicateCourseId, setDuplicateCourseId] = useState<string | null>(null);
  const [targetDuplicateGrades, setTargetDuplicateGrades] = useState<GradeLevel[]>([]);

  // Grading form state
  const [selectedStudent, setSelectedStudent] = useState<string>('');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [score, setScore] = useState<number>(0);
  const [term, setTerm] = useState<string>('First Term');

  // Scanner status & Term state
  const [scannerTerm, setScannerTerm] = useState<string>('First Term');
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  const filteredStudents = allStudents.filter(s => assignedGrades.includes(s.grade));
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

  const handleAddGrade = (e: React.FormEvent) => {
    e.preventDefault();
    const student = allStudents.find(s => s.id === selectedStudent);
    if (student && selectedSubject) {
      onAddResult({
        studentName: student.name,
        grade: student.grade,
        subject: selectedSubject,
        score: score,
        term: term
      });
      setScore(0);
      alert(`Result for ${student.name} recorded!`);
    }
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
           <div className="grid lg:grid-cols-2 gap-16">
              <div>
                <h3 className="text-2xl font-black text-blue-900 mb-8 font-serif">Record Assessment</h3>
                <form onSubmit={handleAddGrade} className="space-y-6 bg-blue-50 p-8 rounded-[2rem] border-2 border-blue-100 shadow-sm">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-blue-900 uppercase tracking-widest">Select Student / Pupil</label>
                    <select 
                      required
                      value={selectedStudent}
                      onChange={(e) => setSelectedStudent(e.target.value)}
                      className="w-full px-4 py-4 bg-white border-2 border-blue-100 rounded-2xl font-bold outline-none"
                    >
                      <option value="">-- Choose Student / Pupil --</option>
                      {filteredStudents.map(s => (
                        <option key={s.id} value={s.id}>{s.name} ({s.grade})</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-xs font-black text-blue-900 uppercase tracking-widest">Subject</label>
                    <select 
                      required
                      value={selectedSubject}
                      onChange={(e) => setSelectedSubject(e.target.value)}
                      className="w-full px-4 py-4 bg-white border-2 border-blue-100 rounded-2xl font-bold outline-none"
                    >
                      <option value="">-- Choose Subject --</option>
                      {courses.map(c => (
                        <option key={c.id} value={c.name}>{c.name} ({c.grade})</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-black text-blue-900 uppercase tracking-widest">Score (0-100)</label>
                      <input 
                        type="number" min="0" max="100" step="any" required
                        value={score}
                        onChange={(e) => setScore(parseFloat(e.target.value) || 0)}
                        className="w-full px-4 py-4 bg-white border-2 border-blue-100 rounded-2xl font-bold outline-none"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black text-blue-900 uppercase tracking-widest">Academic Term</label>
                      <select 
                        value={term}
                        onChange={(e) => setTerm(e.target.value)}
                        className="w-full px-4 py-4 bg-white border-2 border-blue-100 rounded-2xl font-bold outline-none"
                      >
                        <option value="First Term">First Term</option>
                        <option value="Second Term">Second Term</option>
                        <option value="Third Term">Third Term</option>
                      </select>
                    </div>
                  </div>

                  <button type="submit" className="w-full py-5 bg-blue-900 text-yellow-400 font-black text-lg rounded-2xl shadow-xl hover:bg-blue-800 transition-all transform hover:-translate-y-1">
                    Upload Result
                  </button>
                </form>
              </div>

              <div className="space-y-6">
                <h3 className="text-2xl font-black text-blue-900 font-serif">Recently Uploaded</h3>
                <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                  {myResults.length === 0 ? (
                    <div className="p-12 text-center bg-white rounded-3xl border-2 border-dashed border-slate-200 text-slate-400 font-bold uppercase text-xs tracking-widest">No results uploaded by you yet.</div>
                  ) : (
                    myResults.map(res => (
                      <div key={res.id} className="p-6 bg-white border-2 border-slate-100 rounded-2xl shadow-sm">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="font-black text-blue-900">{res.studentName}</p>
                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{res.subject} • {res.term}</p>
                          </div>
                          <div className={`text-xl font-black ${res.score >= 50 ? 'text-green-600' : 'text-red-500'}`}>
                            {res.score}%
                          </div>
                        </div>
                      </div>
                    ))
                  )}
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
    </div>
  );
};
