import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import { 
  AppState, 
  StudentAccount, 
  ParentAccount, 
  FeePayment, 
  AttendanceRecord, 
  StudentResult, 
  Course, 
  Announcement, 
  StudentApplication, 
  TeacherAccount,
  FeeStructure,
  ResultPublishRequest,
  TimedStaffDelegation,
  UserPagesAccessState,
  ClassTimetable
} from '../types';

const SUPABASE_URL = (import.meta as any).env?.VITE_SUPABASE_URL || 'https://jzuifdntpxjrmmrpvqfc.supabase.co';
const SUPABASE_ANON_KEY = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || 'sb_publishable_aBlhb0SIKKE-uWUx_hL-dw_dfgeCZ1B';

export const isSupabaseConfigured = (): boolean => {
  return Boolean(
    SUPABASE_URL && 
    SUPABASE_ANON_KEY && 
    !SUPABASE_URL.includes('your-project-id') && 
    !SUPABASE_ANON_KEY.includes('your-supabase-anon-public-key')
  );
};

export const supabase: SupabaseClient | null = isSupabaseConfigured()
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    })
  : null;

// Multi-tab real-time broadcast channel for instantaneous zero-latency sync in the browser
let crossTabChannel: BroadcastChannel | null = null;
try {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    crossTabChannel = new BroadcastChannel('gods_hand_model_school_realtime');
  }
} catch (e) {
  console.warn('BroadcastChannel not supported in current environment', e);
}

export type RealtimeSyncCallback = (updatedState: Partial<AppState>) => void;

/**
 * Broadcast local state changes to other open tabs/windows in real time
 */
export const broadcastLocalChange = (payload: { type: string; data: any }) => {
  if (crossTabChannel) {
    try {
      crossTabChannel.postMessage(payload);
    } catch (err) {
      console.error('Failed to post message to BroadcastChannel', err);
    }
  }
};

/**
 * Fetch full school dataset from Supabase PostgreSQL tables
 */
export const fetchSupabaseState = async (): Promise<Partial<AppState> | null> => {
  if (!supabase) return null;

  try {
    const [
      studentsRes,
      parentsRes,
      linksRes,
      feesRes,
      paymentsRes,
      attendanceRes,
      resultsRes,
      teachersRes,
      coursesRes,
      announcementsRes,
      admissionsRes,
      calendarRes,
      publishReqsRes,
      delegationsRes,
      userPagesRes,
      timetablesRes
    ] = await Promise.all([
      supabase.from('students').select('*'),
      supabase.from('parents').select('*'),
      supabase.from('parent_student_links').select('*').eq('is_active', true),
      supabase.from('fee_structures').select('*'),
      supabase.from('fee_payments').select('*').order('date', { ascending: false }),
      supabase.from('attendance_records').select('*').order('scanned_at', { ascending: false }),
      supabase.from('student_results').select('*'),
      supabase.from('teacher_accounts').select('*'),
      supabase.from('courses').select('*'),
      supabase.from('announcements').select('*').order('created_at', { ascending: false }),
      supabase.from('admissions').select('*').order('created_at', { ascending: false }),
      supabase.from('school_calendar').select('*').eq('id', 1).single(),
      supabase.from('result_publish_requests').select('*').order('created_at', { ascending: false }),
      supabase.from('timed_staff_delegations').select('*').order('created_at', { ascending: false }),
      supabase.from('user_pages_access').select('*').eq('id', 1).maybeSingle(),
      supabase.from('timetables').select('*').order('updated_at', { ascending: false })
    ]);

    const partial: Partial<AppState> = {
      studentAccounts: [],
      parents: [],
      payments: [],
      attendance: [],
      results: [],
      teachers: [],
      courses: [],
      announcements: [],
      applications: [],
      fees: {},
      resultPublishRequests: [],
      timedStaffDelegations: [],
      timetables: []
    };

    // 1. Students
    if (studentsRes.data && studentsRes.data.length > 0) {
      partial.studentAccounts = studentsRes.data.map((s: any): StudentAccount => ({
        id: s.id,
        name: s.name,
        email: s.email || '',
        password: s.password_hash || 'student123',
        grade: s.grade,
        createdAt: s.created_at,
        entryAllowed: s.entry_allowed ?? true,
        activeTerm: s.active_term || 'First Term',
        qrCodeVersion: s.qr_code_version || 1,
        admissionYear: s.admission_year,
        qrGenerations: s.qr_generations || {},
        parentEmail: s.parent_email,
        parentId: s.parent_id
      }));
    }

    // 2. Parents with childrenStudentIds from parent_student_links
    if (parentsRes.data && parentsRes.data.length > 0) {
      const links = linksRes.data || [];
      partial.parents = parentsRes.data.map((p: any): ParentAccount => {
        const childIds = links
          .filter((l: any) => l.parent_id === p.id)
          .map((l: any) => l.student_id);

        return {
          id: p.id,
          fullName: p.full_name,
          email: p.email,
          phone: p.phone,
          password: p.password_hash || 'parent123',
          relationship: p.relationship || 'Parent',
          address: p.address || '',
          childrenStudentIds: childIds,
          createdAt: p.created_at
        };
      });
    }

    // 3. Fee Structures
    if (feesRes.data && feesRes.data.length > 0) {
      const feeObj: FeeStructure = {};
      feesRes.data.forEach((f: any) => {
        feeObj[f.grade] = Number(f.amount);
      });
      partial.fees = feeObj;
    }

    // 4. Payments
    if (paymentsRes.data && paymentsRes.data.length > 0) {
      partial.payments = paymentsRes.data.map((pay: any): FeePayment => ({
        id: pay.id,
        studentId: pay.student_id,
        studentName: pay.student_name,
        amount: Number(pay.amount),
        grade: pay.grade,
        type: pay.type,
        date: pay.date,
        status: pay.status,
        receiptImage: pay.receipt_image,
        receiptFileName: pay.receipt_file_name,
        receiptFileType: pay.receipt_file_type,
        receiptUploadedAt: pay.receipt_uploaded_at,
        bankName: pay.bank_name,
        payerName: pay.payer_name,
        transactionRef: pay.transaction_ref,
        studentNote: pay.student_note,
        adminNote: pay.admin_note,
        reviewedAt: pay.reviewed_at,
        reviewedBy: pay.reviewed_by,
        messages: pay.messages || []
      }));
    }

    // 5. Attendance
    if (attendanceRes.data && attendanceRes.data.length > 0) {
      partial.attendance = attendanceRes.data.map((att: any): AttendanceRecord => ({
        studentId: att.student_id,
        date: att.date,
        markedBy: att.marked_by,
        term: att.term || 'First Term'
      }));
    }

    // 6. Results
    if (resultsRes.data && resultsRes.data.length > 0) {
      partial.results = resultsRes.data.map((r: any): StudentResult => ({
        id: r.id,
        studentName: r.student_name,
        grade: r.grade,
        subject: r.subject,
        score: Number(r.score),
        caScore: r.ca_score != null ? Number(r.ca_score) : undefined,
        examScore: r.exam_score != null ? Number(r.exam_score) : undefined,
        position: r.position,
        published: r.published ?? true,
        term: r.term,
        teacherName: r.teacher_name,
        date: r.date
      }));
    }

    // 7. Teachers
    if (teachersRes.data && teachersRes.data.length > 0) {
      partial.teachers = teachersRes.data.map((t: any): TeacherAccount => ({
        id: t.id,
        username: t.username,
        password: t.password_hash || 'staff123',
        createdAt: t.created_at,
        assignedGrades: t.assigned_grades || [],
        assignedCourses: t.assigned_courses || [],
        allowedPages: t.allowed_pages
      }));
    }

    // 8. Courses
    if (coursesRes.data && coursesRes.data.length > 0) {
      partial.courses = coursesRes.data.map((c: any): Course => ({
        id: c.id,
        name: c.name,
        grade: c.grade,
        description: c.description || ''
      }));
    }

    // 9. Announcements
    if (announcementsRes.data && announcementsRes.data.length > 0) {
      partial.announcements = announcementsRes.data.map((a: any): Announcement => ({
        id: a.id,
        title: a.title,
        content: a.content,
        date: a.date
      }));
    }

    // 10. Admissions
    if (admissionsRes.data && admissionsRes.data.length > 0) {
      partial.applications = admissionsRes.data.map((adm: any): StudentApplication => ({
        id: adm.id,
        name: adm.name,
        email: adm.email,
        grade: adm.grade,
        paid: adm.paid,
        timestamp: adm.timestamp
      }));
    }

    // 11. Calendar
    if (calendarRes.data && calendarRes.data.content) {
      partial.academicCalendar = calendarRes.data.content;
    }

    // 12. Result Publish Requests
    if (publishReqsRes && publishReqsRes.data && publishReqsRes.data.length > 0) {
      partial.resultPublishRequests = publishReqsRes.data.map((req: any): ResultPublishRequest => ({
        id: req.id,
        teacherName: req.teacher_name,
        grade: req.grade,
        term: req.term,
        subject: req.subject,
        studentCount: Number(req.student_count || 0),
        scoreCount: Number(req.score_count || 0),
        status: req.status,
        timestamp: req.timestamp,
        reviewedAt: req.reviewed_at,
        reviewedBy: req.reviewed_by,
        adminFeedback: req.admin_feedback
      }));
    }

    // 13. Timed Staff Delegations
    if (delegationsRes && delegationsRes.data && delegationsRes.data.length > 0) {
      partial.timedStaffDelegations = delegationsRes.data.map((del: any): TimedStaffDelegation => ({
        id: del.id,
        teacherUsername: del.teacher_username,
        teacherName: del.teacher_name,
        grantedSections: del.granted_sections || [],
        grantedAt: del.granted_at,
        expiresAt: del.expires_at,
        durationMinutes: Number(del.duration_minutes || 60),
        grantedBy: del.granted_by,
        purpose: del.purpose,
        status: del.status
      }));
    }

    // 14. User Pages Access Control
    if (userPagesRes && userPagesRes.data) {
      partial.userPagesAccess = {
        allPagesClosed: userPagesRes.data.all_pages_closed ?? false,
        globalClosedMessage: userPagesRes.data.global_closed_message,
        pages: userPagesRes.data.pages || {}
      };
    }

    // 15. Class Timetables
    if (timetablesRes && timetablesRes.data && timetablesRes.data.length > 0) {
      partial.timetables = timetablesRes.data.map((tt: any): ClassTimetable => ({
        id: tt.id,
        grade: tt.grade,
        term: tt.term || 'First Term',
        academicYear: tt.academic_year || '2024/2025',
        periods: Array.isArray(tt.periods) ? tt.periods : (typeof tt.periods === 'string' ? JSON.parse(tt.periods) : []),
        updatedAt: tt.updated_at || new Date().toISOString(),
        updatedBy: tt.updated_by || 'Teacher'
      }));
    }

    return partial;
  } catch (err) {
    console.error('Error fetching state from Supabase:', err);
    return null;
  }
};

