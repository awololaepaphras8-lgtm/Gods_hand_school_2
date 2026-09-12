
export enum UserRole {
  GUEST = 'GUEST',
  STUDENT = 'STUDENT',
  TEACHER = 'TEACHER',
  ADMIN = 'ADMIN',
  PARENT = 'PARENT'
}

export type GradeLevel = 
  | 'KG 1' | 'KG 2'
  | 'Nursery 1' | 'Nursery 2'
  | 'Primary 1' | 'Primary 2' | 'Primary 3' | 'Primary 4' | 'Primary 5'
  | 'JSS 1' | 'JSS 2' | 'JSS 3'
  | 'SSS 1' | 'SSS 2' | 'SSS 3';

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
  | 'courses';

export const ALL_STAFF_PAGES: { id: StaffPagePermission; label: string; description: string; icon: string }[] = [
  { id: 'overview', label: 'Summary', description: 'Overview metrics & attendance stats', icon: '📊' },
  { id: 'students', label: 'Students & Pupils', description: 'Class list, profiles & student and pupil promotion', icon: '👨‍🎓' },
  { id: 'termStats', label: 'Term Attendance', description: 'Term attendance logs and summaries', icon: '📅' },
  { id: 'grading', label: 'Grading', description: 'Score entry and academic result upload', icon: '📝' },
  { id: 'attendance', label: 'Mark Attendance', description: 'Live QR scanner and attendance verification', icon: '📷' },
  { id: 'courses', label: 'Curriculum', description: 'Course management and syllabus duplication', icon: '📚' },
];

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
  messages?: PaymentChatMessage[];
}

export interface AttendanceRecord {
  studentId: string;
  date: string;
  markedBy: string;
  term?: string;
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
}
