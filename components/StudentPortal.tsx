import React, { useState, useEffect } from 'react';
import { FeeStructure, GradeLevel, FeePayment, PaymentType, SchoolBankAccountConfig } from '../types';
import { GRADE_GROUPS, DEFAULT_BANK_ACCOUNT_CONFIG } from '../constants';

interface StudentPortalProps {
  fees: FeeStructure;
  existingPayments: FeePayment[];
  currentStudentId: string | null;
  currentStudentName: string | null;
  currentStudentGrade: GradeLevel | null;
  onSubmit: (payment: Omit<FeePayment, 'id' | 'date'>) => FeePayment;
  onBack: () => void;
  onGoToReceipts?: () => void;
  bankAccountConfig?: SchoolBankAccountConfig;
}

export const StudentPortal: React.FC<StudentPortalProps> = ({ 
  fees, 
  existingPayments, 
  currentStudentId,
  currentStudentName,
  currentStudentGrade,
  onSubmit, 
  onBack,
  onGoToReceipts,
  bankAccountConfig = DEFAULT_BANK_ACCOUNT_CONFIG
}) => {
  const activeBank = bankAccountConfig || DEFAULT_BANK_ACCOUNT_CONFIG;
  // Step state: 'form' -> 'payment' (bank instructions) -> 'receipt_upload' (upload proof page) -> 'review_notice' ("Payment is being reviewed by the proprietor")
  const [step, setStep] = useState<'form' | 'payment' | 'receipt_upload' | 'review_notice'>('form');
  const [name, setName] = useState(currentStudentName || '');
  const [email, setEmail] = useState('');
  const [grade, setGrade] = useState<GradeLevel>(currentStudentGrade || 'Primary 1');
  const [paymentType, setPaymentType] = useState<PaymentType>('full');
  const [refId, setRefId] = useState('');

  // Receipt Upload Fields
  const [receiptImage, setReceiptImage] = useState<string>('');
  const [receiptFileName, setReceiptFileName] = useState<string>('');
  const [receiptFileType, setReceiptFileType] = useState<string>('');
  const [payerName, setPayerName] = useState(currentStudentName || '');
  const [bankName, setBankName] = useState(activeBank.bankName || 'First Bank of Nigeria');
  const [transactionRef, setTransactionRef] = useState('');
  const [studentNote, setStudentNote] = useState('');
  const [uploadError, setUploadError] = useState('');

  // Check if student has already paid the first installment
  const hasPaidFirst = existingPayments.some(p => p.type === 'installment_1');
  const hasPaidFull = existingPayments.some(p => p.type === 'full' || p.type === 'installment_2');

  useEffect(() => {
    if (hasPaidFirst && !hasPaidFull) {
      setPaymentType('installment_2');
    }
  }, [hasPaidFirst, hasPaidFull]);

  const totalFee = fees[grade] || 30000;
  const amountToPay = paymentType === 'full' ? totalFee : totalFee / 2;

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    if (name && (currentStudentId || email) && grade) {
      if (!payerName) setPayerName(name);
      setStep('payment');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError('');
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size limit: max 8MB
    if (file.size > 8 * 1024 * 1024) {
      setUploadError('File size exceeds 8MB limit. Please upload a smaller image or document.');
      return;
    }

    setReceiptFileName(file.name);
    setReceiptFileType(file.type);

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const result = uploadEvent.target?.result as string;
      setReceiptImage(result);
    };
    reader.onerror = () => {
      setUploadError('Failed to read file. Please try selecting the file again.');
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitReceiptProof = (e: React.FormEvent) => {
    e.preventDefault();
    setUploadError('');

    if (!receiptImage && !transactionRef) {
      setUploadError('Please select a picture/document of your bank receipt or enter your transfer reference number.');
      return;
    }

    const payment = onSubmit({
      studentId: currentStudentId || 'GUEST',
      studentName: name,
      amount: amountToPay,
      grade: grade,
      type: paymentType,
      status: 'pending',
      receiptImage: receiptImage || undefined,
      receiptFileName: receiptFileName || (transactionRef ? `ref_${transactionRef}.txt` : 'bank_receipt.jpg'),
      receiptFileType: receiptFileType || 'image/jpeg',
      receiptUploadedAt: new Date().toISOString(),
      bankName: bankName,
      payerName: payerName || name,
      transactionRef: transactionRef || `TRX-${Date.now().toString().slice(-6)}`,
      studentNote: studentNote || 'Bank fee receipt submitted for proprietor review.'
    });

    setRefId(payment.id);
    // Direct back to page showing "Payment is being reviewed by the proprietor"
    setStep('review_notice');
  };

  return (
    <div className="w-full max-w-2xl mx-auto py-2 sm:py-4 overflow-x-hidden animate-in fade-in duration-300">
      {/* STEP 1: INITIAL SELECTION FORM */}
      {step === 'form' && (
        <div className="bg-white rounded-3xl shadow-xl p-4 sm:p-8 lg:p-10 border border-blue-50 space-y-6 sm:space-y-8">
          <button 
            type="button"
            onClick={onBack} 
            className="text-slate-500 hover:text-blue-900 flex items-center transition-colors font-bold text-xs uppercase tracking-wider min-h-[44px] px-2 -ml-2 rounded-xl"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="break-words whitespace-normal">Back to Hub</span>
          </button>
          
          <div className="text-center space-y-2">
            <span className="inline-block px-3 py-1 bg-yellow-400 text-blue-950 font-black text-[10px] uppercase tracking-wider rounded-full break-words whitespace-normal">
              God's Hand Int'l Model School
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-blue-950 font-serif break-words">School Fees Portal</h2>
            <p className="text-slate-500 font-medium text-xs sm:text-sm break-words">
              {hasPaidFirst ? "Settle your remaining session balance below." : "Select your class and initiate school fee payment."}
            </p>
          </div>

          <form onSubmit={handleApply} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-2 break-words">
                  Student / Pupil Full Name *
                </label>
                <input 
                  type="text" 
                  required
                  readOnly={!!currentStudentId}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={`w-full min-h-[44px] px-4 py-3 border-2 border-slate-200 rounded-xl font-bold text-sm outline-none transition-all ${
                    currentStudentId ? 'bg-slate-50 text-slate-500' : 'bg-white text-blue-950 focus:border-blue-900'
                  }`}
                />
              </div>

              {!currentStudentId && (
                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-2 break-words">
                    Parent / Guardian Email *
                  </label>
                  <input 
                    type="email" 
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full min-h-[44px] px-4 py-3 border-2 border-slate-200 rounded-xl font-bold text-sm text-blue-950 bg-white focus:border-blue-900 outline-none transition-all"
                    placeholder="parent@email.com"
                  />
                </div>
              )}

              {currentStudentId && (
                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-2 break-words">
                    Enrolled Grade / Class
                  </label>
                  <div className="min-h-[44px] flex items-center px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl font-black text-blue-950 text-sm break-words">
                    {grade}
                  </div>
                </div>
              )}
            </div>

            {!currentStudentId && (
              <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-2 break-words">
                  Select Pupil / Student Grade *
                </label>
                <select 
                  value={grade}
                  onChange={(e) => setGrade(e.target.value as GradeLevel)}
                  className="w-full min-h-[44px] px-4 py-3 border-2 border-slate-200 rounded-xl font-black text-sm text-blue-950 bg-white focus:border-blue-900 outline-none transition-all"
                >
                  {GRADE_GROUPS.map(group => (
                    <optgroup key={group.name} label={group.name}>
                      {group.levels.map(level => (
                        <option key={level} value={level}>{level} — (₦{fees[level]?.toLocaleString() || 'N/A'})</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
            )}

            {/* Payment Type Selection */}
            <div className="space-y-3">
              <label className="block text-xs font-black text-blue-950 uppercase tracking-wider">
                Select Payment Structure
              </label>
              
              {!hasPaidFirst ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button 
                    type="button"
                    onClick={() => setPaymentType('full')}
                    className={`text-left w-full min-h-[44px] p-4 sm:p-5 rounded-2xl border-2 cursor-pointer transition-all ${
                      paymentType === 'full' 
                        ? 'border-blue-900 bg-blue-50/70 shadow-md' 
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex flex-wrap justify-between items-center gap-2 mb-3">
                       <span className="w-5 h-5 rounded-full border-4 border-white shadow bg-blue-900 shrink-0" style={{ opacity: paymentType === 'full' ? 1 : 0.2 }}></span>
                       <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                         Full Term
                       </span>
                    </div>
                    <p className="font-black text-blue-950 text-xl sm:text-2xl font-serif break-words">₦{totalFee.toLocaleString()}</p>
                    <p className="text-[11px] text-slate-500 font-bold mt-1 break-words">Complete term tuition clearance</p>
                  </button>

                  <button 
                    type="button"
                    onClick={() => setPaymentType('installment_1')}
                    className={`text-left w-full min-h-[44px] p-4 sm:p-5 rounded-2xl border-2 cursor-pointer transition-all ${
                      paymentType === 'installment_1' 
                        ? 'border-blue-900 bg-blue-50/70 shadow-md' 
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex flex-wrap justify-between items-center gap-2 mb-3">
                       <span className="w-5 h-5 rounded-full border-4 border-white shadow bg-blue-900 shrink-0" style={{ opacity: paymentType === 'installment_1' ? 1 : 0.2 }}></span>
                       <span className="bg-blue-100 text-blue-800 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                         1st Installment (50%)
                       </span>
                    </div>
                    <p className="font-black text-blue-950 text-xl sm:text-2xl font-serif break-words">₦{(totalFee / 2).toLocaleString()}</p>
                    <p className="text-[11px] text-slate-500 font-bold mt-1 break-words">Pay half now, balance later</p>
                  </button>
                </div>
              ) : (
                <div className="p-4 sm:p-5 rounded-2xl border-2 border-yellow-400 bg-yellow-50/50">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-yellow-800">
                        Second / Final Installment
                      </span>
                      <p className="text-xl sm:text-2xl font-black text-blue-950 font-serif mt-0.5">
                        ₦{(totalFee / 2).toLocaleString()}
                      </p>
                      <p className="text-xs text-slate-600 font-medium break-words">Finalizing full tuition payment</p>
                    </div>
                    <span className="px-3 py-1 bg-yellow-400 text-blue-950 font-black text-xs rounded-xl uppercase shrink-0">
                      50% Balance
                    </span>
                  </div>
                </div>
              )}
            </div>

            <button 
              type="submit"
              className="w-full min-h-[48px] py-3.5 px-4 bg-blue-900 hover:bg-blue-800 text-yellow-400 font-black text-sm sm:text-base uppercase tracking-wider rounded-2xl shadow-xl transition-all flex items-center justify-center gap-2 active:scale-95"
            >
              <span>Proceed to Checkout</span>
              <span>→</span>
            </button>
          </form>
        </div>
      )}

      {/* STEP 2: BANK PAYMENT DETAILS & INSTRUCTIONS */}
      {step === 'payment' && (
        <div className="bg-white rounded-3xl shadow-xl p-4 sm:p-8 lg:p-10 border border-blue-50 text-center space-y-6">
          <div className="w-16 h-16 bg-blue-100 text-blue-900 rounded-2xl flex items-center justify-center mx-auto text-3xl font-black">
            🏛️
          </div>

          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Official Bank Transfer Details
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-blue-950 font-serif mt-1">
              Transfer Fee to School Account
            </h2>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
              Please transfer the fee amount to the official school bank account below, then proceed to upload your receipt proof.
            </p>
          </div>

          {/* School Account Details Card */}
          <div className="bg-gradient-to-br from-blue-950 to-blue-900 text-white p-5 sm:p-6 rounded-2xl text-left space-y-3 shadow-lg border-2 border-yellow-400">
            <div className="flex flex-wrap justify-between items-start gap-2">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase text-yellow-400 tracking-wider">
                  Bank Name
                </p>
                <p className="text-base font-black break-words">{activeBank.bankName}</p>
              </div>
              <span className="px-2.5 py-1 bg-yellow-400 text-blue-950 font-black text-[9px] uppercase rounded-lg shrink-0">
                Official Account
              </span>
            </div>

            <div>
              <p className="text-[10px] font-black uppercase text-yellow-400 tracking-wider">
                Account Name
              </p>
              <p className="text-sm font-bold break-words">{activeBank.accountName}</p>
            </div>

            <div className="pt-2 border-t border-white/20 flex flex-wrap justify-between items-end gap-3">
              <div>
                <p className="text-[10px] font-black uppercase text-yellow-400 tracking-wider">
                  Account Number
                </p>
                <p className="text-xl sm:text-2xl font-mono font-black text-yellow-300 tracking-wider break-all">
                  {activeBank.accountNumber}
                </p>
              </div>
              <div className="sm:text-right">
                <p className="text-[10px] uppercase text-blue-200 font-bold">Amount to Transfer</p>
                <p className="text-lg sm:text-xl font-serif font-black text-white">
                  ₦{amountToPay.toLocaleString()}
                </p>
              </div>
            </div>

            {activeBank.paymentInstructions && (
              <div className="p-2.5 bg-black/30 rounded-xl text-[11px] text-yellow-200 italic border border-white/10 break-words">
                <strong>Transfer Guidance:</strong> {activeBank.paymentInstructions}
              </div>
            )}
          </div>

          {/* Summary pill */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs flex flex-wrap justify-between items-center gap-2 text-slate-600 text-left">
            <span className="font-bold break-words">Student: <strong className="text-blue-950">{name} ({grade})</strong></span>
            <span className="font-bold text-blue-900 shrink-0">{paymentType === 'full' ? 'Full Payment' : 'Installment'}</span>
          </div>

          {/* Actions */}
          <div className="space-y-3 pt-2">
            <button 
              type="button"
              onClick={() => setStep('receipt_upload')}
              className="w-full min-h-[48px] py-3.5 px-4 bg-yellow-400 hover:bg-yellow-300 text-blue-950 font-black text-xs sm:text-sm uppercase tracking-wider rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 active:scale-95"
            >
              <span className="break-words whitespace-normal">Proceed to Upload Bank Receipt Document</span>
              <span className="shrink-0">→</span>
            </button>

            <button 
              type="button"
              onClick={() => setStep('form')}
              className="w-full min-h-[44px] py-2.5 text-slate-500 font-bold text-xs uppercase tracking-wider hover:text-slate-700"
            >
              ← Edit Details
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: DEDICATED RECEIPT UPLOAD PAGE */}
      {step === 'receipt_upload' && (
        <div className="bg-white rounded-3xl shadow-xl p-4 sm:p-8 lg:p-10 border border-blue-50 space-y-6">
          <div className="flex flex-wrap justify-between items-center gap-3 border-b border-slate-100 pb-4">
            <div className="min-w-0">
              <span className="text-[10px] font-black uppercase tracking-wider text-blue-900 block">
                Step 2 of 2: Proof of Payment
              </span>
              <h2 className="text-xl sm:text-2xl font-serif font-black text-blue-950 break-words">
                Upload Bank Receipt / Document
              </h2>
            </div>
            <span className="px-3 py-1 bg-yellow-400 text-blue-950 font-black text-xs rounded-xl font-serif shrink-0">
              ₦{amountToPay.toLocaleString()}
            </span>
          </div>

          <p className="text-xs text-slate-600 font-medium leading-relaxed">
            Please attach a clear picture or PDF document of your bank deposit slip, mobile app transfer screenshot, or teller. The school proprietor will review and verify this document before granting your official stamped receipt download.
          </p>

          <form onSubmit={handleSubmitReceiptProof} className="space-y-5">
            {/* File Upload Drag & Drop Area */}
            <div>
              <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-2">
                Bank Receipt Picture or Document (JPG, PNG, PDF) *
              </label>

              <label className="border-2 border-dashed border-blue-200 hover:border-blue-400 bg-blue-50/40 rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer transition-all text-center group">
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={handleFileUpload}
                  className="hidden"
                />

                {receiptImage ? (
                  <div className="space-y-2">
                    {receiptFileType === 'application/pdf' ? (
                      <div className="text-center">
                        <span className="text-5xl block">📄</span>
                        <p className="text-xs font-black text-blue-950 mt-1">{receiptFileName}</p>
                        <p className="text-[10px] text-slate-400 uppercase font-bold">PDF Document Attached</p>
                      </div>
                    ) : (
                      <div className="relative inline-block">
                        <img
                          src={receiptImage}
                          alt="Receipt Preview"
                          className="max-h-40 rounded-xl shadow-md border-2 border-white object-contain"
                        />
                        <p className="text-xs font-bold text-blue-950 mt-1">{receiptFileName}</p>
                      </div>
                    )}
                    <span className="inline-block text-[11px] font-bold text-blue-700 underline group-hover:text-blue-900">
                      Click to choose another photo/document
                    </span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-900 flex items-center justify-center mx-auto text-2xl group-hover:scale-110 transition-transform">
                      📷
                    </div>
                    <p className="text-xs font-black text-blue-950">
                      Click to select picture or document of receipt
                    </p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">
                      Supports Camera Snapshots, Screenshots & PDF Files (Max 8MB)
                    </p>
                  </div>
                )}
              </label>
            </div>

            {/* Payer and Bank Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-1.5 break-words">
                  Payer / Depositor Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={payerName}
                  onChange={(e) => setPayerName(e.target.value)}
                  placeholder="e.g. Mr. Samuel Adebayo"
                  className="w-full min-h-[44px] px-4 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold text-xs text-blue-950 focus:bg-white focus:border-blue-900 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-1.5 break-words">
                  Sending Bank Name *
                </label>
                <input
                  type="text"
                  required
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  placeholder="e.g. First Bank, GTBank, OPay, Zenith"
                  className="w-full min-h-[44px] px-4 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold text-xs text-blue-950 focus:bg-white focus:border-blue-900 outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-1.5 break-words">
                  Transfer Ref / Teller / Session ID
                </label>
                <input
                  type="text"
                  value={transactionRef}
                  onChange={(e) => setTransactionRef(e.target.value)}
                  placeholder="e.g. FBN-192842 or 000013245"
                  className="w-full min-h-[44px] px-4 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold text-xs text-blue-950 focus:bg-white focus:border-blue-900 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-1.5 break-words">
                  Additional Note (Optional)
                </label>
                <input
                  type="text"
                  value={studentNote}
                  onChange={(e) => setStudentNote(e.target.value)}
                  placeholder="e.g. Payment for 1st Term fees"
                  className="w-full min-h-[44px] px-4 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold text-xs text-blue-950 focus:bg-white focus:border-blue-900 outline-none"
                />
              </div>
            </div>

            {uploadError && (
              <p className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-bold rounded-xl break-words">
                {uploadError}
              </p>
            )}

            {/* Submit Proof Button */}
            <div className="space-y-3 pt-2">
              <button
                type="submit"
                className="w-full min-h-[48px] py-3.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs sm:text-sm uppercase tracking-wider rounded-2xl shadow-xl transition-all flex items-center justify-center gap-2 active:scale-95"
              >
                <span className="break-words whitespace-normal">Submit Bank Receipt for Proprietor Review</span>
                <span className="shrink-0">✓</span>
              </button>

              <button
                type="button"
                onClick={() => setStep('payment')}
                className="w-full min-h-[44px] py-2.5 text-slate-500 font-bold text-xs uppercase tracking-wider hover:text-slate-700"
              >
                ← Back to Account Details
              </button>
            </div>
          </form>
        </div>
      )}

      {/* STEP 4: DIRECTED BACK TO PAGE SHOWING "payment is being reviewed by the proprietor" */}
      {step === 'review_notice' && (
        <div className="bg-white rounded-3xl shadow-xl p-4 sm:p-8 lg:p-10 border-2 border-amber-200 text-center space-y-6">
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center mx-auto text-3xl sm:text-4xl font-black animate-pulse">
            ⏳
          </div>

          <div className="space-y-2">
            <span className="inline-block px-3 py-1 bg-amber-100 text-amber-900 font-black text-[10px] uppercase rounded-full tracking-wider border border-amber-300 break-words whitespace-normal">
              Administrative Review In Progress
            </span>
            <h2 className="text-xl sm:text-3xl font-serif font-black text-blue-950 break-words">
              Payment is being reviewed by the proprietor
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto leading-relaxed font-medium break-words">
              Your bank payment receipt picture/document has been submitted successfully to the school administration. The proprietor is reviewing your document. Once approved, you will be able to download your official stamped school fee receipt.
            </p>
          </div>

          {/* Submission Details Card */}
          <div className="bg-gradient-to-br from-blue-950 to-blue-900 text-white p-4 sm:p-6 rounded-2xl text-left space-y-3 shadow-lg border-2 border-yellow-400">
            <div className="flex flex-wrap justify-between items-center gap-2 border-b border-white/20 pb-2.5">
              <span className="text-[10px] font-black uppercase text-yellow-400 tracking-wider">
                Submission Reference
              </span>
              <span className="font-mono text-sm font-black text-white break-all">{refId}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-[10px] text-blue-200 font-bold block">Pupil / Student</span>
                <strong className="text-white font-black break-words">{name}</strong>
              </div>
              <div>
                <span className="text-[10px] text-blue-200 font-bold block">Class / Grade</span>
                <strong className="text-white font-black break-words">{grade}</strong>
              </div>
              <div>
                <span className="text-[10px] text-blue-200 font-bold block">Amount Submitted</span>
                <strong className="text-yellow-300 font-serif text-base font-black">₦{amountToPay.toLocaleString()}</strong>
              </div>
              <div>
                <span className="text-[10px] text-blue-200 font-bold block">Bank / Ref</span>
                <span className="text-white font-bold break-words block">{bankName} ({transactionRef || 'Direct'})</span>
              </div>
            </div>

            {receiptFileName && (
              <div className="pt-2 border-t border-white/20 flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="text-[10px] text-blue-200 font-bold">Attached Document:</span>
                <span className="font-mono text-[11px] text-yellow-300 break-all">
                  📎 {receiptFileName}
                </span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="space-y-3 pt-2">
            {onGoToReceipts ? (
              <button 
                type="button"
                onClick={onGoToReceipts}
                className="w-full min-h-[48px] py-3.5 px-4 bg-blue-900 hover:bg-blue-800 text-yellow-400 font-black text-xs sm:text-sm uppercase tracking-wider rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 active:scale-95"
              >
                <span className="break-words whitespace-normal">📑 Go to My Receipts & Download Page</span>
                <span className="shrink-0">→</span>
              </button>
            ) : null}

            <button 
              type="button"
              onClick={onBack}
              className="w-full min-h-[44px] py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs uppercase tracking-wider rounded-xl transition-all"
            >
              Return to School Hub
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
