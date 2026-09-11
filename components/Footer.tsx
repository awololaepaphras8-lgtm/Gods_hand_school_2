
import React from 'react';

interface FooterProps {
  onCheckFees?: () => void;
  onNavigate?: (view: any) => void;
}

export const Footer: React.FC<FooterProps> = ({ onCheckFees, onNavigate }) => {
  return (
    <footer className="bg-blue-900 text-white py-16 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-2 bg-yellow-400"></div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Student Fee Verification Callout Bar */}
        <div className="mb-14 p-6 sm:p-8 bg-gradient-to-r from-blue-950 to-indigo-950 border-2 border-yellow-400/40 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl">
          <div className="flex items-center space-x-5 text-left">
            <div className="w-14 h-14 bg-yellow-400 text-blue-900 rounded-2xl flex items-center justify-center text-3xl font-black shadow-lg shrink-0">
              💳
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 bg-yellow-400 text-blue-900 rounded-full font-black text-[10px] uppercase tracking-widest">
                  Students & Pupils Fee Portal
                </span>
                <span className="text-blue-300 text-xs font-bold">• Check After Login</span>
              </div>
              <h3 className="text-lg sm:text-xl font-black text-white font-serif mt-1">
                Check Your School Fees & Balance
              </h3>
              <p className="text-xs text-blue-100/70 font-medium">
                Verify term tuition, check outstanding balances, and download official fee receipts.
              </p>
            </div>
          </div>

          <button 
            type="button"
            onClick={() => onCheckFees?.()}
            className="w-full md:w-auto px-8 py-4 bg-yellow-400 hover:bg-yellow-300 text-blue-900 font-black text-xs uppercase tracking-widest rounded-2xl shadow-xl transition-all hover:scale-105 active:scale-95 text-nowrap flex items-center justify-center gap-2"
          >
            <span>Check School Fees</span>
            <span>→</span>
          </button>
        </div>

        <div className="grid md:grid-cols-4 gap-12 border-b border-white/10 pb-12 mb-12">
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center mb-8">
              <div className="w-24 h-24 sm:w-28 sm:h-28 mr-5 bg-white rounded-3xl border-4 border-yellow-400 shadow-2xl ring-4 ring-white/20 overflow-hidden shrink-0 flex items-center justify-center">
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
                        e.currentTarget.parentElement.innerHTML = '<div class="w-full h-full bg-yellow-400 text-blue-900 rounded-2xl flex items-center justify-center text-2xl font-black font-serif">GHIMS</div>';
                      }
                    }
                  }}
                />
              </div>
              <div>
                <h2 className="text-2xl md:text-3xl font-serif font-black tracking-tight leading-tight">God's Hand International Model School</h2>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="px-2.5 py-0.5 bg-yellow-400 text-blue-950 font-black text-xs uppercase tracking-widest rounded-md shadow-sm">
                    Have Faith In God
                  </span>
                  <span className="text-blue-300 text-xs font-bold hidden sm:inline">• Wire & Cable, Ibadan</span>
                </div>
              </div>
            </div>
            <p className="text-blue-100/60 max-w-md mb-8 leading-relaxed font-medium">
              We provide a nurturing environment where children grow spiritually and intellectually. 
              Our commitment is to raise a godly generation of leaders through quality education.
            </p>
            <div className="flex space-x-5">
              {['FB', 'TW', 'IG', 'YT'].map(p => (
                <button key={p} className="w-10 h-10 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center hover:bg-yellow-400 hover:text-blue-900 transition-all font-black text-xs">
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-xl font-black mb-8 text-yellow-400 uppercase tracking-widest border-b border-yellow-400/30 pb-2 inline-block">Quick Access</h4>
            <ul className="space-y-4 text-blue-100/70 font-bold text-sm">
              <li>
                <button 
                  onClick={() => onNavigate?.('parentAuth')} 
                  className="hover:text-yellow-400 transition-colors flex items-center group text-left text-yellow-300"
                >
                  <span className="mr-2 text-yellow-400">»</span> 
                  <span className="group-hover:translate-x-1 transition-transform font-black">👨‍👩‍👧‍👦 Parent & Guardian Portal</span>
                  <span className="ml-2 px-1.5 py-0.5 bg-yellow-400 text-blue-900 text-[9px] font-black rounded uppercase">Gate Scans & Fees</span>
                </button>
              </li>
              <li>
                <button 
                  onClick={() => onNavigate?.('about')} 
                  className="hover:text-yellow-400 transition-colors flex items-center group text-left"
                >
                  <span className="mr-2 text-yellow-400">»</span> 
                  <span className="group-hover:translate-x-1 transition-transform">About School & Academic Results</span>
                  <span className="ml-2 px-1.5 py-0.5 bg-yellow-400 text-blue-900 text-[9px] font-black rounded uppercase">#1 Wire & Cable</span>
                </button>
              </li>
              <li>
                <button 
                  onClick={() => onCheckFees?.()} 
                  className="hover:text-yellow-400 transition-colors flex items-center group text-left"
                >
                  <span className="mr-2 text-yellow-400">»</span> 
                  <span className="group-hover:translate-x-1 transition-transform">Check School Fees</span>
                  <span className="ml-2 px-1.5 py-0.5 bg-yellow-400 text-blue-900 text-[9px] font-black rounded uppercase">Login</span>
                </button>
              </li>
              <li>
                <button 
                  onClick={() => onCheckFees?.()} 
                  className="hover:text-yellow-400 transition-colors flex items-center group text-left"
                >
                  <span className="mr-2 text-yellow-400">»</span> 
                  <span className="group-hover:translate-x-1 transition-transform">Fees & Payments</span>
                </button>
              </li>
              <li>
                <button 
                  onClick={() => onNavigate?.('portal')} 
                  className="hover:text-yellow-400 transition-colors flex items-center group text-left"
                >
                  <span className="mr-2 text-yellow-400">»</span> 
                  <span className="group-hover:translate-x-1 transition-transform">Students & Pupils Portal</span>
                </button>
              </li>
              <li>
                <button 
                  onClick={() => onNavigate?.('apply')} 
                  className="hover:text-yellow-400 transition-colors flex items-center group text-left"
                >
                  <span className="mr-2 text-yellow-400">»</span> 
                  <span className="group-hover:translate-x-1 transition-transform">Online Admissions</span>
                </button>
              </li>
              <li>
                <button 
                  onClick={() => onNavigate?.('home')} 
                  className="hover:text-yellow-400 transition-colors flex items-center group text-left"
                >
                  <span className="mr-2 text-yellow-400">»</span> 
                  <span className="group-hover:translate-x-1 transition-transform">Academic Calendar</span>
                </button>
              </li>
              <li>
                <button 
                  onClick={() => onNavigate?.('admin')} 
                  className="hover:text-yellow-400 transition-colors flex items-center group text-left"
                >
                  <span className="mr-2 text-yellow-400">»</span> 
                  <span className="group-hover:translate-x-1 transition-transform">Proprietor Access</span>
                </button>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-xl font-black mb-8 text-yellow-400 uppercase tracking-widest border-b border-yellow-400/30 pb-2 inline-block">School & Contact</h4>
            <ul className="space-y-5 text-blue-100/80 font-bold text-sm">
              <li className="flex items-start group">
                <span className="p-2 bg-white/5 rounded-lg mr-3 group-hover:bg-yellow-400 group-hover:text-blue-900 transition-all text-base shrink-0">📍</span>
                <div>
                  <p className="text-white font-black text-xs uppercase tracking-wider">Wire & Cable School Address:</p>
                  <p className="text-blue-200/90 text-xs mt-0.5 leading-relaxed">
                    Oluwatedo Ire-Akari, Orisunmibare Area, Owode, Wire and Cable Axis, Apata, Ibadan, Oyo State, Nigeria
                  </p>
                  <span className="inline-block mt-1 text-[10px] text-yellow-400 font-black uppercase tracking-wider">
                    ★ Best School with Good Academic Results in Ibadan
                  </span>
                </div>
              </li>
              <li className="flex items-start group">
                <span className="p-2 bg-white/5 rounded-lg mr-3 group-hover:bg-yellow-400 group-hover:text-blue-900 transition-all text-base shrink-0">📞</span>
                <div className="flex flex-col">
                  <p className="text-white font-black text-xs uppercase tracking-wider">Admissions Hotline:</p>
                  <a href="tel:08056507252" className="text-white hover:text-yellow-400 transition-colors">08056507252</a>
                  <a href="tel:08130300837" className="text-white hover:text-yellow-400 transition-colors">08130300837</a>
                </div>
              </li>
              <li className="flex items-start group">
                <span className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg mr-3 group-hover:bg-emerald-500 group-hover:text-white transition-all text-base shrink-0">💬</span>
                <div className="flex flex-col">
                  <p className="text-emerald-400 font-black text-xs uppercase tracking-wider">Official WhatsApp:</p>
                  <a 
                    href="https://wa.me/2348130300837?text=Hello%20God's%20Hand%20International%20Model%20School,%20I%20would%20like%20to%20inquire%20about%20admissions%20and%20fees" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center space-x-1.5 mt-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition-all shadow-md w-fit"
                  >
                    <span>Chat 08130300837</span>
                    <span className="text-[10px]">↗</span>
                  </a>
                </div>
              </li>
              <li className="flex items-start group">
                <span className="p-2 bg-white/5 rounded-lg mr-3 group-hover:bg-yellow-400 group-hover:text-blue-900 transition-all text-base shrink-0">✉️</span>
                <div>
                  <p className="text-white font-black text-xs uppercase tracking-wider">Official Email:</p>
                  <a href="mailto:godshandschool70@gmail.com" className="text-white hover:text-yellow-400 transition-colors lowercase">
                    godshandschool70@gmail.com
                  </a>
                </div>
              </li>
            </ul>
          </div>
        </div>

        {/* SEO Local Directory & Area Coverage Note */}
        <div className="p-6 rounded-2xl bg-white/5 border border-white/10 mb-8 text-left">
          <h5 className="text-xs font-black text-yellow-400 uppercase tracking-widest mb-2">
            Local Area Coverage • Wire & Cable, Apata, Ibadan
          </h5>
          <p className="text-xs text-blue-100/70 leading-relaxed">
            <strong>God's Hand International Model School</strong> is celebrated as the premier institution for good academic results at the <strong>Wire and Cable</strong> corridor, Apata, Ibadan. Proudly educating pupils and students across <strong>Owode, Orisunmibare, Bembo, Kuola, Omi-Adio, Apata Ganga, Dugbe,</strong> and the broader <strong>Ibadan metropolis</strong> in Oyo State.
          </p>
        </div>
        
        <div className="flex flex-col md:flex-row justify-between items-center text-xs font-black uppercase tracking-[0.2em] text-blue-100/30">
          <p>© {new Date().getFullYear()} God's Hand International Model School. Divine Excellence.</p>
          <div className="flex space-x-8 mt-6 md:mt-0">
            <a href="#" className="hover:text-yellow-400 transition-colors">Safety Policy</a>
            <a href="#" className="hover:text-yellow-400 transition-colors">Privacy</a>
            <a href="#" className="hover:text-yellow-400 transition-colors">Terms</a>
          </div>
        </div>
      </div>
    </footer>
  );
};
