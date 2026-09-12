
import React, { useState, useEffect } from 'react';
import { 
  detectHackingPayload, 
  cleanHackingKeywords, 
  checkRateLimit, 
  recordFailedAttempt, 
  resetFailedAttempts 
} from '../utils/securityGuard';

interface AdminLoginGatewayProps {
  onLogin: (email: string, password: string) => void;
  onBack: () => void;
  error: string;
  onResetKey?: (newKey: string) => void;
}

export const AdminLoginGateway: React.FC<AdminLoginGatewayProps> = ({ 
  onLogin, 
  onBack, 
  error,
  onResetKey 
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [securityAlert, setSecurityAlert] = useState<string | null>(null);
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  
  // Rate limiting lock status
  const [lockoutRemaining, setLockoutRemaining] = useState<number>(0);

  // Recovery modal states
  const [recoveryCode, setRecoveryCode] = useState('');
  const [newKey, setNewKey] = useState('');
  const [confirmNewKey, setConfirmNewKey] = useState('');
  const [recoveryError, setRecoveryError] = useState('');
  const [recoverySuccess, setRecoverySuccess] = useState(false);

  // Check rate limit on mount and when error changes
  useEffect(() => {
    if (email) {
      const status = checkRateLimit(email);
      setLockoutRemaining(status.remainingSeconds);
    }
  }, [email, error]);

  // Countdown timer for lockout
  useEffect(() => {
    if (lockoutRemaining <= 0) return;
    const timer = setInterval(() => {
      setLockoutRemaining(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [lockoutRemaining]);

  const handleEmailChange = (val: string) => {
    const hackCheck = detectHackingPayload(val);
    if (hackCheck.isMalicious) {
      setSecurityAlert(`Security Guard: Injection signature blocked (${hackCheck.detectedLabel})`);
      const sanitized = cleanHackingKeywords(val);
      setEmail(sanitized);
      return;
    }
    setSecurityAlert(null);
    setEmail(val);
  };

  const handlePasswordChange = (val: string) => {
    const hackCheck = detectHackingPayload(val);
    if (hackCheck.isMalicious) {
      setSecurityAlert(`Security Guard: Malicious injection blocked (${hackCheck.detectedLabel})`);
      const sanitized = cleanHackingKeywords(val);
      setPassword(sanitized);
      return;
    }
    setSecurityAlert(null);
    setPassword(val);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSecurityAlert(null);

    // Enforce rate limiting
    const rateStatus = checkRateLimit(email || 'admin');
    if (rateStatus.isLocked) {
      setLockoutRemaining(rateStatus.remainingSeconds);
      setSecurityAlert(`Account temporarily locked for security. Please wait ${rateStatus.remainingSeconds}s.`);
      return;
    }

    // Final security scrub before submission
    const emailCheck = detectHackingPayload(email);
    const passCheck = detectHackingPayload(password);

    if (emailCheck.isMalicious || passCheck.isMalicious) {
      setSecurityAlert("Access Denied: Malicious characters or SQL/XSS syntax detected in credentials.");
      return;
    }

    onLogin(email.trim(), password.trim());
  };

  const handleRecoverySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setRecoveryError('');

    // Master school recovery authorization
    // Accepts master emergency phrase or administrator confirmation
    const normalizedCode = recoveryCode.trim().toUpperCase();
    const isValidRecovery = 
      normalizedCode === 'GHIMS-PROPRIETOR-2026' || 
      normalizedCode === '197005' ||
      normalizedCode === 'GODSHAND-RECOVER';

    if (!isValidRecovery) {
      setRecoveryError('Invalid Recovery Passcode. Please contact the Proprietor Desk directly.');
      return;
    }

    if (newKey.length < 5) {
      setRecoveryError('New Security Key must be at least 5 characters/digits.');
      return;
    }

    if (newKey !== confirmNewKey) {
      setRecoveryError('Security Keys do not match.');
      return;
    }

    // Update in application state/storage
    if (onResetKey) {
      onResetKey(newKey);
    } else {
      localStorage.setItem('ghs_admin_key', newKey);
    }

    setRecoverySuccess(true);
    setTimeout(() => {
      setPassword(newKey);
      setIsForgotModalOpen(false);
      setRecoverySuccess(false);
      setRecoveryCode('');
      setNewKey('');
      setConfirmNewKey('');
    }, 2000);
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border-4 border-blue-900 relative">
          <div className="absolute top-0 left-0 w-full h-2 bg-yellow-400"></div>
          
          <div className="px-6 sm:px-10 py-10 sm:py-12">
            <div className="flex justify-center mb-8">
              <div className="w-28 h-28 sm:w-32 sm:h-32 bg-white rounded-3xl border-4 border-yellow-400 shadow-2xl ring-4 ring-blue-900/20 flex items-center justify-center overflow-hidden">
                <img 
                  src="/logo.png" 
                  alt="God's Hand International Model School Logo" 
                  className="w-[80%] h-[80%] object-contain"
                  onError={(e) => {
                    if (!e.currentTarget.src.endsWith('hands.jpg')) {
                      e.currentTarget.src = 'hands.jpg';
                    } else {
                      e.currentTarget.style.display = 'none';
                      if (e.currentTarget.parentElement) {
                        e.currentTarget.parentElement.innerHTML = '<div class="w-full h-full bg-blue-900 text-yellow-400 flex items-center justify-center text-3xl font-black font-serif rounded-2xl">GHIMS</div>';
                      }
                    }
                  }}
                />
              </div>
            </div>

            <div className="text-center mb-8">
              <h2 className="text-2xl sm:text-3xl font-black text-blue-900 uppercase tracking-tighter font-serif">Proprietor Gateway</h2>
              <div className="h-1.5 w-16 bg-yellow-400 rounded-full mx-auto mt-2 mb-2"></div>
              <p className="text-slate-500 font-bold text-xs uppercase tracking-widest">Authorized School Management Only</p>
            </div>

            {/* Security Guard Active Banner */}
            {securityAlert && (
              <div className="p-3.5 mb-6 bg-red-50 border-2 border-red-200 rounded-2xl text-red-700 text-xs font-bold flex items-start gap-2 animate-shake">
                <span className="text-base leading-none">🛡️</span>
                <span className="leading-snug">{securityAlert}</span>
              </div>
            )}

            {/* Rate Limit Lockout Banner */}
            {lockoutRemaining > 0 && (
              <div className="p-4 mb-6 bg-amber-50 border-2 border-amber-300 rounded-2xl text-amber-800 text-xs font-bold text-center space-y-1">
                <div className="text-lg">⏳ Brute-Force Lockout Engaged</div>
                <p>Too many failed attempts. Security cooldown active for <span className="font-black text-amber-950 text-sm">{lockoutRemaining}s</span>.</p>
              </div>
            )}

            {/* POST Form - Strictly prevents GET query leakage */}
            <form 
              method="POST" 
              action="#" 
              onSubmit={handleSubmit} 
              className="space-y-5"
              autoComplete="off"
            >
              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] px-1">Admin Identity (Email)</label>
                <div className="relative group">
                  <span className="absolute left-5 top-1/2 -translate-y-1/2 text-blue-900 opacity-50">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                      <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                    </svg>
                  </span>
                  <input 
                    type="email"
                    name="admin_email"
                    required
                    disabled={lockoutRemaining > 0}
                    value={email}
                    onChange={(e) => handleEmailChange(e.target.value)}
                    placeholder="e.g. godshandschool70@gmail.com"
                    autoComplete="username"
                    className="w-full pl-14 pr-6 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-sm text-blue-900 focus:ring-4 focus:ring-blue-900/10 focus:bg-white outline-none transition-all shadow-inner disabled:opacity-50"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between px-1">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Security Key</label>
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-[10px] font-black uppercase tracking-wider text-blue-900 hover:text-yellow-600 transition-colors"
                  >
                    {showPassword ? 'Hide Key' : 'Show Key'}
                  </button>
                </div>
                <div className="relative group">
                  <span className="absolute left-5 top-1/2 -translate-y-1/2 text-blue-900 opacity-50">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                    </svg>
                  </span>
                  <input 
                    type={showPassword ? 'text' : 'password'}
                    name="admin_security_key"
                    required
                    disabled={lockoutRemaining > 0}
                    value={password}
                    onChange={(e) => handlePasswordChange(e.target.value)}
                    placeholder="••••••"
                    autoComplete="current-password"
                    spellCheck="false"
                    autoCorrect="off"
                    autoCapitalize="off"
                    className={`w-full pl-14 pr-12 py-3.5 bg-slate-50 border-2 rounded-2xl font-black text-lg tracking-widest text-center text-blue-900 focus:ring-4 focus:ring-blue-900/10 focus:bg-white outline-none transition-all shadow-inner disabled:opacity-50 ${error ? 'border-red-300' : 'border-slate-100 focus:border-blue-900'}`}
                  />
                </div>

                {/* Forgotten Password / Key Action Button */}
                <div className="flex items-center justify-between pt-1 px-1">
                  <button
                    type="button"
                    onClick={() => setIsForgotModalOpen(true)}
                    className="text-[11px] font-black uppercase tracking-wider text-blue-900 hover:text-yellow-600 transition-colors inline-flex items-center gap-1"
                  >
                    <span>🔑</span>
                    <span className="underline decoration-yellow-400 underline-offset-2">Forgot Security Key?</span>
                  </button>

                  <span className="text-[10px] text-slate-400 font-bold">
                    Apata, Ibadan
                  </span>
                </div>

                {error && (
                  <div className="flex items-center justify-center text-red-600 font-black text-[11px] uppercase tracking-wider mt-3 p-2 bg-red-50 rounded-xl border border-red-100 animate-bounce">
                    <span className="mr-1.5">⚠️</span> {error}
                  </div>
                )}
              </div>

              <button 
                type="submit"
                disabled={lockoutRemaining > 0}
                className="w-full py-4.5 bg-blue-900 text-yellow-400 font-black text-lg rounded-2xl shadow-xl hover:bg-blue-800 transition-all transform hover:-translate-y-0.5 active:scale-95 flex items-center justify-center group disabled:opacity-50 disabled:pointer-events-none"
              >
                <span>Proprietor Access</span>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                </svg>
              </button>

              <button 
                type="button"
                onClick={onBack}
                className="w-full py-3 text-slate-400 font-black text-xs uppercase tracking-widest hover:text-blue-900 transition-colors"
              >
                Return to School Home
              </button>
            </form>
          </div>

          <div className="bg-slate-50 px-6 sm:px-10 py-5 text-center border-t-2 border-slate-100">
            <p className="text-[10px] text-slate-400 font-bold uppercase leading-relaxed">
              Proprietor: God's Hand International Model School<br/>
              <span className="text-blue-900 font-black">Have Faith In God • Wire & Cable, Apata, Ibadan</span>
            </p>
          </div>
        </div>
      </div>

      {/* FORGOTTEN PASSWORD & KEY RECOVERY MODAL */}
      {isForgotModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-blue-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-lg w-full overflow-hidden border-4 border-yellow-400 relative">
            <div className="h-2.5 bg-gradient-to-r from-blue-900 via-yellow-400 to-blue-900"></div>

            <div className="p-6 sm:p-8">
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🔑</span>
                  <h3 className="text-xl font-black text-blue-900 font-serif">Proprietor Key Recovery</h3>
                </div>
                <button 
                  type="button"
                  onClick={() => setIsForgotModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 font-bold flex items-center justify-center"
                >
                  ✕
                </button>
              </div>

              {recoverySuccess ? (
                <div className="p-6 bg-emerald-50 border-2 border-emerald-300 rounded-2xl text-center space-y-2">
                  <span className="text-4xl">✅</span>
                  <h4 className="text-base font-black text-emerald-900">Security Key Updated Successfully!</h4>
                  <p className="text-xs text-emerald-700 font-medium">
                    Your new Security Key is now active. Loading your updated credentials...
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Immediate WhatsApp Verification Option */}
                  <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-emerald-900 uppercase tracking-wider">Fastest Method: WhatsApp Desk</span>
                      <span className="text-lg">💬</span>
                    </div>
                    <p className="text-xs text-emerald-800 leading-relaxed">
                      Send an encrypted key reset request directly to the School Proprietor verification hotline:
                    </p>
                    <a
                      href="https://wa.me/2348130300837?text=Hello%20God's%20Hand%20Model%20School%20Proprietor%20Desk,%20I%20need%20to%20reset%20the%20administrative%20Security%20Key%20for%20the%20School%20Management%20Portal."
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md transition-all"
                    >
                      <span>💬</span>
                      <span>Request Reset on WhatsApp: 08130300837</span>
                    </a>
                  </div>

                  {/* School Email Recovery Info */}
                  <div className="p-4 bg-blue-50 rounded-2xl border border-blue-200 space-y-1 text-xs text-blue-900">
                    <p className="font-black uppercase tracking-wider">Official Administrative Email:</p>
                    <p className="text-blue-800">
                      Emergency reset records can also be dispatched to <span className="font-black underline">godshandschool70@gmail.com</span>.
                    </p>
                  </div>

                  {/* Self-Service Master Passcode Reset Form */}
                  <form onSubmit={handleRecoverySubmit} className="space-y-4 pt-2">
                    <div className="border-t border-slate-100 pt-4">
                      <p className="text-xs font-black text-slate-600 uppercase tracking-wider mb-3">
                        Or Enter Emergency Master Passcode:
                      </p>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                        Master Passcode / Current Key
                      </label>
                      <input 
                        type="password"
                        required
                        value={recoveryCode}
                        onChange={(e) => setRecoveryCode(e.target.value)}
                        placeholder="Default master phrase or 197005"
                        className="w-full px-4 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold text-xs text-blue-900 outline-none focus:border-blue-900"
                      />
                      <p className="text-[9px] text-slate-400 italic">
                        Tip: Initial default master recovery code is 197005 or GHIMS-PROPRIETOR-2026
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                          New Security Key
                        </label>
                        <input 
                          type="password"
                          required
                          value={newKey}
                          onChange={(e) => setNewKey(e.target.value)}
                          placeholder="••••••"
                          className="w-full px-4 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold text-xs text-blue-900 outline-none focus:border-blue-900"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                          Confirm New Key
                        </label>
                        <input 
                          type="password"
                          required
                          value={confirmNewKey}
                          onChange={(e) => setConfirmNewKey(e.target.value)}
                          placeholder="••••••"
                          className="w-full px-4 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold text-xs text-blue-900 outline-none focus:border-blue-900"
                        />
                      </div>
                    </div>

                    {recoveryError && (
                      <div className="text-red-600 text-xs font-bold text-center bg-red-50 p-2 rounded-lg border border-red-200">
                        ⚠️ {recoveryError}
                      </div>
                    )}

                    <div className="flex gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setIsForgotModalOpen(false)}
                        className="flex-1 py-3 border-2 border-slate-200 rounded-xl text-xs font-black uppercase tracking-wider text-slate-600 hover:bg-slate-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="flex-1 py-3 bg-blue-900 text-yellow-400 rounded-xl text-xs font-black uppercase tracking-wider shadow-lg hover:bg-blue-800"
                      >
                        Reset Key Now
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

