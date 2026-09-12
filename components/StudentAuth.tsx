
import React, { useState, useEffect } from 'react';
import { GradeLevel, StudentAccount } from '../types';
import { GRADE_GROUPS } from '../constants';
import { 
  detectHackingPayload, 
  cleanHackingKeywords, 
  checkRateLimit 
} from '../utils/securityGuard';

interface StudentAuthProps {
  onLogin: (email: string, pass: string) => void;
  onRegister: (account: Omit<StudentAccount, 'id' | 'createdAt'>) => void;
  onBack: () => void;
  error: string;
  onResetPassword?: (emailOrId: string, newPass: string) => boolean;
}

export const StudentAuth: React.FC<StudentAuthProps> = ({ 
  onLogin, 
  onRegister, 
  onBack, 
  error,
  onResetPassword 
}) => {
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [securityAlert, setSecurityAlert] = useState<string | null>(null);
  
  // Rate limiting lockout state
  const [lockoutRemaining, setLockoutRemaining] = useState<number>(0);

  // Login State
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPass, setLoginPass] = useState('');

  // Register State
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPass, setRegPass] = useState('');
  const [regGrade, setRegGrade] = useState<GradeLevel>('Primary 1');
  const currentYear = new Date().getFullYear();
  const [regAdmissionYear, setRegAdmissionYear] = useState<number>(currentYear);

  // Forgot Pass State
  const [forgotEmailOrId, setForgotEmailOrId] = useState('');
  const [newStudentPass, setNewStudentPass] = useState('');
  const [confirmStudentPass, setConfirmStudentPass] = useState('');
  const [resetError, setResetError] = useState('');
  const [isResetSent, setIsResetSent] = useState(false);

  useEffect(() => {
    if (loginEmail) {
      const status = checkRateLimit(loginEmail);
      setLockoutRemaining(status.remainingSeconds);
    }
  }, [loginEmail, error]);

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
      setSecurityAlert(`Security Guard: Injection signature blocked (${hackCheck.detectedLabel})`);
      setter(cleanHackingKeywords(val));
      return;
    }
    setSecurityAlert(null);
    setter(val);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setSecurityAlert(null);

    const rateStatus = checkRateLimit(loginEmail || 'student');
    if (rateStatus.isLocked) {
      setLockoutRemaining(rateStatus.remainingSeconds);
      setSecurityAlert(`Student Portal locked. Please wait ${rateStatus.remainingSeconds}s.`);
      return;
    }

    const emailCheck = detectHackingPayload(loginEmail);
    const passCheck = detectHackingPayload(loginPass);
    if (emailCheck.isMalicious || passCheck.isMalicious) {
      setSecurityAlert("Malicious syntax blocked. Access denied.");
      return;
    }

    onLogin(loginEmail.trim(), loginPass.trim());
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setSecurityAlert(null);

    const nameCheck = detectHackingPayload(regName);
    const emailCheck = detectHackingPayload(regEmail);
    const passCheck = detectHackingPayload(regPass);
    if (nameCheck.isMalicious || emailCheck.isMalicious || passCheck.isMalicious) {
      setSecurityAlert("Prohibited input characters or injection detected in registration form.");
      return;
    }

    onRegister({ 
      name: regName.trim(), 
      email: regEmail.trim().toLowerCase(), 
      password: regPass.trim(), 
      grade: regGrade,
      admissionYear: regAdmissionYear
    });
  };

  const handleForgot = (e: React.FormEvent) => {
    e.preventDefault();
    setResetError('');

    if (!forgotEmailOrId.trim()) {
      setResetError('Please enter your Student ID or Registered Email.');
      return;
    }

    if (newStudentPass) {
      if (newStudentPass.length < 5) {
        setResetError('New password must be at least 5 characters long.');
        return;
      }
      if (newStudentPass !== confirmStudentPass) {
        setResetError('Passwords do not match.');
        return;
      }
      if (onResetPassword) {
        const ok = onResetPassword(forgotEmailOrId.trim(), newStudentPass);
        if (!ok) {
          setResetError('Student account with this Email or ID was not found.');
          return;
        }
      }
    }

    setIsResetSent(true);
    setTimeout(() => {
      setIsResetSent(false);
      setMode('login');
      setLoginEmail(forgotEmailOrId);
      if (newStudentPass) setLoginPass(newStudentPass);
    }, 2500);
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border-4 border-blue-900 relative">
        <div className="absolute top-0 left-0 w-full h-2 bg-yellow-400"></div>
        
        <div className="px-6 sm:px-10 py-10 sm:py-12">
          <div className="flex justify-center mb-6">
            <div className="w-24 h-24 sm:w-28 sm:h-28 bg-white rounded-3xl border-3 border-yellow-400 shadow-xl ring-4 ring-blue-900/10 overflow-hidden flex items-center justify-center">
              <img 
                src="/logo.png" 
                alt="God's Hand International Model School Logo" 
                className="w-[80%] h-[80%] object-contain"
                onError={(e) => { e.currentTarget.src = 'hands.jpg'; }}
              />
            </div>
          </div>

          <div className="text-center mb-8">
            <h2 className="text-2xl sm:text-3xl font-black text-blue-900 uppercase tracking-tighter font-serif">
              {mode === 'login' && 'Students & Pupils Login'}
              {mode === 'register' && 'New Student & Pupil Account'}
              {mode === 'forgot' && 'Reset Student Password'}
            </h2>
            <div className="h-1.5 w-16 bg-yellow-400 rounded-full mx-auto mt-2"></div>
          </div>

          {/* Security alert */}
          {securityAlert && (
            <div className="p-3 mb-6 bg-red-50 border-2 border-red-200 rounded-2xl text-red-700 text-xs font-bold flex items-start gap-2">
              <span className="text-base leading-none">🛡️</span>
              <span className="leading-snug">{securityAlert}</span>
            </div>
          )}

          {/* Lockout alert */}
          {lockoutRemaining > 0 && (
            <div className="p-4 mb-6 bg-amber-50 border-2 border-amber-300 rounded-2xl text-amber-800 text-xs font-bold text-center space-y-1">
              <div className="text-lg">⏳ Lockout Active</div>
              <p>Too many failed attempts. Try again in <span className="font-black text-amber-950 text-sm">{lockoutRemaining}s</span>.</p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-xl text-xs font-bold uppercase tracking-widest text-center mb-6 border border-red-100">
              {error}
            </div>
          )}

          {mode === 'login' && (
            <form 
              method="POST" 
              action="#" 
              onSubmit={handleLogin} 
              className="space-y-5"
              autoComplete="off"
            >
              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Email or Student ID</label>
                <input 
                  type="text" 
                  name="student_email"
                  required 
                  disabled={lockoutRemaining > 0}
                  value={loginEmail}
                  onChange={(e) => handleInputFilter(e.target.value, setLoginEmail)}
                  className="w-full px-5 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-sm text-blue-900 focus:bg-white focus:ring-4 focus:ring-blue-100 outline-none transition-all disabled:opacity-50"
                  placeholder="student@email.com or STU-1"
                  autoComplete="username"
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
                  name="student_password"
                  required 
                  disabled={lockoutRemaining > 0}
                  value={loginPass}
                  onChange={(e) => handleInputFilter(e.target.value, setLoginPass)}
                  className="w-full px-5 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-sm text-blue-900 focus:bg-white focus:ring-4 focus:ring-blue-100 outline-none transition-all disabled:opacity-50"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  spellCheck="false"
                  autoCorrect="off"
                  autoCapitalize="off"
                />
              </div>

              {/* Action Buttons: Forgotten Password & Create Account */}
              <div className="flex justify-between items-center text-[11px] font-black uppercase tracking-wider px-1 pt-1">
                <button 
                  type="button" 
                  onClick={() => { setMode('forgot'); setSecurityAlert(null); }} 
                  className="text-blue-900 hover:text-yellow-600 inline-flex items-center gap-1"
                >
                  <span>🔑</span>
                  <span className="underline decoration-yellow-400 underline-offset-2">Forgot Password?</span>
                </button>
                <button 
                  type="button" 
                  onClick={() => { setMode('register'); setSecurityAlert(null); }} 
                  className="text-yellow-600 hover:text-blue-900"
                >
                  Create Account
                </button>
              </div>

              <button 
                type="submit" 
                disabled={lockoutRemaining > 0}
                className="w-full py-4.5 bg-blue-900 text-yellow-400 font-black text-lg rounded-2xl shadow-xl hover:bg-blue-800 transition-all transform hover:-translate-y-0.5 disabled:opacity-50 disabled:pointer-events-none"
              >
                Enter Students & Pupils Hub
              </button>
            </form>
          )}

          {mode === 'register' && (
            <form 
              method="POST" 
              action="#" 
              onSubmit={handleRegister} 
              className="space-y-4"
              autoComplete="off"
            >
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Full Name</label>
                <input 
                  type="text" 
                  name="reg_fullname"
                  required 
                  value={regName}
                  onChange={(e) => handleInputFilter(e.target.value, setRegName)}
                  className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-xs text-blue-900 focus:bg-white outline-none transition-all"
                  placeholder="e.g. Samuel Adebayo"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Email</label>
                <input 
                  type="email" 
                  name="reg_email"
                  required 
                  value={regEmail}
                  onChange={(e) => handleInputFilter(e.target.value, setRegEmail)}
                  className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-xs text-blue-900 focus:bg-white outline-none transition-all"
                  placeholder="samuel@godshand.sch.ng"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Current Grade</label>
                <select 
                  value={regGrade}
                  onChange={(e) => setRegGrade(e.target.value as GradeLevel)}
                  className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-xs text-blue-900 focus:bg-white outline-none transition-all"
                >
                   {GRADE_GROUPS.flatMap(g => g.levels).map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>

              {/* Year Student Started Attending The School */}
              <div className="space-y-2 p-3 bg-blue-50/70 border-2 border-blue-100 rounded-2xl">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-black text-blue-950 uppercase tracking-wider flex items-center gap-1">
                    <span>📅</span>
                    <span>Year Started Attending School</span>
                  </label>
                  <span className="text-[11px] font-black bg-yellow-400 text-blue-950 px-2 py-0.5 rounded-lg shadow-xs">
                    {regAdmissionYear}
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-1.5">
                  {[currentYear, currentYear - 1, currentYear - 2, currentYear - 3, currentYear - 4, currentYear - 5, currentYear - 6].map((yr) => (
                    <button
                      type="button"
                      key={yr}
                      onClick={() => setRegAdmissionYear(yr)}
                      className={`py-2 px-1 text-xs font-black rounded-xl border transition-all ${
                        regAdmissionYear === yr
                          ? 'bg-blue-900 text-yellow-400 border-blue-900 shadow-md scale-[1.02]'
                          : 'bg-white text-slate-700 border-blue-100 hover:bg-blue-100/50'
                      }`}
                    >
                      {yr === currentYear ? `${yr} ★` : yr}
                    </button>
                  ))}
                  
                  {/* Stepper buttons to easily adjust to any past year */}
                  <div className="flex items-center bg-white border border-blue-200 rounded-xl overflow-hidden shadow-2xs">
                    <button
                      type="button"
                      onClick={() => setRegAdmissionYear(prev => Math.max(2010, prev - 1))}
                      className="w-1/2 py-2 text-xs font-black text-blue-900 hover:bg-yellow-200 active:bg-yellow-300 transition-colors"
                      title="Earlier Year"
                    >
                      ▼
                    </button>
                    <button
                      type="button"
                      onClick={() => setRegAdmissionYear(prev => Math.min(currentYear + 1, prev + 1))}
                      className="w-1/2 py-2 text-xs font-black text-blue-900 hover:bg-yellow-200 active:bg-yellow-300 transition-colors"
                      title="Later Year"
                    >
                      ▲
                    </button>
                  </div>
                </div>
                <p className="text-[9px] text-blue-900/70 font-medium">
                  Click the button representing the year the student/pupil first enrolled at God's Hand International Model School.
                </p>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Password</label>
                <input 
                  type="password" 
                  name="reg_password"
                  required 
                  value={regPass}
                  onChange={(e) => handleInputFilter(e.target.value, setRegPass)}
                  className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-xs text-blue-900 focus:bg-white outline-none transition-all"
                  placeholder="At least 5 characters"
                  autoComplete="new-password"
                />
              </div>
              <button type="submit" className="w-full py-4 bg-blue-900 text-yellow-400 font-black rounded-2xl shadow-lg mt-2 hover:bg-blue-800 transition-all">
                Register Student / Pupil
              </button>
              <button type="button" onClick={() => setMode('login')} className="w-full text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2 hover:text-blue-900">
                Already have an account? Login
              </button>
            </form>
          )}

          {mode === 'forgot' && (
            <div className="space-y-5">
              {!isResetSent ? (
                <form 
                  method="POST" 
                  action="#" 
                  onSubmit={handleForgot} 
                  className="space-y-4"
                  autoComplete="off"
                >
                  <p className="text-slate-500 text-xs text-center leading-relaxed font-medium">
                    Enter your registered Student Email or Student ID to reset your portal password.
                  </p>

                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">
                      Student ID or Email
                    </label>
                    <input 
                      type="text" 
                      name="forgot_identifier"
                      required 
                      value={forgotEmailOrId}
                      onChange={(e) => handleInputFilter(e.target.value, setForgotEmailOrId)}
                      className="w-full px-5 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-sm text-blue-900 focus:bg-white outline-none transition-all"
                      placeholder="e.g. STU-1 or student@email.com"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">New Password</label>
                      <input 
                        type="password"
                        value={newStudentPass}
                        onChange={(e) => handleInputFilter(e.target.value, setNewStudentPass)}
                        placeholder="New password"
                        className="w-full px-3.5 py-2.5 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold text-xs text-blue-900 outline-none focus:border-blue-900"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Confirm Password</label>
                      <input 
                        type="password"
                        value={confirmStudentPass}
                        onChange={(e) => handleInputFilter(e.target.value, setConfirmStudentPass)}
                        placeholder="Confirm password"
                        className="w-full px-3.5 py-2.5 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold text-xs text-blue-900 outline-none focus:border-blue-900"
                      />
                    </div>
                  </div>

                  {resetError && (
                    <div className="text-red-600 text-xs font-bold text-center bg-red-50 p-2 rounded-xl border border-red-200">
                      ⚠️ {resetError}
                    </div>
                  )}

                  <button type="submit" className="w-full py-4 bg-blue-900 text-yellow-400 font-black rounded-2xl shadow-xl hover:bg-blue-800 transition-all">
                    Reset Student Password
                  </button>

                  {/* Immediate WhatsApp School Records Assistance */}
                  <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 text-center space-y-1.5">
                    <p className="text-[11px] text-emerald-800 font-bold">
                      Forget your credentials entirely? Ask the School Admin on WhatsApp:
                    </p>
                    <a
                      href={`https://wa.me/2348130300837?text=Hello%20God's%20Hand%20Model%20School%20Office,%20I%20am%20a%20student%20(${encodeURIComponent(forgotEmailOrId || 'Student')})%20requesting%20assistance%20with%20my%20Student%20Hub%20password.`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-1.5 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all"
                    >
                      <span>💬</span>
                      <span>Request Help on WhatsApp: 08130300837</span>
                    </a>
                  </div>

                  <button 
                    type="button" 
                    onClick={() => setMode('login')} 
                    className="w-full text-xs font-black text-slate-400 uppercase tracking-widest pt-1 hover:text-blue-900 transition-colors"
                  >
                    Back to Login
                  </button>
                </form>
              ) : (
                <div className="text-center py-6 space-y-3">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto text-green-600 text-2xl font-black">✓</div>
                  <h3 className="text-lg font-black text-blue-900 font-serif">Password Updated!</h3>
                  <p className="text-slate-500 text-xs leading-relaxed">
                    Your password has been successfully reset. Redirecting you to login...
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
        
        <button onClick={onBack} className="w-full py-4 bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-t border-slate-100 hover:text-blue-900 transition-colors">
          Return to Home
        </button>
      </div>
    </div>
  );
};

