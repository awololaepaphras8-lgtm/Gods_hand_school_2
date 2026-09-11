import React, { useState } from 'react';
import { FeeStructure, StudentAccount, FeePayment, GradeLevel } from '../types';
import { GRADE_GROUPS } from '../constants';

interface StudentFeeCheckerProps {
  fees: FeeStructure;
  students: StudentAccount[];
  payments: FeePayment[];
  currentStudent: StudentAccount | null;
  isLoggedIn: boolean;
  onLogin: (emailOrId: string, pass: string) => boolean | void;
  onPayFees: () => void;
  onBack: () => void;
  onGoToRegister?: () => void;
}

export const StudentFeeChecker: React.FC<StudentFeeCheckerProps> = ({
  fees,
  students,
  payments,
  currentStudent,
  isLoggedIn,
  onLogin,
  onPayFees,
  onBack,
  onGoToRegister
}) => {
  const [loginInput, setLoginInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');
  const [selectedFeePreviewGrade, setSelectedFeePreviewGrade] = useState<GradeLevel>('Primary 1');
  const [isPrinting, setIsPrinting] = useState(false);

  const handleQuickLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    if (!loginInput.trim() || !passwordInput.trim()) {
      setLoginError('Please enter both your Student ID or Email and password.');
      return;
    }

    const res = onLogin(loginInput.trim(), passwordInput.trim());
    if (res === false) {
      setLoginError('Invalid credentials. Please check your Student ID/Email and password.');
    }
  };

  // If logged in, calculate metrics for the current student
  const studentPayments = currentStudent 
    ? payments.filter(p => p.studentId === currentStudent.id || p.studentName.toLowerCase() === currentStudent.name.toLowerCase())
    : [];

  const totalFee = currentStudent ? (fees[currentStudent.grade] || 0) : 0;
  const totalPaid = studentPayments.reduce((acc, p) => acc + p.amount, 0);
  const outstandingBalance = Math.max(0, totalFee - totalPaid);
  const paymentProgress = totalFee > 0 ? Math.min(100, Math.round((totalPaid / totalFee) * 100)) : (totalPaid > 0 ? 100 : 0);
  const isFullySettled = totalFee > 0 && totalPaid >= totalFee;
  const isPartiallySettled = totalPaid > 0 && totalPaid < totalFee;

  const handlePrint = () => {
    setIsPrinting(true);
    setTimeout(() => {
      window.print();
      setIsPrinting(false);
    }, 200);
  };

  return (
    <div className="max-w-5xl mx-auto py-10 px-4 sm:px-6">
      {/* Top Header Card */}
      <div className="bg-white rounded-[2.5rem] shadow-2xl border-4 border-blue-900 overflow-hidden mb-8">
        <div className="bg-blue-900 px-8 py-10 text-white relative">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
            <div className="flex items-center space-x-5">
              <div className="w-20 h-20 bg-white rounded-full border-2 border-yellow-400 shadow-xl overflow-hidden shrink-0 flex items-center justify-center">
                <img 
                  src="/logo.png" 
                  alt="God's Hand International Model School Logo" 
                  className="w-[80%] h-[80%] object-contain rounded-full"
                  onError={(e) => { e.currentTarget.src = 'hands.jpg'; }}
                />
              </div>
              <div>
                <span className="px-3 py-1 bg-yellow-400 text-blue-900 font-black text-[10px] uppercase tracking-widest rounded-full">
                  Official Bursary Portal
                </span>
                <h1 className="text-2xl sm:text-3xl font-black font-serif mt-1">Students & Pupils Fee Checker</h1>
                <p className="text-xs text-blue-200 uppercase font-black tracking-widest mt-0.5">
                  God's Hand International Model School • Have Faith In God
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

        {/* Content Body */}
        <div className="p-8 sm:p-12">
          {!isLoggedIn || !currentStudent ? (
            /* NON-LOGGED-IN STATE */
            <div className="space-y-12">
              <div className="grid md:grid-cols-12 gap-10 items-start">
                {/* Login Prompt Box */}
                <div className="md:col-span-6 bg-slate-50 p-8 sm:p-10 rounded-3xl border-2 border-slate-200">
                  <div className="flex items-center space-x-3 mb-4">
                    <span className="p-2.5 bg-blue-900 text-yellow-400 rounded-xl text-xl font-black">🔐</span>
                    <div>
                      <h2 className="text-xl font-black text-blue-900 font-serif">Student & Pupil Verification</h2>
                      <p className="text-xs text-slate-500 font-bold">Sign in to check your individual fee status & balance</p>
                    </div>
                  </div>

                  {loginError && (
                    <div className="p-4 mb-6 bg-red-50 border-2 border-red-200 text-red-600 rounded-2xl text-xs font-bold animate-shake">
                      {loginError}
                    </div>
                  )}

                  <form onSubmit={handleQuickLogin} className="space-y-5">
                    <div>
                      <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">
                        Student / Pupil ID or Registered Email
                      </label>
                      <input 
                        type="text" 
                        required
                        value={loginInput}
                        onChange={(e) => setLoginInput(e.target.value)}
                        placeholder="e.g. GHS-2024-001 or pupil@domain.com"
                        className="w-full px-5 py-3.5 bg-white border-2 border-slate-200 rounded-2xl font-bold text-blue-900 outline-none focus:border-blue-900 transition-colors"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">
                        Account Password
                      </label>
                      <input 
                        type="password" 
                        required
                        value={passwordInput}
                        onChange={(e) => setPasswordInput(e.target.value)}
                        placeholder="••••••••"
                        className="w-full px-5 py-3.5 bg-white border-2 border-slate-200 rounded-2xl font-bold text-blue-900 outline-none focus:border-blue-900 transition-colors"
                      />
                    </div>

                    <button 
                      type="submit"
                      className="w-full py-4 bg-blue-900 text-yellow-400 font-black text-sm uppercase tracking-widest rounded-2xl shadow-xl hover:bg-blue-800 transition-all active:scale-[0.99]"
                    >
                      Login & Check My Fees →
                    </button>
                  </form>

                  <div className="mt-6 pt-6 border-t border-slate-200 text-center">
                    <p className="text-xs text-slate-500 font-bold">
                      Don't have a student or pupil account yet?{' '}
                      <button 
                        type="button" 
                        onClick={onGoToRegister || onBack}
                        className="text-blue-900 underline font-black hover:text-yellow-600"
                      >
                        Register or Enroll here
                      </button>
                    </p>
                  </div>
                </div>

                {/* Information Card & Class Tuition Preview */}
                <div className="md:col-span-6 space-y-6">
                  <div className="bg-blue-50/70 p-8 rounded-3xl border-2 border-blue-100">
                    <h3 className="text-lg font-black text-blue-900 mb-2 font-serif flex items-center gap-2">
                      <span>ℹ️</span> Why Check Your Fees Online?
                    </h3>
                    <p className="text-xs text-slate-600 font-medium leading-relaxed mb-4">
                      Our real-time school fee verification system keeps parents, students, and pupils fully updated on term fees, installment payments, receipt IDs, and school entry clearance passes.
                    </p>
                    <ul className="space-y-2 text-xs font-bold text-blue-900">
                      <li className="flex items-center"><span className="text-green-600 mr-2 font-black">✓</span> View verified school fee schedule per class</li>
                      <li className="flex items-center"><span className="text-green-600 mr-2 font-black">✓</span> Check remaining balance and payment deadlines</li>
                      <li className="flex items-center"><span className="text-green-600 mr-2 font-black">✓</span> Access and print official Bursary receipts</li>
                      <li className="flex items-center"><span className="text-green-600 mr-2 font-black">✓</span> Verify gate & classroom entry clearance</li>
                    </ul>
                  </div>

                  <div className="bg-white p-6 rounded-3xl border-2 border-slate-200 shadow-sm">
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">
                        Preview Approved Class Fees
                      </h4>
                      <select 
                        value={selectedFeePreviewGrade} 
                        onChange={(e) => setSelectedFeePreviewGrade(e.target.value as GradeLevel)}
                        className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black text-blue-900 outline-none"
                      >
                        {GRADE_GROUPS.flatMap(g => g.levels).map(lvl => (
                          <option key={lvl} value={lvl}>{lvl}</option>
                        ))}
                      </select>
                    </div>
                    <div className="p-5 bg-yellow-50 rounded-2xl border border-yellow-200 flex justify-between items-center">
                      <div>
                        <p className="text-xs font-black text-yellow-900">{selectedFeePreviewGrade} Term Fee</p>
                        <p className="text-[10px] text-yellow-700 font-bold">Standard tuition & academic levies</p>
                      </div>
                      <p className="text-2xl font-black text-blue-900 font-serif">
                        ₦{(fees[selectedFeePreviewGrade] || 0).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Master School Fee Schedule Table */}
              <div className="mt-10">
                <h3 className="text-xl font-black text-blue-900 font-serif mb-4">
                  Master Approved Fee Schedule by Division
                </h3>
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {GRADE_GROUPS.map(group => (
                    <div key={group.name} className="p-6 bg-slate-50 rounded-2xl border border-slate-200">
                      <h4 className="font-black text-blue-900 text-sm mb-3 pb-2 border-b border-slate-200">{group.name}</h4>
                      <div className="space-y-2">
                        {group.levels.map(lvl => (
                          <div key={lvl} className="flex justify-between items-center text-xs">
                            <span className="text-slate-600 font-bold">{lvl}</span>
                            <span className="font-black text-blue-900 font-serif">₦{(fees[lvl] || 0).toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* LOGGED-IN STUDENT STATE */
            <div className="space-y-10">
              {/* Student Identification Banner */}
              <div className="bg-gradient-to-r from-blue-900 to-indigo-900 p-8 rounded-3xl text-white shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="flex items-center space-x-5">
                  <div className="w-16 h-16 bg-yellow-400 text-blue-900 rounded-2xl flex items-center justify-center font-black text-2xl font-serif shadow-lg">
                    {currentStudent.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-3">
                      <h2 className="text-2xl font-black font-serif">{currentStudent.name}</h2>
                      <span className="px-3 py-0.5 bg-yellow-400 text-blue-900 text-[10px] font-black rounded-full uppercase">
                        {currentStudent.grade}
                      </span>
                    </div>
                    <p className="text-xs text-blue-200 font-bold mt-1">
                      Student/Pupil ID: <span className="text-white font-mono">{currentStudent.id}</span> • Email: {currentStudent.email}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <div className="text-right">
                    <span className="text-[10px] font-black uppercase tracking-widest text-blue-200 block">Clearance Status</span>
                    {isFullySettled ? (
                      <span className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-green-500/20 border border-green-400 text-green-300 rounded-full text-xs font-black uppercase">
                        <span>✓</span> Fees Settled
                      </span>
                    ) : isPartiallySettled ? (
                      <span className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-yellow-500/20 border border-yellow-400 text-yellow-300 rounded-full text-xs font-black uppercase">
                        <span>⏳</span> Installment Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-red-500/20 border border-red-400 text-red-300 rounded-full text-xs font-black uppercase">
                        <span>⚠️</span> Unpaid
                      </span>
                    )}
                  </div>

                  <button 
                    onClick={handlePrint}
                    className="px-4 py-2 bg-white text-blue-900 hover:bg-yellow-400 rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-md flex items-center gap-2"
                  >
                    <span>🖨️</span> Print Slip
                  </button>
                </div>
              </div>

              {/* Financial Metrics Bento Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="p-6 bg-slate-50 rounded-3xl border-2 border-slate-200">
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Official Term Fee</p>
                  <p className="text-3xl font-black text-blue-900 font-serif">₦{totalFee.toLocaleString()}</p>
                  <p className="text-[10px] text-slate-500 font-bold mt-2">Prescribed for {currentStudent.grade}</p>
                </div>

                <div className="p-6 bg-green-50 rounded-3xl border-2 border-green-200">
                  <p className="text-xs font-black text-green-700 uppercase tracking-widest mb-1">Total Paid</p>
                  <p className="text-3xl font-black text-green-700 font-serif">₦{totalPaid.toLocaleString()}</p>
                  <p className="text-[10px] text-green-600 font-bold mt-2">{studentPayments.length} verified transaction(s)</p>
                </div>

                <div className={`p-6 rounded-3xl border-2 ${outstandingBalance > 0 ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200'}`}>
                  <p className={`text-xs font-black uppercase tracking-widest mb-1 ${outstandingBalance > 0 ? 'text-red-600' : 'text-blue-900'}`}>
                    Outstanding Balance
                  </p>
                  <p className={`text-3xl font-black font-serif ${outstandingBalance > 0 ? 'text-red-600' : 'text-blue-900'}`}>
                    ₦{outstandingBalance.toLocaleString()}
                  </p>
                  <p className={`text-[10px] font-bold mt-2 ${outstandingBalance > 0 ? 'text-red-500' : 'text-blue-700'}`}>
                    {outstandingBalance > 0 ? 'Balance due this term' : 'No balance due'}
                  </p>
                </div>

                <div className="p-6 bg-yellow-50 rounded-3xl border-2 border-yellow-200">
                  <div className="flex justify-between items-center mb-1">
                    <p className="text-xs font-black text-yellow-900 uppercase tracking-widest">Settlement</p>
                    <span className="text-xs font-black text-yellow-900">{paymentProgress}%</span>
                  </div>
                  <div className="w-full h-3 bg-yellow-200 rounded-full overflow-hidden my-2">
                    <div className="h-full bg-blue-900 rounded-full transition-all duration-700" style={{ width: `${paymentProgress}%` }}></div>
                  </div>
                  <p className="text-[10px] text-yellow-800 font-bold">
                    {currentStudent.entryAllowed ? '✓ Gate entry allowed' : 'Entry requires fee clearance'}
                  </p>
                </div>
              </div>

              {/* Outstanding Balance Banner & Action */}
              {outstandingBalance > 0 && (
                <div className="p-6 bg-amber-50 rounded-3xl border-2 border-amber-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <span className="text-3xl">⚠️</span>
                    <div>
                      <h3 className="text-base font-black text-amber-900 font-serif">Outstanding Tuition Notice</h3>
                      <p className="text-xs text-amber-700 font-medium">
                        You have a remaining balance of <strong className="font-bold">₦{outstandingBalance.toLocaleString()}</strong>. Settle via the online payment portal or bursar office.
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={onPayFees}
                    className="px-6 py-3 bg-blue-900 hover:bg-blue-800 text-yellow-400 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shrink-0 active:scale-95"
                  >
                    Pay Balance (₦{outstandingBalance.toLocaleString()}) →
                  </button>
                </div>
              )}

              {/* Fee Component Breakdown */}
              <div>
                <h3 className="text-xl font-black text-blue-900 font-serif mb-4">Official Fee Breakdown Schedule</h3>
                <div className="bg-slate-50 rounded-3xl border-2 border-slate-200 overflow-hidden shadow-sm">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-100 text-slate-500 text-[10px] font-black uppercase tracking-widest">
                        <th className="px-6 py-4">Fee Item Component</th>
                        <th className="px-6 py-4">Category</th>
                        <th className="px-6 py-4">Allocation</th>
                        <th className="px-6 py-4 text-right">Amount (₦)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-xs font-bold text-slate-700">
                      <tr>
                        <td className="px-6 py-4 text-blue-900 font-black">Tuition & Academic Instructions</td>
                        <td className="px-6 py-4 text-slate-500">Core Academics</td>
                        <td className="px-6 py-4">60%</td>
                        <td className="px-6 py-4 text-right font-black text-blue-900 font-serif">
                          ₦{Math.round(totalFee * 0.60).toLocaleString()}
                        </td>
                      </tr>
                      <tr>
                        <td className="px-6 py-4 text-blue-900 font-black">Continuous Assessment & Examination</td>
                        <td className="px-6 py-4 text-slate-500">Examinations</td>
                        <td className="px-6 py-4">15%</td>
                        <td className="px-6 py-4 text-right font-black text-blue-900 font-serif">
                          ₦{Math.round(totalFee * 0.15).toLocaleString()}
                        </td>
                      </tr>
                      <tr>
                        <td className="px-6 py-4 text-blue-900 font-black">ICT, Digital Library & E-Learning Portal</td>
                        <td className="px-6 py-4 text-slate-500">Technology</td>
                        <td className="px-6 py-4">10%</td>
                        <td className="px-6 py-4 text-right font-black text-blue-900 font-serif">
                          ₦{Math.round(totalFee * 0.10).toLocaleString()}
                        </td>
                      </tr>
                      <tr>
                        <td className="px-6 py-4 text-blue-900 font-black">School Facilities & Development Levy</td>
                        <td className="px-6 py-4 text-slate-500">Infrastructure</td>
                        <td className="px-6 py-4">10%</td>
                        <td className="px-6 py-4 text-right font-black text-blue-900 font-serif">
                          ₦{Math.round(totalFee * 0.10).toLocaleString()}
                        </td>
                      </tr>
                      <tr>
                        <td className="px-6 py-4 text-blue-900 font-black">Health, Sports & Extra-Curriculars</td>
                        <td className="px-6 py-4 text-slate-500">Students & Pupils Welfare</td>
                        <td className="px-6 py-4">5%</td>
                        <td className="px-6 py-4 text-right font-black text-blue-900 font-serif">
                          ₦{Math.round(totalFee * 0.05).toLocaleString()}
                        </td>
                      </tr>
                      <tr className="bg-blue-50/70 font-black text-sm">
                        <td colSpan={3} className="px-6 py-4 text-blue-900 uppercase tracking-widest font-black">
                          Total Approved Term Tuition
                        </td>
                        <td className="px-6 py-4 text-right text-blue-900 font-black font-serif text-base">
                          ₦{totalFee.toLocaleString()}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Payment Receipts & Transaction Log */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-black text-blue-900 font-serif">Payment & Receipt History</h3>
                  <span className="text-xs font-black text-slate-400 uppercase tracking-widest">
                    {studentPayments.length} Recorded Payment(s)
                  </span>
                </div>

                <div className="bg-white rounded-3xl border-2 border-slate-200 overflow-hidden shadow-sm">
                  {studentPayments.length === 0 ? (
                    <div className="p-12 text-center">
                      <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-3xl mx-auto mb-3">
                        🧾
                      </div>
                      <p className="text-sm font-black text-blue-900 uppercase">No payment receipts on record yet</p>
                      <p className="text-xs text-slate-400 font-medium mt-1">Make an online fee payment to populate your statement.</p>
                      <button 
                        onClick={onPayFees}
                        className="mt-6 px-6 py-3 bg-blue-900 text-yellow-400 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-blue-800 transition-all"
                      >
                        Make Fee Payment Now →
                      </button>
                    </div>
                  ) : (
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-widest">
                          <th className="px-6 py-4">Receipt ID</th>
                          <th className="px-6 py-4">Date Recorded</th>
                          <th className="px-6 py-4">Payment Plan</th>
                          <th className="px-6 py-4">Status</th>
                          <th className="px-6 py-4 text-right">Amount Paid</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs font-bold text-slate-700">
                        {studentPayments.map((payment) => (
                          <tr key={payment.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-6 py-4 font-mono font-black text-blue-900">{payment.id}</td>
                            <td className="px-6 py-4 text-slate-500">{new Date(payment.date).toLocaleDateString()}</td>
                            <td className="px-6 py-4">
                              <span className="px-2.5 py-1 bg-blue-100 text-blue-900 rounded-lg text-[10px] font-black uppercase">
                                {payment.type === 'full' ? 'Full Payment' : payment.type === 'installment_1' ? '1st Installment (50%)' : '2nd Installment (50%)'}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span className="inline-flex items-center text-green-600 font-black text-[10px] uppercase tracking-widest">
                                <span className="w-2 h-2 rounded-full bg-green-500 mr-1.5"></span> Verified
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right font-black text-blue-900 font-serif text-sm">
                              ₦{payment.amount.toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
