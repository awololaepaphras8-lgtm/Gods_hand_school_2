
import React, { useState, useEffect } from 'react';
import { FeeStructure, GradeLevel, FeePayment, PaymentType } from '../types';
import { GRADE_GROUPS } from '../constants';

interface StudentPortalProps {
  fees: FeeStructure;
  existingPayments: FeePayment[];
  currentStudentId: string | null;
  currentStudentName: string | null;
  currentStudentGrade: GradeLevel | null;
  onSubmit: (payment: Omit<FeePayment, 'id' | 'date'>) => FeePayment;
  onBack: () => void;
}

export const StudentPortal: React.FC<StudentPortalProps> = ({ 
  fees, 
  existingPayments, 
  currentStudentId,
  currentStudentName,
  currentStudentGrade,
  onSubmit, 
  onBack 
}) => {
  const [step, setStep] = useState<'form' | 'payment' | 'success'>('form');
  const [name, setName] = useState(currentStudentName || '');
  const [email, setEmail] = useState('');
  const [grade, setGrade] = useState<GradeLevel>(currentStudentGrade || 'Primary 1');
  const [paymentType, setPaymentType] = useState<PaymentType>('full');
  const [refId, setRefId] = useState('');

  // Check if student has already paid the first installment
  const hasPaidFirst = existingPayments.some(p => p.type === 'installment_1');
  const hasPaidFull = existingPayments.some(p => p.type === 'full' || p.type === 'installment_2');

  useEffect(() => {
    if (hasPaidFirst && !hasPaidFull) {
      setPaymentType('installment_2');
    }
  }, [hasPaidFirst, hasPaidFull]);

  const totalFee = fees[grade];
  const amountToPay = paymentType === 'full' ? totalFee : totalFee / 2;

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    if (name && (currentStudentId || email) && grade) {
      setStep('payment');
    }
  };

  const handlePayment = () => {
    const payment = onSubmit({
      studentId: currentStudentId || 'GUEST',
      studentName: name,
      amount: amountToPay,
      grade: grade,
      type: paymentType
    });
    setRefId(payment.id);
    setStep('success');
  };

  return (
    <div className="max-w-2xl mx-auto">
      {step === 'form' && (
        <div className="bg-white rounded-3xl shadow-xl p-8 border border-blue-50">
          <button onClick={onBack} className="text-slate-400 hover:text-blue-900 flex items-center mb-8 transition-colors font-bold">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Hub
          </button>
          
          <div className="text-center mb-10">
            <h2 className="text-3xl font-black text-blue-900 mb-3 font-serif">Financial Portal</h2>
            <p className="text-slate-500 font-medium">
              {hasPaidFirst ? "Settle your remaining balance below." : "Securely pay your school fees online."}
            </p>
          </div>

          <form onSubmit={handleApply} className="space-y-8">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Student / Pupil Full Name</label>
                <input 
                  type="text" 
                  required
                  readOnly={!!currentStudentId}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={`w-full px-4 py-3 border-2 border-slate-100 rounded-xl font-bold outline-none transition-all ${currentStudentId ? 'bg-slate-50 text-slate-400' : 'bg-white text-blue-900 focus:border-blue-900'}`}
                />
              </div>
              {!currentStudentId && (
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Parent Email</label>
                  <input 
                    type="email" 
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-slate-100 rounded-xl font-bold text-blue-900 bg-white focus:border-blue-900 outline-none transition-all"
                    placeholder="parent@email.com"
                  />
                </div>
              )}
              {currentStudentId && (
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Student / Pupil Grade</label>
                  <div className="px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl font-black text-blue-900">
                    {grade}
                  </div>
                </div>
              )}
            </div>

            {!currentStudentId && (
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Select Target Grade</label>
                <select 
                  value={grade}
                  onChange={(e) => setGrade(e.target.value as GradeLevel)}
                  className="w-full px-4 py-4 border-2 border-slate-100 rounded-xl font-black text-blue-900 bg-white focus:border-blue-900 outline-none transition-all appearance-none"
                >
                  {GRADE_GROUPS.map(group => (
                    <optgroup key={group.name} label={group.name}>
                      {group.levels.map(level => (
                        <option key={level} value={level}>{level}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
            )}

            <div className="space-y-4">
              <label className="block text-xs font-black text-blue-900 uppercase tracking-widest">Select Payment Method</label>
              
              {!hasPaidFirst ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div 
                    onClick={() => setPaymentType('full')}
                    className={`p-6 rounded-2xl border-4 cursor-pointer transition-all ${paymentType === 'full' ? 'border-blue-900 bg-blue-50' : 'border-slate-50 bg-white hover:border-slate-200'}`}
                  >
                    <div className="flex justify-between items-center mb-4">
                       <span className="w-6 h-6 rounded-full border-4 border-white shadow-md bg-blue-900" style={{ opacity: paymentType === 'full' ? 1 : 0.2 }}></span>
                       <span className="bg-green-100 text-green-700 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">Full Payment</span>
                    </div>
                    <p className="font-black text-blue-900 text-xl">₦{totalFee.toLocaleString()}</p>
                    <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">Settle session at once</p>
                  </div>

                  <div 
                    onClick={() => setPaymentType('installment_1')}
                    className={`p-6 rounded-2xl border-4 cursor-pointer transition-all ${paymentType === 'installment_1' ? 'border-yellow-400 bg-yellow-50' : 'border-slate-50 bg-white hover:border-slate-200'}`}
                  >
                    <div className="flex justify-between items-center mb-4">
                       <span className="w-6 h-6 rounded-full border-4 border-white shadow-md bg-yellow-400" style={{ opacity: paymentType === 'installment_1' ? 1 : 0.2 }}></span>
                       <span className="bg-blue-100 text-blue-700 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter">Two-Time Payment (Part 1)</span>
                    </div>
                    <p className="font-black text-blue-900 text-xl">₦{(totalFee / 2).toLocaleString()}</p>
                    <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">50% Deposit Today</p>
                  </div>
                </div>
              ) : (
                <div className="p-8 bg-blue-900 rounded-3xl border-4 border-yellow-400 text-white relative overflow-hidden">
                  <div className="relative z-10">
                    <div className="flex justify-between items-center mb-4">
                       <span className="bg-yellow-400 text-blue-900 text-[10px] font-black px-3 py-1 rounded-full uppercase">Outstanding Balance</span>
                    </div>
                    <p className="font-black text-4xl mb-2">₦{(totalFee / 2).toLocaleString()}</p>
                    <p className="text-blue-200 text-xs font-bold">This completes your fee payment for the session.</p>
                  </div>
                  <div className="absolute top-0 right-0 p-4 opacity-10">
                    <svg className="w-24 h-24" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm4.59-12.42L10 14.17l-2.59-2.58L6 13l4 4 8-8z"/></svg>
                  </div>
                </div>
              )}
            </div>

            <button 
              type="submit"
              className="w-full py-5 bg-blue-900 text-yellow-400 font-black text-xl rounded-2xl shadow-2xl hover:bg-blue-800 transition-all transform hover:-translate-y-1"
            >
              Confirm Selection & Pay
            </button>
          </form>
        </div>
      )}

      {step === 'payment' && (
        <div className="bg-white rounded-3xl shadow-xl p-10 border border-blue-50 text-center">
          <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-blue-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
          </div>
          <h2 className="text-3xl font-black text-blue-900 mb-4 font-serif">Checkout Secure</h2>
          <div className="max-w-xs mx-auto text-left space-y-4 mb-10 bg-slate-50 p-6 rounded-2xl border border-slate-100">
            <div className="flex justify-between text-slate-500 font-bold text-xs uppercase tracking-widest">
              <span>Student / Pupil:</span>
              <span className="text-blue-900">{name}</span>
            </div>
            <div className="flex justify-between text-slate-500 font-bold text-xs uppercase tracking-widest">
              <span>Grade:</span>
              <span className="text-blue-900">{grade}</span>
            </div>
            <div className="flex justify-between text-slate-500 font-bold text-xs uppercase tracking-widest">
              <span>Type:</span>
              <span className="text-blue-900">
                {paymentType === 'full' ? 'Full Session' : paymentType === 'installment_1' ? '1st Half' : 'Final Half'}
              </span>
            </div>
            <div className="border-t border-slate-200 pt-4 flex justify-between text-blue-900 items-baseline">
              <span className="font-black uppercase text-[10px] tracking-[0.2em]">Total Due</span>
              <span className="font-black text-3xl">₦{amountToPay.toLocaleString()}</span>
            </div>
          </div>
          
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-8">
            Clicking pay simulates a secure banking transaction.
          </p>

          <div className="space-y-4">
            <button 
              onClick={handlePayment}
              className="w-full py-5 bg-green-600 text-white font-black text-xl rounded-2xl shadow-xl hover:bg-green-700 transition-all active:scale-95"
            >
              Authorize Payment
            </button>
            <button 
              onClick={() => setStep('form')}
              className="w-full py-4 text-slate-400 font-black text-xs uppercase tracking-widest hover:text-slate-800 transition-all"
            >
              Edit Details
            </button>
          </div>
        </div>
      )}

      {step === 'success' && (
        <div className="bg-white rounded-3xl shadow-xl p-12 border border-blue-50 text-center">
          <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-8 animate-bounce">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-4xl font-black text-blue-900 mb-4 font-serif">Payment Complete</h2>
          <p className="text-slate-500 font-bold mb-8 max-w-sm mx-auto uppercase text-xs tracking-widest">
            {paymentType === 'installment_1' 
              ? "First installment received. Balance settles the next session." 
              : "Account fully settled for the current session. God bless!"}
          </p>
          
          <div className="bg-blue-900 p-8 rounded-[2rem] mb-10 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-400 transform translate-x-16 -translate-y-16 rotate-45 opacity-20"></div>
            <p className="text-[10px] text-yellow-400 uppercase font-black tracking-[0.3em] mb-2">Digital Receipt Ref</p>
            <p className="text-3xl font-black text-white tracking-widest font-mono">{refId}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button 
              onClick={() => window.print()}
              className="py-4 bg-white text-blue-900 border-2 border-blue-900 font-black uppercase text-xs tracking-widest rounded-xl hover:bg-blue-50 transition-all"
            >
              Print Receipt
            </button>
            <button 
              onClick={onBack}
              className="py-4 bg-blue-900 text-yellow-400 font-black uppercase text-xs tracking-widest rounded-xl hover:bg-blue-800 transition-all"
            >
              Back to Hub
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
