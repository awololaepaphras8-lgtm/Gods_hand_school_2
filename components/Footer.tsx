
import React from 'react';

interface FooterProps {
  isAdmin?: boolean;
  onCheckFees?: () => void;
  onNavigate?: (view: any) => void;
  onOpenSqlModal?: () => void;
}

export const Footer: React.FC<FooterProps> = ({ isAdmin = false, onCheckFees, onNavigate, onOpenSqlModal }) => {
  return (
    <footer className="bg-blue-900 text-white py-12 sm:py-16 w-full max-w-full overflow-x-hidden border-t-8 border-t-yellow-400">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Student Fee Verification Callout Bar */}
        <div className="mb-12 p-5 sm:p-8 bg-gradient-to-r from-blue-950 to-indigo-950 border-2 border-yellow-400/40 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 text-left min-w-0">
            <div className="w-14 h-14 bg-yellow-400 text-blue-900 rounded-2xl flex items-center justify-center text-3xl font-black shadow-lg shrink-0">
              💳
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-0.5 bg-yellow-400 text-blue-900 rounded-full font-black text-[10px] uppercase tracking-widest">
                  Students & Pupils Fee Portal
                </span>
                <span className="text-blue-300 text-xs font-bold">• Check After Login</span>
              </div>
              <h3 className="text-lg sm:text-xl font-black text-white font-serif mt-1 break-words">
                Check Your School Fees & Balance
              </h3>
              <p className="text-xs text-blue-100/70 font-medium break-words">
                Verify term tuition, check outstanding balances, and download official fee receipts.
              </p>
            </div>
          </div>

          <button 
            type="button"
            onClick={() => onCheckFees?.()}
            className="min-h-[44px] w-full md:w-auto px-6 sm:px-8 py-3.5 sm:py-4 bg-yellow-400 hover:bg-yellow-300 text-blue-900 font-black text-xs uppercase tracking-widest rounded-2xl shadow-xl transition-all hover:scale-105 active:scale-95 whitespace-normal break-words flex items-center justify-center gap-2 shrink-0"
          >
            <span>Check School Fees</span>
            <span>→</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 sm:gap-12 border-b border-white/10 pb-12 mb-12">
          <div className="col-span-1 md:col-span-2 min-w-0">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6 sm:mb-8">
              <div className="w-20 h-20 sm:w-24 sm:h-24 bg-white rounded-3xl border-4 border-yellow-400 shadow-2xl ring-4 ring-white/20 shrink-0 flex items-center justify-center p-2">
                <img 
                  src="/logo.png" 
                  alt="God's Hand International Model School Logo" 
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    if (!e.currentTarget.src.endsWith('hands.jpg')) {
                      e.currentTarget.src = 'hands.jpg';
                    } else {
                      e.currentTarget.style.display = 'none';
                      if (e.currentTarget.parentElement) {
                        e.currentTarget.parentElement.innerHTML = '<div class="w-full h-full bg-yellow-400 text-blue-900 rounded-2xl flex items-center justify-center text-2xl font-black font-serif">GHIMS</div>';
                      }
                    }
                  }}
                />
              </div>
              <div className="min-w-0">
                <h2 className="text-xl sm:text-2xl md:text-3xl font-serif font-black tracking-tight leading-tight break-words">God's Hand International Model School</h2>
                <div className="flex flex-wrap items-center gap-2 mt-1.5">
                  <span className="px-2.5 py-0.5 bg-yellow-400 text-blue-950 font-black text-xs uppercase tracking-widest rounded-md shadow-sm">
                    Have Faith In God
                  </span>
                  <span className="text-blue-300 text-xs font-bold break-words">• Wire & Cable, Ibadan</span>
                </div>
              </div>
            </div>
            <p className="text-blue-100/70 max-w-md mb-6 sm:mb-8 leading-relaxed font-medium text-sm break-words">
              We provide a nurturing environment where children grow spiritually and intellectually. 
              Our commitment is to raise a Godly generation of leaders through quality education.
            </p>
            <div className="flex flex-wrap gap-3 sm:gap-4">
              {['FB', 'TW', 'IG', 'YT'].map(p => (
                <button key={p} className="min-h-[44px] min-w-[44px] w-11 h-11 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center hover:bg-yellow-400 hover:text-blue-900 transition-all font-black text-xs">
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div className="min-w-0">
            <h4 className="text-lg sm:text-xl font-black mb-6 text-yellow-400 uppercase tracking-widest border-b border-yellow-400/30 pb-2 inline-block">Quick Access</h4>
            <ul className="space-y-3 text-blue-100/70 font-bold text-sm">
              <li>
                <button 
                  onClick={() => onNavigate?.('parentStaffChat')} 
                  className="min-h-[44px] w-full py-1 hover:text-yellow-400 transition-colors flex flex-wrap items-center gap-1.5 group text-left text-yellow-300"
                >
                  <span className="text-yellow-400">»</span> 
                  <span className="group-hover:translate-x-1 transition-transform font-black break-words whitespace-normal">💬 Message Staff Directly</span>
                  <span className="px-1.5 py-0.5 bg-yellow-400 text-blue-900 text-[9px] font-black rounded uppercase">Parents</span>
                </button>
              </li>
              <li>
                <button 
                  onClick={() => onNavigate?.('communityHub')} 
                  className="min-h-[40px] w-full py-1 hover:text-yellow-400 transition-colors flex flex-wrap items-center gap-1.5 group text-left text-emerald-300"
                >
                  <span className="text-emerald-400 shrink-0">»</span> 
                  <span className="group-hover:translate-x-1 transition-transform font-black break-words whitespace-normal">📞 Live Chat, Meetings & Calls</span>
                  <span className="px-1.5 py-0.5 bg-emerald-500 text-white text-[9px] font-black rounded uppercase shrink-0">All Users</span>
                </button>
              </li>
              <li>
                <button 
                  onClick={() => onNavigate?.('resultChecker')} 
                  className="min-h-[40px] w-full py-1 hover:text-yellow-400 transition-colors flex flex-wrap items-center gap-1.5 group text-left text-yellow-300"
                >
                  <span className="text-yellow-400 shrink-0">»</span> 
                  <span className="group-hover:translate-x-1 transition-transform font-black break-words whitespace-normal">📜 Check Student Results</span>
                  <span className="px-1.5 py-0.5 bg-yellow-400 text-blue-900 text-[9px] font-black rounded uppercase shrink-0">₦1,000 Fee</span>
                </button>
              </li>
              <li>
                <button 
                  onClick={() => onNavigate?.('parentAuth')} 
                  className="min-h-[40px] w-full py-1 hover:text-yellow-400 transition-colors flex flex-wrap items-center gap-1.5 group text-left"
                >
                  <span className="text-yellow-400 shrink-0">»</span> 
                  <span className="group-hover:translate-x-1 transition-transform font-black break-words whitespace-normal">👨‍👩‍👧‍👦 Parent & Guardian Portal</span>
                  <span className="px-1.5 py-0.5 bg-yellow-400 text-blue-900 text-[9px] font-black rounded uppercase shrink-0">Gate Scans & Fees</span>
                </button>
              </li>
              <li>
                <button 
                  onClick={() => onNavigate?.('about')} 
                  className="min-h-[40px] w-full py-1 hover:text-yellow-400 transition-colors flex flex-wrap items-center gap-1.5 group text-left"
                >
                  <span className="text-yellow-400 shrink-0">»</span> 
                  <span className="group-hover:translate-x-1 transition-transform break-words whitespace-normal">About School & Academic Results</span>
                  <span className="px-1.5 py-0.5 bg-yellow-400 text-blue-900 text-[9px] font-black rounded uppercase shrink-0">#1 Wire & Cable</span>
                </button>
              </li>
              <li>
                <button 
                  onClick={() => onCheckFees?.()} 
                  className="min-h-[40px] w-full py-1 hover:text-yellow-400 transition-colors flex flex-wrap items-center gap-1.5 group text-left"
                >
                  <span className="text-yellow-400 shrink-0">»</span> 
                  <span className="group-hover:translate-x-1 transition-transform break-words whitespace-normal">Check School Fees</span>
                  <span className="px-1.5 py-0.5 bg-yellow-400 text-blue-900 text-[9px] font-black rounded uppercase shrink-0">Login</span>
                </button>
              </li>
              <li>
                <button 
                  onClick={() => onCheckFees?.()} 
                  className="min-h-[40px] w-full py-1 hover:text-yellow-400 transition-colors flex flex-wrap items-center gap-1.5 group text-left"
                >
                  <span className="text-yellow-400 shrink-0">»</span> 
                  <span className="group-hover:translate-x-1 transition-transform break-words whitespace-normal">Fees & Payments</span>
                </button>
              </li>
              <li>
                <button 
                  onClick={() => onNavigate?.('portal')} 
                  className="min-h-[40px] w-full py-1 hover:text-yellow-400 transition-colors flex flex-wrap items-center gap-1.5 group text-left"
                >
                  <span className="text-yellow-400 shrink-0">»</span> 
                  <span className="group-hover:translate-x-1 transition-transform break-words whitespace-normal">Students & Pupils Portal</span>
                </button>
              </li>
              <li>
                <button 
                  onClick={() => onNavigate?.('apply')} 
                  className="min-h-[40px] w-full py-1 hover:text-yellow-400 transition-colors flex flex-wrap items-center gap-1.5 group text-left"
                >
                  <span className="text-yellow-400 shrink-0">»</span> 
                  <span className="group-hover:translate-x-1 transition-transform break-words whitespace-normal">Online Admissions</span>
                </button>
              </li>
              <li>
                <button 
                  onClick={() => onNavigate?.('home')} 
                  className="min-h-[44px] w-full py-1 hover:text-yellow-400 transition-colors flex items-center gap-1.5 group text-left"
                >
                  <span className="text-yellow-400">»</span> 
                  <span className="group-hover:translate-x-1 transition-transform break-words whitespace-normal">Academic Calendar</span>
                </button>
              </li>
            </ul>
          </div>

          <div className="min-w-0">
            <h4 className="text-lg sm:text-xl font-black mb-6 text-yellow-400 uppercase tracking-widest border-b border-yellow-400/30 pb-2 inline-block">School & Contact</h4>
            <ul className="space-y-4 text-blue-100/80 font-bold text-sm">
              <li className="flex items-start group">
                <span className="p-2 bg-white/5 rounded-lg mr-3 group-hover:bg-yellow-400 group-hover:text-blue-900 transition-all text-base shrink-0">📍</span>
                <div className="min-w-0">
                  <p className="text-white font-black text-xs uppercase tracking-wider">Wire & Cable School Address:</p>
                  <p className="text-blue-200/90 text-xs mt-0.5 leading-relaxed break-words">
                    Oluwatedo Ire-Akari, Orisunmibare Area, Owode, Wire and Cable Axis, Apata, Ibadan, Oyo State, Nigeria
                  </p>
                  <span className="inline-block mt-1 text-[10px] text-yellow-400 font-black uppercase tracking-wider break-words">
                    ★ Best School with Good Academic Results in Ibadan
                  </span>
                </div>
              </li>
              <li className="flex items-start group">
                <span className="p-2 bg-white/5 rounded-lg mr-3 group-hover:bg-yellow-400 group-hover:text-blue-900 transition-all text-base shrink-0">📞</span>
                <div className="flex flex-col min-w-0">
                  <p className="text-white font-black text-xs uppercase tracking-wider">Admissions Hotline:</p>
                  <a href="tel:08056507252" className="text-white hover:text-yellow-400 transition-colors py-1">08056507252</a>
                  <a href="tel:07085596586" className="text-white hover:text-yellow-400 transition-colors py-1">07085596586</a>
                </div>
              </li>
              <li className="flex items-start group">
                <span className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg mr-3 group-hover:bg-emerald-500 group-hover:text-white transition-all text-base shrink-0">💬</span>
                <div className="flex flex-col min-w-0">
                  <p className="text-emerald-400 font-black text-xs uppercase tracking-wider">Official WhatsApp:</p>
                  <a 
                    href="https://wa.me/2347085596586?text=Hello%20God's%20Hand%20International%20Model%20School,%20I%20would%20like%20to%20inquire%20about%20admissions%20and%20fees" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="min-h-[44px] inline-flex items-center space-x-1.5 mt-1 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition-all shadow-md w-fit"
                  >
                    <span>Chat 07085596586</span>
                    <span className="text-[10px]">↗</span>
                  </a>
                </div>
              </li>
              <li className="flex items-start group">
                <span className="p-2 bg-white/5 rounded-lg mr-3 group-hover:bg-yellow-400 group-hover:text-blue-900 transition-all text-base shrink-0">✉️</span>
                <div className="min-w-0">
                  <p className="text-white font-black text-xs uppercase tracking-wider">Official Email:</p>
                  <a href="mailto:Godshandschool70@gmail.com" className="text-white hover:text-yellow-400 transition-colors break-all">
                    Godshandschool70@gmail.com
                  </a>
                </div>
              </li>
            </ul>
          </div>
        </div>

        {/* SEO Local Directory & Area Coverage Note */}
        <div className="p-5 sm:p-6 rounded-2xl bg-white/5 border border-white/10 mb-8 text-left">
          <h5 className="text-xs font-black text-yellow-400 uppercase tracking-widest mb-2 break-words">
            Local Area Coverage • Wire & Cable, Apata, Ibadan
          </h5>
          <p className="text-xs text-blue-100/70 leading-relaxed break-words">
            <strong>God's Hand International Model School</strong> is celebrated as the premier institution for good academic results at the <strong>Wire and Cable</strong> corridor, Apata, Ibadan. Proudly educating pupils and students across <strong>Owode, Orisunmibare, Bembo, Kuola, Omi-Adio, Apata Ganga, Dugbe,</strong> and the broader <strong>Ibadan metropolis</strong> in Oyo State.
          </p>
        </div>

        {/* Supabase Realtime SQL Code Copy Button - Strictly Visible to Administrator Only */}
        {isAdmin && onOpenSqlModal && (
          <div className="mb-8 p-4 rounded-2xl bg-yellow-400 text-blue-950 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg">
            <div className="flex items-center gap-3 text-left min-w-0">
              <span className="text-2xl p-2 bg-blue-900 text-yellow-400 rounded-xl shrink-0">⚡</span>
              <div className="min-w-0">
                <p className="font-serif font-black text-sm uppercase break-words">Supabase Real-Time SQL Code</p>
                <p className="text-xs font-semibold text-blue-900/80 break-words">Copy all 23 database tables, admin realtime sync triggers, and live chat/meetings SQL to paste in your Supabase SQL Editor.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onOpenSqlModal}
              className="min-h-[44px] w-full sm:w-auto px-5 py-2.5 bg-blue-900 hover:bg-blue-950 text-yellow-400 rounded-xl font-black text-xs uppercase tracking-wider shadow-md transition-all active:scale-95 whitespace-normal flex items-center justify-center gap-1.5 shrink-0"
            >
              <span>📋</span>
              <span>Open Supabase SQL Code</span>
            </button>
          </div>
        )}
        
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-xs font-black uppercase tracking-wider text-blue-100/40 text-center md:text-left">
          <p className="break-words">© {new Date().getFullYear()} God's Hand International Model School. Divine Excellence.</p>
          <div className="flex flex-wrap justify-center gap-4 sm:gap-8">
            <a href="#" className="hover:text-yellow-400 transition-colors py-1">Safety Policy</a>
            <a href="#" className="hover:text-yellow-400 transition-colors py-1">Privacy</a>
            <a href="#" className="hover:text-yellow-400 transition-colors py-1">Terms</a>
          </div>
        </div>
      </div>
    </footer>
  );
};
