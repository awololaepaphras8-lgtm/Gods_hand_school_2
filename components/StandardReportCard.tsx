import React, { useRef, useState } from 'react';
import { StudentAccount, StudentResult } from '../types';
import { QRCodeSVG } from 'qrcode.react';
import { computeClassRankings } from '../utils/ranking';

interface StandardReportCardProps {
  student: StudentAccount;
  results: StudentResult[];
  allResults?: StudentResult[];
  allStudents?: StudentAccount[];
  classPosition?: string;
  term?: string;
  session?: string;
  onClose?: () => void;
  showControls?: boolean;
}

export const StandardReportCard: React.FC<StandardReportCardProps> = ({
  student,
  results,
  allResults,
  allStudents,
  classPosition,
  term = 'First Term',
  session = '2025/2026 Academic Session',
  onClose,
  showControls = true,
}) => {
  const [activeTerm, setActiveTerm] = useState<string>(term === 'all' ? 'First Term' : term);
  const [showDownloadGuidance, setShowDownloadGuidance] = useState<boolean>(false);

  // Filter results for active term
  const termResults = results.filter(
    r => r.term.toLowerCase() === activeTerm.toLowerCase() ||
      (activeTerm === 'All Terms' && true)
  );

  // Fallback results if none exist yet to showcase standard report card structure
  const displayResults = termResults.length > 0 ? termResults : results;

  // Calculate scores
  const totalScore = displayResults.reduce((sum, r) => sum + r.score, 0);
  const maxAttainable = displayResults.length * 100;
  const averageScore = displayResults.length > 0 ? (totalScore / displayResults.length).toFixed(1) : '0';
  const averageNum = parseFloat(averageScore);

  // Compute student position in class
  const classResultsPool = allResults || results;
  const classStudentsPool = allStudents && allStudents.length > 0 ? allStudents : [student];
  const rankingsMap = computeClassRankings(classResultsPool, classStudentsPool, student.grade, activeTerm);
  const studentRank = rankingsMap.get(student.id);
  const displayPosition = classPosition || studentRank?.positionOrdinal || '1st';
  const totalInClass = studentRank?.totalStudentsInClass || classStudentsPool.filter(s => s.grade === student.grade).length || 1;

  // Grading helper
  const getGradeInfo = (score: number) => {
    if (score >= 75) return { grade: 'A', remark: 'Distinction', color: 'text-emerald-800 bg-emerald-50 border-emerald-300' };
    if (score >= 65) return { grade: 'B', remark: 'Very Good', color: 'text-blue-800 bg-blue-50 border-blue-300' };
    if (score >= 50) return { grade: 'C', remark: 'Credit', color: 'text-amber-800 bg-amber-50 border-amber-300' };
    if (score >= 40) return { grade: 'D', remark: 'Pass', color: 'text-orange-800 bg-orange-50 border-orange-300' };
    return { grade: 'F', remark: 'Needs Support', color: 'text-rose-800 bg-rose-50 border-rose-300' };
  };

  // Trigger print / save as PDF
  const handlePrintPDF = () => {
    setShowDownloadGuidance(true);
    setTimeout(() => {
      window.print();
    }, 300);
  };

  const qrData = `GHS-OFFICIAL-RESULT|${student.id}|${student.name}|${student.grade}|${activeTerm}|${session}|AVG:${averageScore}%`;

  return (
    <div className="standard-report-wrapper w-full">
      {/* Download Action Bar (Hidden on Print) */}
      {showControls && (
        <div className="no-print bg-gradient-to-r from-blue-900 to-indigo-900 rounded-3xl p-5 mb-6 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-4 border-2 border-yellow-400">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 bg-yellow-400 text-blue-950 rounded-2xl flex items-center justify-center font-black text-2xl shadow-md">
              📄
            </div>
            <div>
              <h3 className="font-serif font-black text-lg text-yellow-300">
                Official Student & Pupil Report Dossier
              </h3>
              <p className="text-xs text-blue-200">
                Standard Oyo State Ministry of Education & British Curriculum Format
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Term Filter */}
            <select
              value={activeTerm}
              onChange={(e) => setActiveTerm(e.target.value)}
              className="px-3.5 py-2.5 bg-blue-950 text-yellow-300 border border-yellow-400/60 rounded-xl text-xs font-black outline-none cursor-pointer"
            >
              <option value="First Term">First Term</option>
              <option value="Second Term">Second Term</option>
              <option value="Third Term">Third Term</option>
            </select>

            {/* Print & Download PDF Button */}
            <button
              onClick={handlePrintPDF}
              className="px-5 py-2.5 bg-yellow-400 hover:bg-yellow-300 text-blue-950 rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow-md active:scale-95 flex items-center gap-2"
              title="Download official PDF or Print standard report card"
            >
              <span className="text-base">📥</span>
              <span>Download PDF / Print</span>
            </button>

            {onClose && (
              <button
                onClick={onClose}
                className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold text-xs transition-colors"
              >
                ✕ Close
              </button>
            )}
          </div>
        </div>
      )}

      {/* PDF Download Guidance Tooltip (Visible before or after print) */}
      {showDownloadGuidance && (
        <div className="no-print mb-4 p-4 bg-amber-50 border-2 border-yellow-400 rounded-2xl text-amber-900 text-xs font-bold flex items-center justify-between gap-3 shadow-md animate-fade-in">
          <div className="flex items-center gap-2">
            <span className="text-xl">💡</span>
            <span>
              <strong>How to save as PDF:</strong> In the print popup window, set <span className="bg-yellow-200 px-1.5 py-0.5 rounded text-blue-950 font-black">Destination: Save as PDF</span>, enable <span className="underline">Background graphics</span>, and click <strong>Save</strong>.
            </span>
          </div>
          <button 
            onClick={() => setShowDownloadGuidance(false)}
            className="text-amber-800 hover:text-black font-black text-sm px-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* THE OFFICIAL REPORT CARD CONTAINER (Rendered on screen & prints perfectly on A4) */}
      <div 
        id="official-student-report-card"
        className="standard-report-card bg-white rounded-3xl p-6 sm:p-10 border-4 border-blue-900 shadow-2xl relative overflow-hidden text-slate-900 print:rounded-none print:shadow-none print:border-2 print:border-slate-800 print:p-4 print:max-w-none print:w-full"
      >
        {/* Subtle Watermark in background */}
        <div 
          className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none select-none z-0"
          aria-hidden="true"
        >
          <img 
            src="/logo.png" 
            alt="Watermark" 
            className="w-[500px] h-[500px] object-contain"
            onError={(e) => { e.currentTarget.src = 'hands.jpg'; }}
          />
        </div>

        {/* ===================== 1. OFFICIAL SCHOOL CREST & HEADER ===================== */}
        <div className="relative z-10 border-b-4 border-double border-blue-900 pb-5 mb-5">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Left: School Crest Logo */}
            <div className="w-24 h-24 sm:w-28 sm:h-28 shrink-0 bg-white p-1 rounded-2xl border-2 border-yellow-400 shadow-md flex items-center justify-center overflow-hidden">
              <img 
                src="/logo.png" 
                alt="God's Hand International Model School Logo Crest" 
                className="w-full h-full object-contain"
                onError={(e) => { e.currentTarget.src = 'hands.jpg'; }}
              />
            </div>

            {/* Center: School Official Title & Motto */}
            <div className="text-center flex-1 px-2">
              <h1 className="font-serif font-black text-xl sm:text-2xl md:text-3xl text-blue-950 uppercase tracking-tight leading-tight">
                God's Hand International Model School
              </h1>
              <div className="inline-block bg-blue-900 text-yellow-400 text-[10px] sm:text-xs font-black uppercase tracking-widest px-3 py-0.5 rounded-full my-1 border border-yellow-400">
                Government Approved • Crèche, Nursery, Primary & College
              </div>
              <p className="text-[11px] font-bold italic text-blue-900 font-serif">
                Motto: "Have Faith in God — Building Lives Upon The Solid Rock"
              </p>
              <p className="text-[10px] sm:text-[11px] text-slate-600 font-medium mt-0.5">
                Oluwatedo Ire-Akari, Orisunmibare Area, Wire & Cable Axis, Apata, Ibadan, Oyo State
              </p>
              <p className="text-[9px] sm:text-[10px] text-slate-500 font-bold">
                Tel: +234 805 650 7252 • Email: godshandschool70@gmail.com • Web: www.godshandmodelschool.sch.ng
              </p>
            </div>

            {/* Right: Official Verification QR Code */}
            <div className="shrink-0 flex flex-col items-center bg-slate-50 p-2 rounded-xl border border-slate-200">
              <QRCodeSVG 
                value={qrData}
                size={70}
                level="M"
                includeMargin={false}
              />
              <span className="text-[8px] font-black uppercase text-blue-900 tracking-tighter mt-1">
                Official Seal
              </span>
            </div>
          </div>

          {/* Sub-Header Banner */}
          <div className="mt-4 bg-gradient-to-r from-blue-950 via-blue-900 to-blue-950 text-white py-2 px-4 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-2 border-t-2 border-b-2 border-yellow-400">
            <span className="font-serif font-black text-xs sm:text-sm uppercase tracking-wider text-yellow-300">
              Terminal Continuous Assessment Report Dossier
            </span>
            <div className="flex items-center gap-3 text-[11px] font-black">
              <span className="bg-yellow-400 text-blue-950 px-2.5 py-0.5 rounded-md uppercase">
                {activeTerm}
              </span>
              <span className="text-slate-200">
                {session}
              </span>
            </div>
          </div>
        </div>

        {/* ===================== 2. PUPIL / STUDENT BIO-DATA ===================== */}
        <div className="relative z-10 bg-slate-50/90 rounded-2xl p-4 border border-slate-200 mb-5 text-xs">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <span className="block text-[9px] font-black uppercase tracking-wider text-slate-400">Pupil / Student Name:</span>
              <span className="font-black text-blue-950 text-sm">{student.name}</span>
            </div>
            <div>
              <span className="block text-[9px] font-black uppercase tracking-wider text-slate-400">Admission / Student ID:</span>
              <span className="font-mono font-black text-blue-900">{student.id}</span>
            </div>
            <div>
              <span className="block text-[9px] font-black uppercase tracking-wider text-slate-400">Class / Grade Level:</span>
              <span className="font-black text-indigo-900 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200 inline-block">
                {student.grade}
              </span>
            </div>
            <div>
              <span className="block text-[9px] font-black uppercase tracking-wider text-slate-400">Academic Session:</span>
              <span className="font-bold text-slate-700">{session}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3 pt-2.5 border-t border-slate-200">
            <div>
              <span className="block text-[9px] font-black uppercase tracking-wider text-slate-400">School Term:</span>
              <span className="font-black text-blue-900">{activeTerm}</span>
            </div>
            <div>
              <span className="block text-[9px] font-black uppercase tracking-wider text-slate-400">Year Started School:</span>
              <span className="font-black text-blue-950 bg-yellow-100 px-2 py-0.5 rounded border border-yellow-300 inline-block">
                {student.admissionYear || 2024}
              </span>
            </div>
            <div>
              <span className="block text-[9px] font-black uppercase tracking-wider text-slate-400">Class Position:</span>
              <span className="font-black text-blue-900 bg-blue-100 px-2 py-0.5 rounded inline-block">
                {displayPosition} of {totalInClass}
              </span>
            </div>
            <div>
              <span className="block text-[9px] font-black uppercase tracking-wider text-slate-400">Next Term Resumption:</span>
              <span className="font-black text-emerald-800">12th January, 2026</span>
            </div>
          </div>
        </div>

        {/* ===================== 3. COGNITIVE ACADEMIC PERFORMANCE TABLE ===================== */}
        <div className="relative z-10 mb-5 overflow-x-auto">
          <table className="w-full text-left border-collapse border border-slate-300 text-xs">
            <thead>
              <tr className="bg-blue-950 text-white font-black text-[10px] uppercase tracking-wider">
                <th className="p-2 border border-slate-400 text-center w-8">S/N</th>
                <th className="p-2 border border-slate-400">Subject Description</th>
                <th className="p-2 border border-slate-400 text-center w-16">C.A. (40)</th>
                <th className="p-2 border border-slate-400 text-center w-16">Exam (60)</th>
                <th className="p-2 border border-slate-400 text-center w-20">Total (100)</th>
                <th className="p-2 border border-slate-400 text-center w-12">Grade</th>
                <th className="p-2 border border-slate-400 text-center w-28">Ministry Remark</th>
                <th className="p-2 border border-slate-400 text-left w-32">Staff Signature</th>
              </tr>
            </thead>
            <tbody>
              {displayResults.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400 font-bold uppercase tracking-widest border border-slate-300">
                    No academic assessment records published for this term yet.
                  </td>
                </tr>
              ) : (
                displayResults.map((r, idx) => {
                  const caScore = r.caScore !== undefined ? r.caScore : Math.round(r.score * 0.4);
                  const examScore = r.examScore !== undefined ? r.examScore : (r.score - caScore);
                  const gradeInfo = getGradeInfo(r.score);

                  return (
                    <tr 
                      key={r.id || idx} 
                      className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/80'}
                    >
                      <td className="p-2 border border-slate-300 text-center font-bold text-slate-500">
                        {idx + 1}
                      </td>
                      <td className="p-2 border border-slate-300 font-black text-blue-950">
                        {r.subject}
                      </td>
                      <td className="p-2 border border-slate-300 text-center font-mono font-bold text-slate-700">
                        {caScore}
                      </td>
                      <td className="p-2 border border-slate-300 text-center font-mono font-bold text-slate-700">
                        {examScore}
                      </td>
                      <td className="p-2 border border-slate-300 text-center font-mono font-black text-sm text-blue-900">
                        {r.score}%
                      </td>
                      <td className="p-2 border border-slate-300 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded font-black text-[11px] border ${gradeInfo.color}`}>
                          {gradeInfo.grade}
                        </span>
                      </td>
                      <td className="p-2 border border-slate-300 text-center font-bold text-[11px] text-slate-700">
                        {gradeInfo.remark}
                      </td>
                      <td className="p-2 border border-slate-300 text-slate-500 font-serif italic text-[10px]">
                        {r.teacherName || 'GHS Staff ✓'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ===================== 4. PERFORMANCE SUMMARY & RATING KEY ===================== */}
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-12 gap-4 mb-5 text-xs">
          {/* Summary Scorecard (Left 7 Cols) */}
          <div className="md:col-span-7 bg-blue-50/60 rounded-2xl p-4 border border-blue-200">
            <h4 className="font-serif font-black text-blue-950 uppercase text-[11px] tracking-wider mb-2.5 border-b border-blue-200 pb-1 flex justify-between">
              <span>Terminal Performance Analysis</span>
              <span className="text-blue-700">Oyo State Ministry Standards</span>
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
              <div className="bg-white p-2.5 rounded-xl border border-blue-100 shadow-xs">
                <span className="block text-[9px] font-black uppercase text-slate-400">Total Marks</span>
                <span className="font-mono font-black text-blue-950 text-sm sm:text-base">{totalScore} / {maxAttainable}</span>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-blue-100 shadow-xs">
                <span className="block text-[9px] font-black uppercase text-slate-400">Cumulative Avg</span>
                <span className="font-mono font-black text-emerald-700 text-sm sm:text-base">{averageScore}%</span>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-blue-100 shadow-xs">
                <span className="block text-[9px] font-black uppercase text-slate-400">Class Position</span>
                <span className="font-serif font-black text-blue-950 text-sm sm:text-base block">
                  {displayPosition}
                </span>
                <span className="text-[8px] text-slate-400 block">of {totalInClass} pupils</span>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-blue-100 shadow-xs">
                <span className="block text-[9px] font-black uppercase text-slate-400">Terminal Decision</span>
                <span className="font-black text-blue-900 text-[11px] mt-1 block">
                  {averageNum >= 50 ? 'PASSED / PROMOTED' : 'UNDER REMEDIATION'}
                </span>
              </div>
            </div>

            {/* Grading Scale Legend */}
            <div className="mt-3 pt-2 border-t border-blue-200/60 flex flex-wrap items-center justify-between text-[10px] text-slate-600 font-bold">
              <span><strong>A:</strong> 75-100% (Distinction)</span>
              <span><strong>B:</strong> 65-74% (Very Good)</span>
              <span><strong>C:</strong> 50-64% (Credit)</span>
              <span><strong>D:</strong> 40-49% (Pass)</span>
              <span><strong>F:</strong> 0-39% (Fail)</span>
            </div>
          </div>

          {/* Affective & Behavioural Domain (Right 5 Cols) */}
          <div className="md:col-span-5 bg-slate-50 rounded-2xl p-4 border border-slate-200">
            <h4 className="font-serif font-black text-blue-950 uppercase text-[11px] tracking-wider mb-2 border-b border-slate-200 pb-1">
              Affective & Character Rating (1-5)
            </h4>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
              <div className="flex justify-between">
                <span className="text-slate-500">Punctuality:</span>
                <span className="font-black text-blue-900">5 / 5</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Neatness & Uniform:</span>
                <span className="font-black text-blue-900">5 / 5</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Politeness:</span>
                <span className="font-black text-blue-900">5 / 5</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Honesty & Trust:</span>
                <span className="font-black text-blue-900">5 / 5</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Attentiveness:</span>
                <span className="font-black text-blue-900">4 / 5</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Handwriting:</span>
                <span className="font-black text-blue-900">5 / 5</span>
              </div>
            </div>
          </div>
        </div>

        {/* ===================== 5. OFFICIAL ENDORSEMENTS, REMARKS & STAMP ===================== */}
        <div className="relative z-10 pt-4 border-t-2 border-slate-300">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 items-end">
            {/* Class Teacher's Remark */}
            <div className="sm:col-span-5 space-y-1">
              <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider block">
                Class Teacher's Observation & Remark:
              </span>
              <p className="text-xs font-serif italic text-blue-950 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                "{averageNum >= 70 
                  ? "An exceptionally brilliant, diligent and disciplined pupil. Demonstrates wonderful leadership qualities."
                  : averageNum >= 50
                  ? "A commendable effort this term with sound understanding. Encouraged to aim higher next session."
                  : "Needs close monitoring and sustained revision in core foundational subjects."}"
              </p>
              <div className="pt-2 flex items-center justify-between text-[10px] text-slate-500">
                <span>Sign: <span className="font-serif italic font-bold text-blue-900">Adeyemi T. (Staff)</span></span>
                <span>Date: {new Date().toLocaleDateString()}</span>
              </div>
            </div>

            {/* Official School Stamp (Center) */}
            <div className="sm:col-span-3 flex justify-center py-2">
              <div className="w-24 h-24 rounded-full border-4 border-dashed border-blue-900 text-blue-900 flex flex-col items-center justify-center text-center p-1 transform -rotate-6 bg-blue-50/50 shadow-inner">
                <span className="text-[7px] font-black uppercase tracking-tighter">God's Hand Int'l</span>
                <span className="text-xs">⭐ APPROVED ⭐</span>
                <span className="text-[7px] font-black uppercase">Model School</span>
                <span className="text-[6px] font-mono text-slate-500 mt-0.5">{new Date().toLocaleDateString()}</span>
              </div>
            </div>

            {/* Principal / Headteacher Endorsement */}
            <div className="sm:col-span-4 space-y-1 text-right sm:text-right">
              <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider block">
                Principal / Head of School's Endorsement:
              </span>
              <p className="text-xs font-serif italic text-blue-950 bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-left">
                "{averageNum >= 65 
                  ? "An outstanding performance. Approved for commendation and advancement." 
                  : "Promising result. Consistent practice will yield great fruit."}"
              </p>
              <div className="pt-2 text-[10px] text-slate-600">
                <div className="w-36 h-0.5 bg-blue-950 ml-auto mb-1"></div>
                <p className="font-black text-blue-950 uppercase">Dr. / Mrs. Proprietor & Head</p>
                <p className="text-[9px] text-slate-400 font-mono">Official Authority Seal & Sign</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Disclaimer */}
        <div className="mt-6 pt-3 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-[9px] text-slate-400 font-medium gap-2">
          <span>* Any alteration or erasure renders this official report slip invalid.</span>
          <span>Certified by God's Hand International Model School Academic Board • Oyo State, Nigeria</span>
        </div>
      </div>
    </div>
  );
};