/**
 * Setup Realtime Subscriptions for Supabase and BroadcastChannel
 */
export const setupRealtimeSync = (
  onStateUpdate: (updater: (prev: AppState) => AppState) => void
): (() => void) => {
  let supabaseChannel: RealtimeChannel | null = null;

  // 1. Listen to BroadcastChannel across browser tabs for immediate zero-latency sync
  const handleBroadcastMessage = (event: MessageEvent) => {
    const { type, data } = event.data || {};
    if (!type) return;

    switch (type) {
      case 'PAYMENT_ADDED_OR_UPDATED':
        onStateUpdate(prev => {
          const exists = prev.payments.some(p => p.id === data.id);
          const updatedPayments = exists
            ? prev.payments.map(p => p.id === data.id ? { ...p, ...data } : p)
            : [data, ...prev.payments];
          return { ...prev, payments: updatedPayments };
        });
        break;

      case 'PAYMENT_DELETED':
        onStateUpdate(prev => ({
          ...prev,
          payments: prev.payments.filter(p => p.id !== data.id)
        }));
        break;

      case 'ATTENDANCE_RECORDED':
        onStateUpdate(prev => {
          const filtered = prev.attendance.filter(
            a => !(a.studentId === data.studentId && a.date === data.date && (a.term || 'First Term') === (data.term || 'First Term'))
          );
          return { ...prev, attendance: [data, ...filtered] };
        });
        break;

      case 'ATTENDANCE_DELETED':
        onStateUpdate(prev => ({
          ...prev,
          attendance: prev.attendance.filter(
            a => !(a.studentId === data.studentId && a.date === data.date)
          )
        }));
        break;

      case 'ANNOUNCEMENT_ADDED':
        onStateUpdate(prev => ({
          ...prev,
          announcements: [data, ...prev.announcements.filter(a => a.id !== data.id)]
        }));
        break;

      case 'ANNOUNCEMENT_UPDATED':
        onStateUpdate(prev => ({
          ...prev,
          announcements: prev.announcements.map(a => a.id === data.id ? data : a)
        }));
        break;

      case 'ANNOUNCEMENT_DELETED':
        onStateUpdate(prev => ({
          ...prev,
          announcements: prev.announcements.filter(a => a.id !== data.id)
        }));
        break;

      case 'RESULT_ADDED':
      case 'RESULT_UPDATED':
        onStateUpdate(prev => ({
          ...prev,
          results: [...prev.results.filter(r => r.id !== data.id), data]
        }));
        break;

      case 'RESULT_DELETED':
        onStateUpdate(prev => ({
          ...prev,
          results: prev.results.filter(r => r.id !== data.id)
        }));
        break;

      case 'CHILD_LINKED':
        onStateUpdate(prev => {
          const { parentId, studentId } = data;
          return {
            ...prev,
            parents: (prev.parents || []).map(p => {
              if (p.id === parentId) {
                const currentChildren = p.childrenStudentIds || [];
                if (!currentChildren.includes(studentId)) {
                  return { ...p, childrenStudentIds: [...currentChildren, studentId] };
                }
              }
              return p;
            }),
            studentAccounts: prev.studentAccounts.map(s => {
              if (s.id === studentId) {
                return { ...s, parentId };
              }
              return s;
            })
          };
        });
        break;

      case 'CHILD_DELINKED':
        onStateUpdate(prev => {
          const { parentId, studentId } = data;
          return {
            ...prev,
            parents: (prev.parents || []).map(p => {
              if (p.id === parentId) {
                return { ...p, childrenStudentIds: (p.childrenStudentIds || []).filter(id => id !== studentId) };
              }
              return p;
            }),
            studentAccounts: prev.studentAccounts.map(s => {
              if (s.id === studentId && s.parentId === parentId) {
                return { ...s, parentId: undefined };
              }
              return s;
            })
          };
        });
        break;

      case 'STUDENT_ENTRY_TOGGLED':
        onStateUpdate(prev => ({
          ...prev,
          studentAccounts: prev.studentAccounts.map(s => 
            s.id === data.studentId ? { ...s, entryAllowed: data.entryAllowed } : s
          )
        }));
        break;

      case 'STUDENT_ADDED':
      case 'STUDENT_UPDATED':
        onStateUpdate(prev => ({
          ...prev,
          studentAccounts: [...prev.studentAccounts.filter(s => s.id !== data.id), data]
        }));
        break;

      case 'STUDENT_DELETED':
        onStateUpdate(prev => ({
          ...prev,
          studentAccounts: prev.studentAccounts.filter(s => s.id !== data.id)
        }));
        break;

      case 'PARENT_REGISTERED':
      case 'PARENT_UPDATED':
        onStateUpdate(prev => {
          const list = prev.parents || [];
          const exists = list.some(p => p.id === data.id);
          return {
            ...prev,
            parents: exists
              ? list.map(p => p.id === data.id ? { ...p, ...data } : p)
              : [...list, data]
          };
        });
        break;

      case 'PARENT_DELETED':
        onStateUpdate(prev => ({
          ...prev,
          parents: (prev.parents || []).filter(p => p.id !== data.id)
        }));
        break;

      case 'COURSE_ADDED':
      case 'COURSE_UPDATED':
        onStateUpdate(prev => ({
          ...prev,
          courses: [...prev.courses.filter(c => c.id !== data.id), data]
        }));
        break;

      case 'COURSE_DELETED':
        onStateUpdate(prev => ({
          ...prev,
          courses: prev.courses.filter(c => c.id !== data.id)
        }));
        break;

      case 'FEES_UPDATED':
        onStateUpdate(prev => ({
          ...prev,
          fees: { ...prev.fees, [data.grade]: data.amount }
        }));
        break;

      case 'CALENDAR_UPDATED':
        onStateUpdate(prev => ({
          ...prev,
          academicCalendar: data.content
        }));
        break;

      case 'TEACHER_ADDED':
      case 'TEACHER_UPDATED':
        onStateUpdate(prev => ({
          ...prev,
          teachers: [...prev.teachers.filter(t => t.id !== data.id), data]
        }));
        break;

      case 'TEACHER_DELETED':
        onStateUpdate(prev => ({
          ...prev,
          teachers: prev.teachers.filter(t => t.id !== data.id)
        }));
        break;

      case 'USER_PAGES_ACCESS_UPDATED':
        onStateUpdate(prev => ({
          ...prev,
          userPagesAccess: data
        }));
        break;

      case 'RESULT_PUBLISH_REQUEST_ADDED':
      case 'RESULT_PUBLISH_REQUEST_UPDATED':
        onStateUpdate(prev => {
          const list = prev.resultPublishRequests || [];
          const exists = list.some(r => r.id === data.id);
          return {
            ...prev,
            resultPublishRequests: exists
              ? list.map(r => r.id === data.id ? data : r)
              : [data, ...list]
          };
        });
        break;

      case 'TIMED_DELEGATION_ADDED':
      case 'TIMED_DELEGATION_UPDATED':
        onStateUpdate(prev => {
          const list = prev.timedStaffDelegations || [];
          const exists = list.some(d => d.id === data.id);
          return {
            ...prev,
            timedStaffDelegations: exists
              ? list.map(d => d.id === data.id ? data : d)
              : [data, ...list]
          };
        });
        break;

      case 'TIMETABLE_SAVED':
        onStateUpdate(prev => {
          const list = prev.timetables || [];
          const exists = list.some(t => t.id === data.id || (t.grade === data.grade && (t.term || 'First Term') === (data.term || 'First Term')));
          return {
            ...prev,
            timetables: exists
              ? list.map(t => (t.id === data.id || (t.grade === data.grade && (t.term || 'First Term') === (data.term || 'First Term'))) ? data : t)
              : [...list, data]
          };
        });
        break;

      case 'TIMETABLE_DELETED':
        onStateUpdate(prev => ({
          ...prev,
          timetables: (prev.timetables || []).filter(t => t.id !== data.id)
        }));
        break;

      case 'APPLICATION_SUBMITTED':
        onStateUpdate(prev => ({
          ...prev,
          applications: [data, ...(prev.applications || []).filter(a => a.id !== data.id)]
        }));
        break;

      case 'FULL_STATE_REFRESH':
        if (data.state) {
          onStateUpdate(() => data.state);
        }
        break;
    }
  };

  if (crossTabChannel) {
    crossTabChannel.addEventListener('message', handleBroadcastMessage);
  }

  // 2. Setup Supabase Realtime Channel if configured
  if (supabase) {
    supabaseChannel = supabase
      .channel('gods_hand_realtime_channel')
      // Listen to all public table changes across all events
      .on('postgres_changes', { event: '*', schema: 'public' }, async (payload) => {
        console.log('Realtime Postgres Change received:', payload);
        const { table, eventType } = payload;
        const newRecord = ((payload as any).new || {}) as any;
        const oldRecord = ((payload as any).old || {}) as any;

        switch (table) {
          case 'fee_payments':
            if (eventType === 'INSERT' || eventType === 'UPDATE') {
              const mapped: FeePayment = {
                id: newRecord.id,
                studentId: newRecord.student_id,
                studentName: newRecord.student_name,
                amount: Number(newRecord.amount),
                grade: newRecord.grade,
                type: newRecord.type,
                date: newRecord.date,
                status: newRecord.status,
                receiptImage: newRecord.receipt_image,
                receiptFileName: newRecord.receipt_file_name,
                receiptFileType: newRecord.receipt_file_type,
                receiptUploadedAt: newRecord.receipt_uploaded_at,
                bankName: newRecord.bank_name,
                payerName: newRecord.payer_name,
                transactionRef: newRecord.transaction_ref,
                studentNote: newRecord.student_note,
                adminNote: newRecord.admin_note,
                reviewedAt: newRecord.reviewed_at,
                reviewedBy: newRecord.reviewed_by,
                messages: newRecord.messages || []
              };
              onStateUpdate(prev => {
                const exists = prev.payments.some(p => p.id === mapped.id);
                return {
                  ...prev,
                  payments: exists
                    ? prev.payments.map(p => p.id === mapped.id ? mapped : p)
                    : [mapped, ...prev.payments]
                };
              });
            } else if (eventType === 'DELETE' && oldRecord.id) {
              onStateUpdate(prev => ({
                ...prev,
                payments: prev.payments.filter(p => p.id !== oldRecord.id)
              }));
            }
            break;

          case 'attendance_records':
            if (eventType === 'INSERT' || eventType === 'UPDATE') {
              const mapped: AttendanceRecord = {
                studentId: newRecord.student_id,
                date: newRecord.date,
                markedBy: newRecord.marked_by,
                term: newRecord.term || 'First Term'
              };
              onStateUpdate(prev => ({
                ...prev,
                attendance: [
                  mapped,
                  ...prev.attendance.filter(
                    a => !(a.studentId === mapped.studentId && a.date === mapped.date && (a.term || 'First Term') === mapped.term)
                  )
                ]
              }));
            } else if (eventType === 'DELETE' && oldRecord.student_id && oldRecord.date) {
              onStateUpdate(prev => ({
                ...prev,
                attendance: prev.attendance.filter(
                  a => !(a.studentId === oldRecord.student_id && a.date === oldRecord.date)
                )
              }));
            }
            break;

          case 'students':
            if (eventType === 'INSERT' || eventType === 'UPDATE') {
              const mapped: StudentAccount = {
                id: newRecord.id,
                name: newRecord.name,
                grade: newRecord.grade,
                email: newRecord.email || '',
                password: newRecord.password_hash || 'student123',
                createdAt: newRecord.created_at || new Date().toISOString(),
                entryAllowed: newRecord.entry_allowed ?? true,
                activeTerm: newRecord.active_term || 'First Term',
                qrCodeVersion: newRecord.qr_code_version || 1,
                admissionYear: newRecord.admission_year,
                qrGenerations: newRecord.qr_generations || {},
                parentEmail: newRecord.parent_email,
                parentId: newRecord.parent_id
              };
              onStateUpdate(prev => {
                const exists = prev.studentAccounts.some(s => s.id === mapped.id);
                return {
                  ...prev,
                  studentAccounts: exists
                    ? prev.studentAccounts.map(s => s.id === mapped.id ? { ...s, ...mapped } : s)
                    : [...prev.studentAccounts, mapped]
                };
              });
            } else if (eventType === 'DELETE' && oldRecord.id) {
              onStateUpdate(prev => ({
                ...prev,
                studentAccounts: prev.studentAccounts.filter(s => s.id !== oldRecord.id)
              }));
            }
            break;

          case 'parents':
            if (eventType === 'INSERT' || eventType === 'UPDATE') {
              onStateUpdate(prev => {
                const existing = (prev.parents || []).find(p => p.id === newRecord.id);
                const mapped: ParentAccount = {
                  id: newRecord.id,
                  fullName: newRecord.full_name,
                  email: newRecord.email,
                  phone: newRecord.phone,
                  password: newRecord.password_hash || 'parent123',
                  relationship: newRecord.relationship || 'Parent / Guardian',
                  address: newRecord.address || '',
                  childrenStudentIds: existing?.childrenStudentIds || [],
                  createdAt: newRecord.created_at || new Date().toISOString()
                };
                const exists = (prev.parents || []).some(p => p.id === mapped.id);
                return {
                  ...prev,
                  parents: exists
                    ? (prev.parents || []).map(p => p.id === mapped.id ? { ...p, ...mapped } : p)
                    : [...(prev.parents || []), mapped]
                };
              });
            } else if (eventType === 'DELETE' && oldRecord.id) {
              onStateUpdate(prev => ({
                ...prev,
                parents: (prev.parents || []).filter(p => p.id !== oldRecord.id)
              }));
            }
            break;

          case 'parent_student_links':
            if (eventType === 'INSERT' || eventType === 'UPDATE') {
              onStateUpdate(prev => {
                const active = newRecord.is_active !== false;
                const parentId = newRecord.parent_id;
                const studentId = newRecord.student_id;
                return {
                  ...prev,
                  parents: (prev.parents || []).map(p => {
                    if (p.id === parentId) {
                      const children = p.childrenStudentIds || [];
                      if (active && !children.includes(studentId)) {
                        return { ...p, childrenStudentIds: [...children, studentId] };
                      } else if (!active) {
                        return { ...p, childrenStudentIds: children.filter(id => id !== studentId) };
                      }
                    }
                    return p;
                  }),
                  studentAccounts: prev.studentAccounts.map(s => {
                    if (s.id === studentId) {
                      return { ...s, parentId: active ? parentId : undefined };
                    }
                    return s;
                  })
                };
              });
            } else if (eventType === 'DELETE') {
              onStateUpdate(prev => {
                const parentId = oldRecord.parent_id;
                const studentId = oldRecord.student_id;
                return {
                  ...prev,
                  parents: (prev.parents || []).map(p => {
                    if (p.id === parentId) {
                      return { ...p, childrenStudentIds: (p.childrenStudentIds || []).filter(id => id !== studentId) };
                    }
                    return p;
                  }),
                  studentAccounts: prev.studentAccounts.map(s => {
                    if (s.id === studentId && s.parentId === parentId) {
                      return { ...s, parentId: undefined };
                    }
                    return s;
                  })
                };
              });
            }
            break;

          case 'student_results':
            if (eventType === 'INSERT' || eventType === 'UPDATE') {
              const mapped: StudentResult = {
                id: newRecord.id,
                studentName: newRecord.student_name,
                grade: newRecord.grade,
                subject: newRecord.subject,
                score: Number(newRecord.score),
                caScore: newRecord.ca_score != null ? Number(newRecord.ca_score) : undefined,
                examScore: newRecord.exam_score != null ? Number(newRecord.exam_score) : undefined,
                position: newRecord.position,
                published: newRecord.published ?? true,
                term: newRecord.term,
                teacherName: newRecord.teacher_name,
                date: newRecord.date
              };
              onStateUpdate(prev => ({
                ...prev,
                results: [...prev.results.filter(r => r.id !== mapped.id), mapped]
              }));
            } else if (eventType === 'DELETE' && oldRecord.id) {
              onStateUpdate(prev => ({
                ...prev,
                results: prev.results.filter(r => r.id !== oldRecord.id)
              }));
            }
            break;

          case 'teacher_accounts':
            if (eventType === 'INSERT' || eventType === 'UPDATE') {
              const mapped: TeacherAccount = {
                id: newRecord.id,
                username: newRecord.username,
                password: newRecord.password_hash || 'staff123',
                createdAt: newRecord.created_at || new Date().toISOString(),
                assignedGrades: newRecord.assigned_grades || [],
                assignedCourses: newRecord.assigned_courses || [],
                allowedPages: newRecord.allowed_pages
              };
              onStateUpdate(prev => {
                const exists = prev.teachers.some(t => t.id === mapped.id);
                return {
                  ...prev,
                  teachers: exists
                    ? prev.teachers.map(t => t.id === mapped.id ? mapped : t)
                    : [...prev.teachers, mapped]
                };
              });
            } else if (eventType === 'DELETE' && oldRecord.id) {
              onStateUpdate(prev => ({
                ...prev,
                teachers: prev.teachers.filter(t => t.id !== oldRecord.id)
              }));
            }
            break;

          case 'courses':
            if (eventType === 'INSERT' || eventType === 'UPDATE') {
              const mapped: Course = {
                id: newRecord.id,
                name: newRecord.name,
                grade: newRecord.grade,
                description: newRecord.description || ''
              };
              onStateUpdate(prev => ({
                ...prev,
                courses: [...prev.courses.filter(c => c.id !== mapped.id), mapped]
              }));
            } else if (eventType === 'DELETE' && oldRecord.id) {
              onStateUpdate(prev => ({
                ...prev,
                courses: prev.courses.filter(c => c.id !== oldRecord.id)
              }));
            }
            break;

          case 'announcements':
            if (eventType === 'INSERT' || eventType === 'UPDATE') {
              const mapped: Announcement = {
                id: newRecord.id,
                title: newRecord.title,
                content: newRecord.content,
                date: newRecord.date
              };
              onStateUpdate(prev => {
                const exists = prev.announcements.some(a => a.id === mapped.id);
                return {
                  ...prev,
                  announcements: exists
                    ? prev.announcements.map(a => a.id === mapped.id ? mapped : a)
                    : [mapped, ...prev.announcements]
                };
              });
            } else if (eventType === 'DELETE' && oldRecord.id) {
              onStateUpdate(prev => ({
                ...prev,
                announcements: prev.announcements.filter(a => a.id !== oldRecord.id)
              }));
            }
            break;

          case 'admissions':
            if (eventType === 'INSERT' || eventType === 'UPDATE') {
              const mapped: StudentApplication = {
                id: newRecord.id,
                name: newRecord.name,
                email: newRecord.email,
                grade: newRecord.grade,
                paid: newRecord.paid ?? false,
                timestamp: newRecord.timestamp || newRecord.created_at || new Date().toISOString()
              };
              onStateUpdate(prev => ({
                ...prev,
                applications: [mapped, ...(prev.applications || []).filter(a => a.id !== mapped.id)]
              }));
            } else if (eventType === 'DELETE' && oldRecord.id) {
              onStateUpdate(prev => ({
                ...prev,
                applications: (prev.applications || []).filter(a => a.id !== oldRecord.id)
              }));
            }
            break;

          case 'fee_structures':
            if (eventType === 'INSERT' || eventType === 'UPDATE') {
              onStateUpdate(prev => ({
                ...prev,
                fees: {
                  ...prev.fees,
                  [newRecord.grade]: Number(newRecord.amount)
                }
              }));
            } else if (eventType === 'DELETE' && oldRecord.grade) {
              onStateUpdate(prev => {
                const nextFees = { ...prev.fees };
                delete nextFees[oldRecord.grade];
                return { ...prev, fees: nextFees };
              });
            }
            break;

          case 'school_calendar':
            if (newRecord && newRecord.content) {
              onStateUpdate(prev => ({
                ...prev,
                academicCalendar: newRecord.content
              }));
            }
            break;

          case 'result_publish_requests':
            if (eventType === 'INSERT' || eventType === 'UPDATE') {
              const mappedReq: ResultPublishRequest = {
                id: newRecord.id,
                teacherName: newRecord.teacher_name,
                grade: newRecord.grade,
                term: newRecord.term,
                subject: newRecord.subject,
                studentCount: Number(newRecord.student_count || 0),
                scoreCount: Number(newRecord.score_count || 0),
                status: newRecord.status,
                timestamp: newRecord.timestamp,
                reviewedAt: newRecord.reviewed_at,
                reviewedBy: newRecord.reviewed_by,
                adminFeedback: newRecord.admin_feedback
              };
              onStateUpdate(prev => {
                const list = prev.resultPublishRequests || [];
                const exists = list.some(r => r.id === mappedReq.id);
                return {
                  ...prev,
                  resultPublishRequests: exists
                    ? list.map(r => r.id === mappedReq.id ? mappedReq : r)
                    : [mappedReq, ...list]
                };
              });
            } else if (eventType === 'DELETE' && oldRecord.id) {
              onStateUpdate(prev => ({
                ...prev,
                resultPublishRequests: (prev.resultPublishRequests || []).filter(r => r.id !== oldRecord.id)
              }));
            }
            break;

          case 'timed_staff_delegations':
            if (eventType === 'INSERT' || eventType === 'UPDATE') {
              const mappedDel: TimedStaffDelegation = {
                id: newRecord.id,
                teacherUsername: newRecord.teacher_username,
                teacherName: newRecord.teacher_name,
                grantedSections: newRecord.granted_sections || [],
                grantedAt: newRecord.granted_at,
                expiresAt: newRecord.expires_at,
                durationMinutes: Number(newRecord.duration_minutes || 60),
                grantedBy: newRecord.granted_by,
                purpose: newRecord.purpose,
                status: newRecord.status
              };
              onStateUpdate(prev => {
                const list = prev.timedStaffDelegations || [];
                const exists = list.some(d => d.id === mappedDel.id);
                return {
                  ...prev,
                  timedStaffDelegations: exists
                    ? list.map(d => d.id === mappedDel.id ? mappedDel : d)
                    : [mappedDel, ...list]
                };
              });
            } else if (eventType === 'DELETE' && oldRecord.id) {
              onStateUpdate(prev => ({
                ...prev,
                timedStaffDelegations: (prev.timedStaffDelegations || []).filter(d => d.id !== oldRecord.id)
              }));
            }
            break;

          case 'user_pages_access':
            if (newRecord) {
              onStateUpdate(prev => ({
                ...prev,
                userPagesAccess: {
                  allPagesClosed: newRecord.all_pages_closed ?? false,
                  globalClosedMessage: newRecord.global_closed_message,
                  pages: newRecord.pages || {}
                }
              }));
            }
            break;

          case 'timetables':
            if (eventType === 'INSERT' || eventType === 'UPDATE') {
              const mappedTt: ClassTimetable = {
                id: newRecord.id,
                grade: newRecord.grade,
                term: newRecord.term || 'First Term',
                academicYear: newRecord.academic_year || '2024/2025',
                periods: Array.isArray(newRecord.periods) ? newRecord.periods : (typeof newRecord.periods === 'string' ? JSON.parse(newRecord.periods) : []),
                updatedAt: newRecord.updated_at || new Date().toISOString(),
                updatedBy: newRecord.updated_by || 'Teacher'
              };
              onStateUpdate(prev => {
                const list = prev.timetables || [];
                const exists = list.some(t => t.id === mappedTt.id || (t.grade === mappedTt.grade && (t.term || 'First Term') === (mappedTt.term || 'First Term')));
                return {
                  ...prev,
                  timetables: exists
                    ? list.map(t => (t.id === mappedTt.id || (t.grade === mappedTt.grade && (t.term || 'First Term') === (mappedTt.term || 'First Term'))) ? mappedTt : t)
                    : [...list, mappedTt]
                };
              });
            } else if (eventType === 'DELETE' && oldRecord.id) {
              onStateUpdate(prev => ({
                ...prev,
                timetables: (prev.timetables || []).filter(t => t.id !== oldRecord.id)
              }));
            }
            break;

          default:
            break;
        }
      })
      .subscribe((status) => {
        console.log('Supabase Realtime Channel status:', status);
      });
  }

  return () => {
    if (crossTabChannel) {
      crossTabChannel.removeEventListener('message', handleBroadcastMessage);
    }
    if (supabaseChannel && supabase) {
      supabase.removeChannel(supabaseChannel);
    }
  };
};

