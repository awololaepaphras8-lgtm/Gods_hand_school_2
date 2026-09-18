
export enum UserRole {
  GUEST = 'GUEST',
  STUDENT = 'STUDENT',
  TEACHER = 'TEACHER',
  ADMIN = 'ADMIN',
  PARENT = 'PARENT'
}

export type GradeLevel = 
  | 'Crèche'
  | 'Prenursery 1' | 'Prenursery 2'
  | 'Pre-Nursery 1' | 'Pre-Nursery 2'
  | 'Nursery 1' | 'Nursery 2'
  | 'Basic 1' | 'Basic 2' | 'Basic 3' | 'Basic 4' | 'Basic 5'
  | 'JSS 1' | 'JSS 2' | 'JSS 3'
  | 'SS 1 (Science)' | 'SS 1 (Commerce & Arts)' | 'SS 1 (Commerce and Arts)'
  | 'SS 2 (Science)' | 'SS 2 (Commerce & Arts)' | 'SS 2 (Commerce and Arts)'
  | 'SS 3 (Science)' | 'SS 3 (Commerce & Arts)' | 'SS 3 (Commerce and Arts)'
  | 'KG 1' | 'KG 2'
  | 'Primary 1' | 'Primary 2' | 'Primary 3' | 'Primary 4' | 'Primary 5'
  | 'SSS 1' | 'SSS 2' | 'SSS 3'
  | (string & {});

export interface FeeStructure {
  [key: string]: number;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  date: string;
}

export interface Course {
  id: string;
  name: string;
  grade: GradeLevel;
  description: string;
}

export interface StudentApplication {
  id: string;
  name: string;
  email: string;
  grade: GradeLevel;
  paid: boolean;
  timestamp: string;
}

export type StaffPagePermission = 
  | 'overview' 
  | 'students' 
  | 'termStats' 
  | 'grading' 
  | 'attendance' 
  | 'courses'
  | 'timetable';

export const ALL_STAFF_PAGES: { id: StaffPagePermission; label: string; description: string; icon: string }[] = [
  { id: 'overview', label: 'Summary', description: 'Overview metrics & attendance stats', icon: '📊' },
  { id: 'students', label: 'Students & Pupils', description: 'Class list, profiles & student promotion to next class', icon: '👨‍🎓' },
  { id: 'timetable', label: 'Class Timetable', description: 'Weekly class schedule & lesson timetable builder', icon: '🗓️' },
  { id: 'termStats', label: 'Term Attendance', description: 'Term attendance logs and summaries', icon: '📅' },
  { id: 'grading', label: 'Grading', description: 'Score entry and academic result upload', icon: '📝' },
  { id: 'attendance', label: 'Mark Attendance', description: 'Live QR scanner and attendance verification', icon: '📷' },
  { id: 'courses', label: 'Curriculum', description: 'Course management and syllabus duplication', icon: '📚' },
];

export interface TimetablePeriod {
  id: string;
  day: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday';
  startTime: string; // e.g. "08:00 AM" or "08:00"
  endTime: string;   // e.g. "08:45 AM" or "08:45"
  subject: string;
  teacherName?: string;
  room?: string;
}

export interface ClassTimetable {
  id: string;
  grade: GradeLevel;
  term?: string;
  academicYear?: string;
  periods: TimetablePeriod[];
  notes?: string;
  updatedAt?: string;
  updatedBy?: string;
}

export interface TeacherAccount {
  id: string;
  username: string;
  password: string;
  createdAt: string;
  assignedGrades: GradeLevel[];
  assignedCourses: string[]; // Array of Course IDs
  allowedPages?: StaffPagePermission[];
}

export interface TermQrInfo {
  count: number;
  qrCodeValue: string;
  generatedAt: string;
}

export interface ParentAccount {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  password: string;
  relationship?: 'Father' | 'Mother' | 'Guardian' | 'Other';
  address?: string;
  childrenStudentIds: string[]; // List of StudentAccount.id values
  createdAt: string;
}

export interface StudentAccount {
  id: string;
  name: string;
  email: string;
  password: string;
  grade: GradeLevel;
  admissionYear?: number;
  createdAt: string;
  entryAllowed?: boolean;
  qrCodeVersion?: number;
  qrGenerations?: { [term: string]: TermQrInfo };
  activeTerm?: string;
  parentEmail?: string;
  parentId?: string;
}

export interface StudentResult {
  id: string;
  studentName: string;
  grade: GradeLevel;
  subject: string;
  score: number;
  caScore?: number;
  examScore?: number;
  position?: string | number;
  term: string;
  teacherName: string;
  date: string;
  published?: boolean;
}

export interface ResultPublishRequest {
  id: string;
  teacherName: string;
  grade: GradeLevel;
  term: string;
  subject?: string;
  studentCount: number;
  scoreCount: number;
  status: 'pending' | 'approved' | 'rejected';
  timestamp: string;
  reviewedAt?: string;
  reviewedBy?: string;
  adminFeedback?: string;
}

export type PaymentType = 'full' | 'installment_1' | 'installment_2' | 'result_fee';
export type PaymentStatus = 'pending' | 'confirmed' | 'declined';

export interface PaymentChatMessage {
  id: string;
  sender: 'student' | 'admin';
  senderName: string;
  message: string;
  timestamp: string;
}

