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
  FeeStructure 
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
      calendarRes
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
      supabase.from('school_calendar').select('*').eq('id', 1).single()
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
      fees: {}
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

  // 1. Listen to BroadcastChannel across browser tabs for immediate sync
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

      case 'ATTENDANCE_RECORDED':
        onStateUpdate(prev => {
          const exists = prev.attendance.some(a => a.studentId === data.studentId && a.date === data.date);
          if (exists) return prev;
          return { ...prev, attendance: [data, ...prev.attendance] };
        });
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
        onStateUpdate(prev => ({
          ...prev,
          results: [...prev.results, data]
        }));
        break;

      case 'CHILD_LINKED':
        onStateUpdate(prev => {
          const { parentId, studentId } = data;
          return {
            ...prev,
            parents: (prev.parents || []).map(p => {
              if (p.id === parentId) {
                if (!p.childrenStudentIds.includes(studentId)) {
                  return { ...p, childrenStudentIds: [...p.childrenStudentIds, studentId] };
                }
              }
              return p;
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
                return { ...p, childrenStudentIds: p.childrenStudentIds.filter(id => id !== studentId) };
              }
              return p;
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
        onStateUpdate(prev => ({
          ...prev,
          studentAccounts: [...prev.studentAccounts.filter(s => s.id !== data.id), data]
        }));
        break;

      case 'COURSE_ADDED':
        onStateUpdate(prev => ({
          ...prev,
          courses: [...prev.courses.filter(c => c.id !== data.id), data]
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
        onStateUpdate(prev => ({
          ...prev,
          teachers: [...prev.teachers.filter(t => t.id !== data.id), data]
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
      // Listen to all public table changes
      .on('postgres_changes', { event: '*', schema: 'public' }, async (payload) => {
        console.log('Realtime change received from Supabase:', payload);
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
            }
            break;

          case 'attendance_records':
            if (eventType === 'INSERT') {
              const mapped: AttendanceRecord = {
                studentId: newRecord.student_id,
                date: newRecord.date,
                markedBy: newRecord.marked_by,
                term: newRecord.term || 'First Term'
              };
              onStateUpdate(prev => ({
                ...prev,
                attendance: [mapped, ...prev.attendance.filter(a => !(a.studentId === mapped.studentId && a.date === mapped.date))]
              }));
            }
            break;

          case 'students':
            if (eventType === 'INSERT' || eventType === 'UPDATE') {
              onStateUpdate(prev => ({
                ...prev,
                studentAccounts: prev.studentAccounts.map(s => {
                  if (s.id === newRecord.id) {
                    return {
                      ...s,
                      name: newRecord.name,
                      grade: newRecord.grade,
                      entryAllowed: newRecord.entry_allowed,
                      activeTerm: newRecord.active_term,
                      qrCodeVersion: newRecord.qr_code_version
                    };
                  }
                  return s;
                })
              }));
            }
            break;

          case 'parent_student_links':
            if (eventType === 'INSERT' || eventType === 'UPDATE') {
              onStateUpdate(prev => ({
                ...prev,
                parents: (prev.parents || []).map(p => {
                  if (p.id === newRecord.parent_id) {
                    const active = newRecord.is_active;
                    const children = p.childrenStudentIds || [];
                    if (active && !children.includes(newRecord.student_id)) {
                      return { ...p, childrenStudentIds: [...children, newRecord.student_id] };
                    } else if (!active) {
                      return { ...p, childrenStudentIds: children.filter(id => id !== newRecord.student_id) };
                    }
                  }
                  return p;
                })
              }));
            } else if (eventType === 'DELETE') {
              onStateUpdate(prev => ({
                ...prev,
                parents: (prev.parents || []).map(p => {
                  if (p.id === oldRecord.parent_id) {
                    return { ...p, childrenStudentIds: p.childrenStudentIds.filter(id => id !== oldRecord.student_id) };
                  }
                  return p;
                })
              }));
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
                term: newRecord.term,
                teacherName: newRecord.teacher_name,
                date: newRecord.date
              };
              onStateUpdate(prev => ({
                ...prev,
                results: [...prev.results.filter(r => r.id !== mapped.id), mapped]
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
            } else if (eventType === 'DELETE') {
              onStateUpdate(prev => ({
                ...prev,
                announcements: prev.announcements.filter(a => a.id !== oldRecord.id)
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

          default:
            // For other tables, perform a full delta refresh
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
          reviewed_by: payment.reviewedBy,
          reviewed_at: payment.reviewedAt,
          messages: payment.messages || []
        });
      } catch (err) {
        console.error('Supabase payment sync failed:', err);
      }
    }
  },

  // Record gate attendance
  recordAttendance: async (record: AttendanceRecord) => {
    broadcastLocalChange({ type: 'ATTENDANCE_RECORDED', data: record });

    if (supabase) {
      try {
        await supabase.from('attendance_records').insert({
          student_id: record.studentId,
          date: record.date,
          marked_by: record.markedBy,
          term: record.term || 'First Term',
          method: 'gate_scanner'
        });
      } catch (err) {
        console.error('Supabase attendance sync failed:', err);
      }
    }
  },

  // Add announcement
  addAnnouncement: async (announcement: Announcement) => {
    broadcastLocalChange({ type: 'ANNOUNCEMENT_ADDED', data: announcement });

    if (supabase) {
      try {
        await supabase.from('announcements').insert({
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

  // Update announcement words/details
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

  // Add student result
  addResult: async (result: StudentResult) => {
    broadcastLocalChange({ type: 'RESULT_ADDED', data: result });

    if (supabase) {
      try {
        await supabase.from('student_results').insert({
          id: result.id,
          student_name: result.studentName,
          grade: result.grade,
          subject: result.subject,
          score: result.score,
          term: result.term,
          teacher_name: result.teacherName,
          date: result.date
        });
      } catch (err) {
        console.error('Supabase result sync failed:', err);
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

  // Add student account
  addStudent: async (student: StudentAccount) => {
    broadcastLocalChange({ type: 'STUDENT_ADDED', data: student });

    if (supabase) {
      try {
        await supabase.from('students').insert({
          id: student.id,
          name: student.name,
          grade: student.grade,
          email: student.email,
          entry_allowed: student.entryAllowed ?? true,
          active_term: student.activeTerm || 'First Term',
          qr_code_version: student.qrCodeVersion || 1
        });
      } catch (err) {
        console.error('Supabase add student failed:', err);
      }
    }
  },

  // Add course
  addCourse: async (course: Course) => {
    broadcastLocalChange({ type: 'COURSE_ADDED', data: course });

    if (supabase) {
      try {
        await supabase.from('courses').insert({
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

  // Add teacher account
  addTeacher: async (teacher: TeacherAccount) => {
    broadcastLocalChange({ type: 'TEACHER_ADDED', data: teacher });

    if (supabase) {
      try {
        await supabase.from('teacher_accounts').insert({
          id: teacher.id,
          username: teacher.username,
          assigned_grades: teacher.assignedGrades,
          assigned_courses: teacher.assignedCourses,
          allowed_pages: teacher.allowedPages || ['overview', 'students', 'termStats', 'grading', 'attendance', 'courses']
        });
      } catch (err) {
        console.error('Supabase add teacher failed:', err);
      }
    }
  }
};
