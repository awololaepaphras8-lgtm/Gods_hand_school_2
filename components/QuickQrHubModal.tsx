import React, { useState, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { StudentAccount, ParentAccount, UserRole } from '../types';
import { downloadQrCodeImage } from '../utils/exportService';

interface QuickQrHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserRole?: UserRole;
  currentStudent?: StudentAccount | null;
  currentParent?: ParentAccount | null;
  allStudents?: StudentAccount[];
  initialTab?: 'portal' | 'fees' | 'results' | 'gate' | 'install';
  onNavigate?: (view: any) => void;
}

export const QuickQrHubModal: React.FC<QuickQrHubModalProps> = ({
  isOpen,
  onClose,
  currentUserRole = UserRole.GUEST,
  currentStudent = null,
  currentParent = null,
  allStudents = [],
  initialTab = 'portal',
  onNavigate
}) => {
  const [activeTab, setActiveTab] = useState<'portal' | 'fees' | 'results' | 'gate' | 'install'>(initialTab);
  const [selectedChildId, setSelectedChildId] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const qrRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://www.godshandmodelschool.com';

  // Parent linked children
  const linkedChildren: StudentAccount[] = currentParent
    ? allStudents.filter(s =>
        (currentParent.childrenStudentIds || []).includes(s.id) ||
        s.parentId === currentParent.id ||
        (s.parentEmail && currentParent.email && s.parentEmail.toLowerCase() === currentParent.email.toLowerCase())
      )
    : [];

  const activeChild = selectedChildId
    ? linkedChildren.find(c => c.id === selectedChildId) || linkedChildren[0] || null
    : linkedChildren[0] || null;

  // Compute QR payloads
  let qrTitle = '';
  let qrSubtitle = '';
  let qrUrl = '';
  let qrIcon = '📱';
  let qrColor = 'text-blue-950';

  if (activeTab === 'portal') {
    qrTitle = 'Student & Parent Portal QR Pass';
    qrSubtitle = 'Scan with any smartphone camera to launch the official Student or Parent Portal';
    qrUrl = `${origin}/?view=portal`;
    qrIcon = '🎓';
    qrColor = 'text-blue-900';
  } else if (activeTab === 'fees') {
    qrTitle = 'School Fees & Payment QR Code';
    qrSubtitle = 'Scan to view official fee schedules, check balances, or make tuition payment';
    qrUrl = `${origin}/?view=feeChecker`;
    qrIcon = '💳';
    qrColor = 'text-emerald-900';
  } else if (activeTab === 'results') {
    qrTitle = 'Terminal Result Checker QR Pass';
    qrSubtitle = 'Scan to verify Continuous Assessment (CA) scores and official terminal report cards';
    qrUrl = `${origin}/?view=resultChecker`;
    qrIcon = '📜';
    qrColor = 'text-amber-900';
  } else if (activeTab === 'gate') {
    const studentToUse = currentStudent || activeChild;
    if (studentToUse) {
      const activeTerm = studentToUse.activeTerm || 'First Term';
      const termInfo = studentToUse.qrGenerations?.[activeTerm];
      qrTitle = `${studentToUse.name} - Gate Attendance QR Pass`;
      qrSubtitle = `Official daily gate scanning pass for ${studentToUse.grade} (${activeTerm})`;
      qrUrl = termInfo?.qrCodeValue || `GHS-ATT|${studentToUse.id}|${activeTerm}|verified`;
      qrIcon = '🆔';
      qrColor = 'text-indigo-950';
    } else {
      qrTitle = 'School Gate Scanner & Attendance QR';
      qrSubtitle = 'Official QR pass for student daily campus arrival and gate entry scanner';
      qrUrl = `${origin}/?view=attendanceScanning`;
      qrIcon = '📷';
      qrColor = 'text-blue-950';
    }
  } else if (activeTab === 'install') {
    qrTitle = 'Install God\'s Hand Mobile App';
    qrSubtitle = 'Scan on your phone to open and install the real standalone app on your Home Screen';
    qrUrl = `${origin}/?pwa_install=true`;
    qrIcon = '📲';
    qrColor = 'text-blue-900';
  }

  const handleCopyLink = () => {
    navigator.clipboard.writeText(qrUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownload = () => {
    const filename = `GodsHand_${activeTab.toUpperCase()}_QRCode`;
    downloadQrCodeImage(
      'ghs-modal-qr-svg',
      filename,
      {
        format: 'png',
        studentName: currentStudent?.name || activeChild?.name || "God's Hand School",
        term: activeTab.toUpperCase(),
        grade: currentStudent?.grade || activeChild?.grade || "All Grades",
        studentId: currentStudent?.id || activeChild?.id || "GHS-OFFICIAL"
      }
    );
  };

  const handleShareWhatsApp = () => {
    const message = encodeURIComponent(
      `🏛️ *God's Hand International Model School*\n` +
      `📌 *${qrTitle}*\n` +
      `${qrSubtitle}\n\n` +
      `🔗 Quick Link: ${qrUrl}`
    );
    window.open(`https://wa.me/?text=${message}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4 bg-blue-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-[2.5rem] max-w-lg w-full max-h-[92vh] overflow-y-auto shadow-2xl border-4 border-yellow-400 relative p-6 sm:p-8 space-y-6"
        role="dialog"
        aria-modal="true"
        aria-labelledby="quick-qr-title"
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-lg flex items-center justify-center transition-all hover:scale-110 active:scale-95 z-10"
          aria-label="Close modal"
        >
          ✕
        </button>

        {/* Modal Header */}
        <div className="text-center space-y-1.5 pr-8">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-900 text-yellow-400 rounded-full text-[10px] font-black uppercase tracking-wider">
            <span>Official Instant QR Hub</span>
          </div>
          <h3 id="quick-qr-title" className="font-serif font-black text-2xl text-blue-950">
            Quick Scan & Mobile Access Passes
          </h3>
          <p className="text-xs text-slate-500 font-medium">
            Scan with any phone camera or share instant access passes for Portals, Fees, and Results.
          </p>
        </div>

        {/* Quick Tabs */}
        <div className="bg-slate-100 p-1.5 rounded-2xl flex flex-wrap gap-1 border border-slate-200 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('portal')}
            className={`flex-1 min-w-[70px] py-2 px-2.5 rounded-xl font-black text-[11px] uppercase tracking-wider transition-all flex flex-col items-center gap-1 ${
              activeTab === 'portal'
                ? 'bg-blue-900 text-yellow-400 shadow-md'
                : 'text-slate-600 hover:text-blue-950 hover:bg-white/60'
            }`}
          >
            <span className="text-base">🎓</span>
            <span>Portal</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('fees')}
            className={`flex-1 min-w-[70px] py-2 px-2.5 rounded-xl font-black text-[11px] uppercase tracking-wider transition-all flex flex-col items-center gap-1 ${
              activeTab === 'fees'
                ? 'bg-emerald-700 text-white shadow-md'
                : 'text-slate-600 hover:text-blue-950 hover:bg-white/60'
            }`}
          >
            <span className="text-base">💳</span>
            <span>Fees</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('results')}
            className={`flex-1 min-w-[70px] py-2 px-2.5 rounded-xl font-black text-[11px] uppercase tracking-wider transition-all flex flex-col items-center gap-1 ${
              activeTab === 'results'
                ? 'bg-amber-600 text-white shadow-md'
                : 'text-slate-600 hover:text-blue-950 hover:bg-white/60'
            }`}
          >
            <span className="text-base">📜</span>
            <span>Results</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('gate')}
            className={`flex-1 min-w-[70px] py-2 px-2.5 rounded-xl font-black text-[11px] uppercase tracking-wider transition-all flex flex-col items-center gap-1 ${
              activeTab === 'gate'
                ? 'bg-indigo-700 text-white shadow-md'
                : 'text-slate-600 hover:text-blue-950 hover:bg-white/60'
            }`}
          >
            <span className="text-base">🆔</span>
            <span>Gate Pass</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('install')}
            className={`flex-1 min-w-[70px] py-2 px-2.5 rounded-xl font-black text-[11px] uppercase tracking-wider transition-all flex flex-col items-center gap-1 ${
              activeTab === 'install'
                ? 'bg-purple-700 text-yellow-300 shadow-md'
                : 'text-slate-600 hover:text-blue-950 hover:bg-white/60'
            }`}
          >
            <span className="text-base">📲</span>
            <span>Install</span>
          </button>
        </div>

        {/* Parent child selector when in Gate Pass tab */}
        {activeTab === 'gate' && linkedChildren.length > 1 && (
          <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-2xl flex items-center justify-between text-xs">
            <span className="font-black text-indigo-950 uppercase tracking-wide">Select Child Pass:</span>
            <select
              value={selectedChildId || linkedChildren[0]?.id}
              onChange={(e) => setSelectedChildId(e.target.value)}
              className="px-3 py-1.5 bg-white border border-indigo-300 rounded-xl font-black text-xs text-blue-950 outline-none"
            >
              {linkedChildren.map(c => (
                <option key={c.id} value={c.id}>{c.name} ({c.grade})</option>
              ))}
            </select>
          </div>
        )}

        {/* QR Code Display Container */}
        <div className="bg-gradient-to-b from-slate-50 to-white rounded-3xl p-6 border-2 border-slate-200 text-center space-y-4 shadow-inner">
          <div className="flex items-center justify-center gap-2">
            <span className="text-2xl">{qrIcon}</span>
            <h4 className={`font-serif font-black text-lg ${qrColor}`}>
              {qrTitle}
            </h4>
          </div>
          <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
            {qrSubtitle}
          </p>

          {/* QR Code Graphic with Crest Styling */}
          <div 
            ref={qrRef}
            className="inline-block p-5 bg-white rounded-3xl border-4 border-yellow-400 shadow-xl relative group transition-transform hover:scale-105"
          >
            <QRCodeSVG
              id="ghs-modal-qr-svg"
              value={qrUrl}
              size={190}
              level="H"
              includeMargin={true}
              imageSettings={{
                src: '/logo.png',
                x: undefined,
                y: undefined,
                height: 38,
                width: 38,
                excavate: true,
              }}
            />
            <div className="mt-2 text-[10px] font-mono font-black text-blue-950 uppercase tracking-wider flex items-center justify-center gap-1">
              <span>★ Official God's Hand Model School Seal ★</span>
            </div>
          </div>

          {/* Scannable Target Link Preview */}
          <div className="bg-slate-100/80 p-2.5 rounded-2xl border border-slate-200 flex items-center justify-between gap-2 text-left">
            <div className="truncate flex-1">
              <span className="block text-[9px] font-black uppercase text-slate-400">Target URL / Payload:</span>
              <span className="font-mono text-xs font-bold text-blue-900 truncate block">{qrUrl}</span>
            </div>
            <button
              type="button"
              onClick={handleCopyLink}
              className="px-3 py-1.5 bg-white hover:bg-slate-200 border border-slate-300 rounded-xl text-[10px] font-black uppercase tracking-wider shrink-0 transition-all text-blue-950 active:scale-95"
            >
              {copied ? '✓ Copied' : 'Copy'}
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
          <button
            type="button"
            onClick={handleDownload}
            className="py-3 px-3 bg-blue-900 hover:bg-blue-800 text-yellow-400 rounded-xl font-black text-xs uppercase tracking-wider shadow-md transition-all flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer"
            title="Download QR code image as PNG"
          >
            <span>📥</span>
            <span>Download PNG</span>
          </button>

          <button
            type="button"
            onClick={handleShareWhatsApp}
            className="py-3 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-black text-xs uppercase tracking-wider shadow-md transition-all flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer"
            title="Share direct QR pass link on WhatsApp"
          >
            <span>💬</span>
            <span>WhatsApp</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (onNavigate) {
                if (activeTab === 'portal') onNavigate(currentUserRole === UserRole.STUDENT ? 'portal' : currentUserRole === UserRole.PARENT ? 'parentPortal' : 'portal');
                else if (activeTab === 'fees') onNavigate('feeChecker');
                else if (activeTab === 'results') onNavigate('resultChecker');
                else if (activeTab === 'gate') onNavigate('attendanceScanning');
                onClose();
              }
            }}
            className="col-span-2 sm:col-span-1 py-3 px-3 bg-yellow-400 hover:bg-yellow-300 text-blue-950 rounded-xl font-black text-xs uppercase tracking-wider shadow-md transition-all flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer"
          >
            <span>🚀</span>
            <span>Open View</span>
          </button>
        </div>

        {/* Footnote */}
        <div className="text-center text-[10px] text-slate-400 font-medium">
          Official QR codes issued by God's Hand International Model School, Apata, Ibadan.
        </div>
      </div>
    </div>
  );
};
