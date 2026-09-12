import React, { useState, useRef } from 'react';
import { Announcement } from '../types';

interface HeroProps {
  announcements: Announcement[];
  calendar: string;
  onApply: () => void;
  onAbout?: () => void;
  onCheckFees?: () => void;
  onParentPortal?: () => void;
  onOpenDownloadModal?: () => void;
}

export const Hero: React.FC<HeroProps> = ({
  announcements,
  calendar,
  onApply,
  onAbout,
  onParentPortal,
  onOpenDownloadModal
}) => {
  const [isVideoPlaying, setIsVideoPlaying] = useState<boolean>(true);
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const [isHighClearMode, setIsHighClearMode] = useState<boolean>(false);
  const [isAerialModalOpen, setIsAerialModalOpen] = useState<boolean>(false);
  const [isGateModalOpen, setIsGateModalOpen] = useState<boolean>(false);

  const bgVideoRef = useRef<HTMLVideoElement>(null);

  const toggleVideoPlayback = () => {
    const newState = !isVideoPlaying;
    setIsVideoPlaying(newState);
    if (bgVideoRef.current) {
      if (newState) bgVideoRef.current.play().catch(() => {});
      else bgVideoRef.current.pause();
    }
  };

  const toggleMute = () => {
    const newMute = !isMuted;
    setIsMuted(newMute);
    if (bgVideoRef.current) bgVideoRef.current.muted = newMute;
  };

  return (
    <div className="relative min-h-screen bg-slate-950 pb-16 lg:pb-24 text-white">
      {/* FIXED BACKGROUND AERIAL VIEW VIDEO COVERING THE ENTIRE HOME PAGE */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none select-none">
        <video
          ref={bgVideoRef}
          autoPlay
          loop
          muted={isMuted}
          playsInline
          poster="/drone_poster.jpg"
          className={`w-full h-full object-cover transition-all duration-700 ${
            isHighClearMode 
              ? 'opacity-95 brightness-100 contrast-105' 
              : 'opacity-80 brightness-95 contrast-110'
          }`}
        >
          <source src="/drone_campus.mp4" type="video/mp4" />
          <source src="https://upload.wikimedia.org/wikipedia/commons/2/26/Jornada_de_vuelo_drone_en_campus_UNI_OSM%2BGRD_4.webm" type="video/webm" />
        </video>

        {/* Semi-transparent tint overlay so aerial campus flyover is vividly seen while text is clear */}
        <div 
          className={`absolute inset-0 transition-opacity duration-700 ${
            isHighClearMode 
              ? 'bg-gradient-to-b from-blue-950/60 via-blue-950/40 to-slate-950/65' 
              : 'bg-gradient-to-b from-blue-950/75 via-blue-950/50 to-slate-950/80'
          }`} 
        />
        <div className="absolute inset-0 bg-radial-gradient from-transparent via-blue-950/30 to-slate-950/80" />
      </div>


      
      {/* MAIN HERO CONTENT */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-16 grid lg:grid-cols-12 gap-10 lg:gap-12 items-center">
        
        {/* Left Column: Heading, Call to Action, Calendar */}
        <div className="lg:col-span-7">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-yellow-400 text-blue-950 rounded-full text-xs font-black uppercase tracking-widest mb-6 shadow-xl border border-yellow-300">
            <span>✨</span>
            <span>Now Enrolling for 2025/2026 Academic Session</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-7xl font-serif font-black text-white mb-6 leading-[1.1] tracking-tight drop-shadow-lg">
            Building Lives <br />
            <span className="text-yellow-400 underline decoration-yellow-500/50 underline-offset-8">
              Upon The Rock
            </span>
          </h1>

          <p className="text-base sm:text-lg lg:text-xl text-blue-100 mb-8 max-w-xl leading-relaxed font-medium drop-shadow-md">
            At <strong className="text-white font-black">God's Hand International Model School</strong>, we nurture every pupil and student to{' '}
            <span className="text-yellow-300 font-bold underline decoration-yellow-400/40">Have Faith In God</span> while attaining world-class academic, moral, and technological excellence in Ibadan.
          </p>

          {/* Action Buttons Row */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 mb-6">
            <button 
              onClick={onApply}
              className="px-7 py-4 bg-yellow-400 text-blue-950 font-black text-base rounded-2xl shadow-2xl shadow-yellow-500/30 hover:bg-yellow-300 transition-all transform hover:-translate-y-0.5 active:scale-95 text-center flex items-center justify-center gap-2"
            >
              <span>🎓</span>
              <span>Get Admission Form</span>
            </button>

            {onParentPortal && (
              <button 
                onClick={onParentPortal}
                className="px-7 py-4 bg-blue-950/90 text-yellow-300 hover:text-yellow-200 border-2 border-yellow-400/80 font-black text-base rounded-2xl shadow-xl hover:bg-blue-900 transition-all transform hover:-translate-y-0.5 active:scale-95 text-center flex items-center justify-center gap-2 backdrop-blur-md"
              >
                <span>👨‍👩‍👧‍👦</span>
                <span>Parent Portal & Attendance</span>
              </button>
            )}

            {onOpenDownloadModal && (
              <button 
                onClick={onOpenDownloadModal}
                className="px-5 py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm uppercase tracking-wider rounded-2xl shadow-xl transition-all transform hover:-translate-y-0.5 active:scale-95 text-center flex items-center justify-center gap-2 border border-emerald-400"
                title="Download God's Hand School App to your device"
              >
                <span>📲</span>
                <span>Download App</span>
              </button>
            )}
          </div>

          {/* About School Shortcut & Physical Campus View */}
          <div className="mb-8 flex flex-wrap items-center gap-3">
            {onAbout && (
              <button 
                onClick={onAbout}
                className="text-xs sm:text-sm font-black uppercase text-yellow-300 hover:text-white tracking-wider flex items-center gap-1.5 transition-colors bg-blue-950/70 hover:bg-blue-900/80 px-3.5 py-2 rounded-xl border border-yellow-400/40 backdrop-blur-md shadow-md"
              >
                <span>🏛️ About Our School, Campus & Results</span>
                <span>→</span>
              </button>
            )}

            <button
              onClick={() => setIsGateModalOpen(true)}
              className="text-xs sm:text-sm font-black uppercase text-blue-100 hover:text-white tracking-wider flex items-center gap-1.5 transition-colors bg-blue-900/70 hover:bg-blue-800/90 px-3.5 py-2 rounded-xl border border-blue-600 backdrop-blur-md shadow-md"
            >
              <span>🏫 View Physical Campus Gate</span>
              <span>🔍</span>
            </button>
          </div>

          {/* Academic Calendar Card */}
          <div className="p-5 bg-blue-950/85 border-2 border-yellow-400/80 rounded-2xl max-w-lg backdrop-blur-xl shadow-2xl">
            <div className="flex items-center justify-between mb-2 border-b border-blue-800 pb-1.5">
              <h4 className="text-yellow-400 font-black text-xs uppercase tracking-widest flex items-center gap-1.5">
                <span>📅</span>
                <span>Academic Calendar Highlights</span>
              </h4>
              <span className="text-[10px] bg-yellow-400/20 text-yellow-300 font-bold px-2 py-0.5 rounded-md uppercase">
                Term Schedule
              </span>
            </div>
            <div className="text-xs text-blue-100 font-semibold whitespace-pre-wrap leading-relaxed italic">
              {calendar}
            </div>
          </div>
        </div>

        {/* Right Column: Physical School Entrance & Gate Showcase */}
        <div className="lg:col-span-5 relative">
          <div className="relative bg-gradient-to-b from-blue-900/95 to-blue-950/95 p-3 rounded-[2.2rem] shadow-2xl border-4 border-yellow-400 backdrop-blur-xl">
            
            {/* Header Title Bar */}
            <div className="flex items-center justify-between px-3 py-2 bg-blue-950/90 rounded-2xl mb-3 border border-blue-800">
              <div className="flex items-center gap-2">
                <span className="text-base">🏫</span>
                <span className="text-xs font-black uppercase tracking-wider text-yellow-400">
                  School Entrance & Main Gate
                </span>
              </div>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded-md uppercase border border-emerald-500/40">
                Active Campus
              </span>
            </div>

            {/* Entrance & Gate Photo Display Window */}
            <div 
              onClick={() => setIsGateModalOpen(true)}
              className="relative rounded-[1.8rem] overflow-hidden aspect-4/3 sm:aspect-4/3 bg-slate-900 border-2 border-white/20 shadow-inner group cursor-pointer"
              title="Click to view high-resolution photo of school gate"
            >
              <img 
                src="/school_premises.jpg" 
                alt="God's Hand International Model School Physical Entrance and Gate - Wire & Cable, Apata, Ibadan" 
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              />

              {/* School Crest Badge (Floating) - with logo taking 80% of its containing box */}
              <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-md px-2.5 py-1.5 rounded-2xl shadow-xl border-2 border-yellow-400 flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center border border-blue-900/20 shadow-xs shrink-0 overflow-hidden">
                  <img 
                    src="/logo.png" 
                    alt="God's Hand School Official Crest" 
                    referrerPolicy="no-referrer"
                    className="w-[80%] h-[80%] object-contain" 
                  />
                </div>
                <div className="text-left">
                  <p className="text-[10px] font-black uppercase text-blue-950 tracking-wider font-serif leading-tight">God's Hand</p>
                  <p className="text-[8px] font-black uppercase text-yellow-600 tracking-widest leading-tight">Faith In God</p>
                </div>
              </div>

              {/* Zoom pill badge */}
              <div className="absolute top-3 right-3 bg-blue-950/80 hover:bg-yellow-400 hover:text-blue-950 text-white px-2.5 py-1 rounded-xl text-[10px] font-bold tracking-wider backdrop-blur-md border border-white/30 transition-all flex items-center gap-1 shadow-md">
                <span>🔍</span>
                <span>Zoom</span>
              </div>

              {/* Bottom Caption Overlay */}
              <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-blue-950/95 via-blue-950/70 to-transparent p-4 text-left">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-black uppercase text-yellow-400 tracking-wide font-serif">
                      God's Hand Int. Model School
                    </p>
                    <p className="text-[11px] text-blue-100 font-medium">
                      Wire & Cable, Apata, Ibadan, Oyo State
                    </p>
                  </div>
                  <span className="text-[9px] bg-yellow-400 text-blue-950 font-black px-2 py-0.5 rounded-md uppercase shrink-0">
                    Main Gate
                  </span>
                </div>
              </div>
            </div>

            {/* Bottom Info Bar */}
            <div className="mt-2.5 px-3 py-2 bg-blue-950/90 rounded-xl border border-blue-800 text-center flex items-center justify-between text-xs">
              <span className="text-blue-200 font-bold text-[11px] flex items-center gap-1.5">
                <span>📍</span>
                <span>Wire and Cable, Apata, Ibadan</span>
              </span>
              <button
                onClick={() => setIsGateModalOpen(true)}
                className="text-[10px] font-black uppercase text-yellow-400 hover:text-yellow-300 underline flex items-center gap-1"
              >
                <span>Enlarge Gate View</span>
                <span>↗</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* FULLSCREEN AERIAL TOUR MODAL */}
      {isAerialModalOpen && (
        <div 
          onClick={() => setIsAerialModalOpen(false)}
          className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center p-2 sm:p-6 animate-fade-in"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-5xl bg-slate-900 rounded-3xl overflow-hidden border-4 border-yellow-400 shadow-2xl"
          >
            {/* Modal Header */}
            <div className="p-4 bg-blue-950 text-white flex items-center justify-between border-b border-blue-800">
              <div className="flex items-center gap-2">
                <span className="text-xl">🚁</span>
                <div>
                  <h3 className="text-sm sm:text-base font-black uppercase tracking-wider text-yellow-400">
                    Campus Aerial Drone Tour
                  </h3>
                  <p className="text-[10px] text-blue-200">
                    God's Hand International Model School & Surrounding Neighborhood • Wire & Cable, Apata, Ibadan
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAerialModalOpen(false)}
                className="w-9 h-9 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center font-bold text-lg transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Fullscreen Video Player */}
            <div className="relative aspect-video bg-black">
              <video
                autoPlay
                loop
                controls
                playsInline
                poster="/drone_poster.jpg"
                className="w-full h-full object-contain"
              >
                <source src="/drone_campus.mp4" type="video/mp4" />
                <source src="https://upload.wikimedia.org/wikipedia/commons/2/26/Jornada_de_vuelo_drone_en_campus_UNI_OSM%2BGRD_4.webm" type="video/webm" />
              </video>
            </div>

            {/* Modal Footer Info */}
            <div className="p-4 bg-blue-950/90 text-xs text-blue-100 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-blue-800">
              <div className="flex items-center gap-3">
                <span className="px-2 py-1 bg-yellow-400 text-blue-950 font-black rounded-md uppercase text-[10px]">
                  Campus Flyover
                </span>
                <span>Location: Wire and Cable, Apata, Ibadan, Oyo State</span>
              </div>
              <div className="flex items-center gap-2">
                {onOpenDownloadModal && (
                  <button
                    onClick={() => {
                      setIsAerialModalOpen(false);
                      onOpenDownloadModal();
                    }}
                    className="px-3 py-1.5 bg-yellow-400 text-blue-950 font-black rounded-lg uppercase text-[10px] hover:bg-yellow-300 transition-colors"
                  >
                    📲 Download App
                  </button>
                )}
                <button
                  onClick={() => setIsAerialModalOpen(false)}
                  className="px-4 py-1.5 bg-blue-800 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FULL-SIZE ENTRANCE & GATE LIGHTBOX MODAL */}
      {isGateModalOpen && (
        <div 
          onClick={() => setIsGateModalOpen(false)}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex flex-col items-center justify-center p-3 sm:p-6 animate-fade-in"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-4xl bg-slate-900 rounded-3xl overflow-hidden border-4 border-yellow-400 shadow-2xl"
          >
            {/* Modal Header */}
            <div className="p-4 bg-blue-950 text-white flex items-center justify-between border-b border-blue-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center border border-yellow-400 shrink-0 overflow-hidden">
                  <img 
                    src="/logo.png" 
                    alt="God's Hand Logo" 
                    className="w-[80%] h-[80%] object-contain"
                  />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black uppercase tracking-wider text-yellow-400">
                    Physical School Entrance & Main Gate
                  </h3>
                  <p className="text-[11px] text-blue-200">
                    God's Hand International Model School • Wire & Cable, Apata, Ibadan, Oyo State
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsGateModalOpen(false)}
                className="w-9 h-9 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center font-bold text-lg transition-colors"
                title="Close"
              >
                ✕
              </button>
            </div>

            {/* High-Resolution Gate Photo */}
            <div className="relative bg-black flex items-center justify-center max-h-[70vh] overflow-hidden">
              <img 
                src="/school_premises.jpg" 
                alt="God's Hand International Model School Entrance & Gate" 
                className="w-full h-auto max-h-[70vh] object-contain"
              />
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-blue-950/95 text-xs text-blue-100 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-blue-800">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 bg-yellow-400 text-blue-950 font-black rounded-md uppercase text-[10px]">
                  Campus Gate
                </span>
                <span>Welcoming Nursery, Primary & College Students Every Academic Session</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setIsGateModalOpen(false);
                    onApply();
                  }}
                  className="px-3.5 py-1.5 bg-yellow-400 text-blue-950 font-black rounded-lg uppercase text-[10px] hover:bg-yellow-300 transition-colors"
                >
                  🎓 Apply For Admission
                </button>
                <button
                  onClick={() => setIsGateModalOpen(false)}
                  className="px-4 py-1.5 bg-blue-800 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* OFFICIAL SCHOOL BULLETINS & ANNOUNCEMENTS SECTION */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        <div className="bg-blue-950/85 backdrop-blur-xl text-white rounded-3xl shadow-2xl p-6 sm:p-10 border-4 border-yellow-400 relative overflow-hidden">
          <div className="flex items-center mb-8 relative z-10">
            <div className="p-3 bg-yellow-400 text-blue-950 rounded-2xl mr-4 shadow-lg border border-yellow-300">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </div>
            <div>
              <h2 className="text-2xl sm:text-3xl font-black text-yellow-400 uppercase tracking-tight font-serif">
                Official School Bulletins
              </h2>
              <div className="h-1.5 w-24 bg-yellow-400 rounded-full mt-1"></div>
            </div>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10">
            {announcements.map(ann => (
              <div key={ann.id} className="p-6 bg-slate-900/70 backdrop-blur-md rounded-2xl border-2 border-yellow-400/30 hover:border-yellow-400 hover:bg-blue-900/60 transition-all group shadow-md flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <span className="px-3 py-1 bg-yellow-400 text-blue-950 text-[10px] font-black rounded-full uppercase tracking-wider">
                      {ann.date}
                    </span>
                  </div>
                  <h3 className="font-black text-lg text-white mb-2 group-hover:text-yellow-300 transition-colors font-serif">
                    {ann.title}
                  </h3>
                  <p className="text-blue-100 text-xs sm:text-sm leading-relaxed line-clamp-4">
                    {ann.content}
                  </p>
                </div>
                <button 
                  onClick={onAbout}
                  className="mt-5 text-yellow-400 hover:text-yellow-300 font-black text-xs uppercase flex items-center hover:translate-x-1.5 transition-transform"
                >
                  Learn More <span className="ml-1.5 font-bold">→</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
