import React, { useState } from 'react';
import { StudentAccount, StudentResult, FeePayment, PaymentStatus, SchoolBankAccountConfig, ResultCheckerFeeRecord } from '../types';
import { StandardReportCard } from './StandardReportCard';
import { computeClassRankings, computeSubjectRankings, formatOrdinal } from '../utils/ranking';
import { 
  RESULT_FEE_AMOUNT_NAIRA, 
  RESULT_FEE_AMOUNT_KOBO, 
  isTermResultFeePaid, 
  getPaystackPublicKey,
  buildResultFeePaymentPayload,
  getResultFeeAmount,
  formatSubjectName,
  VACATION_HARD_COPY_ASSURANCE_NOTE
} from '../utils/resultFeeService';
import { PaystackResultFeeModal } from './PaystackResultFeeModal';
import { PaystackButton } from 'react-paystack';

interface StudentResultCheckerProps {
  students: StudentAccount[];
  results: StudentResult[];
  payments: FeePayment[];
  currentStudent: StudentAccount | null;
  isLoggedIn: boolean;
  onLogin: (emailOrId: string, pass: string) => boolean | void;
  onSubmitResultPayment: (payment: Omit<FeePayment, 'id' | 'date'>) => FeePayment;
  onBack: () => void;
  onGoToStudentAuth: () => void;
  bankAccountConfig?: SchoolBankAccountConfig;
  resultCheckerFees?: ResultCheckerFeeRecord[];
}

