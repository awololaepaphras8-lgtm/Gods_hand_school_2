import React, { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

interface PWADownloadPromptProps {
  forceModalOpen?: boolean;
  onCloseModal?: () => void;
}

export const PWADownloadPrompt: React.FC<PWADownloadPromptProps> = ({
  forceModalOpen = false,
  onCloseModal
}) => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState<boolean>(false);
  const [isIOS, setIsIOS] = useState<boolean>(false);
  const [isBannerVisible, setIsBannerVisible] = useState<boolean>(false);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(forceModalOpen);
  const [notificationStatus, setNotificationStatus] = useState<NotificationPermission>('default');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Sync forceModalOpen from parent
  useEffect(() => {
    if (forceModalOpen) {
      setIsModalOpen(true);
    }
  }, [forceModalOpen]);

  useEffect(() => {
    // Check if running in standalone mode
    const standaloneCheck = 
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    setIsStandalone(standaloneCheck);

    // Check if iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    // Check notification permission if available
    if ('Notification' in window) {
      setNotificationStatus(Notification.permission);
    }

    // Capture beforeinstallprompt
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);

      // Only show banner if not dismissed in the last 24 hours and not in standalone
      const dismissedUntil = localStorage.getItem('ghs_pwa_banner_dismissed_until');
      if (!standaloneCheck && (!dismissedUntil || Date.now() > parseInt(dismissedUntil, 10))) {
        // Show after a brief polite delay
        const timer = setTimeout(() => {
          setIsBannerVisible(true);
        }, 1500);
        return () => clearTimeout(timer);
      }
    };

    const handleAppInstalled = () => {
      setIsStandalone(true);
      setIsBannerVisible(false);
      setIsModalOpen(false);
      setDeferredPrompt(null);
      localStorage.setItem('ghs_app_installed', 'true');
      window.dispatchEvent(new Event('ghs_app_installed_event'));
      showToast("🎉 God's Hand School App successfully installed to your device!");
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    // On iOS or browsers that don't trigger beforeinstallprompt, if not dismissed, still notify user
    const dismissedUntil = localStorage.getItem('ghs_pwa_banner_dismissed_until');
    if (!standaloneCheck && (!dismissedUntil || Date.now() > parseInt(dismissedUntil, 10))) {
      const iosTimer = setTimeout(() => {
        setIsBannerVisible(true);
      }, 2500);
      return () => {
        clearTimeout(iosTimer);
        window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
        window.removeEventListener('appinstalled', handleAppInstalled);
      };
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome === 'accepted') {
          localStorage.setItem('ghs_app_installed', 'true');
          window.dispatchEvent(new Event('ghs_app_installed_event'));
          showToast("App installation initiated! Check your device home screen.");
          setIsBannerVisible(false);
          setIsModalOpen(false);
        } else {
          showToast("Installation postponed. You can download anytime from the menu!");
        }
        setDeferredPrompt(null);
      } catch (err) {
        console.error('Install prompt error:', err);
        setIsModalOpen(true);
      }
    } else {
      // Fallback: open detailed instructions modal (for iOS, Safari, Firefox, or already installed)
      setIsModalOpen(true);
    }
  };

  const handleDismissBanner = () => {
    setIsBannerVisible(false);
    // Dismiss for 24 hours
    localStorage.setItem('ghs_pwa_banner_dismissed_until', (Date.now() + 24 * 60 * 60 * 1000).toString());
  };

  const handleEnableNotifications = async () => {
    if (!('Notification' in window)) {
      showToast("Browser notifications are not supported on this browser.");
      return;
    }

    try {
      const perm = await Notification.requestPermission();
      setNotificationStatus(perm);
      if (perm === 'granted') {
        showToast("🔔 Notifications enabled! You will receive student attendance & fee alerts.");
        // Fire a welcome test notification
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage({
            type: 'SHOW_NOTIFICATION',
            title: "God's Hand International Model School",
            body: "Welcome! School announcements and gate attendance alerts are now active."
          });
        } else {
          new Notification("God's Hand International Model School", {
            body: "Welcome! School announcements and gate attendance alerts are now active.",
            icon: "/logo.png",
            badge: "/logo.png"
          });
        }
      } else if (perm === 'denied') {
        showToast("Notifications were blocked. You can enable them in your browser settings.");
      }
    } catch (err) {
      console.error('Notification error:', err);
      showToast("Unable to request notifications permission.");
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    if (onCloseModal) onCloseModal();
  };

  // If already standalone and modal is not forced, no need to show the banner
  if (isStandalone && !isModalOpen && !toastMessage) {
    return null;
  }

  return (
    <>
      {/* Toast Notification Alert */}
      {toastMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-5 py-3.5 bg-blue-950 text-white font-bold text-xs sm:text-sm rounded-2xl shadow-2xl border-2 border-yellow-400 flex items-center gap-3 animate-bounce">
          <span className="text-xl">🔔</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Floating PWA Download Notification Bar (Bottom / Top) */}
      {isBannerVisible && !isStandalone && (
        <div className="fixed bottom-3 sm:bottom-5 left-3 sm:left-5 right-3 sm:right-5 max-w-2xl mx-auto z-40 bg-gradient-to-r from-blue-950 via-blue-900 to-indigo-950 text-white p-3.5 sm:p-4 rounded-2xl shadow-2xl border-2 border-yellow-400/80 backdrop-blur-md transition-all transform animate-slide-up">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
            
            {/* Left: School Icon & Text */}
            <div className="flex items-center gap-3 text-left w-full sm:w-auto">
              <div className="relative shrink-0">
                <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center shadow-md border-2 border-yellow-400 overflow-hidden">
                  <img 
                    src="/logo.png" 
                    alt="God's Hand School App Icon" 
                    className="w-[80%] h-[80%] object-contain"
                  />
                </div>
                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-blue-950 rounded-full animate-ping"></span>
                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-blue-950 rounded-full"></span>
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs sm:text-sm font-black text-yellow-400 uppercase tracking-wider font-serif truncate">
                    Download School App
                  </h4>
                  <span className="px-1.5 py-0.5 bg-yellow-400/20 text-yellow-300 text-[9px] font-black rounded-md uppercase">
                    PWA Fast
                  </span>
                </div>
                <p className="text-[11px] sm:text-xs text-blue-100/90 leading-tight line-clamp-1 sm:line-clamp-2 mt-0.5">
                  Install on your phone or PC for 1-tap gate attendance, results & offline portal access!
                </p>
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end shrink-0">
              {notificationStatus === 'default' && (
                <button
                  onClick={handleEnableNotifications}
                  title="Enable Push Notifications"
                  className="px-2.5 py-2 bg-blue-800/80 hover:bg-blue-700 text-yellow-300 rounded-xl text-[11px] font-bold transition-all flex items-center gap-1 border border-blue-600"
                >
                  <span>🔔</span>
                  <span className="hidden md:inline">Allow Alerts</span>
                </button>
              )}

              <button
                onClick={handleInstallClick}
                className="flex-1 sm:flex-initial px-4 py-2.5 bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-300 hover:to-yellow-400 text-blue-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-lg transition-all transform active:scale-95 flex items-center justify-center gap-1.5"
              >
                <span>📲</span>
                <span>Download App</span>
              </button>

              <button
                onClick={handleDismissBanner}
                className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
                title="Dismiss for today"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Comprehensive Installation Guide Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-blue-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-white text-slate-900 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border-4 border-yellow-400 max-h-[90vh] overflow-y-auto relative">
            
            {/* Close button */}
            <button
              onClick={closeModal}
              className="absolute top-4 right-4 w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-lg transition-colors"
            >
              ✕
            </button>

            {/* Header */}
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-3xl shadow-xl border-4 border-yellow-400 mb-3 overflow-hidden">
                <img src="/logo.png" alt="God's Hand School Logo" className="w-[80%] h-[80%] object-contain" />
              </div>
              <h3 className="text-2xl font-black font-serif text-blue-950 leading-tight">
                Install God's Hand School App
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Official Progressive Web App (PWA) • Works on Android, iPhone, Windows, Mac & Tablets
              </p>
            </div>

            {/* If deferredPrompt is available (Chrome / Edge / Android) */}
            {deferredPrompt && (
              <div className="mb-6 p-4 bg-emerald-50 rounded-2xl border-2 border-emerald-300 text-center space-y-3">
                <p className="text-xs font-bold text-emerald-900">
                  ⚡ Direct 1-Click Install Available on Your Device!
                </p>
                <button
                  onClick={handleInstallClick}
                  className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm uppercase tracking-wider rounded-xl shadow-md transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  <span>📥</span>
                  <span>Install / Download App Now</span>
                </button>
              </div>
            )}

            {/* Features of the App */}
            <div className="grid grid-cols-2 gap-2.5 mb-6 text-[11px] font-bold text-slate-700">
              <div className="p-2.5 bg-blue-50/60 rounded-xl border border-blue-100 flex items-center gap-2">
                <span>🚀</span>
                <span>Instant Offline Access</span>
              </div>
              <div className="p-2.5 bg-blue-50/60 rounded-xl border border-blue-100 flex items-center gap-2">
                <span>🔔</span>
                <span>Gate Attendance Alerts</span>
              </div>
              <div className="p-2.5 bg-blue-50/60 rounded-xl border border-blue-100 flex items-center gap-2">
                <span>📊</span>
                <span>Check Results Anytime</span>
              </div>
              <div className="p-2.5 bg-blue-50/60 rounded-xl border border-blue-100 flex items-center gap-2">
                <span>💳</span>
                <span>Quick Fee Verification</span>
              </div>
            </div>

            {/* Platform Specific Instructions */}
            <div className="space-y-4 text-left">
              <h4 className="text-xs font-black uppercase tracking-wider text-blue-900 border-b pb-1">
                How to Download on Your Device
              </h4>

              {/* iOS / iPhone */}
              <div className={`p-3.5 rounded-2xl border-2 ${isIOS ? 'bg-amber-50/70 border-amber-300' : 'bg-slate-50 border-slate-200'}`}>
                <div className="flex items-center gap-2 font-black text-xs text-blue-950 mb-1.5">
                  <span>🍏</span>
                  <span>iPhone & iPad (Safari)</span>
                  {isIOS && <span className="px-2 py-0.5 bg-amber-400 text-blue-950 text-[9px] rounded-md font-bold uppercase">Detected</span>}
                </div>
                <ol className="text-xs text-slate-600 space-y-1.5 list-decimal list-inside font-medium leading-relaxed">
                  <li>Open this school portal in <strong>Safari</strong>.</li>
                  <li>Tap the <strong>Share</strong> icon (square with arrow pointing up <span className="text-base">⎋</span>) at the bottom bar.</li>
                  <li>Scroll down and select <strong>"Add to Home Screen"</strong> (➕).</li>
                  <li>Tap <strong>"Add"</strong> in the top right corner. The school icon will appear directly on your home screen!</li>
                </ol>
              </div>

              {/* Android / Chrome */}
              <div className={`p-3.5 rounded-2xl border-2 ${!isIOS ? 'bg-blue-50/70 border-blue-300' : 'bg-slate-50 border-slate-200'}`}>
                <div className="flex items-center gap-2 font-black text-xs text-blue-950 mb-1.5">
                  <span>🤖</span>
                  <span>Android (Chrome / Brave / Samsung Internet)</span>
                  {!isIOS && <span className="px-2 py-0.5 bg-blue-600 text-white text-[9px] rounded-md font-bold uppercase">Detected</span>}
                </div>
                <ol className="text-xs text-slate-600 space-y-1.5 list-decimal list-inside font-medium leading-relaxed">
                  <li>Tap the <strong>3 dots menu (⋮)</strong> at the top right of Chrome.</li>
                  <li>Select <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong>.</li>
                  <li>Tap <strong>"Install"</strong> to download the app onto your phone like a regular Play Store app.</li>
                </ol>
              </div>

              {/* PC / Laptop */}
              <div className="p-3.5 rounded-2xl border-2 bg-slate-50 border-slate-200">
                <div className="flex items-center gap-2 font-black text-xs text-blue-950 mb-1.5">
                  <span>💻</span>
                  <span>Windows PC & Mac (Chrome / Edge)</span>
                </div>
                <p className="text-xs text-slate-600 font-medium leading-relaxed">
                  Look at the right side of your browser address bar (URL bar) and click the <strong>Install App icon (⊕ or 💻)</strong>, then confirm "Install".
                </p>
              </div>
            </div>

            {/* Notification Permission button in modal */}
            <div className="mt-6 pt-4 border-t border-slate-200 flex flex-col sm:flex-row gap-3 items-center justify-between">
              <button
                onClick={handleEnableNotifications}
                className="w-full sm:w-auto px-4 py-2.5 bg-blue-900 hover:bg-blue-800 text-yellow-400 font-black text-xs uppercase tracking-wider rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <span>🔔</span>
                <span>{notificationStatus === 'granted' ? 'Notifications Active ✓' : 'Enable School Alerts'}</span>
              </button>
              <button
                onClick={closeModal}
                className="w-full sm:w-auto px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs uppercase tracking-wider rounded-xl transition-colors"
              >
                Done / Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
