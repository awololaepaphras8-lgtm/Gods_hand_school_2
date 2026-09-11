import { AppState, StudentAccount, FeePayment, FeeStructure, AttendanceRecord, StudentResult, StudentApplication, TeacherAccount } from '../types';

/**
 * Utility to download data as a file directly in the browser.
 */
function triggerDownload(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

/**
 * Helper to escape CSV cell content properly.
 */
function escapeCSV(val: any): string {
  if (val === null || val === undefined) return '""';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return `"${str}"`;
}

/**
 * 1. Master JSON Backup containing the entire school database.
 */
export function exportCompleteSchoolDatabaseJSON(state: AppState) {
  const dateStr = new Date().toISOString().split('T')[0];
  const filename = `gods_hand_school_master_backup_${dateStr}.json`;

  const totalFeeRevenue = state.payments.reduce((sum, p) => sum + (p.amount || 0), 0);

  const exportPayload = {
    metadata: {
      schoolName: "God's Hand International Model School",
      motto: "Have Faith In God - Building Lives Upon The Rock",
      location: "Oluwatedo Ire-Akari, Orisunmibare Area, Owode, Wire and Cable Axis, Apata, Ibadan, Oyo State",
      exportedAt: new Date().toISOString(),
      exportedBy: "Proprietor / Administrator",
      schemaVersion: "2.0",
      summary: {
        totalStudentsAndPupils: state.studentAccounts.length,
        totalStaffMembers: state.teachers.length,
        totalPaymentsRecorded: state.payments.length,
        totalRevenueCollectedNGN: totalFeeRevenue,
        totalAcademicResults: state.results.length,
        totalAttendanceEntries: state.attendance.length,
        totalAdmissionsApplications: state.applications.length,
        totalCourses: state.courses.length,
        totalBulletins: state.announcements.length,
      }
    },
    database: {
      studentsAndPupils: state.studentAccounts,
      feePayments: state.payments,
      feesStructure: state.fees,
      admissionsApplications: state.applications,
      academicResults: state.results,
      attendanceRegistry: state.attendance,
      staffAccounts: state.teachers,
      curriculumCourses: state.courses,
      bulletinsAndAnnouncements: state.announcements,
      academicCalendar: state.academicCalendar,
    }
  };

  const jsonString = JSON.stringify(exportPayload, null, 2);
  triggerDownload(filename, jsonString, 'application/json;charset=utf-8;');
}

/**
 * 2. Students & Pupils Master List CSV
 */
export function exportStudentsAndPupilsCSV(students: StudentAccount[], payments: FeePayment[], fees: FeeStructure) {
  const dateStr = new Date().toISOString().split('T')[0];
  const filename = `students_and_pupils_roster_${dateStr}.csv`;

  const headers = [
    'Student/Pupil ID',
    'Full Name',
    'Grade / Class',
    'School Entry Status',
    'Term Fee Required (NGN)',
    'Total Fees Paid (NGN)',
    'Outstanding Balance (NGN)',
    'Payment Completion (%)',
    'Date Registered'
  ];

  const rows = students.map(student => {
    const studentPayments = payments.filter(p => p.studentId === student.id);
    const totalPaid = studentPayments.reduce((acc, curr) => acc + (curr.amount || 0), 0);
    const requiredFee = fees[student.grade] || 0;
    const balance = Math.max(0, requiredFee - totalPaid);
    const percentage = requiredFee > 0 ? Math.min(100, Math.round((totalPaid / requiredFee) * 100)) : 100;
    const entryStatus = student.entryAllowed ? 'Cleared (Entry Allowed)' : (percentage >= 100 ? 'Cleared (Paid)' : 'Restricted (Fees Due)');

    return [
      escapeCSV(student.id),
      escapeCSV(student.name),
      escapeCSV(student.grade),
      escapeCSV(entryStatus),
      escapeCSV(requiredFee),
      escapeCSV(totalPaid),
      escapeCSV(balance),
      escapeCSV(`${percentage}%`),
      escapeCSV(student.createdAt ? new Date(student.createdAt).toLocaleDateString() : 'N/A')
    ].join(',');
  });

  const csvContent = [headers.join(','), ...rows].join('\r\n');
  triggerDownload(filename, csvContent, 'text/csv;charset=utf-8;');
}

/**
 * 3. School Fee Payments & Financial Ledger CSV
 */
export function exportFeePaymentsCSV(payments: FeePayment[]) {
  const dateStr = new Date().toISOString().split('T')[0];
  const filename = `school_fee_payments_ledger_${dateStr}.csv`;

  const headers = [
    'Payment / Receipt ID',
    'Student / Pupil Name',
    'Student / Pupil ID',
    'Grade / Class',
    'Payment Type',
    'Amount Paid (NGN)',
    'Payment Date'
  ];

  const rows = payments.map(p => [
    escapeCSV(p.id),
    escapeCSV(p.studentName),
    escapeCSV(p.studentId),
    escapeCSV(p.grade),
    escapeCSV(p.type === 'full' ? 'Full Payment' : p.type === 'installment_1' ? '1st Installment' : '2nd Installment'),
    escapeCSV(p.amount),
    escapeCSV(p.date)
  ].join(','));

  const csvContent = [headers.join(','), ...rows].join('\r\n');
  triggerDownload(filename, csvContent, 'text/csv;charset=utf-8;');
}

/**
 * 4. Academic Results Database CSV
 */
export function exportAcademicResultsCSV(results: StudentResult[]) {
  const dateStr = new Date().toISOString().split('T')[0];
  const filename = `academic_results_records_${dateStr}.csv`;

  const headers = [
    'Result ID',
    'Student / Pupil Name',
    'Grade / Class',
    'Subject',
    'Score (%)',
    'Performance Remark',
    'Assessment Term',
    'Teacher / Recorded By',
    'Date Recorded'
  ];

  const rows = results.map(r => {
    let remark = 'Fail';
    if (r.score >= 75) remark = 'Distinction (A1)';
    else if (r.score >= 65) remark = 'Very Good (B2/B3)';
    else if (r.score >= 50) remark = 'Credit (C4-C6)';
    else if (r.score >= 40) remark = 'Pass (D7/E8)';

    return [
      escapeCSV(r.id),
      escapeCSV(r.studentName),
      escapeCSV(r.grade),
      escapeCSV(r.subject),
      escapeCSV(r.score),
      escapeCSV(remark),
      escapeCSV(r.term),
      escapeCSV(r.teacherName || 'Staff'),
      escapeCSV(r.date)
    ].join(',');
  });

  const csvContent = [headers.join(','), ...rows].join('\r\n');
  triggerDownload(filename, csvContent, 'text/csv;charset=utf-8;');
}

/**
 * 5. Daily & Term Attendance Registry CSV
 */
export function exportAttendanceCSV(attendance: AttendanceRecord[], students: StudentAccount[]) {
  const dateStr = new Date().toISOString().split('T')[0];
  const filename = `attendance_registry_log_${dateStr}.csv`;

  const headers = [
    'Student / Pupil ID',
    'Student / Pupil Name',
    'Grade / Class',
    'Date Verified',
    'Attendance Term',
    'Marked By (Staff)'
  ];

  const rows = attendance.map(a => {
    const student = students.find(s => s.id === a.studentId);
    return [
      escapeCSV(a.studentId),
      escapeCSV(student ? student.name : 'Unknown'),
      escapeCSV(student ? student.grade : 'N/A'),
      escapeCSV(a.date),
      escapeCSV(a.term || 'First Term'),
      escapeCSV(a.markedBy)
    ].join(',');
  });

  const csvContent = [headers.join(','), ...rows].join('\r\n');
  triggerDownload(filename, csvContent, 'text/csv;charset=utf-8;');
}

/**
 * 6. Admissions Applications CSV
 */
export function exportAdmissionsCSV(applications: StudentApplication[]) {
  const dateStr = new Date().toISOString().split('T')[0];
  const filename = `admissions_applications_${dateStr}.csv`;

  const headers = [
    'Application ID',
    'Applicant Name (Student/Pupil)',
    'Grade Applied',
    'Contact Email',
    'Fee / Deposit Paid',
    'Application Date'
  ];

  const rows = applications.map(app => [
    escapeCSV(app.id),
    escapeCSV(app.name),
    escapeCSV(app.grade),
    escapeCSV(app.email),
    escapeCSV(app.paid ? 'Paid' : 'Pending'),
    escapeCSV(app.timestamp)
  ].join(','));

  const csvContent = [headers.join(','), ...rows].join('\r\n');
  triggerDownload(filename, csvContent, 'text/csv;charset=utf-8;');
}

/**
 * 7. Staff & Teachers Roster CSV
 */
export function exportStaffRosterCSV(teachers: TeacherAccount[]) {
  const dateStr = new Date().toISOString().split('T')[0];
  const filename = `staff_teachers_roster_${dateStr}.csv`;

  const headers = [
    'Staff ID',
    'Username',
    'Assigned Classes / Grades',
    'Assigned Courses Count',
    'Allowed Dashboard Pages',
    'Created Date'
  ];

  const rows = teachers.map(t => [
    escapeCSV(t.id),
    escapeCSV(t.username),
    escapeCSV((t.assignedGrades || []).join('; ')),
    escapeCSV((t.assignedCourses || []).length),
    escapeCSV((t.allowedPages || []).join('; ')),
    escapeCSV(t.createdAt ? new Date(t.createdAt).toLocaleDateString() : 'N/A')
  ].join(','));

  const csvContent = [headers.join(','), ...rows].join('\r\n');
  triggerDownload(filename, csvContent, 'text/csv;charset=utf-8;');
}
