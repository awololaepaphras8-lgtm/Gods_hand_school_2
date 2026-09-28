import React, { useState } from 'react';
import { SchoolBankAccountConfig } from '../types';
import { POPULAR_NIGERIAN_BANKS, DEFAULT_BANK_ACCOUNT_CONFIG } from '../constants';

interface AdminBankAccountManagerProps {
  currentConfig?: SchoolBankAccountConfig;
  onUpdateConfig: (config: SchoolBankAccountConfig) => void;
}

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
                Set and update the designated school bank account and payment instructions. Any change made here immediately updates the Student Fee Checker, Parent Dashboard fee payment portal, and Bursary invoice vouchers across the entire school.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
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

      <div className="grid lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Form Editor */}
        <div className="lg:col-span-7 bg-white rounded-[2.5rem] p-8 border-2 border-slate-100 shadow-xl space-y-6">
          <div className="border-b border-slate-100 pb-4 flex items-center justify-between">
            <div>
              <h3 className="text-xl font-serif font-black text-blue-950">
                Edit Bank & Remittance Details
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Ensure account number and bank name are 100% accurate before saving.
              </p>
            </div>
            <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-[10px] font-black uppercase tracking-wider">
              Live Gateway
            </span>
          </div>

          <form onSubmit={handleSave} className="space-y-6">
            {/* Bank Name Selector */}
            <div className="space-y-2">
              <label className="block text-xs font-black text-slate-600 uppercase tracking-widest">
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
                    className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-200 rounded-2xl font-bold text-blue-950 outline-none focus:border-blue-900 focus:bg-white transition-all text-sm"
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
                              ? 'bg-blue-900 text-yellow-400 shadow-sm'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
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
                      className="flex-1 px-5 py-4 bg-slate-50 border-2 border-slate-200 rounded-2xl font-bold text-blue-950 outline-none focus:border-blue-900 focus:bg-white transition-all text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setIsCustomBank(false)}
                      className="px-4 py-4 bg-slate-200 hover:bg-slate-300 text-slate-700 font-black text-xs uppercase rounded-2xl"
                    >
                      Preset List
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Account Number */}
            <div className="space-y-2">
              <label className="block text-xs font-black text-slate-600 uppercase tracking-widest flex items-center justify-between">
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
                  className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-200 rounded-2xl font-mono font-black text-blue-950 text-xl tracking-widest outline-none focus:border-blue-900 focus:bg-white transition-all"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-yellow-400 text-blue-950 font-black text-[10px] uppercase rounded-lg">
                  NUBAN
                </span>
              </div>
              <p className="text-[10px] text-slate-500 font-medium">
                Standard Nigerian bank account numbers are 10 numerical digits.
              </p>
            </div>

            {/* Account Name */}
            <div className="space-y-2">
              <label className="block text-xs font-black text-slate-600 uppercase tracking-widest">
                Official Account Beneficiary Name *
              </label>
              <input
                type="text"
                required
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                placeholder="e.g. God's Hand International Model School"
                className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-200 rounded-2xl font-bold text-blue-950 outline-none focus:border-blue-900 focus:bg-white transition-all text-sm"
              />
              <p className="text-[10px] text-slate-500 font-medium">
                The exact name that appears when parents perform an interbank transfer or lookup.
              </p>
            </div>

            {/* Payment Instructions / Remarks Guidance */}
            <div className="space-y-2">
              <label className="block text-xs font-black text-slate-600 uppercase tracking-widest">
                Parent Transfer Instructions & Remarks Note
              </label>
              <textarea
                rows={3}
                value={paymentInstructions}
                onChange={(e) => setPaymentInstructions(e.target.value)}
                placeholder="Guidance for parents on what to write in transfer description..."
                className="w-full px-5 py-3.5 bg-slate-50 border-2 border-slate-200 rounded-2xl text-xs font-medium text-slate-800 outline-none focus:border-blue-900 focus:bg-white transition-all"
              />
            </div>

            {/* Submit Action */}
            <div className="pt-2">
              <button
                type="submit"
                className="w-full py-5 bg-blue-900 hover:bg-blue-800 text-yellow-400 rounded-2xl font-black text-base uppercase tracking-wider transition-all shadow-xl hover:scale-[1.01] active:scale-[0.98] flex items-center justify-center gap-2 border-2 border-yellow-400"
              >
                <span>💾</span>
                <span>Save & Broadcast Bank Account Details</span>
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: Live Visual Previews */}
        <div className="lg:col-span-5 space-y-6">
          {/* Live Preview Card */}
          <div className="bg-slate-900 rounded-[2.5rem] p-7 text-white shadow-2xl border-2 border-slate-800 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <h4 className="font-serif font-black text-sm text-yellow-400 uppercase tracking-wider">
                  Live Parent & Student Preview
                </h4>
              </div>
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                Interactive Mockup
              </span>
            </div>

            <p className="text-[11px] text-slate-400">
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
