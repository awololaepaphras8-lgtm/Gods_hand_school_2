import React, { useState, useEffect } from 'react';

interface SplashScreenProps {
  onFinish?: () => void;
  autoDismissMs?: number;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
  onFinish,
  autoDismissMs = 2400
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [progress, setProgress] = useState(10);

  useEffect(() => {
    // Progress bar increment
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 95) {
          clearInterval(interval);
          return 100;
        }
        return prev + Math.floor(Math.random() * 15) + 10;
      });
    }, 180);

    // Auto dismiss timer
    const dismissTimer = setTimeout(() => {
      handleDismiss();
    }, autoDismissMs);

    return () => {
      clearInterval(interval);
      clearTimeout(dismissTimer);
    };
  }, [autoDismissMs]);

  const handleDismiss = () => {
    setIsFadingOut(true);
    setTimeout(() => {
      setIsVisible(false);
      onFinish?.();
    }, 450);
  };

  if (!isVisible) return null;

  return (
    <div 
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-between bg-gradient-to-b from-blue-950 via-blue-900 to-indigo-950 text-white select-none transition-opacity duration-500 overflow-hidden ${
        isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      role="dialog"
      aria-label="Welcome Splash Screen"
    >
      {/* Decorative Golden Ambient Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-yellow-400/15 rounded-full blur-3xl pointer-events-none animate-pulse"></div>
      <div className="absolute bottom-10 right-10 w-72 h-72 bg-blue-500/10 rounded-full blur-2xl pointer-events-none"></div>

      {/* Top School Motto Bar */}
      <div className="pt-8 px-4 text-center z-10">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-yellow-400/20 border border-yellow-400/40 rounded-full backdrop-blur-md shadow-sm">
          <span className="w-2 h-2 rounded-full bg-yellow-400 animate-ping"></span>
          <span className="text-[11px] sm:text-xs font-black uppercase tracking-[0.25em] text-yellow-300">
            Have Faith In God
          </span>
        </div>
      </div>

      {/* Center Branding & Welcome Message */}
      <div className="flex flex-col items-center justify-center px-6 text-center max-w-xl mx-auto z-10 -mt-6">
        {/* School Logo with Golden Ring & Glow */}
        <div className="relative mb-8 group">
          <div className="absolute -inset-2 bg-gradient-to-r from-yellow-400 via-yellow-200 to-amber-500 rounded-full blur-md opacity-75 group-hover:opacity-100 transition-opacity animate-pulse"></div>
          
          <div className="relative w-32 h-32 sm:w-40 sm:h-40 rounded-full bg-white p-3 border-4 border-yellow-400 shadow-2xl flex items-center justify-center overflow-hidden">
            <img
              src="/logo.png"
              alt="God's Hand International Model School Logo"
              className="w-full h-full object-contain filter drop-shadow-md transition-transform duration-700 hover:scale-105"
              onError={(e) => {
                if (!e.currentTarget.src.endsWith('hands.jpg')) {
                  e.currentTarget.src = 'hands.jpg';
                } else {
                  e.currentTarget.style.display = 'none';
                  if (e.currentTarget.parentElement) {
                    e.currentTarget.parentElement.innerHTML = '<div class="w-full h-full bg-blue-900 text-yellow-400 rounded-full flex items-center justify-center text-4xl font-black font-serif border-2 border-yellow-400">GHIMS</div>';
                  }
                }
              }}
            />
          </div>
        </div>

        {/* Exact words requested below the logo */}
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-white font-serif tracking-tight leading-snug drop-shadow-lg mb-3">
          welcome to God's hand international model school
        </h1>

        <div className="h-1.5 w-24 bg-gradient-to-r from-transparent via-yellow-400 to-transparent rounded-full mb-4"></div>

        <p className="text-xs sm:text-sm font-semibold text-blue-200/90 max-w-md tracking-wide uppercase">
          Wire & Cable, Apata, Ibadan • Oyo State, Nigeria
        </p>
      </div>

      {/* Bottom Loading Progress & Skip Button */}
      <div className="pb-10 px-6 w-full max-w-md mx-auto flex flex-col items-center gap-4 z-10">
        <div className="w-full bg-blue-950/80 rounded-full h-2 overflow-hidden border border-yellow-400/30 p-0.5">
          <div 
            className="bg-gradient-to-r from-yellow-400 to-amber-300 h-full rounded-full transition-all duration-300 ease-out shadow-sm"
            style={{ width: `${Math.min(progress, 100)}%` }}
          ></div>
        </div>

        <div className="flex items-center justify-between w-full text-xs text-blue-300/80 font-bold px-1">
          <span className="text-[11px] uppercase tracking-wider">Connecting School Portal...</span>
          <button
            type="button"
            onClick={handleDismiss}
            className="text-[11px] text-yellow-400 hover:text-yellow-300 font-black uppercase tracking-wider transition-colors inline-flex items-center gap-1 active:scale-95"
          >
            <span>Enter App</span>
            <span>→</span>
          </button>
        </div>
      </div>
    </div>
  );
};
