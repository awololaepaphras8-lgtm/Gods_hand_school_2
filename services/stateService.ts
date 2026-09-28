
import { AppState, UserPagesAccessState, SchoolBankAccountConfig, CallRecording } from '../types';
import { INITIAL_FEES, APP_STORAGE_KEY, DEFAULT_BANK_ACCOUNT_CONFIG } from '../constants';
import { INITIAL_DEFAULT_TIMETABLES } from '../constants/timetableDefaults';

const DEFAULT_STATE: AppState = {
  fees: INITIAL_FEES,
  activeTerm: 'First Term',
  announcements: [
    {
      id: '1',
      title: 'Welcome to the New Session',
      content: 'We are excited to welcome all students and pupils back to school. God is our strength!',
      date: new Date().toLocaleDateString()
    }
  ],
  applications: [],
  teachers: [],
  studentAccounts: [
    {
      id: 'GHS20268001',
      name: 'Samuel Adebayo',
      email: 'samuel@Godshand.sch.ng',
      password: 'student123',
      grade: 'Primary 4',
      createdAt: new Date().toISOString(),
      entryAllowed: true,
      activeTerm: 'First Term',
      admissionYear: 2026
    },
    {
      id: 'GHS202611001',
      name: 'Grace Adebayo',
      email: 'grace@Godshand.sch.ng',
      password: 'student123',
      grade: 'JSS 2',
      createdAt: new Date().toISOString(),
      entryAllowed: true,
      activeTerm: 'First Term',
      admissionYear: 2026
    }
  ],
  parents: [
    {
      id: 'PAR-1',
      fullName: 'Mrs. Folashade Adebayo',
      email: 'parent@Godshand.sch.ng',
      phone: '08034567890',
      password: 'parent123',
      relationship: 'Mother',
      address: 'Oluwatedo Area, Wire & Cable, Apata, Ibadan',
      childrenStudentIds: ['GHS20268001', 'GHS202611001', 'STU-1', 'STU-2'],
      createdAt: new Date().toISOString()
    }
  ],
  payments: [
    {
      id: 'PAY-SAMPLE1',
      studentId: 'GHS20268001',
      studentName: 'Samuel Adebayo',
      amount: 22500,
      grade: 'Primary 4',
      type: 'installment_1',
      date: new Date(Date.now() - 86400000 * 3).toISOString(),
      status: 'confirmed',
      bankName: 'First Bank of Nigeria',
      payerName: 'Mrs. Folashade Adebayo',
      transactionRef: 'FBN-TRX-893201',
      studentNote: 'First term 1st installment for Samuel',
      reviewedBy: 'School Bursar'
    }
  ],
  attendance: [
    {
      studentId: 'GHS20268001',
      date: new Date().toLocaleDateString(),
      markedBy: 'Mr. Benson (Gate Officer)',
      term: 'First Term'
    }
  ],
  courses: [
    { id: 'c1', name: 'Mathematics', grade: 'Primary 1', description: 'Basic arithmetic and numbers.' },
    { id: 'c2', name: 'English Language', grade: 'Primary 1', description: 'Grammar and phonetics.' }
  ],
  results: [
    {
      id: 'res-1',
      studentId: 'GHS20268001',
      studentName: 'Samuel Adebayo',
      grade: 'Primary 4',
      subject: 'Mathematics',
      score: 92,
      caScore: 36,
      examScore: 56,
      term: 'First Term',
      teacherName: 'Mr. Benson',
      date: new Date().toLocaleDateString()
    },
    {
      id: 'res-2',
      studentId: 'GHS20268001',
      studentName: 'Samuel Adebayo',
      grade: 'Primary 4',
      subject: 'English Language',
      score: 88,
      caScore: 34,
      examScore: 54,
      term: 'First Term',
      teacherName: 'Mrs. Taiwo',
      date: new Date().toLocaleDateString()
    },
    {
      id: 'res-3',
      studentId: 'GHS20268001',
      studentName: 'Samuel Adebayo',
      grade: 'Primary 4',
      subject: 'Basic Science & Technology',
      score: 91,
      caScore: 35,
      examScore: 56,
      term: 'Second Term',
      teacherName: 'Mr. Benson',
      date: new Date().toLocaleDateString()
    },
    {
      id: 'res-4',
      studentId: 'GHS20268001',
      studentName: 'Samuel Adebayo',
      grade: 'Primary 4',
      subject: 'Mathematics',
      score: 94,
      caScore: 38,
      examScore: 56,
      term: 'Third Term',
      teacherName: 'Mr. Benson',
      date: new Date().toLocaleDateString()
    },
    {
      id: 'res-5',
      studentId: 'GHS202611001',
      studentName: 'Grace Adebayo',
      grade: 'JSS 2',
      subject: 'Basic Science',
      score: 95,
      caScore: 38,
      examScore: 57,
      term: 'First Term',
      teacherName: 'Engr. David',
      date: new Date().toLocaleDateString()
    },
    {
      id: 'res-6',
      studentId: 'GHS202611001',
      studentName: 'Grace Adebayo',
      grade: 'JSS 2',
      subject: 'Mathematics',
      score: 89,
      caScore: 35,
      examScore: 54,
      term: 'Second Term',
      teacherName: 'Engr. David',
      date: new Date().toLocaleDateString()
    },
    {
      id: 'res-7',
      studentId: 'GHS202611001',
      studentName: 'Grace Adebayo',
      grade: 'JSS 2',
      subject: 'English Language',
      score: 93,
      caScore: 37,
      examScore: 56,
      term: 'Third Term',
      teacherName: 'Mrs. Taiwo',
      date: new Date().toLocaleDateString()
    },
    {
      id: 'res-8',
      studentId: 'STU-101',
      studentName: 'Emmanuel Okafor',
      grade: 'Basic 1',
      subject: 'Mathematics',
      score: 84,
      caScore: 32,
      examScore: 52,
      term: 'First Term',
      teacherName: 'Miss Comfort',
      date: new Date().toLocaleDateString()
    },
    {
      id: 'res-9',
      studentId: 'STU-102',
      studentName: 'Blessing Adeleke',
      grade: 'Basic 2',
      subject: 'English Language',
      score: 86,
      caScore: 34,
      examScore: 52,
      term: 'First Term',
      teacherName: 'Miss Comfort',
      date: new Date().toLocaleDateString()
    },
    {
      id: 'res-10',
      studentId: 'STU-103',
      studentName: 'Daniel Ajayi',
      grade: 'Basic 3',
      subject: 'Quantitative Reasoning',
      score: 82,
      caScore: 30,
      examScore: 52,
      term: 'First Term',
      teacherName: 'Mr. Benson',
      date: new Date().toLocaleDateString()
    },
    {
      id: 'res-11',
      studentId: 'STU-104',
      studentName: 'Favour Babatunde',
      grade: 'Basic 5',
      subject: 'Basic Science',
      score: 90,
      caScore: 36,
      examScore: 54,
      term: 'First Term',
      teacherName: 'Mr. Benson',
      date: new Date().toLocaleDateString()
    },
    {
      id: 'res-12',
      studentId: 'STU-105',
      studentName: 'Joshua Adeleke',
      grade: 'JSS 1',
      subject: 'Mathematics',
      score: 85,
      caScore: 33,
      examScore: 52,
      term: 'First Term',
      teacherName: 'Engr. David',
      date: new Date().toLocaleDateString()
    },
    {
      id: 'res-13',
      studentId: 'STU-106',
      studentName: 'Miracle Ojo',
      grade: 'JSS 3',
      subject: 'Basic Technology',
      score: 88,
      caScore: 35,
      examScore: 53,
      term: 'First Term',
      teacherName: 'Engr. David',
      date: new Date().toLocaleDateString()
    },
    {
      id: 'res-14',
      studentId: 'STU-107',
      studentName: 'Precious Alabi',
      grade: 'SS 1 (Science)',
      subject: 'Physics',
      score: 91,
      caScore: 36,
      examScore: 55,
      term: 'First Term',
      teacherName: 'Engr. David',
      date: new Date().toLocaleDateString()
    },
    {
      id: 'res-15',
      studentId: 'STU-108',
      studentName: 'Victoria Balogun',
      grade: 'SS 2 (Science)',
      subject: 'Chemistry',
      score: 89,
      caScore: 35,
      examScore: 54,
      term: 'First Term',
      teacherName: 'Engr. David',
      date: new Date().toLocaleDateString()
    },
    {
      id: 'res-16',
      studentId: 'STU-109',
      studentName: 'David Adeleke',
      grade: 'SS 3 (Science)',
      subject: 'Biology',
      score: 93,
      caScore: 37,
      examScore: 56,
      term: 'First Term',
      teacherName: 'Engr. David',
      date: new Date().toLocaleDateString()
    }
  ],
  academicCalendar: `1. Resumption: Jan 10th\n2. Mid-Term Break: Feb 15th - 17th\n3. Examination Period: March 20th - 30th\n4. Vacation: April 5th`,
  resultPublishRequests: [],
  timedStaffDelegations: [],
  userPagesAccess: {
    allPagesClosed: false,
    globalClosedMessage: 'The user portal is temporarily undergoing scheduled administrative maintenance by the School Proprietor. Please check back shortly.',
    pages: {
      apply: { isOpen: true, closedReason: '' },
      feeChecker: { isOpen: true, closedReason: '' },
      resultChecker: { isOpen: true, closedReason: '' },
      studentReceipts: { isOpen: true, closedReason: '' },
      parentPortal: { isOpen: true, closedReason: '' },
      studentPortal: { isOpen: true, closedReason: '' },
      parentStaffChat: { isOpen: true, closedReason: '' },
      communityHub: { isOpen: true, closedReason: '' },
      about: { isOpen: true, closedReason: '' },
    }
  },
  timetables: INITIAL_DEFAULT_TIMETABLES,
  parentStaffMessages: [
    {
      id: 'PSM-1',
      parentId: 'PAR-1',
      parentName: 'Mrs. Folashade Adebayo',
      parentEmail: 'parent@Godshand.sch.ng',
      staffId: 'staff',
      staffName: 'Mr. David Adeleke (Primary 4 Class Teacher)',
      studentId: 'STU-1',
      studentName: 'Samuel Adebayo',
      studentGrade: 'Primary 4',
      subject: 'Academic Progress & Homework Inquiry',
      message: 'Good morning Mr. Adeleke, please I would like to confirm Samuel\'s homework submission for Mathematics yesterday.',
      senderRole: 'parent',
      timestamp: new Date(Date.now() - 3600000 * 4).toISOString(),
      read: true,
      priority: 'inquiry'
    },
    {
      id: 'PSM-2',
      parentId: 'PAR-1',
      parentName: 'Mrs. Folashade Adebayo',
      parentEmail: 'parent@Godshand.sch.ng',
      staffId: 'staff',
      staffName: 'Mr. David Adeleke (Primary 4 Class Teacher)',
      studentId: 'STU-1',
      studentName: 'Samuel Adebayo',
      studentGrade: 'Primary 4',
      subject: 'Academic Progress & Homework Inquiry',
      message: 'Good afternoon Mrs. Adebayo! Yes, Samuel submitted his arithmetic exercises on time and scored 95%. He is doing exceptionally well in class.',
      senderRole: 'teacher',
      timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
      read: true,
      priority: 'normal',
      replyToId: 'PSM-1'
    }
  ],
  chatMessages: [
    {
      id: 'CM-1',
      channelId: 'general',
      senderId: 'ADMIN-1',
      senderName: 'School Administrator',
      senderRole: 'ADMIN' as any,
      message: 'Welcome to God\'s Hand International Model School Live Community Hub! Have Faith In God.',
      timestamp: new Date(Date.now() - 86400000).toISOString()
    },
    {
      id: 'CM-2',
      channelId: 'general',
      senderId: 'PAR-1',
      senderName: 'Mrs. Folashade Adebayo',
      senderRole: 'PARENT' as any,
      message: 'Amen! Proud to be part of the God\'s Hand Model School family.',
      timestamp: new Date(Date.now() - 3600000 * 12).toISOString()
    },
    {
      id: 'CM-3',
      channelId: 'pta',
      senderId: 'ADMIN-1',
      senderName: 'School Administrator',
      senderRole: 'ADMIN' as any,
      message: 'Notice: Next Virtual PTA General Assembly scheduled for this Saturday at 10:00 AM. Click the Meetings tab to join.',
      timestamp: new Date(Date.now() - 3600000 * 6).toISOString()
    }
  ],
  meetings: [
    {
      id: 'MTG-1',
      title: 'Termly General PTA Virtual Assembly & Orientation',
      roomCode: 'GHS-PTA-2026',
      hostName: 'Proprietor & Head of School',
      hostRole: 'ADMIN' as any,
      description: 'Review of academic calendar, terminal results release, and student gate security protocol.',
      scheduledTime: 'Saturday 10:00 AM',
      status: 'active',
      participantsCount: 14,
      meetingLink: 'https://Godshand.sch.ng/meet/GHS-PTA-2026',
      createdAt: new Date().toISOString()
    },
    {
      id: 'MTG-2',
      title: 'Primary 4 Mathematics & Science Virtual Clinic',
      roomCode: 'GHS-PRI4-STUDY',
      hostName: 'Mr. David Adeleke (Class Teacher)',
      hostRole: 'TEACHER' as any,
      description: 'Continuous assessment review and tutorial questions for Primary 4 pupils.',
      scheduledTime: 'Friday 4:00 PM',
      status: 'upcoming',
      participantsCount: 8,
      meetingLink: 'https://Godshand.sch.ng/meet/GHS-PRI4-STUDY',
      createdAt: new Date().toISOString()
    }
  ],
  callSessions: [],
  adminEvents: [
    {
      id: 'EVT-1',
      action: 'SYSTEM_INITIALIZED',
      details: 'Real-time database sync and multi-user live gateway activated.',
      performedBy: 'System Administrator',
      timestamp: new Date().toISOString()
    }
  ],
  bankAccountConfig: DEFAULT_BANK_ACCOUNT_CONFIG,
  callRecordings: []
};

