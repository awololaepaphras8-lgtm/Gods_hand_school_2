
import React, { useState, useEffect } from 'react';
import { FeeStructure, StudentApplication, Announcement, TeacherAccount, StudentResult, Course, GradeLevel, AttendanceRecord, StudentAccount, FeePayment, StaffPagePermission, ALL_STAFF_PAGES, AppState, ParentAccount, ResultPublishRequest, TimedStaffDelegation, AdminSectionKey, UserPagesAccessState } from '../types';
import { GRADE_GROUPS, GRADE_ORDER } from '../constants';
import { PaymentReviewDashboard } from './PaymentReviewDashboard';
import { AdminStaffDelegationManager } from './AdminStaffDelegationManager';
import { UserPageAccessManager } from './UserPageAccessManager';
import {
  exportCompleteSchoolDataExcel,
  exportCompleteSchoolDataPDF,
  exportCompleteSchoolDataBoth,
  exportCompleteSchoolDatabaseJSON,
  exportStudentsAndPupilsCSV,
  exportStudentsAndPupilsExcel,
  exportFeePaymentsCSV,
  exportFeePaymentsExcel,
  exportAcademicResultsCSV,
  exportAcademicResultsExcel,
  exportAttendanceCSV,
  exportAttendanceExcel,
  exportAdmissionsCSV,
  exportAdmissionsExcel,
  exportStaffRosterCSV,
  exportStaffRosterExcel,
} from '../utils/exportService';
import {
  downloadSupabaseSchemaSql,
  copySupabaseSchemaSql,
  SUPABASE_MASTER_SQL_SCHEMA
} from '../utils/supabaseSqlExport';
import { RealtimeSqlViewerModal } from './RealtimeSqlViewerModal';

