import React, { useState } from 'react';
import { StudentAccount, FeePayment } from '../types';
import { 
  RESULT_FEE_AMOUNT_NAIRA, 
  RESULT_FEE_AMOUNT_KOBO, 
  getPaystackPublicKey,
  buildResultFeePaymentPayload,
  VACATION_HARD_COPY_ASSURANCE_NOTE
} from '../utils/resultFeeService';
import { PaystackButton } from 'react-paystack';

interface PaystackResultFeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: StudentAccount;
  term: string;
  session?: string;
  payerName?: string;
  payerEmail?: string;
  onSuccess: (paymentRecord: Omit<FeePayment, 'id' | 'date'>) => void;
  fallbackPublicKey?: string;
  feeAmount?: number;
}

export const PaystackResultFeeModal: React.FC<PaystackResultFeeModalProps> = ({
  isOpen,
  onClose,
  student,
  term,
  session = '2025/2026 Academic Session',
  payerName,
  payerEmail,
  onSuccess,
  fallbackPublicKey,
  feeAmount
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [customEmail, setCustomEmail] = useState(
    payerEmail || student.parentEmail || student.email || `${student.id.toLowerCase().replace(/[^a-z0-9]/g, '')}@godshand.edu.ng`
  );
  const [customPayerName, setCustomPayerName] = useState(payerName || `${student.name}'s Guardian`);

  if (!isOpen) return null;

  const finalFeeAmount = feeAmount && feeAmount > 0 ? feeAmount : RESULT_FEE_AMOUNT_NAIRA;
  const finalFeeKobo = finalFeeAmount * 100;

  const publicKey = getPaystackPublicKey(fallbackPublicKey);
  const txReference = `PSK-RES-${student.id.replace(/[^a-zA-Z0-9]/g, '')}-${Date.now()}`;

  const paystackConfig = {
    reference: txReference,
    email: customEmail.trim() || `${student.id.toLowerCase()}@godshand.edu.ng`,
    amount: finalFeeKobo,
    publicKey: publicKey,
    currency: 'NGN',
    metadata: {
      custom_fields: [
        { display_name: "Student Name", variable_name: "student_name", value: student.name },
        { display_name: "Student ID", variable_name: "student_id", value: student.id },
        { display_name: "Academic Class", variable_name: "grade", value: student.grade },
        { display_name: "Academic Term", variable_name: "term", value: term },
        { display_name: "Academic Session", variable_name: "session", value: session },
        { display_name: "Payer Name", variable_name: "payer_name", value: customPayerName },
        { display_name: "Fee Type", variable_name: "fee_type", value: "result_checker_fee" }
      ]
    }
  };

  const handlePaystackSuccess = (response: any) => {
    setIsProcessing(true);
    const confirmedRef = response?.reference || txReference;
    const paymentPayload = buildResultFeePaymentPayload(
      student,
      term,
      session,
      confirmedRef,
      customPayerName,
      customEmail,
      finalFeeAmount
    );

    setTimeout(() => {
      setIsProcessing(false);
      onSuccess(paymentPayload);
      onClose();
    }, 400);
  };

  const handleSimulateInstantPayment = () => {
    setIsProcessing(true);
    const simulatedRef = `SIM-${Date.now().toString().slice(-8)}`;
    const paymentPayload = buildResultFeePaymentPayload(
      student,
      term,
      session,
      simulatedRef,
      customPayerName || 'Direct Verification',
      customEmail,
      finalFeeAmount
    );

    setTimeout(() => {
      setIsProcessing(false);
      onSuccess(paymentPayload);
      onClose();
    }, 500);
  };

  return (
    <div className="fixed inset-0 z-[120] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border-4 border-yellow-400 space-y-6 my-auto">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white flex items-center justify-center font-black text-2xl shadow-md">
              💳
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-serif font-black text-xl text-blue-950">
                  Terminal Result Fee Clearance
                </h3>
              </div>
              <p className="text-xs text-slate-500 font-bold">
                God's Hand Int'l Model School • Paystack Gateway
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 font-black text-base flex items-center justify-center transition-all"
            title="Close"
          >
            ✕
          </button>
        </div>

        {/* Student & Term Identification Card */}
        <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50/60 border-2 border-blue-100 rounded-2xl space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase text-blue-900 tracking-wider">Candidate Dossier</span>
            <span className="px-2.5 py-0.5 bg-blue-900 text-yellow-300 font-black text-[10px] rounded-full uppercase">
              {student.grade}
            </span>
          </div>

          <div>
            <h4 className="font-serif font-black text-blue-950 text-base">{student.name}</h4>
            <p className="text-xs text-slate-500 font-mono font-bold">ID: {student.id}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-blue-200/50 text-xs">
            <span className="px-2.5 py-1 bg-white text-blue-950 font-black rounded-lg border border-blue-200">
              📌 {term}
            </span>
            <span className="px-2.5 py-1 bg-white text-slate-700 font-bold rounded-lg border border-blue-200">
              🗓️ {session}
            </span>
          </div>
        </div>

        {/* Amount & Policy Information */}
        <div className="p-5 bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white rounded-2xl border border-yellow-400/40 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] font-black uppercase tracking-wider text-yellow-300 block">
                Official Result Access Fee
              </span>
              <span className="text-[10px] text-slate-300">One-time per academic term</span>
            </div>
            <div className="text-right">
              <span className="font-mono font-black text-3xl text-yellow-400">
                ₦{finalFeeAmount.toLocaleString()}
              </span>
              <span className="text-[10px] text-slate-400 block font-mono">{(finalFeeAmount * 100).toLocaleString()} Kobo</span>
            </div>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed font-medium">
            Paying this <strong>₦{finalFeeAmount.toLocaleString()}</strong> fee grants <strong>instant, unlimited permanent access</strong> to view, print, and download official signed terminal report cards with positions for <strong>{term}</strong>.
          </p>

          <div className="flex items-center gap-2 text-[11px] text-emerald-400 font-black pt-1">
            <span>🔒</span>
            <span>Secured via Paystack: Debit Card, Bank Transfer, USSD & OPay</span>
          </div>
        </div>

        {/* Vacation Hard Copy Assurance Banner */}
        <div className="p-4 bg-amber-50 border-2 border-amber-300 rounded-2xl flex items-start gap-3 text-amber-950 shadow-xs">
          <span className="text-2xl shrink-0 mt-0.5">📜</span>
          <div className="space-y-0.5">
            <span className="font-serif font-black text-xs uppercase tracking-wider block text-blue-950">
              Vacation Hard-Copy Guarantee:
            </span>
            <p className="text-xs text-amber-900 leading-snug font-medium">
              {VACATION_HARD_COPY_ASSURANCE_NOTE}
            </p>
          </div>
        </div>

        {/* Payer Email / Contact Info */}
        <div className="space-y-3">
          <div>
            <label className="block text-[11px] font-black text-slate-600 uppercase tracking-wider mb-1">
              Payer Email (For Official Paystack Transaction Receipt)
            </label>
            <input
              type="email"
              value={customEmail}
              onChange={(e) => setCustomEmail(e.target.value)}
              placeholder="e.g. parent@example.com"
              className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl text-xs font-bold text-blue-950 outline-none focus:bg-white focus:border-blue-900"
            />
          </div>

          <div>
            <label className="block text-[11px] font-black text-slate-600 uppercase tracking-wider mb-1">
              Payer / Sponsor Full Name
            </label>
            <input
              type="text"
              value={customPayerName}
              onChange={(e) => setCustomPayerName(e.target.value)}
              placeholder="e.g. Mr. & Mrs. Adeleke"
              className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl text-xs font-bold text-blue-950 outline-none focus:bg-white focus:border-blue-900"
            />
          </div>
        </div>

        {/* Actions & Buttons */}
        <div className="space-y-3 pt-2">
          {/* React-Paystack PaystackButton */}
          <PaystackButton
            {...paystackConfig}
            text={isProcessing ? "Verifying Paystack Payment..." : `⚡ Pay ₦${finalFeeAmount.toLocaleString()} with Paystack`}
            onSuccess={handlePaystackSuccess}
            onClose={() => setIsProcessing(false)}
            disabled={isProcessing}
            className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black text-sm uppercase tracking-wider shadow-xl transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
          />

          {/* Fallback Simulation Button for sandbox / offline testing */}
          <button
            type="button"
            onClick={handleSimulateInstantPayment}
            disabled={isProcessing}
            className="w-full py-3 bg-blue-900 hover:bg-blue-800 text-yellow-400 rounded-2xl font-black text-xs uppercase tracking-wider shadow transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
            title="Instant authorization for testing & evaluation"
          >
            <span>✓</span>
            <span>Instant Clearance Test Mode (Record Payment & Unlock)</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors"
          >
            Cancel & Return
          </button>
        </div>
      </div>
    </div>
  );
};