export const StudentResultChecker: React.FC<StudentResultCheckerProps> = ({
  students,
  results,
  payments,
  currentStudent,
  isLoggedIn,
  onLogin,
  onSubmitResultPayment,
  onBack,
  onGoToStudentAuth,
  bankAccountConfig,
  resultCheckerFees
}) => {
  // Login form state (if accessed by non-logged-in guest)
  const [loginInput, setLoginInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');

  // Active student reference
  const student = currentStudent;

  // Academic term & session selection
  const [selectedTermFilter, setSelectedTermFilter] = useState<string>(student?.activeTerm || 'First Term');
  const [resultScoreMode, setResultScoreMode] = useState<'all' | 'test' | 'exam' | 'total'>('all');
  const [isPrinting, setIsPrinting] = useState(false);
  const [showPaystackModal, setShowPaystackModal] = useState(false);

  // Manual fallback payment receipt upload form state
  const [bankName, setBankName] = useState('First Bank of Nigeria');
  const [payerName, setPayerName] = useState('');
  const [transactionRef, setTransactionRef] = useState('');
  const [receiptImage, setReceiptImage] = useState<string>('');
  const [fileName, setFileName] = useState('');
  const [studentNote, setStudentNote] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showManualUploadForm, setShowManualUploadForm] = useState(false);

  const activeSession = '2025/2026 Academic Session';
  const activeTerm = selectedTermFilter === 'all' ? (student?.activeTerm || 'First Term') : selectedTermFilter;

  // Handle guest quick login
  const handleQuickLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    if (!loginInput.trim() || !passwordInput.trim()) {
      setLoginError('Please enter both your Student ID or Email and password.');
      return;
    }
    const res = onLogin(loginInput.trim(), passwordInput.trim());
    if (res === false) {
      setLoginError('Invalid credentials. Please verify your Student ID/Email and password.');
    }
  };

  // Find all payments by this student
  const studentPayments = student
    ? payments.filter(p => p.studentId === student.id || p.studentName.toLowerCase() === student.name.toLowerCase())
    : [];

  // Term-based persistence check:
  // Checks if payment exists in database for this specific Student, Academic Session, and Term
  const hasAccess = student
    ? isTermResultFeePaid(payments, student.id, student.name, activeTerm, activeSession)
    : false;

  // Specific payments for this term
  const termPayments = studentPayments.filter(p => {
    const matchesTerm = !p.term || p.term.toLowerCase().includes(activeTerm.toLowerCase().split(' ')[0]);
    return matchesTerm && p.type === 'result_fee';
  });
  const pendingResultPayment = termPayments.find(p => p.status === 'pending');
  const declinedResultPayment = termPayments.find(p => p.status === 'declined');
  const confirmedResultPayment = termPayments.find(p => p.status === 'confirmed' || p.status === 'paid');

  // Student results
  const studentResults = student
    ? results.filter(r => r.studentName.toLowerCase() === student.name.toLowerCase())
    : [];

  const filteredResults = selectedTermFilter === 'all'
    ? studentResults
    : studentResults.filter(r => r.term === selectedTermFilter);

  // Calculate GPA / summary stats
  const totalScore = filteredResults.reduce((sum, r) => sum + r.score, 0);
  const averageScore = filteredResults.length > 0 ? (totalScore / filteredResults.length).toFixed(1) : '0';

  // Handle Paystack payment success callback
  const handlePaystackPaymentSuccess = (paymentRecord: Omit<FeePayment, 'id' | 'date'>) => {
    onSubmitResultPayment(paymentRecord);
    setShowPaystackModal(false);
  };

  // Dynamic Result Checker Fee Amount
  const currentResultFee = getResultFeeAmount(bankAccountConfig, resultCheckerFees, activeTerm, activeSession);
  const currentResultFeeKobo = currentResultFee * 100;

  // Inline Paystack configuration
  const paystackKey = getPaystackPublicKey();
  const inlineTxRef = student ? `PSK-INL-${student.id.replace(/[^a-zA-Z0-9]/g, '')}-${Date.now()}` : `PSK-${Date.now()}`;
  const studentEmail = student?.email || (student ? `${student.id.toLowerCase()}@godshand.sch.ng` : 'student@godshand.sch.ng');

  const inlinePaystackConfig = {
    reference: inlineTxRef,
    email: studentEmail,
    amount: currentResultFeeKobo,
    publicKey: paystackKey,
    currency: 'NGN',
    metadata: {
      custom_fields: [
        { display_name: "Student Name", variable_name: "student_name", value: student?.name || '' },
        { display_name: "Student ID", variable_name: "student_id", value: student?.id || '' },
        { display_name: "Academic Class", variable_name: "grade", value: student?.grade || '' },
        { display_name: "Academic Term", variable_name: "term", value: activeTerm },
        { display_name: "Academic Session", variable_name: "session", value: activeSession },
        { display_name: "Fee Type", variable_name: "fee_type", value: "result_checker_fee" }
      ]
    }
  };

  // Handle file upload for receipt
  const handleReceiptUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError('');
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setUploadError('Please select a valid picture file (JPEG, PNG, WEBP).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setUploadError('Image size exceeds 5MB limit. Please upload a smaller image.');
      return;
    }

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setReceiptImage(base64);
    };
    reader.onerror = () => {
      setUploadError('Failed to read image file. Please try again.');
    };
    reader.readAsDataURL(file);
  };

  // Submit payment receipt manually
  const handleManualPaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setUploadError('');

    if (!student) {
      setUploadError('Please log in first before submitting payment receipt.');
      return;
    }

    if (!receiptImage) {
      setUploadError('Please attach or select a photo of your payment transaction receipt.');
      return;
    }

    setIsSubmitting(true);
    try {
      onSubmitResultPayment({
        studentId: student.id,
        studentName: student.name,
        grade: student.grade,
        amount: RESULT_FEE_AMOUNT_NAIRA,
        amountPaid: RESULT_FEE_AMOUNT_NAIRA,
        amountRemaining: 0,
        type: 'result_fee',
        status: 'pending',
        term: activeTerm,
        session: activeSession,
        bankName: bankName.trim() || 'Direct Transfer',
        payerName: payerName.trim() || student.name,
        transactionRef: transactionRef.trim() || `TRX-${Date.now().toString().slice(-6)}`,
        receiptImage: receiptImage,
        receiptFileName: fileName || 'payment_receipt.jpg',
        studentNote: studentNote.trim() || `Result fee payment of ₦1,000 for ${student.name} • ${activeTerm}`
      });

      setIsSubmitting(false);
      setShowManualUploadForm(false);
      setReceiptImage('');
      setFileName('');
      setTransactionRef('');
      setPayerName('');
    } catch (err) {
      setIsSubmitting(false);
      setUploadError('Failed to record receipt. Please try again.');
    }
  };

  const handlePrint = () => {
    setIsPrinting(true);
    setTimeout(() => {
      window.print();
      setIsPrinting(false);
    }, 250);
  };

  return (
    <div className="max-w-4xl mx-auto py-10 px-4 sm:px-6">
      {/* Top Banner Card */}
      <div className="bg-white rounded-[2.5rem] shadow-2xl border-4 border-blue-900 overflow-hidden mb-8">
        <div className="bg-blue-900 px-8 py-10 text-white relative">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
            <div className="flex items-center space-x-5">
              <div className="w-20 h-20 bg-white rounded-2xl border-2 border-yellow-400 shadow-xl overflow-hidden shrink-0 flex items-center justify-center p-1">
                <img 
                  src="/logo.png" 
                  alt="God's Hand International Model School Logo" 
                  className="w-full h-full object-contain"
                  onError={(e) => { e.currentTarget.src = 'hands.jpg'; }}
                />
              </div>
              <div>
                <span className="px-3 py-1 bg-yellow-400 text-blue-900 font-black text-[10px] uppercase tracking-widest rounded-full">
                  Academic Portal
                </span>
                <h1 className="text-2xl sm:text-3xl font-black font-serif mt-1">Student Result Checker</h1>
                <p className="text-xs text-blue-200 uppercase font-black tracking-widest mt-0.5">
                  Termly Academic Performance & Report Card
                </p>
              </div>
            </div>

            <button 
              onClick={onBack}
              className="px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all border border-white/20 flex items-center gap-2"
            >
              <span>←</span> Back to School Home
            </button>
          </div>
        </div>
      </div>

      {/* Case 1: NOT Logged In */}
      {!isLoggedIn || !student ? (
        <div className="bg-white rounded-3xl shadow-xl p-8 sm:p-12 border-2 border-slate-100 text-center max-w-lg mx-auto">
          <div className="w-20 h-20 bg-blue-50 text-blue-900 rounded-3xl mx-auto flex items-center justify-center text-4xl mb-6 shadow-sm border border-blue-100">
            🎓
          </div>
          <h2 className="text-2xl font-black text-blue-900 font-serif mb-2">Check Your Result</h2>
          <p className="text-xs text-slate-500 font-bold mb-8 leading-relaxed">
            Please log in with your Student ID or Registered Email to view your academic results and upload transaction confirmation.
          </p>

          <form onSubmit={handleQuickLogin} className="space-y-4 text-left">
            {loginError && (
              <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-bold">
                ⚠️ {loginError}
              </div>
            )}

            <div>
              <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wider mb-1.5">
                Student ID or Email
              </label>
              <input 
                type="text"
                required
                placeholder="e.g. STU-1 or samuel@Godshand.sch.ng"
                value={loginInput}
                onChange={(e) => setLoginInput(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold text-blue-900 outline-none focus:border-blue-900 focus:bg-white text-sm transition-all"
              />
            </div>

            <div>
              <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <input 
                type="password"
                required
                placeholder="••••••••"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold text-blue-900 outline-none focus:border-blue-900 focus:bg-white text-sm transition-all"
              />
            </div>

            <button
              type="submit"
              className="w-full py-4 bg-blue-900 hover:bg-blue-800 text-yellow-400 font-black uppercase text-xs tracking-widest rounded-xl shadow-lg transition-all active:scale-95 mt-2"
            >
              Sign In To Check Result
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col gap-2">
            <p className="text-xs text-slate-400 font-bold">Don't have an account or lost your password?</p>
            <button
              onClick={onGoToStudentAuth}
              className="text-xs font-black text-blue-900 hover:underline uppercase tracking-wider"
            >
              Create Account / Reset Password →
            </button>
          </div>
        </div>
      ) : (
        /* Case 2: Logged in Student */
        <div className="space-y-8">
          {/* Student Profile Overview Card */}
          <div className="bg-white rounded-3xl shadow-lg p-6 sm:p-8 border-2 border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-blue-900 text-yellow-400 font-serif font-black text-2xl flex items-center justify-center shadow-md">
                {student.name.charAt(0)}
              </div>
              <div>
                <span className="px-2.5 py-0.5 bg-yellow-100 text-blue-900 font-black text-[10px] uppercase tracking-wider rounded-md">
                  Class: {student.grade}
                </span>
                <h2 className="text-2xl font-black text-blue-900 font-serif mt-1">{student.name}</h2>
                <p className="text-xs text-slate-400 font-bold">
                  Student ID: <span className="text-slate-600">{student.id}</span> • Email: <span className="text-slate-600">{student.email}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {hasAccess && (
                <button
                  onClick={handlePrint}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-blue-900 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2"
                >
                  <span>🖨️</span>
                  <span>Print Result Slip</span>
                </button>
              )}
            </div>
          </div>

          {/* Term Selector Header (Always visible so students can switch between First, Second, and Third Term) */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xl">🗓️</span>
              <div>
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">Academic Session & Term</span>
                <span className="text-xs font-black text-blue-950">{activeSession}</span>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <span className="text-xs font-black text-slate-600 uppercase">Select Term:</span>
              <select
                value={selectedTermFilter}
                onChange={(e) => setSelectedTermFilter(e.target.value)}
                className="flex-1 sm:flex-none px-4 py-2 bg-slate-50 hover:bg-slate-100 border-2 border-blue-900 rounded-xl font-black text-xs text-blue-950 outline-none shadow-xs cursor-pointer"
              >
                <option value="First Term">First Term</option>
                <option value="Second Term">Second Term</option>
                <option value="Third Term">Third Term</option>
                <option value="all">All Terms (Consolidated)</option>
              </select>

              <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                hasAccess
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : 'bg-amber-100 text-amber-900 border border-amber-300'
              }`}>
                {hasAccess ? '✓ Unlocked' : '🔒 Fee Required'}
              </span>
            </div>
          </div>

          {/* ACCESS CONTROL & PAYMENT GATEWAY: Requires ₦1,000 Result Fee per Term */}
          {!hasAccess ? (
            <div className="bg-white rounded-3xl shadow-xl p-6 sm:p-10 border-4 border-yellow-400 relative overflow-hidden space-y-6">
              <div className="absolute top-0 right-0 w-40 h-40 bg-yellow-400/10 rounded-full blur-2xl pointer-events-none"></div>
              
              <div className="max-w-2xl mx-auto text-center space-y-5">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-amber-100 text-amber-950 text-3xl shadow-sm border border-amber-200">
                  🔒
                </div>

                <div>
                  <span className="px-3.5 py-1 bg-amber-100 text-amber-900 font-black text-[10px] uppercase tracking-widest rounded-full border border-amber-200">
                    Result Checker Fee Clearance • {activeTerm}
                  </span>
                  <h3 className="text-2xl sm:text-3xl font-black text-blue-950 font-serif mt-3">
                    Unlock Official Report Card for {activeTerm}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 font-medium mt-2 leading-relaxed">
                    In accordance with school policy, checking and downloading the terminal report card dossier requires a confirmed clearance fee of <strong className="text-blue-900 font-black">₦1,000 (100,000 kobo)</strong> collected via <strong className="text-emerald-700 font-black">Paystack</strong>.
                  </p>
                </div>

                {/* Status Indicator for Pending or Declined Manual Receipts */}
                {pendingResultPayment && (
                  <div className="p-5 bg-amber-50 rounded-2xl border-2 border-amber-200 text-left space-y-2">
                    <div className="flex items-center gap-2 text-amber-900 font-black text-xs uppercase tracking-wider">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
                      <span>Bank Receipt Under Admin Confirmation ({activeTerm})</span>
                    </div>
                    <p className="text-xs text-amber-800 font-medium">
                      Your bank transfer receipt of <strong>₦{pendingResultPayment.amount.toLocaleString()}</strong> (Ref: {pendingResultPayment.transactionRef || pendingResultPayment.id}) is awaiting administrator clearance. To unlock <strong>instant report card access right now</strong> without waiting, pay with Paystack below!
                    </p>
                  </div>
                )}

                {declinedResultPayment && (
                  <div className="p-5 bg-rose-50 rounded-2xl border-2 border-rose-200 text-left space-y-2">
                    <div className="flex items-center gap-2 text-rose-900 font-black text-xs uppercase tracking-wider">
                      <span>❌</span>
                      <span>Previous Payment Note from Administrator</span>
                    </div>
                    <p className="text-xs text-rose-800 font-medium">
                      "{declinedResultPayment.adminNote || 'Could not verify transaction reference.'}"
                    </p>
                  </div>
                )}

                {/* Primary Payment Card: Paystack Gateway (₦1,000) */}
                <div className="p-6 bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white rounded-3xl border-2 border-yellow-400/50 shadow-xl space-y-5 text-left">
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-white/10 pb-4">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-yellow-300 block">
                        Official Paystack Clearance Gateway
                      </span>
                      <h4 className="font-serif font-black text-lg text-white">
                        Instant Report Card Access Pass
                      </h4>
                      <p className="text-xs text-slate-300">
                        Candidate: <strong className="text-white">{student.name}</strong> • {student.grade} • {activeTerm}
                      </p>
                    </div>

                    <div className="sm:text-right">
                      <span className="font-mono font-black text-3xl text-yellow-400">
                        ₦{currentResultFee.toLocaleString()}
                      </span>
                      <span className="text-[10px] text-slate-300 block font-mono">{currentResultFeeKobo.toLocaleString()} Kobo</span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">
                    Paying <strong>₦{currentResultFee.toLocaleString()}</strong> unlocks immediate, permanent term-based access for <strong>{activeTerm} ({activeSession})</strong>. You can view subject breakdowns, examination rankings, and download or print the complete signed report card anytime.
                  </p>

                  {/* Vacation Hard Copy Assurance Note */}
                  <div className="p-3.5 bg-white/10 rounded-2xl border border-yellow-400/40 flex items-start gap-2.5 text-xs">
                    <span className="text-lg shrink-0">📜</span>
                    <p className="text-yellow-200 leading-relaxed font-medium text-[11px]">
                      {VACATION_HARD_COPY_ASSURANCE_NOTE}
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 pt-2">
                    {/* Primary Paystack Button via react-paystack */}
                    <div className="flex-1">
                      <PaystackButton
                        {...inlinePaystackConfig}
                        text={`⚡ Pay ₦${currentResultFee.toLocaleString()} with Paystack (Instant Unlock)`}
                        onSuccess={(res: any) => {
                          const ref = res?.reference || inlineTxRef;
                          const payload = buildResultFeePaymentPayload(
                            student,
                            activeTerm,
                            activeSession,
                            ref,
                            student.name,
                            studentEmail,
                            currentResultFee
                          );
                          handlePaystackPaymentSuccess(payload);
                        }}
                        onClose={() => {}}
                        className="w-full py-4 px-6 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 text-center"
                      />
                    </div>

                    {/* Paystack Modal Opener */}
                    <button
                      type="button"
                      onClick={() => setShowPaystackModal(true)}
                      className="py-4 px-5 bg-yellow-400 hover:bg-yellow-300 text-blue-950 rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg transition-all flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
                      title="Open full Paystack checkout dialogue with custom payer details"
                    >
                      <span>💳</span>
                      <span>Checkout Options</span>
                    </button>
                  </div>

                  {/* Sandbox Instant Simulation Clearance */}
                  <div className="pt-2 border-t border-white/10 flex flex-col sm:flex-row justify-between items-center gap-2 text-xs">
                    <span className="text-[11px] text-emerald-400 font-bold flex items-center gap-1.5">
                      <span>🔒</span>
                      <span>Secured: Verve, Mastercard, Visa, Bank Transfer & USSD</span>
                    </span>

                    <button
                      type="button"
                      onClick={() => {
                        const simRef = `SIM-PSK-${Date.now().toString().slice(-6)}`;
                        const payload = buildResultFeePaymentPayload(
                          student,
                          activeTerm,
                          activeSession,
                          simRef,
                          student.name,
                          studentEmail,
                          currentResultFee
                        );
                        handlePaystackPaymentSuccess(payload);
                      }}
                      className="text-[11px] font-bold text-yellow-300 hover:text-yellow-200 underline cursor-pointer"
                      title="Instant test approval simulation"
                    >
                      Instant Test Clearance Mode →
                    </button>
                  </div>
                </div>

                {/* Secondary Option: Manual Bank Transfer & Receipt Upload Form */}
                <div className="pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowManualUploadForm(!showManualUploadForm)}
                    className="text-xs font-bold text-slate-500 hover:text-blue-900 transition-colors"
                  >
                    {showManualUploadForm ? '▲ Hide Bank Transfer Receipt Upload' : '▼ Alternatively: Pay via Bank Transfer & Upload Receipt for Admin Approval'}
                  </button>

                  {showManualUploadForm && (
                    <div className="mt-4 p-6 bg-slate-50 rounded-2xl border border-slate-200 text-left space-y-4">
                      {/* School Bank Details Card */}
                      <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-2">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          School Account Details (Manual Transfers)
                        </p>
                        <div className="grid sm:grid-cols-3 gap-3 text-xs">
                          <div>
                            <p className="text-slate-400 font-bold">Bank Name</p>
                            <p className="font-black text-blue-900 text-sm">First Bank of Nigeria</p>
                          </div>
                          <div>
                            <p className="text-slate-400 font-bold">Account Name</p>
                            <p className="font-black text-blue-900 text-sm">God's Hand Int'l Model School</p>
                          </div>
                          <div>
                            <p className="text-slate-400 font-bold">Account Number</p>
                            <p className="font-mono font-black text-blue-900 text-base">3045892104</p>
                          </div>
                        </div>
                      </div>

                      <form onSubmit={handleManualPaymentSubmit} className="space-y-4">
                        {uploadError && (
                          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-bold">
                            ⚠️ {uploadError}
                          </div>
                        )}

                        <div className="grid sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wider mb-1">
                              Payer Name
                            </label>
                            <input 
                              type="text"
                              required
                              placeholder="e.g. Mrs. Adebayo"
                              value={payerName}
                              onChange={(e) => setPayerName(e.target.value)}
                              className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl font-bold text-xs text-blue-900 outline-none"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wider mb-1">
                              Bank Used
                            </label>
                            <input 
                              type="text"
                              placeholder="e.g. GTBank, OPay, First Bank"
                              value={bankName}
                              onChange={(e) => setBankName(e.target.value)}
                              className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl font-bold text-xs text-blue-900 outline-none"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wider mb-1">
                            Transaction Reference
                          </label>
                          <input 
                            type="text"
                            placeholder="e.g. 000013248921894"
                            value={transactionRef}
                            onChange={(e) => setTransactionRef(e.target.value)}
                            className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl font-bold text-xs text-blue-900 outline-none"
                          />
                        </div>

                        {/* Photo / Receipt Upload Input */}
                        <div>
                          <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wider mb-1">
                            Photo / Screenshot of Transfer Receipt *
                          </label>
                          <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-blue-200 border-dashed rounded-2xl bg-white hover:bg-slate-50 transition-colors cursor-pointer relative">
                            <div className="space-y-2 text-center">
                              {receiptImage ? (
                                <div className="space-y-2">
                                  <img 
                                    src={receiptImage} 
                                    alt="Receipt preview" 
                                    className="max-h-40 mx-auto rounded-xl border border-slate-200 shadow-md object-contain"
                                  />
                                  <p className="text-xs font-bold text-green-700">✓ {fileName || 'Receipt photo attached'}</p>
                                </div>
                              ) : (
                                <>
                                  <div className="text-3xl text-blue-900">📸</div>
                                  <p className="text-xs text-slate-600 font-bold">Click to attach bank receipt photo</p>
                                </>
                              )}
                              <input 
                                type="file" 
                                accept="image/*"
                                onChange={handleReceiptUpload}
                                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" 
                              />
                            </div>
                          </div>
                        </div>

                        <button
                          type="submit"
                          disabled={isSubmitting || !receiptImage}
                          className="w-full py-3.5 bg-blue-900 hover:bg-blue-800 text-yellow-400 font-black uppercase text-xs tracking-widest rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50"
                        >
                          {isSubmitting ? 'Submitting...' : `Submit Receipt for ${activeTerm} Admin Approval (₦1,000)`}
                        </button>
                      </form>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* HAS CONFIRMED ACCESS: Render Results & Official Standard Report Card */
            <div className="space-y-6">
              {/* Access Clearance Header */}
              <div className="no-print flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-4 bg-emerald-50 rounded-2xl border-2 border-emerald-200 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center text-lg font-black shadow-xs">
                    ✓
                  </div>
                  <div>
                    <p className="font-black text-emerald-950 text-xs uppercase tracking-wider">
                      Result Access Cleared & Confirmed
                    </p>
                    <p className="text-[11px] text-emerald-800 font-medium">
                      Official fee of ₦1,000 verified by {confirmedResultPayment?.reviewedBy || 'School Bursary / Administrator'}
                    </p>
                  </div>
                </div>

                {/* Term Selector Filter */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-slate-600 uppercase">Term:</span>
                  <select
                    value={selectedTermFilter}
                    onChange={(e) => setSelectedTermFilter(e.target.value)}
                    className="px-3 py-1.5 bg-white border border-slate-300 rounded-xl font-bold text-xs text-blue-900 outline-none shadow-xs"
                  >
                    <option value="First Term">First Term</option>
                    <option value="Second Term">Second Term</option>
                    <option value="Third Term">Third Term</option>
                    <option value="all">All Terms</option>
                  </select>
                </div>
              </div>

              {/* Assessment Mode Selector: Full Dossier | Test (CA) Only | Exam Only | Total & Position */}
              <div className="no-print bg-slate-100 p-1.5 rounded-2xl flex flex-wrap gap-1.5 border border-slate-200">
                <button
                  type="button"
                  onClick={() => setResultScoreMode('all')}
                  className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                    resultScoreMode === 'all'
                      ? 'bg-blue-900 text-yellow-400 shadow-md'
                      : 'text-slate-600 hover:text-blue-950 hover:bg-white/60'
                  }`}
                >
                  <span>📊</span>
                  <span>Full Terminal Report</span>
                </button>

                <button
                  type="button"
                  onClick={() => setResultScoreMode('test')}
                  className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                    resultScoreMode === 'test'
                      ? 'bg-amber-600 text-white shadow-md'
                      : 'text-slate-600 hover:text-blue-950 hover:bg-white/60'
                  }`}
                >
                  <span>🧪</span>
                  <span>Test / CA Only (40)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setResultScoreMode('exam')}
                  className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                    resultScoreMode === 'exam'
                      ? 'bg-indigo-700 text-white shadow-md'
                      : 'text-slate-600 hover:text-blue-950 hover:bg-white/60'
                  }`}
                >
                  <span>📝</span>
                  <span>Exam Only (60)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setResultScoreMode('total')}
                  className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                    resultScoreMode === 'total'
                      ? 'bg-emerald-700 text-white shadow-md'
                      : 'text-slate-600 hover:text-blue-950 hover:bg-white/60'
                  }`}
                >
                  <span>🏆</span>
                  <span>Total & Position (Standings)</span>
                </button>
              </div>

              {/* Mode-Specific Quick Subject Cards if test, exam, or total is toggled */}
              {resultScoreMode !== 'all' && (() => {
                const resultsToShow = filteredResults.length > 0 ? filteredResults : studentResults;
                const activeTermName = selectedTermFilter === 'all' ? 'First Term' : selectedTermFilter;
                const classStandings = computeClassRankings(results, students, student.grade, activeTermName);
                const myRank = classStandings.get(student.id) || classStandings.get(student.name.trim().toLowerCase());

                return (
                  <div className="no-print space-y-4">
                    <div className="p-4 bg-gradient-to-r from-blue-950 to-indigo-900 rounded-2xl text-white flex flex-wrap items-center justify-between gap-4 border border-yellow-400/30 shadow-sm">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">🏆</span>
                        <div>
                          <p className="text-[10px] uppercase font-black tracking-widest text-yellow-300">{student.grade} Class Standing</p>
                          <p className="font-serif font-black text-base">
                            Overall Position: <strong className="text-yellow-400 text-xl">{myRank?.positionOrdinal || '1st'}</strong> out of {myRank?.totalStudentsInClass || students.filter(s => s.grade === student.grade).length} pupils
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-blue-200 uppercase font-bold block">Class Average</span>
                        <span className="font-mono font-black text-lg text-yellow-300">{averageScore}%</span>
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {resultsToShow.map(res => {
                        const ca = res.caScore !== undefined ? res.caScore : Math.round(res.score * 0.4);
                        const exam = res.examScore !== undefined ? res.examScore : (res.score - ca);
                        const subjRankMap = computeSubjectRankings(results, res.subject, student.grade, res.term);
                        const subjRank = subjRankMap.get(student.name.trim().toLowerCase());

                        return (
                          <div key={res.id} className="p-4 bg-white rounded-2xl border-2 border-slate-100 shadow-xs space-y-2">
                            <div className="flex justify-between items-start">
                              <div>
                                <h4 className="font-serif font-black text-blue-950 text-sm">{formatSubjectName(res.subject)}</h4>
                                <span className="text-[10px] font-bold text-slate-400 uppercase">{res.term}</span>
                              </div>
                              <span className={`px-2.5 py-1 rounded-xl text-xs font-black ${
                                resultScoreMode === 'test' 
                                  ? 'bg-amber-100 text-amber-900 border border-amber-300' 
                                  : resultScoreMode === 'exam' 
                                    ? 'bg-indigo-100 text-indigo-900 border border-indigo-300' 
                                    : res.score >= 70 ? 'bg-emerald-100 text-emerald-800' : 'bg-yellow-100 text-yellow-800'
                              }`}>
                                {resultScoreMode === 'test' ? `${ca} / 40 (CA)` : resultScoreMode === 'exam' ? `${exam} / 60 (Exam)` : `${res.score}% (Total)`}
                              </span>
                            </div>

                            <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
                              <span className="text-[11px] font-bold text-slate-500">Subject Position:</span>
                              <span className="px-2 py-0.5 bg-yellow-100 text-blue-950 font-black rounded-lg text-[11px] border border-yellow-300">
                                ★ {subjRank?.positionOrdinal || '1st'} in Subject
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* Standard Report Card Component with School Logo Crest, Assessment Table, Affective Domains, and Signatures */}
              <StandardReportCard 
                student={student}
                results={filteredResults.length > 0 ? filteredResults : studentResults}
                allResults={results}
                allStudents={students}
                term={selectedTermFilter === 'all' ? 'First Term' : selectedTermFilter}
                session="2025/2026 Academic Session"
                showControls={true}
              />
            </div>
          )}
        </div>
      )}

      {/* Paystack Full Modal Dialog */}
      {showPaystackModal && student && (
        <PaystackResultFeeModal
          isOpen={showPaystackModal}
          onClose={() => setShowPaystackModal(false)}
          student={student}
          term={activeTerm}
          session={activeSession}
          payerName={student.name}
          payerEmail={studentEmail}
          feeAmount={currentResultFee}
          onSuccess={handlePaystackPaymentSuccess}
        />
      )}
    </div>
  );
};
