
import { AppState } from '../types';
import { INITIAL_FEES, APP_STORAGE_KEY } from '../constants';

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
  resultPublishRequests: []
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
          teachers: parsed.teachers || [],
          studentAccounts: (parsed.studentAccounts && parsed.studentAccounts.length > 0) ? parsed.studentAccounts : DEFAULT_STATE.studentAccounts,
          parents: (parsed.parents && parsed.parents.length > 0) ? parsed.parents : (DEFAULT_STATE.parents || []),
          payments: parsed.payments || [],
          attendance: parsed.attendance || [],
          courses: parsed.courses || DEFAULT_STATE.courses,
          results: parsed.results || DEFAULT_STATE.results,
          academicCalendar: parsed.academicCalendar || DEFAULT_STATE.academicCalendar,
          resultPublishRequests: parsed.resultPublishRequests || []
        };
      } catch (e) {
        console.error("Failed to parse state", e);
      }
    }
    return DEFAULT_STATE;
  },

  saveState: (state: AppState): void => {
    localStorage.setItem(APP_STORAGE_KEY, JSON.stringify(state));
  }
};
