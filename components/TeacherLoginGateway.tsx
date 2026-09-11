
import React, { useState, useEffect } from 'react';
import { 
  detectHackingPayload, 
  cleanHackingKeywords, 
  checkRateLimit 
} from '../utils/securityGuard';

interface TeacherLoginGatewayProps {
  onLogin: (username: string, password: string) => void;
  onBack: () => void;
  error: string;
  onResetPassword?: (username: string, newPass: string) => boolean;
}

export const TeacherLoginGateway: React.FC<TeacherLoginGatewayProps> = ({ 
  onLogin, 
  onBack, 
  error,
  onResetPassword 
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [securityAlert, setSecurityAlert] = useState<string | null>(null);
  
  // Rate limiting lockout state
  const [lockoutRemaining, setLockoutRemaining] = useState<number>(0);

  // Forgot password modal
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [forgotUsername, setForgotUsername] = useState('');
  const [newStaffPass, setNewStaffPass] = useState('');
  const [confirmStaffPass, setConfirmStaffPass] = useState('');
  const [staffPasscode, setStaffPasscode] = useState('');
  const [resetError, setResetError] = useState('');
  const [resetSuccess, setResetSuccess] = useState(false);

  useEffect(() => {
    if (username) {
      const status = checkRateLimit(username);
      setLockoutRemaining(status.remainingSeconds);
    }
  }, [username, error]);

  useEffect(() => {
    if (lockoutRemaining <= 0) return;
    const timer = setInterval(() => {
      setLockoutRemaining(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [lockoutRemaining]);

  const handleUsernameChange = (val: string) => {
    const hackCheck = detectHackingPayload(val);
    if (hackCheck.isMalicious) {
      setSecurityAlert(`Security Guard: Injection pattern blocked (${hackCheck.detectedLabel})`);
      setUsername(cleanHackingKeywords(val));
      return;
    }
    setSecurityAlert(null);
    setUsername(val);
  };

  const handlePasswordChange = (val: string) => {
    const hackCheck = detectHackingPayload(val);
    if (hackCheck.isMalicious) {
      setSecurityAlert(`Security Guard: Malicious injection blocked (${hackCheck.detectedLabel})`);
      setPassword(cleanHackingKeywords(val));
      return;
    }
    setSecurityAlert(null);
    setPassword(val);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSecurityAlert(null);

    const rateStatus = checkRateLimit(username || 'teacher');
    if (rateStatus.isLocked) {
      setLockoutRemaining(rateStatus.remainingSeconds);
      setSecurityAlert(`Staff Portal temporarily locked. Please wait ${rateStatus.remainingSeconds}s.`);
      return;
    }

    const uCheck = detectHackingPayload(username);
    const pCheck = detectHackingPayload(password);

    if (uCheck.isMalicious || pCheck.isMalicious) {
      setSecurityAlert("Access Denied: Malicious characters or SQL/XSS syntax blocked.");
      return;
    }

    onLogin(username.trim(), password.trim());
  };

  const handleStaffResetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setResetError('');

    if (!forgotUsername.trim()) {
      setResetError('Please enter your Staff Username.');
      return;
    }

    if (newStaffPass.length < 5) {
      setResetError('New password must be at least 5 characters long.');
      return;
    }

    if (newStaffPass !== confirmStaffPass) {
      setResetError('Passwords do not match.');
      return;
    }

    // Check staff authorization passcode (Admin master recovery or school staff key)
    const normalizedCode = staffPasscode.trim().toUpperCase();
    const isAuthorized = normalizedCode === 'GHIMS-STAFF' || normalizedCode === '197005' || normalizedCode === 'TEACHER2026';

    if (!isAuthorized) {
      setResetError('Invalid Staff Verification Passcode. Please contact the School Admin via WhatsApp.');
      return;
    }

    if (onResetPassword) {
      const success = onResetPassword(forgotUsername.trim(), newStaffPass);
      if (!success) {
        setResetError('Staff account not found. Please verify your username.');
        return;
      }
    }

    setResetSuccess(true);
    setTimeout(() => {
      setUsername(forgotUsername);
      setPassword(newStaffPass);
      setIsForgotModalOpen(false);
      setResetSuccess(false);
    }, 2000);
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border-4 border-yellow-400 relative">
          <div className="absolute top-0 left-0 w-full h-2 bg-blue-900"></div>
          
          <div className="px-6 sm:px-10 py-10 sm:py-12">
            <div className="flex justify-center mb-8">
              <div className="w-28 h-28 bg-white rounded-3xl border-3 border-yellow-400 shadow-xl ring-4 ring-blue-900/10 overflow-hidden flex items-center justify-center">
                <img 
                  src="/logo.png" 
                  alt="God's Hand International Model School Logo" 
                  className="w-[80%] h-[80%] object-contain"
                  onError={(e) => { e.currentTarget.src = 'hands.jpg'; }}
                />
              </div>
            </div>

            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100 text-emerald-900 rounded-full text-[10px] font-black uppercase tracking-wider mb-2 border border-emerald-300">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Anti-Injection Guard & POST-Secured</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-blue-900 uppercase tracking-tighter font-serif">Staff Portal</h2>
              <div className="h-1.5 w-16 bg-blue-900 rounded-full mx-auto mt-2 mb-2"></div>
              <p className="text-slate-500 font-bold text-xs uppercase tracking-widest">Teacher & Academic Staff Login</p>
            </div>

            {/* Security Alert Banner */}
            {securityAlert && (
              <div className="p-3 mb-6 bg-red-50 border-2 border-red-200 rounded-2xl text-red-700 text-xs font-bold flex items-start gap-2">
                <span className="text-base leading-none">🛡️</span>
                <span className="leading-snug">{securityAlert}</span>
              </div>
            )}

            {/* Lockout Warning */}
            {lockoutRemaining > 0 && (
              <div className="p-4 mb-6 bg-amber-50 border-2 border-amber-300 rounded-2xl text-amber-800 text-xs font-bold text-center space-y-1">
                <div className="text-lg">⏳ Security Lockout Active</div>
                <p>Too many failed attempts. Try again in <span className="font-black text-amber-950 text-sm">{lockoutRemaining}s</span>.</p>
              </div>
            )}

            <form 
              method="POST" 
              action="#" 
              onSubmit={handleSubmit} 
              className="space-y-5"
              autoComplete="off"
            >
              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Staff Username</label>
                <input 
                  type="text"
                  name="teacher_username"
                  required
                  disabled={lockoutRemaining > 0}
                  value={username}
                  onChange={(e) => handleUsernameChange(e.target.value)}
                  placeholder="e.g. benson_j"
                  autoComplete="username"
                  className="w-full px-5 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-sm text-blue-900 focus:ring-4 focus:ring-blue-100 focus:bg-white outline-none transition-all shadow-inner disabled:opacity-50"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between px-1">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Password</label>
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-[10px] font-black uppercase tracking-wider text-blue-900 hover:text-yellow-600 transition-colors"
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
                <input 
                  type={showPassword ? 'text' : 'password'}
                  name="teacher_password"
                  required
                  disabled={lockoutRemaining > 0}
                  value={password}
                  onChange={(e) => handlePasswordChange(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  spellCheck="false"
                  autoCorrect="off"
                  autoCapitalize="off"
                  className={`w-full px-5 py-3.5 bg-slate-50 border-2 rounded-2xl font-bold text-sm text-blue-900 focus:ring-4 focus:ring-blue-100 focus:bg-white outline-none transition-all shadow-inner disabled:opacity-50 ${error ? 'border-red-300' : 'border-slate-100 focus:border-blue-900'}`}
                />
                
                {/* Forgotten Password Button */}
                <div className="flex items-center justify-between pt-1 px-1">
                  <button
                    type="button"
                    onClick={() => setIsForgotModalOpen(true)}
                    className="text-[11px] font-black uppercase tracking-wider text-blue-900 hover:text-yellow-600 transition-colors inline-flex items-center gap-1"
                  >
                    <span>🔑</span>
                    <span className="underline decoration-yellow-400 underline-offset-2">Forgot Staff Password?</span>
                  </button>

                  <span className="text-[10px] text-slate-400 font-bold">
                    Faculty Desk
                  </span>
                </div>

                {error && (
                  <div className="text-center text-red-500 font-bold text-xs mt-2 uppercase tracking-widest p-2 bg-red-50 rounded-xl border border-red-100">{error}</div>
                )}
              </div>

              <button 
                type="submit"
                disabled={lockoutRemaining > 0}
                className="w-full py-4.5 bg-blue-900 text-yellow-400 font-black text-lg rounded-2xl shadow-xl hover:bg-blue-800 transition-all transform hover:-translate-y-0.5 active:scale-95 flex items-center justify-center disabled:opacity-50 disabled:pointer-events-none"
              >
                Login to Staff Dashboard
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
        </div>
      </div>

      {/* STAFF FORGOTTEN PASSWORD MODAL */}
      {isForgotModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-blue-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-lg w-full overflow-hidden border-4 border-yellow-400 relative">
            <div className="h-2.5 bg-gradient-to-r from-blue-900 via-yellow-400 to-blue-900"></div>

            <div className="p-6 sm:p-8">
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">👨‍🏫</span>
                  <h3 className="text-xl font-black text-blue-900 font-serif">Staff Password Recovery</h3>
                </div>
                <button 
                  type="button"
                  onClick={() => setIsForgotModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 font-bold flex items-center justify-center"
                >
                  ✕
                </button>
              </div>

              {resetSuccess ? (
                <div className="p-6 bg-emerald-50 border-2 border-emerald-300 rounded-2xl text-center space-y-2">
                  <span className="text-4xl">✅</span>
                  <h4 className="text-base font-black text-emerald-900">Staff Password Updated!</h4>
                  <p className="text-xs text-emerald-700 font-medium">
                    You can now log in with your updated credentials. Returning to login...
                  </p>
                </div>
              ) : (
                <div className="space-y-5">
                  {/* WhatsApp Admin Request Option */}
                  <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 space-y-2">
                    <span className="text-xs font-black text-emerald-900 uppercase tracking-wider block">Official Support Helpline</span>
                    <p className="text-xs text-emerald-800 leading-relaxed">
                      Need immediate assistance? Ping the School Administration via WhatsApp:
                    </p>
                    <a
                      href={`https://wa.me/2348130300837?text=Hello%20School%20Admin,%20I%20am%20staff%20member%20${encodeURIComponent(forgotUsername || 'Faculty')}%20requesting%20a%20password%20reset%20for%20my%20Teacher%20Portal%20account.`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md transition-all"
                    >
                      <span>💬</span>
                      <span>Request Admin Reset via WhatsApp</span>
                    </a>
                  </div>

                  {/* Self-Service Reset Form */}
                  <form onSubmit={handleStaffResetSubmit} className="space-y-3.5 pt-1">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                        Staff Username
                      </label>
                      <input 
                        type="text"
                        required
                        value={forgotUsername}
                        onChange={(e) => setForgotUsername(e.target.value)}
                        placeholder="e.g. benson_j"
                        className="w-full px-4 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold text-xs text-blue-900 outline-none focus:border-blue-900"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                        Staff Verification Passcode (or Admin Key)
                      </label>
                      <input 
                        type="password"
                        required
                        value={staffPasscode}
                        onChange={(e) => setStaffPasscode(e.target.value)}
                        placeholder="e.g. GHIMS-STAFF or 197005"
                        className="w-full px-4 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold text-xs text-blue-900 outline-none focus:border-blue-900"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                          New Password
                        </label>
                        <input 
                          type="password"
                          required
                          value={newStaffPass}
                          onChange={(e) => setNewStaffPass(e.target.value)}
                          placeholder="••••••••"
                          className="w-full px-4 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold text-xs text-blue-900 outline-none focus:border-blue-900"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                          Confirm Password
                        </label>
                        <input 
                          type="password"
                          required
                          value={confirmStaffPass}
                          onChange={(e) => setConfirmStaffPass(e.target.value)}
                          placeholder="••••••••"
                          className="w-full px-4 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold text-xs text-blue-900 outline-none focus:border-blue-900"
                        />
                      </div>
                    </div>

                    {resetError && (
                      <div className="text-red-600 text-xs font-bold text-center bg-red-50 p-2 rounded-lg border border-red-200">
                        ⚠️ {resetError}
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
                        Update Password
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

