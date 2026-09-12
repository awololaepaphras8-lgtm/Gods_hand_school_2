import React, { useState, useEffect } from 'react';
import { ParentAccount } from '../types';
import { 
  detectHackingPayload, 
  cleanHackingKeywords, 
  checkRateLimit 
} from '../utils/securityGuard';

interface ParentAuthProps {
  onLogin: (emailOrPhone: string, pass: string) => boolean | void;
  onRegister: (data: Omit<ParentAccount, 'id' | 'createdAt'>) => boolean | void;
  onBack: () => void;
  error?: string;
  onResetPassword?: (email: string, newPass: string) => boolean;
}

export const ParentAuth: React.FC<ParentAuthProps> = ({
  onLogin,
  onRegister,
  onBack,
  error: externalError,
  onResetPassword
}) => {
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>('login');
  const [localError, setLocalError] = useState<string>('');
  const [securityAlert, setSecurityAlert] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Rate limiting lockout
  const [lockoutRemaining, setLockoutRemaining] = useState<number>(0);

  // Login State
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Sign Up State
  const [fullName, setFullName] = useState('');
  const [relationship, setRelationship] = useState<'Father' | 'Mother' | 'Guardian' | 'Other'>('Mother');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [address, setAddress] = useState('');

  // Reset State
  const [resetEmail, setResetEmail] = useState('');
  const [newParentPass, setNewParentPass] = useState('');
  const [confirmParentPass, setConfirmParentPass] = useState('');
  const [resetSent, setResetSent] = useState(false);

  useEffect(() => {
    if (loginIdentifier) {
      const status = checkRateLimit(loginIdentifier);
      setLockoutRemaining(status.remainingSeconds);
    }
  }, [loginIdentifier, externalError]);

  useEffect(() => {
    if (lockoutRemaining <= 0) return;
    const timer = setInterval(() => {
      setLockoutRemaining(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [lockoutRemaining]);

  const handleInputFilter = (val: string, setter: (v: string) => void) => {
    const hackCheck = detectHackingPayload(val);
    if (hackCheck.isMalicious) {
      setSecurityAlert(`Security Guard: Malicious injection blocked (${hackCheck.detectedLabel})`);
      setter(cleanHackingKeywords(val));
      return;
    }
    setSecurityAlert(null);
    setter(val);
  };

  const error = externalError || localError;

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');
    setSecurityAlert(null);

    const rateStatus = checkRateLimit(loginIdentifier || 'parent');
    if (rateStatus.isLocked) {
      setLockoutRemaining(rateStatus.remainingSeconds);
      setSecurityAlert(`Parent Portal temporarily locked. Please wait ${rateStatus.remainingSeconds}s.`);
      return;
    }

    const idCheck = detectHackingPayload(loginIdentifier);
    const passCheck = detectHackingPayload(loginPassword);
    if (idCheck.isMalicious || passCheck.isMalicious) {
      setSecurityAlert("Injection attempt rejected. Malicious characters stripped.");
      return;
    }

    if (!loginIdentifier.trim() || !loginPassword.trim()) {
      setLocalError('Please enter both your email/phone and password.');
      return;
    }
    const result = onLogin(loginIdentifier.trim(), loginPassword.trim());
    if (result === false) {
      setLocalError('Invalid email/phone or password. Please check your credentials.');
    }
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');
    setSecurityAlert(null);

    const checks = [fullName, email, phone, password, address].map(detectHackingPayload);
    if (checks.some(c => c.isMalicious)) {
      setSecurityAlert("Prohibited or malicious script tags detected in registration input.");
      return;
    }

    if (!fullName.trim() || !email.trim() || !phone.trim() || !password) {
      setLocalError('Please fill in all required parent details.');
      return;
    }

    if (password.length < 5) {
      setLocalError('Password must be at least 5 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setLocalError('Passwords do not match. Please verify.');
      return;
    }

    const result = onRegister({
      fullName: fullName.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      password,
      relationship,
      address: address.trim(),
      childrenStudentIds: []
    });

    if (result === false) {
      setLocalError('An account with this email address already exists. Please log in.');
    }
  };

  const handleFillDemo = () => {
    setLoginIdentifier('parent@godshand.sch.ng');
    setLoginPassword('parent123');
    setLocalError('');
    setSecurityAlert(null);
  };

  const handleResetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');

    if (!resetEmail.trim()) {
      setLocalError('Please enter your registered email address.');
      return;
    }

    if (newParentPass) {
      if (newParentPass.length < 5) {
        setLocalError('New password must be at least 5 characters long.');
        return;
      }
      if (newParentPass !== confirmParentPass) {
        setLocalError('Passwords do not match.');
        return;
      }
      if (onResetPassword) {
        const ok = onResetPassword(resetEmail.trim().toLowerCase(), newParentPass);
        if (!ok) {
          setLocalError('Parent account not found with this email address.');
          return;
        }
      }
    }

    setResetSent(true);
    setTimeout(() => {
      setResetSent(false);
      setMode('login');
      setLoginIdentifier(resetEmail);
      if (newParentPass) setLoginPassword(newParentPass);
    }, 2500);
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12 bg-slate-50/50">
      <div className="max-w-xl w-full bg-white rounded-3xl shadow-2xl overflow-hidden border-2 border-slate-200 relative">
        {/* Top Decorative School Accent */}
        <div className="h-3 w-full bg-gradient-to-r from-blue-900 via-yellow-400 to-blue-900"></div>

        <div className="p-8 sm:p-10">
          {/* Header Navigation & School Identity */}
          <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-100">
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-1.5 text-xs font-black text-slate-500 hover:text-blue-900 transition-colors uppercase tracking-wider"
            >
              <span>←</span>
              <span>Back to Home</span>
            </button>

            <div className="inline-flex items-center gap-2 px-3 py-1 bg-yellow-100 text-blue-900 rounded-full text-[10px] font-black uppercase tracking-wider border border-yellow-300">
              <span>👨‍👩‍👧‍👦 Parent & Guardian Portal</span>
            </div>
          </div>

          <div className="text-center mb-8">
            <div className="w-24 h-24 sm:w-28 sm:h-28 mx-auto bg-white rounded-3xl border-3 border-yellow-400 shadow-xl ring-4 ring-blue-900/10 overflow-hidden flex items-center justify-center mb-4">
              <img
                src="/logo.png"
                alt="God's Hand International Model School"
                referrerPolicy="no-referrer"
                className="w-[80%] h-[80%] object-contain"
                onError={(e) => { e.currentTarget.src = 'hands.jpg'; }}
              />
            </div>
            <h2 className="text-2xl sm:text-3xl font-serif font-black text-blue-900 leading-tight">
              {mode === 'login' && 'Parent & Guardian Login'}
              {mode === 'signup' && 'Create Parent Account'}
              {mode === 'forgot' && 'Reset Parent Password'}
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-1">
              {mode === 'login' && 'Manage your children, track gate attendance, and pay school fees.'}
              {mode === 'signup' && 'Register your family to connect your children and monitor their schooling.'}
              {mode === 'forgot' && 'Enter your email to recover or change your parent password.'}
            </p>
          </div>

          {/* Security Alert Banner */}
          {securityAlert && (
            <div className="mb-6 p-3.5 bg-red-50 border-2 border-red-200 rounded-2xl text-red-700 text-xs font-bold flex items-start gap-2">
              <span className="text-base leading-none">🛡️</span>
              <span className="leading-snug">{securityAlert}</span>
            </div>
          )}

          {/* Lockout Warning */}
          {lockoutRemaining > 0 && (
            <div className="mb-6 p-4 bg-amber-50 border-2 border-amber-300 rounded-2xl text-amber-800 text-xs font-bold text-center space-y-1">
              <div className="text-base">⏳ Security Rate Limit Active</div>
              <p>Multiple failed login attempts. Retry in <span className="font-black text-amber-950">{lockoutRemaining}s</span>.</p>
            </div>
          )}

          {/* Mode Switcher Tabs */}
          {mode !== 'forgot' && (
            <div className="grid grid-cols-2 gap-2 p-1.5 bg-slate-100 rounded-2xl mb-8">
              <button
                type="button"
                onClick={() => { setMode('login'); setLocalError(''); setSecurityAlert(null); }}
                className={`py-3 text-xs font-black uppercase tracking-wider rounded-xl transition-all ${
                  mode === 'login'
                    ? 'bg-white text-blue-900 shadow-md'
                    : 'text-slate-500 hover:text-blue-900'
                }`}
              >
                Parent Login
              </button>
              <button
                type="button"
                onClick={() => { setMode('signup'); setLocalError(''); setSecurityAlert(null); }}
                className={`py-3 text-xs font-black uppercase tracking-wider rounded-xl transition-all ${
                  mode === 'signup'
                    ? 'bg-white text-blue-900 shadow-md'
                    : 'text-slate-500 hover:text-blue-900'
                }`}
              >
                Sign Up / Register
              </button>
            </div>
          )}

          {/* Error Message Display */}
          {error && (
            <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-3">
              <span className="text-base">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {/* LOGIN FORM */}
          {mode === 'login' && (
            <form 
              method="POST" 
              action="#" 
              onSubmit={handleLoginSubmit} 
              className="space-y-5"
              autoComplete="off"
            >
              <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-2">
                  Email Address or Phone Number
                </label>
                <div className="relative">
                  <input
                    type="text"
                    name="parent_identifier"
                    required
                    disabled={lockoutRemaining > 0}
                    value={loginIdentifier}
                    onChange={(e) => handleInputFilter(e.target.value, setLoginIdentifier)}
                    placeholder="e.g. parent@godshand.sch.ng or 08034567890"
                    autoComplete="username"
                    className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border-2 border-slate-200 rounded-2xl font-bold text-sm text-blue-950 focus:bg-white focus:border-blue-900 outline-none transition-all disabled:opacity-50"
                  />
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-base">
                    ✉️
                  </span>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-wider">
                    Password
                  </label>
                  <div className="flex items-center gap-3">
                    <button 
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-[10px] font-black uppercase tracking-wider text-blue-900 hover:text-yellow-600 transition-colors"
                    >
                      {showPassword ? 'Hide' : 'Show'}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setMode('forgot'); setLocalError(''); setSecurityAlert(null); }}
                      className="text-[11px] font-black text-yellow-600 hover:text-yellow-700 uppercase tracking-wide inline-flex items-center gap-1"
                    >
                      <span>🔑</span>
                      <span className="underline decoration-yellow-400 underline-offset-2">Forgot Password?</span>
                    </button>
                  </div>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="parent_password"
                    required
                    disabled={lockoutRemaining > 0}
                    value={loginPassword}
                    onChange={(e) => handleInputFilter(e.target.value, setLoginPassword)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    spellCheck="false"
                    autoCorrect="off"
                    autoCapitalize="off"
                    className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border-2 border-slate-200 rounded-2xl font-bold text-sm text-blue-950 focus:bg-white focus:border-blue-900 outline-none transition-all disabled:opacity-50"
                  />
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-base">
                    🔒
                  </span>
                </div>
              </div>

              <button
                type="submit"
                disabled={lockoutRemaining > 0}
                className="w-full py-4 bg-blue-900 hover:bg-blue-800 text-yellow-400 font-black text-sm uppercase tracking-wider rounded-2xl shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none"
              >
                <span>Login to Parent Portal</span>
                <span>→</span>
              </button>

              {/* Demo Helper */}
              <div className="pt-2 border-t border-slate-100 text-center">
                <button
                  type="button"
                  onClick={handleFillDemo}
                  className="px-4 py-2 bg-yellow-50 hover:bg-yellow-100 text-blue-900 border border-yellow-300 rounded-xl text-xs font-bold transition-all"
                >
                  ⚡ Quick Demo: Use Sample Parent Account
                </button>
                <p className="text-[10px] text-slate-400 mt-1">
                  Prefills Mrs. Adebayo's account with 2 linked children and attendance data.
                </p>
              </div>
            </form>
          )}

          {/* SIGN UP FORM */}
          {mode === 'signup' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-1.5">
                    Parent / Guardian Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Mr. & Mrs. Adeleke"
                    className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold text-sm text-blue-950 focus:bg-white focus:border-blue-900 outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-1.5">
                    Relationship to Child *
                  </label>
                  <select
                    value={relationship}
                    onChange={(e) => setRelationship(e.target.value as any)}
                    className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold text-sm text-blue-950 focus:bg-white focus:border-blue-900 outline-none transition-all"
                  >
                    <option value="Mother">Mother</option>
                    <option value="Father">Father</option>
                    <option value="Guardian">Legal Guardian</option>
                    <option value="Other">Sponsor / Other</option>
                  </select>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-1.5">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="parent@example.com"
                    className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold text-sm text-blue-950 focus:bg-white focus:border-blue-900 outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-1.5">
                    Phone Number (WhatsApp) *
                  </label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. 08056507252"
                    className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold text-sm text-blue-950 focus:bg-white focus:border-blue-900 outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-1.5">
                  Residential Address (Optional)
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. Wire and Cable Axis, Apata, Ibadan"
                  className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold text-sm text-blue-950 focus:bg-white focus:border-blue-900 outline-none transition-all"
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-1.5">
                    Create Password *
                  </label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min. 5 characters"
                    className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold text-sm text-blue-950 focus:bg-white focus:border-blue-900 outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-1.5">
                    Confirm Password *
                  </label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat password"
                    className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold text-sm text-blue-950 focus:bg-white focus:border-blue-900 outline-none transition-all"
                  />
                </div>
              </div>

              <div className="p-3.5 bg-blue-50/60 rounded-2xl border border-blue-100 flex items-start gap-2.5 text-xs text-blue-900">
                <span className="text-base">ℹ️</span>
                <p>
                  After signing up, you can immediately add your children using their student ID or register new pupils to begin monitoring attendance and fee records.
                </p>
              </div>

              <button
                type="submit"
                className="w-full py-4 bg-blue-900 hover:bg-blue-800 text-yellow-400 font-black text-sm uppercase tracking-wider rounded-2xl shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                <span>Complete Parent Registration</span>
                <span>→</span>
              </button>
            </form>
          )}

          {/* FORGOT PASSWORD FORM */}
          {mode === 'forgot' && (
            <form 
              method="POST" 
              action="#" 
              onSubmit={handleResetSubmit} 
              className="space-y-4"
              autoComplete="off"
            >
              {resetSent ? (
                <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-2">
                  <span className="text-3xl">✅</span>
                  <p className="text-sm font-black text-emerald-800">Password Reset Complete</p>
                  <p className="text-xs text-emerald-700">
                    Your password has been updated. Returning to parent login...
                  </p>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-1.5">
                      Registered Parent Email
                    </label>
                    <input
                      type="email"
                      name="parent_reset_email"
                      required
                      value={resetEmail}
                      onChange={(e) => handleInputFilter(e.target.value, setResetEmail)}
                      placeholder="parent@example.com"
                      className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-2xl font-bold text-sm text-blue-950 focus:bg-white focus:border-blue-900 outline-none transition-all"
                    />
                  </div>

                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">
                        New Password
                      </label>
                      <input
                        type="password"
                        name="parent_reset_newpass"
                        value={newParentPass}
                        onChange={(e) => handleInputFilter(e.target.value, setNewParentPass)}
                        placeholder="••••••••"
                        className="w-full px-3.5 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold text-xs text-blue-950 focus:bg-white focus:border-blue-900 outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">
                        Confirm Password
                      </label>
                      <input
                        type="password"
                        name="parent_reset_confirmpass"
                        value={confirmParentPass}
                        onChange={(e) => handleInputFilter(e.target.value, setConfirmParentPass)}
                        placeholder="••••••••"
                        className="w-full px-3.5 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold text-xs text-blue-950 focus:bg-white focus:border-blue-900 outline-none transition-all"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-4 bg-blue-900 hover:bg-blue-800 text-yellow-400 font-black text-sm uppercase tracking-wider rounded-2xl shadow-xl transition-all"
                  >
                    Update Parent Password
                  </button>

                  {/* Immediate School Support via WhatsApp */}
                  <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 text-center space-y-1.5">
                    <p className="text-[11px] text-emerald-800 font-bold">
                      Can't remember your registered email? Contact the School Parent Helpdesk:
                    </p>
                    <a
                      href={`https://wa.me/2348130300837?text=Hello%20God's%20Hand%20Model%20School%20Helpdesk,%20I%20am%20a%20parent%20(${encodeURIComponent(resetEmail || 'Parent')})%20requesting%20assistance%20with%20my%20portal%20account%20password.`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-1.5 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all"
                    >
                      <span>💬</span>
                      <span>Request Reset on WhatsApp: 08130300837</span>
                    </a>
                  </div>

                  <button
                    type="button"
                    onClick={() => { setMode('login'); setLocalError(''); setSecurityAlert(null); }}
                    className="w-full py-2 text-xs font-black text-slate-500 hover:text-blue-900 uppercase tracking-wider text-center block"
                  >
                    Return to Login
                  </button>
                </>
              )}
            </form>
          )}

          {/* School Guarantee Footer */}
          <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-bold">
            <span>God's Hand International Model School</span>
            <span>Apata, Ibadan, Oyo State</span>
          </div>
        </div>
      </div>
    </div>
  );
};