export const stateService = {
  getState: (): AppState => {
    const saved = localStorage.getItem(APP_STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          ...DEFAULT_STATE,
          ...parsed,
          fees: {
            ...INITIAL_FEES,
            ...(parsed.fees || {})
          },
          teachers: parsed.teachers || [],
          studentAccounts: (parsed.studentAccounts && parsed.studentAccounts.length > 0) ? parsed.studentAccounts : DEFAULT_STATE.studentAccounts,
          parents: (parsed.parents && parsed.parents.length > 0) ? parsed.parents : (DEFAULT_STATE.parents || []),
          payments: parsed.payments || [],
          attendance: parsed.attendance || [],
          courses: parsed.courses || DEFAULT_STATE.courses,
          results: parsed.results || DEFAULT_STATE.results,
          academicCalendar: parsed.academicCalendar || DEFAULT_STATE.academicCalendar,
          activeTerm: parsed.activeTerm || 'First Term',
          bankAccountConfig: parsed.bankAccountConfig || DEFAULT_BANK_ACCOUNT_CONFIG,
          callRecordings: parsed.callRecordings || [],
          resultPublishRequests: parsed.resultPublishRequests || [],
          timedStaffDelegations: parsed.timedStaffDelegations || [],
          timetables: (parsed.timetables && parsed.timetables.length > 0) ? parsed.timetables : DEFAULT_STATE.timetables,
          parentStaffMessages: (parsed.parentStaffMessages && parsed.parentStaffMessages.length > 0) ? parsed.parentStaffMessages : DEFAULT_STATE.parentStaffMessages,
          chatMessages: (parsed.chatMessages && parsed.chatMessages.length > 0) ? parsed.chatMessages : DEFAULT_STATE.chatMessages,
          meetings: (parsed.meetings && parsed.meetings.length > 0) ? parsed.meetings : DEFAULT_STATE.meetings,
          callSessions: parsed.callSessions || [],
          adminEvents: parsed.adminEvents || DEFAULT_STATE.adminEvents,
          userPagesAccess: {
            ...DEFAULT_STATE.userPagesAccess,
            ...(parsed.userPagesAccess || {}),
            pages: {
              ...(DEFAULT_STATE.userPagesAccess?.pages || {}),
              ...(parsed.userPagesAccess?.pages || {})
            }
          }
        };
      } catch (e) {
        console.error("Failed to parse state", e);
      }
    }
    return DEFAULT_STATE;
  },

  saveState: (state: AppState): void => {
    localStorage.setItem(APP_STORAGE_KEY, JSON.stringify(state));
  },

  updateUserPagesAccess: (access: UserPagesAccessState): void => {
    try {
      const current = stateService.getState();
      const updated = { ...current, userPagesAccess: access };
      stateService.saveState(updated);
    } catch (e) {
      console.error("Failed to update user pages access", e);
    }
  },

  updateBankAccountConfig: (config: SchoolBankAccountConfig): void => {
    try {
      const current = stateService.getState();
      const updated = { ...current, bankAccountConfig: config };
      stateService.saveState(updated);
    } catch (e) {
      console.error("Failed to update bank account config", e);
    }
  },

  addCallRecording: (recording: CallRecording): void => {
    try {
      const current = stateService.getState();
      const existing = current.callRecordings || [];
      const updated = { ...current, callRecordings: [recording, ...existing] };
      stateService.saveState(updated);
    } catch (e) {
      console.error("Failed to add call recording", e);
    }
  },

  deleteCallRecording: (recordingId: string): void => {
    try {
      const current = stateService.getState();
      const existing = current.callRecordings || [];
      const updated = { ...current, callRecordings: existing.filter(r => r.id !== recordingId) };
      stateService.saveState(updated);
    } catch (e) {
      console.error("Failed to delete call recording", e);
    }
  }
};
