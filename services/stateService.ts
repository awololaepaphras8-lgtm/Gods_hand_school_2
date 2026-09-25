
import { AppState, UserPagesAccessState } from '../types';
import { INITIAL_FEES, APP_STORAGE_KEY } from '../constants';
import { INITIAL_DEFAULT_TIMETABLES } from '../constants/timetableDefaults';

const DEFAULT_STATE: AppState = {
  fees: INITIAL_FEES,
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
      id: 'STU-1',
      name: 'Samuel Adebayo',
      email: 'samuel@godshand.sch.ng',
      password: 'student123',
      grade: 'Primary 4',
      createdAt: new Date().toISOString(),
      entryAllowed: true,
      activeTerm: 'First Term'
    },
    {
      id: 'STU-2',
      name: 'Grace Adebayo',
      email: 'grace@godshand.sch.ng',
      password: 'student123',
      grade: 'JSS 2',
      createdAt: new Date().toISOString(),
      entryAllowed: true,
      activeTerm: 'First Term'
    }
  ],
  parents: [
    {
      id: 'PAR-1',
      fullName: 'Mrs. Folashade Adebayo',
      email: 'parent@godshand.sch.ng',
      phone: '08034567890',
      password: 'parent123',
      relationship: 'Mother',
      address: 'Oluwatedo Area, Wire & Cable, Apata, Ibadan',
      childrenStudentIds: ['STU-1', 'STU-2'],
      createdAt: new Date().toISOString()
    }
  ],
  payments: [
    {
      id: 'PAY-SAMPLE1',
      studentId: 'STU-1',
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
      studentId: 'STU-1',
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
      studentName: 'Grace Adebayo',
      grade: 'JSS 2',
      subject: 'Basic Science',
      score: 95,
      caScore: 38,
      examScore: 57,
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
      parentEmail: 'parent@godshand.sch.ng',
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
      parentEmail: 'parent@godshand.sch.ng',
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
      message: 'Welcome to God\'s Hand International Model School Live Community Hub! Have faith in God.',
      timestamp: new Date(Date.now() - 86400000).toISOString()
    },
    {
      id: 'CM-2',
      channelId: 'general',
      senderId: 'PAR-1',
      senderName: 'Mrs. Folashade Adebayo',
      senderRole: 'PARENT' as any,
      message: 'Amen! Proud to be part of the God\'s Hand model school family.',
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
      meetingLink: 'https://godshand.sch.ng/meet/GHS-PTA-2026',
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
      meetingLink: 'https://godshand.sch.ng/meet/GHS-PRI4-STUDY',
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
  ]
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
  }
};
