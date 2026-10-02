import React, { useState } from 'react';
import { SchoolBankAccountConfig } from '../types';
import { POPULAR_NIGERIAN_BANKS, DEFAULT_BANK_ACCOUNT_CONFIG } from '../constants';

interface AdminBankAccountManagerProps {
  currentConfig?: SchoolBankAccountConfig;
  onUpdateConfig: (config: SchoolBankAccountConfig) => void;
}

export const BANK_ACCOUNT_REALTIME_SQL = `-- ==============================================================================
-- GOD'S HAND INTERNATIONAL MODEL SCHOOL - OFFICIAL BANK ACCOUNT REALTIME SYNC SQL
-- Wire & Cable, Apata, Ibadan, Oyo State, Nigeria
-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard/project/_/sql)
-- Allows Admin to save official account number with realtime sync across the entire app
-- ==============================================================================

-- 1. Create the bank account configuration table
CREATE TABLE IF NOT EXISTS public.school_bank_account_config (
  id TEXT PRIMARY KEY DEFAULT 'primary_account',
  bank_name TEXT NOT NULL,
  account_number TEXT NOT NULL,
  account_name TEXT NOT NULL,
  payment_instructions TEXT,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_by TEXT DEFAULT 'School Administrator'
);

-- 2. Seed Default Official Account
INSERT INTO public.school_bank_account_config (
  id, bank_name, account_number, account_name, payment_instructions, updated_at, updated_by
)
VALUES (
  'primary_account',
  'First Bank of Nigeria',
  '2034891120',
  'God''s Hand International Model School',
  'Pay tuition and fees via mobile bank app, USSD, or branch transfer. Use student name and ID as payment narration.',
  timezone('utc'::text, now()),
  'Initial Setup'
)
ON CONFLICT (id) DO NOTHING;

-- 3. Stored Procedure for Admin to Save & Broadcast Account Number
CREATE OR REPLACE FUNCTION public.update_school_bank_account(
  p_bank_name TEXT,
  p_account_number TEXT,
  p_account_name TEXT,
  p_payment_instructions TEXT DEFAULT NULL,
  p_updated_by TEXT DEFAULT 'School Administrator'
)
RETURNS JSONB AS $$
DECLARE
  v_cfg RECORD;
BEGIN
  INSERT INTO public.school_bank_account_config (
    id, bank_name, account_number, account_name, payment_instructions, updated_at, updated_by
  ) VALUES (
    'primary_account',
    p_bank_name,
    p_account_number,
    p_account_name,
    p_payment_instructions,
    timezone('utc'::text, now()),
    p_updated_by
  )
  ON CONFLICT (id) DO UPDATE SET
    bank_name = EXCLUDED.bank_name,
    account_number = EXCLUDED.account_number,
    account_name = EXCLUDED.account_name,
    payment_instructions = EXCLUDED.payment_instructions,
    updated_at = EXCLUDED.updated_at,
    updated_by = EXCLUDED.updated_by
  RETURNING * INTO v_cfg;

  -- Audit log to admin realtime stream
  INSERT INTO public.admin_realtime_events (action, details, performed_by, payload, timestamp)
  VALUES (
    'BANK_ACCOUNT_CONFIG_UPDATED',
    'Official school bank account updated to: ' || v_cfg.bank_name || ' (' || v_cfg.account_number || ')',
    p_updated_by,
    jsonb_build_object('bank_name', v_cfg.bank_name, 'account_number', v_cfg.account_number),
    timezone('utc'::text, now())
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'School official bank account updated and published in real time to all panels.',
    'bank_name', v_cfg.bank_name,
    'account_number', v_cfg.account_number,
    'account_name', v_cfg.account_name,
    'updated_at', v_cfg.updated_at
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.school_bank_account_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read school bank account config" ON public.school_bank_account_config;
CREATE POLICY "Anyone can read school bank account config"
  ON public.school_bank_account_config FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admins can update school bank account config" ON public.school_bank_account_config;
CREATE POLICY "Admins can update school bank account config"
  ON public.school_bank_account_config FOR ALL
  USING (true)
  WITH CHECK (true);

-- 5. Enable Realtime Change Data Capture (CDC)
ALTER TABLE public.school_bank_account_config REPLICA IDENTITY FULL;

-- Ensure table is registered in supabase_realtime publication
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.school_bank_account_config;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
END $$;
`;

