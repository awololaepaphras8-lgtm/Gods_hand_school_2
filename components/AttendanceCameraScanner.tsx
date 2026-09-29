import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Html5Qrcode, Html5QrcodeCameraScanConfig } from 'html5-qrcode';
import { StudentAccount, AttendanceRecord, ParentAccount, GradeLevel } from '../types';

interface ScanFeedback {
  type: 'success' | 'failure' | 'warning' | 'denied';
  title: string;
  message: string;
  student?: StudentAccount;
  parent?: ParentAccount;
  scannedAt: string;
  term: string;
  rawPayload: string;
}

interface ScanLogEntry {
  id: string;
  studentName?: string;
  grade?: string;
  studentId?: string;
  status: 'present' | 'denied' | 'duplicate' | 'invalid';
  time: string;
  term: string;
}

interface AttendanceCameraScannerProps {
  students: StudentAccount[];
  attendance: AttendanceRecord[];
  activeTerm?: string;
  onMarkAttendance: (studentId: string, term?: string) => boolean;
  parents?: ParentAccount[];
  scannerRole?: 'admin' | 'staff';
  currentUserName?: string;
  onClose?: () => void;
}

export const AttendanceCameraScanner: React.FC<AttendanceCameraScannerProps> = ({
  students,
  attendance,
  activeTerm = 'First Term',
  onMarkAttendance,
  parents = [],
  scannerRole = 'admin',
  currentUserName = 'Administrator',
  onClose
}) => {
  // Session & Camera states
  const [selectedTerm, setSelectedTerm] = useState<string>(activeTerm);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [availableCameras, setAvailableCameras] = useState<{ id: string; label: string }[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [isTorchOn, setIsTorchOn] = useState<boolean>(false);
  const [isSoundEnabled, setIsSoundEnabled] = useState<boolean>(true);
  
  // Feedback & Log states
  const [activeFeedback, setActiveFeedback] = useState<ScanFeedback | null>(null);
  const [scanLogs, setScanLogs] = useState<ScanLogEntry[]>([]);
  const [manualInput, setManualInput] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Stats
  const [sessionStats, setSessionStats] = useState({
    totalScanned: 0,
    successPresent: 0,
    duplicates: 0,
    deniedOrInvalid: 0
  });

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const lastScannedPayloadRef = useRef<string>('');
  const lastScanTimestampRef = useRef<number>(0);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Synthesize Web Audio beeps (zero external assets needed)
  const playAudioFeedback = useCallback((type: 'success' | 'failure' | 'warning') => {
    if (!isSoundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioCtx();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'success') {
        // High ascending cheerful two-tone chime
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, now); // A5
        osc.frequency.setValueAtTime(1320, now + 0.1); // E6
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc.start(now);
        osc.stop(now + 0.35);
      } else if (type === 'warning') {
        // Double notification chime
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(587.33, now); // D5
        osc.frequency.setValueAtTime(440, now + 0.12); // A4
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
      } else {
        // Low harsh double buzzer for denied or invalid
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(160, now);
        osc.frequency.setValueAtTime(120, now + 0.15);
        gain.gain.setValueAtTime(0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
        osc.start(now);
        osc.stop(now + 0.4);
      }
    } catch (err) {
      console.warn('Audio playback error:', err);
    }
  }, [isSoundEnabled]);

  // Vibrate mobile device if supported
  const triggerHaptic = (type: 'success' | 'failure') => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        if (type === 'success') {
          navigator.vibrate([60, 40, 100]);
        } else {
          navigator.vibrate([200, 100, 200]);
        }
      } catch {
        // Ignore haptic errors on unsupported hardware
      }
    }
  };

  // QR Validation & Processing core
  const processAttendanceScan = useCallback((rawText: string) => {
    const trimmed = rawText.trim();
    if (!trimmed) return;

    // Debounce exact same payload within 3 seconds to prevent duplicate scans
    const now = Date.now();
    if (trimmed === lastScannedPayloadRef.current && (now - lastScanTimestampRef.current) < 3200) {
      return;
    }
    lastScannedPayloadRef.current = trimmed;
    lastScanTimestampRef.current = now;

    setIsProcessing(true);

    // 1. Parse student ID and designated term from QR code pass payload
    let studentIdCandidate = trimmed;
    let targetTerm = selectedTerm;

    if (trimmed.includes('|')) {
      const parts = trimmed.split('|');
      // Format: GHS-ATT|STU-XXXXX|First Term|timestamp
      studentIdCandidate = (parts[1] || '').trim();
      if (parts[2] && parts[2].trim()) {
        targetTerm = parts[2].trim();
      }
    } else if (trimmed.startsWith('GHS-ATT-')) {
      const parts = trimmed.split('-');
      // Format: GHS-ATT-FirstTerm-STU-XXXX
      if (parts.length >= 4) {
        studentIdCandidate = `${parts[2]}-${parts[3]}`.trim();
      } else if (parts.length >= 3) {
        studentIdCandidate = parts[2].trim();
      }
    } else {
      try {
        const parsedJson = JSON.parse(trimmed);
        if (parsedJson.studentId || parsedJson.id) {
          studentIdCandidate = (parsedJson.studentId || parsedJson.id).trim();
          if (parsedJson.term) targetTerm = parsedJson.term;
        }
      } catch {
        // Not a JSON payload, treat as raw student ID or registration number
      }
    }

    const scanTimeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const todayLocale = new Date().toLocaleDateString();

    // 2. Lookup pupil in enrolled students directory
    const matchedStudent = students.find(s => 
      s.id.toLowerCase() === studentIdCandidate.toLowerCase() ||
      s.id.toUpperCase() === studentIdCandidate.toUpperCase() ||
      (s.email && s.email.toLowerCase() === studentIdCandidate.toLowerCase()) ||
      s.name.toLowerCase() === studentIdCandidate.toLowerCase()
    );

    // CASE 1: UNRECOGNIZED QR CODE / STUDENT NOT FOUND
    if (!matchedStudent) {
      playAudioFeedback('failure');
      triggerHaptic('failure');
      setSessionStats(prev => ({ ...prev, totalScanned: prev.totalScanned + 1, deniedOrInvalid: prev.deniedOrInvalid + 1 }));
      
      const feedback: ScanFeedback = {
        type: 'failure',
        title: 'UNRECOGNIZED QR PASS',
        message: `No pupil account matches code: "${studentIdCandidate}". Please check that the student has generated a valid term QR pass.`,
        scannedAt: scanTimeStr,
        term: targetTerm,
        rawPayload: trimmed
      };
      setActiveFeedback(feedback);

      setScanLogs(prev => [
        {
          id: `log-${Date.now()}`,
          studentName: 'Unknown Pupil',
          grade: 'Unknown Class',
          studentId: studentIdCandidate,
          status: 'invalid',
          time: scanTimeStr,
          term: targetTerm
        },
        ...prev.slice(0, 49)
      ]);

      setTimeout(() => setIsProcessing(false), 800);
      return;
    }

    // Lookup linked parent for emergency / gate communication
    const linkedParent = parents.find(p => 
      (p.childrenStudentIds || []).includes(matchedStudent.id) ||
      (matchedStudent.parentEmail && p.email.toLowerCase() === matchedStudent.parentEmail.toLowerCase())
    );

    // CASE 2: ENTRY RESTRICTED / BLOCKED BY ADMINISTRATION
    if (matchedStudent.entryAllowed === false) {
      playAudioFeedback('failure');
      triggerHaptic('failure');
      setSessionStats(prev => ({ ...prev, totalScanned: prev.totalScanned + 1, deniedOrInvalid: prev.deniedOrInvalid + 1 }));

      const feedback: ScanFeedback = {
        type: 'denied',
        title: 'GATE ENTRY RESTRICTED',
        message: `Clearance blocked for ${matchedStudent.name} (${matchedStudent.grade}). Student entry has been paused by the Proprietor / Bursary office.`,
        student: matchedStudent,
        parent: linkedParent,
        scannedAt: scanTimeStr,
        term: targetTerm,
        rawPayload: trimmed
      };
      setActiveFeedback(feedback);

      setScanLogs(prev => [
        {
          id: `log-${Date.now()}`,
          studentName: matchedStudent.name,
          grade: matchedStudent.grade,
          studentId: matchedStudent.id,
          status: 'denied',
          time: scanTimeStr,
          term: targetTerm
        },
        ...prev.slice(0, 49)
      ]);

      setTimeout(() => setIsProcessing(false), 800);
      return;
    }

    // CASE 3: ALREADY MARKED PRESENT TODAY FOR THIS TERM
    const isAlreadyMarked = attendance.some(a => 
      a.studentId === matchedStudent.id && 
      (a.date === todayLocale) && 
      (a.term === targetTerm || (!a.term && targetTerm === 'First Term'))
    );

    if (isAlreadyMarked) {
      playAudioFeedback('warning');
      triggerHaptic('success');
      setSessionStats(prev => ({ ...prev, totalScanned: prev.totalScanned + 1, duplicates: prev.duplicates + 1 }));

      const feedback: ScanFeedback = {
        type: 'warning',
        title: 'ALREADY CHECKED IN TODAY',
        message: `${matchedStudent.name} (${matchedStudent.grade}) is already recorded present for today (${todayLocale}) in ${targetTerm}.`,
        student: matchedStudent,
        parent: linkedParent,
        scannedAt: scanTimeStr,
        term: targetTerm,
        rawPayload: trimmed
      };
      setActiveFeedback(feedback);

      setScanLogs(prev => [
        {
          id: `log-${Date.now()}`,
          studentName: matchedStudent.name,
          grade: matchedStudent.grade,
          studentId: matchedStudent.id,
          status: 'duplicate',
          time: scanTimeStr,
          term: targetTerm
        },
        ...prev.slice(0, 49)
      ]);

      setTimeout(() => setIsProcessing(false), 800);
      return;
    }

    // CASE 4: SUCCESSFUL INSTANT ATTENDANCE REGISTRATION
    const markSuccess = onMarkAttendance(matchedStudent.id, targetTerm);
    playAudioFeedback('success');
    triggerHaptic('success');
    setSessionStats(prev => ({ 
      ...prev, 
      totalScanned: prev.totalScanned + 1, 
      successPresent: prev.successPresent + 1 
    }));

    const feedback: ScanFeedback = {
      type: 'success',
      title: '✓ ATTENDANCE RECORDED & VERIFIED',
      message: `${matchedStudent.name} (${matchedStudent.grade}) has been successfully marked Present at the school gate for ${targetTerm}!`,
      student: matchedStudent,
      parent: linkedParent,
      scannedAt: scanTimeStr,
      term: targetTerm,
      rawPayload: trimmed
    };
    setActiveFeedback(feedback);

    setScanLogs(prev => [
      {
        id: `log-${Date.now()}`,
        studentName: matchedStudent.name,
        grade: matchedStudent.grade,
        studentId: matchedStudent.id,
        status: 'present',
        time: scanTimeStr,
        term: targetTerm
      },
      ...prev.slice(0, 49)
    ]);

    setTimeout(() => setIsProcessing(false), 800);
  }, [selectedTerm, students, attendance, parents, onMarkAttendance, playAudioFeedback]);

  // Start Camera scanning session
  const startCamera = async () => {
    setCameraError(null);
    try {
      // 1. Enumerate video devices
      const devices = await Html5Qrcode.getCameras();
      if (!devices || devices.length === 0) {
        setCameraError('No video camera detected on this device. You can verify passes using the manual entry box below.');
        return;
      }
      setAvailableCameras(devices);

      const chosenCameraId = selectedCameraId || devices[0].id;
      if (!selectedCameraId) {
        setSelectedCameraId(chosenCameraId);
      }

      // 2. Initialize Html5Qrcode instance
      const elementId = 'attendance-qr-camera-viewport';
      const el = document.getElementById(elementId);
      if (!el) {
        setTimeout(() => {
          startCamera();
        }, 150);
        return;
      }
      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode(elementId);
      }

      const scanConfig: Html5QrcodeCameraScanConfig = {
        fps: 15,
        qrbox: { width: 260, height: 260 },
        aspectRatio: 1.0
      };

      // Prefer back camera by default for easy student scanning
      const cameraConfig = selectedCameraId ? { deviceId: { exact: selectedCameraId } } : { facingMode };

      await scannerRef.current.start(
        cameraConfig,
        scanConfig,
        (decodedText) => {
          processAttendanceScan(decodedText);
        },
        () => {
          // Frame error (no QR detected in current video frame), ignore
        }
      );

      setIsCameraActive(true);
    } catch (err: any) {
      console.error('Failed to initialize attendance scanner camera:', err);
      const errMsg = err?.message || String(err);
      if (errMsg.includes('Permission') || errMsg.includes('NotAllowedError')) {
        setCameraError('Camera permission was denied. Please allow camera access in your browser settings to scan attendance passes.');
      } else {
        setCameraError(`Unable to start camera: ${errMsg}. You can use manual student ID entry below.`);
      }
      setIsCameraActive(false);
    }
  };

  // Stop Camera scanning session
  const stopCamera = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
      } catch {
        // Scanner might not be currently running
      }
      try {
        await scannerRef.current.clear();
      } catch {
        // Viewport might be unmounted
      }
      scannerRef.current = null;
    }
    setIsCameraActive(false);
    setIsTorchOn(false);
  };

  // Toggle Torch / Flashlight on mobile cameras that support it
  const toggleTorch = async () => {
    if (!scannerRef.current || !isCameraActive) return;
    try {
      const nextTorch = !isTorchOn;
      await scannerRef.current.applyVideoConstraints({
        advanced: [{ torch: nextTorch } as any]
      });
      setIsTorchOn(nextTorch);
    } catch (err) {
      console.warn('Flashlight not supported on this device/camera:', err);
      alert('Flashlight torch is not supported on this device or selected camera.');
    }
  };

  // Switch between front/back camera
  const toggleFacingMode = async () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
    setSelectedCameraId('');
    await stopCamera();
    setTimeout(() => {
      startCamera();
    }, 250);
  };

  // Handle Manual Student ID submit
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualInput.trim()) return;
    processAttendanceScan(manualInput.trim());
    setManualInput('');
  };

  // Auto-start camera on mount, stop on unmount
  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Top Banner & Control Bar */}
      <div className="bg-gradient-to-r from-blue-950 via-blue-900 to-indigo-950 text-white rounded-3xl p-6 sm:p-8 shadow-2xl border-4 border-yellow-400/40 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-yellow-400/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 rounded-2xl bg-yellow-400 text-blue-950 flex items-center justify-center text-3xl font-black shadow-xl shrink-0">
              📷
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-3 py-0.5 rounded-full bg-yellow-400 text-blue-950 text-[10px] font-black uppercase tracking-widest shadow-sm">
                  Official Gate QR Attendance Station
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[10px] font-black uppercase tracking-wider">
                  {scannerRole === 'admin' ? 'Proprietor / Admin Station' : 'Staff Roll-Call Station'}
                </span>
                <span className="text-xs text-blue-300 font-bold hidden sm:inline">• Live Verification</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-serif font-black text-white mt-1">
                Attendance QR Pass Scanner
              </h2>
              <p className="text-xs text-blue-200/80 font-medium max-w-xl mt-0.5">
                Point device camera at student's digital or printed term QR code pass for instant gate authorization and automatic attendance sync.
              </p>
            </div>
          </div>

          {/* Quick Header Options & Back Button */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Term Selector */}
            <div className="flex items-center gap-1 bg-white/10 px-3 py-1.5 rounded-2xl border border-white/10">
              <span className="text-[10px] font-black uppercase text-yellow-300">Term:</span>
              <select
                value={selectedTerm}
                onChange={(e) => {
                  setSelectedTerm(e.target.value);
                  setActiveFeedback(null);
                }}
                className="bg-transparent text-white font-black text-xs outline-none cursor-pointer"
              >
                <option value="First Term" className="text-blue-950">First Term</option>
                <option value="Second Term" className="text-blue-950">Second Term</option>
                <option value="Third Term" className="text-blue-950">Third Term</option>
              </select>
            </div>

            {/* Sound Toggle */}
            <button
              type="button"
              onClick={() => setIsSoundEnabled(!isSoundEnabled)}
              className={`px-3 py-2 rounded-2xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                isSoundEnabled
                  ? 'bg-yellow-400 text-blue-950 shadow-md'
                  : 'bg-white/10 text-white/60 hover:text-white border border-white/10'
              }`}
              title={isSoundEnabled ? 'Audio Feedback Enabled (Click to Mute)' : 'Audio Feedback Muted'}
            >
              <span>{isSoundEnabled ? '🔊 Sound ON' : '🔇 Sound OFF'}</span>
            </button>

            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-2xl font-black text-xs uppercase tracking-wider transition-all border border-white/10"
              >
                ✕ Close
              </button>
            )}
          </div>
        </div>

        {/* Live Session Counter Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-white/10 relative z-10">
          <div className="p-3.5 bg-white/5 rounded-2xl border border-white/10">
            <p className="text-[10px] font-black uppercase tracking-wider text-blue-300">Total Scanned</p>
            <p className="text-2xl font-black text-white font-mono mt-0.5">{sessionStats.totalScanned}</p>
          </div>
          <div className="p-3.5 bg-emerald-500/10 rounded-2xl border border-emerald-400/30">
            <p className="text-[10px] font-black uppercase tracking-wider text-emerald-400">Verified & Present</p>
            <p className="text-2xl font-black text-emerald-300 font-mono mt-0.5">{sessionStats.successPresent}</p>
          </div>
          <div className="p-3.5 bg-amber-500/10 rounded-2xl border border-amber-400/30">
            <p className="text-[10px] font-black uppercase tracking-wider text-amber-400">Already Checked</p>
            <p className="text-2xl font-black text-amber-300 font-mono mt-0.5">{sessionStats.duplicates}</p>
          </div>
          <div className="p-3.5 bg-rose-500/10 rounded-2xl border border-rose-400/30">
            <p className="text-[10px] font-black uppercase tracking-wider text-rose-400">Denied / Invalid</p>
            <p className="text-2xl font-black text-rose-300 font-mono mt-0.5">{sessionStats.deniedOrInvalid}</p>
          </div>
        </div>
      </div>

      {/* Main Scanner Section Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Live Camera Viewfinder & Camera Controls */}
        <div className="lg:col-span-7 space-y-5">
          <div className="bg-white rounded-3xl p-6 sm:p-8 border-4 border-slate-100 shadow-xl space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <span className={`w-3 h-3 rounded-full ${isCameraActive ? 'bg-emerald-500 animate-ping' : 'bg-rose-500'}`}></span>
                <span className="font-serif font-black text-blue-950 text-lg">
                  Device Camera Viewfinder
                </span>
              </div>

              {/* Viewfinder Toolbar */}
              <div className="flex items-center gap-2">
                {isCameraActive && (
                  <>
                    <button
                      type="button"
                      onClick={toggleTorch}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1 ${
                        isTorchOn 
                          ? 'bg-yellow-400 text-blue-950 shadow-md' 
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      }`}
                      title="Toggle Camera Flashlight"
                    >
                      <span>💡 Torch</span>
                    </button>

                    <button
                      type="button"
                      onClick={toggleFacingMode}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1"
                      title="Flip camera (Front / Rear)"
                    >
                      <span>🔄 Flip</span>
                    </button>
                  </>
                )}

                <button
                  type="button"
                  onClick={isCameraActive ? stopCamera : startCamera}
                  className={`px-4 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-xs ${
                    isCameraActive
                      ? 'bg-rose-100 hover:bg-rose-200 text-rose-800'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  }`}
                >
                  {isCameraActive ? 'Pause Camera' : 'Start Camera'}
                </button>
              </div>
            </div>

            {/* Camera Viewport Container */}
            <div className={`relative rounded-3xl overflow-hidden bg-slate-950 aspect-square sm:aspect-video flex items-center justify-center border-4 transition-all duration-300 ${
              activeFeedback?.type === 'success'
                ? 'border-emerald-500 ring-8 ring-emerald-400/40 shadow-[0_0_50px_rgba(16,185,129,0.5)]'
                : activeFeedback?.type === 'denied' || activeFeedback?.type === 'failure'
                ? 'border-rose-500 ring-8 ring-rose-400/40 shadow-[0_0_50px_rgba(244,63,94,0.5)]'
                : activeFeedback?.type === 'warning'
                ? 'border-amber-400 ring-8 ring-amber-400/40 shadow-[0_0_50px_rgba(245,158,11,0.5)]'
                : 'border-slate-800'
            }`}>
              {/* Target Viewport for html5-qrcode */}
              <div 
                id="attendance-qr-camera-viewport" 
                className="w-full h-full object-cover [&_video]:w-full [&_video]:h-full [&_video]:object-cover"
              ></div>

              {/* Scanning Target Overlay Reticle & Laser */}
              {isCameraActive && (
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  {/* Outer Dim Overlay */}
                  <div className="relative w-64 h-64 sm:w-72 sm:h-72 border-2 border-yellow-400/70 rounded-3xl shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]">
                    {/* Corner Reticle Markers */}
                    <div className="absolute -top-2 -left-2 w-8 h-8 border-t-4 border-l-4 border-yellow-400 rounded-tl-xl"></div>
                    <div className="absolute -top-2 -right-2 w-8 h-8 border-t-4 border-r-4 border-yellow-400 rounded-tr-xl"></div>
                    <div className="absolute -bottom-2 -left-2 w-8 h-8 border-b-4 border-l-4 border-yellow-400 rounded-bl-xl"></div>
                    <div className="absolute -bottom-2 -right-2 w-8 h-8 border-b-4 border-r-4 border-yellow-400 rounded-br-xl"></div>

                    {/* Sweeping Laser Beam Animation */}
                    <div className="w-full h-1 bg-gradient-to-r from-transparent via-yellow-400 to-transparent shadow-[0_0_15px_#facc15] animate-bounce opacity-80 mt-16"></div>

                    <div className="absolute -bottom-8 left-0 right-0 text-center">
                      <span className="px-3 py-1 bg-black/75 text-yellow-300 text-[10px] font-black uppercase tracking-widest rounded-full backdrop-blur-sm border border-yellow-400/30">
                        Align Student QR Code Inside Box
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Camera Paused / Error Overlay */}
              {(!isCameraActive || cameraError) && (
                <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center text-white z-20 space-y-4">
                  <div className="w-16 h-16 rounded-3xl bg-white/10 flex items-center justify-center text-3xl">
                    📷
                  </div>
                  <div className="max-w-md">
                    <h4 className="font-serif font-black text-lg text-yellow-400">
                      {cameraError ? 'Camera Access Required' : 'Camera Paused'}
                    </h4>
                    <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                      {cameraError || 'The live device camera scanner is currently paused. Click below to resume scanning.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={startCamera}
                    className="px-6 py-3 bg-yellow-400 hover:bg-yellow-300 text-blue-950 font-black text-xs uppercase tracking-wider rounded-2xl shadow-xl transition-all active:scale-95 flex items-center gap-2"
                  >
                    <span>▶</span>
                    <span>Start / Retry Camera Scanner</span>
                  </button>
                </div>
              )}
            </div>

            {/* Camera Selector Dropdown (Multi-camera hardware) */}
            {availableCameras.length > 1 && (
              <div className="flex items-center justify-between gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-200">
                <span className="text-xs font-black text-slate-500 uppercase tracking-wider">
                  Select Video Input:
                </span>
                <select
                  value={selectedCameraId}
                  onChange={async (e) => {
                    const newId = e.target.value;
                    setSelectedCameraId(newId);
                    await stopCamera();
                    setTimeout(() => startCamera(), 200);
                  }}
                  className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-blue-950 outline-none max-w-xs truncate"
                >
                  {availableCameras.map(cam => (
                    <option key={cam.id} value={cam.id}>
                      {cam.label || `Camera (${cam.id.slice(0, 8)}...)`}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Manual Pass ID Entry Fallback Form */}
            <form onSubmit={handleManualSubmit} className="pt-2 border-t border-slate-100">
              <label className="text-xs font-black text-slate-500 uppercase tracking-wider block mb-2">
                Manual Pupil ID / Card Entry (Backup Validation):
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  placeholder="e.g. STU-1725883200 or Student Name / Code"
                  className="flex-1 px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-2xl text-xs font-bold text-blue-950 outline-none focus:bg-white focus:border-blue-900 transition-all"
                />
                <button
                  type="submit"
                  disabled={!manualInput.trim()}
                  className="px-6 py-3 bg-blue-900 hover:bg-blue-800 disabled:opacity-40 text-yellow-400 font-black text-xs uppercase tracking-wider rounded-2xl shadow-md transition-all active:scale-95 shrink-0"
                >
                  Verify & Mark
                </button>
              </div>

              {/* Quick Demo / Test Pupil Chips */}
              {students.length > 0 && (
                <div className="mt-3 pt-2.5 border-t border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <span>⚡ Quick Test Pupil Passes (Simulate QR Scan):</span>
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {students.slice(0, 5).map((stu) => (
                      <button
                        key={stu.id}
                        type="button"
                        onClick={() => processAttendanceScan(`GHS-ATT|${stu.id}|${selectedTerm}|${Date.now()}`)}
                        className="px-2.5 py-1 bg-blue-50 hover:bg-yellow-400 hover:text-blue-950 text-blue-900 rounded-xl text-[10px] font-black border border-blue-100 transition-all active:scale-95"
                        title={`Simulate scanning ${stu.name}'s QR code pass`}
                      >
                        🪪 {stu.name.split(' ')[0]} ({stu.grade})
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => processAttendanceScan('INVALID-TEST-PASS-000')}
                      className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-[10px] font-black border border-rose-200 transition-all active:scale-95"
                      title="Test invalid QR pass failure feedback"
                    >
                      ✗ Test Invalid Pass
                    </button>
                  </div>
                </div>
              )}
            </form>
          </div>
        </div>

        {/* Right Column: Instant Success/Failure Feedback Card & Live Scan Log */}
        <div className="lg:col-span-5 space-y-6">
          {/* Real-time Verification Feedback Card */}
          {activeFeedback ? (
            <div className={`p-6 sm:p-8 rounded-3xl border-4 shadow-2xl transition-all duration-300 animate-in zoom-in-95 ${
              activeFeedback.type === 'success'
                ? 'bg-gradient-to-br from-emerald-950 to-teal-950 border-emerald-400 text-white shadow-emerald-900/30'
                : activeFeedback.type === 'denied' || activeFeedback.type === 'failure'
                ? 'bg-gradient-to-br from-rose-950 to-red-950 border-rose-400 text-white shadow-rose-900/30'
                : 'bg-gradient-to-br from-amber-950 to-yellow-950 border-amber-400 text-white shadow-amber-900/30'
            }`}>
              {/* Header Status & Badge */}
              <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-5">
                <div className="flex items-center gap-3">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl font-black shadow-lg shrink-0 ${
                    activeFeedback.type === 'success'
                      ? 'bg-emerald-400 text-emerald-950'
                      : activeFeedback.type === 'denied' || activeFeedback.type === 'failure'
                      ? 'bg-rose-500 text-white'
                      : 'bg-yellow-400 text-blue-950'
                  }`}>
                    {activeFeedback.type === 'success' ? '✓' : activeFeedback.type === 'warning' ? '⏱️' : '⛔'}
                  </div>
                  <div>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                      activeFeedback.type === 'success'
                        ? 'bg-emerald-400/20 text-emerald-300 border border-emerald-400/40'
                        : activeFeedback.type === 'denied' || activeFeedback.type === 'failure'
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-400/40'
                        : 'bg-amber-400/20 text-amber-300 border border-amber-400/40'
                    }`}>
                      {activeFeedback.title}
                    </span>
                    <p className="text-[11px] text-white/70 font-mono mt-0.5">Scanned at: {activeFeedback.scannedAt}</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveFeedback(null)}
                  className="text-white/60 hover:text-white font-black text-sm p-1"
                  title="Dismiss Feedback"
                >
                  ✕
                </button>
              </div>

              {/* Pupil Details (if found) */}
              {activeFeedback.student ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-4 bg-white/10 p-4 rounded-2xl border border-white/10">
                    <div className="w-16 h-16 rounded-2xl bg-yellow-400 text-blue-950 flex items-center justify-center font-serif font-black text-2xl shadow-md shrink-0">
                      {activeFeedback.student.name.charAt(0)}
                    </div>
                    <div className="overflow-hidden">
                      <h3 className="font-serif font-black text-xl text-yellow-300 leading-tight truncate">
                        {activeFeedback.student.name}
                      </h3>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <span className="px-2.5 py-0.5 bg-blue-900/80 text-yellow-300 rounded-md text-xs font-black uppercase">
                          Class: {activeFeedback.student.grade}
                        </span>
                        <span className="text-xs font-mono font-bold text-white/80">
                          ID: {activeFeedback.student.id}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Feedback Message */}
                  <p className="text-xs font-medium text-white/90 leading-relaxed bg-black/20 p-3.5 rounded-xl border border-white/5">
                    {activeFeedback.message}
                  </p>

                  {/* Linked Parent & Guardian Emergency Contact */}
                  {activeFeedback.parent && (
                    <div className="bg-white/5 p-3.5 rounded-2xl border border-white/10 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase text-yellow-300 tracking-wider">
                          Parent / Guardian Contact:
                        </span>
                        <span className="text-[10px] text-white/60 font-bold">{activeFeedback.parent.relationship || 'Guardian'}</span>
                      </div>
                      <p className="text-xs font-bold text-white">{activeFeedback.parent.fullName}</p>
                      <div className="flex items-center justify-between pt-1">
                        <a 
                          href={`tel:${activeFeedback.parent.phone}`}
                          className="text-xs font-mono font-bold text-emerald-300 hover:underline"
                        >
                          📞 {activeFeedback.parent.phone}
                        </a>
                        <a
                          href={`https://wa.me/${activeFeedback.parent.phone.replace(/[^0-9]/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[10px] font-black uppercase tracking-wider transition-all"
                        >
                          WhatsApp
                        </a>
                      </div>
                    </div>
                  )}

                  <div className="pt-2 flex justify-between items-center">
                    <span className="text-[10px] text-white/60 uppercase font-black tracking-widest">
                      Have Faith In God
                    </span>
                    <button
                      type="button"
                      onClick={() => setActiveFeedback(null)}
                      className="px-5 py-2.5 bg-yellow-400 hover:bg-yellow-300 text-blue-950 rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow-md active:scale-95"
                    >
                      Scan Next Pupil →
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-xs font-medium text-white/90 leading-relaxed bg-black/20 p-4 rounded-xl border border-white/5">
                    {activeFeedback.message}
                  </p>
                  <p className="text-[11px] text-rose-300/80 font-mono break-all bg-rose-950/40 p-2.5 rounded-lg border border-rose-800/40">
                    Scanned code: {activeFeedback.rawPayload}
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveFeedback(null)}
                    className="w-full py-3 bg-white/20 hover:bg-white/30 text-white rounded-xl font-black text-xs uppercase tracking-wider transition-all active:scale-95"
                  >
                    Dismiss & Scan Next
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-slate-50 rounded-3xl p-8 border-2 border-dashed border-slate-200 text-center space-y-3">
              <span className="text-5xl block">🎯</span>
              <h4 className="font-serif font-black text-blue-950 text-lg">
                Ready to Scan Pupil QR Passes
              </h4>
              <p className="text-xs text-slate-500 font-medium leading-relaxed max-w-sm mx-auto">
                Position pupil's printed ID badge or smartphone screen in front of the camera. The scanner validates gate clearance and marks daily presence instantly.
              </p>
            </div>
          )}

          {/* Real-time Session Scan Activity Feed */}
          <div className="bg-white rounded-3xl p-6 border-2 border-slate-100 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">📋</span>
                <h4 className="font-serif font-black text-blue-950 text-base">
                  Session Scan History
                </h4>
              </div>
              <span className="text-xs font-black text-blue-900 bg-blue-50 px-2.5 py-1 rounded-xl">
                {scanLogs.length} Records
              </span>
            </div>

            {scanLogs.length === 0 ? (
              <p className="text-center py-8 text-xs text-slate-400 font-bold uppercase tracking-wider italic">
                No passes scanned yet in this gate session.
              </p>
            ) : (
              <div className="divide-y divide-slate-100 max-h-[320px] overflow-y-auto space-y-1 custom-scrollbar pr-1">
                {scanLogs.map((log) => (
                  <div key={log.id} className="pt-2 pb-2 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center space-x-2.5 overflow-hidden">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
                        log.status === 'present'
                          ? 'bg-emerald-100 text-emerald-800'
                          : log.status === 'duplicate'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}>
                        {log.status === 'present' ? '✓' : log.status === 'duplicate' ? '⏱️' : '✗'}
                      </div>
                      <div className="overflow-hidden">
                        <p className="font-black text-blue-950 truncate leading-snug">
                          {log.studentName}
                        </p>
                        <p className="text-[10px] text-slate-400 font-mono">
                          {log.grade} • {log.studentId}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase block tracking-wider ${
                        log.status === 'present'
                          ? 'bg-emerald-100 text-emerald-800'
                          : log.status === 'duplicate'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}>
                        {log.status === 'present' ? 'Present' : log.status === 'duplicate' ? 'Checked' : 'Denied'}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">{log.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
