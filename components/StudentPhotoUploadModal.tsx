import React, { useState, useRef, useEffect } from 'react';
import { StudentAccount } from '../types';

interface StudentPhotoUploadModalProps {
  student: StudentAccount;
  isOpen: boolean;
  onClose: () => void;
  onSavePhoto: (photoBase64: string) => void;
  uploaderTitle?: string;
  isParentView?: boolean;
}

export const StudentPhotoUploadModal: React.FC<StudentPhotoUploadModalProps> = ({
  student,
  isOpen,
  onClose,
  onSavePhoto,
  uploaderTitle = 'Upload Student Profile Photo',
  isParentView = false
}) => {
  const [mode, setMode] = useState<'options' | 'camera' | 'preview'>('options');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const mobileCameraInputRef = useRef<HTMLInputElement | null>(null);

  // Stop camera when modal closes or mode changes
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      setMode('options');
      setPreviewUrl(null);
      setCameraError(null);
    }
  }, [isOpen]);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Process and crop image to square 400x400 JPEG
  const processImageToSquare = (imageSource: CanvasImageSource, sourceWidth: number, sourceHeight: number): string => {
    const canvas = document.createElement('canvas');
    const size = 400; // Optimal passport size for fast sync & crisp display
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    if (!ctx) return '';

    // Center crop square
    const minDim = Math.min(sourceWidth, sourceHeight);
    const sx = (sourceWidth - minDim) / 2;
    const sy = (sourceHeight - minDim) / 2;

    ctx.drawImage(imageSource, sx, sy, minDim, minDim, 0, 0, size, size);

    return canvas.toDataURL('image/jpeg', 0.86);
  };

  // Start live webcam / phone camera
  const startCamera = async (facing: 'user' | 'environment' = facingMode) => {
    stopCamera();
    setCameraError(null);
    setMode('camera');

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access is not supported on this browser. Please use the mobile device gallery upload instead.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facing,
          width: { ideal: 720 },
          height: { ideal: 720 }
        },
        audio: false
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(e => console.warn('Video play error:', e));
      }
      setCameraActive(true);
    } catch (err: any) {
      console.error('Camera access error:', err);
      setCameraError(err.message || 'Unable to access camera. Please check camera permissions or upload an image file.');
      setCameraActive(false);
    }
  };

  // Flip between front and rear camera
  const handleToggleCamera = () => {
    const nextFacing = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextFacing);
    startCamera(nextFacing);
  };

  // Snap photo from live camera
  const handleSnapPhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const width = video.videoWidth || 640;
    const height = video.videoHeight || 480;

    const croppedBase64 = processImageToSquare(video, width, height);
    stopCamera();
    setPreviewUrl(croppedBase64);
    setMode('preview');
  };

  // Handle file selected from device gallery / camera roll
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file (JPEG, PNG, WEBP).');
      return;
    }

    setIsProcessing(true);
    const reader = new FileReader();
    reader.onload = (loadEvt) => {
      const result = loadEvt.target?.result as string;
      const img = new Image();
      img.onload = () => {
        const cropped = processImageToSquare(img, img.naturalWidth || img.width, img.naturalHeight || img.height);
        setPreviewUrl(cropped);
        setMode('preview');
        setIsProcessing(false);
      };
      img.onerror = () => {
        alert('Failed to process the chosen image. Please try another photo.');
        setIsProcessing(false);
      };
      img.src = result;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Save the confirmed photo
  const handleSave = () => {
    if (!previewUrl) return;
    setIsProcessing(true);
    onSavePhoto(previewUrl);
    setTimeout(() => {
      setIsProcessing(false);
      onClose();
    }, 200);
  };

  // Clear / remove existing photo
  const handleRemovePhoto = () => {
    if (window.confirm(`Are you sure you want to remove ${student.name}'s profile photo?`)) {
      onSavePhoto('');
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border-2 border-slate-100 dark:border-slate-800 relative overflow-hidden flex flex-col text-slate-900 dark:text-slate-100"
        onClick={e => e.stopPropagation()}
      >
        {/* Top Gold Stripe */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-yellow-400"></div>

        {/* Close Button */}
        <button
          type="button"
          onClick={() => {
            stopCamera();
            onClose();
          }}
          className="absolute top-4 right-4 w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white flex items-center justify-center font-black transition-colors"
          title="Close"
        >
          ✕
        </button>

        {/* Header */}
        <div className="text-left mb-6 pr-8">
          <div className="flex items-center gap-2">
            <span className="text-2xl">📸</span>
            <h3 className="font-serif font-black text-xl text-blue-950 dark:text-yellow-400">
              {uploaderTitle}
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {isParentView 
              ? `Update official pupil portrait for ${student.name} (${student.grade})`
              : `Set your official student passport photograph for ${student.name}`}
          </p>
        </div>

        {/* Hidden File Inputs */}
        {/* Standard File Picker */}
        <input 
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
        {/* Native Mobile Camera Trigger */}
        <input 
          ref={mobileCameraInputRef}
          type="file"
          accept="image/*"
          capture="user"
          className="hidden"
          onChange={handleFileChange}
        />

        {/* MODE 1: OPTIONS / SELECTION MENU */}
        {mode === 'options' && (
          <div className="space-y-6">
            {/* Current Photo Avatar Display */}
            <div className="flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-slate-800/60 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-700">
              <div className="relative">
                <div className="w-32 h-32 rounded-3xl overflow-hidden shadow-xl border-4 border-yellow-400 bg-white dark:bg-slate-800 flex items-center justify-center text-4xl font-serif font-black text-blue-900 dark:text-yellow-400">
                  {student.photo ? (
                    <img 
                      src={student.photo} 
                      alt={student.name} 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span>{student.name.charAt(0)}</span>
                  )}
                </div>
                {student.photo && (
                  <span className="absolute -bottom-2 -right-2 px-2.5 py-0.5 bg-emerald-500 text-white rounded-full text-[9px] font-black uppercase tracking-wider shadow-md">
                    Active
                  </span>
                )}
              </div>
              <p className="font-black text-sm text-blue-950 dark:text-white mt-3">{student.name}</p>
              <p className="text-xs text-slate-400">{student.grade} • ID: {student.id}</p>
            </div>

            {/* Upload & Capture Actions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Option A: Take Live Photo via Camera */}
              <button
                type="button"
                onClick={() => startCamera('user')}
                className="p-4 rounded-2xl bg-blue-900 hover:bg-blue-800 text-yellow-400 flex flex-col items-center justify-center text-center shadow-md active:scale-95 transition-all border-2 border-blue-950 group"
              >
                <span className="text-3xl mb-1 group-hover:scale-110 transition-transform">📷</span>
                <span className="font-black text-xs uppercase tracking-wider text-white">Open Device Camera</span>
                <span className="text-[10px] text-yellow-300/80 mt-0.5">Live Viewfinder Snap</span>
              </button>

              {/* Option B: Choose from Photos / Gallery */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-4 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 flex flex-col items-center justify-center text-center shadow-xs active:scale-95 transition-all border border-slate-200 dark:border-slate-700 group"
              >
                <span className="text-3xl mb-1 group-hover:scale-110 transition-transform">🖼️</span>
                <span className="font-black text-xs uppercase tracking-wider">Choose From Gallery</span>
                <span className="text-[10px] text-slate-400 mt-0.5">Mobile Photos & Files</span>
              </button>
            </div>

            {/* Quick Native Mobile Camera Shutter Button (Direct Native App) */}
            <button
              type="button"
              onClick={() => mobileCameraInputRef.current?.click()}
              className="w-full py-3 px-4 rounded-2xl bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 text-amber-900 dark:text-yellow-300 border border-amber-200 dark:border-amber-800/60 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              <span>📱</span>
              <span>Launch Phone Camera App Direct</span>
            </button>

            {student.photo && (
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-center">
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  className="text-xs text-rose-500 hover:text-rose-700 font-bold flex items-center gap-1 hover:underline"
                >
                  <span>🗑️</span>
                  <span>Remove Current Photo</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* MODE 2: LIVE CAMERA VIEWFINDER */}
        {mode === 'camera' && (
          <div className="space-y-4">
            <div className="relative rounded-3xl overflow-hidden bg-black aspect-square max-h-[360px] mx-auto w-full flex items-center justify-center shadow-inner border-2 border-blue-900">
              <video 
                ref={videoRef}
                autoPlay 
                playsInline 
                muted
                className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
              />

              {/* Passport Guide Overlay Oval / Square */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-56 h-56 rounded-full border-2 border-yellow-400/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.4)] flex items-center justify-center">
                  <span className="text-[10px] font-black uppercase text-yellow-300 bg-black/60 px-2 py-0.5 rounded-full tracking-widest">
                    Center Face Here
                  </span>
                </div>
              </div>

              {/* Camera Controls Overlay */}
              <div className="absolute top-3 right-3 flex items-center gap-2 z-10">
                <button
                  type="button"
                  onClick={handleToggleCamera}
                  className="p-2.5 rounded-full bg-black/60 hover:bg-black/80 text-white text-xs font-black shadow-md border border-white/20 active:scale-95 transition-transform"
                  title="Flip Camera (Front / Back)"
                >
                  🔄 Flip
                </button>
              </div>
            </div>

            {cameraError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-bold text-center">
                {cameraError}
              </div>
            )}

            {/* Shutter Bar */}
            <div className="flex items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  stopCamera();
                  setMode('options');
                }}
                className="px-5 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 font-black text-xs uppercase tracking-wider"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSnapPhoto}
                disabled={!cameraActive}
                className="flex-1 py-3.5 px-6 rounded-2xl bg-yellow-400 hover:bg-yellow-300 text-blue-950 font-black text-sm uppercase tracking-wider shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50"
              >
                <span className="text-xl">📸</span>
                <span>Take Photo</span>
              </button>
            </div>
          </div>
        )}

        {/* MODE 3: PREVIEW & CONFIRM */}
        {mode === 'preview' && previewUrl && (
          <div className="space-y-6">
            <div className="text-center p-6 bg-slate-50 dark:bg-slate-800/60 rounded-3xl border border-slate-200 dark:border-slate-700 space-y-4">
              <p className="text-xs font-black uppercase tracking-wider text-slate-400">Photo Preview</p>
              
              <div className="flex items-center justify-center gap-6">
                {/* Square Avatar */}
                <div className="text-center">
                  <div className="w-28 h-28 rounded-2xl overflow-hidden border-4 border-yellow-400 shadow-xl mx-auto bg-white">
                    <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                  <span className="text-[10px] text-slate-400 font-bold block mt-1.5 uppercase">Report / ID</span>
                </div>

                {/* Circular Avatar */}
                <div className="text-center">
                  <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-blue-900 shadow-xl mx-auto bg-white">
                    <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                  <span className="text-[10px] text-slate-400 font-bold block mt-1.5 uppercase">Portal Avatar</span>
                </div>
              </div>

              <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border border-emerald-200 dark:border-emerald-800/40">
                <span>✓</span>
                <span>Photo processed and optimized for instant loading</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setPreviewUrl(null);
                  setMode('options');
                }}
                className="w-1/3 py-3.5 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 font-black text-xs uppercase tracking-wider transition-all"
              >
                Retake
              </button>

              <button
                type="button"
                onClick={handleSave}
                disabled={isProcessing}
                className="flex-1 py-3.5 px-6 rounded-2xl bg-blue-900 hover:bg-blue-800 text-yellow-400 font-black text-xs uppercase tracking-wider shadow-xl flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50"
              >
                <span>💾</span>
                <span>{isProcessing ? 'Saving Photo...' : 'Save & Set Profile Photo'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
