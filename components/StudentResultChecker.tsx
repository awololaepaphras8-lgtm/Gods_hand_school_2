import React, { useState } from 'react';
import { StudentAccount, StudentResult, FeePayment, PaymentStatus } from '../types';
import { StandardReportCard } from './StandardReportCard';

interface StudentResultCheckerProps {
  students: StudentAccount[];
  results: StudentResult[];
  payments: FeePayment[];
  currentStudent: StudentAccount | null;
  isLoggedIn: boolean;
  onLogin: (emailOrId: string, pass: string) => boolean | void;
  onSubmitResultPayment: (payment: {
    studentId: string;
    studentName: string;
    grade: any;
    amount: number;
    type: 'result_fee';
    bankName: string;
    payerName: string;
    transactionRef: string;
    receiptImage: string;
    studentNote: string;
  }) => FeePayment;
  onBack: () => void;
  onGoToStudentAuth: () => void;
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
  onGoToStudentAuth
}) => {
  // Login form state (if accessed by non-logged-in guest)
  const [loginInput, setLoginInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');

  // Payment receipt upload form state
  const [bankName, setBankName] = useState('First Bank of Nigeria');
  const [payerName, setPayerName] = useState('');
  const [transactionRef, setTransactionRef] = useState('');
  const [receiptImage, setReceiptImage] = useState<string>('');
  const [fileName, setFileName] = useState('');
  const [studentNote, setStudentNote] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [selectedTermFilter, setSelectedTermFilter] = useState<string>('all');
  const [isPrinting, setIsPrinting] = useState(false);

  // Active student reference
  const student = currentStudent;

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

  // Specifically check for result fee payments (type === 'result_fee') or confirmed fees
  const resultPayments = studentPayments.filter(p => p.type === 'result_fee');
  const confirmedResultPayment = resultPayments.find(p => p.status === 'confirmed');
  const pendingResultPayment = resultPayments.find(p => p.status === 'pending');
  const declinedResultPayment = resultPayments.find(p => p.status === 'declined');

  // Has unlocked results: confirmed payment exists
  const hasAccess = !!confirmedResultPayment;

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

  // Submit payment receipt
  const handlePaymentSubmit = (e: React.FormEvent) => {
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
        amount: 1000,
        type: 'result_fee',
        bankName: bankName.trim() || 'Direct Transfer',
        payerName: payerName.trim() || student.name,
        transactionRef: transactionRef.trim() || `TRX-${Date.now().toString().slice(-6)}`,
        receiptImage: receiptImage,
        studentNote: studentNote.trim() || `Result fee payment of ₦1,000 for ${student.name}`
      });

      setIsSubmitting(false);
      setShowPaymentForm(false);
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

          {/* ACCESS CONTROL & PAYMENT GATEWAY: Requires ₦1,000 Result Fee */}
          {!hasAccess ? (
            <div className="bg-white rounded-3xl shadow-xl p-8 sm:p-10 border-3 border-yellow-400 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-400/10 rounded-full blur-2xl pointer-events-none"></div>
              
              <div className="max-w-2xl mx-auto text-center space-y-6">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-amber-100 text-amber-900 text-3xl shadow-sm border border-amber-200">
                  🔒
                </div>

                <div>
                  <span className="px-3.5 py-1 bg-amber-100 text-amber-900 font-black text-[10px] uppercase tracking-widest rounded-full border border-amber-200">
                    Result Checker Fee Required
                  </span>
                  <h3 className="text-2xl sm:text-3xl font-black text-blue-900 font-serif mt-3">
                    Pay ₦1,000 To Access Your Termly Result
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 font-medium mt-2 leading-relaxed">
                    In accordance with school policy, each student must pay a fee of <strong className="text-blue-900 font-black">₦1,000 (One Thousand Naira)</strong> to check their official result slip. Upload a screenshot or photo of your transaction receipt below and wait for confirmation from the school administrator.
                  </p>
                </div>

                {/* Status Indicator */}
                {pendingResultPayment && (
                  <div className="p-5 bg-amber-50 rounded-2xl border-2 border-amber-200 text-left space-y-2">
                    <div className="flex items-center gap-2 text-amber-900 font-black text-xs uppercase tracking-wider">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
                      <span>Receipt Under Admin Confirmation</span>
                    </div>
                    <p className="text-xs text-amber-800 font-medium">
                      Your payment receipt of <strong>₦{pendingResultPayment.amount.toLocaleString()}</strong> (Ref: {pendingResultPayment.transactionRef || pendingResultPayment.id}) was submitted on <strong>{new Date(pendingResultPayment.date).toLocaleDateString()}</strong> and is currently awaiting admin verification. Once verified, your results will unlock automatically!
                    </p>
                    {pendingResultPayment.receiptImage && (
                      <div className="mt-3 pt-3 border-t border-amber-200/60 flex items-center gap-3">
                        <img 
                          src={pendingResultPayment.receiptImage} 
                          alt="Submitted Receipt" 
                          className="w-14 h-14 object-cover rounded-xl border border-amber-300 shadow-xs"
                        />
                        <span className="text-[11px] text-amber-800 font-bold">Transaction Receipt Uploaded</span>
                      </div>
                    )}
                  </div>
                )}

                {declinedResultPayment && (
                  <div className="p-5 bg-red-50 rounded-2xl border-2 border-red-200 text-left space-y-2">
                    <div className="flex items-center gap-2 text-red-900 font-black text-xs uppercase tracking-wider">
                      <span>❌</span>
                      <span>Payment Declined by Administrator</span>
                    </div>
                    <p className="text-xs text-red-800 font-medium">
                      Note from Admin: "{declinedResultPayment.adminNote || 'Could not verify transaction reference. Please re-upload a clear payment receipt.'}"
                    </p>
                    <p className="text-[11px] text-red-700 font-bold">
                      Please re-upload a valid transaction receipt below.
                    </p>
                  </div>
                )}

                {/* School Bank Details Card */}
                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 text-left space-y-3">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Official School Bank Account For Result Payment
                  </p>
                  <div className="grid sm:grid-cols-3 gap-4 text-xs">
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
                  <p className="text-[11px] text-slate-500 font-medium pt-1">
                    * Amount: <strong className="text-blue-900">₦1,000</strong>. Enter student's name in transaction description/remark.
                  </p>
                </div>

                {/* Toggle or Show Upload Form */}
                {(!pendingResultPayment || showPaymentForm) ? (
                  <div className="bg-blue-50/50 p-6 sm:p-8 rounded-3xl border-2 border-blue-100 text-left">
                    <div className="mb-6">
                      <h4 className="text-lg font-black text-blue-900 font-serif">
                        Upload Proof of ₦1,000 Transaction
                      </h4>
                      <p className="text-xs text-slate-500 font-medium">
                        Attach a screenshot or photo of your bank transfer receipt for admin confirmation.
                      </p>
                    </div>

                    <form onSubmit={handlePaymentSubmit} className="space-y-5">
                      {uploadError && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-bold">
                          ⚠️ {uploadError}
                        </div>
                      )}

                      <div className="grid sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wider mb-1">
                            Payer / Depositor Name
                          </label>
                          <input 
                            type="text"
                            required
                            placeholder="e.g. Mrs. Adebayo"
                            value={payerName}
                            onChange={(e) => setPayerName(e.target.value)}
                            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl font-bold text-xs text-blue-900 outline-none focus:border-blue-900"
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
                            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl font-bold text-xs text-blue-900 outline-none focus:border-blue-900"
                          />
                        </div>
                      </div>

                      <div className="grid sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wider mb-1">
                            Transaction Reference / Session ID
                          </label>
                          <input 
                            type="text"
                            placeholder="e.g. 000013248921894"
                            value={transactionRef}
                            onChange={(e) => setTransactionRef(e.target.value)}
                            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl font-bold text-xs text-blue-900 outline-none focus:border-blue-900"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wider mb-1">
                            Amount Paid
                          </label>
                          <div className="w-full px-4 py-3 bg-slate-100 border border-slate-200 rounded-xl font-black text-xs text-blue-900">
                            ₦1,000 (Standard Result Access Fee)
                          </div>
                        </div>
                      </div>

                      {/* Photo / Receipt Upload Input */}
                      <div>
                        <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wider mb-1">
                          Picture / Screenshot of Transaction Receipt *
                        </label>
                        <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-blue-200 border-dashed rounded-2xl bg-white hover:bg-slate-50 transition-colors cursor-pointer relative">
                          <div className="space-y-2 text-center">
                            {receiptImage ? (
                              <div className="space-y-2">
                                <img 
                                  src={receiptImage} 
                                  alt="Receipt preview" 
                                  className="max-h-48 mx-auto rounded-xl border border-slate-200 shadow-md object-contain"
                                />
                                <p className="text-xs font-bold text-green-700">✓ {fileName || 'Receipt photo attached'}</p>
                                <p className="text-[10px] text-slate-400">Click below to replace</p>
                              </div>
                            ) : (
                              <>
                                <div className="text-4xl text-blue-900">📸</div>
                                <div className="text-xs text-slate-600 font-bold">
                                  <span className="text-blue-900 hover:underline">Click to upload transaction photo</span> or drag and drop
                                </div>
                                <p className="text-[10px] text-slate-400 font-medium">PNG, JPG, WEBP up to 5MB</p>
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

                      <div>
                        <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wider mb-1">
                          Additional Note (Optional)
                        </label>
                        <input 
                          type="text"
                          placeholder="e.g. Paid via mobile banking app"
                          value={studentNote}
                          onChange={(e) => setStudentNote(e.target.value)}
                          className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-blue-900 outline-none focus:border-blue-900"
                        />
                      </div>

                      <div className="flex gap-3 pt-2">
                        <button
                          type="submit"
                          disabled={isSubmitting || !receiptImage}
                          className="flex-1 py-4 bg-yellow-400 hover:bg-yellow-300 text-blue-950 font-black uppercase text-xs tracking-widest rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isSubmitting ? 'Uploading Receipt...' : 'Submit Receipt For Admin Confirmation (₦1,000)'}
                        </button>
                        {pendingResultPayment && (
                          <button
                            type="button"
                            onClick={() => setShowPaymentForm(false)}
                            className="px-5 py-4 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-xl"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </form>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowPaymentForm(true)}
                    className="px-6 py-3 bg-blue-100 hover:bg-blue-200 text-blue-900 font-black text-xs uppercase tracking-wider rounded-xl transition-all"
                  >
                    Submit Another Receipt
                  </button>
                )}
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

              {/* Standard Report Card Component with School Logo Crest, Assessment Table, Affective Domains, and Signatures */}
              <StandardReportCard 
                student={student}
                results={filteredResults.length > 0 ? filteredResults : studentResults}
                term={selectedTermFilter === 'all' ? 'First Term' : selectedTermFilter}
                session="2025/2026 Academic Session"
                showControls={true}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};
