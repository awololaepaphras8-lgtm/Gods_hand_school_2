import React, { useState } from 'react';
import { StudentAccount } from '../types';
import { exportStudentIDCardPDF } from '../utils/exportService';
import { QRCodeSVG } from 'qrcode.react';

interface StudentIDCardModalProps {
  student: StudentAccount;
  isOpen: boolean;
  onClose: () => void;
  onUpdateStudent?: (studentId: string, updates: Partial<StudentAccount>) => void;
  onOpenPhotoUpload?: () => void;
  isAdmin?: boolean;
}

export const StudentIDCardModal: React.FC<StudentIDCardModalProps> = ({
  student,
  isOpen,
  onClose,
  onUpdateStudent,
  onOpenPhotoUpload,
  isAdmin = false
}) => {
  const [activeSide, setActiveSide] = useState<'front' | 'back'>('front');
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [ninInput, setNinInput] = useState(student.nin || '');
  const [bloodGroupInput, setBloodGroupInput] = useState(student.bloodGroup || 'O+');
  const [ninError, setNinError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [academicYear, setAcademicYear] = useState('2025/2026');
  const [parentEmergencyPhone, setParentEmergencyPhone] = useState(student.emergencyContact || student.phone || '08056507252');

  if (!isOpen) return null;

  const handleSaveBio = (e: React.FormEvent) => {
    e.preventDefault();
    setNinError('');
    const clean = ninInput.trim().replace(/\D/g, '');
    if (clean.length > 0 && clean.length !== 11) {
      setNinError('National Identification Number (NIN) must be exactly 11 digits.');
      return;
    }
    if (onUpdateStudent) {
      onUpdateStudent(student.id, { 
        nin: clean || undefined,
        bloodGroup: bloodGroupInput.trim() || undefined
      });
    }
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      setIsEditingBio(false);
    }, 1500);
  };

  const handleDownloadPDF = () => {
    exportStudentIDCardPDF(student, {
      academicYear,
      parentPhone: parentEmergencyPhone,
      emergencyContact: parentEmergencyPhone
    });
  };

  const qrData = `GHS-ID|${student.id}|${student.name}|${student.grade}|NIN:${student.nin || 'NA'}|VERIFIED`;

  const handlePhotoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) {
      alert('Photo must be less than 4MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      if (onUpdateStudent) {
        onUpdateStudent(student.id, { photo: base64 });
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="fixed inset-0 z-[140] bg-blue-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-[2.5rem] max-w-xl w-full p-6 sm:p-8 shadow-2xl border-4 border-yellow-400 space-y-6 my-6 relative">
        {/* Top Header & Close */}
        <div className="flex justify-between items-center border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <span className="w-10 h-10 rounded-2xl bg-blue-900 text-yellow-400 flex items-center justify-center text-xl font-black shadow-sm">
              🪪
            </span>
            <div>
              <h3 className="font-serif font-black text-xl text-blue-950">
                Official Student Identity Card
              </h3>
              <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">
                God's Hand International Model School
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-100 hover:bg-red-100 hover:text-red-700 text-slate-600 font-black flex items-center justify-center transition-all"
          >
            ✕
          </button>
        </div>

        {/* Card Side Toggle & Quick Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-2 rounded-2xl border border-slate-200">
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => setActiveSide('front')}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                activeSide === 'front'
                  ? 'bg-blue-900 text-yellow-400 shadow-md'
                  : 'bg-white text-slate-600 hover:bg-slate-200'
              }`}
            >
              Front Side
            </button>
            <button
              type="button"
              onClick={() => setActiveSide('back')}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                activeSide === 'back'
                  ? 'bg-blue-900 text-yellow-400 shadow-md'
                  : 'bg-white text-slate-600 hover:bg-slate-200'
              }`}
            >
              Back Side
            </button>
          </div>

          <div className="flex items-center gap-2">
            <label
              className="px-3 py-1.5 bg-yellow-400 hover:bg-yellow-300 text-blue-950 font-black text-[11px] uppercase rounded-xl transition-all shadow-xs flex items-center gap-1 cursor-pointer active:scale-95"
              title="Upload photo from phone/computer or capture with camera"
            >
              <span>📷</span>
              <span>{student.photo ? 'Change Photo' : 'Upload Photo'}</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoFileChange}
              />
            </label>
            <button
              type="button"
              onClick={() => setIsEditingBio(!isEditingBio)}
              className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-[11px] uppercase rounded-xl transition-all"
            >
              {isEditingBio ? 'Close Editor' : '✏️ Edit NIN & Blood Group'}
            </button>
          </div>
        </div>

        {/* Edit Bio Form (NIN & Blood Group) if toggled */}
        {isEditingBio && (
          <form onSubmit={handleSaveBio} className="p-4 bg-blue-50 border-2 border-blue-200 rounded-2xl space-y-3 animate-in fade-in">
            <div className="flex justify-between items-center">
              <h4 className="text-xs font-black text-blue-950 uppercase tracking-wider">
                Update Student Personal Details
              </h4>
              <span className="text-[10px] text-slate-500 font-mono">Real-time Sync</span>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              {/* NIN Field */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  National Identification Number (NIN)
                </label>
                <input
                  type="text"
                  maxLength={11}
                  placeholder="11 digits (e.g. 12345678901)"
                  value={ninInput}
                  onChange={(e) => setNinInput(e.target.value)}
                  className="w-full px-3 py-2 bg-white border-2 border-slate-200 rounded-xl font-mono font-bold text-xs text-blue-950 focus:border-blue-900 outline-none"
                />
              </div>

              {/* Blood Group Field */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Blood Group
                </label>
                <select
                  value={bloodGroupInput}
                  onChange={(e) => setBloodGroupInput(e.target.value)}
                  className="w-full px-3 py-2 bg-white border-2 border-slate-200 rounded-xl font-bold text-xs text-blue-950 focus:border-blue-900 outline-none"
                >
                  <option value="O+">O Positive (O+)</option>
                  <option value="O-">O Negative (O-)</option>
                  <option value="A+">A Positive (A+)</option>
                  <option value="A-">A Negative (A-)</option>
                  <option value="B+">B Positive (B+)</option>
                  <option value="B-">B Negative (B-)</option>
                  <option value="AB+">AB Positive (AB+)</option>
                  <option value="AB-">AB Negative (AB-)</option>
                </select>
              </div>
            </div>

            {ninError && (
              <p className="text-red-600 text-[11px] font-bold">{ninError}</p>
            )}

            {saveSuccess && (
              <p className="text-emerald-700 text-[11px] font-bold">✓ Profile details updated successfully!</p>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsEditingBio(false)}
                className="px-3 py-2 text-xs font-bold text-slate-600 hover:text-slate-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-blue-900 text-yellow-400 font-black text-xs uppercase rounded-xl shadow-md hover:bg-blue-800 transition-all"
              >
                Save Details
              </button>
            </div>
          </form>
        )}

        {/* VISUAL DIGITAL ID CARD CONTAINER (CR80 RATIO 1.586) */}
        <div className="flex justify-center">
          <div className="w-full max-w-md aspect-[1.586/1] rounded-3xl overflow-hidden shadow-2xl border-2 border-slate-200 relative bg-white flex flex-col justify-between transition-transform">
            {activeSide === 'front' ? (
              // FRONT OF CARD
              <>
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-950 via-blue-900 to-indigo-950 text-white p-3 sm:p-4 text-center border-b-2 border-yellow-400 relative">
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-white p-0.5 border border-yellow-400 shrink-0 flex items-center justify-center">
                      <img src="/logo.png" alt="Logo" className="max-h-full max-w-full object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                    </div>
                    <div className="text-left">
                      <h4 className="text-[11px] sm:text-xs font-black font-serif uppercase tracking-tight leading-tight">
                        God's Hand International Model School
                      </h4>
                      <p className="text-[8px] sm:text-[9px] text-yellow-300 font-bold uppercase tracking-wider">
                        Motto: Have Faith In God • Wire & Cable, Apata, Ibadan
                      </p>
                    </div>
                  </div>
                  <div className="mt-1.5 py-0.5 bg-yellow-400 text-blue-950 text-[8px] sm:text-[9px] font-black uppercase tracking-widest rounded-md">
                    Student Identity Card
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-4 flex gap-4 flex-1 items-center bg-gradient-to-b from-white to-slate-50">
                  {/* Photo Column */}
                  <div className="w-24 sm:w-28 aspect-[3/4] rounded-2xl overflow-hidden border-2 border-blue-900 bg-slate-100 shadow-md shrink-0 relative flex items-center justify-center">
                    {student.photo ? (
                      <img src={student.photo} alt={student.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-center p-2 text-slate-400">
                        <span className="text-3xl block mb-1">👤</span>
                        <span className="text-[9px] font-black uppercase tracking-wider">No Photo</span>
                      </div>
                    )}
                  </div>

                  {/* Info Column */}
                  <div className="flex-1 space-y-1 text-left min-w-0">
                    <h5 className="font-serif font-black text-sm sm:text-base text-blue-950 leading-tight truncate">
                      {student.name}
                    </h5>
                    
                    <div className="space-y-0.5 text-[10px] sm:text-[11px]">
                      <div className="flex items-center gap-1">
                        <span className="text-slate-400 font-bold">ID NO:</span>
                        <span className="font-mono font-black text-blue-900">{student.id}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-slate-400 font-bold">CLASS:</span>
                        <span className="font-black text-blue-950">{student.grade}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-slate-400 font-bold">NIN:</span>
                        <span className="font-mono font-black text-slate-800">
                          {student.nin ? student.nin : <span className="text-amber-600 italic font-sans">Not Added</span>}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-slate-400 font-bold">SESSION:</span>
                        <span className="font-bold text-slate-700">{academicYear}</span>
                      </div>
                    </div>

                    <div className="pt-1 flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-black text-[9px] rounded-md uppercase">
                        Active Pupil
                      </span>
                      <span className="px-2 py-0.5 bg-red-50 text-red-700 font-black text-[9px] rounded-md uppercase">
                        {student.bloodGroup || 'Blood: O+'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Footer Strip */}
                <div className="bg-blue-950 text-white px-4 py-1.5 text-center text-[8px] sm:text-[9px] font-bold uppercase tracking-wider flex justify-between items-center">
                  <span className="text-yellow-400 font-mono">VALID FOR CAMPUS GATE ACCESS</span>
                  <span>EXP: 31/07/2026</span>
                </div>
              </>
            ) : (
              // BACK OF CARD
              <>
                <div className="bg-blue-950 text-white p-2.5 text-center font-black text-[10px] uppercase tracking-wider">
                  Important Information & Emergency Hotline
                </div>

                <div className="p-4 flex-1 space-y-2 text-left text-[9px] sm:text-[10px] leading-relaxed text-slate-600">
                  <p>
                    1. This identity card is issued by <strong>God's Hand International Model School</strong> and must be produced whenever requested by authorized school personnel.
                  </p>
                  <p>
                    2. It is non-transferable and remains valid as long as the student is enrolled.
                  </p>
                  <p>
                    3. If found, please return to the school premises or contact the bursary desk.
                  </p>

                  <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl space-y-0.5 text-amber-900">
                    <span className="text-[9px] font-black uppercase tracking-wider text-amber-700 block">
                      Emergency Contact / Parent Phone:
                    </span>
                    <strong className="text-xs font-mono font-black text-blue-950 block">
                      📞 {parentEmergencyPhone} / 07085596586
                    </strong>
                  </div>

                  <div className="flex justify-between items-end pt-1">
                    <div className="space-y-0.5">
                      <div className="w-24 border-b border-slate-400 font-serif italic text-[10px] text-blue-950 font-black">
                        Proprietor
                      </div>
                      <span className="text-[8px] text-slate-400 font-bold uppercase">Authorized Signatory</span>
                    </div>

                    <div className="shrink-0 p-1 bg-white border border-slate-200 rounded-lg shadow-xs">
                      <QRCodeSVG value={qrData} size={48} level="M" />
                    </div>
                  </div>
                </div>

                <div className="bg-slate-900 text-slate-300 px-4 py-1.5 text-center text-[8px] font-medium truncate">
                  Wire & Cable Axis, Apata, Ibadan, Oyo State • Godshandschool70@gmail.com
                </div>
              </>
            )}
          </div>
        </div>

        {/* Download & Print Actions */}
        <div className="space-y-3 pt-2">
          <button
            type="button"
            onClick={handleDownloadPDF}
            className="w-full py-4 bg-blue-900 hover:bg-blue-800 text-yellow-400 font-black text-xs uppercase tracking-wider rounded-2xl shadow-xl transition-all flex items-center justify-center gap-2 border-2 border-yellow-400 hover:scale-[1.01] active:scale-[0.99]"
          >
            <span>📥</span>
            <span>Download Official Student ID Card (PDF)</span>
          </button>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-1.5"
            >
              <span>🖨️</span>
              <span>Print ID Card</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-black text-xs uppercase rounded-xl transition-all"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
