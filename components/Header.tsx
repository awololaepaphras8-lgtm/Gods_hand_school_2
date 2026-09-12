
import React, { useState, useRef, useEffect } from 'react';
import { UserRole } from '../types';

interface HeaderProps {
  role: UserRole;
  setRole: (role: UserRole) => void;
  setView: (view: 'home' | 'portal' | 'apply' | 'admin' | 'teacherLogin' | 'teacher' | 'studentAuth' | 'feeChecker' | 'about' | 'parentAuth' | 'parentPortal') => void;
  activeView: string;
  onOpenDownloadModal?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ role, setRole, setView, activeView, onOpenDownloadModal }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const navigateTo = (view: any) => {
    setView(view);
    setIsMenuOpen(false);
  };

  const menuItems = [
    { label: 'School Home', view: 'home', icon: '🏠' },
    { label: 'Check Student Results (₦1,000)', view: 'resultChecker', icon: '📜' },
    { label: 'Parent Portal & Attendance', view: role === UserRole.PARENT ? 'parentPortal' : 'parentAuth', icon: '👨‍👩‍👧‍👦' },
    { label: 'About School & Results', view: 'about', icon: '🏛️' },
    { label: 'Check School Fees', view: 'feeChecker', icon: '💳' },
    { label: 'Admission & Fees', view: 'apply', icon: '🎓' },
    { label: 'Students & Pupils Hub', view: 'portal', icon: '💻' },
    { label: 'Staff Entry', view: 'teacherLogin', icon: '👔' },
    { label: role === UserRole.ADMIN ? 'Proprietor Admin Panel' : 'Proprietor / Admin Login', view: 'admin', icon: '⚙️' },
  ];

  return (
    <div className="w-full relative z-40">
      {/* Top Notification / Contact Bar */}
      <div className="bg-yellow-400 text-blue-950 py-1 sm:py-1.5 px-3 sm:px-6 text-[10px] sm:text-xs font-black uppercase tracking-wider border-b border-yellow-500/30">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-1.5 sm:gap-3 text-center sm:text-left">
          <div className="flex items-center flex-wrap justify-center sm:justify-start gap-1.5 sm:gap-2.5">
            <span className="whitespace-nowrap flex items-center gap-1">
              <span>📞</span>
              <a href="tel:08056507252" className="hover:underline font-bold">08056507252</a>
            </span>
            <span className="text-blue-900/30 hidden xs:inline">•</span>
            <a 
              href="https://wa.me/2348130300837?text=Hello%20God's%20Hand%20Model%20School,%20I%20have%20an%20inquiry" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-emerald-700 hover:bg-emerald-800 text-white transition-all shadow-xs whitespace-nowrap text-[9px] sm:text-[10px]"
              title="Chat directly on WhatsApp"
            >
              <span>💬</span>
              <span>WhatsApp: 08130300837</span>
            </a>
            <span className="text-blue-900/30 hidden lg:inline">•</span>
            <span className="hidden lg:inline whitespace-nowrap text-blue-900/80">
              ✉️ <a href="mailto:godshandschool70@gmail.com" className="hover:underline lowercase font-medium">godshandschool70@gmail.com</a>
            </span>
          </div>
          <div className="flex items-center justify-center shrink-0">
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black bg-blue-900 text-yellow-400 shadow-xs whitespace-nowrap">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5 animate-pulse"></span>
              Realtime Sync Active
            </span>
          </div>
        </div>
      </div>
      
      {/* Main Navigation Bar */}
      <header className="bg-white/95 backdrop-blur-md border-b border-blue-100 sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center min-h-[3.75rem] xs:min-h-[4.25rem] sm:min-h-[4.75rem] md:min-h-[5.25rem] py-1.5 sm:py-2 gap-2 sm:gap-4">
            {/* School Brand Identity (Logo + Name) */}
            <div 
              className="flex items-center gap-2 sm:gap-3 cursor-pointer group min-w-0 flex-1" 
              onClick={() => navigateTo('home')}
            >
              <div className="w-12 h-12 xs:w-14 xs:h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 lg:w-20 lg:h-20 relative group-hover:scale-105 transition-all duration-300 shrink-0">
                <div className="w-full h-full bg-white rounded-xl sm:rounded-2xl border-2 border-yellow-400 shadow-sm ring-2 ring-blue-900/10 overflow-hidden flex items-center justify-center p-0">
                  <img 
                    src="/logo.png" 
                    alt="God's Hand International Model School Logo" 
                    className="w-[80%] h-[80%] max-w-[80%] max-h-[80%] object-contain transition-transform duration-300 group-hover:scale-105"
                    onError={(e) => {
                      if (!e.currentTarget.src.endsWith('hands.jpg')) {
                        e.currentTarget.src = 'hands.jpg';
                      } else {
                        e.currentTarget.style.display = 'none';
                        if (e.currentTarget.parentElement) {
                          e.currentTarget.parentElement.innerHTML = '<div class="w-full h-full bg-blue-900 rounded-xl flex items-center justify-center text-yellow-400 text-xs sm:text-base font-black font-serif border border-yellow-400 text-center leading-none">GHIMS</div>';
                        }
                      }
                    }}
                  />
                </div>
              </div>

              <div className="flex flex-col justify-center min-w-0 flex-1">
                <h1 className="font-serif font-black text-blue-950 leading-tight tracking-tight group-hover:text-blue-900 transition-colors">
                  <span className="hidden xl:inline text-xl lg:text-2xl truncate block">
                    God's Hand International Model School
                  </span>
                  <span className="hidden sm:inline xl:hidden text-base md:text-lg truncate block">
                    God's Hand Int'l Model School
                  </span>
                  <span className="inline sm:hidden text-xs xs:text-sm font-black truncate block">
                    God's Hand Model School
                  </span>
                </h1>
                
                <div className="flex items-center gap-1.5 sm:gap-2 mt-0.5 min-w-0">
                  <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[8px] xs:text-[9px] sm:text-[10px] font-black uppercase tracking-wider bg-yellow-400 text-blue-950 shadow-xs border border-yellow-500/20 whitespace-nowrap shrink-0">
                    Have Faith In God
                  </span>
                  <span className="text-[10px] sm:text-xs text-slate-500 font-bold hidden md:inline truncate">
                    • Wire & Cable, Apata, Ibadan
                  </span>
                </div>
              </div>
            </div>

            {/* Navigation & Action Controls */}
            <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
              {/* Download App Shortcut Button */}
              {onOpenDownloadModal && (
                <button
                  type="button"
                  onClick={onOpenDownloadModal}
                  className="flex items-center space-x-1 sm:space-x-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all border-2 shrink-0 bg-yellow-400 hover:bg-yellow-300 text-blue-950 border-yellow-500 shadow-sm active:scale-95"
                  title="Download God's Hand School App to your phone or computer"
                >
                  <span className="text-sm">📲</span>
                  <span className="hidden sm:inline">Download App</span>
                  <span className="sm:hidden">App</span>
                </button>
              )}

              {/* About School Shortcut for Desktop */}
              <button
                type="button"
                onClick={() => navigateTo('about')}
                className={`hidden xl:flex items-center space-x-1 px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all border-2 shrink-0 ${activeView === 'about' ? 'bg-blue-900 text-yellow-400 border-blue-900 shadow-md' : 'text-blue-900 border-slate-100 hover:border-blue-900 hover:bg-slate-50'}`}
              >
                <span>🏛️</span>
                <span>About</span>
              </button>

              {/* Responsive Navigation Menu Toggle */}
              <div className="relative" ref={dropdownRef}>
                <button 
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  aria-label="Toggle Navigation Menu"
                  className={`flex items-center space-x-1 sm:space-x-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all border-2 shrink-0 ${isMenuOpen ? 'bg-blue-900 text-yellow-400 border-blue-900 shadow-md' : 'text-blue-900 border-slate-200 hover:border-blue-900 hover:bg-slate-50'}`}
                >
                  <span className="text-sm sm:text-base leading-none">☰</span>
                  <span className="text-[11px] sm:text-xs">Menu</span>
                  <svg xmlns="http://www.w3.org/2000/svg" className={`h-3 w-3 sm:h-3.5 sm:w-3.5 transition-transform duration-300 ${isMenuOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Dropdown Menu with Backdrop to prevent overlapping conflicts */}
                {isMenuOpen && (
                  <>
                    <div 
                      className="fixed inset-0 z-40 bg-slate-900/20 backdrop-blur-xs"
                      onClick={() => setIsMenuOpen(false)} 
                    />
                    
                    <div className="absolute right-0 top-full mt-2 w-72 sm:w-80 max-w-[calc(100vw-1.5rem)] bg-white rounded-2xl shadow-2xl border-2 border-slate-100 overflow-hidden py-2 animate-in slide-in-from-top-2 duration-200 z-50 max-h-[80vh] overflow-y-auto">
                      <div className="px-4 py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 flex items-center justify-between">
                        <span>School Portals & Navigation</span>
                        <button 
                          onClick={() => setIsMenuOpen(false)}
                          className="text-slate-400 hover:text-slate-600 text-xs font-bold p-1"
                        >
                          ✕
                        </button>
                      </div>

                      <div className="py-1">
                        {onOpenDownloadModal && (
                          <button 
                            onClick={() => {
                              setIsMenuOpen(false);
                              onOpenDownloadModal();
                            }}
                            className="w-full text-left px-4 py-2.5 text-xs sm:text-sm font-black flex items-center transition-all bg-yellow-50 text-blue-950 hover:bg-yellow-100 border-b border-yellow-200"
                          >
                            <span className="mr-3 text-base sm:text-lg">📲</span>
                            <span className="truncate">Download School App (PWA)</span>
                            <span className="ml-auto text-[9px] bg-yellow-400 text-blue-950 px-1.5 py-0.5 rounded font-black uppercase">Install</span>
                          </button>
                        )}
                        {menuItems.map(item => (
                          <button 
                            key={item.label}
                            onClick={() => navigateTo(item.view as any)}
                            className={`w-full text-left px-4 py-2.5 text-xs sm:text-sm font-bold flex items-center transition-all ${activeView === item.view ? 'bg-blue-50 text-blue-900 font-black' : 'text-slate-700 hover:bg-slate-50 hover:text-blue-900'}`}
                          >
                            <span className="mr-3 text-base sm:text-lg">{item.icon}</span>
                            <span className="truncate">{item.label}</span>
                          </button>
                        ))}
                      </div>

                      {/* Direct WhatsApp Contact in Menu */}
                      <div className="p-3 bg-emerald-50 border-t border-emerald-100 mt-1">
                        <a 
                          href="https://wa.me/2348130300837?text=Hello%20God's%20Hand%20Model%20School,%20I%20have%20an%20inquiry" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-2 w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-xs"
                        >
                          <span>💬</span>
                          <span>WhatsApp Desk: 08130300837</span>
                        </a>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Role-Specific Actions */}
              {role === UserRole.GUEST ? (
                <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                  {/* Parent Portal quick button: Shown on tablet/desktop */}
                  <button 
                    onClick={() => navigateTo('parentAuth')}
                    className="hidden sm:inline-flex items-center gap-1 px-2.5 sm:px-3 py-1.5 sm:py-2 text-[10px] font-black uppercase tracking-wider text-blue-900 bg-yellow-400 hover:bg-yellow-300 rounded-xl transition-all shadow-xs active:scale-95 whitespace-nowrap shrink-0"
                    title="Parent Portal & Attendance"
                  >
                    <span>👨‍👩‍👧‍👦</span>
                    <span className="hidden md:inline">Parents</span>
                  </button>

                  {/* Student/Staff Login Button */}
                  <button 
                    onClick={() => navigateTo('studentAuth')}
                    className="px-3 sm:px-4 py-1.5 sm:py-2 text-[10px] sm:text-xs font-black uppercase tracking-wider text-white bg-blue-900 rounded-xl hover:bg-blue-800 transition-all shadow-xs active:scale-95 whitespace-nowrap shrink-0"
                  >
                    Login
                  </button>

                  {/* Proprietor / Admin Lock Shortcut */}
                  <button 
                    onClick={() => navigateTo('admin')}
                    className="hidden xs:flex p-1.5 sm:p-2 text-blue-900 bg-yellow-400 rounded-full hover:shadow-md transition-all shrink-0 items-center justify-center"
                    title="Proprietor Login"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                  {role === UserRole.PARENT && (
                    <button
                      onClick={() => navigateTo('parentPortal')}
                      className={`px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all border whitespace-nowrap shrink-0 ${activeView === 'parentPortal' ? 'bg-blue-900 text-yellow-400 border-blue-900' : 'text-blue-900 border-blue-200 hover:bg-blue-50'}`}
                    >
                      👨‍👩‍👧‍👦 <span className="hidden sm:inline">My Children</span>
                    </button>
                  )}
                  {role === UserRole.TEACHER && (
                    <button
                      onClick={() => navigateTo('teacher')}
                      className={`px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all border whitespace-nowrap shrink-0 ${activeView === 'teacher' ? 'bg-blue-900 text-yellow-400 border-blue-900' : 'text-blue-900 border-blue-200 hover:bg-blue-50'}`}
                    >
                      📁 <span className="hidden sm:inline">Teacher Desk</span>
                    </button>
                  )}
                  {role === UserRole.ADMIN && (
                    <button
                      onClick={() => navigateTo('admin')}
                      className={`px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all border whitespace-nowrap shrink-0 ${activeView === 'admin' ? 'bg-blue-900 text-yellow-400 border-blue-900' : 'text-blue-900 border-blue-200 hover:bg-blue-50'}`}
                    >
                      ⚙️ <span className="hidden sm:inline">Proprietor Panel</span>
                    </button>
                  )}
                  {role === UserRole.STUDENT && (
                    <button
                      onClick={() => navigateTo('portal')}
                      className={`px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all border whitespace-nowrap shrink-0 ${activeView === 'portal' ? 'bg-blue-900 text-yellow-400 border-blue-900' : 'text-blue-900 border-blue-200 hover:bg-blue-50'}`}
                    >
                      💻 <span className="hidden sm:inline">Portal</span>
                    </button>
                  )}

                  <div className="hidden lg:flex flex-col items-end mr-1 shrink-0">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{role} MODE</span>
                  </div>

                  <button 
                    onClick={() => { setRole(UserRole.GUEST); navigateTo('home'); }}
                    className="px-2.5 sm:px-3.5 py-1.5 sm:py-2 text-[10px] sm:text-xs font-black uppercase tracking-wider text-red-600 border border-red-200 rounded-xl hover:bg-red-50 hover:border-red-300 transition-all whitespace-nowrap shrink-0"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>
    </div>
  );
};