/**
 * Realtime Persistence Actions:
 * These functions persist changes to Supabase (if connected) and instantly broadcast
 * across browser tabs so all dashboards update immediately without reloading.
 */
export const realtimeService = {
  // Record or update a fee payment
  recordPayment: async (payment: FeePayment) => {
    broadcastLocalChange({ type: 'PAYMENT_ADDED_OR_UPDATED', data: payment });

    if (supabase) {
      try {
        await supabase.from('fee_payments').upsert({
          id: payment.id,
          student_id: payment.studentId,
          student_name: payment.studentName,
          amount: payment.amount,
          grade: payment.grade,
          type: payment.type,
          date: payment.date,
          status: payment.status || 'pending',
          bank_name: payment.bankName,
          payer_name: payment.payerName,
          transaction_ref: payment.transactionRef,
          student_note: payment.studentNote,
          admin_note: payment.adminNote,
          receipt_image: payment.receiptImage,
          receipt_file_name: payment.receiptFileName,
          receipt_file_type: payment.receiptFileType,
          receipt_uploaded_at: payment.receiptUploadedAt,
          reviewed_by: payment.reviewedBy,
          reviewed_at: payment.reviewedAt,
          messages: payment.messages || []
        });
      } catch (err) {
        console.error('Supabase payment sync failed:', err);
      }
    }
  },

  // Delete payment
  deletePayment: async (id: string) => {
    broadcastLocalChange({ type: 'PAYMENT_DELETED', data: { id } });

    if (supabase) {
      try {
        await supabase.from('fee_payments').delete().eq('id', id);
      } catch (err) {
        console.error('Supabase payment delete failed:', err);
      }
    }
  },

  // Record gate attendance
  recordAttendance: async (record: AttendanceRecord) => {
    broadcastLocalChange({ type: 'ATTENDANCE_RECORDED', data: record });

    if (supabase) {
      try {
        await supabase.from('attendance_records').upsert(
          {
            student_id: record.studentId,
            date: record.date,
            marked_by: record.markedBy,
            term: record.term || 'First Term',
            method: 'gate_scanner',
            scanned_at: new Date().toISOString()
          },
          { onConflict: 'student_id,date' }
        );
      } catch (err) {
        console.error('Supabase attendance sync failed:', err);
      }
    }
  },

  // Delete attendance record
  deleteAttendance: async (studentId: string, date: string) => {
    broadcastLocalChange({ type: 'ATTENDANCE_DELETED', data: { studentId, date } });

    if (supabase) {
      try {
        await supabase
          .from('attendance_records')
          .delete()
          .match({ student_id: studentId, date });
      } catch (err) {
        console.error('Supabase attendance delete failed:', err);
      }
    }
  },

  // Add announcement
  addAnnouncement: async (announcement: Announcement) => {
    broadcastLocalChange({ type: 'ANNOUNCEMENT_ADDED', data: announcement });

    if (supabase) {
      try {
        await supabase.from('announcements').upsert({
          id: announcement.id,
          title: announcement.title,
          content: announcement.content,
          date: announcement.date
        });
      } catch (err) {
        console.error('Supabase announcement sync failed:', err);
      }
    }
  },

  // Update announcement
  updateAnnouncement: async (announcement: Announcement) => {
    broadcastLocalChange({ type: 'ANNOUNCEMENT_UPDATED', data: announcement });

    if (supabase) {
      try {
        await supabase.from('announcements').upsert({
          id: announcement.id,
          title: announcement.title,
          content: announcement.content,
          date: announcement.date
        });
      } catch (err) {
        console.error('Supabase announcement update failed:', err);
      }
    }
  },

  // Delete announcement
  deleteAnnouncement: async (id: string) => {
    broadcastLocalChange({ type: 'ANNOUNCEMENT_DELETED', data: { id } });

    if (supabase) {
      try {
        await supabase.from('announcements').delete().eq('id', id);
      } catch (err) {
        console.error('Supabase delete announcement failed:', err);
      }
    }
  },

  // Add or update student result
  addResult: async (result: StudentResult) => {
    broadcastLocalChange({ type: 'RESULT_ADDED', data: result });

    if (supabase) {
      try {
        await supabase.from('student_results').upsert({
          id: result.id,
          student_name: result.studentName,
          grade: result.grade,
          subject: result.subject,
          score: result.score,
          ca_score: result.caScore,
          exam_score: result.examScore,
          position: result.position,
          published: result.published ?? true,
          term: result.term,
          teacher_name: result.teacherName,
          date: result.date
        });
      } catch (err) {
        console.error('Supabase result sync failed:', err);
      }
    }
  },

  // Update student result
  updateResult: async (result: StudentResult) => {
    broadcastLocalChange({ type: 'RESULT_UPDATED', data: result });

    if (supabase) {
      try {
        await supabase.from('student_results').upsert({
          id: result.id,
          student_name: result.studentName,
          grade: result.grade,
          subject: result.subject,
          score: result.score,
          ca_score: result.caScore,
          exam_score: result.examScore,
          position: result.position,
          published: result.published ?? true,
          term: result.term,
          teacher_name: result.teacherName,
          date: result.date
        });
      } catch (err) {
        console.error('Supabase result update failed:', err);
      }
    }
  },

  // Delete student result
  deleteResult: async (id: string) => {
    broadcastLocalChange({ type: 'RESULT_DELETED', data: { id } });

    if (supabase) {
      try {
        await supabase.from('student_results').delete().eq('id', id);
      } catch (err) {
        console.error('Supabase result delete failed:', err);
      }
    }
  },

  // Link child permanently
  linkChild: async (parentId: string, studentId: string) => {
    broadcastLocalChange({ type: 'CHILD_LINKED', data: { parentId, studentId } });

    if (supabase) {
      try {
        await supabase.from('parent_student_links').upsert({
          parent_id: parentId,
          student_id: studentId,
          linked_by: 'parent',
          is_active: true
        });

        // Also update parent_id on the students record for two-way synchronization
        await supabase
          .from('students')
          .update({ parent_id: parentId })
          .eq('id', studentId);
      } catch (err) {
        console.error('Supabase link child failed:', err);
      }
    }
  },

  // Admin delink child
  delinkChild: async (parentId: string, studentId: string) => {
    broadcastLocalChange({ type: 'CHILD_DELINKED', data: { parentId, studentId } });

    if (supabase) {
      try {
        await supabase
          .from('parent_student_links')
          .delete()
          .match({ parent_id: parentId, student_id: studentId });

        // Clear parent_id on student record
        await supabase
          .from('students')
          .update({ parent_id: null })
          .eq('id', studentId);
      } catch (err) {
        console.error('Supabase delink child failed:', err);
      }
    }
  },

  // Toggle student gate entry clearance
  toggleStudentEntry: async (studentId: string, entryAllowed: boolean) => {
    broadcastLocalChange({ type: 'STUDENT_ENTRY_TOGGLED', data: { studentId, entryAllowed } });

    if (supabase) {
      try {
        await supabase
          .from('students')
          .update({ entry_allowed: entryAllowed, updated_at: new Date().toISOString() })
          .eq('id', studentId);
      } catch (err) {
        console.error('Supabase toggle entry failed:', err);
      }
    }
  },

  // Add or update student account
  addStudent: async (student: StudentAccount) => {
    broadcastLocalChange({ type: 'STUDENT_ADDED', data: student });

    if (supabase) {
      try {
        await supabase.from('students').upsert({
          id: student.id,
          name: student.name,
          grade: student.grade,
          email: student.email,
          password_hash: student.password,
          entry_allowed: student.entryAllowed ?? true,
          active_term: student.activeTerm || 'First Term',
          qr_code_version: student.qrCodeVersion || 1,
          admission_year: student.admissionYear,
          qr_generations: student.qrGenerations || {},
          parent_email: student.parentEmail,
          parent_id: student.parentId,
          updated_at: new Date().toISOString()
        });
      } catch (err) {
        console.error('Supabase student upsert failed:', err);
      }
    }
  },

  // Delete student account
  deleteStudent: async (studentId: string) => {
    broadcastLocalChange({ type: 'STUDENT_DELETED', data: { id: studentId } });

    if (supabase) {
      try {
        await supabase.from('students').delete().eq('id', studentId);
      } catch (err) {
        console.error('Supabase student delete failed:', err);
      }
    }
  },

  // Register or update parent account
  registerParent: async (parent: ParentAccount) => {
    broadcastLocalChange({ type: 'PARENT_REGISTERED', data: parent });

    if (supabase) {
      try {
        await supabase.from('parents').upsert({
          id: parent.id,
          full_name: parent.fullName,
          email: parent.email,
          phone: parent.phone,
          password_hash: parent.password,
          relationship: parent.relationship || 'Parent / Guardian',
          address: parent.address || '',
          updated_at: new Date().toISOString()
        });
      } catch (err) {
        console.error('Supabase parent upsert failed:', err);
      }
    }
  },

  // Delete parent account
  deleteParent: async (parentId: string) => {
    broadcastLocalChange({ type: 'PARENT_DELETED', data: { id: parentId } });

    if (supabase) {
      try {
        await supabase.from('parents').delete().eq('id', parentId);
      } catch (err) {
        console.error('Supabase parent delete failed:', err);
      }
    }
  },

  // Add or update course
  addCourse: async (course: Course) => {
    broadcastLocalChange({ type: 'COURSE_ADDED', data: course });

    if (supabase) {
      try {
        await supabase.from('courses').upsert({
          id: course.id,
          name: course.name,
          grade: course.grade,
          description: course.description
        });
      } catch (err) {
        console.error('Supabase add course failed:', err);
      }
    }
  },

  // Delete course
  deleteCourse: async (courseId: string) => {
    broadcastLocalChange({ type: 'COURSE_DELETED', data: { id: courseId } });

    if (supabase) {
      try {
        await supabase.from('courses').delete().eq('id', courseId);
      } catch (err) {
        console.error('Supabase course delete failed:', err);
      }
    }
  },

  // Update fees
  updateFee: async (grade: string, amount: number) => {
    broadcastLocalChange({ type: 'FEES_UPDATED', data: { grade, amount } });

    if (supabase) {
      try {
        await supabase.from('fee_structures').upsert({
          grade,
          amount,
          updated_at: new Date().toISOString()
        });
      } catch (err) {
        console.error('Supabase update fee failed:', err);
      }
    }
  },

  // Update academic calendar
  updateCalendar: async (content: string) => {
    broadcastLocalChange({ type: 'CALENDAR_UPDATED', data: { content } });

    if (supabase) {
      try {
        await supabase.from('school_calendar').upsert({
          id: 1,
          content,
          updated_at: new Date().toISOString()
        });
      } catch (err) {
        console.error('Supabase update calendar failed:', err);
      }
    }
  },

  // Add or update teacher account
  addTeacher: async (teacher: TeacherAccount) => {
    broadcastLocalChange({ type: 'TEACHER_ADDED', data: teacher });

    if (supabase) {
      try {
        await supabase.from('teacher_accounts').upsert({
          id: teacher.id,
          username: teacher.username,
          password_hash: teacher.password,
          assigned_grades: teacher.assignedGrades,
          assigned_courses: teacher.assignedCourses,
          allowed_pages: teacher.allowedPages || ['overview', 'students', 'termStats', 'grading', 'attendance', 'courses'],
          updated_at: new Date().toISOString()
        });
      } catch (err) {
        console.error('Supabase teacher upsert failed:', err);
      }
    }
  },

  // Delete teacher account
  deleteTeacher: async (teacherId: string) => {
    broadcastLocalChange({ type: 'TEACHER_DELETED', data: { id: teacherId } });

    if (supabase) {
      try {
        await supabase.from('teacher_accounts').delete().eq('id', teacherId);
      } catch (err) {
        console.error('Supabase teacher delete failed:', err);
      }
    }
  },

  // Update user pages access permissions
  updateUserPagesAccess: async (accessState: UserPagesAccessState) => {
    broadcastLocalChange({ type: 'USER_PAGES_ACCESS_UPDATED', data: accessState });

    if (supabase) {
      try {
        await supabase.from('user_pages_access').upsert({
          id: 1,
          all_pages_closed: accessState.allPagesClosed,
          global_closed_message: accessState.globalClosedMessage,
          pages: accessState.pages,
          updated_at: new Date().toISOString()
        });
      } catch (err) {
        console.error('Supabase update user pages access failed:', err);
      }
    }
  },

  // Submit or update result publication request
  submitResultPublishRequest: async (req: ResultPublishRequest) => {
    broadcastLocalChange({ type: 'RESULT_PUBLISH_REQUEST_ADDED', data: req });

    if (supabase) {
      try {
        await supabase.from('result_publish_requests').upsert({
          id: req.id,
          teacher_name: req.teacherName,
          grade: req.grade,
          term: req.term,
          subject: req.subject,
          student_count: req.studentCount,
          score_count: req.scoreCount,
          status: req.status,
          timestamp: req.timestamp,
          reviewed_at: req.reviewedAt,
          reviewed_by: req.reviewedBy,
          admin_feedback: req.adminFeedback
        });
      } catch (err) {
        console.error('Supabase result publish request failed:', err);
      }
    }
  },

  // Add or update timed staff delegation
  addTimedStaffDelegation: async (delegation: TimedStaffDelegation) => {
    broadcastLocalChange({ type: 'TIMED_DELEGATION_ADDED', data: delegation });

    if (supabase) {
      try {
        await supabase.from('timed_staff_delegations').upsert({
          id: delegation.id,
          teacher_username: delegation.teacherUsername,
          teacher_name: delegation.teacherName,
          granted_sections: delegation.grantedSections,
          granted_at: delegation.grantedAt,
          expires_at: delegation.expiresAt,
          duration_minutes: delegation.durationMinutes,
          granted_by: delegation.grantedBy,
          purpose: delegation.purpose,
          status: delegation.status
        });
      } catch (err) {
        console.error('Supabase timed delegation failed:', err);
      }
    }
  },

  // Update timed staff delegation status
  updateTimedStaffDelegation: async (delegation: TimedStaffDelegation) => {
    broadcastLocalChange({ type: 'TIMED_DELEGATION_UPDATED', data: delegation });

    if (supabase) {
      try {
        await supabase.from('timed_staff_delegations').upsert({
          id: delegation.id,
          teacher_username: delegation.teacherUsername,
          teacher_name: delegation.teacherName,
          granted_sections: delegation.grantedSections,
          granted_at: delegation.grantedAt,
          expires_at: delegation.expiresAt,
          duration_minutes: delegation.durationMinutes,
          granted_by: delegation.grantedBy,
          purpose: delegation.purpose,
          status: delegation.status
        });
      } catch (err) {
        console.error('Supabase timed delegation update failed:', err);
      }
    }
  },

  // Submit admission application
  submitApplication: async (app: StudentApplication) => {
    broadcastLocalChange({ type: 'APPLICATION_SUBMITTED', data: app });

    if (supabase) {
      try {
        await supabase.from('admissions').upsert({
          id: app.id,
          name: app.name,
          email: app.email,
          grade: app.grade,
          paid: app.paid ?? false,
          timestamp: app.timestamp
        });
      } catch (err) {
        console.error('Supabase admission submission failed:', err);
      }
    }
  },

  // Delete admission application
  deleteApplication: async (id: string) => {
    if (supabase) {
      try {
        await supabase.from('admissions').delete().eq('id', id);
      } catch (err) {
        console.error('Supabase delete admission failed:', err);
      }
    }
  },

  // Save or update class timetable
  saveClassTimetable: async (timetable: ClassTimetable) => {
    broadcastLocalChange({ type: 'TIMETABLE_SAVED', data: timetable });

    if (supabase) {
      try {
        const { error } = await supabase.from('timetables').upsert({
          id: timetable.id,
          grade: timetable.grade,
          term: timetable.term,
          academic_year: timetable.academicYear,
          periods: timetable.periods,
          updated_at: timetable.updatedAt,
          updated_by: timetable.updatedBy
        }, { onConflict: 'id' });

        if (error) {
          console.error('Supabase saveClassTimetable error:', error);
        }
      } catch (err) {
        console.error('Supabase save timetable failed:', err);
      }
    }
  },

  // Delete class timetable
  deleteClassTimetable: async (id: string) => {
    broadcastLocalChange({ type: 'TIMETABLE_DELETED', data: { id } });

    if (supabase) {
      try {
        await supabase.from('timetables').delete().eq('id', id);
      } catch (err) {
        console.error('Supabase delete timetable failed:', err);
      }
    }
  }
};
