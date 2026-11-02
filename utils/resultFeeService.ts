import { FeePayment, StudentAccount, SchoolBankAccountConfig, ResultCheckerFeeRecord } from '../types';

export const RESULT_FEE_AMOUNT_NAIRA = 1000;
export const RESULT_FEE_AMOUNT_KOBO = 100000; // ₦1,000 in kobo

/**
 * Strips class/grade suffixes from subject names (e.g. "Mathematics (Primary 1)" -> "Mathematics")
 * while preserving important academic acronyms like "(CRS)", "(IRS)", "(PHE)", "(CCA)", etc.
 */
export const formatSubjectName = (name: string): string => {
  if (!name) return '';
  // Removes suffixes like (Primary 1), (Basic 2), (JSS 3), (SS 1), (SSS 2), (KG 1), (Nursery 2), (Creche), (Pre-Nursery)
  const cleaned = name.replace(/\s*\((Primary|Basic|JSS|SSS|SS|KG|Kindergarten|Nursery|Crèche|Creche|Prenursery|Pre-Nursery|Grade|Class)[^)]*\)/gi, '').trim();
  return cleaned || name;
};

/**
 * Official school assurance note regarding vacation hard-copy issuance
 */
export const VACATION_HARD_COPY_ASSURANCE_NOTE = 
  "Official Vacation Notice to Parents & Guardians: When you pay to check and download your child's terminal report card online, please be assured that a formal printed hard copy with the official school crest and signature will also be issued to your child upon school vacation / closing day.";

/**
 * Retrieve dynamic Result Checker fee from term fee table or school bank settings (defaults to ₦1,000)
 */
export const getResultFeeAmount = (
  bankConfig?: SchoolBankAccountConfig | null,
  termFees?: ResultCheckerFeeRecord[] | null,
  term?: string,
  session?: string
): number => {
  if (termFees && termFees.length > 0) {
    if (term) {
      const targetTermNorm = normalizeTermKey(term);
      const targetSessionNorm = session ? normalizeSessionKey(session) : null;
      const matched = termFees.find(tf => {
        if (tf.isActive === false) return false;
        const matchesTerm = normalizeTermKey(tf.term) === targetTermNorm;
        if (!matchesTerm) return false;
        if (targetSessionNorm && tf.session) {
          return normalizeSessionKey(tf.session) === targetSessionNorm;
        }
        return true;
      });
      if (matched && matched.feeAmount > 0) {
        return matched.feeAmount;
      }
    }
    const activeRecord = termFees.find(tf => tf.isActive !== false && tf.feeAmount > 0);
    if (activeRecord) {
      return activeRecord.feeAmount;
    }
  }

  if (bankConfig?.resultCheckerFee && bankConfig.resultCheckerFee > 0) {
    return bankConfig.resultCheckerFee;
  }
  return RESULT_FEE_AMOUNT_NAIRA;
};

/**
 * Standardize academic term name for robust comparison
 * Handles: 'First Term', '1st Term', 'First', 'first_term', etc.
 */
export const normalizeTermKey = (term?: string): string => {
  if (!term) return 'first_term';
  const clean = term.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
  if (clean.includes('1') || clean.includes('first')) return 'first_term';
  if (clean.includes('2') || clean.includes('second')) return 'second_term';
  if (clean.includes('3') || clean.includes('third')) return 'third_term';
  return clean;
};

/**
 * Standardize academic session name for robust comparison
 * Handles: '2025/2026 Academic Session', '2025/2026', '2025-2026'
 */
export const normalizeSessionKey = (session?: string): string => {
  if (!session) return '2025/2026';
  const match = session.match(/\d{4}\s*[\/\-]\s*\d{4}/);
  if (match) {
    return match[0].replace(/\s+/g, '').replace('-', '/');
  }
  return session.trim().toLowerCase();
};

/**
 * Checks whether a student has paid the result checker fee specifically
 * for the requested academic term and session.
 *
 * Requirements:
 * 1. Checks matching student ID or Name
 * 2. Status must be 'confirmed' or 'paid'
 * 3. Type must be 'result_fee' or matching result clearance
 * 4. Matches requested Term
 * 5. Matches requested Academic Session
 */
