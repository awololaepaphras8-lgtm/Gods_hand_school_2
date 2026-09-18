import { AppState, StudentAccount, FeePayment, FeeStructure, AttendanceRecord, StudentResult, StudentApplication, TeacherAccount } from '../types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

/**
 * Utility to download data as a file directly in the browser.
 */
export function triggerDownload(filename: string, content: string, mimeType: string) {
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
 * 1. Master Excel (.xlsx) Export containing multi-sheet complete school database
 */
export function exportCompleteSchoolDataExcel(state: AppState) {
  const dateStr = new Date().toISOString().split('T')[0];
  const filename = `gods_hand_school_complete_database_${dateStr}.xlsx`;
  const wb = XLSX.utils.book_new();

  // Sheet 1: Executive Summary
  const totalFeeRevenue = state.payments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const summaryAoa: any[][] = [
    ["GOD'S HAND INTERNATIONAL MODEL SCHOOL - MASTER DATABASE LEDGER"],
    ["Motto:", "Have Faith In God - Building Lives Upon The Solid Rock"],
    ["Location:", "Oluwatedo Ire-Akari, Orisunmibare Area, Owode, Wire and Cable Axis, Apata, Ibadan, Oyo State"],
    ["Export Timestamp:", new Date().toLocaleString()],
    ["Exported By:", "Proprietor / Executive School Administration"],
    [],
    ["INSTITUTIONAL METRICS SUMMARY", "STATISTIC / AMOUNT"],
    ["Total Students & Pupils Enrolled", state.studentAccounts.length],
    ["Total Teaching & Administrative Faculty", state.teachers.length],
    ["Total Fee Payments Recorded", state.payments.length],
    ["Total Fee Revenue Collected (NGN)", `₦${totalFeeRevenue.toLocaleString()}`],
    ["Total Academic Results Logged", state.results.length],
    ["Total Attendance Entries", state.attendance.length],
    ["Total Admissions Applications", state.applications.length],
    ["Total Registered Courses", state.courses.length],
    ["Total Bulletins & Announcements", state.announcements.length],
    [],
    ["CURRENT TUITION FEE STRUCTURE", "PER TERM FEE (NGN)"],
    ...Object.entries(state.fees).map(([grade, fee]) => [grade, fee])
  ];
  const wsSummary = XLSX.utils.aoa_to_sheet(summaryAoa);
  XLSX.utils.book_append_sheet(wb, wsSummary, "School Summary");

  // Sheet 2: Students & Pupils Roster
  const studentsAoa: any[][] = [
    ["Student ID", "Full Name", "Class / Grade", "Entry Clearance Status", "Term Fee Required (NGN)", "Total Fees Paid (NGN)", "Outstanding Balance (NGN)", "Payment Completion (%)", "Registered Date"]
  ];
  state.studentAccounts.forEach(student => {
    const studentPayments = state.payments.filter(p => p.studentId === student.id);
    const totalPaid = studentPayments.reduce((acc, curr) => acc + (curr.amount || 0), 0);
    const requiredFee = state.fees[student.grade] || 0;
    const balance = Math.max(0, requiredFee - totalPaid);
    const percentage = requiredFee > 0 ? Math.min(100, Math.round((totalPaid / requiredFee) * 100)) : 100;
    const entryStatus = student.entryAllowed ? 'Cleared (Entry Allowed)' : (percentage >= 100 ? 'Cleared (Paid)' : 'Restricted (Fees Due)');
    studentsAoa.push([
      student.id,
      student.name,
      student.grade,
      entryStatus,
      requiredFee,
      totalPaid,
      balance,
      `${percentage}%`,
      student.createdAt ? new Date(student.createdAt).toLocaleDateString() : 'N/A'
    ]);
  });
  const wsStudents = XLSX.utils.aoa_to_sheet(studentsAoa);
  XLSX.utils.book_append_sheet(wb, wsStudents, "Students & Pupils");

  // Sheet 3: Fee Payments Ledger
  const paymentsAoa: any[][] = [
    ["Receipt ID", "Student Name", "Student ID", "Class / Grade", "Payment Type", "Amount Paid (NGN)", "Payment Status", "Transaction Reference", "Bank Name", "Payer Name", "Payment Date"]
  ];
  state.payments.forEach(p => {
    paymentsAoa.push([
      p.id,
      p.studentName,
      p.studentId,
      p.grade,
      p.type === 'full' ? 'Full Payment' : p.type === 'installment_1' ? '1st Installment' : p.type === 'result_fee' ? 'Result Checker Fee' : '2nd Installment',
      p.amount,
      p.status ? p.status.toUpperCase() : 'CONFIRMED',
      p.transactionRef || 'N/A',
      p.bankName || 'N/A',
      p.payerName || 'N/A',
      p.date
    ]);
  });
  const wsPayments = XLSX.utils.aoa_to_sheet(paymentsAoa);
  XLSX.utils.book_append_sheet(wb, wsPayments, "Fee Payments Ledger");

  // Sheet 4: Academic Results
  const resultsAoa: any[][] = [
    ["Result ID", "Student Name", "Class / Grade", "Subject", "Score (%)", "Performance Grade / Remark", "Assessment Term", "Recorded By", "Date Recorded"]
  ];
  state.results.forEach(r => {
    let remark = 'Fail';
    if (r.score >= 75) remark = 'Distinction (A1)';
    else if (r.score >= 65) remark = 'Very Good (B2/B3)';
    else if (r.score >= 50) remark = 'Credit (C4-C6)';
    else if (r.score >= 40) remark = 'Pass (D7/E8)';

    resultsAoa.push([
      r.id,
      r.studentName,
      r.grade,
      r.subject,
      r.score,
      remark,
      r.term,
      r.teacherName || 'Staff',
      r.date
    ]);
  });
  const wsResults = XLSX.utils.aoa_to_sheet(resultsAoa);
  XLSX.utils.book_append_sheet(wb, wsResults, "Academic Results");

  // Sheet 5: Attendance Registry
  const attendanceAoa: any[][] = [
    ["Student ID", "Student Name", "Class / Grade", "Date Verified", "Attendance Term", "Marked By (Staff)"]
  ];
  state.attendance.forEach(a => {
    const student = state.studentAccounts.find(s => s.id === a.studentId);
    attendanceAoa.push([
      a.studentId,
      student ? student.name : 'Unknown',
      student ? student.grade : 'N/A',
      a.date,
      a.term || 'First Term',
      a.markedBy
    ]);
  });
  const wsAttendance = XLSX.utils.aoa_to_sheet(attendanceAoa);
  XLSX.utils.book_append_sheet(wb, wsAttendance, "Attendance Registry");

  // Sheet 6: Staff & Faculty
  const staffAoa: any[][] = [
    ["Staff ID", "Username", "Assigned Classes / Grades", "Assigned Courses Count", "Allowed Portal Modules", "Created Date"]
  ];
  state.teachers.forEach(t => {
    staffAoa.push([
      t.id,
      t.username,
      (t.assignedGrades || []).join('; '),
      (t.assignedCourses || []).length,
      (t.allowedPages || []).join('; '),
      t.createdAt ? new Date(t.createdAt).toLocaleDateString() : 'N/A'
    ]);
  });
  const wsStaff = XLSX.utils.aoa_to_sheet(staffAoa);
  XLSX.utils.book_append_sheet(wb, wsStaff, "Staff & Faculty");

  // Sheet 7: Admissions Applications
  const admissionsAoa: any[][] = [
    ["Application ID", "Applicant Name", "Class Applied", "Contact Email", "Deposit / Fee Status", "Application Date"]
  ];
  state.applications.forEach(app => {
    admissionsAoa.push([
      app.id,
      app.name,
      app.grade,
      app.email,
      app.paid ? 'Paid' : 'Pending',
      app.timestamp
    ]);
  });
  const wsAdmissions = XLSX.utils.aoa_to_sheet(admissionsAoa);
  XLSX.utils.book_append_sheet(wb, wsAdmissions, "Admissions");

  XLSX.writeFile(wb, filename);
}

/**
 * 2. Master Official PDF Export containing formatted institutional ledger
 */
export function exportCompleteSchoolDataPDF(state: AppState) {
  const dateStr = new Date().toISOString().split('T')[0];
  const filename = `gods_hand_school_complete_report_${dateStr}.pdf`;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const drawSchoolHeader = (subTitle?: string) => {
    // School Banner
    doc.setFillColor(30, 58, 138); // blue-900
    doc.rect(0, 0, pageWidth, 58, 'F');

    // Accent line
    doc.setFillColor(250, 204, 21); // yellow-400
    doc.rect(0, 58, pageWidth, 4, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.setTextColor(255, 255, 255);
    doc.text("GOD'S HAND INTERNATIONAL MODEL SCHOOL", pageWidth / 2, 26, { align: 'center' });

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8.5);
    doc.setTextColor(253, 224, 71); // yellow-300
    doc.text("Have Faith In God - Building Lives Upon The Solid Rock", pageWidth / 2, 40, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(226, 232, 240);
    doc.text("Oluwatedo Ire-Akari, Owode, Wire and Cable Axis, Apata, Ibadan, Oyo State", pageWidth / 2, 51, { align: 'center' });
  };

  // Cover Page: Header
  drawSchoolHeader();

  let y = 80;

  // Document Title Box
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(30, 58, 138);
  doc.text("OFFICIAL COMPREHENSIVE SCHOOL DATA & INSTITUTIONAL LEDGER", pageWidth / 2, y, { align: 'center' });
  y += 16;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`Generated on: ${new Date().toLocaleString()} | Authenticated by: School Proprietor / Executive Board`, pageWidth / 2, y, { align: 'center' });
  y += 20;

  // Executive Metric Summary Box
  const totalRevenue = state.payments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const totalStudents = state.studentAccounts.length;
  const totalStaff = state.teachers.length;
  const totalResults = state.results.length;

  autoTable(doc, {
    startY: y,
    head: [['Institutional Overview Metric', 'Statistic / Total Record']],
    body: [
      ['Total Students & Pupils Enrolled', `${totalStudents} Active Pupils / Students`],
      ['Total Teaching & Administrative Faculty', `${totalStaff} Certified Staff Members`],
      ['Total Fee Transactions Recorded', `${state.payments.length} Payments Logged`],
      ['Total Tuition Revenue Collected', `NGN ${totalRevenue.toLocaleString()}`],
      ['Total Continuous Assessment & Term Results', `${totalResults} Subject Result Records`],
      ['Total Daily & Term Attendance Logs', `${state.attendance.length} Verified Attendance Scans`],
      ['Total Registered Admission Applications', `${state.applications.length} Applications Received`],
      ['Total Active Curriculum Courses', `${state.courses.length} Approved Courses`],
      ['Current Term Announcements & Bulletins', `${state.announcements.length} Published Bulletins`]
    ],
    theme: 'striped',
    headStyles: { fillColor: [30, 58, 138], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8.5 },
    bodyStyles: { fontSize: 8, textColor: [30, 41, 59] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: 40, right: 40 }
  });

  // Next section: Tuition Fees Table
  y = (doc as any).lastAutoTable.finalY + 20;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(30, 58, 138);
  doc.text("1. APPROVED TUITION & SESSION FEE STRUCTURE", 40, y);
  y += 8;

  const feeRows = Object.entries(state.fees).map(([grade, amount]) => [
    grade,
    `NGN ${(amount || 0).toLocaleString()}`
  ]);

  autoTable(doc, {
    startY: y,
    head: [['Class / Educational Level', 'Official Term Fee (NGN)']],
    body: feeRows,
    theme: 'grid',
    headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
    bodyStyles: { fontSize: 7.5, textColor: [30, 41, 59] },
    margin: { left: 40, right: 40 }
  });

  // Section 2: Students & Pupils Roster (New Page)
  doc.addPage();
  drawSchoolHeader();
  y = 78;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(30, 58, 138);
  doc.text("2. STUDENTS & PUPILS ENROLLMENT ROSTER", 40, y);
  y += 8;

  const studentRows = state.studentAccounts.map(s => {
    const sPayments = state.payments.filter(p => p.studentId === s.id);
    const paid = sPayments.reduce((acc, curr) => acc + (curr.amount || 0), 0);
    const req = state.fees[s.grade] || 0;
    const bal = Math.max(0, req - paid);
    const pct = req > 0 ? Math.min(100, Math.round((paid / req) * 100)) : 100;
    const status = s.entryAllowed ? 'Cleared' : (pct >= 100 ? 'Cleared' : 'Restricted');

    return [
      s.id,
      s.name,
      s.grade,
      status,
      `NGN ${req.toLocaleString()}`,
      `NGN ${paid.toLocaleString()}`,
      `NGN ${bal.toLocaleString()}`,
      `${pct}%`
    ];
  });

  autoTable(doc, {
    startY: y,
    head: [['Student ID', 'Full Name', 'Class', 'Entry Status', 'Required Fee', 'Total Paid', 'Balance', 'Paid %']],
    body: studentRows.length > 0 ? studentRows : [['-', 'No student records logged yet', '-', '-', '-', '-', '-', '-']],
    theme: 'striped',
    headStyles: { fillColor: [30, 58, 138], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5 },
    bodyStyles: { fontSize: 7, textColor: [30, 41, 59] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: 30, right: 30 }
  });

  // Section 3: Fee Payments Ledger (New Page)
  doc.addPage();
  drawSchoolHeader();
  y = 78;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(30, 58, 138);
  doc.text("3. SCHOOL FEES PAYMENTS & FINANCIAL SETTLEMENTS", 40, y);
  y += 8;

  const paymentRows = state.payments.map(p => [
    p.id,
    p.studentName,
    p.grade,
    p.type === 'full' ? 'Full' : p.type === 'installment_1' ? '1st Inst' : p.type === 'result_fee' ? 'Result Fee' : '2nd Inst',
    `NGN ${p.amount.toLocaleString()}`,
    p.status ? p.status.toUpperCase() : 'CONFIRMED',
    p.transactionRef || 'Transfer',
    new Date(p.date).toLocaleDateString()
  ]);

  autoTable(doc, {
    startY: y,
    head: [['Receipt ID', 'Student Name', 'Class', 'Type', 'Amount', 'Status', 'Reference', 'Date']],
    body: paymentRows.length > 0 ? paymentRows : [['-', 'No payment records logged yet', '-', '-', '-', '-', '-', '-']],
    theme: 'striped',
    headStyles: { fillColor: [22, 101, 52], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5 },
    bodyStyles: { fontSize: 7, textColor: [30, 41, 59] },
    alternateRowStyles: { fillColor: [240, 253, 244] },
    margin: { left: 30, right: 30 }
  });

  // Section 4: Academic Results (New Page)
  doc.addPage();
  drawSchoolHeader();
  y = 78;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(30, 58, 138);
  doc.text("4. ACADEMIC CONTINUOUS ASSESSMENTS & EXAM RESULTS", 40, y);
  y += 8;

  const resultRows = state.results.map(r => {
    let remark = 'Fail';
    if (r.score >= 75) remark = 'Distinction (A1)';
    else if (r.score >= 65) remark = 'Very Good (B2/B3)';
    else if (r.score >= 50) remark = 'Credit (C4-C6)';
    else if (r.score >= 40) remark = 'Pass (D7/E8)';

    return [
      r.studentName,
      r.grade,
      r.subject,
      `${r.score}%`,
      remark,
      r.term,
      r.teacherName || 'Staff',
      r.date
    ];
  });

  autoTable(doc, {
    startY: y,
    head: [['Student Name', 'Class', 'Subject', 'Score', 'Remark', 'Term', 'Recorded By', 'Date']],
    body: resultRows.length > 0 ? resultRows : [['No result records logged yet', '-', '-', '-', '-', '-', '-', '-']],
    theme: 'striped',
    headStyles: { fillColor: [107, 33, 168], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5 },
    bodyStyles: { fontSize: 7, textColor: [30, 41, 59] },
    alternateRowStyles: { fillColor: [250, 245, 255] },
    margin: { left: 30, right: 30 }
  });

  // Section 5: Attendance Registry (New Page)
  doc.addPage();
  drawSchoolHeader();
  y = 78;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(30, 58, 138);
  doc.text("5. ATTENDANCE REGISTRY LOG", 40, y);
  y += 8;

  const attendanceRows = state.attendance.slice(0, 100).map(a => {
    const student = state.studentAccounts.find(s => s.id === a.studentId);
    return [
      a.studentId,
      student ? student.name : 'Unknown',
      student ? student.grade : 'N/A',
      a.date,
      a.term || 'First Term',
      a.markedBy
    ];
  });

  autoTable(doc, {
    startY: y,
    head: [['Student ID', 'Student Name', 'Class', 'Date', 'Term', 'Marked By']],
    body: attendanceRows.length > 0 ? attendanceRows : [['-', 'No attendance records logged yet', '-', '-', '-', '-']],
    theme: 'striped',
    headStyles: { fillColor: [190, 18, 60], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5 },
    bodyStyles: { fontSize: 7, textColor: [30, 41, 59] },
    alternateRowStyles: { fillColor: [255, 241, 242] },
    margin: { left: 30, right: 30 }
  });

  // Section 6: Staff & Admissions (New Page)
  doc.addPage();
  drawSchoolHeader();
  y = 78;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(30, 58, 138);
  doc.text("6. TEACHING FACULTY & STAFF ROSTER", 40, y);
  y += 8;

  const staffRows = state.teachers.map(t => [
    t.id,
    t.username,
    (t.assignedGrades || []).join(', ') || 'All Classes',
    `${(t.assignedCourses || []).length} Courses`,
    t.createdAt ? new Date(t.createdAt).toLocaleDateString() : 'Active'
  ]);

  autoTable(doc, {
    startY: y,
    head: [['Staff ID', 'Staff Username', 'Assigned Classes', 'Assigned Courses', 'Date Added']],
    body: staffRows.length > 0 ? staffRows : [['-', 'No staff accounts logged yet', '-', '-', '-']],
    theme: 'striped',
    headStyles: { fillColor: [180, 83, 9], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5 },
    bodyStyles: { fontSize: 7, textColor: [30, 41, 59] },
    alternateRowStyles: { fillColor: [254, 243, 199] },
    margin: { left: 30, right: 30 }
  });

  y = (doc as any).lastAutoTable.finalY + 20;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(30, 58, 138);
  doc.text("7. ADMISSIONS & PROSPECTIVE PUPIL APPLICATIONS", 40, y);
  y += 8;

  const admissionsRows = state.applications.map(app => [
    app.id,
    app.name,
    app.grade,
    app.email,
    app.paid ? 'Deposit Paid' : 'Pending Review',
    app.timestamp
  ]);

  autoTable(doc, {
    startY: y,
    head: [['Application ID', 'Applicant Name', 'Grade', 'Guardian Email', 'Deposit Status', 'Application Date']],
    body: admissionsRows.length > 0 ? admissionsRows : [['-', 'No admissions applications logged yet', '-', '-', '-', '-']],
    theme: 'striped',
    headStyles: { fillColor: [67, 56, 202], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5 },
    bodyStyles: { fontSize: 7, textColor: [30, 41, 59] },
    alternateRowStyles: { fillColor: [238, 242, 255] },
    margin: { left: 30, right: 30 }
  });

  // Official Institutional Seal & Signatures
  y = (doc as any).lastAutoTable.finalY + 30;
  if (y + 80 > pageHeight) {
    doc.addPage();
    drawSchoolHeader();
    y = 85;
  }

  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(1);
  doc.line(40, y, pageWidth - 40, y);
  y += 20;

  const colW = (pageWidth - 80) / 3;

  // Col 1: Proprietor
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);
  doc.line(45, y + 25, 45 + colW - 20, y + 25);
  doc.text("CHIEF PROPRIETOR / FOUNDER", 45, y + 36);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text("God's Hand International Model School", 45, y + 46);

  // Col 2: Principal / Head of School
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);
  doc.line(45 + colW, y + 25, 45 + (2 * colW) - 20, y + 25);
  doc.text("PRINCIPAL / HEAD OF SCHOOL", 45 + colW, y + 36);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text("Academic & Administrative Directorate", 45 + colW, y + 46);

  // Col 3: Registrar & Seal
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);
  doc.line(45 + (2 * colW), y + 25, 45 + (3 * colW) - 20, y + 25);
  doc.text("OFFICIAL REGISTRAR & BURSAR", 45 + (2 * colW), y + 36);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text("Records & Official School Seal", 45 + (2 * colW), y + 46);

  // Add Page Numbers to all pages
  const totalPages = (doc.internal as any).getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `God's Hand International Model School, Ibadan • Official Institutional Record • Page ${i} of ${totalPages}`,
      pageWidth / 2,
      pageHeight - 12,
      { align: 'center' }
    );
  }

  doc.save(filename);
}

