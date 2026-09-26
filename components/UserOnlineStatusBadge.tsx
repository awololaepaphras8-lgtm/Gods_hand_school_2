import React from 'react';

interface UserOnlineStatusBadgeProps {
  isOnline: boolean;
  name?: string;
  className?: string;
  showName?: boolean;
}

/**
 * Displays user name along with online presence indicator:
 * Online: two hands shaking each other (🤝) + green dot (🟢)
 * Offline: broken handshake (🫲⚡🫱) + offline dot (⚪)
 */
export const UserOnlineStatusBadge: React.FC<UserOnlineStatusBadgeProps> = ({
  isOnline,
  name,
  className = '',
  showName = true,
}) => {
  return (
    <span className={`inline-flex items-center gap-1.5 align-middle ${className}`}>
      {showName && name && (
        <span className="font-bold">{name}</span>
      )}
      
      {isOnline ? (
        <span 
          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold shadow-2xs select-none"
          title="Online - Connected & Active"
        >
          <span className="text-sm leading-none" role="img" aria-label="Handshake">🤝</span>
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
        </span>
      ) : (
        <span 
          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-500 text-xs font-medium shadow-2xs select-none"
          title="Offline - Broken Connection"
        >
          {/* Visual representation of broken handshake */}
          <span className="inline-flex items-center tracking-tighter text-[11px] leading-none" role="img" aria-label="Broken Handshake">
            <span className="inline-block transform -scale-x-100">🫲</span>
            <span className="text-red-500 text-[9px] font-black mx-[-1px]">⚡</span>
            <span>🫱</span>
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
        </span>
      )}
    </span>
  );
};