export const isTermResultFeePaid = (
  payments: FeePayment[],
  studentId: string,
  studentName: string,
  term: string = 'First Term',
  session: string = '2025/2026 Academic Session'
): boolean => {
  if (!payments || payments.length === 0) return false;

  const targetTermNorm = normalizeTermKey(term);
  const targetSessionNorm = normalizeSessionKey(session);
  const cleanId = studentId.trim().toLowerCase();
  const cleanName = studentName.trim().toLowerCase();

  return payments.some(p => {
    // 1. Must match student by ID or exact full name
    const matchesStudent = 
      (p.studentId && p.studentId.trim().toLowerCase() === cleanId) ||
      (p.studentName && p.studentName.trim().toLowerCase() === cleanName);
    if (!matchesStudent) return false;

    // 2. Must have successful status ('confirmed' or 'paid')
    const isSuccessful = p.status === 'confirmed' || p.status === 'paid';
    if (!isSuccessful) return false;

    // 3. Must be a result fee payment
    const isResultPayment = 
      p.type === 'result_fee' ||
      (p.studentNote && p.studentNote.toLowerCase().includes('report card')) ||
      (p.studentNote && p.studentNote.toLowerCase().includes('result')) ||
      (p.adminNote && p.adminNote.toLowerCase().includes('result')) ||
      (p.receiptFileName && p.receiptFileName.toLowerCase().includes('result_pass'));
    if (!isResultPayment) return false;

    // 4. Term persistence match:
    // If payment recorded a specific term, it must match the requested term.
    // If payment has no term specified, default to matching current active term.
    const pTermNorm = normalizeTermKey(p.term || term);
    const matchesTerm = pTermNorm === targetTermNorm;
    if (!matchesTerm) return false;

    // 5. Session persistence match:
    if (p.session) {
      const pSessionNorm = normalizeSessionKey(p.session);
      if (pSessionNorm !== targetSessionNorm) return false;
    }

    return true;
  });
};

/**
 * Get active Paystack public key prioritizing VITE_PAYSTACK_PUBLIC_KEY
 */
export const getPaystackPublicKey = (fallbackConfigKey?: string): string => {
  const envKey = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY;
  if (envKey && typeof envKey === 'string' && envKey.trim().startsWith('pk_')) {
    return envKey.trim();
  }
  if (fallbackConfigKey && typeof fallbackConfigKey === 'string' && fallbackConfigKey.trim().startsWith('pk_')) {
    return fallbackConfigKey.trim();
  }
  // Public demonstration test key for immediate sandbox checkout verification
  return 'pk_test_godshand_result_access';
};

/**
 * Factory to generate the database payload for a verified Paystack transaction
 */
export const buildResultFeePaymentPayload = (
  student: StudentAccount,
  term: string,
  session: string,
  transactionRef: string,
  payerName?: string,
  payerEmail?: string,
  feeAmount: number = RESULT_FEE_AMOUNT_NAIRA
): Omit<FeePayment, 'id' | 'date'> => {
  return {
    studentId: student.id,
    studentName: student.name,
    grade: student.grade,
    amount: feeAmount,
    amountPaid: feeAmount,
    amountRemaining: 0,
    totalExpected: feeAmount,
    type: 'result_fee',
    status: 'paid', // marked as paid/confirmed in database
    term: term,
    session: session,
    receiptNumber: `RCP-PSK-${Date.now().toString().slice(-6)}`,
    transactionRef: transactionRef,
    bankName: 'Paystack Payment Gateway',
    payerName: payerName || `${student.name}'s Sponsor`,
    receiptFileName: `Paystack_Result_Pass_${transactionRef}.pdf`,
    studentNote: `Paystack online payment of ₦${feeAmount.toLocaleString()} for ${student.name} • ${term} (${session}) Official Report Card Access. ${VACATION_HARD_COPY_ASSURANCE_NOTE}`,
    adminNote: `Paystack Verified Transaction Ref: ${transactionRef}. Term-based clearance granted for ₦${feeAmount.toLocaleString()}.`,
    reviewedAt: new Date().toISOString(),
    reviewedBy: 'Paystack Gateway Automated Clearance'
  };
};