export interface FeePayment {
  id: string;
  studentId: string;
  studentName: string;
  amount: number;
  grade: GradeLevel;
  type: PaymentType;
  date: string;
  status?: PaymentStatus;
  receiptImage?: string; // base64 or receipt image URL
  receiptFileName?: string;
  bankName?: string;
  payerName?: string;
  transactionRef?: string;
  studentNote?: string;
  adminNote?: string;
  reviewedAt?: string;
  reviewedBy?: string;
  receiptFileType?: string;
  receiptUploadedAt?: string;
  messages?: PaymentChatMessage[];
}

export interface AttendanceRecord {
  studentId: string;
  date: string;
  markedBy: string;
  term?: string;
}

export type AdminSectionKey = 
  | 'attendance'
  | 'payments'
  | 'resultPublish'
  | 'pageAccess'
  | 'fees'
  | 'applications'
  | 'teachers'
  | 'courses'
  | 'calendar'
  | 'announcements'
  | 'parents'
  | 'export';

export interface AdminSectionConfig {
  id: AdminSectionKey;
  label: string;
  description: string;
  icon: string;
}

export const ALL_ADMIN_SECTIONS: AdminSectionConfig[] = [
  { id: 'attendance', label: 'Gate Attendance & Scanner', description: 'Monitor live gate scans, logs & attendance rolls', icon: '📷' },
  { id: 'payments', label: 'Fee Verification & Receipts', description: 'Verify bank payments, invoices & approve receipts', icon: '💳' },
  { id: 'resultPublish', label: 'Terminal Result Releases', description: 'Approve assessment scores and broadcast to pupils', icon: '📜' },
  { id: 'pageAccess', label: 'User Pages Access Control', description: 'Close/open user pages or lock the entire public portal', icon: '🔒' },
  { id: 'fees', label: 'School Fees Schedule', description: 'Configure school fee amounts per grade level', icon: '💰' },
  { id: 'applications', label: 'Admissions & Gate Clearance', description: 'Review new admissions and toggle gate entry passes', icon: '📋' },
  { id: 'teachers', label: 'Staff & Classroom Directory', description: 'Staff records, classroom & syllabus assignments', icon: '👔' },
  { id: 'courses', label: 'Curriculum & Subjects', description: 'Manage courses, syllabi and grade duplications', icon: '📚' },
  { id: 'calendar', label: 'Academic Calendar', description: 'Manage term resumption, examinations & vacation dates', icon: '📅' },
  { id: 'announcements', label: 'School Bulletins', description: 'Publish announcements to parents and students', icon: '📢' },
  { id: 'parents', label: 'Parent Accounts & Links', description: 'Link registered parents to pupils and view family hubs', icon: '👨‍👩‍👧‍👦' },
  { id: 'export', label: 'Data Export & Reports', description: 'Generate comprehensive backups, CSVs and student registers', icon: '📊' },
];

export type UserPageKey = 
  | 'apply'
  | 'feeChecker'
  | 'resultChecker'
  | 'studentReceipts'
  | 'parentPortal'
  | 'studentPortal'
  | 'about';

export interface PageAccessItem {
  isOpen: boolean;
  closedReason?: string;
  lastUpdated?: string;
}

export interface UserPagesAccessState {
  allPagesClosed: boolean;
  globalClosedMessage?: string;
  pages: {
    [key in UserPageKey]?: PageAccessItem;
  };
}

export const ALL_USER_PAGES: { id: UserPageKey; label: string; description: string; icon: string }[] = [
  { id: 'apply', label: 'School Fees Payment Portal', description: 'Direct tuition and fees payment gateway with receipt upload', icon: '💳' },
  { id: 'feeChecker', label: 'Check School Fees', description: 'Term fee schedule, balance inquiry, and installment breakdown', icon: '💰' },
  { id: 'resultChecker', label: 'Terminal Result Checker', description: 'Student assessment score reports and terminal report cards', icon: '📜' },
  { id: 'studentReceipts', label: 'Student Receipts Download Portal', description: 'Download official stamped school fee receipts and audit logs', icon: '📑' },
  { id: 'parentPortal', label: 'Parent Portal & Family Hub', description: 'Guardian overview, child attendance and family payment clearance', icon: '👨‍👩‍👧‍👦' },
  { id: 'studentPortal', label: 'Students & Pupils Hub', description: 'Student dashboard, gate QR codes and digital ID cards', icon: '💻' },
  { id: 'about', label: 'About School & Campus Tour', description: 'School history, campus facilities and photo galleries', icon: '🏛️' },
];

export interface TimedStaffDelegation {
  id: string;
  teacherUsername: string;
  teacherName: string;
  grantedSections: AdminSectionKey[];
  grantedAt: string; // ISO string
  expiresAt: string; // ISO string
  durationMinutes: number;
  grantedBy: string;
  purpose?: string;
  status: 'active' | 'revoked' | 'expired';
}

export interface AppState {
  fees: FeeStructure;
  announcements: Announcement[];
  applications: StudentApplication[];
  teachers: TeacherAccount[];
  studentAccounts: StudentAccount[];
  parents?: ParentAccount[];
  results: StudentResult[];
  courses: Course[];
  payments: FeePayment[];
  attendance: AttendanceRecord[];
  academicCalendar: string;
  resultPublishRequests?: ResultPublishRequest[];
  timedStaffDelegations?: TimedStaffDelegation[];
  userPagesAccess?: UserPagesAccessState;
  timetables?: ClassTimetable[];
}
