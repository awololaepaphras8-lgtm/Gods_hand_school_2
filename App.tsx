
import React, { useState, useEffect } from 'react';
import { 
  UserRole, 
  AppState, 
  StudentApplication, 
  Announcement, 
  TeacherAccount, 
  StudentResult, 
  Course, 
  GradeLevel, 
  StudentAccount, 
  FeePayment, 
  AttendanceRecord, 
  StaffPagePermission, 
  ParentAccount, 
  PaymentStatus, 
  ResultPublishRequest, 
  TimedStaffDelegation, 
  AdminSectionKey, 
  UserPagesAccessState, 
  UserPageKey, 
  ALL_USER_PAGES, 
  ClassTimetable,
  ParentStaffMessage,
  ChatChannelMessage,
  MeetingSession,
  CallSession,
  AdminRealtimeEvent
} from './types';
import { stateService } from './services/stateService';
import { setupRealtimeSync, fetchSupabaseState, realtimeService, isSupabaseConfigured } from './services/supabaseService';
import { GRADE_ORDER, getNextGradeLevel } from './constants';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { AdminPanel } from './components/AdminPanel';
import { StudentPortal } from './components/StudentPortal';
import { StudentAuth } from './components/StudentAuth';
import { StudentFeeChecker } from './components/StudentFeeChecker';
import { StudentResultChecker } from './components/StudentResultChecker';
import { StudentReceiptsDownload } from './components/StudentReceiptsDownload';
import { AdminLoginGateway } from './components/AdminLoginGateway';
import { TeacherLoginGateway } from './components/TeacherLoginGateway';
import { ParentAuth } from './components/ParentAuth';
import { ParentDashboard } from './components/ParentDashboard';
import { Footer } from './components/Footer';
import { TeacherDashboard } from './components/TeacherDashboard';
import { AboutUs } from './components/AboutUs';
import { WhatsAppChatWidget } from './components/WhatsAppChatWidget';
import { PWADownloadPrompt } from './components/PWADownloadPrompt';
import { StudentTimetableCard } from './components/StudentTimetableCard';
import { ParentStaffMessaging } from './components/ParentStaffMessaging';
import { SchoolCommunityHub } from './components/SchoolCommunityHub';
import { RealtimeSqlViewerModal } from './components/RealtimeSqlViewerModal';
import { QRCodeSVG } from 'qrcode.react';

