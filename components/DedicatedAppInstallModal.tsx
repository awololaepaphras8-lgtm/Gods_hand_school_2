import React, { useState, useEffect } from 'react';

interface DedicatedAppInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  role: 'admin' | 'staff';
}

export const DedicatedAppInstallModal: React.FC<DedicatedAppInstallModalProps> = ({
  isOpen,
  onClose,
  role
}) => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);
  const [isIos, setIsIos] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const ua = window.navigator.userAgent.toLowerCase();
    setIsIos(/iphone|ipad|ipod/.test(ua));

    const checkInstalled = 
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true ||
      localStorage.getItem('ghs_app_installed') === 'true';
    setIsInstalled(checkInstalled);

    const handleBeforeInstall = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  if (!isOpen) return null;

  const isAdmin = role === 'admin';
  const roleTitle = isAdmin ? 'Proprietor Admin App' : 'Staff Faculty App';
  const targetName = isAdmin ? 'Admin Management Panel' : 'Staff & Teacher Desk';

  const handleActivateAndInstall = async () => {
    // 1. Mark dedicated app mode in local storage
    localStorage.setItem('ghs_dedicated_app_role', role);
    localStorage.setItem('ghs_pwa_target_entry', role);

    // 2. Trigger install prompt if available
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice?.outcome === 'accepted') {
          setIsInstalled(true);
          localStorage.setItem('ghs_app_installed', 'true');
          setStatusMessage(`🎉 ${roleTitle} installed! Next time you open it, you will go straight to the ${targetName}.`);
          setTimeout(() => {
            onClose();
          }, 3500);
          return;
        }
      } catch (err) {
        console.error('PWA install error:', err);
      }
    }

    // 3. Fallback confirmation message
    setStatusMessage(`✓ Dedicated ${roleTitle} mode configured! When launched from home screen or browser shortcut, it will open directly to ${targetName}.`);
    setTimeout(() => {
      setStatusMessage(null);
    }, 4500);
  };

  const handleDownloadLauncher = () => {
    // Store preference first
    localStorage.setItem('ghs_dedicated_app_role', role);
    localStorage.setItem('ghs_pwa_target_entry', role);

    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://godshandschool.sch.ng';
    const appName = isAdmin ? "God's Hand Admin App" : "God's Hand Staff App";
    const filename = isAdmin ? "GodsHand_Admin_Portal.html" : "GodsHand_Staff_Portal.html";

    const launcherHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${appName}</title>
  <style>
    body {
      margin: 0;
      background: #0f172a;
      color: #f8fafc;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      text-align: center;
      padding: 20px;
    }
    .card {
      background: #1e293b;
      border: 2px solid #eab308;
      border-radius: 24px;
      padding: 32px;
      max-width: 420px;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
    }
    .logo { font-size: 48px; margin-bottom: 12px; }
    h1 { font-size: 20px; margin: 0 0 8px 0; color: #fef08a; }
    p { font-size: 13px; color: #94a3b8; line-height: 1.5; margin: 0 0 24px 0; }
    .btn {
      display: inline-block;
      background: #eab308;
      color: #0f172a;
      text-decoration: none;
      font-weight: 900;
      font-size: 13px;
      text-transform: uppercase;
      padding: 14px 24px;
      border-radius: 12px;
      letter-spacing: 0.05em;
    }
  </style>
  <script>
    try {
      localStorage.setItem('ghs_dedicated_app_role', '${role}');
      localStorage.setItem('ghs_pwa_target_entry', '${role}');
    } catch(e) {}
    window.location.replace('${origin}/?app_entry=${role}');
  </script>
</head>
<body>
  <div class="card">
    <div class="logo">${isAdmin ? '👑' : '👔'}</div>
    <h1>${appName}</h1>
    <p>Opening direct gateway to ${targetName}...</p>
    <a href="${origin}/?app_entry=${role}" class="btn">Launch Gateway Now</a>
  </div>
</body>
</html>`;

    const blob = new Blob([launcherHtml], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setStatusMessage(`✓ ${filename} downloaded! You can place this file on your desktop or phone home screen for instant 1-click access.`);
    setTimeout(() => {
      setStatusMessage(null);
    }, 5000);
  };

  const handleResetToStandard = () => {
    localStorage.removeItem('ghs_dedicated_app_role');
    localStorage.removeItem('ghs_pwa_target_entry');
    setStatusMessage("Standard school portal entry restored. The app will open to the school homepage next time.");
    setTimeout(() => {
      setStatusMessage(null);
    }, 4000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border-4 border-yellow-400 rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden text-slate-900 dark:text-white">
        
        {/* Header */}
        <div className="bg-blue-900 text-white p-5 sm:p-6 flex items-center justify-between border-b-2 border-yellow-400">
          <div className="flex items-center gap-3">
            <span className="w-12 h-12 rounded-2xl bg-yellow-400 text-blue-950 flex items-center justify-center text-2xl font-black shrink-0 shadow-md">
              {isAdmin ? '👑' : '👔'}
            </span>
            <div>
              <h3 className="font-serif font-black text-lg sm:text-xl leading-tight">
                Download {roleTitle}
              </h3>
              <p className="text-xs text-yellow-300 font-bold">
                Direct Gateway to {targetName}
              </p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose}
            className="text-white hover:text-yellow-400 text-2xl font-black p-1 transition"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          
          {/* Notification banner */}
          {statusMessage && (
            <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/50 border-2 border-emerald-400 rounded-2xl text-xs font-bold text-emerald-900 dark:text-emerald-200 animate-in fade-in">
              {statusMessage}
            </div>
          )}

          {/* Description */}
          <div className="bg-blue-50 dark:bg-slate-800 p-4 rounded-2xl border border-blue-200 dark:border-slate-700 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
            <strong className="text-blue-950 dark:text-yellow-300 font-black block mb-1">
              ⚡ How Direct App Access Works:
            </strong>
            Downloading this app configures your device so that next time you launch it, you will go 
            <strong className="text-blue-900 dark:text-white"> straight to the {targetName} </strong> 
            without ever seeing or going through the school public homepage.
          </div>

          {/* Action 1: 1-Click Install PWA */}
          <button
            type="button"
            onClick={handleActivateAndInstall}
            className="w-full py-3.5 px-4 bg-yellow-400 hover:bg-yellow-300 text-blue-950 rounded-2xl font-black text-xs sm:text-sm uppercase tracking-wider shadow-lg flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer border-2 border-yellow-500"
          >
            <span>📲</span>
            <span>Install {roleTitle} on this Device</span>
          </button>

          {/* Action 2: Download Direct Web App Launcher (.html) */}
          <button
            type="button"
            onClick={handleDownloadLauncher}
            className="w-full py-3 px-4 bg-blue-900 hover:bg-blue-800 text-yellow-300 rounded-2xl font-black text-xs sm:text-sm uppercase tracking-wider shadow-md flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer border border-blue-800"
          >
            <span>📥</span>
            <span>Download Direct Web Launcher File (.html)</span>
          </button>

          {/* Installation Instructions Guide */}
          <div className="border border-slate-200 dark:border-slate-700 rounded-2xl p-4 bg-slate-50 dark:bg-slate-800/60 space-y-2 text-xs">
            <span className="font-black uppercase tracking-wider text-[11px] text-slate-500 dark:text-slate-400 block">
              Platform Instructions:
            </span>
            {isIos ? (
              <ol className="list-decimal pl-4 space-y-1 text-slate-600 dark:text-slate-300">
                <li>Tap the <strong>Share button (square with arrow)</strong> at the bottom of Safari.</li>
                <li>Scroll down and tap <strong>"Add to Home Screen"</strong>.</li>
                <li>Tap <strong>"Add"</strong> in the top right. The app icon will appear on your iPhone/iPad!</li>
              </ol>
            ) : (
              <ol className="list-decimal pl-4 space-y-1 text-slate-600 dark:text-slate-300">
                <li>Click <strong>"Install {roleTitle}"</strong> above, or look at your browser URL bar for the <strong>Install (⊕ or 💻)</strong> icon.</li>
                <li>On Android, tap <strong>"Install"</strong> or select <strong>"Add to Home screen"</strong> from the three-dots menu.</li>
                <li>On PC/Mac (Chrome/Edge), confirm <strong>"Install"</strong> to place a shortcut on your desktop and taskbar.</li>
              </ol>
            )}
          </div>

          {/* Reset setting option */}
          <div className="pt-2 text-center">
            <button
              type="button"
              onClick={handleResetToStandard}
              className="text-[11px] font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 underline cursor-pointer"
            >
              Reset to open school homepage next time
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-100 dark:bg-slate-800/80 px-6 py-3 flex justify-end border-t border-slate-200 dark:border-slate-700">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-300 hover:bg-slate-400 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-black uppercase tracking-wider transition"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
