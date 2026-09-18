import React, { useState, useMemo } from 'react';
import { FeePayment, StudentAccount, GradeLevel } from '../types';

interface StudentReceiptsDownloadProps {
  payments: FeePayment[];
  students: StudentAccount[];
  currentStudent: StudentAccount | null;
  isLoggedIn: boolean;
  onLogin?: (emailOrId: string, pass: string) => boolean;
  onBack: () => void;
  onPayFees: () => void;
}

export const StudentReceiptsDownload: React.FC<StudentReceiptsDownloadProps> = ({
  payments,
  students,
  currentStudent,
  isLoggedIn,
  onLogin,
  onBack,
  onPayFees
}) => {
  // If not logged in, allow looking up student by Student ID or selecting student
  const [searchQuery, setSearchQuery] = useState(currentStudent?.id || '');
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(currentStudent?.id || null);
  const [loginPass, setLoginPass] = useState('');
  const [loginError, setLoginError] = useState('');
  const [selectedReceiptForPrint, setSelectedReceiptForPrint] = useState<FeePayment | null>(null);
  const [showAllConsolidated, setShowAllConsolidated] = useState(false);
  const [inspectedUploadProof, setInspectedUploadProof] = useState<FeePayment | null>(null);

  // Determine active student
  const activeStudent = useMemo(() => {
    if (currentStudent) return currentStudent;
    if (!selectedStudentId) return null;
    return students.find(s => s.id.toLowerCase() === selectedStudentId.toLowerCase() || s.name.toLowerCase() === selectedStudentId.toLowerCase()) || null;
  }, [currentStudent, selectedStudentId, students]);

  // Filter payments for this student
  const studentPayments = useMemo(() => {
    if (!activeStudent) return [];
    return payments.filter(p => 
      (p.studentId && p.studentId.toLowerCase() === activeStudent.id.toLowerCase()) ||
      (p.studentName && p.studentName.toLowerCase() === activeStudent.name.toLowerCase())
    );
  }, [activeStudent, payments]);

  const confirmedPayments = studentPayments.filter(p => p.status === 'confirmed' || (!p.status));
  const pendingPayments = studentPayments.filter(p => p.status === 'pending');
  const totalPaidConfirmed = confirmedPayments.reduce((sum, p) => sum + p.amount, 0);

  const handleStudentLookup = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      setLoginError('Please enter your Student ID or Full Name.');
      return;
    }

    const found = students.find(s => s.id.toLowerCase() === query || s.name.toLowerCase().includes(query));
    if (found) {
      if (onLogin && loginPass) {
        const success = onLogin(found.id, loginPass);
        if (!success) {
          setLoginError('Incorrect password. Please verify or lookup by Student ID.');
          return;
        }
      }
      setSelectedStudentId(found.id);
    } else {
      setLoginError(`No student found matching "${searchQuery}". Please check your Student ID (e.g. STU-1).`);
    }
  };

  const numberToWords = (num: number): string => {
    // Simple helper for receipt words
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    
    if (num === 0) return 'Zero Naira';
    
    const convertLessThanOneThousand = (n: number): string => {
      if (n === 0) return '';
      if (n < 20) return ones[n] + ' ';
      if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? '-' + ones[n % 10] : '') + ' ';
      return ones[Math.floor(n / 100)] + ' Hundred ' + convertLessThanOneThousand(n % 100);
    };

    let result = '';
    const millions = Math.floor(num / 1000000);
    const thousands = Math.floor((num % 1000000) / 1000);
    const remainder = num % 1000;

    if (millions > 0) result += convertLessThanOneThousand(millions) + 'Million ';
    if (thousands > 0) result += convertLessThanOneThousand(thousands) + 'Thousand ';
    if (remainder > 0) result += convertLessThanOneThousand(remainder);

    return (result.trim() + ' Naira Only').toUpperCase();
  };

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8 animate-in fade-in duration-300">
      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-4">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-500 hover:text-blue-900 transition-colors"
        >
          <span>←</span>
          <span>Back to Hub / Navigation</span>
        </button>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onPayFees}
            className="px-4 py-2 bg-yellow-400 hover:bg-yellow-300 text-blue-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-sm transition-all"
          >
            💳 Pay School Fees / Upload Receipt
          </button>
        </div>
      </div>

      {/* Hero Banner */}
      <div className="bg-gradient-to-r from-blue-950 via-blue-900 to-indigo-950 text-white rounded-[2.5rem] p-8 sm:p-12 shadow-2xl relative overflow-hidden border-4 border-yellow-400">
        <div className="absolute top-0 right-0 w-96 h-96 bg-yellow-400/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 bg-yellow-400 text-blue-950 font-black text-[10px] uppercase rounded-full tracking-wider">
                Official Bursary Portal
              </span>
              <span className="text-blue-300 text-xs font-bold">
                God's Hand International Model School
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-black text-white">
              Student Fee Receipts Portal
            </h1>
            <p className="text-blue-200 text-xs sm:text-sm mt-2 max-w-2xl leading-relaxed">
              Download and print all official stamped school fee receipts, monitor receipts undergoing proprietor review, and access your full financial clearance statement.
            </p>
          </div>

          {activeStudent && confirmedPayments.length > 0 && (
            <button
              type="button"
              onClick={() => setShowAllConsolidated(true)}
              className="px-6 py-4 bg-yellow-400 hover:bg-yellow-300 text-blue-950 font-black text-xs uppercase tracking-wider rounded-2xl shadow-xl transition-all hover:scale-105 active:scale-95 flex items-center gap-2 shrink-0 border-2 border-yellow-300"
            >
              <span>📥</span>
              <span>Download All My Receipts (PDF)</span>
            </button>
          )}
        </div>

        {/* Student Quick Summary Bar if selected */}
        {activeStudent && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 pt-8 border-t border-white/10">
            <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10">
              <p className="text-[10px] font-black uppercase tracking-wider text-yellow-300">Pupil / Student</p>
              <p className="text-lg font-black text-white mt-1 truncate">{activeStudent.name}</p>
              <p className="text-xs text-blue-200 font-bold">{activeStudent.grade} • ID: {activeStudent.id}</p>
            </div>

            <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10">
              <p className="text-[10px] font-black uppercase tracking-wider text-emerald-300">Approved Receipts</p>
              <p className="text-2xl font-black text-white mt-1">{confirmedPayments.length}</p>
              <p className="text-xs text-emerald-400 font-bold">Ready for download</p>
            </div>

            <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10">
              <p className="text-[10px] font-black uppercase tracking-wider text-amber-300">Proprietor Reviewing</p>
              <p className="text-2xl font-black text-white mt-1">{pendingPayments.length}</p>
              <p className="text-xs text-amber-300 font-bold">Awaiting approval</p>
            </div>

            <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10">
              <p className="text-[10px] font-black uppercase tracking-wider text-blue-200">Total Cleared</p>
              <p className="text-2xl font-black text-yellow-300 mt-1">₦{totalPaidConfirmed.toLocaleString()}</p>
              <p className="text-xs text-blue-300 font-bold">Verified payments</p>
            </div>
          </div>
        )}
      </div>

      {/* Student Selector / Lookup if not pre-selected or switching */}
      {!activeStudent && (
        <div className="bg-white rounded-3xl p-8 shadow-xl border-2 border-slate-100 max-w-xl mx-auto space-y-6 text-center">
          <div className="w-16 h-16 bg-blue-50 text-blue-900 rounded-2xl flex items-center justify-center mx-auto text-3xl font-black">
            👨‍🎓
          </div>
          <div>
            <h2 className="text-2xl font-serif font-black text-blue-950">
              Lookup Your Student Receipts
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Enter your Student ID (e.g. STU-1) or Full Name to access your official paid receipts
            </p>
          </div>

          <form onSubmit={handleStudentLookup} className="space-y-4 text-left">
            <div>
              <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-1.5">
                Student ID or Full Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. STU-1 or Samuel Adebayo"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold text-sm text-blue-950 focus:bg-white focus:border-blue-900 outline-none"
              />
            </div>

            {loginError && (
              <p className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-bold rounded-xl">
                {loginError}
              </p>
            )}

            <button
              type="submit"
              className="w-full py-4 bg-blue-900 hover:bg-blue-800 text-yellow-400 font-black text-xs uppercase tracking-wider rounded-xl shadow-lg transition-all"
            >
              View My School Fee Receipts →
            </button>
          </form>

          {/* Quick list of sample students */}
          <div className="pt-4 border-t border-slate-100 text-left">
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-2">
              Registered Students Quick Selection:
            </p>
            <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto">
              {students.map(s => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    setSelectedStudentId(s.id);
                    setSearchQuery(s.id);
                  }}
                  className="px-3 py-1.5 bg-slate-50 hover:bg-blue-50 hover:border-blue-300 border border-slate-200 rounded-lg text-xs font-bold text-blue-900 transition-all"
                >
                  {s.name} ({s.grade})
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Active Student Receipts Section */}
      {activeStudent && (
        <div className="space-y-6">
          {/* Header Bar with Switch Student Option */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Viewing Receipts For:
              </span>
              <h2 className="text-xl font-serif font-black text-blue-950">
                {activeStudent.name} <span className="text-blue-700 font-sans text-sm font-bold">({activeStudent.grade})</span>
              </h2>
            </div>

            <div className="flex items-center gap-3">
              {!currentStudent && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedStudentId(null);
                    setSearchQuery('');
                  }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs uppercase tracking-wider rounded-xl transition-all"
                >
                  Switch Student
                </button>
              )}
              {confirmedPayments.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowAllConsolidated(true)}
                  className="px-5 py-2.5 bg-blue-900 text-yellow-400 font-black text-xs uppercase tracking-wider rounded-xl shadow-md hover:bg-blue-800 transition-all flex items-center gap-2"
                >
                  <span>🖨️</span>
                  <span>Print All Receipts</span>
                </button>
              )}
            </div>
          </div>

          {/* Pending Review Notice Banner */}
          {pendingPayments.length > 0 && (
            <div className="p-6 bg-gradient-to-r from-amber-50 to-yellow-50 border-2 border-amber-300 rounded-3xl shadow-sm space-y-2">
              <div className="flex items-center gap-2 text-amber-900 font-black text-sm uppercase tracking-wide">
                <span className="text-xl animate-spin">⏳</span>
                <span>Payment is being reviewed by the proprietor ({pendingPayments.length} pending)</span>
              </div>
              <p className="text-xs text-amber-800 font-medium leading-relaxed">
                Your bank payment receipt picture/document has been received and is currently undergoing administrative and bursary verification by the school proprietor. As soon as the proprietor approves the receipt, the official stamped download button will be unlocked below.
              </p>
            </div>
          )}

          {/* Receipts List */}
          {studentPayments.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border-2 border-dashed border-slate-200 space-y-4">
              <div className="w-16 h-16 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center mx-auto text-3xl">
                🧾
              </div>
              <h3 className="text-xl font-serif font-black text-blue-950">
                No Payment Receipts Recorded Yet
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                There are no school fee payments recorded for {activeStudent.name}. You can make a direct bank transfer or online fee payment and submit the receipt for instant proprietor review.
              </p>
              <button
                type="button"
                onClick={onPayFees}
                className="px-6 py-3 bg-blue-900 text-yellow-400 font-black text-xs uppercase tracking-wider rounded-xl shadow-md hover:bg-blue-800 transition-all inline-flex items-center gap-2"
              >
                <span>💳 Pay Fees & Upload Bank Receipt</span>
              </button>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-6">
              {studentPayments.map((payment) => {
                const isConfirmed = payment.status === 'confirmed' || (!payment.status);
                const isPending = payment.status === 'pending';
                const isDeclined = payment.status === 'declined';

                const feeTypeName = payment.type === 'full'
                  ? 'Full Session Tuition Fee'
                  : payment.type === 'installment_1'
                  ? 'Term Fee - 1st Installment (50%)'
                  : payment.type === 'installment_2'
                  ? 'Term Fee - Final Installment (50%)'
                  : 'Terminal Result Clearance Fee';

                return (
                  <div
                    key={payment.id}
                    className={`bg-white rounded-3xl p-6 sm:p-7 shadow-lg border-2 transition-all space-y-5 relative overflow-hidden ${
                      isConfirmed 
                        ? 'border-emerald-200 hover:border-emerald-400' 
                        : isPending 
                        ? 'border-amber-200 hover:border-amber-400' 
                        : 'border-red-200 hover:border-red-400'
                    }`}
                  >
                    {/* Top Status & Date */}
                    <div className="flex justify-between items-start gap-2 border-b border-slate-100 pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-black text-blue-950">
                            {payment.id}
                          </span>
                          {payment.transactionRef && (
                            <span className="text-[10px] text-slate-400 font-bold">
                              Ref: {payment.transactionRef}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 font-bold mt-0.5">
                          {new Date(payment.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                      </div>

                      {/* Status Badge */}
                      {isConfirmed && (
                        <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full font-black text-[10px] uppercase tracking-wider flex items-center gap-1 border border-emerald-300">
                          <span>✓</span>
                          <span>Proprietor Approved</span>
                        </span>
                      )}
                      {isPending && (
                        <span className="px-3 py-1 bg-amber-100 text-amber-800 rounded-full font-black text-[10px] uppercase tracking-wider flex items-center gap-1 border border-amber-300 animate-pulse">
                          <span>⏳</span>
                          <span>Being Reviewed by Proprietor</span>
                        </span>
                      )}
                      {isDeclined && (
                        <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full font-black text-[10px] uppercase tracking-wider flex items-center gap-1 border border-red-300">
                          <span>✕</span>
                          <span>Declined</span>
                        </span>
                      )}
                    </div>

                    {/* Amount & Fee Title */}
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                        {feeTypeName}
                      </span>
                      <div className="flex items-baseline gap-2 mt-1">
                        <span className="text-3xl font-serif font-black text-blue-950">
                          ₦{payment.amount.toLocaleString()}
                        </span>
                        <span className="text-xs font-bold text-slate-500">
                          ({activeStudent.grade})
                        </span>
                      </div>
                    </div>

                    {/* Payment Details Box */}
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/60 text-xs space-y-1.5 text-slate-600">
                      {payment.payerName && (
                        <div className="flex justify-between">
                          <span className="text-slate-400 font-bold">Payer / Depositor:</span>
                          <span className="font-black text-blue-950">{payment.payerName}</span>
                        </div>
                      )}
                      {payment.bankName && (
                        <div className="flex justify-between">
                          <span className="text-slate-400 font-bold">Bank Name:</span>
                          <span className="font-bold text-slate-800">{payment.bankName}</span>
                        </div>
                      )}
                      {payment.reviewedBy && (
                        <div className="flex justify-between">
                          <span className="text-slate-400 font-bold">Verified By:</span>
                          <span className="font-bold text-emerald-800">{payment.reviewedBy}</span>
                        </div>
                      )}
                      {payment.receiptFileName && (
                        <div className="flex justify-between items-center pt-1 border-t border-slate-200">
                          <span className="text-slate-400 font-bold">Attached Document:</span>
                          <span className="font-bold text-blue-900 truncate max-w-[160px]">
                            📎 {payment.receiptFileName}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Pending Review Explanatory Notice */}
                    {isPending && (
                      <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-900 font-medium">
                        <strong>Proprietor Review Note:</strong> Your bank receipt is under verification. Once approved, the official printable receipt with school stamp will be ready for download here.
                      </div>
                    )}

                    {/* Declined Reason */}
                    {isDeclined && payment.adminNote && (
                      <div className="p-3 bg-red-50 rounded-xl border border-red-200 text-[11px] text-red-900">
                        <strong>Reason:</strong> {payment.adminNote}
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex flex-wrap gap-2 pt-2">
                      {isConfirmed ? (
                        <button
                          type="button"
                          onClick={() => setSelectedReceiptForPrint(payment)}
                          className="flex-1 py-3 px-4 bg-blue-900 hover:bg-blue-800 text-yellow-400 font-black text-xs uppercase tracking-wider rounded-xl shadow-md transition-all flex items-center justify-center gap-2 active:scale-95"
                        >
                          <span>📄</span>
                          <span>Download Official Receipt (PDF)</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled
                          className="flex-1 py-3 px-4 bg-slate-100 text-slate-400 font-bold text-xs uppercase tracking-wider rounded-xl cursor-not-allowed flex items-center justify-center gap-2"
                          title="Receipt will be downloadable once approved by the proprietor"
                        >
                          <span>⏳</span>
                          <span>Download Unlocks Upon Approval</span>
                        </button>
                      )}

                      {/* View Uploaded Proof button if image/file exists */}
                      {payment.receiptImage && (
                        <button
                          type="button"
                          onClick={() => setInspectedUploadProof(payment)}
                          className="py-3 px-4 bg-slate-100 hover:bg-slate-200 text-blue-900 font-black text-xs uppercase tracking-wider rounded-xl transition-all flex items-center gap-1.5"
                          title="View the bank payment slip/photo you uploaded"
                        >
                          <span>🖼️</span>
                          <span className="hidden sm:inline">View Proof</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SINGLE OFFICIAL STAMPED RECEIPT MODAL (READY FOR PDF/PRINT) */}
      {selectedReceiptForPrint && activeStudent && (
        <div className="fixed inset-0 z-50 bg-blue-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-10 shadow-2xl border-4 border-yellow-400 space-y-6 my-8 relative">
            {/* Modal Actions */}
            <div className="flex justify-between items-center border-b border-slate-200 pb-4 no-print">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-emerald-100 text-emerald-800 font-black text-[10px] uppercase rounded-full">
                  ✓ Official Stamped Receipt
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-blue-900 hover:bg-blue-800 text-yellow-400 font-black text-xs uppercase tracking-wider rounded-xl shadow-md transition-all flex items-center gap-1.5"
                >
                  <span>🖨️</span>
                  <span>Print / Save as PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedReceiptForPrint(null)}
                  className="w-9 h-9 rounded-full bg-slate-100 hover:bg-red-100 hover:text-red-700 text-slate-600 font-black flex items-center justify-center transition-all"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* PRINTABLE RECEIPT TEMPLATE */}
            <div className="receipt-print-area p-6 sm:p-8 border-2 border-blue-900 rounded-2xl bg-gradient-to-b from-blue-50/20 to-yellow-50/20 space-y-6 relative overflow-hidden text-blue-950 font-sans">
              {/* Watermark */}
              <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none select-none">
                <span className="text-8xl font-black font-serif text-blue-900 rotate-[-25deg]">
                  GOD'S HAND
                </span>
              </div>

              {/* Receipt Header */}
              <div className="flex items-start gap-4 border-b-2 border-blue-900 pb-5">
                <div className="w-16 h-16 rounded-2xl bg-white border-2 border-yellow-400 flex items-center justify-center p-1 shadow-sm shrink-0">
                  <img src="/logo.png" alt="Logo" className="max-h-full max-w-full object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                </div>
                <div className="flex-1 text-center sm:text-left">
                  <h3 className="text-xl sm:text-2xl font-serif font-black text-blue-950 uppercase tracking-tight">
                    God's Hand International Model School
                  </h3>
                  <p className="text-[10px] sm:text-xs font-black uppercase text-yellow-600 tracking-wider">
                    "Have Faith In God" • Academic Excellence & Moral Discipline
                  </p>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Wire & Cable, Apata, Ibadan, Oyo State • 📞 08056507252 / 07085596586
                  </p>
                </div>
              </div>

              {/* Receipt Title & Meta */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 bg-blue-900 text-white p-3.5 rounded-xl font-bold text-xs">
                <div>
                  <span className="text-[10px] text-yellow-400 uppercase font-black tracking-widest block">
                    OFFICIAL SCHOOL FEES RECEIPT
                  </span>
                  <span className="font-mono text-sm tracking-wider font-black">
                    {selectedReceiptForPrint.id}
                  </span>
                </div>
                <div className="text-right sm:text-right">
                  <span className="text-[10px] text-blue-200 uppercase font-bold block">Date of Issue:</span>
                  <span className="font-black text-xs">
                    {new Date(selectedReceiptForPrint.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </span>
                </div>
              </div>

              {/* Student & Payment Info Grid */}
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
                  <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider block">Student / Pupil Name</span>
                  <p className="font-black text-blue-950 text-sm">{activeStudent.name}</p>
                  <p className="text-slate-500 font-bold text-[11px]">ID: {activeStudent.id} • {activeStudent.grade}</p>
                </div>

                <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
                  <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider block">Payer / Bank Reference</span>
                  <p className="font-bold text-blue-950 truncate">{selectedReceiptForPrint.payerName || activeStudent.name}</p>
                  <p className="text-slate-500 text-[11px]">
                    {selectedReceiptForPrint.bankName || 'Bank Transfer'} • Ref: {selectedReceiptForPrint.transactionRef || selectedReceiptForPrint.id}
                  </p>
                </div>
              </div>

              {/* Financial Breakdown Table */}
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b-2 border-slate-300 text-left">
                    <th className="p-2.5 font-black uppercase text-slate-600">Description of Payment</th>
                    <th className="p-2.5 font-black uppercase text-slate-600">Term / Session</th>
                    <th className="p-2.5 font-black uppercase text-slate-600 text-right">Amount (₦)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  <tr className="bg-white">
                    <td className="p-3 font-bold text-blue-950">
                      {selectedReceiptForPrint.type === 'full' 
                        ? 'Full Session School Fees & Tuition' 
                        : selectedReceiptForPrint.type === 'installment_1' 
                        ? 'School Fees - 1st Installment (50%)' 
                        : selectedReceiptForPrint.type === 'installment_2' 
                        ? 'School Fees - Final Balance (50%)' 
                        : 'Terminal Assessment Clearance Fee'}
                    </td>
                    <td className="p-3 text-slate-600 font-medium">2025/2026 Academic Session</td>
                    <td className="p-3 font-black text-blue-950 text-right text-sm">
                      ₦{selectedReceiptForPrint.amount.toLocaleString()}
                    </td>
                  </tr>
                  <tr className="bg-yellow-50/60 font-black">
                    <td colSpan={2} className="p-3 text-right uppercase text-xs tracking-wider text-blue-950">
                      Total Amount Paid:
                    </td>
                    <td className="p-3 text-right text-base text-blue-950 font-serif">
                      ₦{selectedReceiptForPrint.amount.toLocaleString()}
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Amount in Words */}
              <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs">
                <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider block">
                  Amount in Words:
                </span>
                <p className="font-bold text-blue-950 italic mt-0.5">
                  {numberToWords(selectedReceiptForPrint.amount)}
                </p>
              </div>

              {/* Official Stamp & Signatures */}
              <div className="pt-4 border-t-2 border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-6">
                {/* School Bursary Official Stamp */}
                <div className="border-4 border-emerald-600 text-emerald-800 rounded-2xl p-3 text-center rotate-[-3deg] shadow-xs">
                  <p className="text-[9px] font-black uppercase tracking-widest">
                    GOD'S HAND INT'L MODEL SCHOOL
                  </p>
                  <p className="text-xs font-black uppercase tracking-wider text-emerald-700">
                    ★ BURSARY & PROPRIETOR VERIFIED ★
                  </p>
                  <p className="text-[9px] font-bold">
                    Cleared: {selectedReceiptForPrint.reviewedAt ? new Date(selectedReceiptForPrint.reviewedAt).toLocaleDateString() : new Date().toLocaleDateString()}
                  </p>
                </div>

                {/* Signatures */}
                <div className="flex gap-8 text-center text-xs">
                  <div>
                    <div className="w-28 border-b-2 border-slate-400 mb-1 h-6"></div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase">School Bursar</span>
                  </div>
                  <div>
                    <div className="w-28 border-b-2 border-blue-900 mb-1 h-6 font-serif italic text-blue-900 font-black">
                      Proprietor
                    </div>
                    <span className="text-[10px] font-black text-blue-950 uppercase">Proprietor / Director</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Bottom Print Actions */}
            <div className="flex justify-end gap-3 pt-2 no-print">
              <button
                type="button"
                onClick={() => setSelectedReceiptForPrint(null)}
                className="px-5 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-900"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-6 py-2.5 bg-blue-900 text-yellow-400 font-black text-xs uppercase tracking-wider rounded-xl shadow-md hover:bg-blue-800 transition-all flex items-center gap-2"
              >
                <span>🖨️</span>
                <span>Print / Save Receipt PDF</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONSOLIDATED STATEMENT / ALL RECEIPTS VIEW */}
      {showAllConsolidated && activeStudent && (
        <div className="fixed inset-0 z-50 bg-blue-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 sm:p-10 shadow-2xl border-4 border-yellow-400 space-y-6 my-8 relative">
            <div className="flex justify-between items-center border-b border-slate-200 pb-4 no-print">
              <div>
                <h3 className="font-serif font-black text-xl text-blue-950">
                  Consolidated Fee Receipts & Clearance Statement
                </h3>
                <p className="text-xs text-slate-500">
                  God's Hand International Model School • Official Bursary Record
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-blue-900 hover:bg-blue-800 text-yellow-400 font-black text-xs uppercase tracking-wider rounded-xl shadow-md flex items-center gap-1.5"
                >
                  <span>🖨️</span>
                  <span>Print Statement (PDF)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowAllConsolidated(false)}
                  className="w-9 h-9 rounded-full bg-slate-100 hover:bg-red-100 hover:text-red-700 text-slate-600 font-black flex items-center justify-center transition-all"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* PRINTABLE CONSOLIDATED STATEMENT */}
            <div className="receipt-print-area p-6 sm:p-8 border-2 border-blue-900 rounded-2xl bg-white space-y-6">
              {/* School Header */}
              <div className="text-center border-b-2 border-blue-900 pb-4 space-y-1">
                <h2 className="text-2xl font-serif font-black text-blue-950 uppercase">
                  God's Hand International Model School
                </h2>
                <p className="text-xs font-black uppercase text-yellow-600">
                  "Have Faith In God" • Wire & Cable, Apata, Ibadan, Oyo State
                </p>
                <p className="text-[11px] font-bold text-slate-500">
                  STUDENT OFFICIAL FINANCIAL STATEMENT & PAYMENT CLEARANCE
                </p>
              </div>

              {/* Student Details Banner */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-400 font-bold block">Student Name:</span>
                  <strong className="text-blue-950">{activeStudent.name}</strong>
                </div>
                <div>
                  <span className="text-slate-400 font-bold block">Student ID:</span>
                  <strong className="text-blue-950">{activeStudent.id}</strong>
                </div>
                <div>
                  <span className="text-slate-400 font-bold block">Current Grade:</span>
                  <strong className="text-blue-950">{activeStudent.grade}</strong>
                </div>
                <div>
                  <span className="text-slate-400 font-bold block">Date Generated:</span>
                  <strong className="text-blue-950">{new Date().toLocaleDateString('en-GB')}</strong>
                </div>
              </div>

              {/* All Payments Table */}
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-blue-900 text-white text-left">
                    <th className="p-2.5 font-bold uppercase text-[10px]">Receipt ID</th>
                    <th className="p-2.5 font-bold uppercase text-[10px]">Date</th>
                    <th className="p-2.5 font-bold uppercase text-[10px]">Description</th>
                    <th className="p-2.5 font-bold uppercase text-[10px]">Bank / Ref</th>
                    <th className="p-2.5 font-bold uppercase text-[10px]">Status</th>
                    <th className="p-2.5 font-bold uppercase text-[10px] text-right">Amount (₦)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {studentPayments.map((p) => {
                    const isConfirmed = p.status === 'confirmed' || (!p.status);
                    return (
                      <tr key={p.id} className="hover:bg-slate-50">
                        <td className="p-2.5 font-mono font-bold text-blue-950">{p.id}</td>
                        <td className="p-2.5 text-slate-600">{new Date(p.date).toLocaleDateString()}</td>
                        <td className="p-2.5 font-medium text-slate-800">
                          {p.type === 'full' ? 'Full Session Fee' : p.type === 'installment_1' ? '1st Installment' : p.type === 'installment_2' ? 'Final Installment' : 'Terminal Result Clearance'}
                        </td>
                        <td className="p-2.5 text-slate-500">{p.bankName || 'Direct'} ({p.transactionRef || 'N/A'})</td>
                        <td className="p-2.5">
                          {isConfirmed ? (
                            <span className="text-emerald-700 font-black">✓ Approved</span>
                          ) : (
                            <span className="text-amber-700 font-bold">⏳ Under Review</span>
                          )}
                        </td>
                        <td className="p-2.5 text-right font-black text-blue-950">
                          ₦{p.amount.toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-yellow-50 font-black border-t-2 border-blue-900">
                    <td colSpan={5} className="p-3 text-right uppercase text-blue-950">
                      Total Verified & Approved Payments:
                    </td>
                    <td className="p-3 text-right text-blue-950 font-serif text-sm">
                      ₦{totalPaidConfirmed.toLocaleString()}
                    </td>
                  </tr>
                </tfoot>
              </table>

              {/* Stamp */}
              <div className="pt-6 border-t-2 border-slate-200 flex justify-between items-center">
                <div className="border-2 border-emerald-600 text-emerald-800 rounded-xl p-2.5 text-center rotate-[-2deg]">
                  <p className="text-[8px] font-black uppercase">BURSARY VERIFIED</p>
                  <p className="text-[10px] font-black uppercase text-emerald-700">★ OFFICIAL CLEARANCE ★</p>
                </div>
                <div className="text-right text-xs">
                  <p className="font-serif italic font-black text-blue-950">Office of the Proprietor</p>
                  <p className="text-[10px] text-slate-500 uppercase">God's Hand International Model School</p>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2 no-print">
              <button
                type="button"
                onClick={() => setShowAllConsolidated(false)}
                className="px-5 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-900"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-6 py-2.5 bg-blue-900 text-yellow-400 font-black text-xs uppercase tracking-wider rounded-xl shadow-md"
              >
                🖨️ Print Statement
              </button>
            </div>
          </div>
        </div>
      )}

      {/* INSPECT UPLOADED PROOF MODAL */}
      {inspectedUploadProof && inspectedUploadProof.receiptImage && (
        <div className="fixed inset-0 z-50 bg-blue-950/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border-2 border-blue-900 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-serif font-black text-blue-950 text-base">
                  Uploaded Bank Receipt Proof
                </h3>
                <p className="text-xs text-slate-400 font-bold">
                  Reference: {inspectedUploadProof.id} • {inspectedUploadProof.receiptFileName || 'receipt_document'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setInspectedUploadProof(null)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 font-black flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <div className="max-h-[60vh] overflow-auto rounded-2xl bg-slate-50 border border-slate-200 p-2 flex items-center justify-center">
              {inspectedUploadProof.receiptImage.startsWith('data:application/pdf') ? (
                <div className="p-8 text-center space-y-2">
                  <span className="text-5xl">📄</span>
                  <p className="text-xs font-bold text-slate-700">PDF Document Attached</p>
                  <a
                    href={inspectedUploadProof.receiptImage}
                    download={inspectedUploadProof.receiptFileName || 'receipt.pdf'}
                    className="inline-block px-4 py-2 bg-blue-900 text-yellow-400 rounded-xl text-xs font-black"
                  >
                    Download PDF File
                  </a>
                </div>
              ) : (
                <img
                  src={inspectedUploadProof.receiptImage}
                  alt="Uploaded receipt"
                  className="max-h-[55vh] w-auto object-contain rounded-xl shadow-md"
                />
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setInspectedUploadProof(null)}
                className="px-6 py-2.5 bg-blue-900 text-yellow-400 font-black text-xs uppercase tracking-wider rounded-xl shadow-md"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