const App: React.FC = () => {
  const [role, setRole] = useState<UserRole>(UserRole.GUEST);
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [currentParentId, setCurrentParentId] = useState<string | null>(null);
  const [state, setState] = useState<AppState>(stateService.getState());
  const [view, setView] = useState<'home' | 'portal' | 'apply' | 'admin' | 'teacherLogin' | 'teacher' | 'studentAuth' | 'feeChecker' | 'resultChecker' | 'about' | 'parentAuth' | 'parentPortal' | 'studentReceipts' | 'parentStaffChat' | 'communityHub'>('home');
  const [loginError, setLoginError] = useState('');
  const [showQRModal, setShowQRModal] = useState(false);
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
  const [showSqlModal, setShowSqlModal] = useState(false);
  const [isAppInstalled, setIsAppInstalled] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true ||
      document.referrer.includes('android-app://') ||
      localStorage.getItem('ghs_app_installed') === 'true'
    );
  });

  useEffect(() => {
    const checkInstalled = () => {
      const installed = 
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true ||
        document.referrer.includes('android-app://') ||
        localStorage.getItem('ghs_app_installed') === 'true';
      setIsAppInstalled(installed);
    };

    window.addEventListener('appinstalled', checkInstalled);
    window.addEventListener('ghs_app_installed_event', checkInstalled);
    return () => {
      window.removeEventListener('appinstalled', checkInstalled);
      window.removeEventListener('ghs_app_installed_event', checkInstalled);
    };
  }, []);

  const [selectedTermForQR, setSelectedTermForQR] = useState<string>('First Term');

  // Local storage persistence
  useEffect(() => {
    stateService.saveState(state);
  }, [state]);

  // Real-time synchronization & initial Supabase database hydration
  useEffect(() => {
    // 1. Listen for real-time changes across PostgreSQL tables and broadcast tabs
    const cleanupRealtime = setupRealtimeSync((updater) => {
      setState(updater);
    });

    // 2. Hydrate from Supabase database if configured
    if (isSupabaseConfigured()) {
      fetchSupabaseState().then(dbState => {
        if (dbState) {
          setState(prev => ({
            ...prev,
            studentAccounts: (dbState.studentAccounts && dbState.studentAccounts.length > 0) ? dbState.studentAccounts : prev.studentAccounts,
            parents: (dbState.parents && dbState.parents.length > 0) ? dbState.parents : prev.parents,
            payments: (dbState.payments && dbState.payments.length > 0) ? dbState.payments : prev.payments,
            attendance: (dbState.attendance && dbState.attendance.length > 0) ? dbState.attendance : prev.attendance,
            teachers: (dbState.teachers && dbState.teachers.length > 0) ? dbState.teachers : prev.teachers,
            courses: (dbState.courses && dbState.courses.length > 0) ? dbState.courses : prev.courses,
            results: (dbState.results && dbState.results.length > 0) ? dbState.results : prev.results,
            announcements: (dbState.announcements && dbState.announcements.length > 0) ? dbState.announcements : prev.announcements,
            applications: (dbState.applications && dbState.applications.length > 0) ? dbState.applications : prev.applications,
            fees: (dbState.fees && Object.keys(dbState.fees).length > 0) ? dbState.fees : prev.fees,
            academicCalendar: dbState.academicCalendar || prev.academicCalendar,
            timetables: (dbState.timetables && dbState.timetables.length > 0) ? dbState.timetables : prev.timetables,
            userPagesAccess: dbState.userPagesAccess || prev.userPagesAccess,
            parentStaffMessages: (dbState.parentStaffMessages && dbState.parentStaffMessages.length > 0) ? dbState.parentStaffMessages : prev.parentStaffMessages,
            chatMessages: (dbState.chatMessages && dbState.chatMessages.length > 0) ? dbState.chatMessages : prev.chatMessages,
            meetings: (dbState.meetings && dbState.meetings.length > 0) ? dbState.meetings : prev.meetings,
            callSessions: (dbState.callSessions && dbState.callSessions.length > 0) ? dbState.callSessions : prev.callSessions,
            adminEvents: (dbState.adminEvents && dbState.adminEvents.length > 0) ? dbState.adminEvents : prev.adminEvents
          }));
        }
      });
    }

    return () => {
      cleanupRealtime();
    };
  }, []);

  const updateFees = (grade: string, amount: number) => {
    setState(prev => {
      const updatedFees = { ...prev.fees, [grade]: amount };
      const updated = { ...prev, fees: updatedFees };
      stateService.saveState(updated);
      return updated;
    });
    realtimeService.updateFee(grade, amount);
  };

  const updateAllFees = (newFees: { [key: string]: number }) => {
    setState(prev => {
      const merged = { ...prev.fees, ...newFees };
      const updated = { ...prev, fees: merged };
      stateService.saveState(updated);
      return updated;
    });
    Object.entries(newFees).forEach(([grade, amount]) => {
      realtimeService.updateFee(grade, amount);
    });
  };

  const handleUpdateUserPagesAccess = (newAccessState: UserPagesAccessState) => {
    setState(prev => {
      const updated = { ...prev, userPagesAccess: newAccessState };
      stateService.saveState(updated);
      return updated;
    });
    stateService.updateUserPagesAccess(newAccessState);
    realtimeService.updateUserPagesAccess(newAccessState);
  };

  const handleBatchMarkAttendance = (records: { studentId: string; date: string; term: string; markedBy: string }[]) => {
    const existingKeys = new Set(
      state.attendance.map(a => `${a.studentId}_${a.date}_${a.term || 'First Term'}`)
    );
    const newRecordsToAdd: AttendanceRecord[] = [];

    records.forEach(rec => {
      const key = `${rec.studentId}_${rec.date}_${rec.term}`;
      if (!existingKeys.has(key)) {
        newRecordsToAdd.push({
          studentId: rec.studentId,
          date: rec.date,
          markedBy: rec.markedBy,
          term: rec.term
        });
        existingKeys.add(key);
      }
    });

    if (newRecordsToAdd.length > 0) {
      setState(prev => {
        const updatedAttendance = [...prev.attendance, ...newRecordsToAdd];
        const updated = { ...prev, attendance: updatedAttendance };
        stateService.saveState(updated);
        return updated;
      });
      newRecordsToAdd.forEach(r => realtimeService.recordAttendance(r));
    }
  };

  const updateCalendar = (content: string) => {
    setState(prev => ({
        ...prev,
        academicCalendar: content
    }));
    realtimeService.updateCalendar(content);
  };

  const addAnnouncement = (title: string, content: string) => {
    const newAnn: Announcement = {
      id: Date.now().toString(),
      title,
      content,
      date: new Date().toLocaleDateString()
    };
    setState(prev => ({
      ...prev,
      announcements: [newAnn, ...prev.announcements]
    }));
    realtimeService.addAnnouncement(newAnn);
  };

  const updateAnnouncement = (announcement: Announcement) => {
    setState(prev => ({
      ...prev,
      announcements: prev.announcements.map(a => a.id === announcement.id ? announcement : a)
    }));
    realtimeService.updateAnnouncement(announcement);
  };

  const deleteAnnouncement = (id: string) => {
    setState(prev => ({
      ...prev,
      announcements: prev.announcements.filter(a => a.id !== id)
    }));
    realtimeService.deleteAnnouncement(id);
  };

  const addCourse = (name: string, grade: GradeLevel, description: string) => {
    const newCourse: Course = {
      id: 'CRS-' + Date.now(),
      name,
      grade,
      description
    };
    setState(prev => ({
      ...prev,
      courses: [...prev.courses, newCourse]
    }));
    realtimeService.addCourse(newCourse);
  };

  const duplicateCourse = (courseId: string, targetGrades: GradeLevel[]) => {
    const original = state.courses.find(c => c.id === courseId);
    if (!original || targetGrades.length === 0) return;

    const newCourses: Course[] = targetGrades.map(g => ({
      id: 'CRS-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
      name: original.name,
      grade: g,
      description: original.description
    }));

    setState(prev => ({
      ...prev,
      courses: [...prev.courses, ...newCourses]
    }));
    newCourses.forEach(c => realtimeService.addCourse(c));
  };

  const addResult = (resultData: Omit<StudentResult, 'id' | 'date' | 'teacherName'>) => {
    const newResult: StudentResult = {
      ...resultData,
      id: 'RES-' + Date.now(),
      date: new Date().toLocaleDateString(),
      teacherName: currentUser || 'Unknown Teacher'
    };
    setState(prev => ({
      ...prev,
      results: [newResult, ...prev.results]
    }));
    realtimeService.addResult(newResult);
  };

  const handleRequestPublishResults = (grade: GradeLevel, term: string, subject?: string) => {
    const studentCount = state.studentAccounts.filter(s => s.grade === grade).length;
    const scoreCount = state.results.filter(r => r.grade === grade && r.term.toLowerCase() === term.toLowerCase()).length;
    
    const newReq: ResultPublishRequest = {
      id: `PUB-REQ-${Date.now()}`,
      teacherName: currentUser || 'Staff',
      grade,
      term,
      subject,
      studentCount,
      scoreCount,
      status: 'pending',
      timestamp: new Date().toISOString()
    };

    setState(prev => {
      const existing = (prev.resultPublishRequests || []).filter(r => !(r.grade === grade && r.term.toLowerCase() === term.toLowerCase()));
      return {
        ...prev,
        resultPublishRequests: [newReq, ...existing]
      };
    });
    realtimeService.submitResultPublishRequest(newReq);
  };

  const handleApprovePublishRequest = (requestId: string) => {
    const now = new Date().toISOString();
    const reviewer = currentUser || 'School Administrator';

    const req = (state.resultPublishRequests || []).find(r => r.id === requestId);
    if (!req) return;

    const updatedReq: ResultPublishRequest = {
      ...req,
      status: 'approved',
      reviewedAt: now,
      reviewedBy: reviewer
    };

    const updatedResults = state.results.map(res => {
      if (res.grade === req.grade && res.term.toLowerCase() === req.term.toLowerCase()) {
        return { ...res, published: true };
      }
      return res;
    });

    const publishAnnouncement: Announcement = {
      id: `ANN-${Date.now()}`,
      title: `Official Report Cards Released: ${req.grade} (${req.term})`,
      content: `Academic assessment and terminal report cards for ${req.grade} (${req.term}) have been officially approved and published. Students and parents can now check positions and download standard PDF result sheets.`,
      date: new Date().toLocaleDateString()
    };

    setState(prev => {
      const updatedRequests = (prev.resultPublishRequests || []).map(r => 
        r.id === requestId ? updatedReq : r
      );

      return {
        ...prev,
        resultPublishRequests: updatedRequests,
        results: updatedResults,
        announcements: [publishAnnouncement, ...prev.announcements]
      };
    });

    realtimeService.submitResultPublishRequest(updatedReq);
    updatedResults
      .filter(res => res.grade === req.grade && res.term.toLowerCase() === req.term.toLowerCase())
      .forEach(res => realtimeService.updateResult(res));
    realtimeService.addAnnouncement(publishAnnouncement);
  };

  const handleRejectPublishRequest = (requestId: string, feedback: string) => {
    const now = new Date().toISOString();
    const reviewer = currentUser || 'School Administrator';

    const req = (state.resultPublishRequests || []).find(r => r.id === requestId);
    if (!req) return;

    const updatedReq: ResultPublishRequest = {
      ...req,
      status: 'rejected',
      reviewedAt: now,
      reviewedBy: reviewer,
      adminFeedback: feedback
    };

    setState(prev => ({
      ...prev,
      resultPublishRequests: (prev.resultPublishRequests || []).map(r => 
        r.id === requestId ? updatedReq : r
      )
    }));

    realtimeService.submitResultPublishRequest(updatedReq);
  };

  const handleSendResultsToPupils = (grade: GradeLevel, term: string) => {
    const updatedResults = state.results.map(r => {
      if (r.grade === grade && r.term.toLowerCase() === term.toLowerCase()) {
        return { ...r, published: true };
      }
      return r;
    });

    const publishAnnouncement: Announcement = {
      id: `ANN-${Date.now()}`,
      title: `Official Terminal Results: ${grade} (${term})`,
      content: `All terminal scores and report cards for ${grade} (${term}) have been delivered to all pupils. Log in to your student or parent dashboard to view standings and download your official report card.`,
      date: new Date().toLocaleDateString()
    };

    setState(prev => {
      const updatedRequests = (prev.resultPublishRequests || []).map(r => {
        if (r.grade === grade && r.term.toLowerCase() === term.toLowerCase()) {
          return { ...r, status: 'approved' as const };
        }
        return r;
      });

      return {
        ...prev,
        results: updatedResults,
        resultPublishRequests: updatedRequests,
        announcements: [publishAnnouncement, ...prev.announcements]
      };
    });

    updatedResults
      .filter(r => r.grade === grade && r.term.toLowerCase() === term.toLowerCase())
      .forEach(r => realtimeService.updateResult(r));
    realtimeService.addAnnouncement(publishAnnouncement);
  };

  const handleGrantStaffDelegation = (delegationData: {
    teacherUsername: string;
    teacherName: string;
    grantedSections: AdminSectionKey[];
    durationMinutes: number;
    purpose?: string;
  }) => {
    const grantedAt = new Date();
    const expiresAt = new Date(grantedAt.getTime() + delegationData.durationMinutes * 60000);

    const newDelegation: TimedStaffDelegation = {
      id: `DEL-${Date.now()}`,
      teacherUsername: delegationData.teacherUsername,
      teacherName: delegationData.teacherName,
      grantedSections: delegationData.grantedSections,
      grantedAt: grantedAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
      durationMinutes: delegationData.durationMinutes,
      grantedBy: currentUser || 'Proprietor / Admin',
      purpose: delegationData.purpose,
      status: 'active'
    };

    setState(prev => {
      const existing = (prev.timedStaffDelegations || []).map(d =>
        d.teacherUsername === delegationData.teacherUsername && d.status === 'active'
          ? { ...d, status: 'revoked' as const }
          : d
      );
      return {
        ...prev,
        timedStaffDelegations: [newDelegation, ...existing]
      };
    });

    realtimeService.addTimedStaffDelegation(newDelegation);
  };

  const handleRevokeStaffDelegation = (delegationId: string) => {
    const target = (state.timedStaffDelegations || []).find(d => d.id === delegationId);
    if (!target) return;

    const revoked: TimedStaffDelegation = {
      ...target,
      status: 'revoked'
    };

    setState(prev => ({
      ...prev,
      timedStaffDelegations: (prev.timedStaffDelegations || []).map(d =>
        d.id === delegationId ? revoked : d
      )
    }));

    realtimeService.updateTimedStaffDelegation(revoked);
  };

  const addPayment = (paymentData: Omit<FeePayment, 'id' | 'date'>) => {
    const newPayment: FeePayment = {
      ...paymentData,
      id: 'PAY-' + Math.random().toString(36).substr(2, 6).toUpperCase(),
      date: new Date().toISOString()
    };
    setState(prev => ({
      ...prev,
      payments: [newPayment, ...prev.payments]
    }));
    realtimeService.recordPayment(newPayment);
    return newPayment;
  };

  const markAttendance = (studentId: string, term: string = 'First Term') => {
    const today = new Date().toLocaleDateString();
    const alreadyMarked = state.attendance.some(a => a.studentId === studentId && a.date === today && (a.term === term || (!a.term && term === 'First Term')));
    
    if (alreadyMarked) return false;

    const newRecord: AttendanceRecord = {
      studentId,
      date: today,
      markedBy: currentUser || 'Staff',
      term: term
    };

    setState(prev => ({
      ...prev,
      attendance: [...prev.attendance, newRecord]
    }));
    realtimeService.recordAttendance(newRecord);
    return true;
  };

  const generateTermQrCode = (studentId: string, term: string) => {
    const student = state.studentAccounts.find(s => s.id === studentId);
    if (!student) return { success: false, message: 'Student account not found' };

    const currentInfo = student.qrGenerations?.[term] || { count: 0, qrCodeValue: '', generatedAt: '' };

    if (currentInfo.count >= 2) {
      alert(`Limit reached: You can only generate a QR code twice per term (${term}).`);
      return { success: false, message: 'Limit reached (2 generations max per term)' };
    }

    const newCount = currentInfo.count + 1;
    const newQrValue = `GHS-ATT|${studentId}|${term}|${Date.now()}`;

    const updatedGenerations = {
      ...(student.qrGenerations || {}),
      [term]: {
        count: newCount,
        qrCodeValue: newQrValue,
        generatedAt: new Date().toISOString()
      }
    };

    setState(prev => ({
      ...prev,
      studentAccounts: prev.studentAccounts.map(s => 
        s.id === studentId 
          ? { ...s, qrGenerations: updatedGenerations, activeTerm: term } 
          : s
      )
    }));

    realtimeService.addStudent({
      ...student,
      qrGenerations: updatedGenerations,
      activeTerm: term
    });

    return { success: true, qrCodeValue: newQrValue };
  };

  const createStudentAccount = (account: Omit<StudentAccount, 'id' | 'createdAt'>) => {
    if (state.studentAccounts.some(s => s.email === account.email)) {
      setLoginError("An account with this email already exists.");
      return;
    }
    const newAccount: StudentAccount = {
      ...account,
      id: 'STU-' + Date.now(),
      createdAt: new Date().toISOString()
    };
    setState(prev => ({
      ...prev,
      studentAccounts: [...prev.studentAccounts, newAccount]
    }));
    realtimeService.addStudent(newAccount);
    setRole(UserRole.STUDENT);
    setCurrentUser(newAccount.name);
    setView('portal');
    setLoginError('');
  };

  const createTeacherAccount = (teacher: Omit<TeacherAccount, 'id' | 'createdAt'>) => {
    const newTeacher: TeacherAccount = {
      ...teacher,
      id: 'TCH-' + Date.now(),
      createdAt: new Date().toISOString()
    };
    setState(prev => ({
      ...prev,
      teachers: [...prev.teachers, newTeacher]
    }));
    realtimeService.addTeacher(newTeacher);
  };

  const updateTeacherPermissions = (teacherId: string, allowedPages: StaffPagePermission[]) => {
    setState(prev => ({
      ...prev,
      teachers: prev.teachers.map(t => t.id === teacherId ? { ...t, allowedPages } : t)
    }));
    const teacher = state.teachers.find(t => t.id === teacherId);
    if (teacher) {
      realtimeService.addTeacher({ ...teacher, allowedPages });
    }
  };

  const deleteTeacherAccount = (teacherId: string) => {
    setState(prev => ({
      ...prev,
      teachers: prev.teachers.filter(t => t.id !== teacherId)
    }));
    realtimeService.deleteTeacher(teacherId);
  };

  const shiftStudentToNextClass = (studentId: string) => {
    setState(prev => {
      const student = prev.studentAccounts.find(s => s.id === studentId);
      if (!student) return prev;

      const nextGrade = getNextGradeLevel(student.grade);
      if (!nextGrade) {
        return prev;
      }

      const updatedStudent: StudentAccount = {
        ...student,
        grade: nextGrade as GradeLevel,
        qrCodeVersion: (student.qrCodeVersion || 0) + 1
      };

      const updatedAccounts = prev.studentAccounts.map(s => 
        s.id === studentId ? updatedStudent : s
      );

      realtimeService.addStudent(updatedStudent);

      return { ...prev, studentAccounts: updatedAccounts };
    });
  };

  const shiftMultipleStudentsToNextClass = (studentIds: string[]) => {
    setState(prev => {
      let accounts = [...prev.studentAccounts];
      studentIds.forEach(id => {
        const student = accounts.find(s => s.id === id);
        if (student) {
          const nextGrade = getNextGradeLevel(student.grade);
          if (nextGrade) {
            const updatedStudent: StudentAccount = {
              ...student,
              grade: nextGrade as GradeLevel,
              qrCodeVersion: (student.qrCodeVersion || 0) + 1
            };
            accounts = accounts.map(s => s.id === id ? updatedStudent : s);
            realtimeService.addStudent(updatedStudent);
          }
        }
      });
      return { ...prev, studentAccounts: accounts };
    });
  };

  const handleSaveClassTimetable = (timetable: ClassTimetable) => {
    setState(prev => {
      const list = prev.timetables || [];
      const exists = list.some(t => t.id === timetable.id || (t.grade === timetable.grade && (t.term || 'First Term') === (timetable.term || 'First Term')));
      const updated = exists
        ? list.map(t => (t.id === timetable.id || (t.grade === timetable.grade && (t.term || 'First Term') === (timetable.term || 'First Term'))) ? timetable : t)
        : [...list, timetable];
      return { ...prev, timetables: updated };
    });
    realtimeService.saveClassTimetable(timetable);
  };

  const toggleStudentEntry = (studentId: string, allowed: boolean) => {
    setState(prev => ({
      ...prev,
      studentAccounts: prev.studentAccounts.map(s => 
        s.id === studentId ? { ...s, entryAllowed: allowed } : s
      )
    }));
    realtimeService.toggleStudentEntry(studentId, allowed);
  };

  const handleStudentLogin = (emailOrId: string, pass: string): boolean => {
    const query = emailOrId.trim().toLowerCase();
    const student = state.studentAccounts.find(s => 
      (s.email.toLowerCase() === query || s.id.toLowerCase() === query) && s.password === pass
    );
    if (student) {
      setRole(UserRole.STUDENT);
      setCurrentUser(student.name);
      setLoginError('');
      setView('portal');
      return true;
    } else {
      setLoginError("Invalid student credentials.");
      return false;
    }
  };

  const [adminSecurityKey, setAdminSecurityKey] = useState<string>(() => {
    return localStorage.getItem('ghs_admin_security_key') || '197005';
  });

  const handleAdminLoginAttempt = (email: string, password: string) => {
    if (email.trim().length > 0 && password === adminSecurityKey) {
      setRole(UserRole.ADMIN);
      setCurrentUser(email);
      setLoginError('');
      setView('admin');
      return;
    } 
    setLoginError('Invalid admin email or security key.');
  };

  const handleResetAdminKey = (newKey: string) => {
    setAdminSecurityKey(newKey);
    localStorage.setItem('ghs_admin_security_key', newKey);
  };

  const handleResetTeacherPassword = (username: string, newPass: string): boolean => {
    const cleanUser = username.trim().toLowerCase();
    const teacher = state.teachers.find(t => t.username.toLowerCase() === cleanUser);
    if (!teacher) return false;
    const updated = { ...teacher, password: newPass };
    setState(prev => ({
      ...prev,
      teachers: prev.teachers.map(t => t.username.toLowerCase() === cleanUser ? updated : t)
    }));
    realtimeService.addTeacher(updated);
    return true;
  };

  const handleResetStudentPassword = (emailOrId: string, newPass: string): boolean => {
    const query = emailOrId.trim().toLowerCase();
    const student = state.studentAccounts.find(s => 
      s.email.toLowerCase() === query || s.id.toLowerCase() === query
    );
    if (!student) return false;
    const updated = { ...student, password: newPass };
    setState(prev => ({
      ...prev,
      studentAccounts: prev.studentAccounts.map(s => s.id === student.id ? updated : s)
    }));
    realtimeService.addStudent(updated);
    return true;
  };

  const handleResetParentPassword = (email: string, newPass: string): boolean => {
    const cleanEmail = email.trim().toLowerCase();
    const parent = (state.parents || []).find(p => p.email.toLowerCase() === cleanEmail);
    if (!parent) return false;
    const updated = { ...parent, password: newPass };
    setState(prev => ({
      ...prev,
      parents: (prev.parents || []).map(p => p.id === parent.id ? updated : p)
    }));
    realtimeService.registerParent(updated);
    return true;
  };

  const handleTeacherLoginAttempt = (username: string, password: string) => {
    const teacher = state.teachers.find(t => t.username === username && t.password === password);
    if (teacher) {
      setRole(UserRole.TEACHER);
      setCurrentUser(teacher.username);
      setView('teacher');
      setLoginError('');
      return;
    }
    setLoginError('Incorrect teacher username or password.');
  };

  const handleParentLogin = (emailOrPhone: string, pass: string): boolean => {
    const query = emailOrPhone.trim().toLowerCase();
    const parent = (state.parents || []).find(p => 
      (p.email.toLowerCase() === query || p.phone.trim() === emailOrPhone.trim() || p.id.toLowerCase() === query) && p.password === pass
    );
    if (parent) {
      setRole(UserRole.PARENT);
      setCurrentUser(parent.fullName);
      setCurrentParentId(parent.id);
      setLoginError('');
      setView('parentPortal');
      return true;
    } else {
      setLoginError('Invalid parent email, phone number, or password.');
      return false;
    }
  };

  const handleParentRegister = (data: Omit<ParentAccount, 'id' | 'createdAt'>): boolean => {
    const existing = (state.parents || []).find(p => p.email.toLowerCase() === data.email.toLowerCase());
    if (existing) {
      setLoginError('An account with this email address already exists.');
      return false;
    }
    const newParent: ParentAccount = {
      ...data,
      id: `PAR-${Date.now().toString().slice(-5)}`,
      createdAt: new Date().toISOString(),
      childrenStudentIds: data.childrenStudentIds || []
    };

    setState(prev => ({
      ...prev,
      parents: [...(prev.parents || []), newParent]
    }));

    realtimeService.registerParent(newParent);

    setRole(UserRole.PARENT);
    setCurrentUser(newParent.fullName);
    setCurrentParentId(newParent.id);
    setLoginError('');
    setView('parentPortal');
    return true;
  };

  const handleAddExistingChild = (studentId: string): boolean => {
    const parentToUpdate = currentParentObj;
    if (!parentToUpdate) return false;
    const cleanId = studentId.trim();
    if (!cleanId) return false;

    // Case-insensitive lookup so STU-1, stu-1, or padded strings match cleanly
    const student = state.studentAccounts.find(s => 
      s.id.trim().toUpperCase() === cleanId.toUpperCase()
    );
    if (!student) return false;

    const currentLinks = parentToUpdate.childrenStudentIds || [];
    if (currentLinks.some(id => id.trim().toUpperCase() === student.id.toUpperCase())) {
      return false;
    }

    setState(prev => ({
      ...prev,
      parents: (prev.parents || []).map(p => 
        p.id === parentToUpdate.id 
          ? { ...p, childrenStudentIds: [...(p.childrenStudentIds || []), student.id] }
          : p
      ),
      studentAccounts: prev.studentAccounts.map(s => 
        s.id === student.id ? { ...s, parentId: parentToUpdate.id, parentEmail: parentToUpdate.email } : s
      )
    }));

    realtimeService.linkChild(parentToUpdate.id, student.id);
    return true;
  };

  const handleRegisterNewChild = (childData: { name: string; grade: GradeLevel; email?: string; password?: string }): StudentAccount => {
    const newId = `STU-${(state.studentAccounts.length + 1).toString().padStart(3, '0')}`;
    const newStudent: StudentAccount = {
      id: newId,
      name: childData.name,
      grade: childData.grade,
      email: childData.email || `${childData.name.toLowerCase().replace(/\s+/g, '.')}.${Date.now().toString().slice(-4)}@godshand.sch.ng`,
      password: childData.password || 'student123',
      createdAt: new Date().toISOString(),
      entryAllowed: true,
      activeTerm: 'First Term',
      parentId: currentParentId || undefined,
      parentEmail: currentParentObj?.email
    };

    setState(prev => ({
      ...prev,
      studentAccounts: [...prev.studentAccounts, newStudent],
      parents: currentParentId 
        ? (prev.parents || []).map(p => 
            p.id === currentParentId 
              ? { ...p, childrenStudentIds: [...p.childrenStudentIds, newStudent.id] }
              : p
          )
        : prev.parents
    }));

    realtimeService.addStudent(newStudent);
    if (currentParentId) {
      realtimeService.linkChild(currentParentId, newStudent.id);
    }

    return newStudent;
  };

  const handleUnlinkChild = (studentId: string) => {
    if (!currentParentId) return;
    setState(prev => ({
      ...prev,
      parents: (prev.parents || []).map(p => 
        p.id === currentParentId 
          ? { ...p, childrenStudentIds: p.childrenStudentIds.filter(id => id !== studentId) }
          : p
      )
    }));
  };

  const handleAdminUnlinkChild = (parentId: string, studentId: string) => {
    setState(prev => ({
      ...prev,
      parents: (prev.parents || []).map(p => 
        p.id === parentId 
          ? { ...p, childrenStudentIds: p.childrenStudentIds.filter(id => id !== studentId) }
          : p
      ),
      studentAccounts: prev.studentAccounts.map(s => 
        (s.id === studentId && s.parentId === parentId)
          ? { ...s, parentId: undefined, parentEmail: undefined }
          : s
      )
    }));

    realtimeService.delinkChild(parentId, studentId);
  };

  const handleSubmitParentPayment = (paymentData: Omit<FeePayment, 'id' | 'date'>): FeePayment => {
    const newPayment: FeePayment = {
      ...paymentData,
      id: `PAY-${Date.now().toString().slice(-6)}`,
      date: new Date().toISOString(),
      status: 'pending'
    };

    setState(prev => ({
      ...prev,
      payments: [newPayment, ...prev.payments]
    }));

    realtimeService.recordPayment(newPayment);
    return newPayment;
  };

  const handleConfirmPayment = (paymentId: string, adminNote?: string) => {
    const now = new Date().toISOString();
    const reviewer = currentUser || 'School Administrator';
    setState(prev => ({
      ...prev,
      payments: prev.payments.map(p => p.id === paymentId ? {
        ...p,
        status: 'confirmed' as PaymentStatus,
        adminNote: adminNote || p.adminNote,
        reviewedBy: reviewer,
        reviewedAt: now
      } : p)
    }));

    const target = state.payments.find(p => p.id === paymentId);
    if (target) {
      realtimeService.recordPayment({
        ...target,
        status: 'confirmed',
        adminNote: adminNote || target.adminNote,
        reviewedBy: reviewer,
        reviewedAt: now
      });
    }
  };

  const handleDeclinePayment = (paymentId: string, reason: string) => {
    const now = new Date().toISOString();
    const reviewer = currentUser || 'School Administrator';
    setState(prev => ({
      ...prev,
      payments: prev.payments.map(p => p.id === paymentId ? {
        ...p,
        status: 'declined' as PaymentStatus,
        adminNote: reason,
        reviewedBy: reviewer,
        reviewedAt: now
      } : p)
    }));

    const target = state.payments.find(p => p.id === paymentId);
    if (target) {
      realtimeService.recordPayment({
        ...target,
        status: 'declined',
        adminNote: reason,
        reviewedBy: reviewer,
        reviewedAt: now
      });
    }
  };

  const handleConfirmAllPending = () => {
    const now = new Date().toISOString();
    const reviewer = currentUser || 'School Administrator';
    setState(prev => ({
      ...prev,
      payments: prev.payments.map(p => p.status === 'pending' ? {
        ...p,
        status: 'confirmed' as PaymentStatus,
        reviewedBy: reviewer,
        reviewedAt: now
      } : p)
    }));
    state.payments.filter(p => p.status === 'pending').forEach(p => {
      realtimeService.recordPayment({
        ...p,
        status: 'confirmed',
        reviewedBy: reviewer,
        reviewedAt: now
      });
    });
  };

  const handleAddPaymentChatMessage = (paymentId: string, message: string, sender: 'admin' | 'student') => {
    const newMsg = {
      id: 'MSG-' + Date.now(),
      sender,
      senderName: currentUser || (sender === 'admin' ? 'School Administrator' : 'Parent/Student'),
      message,
      timestamp: new Date().toISOString()
    };
    setState(prev => ({
      ...prev,
      payments: prev.payments.map(p => {
        if (p.id === paymentId) {
          const msgs = p.messages || [];
          return { ...p, messages: [...msgs, newMsg] };
        }
        return p;
      })
    }));

    const target = state.payments.find(p => p.id === paymentId);
    if (target) {
      realtimeService.recordPayment({
        ...target,
        messages: [...(target.messages || []), newMsg]
      });
    }
  };

  const handleSimulateGateScan = (studentId: string) => {
    const today = new Date().toLocaleDateString();
    const existingToday = state.attendance.find(a => a.studentId === studentId && a.date === today);

    if (existingToday) {
      const updatedRecord: AttendanceRecord = {
        ...existingToday,
        markedBy: 'Campus Gate Scanner (Live Re-Scan)'
      };
      setState(prev => ({
        ...prev,
        attendance: prev.attendance.map(a => 
          (a.studentId === studentId && a.date === today) 
            ? updatedRecord 
            : a
        )
      }));
      realtimeService.recordAttendance(updatedRecord);
    } else {
      const newRecord: AttendanceRecord = {
        studentId,
        date: today,
        markedBy: 'Campus Gate Security Scanner',
        term: 'First Term'
      };
      setState(prev => ({
        ...prev,
        attendance: [newRecord, ...prev.attendance]
      }));
      realtimeService.recordAttendance(newRecord);
    }
  };

  const handleSendParentMessage = (msgData: Omit<ParentStaffMessage, 'id' | 'timestamp'>) => {
    const newMsg: ParentStaffMessage = {
      ...msgData,
      id: 'PSM-' + Date.now(),
      timestamp: new Date().toISOString()
    };
    setState(prev => ({
      ...prev,
      parentStaffMessages: [newMsg, ...(prev.parentStaffMessages || [])]
    }));
    realtimeService.sendParentStaffMessage(newMsg);
  };

  const handleSendChatMessage = (msgData: Omit<ChatChannelMessage, 'id' | 'timestamp'>) => {
    const newMsg: ChatChannelMessage = {
      ...msgData,
      id: 'CHAT-' + Date.now(),
      timestamp: new Date().toISOString()
    };
    setState(prev => ({
      ...prev,
      chatMessages: [...(prev.chatMessages || []), newMsg]
    }));
    realtimeService.sendChatMessage(newMsg);
  };

  const handleCreateMeeting = (meetingData: Omit<MeetingSession, 'id' | 'createdAt'>) => {
    const meeting: MeetingSession = {
      ...meetingData,
      id: 'MTG-' + Date.now(),
      createdAt: new Date().toISOString()
    };
    setState(prev => ({
      ...prev,
      meetings: [meeting, ...(prev.meetings || [])]
    }));
    realtimeService.createMeeting(meeting);
  };

  const handleInitiateCall = (receiverId: string, receiverName: string, receiverRole: UserRole, type: 'voice' | 'video') => {
    const callerName = currentUser || (role === UserRole.PARENT ? (currentParentObj?.fullName || 'Parent') : 'Caller');
    const session: CallSession = {
      id: 'CALL-' + Date.now(),
      callerId: currentUser || (currentParentObj?.id) || 'usr-' + Date.now(),
      callerName,
      callerRole: role,
      receiverId,
      receiverName,
      receiverRole,
      type,
      status: 'ringing',
      startedAt: new Date().toISOString()
    };
    setState(prev => ({
      ...prev,
      callSessions: [session, ...(prev.callSessions || [])]
    }));
    realtimeService.initiateCall(session);
  };

  const handleUpdateCallStatus = (callId: string, status: CallSession['status']) => {
    setState(prev => ({
      ...prev,
      callSessions: (prev.callSessions || []).map(c => c.id === callId ? { ...c, status } : c)
    }));
    realtimeService.updateCallStatus(callId, status);
  };

  const handleNav = (v: any) => {
    if ((v === 'apply' || v === 'portal') && role === UserRole.GUEST) {
        setLoginError("You must log in to access admission forms and school fees.");
        setView('studentAuth');
        return;
    }
    if (v === 'parentPortal' && role !== UserRole.PARENT) {
      setView('parentAuth');
      return;
    }
    setLoginError('');
    setView(v);
  };

  const currentStudentObj = role === UserRole.STUDENT ? state.studentAccounts.find(s => s.name === currentUser) : null;
  const currentTeacherObj = role === UserRole.TEACHER ? state.teachers.find(t => t.username === currentUser) : null;
  const currentParentObj = (role === UserRole.PARENT && (currentParentId || currentUser))
    ? (state.parents || []).find(p => p.id === currentParentId || p.fullName === currentUser || p.email.toLowerCase() === currentUser?.toLowerCase())
    : null;

  const activeTeacherDelegation = (role === UserRole.TEACHER && currentUser)
    ? (state.timedStaffDelegations || []).find(
        d => d.teacherUsername === currentUser && d.status === 'active' && new Date(d.expiresAt) > new Date()
      )
    : null;

  const studentPayments = state.payments.filter(p => p.studentName === currentUser);
  const totalPaid = studentPayments.reduce((acc, p) => acc + p.amount, 0);
  const targetFee = currentStudentObj ? state.fees[currentStudentObj.grade] : 0;
  const paymentProgress = targetFee > 0 ? Math.min(100, Math.round((totalPaid / targetFee) * 100)) : 0;

  const getPageClosedStatus = (pageView: string): { isClosed: boolean; pageName: string; notice: string } => {
    if (role === UserRole.ADMIN) {
      return { isClosed: false, pageName: '', notice: '' };
    }

    const access = state.userPagesAccess;
    if (!access) {
      return { isClosed: false, pageName: '', notice: '' };
    }

    let pageKey: UserPageKey | null = null;
    if (pageView === 'apply') pageKey = 'apply';
    else if (pageView === 'feeChecker') pageKey = 'feeChecker';
    else if (pageView === 'resultChecker') pageKey = 'resultChecker';
    else if (pageView === 'studentReceipts') pageKey = 'studentReceipts';
    else if (pageView === 'parentPortal' || pageView === 'parentAuth') pageKey = 'parentPortal';
    else if (pageView === 'portal' || pageView === 'studentAuth') pageKey = 'studentPortal';
    else if (pageView === 'parentStaffChat') pageKey = 'parentStaffChat';
    else if (pageView === 'communityHub') pageKey = 'communityHub';
    else if (pageView === 'about') pageKey = 'about';

    if (!pageKey) {
      return { isClosed: false, pageName: '', notice: '' };
    }

    const pageMeta = ALL_USER_PAGES.find(p => p.id === pageKey);
    const pageTitle = pageMeta?.label || 'This Portal Section';

    if (access.allPagesClosed) {
      return {
        isClosed: true,
        pageName: pageTitle,
        notice: access.globalClosedMessage || 'All user pages are temporarily undergoing scheduled administrative maintenance by the School Proprietor. Please check back shortly.'
      };
    }

    const pageItem = access.pages?.[pageKey];
    if (pageItem && pageItem.isOpen === false) {
      return {
        isClosed: true,
        pageName: pageTitle,
        notice: pageItem.closedReason || `${pageTitle} is temporarily closed by administrative directive.`
      };
    }

    return { isClosed: false, pageName: '', notice: '' };
  };

  const closedStatus = getPageClosedStatus(view);

  return (
    <div className="min-h-screen flex flex-col font-sans bg-slate-50">
      <Header 
        role={role} 
        setRole={setRole} 
        setView={handleNav} 
        activeView={view} 
        onOpenDownloadModal={() => setIsDownloadModalOpen(true)}
        isAppInstalled={isAppInstalled}
        hasActiveDelegation={!!activeTeacherDelegation}
      />

      <main className="flex-grow">
        {closedStatus.isClosed ? (
          <div className="max-w-3xl mx-auto py-16 px-4">
            <div className="bg-white rounded-[2.5rem] border-4 border-amber-300 p-8 sm:p-12 shadow-2xl text-center space-y-6">
              <div className="w-20 h-20 bg-amber-100 text-amber-900 rounded-3xl flex items-center justify-center text-4xl mx-auto border-2 border-amber-200 shadow-inner">
                🔒
              </div>

              <div>
                <span className="inline-block px-4 py-1.5 bg-amber-100 text-amber-900 text-xs font-black uppercase tracking-widest rounded-full mb-3">
                  Administrative Access Restriction
                </span>
                <h2 className="text-2xl sm:text-3xl font-black text-blue-950 font-serif">
                  {closedStatus.pageName} is Temporarily Closed
                </h2>
                <p className="text-sm text-slate-500 font-medium mt-2">
                  Access to this portal section is presently closed by the School Administration.
                </p>
              </div>

              <div className="p-6 bg-slate-50 border-2 border-slate-200 rounded-3xl text-left">
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                  Official Proprietor / Administrative Note:
                </p>
                <p className="text-sm font-bold text-blue-900 leading-relaxed">
                  "{closedStatus.notice}"
                </p>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setView('home');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="w-full sm:w-auto px-8 py-4 bg-blue-950 hover:bg-blue-900 text-yellow-400 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl transition-all hover:scale-105 active:scale-95"
                >
                  Return to Homepage
                </button>

                <a
                  href="https://wa.me/2348000000000?text=Hello%20God's%20Heritage%20Schools,%20I%20need%20inquiry%20regarding%20closed%20portal%20page"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto px-6 py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
                >
                  <span>💬</span>
                  <span>Contact School Admin</span>
                </a>
              </div>
            </div>
          </div>
        ) : (
          <>
            {view === 'home' && (
          <Hero 
            announcements={state.announcements} 
            calendar={state.academicCalendar}
            onApply={() => handleNav('apply')}
            onAbout={() => handleNav('about')}
            onCheckFees={() => handleNav('feeChecker')}
            onParentPortal={() => handleNav(role === UserRole.PARENT ? 'parentPortal' : 'parentAuth')}
            onOpenDownloadModal={() => setIsDownloadModalOpen(true)}
            isAppInstalled={isAppInstalled}
          />
        )}

        {view === 'parentAuth' && (
          <ParentAuth 
            onLogin={handleParentLogin}
            onRegister={handleParentRegister}
            onBack={() => setView('home')}
            error={loginError}
            onResetPassword={handleResetParentPassword}
          />
        )}

        {view === 'parentPortal' && (
          role === UserRole.PARENT && currentParentObj ? (
            <ParentDashboard 
              parent={currentParentObj}
              allStudents={state.studentAccounts}
              fees={state.fees}
              payments={state.payments}
              attendance={state.attendance}
              results={state.results}
              calendar={state.academicCalendar}
              announcements={state.announcements}
              onAddExistingChild={handleAddExistingChild}
              onRegisterNewChild={handleRegisterNewChild}
              onUnlinkChild={handleUnlinkChild}
              onSubmitFeePayment={handleSubmitParentPayment}
              onSimulateGateScan={handleSimulateGateScan}
              onGoToReceipts={() => {
                setView('studentReceipts');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              onMessageTeacher={() => {
                setView('parentStaffChat');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              onGoToCommunity={() => {
                setView('communityHub');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              onLogout={() => {
                setRole(UserRole.GUEST);
                setCurrentUser(null);
                setCurrentParentId(null);
                setView('home');
              }}
            />
          ) : (
            <ParentAuth 
              onLogin={handleParentLogin}
              onRegister={handleParentRegister}
              onBack={() => setView('home')}
              error={loginError || 'Please log in to access your parent portal.'}
              onResetPassword={handleResetParentPassword}
            />
          )
        )}

        {view === 'about' && (
          <AboutUs 
            onApply={() => handleNav('apply')}
            onCheckFees={() => handleNav('feeChecker')}
            onBack={() => handleNav('home')}
          />
        )}

        {view === 'apply' && (
          <div className="max-w-4xl mx-auto py-12 px-4">
            <StudentPortal 
              fees={state.fees} 
              existingPayments={studentPayments}
              currentStudentId={currentStudentObj?.id || null}
              currentStudentName={currentStudentObj?.name || null}
              currentStudentGrade={currentStudentObj?.grade || null}
              onSubmit={addPayment} 
              onBack={() => setView(role === UserRole.STUDENT ? 'portal' : 'home')} 
            />
          </div>
        )}

        {view === 'studentAuth' && (
          <StudentAuth 
            onLogin={handleStudentLogin}
            onRegister={createStudentAccount}
            onBack={() => setView('home')}
            error={loginError}
            onResetPassword={handleResetStudentPassword}
          />
        )}

        {view === 'portal' && (
          <div className="max-w-4xl mx-auto py-12 px-4 text-center">
            <div className="bg-white p-10 rounded-[2.5rem] shadow-2xl border-2 border-slate-50 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-2 bg-yellow-400"></div>
                
                <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-10 text-left">
                  <div>
                    <h2 className="text-4xl font-black text-blue-900 mb-1 font-serif">Welcome, {currentUser}</h2>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Grade: {currentStudentObj?.grade} • Student ID: {currentStudentObj?.id}</p>
                  </div>
                  <div className="mt-6 md:mt-0 bg-blue-50 p-4 rounded-2xl border border-blue-100 min-w-[220px]">
                    <div className="flex justify-between text-[10px] font-black text-blue-900 uppercase tracking-widest mb-2">
                      <span>Payment Status</span>
                      <span>{paymentProgress}%</span>
                    </div>
                    <div className="w-full h-3 bg-white rounded-full overflow-hidden border border-blue-100 mb-2">
                      <div className="h-full bg-blue-900 transition-all duration-1000" style={{ width: `${paymentProgress}%` }}></div>
                    </div>
                    <button 
                      onClick={() => {
                        setView('feeChecker');
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="text-[10px] font-black text-blue-800 hover:text-blue-950 uppercase tracking-wider underline flex items-center gap-1"
                    >
                      💳 Check Fee Statement →
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
                    <button 
                      onClick={() => setShowQRModal(true)}
                      className="p-6 sm:p-8 bg-yellow-400 text-blue-900 rounded-[2rem] hover:bg-yellow-500 transition-all flex flex-col items-center group shadow-xl hover:-translate-y-1"
                    >
                        <span className="block text-4xl sm:text-5xl mb-2 group-hover:scale-110 transition-transform">🆔</span>
                        <span className="font-black uppercase text-xs tracking-wider">Attendance QR</span>
                    </button>
                    <button 
                      onClick={() => {
                        const el = document.getElementById('student-timetable-section');
                        if (el) el.scrollIntoView({ behavior: 'smooth' });
                      }}
                      className="p-6 sm:p-8 bg-blue-900 text-white rounded-[2rem] hover:bg-blue-800 transition-all flex flex-col items-center group shadow-xl hover:-translate-y-1 border-2 border-yellow-400/40"
                    >
                        <span className="block text-4xl sm:text-5xl mb-2 text-yellow-400 group-hover:scale-110 transition-transform">🗓️</span>
                        <span className="font-black uppercase text-xs tracking-wider">Class Timetable</span>
                    </button>
                    <button 
                      onClick={() => {
                        const el = document.getElementById('student-timetable-section');
                        if (el) el.scrollIntoView({ behavior: 'smooth' });
                      }}
                      className="p-6 sm:p-8 bg-slate-800 text-white rounded-[2rem] hover:bg-slate-700 transition-all flex flex-col items-center group shadow-xl hover:-translate-y-1"
                    >
                        <span className="block text-4xl sm:text-5xl mb-2 text-yellow-400 group-hover:scale-110 transition-transform">📚</span>
                        <span className="font-black uppercase text-xs tracking-wider">Subjects</span>
                    </button>
                    <button 
                        onClick={() => setView('apply')}
                        className={`p-6 sm:p-8 rounded-[2rem] transition-all flex flex-col items-center group shadow-xl hover:-translate-y-1 ${paymentProgress < 100 ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-green-50 text-green-700 border-2 border-green-200 cursor-default'}`}
                    >
                        <span className="block text-4xl sm:text-5xl mb-2 group-hover:scale-110 transition-transform">
                          {paymentProgress < 100 ? '₦' : '✅'}
                        </span>
                        <span className="font-black uppercase text-xs tracking-wider">
                          {paymentProgress < 100 ? 'Pay Fees' : 'Fees Settled'}
                        </span>
                    </button>
                </div>

                {showQRModal && currentStudentObj && (() => {
                  const termInfo = currentStudentObj.qrGenerations?.[selectedTermForQR] || { count: 0, qrCodeValue: '', generatedAt: '' };
                  const activeQrValue = termInfo.qrCodeValue || `GHS-ATT|${currentStudentObj.id}|${selectedTermForQR}|default`;

                  return (
                  <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-blue-900/80 backdrop-blur-sm">
                    <div className="bg-white rounded-[3rem] p-8 max-w-md w-full text-center relative shadow-2xl animate-in zoom-in duration-300">
                      <button 
                        onClick={() => setShowQRModal(false)}
                        className="absolute top-6 right-6 text-slate-400 hover:text-red-500 font-black text-xl"
                      >
                        ✕
                      </button>
                      <h3 className="text-2xl font-black text-blue-900 mb-1 font-serif">Term QR Code Pass</h3>
                      <p className="text-xs font-bold text-slate-400 mb-6 uppercase tracking-wider">Generate & Scan for Daily Attendance</p>

                      {(paymentProgress === 100 || currentStudentObj.entryAllowed) ? (
                        <>
                          <div className="mb-6 bg-slate-50 p-3 rounded-2xl border border-slate-100 flex items-center justify-between">
                            <span className="text-xs font-black text-blue-900 uppercase tracking-widest pl-2">Select Term:</span>
                            <div className="flex gap-1">
                              {['First Term', 'Second Term', 'Third Term'].map(t => (
                                <button
                                  key={t}
                                  onClick={() => setSelectedTermForQR(t)}
                                  className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${selectedTermForQR === t ? 'bg-blue-900 text-yellow-400 shadow-md' : 'bg-white text-slate-500 hover:bg-slate-200'}`}
                                >
                                  {t.replace(' Term', '')}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="mb-4 bg-blue-50 p-4 rounded-2xl border border-blue-100 flex items-center justify-between">
                            <div className="text-left">
                              <p className="text-[10px] font-black text-blue-900 uppercase">Term Allowance</p>
                              <p className="text-xs font-bold text-slate-600">{termInfo.count}/2 Generations Used</p>
                            </div>
                            <button
                              onClick={() => generateTermQrCode(currentStudentObj.id, selectedTermForQR)}
                              disabled={termInfo.count >= 2}
                              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all shadow-md ${termInfo.count >= 2 ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-yellow-400 text-blue-900 hover:bg-yellow-500'}`}
                            >
                              {termInfo.count === 0 ? 'Generate QR Code' : termInfo.count === 1 ? 'Generate 2nd QR Code' : 'Max Limit (2/2)'}
                            </button>
                          </div>

                          {termInfo.count === 0 && !termInfo.qrCodeValue ? (
                            <div className="bg-amber-50 border-2 border-dashed border-amber-200 p-8 rounded-3xl my-6 text-amber-800">
                              <span className="text-4xl block mb-2">⚡</span>
                              <p className="font-black text-xs uppercase mb-1">No QR Code Generated Yet</p>
                              <p className="text-[11px] font-medium text-amber-700">Click the "Generate QR Code" button above to create your attendance pass for {selectedTermForQR}. (Max 2 times per term)</p>
                            </div>
                          ) : (
                            <>
                              <div className="bg-slate-50 p-6 rounded-3xl inline-block border-4 border-slate-100 shadow-inner my-4">
                                <QRCodeSVG 
                                  value={activeQrValue} 
                                  size={180}
                                  level="H"
                                  includeMargin={true}
                                />
                              </div>

                              <div className="text-left space-y-1 bg-blue-50 p-4 rounded-2xl border border-blue-100 text-xs">
                                <p className="font-black text-blue-900 uppercase">Term: <span className="text-slate-600 font-bold ml-1">{selectedTermForQR}</span></p>
                                <p className="font-black text-blue-900 uppercase">Student: <span className="text-slate-600 font-bold ml-1">{currentStudentObj.name} ({currentStudentObj.grade})</span></p>
                                {termInfo.generatedAt && (
                                  <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Generated on: {new Date(termInfo.generatedAt).toLocaleString()}</p>
                                )}
                              </div>
                            </>
                          )}
                        </>
                      ) : (
                        <div className="py-12 px-4">
                          <div className="text-6xl mb-6">🔒</div>
                          <p className="text-red-500 font-black uppercase text-sm tracking-widest mb-4">Access Restricted</p>
                          <p className="text-slate-500 text-xs font-bold leading-relaxed">
                            Your QR code is locked. Please settle your school fees or contact the administrator for entry clearance.
                          </p>
                          <button 
                            onClick={() => { setShowQRModal(false); setView('apply'); }}
                            className="mt-8 w-full py-4 bg-blue-900 text-yellow-400 rounded-xl font-black uppercase text-xs tracking-widest shadow-lg"
                          >
                            Pay Fees Now
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  );
                })()}

                {/* Class Timetable for Student & Pupils */}
                <div id="student-timetable-section" className="mt-12 text-left">
                  <StudentTimetableCard
                    grade={currentStudentObj.grade}
                    activeTerm={currentStudentObj.activeTerm || 'First Term'}
                    timetables={state.timetables || []}
                  />
                </div>

                <div className="mt-16 grid md:grid-cols-2 gap-10 text-left">
                   <div>
                    <div className="flex justify-between items-center mb-6 border-b-2 border-slate-50 pb-2">
                      <h3 className="text-xl font-black text-blue-900 font-serif">Academic Record</h3>
                      <button
                        onClick={() => {
                          setView('resultChecker');
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="px-3 py-1 bg-yellow-400 hover:bg-yellow-300 text-blue-950 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all shadow-xs"
                      >
                        📄 Download Result PDF →
                      </button>
                    </div>

                    {(() => {
                      const studentPayments = currentStudentObj 
                        ? state.payments.filter(p => p.studentId === currentStudentObj.id || p.studentName.toLowerCase() === currentStudentObj.name.toLowerCase())
                        : [];
                      const confirmedResultPayment = studentPayments.find(p => p.type === 'result_fee' && p.status === 'confirmed');
                      const pendingResultPayment = studentPayments.find(p => p.type === 'result_fee' && p.status === 'pending');

                      if (!confirmedResultPayment) {
                        return (
                          <div className="p-6 bg-amber-50 rounded-2xl border-2 border-amber-200 text-center space-y-3">
                            <div className="text-3xl">🔒</div>
                            <h4 className="font-serif font-black text-blue-900 text-sm">
                              Result Slip Locked
                            </h4>
                            <p className="text-xs text-amber-900 leading-relaxed font-medium">
                              {pendingResultPayment 
                                ? "Your proof of payment (₦1,000) has been uploaded and is currently awaiting confirmation from the administrator."
                                : "To view your termly scores and official report card, a result fee of ₦1,000 is required with transaction receipt confirmation."
                              }
                            </p>
                            <button
                              onClick={() => {
                                setView('resultChecker');
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                              }}
                              className="px-4 py-2 bg-blue-900 hover:bg-blue-800 text-yellow-400 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md inline-block"
                            >
                              {pendingResultPayment ? "Check Payment Status" : "Pay ₦1,000 & Upload Receipt →"}
                            </button>
                          </div>
                        );
                      }

                      return (
                        <div className="space-y-3">
                          <button
                            onClick={() => {
                              setView('resultChecker');
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            className="w-full py-2.5 px-4 bg-blue-900 hover:bg-blue-800 text-yellow-300 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-between shadow-sm"
                          >
                            <span className="flex items-center gap-2">
                              <span>📥</span>
                              <span>Download Standard Result Sheet (PDF)</span>
                            </span>
                            <span className="text-[10px] bg-yellow-400 text-blue-950 px-2 py-0.5 rounded font-black">Official Crest</span>
                          </button>

                          {state.results.filter(r => r.studentName === currentUser).length === 0 ? (
                            <p className="p-8 text-center text-slate-300 font-black uppercase text-[10px] bg-slate-50 rounded-2xl border-2 border-dashed">No scores uploaded yet</p>
                          ) : (
                            state.results.filter(r => r.studentName === currentUser).map(result => (
                              <div key={result.id} className="p-5 border border-slate-100 rounded-2xl flex justify-between items-center bg-slate-50 hover:bg-white hover:shadow-md transition-all">
                                <div>
                                  <p className="font-black text-blue-900">{result.subject}</p>
                                  <p className="text-[10px] text-slate-400 font-black uppercase">{result.term}</p>
                                </div>
                                <div className={`text-xl font-black ${result.score >= 50 ? 'text-green-600' : 'text-red-500'}`}>
                                  {result.score}%
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      );
                    })()}
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-blue-900 mb-6 font-serif border-b-2 border-slate-50 pb-2">Attendance History</h3>
                    <div className="space-y-3">
                      {state.attendance.filter(a => a.studentId === currentStudentObj?.id).length === 0 ? (
                        <p className="p-8 text-center text-slate-300 font-black uppercase text-[10px] bg-slate-50 rounded-2xl border-2 border-dashed">No attendance records yet</p>
                      ) : (
                        state.attendance.filter(a => a.studentId === currentStudentObj?.id).map((record, i) => (
                          <div key={i} className="p-5 border border-slate-100 rounded-2xl flex justify-between items-center bg-green-50 border-green-100">
                             <div>
                               <p className="font-black text-green-700">Present</p>
                               <p className="text-[10px] text-green-600/60 font-black uppercase">Verified by {record.markedBy}</p>
                             </div>
                             <p className="text-xs font-bold text-green-700">{record.date}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                {/* Live Academic Calendar & Bulletins in Student Portal */}
                <div className="mt-12 pt-8 border-t border-slate-100 grid md:grid-cols-2 gap-8 text-left">
                  <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">📅</span>
                        <h4 className="font-serif font-black text-blue-900 text-base">Academic Calendar</h4>
                      </div>
                      <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-[10px] font-black uppercase">
                        ● Live Sync
                      </span>
                    </div>
                    {state.academicCalendar ? (
                      <div className="p-4 bg-white rounded-xl font-mono text-xs text-slate-700 whitespace-pre-wrap leading-relaxed border border-slate-200">
                        {state.academicCalendar}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 italic">No calendar posted yet.</p>
                    )}
                  </div>

                  <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">📢</span>
                        <h4 className="font-serif font-black text-blue-900 text-base">School Bulletins</h4>
                      </div>
                      <span className="text-[10px] font-black uppercase text-blue-900 bg-blue-100 px-2 py-0.5 rounded-full">
                        {state.announcements.length} Live
                      </span>
                    </div>
                    {state.announcements.length === 0 ? (
                      <p className="text-xs text-slate-400 italic">No bulletins posted at this time.</p>
                    ) : (
                      <div className="space-y-3 max-h-[260px] overflow-y-auto pr-1">
                        {state.announcements.map(ann => (
                          <div key={ann.id} className="p-3.5 bg-white rounded-xl border border-slate-200 space-y-1">
                            <div className="flex justify-between items-start">
                              <h5 className="font-serif font-black text-blue-950 text-xs">{ann.title}</h5>
                              <span className="text-[10px] text-slate-400 font-bold uppercase">{ann.date}</span>
                            </div>
                            <p className="text-xs text-slate-600 whitespace-pre-wrap leading-relaxed">{ann.content}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
            </div>
          </div>
        )}

        {view === 'teacherLogin' && (
          <TeacherLoginGateway 
            onLogin={handleTeacherLoginAttempt} 
            onBack={() => setView('home')} 
            error={loginError} 
            onResetPassword={handleResetTeacherPassword}
          />
        )}

        {view === 'teacher' && role === UserRole.TEACHER && (
           <div className="max-w-6xl mx-auto py-12 px-4">
             <TeacherDashboard 
               username={currentUser || 'Staff'} 
               assignedGrades={currentTeacherObj?.assignedGrades || []}
               allStudents={state.studentAccounts}
               courses={state.courses}
               results={state.results}
               attendance={state.attendance}
               calendar={state.academicCalendar}
               announcements={state.announcements}
               allowedPages={currentTeacherObj?.allowedPages}
               resultPublishRequests={state.resultPublishRequests || []}
               timedStaffDelegations={state.timedStaffDelegations || []}
               onOpenAdminDelegation={() => {
                 setView('admin');
                 window.scrollTo({ top: 0, behavior: 'smooth' });
               }}
               onAddCourse={addCourse}
               onDuplicateCourse={duplicateCourse}
               onAddResult={addResult}
               onMarkAttendance={markAttendance}
               onBatchMarkAttendance={handleBatchMarkAttendance}
               onShiftStudent={shiftStudentToNextClass}
               onBatchShiftStudents={shiftMultipleStudentsToNextClass}
               timetables={state.timetables || []}
               onSaveTimetable={handleSaveClassTimetable}
               parentMessages={state.parentStaffMessages || []}
               parents={state.parents || []}
               onSendParentMessage={handleSendParentMessage}
               onOpenParentMessaging={() => {
                 setView('parentStaffChat');
                 window.scrollTo({ top: 0, behavior: 'smooth' });
               }}
               onRequestPublishResults={handleRequestPublishResults}
               onSendResultsToPupils={handleSendResultsToPupils}
             />
           </div>
        )}

        {view === 'feeChecker' && (
          <div className="max-w-5xl mx-auto py-12 px-4">
            <StudentFeeChecker 
              fees={state.fees}
              students={state.studentAccounts}
              payments={state.payments}
              currentStudent={currentStudentObj || null}
              isLoggedIn={role === UserRole.STUDENT && !!currentStudentObj}
              onLogin={(emailOrId, pass) => {
                return handleStudentLogin(emailOrId, pass);
              }}
              onPayFees={() => {
                setView('apply');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              onBack={() => {
                setView(role === UserRole.STUDENT ? 'portal' : 'home');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              onGoToRegister={() => {
                setView('studentAuth');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            />
          </div>
        )}

        {view === 'resultChecker' && (
          <div className="max-w-5xl mx-auto py-12 px-4">
            <StudentResultChecker 
              students={state.studentAccounts}
              results={state.results}
              payments={state.payments}
              currentStudent={currentStudentObj || null}
              isLoggedIn={role === UserRole.STUDENT && !!currentStudentObj}
              onLogin={(emailOrId, pass) => {
                return handleStudentLogin(emailOrId, pass);
              }}
              onSubmitResultPayment={(paymentData) => {
                return handleSubmitParentPayment(paymentData);
              }}
              onBack={() => {
                setView(role === UserRole.STUDENT ? 'portal' : 'home');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              onGoToStudentAuth={() => {
                setView('studentAuth');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            />
          </div>
        )}

        {view === 'studentReceipts' && (
          <div className="max-w-6xl mx-auto py-12 px-4">
            <StudentReceiptsDownload 
              payments={state.payments}
              students={state.studentAccounts}
              currentStudent={currentStudentObj || null}
              isLoggedIn={role === UserRole.STUDENT && !!currentStudentObj}
              onLogin={(emailOrId, pass) => handleStudentLogin(emailOrId, pass)}
              onBack={() => {
                setView(role === UserRole.STUDENT ? 'portal' : role === UserRole.PARENT ? 'parentPortal' : 'home');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              onPayFees={() => {
                setView('apply');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            />
          </div>
        )}

        {view === 'admin' && (
          role === UserRole.ADMIN ? (
            <div className="max-w-6xl mx-auto py-12 px-4">
              <AdminPanel 
                fees={state.fees} 
                applications={state.applications}
                announcements={state.announcements}
                teachers={state.teachers}
                results={state.results}
                courses={state.courses}
                attendance={state.attendance}
                students={state.studentAccounts}
                parents={state.parents || []}
                calendar={state.academicCalendar}
                onUpdateFee={updateFees}
                onUpdateAllFees={updateAllFees}
                userPagesAccess={state.userPagesAccess}
                onUpdateUserPagesAccess={handleUpdateUserPagesAccess}
                onAddAnnouncement={addAnnouncement}
                onUpdateAnnouncement={updateAnnouncement}
                onDeleteAnnouncement={deleteAnnouncement}
                onCreateTeacher={createTeacherAccount}
                onUpdateTeacherPermissions={updateTeacherPermissions}
                onDeleteTeacher={deleteTeacherAccount}
                onAddCourse={addCourse}
                onDuplicateCourse={duplicateCourse}
                onUpdateCalendar={updateCalendar}
                onToggleStudentEntry={toggleStudentEntry}
                onAdminUnlinkChild={handleAdminUnlinkChild}
                payments={state.payments}
                resultPublishRequests={state.resultPublishRequests || []}
                onConfirmPayment={handleConfirmPayment}
                onDeclinePayment={handleDeclinePayment}
                onConfirmAllPending={handleConfirmAllPending}
                onAddChatMessage={handleAddPaymentChatMessage}
                onApprovePublishRequest={handleApprovePublishRequest}
                onRejectPublishRequest={handleRejectPublishRequest}
                onBroadcastResultsToClass={handleSendResultsToPupils}
                timedStaffDelegations={state.timedStaffDelegations || []}
                onGrantStaffDelegation={handleGrantStaffDelegation}
                onRevokeStaffDelegation={handleRevokeStaffDelegation}
              />
            </div>
          ) : (role === UserRole.TEACHER && activeTeacherDelegation) ? (
            <div className="max-w-6xl mx-auto py-12 px-4">
              <AdminPanel 
                fees={state.fees} 
                applications={state.applications}
                announcements={state.announcements}
                teachers={state.teachers}
                results={state.results}
                courses={state.courses}
                attendance={state.attendance}
                students={state.studentAccounts}
                parents={state.parents || []}
                calendar={state.academicCalendar}
                onUpdateFee={updateFees}
                onUpdateAllFees={updateAllFees}
                userPagesAccess={state.userPagesAccess}
                onUpdateUserPagesAccess={handleUpdateUserPagesAccess}
                onAddAnnouncement={addAnnouncement}
                onUpdateAnnouncement={updateAnnouncement}
                onDeleteAnnouncement={deleteAnnouncement}
                onCreateTeacher={createTeacherAccount}
                onUpdateTeacherPermissions={updateTeacherPermissions}
                onDeleteTeacher={deleteTeacherAccount}
                onAddCourse={addCourse}
                onDuplicateCourse={duplicateCourse}
                onUpdateCalendar={updateCalendar}
                onToggleStudentEntry={toggleStudentEntry}
                onAdminUnlinkChild={handleAdminUnlinkChild}
                payments={state.payments}
                resultPublishRequests={state.resultPublishRequests || []}
                onConfirmPayment={handleConfirmPayment}
                onDeclinePayment={handleDeclinePayment}
                onConfirmAllPending={handleConfirmAllPending}
                onAddChatMessage={handleAddPaymentChatMessage}
                onApprovePublishRequest={handleApprovePublishRequest}
                onRejectPublishRequest={handleRejectPublishRequest}
                onBroadcastResultsToClass={handleSendResultsToPupils}
                allowedAdminSections={activeTeacherDelegation.grantedSections}
                delegationExpiresAt={activeTeacherDelegation.expiresAt}
                activeStaffName={activeTeacherDelegation.teacherName}
                onExitDelegation={() => {
                  setView('teacher');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              />
            </div>
          ) : (
            <AdminLoginGateway 
              onLogin={handleAdminLoginAttempt}
              onBack={() => setView('home')}
              error={loginError}
              onResetKey={handleResetAdminKey}
            />
          )
        )}

        {view === 'parentStaffChat' && (
          <div className="max-w-6xl mx-auto py-8 sm:py-12 px-3 sm:px-6">
            <ParentStaffMessaging
              currentUserRole={role}
              currentUserName={currentUser || (role === UserRole.PARENT ? (currentParentObj?.fullName || 'Parent') : 'User')}
              currentParent={currentParentObj}
              currentTeacher={currentTeacherObj}
              parents={state.parents || []}
              students={state.studentAccounts || []}
              teachers={state.teachers || []}
              messages={state.parentStaffMessages || []}
              onSendMessage={handleSendParentMessage}
              onInitiateCall={handleInitiateCall}
              onBack={() => {
                setView(role === UserRole.PARENT ? 'parentPortal' : role === UserRole.TEACHER ? 'teacher' : 'home');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              onGoToCommunityHub={() => {
                setView('communityHub');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            />
          </div>
        )}

        {view === 'communityHub' && (
          <div className="max-w-7xl mx-auto py-6 sm:py-10 px-2.5 sm:px-6">
            <SchoolCommunityHub
              currentUserRole={role}
              currentUserId={currentUser || (currentParentObj?.id) || 'usr-' + Date.now()}
              currentUserName={currentUser || (currentParentObj?.fullName) || 'School Member'}
              students={state.studentAccounts || []}
              teachers={state.teachers || []}
              parents={state.parents || []}
              chatMessages={state.chatMessages || []}
              meetings={state.meetings || []}
              callSessions={state.callSessions || []}
              onSendChatMessage={handleSendChatMessage}
              onCreateMeeting={handleCreateMeeting}
              onInitiateCall={handleInitiateCall}
              onUpdateCallStatus={handleUpdateCallStatus}
              onBack={() => {
                setView('home');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              onGoToParentMessaging={() => {
                setView('parentStaffChat');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            />
          </div>
        )}
          </>
        )}
      </main>

      <Footer 
        onCheckFees={() => {
          setView('feeChecker');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onOpenSqlModal={() => setShowSqlModal(true)}
        onNavigate={(targetView: string) => {
          if (['home', 'portal', 'apply', 'admin', 'teacherLogin', 'teacher', 'studentAuth', 'feeChecker', 'parentAuth', 'parentPortal', 'about', 'studentReceipts', 'resultChecker', 'parentStaffChat', 'communityHub'].includes(targetView)) {
            handleNav(targetView as any);
          } else {
            setView('home');
          }
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />

      {/* Floating WhatsApp Contact Widget */}
      <WhatsAppChatWidget />

      {/* PWA Download Notification and Installation Modal */}
      <PWADownloadPrompt 
        forceModalOpen={isDownloadModalOpen}
        onCloseModal={() => setIsDownloadModalOpen(false)}
      />

      {/* Supabase Master SQL & Realtime Configuration Viewer Modal */}
      <RealtimeSqlViewerModal
        isOpen={showSqlModal}
        onClose={() => setShowSqlModal(false)}
      />
    </div>
  );
};

export default App;