/**
 * 3. Master Combined Export (Triggers both Excel and PDF downloads for complete school data)
 */
export function exportCompleteSchoolDataBoth(state: AppState) {
  exportCompleteSchoolDataExcel(state);
  setTimeout(() => {
    exportCompleteSchoolDataPDF(state);
  }, 400);
}

/**
 * 4. Master JSON Backup containing the entire school database.
 */
export function exportCompleteSchoolDatabaseJSON(state: AppState) {
  const dateStr = new Date().toISOString().split('T')[0];
  const filename = `gods_hand_school_master_backup_${dateStr}.json`;

  const totalFeeRevenue = state.payments.reduce((sum, p) => sum + (p.amount || 0), 0);

  const exportPayload = {
    metadata: {
      schoolName: "God's Hand International Model School",
      motto: "Have Faith In God - Building Lives Upon The Solid Rock",
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

/**
 * Individual Excel Table Exports
 */
export function exportStudentsAndPupilsExcel(students: StudentAccount[], payments: FeePayment[], fees: FeeStructure) {
  const dateStr = new Date().toISOString().split('T')[0];
  const filename = `students_and_pupils_roster_${dateStr}.xlsx`;
  const wb = XLSX.utils.book_new();

  const studentsAoa: any[][] = [
    ["Student ID", "Full Name", "Class / Grade", "Entry Clearance Status", "Term Fee Required (NGN)", "Total Fees Paid (NGN)", "Outstanding Balance (NGN)", "Payment Completion (%)", "Registered Date"]
  ];
  students.forEach(student => {
    const studentPayments = payments.filter(p => p.studentId === student.id);
    const totalPaid = studentPayments.reduce((acc, curr) => acc + (curr.amount || 0), 0);
    const requiredFee = fees[student.grade] || 0;
    const balance = Math.max(0, requiredFee - totalPaid);
    const percentage = requiredFee > 0 ? Math.min(100, Math.round((totalPaid / requiredFee) * 100)) : 100;
    const entryStatus = student.entryAllowed ? 'Cleared (Entry Allowed)' : (percentage >= 100 ? 'Cleared (Paid)' : 'Restricted (Fees Due)');
    studentsAoa.push([
      student.id,
      student.name,
      student.grade,
      entryStatus,
      requiredFee,
      totalPaid,
      balance,
      `${percentage}%`,
      student.createdAt ? new Date(student.createdAt).toLocaleDateString() : 'N/A'
    ]);
  });
  const ws = XLSX.utils.aoa_to_sheet(studentsAoa);
  XLSX.utils.book_append_sheet(wb, ws, "Students & Pupils");
  XLSX.writeFile(wb, filename);
}

export function exportFeePaymentsExcel(payments: FeePayment[]) {
  const dateStr = new Date().toISOString().split('T')[0];
  const filename = `school_fee_payments_ledger_${dateStr}.xlsx`;
  const wb = XLSX.utils.book_new();

  const paymentsAoa: any[][] = [
    ["Receipt ID", "Student Name", "Student ID", "Class / Grade", "Payment Type", "Amount Paid (NGN)", "Payment Status", "Transaction Reference", "Bank Name", "Payer Name", "Payment Date"]
  ];
  payments.forEach(p => {
    paymentsAoa.push([
      p.id,
      p.studentName,
      p.studentId,
      p.grade,
      p.type === 'full' ? 'Full Payment' : p.type === 'installment_1' ? '1st Installment' : p.type === 'result_fee' ? 'Result Checker Fee' : '2nd Installment',
      p.amount,
      p.status ? p.status.toUpperCase() : 'CONFIRMED',
      p.transactionRef || 'N/A',
      p.bankName || 'N/A',
      p.payerName || 'N/A',
      p.date
    ]);
  });
  const ws = XLSX.utils.aoa_to_sheet(paymentsAoa);
  XLSX.utils.book_append_sheet(wb, ws, "Fee Payments Ledger");
  XLSX.writeFile(wb, filename);
}

export function exportAcademicResultsExcel(results: StudentResult[]) {
  const dateStr = new Date().toISOString().split('T')[0];
  const filename = `academic_results_records_${dateStr}.xlsx`;
  const wb = XLSX.utils.book_new();

  const resultsAoa: any[][] = [
    ["Result ID", "Student Name", "Class / Grade", "Subject", "Score (%)", "Performance Grade / Remark", "Assessment Term", "Recorded By", "Date Recorded"]
  ];
  results.forEach(r => {
    let remark = 'Fail';
    if (r.score >= 75) remark = 'Distinction (A1)';
    else if (r.score >= 65) remark = 'Very Good (B2/B3)';
    else if (r.score >= 50) remark = 'Credit (C4-C6)';
    else if (r.score >= 40) remark = 'Pass (D7/E8)';

    resultsAoa.push([
      r.id,
      r.studentName,
      r.grade,
      r.subject,
      r.score,
      remark,
      r.term,
      r.teacherName || 'Staff',
      r.date
    ]);
  });
  const ws = XLSX.utils.aoa_to_sheet(resultsAoa);
  XLSX.utils.book_append_sheet(wb, ws, "Academic Results");
  XLSX.writeFile(wb, filename);
}

export function exportAttendanceExcel(attendance: AttendanceRecord[], students: StudentAccount[]) {
  const dateStr = new Date().toISOString().split('T')[0];
  const filename = `attendance_registry_log_${dateStr}.xlsx`;
  const wb = XLSX.utils.book_new();

  const attendanceAoa: any[][] = [
    ["Student ID", "Student Name", "Class / Grade", "Date Verified", "Attendance Term", "Marked By (Staff)"]
  ];
  attendance.forEach(a => {
    const student = students.find(s => s.id === a.studentId);
    attendanceAoa.push([
      a.studentId,
      student ? student.name : 'Unknown',
      student ? student.grade : 'N/A',
      a.date,
      a.term || 'First Term',
      a.markedBy
    ]);
  });
  const ws = XLSX.utils.aoa_to_sheet(attendanceAoa);
  XLSX.utils.book_append_sheet(wb, ws, "Attendance Registry");
  XLSX.writeFile(wb, filename);
}

export function exportAdmissionsExcel(applications: StudentApplication[]) {
  const dateStr = new Date().toISOString().split('T')[0];
  const filename = `admissions_applications_${dateStr}.xlsx`;
  const wb = XLSX.utils.book_new();

  const admissionsAoa: any[][] = [
    ["Application ID", "Applicant Name", "Class Applied", "Contact Email", "Deposit / Fee Status", "Application Date"]
  ];
  applications.forEach(app => {
    admissionsAoa.push([
      app.id,
      app.name,
      app.grade,
      app.email,
      app.paid ? 'Paid' : 'Pending',
      app.timestamp
    ]);
  });
  const ws = XLSX.utils.aoa_to_sheet(admissionsAoa);
  XLSX.utils.book_append_sheet(wb, ws, "Admissions");
  XLSX.writeFile(wb, filename);
}

export function exportStaffRosterExcel(teachers: TeacherAccount[]) {
  const dateStr = new Date().toISOString().split('T')[0];
  const filename = `staff_teachers_roster_${dateStr}.xlsx`;
  const wb = XLSX.utils.book_new();

  const staffAoa: any[][] = [
    ["Staff ID", "Username", "Assigned Classes / Grades", "Assigned Courses Count", "Allowed Portal Modules", "Created Date"]
  ];
  teachers.forEach(t => {
    staffAoa.push([
      t.id,
      t.username,
      (t.assignedGrades || []).join('; '),
      (t.assignedCourses || []).length,
      (t.allowedPages || []).join('; '),
      t.createdAt ? new Date(t.createdAt).toLocaleDateString() : 'N/A'
    ]);
  });
  const ws = XLSX.utils.aoa_to_sheet(staffAoa);
  XLSX.utils.book_append_sheet(wb, ws, "Staff & Faculty");
  XLSX.writeFile(wb, filename);
}