interface AdminPanelProps {
  fees: FeeStructure;
  applications: StudentApplication[];
  announcements: Announcement[];
  teachers: TeacherAccount[];
  results: StudentResult[];
  courses: Course[];
  attendance: AttendanceRecord[];
  students: StudentAccount[];
  parents?: ParentAccount[];
  calendar: string;
  payments: FeePayment[];
  resultPublishRequests?: ResultPublishRequest[];
  timedStaffDelegations?: TimedStaffDelegation[];
  userPagesAccess?: UserPagesAccessState;
  onUpdateUserPagesAccess?: (newState: UserPagesAccessState) => void;
  onGrantStaffDelegation?: (delegation: {
    teacherUsername: string;
    teacherName: string;
    grantedSections: AdminSectionKey[];
    durationMinutes: number;
    purpose?: string;
  }) => void;
  onRevokeStaffDelegation?: (delegationId: string) => void;
  allowedAdminSections?: AdminSectionKey[];
  delegationExpiresAt?: string;
  onExitDelegation?: () => void;
  activeStaffName?: string;
  onNavigateToView?: (view: any) => void;
  onUpdateFee: (grade: string, amount: number) => void;
  onUpdateAllFees?: (newFees: { [key: string]: number }) => void;
  onAddAnnouncement: (title: string, content: string) => void;
  onUpdateAnnouncement?: (announcement: Announcement) => void;
  onDeleteAnnouncement?: (id: string) => void;
  onCreateTeacher: (teacher: Omit<TeacherAccount, 'id' | 'createdAt'>) => void;
  onAddCourse: (name: string, grade: GradeLevel, description: string) => void;
  onDuplicateCourse: (courseId: string, targetGrades: GradeLevel[]) => void;
  onUpdateCalendar: (content: string) => void;
  onToggleStudentEntry: (studentId: string, allowed: boolean) => void;
  onUpdateTeacherPermissions?: (teacherId: string, allowedPages: StaffPagePermission[]) => void;
  onDeleteTeacher?: (teacherId: string) => void;
  onAdminUnlinkChild?: (parentId: string, studentId: string) => void;
  onConfirmPayment?: (paymentId: string, adminNote?: string) => void;
  onDeclinePayment?: (paymentId: string, reason: string) => void;
  onConfirmAllPending?: () => void;
  onAddChatMessage?: (paymentId: string, message: string, sender: 'admin' | 'student') => void;
  onApprovePublishRequest?: (requestId: string) => void;
  onRejectPublishRequest?: (requestId: string, feedback: string) => void;
  onBroadcastResultsToClass?: (grade: GradeLevel, term: string) => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ 
  fees, 
  applications, 
  announcements,
  teachers,
  results,
  courses,
  attendance,
  students,
  parents = [],
  calendar,
  payments,
  resultPublishRequests = [],
  onUpdateFee,
  onUpdateAllFees,
  onAddAnnouncement,
  onUpdateAnnouncement,
  onDeleteAnnouncement,
  onCreateTeacher,
  onAddCourse,
  onDuplicateCourse,
  onUpdateCalendar,
  onToggleStudentEntry,
  onUpdateTeacherPermissions,
  onDeleteTeacher,
  onAdminUnlinkChild,
  onConfirmPayment,
  onDeclinePayment,
  onConfirmAllPending,
  onAddChatMessage,
  onApprovePublishRequest,
  onRejectPublishRequest,
  onBroadcastResultsToClass,
  timedStaffDelegations = [],
  userPagesAccess,
  onUpdateUserPagesAccess,
  onGrantStaffDelegation,
  onRevokeStaffDelegation,
  allowedAdminSections,
  delegationExpiresAt,
  onExitDelegation,
  activeStaffName,
  onNavigateToView
}) => {
  const [activeTab, setActiveTab] = useState<'attendance' | 'payments' | 'resultPublish' | 'fees' | 'applications' | 'teachers' | 'courses' | 'calendar' | 'announcements' | 'access' | 'parents' | 'export' | 'delegations' | 'pageAccess'>('attendance');
  const [rejectModalRequestId, setRejectModalRequestId] = useState<string | null>(null);
  const [rejectFeedbackText, setRejectFeedbackText] = useState<string>('');
  const [delegationNow, setDelegationNow] = useState<Date>(new Date());
  const [showSqlModal, setShowSqlModal] = useState<boolean>(false);

  // Clock for delegated session banner
  useEffect(() => {
    if (delegationExpiresAt) {
      const interval = setInterval(() => {
        const n = new Date();
        setDelegationNow(n);
        if (new Date(delegationExpiresAt).getTime() <= n.getTime()) {
          alert("⏱️ Your temporary administrative access delegation has expired.");
          if (onExitDelegation) onExitDelegation();
        }
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [delegationExpiresAt, onExitDelegation]);
  
  // States for forms
  const [annTitle, setAnnTitle] = useState('');
  const [annContent, setAnnContent] = useState('');
  const [editingAnnId, setEditingAnnId] = useState<string | null>(null);
  const [annSaveMsg, setAnnSaveMsg] = useState('');
  const [teacherUser, setTeacherUser] = useState('');
  const [teacherPass, setTeacherPass] = useState('');
  const [assignedGrades, setAssignedGrades] = useState<GradeLevel[]>(['Primary 1']);
  const [assignedCourses, setAssignedCourses] = useState<string[]>([]);
  const [selectedNewPermissions, setSelectedNewPermissions] = useState<StaffPagePermission[]>(ALL_STAFF_PAGES.map(p => p.id));
  const [editingTeacherId, setEditingTeacherId] = useState<string | null>(null);
  const [courseName, setCourseName] = useState('');
  const [courseGrade, setCourseGrade] = useState<GradeLevel>('Primary 1');
  const [courseDesc, setCourseDesc] = useState('');
  const [tempCalendar, setTempCalendar] = useState(calendar);
  const [calendarSaveMsg, setCalendarSaveMsg] = useState('');
  const [sqlCopied, setSqlCopied] = useState(false);
  const [showSqlPreview, setShowSqlPreview] = useState(false);

  const handleCopySupabaseSql = async () => {
    const ok = await copySupabaseSchemaSql();
    if (ok) {
      setSqlCopied(true);
      setTimeout(() => setSqlCopied(false), 3000);
    }
  };

  useEffect(() => {
    setTempCalendar(calendar);
  }, [calendar]);

  // Fee Configuration state & handlers
  const [localFees, setLocalFees] = useState<{ [key: string]: number }>(fees);
  const [feesSaveMsg, setFeesSaveMsg] = useState('');
  const [isSavingFees, setIsSavingFees] = useState(false);

  useEffect(() => {
    setLocalFees(fees);
  }, [fees]);

  const handleUpdateFeeChange = (level: string, value: number) => {
    setLocalFees(prev => ({
      ...prev,
      [level]: value
    }));
    setFeesSaveMsg('');
  };

  const handleSaveAllFees = () => {
    setIsSavingFees(true);
    if (onUpdateAllFees) {
      onUpdateAllFees(localFees);
    } else {
      Object.entries(localFees).forEach(([lvl, amt]) => {
        onUpdateFee(lvl, amt);
      });
    }
    setTimeout(() => {
      setIsSavingFees(false);
      setFeesSaveMsg(`✓ Fee configuration saved & synchronized across all student, parent, and payment portals at ${new Date().toLocaleTimeString()}!`);
      setTimeout(() => setFeesSaveMsg(''), 7000);
    }, 300);
  };

  const handleApplyMandatedPreset = () => {
    const mandatedPreset: { [key: string]: number } = {
      'Crèche': 22000,
      'Pre-Nursery 1': 23000,
      'Pre-Nursery 2': 25000,
      'Nursery 1': 26000,
      'Nursery 2': 28000,
      'Basic 1': 30000,
      'Basic 2': 32000,
      'Basic 3': 34000,
      'Basic 4': 34000,
      'Basic 5': 53000,
      'JSS 1': 50000,
      'JSS 2': 52000,
      'JSS 3': 52000,
      'SS 1 (Science)': 60000,
      'SS 1 (Commerce & Arts)': 57000,
      'SS 2 (Science)': 65000,
      'SS 2 (Commerce & Arts)': 60000,
      'SS 3 (Science)': 67000,
      'SS 3 (Commerce & Arts)': 62000,
    };
    setLocalFees(prev => ({
      ...prev,
      ...mandatedPreset
    }));
    setFeesSaveMsg('⚡ Mandated Nigerian Fee Structure loaded into editor! Click "Update Fee Configuration" to publish.');
  };

  const handleResetFees = () => {
    setLocalFees(fees);
    setFeesSaveMsg('');
  };

  // Duplication & Filtering states
  const [duplicateCourseId, setDuplicateCourseId] = useState<string | null>(null);
  const [targetDuplicateGrades, setTargetDuplicateGrades] = useState<GradeLevel[]>([]);
  const [courseFilterGrade, setCourseFilterGrade] = useState<string>('ALL');

  const today = new Date().toLocaleDateString();
  const presentToday = attendance.filter(a => a.date === today);

  const toggleGrade = (g: GradeLevel) => {
    setAssignedGrades(prev => prev.includes(g) ? prev.filter(item => item !== g) : [...prev, g]);
  };

  const toggleNewPermission = (pageId: StaffPagePermission) => {
    setSelectedNewPermissions(prev => 
      prev.includes(pageId) ? prev.filter(p => p !== pageId) : [...prev, pageId]
    );
  };

  const toggleCourse = (id: string) => {
    setAssignedCourses(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]);
  };

  const handleTeacherSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (teacherUser && teacherPass) {
      onCreateTeacher({ 
        username: teacherUser.trim(), 
        password: teacherPass.trim(),
        assignedGrades: assignedGrades.length > 0 ? assignedGrades : ['Primary 1'],
        assignedCourses,
        allowedPages: selectedNewPermissions
      });
      setTeacherUser('');
      setTeacherPass('');
      setAssignedGrades(['Primary 1']);
      setAssignedCourses([]);
      setSelectedNewPermissions(ALL_STAFF_PAGES.map(p => p.id));
      alert("Staff account created with assigned page permissions!");
    }
  };

  const handleCourseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (courseName) {
      onAddCourse(courseName, courseGrade, courseDesc);
      setCourseName('');
      setCourseDesc('');
      alert("Course added successfully!");
    }
  };

  const handleAnnSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingAnnId) {
      if (annTitle.trim() && annContent.trim()) {
        onUpdateAnnouncement?.({
          id: editingAnnId,
          title: annTitle.trim(),
          content: annContent.trim(),
          date: new Date().toLocaleDateString()
        });
        setEditingAnnId(null);
        setAnnTitle('');
        setAnnContent('');
        setAnnSaveMsg('✓ Bulletin words updated and broadcast in real time across all accounts!');
        setTimeout(() => setAnnSaveMsg(''), 5000);
      }
    } else if (annTitle.trim() && annContent.trim()) {
      onAddAnnouncement(annTitle.trim(), annContent.trim());
      setAnnTitle('');
      setAnnContent('');
      setAnnSaveMsg('✓ New bulletin published and broadcast in real time!');
      setTimeout(() => setAnnSaveMsg(''), 5000);
    }
  };

  const handleStartEditAnn = (ann: Announcement) => {
    setEditingAnnId(ann.id);
    setAnnTitle(ann.title);
    setAnnContent(ann.content);
    setAnnSaveMsg('');
  };

  const handleCancelEditAnn = () => {
    setEditingAnnId(null);
    setAnnTitle('');
    setAnnContent('');
    setAnnSaveMsg('');
  };

  // Filter tabs if accessing through delegated staff credentials
  const allTabsConfig: { id: any; label: string; adminKey?: AdminSectionKey }[] = [
    { id: 'attendance', label: 'Attendance Hub', adminKey: 'attendance' },
    { id: 'payments', label: `💳 Fee Verification (${payments.filter(p => p.status === 'pending').length} Pending)`, adminKey: 'payments' },
    { id: 'resultPublish', label: `📢 Result Releases (${resultPublishRequests.filter(r => r.status === 'pending').length} Pending)`, adminKey: 'resultPublish' },
    { id: 'fees', label: 'Fees Config', adminKey: 'fees' },
    { id: 'applications', label: 'Admissions', adminKey: 'applications' },
    { id: 'teachers', label: 'Staff', adminKey: 'teachers' },
    { id: 'courses', label: 'Courses', adminKey: 'courses' },
    { id: 'calendar', label: 'Calendar', adminKey: 'calendar' },
    { id: 'announcements', label: 'Bulletins', adminKey: 'announcements' },
    { id: 'access', label: 'Students & Pupils Access', adminKey: 'applications' },
    { id: 'pageAccess', label: '🔒 User Pages Access Control', adminKey: 'applications' },
    { id: 'parents', label: '👨‍👩‍👧 Family & Parent Links', adminKey: 'parents' },
    { id: 'export', label: '📥 Data Export / Backup', adminKey: 'export' },
    { id: 'delegations', label: `⏱️ Staff Admin Access (${timedStaffDelegations.filter(d => d.status === 'active' && new Date(d.expiresAt) > delegationNow).length} Active)` }
  ];

  const visibleTabs = allowedAdminSections
    ? allTabsConfig.filter(t => t.adminKey && allowedAdminSections.includes(t.adminKey))
    : allTabsConfig;

  // Auto-switch to first allowed tab if current active tab is restricted
  useEffect(() => {
    if (allowedAdminSections && visibleTabs.length > 0) {
      const isAllowed = visibleTabs.some(t => t.id === activeTab);
      if (!isAllowed) {
        setActiveTab(visibleTabs[0].id);
      }
    }
  }, [allowedAdminSections, visibleTabs]);

  // Compute countdown text for delegation banner
  const getRemainingBannerTime = () => {
    if (!delegationExpiresAt) return '';
    const diff = new Date(delegationExpiresAt).getTime() - delegationNow.getTime();
    if (diff <= 0) return 'Expired';
    const totalSec = Math.floor(diff / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    const h = Math.floor(m / 60);
    if (h > 0) return `${h}h ${m % 60}m ${s}s`;
    return `${m}m ${s}s`;
  };

  return (
    <div className="bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border-4 border-blue-900">
      {/* Delegated Session Top Warning Bar */}
      {delegationExpiresAt && (
        <div className="bg-amber-400 text-blue-950 px-6 py-3 border-b-2 border-yellow-500 flex flex-wrap items-center justify-between gap-3 shadow-md">
          <div className="flex items-center gap-2">
            <span className="text-lg">⏱️</span>
            <span className="text-xs sm:text-sm font-black uppercase tracking-wider">
              Temporary Delegated Admin Session: {activeStaffName || 'Staff Member'}
            </span>
            <span className="text-xs font-bold text-blue-900 hidden md:inline">
              (Access restricted strictly to granted sections)
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-blue-950 text-white px-3 py-1 rounded-full text-xs font-mono font-black flex items-center gap-1.5 shadow-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Expires in: {getRemainingBannerTime()}</span>
            </div>
            {onExitDelegation && (
              <button
                type="button"
                onClick={onExitDelegation}
                className="px-3 py-1 bg-blue-900 hover:bg-blue-800 text-yellow-400 rounded-lg text-xs font-black uppercase tracking-wider transition-all"
              >
                Exit Admin Mode
              </button>
            )}
          </div>
        </div>
      )}

      <div className="bg-blue-900 px-10 py-12 text-white relative">
        <div className="absolute top-0 right-0 p-10 opacity-10">
          <svg className="w-48 h-48" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/></svg>
        </div>
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-4xl font-black mb-3 font-serif">
              {allowedAdminSections ? `Admin Portal (Delegated Staff Session)` : `Proprietor's Dashboard`}
            </h2>
            <div className="flex items-center space-x-4">
              <span className="px-3 py-1 bg-yellow-400 text-blue-900 rounded-lg text-xs font-black uppercase tracking-tighter shadow-md">
                {allowedAdminSections ? 'Temporary Delegated Privileges' : 'School Database Manager'}
              </span>
              <p className="text-blue-100 font-medium">
                {allowedAdminSections ? `Authorized administrative operations for ${activeStaffName || 'Staff'}` : 'Monitoring attendance and academic records.'}
              </p>
            </div>
          </div>
          {!allowedAdminSections && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setShowSqlModal(true)}
                className="flex items-center space-x-1.5 px-4 py-3 bg-emerald-500 hover:bg-emerald-400 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg hover:scale-105 active:scale-95"
                title="View & copy complete Supabase PostgreSQL schema with real-time replication"
              >
                <span>📋</span>
                <span>Supabase SQL & Realtime</span>
              </button>

              {onNavigateToView && (
                <button
                  type="button"
                  onClick={() => onNavigateToView('communityHub')}
                  className="flex items-center space-x-1.5 px-4 py-3 bg-blue-950 hover:bg-blue-900 text-yellow-400 border border-yellow-400/40 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg hover:scale-105 active:scale-95"
                  title="Open live chat rooms, virtual meetings and voice/video calling"
                >
                  <span>💬</span>
                  <span>Live Hub & Calls</span>
                </button>
              )}

              <button
                onClick={() => {
                  const statePayload: AppState = {
                    fees,
                    applications,
                    announcements,
                    teachers,
                    results,
                    courses,
                    attendance,
                    studentAccounts: students,
                    academicCalendar: calendar,
                    payments
                  };
                  exportCompleteSchoolDataBoth(statePayload);
                  setActiveTab('export');
                }}
                className="flex items-center space-x-2 px-4 py-3 bg-yellow-400 text-blue-900 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-yellow-300 transition-all shadow-lg hover:scale-105 active:scale-95"
                title="Download complete school database in both PDF and Excel formats simultaneously"
              >
                <span>⚡</span>
                <span>Export Data</span>
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-wrap border-b-2 border-slate-100 bg-slate-50">
        {visibleTabs.map(tab => (
          <button 
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-6 py-5 font-black text-sm uppercase tracking-widest transition-all ${activeTab === tab.id ? 'text-blue-900 border-b-4 border-blue-900 bg-white' : 'text-slate-400 hover:text-blue-700 hover:bg-slate-100'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="p-10">
        {activeTab === 'attendance' && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
               <div className="p-8 bg-blue-50 rounded-3xl border-2 border-blue-100 text-center">
                  <p className="text-blue-900 font-black text-[10px] uppercase tracking-widest mb-2">Total Scanned Today</p>
                  <p className="text-5xl font-black text-blue-900 font-serif">{presentToday.length}</p>
               </div>
               <div className="p-8 bg-green-50 rounded-3xl border-2 border-green-100 text-center">
                  <p className="text-green-800 font-black text-[10px] uppercase tracking-widest mb-2">Total Enrolled</p>
                  <p className="text-5xl font-black text-green-800 font-serif">{students.length}</p>
               </div>
               <div className="p-8 bg-yellow-50 rounded-3xl border-2 border-yellow-100 text-center">
                  <p className="text-yellow-800 font-black text-[10px] uppercase tracking-widest mb-2">Presence Rate</p>
                  <p className="text-5xl font-black text-yellow-800 font-serif">
                    {students.length > 0 ? Math.round((presentToday.length / students.length) * 100) : 0}%
                  </p>
               </div>
            </div>

            <h3 className="text-2xl font-black text-blue-900 font-serif">Live Attendance Database</h3>
            <p className="text-slate-500 text-sm font-medium mb-6 italic">Record of all students and pupils scanned present by staff today ({today}).</p>

            <div className="bg-white rounded-[2rem] border-2 border-slate-100 overflow-x-auto shadow-sm">
              <table className="w-full text-left min-w-[700px]">
                <thead>
                  <tr className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-widest">
                    <th className="px-8 py-5">Student / Pupil Name</th>
                    <th className="px-8 py-5">Grade Level</th>
                    <th className="px-8 py-5">Marked By</th>
                    <th className="px-8 py-5 text-right">Date Verified</th>
                  </tr>
                </thead>
                <tbody className="divide-y-2 divide-slate-50">
                  {presentToday.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-24 text-center">
                        <div className="flex flex-col items-center opacity-30">
                          <span className="text-6xl mb-4">📭</span>
                          <p className="font-black text-slate-400 uppercase tracking-widest text-xs">No students or pupils marked present yet today</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    presentToday.map((record, i) => {
                      const student = students.find(s => s.id === record.studentId);
                      return (
                        <tr key={i} className="hover:bg-blue-50/50 transition-colors group">
                          <td className="px-8 py-6">
                            <div className="flex items-center">
                              <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-900 flex items-center justify-center font-black mr-3 border-2 border-white shadow-sm">
                                {student?.name.charAt(0)}
                              </div>
                              <span className="font-black text-blue-900">{student?.name || 'Unknown Student / Pupil'}</span>
                            </div>
                          </td>
                          <td className="px-8 py-6">
                             <span className="px-3 py-1 bg-yellow-100 text-blue-900 text-[10px] font-black rounded-lg uppercase">{student?.grade}</span>
                          </td>
                          <td className="px-8 py-6">
                            <span className="text-sm font-bold text-slate-500 flex items-center">
                              <span className="w-2 h-2 rounded-full bg-green-500 mr-2"></span>
                              {record.markedBy}
                            </span>
                          </td>
                          <td className="px-8 py-6 text-right font-bold text-slate-400 text-xs">
                            {record.date}
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

        {activeTab === 'payments' && (
          <div className="space-y-8">
            <PaymentReviewDashboard 
              payments={payments}
              students={students}
              onConfirmPayment={onConfirmPayment || ((id, note) => {})}
              onDeclinePayment={onDeclinePayment || ((id, reason) => {})}
              onConfirmAllPending={onConfirmAllPending || (() => {})}
              onAddChatMessage={onAddChatMessage || ((id, msg, sender) => {})}
            />
          </div>
        )}

        {activeTab === 'resultPublish' && (
          <div className="space-y-8">
            <div className="bg-gradient-to-r from-blue-950 via-blue-900 to-indigo-950 text-white rounded-[2.5rem] p-8 sm:p-10 border-4 border-yellow-400 shadow-xl relative overflow-hidden">
              <div className="relative z-10">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-blue-800 pb-5 mb-6">
                  <div>
                    <h3 className="font-serif font-black text-2xl sm:text-3xl text-yellow-300">
                      Staff Result Publication Authorizations
                    </h3>
                    <p className="text-xs sm:text-sm text-blue-200 mt-1">
                      Staff request administrative clearance to deliver terminal assessment reports to all pupils at once
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-4 py-2 bg-yellow-400 text-blue-950 font-black text-xs uppercase rounded-xl shadow-md">
                      {resultPublishRequests.filter(r => r.status === 'pending').length} Action Required
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                  <div className="bg-white/10 p-4 rounded-2xl border border-white/10">
                    <span className="block text-[10px] font-black uppercase text-blue-300">Pending Clearances</span>
                    <span className="font-serif font-black text-3xl text-yellow-400">
                      {resultPublishRequests.filter(r => r.status === 'pending').length}
                    </span>
                  </div>
                  <div className="bg-white/10 p-4 rounded-2xl border border-white/10">
                    <span className="block text-[10px] font-black uppercase text-blue-300">Approved Releases</span>
                    <span className="font-serif font-black text-3xl text-emerald-400">
                      {resultPublishRequests.filter(r => r.status === 'approved').length}
                    </span>
                  </div>
                  <div className="bg-white/10 p-4 rounded-2xl border border-white/10">
                    <span className="block text-[10px] font-black uppercase text-blue-300">Total Recorded Results</span>
                    <span className="font-serif font-black text-3xl text-white">
                      {results.length}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Pending & Historic Publication Clearance Requests */}
            <div className="bg-white rounded-[2rem] border-2 border-slate-100 overflow-hidden shadow-sm">
              <div className="p-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h4 className="font-serif font-black text-blue-950 text-lg">Clearance Requests Roster</h4>
                  <p className="text-xs text-slate-500 font-medium">Review and grant permissions for staff to send terminal results to all enrolled pupils</p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left min-w-[750px]">
                  <thead>
                    <tr className="bg-slate-50/80 text-slate-400 text-[11px] font-black uppercase tracking-wider border-b border-slate-100">
                      <th className="px-6 py-4">Submitted</th>
                      <th className="px-6 py-4">Staff Member</th>
                      <th className="px-6 py-4">Target Class</th>
                      <th className="px-6 py-4">Academic Term</th>
                      <th className="px-6 py-4 text-center">Pupils</th>
                      <th className="px-6 py-4 text-center">Scores</th>
                      <th className="px-6 py-4 text-center">Status</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {resultPublishRequests.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-20 text-center text-slate-400 font-bold uppercase text-xs tracking-widest">
                          No result publication requests submitted yet. Staff can request permission in the Grading Portal.
                        </td>
                      </tr>
                    ) : (
                      resultPublishRequests.map(req => {
                        const classStudents = students.filter(s => s.grade === req.grade);
                        const classScores = results.filter(r => r.grade === req.grade && r.term.toLowerCase() === req.term.toLowerCase());

                        return (
                          <tr key={req.id} className="hover:bg-blue-50/30 transition-colors">
                            <td className="px-6 py-4 text-slate-500 font-mono text-[11px]">
                              {new Date(req.timestamp).toLocaleDateString()}<br/>
                              <span className="text-[10px] text-slate-400">{new Date(req.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </td>
                            <td className="px-6 py-4">
                              <p className="font-black text-blue-950">{req.teacherName}</p>
                              <span className="text-[10px] text-slate-400 font-mono">REQ: {req.id.slice(-6)}</span>
                            </td>
                            <td className="px-6 py-4">
                              <span className="px-3 py-1 bg-yellow-100 text-blue-900 rounded-lg font-black text-xs">
                                {req.grade}
                              </span>
                            </td>
                            <td className="px-6 py-4 font-bold text-slate-700">
                              {req.term}
                            </td>
                            <td className="px-6 py-4 text-center font-mono font-bold text-blue-950">
                              {classStudents.length}
                            </td>
                            <td className="px-6 py-4 text-center font-mono font-bold text-indigo-900">
                              {classScores.length}
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                req.status === 'approved' 
                                  ? 'bg-emerald-100 text-emerald-800' 
                                  : req.status === 'pending'
                                    ? 'bg-amber-100 text-amber-900 animate-pulse'
                                    : 'bg-rose-100 text-rose-800'
                              }`}>
                                {req.status === 'approved' ? '✓ Authorized' : req.status === 'pending' ? '⏳ Awaiting Review' : '✕ Rejected'}
                              </span>
                              {req.status === 'rejected' && req.adminFeedback && (
                                <p className="text-[10px] text-rose-600 mt-1 italic">"{req.adminFeedback}"</p>
                              )}
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                {req.status === 'pending' && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => onApprovePublishRequest && onApprovePublishRequest(req.id)}
                                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-[11px] uppercase tracking-wider transition-all shadow-xs active:scale-95 flex items-center gap-1"
                                      title="Authorize staff to send results to all pupils"
                                    >
                                      <span>✓</span>
                                      <span>Authorize</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setRejectModalRequestId(req.id);
                                        setRejectFeedbackText('');
                                      }}
                                      className="px-2.5 py-1.5 bg-rose-100 hover:bg-rose-200 text-rose-800 rounded-xl font-black text-[11px] uppercase tracking-wider transition-all"
                                      title="Decline and request revision"
                                    >
                                      Decline
                                    </button>
                                  </>
                                )}

                                <button
                                  type="button"
                                  onClick={() => onBroadcastResultsToClass && onBroadcastResultsToClass(req.grade, req.term)}
                                  className="px-3 py-1.5 bg-blue-900 hover:bg-blue-800 text-yellow-300 rounded-xl font-black text-[11px] uppercase tracking-wider transition-all shadow-xs active:scale-95 flex items-center gap-1"
                                  title="Deliver results to all pupils and parents right now"
                                >
                                  <span>📢</span>
                                  <span>Broadcast Now</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Direct Admin Fast-Publish Widget */}
            <div className="bg-slate-50 border-2 border-slate-200 rounded-3xl p-6 sm:p-8 space-y-4">
              <h4 className="font-serif font-black text-blue-950 text-base flex items-center gap-2">
                <span>⚡</span>
                <span>Immediate Administrator Broadcast (All Classes)</span>
              </h4>
              <p className="text-xs text-slate-500">
                As the School Administrator, you can bypass requests and immediately publish results for any class with a single click.
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                {GRADE_GROUPS.flatMap(g => g.levels).map(lvl => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => {
                      if (window.confirm(`Broadcast official results for ${lvl} to all pupils now?`)) {
                        if (onBroadcastResultsToClass) {
                          onBroadcastResultsToClass(lvl as GradeLevel, 'First Term');
                        }
                      }
                    }}
                    className="px-3.5 py-2 bg-white hover:bg-yellow-400 hover:text-blue-950 text-blue-900 border border-slate-200 rounded-xl text-xs font-black transition-all shadow-2xs"
                  >
                    Send {lvl} Results
                  </button>
                ))}
              </div>
            </div>

            {/* Rejection / Revision Note Modal */}
            {rejectModalRequestId && (
              <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-blue-950/80 backdrop-blur-xs">
                <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border-4 border-yellow-400 space-y-4">
                  <h4 className="font-serif font-black text-blue-950 text-lg">
                    Return Request with Feedback
                  </h4>
                  <p className="text-xs text-slate-500">
                    Specify what the staff member should review or adjust before the results can be sent to pupils.
                  </p>
                  <textarea
                    rows={3}
                    value={rejectFeedbackText}
                    onChange={(e) => setRejectFeedbackText(e.target.value)}
                    placeholder="e.g. Please verify Mathematics test scores for the 3 pupils with zero scores before release."
                    className="w-full p-4 bg-slate-50 border-2 border-slate-200 rounded-2xl text-xs font-bold outline-none focus:border-blue-900"
                  />
                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setRejectModalRequestId(null)}
                      className="px-4 py-2 rounded-xl text-xs font-black text-slate-500 hover:bg-slate-100"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (onRejectPublishRequest && rejectModalRequestId) {
                          onRejectPublishRequest(rejectModalRequestId, rejectFeedbackText || 'Please review scores and resubmit.');
                        }
                        setRejectModalRequestId(null);
                      }}
                      className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md"
                    >
                      Confirm & Send Feedback
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'fees' && (
          <div className="space-y-8">
            {/* Header & Primary Action Bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b-2 border-slate-100 pb-6">
              <div>
                <h3 className="text-2xl font-black text-blue-900 font-serif">Academic Fee Structure & Tuition Setup</h3>
                <p className="text-xs text-slate-500 font-bold mt-1">
                  Configure and update official term tuition fees payable by students from Crèche to Senior Secondary (SS3).
                </p>
              </div>

              {/* Primary Action Button Bar */}
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handleApplyMandatedPreset}
                  className="px-4 py-3 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-2xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-xs hover:scale-[1.02] active:scale-[0.98]"
                  title="Load official school fee schedule into editor"
                >
                  <span>⚡</span>
                  <span>Load School Schedule</span>
                </button>

                <button
                  type="button"
                  onClick={handleResetFees}
                  className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-xs font-black uppercase tracking-wider transition-all"
                  title="Discard changes and reload saved values"
                >
                  Reset
                </button>

                <button
                  type="button"
                  onClick={handleSaveAllFees}
                  disabled={isSavingFees}
                  className="px-6 py-3.5 bg-blue-900 hover:bg-blue-800 text-yellow-400 rounded-2xl text-xs sm:text-sm font-black uppercase tracking-widest shadow-xl transition-all hover:scale-[1.03] active:scale-[0.97] flex items-center gap-2 border-2 border-yellow-400"
                >
                  <span>{isSavingFees ? '⏳' : '💾'}</span>
                  <span>{isSavingFees ? 'Saving Changes...' : 'Update Fee Configuration'}</span>
                </button>
              </div>
            </div>

            {/* Confirmation & Status Banner */}
            {feesSaveMsg && (
              <div className="p-4 bg-emerald-50 border-2 border-emerald-300 text-emerald-900 rounded-2xl text-xs sm:text-sm font-black flex items-center justify-between gap-3 shadow-md animate-in fade-in">
                <div className="flex items-center gap-2">
                  <span className="text-lg">✅</span>
                  <span>{feesSaveMsg}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setFeesSaveMsg('')}
                  className="text-emerald-700 hover:text-emerald-950 text-xs font-black px-2 py-1"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Fee Input Grid Grouped by Academic Section */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {GRADE_GROUPS.map(group => (
                <div key={group.name} className="bg-slate-50/50 rounded-3xl p-6 sm:p-7 border-2 border-blue-100 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-5 pb-3 border-b border-blue-100">
                      <h4 className="font-black text-blue-900 text-base font-serif">{group.name}</h4>
                      <span className="text-[10px] font-black uppercase bg-blue-100 text-blue-900 px-2.5 py-0.5 rounded-full">
                        {group.levels.length} Classes
                      </span>
                    </div>

                    <div className="space-y-4">
                      {group.levels.map(level => {
                        const currentAmount = localFees[level] !== undefined ? localFees[level] : (fees[level] || 0);
                        return (
                          <div key={level} className="flex flex-col space-y-1.5 p-3 rounded-2xl bg-white border border-slate-200 focus-within:border-blue-900 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
                            <div className="flex items-center justify-between">
                              <label className="text-xs font-black text-blue-950 uppercase tracking-wider">{level}</label>
                              <span className="text-[11px] font-bold text-slate-500 font-mono">
                                ₦{Number(currentAmount || 0).toLocaleString()}
                              </span>
                            </div>
                            <div className="relative">
                              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-blue-900 font-black text-sm">₦</span>
                              <input 
                                type="number" 
                                value={currentAmount === 0 ? '' : currentAmount}
                                onChange={(e) => handleUpdateFeeChange(level, parseInt(e.target.value) || 0)}
                                placeholder="0"
                                className="pl-9 pr-3 py-2.5 w-full bg-slate-50/50 border border-slate-200 rounded-xl text-base font-black text-blue-950 outline-none focus:bg-white transition-all font-mono"
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Bottom Floating Save Button Bar */}
            <div className="p-6 bg-blue-950 rounded-3xl border-4 border-yellow-400 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-2xl">
              <div>
                <p className="text-white font-black text-sm uppercase tracking-wider flex items-center gap-2">
                  <span>⚡</span>
                  <span>Ready to publish new fee changes?</span>
                </p>
                <p className="text-xs text-yellow-300 font-medium mt-0.5">
                  Clicking update synchronizes these tuition rates across student fee checkers, admission portals, and parent dashboards.
                </p>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleSaveAllFees}
                  disabled={isSavingFees}
                  className="w-full sm:w-auto px-8 py-4 bg-yellow-400 hover:bg-yellow-300 text-blue-950 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl transition-all hover:scale-[1.03] active:scale-[0.97] flex items-center justify-center gap-2"
                >
                  <span>{isSavingFees ? '⏳' : '💾'}</span>
                  <span>{isSavingFees ? 'Saving Changes...' : 'Update Fee Configuration'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'applications' && (
          <div className="space-y-8">
            <h3 className="text-2xl font-black text-blue-900 font-serif">Admission Forms</h3>
            <div className="bg-white rounded-[2rem] border-2 border-slate-100 overflow-x-auto shadow-sm">
              <table className="w-full text-left min-w-[600px]">
                <thead>
                  <tr className="bg-slate-50 text-slate-400 text-xs font-black uppercase tracking-widest">
                    <th className="px-8 py-6">Timestamp</th>
                    <th className="px-8 py-6">Applicant</th>
                    <th className="px-8 py-6">Grade</th>
                    <th className="px-8 py-6">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y-2 divide-slate-50">
                  {applications.length === 0 ? (
                    <tr><td colSpan={4} className="py-24 text-center text-slate-300 font-bold uppercase tracking-widest text-xs">No entries found</td></tr>
                  ) : (
                    applications.map(app => (
                      <tr key={app.id} className="hover:bg-blue-50/30 transition-colors">
                        <td className="px-8 py-6 text-sm text-slate-500 font-medium">{new Date(app.timestamp).toLocaleString()}</td>
                        <td className="px-8 py-6">
                          <p className="font-black text-blue-900">{app.name}</p>
                          <p className="text-xs text-slate-400">{app.email}</p>
                        </td>
                        <td className="px-8 py-6">
                          <span className="px-3 py-1 bg-yellow-100 text-blue-700 rounded-lg text-[10px] font-black uppercase">{app.grade}</span>
                        </td>
                        <td className="px-8 py-6">
                          <div className="text-green-600 font-black text-xs uppercase tracking-widest">Verified</div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'teachers' && (
          <div className="grid lg:grid-cols-12 gap-10">
            {/* Staff Registration & Initial Permissions */}
            <div className="lg:col-span-5 space-y-8">
              <div>
                <h3 className="text-2xl font-black text-blue-900 font-serif">Staff Management</h3>
                <p className="text-xs text-slate-500 font-bold mt-1">Register new academic staff and configure their page permissions</p>
              </div>

              <form onSubmit={handleTeacherSubmit} className="space-y-6 bg-slate-50 p-8 rounded-[2.5rem] border-2 border-slate-200">
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Staff Username</label>
                    <input 
                      type="text" 
                      required 
                      value={teacherUser} 
                      onChange={(e) => setTeacherUser(e.target.value)} 
                      placeholder="e.g. Mr. Benson"
                      className="w-full px-5 py-3.5 bg-white border-2 border-slate-200 rounded-2xl font-bold text-blue-900 outline-none focus:border-blue-900 shadow-sm" 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Pass-key</label>
                    <input 
                      type="password" 
                      required 
                      value={teacherPass} 
                      onChange={(e) => setTeacherPass(e.target.value)} 
                      placeholder="••••••••"
                      className="w-full px-5 py-3.5 bg-white border-2 border-slate-200 rounded-2xl font-bold text-blue-900 outline-none focus:border-blue-900 shadow-sm" 
                    />
                  </div>
                </div>

                {/* Assigned Grades Selection */}
                <div className="space-y-2 pt-2 border-t border-slate-200">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest block">
                    Assigned Classes ({assignedGrades.length} selected)
                  </label>
                  <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-2 bg-white rounded-2xl border border-slate-200">
                    {GRADE_GROUPS.flatMap(g => g.levels).map(lvl => {
                      const isSelected = assignedGrades.includes(lvl as GradeLevel);
                      return (
                        <button
                          type="button"
                          key={lvl}
                          onClick={() => toggleGrade(lvl as GradeLevel)}
                          className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase transition-all ${
                            isSelected 
                              ? 'bg-blue-900 text-yellow-400 border border-blue-900' 
                              : 'bg-slate-50 text-slate-500 border border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {isSelected ? '✓ ' : ''}{lvl}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Page Access Control Section */}
                <div className="space-y-3 pt-2 border-t border-slate-200">
                  <div className="flex justify-between items-center">
                    <div>
                      <label className="text-xs font-black text-blue-900 uppercase tracking-widest block">
                        Page & Module Access Control
                      </label>
                      <p className="text-[10px] text-slate-500 font-medium">Select pages this staff can access</p>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        type="button"
                        onClick={() => setSelectedNewPermissions(ALL_STAFF_PAGES.map(p => p.id))}
                        className="text-[10px] font-black text-blue-900 hover:text-blue-700 uppercase underline"
                      >
                        All
                      </button>
                      <span className="text-slate-300">|</span>
                      <button
                        type="button"
                        onClick={() => setSelectedNewPermissions([])}
                        className="text-[10px] font-black text-red-600 hover:text-red-700 uppercase underline"
                      >
                        None
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {ALL_STAFF_PAGES.map(page => {
                      const isChecked = selectedNewPermissions.includes(page.id);
                      return (
                        <button
                          type="button"
                          key={page.id}
                          onClick={() => toggleNewPermission(page.id)}
                          className={`p-2.5 rounded-xl border text-left transition-all flex items-start space-x-2 ${
                            isChecked 
                              ? 'bg-blue-900 text-white border-blue-900 shadow-sm' 
                              : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <span className="text-base">{page.icon}</span>
                          <div className="overflow-hidden">
                            <p className="text-[11px] font-black leading-tight truncate">{page.label}</p>
                            <span className={`text-[9px] font-bold ${isChecked ? 'text-yellow-400' : 'text-slate-400'}`}>
                              {isChecked ? '✓ Granted' : '✗ Denied'}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <button 
                  type="submit" 
                  className="w-full py-4 bg-blue-900 text-yellow-400 font-black text-sm uppercase tracking-widest rounded-2xl shadow-xl hover:bg-blue-800 transition-all active:scale-[0.99]"
                >
                  Register Staff with Permissions →
                </button>
              </form>
            </div>

            {/* Staff Directory & Interactive Page Access Controller */}
            <div className="lg:col-span-7 space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-2xl font-black text-blue-900 font-serif">Staff Directory & Page Permissions</h3>
                  <p className="text-xs text-slate-500 font-bold">Admin can grant or revoke module access for any staff member in real time</p>
                </div>
                <span className="px-3 py-1 bg-blue-100 text-blue-900 rounded-full text-xs font-black uppercase tracking-widest">
                  {teachers.length} Staff Member(s)
                </span>
              </div>

              {teachers.length === 0 ? (
                <div className="p-12 text-center bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                  <span className="text-4xl block mb-3">👔</span>
                  <p className="font-black text-blue-900">No staff members registered yet</p>
                  <p className="text-xs text-slate-400 mt-1 font-medium">Use the form on the left to create staff accounts and assign page permissions.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {teachers.map(teacher => {
                    const currentPermissions = teacher.allowedPages !== undefined 
                      ? teacher.allowedPages 
                      : ALL_STAFF_PAGES.map(p => p.id); // Default to all if not explicitly restricted
                    const isAllGranted = currentPermissions.length === ALL_STAFF_PAGES.length;
                    const isBlocked = currentPermissions.length === 0;

                    const togglePageForTeacher = (pageId: StaffPagePermission) => {
                      const updated = currentPermissions.includes(pageId)
                        ? currentPermissions.filter(p => p !== pageId)
                        : [...currentPermissions, pageId];
                      onUpdateTeacherPermissions?.(teacher.id, updated);
                    };

                    const grantAllForTeacher = () => {
                      onUpdateTeacherPermissions?.(teacher.id, ALL_STAFF_PAGES.map(p => p.id));
                    };

                    const revokeAllForTeacher = () => {
                      onUpdateTeacherPermissions?.(teacher.id, []);
                    };

                    return (
                      <div key={teacher.id} className="p-6 bg-white rounded-3xl border-2 border-slate-100 shadow-sm hover:border-blue-200 transition-colors">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                          <div className="flex items-center space-x-3">
                            <div className="w-12 h-12 bg-blue-900 text-yellow-400 rounded-2xl flex items-center justify-center font-black text-lg shadow-md uppercase">
                              {teacher.username.charAt(0)}
                            </div>
                            <div>
                              <div className="flex items-center space-x-2">
                                <h4 className="font-black text-blue-900 text-base">{teacher.username}</h4>
                                {isAllGranted ? (
                                  <span className="px-2 py-0.5 bg-green-100 text-green-800 rounded-full text-[9px] font-black uppercase">
                                    Full Access
                                  </span>
                                ) : isBlocked ? (
                                  <span className="px-2 py-0.5 bg-red-100 text-red-800 rounded-full text-[9px] font-black uppercase">
                                    Blocked (0 Pages)
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded-full text-[9px] font-black uppercase">
                                    {currentPermissions.length} of {ALL_STAFF_PAGES.length} Pages
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-500 font-bold mt-0.5">
                                Assigned Classes: <span className="text-blue-900">{teacher.assignedGrades?.join(', ') || 'None'}</span>
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center space-x-2 self-end sm:self-auto">
                            <button
                              type="button"
                              onClick={grantAllForTeacher}
                              title="Grant access to all staff pages"
                              className="px-2.5 py-1 bg-green-50 text-green-700 hover:bg-green-100 rounded-lg text-[10px] font-black uppercase border border-green-200 transition-colors"
                            >
                              Grant All
                            </button>
                            <button
                              type="button"
                              onClick={revokeAllForTeacher}
                              title="Revoke access to all staff pages"
                              className="px-2.5 py-1 bg-red-50 text-red-700 hover:bg-red-100 rounded-lg text-[10px] font-black uppercase border border-red-200 transition-colors"
                            >
                              Revoke All
                            </button>
                            {onDeleteTeacher && (
                              <button
                                type="button"
                                onClick={() => {
                                  if (confirm(`Remove staff account ${teacher.username}?`)) {
                                    onDeleteTeacher(teacher.id);
                                  }
                                }}
                                className="p-1 text-slate-300 hover:text-red-500 transition-colors"
                                title="Delete staff account"
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Interactive Page Permission Pills for this Teacher */}
                        <div className="mt-4">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                            Toggle Accessible Pages (Click to Grant / Revoke):
                          </p>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {ALL_STAFF_PAGES.map(page => {
                              const hasAccess = currentPermissions.includes(page.id);
                              return (
                                <button
                                  key={page.id}
                                  type="button"
                                  onClick={() => togglePageForTeacher(page.id)}
                                  className={`px-3 py-2 rounded-xl text-left transition-all border flex items-center justify-between group ${
                                    hasAccess 
                                      ? 'bg-blue-50 border-blue-200 text-blue-900 hover:bg-red-50 hover:border-red-200' 
                                      : 'bg-slate-50 border-slate-200 text-slate-400 hover:bg-green-50 hover:border-green-200'
                                  }`}
                                  title={hasAccess ? `Revoke access to ${page.label}` : `Grant access to ${page.label}`}
                                >
                                  <div className="flex items-center space-x-1.5 truncate mr-1">
                                    <span className="text-xs">{page.icon}</span>
                                    <span className="text-[10px] font-black truncate">{page.label}</span>
                                  </div>
                                  <span className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase ${
                                    hasAccess 
                                      ? 'bg-blue-900 text-yellow-400 group-hover:bg-red-600 group-hover:text-white' 
                                      : 'bg-slate-200 text-slate-600 group-hover:bg-green-600 group-hover:text-white'
                                  }`}>
                                    {hasAccess ? 'ON' : 'OFF'}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'courses' && (
          <div className="space-y-12">
            <div className="grid lg:grid-cols-2 gap-12">
              <div>
                <h3 className="text-2xl font-black text-blue-900 mb-6 font-serif">Add Subject to Class</h3>
                <form onSubmit={handleCourseSubmit} className="space-y-6 bg-slate-50 p-8 rounded-[2.5rem] border-2 border-slate-100 shadow-sm">
                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Subject Name</label>
                    <input type="text" required value={courseName} onChange={(e) => setCourseName(e.target.value)} className="w-full px-5 py-4 bg-white border-2 border-slate-200 rounded-2xl font-bold outline-none focus:border-blue-900" placeholder="e.g. Mathematics, Basic Science" />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Target Class</label>
                    <select value={courseGrade} onChange={(e) => setCourseGrade(e.target.value as GradeLevel)} className="w-full px-5 py-4 bg-white border-2 border-slate-200 rounded-2xl font-bold outline-none focus:border-blue-900">
                      {GRADE_GROUPS.flatMap(g => g.levels).map(lvl => <option key={lvl} value={lvl}>{lvl}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Description / Objective</label>
                    <textarea value={courseDesc} onChange={(e) => setCourseDesc(e.target.value)} rows={3} className="w-full px-5 py-4 bg-white border-2 border-slate-200 rounded-2xl font-bold outline-none focus:border-blue-900" placeholder="Subject description..." />
                  </div>
                  <button type="submit" className="w-full py-5 bg-blue-900 text-yellow-400 font-black text-lg rounded-2xl shadow-xl hover:bg-blue-800 transition-all">Add Subject</button>
                </form>
              </div>

              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <h3 className="text-2xl font-black text-blue-900 font-serif">Existing Courses ({courses.length})</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-slate-400 uppercase">Filter:</span>
                    <select 
                      value={courseFilterGrade} 
                      onChange={(e) => setCourseFilterGrade(e.target.value)}
                      className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs outline-none"
                    >
                      <option value="ALL">All Classes</option>
                      {GRADE_GROUPS.flatMap(g => g.levels).map(lvl => (
                        <option key={lvl} value={lvl}>{lvl}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-4 max-h-[550px] overflow-y-auto pr-2 custom-scrollbar">
                  {courses.filter(c => courseFilterGrade === 'ALL' || c.grade === courseFilterGrade).length === 0 ? (
                    <div className="p-12 text-center bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200 text-slate-400 font-bold uppercase text-xs">No courses found for selected class filter.</div>
                  ) : (
                    courses.filter(c => courseFilterGrade === 'ALL' || c.grade === courseFilterGrade).map(course => (
                      <div key={course.id} className="p-6 bg-white border-2 border-slate-100 rounded-2xl shadow-sm hover:border-blue-200 transition-colors">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-black text-blue-900 text-lg">{course.name}</h4>
                              <span className="text-[10px] font-black uppercase bg-yellow-400 text-blue-900 px-3 py-0.5 rounded-full shadow-sm">{course.grade}</span>
                            </div>
                            <p className="text-xs text-slate-500 mt-1 leading-relaxed">{course.description || 'No description provided.'}</p>
                          </div>
                          <button
                            onClick={() => {
                              if (duplicateCourseId === course.id) {
                                setDuplicateCourseId(null);
                              } else {
                                setDuplicateCourseId(course.id);
                                setTargetDuplicateGrades([course.grade]);
                              }
                            }}
                            className="px-3 py-1.5 bg-blue-50 text-blue-900 hover:bg-blue-100 font-black text-[10px] uppercase rounded-xl transition-all border border-blue-200 flex items-center gap-1 shrink-0"
                          >
                            <span>📋</span> Duplicate Course
                          </button>
                        </div>

                        {duplicateCourseId === course.id && (
                          <div className="mt-4 p-5 bg-blue-50 rounded-2xl border-2 border-blue-200 animate-in fade-in duration-200">
                            <div className="flex justify-between items-center mb-3">
                              <p className="text-xs font-black text-blue-900 uppercase">Duplicate "{course.name}" to other classes:</p>
                              <div className="flex gap-2 text-[10px]">
                                <button 
                                  type="button" 
                                  onClick={() => setTargetDuplicateGrades([...GRADE_ORDER])}
                                  className="text-blue-700 underline font-black"
                                >
                                  Select All
                                </button>
                                <button 
                                  type="button" 
                                  onClick={() => setTargetDuplicateGrades([])}
                                  className="text-slate-400 underline font-black"
                                >
                                  Clear
                                </button>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto mb-4 bg-white p-3 rounded-xl border border-blue-100">
                              {GRADE_ORDER.map(g => (
                                <label key={g} className="flex items-center space-x-2 text-xs font-bold text-slate-700 cursor-pointer">
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
                                    className="rounded border-slate-300 text-blue-900 focus:ring-blue-900"
                                  />
                                  <span>{g}</span>
                                </label>
                              ))}
                            </div>

                            <div className="flex gap-3 justify-end">
                              <button
                                type="button"
                                onClick={() => setDuplicateCourseId(null)}
                                className="px-4 py-2 bg-slate-200 text-slate-600 font-black text-[10px] uppercase rounded-xl"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  if (targetDuplicateGrades.length === 0) {
                                    alert("Please select at least one target class.");
                                    return;
                                  }
                                  onDuplicateCourse(course.id, targetDuplicateGrades);
                                  alert(`Course "${course.name}" duplicated to ${targetDuplicateGrades.length} classes!`);
                                  setDuplicateCourseId(null);
                                }}
                                className="px-5 py-2 bg-blue-900 text-yellow-400 font-black text-[10px] uppercase rounded-xl shadow-md hover:bg-blue-800"
                              >
                                Confirm Duplication ({targetDuplicateGrades.length})
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'calendar' && (
          <div className="space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b-2 border-slate-100 pb-4">
              <div>
                <h3 className="text-3xl font-black text-blue-900 font-serif">Academic Calendar Manager</h3>
                <p className="text-slate-500 text-sm font-medium mt-1">
                  Configure and publish the official school term schedule, resumption dates, mid-term breaks, examinations, and vacation dates.
                </p>
              </div>
              {calendarSaveMsg && (
                <div className="px-4 py-2 bg-green-100 text-green-800 text-xs font-black uppercase rounded-xl border border-green-200 animate-in fade-in">
                  ✓ {calendarSaveMsg}
                </div>
              )}
            </div>

            <div className="grid lg:grid-cols-2 gap-8">
              {/* Left Column: Editor & Templates */}
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest">
                    Calendar Content (Text / Markdown formatting)
                  </label>
                  <span className="text-[10px] font-bold text-blue-900 bg-yellow-400 px-3 py-1 rounded-full uppercase">
                    Live on School Homepage
                  </span>
                </div>

                <textarea 
                  value={tempCalendar} 
                  onChange={(e) => {
                    setTempCalendar(e.target.value);
                    setCalendarSaveMsg('');
                  }} 
                  rows={12} 
                  className="w-full px-6 py-5 bg-white border-2 border-slate-200 rounded-3xl font-bold text-blue-900 text-sm outline-none focus:border-blue-900 focus:ring-4 focus:ring-blue-100 transition-all font-mono leading-relaxed" 
                  placeholder="Enter term schedules, resumption dates, and examination periods..."
                />

                {/* Quick Templates */}
                <div className="bg-slate-50 border-2 border-slate-100 p-5 rounded-2xl space-y-3">
                  <p className="text-xs font-black text-blue-900 uppercase tracking-wider flex items-center gap-1.5">
                    <span>⚡</span>
                    <span>Quick Load Calendar Templates:</span>
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const template = `1. First Term Resumption: Sept 15th\n2. Continuous Assessments: Oct 20th - 24th\n3. Mid-Term Break: Oct 29th - 31st\n4. Examination Period: Dec 1st - 11th\n5. Vacation & Carol Service: Dec 17th`;
                        setTempCalendar(template);
                        setCalendarSaveMsg('');
                      }}
                      className="px-3 py-2 bg-white hover:bg-blue-900 hover:text-white text-blue-900 text-[10px] font-black uppercase rounded-xl border border-slate-200 transition-all shadow-sm"
                    >
                      📅 First Term Session
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const template = `1. Second Term Resumption: Jan 12th\n2. Inter-House Sports Meet: Feb 18th\n3. Mid-Term Break: Feb 25th - 27th\n4. Mock / Unified Exams: March 16th - 27th\n5. Vacation Closing: April 3rd`;
                        setTempCalendar(template);
                        setCalendarSaveMsg('');
                      }}
                      className="px-3 py-2 bg-white hover:bg-blue-900 hover:text-white text-blue-900 text-[10px] font-black uppercase rounded-xl border border-slate-200 transition-all shadow-sm"
                    >
                      🏃 Second Term Session
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const template = `1. Third Term Resumption: April 27th\n2. WAEC / NECO / BECE Windows: May - June\n3. Mid-Term Break: June 10th - 12th\n4. Annual Promotion Examinations: July 6th - 17th\n5. Valedictory Service & Graduation: July 24th`;
                        setTempCalendar(template);
                        setCalendarSaveMsg('');
                      }}
                      className="px-3 py-2 bg-white hover:bg-blue-900 hover:text-white text-blue-900 text-[10px] font-black uppercase rounded-xl border border-slate-200 transition-all shadow-sm"
                    >
                      🎓 Third Term & WAEC
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => { 
                      onUpdateCalendar(tempCalendar); 
                      setCalendarSaveMsg(`Published successfully at ${new Date().toLocaleTimeString()}!`);
                    }} 
                    className="flex-1 py-5 bg-blue-900 text-yellow-400 font-black text-base uppercase tracking-wider rounded-2xl shadow-xl hover:bg-blue-800 transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
                  >
                    <span>💾</span>
                    <span>Save & Publish Calendar</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTempCalendar(calendar);
                      setCalendarSaveMsg('');
                    }}
                    className="px-6 py-5 bg-slate-100 text-slate-600 hover:bg-slate-200 font-black text-xs uppercase tracking-wider rounded-2xl transition-all"
                  >
                    Reset
                  </button>
                </div>
              </div>

              {/* Right Column: Live Homepage Preview */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest">
                    Live Public Website Preview
                  </p>
                  <span className="text-[10px] text-slate-400 font-bold">
                    Appears directly on School Homepage
                  </span>
                </div>

                <div className="p-8 bg-white border-2 border-slate-200 rounded-3xl shadow-sm space-y-4">
                  <div className="flex items-center gap-3 border-b-2 border-slate-100 pb-4">
                    <div className="w-10 h-10 rounded-full bg-blue-900 text-yellow-400 flex items-center justify-center font-bold text-sm">
                      GHS
                    </div>
                    <div>
                      <h4 className="font-extrabold text-blue-900 text-sm font-serif">God's Hand International Model School</h4>
                      <p className="text-[10px] text-yellow-600 font-black uppercase tracking-wider">Have Faith In God</p>
                    </div>
                  </div>

                  <div className="p-6 bg-slate-50 border-4 border-blue-900 rounded-2xl">
                    <h4 className="text-blue-900 font-black text-xs uppercase tracking-widest mb-3 border-b-2 border-blue-900 pb-1 flex items-center justify-between">
                      <span>Academic Calendar</span>
                      <span className="text-[10px] text-green-700 font-bold">● Active</span>
                    </h4>
                    <div className="text-[11px] text-blue-800 font-bold whitespace-pre-wrap leading-relaxed italic">
                      {tempCalendar || <span className="text-slate-400 font-normal">No calendar details entered yet. Type in the editor to the left.</span>}
                    </div>
                  </div>

                  <p className="text-slate-400 text-[11px] italic text-center">
                    All prospective parents, returning students, and staff see this exact schedule when visiting the main website.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'announcements' && (
          <div className="grid lg:grid-cols-12 gap-12">
            <div className="lg:col-span-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-2xl font-black text-blue-900 font-serif">
                  {editingAnnId ? '✏️ Edit Bulletin Words' : '📢 Post New Bulletin'}
                </h3>
                {editingAnnId && (
                  <button
                    type="button"
                    onClick={handleCancelEditAnn}
                    className="px-3 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition-all"
                  >
                    ✕ Cancel Edit
                  </button>
                )}
              </div>

              {annSaveMsg && (
                <div className="mb-4 p-4 bg-green-100 border border-green-300 text-green-800 rounded-2xl text-xs font-black animate-in fade-in">
                  {annSaveMsg}
                </div>
              )}

              <form onSubmit={handleAnnSubmit} className={`space-y-6 p-8 rounded-[2.5rem] border-2 transition-all shadow-md ${editingAnnId ? 'bg-amber-50/70 border-amber-300 ring-4 ring-amber-100' : 'bg-blue-50 border-blue-100'}`}>
                {editingAnnId && (
                  <div className="p-3 bg-amber-100/70 border border-amber-300 rounded-2xl text-[11px] font-bold text-amber-900 flex items-center justify-between">
                    <span>Editing active bulletin. Words will update live across all student, parent, and visitor views.</span>
                  </div>
                )}
                
                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-2">Bulletin Title / Headline</label>
                  <input 
                    type="text" 
                    value={annTitle} 
                    required 
                    onChange={(e) => setAnnTitle(e.target.value)} 
                    className="w-full px-6 py-4 bg-white border-2 border-slate-200 focus:border-blue-900 rounded-2xl font-bold text-slate-900 outline-none transition-all" 
                    placeholder="e.g., Mid-Term Examination Dates Announced" 
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-2">Bulletin Message / Details (Words)</label>
                  <textarea 
                    rows={7} 
                    value={annContent} 
                    required 
                    onChange={(e) => setAnnContent(e.target.value)} 
                    className="w-full px-6 py-4 bg-white border-2 border-slate-200 focus:border-blue-900 rounded-2xl font-bold text-slate-900 outline-none transition-all leading-relaxed" 
                    placeholder="Type the full announcement details here. All edits appear in real-time." 
                  />
                </div>

                <div className="flex gap-3">
                  <button 
                    type="submit" 
                    className={`flex-1 py-5 font-black text-base rounded-2xl shadow-xl transition-all flex items-center justify-center space-x-2 active:scale-98 ${
                      editingAnnId 
                        ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-600/30' 
                        : 'bg-blue-900 hover:bg-blue-800 text-yellow-400'
                    }`}
                  >
                    <span>{editingAnnId ? '💾' : '🚀'}</span>
                    <span>{editingAnnId ? 'Save & Update Bulletin Words' : 'Publish Bulletin'}</span>
                  </button>
                  {editingAnnId && (
                    <button
                      type="button"
                      onClick={handleCancelEditAnn}
                      className="px-6 py-5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-black text-xs uppercase rounded-2xl transition-all"
                    >
                      Cancel
                    </button>
                  )}
                </div>

                <p className="text-[11px] text-slate-400 italic text-center">
                  ⚡ Updates are transmitted to Supabase and synced to all open accounts in real time.
                </p>
              </form>
            </div>

            <div className="lg:col-span-7 space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-black text-blue-900 font-serif">Published Bulletins ({announcements.length})</h3>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Live School Notices</span>
              </div>

              {announcements.length === 0 ? (
                <div className="p-12 text-center bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200 text-slate-400 font-bold">
                  No bulletins published yet. Create one using the form.
                </div>
              ) : (
                <div className="space-y-4">
                  {announcements.map(ann => (
                    <div 
                      key={ann.id} 
                      className={`p-7 bg-white border-2 rounded-3xl shadow-sm transition-all hover:shadow-md ${
                        editingAnnId === ann.id ? 'border-amber-400 ring-4 ring-amber-100 bg-amber-50/30' : 'border-slate-100'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-3 mb-3">
                        <h4 className="font-black text-blue-900 text-xl font-serif">{ann.title}</h4>
                        <div className="flex items-center space-x-2 shrink-0">
                          <button
                            onClick={() => handleStartEditAnn(ann)}
                            className="px-3.5 py-1.5 bg-blue-50 hover:bg-blue-900 text-blue-900 hover:text-white rounded-xl text-xs font-black transition-all flex items-center space-x-1"
                            title="Edit bulletin words"
                          >
                            <span>✏️</span>
                            <span>Edit Words</span>
                          </button>
                          {onDeleteAnnouncement && (
                            <button
                              onClick={() => {
                                if (window.confirm(`Are you sure you want to delete the bulletin: "${ann.title}"?`)) {
                                  onDeleteAnnouncement(ann.id);
                                }
                              }}
                              className="px-3 py-1.5 bg-red-50 hover:bg-red-600 text-red-600 hover:text-white rounded-xl text-xs font-black transition-all"
                              title="Delete bulletin"
                            >
                              🗑️
                            </button>
                          )}
                        </div>
                      </div>
                      
                      <p className="text-slate-700 text-sm whitespace-pre-wrap leading-relaxed mb-4">{ann.content}</p>
                      
                      <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-[11px] font-bold text-slate-400">
                        <span className="uppercase">Posted: {ann.date}</span>
                        <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 rounded-full font-black text-[10px] uppercase">
                          ● Broadcast Active
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'access' && (
          <div className="space-y-8">
            <h3 className="text-2xl font-black text-blue-900 font-serif">Students & Pupils Entry Permissions</h3>
            <p className="text-slate-500 text-sm font-medium mb-6 italic">Manually override entry restrictions for students and pupils who haven't settled fees.</p>

            <div className="bg-white rounded-[2rem] border-2 border-slate-100 overflow-x-auto shadow-sm">
              <table className="w-full text-left min-w-[700px]">
                <thead>
                  <tr className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-widest">
                    <th className="px-8 py-5">Student / Pupil Name</th>
                    <th className="px-8 py-5">Grade</th>
                    <th className="px-8 py-5">Fee Status</th>
                    <th className="px-8 py-5 text-right">Entry Permission</th>
                  </tr>
                </thead>
                <tbody className="divide-y-2 divide-slate-50">
                  {students.length === 0 ? (
                    <tr><td colSpan={4} className="py-24 text-center text-slate-300 font-bold uppercase tracking-widest text-xs">No students or pupils registered</td></tr>
                  ) : (
                    students.map(student => {
                      const studentPayments = payments.filter(p => p.studentName === student.name);
                      const totalPaid = studentPayments.reduce((acc, p) => acc + p.amount, 0);
                      const targetFee = fees[student.grade] || 0;
                      const isPaid = targetFee > 0 && totalPaid >= targetFee;

                      return (
                        <tr key={student.id} className="hover:bg-blue-50/30 transition-colors">
                          <td className="px-8 py-6">
                            <p className="font-black text-blue-900">{student.name}</p>
                            <p className="text-[10px] text-slate-400 font-bold">{student.email}</p>
                          </td>
                          <td className="px-8 py-6">
                            <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-[10px] font-black uppercase">{student.grade}</span>
                          </td>
                          <td className="px-8 py-6">
                            {isPaid ? (
                              <span className="text-green-600 font-black text-[10px] uppercase tracking-widest">Settled</span>
                            ) : (
                              <span className="text-red-500 font-black text-[10px] uppercase tracking-widest">Outstanding (₦{(targetFee - totalPaid).toLocaleString()})</span>
                            )}
                          </td>
                          <td className="px-8 py-6 text-right">
                            <button 
                              onClick={() => onToggleStudentEntry(student.id, !student.entryAllowed)}
                              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all shadow-md ${student.entryAllowed ? 'bg-red-100 text-red-600 hover:bg-red-200' : 'bg-green-100 text-green-600 hover:bg-green-200'}`}
                            >
                              {student.entryAllowed ? 'Revoke Access' : 'Allow Entry'}
                            </button>
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

        {activeTab === 'parents' && (
          <div className="space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b-2 border-slate-100 pb-6">
              <div>
                <h3 className="text-3xl font-black text-blue-900 font-serif">Parent Accounts & Family Links</h3>
                <p className="text-slate-500 text-sm font-medium mt-1">
                  Authoritative registry of registered parents and guardians. Review attached pupils and manage authorized delinking requests.
                </p>
              </div>
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl text-xs text-blue-900 max-w-md">
                🔒 <strong>Delinking Authority Notice:</strong> For student safety and integrity, parents cannot unlink children from their portal. Only the School Administrator can authorize and execute a family link removal.
              </div>
            </div>

            {parents.length === 0 ? (
              <div className="p-12 text-center bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                <p className="text-slate-400 font-bold text-sm">No parent accounts registered in the portal yet.</p>
              </div>
            ) : (
              <div className="grid gap-6">
                {parents.map((p) => {
                  const linkedStudentObjs = (students || []).filter(s => 
                    (p.childrenStudentIds || []).includes(s.id) || s.parentId === p.id || (s.parentEmail && p.email && s.parentEmail.toLowerCase() === p.email.toLowerCase())
                  );

                  return (
                    <div key={p.id} className="p-6 bg-white border-2 border-slate-100 rounded-3xl shadow-sm hover:border-blue-200 transition-all space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-2xl bg-yellow-400 text-blue-900 flex items-center justify-center font-black text-xl shadow-md">
                            👨‍👩‍👧
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-serif font-black text-blue-900 text-lg">{p.fullName}</h4>
                              <span className="px-2.5 py-0.5 bg-blue-50 text-blue-900 font-black text-[10px] uppercase rounded-full">
                                {p.relationship || 'Guardian'}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 font-medium">
                              ID: <span className="font-bold text-slate-700">{p.id}</span> • Email: <span className="font-bold text-slate-700">{p.email}</span> • Phone: <span className="font-bold text-slate-700">{p.phone}</span>
                            </p>
                            {p.address && <p className="text-[11px] text-slate-400 font-medium">📍 {p.address}</p>}
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-black text-blue-900 bg-yellow-100 px-3 py-1 rounded-full uppercase tracking-wider">
                            {linkedStudentObjs.length} Linked {linkedStudentObjs.length === 1 ? 'Pupil' : 'Pupils'}
                          </span>
                        </div>
                      </div>

                      {/* Linked Children List */}
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
                          Currently Linked Children & Pupils (Admin Controlled):
                        </p>
                        {linkedStudentObjs.length === 0 ? (
                          <p className="text-xs text-slate-400 italic bg-slate-50 p-3 rounded-xl">No children linked to this parent account yet.</p>
                        ) : (
                          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {linkedStudentObjs.map(student => (
                              <div key={student.id} className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between gap-3">
                                <div>
                                  <p className="font-black text-blue-900 text-xs">{student.name}</p>
                                  <p className="text-[10px] text-slate-500 font-bold uppercase">{student.grade} • ID: {student.id}</p>
                                </div>
                                {onAdminUnlinkChild && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (confirm(`Are you sure you want to delink ${student.name} (${student.id}) from parent ${p.fullName}? This will revoke their parent access until re-linked.`)) {
                                        onAdminUnlinkChild(p.id, student.id);
                                      }
                                    }}
                                    className="px-2.5 py-1.5 bg-red-50 hover:bg-red-600 text-red-600 hover:text-white rounded-lg text-[10px] font-black uppercase tracking-wider transition-all border border-red-200 shrink-0"
                                    title="Authorized administrator delinking"
                                  >
                                    Delink Child
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'export' && (
          <div className="space-y-10">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b-2 border-slate-100 pb-6">
              <div>
                <h3 className="text-3xl font-black text-blue-900 font-serif">Data Export & Backup Hub</h3>
                <p className="text-slate-500 text-sm font-medium mt-1">
                  Proprietor's central data extraction system. Download all school records, pupil rosters, fee ledgers, results, and staff registries in PDF and Excel formats.
                </p>
              </div>

              {/* Master Download Action Buttons */}
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={() => {
                    const statePayload: AppState = {
                      fees,
                      applications,
                      announcements,
                      teachers,
                      results,
                      courses,
                      attendance,
                      studentAccounts: students,
                      academicCalendar: calendar,
                      payments
                    };
                    exportCompleteSchoolDataBoth(statePayload);
                  }}
                  className="px-5 py-3.5 bg-yellow-400 text-blue-900 font-black text-xs uppercase tracking-wider rounded-2xl shadow-xl hover:bg-yellow-300 transition-all flex items-center space-x-2 hover:scale-105 active:scale-95 border-2 border-yellow-300"
                  title="Download all school records in both Excel and PDF formats simultaneously"
                >
                  <span className="text-base">⚡</span>
                  <span>Download All (PDF & Excel)</span>
                </button>

                <button
                  onClick={() => {
                    const statePayload: AppState = {
                      fees,
                      applications,
                      announcements,
                      teachers,
                      results,
                      courses,
                      attendance,
                      studentAccounts: students,
                      academicCalendar: calendar,
                      payments
                    };
                    exportCompleteSchoolDataExcel(statePayload);
                  }}
                  className="px-5 py-3.5 bg-emerald-700 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg hover:bg-emerald-600 transition-all flex items-center space-x-2 hover:scale-105 active:scale-95"
                  title="Download all school records as a multi-sheet Microsoft Excel (.XLSX) workbook"
                >
                  <span className="text-base">📊</span>
                  <span>Download Excel (.XLSX)</span>
                </button>

                <button
                  onClick={() => {
                    const statePayload: AppState = {
                      fees,
                      applications,
                      announcements,
                      teachers,
                      results,
                      courses,
                      attendance,
                      studentAccounts: students,
                      academicCalendar: calendar,
                      payments
                    };
                    exportCompleteSchoolDataPDF(statePayload);
                  }}
                  className="px-5 py-3.5 bg-rose-700 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg hover:bg-rose-600 transition-all flex items-center space-x-2 hover:scale-105 active:scale-95"
                  title="Download official multi-page comprehensive institutional ledger as PDF"
                >
                  <span className="text-base">📑</span>
                  <span>Download PDF Report</span>
                </button>
              </div>
            </div>

            {/* Live Database Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="p-5 bg-blue-50 border-2 border-blue-100 rounded-2xl text-center">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Students & Pupils</p>
                <p className="text-2xl font-black text-blue-900">{students.length}</p>
              </div>
              <div className="p-5 bg-green-50 border-2 border-green-100 rounded-2xl text-center">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Fee Payments</p>
                <p className="text-2xl font-black text-green-700">{payments.length}</p>
              </div>
              <div className="p-5 bg-purple-50 border-2 border-purple-100 rounded-2xl text-center">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Results</p>
                <p className="text-2xl font-black text-purple-700">{results.length}</p>
              </div>
              <div className="p-5 bg-amber-50 border-2 border-amber-100 rounded-2xl text-center">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Staff Accounts</p>
                <p className="text-2xl font-black text-amber-700">{teachers.length}</p>
              </div>
              <div className="p-5 bg-indigo-50 border-2 border-indigo-100 rounded-2xl text-center">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Admissions</p>
                <p className="text-2xl font-black text-indigo-700">{applications.length}</p>
              </div>
              <div className="p-5 bg-rose-50 border-2 border-rose-100 rounded-2xl text-center">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Attendance</p>
                <p className="text-2xl font-black text-rose-700">{attendance.length}</p>
              </div>
            </div>

            {/* Master Export Formats Grid */}
            <div className="grid md:grid-cols-3 gap-6">
              {/* 1. Master Excel Card */}
              <div className="p-7 bg-gradient-to-br from-emerald-950 via-emerald-900 to-teal-900 text-white rounded-3xl shadow-xl relative overflow-hidden flex flex-col justify-between border-2 border-emerald-700/50">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="px-3 py-1 bg-emerald-400 text-emerald-950 rounded-full text-[10px] font-black uppercase tracking-widest">
                      Spreadsheet (.XLSX)
                    </span>
                    <span className="text-2xl">📊</span>
                  </div>
                  <h4 className="text-xl font-black font-serif text-emerald-300 mb-2">Complete School Database (Excel)</h4>
                  <p className="text-emerald-100 text-xs leading-relaxed mb-4">
                    Authoritative multi-sheet workbook containing 7 formatted worksheets: Executive Summary, Students & Pupils Roster, Fee Payments Ledger, Academic Results, Attendance Log, Staff Faculty, and Admissions.
                  </p>
                  <ul className="text-[11px] text-emerald-200/90 space-y-1 mb-6 list-disc list-inside">
                    <li>Multi-tab Microsoft Excel (.xlsx) file</li>
                    <li>Compatible with Excel, Google Sheets & Numbers</li>
                    <li>Formatted numeric figures & fee balances</li>
                  </ul>
                </div>
                <button
                  onClick={() => {
                    const statePayload: AppState = {
                      fees,
                      applications,
                      announcements,
                      teachers,
                      results,
                      courses,
                      attendance,
                      studentAccounts: students,
                      academicCalendar: calendar,
                      payments
                    };
                    exportCompleteSchoolDataExcel(statePayload);
                  }}
                  className="w-full py-3.5 bg-emerald-400 text-emerald-950 hover:bg-emerald-300 font-black text-xs uppercase tracking-wider rounded-xl shadow-lg transition-all flex items-center justify-center space-x-2 active:scale-95"
                >
                  <span>📊</span>
                  <span>Download Excel (.XLSX)</span>
                </button>
              </div>

              {/* 2. Master PDF Card */}
              <div className="p-7 bg-gradient-to-br from-blue-950 via-blue-900 to-indigo-950 text-white rounded-3xl shadow-xl relative overflow-hidden flex flex-col justify-between border-2 border-blue-700/50">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="px-3 py-1 bg-yellow-400 text-blue-950 rounded-full text-[10px] font-black uppercase tracking-widest">
                      Official Document (.PDF)
                    </span>
                    <span className="text-2xl">📑</span>
                  </div>
                  <h4 className="text-xl font-black font-serif text-yellow-400 mb-2">Master Institutional Ledger (PDF)</h4>
                  <p className="text-blue-100 text-xs leading-relaxed mb-4">
                    Official multi-page institutional report featuring God's Hand International Model School crest, tuition tables, pupil rosters, payment settlement ledger, examination results, staff roster, and tri-signature endorsement blocks.
                  </p>
                  <ul className="text-[11px] text-blue-200/90 space-y-1 mb-6 list-disc list-inside">
                    <li>Official school letterhead & header banner</li>
                    <li>Tri-signatory block (Proprietor, Principal, Registrar)</li>
                    <li>Formatted tables, statistics & page numbers</li>
                  </ul>
                </div>
                <button
                  onClick={() => {
                    const statePayload: AppState = {
                      fees,
                      applications,
                      announcements,
                      teachers,
                      results,
                      courses,
                      attendance,
                      studentAccounts: students,
                      academicCalendar: calendar,
                      payments
                    };
                    exportCompleteSchoolDataPDF(statePayload);
                  }}
                  className="w-full py-3.5 bg-yellow-400 text-blue-950 hover:bg-yellow-300 font-black text-xs uppercase tracking-wider rounded-xl shadow-lg transition-all flex items-center justify-center space-x-2 active:scale-95"
                >
                  <span>📑</span>
                  <span>Download PDF Report</span>
                </button>
              </div>

              {/* 3. Combined & JSON Card */}
              <div className="p-7 bg-gradient-to-br from-slate-900 via-slate-800 to-zinc-900 text-white rounded-3xl shadow-xl relative overflow-hidden flex flex-col justify-between border-2 border-slate-700/60">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="px-3 py-1 bg-purple-400 text-purple-950 rounded-full text-[10px] font-black uppercase tracking-widest">
                      Complete Archive
                    </span>
                    <span className="text-2xl">⚡</span>
                  </div>
                  <h4 className="text-xl font-black font-serif text-purple-300 mb-2">Combined Backup & Raw Snapshot</h4>
                  <p className="text-slate-200 text-xs leading-relaxed mb-4">
                    Download both the Excel spreadsheet and the signed PDF document simultaneously in one click, or export the raw technical JSON database snapshot.
                  </p>
                  <ul className="text-[11px] text-slate-300 space-y-1 mb-6 list-disc list-inside">
                    <li>One-click simultaneous PDF + Excel download</li>
                    <li>Includes raw JSON schema backup for developer import</li>
                    <li>Complete institutional preservation</li>
                  </ul>
                </div>
                <div className="space-y-2.5">
                  <button
                    onClick={() => {
                      const statePayload: AppState = {
                        fees,
                        applications,
                        announcements,
                        teachers,
                        results,
                        courses,
                        attendance,
                        studentAccounts: students,
                        academicCalendar: calendar,
                        payments
                      };
                      exportCompleteSchoolDataBoth(statePayload);
                    }}
                    className="w-full py-3.5 bg-purple-500 hover:bg-purple-400 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg transition-all flex items-center justify-center space-x-2 active:scale-95"
                  >
                    <span>⚡</span>
                    <span>Download Both (PDF & Excel)</span>
                  </button>
                  <button
                    onClick={() => {
                      const statePayload: AppState = {
                        fees,
                        applications,
                        announcements,
                        teachers,
                        results,
                        courses,
                        attendance,
                        studentAccounts: students,
                        academicCalendar: calendar,
                        payments
                      };
                      exportCompleteSchoolDatabaseJSON(statePayload);
                    }}
                    className="w-full py-2.5 bg-slate-700/80 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-[11px] uppercase tracking-wider rounded-xl transition-all flex items-center justify-center space-x-2"
                  >
                    <span>💾</span>
                    <span>Download Raw JSON Backup</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Individual Specific Tables */}
            <div className="space-y-4">
              <h4 className="text-xl font-black text-blue-900 font-serif">Export Specific Tables (Excel & CSV Formats)</h4>
              <p className="text-slate-500 text-xs font-medium">Download individual school data tables formatted directly for Microsoft Excel, Google Sheets, or database imports.</p>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 pt-2">
                {/* 1. Students & Pupils */}
                <div className="p-6 bg-white border-2 border-slate-100 rounded-3xl shadow-sm hover:border-blue-200 transition-all flex flex-col justify-between">
                  <div>
                    <div className="w-12 h-12 bg-blue-100 text-blue-900 rounded-2xl flex items-center justify-center text-xl mb-4 font-black">
                      👨‍🎓
                    </div>
                    <h5 className="font-black text-blue-900 text-lg mb-1">Students & Pupils Roster</h5>
                    <p className="text-slate-500 text-xs leading-relaxed mb-4">
                      Names, grades, entry permissions, fee requirements, total paid, balances, and registration timestamps ({students.length} records).
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => exportStudentsAndPupilsExcel(students, payments, fees)}
                      className="py-2.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl text-[11px] font-black uppercase tracking-wider transition-all flex items-center justify-center space-x-1"
                    >
                      <span>📊</span>
                      <span>Excel (.xlsx)</span>
                    </button>
                    <button
                      onClick={() => exportStudentsAndPupilsCSV(students, payments, fees)}
                      className="py-2.5 bg-blue-50 text-blue-900 hover:bg-blue-900 hover:text-white rounded-xl text-[11px] font-black uppercase tracking-wider transition-all flex items-center justify-center space-x-1"
                    >
                      <span>📄</span>
                      <span>CSV</span>
                    </button>
                  </div>
                </div>

                {/* 2. Fee Payments */}
                <div className="p-6 bg-white border-2 border-slate-100 rounded-3xl shadow-sm hover:border-green-200 transition-all flex flex-col justify-between">
                  <div>
                    <div className="w-12 h-12 bg-green-100 text-green-800 rounded-2xl flex items-center justify-center text-xl mb-4 font-black">
                      💳
                    </div>
                    <h5 className="font-black text-blue-900 text-lg mb-1">Fee Payments Ledger</h5>
                    <p className="text-slate-500 text-xs leading-relaxed mb-4">
                      Receipt numbers, payer names, student IDs, payment types, amounts, and settlement dates ({payments.length} transactions).
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => exportFeePaymentsExcel(payments)}
                      className="py-2.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl text-[11px] font-black uppercase tracking-wider transition-all flex items-center justify-center space-x-1"
                    >
                      <span>📊</span>
                      <span>Excel (.xlsx)</span>
                    </button>
                    <button
                      onClick={() => exportFeePaymentsCSV(payments)}
                      className="py-2.5 bg-green-50 text-green-800 hover:bg-green-700 hover:text-white rounded-xl text-[11px] font-black uppercase tracking-wider transition-all flex items-center justify-center space-x-1"
                    >
                      <span>📄</span>
                      <span>CSV</span>
                    </button>
                  </div>
                </div>

                {/* 3. Academic Results */}
                <div className="p-6 bg-white border-2 border-slate-100 rounded-3xl shadow-sm hover:border-purple-200 transition-all flex flex-col justify-between">
                  <div>
                    <div className="w-12 h-12 bg-purple-100 text-purple-900 rounded-2xl flex items-center justify-center text-xl mb-4 font-black">
                      📝
                    </div>
                    <h5 className="font-black text-blue-900 text-lg mb-1">Academic Results</h5>
                    <p className="text-slate-500 text-xs leading-relaxed mb-4">
                      Student names, classes, subject scores, WAEC/standard grading remarks, assessment terms, and teachers ({results.length} scores).
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => exportAcademicResultsExcel(results)}
                      className="py-2.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl text-[11px] font-black uppercase tracking-wider transition-all flex items-center justify-center space-x-1"
                    >
                      <span>📊</span>
                      <span>Excel (.xlsx)</span>
                    </button>
                    <button
                      onClick={() => exportAcademicResultsCSV(results)}
                      className="py-2.5 bg-purple-50 text-purple-900 hover:bg-purple-900 hover:text-white rounded-xl text-[11px] font-black uppercase tracking-wider transition-all flex items-center justify-center space-x-1"
                    >
                      <span>📄</span>
                      <span>CSV</span>
                    </button>
                  </div>
                </div>

                {/* 4. Attendance Registry */}
                <div className="p-6 bg-white border-2 border-slate-100 rounded-3xl shadow-sm hover:border-rose-200 transition-all flex flex-col justify-between">
                  <div>
                    <div className="w-12 h-12 bg-rose-100 text-rose-900 rounded-2xl flex items-center justify-center text-xl mb-4 font-black">
                      📅
                    </div>
                    <h5 className="font-black text-blue-900 text-lg mb-1">Attendance Registry</h5>
                    <p className="text-slate-500 text-xs leading-relaxed mb-4">
                      Daily and term attendance logs, scanned student IDs, names, dates, active terms, and verifying staff ({attendance.length} logs).
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => exportAttendanceExcel(attendance, students)}
                      className="py-2.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl text-[11px] font-black uppercase tracking-wider transition-all flex items-center justify-center space-x-1"
                    >
                      <span>📊</span>
                      <span>Excel (.xlsx)</span>
                    </button>
                    <button
                      onClick={() => exportAttendanceCSV(attendance, students)}
                      className="py-2.5 bg-rose-50 text-rose-900 hover:bg-rose-900 hover:text-white rounded-xl text-[11px] font-black uppercase tracking-wider transition-all flex items-center justify-center space-x-1"
                    >
                      <span>📄</span>
                      <span>CSV</span>
                    </button>
                  </div>
                </div>

                {/* 5. Admissions Applications */}
                <div className="p-6 bg-white border-2 border-slate-100 rounded-3xl shadow-sm hover:border-indigo-200 transition-all flex flex-col justify-between">
                  <div>
                    <div className="w-12 h-12 bg-indigo-100 text-indigo-900 rounded-2xl flex items-center justify-center text-xl mb-4 font-black">
                      📋
                    </div>
                    <h5 className="font-black text-blue-900 text-lg mb-1">Admissions Applications</h5>
                    <p className="text-slate-500 text-xs leading-relaxed mb-4">
                      Incoming student and pupil applications, parent emails, target grades, deposit status, and dates ({applications.length} applications).
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => exportAdmissionsExcel(applications)}
                      className="py-2.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl text-[11px] font-black uppercase tracking-wider transition-all flex items-center justify-center space-x-1"
                    >
                      <span>📊</span>
                      <span>Excel (.xlsx)</span>
                    </button>
                    <button
                      onClick={() => exportAdmissionsCSV(applications)}
                      className="py-2.5 bg-indigo-50 text-indigo-900 hover:bg-indigo-900 hover:text-white rounded-xl text-[11px] font-black uppercase tracking-wider transition-all flex items-center justify-center space-x-1"
                    >
                      <span>📄</span>
                      <span>CSV</span>
                    </button>
                  </div>
                </div>

                {/* 6. Staff Roster */}
                <div className="p-6 bg-white border-2 border-slate-100 rounded-3xl shadow-sm hover:border-amber-200 transition-all flex flex-col justify-between">
                  <div>
                    <div className="w-12 h-12 bg-amber-100 text-amber-900 rounded-2xl flex items-center justify-center text-xl mb-4 font-black">
                      👨‍🏫
                    </div>
                    <h5 className="font-black text-blue-900 text-lg mb-1">Staff & Teachers Roster</h5>
                    <p className="text-slate-500 text-xs leading-relaxed mb-4">
                      Staff accounts, assigned classes, curriculum assignments, configured module permissions, and join dates ({teachers.length} staff).
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => exportStaffRosterExcel(teachers)}
                      className="py-2.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl text-[11px] font-black uppercase tracking-wider transition-all flex items-center justify-center space-x-1"
                    >
                      <span>📊</span>
                      <span>Excel (.xlsx)</span>
                    </button>
                    <button
                      onClick={() => exportStaffRosterCSV(teachers)}
                      className="py-2.5 bg-amber-50 text-amber-900 hover:bg-amber-900 hover:text-white rounded-xl text-[11px] font-black uppercase tracking-wider transition-all flex items-center justify-center space-x-1"
                    >
                      <span>📄</span>
                      <span>CSV</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Supabase Database SQL Synchronization Card */}
            <div className="p-8 bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 text-white rounded-3xl shadow-2xl border border-blue-800/40 relative overflow-hidden">
              <div className="relative z-10 space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-blue-800/40 pb-5">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full text-[10px] font-black uppercase tracking-widest">
                        ⚡ Supabase PostgreSQL Schema
                      </span>
                      <span className="px-3 py-1 bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded-full text-[10px] font-black uppercase tracking-widest">
                        16 Tables & Realtime
                      </span>
                    </div>
                    <h4 className="text-2xl font-black font-serif text-white tracking-wide">
                      Sync Database with Supabase SQL Editor
                    </h4>
                    <p className="text-blue-200/80 text-xs sm:text-sm mt-1 max-w-2xl">
                      Instantly copy or download the master idempotent PostgreSQL script. Paste it into your Supabase SQL Editor to create or update all tables, realtime listeners, Row Level Security policies, and fee structures.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      onClick={handleCopySupabaseSql}
                      className={`px-5 py-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center space-x-2 shadow-lg ${
                        sqlCopied
                          ? 'bg-emerald-500 text-white shadow-emerald-500/30 scale-105'
                          : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/40 active:scale-95'
                      }`}
                    >
                      <span>{sqlCopied ? '✓' : '📋'}</span>
                      <span>{sqlCopied ? 'SQL Copied to Clipboard!' : 'Copy Supabase SQL'}</span>
                    </button>

                    <button
                      onClick={downloadSupabaseSchemaSql}
                      className="px-5 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center space-x-2 shadow-lg shadow-blue-900/40 active:scale-95"
                    >
                      <span>💾</span>
                      <span>Download .SQL File</span>
                    </button>

                    <button
                      onClick={() => setShowSqlPreview(!showSqlPreview)}
                      className="px-4 py-3 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center space-x-2"
                    >
                      <span>{showSqlPreview ? '▲' : '👁️'}</span>
                      <span>{showSqlPreview ? 'Hide SQL' : 'View SQL'}</span>
                    </button>
                  </div>
                </div>

                {/* 3-Step Setup Quick Guide */}
                <div className="grid sm:grid-cols-3 gap-4 text-xs">
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                    <div className="flex items-center gap-2 font-bold text-yellow-400 mb-1">
                      <span className="w-5 h-5 rounded-full bg-yellow-400 text-slate-900 flex items-center justify-center text-[10px] font-black">1</span>
                      <span>Open SQL Editor</span>
                    </div>
                    <p className="text-slate-300 text-[11px] leading-relaxed">
                      Log in to your <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer" className="text-yellow-400 underline hover:text-yellow-300 font-semibold">Supabase Dashboard</a>, pick your project, and click <strong>SQL Editor</strong> on the left.
                    </p>
                  </div>

                  <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                    <div className="flex items-center gap-2 font-bold text-yellow-400 mb-1">
                      <span className="w-5 h-5 rounded-full bg-yellow-400 text-slate-900 flex items-center justify-center text-[10px] font-black">2</span>
                      <span>Paste Master SQL</span>
                    </div>
                    <p className="text-slate-300 text-[11px] leading-relaxed">
                      Click <strong>+ New query</strong>, paste the script using the Copy button above (or from <code className="text-yellow-300 font-mono text-[10px]">supabase_schema.sql</code>).
                    </p>
                  </div>

                  <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                    <div className="flex items-center gap-2 font-bold text-yellow-400 mb-1">
                      <span className="w-5 h-5 rounded-full bg-yellow-400 text-slate-900 flex items-center justify-center text-[10px] font-black">3</span>
                      <span>Click Run</span>
                    </div>
                    <p className="text-slate-300 text-[11px] leading-relaxed">
                      Click the green <strong>Run</strong> button. All 16 tables, performance indexes, RLS security policies, and live channels will be activated.
                    </p>
                  </div>
                </div>

                {/* Optional SQL Viewer */}
                {showSqlPreview && (
                  <div className="mt-4 pt-4 border-t border-white/10">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-mono text-slate-400">supabase_schema.sql preview (ready to copy)</span>
                      <button
                        onClick={handleCopySupabaseSql}
                        className="text-xs text-yellow-400 hover:text-yellow-300 font-bold flex items-center gap-1"
                      >
                        <span>📋</span>
                        <span>{sqlCopied ? 'Copied!' : 'Copy Code'}</span>
                      </button>
                    </div>
                    <pre className="max-h-80 overflow-y-auto bg-slate-950/80 border border-white/10 rounded-2xl p-4 text-[11px] font-mono text-emerald-300 select-all leading-relaxed whitespace-pre-wrap">
                      {SUPABASE_MASTER_SQL_SCHEMA}
                    </pre>
                  </div>
                )}
              </div>
            </div>

            {/* Database & Backend Connectivity Reference Card */}
            <div className="p-8 bg-slate-50 border-2 border-slate-200 rounded-3xl">
              <h5 className="font-black text-blue-900 uppercase text-xs tracking-widest mb-2 flex items-center gap-2">
                <span>🔌</span>
                <span>Backend Database Transition Notice</span>
              </h5>
              <p className="text-slate-600 text-xs leading-relaxed">
                All downloaded files match the SQL schema defined in <code className="px-2 py-0.5 bg-white border border-slate-200 rounded font-mono text-blue-900">services/backendConnector.ts</code>. You can import these CSVs or JSON directly into PostgreSQL, MySQL, Supabase, or SQLite once the server backend is connected.
              </p>
            </div>
          </div>
        )}

        {activeTab === 'delegations' && (
          <AdminStaffDelegationManager
            teachers={teachers}
            delegations={timedStaffDelegations}
            onGrantDelegation={onGrantStaffDelegation || (() => {})}
            onRevokeDelegation={onRevokeStaffDelegation || (() => {})}
            currentUser={activeStaffName || 'School Admin'}
          />
        )}

        {activeTab === 'pageAccess' && (
          <UserPageAccessManager
            accessState={userPagesAccess || {
              allPagesClosed: false,
              globalClosedMessage: 'The user portal is temporarily undergoing scheduled administrative maintenance by the School Proprietor. Please check back shortly.',
              pages: {
                apply: { isOpen: true, closedReason: '' },
                feeChecker: { isOpen: true, closedReason: '' },
                resultChecker: { isOpen: true, closedReason: '' },
                studentReceipts: { isOpen: true, closedReason: '' },
                parentPortal: { isOpen: true, closedReason: '' },
                studentPortal: { isOpen: true, closedReason: '' },
                about: { isOpen: true, closedReason: '' },
              }
            }}
            onUpdateAccessState={onUpdateUserPagesAccess || (() => {})}
          />
        )}
      </div>

      {/* Supabase Master SQL & Realtime Configuration Viewer Modal */}
      <RealtimeSqlViewerModal
        isOpen={showSqlModal}
        onClose={() => setShowSqlModal(false)}
      />
    </div>
  );
};
