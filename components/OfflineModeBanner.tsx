import React, { useState, useEffect } from 'react';
import { offlineAcademicService, OfflineAcademicBundle } from '../services/offlineAcademicService';

interface OfflineModeBannerProps {
  currentStudentId?: string;
}

export const OfflineModeBanner: React.FC<OfflineModeBannerProps> = ({ currentStudentId }) => {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [showInspector, setShowInspector] = useState(false);
  const [cachedBundle, setCachedBundle] = useState<OfflineAcademicBundle | null>(null);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => {
      setIsOffline(true);
      const bundle = offlineAcademicService.getOfflineCache(currentStudentId);
      setCachedBundle(bundle);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check
    if (!navigator.onLine) {
      setCachedBundle(offlineAcademicService.getOfflineCache(currentStudentId));
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [currentStudentId]);

  if (!isOffline && !showInspector) return null;

  return (
    <>
      {/* Offline Alert Bar */}
      {isOffline && (
        <div className="bg-gradient-to-r from-amber-600 via-amber-700 to-amber-800 text-white px-4 py-2.5 shadow-md flex items-center justify-between z-50 text-xs font-bold animate-in slide-in-from-top duration-300">
          <div className="flex items-center gap-2 max-w-4xl mx-auto flex-1">
            <span className="text-base animate-pulse">📡</span>
            <div>
              <span className="font-black uppercase tracking-wider text-yellow-300">
                Offline Mode Active — 
              </span>
              <span className="ml-1 text-amber-100">
                You are viewing cached academic records, scores, and class timetables. No internet connection is required.
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              const b = offlineAcademicService.getOfflineCache(currentStudentId);
              setCachedBundle(b);
              setShowInspector(true);
            }}
            className="px-3 py-1 bg-yellow-400 hover:bg-yellow-300 text-blue-950 font-black text-[10px] uppercase rounded-lg shadow-xs transition-all shrink-0 ml-3"
          >
            Inspect Cache
          </button>
        </div>
      )}

      {/* Offline Cache Inspector Modal */}
      {showInspector && (
        <div className="fixed inset-0 z-[120] bg-blue-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border-4 border-yellow-400 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl">💾</span>
                <div>
                  <h3 className="text-lg font-serif font-black text-blue-950">Offline Academic Cache</h3>
                  <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Service Worker & Local Storage</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowInspector(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-black flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                <div className="flex items-center gap-2 text-emerald-800 font-black uppercase text-[10px] mb-1">
                  <span>✓</span>
                  <span>Offline Ready & Service Worker Active</span>
                </div>
                <p className="text-emerald-700 text-[11px] font-medium leading-relaxed">
                  Academic results, terminal reports, and class timetables are synchronized for zero-network operation.
                </p>
              </div>

              {cachedBundle ? (
                <div className="space-y-2 bg-slate-50 p-4 rounded-xl border border-slate-200 text-slate-700">
                  <div className="flex justify-between py-1 border-b border-slate-200">
                    <span className="font-bold text-slate-500">Student Profile:</span>
                    <strong className="text-blue-950">{cachedBundle.studentName} ({cachedBundle.grade})</strong>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200">
                    <span className="font-bold text-slate-500">Cached Scores:</span>
                    <strong className="text-blue-950">{cachedBundle.results.length} Subjects</strong>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200">
                    <span className="font-bold text-slate-500">Cached Timetables:</span>
                    <strong className="text-blue-950">{cachedBundle.timetables.length} Timetables</strong>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="font-bold text-slate-500">Last Synced:</span>
                    <strong className="text-blue-950">{new Date(cachedBundle.cachedAt).toLocaleString()}</strong>
                  </div>
                </div>
              ) : (
                <p className="p-4 bg-slate-50 rounded-xl text-center text-slate-500">
                  No previous cache found for this session yet. As you browse, records will automatically be saved.
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowInspector(false)}
              className="w-full py-3 bg-blue-900 text-yellow-400 font-black text-xs uppercase tracking-wider rounded-xl shadow-md hover:bg-blue-800 transition-all"
            >
              Continue Browsing Offline
            </button>
          </div>
        </div>
      )}
    </>
  );
};
