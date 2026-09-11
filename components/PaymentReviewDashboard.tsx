import React, { useState } from 'react';
import { FeePayment, PaymentStatus, StudentAccount, GradeLevel } from '../types';

interface PaymentReviewDashboardProps {
  payments: FeePayment[];
  students: StudentAccount[];
  onConfirmPayment: (paymentId: string, adminNote?: string) => void;
  onDeclinePayment: (paymentId: string, reason: string) => void;
  onConfirmAllPending: () => void;
  onAddChatMessage: (paymentId: string, message: string, sender: 'admin' | 'student') => void;
}

export const PaymentReviewDashboard: React.FC<PaymentReviewDashboardProps> = ({
  payments,
  students,
  onConfirmPayment,
  onDeclinePayment,
  onConfirmAllPending,
  onAddChatMessage
}) => {
  const [activeFilter, setActiveFilter] = useState<'all' | 'pending' | 'confirmed' | 'declined'>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedReceiptImage, setSelectedReceiptImage] = useState<{ url: string; title: string; ref: string } | null>(null);
  const [chatInputs, setChatInputs] = useState<{ [paymentId: string]: string }>({});
  const [declinePromptId, setDeclinePromptId] = useState<string | null>(null);
  const [declineReason, setDeclineReason] = useState('');
  const [actionSuccessMsg, setActionSuccessMsg] = useState('');

  // Quick stats
  const pendingPayments = payments.filter(p => p.status === 'pending');
  const confirmedPayments = payments.filter(p => p.status === 'confirmed' || (!p.status));
  const declinedPayments = payments.filter(p => p.status === 'declined');

  const totalPendingAmount = pendingPayments.reduce((sum, p) => sum + p.amount, 0);
  const totalConfirmedAmount = confirmedPayments.reduce((sum, p) => sum + p.amount, 0);

  // Filtered list
  const filteredPayments = payments.filter(p => {
    // Status filter
    if (activeFilter === 'pending' && p.status !== 'pending') return false;
    if (activeFilter === 'confirmed' && p.status !== 'confirmed' && p.status) return false;
    if (activeFilter === 'declined' && p.status !== 'declined') return false;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = p.studentName.toLowerCase().includes(q);
      const matchPayer = (p.payerName || '').toLowerCase().includes(q);
      const matchRef = (p.transactionRef || '').toLowerCase().includes(q) || p.id.toLowerCase().includes(q);
      const matchGrade = p.grade.toLowerCase().includes(q);
      const matchBank = (p.bankName || '').toLowerCase().includes(q);
      return matchName || matchPayer || matchRef || matchGrade || matchBank;
    }
    return true;
  });

  const handleSendMessage = (paymentId: string) => {
    const text = (chatInputs[paymentId] || '').trim();
    if (!text) return;
    onAddChatMessage(paymentId, text, 'admin');
    setChatInputs(prev => ({ ...prev, [paymentId]: '' }));
    showNotification('Message sent to student chat!');
  };

  const handleConfirmSingle = (paymentId: string, note?: string) => {
    onConfirmPayment(paymentId, note);
    showNotification('Payment verified & confirmed! Student account credited.');
  };

  const handleDeclineSubmit = (paymentId: string) => {
    if (!declineReason.trim()) {
      alert('Please enter a reason for declining this payment receipt.');
      return;
    }
    onDeclinePayment(paymentId, declineReason);
    setDeclinePromptId(null);
    setDeclineReason('');
    showNotification('Payment declined. Feedback sent to student portal.');
  };

  const handleConfirmAll = () => {
    if (pendingPayments.length === 0) {
      alert('No pending payment receipts to confirm.');
      return;
    }
    const confirmed = window.confirm(
      `Are you sure you want to verify and confirm ALL ${pendingPayments.length} pending payments (total ₦${totalPendingAmount.toLocaleString()}) for all students?`
    );
    if (confirmed) {
      onConfirmAllPending();
      showNotification(`All ${pendingPayments.length} pending payments have been confirmed for all students!`);
    }
  };

  const showNotification = (msg: string) => {
    setActionSuccessMsg(msg);
    setTimeout(() => {
      setActionSuccessMsg('');
    }, 4000);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header Banner & Stats */}
      <div className="bg-gradient-to-r from-blue-900 via-blue-950 to-indigo-950 text-white p-8 sm:p-10 rounded-[2.5rem] shadow-2xl relative overflow-hidden border-2 border-yellow-400/30">
        <div className="absolute top-0 right-0 w-80 h-80 bg-yellow-400/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 bg-yellow-400 text-blue-900 font-black text-[10px] uppercase rounded-full tracking-wider">
                Bursary & Accounts
              </span>
              <span className="text-blue-300 text-xs font-bold">
                Wire & Cable, Apata, Ibadan
              </span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black font-serif text-white">
              Payment Receipts Review Desk
            </h2>
            <p className="text-slate-300 text-sm mt-1 max-w-xl leading-relaxed">
              Review student fee receipts, bank transfer confirmations, and exchange notes before validating student balances and gate entry passes.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <button
              onClick={handleConfirmAll}
              disabled={pendingPayments.length === 0}
              className={`px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-wider shadow-xl transition-all flex items-center justify-center gap-2 ${
                pendingPayments.length > 0
                  ? 'bg-yellow-400 text-blue-900 hover:bg-yellow-300 hover:scale-105 active:scale-95'
                  : 'bg-slate-700 text-slate-400 cursor-not-allowed'
              }`}
            >
              <span>⚡</span>
              <span>Confirm All Pending ({pendingPayments.length})</span>
            </button>
          </div>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 pt-8 border-t border-white/10">
          <div className="bg-white/5 backdrop-blur-md p-4 rounded-2xl border border-white/10">
            <p className="text-[10px] font-black uppercase tracking-wider text-yellow-300">Pending Review</p>
            <p className="text-2xl font-black text-white mt-1">{pendingPayments.length}</p>
            <p className="text-xs text-yellow-400 font-bold mt-0.5">₦{totalPendingAmount.toLocaleString()}</p>
          </div>

          <div className="bg-white/5 backdrop-blur-md p-4 rounded-2xl border border-white/10">
            <p className="text-[10px] font-black uppercase tracking-wider text-green-300">Confirmed / Paid</p>
            <p className="text-2xl font-black text-white mt-1">{confirmedPayments.length}</p>
            <p className="text-xs text-green-400 font-bold mt-0.5">₦{totalConfirmedAmount.toLocaleString()}</p>
          </div>

          <div className="bg-white/5 backdrop-blur-md p-4 rounded-2xl border border-white/10">
            <p className="text-[10px] font-black uppercase tracking-wider text-red-300">Declined / Returned</p>
            <p className="text-2xl font-black text-white mt-1">{declinedPayments.length}</p>
            <p className="text-xs text-slate-300 font-bold mt-0.5">Action required</p>
          </div>

          <div className="bg-white/5 backdrop-blur-md p-4 rounded-2xl border border-white/10">
            <p className="text-[10px] font-black uppercase tracking-wider text-blue-200">Total Submissions</p>
            <p className="text-2xl font-black text-white mt-1">{payments.length}</p>
            <p className="text-xs text-blue-300 font-bold mt-0.5">Across all classes</p>
          </div>
        </div>
      </div>

      {/* Action Notification */}
      {actionSuccessMsg && (
        <div className="p-4 bg-green-100 border-2 border-green-300 text-green-900 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-between animate-in fade-in duration-200">
          <span>✓ {actionSuccessMsg}</span>
          <button onClick={() => setActionSuccessMsg('')} className="text-green-700 hover:text-green-900">✕</button>
        </div>
      )}

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 bg-white p-4 rounded-3xl shadow-sm border border-slate-100">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveFilter('pending')}
            className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
              activeFilter === 'pending'
                ? 'bg-blue-900 text-yellow-400 shadow-md'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
            }`}
          >
            <span>⏳ Pending Review</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] ${
              activeFilter === 'pending' ? 'bg-yellow-400 text-blue-900' : 'bg-amber-100 text-amber-800'
            }`}>
              {pendingPayments.length}
            </span>
          </button>

          <button
            onClick={() => setActiveFilter('confirmed')}
            className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
              activeFilter === 'confirmed'
                ? 'bg-blue-900 text-yellow-400 shadow-md'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
            }`}
          >
            <span>✅ Confirmed</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-200 text-slate-700">
              {confirmedPayments.length}
            </span>
          </button>

          <button
            onClick={() => setActiveFilter('declined')}
            className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
              activeFilter === 'declined'
                ? 'bg-blue-900 text-yellow-400 shadow-md'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
            }`}
          >
            <span>❌ Declined</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-200 text-slate-700">
              {declinedPayments.length}
            </span>
          </button>

          <button
            onClick={() => setActiveFilter('all')}
            className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
              activeFilter === 'all'
                ? 'bg-blue-900 text-yellow-400 shadow-md'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
            }`}
          >
            All ({payments.length})
          </button>
        </div>

        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            placeholder="Search by student, payer, bank, or ref ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2.5 pl-10 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs outline-none focus:border-blue-900 focus:bg-white transition-all text-blue-900"
          />
          <span className="absolute left-3 top-2.5 text-slate-400 text-sm">🔍</span>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 text-xs font-bold"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Receipts Review Feed */}
      {filteredPayments.length === 0 ? (
        <div className="bg-white rounded-3xl p-16 text-center border-2 border-dashed border-slate-200">
          <div className="text-5xl mb-4">📭</div>
          <h3 className="text-xl font-black text-blue-900 font-serif">No Payment Receipts Found</h3>
          <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-1">
            {activeFilter === 'pending'
              ? 'All submitted receipts have been reviewed and confirmed!'
              : 'No receipts match the current search or filter criteria.'}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredPayments.map((payment) => {
            const isPending = payment.status === 'pending';
            const isConfirmed = payment.status === 'confirmed' || (!payment.status);
            const isDeclined = payment.status === 'declined';
            const matchingStudent = students.find(s => s.id === payment.studentId || s.name.toLowerCase() === payment.studentName.toLowerCase());

            return (
              <div
                key={payment.id}
                className={`bg-white rounded-3xl p-6 sm:p-8 border-2 shadow-sm transition-all ${
                  isPending
                    ? 'border-amber-300 bg-amber-50/20 hover:border-amber-400 hover:shadow-md'
                    : isConfirmed
                    ? 'border-green-200 hover:border-green-300'
                    : 'border-red-200 bg-red-50/10'
                }`}
              >
                <div className="flex flex-col lg:flex-row justify-between items-start gap-6">
                  {/* Left: Student & Transaction Info */}
                  <div className="space-y-4 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-mono font-black text-slate-400 uppercase bg-slate-100 px-2.5 py-1 rounded-lg">
                        {payment.id}
                      </span>
                      <span className="text-xs font-black uppercase bg-blue-900 text-yellow-400 px-3 py-1 rounded-full">
                        {payment.grade}
                      </span>
                      {isPending && (
                        <span className="px-3 py-1 bg-amber-400 text-blue-900 font-black text-[10px] uppercase rounded-full animate-pulse flex items-center gap-1">
                          <span>⏳</span>
                          <span>Pending Admin Review</span>
                        </span>
                      )}
                      {isConfirmed && (
                        <span className="px-3 py-1 bg-green-100 text-green-800 font-black text-[10px] uppercase rounded-full flex items-center gap-1">
                          <span>✅</span>
                          <span>Confirmed & Cleared</span>
                        </span>
                      )}
                      {isDeclined && (
                        <span className="px-3 py-1 bg-red-100 text-red-800 font-black text-[10px] uppercase rounded-full flex items-center gap-1">
                          <span>❌</span>
                          <span>Declined</span>
                        </span>
                      )}
                      <span className="text-slate-400 text-xs font-bold ml-auto">
                        {new Date(payment.date).toLocaleString()}
                      </span>
                    </div>

                    <div>
                      <h4 className="text-2xl font-black text-blue-900 font-serif">
                        {payment.studentName}
                      </h4>
                      <p className="text-xs text-slate-500 font-bold mt-0.5">
                        Class: {payment.grade} {matchingStudent ? `• Student ID: ${matchingStudent.id}` : ''}
                      </p>
                    </div>

                    {/* Financial Meta Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Amount Paid</p>
                        <p className="text-lg font-black text-blue-900">₦{payment.amount.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Payment Purpose</p>
                        <p className="text-xs font-bold text-slate-700 capitalize">
                          {payment.type === 'full' ? 'Full Session' : payment.type === 'installment_1' ? '1st Installment' : '2nd Installment'}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Payer / Guardian</p>
                        <p className="text-xs font-bold text-slate-700 truncate">{payment.payerName || 'Not specified'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Bank / Ref</p>
                        <p className="text-xs font-bold text-slate-700 truncate" title={payment.transactionRef || payment.bankName || ''}>
                          {payment.bankName ? `${payment.bankName} - ` : ''}{payment.transactionRef || 'Direct Transfer'}
                        </p>
                      </div>
                    </div>

                    {/* Student Initial Note */}
                    {payment.studentNote && (
                      <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-xs font-medium text-blue-900">
                        <span className="font-black uppercase tracking-wider text-[10px] text-blue-600 block mb-0.5">
                          Student / Parent Note:
                        </span>
                        "{payment.studentNote}"
                      </div>
                    )}

                    {/* Decline note if any */}
                    {payment.adminNote && isDeclined && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-medium text-red-900">
                        <span className="font-black uppercase tracking-wider text-[10px] text-red-600 block mb-0.5">
                          Reason Declined:
                        </span>
                        "{payment.adminNote}"
                      </div>
                    )}
                  </div>

                  {/* Right: Receipt Image Thumbnail & Verification Action */}
                  <div className="w-full lg:w-72 space-y-4 shrink-0">
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest">
                      Payment Proof / Receipt
                    </p>

                    {payment.receiptImage ? (
                      <div
                        onClick={() => setSelectedReceiptImage({
                          url: payment.receiptImage!,
                          title: `${payment.studentName} - ₦${payment.amount.toLocaleString()}`,
                          ref: payment.transactionRef || payment.id
                        })}
                        className="group relative cursor-pointer overflow-hidden rounded-2xl border-2 border-slate-200 bg-slate-100 aspect-video sm:aspect-square max-h-48 flex items-center justify-center shadow-inner hover:border-blue-900 transition-all"
                      >
                        <img
                          src={payment.receiptImage}
                          alt="Bank Payment Receipt"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                        <div className="absolute inset-0 bg-blue-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white p-2 text-center">
                          <span className="text-2xl mb-1">🔍</span>
                          <span className="text-xs font-black uppercase tracking-wider">Inspect Full Receipt</span>
                        </div>
                      </div>
                    ) : (
                      <div className="p-6 bg-slate-100 rounded-2xl border-2 border-dashed border-slate-200 text-center text-slate-400">
                        <span className="text-2xl block mb-1">📄</span>
                        <p className="text-[10px] font-black uppercase">No image uploaded</p>
                        <p className="text-[10px] mt-1 font-mono">{payment.transactionRef || 'Ref: ' + payment.id}</p>
                      </div>
                    )}

                    {/* Action Controls */}
                    <div className="space-y-2">
                      {isPending && (
                        <>
                          <button
                            onClick={() => handleConfirmSingle(payment.id)}
                            className="w-full py-3.5 bg-green-600 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg hover:bg-green-700 transition-all flex items-center justify-center gap-1.5 hover:scale-[1.02] active:scale-[0.98]"
                          >
                            <span>✓</span>
                            <span>Confirm & Approve Payment</span>
                          </button>
                          <button
                            onClick={() => setDeclinePromptId(payment.id)}
                            className="w-full py-2.5 bg-red-50 text-red-600 hover:bg-red-100 font-black text-xs uppercase tracking-wider rounded-xl transition-all border border-red-200"
                          >
                            ✕ Decline / Return
                          </button>
                        </>
                      )}

                      {isConfirmed && (
                        <div className="space-y-2">
                          <div className="p-3 bg-green-50 border border-green-200 rounded-xl text-center">
                            <span className="text-xs font-black text-green-800 uppercase flex items-center justify-center gap-1">
                              <span>✓</span> Cleared for School Entry
                            </span>
                            {payment.reviewedAt && (
                              <p className="text-[10px] text-green-700 font-medium mt-0.5">
                                Verified: {new Date(payment.reviewedAt).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                          <button
                            onClick={() => {
                              if (window.confirm("Reopen this payment receipt for review?")) {
                                onConfirmPayment(payment.id, "Reopened for re-audit");
                              }
                            }}
                            className="w-full py-2 text-slate-400 hover:text-slate-600 font-bold text-[10px] uppercase"
                          >
                            Re-open Review
                          </button>
                        </div>
                      )}

                      {isDeclined && (
                        <button
                          onClick={() => handleConfirmSingle(payment.id, "Payment reconsidered and approved")}
                          className="w-full py-3 bg-blue-900 text-yellow-400 font-black text-xs uppercase tracking-wider rounded-xl shadow-md hover:bg-blue-800 transition-all"
                        >
                          Re-approve Payment
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Decline Prompt Modal / Expandable Box */}
                {declinePromptId === payment.id && (
                  <div className="mt-6 p-5 bg-red-50 border-2 border-red-200 rounded-2xl animate-in fade-in space-y-3">
                    <p className="text-xs font-black text-red-900 uppercase">
                      Decline Payment Receipt: Please provide a reason to the student
                    </p>
                    <textarea
                      rows={3}
                      value={declineReason}
                      onChange={(e) => setDeclineReason(e.target.value)}
                      placeholder="e.g. Receipt image is too blurry to read transaction reference. Kindly re-upload a clear screenshot or teller."
                      className="w-full p-3 bg-white border border-red-200 rounded-xl font-bold text-xs text-red-900 outline-none focus:ring-2 focus:ring-red-400"
                    />
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => { setDeclinePromptId(null); setDeclineReason(''); }}
                        className="px-4 py-2 bg-slate-200 text-slate-700 font-black text-[10px] uppercase rounded-xl"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleDeclineSubmit(payment.id)}
                        className="px-5 py-2 bg-red-600 text-white font-black text-[10px] uppercase rounded-xl shadow-md hover:bg-red-700"
                      >
                        Submit Decline
                      </button>
                    </div>
                  </div>
                )}

                {/* Chat & Verification Notes Thread */}
                <div className="mt-6 pt-6 border-t border-slate-100">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-black text-blue-900 uppercase tracking-wider flex items-center gap-1.5">
                      <span>💬</span>
                      <span>Review Discussion & Verification Notes ({payment.messages?.length || 0})</span>
                    </p>
                    <span className="text-[10px] text-slate-400 font-bold">
                      Visible in Student Portal
                    </span>
                  </div>

                  {/* Message History */}
                  <div className="space-y-2 mb-4 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                    {(!payment.messages || payment.messages.length === 0) ? (
                      <p className="text-[11px] text-slate-400 italic bg-slate-50 p-3 rounded-xl border border-slate-100">
                        No messages yet. Send a verification note or question to the student below.
                      </p>
                    ) : (
                      payment.messages.map((msg) => {
                        const isAdmin = msg.sender === 'admin';
                        return (
                          <div
                            key={msg.id}
                            className={`p-3 rounded-2xl text-xs max-w-xl ${
                              isAdmin
                                ? 'bg-blue-900 text-white ml-auto'
                                : 'bg-slate-100 text-slate-800 mr-auto'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-4 mb-1">
                              <span className={`text-[10px] font-black uppercase ${isAdmin ? 'text-yellow-400' : 'text-blue-900'}`}>
                                {msg.senderName} ({isAdmin ? 'Bursar / Admin' : 'Student / Parent'})
                              </span>
                              <span className={`text-[9px] ${isAdmin ? 'text-blue-200' : 'text-slate-400'}`}>
                                {msg.timestamp}
                              </span>
                            </div>
                            <p className="leading-relaxed font-medium">{msg.message}</p>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Quick Preset Reply Chips */}
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    <span className="text-[10px] font-bold text-slate-400 py-1 mr-1">Quick Notes:</span>
                    {[
                      'Bank transfer confirmed. Entry cleared!',
                      'Received 1st installment. Balance due before midterm.',
                      'Receipt image is unclear, please re-upload screenshot.',
                      'Transaction reference not matched yet with bank statement.'
                    ].map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setChatInputs(prev => ({ ...prev, [payment.id]: preset }))}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-blue-50 hover:text-blue-900 text-slate-600 text-[10px] font-bold rounded-lg transition-all"
                      >
                        {preset}
                      </button>
                    ))}
                  </div>

                  {/* Reply Input */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Type a message or verification note to student..."
                      value={chatInputs[payment.id] || ''}
                      onChange={(e) => setChatInputs(prev => ({ ...prev, [payment.id]: e.target.value }))}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleSendMessage(payment.id);
                        }
                      }}
                      className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs text-blue-900 outline-none focus:bg-white focus:border-blue-900"
                    />
                    <button
                      type="button"
                      onClick={() => handleSendMessage(payment.id)}
                      className="px-5 py-2.5 bg-blue-900 text-yellow-400 font-black text-xs uppercase rounded-xl hover:bg-blue-800 shadow-md transition-all shrink-0"
                    >
                      Send
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Full-Screen Receipt Inspection Modal */}
      {selectedReceiptImage && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-blue-950/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white rounded-[2.5rem] p-6 sm:p-8 max-w-2xl w-full relative shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-black text-blue-900 text-lg font-serif">
                  {selectedReceiptImage.title}
                </h3>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                  Reference: {selectedReceiptImage.ref}
                </p>
              </div>
              <button
                onClick={() => setSelectedReceiptImage(null)}
                className="w-10 h-10 rounded-full bg-slate-100 text-slate-600 hover:bg-red-100 hover:text-red-600 font-black text-lg flex items-center justify-center transition-all"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-auto rounded-2xl bg-slate-50 border-2 border-slate-100 p-2 flex items-center justify-center">
              <img
                src={selectedReceiptImage.url}
                alt="Receipt Inspection"
                className="max-h-[60vh] w-auto object-contain rounded-xl shadow-md"
              />
            </div>

            <div className="flex justify-between items-center pt-2">
              <span className="text-[10px] text-slate-400 font-bold uppercase">
                God's Hand International Model School Bursary Audit
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const win = window.open();
                    win?.document.write(`<img src="${selectedReceiptImage.url}" style="max-width:100%"/>`);
                    win?.print();
                  }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs uppercase rounded-xl transition-all"
                >
                  🖨️ Print Receipt
                </button>
                <button
                  onClick={() => setSelectedReceiptImage(null)}
                  className="px-6 py-2 bg-blue-900 text-yellow-400 font-black text-xs uppercase rounded-xl hover:bg-blue-800 transition-all shadow-md"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
