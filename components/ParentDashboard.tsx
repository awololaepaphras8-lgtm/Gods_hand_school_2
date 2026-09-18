import React, { useState } from 'react';
import { 
  ParentAccount, 
  StudentAccount, 
  FeeStructure, 
  FeePayment, 
  AttendanceRecord, 
  StudentResult, 
  GradeLevel, 
  PaymentType,
  Announcement 
} from '../types';
import { GRADE_GROUPS } from '../constants';
import { QRCodeSVG } from 'qrcode.react';
import { StandardReportCard } from './StandardReportCard';

interface ParentDashboardProps {
  parent: ParentAccount;
  allStudents: StudentAccount[];
  fees: FeeStructure;
  payments: FeePayment[];
  attendance: AttendanceRecord[];
  results: StudentResult[];
  calendar?: string;
  announcements?: Announcement[];
  onAddExistingChild: (studentId: string) => boolean;
  onRegisterNewChild: (childData: { name: string; grade: GradeLevel; email?: string; password?: string }) => StudentAccount;
  onUnlinkChild: (studentId: string) => void;
  onSubmitFeePayment: (payment: Omit<FeePayment, 'id' | 'date'>) => FeePayment;
  onSimulateGateScan: (studentId: string) => void;
  onLogout: () => void;
  onGoToReceipts?: () => void;
}

