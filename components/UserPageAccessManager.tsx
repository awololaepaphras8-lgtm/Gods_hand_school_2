import React, { useState } from 'react';
import { UserPagesAccessState, UserPageKey, ALL_USER_PAGES, PageAccessItem } from '../types';

interface UserPageAccessManagerProps {
  accessState: UserPagesAccessState;
  onUpdateAccessState: (newState: UserPagesAccessState) => void;
}

export const UserPageAccessManager: React.FC<UserPageAccessManagerProps> = ({
  accessState,
  onUpdateAccessState,
}) => {
  const [globalMessage, setGlobalMessage] = useState(
    accessState.globalClosedMessage ||
      'The user portal is temporarily undergoing scheduled administrative maintenance by the School Proprietor. Please check back shortly.'
  );
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Compute stats
  const totalPages = ALL_USER_PAGES.length;
  const closedCount = ALL_USER_PAGES.filter(
    (page) => accessState.allPagesClosed || accessState.pages?.[page.id]?.isOpen === false
  ).length;
  const openCount = totalPages - closedCount;

  const handleToggleMasterLock = () => {
    const newMaster = !accessState.allPagesClosed;
    const updated: UserPagesAccessState = {
      ...accessState,
      allPagesClosed: newMaster,
      globalClosedMessage: globalMessage,
    };
    onUpdateAccessState(updated);
    flashSave();
  };

  const handleToggleSinglePage = (pageId: UserPageKey) => {
    const currentItem = accessState.pages?.[pageId];
    const currentOpen = currentItem ? currentItem.isOpen : true;
    const nextOpen = !currentOpen;

    const updatedPages = {
      ...(accessState.pages || {}),
      [pageId]: {
        isOpen: nextOpen,
        closedReason: currentItem?.closedReason || '',
        lastUpdated: new Date().toISOString(),
      },
    };

    const updated: UserPagesAccessState = {
      ...accessState,
      pages: updatedPages,
    };

    onUpdateAccessState(updated);
    flashSave();
  };

  const handleUpdatePageReason = (pageId: UserPageKey, reason: string) => {
    const currentItem = accessState.pages?.[pageId];
    const updatedPages = {
      ...(accessState.pages || {}),
      [pageId]: {
        isOpen: currentItem ? currentItem.isOpen : true,
        closedReason: reason,
        lastUpdated: new Date().toISOString(),
      },
    };

    const updated: UserPagesAccessState = {
      ...accessState,
      pages: updatedPages,
    };

    onUpdateAccessState(updated);
  };

  const handleOpenAll = () => {
    const updatedPages: { [key in UserPageKey]?: PageAccessItem } = {};
    ALL_USER_PAGES.forEach((p) => {
      updatedPages[p.id] = { isOpen: true, closedReason: '' };
    });

    const updated: UserPagesAccessState = {
      allPagesClosed: false,
      globalClosedMessage: globalMessage,
      pages: updatedPages,
    };
    onUpdateAccessState(updated);
    flashSave();
  };

  const handleCloseAll = () => {
    const updatedPages: { [key in UserPageKey]?: PageAccessItem } = {};
    ALL_USER_PAGES.forEach((p) => {
      updatedPages[p.id] = {
        isOpen: false,
        closedReason: 'This page is temporarily closed by administrative directive.',
      };
    });

    const updated: UserPagesAccessState = {
      allPagesClosed: true,
      globalClosedMessage: globalMessage,
      pages: updatedPages,
    };
    onUpdateAccessState(updated);
    flashSave();
  };

  const handleSaveGlobalMessage = () => {
    const updated: UserPagesAccessState = {
      ...accessState,
      globalClosedMessage: globalMessage,
    };
    onUpdateAccessState(updated);
    flashSave();
  };

  const flashSave = () => {
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-blue-950 via-blue-900 to-indigo-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl border-2 border-blue-800 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-yellow-400/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 bg-yellow-400 text-blue-950 font-black text-[10px] uppercase rounded-full tracking-wider">
                Proprietor Administrative Authority
              </span>
              <span className="text-blue-300 text-xs font-bold">
                God's Hand International Model School
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-serif font-black text-white">
              User Pages Access & Security Control
            </h2>
            <p className="text-blue-200 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
              Open or close individual user portal pages, or toggle a master lock to close all public user pages simultaneously (e.g. during school fee audits, result computation, or holidays).
            </p>
          </div>

          {/* Quick Counter Badges */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="bg-white/10 backdrop-blur-md px-4 py-3 rounded-2xl border border-white/10 text-center">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 block">
                Active / Open
              </span>
              <span className="text-2xl font-black text-white">{openCount}</span>
            </div>
            <div className="bg-white/10 backdrop-blur-md px-4 py-3 rounded-2xl border border-white/10 text-center">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 block">
                Closed Pages
              </span>
              <span className="text-2xl font-black text-white">{closedCount}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Notification */}
      {saveSuccess && (
        <div className="p-4 bg-emerald-100 border-2 border-emerald-400 text-emerald-900 rounded-2xl font-bold text-xs flex items-center gap-2 animate-in fade-in">
          <span>✓</span>
          <span>User page access permissions have been updated and synchronized in realtime!</span>
        </div>
      )}

      {/* SECTION 1: MASTER OVERRIDE LOCK SWITCH */}
      <div className={`p-6 sm:p-8 rounded-3xl border-3 transition-all space-y-6 ${
        accessState.allPagesClosed 
          ? 'bg-red-50/80 border-red-500 shadow-xl' 
          : 'bg-white border-slate-200 shadow-md'
      }`}>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className={`w-3.5 h-3.5 rounded-full ${accessState.allPagesClosed ? 'bg-red-600 animate-ping' : 'bg-emerald-500'}`} />
              <h3 className="text-lg sm:text-xl font-serif font-black text-blue-950">
                Master Portal Lock (Close All User Pages)
              </h3>
            </div>
            <p className="text-xs text-slate-600 max-w-2xl font-medium leading-relaxed">
              When activated, <strong>ALL</strong> student, pupil, and parent portal pages will be closed to visitors. A polite administrative notice will be displayed to all users with the reason specified below.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleToggleMasterLock}
              className={`px-6 py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider transition-all shadow-md active:scale-95 flex items-center gap-2 ${
                accessState.allPagesClosed
                  ? 'bg-emerald-700 hover:bg-emerald-600 text-white'
                  : 'bg-red-600 hover:bg-red-700 text-white'
              }`}
            >
              <span>{accessState.allPagesClosed ? '🔓 Lift Master Lock (Re-open Portal)' : '🔒 Activate Master Lock (Close All)'}</span>
            </button>
          </div>
        </div>

        {/* Global Notice Editor */}
        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
          <label className="block text-xs font-black text-blue-950 uppercase tracking-wider">
            📢 Global Portal Closure Announcement Notice:
          </label>
          <div className="flex flex-col sm:flex-row gap-3">
            <textarea
              rows={2}
              value={globalMessage}
              onChange={(e) => setGlobalMessage(e.target.value)}
              placeholder="Enter the notice students and parents will see when accessing closed pages..."
              className="flex-1 px-4 py-2.5 bg-white border-2 border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:border-blue-900 outline-none"
            />
            <button
              type="button"
              onClick={handleSaveGlobalMessage}
              className="px-5 py-2.5 bg-blue-900 hover:bg-blue-800 text-yellow-400 font-black text-xs uppercase tracking-wider rounded-xl self-start sm:self-center shadow-xs"
            >
              Update Notice
            </button>
          </div>
        </div>
      </div>

      {/* SECTION 2: INDIVIDUAL PAGE ACCESS CONTROLS */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-md border-2 border-slate-100 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-5">
          <div>
            <h3 className="text-xl font-serif font-black text-blue-950">
              Individual Page Access Settings
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Control access to specific individual user pages on the public portal
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleOpenAll}
              className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-black uppercase tracking-wider transition-all"
            >
              ✓ Open All Pages
            </button>
            <button
              type="button"
              onClick={handleCloseAll}
              className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-800 border border-red-200 rounded-xl text-xs font-black uppercase tracking-wider transition-all"
            >
              ✕ Close All Pages
            </button>
          </div>
        </div>

        {/* List of Pages */}
        <div className="grid gap-4">
          {ALL_USER_PAGES.map((page) => {
            const pageItem = accessState.pages?.[page.id];
            // If master is closed, effectively closed
            const isIndividuallyOpen = pageItem ? pageItem.isOpen : true;
            const isEffectivelyClosed = accessState.allPagesClosed || !isIndividuallyOpen;
            const customReason = pageItem?.closedReason || '';

            return (
              <div
                key={page.id}
                className={`p-5 sm:p-6 rounded-2xl border-2 transition-all space-y-3 ${
                  isEffectivelyClosed
                    ? 'bg-amber-50/50 border-amber-300'
                    : 'bg-white border-slate-200 hover:border-blue-200'
                }`}
              >
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div className="flex items-start gap-3.5">
                    <span className="text-3xl p-2 bg-slate-100 rounded-2xl">{page.icon}</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-base font-black text-blue-950">
                          {page.label}
                        </h4>
                        {/* Status Badge */}
                        {isEffectivelyClosed ? (
                          <span className="px-2.5 py-0.5 bg-red-100 text-red-800 rounded-full font-black text-[9px] uppercase tracking-wider border border-red-200">
                            🔒 CLOSED TO USERS
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 rounded-full font-black text-[9px] uppercase tracking-wider border border-emerald-200">
                            ● OPEN TO PUBLIC
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5 font-medium">
                        {page.description}
                      </p>
                    </div>
                  </div>

                  {/* Toggle Button */}
                  <div className="flex items-center gap-3 self-end sm:self-center">
                    <button
                      type="button"
                      onClick={() => handleToggleSinglePage(page.id)}
                      className={`px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow-xs active:scale-95 flex items-center gap-1.5 ${
                        isIndividuallyOpen
                          ? 'bg-amber-100 text-amber-900 hover:bg-amber-200 border border-amber-300'
                          : 'bg-emerald-600 text-white hover:bg-emerald-500'
                      }`}
                    >
                      <span>{isIndividuallyOpen ? '🔒 Close Page' : '🔓 Open Page'}</span>
                    </button>
                  </div>
                </div>

                {/* Individual Closure Reason when closed */}
                {isEffectivelyClosed && (
                  <div className="pt-2 border-t border-amber-200/60 flex flex-col sm:flex-row items-start sm:items-center gap-2 text-xs">
                    <span className="font-black text-slate-500 whitespace-nowrap text-[10px] uppercase">
                      Custom Closure Message:
                    </span>
                    <input
                      type="text"
                      placeholder="e.g. Closed for term balance audits until Monday..."
                      value={customReason}
                      onChange={(e) => handleUpdatePageReason(page.id, e.target.value)}
                      className="flex-1 px-3 py-1.5 bg-white border border-amber-300 rounded-lg text-xs font-medium text-slate-800 focus:border-blue-900 outline-none"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
