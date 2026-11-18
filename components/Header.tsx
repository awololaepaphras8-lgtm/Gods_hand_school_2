
import React, { useState, useRef, useEffect } from 'react';
import { UserRole, UserPagesAccessState, StudentAccount, ParentAccount } from '../types';
import { getInitialTheme, toggleTheme, ThemeMode } from '../utils/themeManager';
import { QuickQrHubModal } from './QuickQrHubModal';

interface HeaderProps {
  role: UserRole;
  setRole: (role: UserRole) => void;
  setView: (view: 'home' | 'portal' | 'apply' | 'admin' | 'teacherLogin' | 'teacher' | 'studentAuth' | 'feeChecker' | 'resultChecker' | 'about' | 'parentAuth' | 'parentPortal' | 'studentReceipts' | 'parentStaffChat' | 'communityHub' | 'attendanceScanning') => void;
  activeView: string;
  onOpenDownloadModal?: () => void;
  isAppInstalled?: boolean;
  hasActiveDelegation?: boolean;
  userPagesAccess?: UserPagesAccessState;
  onLogout?: () => void;
  currentStudent?: StudentAccount | null;
  currentParent?: ParentAccount | null;
  allStudents?: StudentAccount[];
}

export const Header: React.FC<HeaderProps> = ({ 
  role, 
  setRole, 
  setView, 
  activeView, 
  onOpenDownloadModal, 
  isAppInstalled = false, 
  hasActiveDelegation = false, 
  userPagesAccess, 
  onLogout,
  currentStudent = null,
  currentParent = null,
  allStudents = []
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [currentTheme, setCurrentTheme] = useState<ThemeMode>(() => getInitialTheme());
  const [showQrHubModal, setShowQrHubModal] = useState<boolean>(false);
  const [qrHubInitialTab, setQrHubInitialTab] = useState<'portal' | 'fees' | 'results' | 'gate' | 'install'>('portal');
  const [logoSrc, setLogoSrc] = useState<string>('/logo.png');
  const [logoFailed, setLogoFailed] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleThemeChange = (e: any) => {
      if (e.detail?.theme) {
        setCurrentTheme(e.detail.theme);
      }
    };
    window.addEventListener('ghs-theme-changed', handleThemeChange);
    return () => window.removeEventListener('ghs-theme-changed', handleThemeChange);
  }, []);

  const handleToggleTheme = () => {
    const next = toggleTheme();
    setCurrentTheme(next);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside, { passive: true });
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const navigateTo = (view: any) => {
    setView(view);
    setIsMenuOpen(false);
  };

  const isViewClosed = (v: string): boolean => {
    if (!userPagesAccess) return false;
    if (userPagesAccess.allPagesClosed) return true;
    if (v === 'apply' && userPagesAccess.pages.apply?.isOpen === false) return true;
    if (v === 'feeChecker' && userPagesAccess.pages.feeChecker?.isOpen === false) return true;
    if (v === 'resultChecker' && userPagesAccess.pages.resultChecker?.isOpen === false) return true;
    if (v === 'studentReceipts' && userPagesAccess.pages.studentReceipts?.isOpen === false) return true;
    if ((v === 'parentPortal' || v === 'parentAuth') && userPagesAccess.pages.parentPortal?.isOpen === false) return true;
    if ((v === 'portal' || v === 'studentAuth') && userPagesAccess.pages.studentPortal?.isOpen === false) return true;
    if (v === 'parentStaffChat' && userPagesAccess.pages.parentStaffChat?.isOpen === false) return true;
    if (v === 'communityHub' && userPagesAccess.pages.communityHub?.isOpen === false) return true;
    if (v === 'about' && userPagesAccess.pages.about?.isOpen === false) return true;
    return false;
  };

  const isStaffParentOrAdmin = role === UserRole.PARENT || role === UserRole.TEACHER || role === UserRole.ADMIN;

  const menuItems = [
    { label: 'School Home', view: 'home', icon: '🏠' },
    ...((role === UserRole.ADMIN || role === UserRole.TEACHER) ? [
      { label: 'Attendance Camera Scanning', view: 'attendanceScanning', icon: '📷' },
    ] : []),
    ...(isStaffParentOrAdmin ? [
      { label: 'Message Staff Directly & Direct Calls', view: 'parentStaffChat', icon: '💬' },
      { label: 'Live Chat, Virtual Meetings & Calls', view: 'communityHub', icon: '📞' },
    ] : role === UserRole.STUDENT ? [
      { label: 'Pupil Study & Sports Channels', view: 'communityHub', icon: '💬' },
    ] : []),
    { label: 'Check Student Results (₦1,000)', view: 'resultChecker', icon: '📜' },
    { label: 'Download Official Fee Receipts', view: 'studentReceipts', icon: '📑' },
    { label: 'Parent Portal & Attendance', view: role === UserRole.PARENT ? 'parentPortal' : 'parentAuth', icon: '👨‍👩‍👧‍👦' },
    { label: 'About School & Results', view: 'about', icon: '🏛️' },
    { label: 'Check School Fees', view: 'feeChecker', icon: '💳' },
    { label: 'Admission & Fees', view: 'apply', icon: '🎓' },
    { label: 'Students & Pupils Hub', view: 'portal', icon: '💻' }
  ];

  return (
    <>
      {/* Top Notification / Contact Bar */}
      <div className="bg-yellow-400 text-blue-950 py-1.5 px-4 sm:px-6 text-[10px] sm:text-xs font-black uppercase tracking-wider border-b border-yellow-500/30 w-full">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-1.5 sm:gap-3 text-center sm:text-left">
          <div className="flex items-center flex-wrap justify-center sm:justify-start gap-2 sm:gap-2.5">
            <span className="flex items-center gap-1 whitespace-nowrap">
              <span>📞</span>
              <a href="tel:08056507252" className="hover:underline font-bold">08056507252</a>
            </span>
            <span className="text-blue-900/30 hidden sm:inline">•</span>
            <a 
              href="https://wa.me/2347085596586?text=Hello%20God's%20Hand%20Model%20School,%20I%20have%20an%20inquiry" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-700 hover:bg-emerald-800 text-white transition-all shadow-sm text-[10px] whitespace-nowrap"
              title="Chat directly on WhatsApp"
            >
              <span>💬</span>
              <span>WhatsApp: 07085596586</span>
            </a>
            <span className="text-blue-900/30 hidden lg:inline">•</span>
            <span className="hidden lg:inline text-blue-900/80 whitespace-nowrap">
              ✉️ <a href="mailto:Godshandschool70@gmail.com" className="hover:underline font-medium">Godshandschool70@gmail.com</a>
            </span>
          </div>
          <div className="flex items-center justify-center shrink-0">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black bg-blue-900 text-yellow-400 shadow-sm whitespace-nowrap">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5 animate-pulse shrink-0"></span>
              <span>Realtime Sync Active</span>
            </span>
          </div>
        </div>
      </div>
      
      {/* Main Navigation Bar */}
      <header className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-blue-100 dark:border-slate-800 sticky top-0 z-40 shadow-sm transition-colors duration-200 w-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center min-h-[3.75rem] sm:min-h-[4.5rem] md:min-h-[5rem] py-1.5 sm:py-2 gap-2 sm:gap-3">
            {/* School Brand Identity (Logo + Name) */}
            <div 
              className="flex items-center gap-2 sm:gap-3 cursor-pointer group min-w-0 flex-1" 
              onClick={() => navigateTo('home')}
            >
              <div className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 relative group-hover:scale-105 transition-all duration-300 shrink-0">
                <div className="w-full h-full bg-white dark:bg-slate-800 rounded-xl sm:rounded-2xl border-2 border-yellow-400 shadow-sm ring-2 ring-blue-900/10 overflow-hidden flex items-center justify-center p-1">
                  {logoFailed ? (
                    <div className="w-full h-full bg-blue-900 rounded-lg flex items-center justify-center text-yellow-400 text-[10px] sm:text-xs font-black font-serif border border-yellow-400 text-center leading-none">
                      GHIMS
                    </div>
                  ) : (
                    <img 
                      src={logoSrc} 
                      alt="God's Hand International Model School Logo" 
                      className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-105"
                      onError={() => {
                        if (logoSrc !== '/hands.jpg') {
                          setLogoSrc('/hands.jpg');
                        } else {
                          setLogoFailed(true);
                        }
                      }}
                    />
                  )}
                </div>
              </div>

              <div className="flex flex-col justify-center min-w-0 flex-1">
                <h1 className="font-serif font-black text-blue-950 dark:text-white leading-tight tracking-tight group-hover:text-blue-900 dark:group-hover:text-yellow-300 transition-colors truncate">
                  <span className="hidden xl:inline text-xl lg:text-2xl">
                    God's Hand International Model School
                  </span>
                  <span className="hidden sm:inline xl:hidden text-sm md:text-base lg:text-lg">
                    God's Hand Int'l Model School
                  </span>
                  <span className="inline sm:hidden text-xs font-black">
                    God's Hand Model School
                  </span>
                </h1>
                
                <div className="flex items-center gap-1.5 sm:gap-2 mt-0.5 min-w-0 overflow-hidden">
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[8.5px] sm:text-[10px] font-black uppercase tracking-wider bg-yellow-400 text-blue-950 shadow-sm border border-yellow-500/20 whitespace-nowrap shrink-0">
                    Have Faith In God
                  </span>
                  <span className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 font-bold hidden md:inline truncate">
                    • Wire & Cable, Apata, Ibadan
                  </span>
                </div>
              </div>
            </div>

            {/* Navigation & Action Controls */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              {/* Theme Toggle Button */}
              <button
                type="button"
                onClick={handleToggleTheme}
                aria-label={`Switch to ${currentTheme === 'dark' ? 'Light' : 'Dark'} Mode`}
                className="flex items-center justify-center gap-1 px-2.5 sm:px-3 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all border-2 shrink-0 bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-yellow-400 dark:border-slate-700 shadow-sm active:scale-95"
                title={`Switch to ${currentTheme === 'dark' ? 'Light Mode (Normal)' : 'Dark Mode (Night)'}`}
              >
                <span className="text-sm leading-none">{currentTheme === 'dark' ? '☀️' : '🌙'}</span>
                <span className="hidden lg:inline">{currentTheme === 'dark' ? 'Light' : 'Dark'}</span>
              </button>

              {/* Download App Shortcut Button (Desktop/Tablet) */}
              {onOpenDownloadModal && (
                <button
                  type="button"
                  onClick={onOpenDownloadModal}
                  className="hidden sm:flex items-center justify-center gap-1 px-2.5 sm:px-3 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all border-2 shrink-0 bg-yellow-400 hover:bg-yellow-300 text-blue-950 border-yellow-500 shadow-sm active:scale-95 cursor-pointer"
                  title="Download God's Hand School App (PWA or Native App for Windows, Android, iOS)"
                >
                  <span className="text-xs sm:text-sm leading-none">📲</span>
                  <span className="hidden md:inline">Download App</span>
                  <span className="md:hidden text-[11px]">App</span>
                </button>
              )}

              {/* Instant QR Passes & Scanner Hub Button (Desktop/Tablet; mobile has QR Pass in bottom bar & menu) */}
              <button
                type="button"
                onClick={() => {
                  setQrHubInitialTab('portal');
                  setShowQrHubModal(true);
                }}
                className="hidden md:flex items-center justify-center gap-1 px-2.5 sm:px-3 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all border-2 shrink-0 bg-indigo-50 hover:bg-indigo-100 text-indigo-950 border-indigo-300 dark:bg-slate-800 dark:text-yellow-400 dark:border-slate-700 shadow-sm active:scale-95 cursor-pointer"
                title="Instant QR Passes: Portal, Fees, Results & Gate Pass"
              >
                <span className="text-xs sm:text-sm leading-none">🏁</span>
                <span className="hidden lg:inline">QR Passes</span>
                <span className="lg:hidden text-[11px]">QR</span>
              </button>

              {/* Community Live Hub Shortcut */}
              {role !== UserRole.GUEST && (
                <button
                  type="button"
                  onClick={() => navigateTo('communityHub')}
                  className={`hidden sm:flex items-center justify-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all border-2 shrink-0 ${activeView === 'communityHub' ? 'bg-blue-900 text-yellow-400 border-blue-900 shadow-md dark:bg-yellow-400 dark:text-blue-950 dark:border-yellow-400' : 'text-blue-900 dark:text-yellow-400 border-yellow-400 bg-yellow-50 dark:bg-slate-800 hover:bg-yellow-100 dark:hover:bg-slate-700 hover:border-yellow-500'}`}
                  title="School Live Chat, Meetings & Calls Hub"
                >
                  <span>💬</span>
                  <span className="hidden lg:inline">Live Hub</span>
                  <span className="lg:hidden text-[11px]">Chat</span>
                </button>
              )}

              {/* About School Shortcut for Desktop */}
              <button
                type="button"
                onClick={() => navigateTo('about')}
                className={`hidden xl:flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all border-2 shrink-0 ${activeView === 'about' ? 'bg-blue-900 text-yellow-400 border-blue-900 shadow-md dark:bg-yellow-400 dark:text-blue-950 dark:border-yellow-400' : 'text-blue-900 dark:text-slate-200 border-slate-100 dark:border-slate-800 hover:border-blue-900 dark:hover:border-yellow-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
              >
                <span>🏛️</span>
                <span>About</span>
              </button>

              {/* Responsive Dropdown Navigation Menu */}
              <div className="static sm:relative" ref={dropdownRef}>
                <button 
                  type="button"
                  onClick={() => setIsMenuOpen(prev => !prev)}
                  aria-expanded={isMenuOpen}
                  aria-haspopup="menu"
                  aria-label="Toggle Navigation Menu"
                  className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all border-2 shrink-0 ${isMenuOpen ? 'bg-blue-900 text-yellow-400 border-blue-900 shadow-md dark:bg-yellow-400 dark:text-blue-950 dark:border-yellow-400' : 'text-blue-900 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-blue-900 dark:hover:border-yellow-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                >
                  <span className="text-sm sm:text-base leading-none">☰</span>
                  <span className="text-[11px] sm:text-xs">Menu</span>
                  <svg xmlns="http://www.w3.org/2000/svg" className={`h-3 w-3 sm:h-3.5 sm:w-3.5 transition-transform duration-200 ${isMenuOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Anchored Dropdown Panel (Not fixed inside backdrop-blur header) */}
                {isMenuOpen && (
                  <div
                    role="menu"
                    aria-label="School Navigation Dropdown"
                    className="absolute left-0 right-0 mx-auto sm:left-auto sm:right-0 sm:mx-0 top-full mt-2 w-[calc(100%-2rem)] max-w-sm sm:w-80 sm:max-w-none max-h-[78vh] overflow-y-auto overflow-x-hidden bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border-2 border-slate-200/90 dark:border-slate-700 flex flex-col z-50"
                  >
                    <div className="px-4 py-3 text-[11px] font-black text-slate-500 dark:text-slate-300 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 sticky top-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm z-10">
                      <span>School Portals & Menu</span>
                      <button 
                        type="button"
                        onClick={() => setIsMenuOpen(false)}
                        className="w-7 h-7 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 text-xs font-black flex items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                        aria-label="Close Menu"
                      >
                        ✕
                      </button>
                    </div>

                    <div className="py-1.5">
                      {!isAppInstalled && onOpenDownloadModal && (
                        <button 
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            setIsMenuOpen(false);
                            onOpenDownloadModal();
                          }}
                          className="w-full text-left px-4 py-2.5 text-xs sm:text-sm font-black flex items-center justify-between gap-2 transition-all bg-yellow-50 dark:bg-yellow-950/40 text-blue-950 dark:text-yellow-300 hover:bg-yellow-100 dark:hover:bg-yellow-950/60 border-b border-yellow-200/80 dark:border-yellow-900/50"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="text-base shrink-0">📲</span>
                            <span className="break-words">Download School App (PWA)</span>
                          </div>
                          <span className="text-[10px] bg-yellow-400 text-blue-950 px-2 py-0.5 rounded font-black uppercase shrink-0">Install</span>
                        </button>
                      )}
                      <button 
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setIsMenuOpen(false);
                          setQrHubInitialTab('portal');
                          setShowQrHubModal(true);
                        }}
                        className="w-full text-left px-4 py-2.5 text-xs sm:text-sm font-black flex items-center justify-between gap-2 transition-all bg-indigo-50/80 dark:bg-indigo-950/40 text-indigo-950 dark:text-indigo-200 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border-b border-indigo-100 dark:border-indigo-900/40"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="text-base shrink-0">🏁</span>
                          <span className="break-words">Instant QR Passes & Code Hub</span>
                        </div>
                        <span className="text-[10px] bg-indigo-600 text-white px-2 py-0.5 rounded font-black uppercase shrink-0">View</span>
                      </button>
                      {menuItems.map(item => {
                        const closed = isViewClosed(item.view);
                        return (
                          <button 
                            key={item.label}
                            type="button"
                            role="menuitem"
                            onClick={() => navigateTo(item.view as any)}
                            className={`w-full text-left px-4 py-2.5 text-xs sm:text-sm font-bold flex items-center justify-between gap-2 transition-all ${activeView === item.view ? 'bg-blue-50 dark:bg-blue-950/80 text-blue-900 dark:text-yellow-400 font-black border-l-4 border-blue-900 dark:border-yellow-400' : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-blue-900 dark:hover:text-yellow-300'}`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className="text-base shrink-0">{item.icon}</span>
                              <span className="break-words">{item.label}</span>
                            </div>
                            {closed && (
                              <span className="text-[10px] bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 px-2 py-0.5 rounded font-black uppercase shrink-0">
                                Closed
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {/* Direct WhatsApp Contact in Dropdown */}
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border-t border-emerald-100 dark:border-emerald-900/50">
                      <a 
                        href="https://wa.me/2347085596586?text=Hello%20God's%20Hand%20Model%20School,%20I%20have%20an%20inquiry" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-sm text-center"
                      >
                        <span>💬</span>
                        <span>WhatsApp Desk: 07085596586</span>
                      </a>
                    </div>
                  </div>
                )}
              </div>

              {/* Role-Specific Actions */}
              {role === UserRole.GUEST ? (
                <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                  {/* Parent Portal quick button */}
                  <button 
                    type="button"
                    onClick={() => navigateTo('parentAuth')}
                    className="hidden sm:inline-flex items-center gap-1 px-2.5 sm:px-3 py-2 text-[10px] font-black uppercase tracking-wider text-blue-900 bg-yellow-400 hover:bg-yellow-300 rounded-xl transition-all shadow-sm active:scale-95 shrink-0"
                    title="Parent Portal & Attendance"
                  >
                    <span>👨‍👩‍👧‍👦</span>
                    <span className="hidden md:inline">Parents</span>
                  </button>

                  {/* Student/Staff Login Button */}
                  <button 
                    type="button"
                    onClick={() => navigateTo('studentAuth')}
                    className="px-3 sm:px-4 py-2 text-[11px] sm:text-xs font-black uppercase tracking-wider text-white bg-blue-900 rounded-xl hover:bg-blue-800 transition-all shadow-sm active:scale-95 shrink-0"
                  >
                    Login
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                  {role === UserRole.PARENT && (
                    <button
                      type="button"
                      onClick={() => navigateTo('parentPortal')}
                      className={`px-2.5 sm:px-3 py-2 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all border shrink-0 ${activeView === 'parentPortal' ? 'bg-blue-900 text-yellow-400 border-blue-900' : 'text-blue-900 border-blue-200 hover:bg-blue-50'}`}
                    >
                      👨‍👩‍👧‍👦 <span className="hidden sm:inline">My Children</span>
                    </button>
                  )}
                  {role === UserRole.TEACHER && (
                    <>
                      <button
                        type="button"
                        onClick={() => navigateTo('teacher')}
                        className={`px-2.5 sm:px-3 py-2 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all border shrink-0 ${activeView === 'teacher' ? 'bg-blue-900 text-yellow-400 border-blue-900' : 'text-blue-900 border-blue-200 hover:bg-blue-50'}`}
                      >
                        📁 <span className="hidden sm:inline">Teacher Desk</span>
                      </button>
                      {hasActiveDelegation && (
                        <button
                          type="button"
                          onClick={() => navigateTo('admin')}
                          className={`px-2.5 sm:px-3 py-2 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all border shrink-0 animate-pulse ${activeView === 'admin' ? 'bg-amber-500 text-blue-950 border-amber-600 font-black' : 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100'}`}
                          title="Open Authorized Admin Panel"
                        >
                          ⏱️ <span className="hidden sm:inline">Admin Access</span>
                        </button>
                      )}
                    </>
                  )}
                  {role === UserRole.ADMIN && (
                    <button
                      type="button"
                      onClick={() => navigateTo('admin')}
                      className={`px-2.5 sm:px-3 py-2 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all border shrink-0 ${activeView === 'admin' ? 'bg-blue-900 text-yellow-400 border-blue-900' : 'text-blue-900 border-blue-200 hover:bg-blue-50'}`}
                    >
                      ⚙️ <span className="hidden sm:inline">Proprietor Panel</span>
                    </button>
                  )}
                  {role === UserRole.STUDENT && (
                    <button
                      type="button"
                      onClick={() => navigateTo('portal')}
                      className={`px-2.5 sm:px-3 py-2 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all border shrink-0 ${activeView === 'portal' ? 'bg-blue-900 text-yellow-400 border-blue-900' : 'text-blue-900 border-blue-200 hover:bg-blue-50'}`}
                    >
                      💻 <span className="hidden sm:inline">Portal</span>
                    </button>
                  )}

                  <div className="hidden lg:flex flex-col items-end mr-1 shrink-0">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{role} MODE</span>
                  </div>

                  <button 
                    type="button"
                    onClick={() => { 
                      if (onLogout) {
                        onLogout();
                      } else {
                        setRole(UserRole.GUEST); 
                        navigateTo('home');
                      }
                    }}
                    className="px-2.5 sm:px-3.5 py-2 text-[10px] sm:text-xs font-black uppercase tracking-wider text-red-600 border border-red-200 rounded-xl hover:bg-red-50 hover:border-red-300 transition-all shrink-0"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Persistent Mobile Bottom Navigation Tab Bar */}
      <nav 
        aria-label="Mobile Quick Navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 shadow-[0_-4px_25px_rgba(0,0,0,0.12)] px-1 py-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))]"
      >
        <div className="max-w-md mx-auto grid grid-cols-5 items-center gap-1">
          {/* Home Tab */}
          <button
            type="button"
            onClick={() => navigateTo('home')}
            className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all duration-200 ${
              activeView === 'home'
                ? 'text-blue-900 dark:text-yellow-400 font-black'
                : 'text-slate-500 dark:text-slate-400 font-bold hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <span className="text-base leading-none mb-0.5">🏠</span>
            <span className="text-[10px] tracking-tight">Home</span>
            {activeView === 'home' && (
              <span className="w-1.5 h-1.5 rounded-full bg-blue-900 dark:bg-yellow-400 mt-0.5"></span>
            )}
          </button>

          {/* Portal Tab */}
          <button
            type="button"
            onClick={() => {
              if (role === UserRole.STUDENT) navigateTo('portal');
              else if (role === UserRole.PARENT) navigateTo('parentPortal');
              else if (role === UserRole.TEACHER) navigateTo('teacher');
              else if (role === UserRole.ADMIN) navigateTo('admin');
              else navigateTo('portal');
            }}
            className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all duration-200 ${
              ['portal', 'parentPortal', 'parentAuth', 'studentAuth', 'teacher', 'admin'].includes(activeView)
                ? 'text-blue-900 dark:text-yellow-400 font-black'
                : 'text-slate-500 dark:text-slate-400 font-bold hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <span className="text-base leading-none mb-0.5">🎓</span>
            <span className="text-[10px] tracking-tight truncate max-w-full">Portal</span>
            {['portal', 'parentPortal', 'parentAuth', 'studentAuth', 'teacher', 'admin'].includes(activeView) && (
              <span className="w-1.5 h-1.5 rounded-full bg-blue-900 dark:bg-yellow-400 mt-0.5"></span>
            )}
          </button>

          {/* Fee Checker Tab */}
          <button
            type="button"
            onClick={() => navigateTo('feeChecker')}
            className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all duration-200 ${
              activeView === 'feeChecker'
                ? 'text-blue-900 dark:text-yellow-400 font-black'
                : 'text-slate-500 dark:text-slate-400 font-bold hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <span className="text-base leading-none mb-0.5">💳</span>
            <span className="text-[10px] tracking-tight">Fees</span>
            {activeView === 'feeChecker' && (
              <span className="w-1.5 h-1.5 rounded-full bg-blue-900 dark:bg-yellow-400 mt-0.5"></span>
            )}
          </button>

          {/* Results Tab */}
          <button
            type="button"
            onClick={() => navigateTo('resultChecker')}
            className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all duration-200 ${
              activeView === 'resultChecker'
                ? 'text-blue-900 dark:text-yellow-400 font-black'
                : 'text-slate-500 dark:text-slate-400 font-bold hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <span className="text-base leading-none mb-0.5">📜</span>
            <span className="text-[10px] tracking-tight">Results</span>
            {activeView === 'resultChecker' && (
              <span className="w-1.5 h-1.5 rounded-full bg-blue-900 dark:bg-yellow-400 mt-0.5"></span>
            )}
          </button>

          {/* Instant QR Hub Tab */}
          <button
            type="button"
            onClick={() => {
              if (activeView === 'feeChecker') setQrHubInitialTab('fees');
              else if (activeView === 'resultChecker') setQrHubInitialTab('results');
              else if (role === UserRole.PARENT || role === UserRole.STUDENT) setQrHubInitialTab('gate');
              else setQrHubInitialTab('portal');
              setShowQrHubModal(true);
            }}
            className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all duration-200 ${
              showQrHubModal
                ? 'text-indigo-600 dark:text-indigo-400 font-black'
                : 'text-slate-500 dark:text-slate-400 font-bold hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <div className="flex items-center gap-1 leading-none mb-0.5">
              <span className="text-base">🏁</span>
              <span className="inline-flex h-1.5 w-1.5 rounded-full bg-indigo-600"></span>
            </div>
            <span className="text-[10px] tracking-tight">QR Pass</span>
            {showQrHubModal && (
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 dark:bg-indigo-400 mt-0.5"></span>
            )}
          </button>
        </div>
      </nav>

      {/* Quick QR Hub Modal (Passes for Portal, Fee Checker, Result Checker, Gate Pass & App Install) */}
      <QuickQrHubModal
        isOpen={showQrHubModal}
        onClose={() => setShowQrHubModal(false)}
        currentUserRole={role}
        currentStudent={currentStudent}
        currentParent={currentParent}
        allStudents={allStudents}
        initialTab={qrHubInitialTab}
        onNavigate={(v) => navigateTo(v)}
      />
    </>
  );
};