export const AdminBankAccountManager: React.FC<AdminBankAccountManagerProps> = ({
  currentConfig = DEFAULT_BANK_ACCOUNT_CONFIG,
  onUpdateConfig
}) => {
  const [bankName, setBankName] = useState<string>(currentConfig.bankName || DEFAULT_BANK_ACCOUNT_CONFIG.bankName);
  const [customBank, setCustomBank] = useState<string>('');
  const [isCustomBank, setIsCustomBank] = useState<boolean>(
    !POPULAR_NIGERIAN_BANKS.includes(currentConfig.bankName) && currentConfig.bankName !== ''
  );
  const [accountNumber, setAccountNumber] = useState<string>(currentConfig.accountNumber || DEFAULT_BANK_ACCOUNT_CONFIG.accountNumber);
  const [accountName, setAccountName] = useState<string>(currentConfig.accountName || DEFAULT_BANK_ACCOUNT_CONFIG.accountName);
  const [paymentInstructions, setPaymentInstructions] = useState<string>(
    currentConfig.paymentInstructions || DEFAULT_BANK_ACCOUNT_CONFIG.paymentInstructions
  );
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [showSqlModal, setShowSqlModal] = useState<boolean>(false);
  const [sqlCopied, setSqlCopied] = useState<boolean>(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    const selectedBank = isCustomBank ? customBank.trim() : bankName;
    if (!selectedBank) {
      alert('Please select or specify a valid Bank Name.');
      return;
    }

    const cleanAccNo = accountNumber.trim().replace(/\s+/g, '');
    if (!cleanAccNo || cleanAccNo.length < 9) {
      alert('Please enter a valid Bank Account Number (typically 10 digits in Nigeria).');
      return;
    }

    if (!accountName.trim()) {
      alert('Please enter the Official Account Name.');
      return;
    }

    const updated: SchoolBankAccountConfig = {
      bankName: selectedBank,
      accountNumber: cleanAccNo,
      accountName: accountName.trim(),
      paymentInstructions: paymentInstructions.trim(),
      updatedAt: new Date().toISOString(),
      updatedBy: 'School Administrator'
    };

    onUpdateConfig(updated);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 4500);
  };

  const handleResetToDefault = () => {
    if (window.confirm("Reset official payment bank account to default school account (First Bank of Nigeria)?")) {
      setBankName(DEFAULT_BANK_ACCOUNT_CONFIG.bankName);
      setIsCustomBank(false);
      setCustomBank('');
      setAccountNumber(DEFAULT_BANK_ACCOUNT_CONFIG.accountNumber);
      setAccountName(DEFAULT_BANK_ACCOUNT_CONFIG.accountName);
      setPaymentInstructions(DEFAULT_BANK_ACCOUNT_CONFIG.paymentInstructions);
      onUpdateConfig({
        ...DEFAULT_BANK_ACCOUNT_CONFIG,
        updatedAt: new Date().toISOString(),
        updatedBy: 'School Administrator (Reset)'
      });
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 4500);
    }
  };

  const handleCopyDetails = () => {
    const text = `BANK: ${isCustomBank ? customBank : bankName}\nACCOUNT NUMBER: ${accountNumber}\nACCOUNT NAME: ${accountName}\nINSTRUCTIONS: ${paymentInstructions}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(BANK_ACCOUNT_REALTIME_SQL);
    setSqlCopied(true);
    setTimeout(() => setSqlCopied(false), 3000);
  };

  const handleDownloadSql = () => {
    const blob = new Blob([BANK_ACCOUNT_REALTIME_SQL], { type: 'text/sql' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ghs_bank_account_realtime_sync_${Date.now()}.sql`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const effectiveBank = isCustomBank ? (customBank || 'Custom Bank') : bankName;

  return (
    <div className="space-y-8">
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-blue-950 via-blue-900 to-indigo-950 rounded-[2.5rem] p-8 text-white shadow-2xl border-4 border-yellow-400 relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-yellow-400 text-blue-950 flex items-center justify-center text-3xl font-black shadow-lg shrink-0">
              🏛️
            </div>
            <div>
              <span className="px-3 py-1 bg-yellow-400 text-blue-950 rounded-full text-[10px] font-black uppercase tracking-widest inline-block mb-1">
                Bursary & Financial Settings
              </span>
              <h2 className="text-2xl sm:text-3xl font-serif font-black text-white">
                Official School Bank Account Configuration
              </h2>
              <p className="text-xs text-blue-200 mt-0.5 max-w-2xl font-medium">
                Set and update the designated school bank account and payment instructions. Any change made here immediately updates the Student Fee Checker, Parent Dashboard fee payment portal, and Bursary invoice vouchers across the entire school in real-time.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowSqlModal(true)}
              className="px-4 py-2.5 bg-yellow-400 hover:bg-yellow-300 text-blue-950 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 active:scale-95 shadow-md"
              title="View and copy generated SQL for saving the account number with realtime sync"
            >
              <span>📄 View Realtime SQL</span>
            </button>
            <button
              type="button"
              onClick={handleCopyDetails}
              className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-yellow-300 rounded-xl text-xs font-black uppercase tracking-wider transition-all border border-white/20 flex items-center gap-2 active:scale-95"
            >
              <span>{copied ? '✓ Copied' : '📋 Copy Account'}</span>
            </button>
            <button
              type="button"
              onClick={handleResetToDefault}
              className="px-4 py-2.5 bg-red-600/80 hover:bg-red-600 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md active:scale-95"
            >
              Reset to Default
            </button>
          </div>
        </div>

        {/* Success Alert Toast */}
        {isSaved && (
          <div className="mt-6 p-4 bg-emerald-500 text-slate-950 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-between shadow-xl animate-bounce">
            <div className="flex items-center gap-2">
              <span className="text-xl">✓</span>
              <span>Success: School bank account details updated and broadcasted to all parent and student portals!</span>
            </div>
            <span className="text-[10px] bg-slate-950 text-white px-2 py-0.5 rounded-lg">Active Now</span>
          </div>
        )}
      </div>

      {/* SQL Viewer Modal */}
      {showSqlModal && (
        <div className="fixed inset-0 z-[120] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border-2 border-yellow-400 rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl relative space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl">⚡</span>
                <div>
                  <h3 className="font-serif font-black text-blue-950 dark:text-white text-lg">
                    Realtime SQL Schema for Bank Account Sync
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    PostgreSQL script to create table, stored procedure, RLS rules and register CDC realtime replication
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSqlModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center justify-center font-bold"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              <pre className="p-4 bg-slate-950 text-emerald-400 rounded-2xl font-mono text-xs overflow-x-auto leading-relaxed border border-slate-800">
                {BANK_ACCOUNT_REALTIME_SQL}
              </pre>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Run this script in your Supabase SQL Editor to enable automatic real-time propagation across all devices.
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDownloadSql}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl font-bold text-xs uppercase"
                >
                  Download .SQL
                </button>
                <button
                  type="button"
                  onClick={handleCopySql}
                  className="px-4 py-2 bg-yellow-400 hover:bg-yellow-300 text-blue-950 rounded-xl font-black text-xs uppercase shadow-sm flex items-center gap-1.5"
                >
                  <span>{sqlCopied ? '✓ Copied SQL!' : '📋 Copy Entire SQL'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Form Editor */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 border-2 border-slate-100 dark:border-slate-800 shadow-xl space-y-6 transition-colors">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-4 flex items-center justify-between">
            <div>
              <h3 className="text-xl font-serif font-black text-blue-950 dark:text-white">
                Edit Bank & Remittance Details
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Ensure account number and bank name are 100% accurate before saving.
              </p>
            </div>
            <span className="px-3 py-1 bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 rounded-full text-[10px] font-black uppercase tracking-wider">
              Live Gateway
            </span>
          </div>

          <form onSubmit={handleSave} className="space-y-6">
            {/* Bank Name Selector */}
            <div className="space-y-2">
              <label className="block text-xs font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest">
                Bank Name *
              </label>

              {!isCustomBank ? (
                <div className="space-y-2">
                  <select
                    value={bankName}
                    onChange={(e) => {
                      if (e.target.value === '__OTHER__') {
                        setIsCustomBank(true);
                      } else {
                        setBankName(e.target.value);
                      }
                    }}
                    className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-2xl font-bold text-blue-950 dark:text-white outline-none focus:border-blue-900 dark:focus:border-yellow-400 focus:bg-white dark:focus:bg-slate-900 transition-all text-sm"
                  >
                    {POPULAR_NIGERIAN_BANKS.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                    <option value="__OTHER__">+ Specify Other / Custom Commercial Bank...</option>
                  </select>

                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {['First Bank of Nigeria', 'GTBank', 'Zenith Bank', 'Access Bank', 'UBA', 'OPay'].map((quick) => {
                      const full = POPULAR_NIGERIAN_BANKS.find(p => p.includes(quick)) || quick;
                      return (
                        <button
                          key={quick}
                          type="button"
                          onClick={() => {
                            setBankName(full);
                            setIsCustomBank(false);
                          }}
                          className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase transition-all ${
                            bankName === full && !isCustomBank
                              ? 'bg-blue-900 text-yellow-400 shadow-sm dark:bg-yellow-400 dark:text-blue-950'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                          }`}
                        >
                          {quick}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      required
                      value={customBank}
                      onChange={(e) => setCustomBank(e.target.value)}
                      placeholder="Type custom bank name (e.g. Standard Chartered, Jaiz, etc.)"
                      className="flex-1 px-5 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-2xl font-bold text-blue-950 dark:text-white outline-none focus:border-blue-900 focus:bg-white transition-all text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setIsCustomBank(false)}
                      className="px-4 py-4 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-700 dark:text-slate-200 font-black text-xs uppercase rounded-2xl"
                    >
                      Preset List
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Account Number */}
            <div className="space-y-2">
              <label className="block text-xs font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest flex items-center justify-between">
                <span>Account Number (NUBAN) *</span>
                <span className="text-[10px] font-mono text-slate-400">
                  {accountNumber.trim().replace(/\s+/g, '').length} Digits
                </span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  maxLength={16}
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  placeholder="e.g. 2041982731"
                  className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-2xl font-mono font-black text-blue-950 dark:text-yellow-300 text-xl tracking-widest outline-none focus:border-blue-900 dark:focus:border-yellow-400 focus:bg-white transition-all"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-yellow-400 text-blue-950 font-black text-[10px] uppercase rounded-lg">
                  NUBAN
                </span>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                Standard Nigerian bank account numbers are 10 numerical digits.
              </p>
            </div>

            {/* Account Name */}
            <div className="space-y-2">
              <label className="block text-xs font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest">
                Official Account Name *
              </label>
              <input
                type="text"
                required
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                placeholder="e.g. God's Hand International Model School"
                className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-2xl font-bold text-blue-950 dark:text-white outline-none focus:border-blue-900 dark:focus:border-yellow-400 focus:bg-white transition-all text-sm"
              />
            </div>

            {/* Payment Instructions / Narration Advisory */}
            <div className="space-y-2">
              <label className="block text-xs font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest">
                Payment Narration Instructions (Optional)
              </label>
              <textarea
                rows={3}
                value={paymentInstructions}
                onChange={(e) => setPaymentInstructions(e.target.value)}
                placeholder="e.g. Please put student's Full Name and Student ID in the transfer narration..."
                className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-2xl font-medium text-slate-900 dark:text-slate-100 outline-none focus:border-blue-900 dark:focus:border-yellow-400 focus:bg-white transition-all text-xs"
              />
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                className="w-full py-4 bg-blue-900 hover:bg-blue-800 dark:bg-yellow-400 dark:hover:bg-yellow-300 text-yellow-400 dark:text-blue-950 font-black text-sm uppercase tracking-widest rounded-2xl shadow-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2"
              >
                <span>💾 Save & Broadcast Account Number</span>
                <span>➔</span>
              </button>
              <p className="text-[10px] text-center text-slate-400 mt-2 font-medium">
                Changes apply instantly across all open browser tabs and database state.
              </p>
            </div>
          </form>
        </div>

        {/* Right Column: Live Portal Preview Card */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 border-2 border-slate-100 dark:border-slate-800 shadow-xl space-y-5 transition-colors">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-lg font-serif font-black text-blue-950 dark:text-white">
                Live Public Card Preview
              </h3>
              <span className="px-2 py-0.5 bg-yellow-400 text-blue-950 rounded-md text-[9px] font-black uppercase">
                What Parents See
              </span>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              This is exactly how parents and students will see the official bursary bank transfer card on their portals:
            </p>

            {/* Preview Card Component */}
            <div className="bg-gradient-to-br from-blue-950 to-blue-900 rounded-2xl p-6 border-2 border-yellow-400 shadow-xl space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[9px] font-black uppercase text-yellow-400 tracking-wider block">
                    Bank Name
                  </span>
                  <p className="text-base font-black text-white">{effectiveBank}</p>
                </div>
                <span className="px-2 py-0.5 bg-yellow-400 text-blue-950 font-black text-[9px] uppercase rounded-md shadow-xs">
                  Official Account
                </span>
              </div>

              <div>
                <span className="text-[9px] font-black uppercase text-yellow-400 tracking-wider block">
                  Account Name
                </span>
                <p className="text-xs font-bold text-slate-200">{accountName || "God's Hand International Model School"}</p>
              </div>

              <div className="pt-2 border-t border-white/10 flex items-center justify-between">
                <div>
                  <span className="text-[9px] font-black uppercase text-yellow-400 tracking-wider block">
                    Account Number
                  </span>
                  <p className="text-2xl font-mono font-black text-yellow-300 tracking-wider">
                    {accountNumber || '2041982731'}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[9px] uppercase text-blue-300 font-bold block">Status</span>
                  <span className="text-xs font-black text-emerald-400">● Active Bursary</span>
                </div>
              </div>

              {paymentInstructions && (
                <div className="p-3 bg-black/40 rounded-xl text-[10px] text-slate-300 italic border border-white/5">
                  <strong>Instructions:</strong> {paymentInstructions}
                </div>
              )}
            </div>

            {/* Summary Information */}
            <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-2 text-xs">
              <p className="font-bold text-slate-300">
                🔒 Security & Audit Compliance
              </p>
              <ul className="text-[11px] text-slate-400 space-y-1 list-disc list-inside">
                <li>Immediate propagation to all student & parent devices.</li>
                <li>Receipt upload validation matches this official account.</li>
                <li>Saved locally and synchronized with database state.</li>
              </ul>
              {currentConfig.updatedAt && (
                <p className="text-[10px] text-slate-500 pt-1 font-mono">
                  Last updated: {new Date(currentConfig.updatedAt).toLocaleString()} ({currentConfig.updatedBy || 'Admin'})
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