export const ParentDashboard: React.FC<ParentDashboardProps> = ({
  parent,
  allStudents,
  fees,
  payments,
  attendance,
  results,
  calendar,
  announcements = [],
  onAddExistingChild,
  onRegisterNewChild,
  onUnlinkChild,
  onSubmitFeePayment,
  onSimulateGateScan,
  onLogout,
  onGoToReceipts
}) => {
  const today = new Date().toLocaleDateString();

  // Selected child for deep-dive inspection (Attendance & Gate Scan / Results / Details)
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);

  // Modals
  const [showAddChildModal, setShowAddChildModal] = useState(false);
  const [addChildTab, setAddChildTab] = useState<'link' | 'register'>('link');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentTargetChild, setPaymentTargetChild] = useState<StudentAccount | null>(null);
  const [showChildQrModal, setShowChildQrModal] = useState(false);
  const [selectedChildForReport, setSelectedChildForReport] = useState<StudentAccount | null>(null);

  // Link Child Form
  const [linkStudentId, setLinkStudentId] = useState('');
  const [linkError, setLinkError] = useState('');

  // Register New Child Form
  const [newChildName, setNewChildName] = useState('');
  const [newChildGrade, setNewChildGrade] = useState<GradeLevel>('Primary 1');
  const [newChildEmail, setNewChildEmail] = useState('');
  const [newChildPassword, setNewChildPassword] = useState('student123');

  // Fee Payment Form
  const [paymentType, setPaymentType] = useState<PaymentType>('full');
  const [payerName, setPayerName] = useState(parent.fullName);
  const [bankName, setBankName] = useState('First Bank of Nigeria');
  const [transactionRef, setTransactionRef] = useState('');
  const [paymentNote, setPaymentNote] = useState('');
  const [receiptFileName, setReceiptFileName] = useState('');
  const [receiptImage, setReceiptImage] = useState('');
  const [receiptFileType, setReceiptFileType] = useState('');
  const [paymentModalStep, setPaymentModalStep] = useState<'details' | 'upload' | 'reviewed'>('details');
  const [paymentSuccessRef, setPaymentSuccessRef] = useState<string | null>(null);
  const [paymentUploadError, setPaymentUploadError] = useState('');

  // Get list of children linked to this parent
  const linkedChildren: StudentAccount[] = (allStudents || []).filter(s => 
    (parent.childrenStudentIds || []).includes(s.id) || s.parentId === parent.id || (s.parentEmail && parent.email && s.parentEmail.toLowerCase() === parent.email.toLowerCase())
  );

  // Auto-select first child if none selected and children exist
  const activeChild = selectedChildId 
    ? linkedChildren.find(c => c.id === selectedChildId) || linkedChildren[0] || null
    : linkedChildren[0] || null;

  // Calculate summary metrics
  const totalChildren = linkedChildren.length;
  const inSchoolTodayCount = linkedChildren.filter(child => 
    attendance.some(a => a.studentId === child.id && a.date === today)
  ).length;

  let totalFeesDue = 0;
  let totalFeesPaid = 0;

  linkedChildren.forEach(child => {
    const childFee = fees[child.grade] || 0;
    totalFeesDue += childFee;
    const childPayments = payments.filter(p => p.studentId === child.id && p.status !== 'declined');
    const childPaid = childPayments.reduce((acc, p) => acc + (p.amount || 0), 0);
    totalFeesPaid += childPaid;
  });

  const totalOutstanding = Math.max(0, totalFeesDue - totalFeesPaid);

  // Helper for a child's payment status
  const getChildPaymentStats = (child: StudentAccount) => {
    const totalFee = fees[child.grade] || 0;
    const childPayments = payments.filter(p => p.studentId === child.id && p.status !== 'declined');
    const amountPaid = childPayments.reduce((acc, p) => acc + (p.amount || 0), 0);
    const balance = Math.max(0, totalFee - amountPaid);
    const isFullPaid = balance === 0 && totalFee > 0;
    const isPartPaid = amountPaid > 0 && balance > 0;
    return { totalFee, amountPaid, balance, isFullPaid, isPartPaid, childPayments };
  };

  // Helper for a child's attendance status
  const getChildAttendanceStats = (child: StudentAccount) => {
    const todayRecord = attendance.find(a => a.studentId === child.id && a.date === today);
    const isScannedToday = !!todayRecord;
    const childAttendanceLogs = attendance.filter(a => a.studentId === child.id);
    return { isScannedToday, todayRecord, childAttendanceLogs };
  };

  // Handle Link Child submit
  const handleLinkChildSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLinkError('');
    const trimmedId = linkStudentId.trim();
    if (!trimmedId) {
      setLinkError('Please enter the child’s Student or Pupil ID.');
      return;
    }
    const success = onAddExistingChild(trimmedId);
    if (success) {
      setShowAddChildModal(false);
      setLinkStudentId('');
      setSelectedChildId(trimmedId);
    } else {
      setLinkError(`No student found with ID "${trimmedId}", or this child is already linked to your account. Please check the ID on their school slip.`);
    }
  };

  // Handle Register New Child submit
  const handleRegisterChildSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChildName.trim()) return;

    const emailToUse = newChildEmail.trim() || `${newChildName.trim().toLowerCase().replace(/\s+/g, '.')}.${Date.now().toString().slice(-4)}@godshand.sch.ng`;
    const created = onRegisterNewChild({
      name: newChildName.trim(),
      grade: newChildGrade,
      email: emailToUse,
      password: newChildPassword || 'student123'
    });

    setShowAddChildModal(false);
    setNewChildName('');
    setNewChildEmail('');
    setSelectedChildId(created.id);
  };

  // Open Payment Modal for a child
  const handleOpenPayment = (child: StudentAccount) => {
    setPaymentTargetChild(child);
    const stats = getChildPaymentStats(child);
    if (stats.isPartPaid) {
      setPaymentType('installment_2');
    } else {
      setPaymentType('full');
    }
    setPaymentSuccessRef(null);
    setReceiptImage('');
    setReceiptFileName('');
    setReceiptFileType('');
    setPaymentUploadError('');
    setPaymentModalStep('details');
    setShowPaymentModal(true);
  };

  // Submit Payment
  const handleExecutePayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentTargetChild) return;
    setPaymentUploadError('');

    if (!receiptImage && !transactionRef) {
      setPaymentUploadError('Please select a picture/document of your bank receipt or enter your transfer reference.');
      return;
    }

    const stats = getChildPaymentStats(paymentTargetChild);
    let amount = 0;
    if (paymentType === 'full') {
      amount = stats.balance > 0 ? stats.balance : stats.totalFee;
    } else {
      amount = stats.totalFee / 2;
    }

    const newPayment = onSubmitFeePayment({
      studentId: paymentTargetChild.id,
      studentName: paymentTargetChild.name,
      amount: amount,
      grade: paymentTargetChild.grade,
      type: paymentType,
      status: 'pending',
      payerName: payerName || parent.fullName,
      bankName: bankName,
      transactionRef: transactionRef || `TRX-${Date.now().toString().slice(-6)}`,
      studentNote: paymentNote || `School fees payment submitted by ${parent.fullName} (${parent.relationship || 'Parent'})`,
      receiptFileName: receiptFileName || 'bank_transfer_receipt.jpg',
      receiptImage: receiptImage || undefined,
      receiptFileType: receiptFileType || 'image/jpeg',
      receiptUploadedAt: new Date().toISOString()
    });

    setPaymentSuccessRef(newPayment.id);
    setPaymentModalStep('reviewed');
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8">
      {/* Top Welcome & Parent Profile Card */}
      <div className="bg-gradient-to-r from-blue-900 via-blue-950 to-blue-900 text-white rounded-3xl p-6 sm:p-10 shadow-2xl border-2 border-blue-800 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-yellow-400/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="flex items-start sm:items-center gap-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-yellow-400 text-blue-900 flex items-center justify-center font-black text-2xl sm:text-3xl shadow-xl border-2 border-yellow-300 shrink-0">
              👨‍👩‍👧‍👦
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="px-3 py-1 bg-yellow-400 text-blue-900 font-black text-[10px] uppercase tracking-wider rounded-full">
                  {parent.relationship || 'Parent / Guardian'}
                </span>
                <span className="text-blue-200 text-xs font-bold">ID: {parent.id}</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-serif font-black text-white mt-1">
                {parent.fullName}
              </h1>
              <p className="text-xs text-blue-200/80 font-medium flex items-center gap-4 mt-1 flex-wrap">
                <span>✉️ {parent.email}</span>
                <span>📞 {parent.phone}</span>
                {parent.address && <span>📍 {parent.address}</span>}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <button
              type="button"
              onClick={() => setShowAddChildModal(true)}
              className="px-5 py-3 bg-yellow-400 hover:bg-yellow-300 text-blue-900 font-black text-xs uppercase tracking-wider rounded-xl shadow-lg transition-all active:scale-95 flex items-center gap-2"
            >
              <span>+ Add Child Account</span>
            </button>
            <button
              type="button"
              onClick={onLogout}
              className="px-4 py-3 bg-white/10 hover:bg-white/20 text-white font-bold text-xs uppercase tracking-wider rounded-xl border border-white/20 transition-all"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Quick Family Metrics Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 pt-8 border-t border-white/10 text-center">
          <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
            <p className="text-[10px] font-black uppercase tracking-wider text-blue-200">Registered Children</p>
            <p className="text-2xl sm:text-3xl font-black text-yellow-400 mt-1">{totalChildren}</p>
          </div>
          <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
            <p className="text-[10px] font-black uppercase tracking-wider text-blue-200">In School Today</p>
            <p className="text-2xl sm:text-3xl font-black text-emerald-400 mt-1">
              {inSchoolTodayCount} <span className="text-xs text-blue-200 font-normal">/ {totalChildren}</span>
            </p>
          </div>
          <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
            <p className="text-[10px] font-black uppercase tracking-wider text-blue-200">Total Fees Paid</p>
            <p className="text-2xl sm:text-3xl font-black text-white mt-1">₦{totalFeesPaid.toLocaleString()}</p>
          </div>
          <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
            <p className="text-[10px] font-black uppercase tracking-wider text-blue-200">Balance Due</p>
            <p className={`text-2xl sm:text-3xl font-black mt-1 ${totalOutstanding > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
              ₦{totalOutstanding.toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* If No Children Linked Yet */}
      {linkedChildren.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border-2 border-dashed border-slate-200 space-y-6">
          <div className="w-20 h-20 mx-auto bg-yellow-100 rounded-full flex items-center justify-center text-4xl">
            🧒
          </div>
          <div className="max-w-md mx-auto space-y-2">
            <h3 className="text-2xl font-serif font-black text-blue-900">No Children Linked Yet</h3>
            <p className="text-slate-500 text-sm font-medium">
              Link your enrolled student or register a new child to monitor daily gate scans, view live school entry status, and pay term fees.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowAddChildModal(true)}
            className="px-8 py-4 bg-blue-900 hover:bg-blue-800 text-yellow-400 font-black text-xs uppercase tracking-wider rounded-2xl shadow-xl transition-all"
          >
            + Link or Register First Child
          </button>
        </div>
      ) : (
        /* MAIN DASHBOARD: CHILDREN SELECTOR & DETAILED VIEW */
        <div className="space-y-8">
          {/* Children Tabs / Cards */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-serif font-black text-blue-900 uppercase tracking-wider">
                Your Children & Pupils ({linkedChildren.length})
              </h2>
              <span className="text-xs text-slate-400 font-bold">
                Select a child to view live gate attendance and school fees
              </span>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {linkedChildren.map(child => {
                const isSelected = activeChild?.id === child.id;
                const { isScannedToday } = getChildAttendanceStats(child);
                const { totalFee, amountPaid, balance } = getChildPaymentStats(child);

                return (
                  <div
                    key={child.id}
                    onClick={() => setSelectedChildId(child.id)}
                    className={`cursor-pointer rounded-2xl p-5 border-2 transition-all relative ${
                      isSelected
                        ? 'bg-blue-900 text-white border-blue-900 shadow-xl scale-[1.02]'
                        : 'bg-white text-slate-800 border-slate-200 hover:border-blue-300 hover:shadow-md'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-lg ${
                          isSelected ? 'bg-yellow-400 text-blue-900' : 'bg-blue-100 text-blue-900'
                        }`}>
                          {child.name.charAt(0)}
                        </div>
                        <div>
                          <h3 className={`font-serif font-black text-base leading-tight ${isSelected ? 'text-white' : 'text-blue-900'}`}>
                            {child.name}
                          </h3>
                          <p className={`text-xs font-bold uppercase tracking-wider ${isSelected ? 'text-yellow-400' : 'text-slate-500'}`}>
                            {child.grade}
                          </p>
                        </div>
                      </div>

                      {/* Live Gate Scan Indicator Badge */}
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        isScannedToday
                          ? 'bg-emerald-500 text-white'
                          : isSelected
                            ? 'bg-amber-400/20 text-amber-300 border border-amber-300/40'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        <span className={`w-2 h-2 rounded-full ${isScannedToday ? 'bg-white animate-pulse' : 'bg-amber-500'}`}></span>
                        <span>{isScannedToday ? 'In School' : 'Not Scanned'}</span>
                      </span>
                    </div>

                    <div className={`mt-4 pt-3 border-t grid grid-cols-2 text-xs ${
                      isSelected ? 'border-white/10 text-blue-100' : 'border-slate-100 text-slate-600'
                    }`}>
                      <div>
                        <p className="text-[10px] uppercase font-bold text-slate-400">Class Fee</p>
                        <p className="font-black">₦{totalFee.toLocaleString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] uppercase font-bold text-slate-400">Balance</p>
                        <p className={`font-black ${balance === 0 ? 'text-emerald-400' : isSelected ? 'text-yellow-300' : 'text-amber-600'}`}>
                          {balance === 0 ? 'Fully Cleared' : `₦${balance.toLocaleString()}`}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ACTIVE CHILD DETAILED HUB */}
          {activeChild && (
            <div className="bg-white rounded-3xl p-6 sm:p-10 border-2 border-slate-200 shadow-xl space-y-8">
              {/* Active Child Header Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-blue-900 text-yellow-400 flex items-center justify-center font-black text-2xl font-serif shadow-md border-2 border-yellow-400">
                    {activeChild.name.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-2xl font-serif font-black text-blue-900">{activeChild.name}</h2>
                      <span className="px-2.5 py-0.5 bg-blue-100 text-blue-900 rounded-full text-xs font-black uppercase">
                        {activeChild.grade}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 font-bold mt-0.5">
                      Student ID: <span className="text-blue-900 font-black">{activeChild.id}</span> • Email: {activeChild.email}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowChildQrModal(true)}
                    className="px-4 py-3 bg-blue-900 hover:bg-blue-800 text-yellow-400 font-black text-xs uppercase tracking-wider rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-1.5"
                    title="View and print gate attendance QR pass for this child"
                  >
                    <span>📱</span>
                    <span>Gate Pass (QR)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenPayment(activeChild)}
                    className="px-5 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-2"
                  >
                    <span>💳 Pay School Fees</span>
                  </button>
                  <div 
                    className="px-3.5 py-3 bg-slate-100 text-slate-600 font-bold text-xs uppercase tracking-wider border border-slate-200 rounded-xl flex items-center gap-1.5 cursor-help"
                    title="Child links are permanent. For child safety, delinking can only be performed by the School Administrator."
                  >
                    <span>🔒</span>
                    <span className="hidden sm:inline">Linked (Admin Delink Only)</span>
                    <span className="sm:hidden">Linked</span>
                  </div>
                </div>
              </div>

              {/* CRUCIAL SECTION 1: LIVE ATTENDANCE & GATE SCAN STATUS */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🚪</span>
                    <h3 className="text-lg font-serif font-black text-blue-900">
                      Live Gate & School Attendance Status
                    </h3>
                  </div>
                  <span className="text-xs font-black text-slate-400 uppercase tracking-wider">
                    Today: {today}
                  </span>
                </div>

                {(() => {
                  const { isScannedToday, todayRecord } = getChildAttendanceStats(activeChild);

                  return (
                    <div className={`rounded-3xl p-6 sm:p-8 border-2 transition-all ${
                      isScannedToday
                        ? 'bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border-emerald-300'
                        : 'bg-gradient-to-r from-amber-50 via-yellow-50 to-amber-50 border-amber-300'
                    }`}>
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="flex items-start gap-4">
                          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shrink-0 shadow-md ${
                            isScannedToday ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-white'
                          }`}>
                            {isScannedToday ? '✓' : '⏳'}
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                                isScannedToday ? 'bg-emerald-600 text-white' : 'bg-amber-600 text-white'
                              }`}>
                                {isScannedToday ? 'STUDENT IS IN SCHOOL' : 'NOT YET SCANNED AT GATE TODAY'}
                              </span>
                              {isScannedToday && (
                                <span className="text-xs text-emerald-800 font-bold">
                                  Term: {todayRecord?.term || 'First Term'}
                                </span>
                              )}
                            </div>
                            <h4 className="text-xl font-serif font-black text-blue-950">
                              {isScannedToday
                                ? `${activeChild.name} was scanned and verified at the school gate!`
                                : `${activeChild.name} has not been scanned at the gate yet today.`}
                            </h4>
                            <p className="text-xs text-slate-600 leading-relaxed font-medium">
                              {isScannedToday
                                ? `Scanned by: ${todayRecord?.markedBy || 'School Security / Gate Staff'}. Your child is safely present on campus.`
                                : `Students and pupils are scanned via their attendance QR badge upon arriving at the entrance gate. Status updates immediately once verified.`}
                            </p>
                          </div>
                        </div>

                        {/* Interactive Scan Simulation button for quick testing */}
                        <div className="shrink-0 flex flex-col items-end gap-2">
                          <button
                            type="button"
                            onClick={() => onSimulateGateScan(activeChild.id)}
                            className={`px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider shadow transition-all ${
                              isScannedToday
                                ? 'bg-white text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                                : 'bg-blue-900 text-yellow-400 hover:bg-blue-800 active:scale-95'
                            }`}
                          >
                            {isScannedToday ? '🔄 Re-Verify Gate Scan' : '⚡ Simulate Gate Scan Now'}
                          </button>
                          <span className="text-[10px] text-slate-400 font-bold">
                            Live gate sync with teacher & admin app
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Child's Attendance Pass & Attendance History Cards */}
                <div className="grid md:grid-cols-12 gap-6 pt-4">
                  {/* Digital Gate QR Pass Card */}
                  <div className="md:col-span-5 bg-slate-50 rounded-2xl p-6 border border-slate-200 space-y-4 text-center">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                      <span className="text-xs font-black uppercase text-blue-900 tracking-wider">
                        Gate Attendance QR Pass
                      </span>
                      <span className="text-[10px] font-bold text-slate-400">
                        {activeChild.grade}
                      </span>
                    </div>

                    <div className="p-4 bg-white rounded-2xl shadow-inner inline-block border-2 border-blue-900">
                      <QRCodeSVG
                        value={`GHS-ATT|${activeChild.id}|First Term|PASS`}
                        size={150}
                        level="H"
                        includeMargin={false}
                      />
                    </div>

                    <div className="text-xs space-y-1">
                      <p className="font-black text-blue-900">{activeChild.name}</p>
                      <p className="text-[10px] text-slate-500 font-bold">
                        Keep this QR pass on the student's phone, card, or printed in their bag for gate scanning.
                      </p>
                    </div>
                  </div>

                  {/* Attendance Log Table */}
                  <div className="md:col-span-7 bg-slate-50 rounded-2xl p-6 border border-slate-200 space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                      <span className="text-xs font-black uppercase text-blue-900 tracking-wider">
                        Recent Campus Attendance Logs
                      </span>
                      <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                        {attendance.filter(a => a.studentId === activeChild.id).length} Days Logged
                      </span>
                    </div>

                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                      {attendance.filter(a => a.studentId === activeChild.id).length === 0 ? (
                        <div className="py-8 text-center text-slate-400 text-xs font-bold">
                          No previous attendance logs recorded for this student yet.
                        </div>
                      ) : (
                        attendance
                          .filter(a => a.studentId === activeChild.id)
                          .map((rec, idx) => (
                            <div
                              key={idx}
                              className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between text-xs"
                            >
                              <div className="flex items-center gap-2.5">
                                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                <span className="font-black text-blue-900">{rec.date}</span>
                                <span className="text-slate-400 font-medium">({rec.term || 'First Term'})</span>
                              </div>
                              <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                                Verified by {rec.markedBy}
                              </span>
                            </div>
                          ))
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* CRUCIAL SECTION 2: SCHOOL FEES & PAYMENTS FOR THIS CHILD */}
              <div className="space-y-4 pt-6 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">💰</span>
                    <h3 className="text-lg font-serif font-black text-blue-900">
                      School Fees & Payment Ledger for {activeChild.name}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleOpenPayment(activeChild)}
                    className="px-4 py-2 bg-blue-900 hover:bg-blue-800 text-yellow-400 font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow"
                  >
                    + Pay Fees for {activeChild.name.split(' ')[0]}
                  </button>
                </div>

                {(() => {
                  const { totalFee, amountPaid, balance, isFullPaid, isPartPaid, childPayments } = getChildPaymentStats(activeChild);

                  return (
                    <div className="space-y-6">
                      <div className="grid sm:grid-cols-3 gap-4">
                        <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200">
                          <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Class Fee ({activeChild.grade})</p>
                          <p className="text-2xl font-serif font-black text-blue-900 mt-1">₦{totalFee.toLocaleString()}</p>
                          <p className="text-[10px] text-slate-500 font-bold mt-1">Term Standard Tuition</p>
                        </div>
                        <div className="p-5 bg-emerald-50 rounded-2xl border border-emerald-200">
                          <p className="text-[10px] font-black uppercase text-emerald-800 tracking-wider">Amount Succeeded / Paid</p>
                          <p className="text-2xl font-serif font-black text-emerald-700 mt-1">₦{amountPaid.toLocaleString()}</p>
                          <p className="text-[10px] text-emerald-600 font-bold mt-1">{childPayments.length} Payment(s) Recorded</p>
                        </div>
                        <div className={`p-5 rounded-2xl border ${balance === 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
                          <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Remaining Balance</p>
                          <p className={`text-2xl font-serif font-black mt-1 ${balance === 0 ? 'text-emerald-700' : 'text-amber-700'}`}>
                            {balance === 0 ? '₦0 (CLEARED)' : `₦${balance.toLocaleString()}`}
                          </p>
                          <span className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                            isFullPaid ? 'bg-emerald-600 text-white' : isPartPaid ? 'bg-amber-600 text-white' : 'bg-slate-200 text-slate-700'
                          }`}>
                            {isFullPaid ? 'Paid in Full' : isPartPaid ? '1st Installment Paid' : 'Fee Unpaid'}
                          </span>
                        </div>
                      </div>

                      {/* Payment History Table */}
                      <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200">
                        <h4 className="text-xs font-black uppercase text-blue-900 tracking-wider mb-4">
                          Payment Transactions & Receipts
                        </h4>
                        {childPayments.length === 0 ? (
                          <div className="py-8 text-center text-slate-400 text-xs font-bold">
                            No payment transactions submitted for this child yet. Click "Pay School Fees" above to submit fees.
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {childPayments.map(p => (
                              <div
                                key={p.id}
                                className="p-4 bg-white rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                              >
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-black text-blue-900 text-sm">₦{p.amount.toLocaleString()}</span>
                                    <span className="px-2 py-0.5 bg-blue-50 text-blue-900 rounded font-black text-[10px] uppercase">
                                      {p.type === 'full' ? 'Full Payment' : p.type === 'installment_1' ? '1st Installment' : '2nd Installment'}
                                    </span>
                                    <span className={`px-2 py-0.5 rounded font-black text-[10px] uppercase ${
                                      p.status === 'confirmed'
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : p.status === 'declined'
                                          ? 'bg-rose-100 text-rose-800'
                                          : 'bg-yellow-100 text-yellow-800'
                                    }`}>
                                      {p.status || 'pending'}
                                    </span>
                                  </div>
                                  <p className="text-slate-500 text-[11px]">
                                    Ref: <strong className="text-slate-700">{p.transactionRef || p.id}</strong> • Payer: {p.payerName || 'Parent'} • Bank: {p.bankName || 'Direct Transfer'}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="text-slate-400 text-[10px] font-bold">
                                    {new Date(p.date).toLocaleDateString()}
                                  </p>
                                  {p.receiptFileName && (
                                    <span className="text-[10px] font-black text-blue-900 bg-blue-50 px-2 py-1 rounded inline-block mt-1">
                                      📎 {p.receiptFileName}
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* SECTION 3: ACADEMIC RESULTS FOR THIS CHILD */}
              <div className="space-y-4 pt-6 border-t border-slate-100">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">📊</span>
                    <h3 className="text-lg font-serif font-black text-blue-900">
                      Academic Results & Subject Scores for {activeChild.name}
                    </h3>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setSelectedChildForReport(activeChild)}
                      className="px-3.5 py-1.5 bg-yellow-400 hover:bg-yellow-300 text-blue-950 rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow-xs flex items-center gap-1.5 active:scale-95"
                      title="View and download standard terminal report card with school logo and seal"
                    >
                      <span>📄</span>
                      <span>Official Report Card (PDF)</span>
                    </button>
                    <span className="text-xs text-slate-400 font-bold hidden md:inline">
                      Oyo State Standards
                    </span>
                  </div>
                </div>

                {(() => {
                  const childResults = results.filter(r => 
                    r.studentName.toLowerCase().trim() === activeChild.name.toLowerCase().trim()
                  );

                  return childResults.length === 0 ? (
                    <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 text-slate-400 text-xs font-bold">
                      No academic scores published for this term yet. Continuous assessments are underway.
                    </div>
                  ) : (
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {childResults.map(res => (
                        <div key={res.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                          <div className="flex justify-between items-start">
                            <h4 className="font-serif font-black text-blue-900 text-sm">{res.subject}</h4>
                            <span className={`px-2 py-0.5 rounded text-xs font-black ${
                              res.score >= 70 ? 'bg-emerald-100 text-emerald-800' : res.score >= 50 ? 'bg-yellow-100 text-yellow-800' : 'bg-rose-100 text-rose-800'
                            }`}>
                              {res.score}%
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400 font-bold uppercase">{res.term} • Teacher: {res.teacherName}</p>
                          <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                            <div 
                              className={`h-full ${res.score >= 70 ? 'bg-emerald-500' : res.score >= 50 ? 'bg-yellow-500' : 'bg-rose-500'}`}
                              style={{ width: `${Math.min(100, res.score)}%` }}
                            ></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {/* REAL-TIME SCHOOL CALENDAR & OFFICIAL BULLETINS */}
          <div className="grid lg:grid-cols-12 gap-8 pt-4">
            {/* Academic Calendar Card */}
            <div className="lg:col-span-7 bg-white rounded-3xl p-8 border border-slate-100 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <span className="p-2.5 bg-yellow-400 text-blue-900 rounded-2xl text-xl shadow-xs">📅</span>
                  <div>
                    <h3 className="font-serif font-black text-blue-900 text-lg">Official School Calendar</h3>
                    <p className="text-xs text-slate-400 font-bold">Term Schedules & Key School Events</p>
                  </div>
                </div>
                <span className="inline-flex items-center px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-[10px] font-black uppercase tracking-wider">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-1.5 animate-pulse"></span>
                  Live Sync
                </span>
              </div>

              {calendar ? (
                <div className="p-6 bg-slate-50/80 rounded-2xl border border-slate-200/60 font-mono text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
                  {calendar}
                </div>
              ) : (
                <div className="p-6 bg-slate-50 rounded-2xl text-center text-slate-400 text-xs font-bold">
                  Calendar dates will appear here once published by the administration.
                </div>
              )}
              <p className="text-[11px] text-slate-400 italic">
                * When the school administration updates these dates, this calendar updates automatically in real time.
              </p>
            </div>

            {/* School Bulletins / Announcements */}
            <div className="lg:col-span-5 bg-white rounded-3xl p-8 border border-slate-100 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <span className="p-2.5 bg-blue-900 text-yellow-400 rounded-2xl text-xl shadow-xs">📢</span>
                  <div>
                    <h3 className="font-serif font-black text-blue-900 text-lg">School Bulletins</h3>
                    <p className="text-xs text-slate-400 font-bold">Official Administrative Notices</p>
                  </div>
                </div>
                <span className="text-[10px] font-black uppercase text-blue-900 bg-blue-50 px-2.5 py-1 rounded-full">
                  {announcements.length} Active
                </span>
              </div>

              {announcements.length === 0 ? (
                <div className="p-6 bg-slate-50 rounded-2xl text-center text-slate-400 text-xs font-bold">
                  No active bulletins at this moment.
                </div>
              ) : (
                <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
                  {announcements.map((ann) => (
                    <div key={ann.id} className="p-4 bg-blue-50/40 rounded-2xl border border-blue-100/70 space-y-1.5">
                      <div className="flex justify-between items-start">
                        <h4 className="font-serif font-black text-blue-950 text-xs">{ann.title}</h4>
                        <span className="text-[10px] text-slate-400 font-bold uppercase shrink-0">{ann.date}</span>
                      </div>
                      <p className="text-slate-600 text-xs leading-relaxed whitespace-pre-wrap">{ann.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD / LINK CHILD */}
      {showAddChildModal && (
        <div className="fixed inset-0 z-50 bg-blue-950/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="max-w-lg w-full bg-white rounded-3xl shadow-2xl border-2 border-blue-900 overflow-hidden">
            <div className="bg-blue-900 text-white p-6 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-serif font-black">Add Child to Parent Account</h3>
                <p className="text-xs text-blue-200 font-medium">Connect an existing student or register a new child</p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddChildModal(false)}
                className="text-white hover:text-yellow-400 font-black text-xl p-1"
              >
                ✕
              </button>
            </div>

            {/* Tab switch between Linking vs Registering */}
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => setAddChildTab('link')}
                  className={`py-2 text-xs font-black uppercase tracking-wider rounded-lg transition-all ${
                    addChildTab === 'link' ? 'bg-white text-blue-900 shadow' : 'text-slate-500 hover:text-blue-900'
                  }`}
                >
                  Link Enrolled Student
                </button>
                <button
                  type="button"
                  onClick={() => setAddChildTab('register')}
                  className={`py-2 text-xs font-black uppercase tracking-wider rounded-lg transition-all ${
                    addChildTab === 'register' ? 'bg-white text-blue-900 shadow' : 'text-slate-500 hover:text-blue-900'
                  }`}
                >
                  Register New Child
                </button>
              </div>

              {linkError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-xl">
                  {linkError}
                </div>
              )}

              {/* LINK EXISTING STUDENT */}
              {addChildTab === 'link' ? (
                <form onSubmit={handleLinkChildSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-2">
                      Pupil / Student ID Number *
                    </label>
                    <input
                      type="text"
                      required
                      value={linkStudentId}
                      onChange={(e) => setLinkStudentId(e.target.value.trim())}
                      placeholder="e.g. STU-1 or STU-002"
                      autoComplete="off"
                      autoCorrect="off"
                      autoCapitalize="characters"
                      spellCheck={false}
                      className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl font-black text-sm text-blue-950 focus:bg-white focus:border-blue-900 outline-none uppercase placeholder:normal-case placeholder:font-normal"
                    />
                  </div>

                  <div className="p-3.5 bg-amber-50/90 border border-amber-200 rounded-xl text-xs text-amber-950 space-y-1.5">
                    <p className="font-black flex items-center gap-1 text-amber-900">
                      <span>🛡️</span>
                      <span>Strict Identity Verification & Privacy</span>
                    </p>
                    <p className="text-[11px] leading-relaxed">
                      To protect student identity and privacy, the system does not provide autocomplete suggestions or student roll browsing. Please enter the exact <strong>Student ID</strong> provided on your child's admission slip or school ID badge.
                    </p>
                    <p className="text-[11px] font-bold text-blue-900 pt-1 border-t border-amber-200/60">
                      🔒 <strong>Permanent Link Rule:</strong> Once linked, a child remains permanently attached to your parent profile and can only be delinked by the School Administrator or Bursar.
                    </p>
                  </div>

                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowAddChildModal(false)}
                      className="px-4 py-2.5 text-xs font-bold text-slate-500 hover:text-slate-800"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={!linkStudentId.trim()}
                      className="px-6 py-2.5 bg-blue-900 hover:bg-blue-800 disabled:opacity-50 text-yellow-400 font-black text-xs uppercase tracking-wider rounded-xl shadow-md transition-all"
                    >
                      Verify & Link Child
                    </button>
                  </div>
                </form>
              ) : (
                /* REGISTER NEW CHILD */
                <form onSubmit={handleRegisterChildSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-1">
                      Child Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={newChildName}
                      onChange={(e) => setNewChildName(e.target.value)}
                      placeholder="e.g. Daniel Adebayo"
                      className="w-full px-4 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold text-sm text-blue-950 focus:bg-white focus:border-blue-900 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-1">
                      Class / Grade *
                    </label>
                    <select
                      value={newChildGrade}
                      onChange={(e) => setNewChildGrade(e.target.value as any)}
                      className="w-full px-4 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold text-sm text-blue-950 focus:bg-white focus:border-blue-900 outline-none"
                    >
                      {GRADE_GROUPS.map(group => (
                        <optgroup key={group.name} label={group.name}>
                          {group.levels.map(lvl => (
                            <option key={lvl} value={lvl}>{lvl}</option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-1">
                        Student Email (Optional)
                      </label>
                      <input
                        type="email"
                        value={newChildEmail}
                        onChange={(e) => setNewChildEmail(e.target.value)}
                        placeholder="Auto-generated if blank"
                        className="w-full px-4 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold text-sm text-blue-950 focus:bg-white focus:border-blue-900 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-1">
                        Portal Passcode
                      </label>
                      <input
                        type="text"
                        value={newChildPassword}
                        onChange={(e) => setNewChildPassword(e.target.value)}
                        placeholder="student123"
                        className="w-full px-4 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold text-sm text-blue-950 focus:bg-white focus:border-blue-900 outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowAddChildModal(false)}
                      className="px-4 py-2.5 text-xs font-bold text-slate-500 hover:text-slate-800"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-2.5 bg-blue-900 hover:bg-blue-800 text-yellow-400 font-black text-xs uppercase tracking-wider rounded-xl shadow-md transition-all"
                    >
                      Enroll Child to Account
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: PAY SCHOOL FEES FOR A SPECIFIC CHILD */}
      {showPaymentModal && paymentTargetChild && (
        <div className="fixed inset-0 z-50 bg-blue-950/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="max-w-xl w-full bg-white rounded-3xl shadow-2xl border-2 border-blue-900 overflow-hidden">
            <div className="bg-blue-900 text-white p-6 flex justify-between items-center">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-yellow-400">
                  School Fees Checkout
                </span>
                <h3 className="text-xl font-serif font-black">
                  Pay Fees for {paymentTargetChild.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowPaymentModal(false)}
                className="text-white hover:text-yellow-400 font-black text-xl p-1"
              >
                ✕
              </button>
            </div>

            <div className="p-6 sm:p-8 space-y-6 max-h-[80vh] overflow-y-auto">
              {paymentModalStep === 'reviewed' && paymentSuccessRef ? (
                <div className="p-8 text-center space-y-5 bg-gradient-to-b from-blue-50/60 to-amber-50/40 rounded-3xl border-2 border-amber-200">
                  <div className="w-20 h-20 mx-auto bg-amber-100 text-amber-800 border-4 border-amber-300 rounded-full flex items-center justify-center text-4xl font-black shadow-lg">
                    ⏳
                  </div>

                  <div className="inline-block px-4 py-1.5 bg-amber-200 text-amber-900 rounded-full text-xs font-black uppercase tracking-widest">
                    Status: Pending Proprietor Verification
                  </div>

                  <h4 className="text-2xl sm:text-3xl font-serif font-black text-blue-900 leading-tight">
                    Payment is being reviewed by the proprietor
                  </h4>

                  <div className="p-5 bg-white rounded-2xl border border-slate-200 text-left text-xs space-y-2.5 max-w-lg mx-auto shadow-sm">
                    <div className="flex justify-between border-b border-slate-100 pb-2">
                      <span className="font-bold text-slate-500">Student / Pupil:</span>
                      <strong className="text-blue-900 font-black">{paymentTargetChild.name} ({paymentTargetChild.grade})</strong>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 pb-2">
                      <span className="font-bold text-slate-500">Payment Ref ID:</span>
                      <code className="text-blue-900 font-black">{paymentSuccessRef}</code>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 pb-2">
                      <span className="font-bold text-slate-500">Receipt Attached:</span>
                      <span className="text-emerald-700 font-bold truncate max-w-[200px]">
                        {receiptFileName || 'Bank Receipt File Provided'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 pt-1 leading-relaxed">
                      Thank you. Your receipt proof has been transmitted to the School Proprietor and Bursar for review. Once verified and approved, you can download your official stamped school receipt.
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row justify-center gap-3 pt-2">
                    {onGoToReceipts && (
                      <button
                        type="button"
                        onClick={() => {
                          setShowPaymentModal(false);
                          onGoToReceipts();
                        }}
                        className="px-6 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
                      >
                        <span>📑</span>
                        <span>Go to Download Receipts Page</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setShowPaymentModal(false)}
                      className="px-6 py-3.5 bg-blue-900 hover:bg-blue-800 text-yellow-400 font-black text-xs uppercase tracking-wider rounded-xl shadow-md transition-all"
                    >
                      Done & Return to Dashboard
                    </button>
                  </div>
                </div>
              ) : paymentModalStep === 'details' ? (
                <div className="space-y-6">
                  {/* Step progress header */}
                  <div className="flex items-center justify-between text-xs font-black uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-3">
                    <span className="text-blue-900 font-black">Step 1: Fee Details & Amount</span>
                    <span>Step 2: Bank Receipt Upload →</span>
                  </div>

                  {/* Class fee summary */}
                  {(() => {
                    const stats = getChildPaymentStats(paymentTargetChild);
                    const feeToPay = paymentType === 'full' 
                      ? (stats.balance > 0 ? stats.balance : stats.totalFee)
                      : stats.totalFee / 2;

                    return (
                      <div className="p-5 bg-gradient-to-r from-blue-50 to-yellow-50/50 rounded-2xl border border-blue-100 space-y-3">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-bold text-slate-500">Pupil / Student:</span>
                          <strong className="text-blue-900 font-black">{paymentTargetChild.name} ({paymentTargetChild.grade})</strong>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-bold text-slate-500">Full Term Fee:</span>
                          <strong className="text-slate-800">₦{stats.totalFee.toLocaleString()}</strong>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-bold text-slate-500">Already Paid:</span>
                          <span className="text-emerald-700 font-black">₦{stats.amountPaid.toLocaleString()}</span>
                        </div>
                        <div className="pt-2 border-t border-blue-200/60 flex justify-between items-center">
                          <span className="text-xs font-black uppercase text-blue-900">Payment Amount:</span>
                          <span className="text-2xl font-serif font-black text-blue-900">₦{feeToPay.toLocaleString()}</span>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Payment Type Selection */}
                  <div>
                    <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-2">
                      Payment Option
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setPaymentType('full')}
                        className={`p-3 rounded-xl border-2 text-xs font-black uppercase tracking-wider transition-all text-center ${
                          paymentType === 'full'
                            ? 'bg-blue-900 text-yellow-400 border-blue-900 shadow-md'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-blue-300'
                        }`}
                      >
                        Full Term Payment
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentType('installment_1')}
                        className={`p-3 rounded-xl border-2 text-xs font-black uppercase tracking-wider transition-all text-center ${
                          paymentType === 'installment_1' || paymentType === 'installment_2'
                            ? 'bg-blue-900 text-yellow-400 border-blue-900 shadow-md'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-blue-300'
                        }`}
                      >
                        Installment (50%)
                      </button>
                    </div>
                  </div>

                  {/* Official School Bank Account Details */}
                  <div className="p-4 bg-yellow-50 rounded-2xl border border-yellow-200 text-xs space-y-1.5 text-blue-950">
                    <p className="font-black text-blue-900 uppercase text-[11px]">
                      🏛️ Official School Bank Account Details
                    </p>
                    <p><strong>Bank:</strong> First Bank of Nigeria</p>
                    <p><strong>Account Name:</strong> God's Hand International Model School</p>
                    <p><strong>Account Number:</strong> <span className="text-sm font-black text-blue-900">2041982731</span></p>
                    <p className="text-[10px] text-slate-500 italic">
                      Please make the direct transfer or cash deposit using your child's name as the description, then proceed to upload receipt proof.
                    </p>
                  </div>

                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowPaymentModal(false)}
                      className="px-4 py-2.5 text-xs font-bold text-slate-500 hover:text-slate-800"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentModalStep('upload')}
                      className="px-8 py-3.5 bg-blue-900 hover:bg-blue-950 text-yellow-400 font-black text-xs uppercase tracking-wider rounded-xl shadow-lg transition-all flex items-center gap-2"
                    >
                      <span>Proceed to Input Bank Receipt Proof</span>
                      <span>→</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* Step 2: Bank Receipt Upload & Details */
                <form onSubmit={handleExecutePayment} className="space-y-6">
                  <div className="flex items-center justify-between text-xs font-black uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-3">
                    <button
                      type="button"
                      onClick={() => setPaymentModalStep('details')}
                      className="text-blue-900 hover:underline flex items-center gap-1"
                    >
                      ← Back to Amount
                    </button>
                    <span className="text-emerald-700 font-black">Step 2: Input Picture / Document of Bank Receipt</span>
                  </div>

                  {paymentUploadError && (
                    <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-xl text-xs font-bold">
                      {paymentUploadError}
                    </div>
                  )}

                  {/* Receipt Upload Box */}
                  <div className="p-5 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-300 text-center space-y-3">
                    <div className="text-3xl">🧾</div>
                    <div>
                      <label className="block text-xs font-black text-blue-900 uppercase tracking-wider mb-1 cursor-pointer">
                        Upload Bank Receipt (Picture or PDF Document) *
                      </label>
                      <p className="text-[11px] text-slate-500">
                        Take a clear photo or screenshot of your transfer receipt, or upload your bank PDF teller.
                      </p>
                    </div>

                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      id="parentReceiptFileInput"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setReceiptFileName(file.name);
                          setReceiptFileType(file.type);
                          const reader = new FileReader();
                          reader.onload = (loadEvt) => {
                            setReceiptImage(loadEvt.target?.result as string || '');
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="hidden"
                    />

                    <label
                      htmlFor="parentReceiptFileInput"
                      className="inline-block px-5 py-2.5 bg-blue-900 hover:bg-blue-800 text-yellow-400 font-black text-xs uppercase tracking-wider rounded-xl cursor-pointer shadow-sm transition-all"
                    >
                      📁 Browse & Select Receipt File
                    </label>

                    {receiptFileName && (
                      <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 truncate">
                          <span className="text-emerald-600 font-black">✓ Attached:</span>
                          <span className="font-bold text-slate-700 truncate">{receiptFileName}</span>
                        </div>
                        {receiptImage && receiptFileType.startsWith('image/') && (
                          <div className="shrink-0 w-12 h-12 rounded-lg overflow-hidden border border-slate-300">
                            <img src={receiptImage} alt="Receipt Preview" className="w-full h-full object-cover" />
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Depositor & Reference inputs */}
                  <div className="space-y-3">
                    <div className="grid sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-1">
                          Payer / Depositor Name *
                        </label>
                        <input
                          type="text"
                          required
                          value={payerName}
                          onChange={(e) => setPayerName(e.target.value)}
                          className="w-full px-3.5 py-2.5 bg-white border-2 border-slate-200 rounded-xl font-bold text-xs text-blue-950 focus:border-blue-900 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-1">
                          Sender Bank Name
                        </label>
                        <input
                          type="text"
                          value={bankName}
                          onChange={(e) => setBankName(e.target.value)}
                          className="w-full px-3.5 py-2.5 bg-white border-2 border-slate-200 rounded-xl font-bold text-xs text-blue-950 focus:border-blue-900 outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-1">
                          Transfer Ref / Session ID
                        </label>
                        <input
                          type="text"
                          value={transactionRef}
                          onChange={(e) => setTransactionRef(e.target.value)}
                          placeholder="e.g. FBN-839201 or 123456789"
                          className="w-full px-3.5 py-2.5 bg-white border-2 border-slate-200 rounded-xl font-bold text-xs text-blue-950 focus:border-blue-900 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-1">
                          Note to Bursar (Optional)
                        </label>
                        <input
                          type="text"
                          value={paymentNote}
                          onChange={(e) => setPaymentNote(e.target.value)}
                          placeholder="e.g. 1st term fees paid via mobile transfer"
                          className="w-full px-3.5 py-2.5 bg-white border-2 border-slate-200 rounded-xl font-bold text-xs text-blue-950 focus:border-blue-900 outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-2">
                    <button
                      type="button"
                      onClick={() => setPaymentModalStep('details')}
                      className="px-4 py-2.5 text-xs font-bold text-slate-500 hover:text-slate-800"
                    >
                      ← Back
                    </button>
                    <button
                      type="submit"
                      className="px-8 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg transition-all active:scale-95 flex items-center gap-2"
                    >
                      <span>Submit Receipt to Proprietor for Review</span>
                      <span>✓</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* CHILD GATE PASS QR CODE MODAL */}
      {showChildQrModal && activeChild && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border-4 border-yellow-400 relative">
            <button
              onClick={() => setShowChildQrModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 font-black text-xl p-2 rounded-full hover:bg-slate-100 transition-all"
            >
              ✕
            </button>

            <div className="text-center space-y-4">
              <div className="inline-block p-3 bg-blue-900 text-yellow-400 rounded-2xl shadow-md">
                <span className="text-3xl">🪪</span>
              </div>

              <div>
                <span className="text-[11px] font-black text-yellow-700 bg-yellow-100 px-3 py-1 rounded-full uppercase tracking-widest inline-block mb-1">
                  Official Digital Gate Pass
                </span>
                <h3 className="text-2xl font-serif font-black text-blue-900">
                  {activeChild.name}
                </h3>
                <p className="text-xs font-bold text-slate-500">
                  {activeChild.grade} • Student ID: <strong className="text-blue-900 font-black">{activeChild.id}</strong>
                </p>
              </div>

              <div className="p-5 bg-white border-2 border-dashed border-blue-900/40 rounded-2xl flex flex-col items-center justify-center gap-3 shadow-inner">
                <QRCodeSVG
                  value={`GHS-ATT|${activeChild.id}|${activeChild.activeTerm || 'First Term'}|${Date.now()}`}
                  size={200}
                  level="H"
                  includeMargin={true}
                  imageSettings={{
                    src: '/logo.png',
                    x: undefined,
                    y: undefined,
                    height: 36,
                    width: 36,
                    excavate: true,
                  }}
                />
                <span className="text-[10px] font-black tracking-widest text-slate-400 uppercase">
                  Scan at School Security Gate
                </span>
              </div>

              <div className={`p-3 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 ${
                activeChild.entryAllowed 
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                  : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}>
                <span>{activeChild.entryAllowed ? '✓' : '⚠️'}</span>
                <span>
                  {activeChild.entryAllowed 
                    ? 'Gate Entry Clearance: Granted' 
                    : 'Gate Entry Clearance: Bursar Hold (Check Fees)'}
                </span>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="w-full py-3 bg-blue-900 hover:bg-blue-800 text-yellow-400 font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md active:scale-95"
                >
                  🖨️ Print Pass
                </button>
                <button
                  type="button"
                  onClick={() => setShowChildQrModal(false)}
                  className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs uppercase tracking-wider rounded-xl transition-all"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Official Standard Student/Pupil Report Card Modal */}
      {selectedChildForReport && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto print:p-0 print:bg-white print:static">
          <div className="bg-white rounded-3xl max-w-4xl w-full p-4 sm:p-6 shadow-2xl relative my-auto print:shadow-none print:border-none print:p-0">
            <StandardReportCard 
              student={selectedChildForReport}
              results={results.filter(r => r.studentName.toLowerCase().trim() === selectedChildForReport.name.toLowerCase().trim())}
              term="First Term"
              session="2025/2026 Academic Session"
              onClose={() => setSelectedChildForReport(null)}
              showControls={true}
            />
          </div>
        </div>
      )}
    </div>
  );
};
