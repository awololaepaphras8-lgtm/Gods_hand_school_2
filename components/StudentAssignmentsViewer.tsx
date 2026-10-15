import React, { useState } from 'react';
import { Assignment, AssignmentSubmission, StudentAccount } from '../types';

interface StudentAssignmentsViewerProps {
  student: StudentAccount;
  assignments: Assignment[];
  submissions: AssignmentSubmission[];
  onSubmitAnswer: (submission: AssignmentSubmission) => void;
}

export const StudentAssignmentsViewer: React.FC<StudentAssignmentsViewerProps> = ({
  student,
  assignments,
  submissions,
  onSubmitAnswer
}) => {
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [writtenAnswer, setWrittenAnswer] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [attachmentName, setAttachmentName] = useState('');
  const [attachmentType, setAttachmentType] = useState<'document' | 'picture' | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState('');
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Filter assignments matching the student's current grade
  // Also support matching 'SS 1 (Science)' or 'SS 1 (Commerce & Arts)' to 'SSS 1'
  const studentGradeClean = (student.grade || '').trim().toLowerCase();
  
  const classAssignments = assignments.filter(a => {
    const assignGrade = (a.grade || '').trim().toLowerCase();
    if (assignGrade === studentGradeClean) return true;
    if (studentGradeClean.includes('ss 1') && assignGrade.includes('sss 1')) return true;
    if (studentGradeClean.includes('ss 2') && assignGrade.includes('sss 2')) return true;
    if (studentGradeClean.includes('ss 3') && assignGrade.includes('sss 3')) return true;
    if (assignGrade.includes('all senior') && (studentGradeClean.includes('ss') || studentGradeClean.includes('sss'))) return true;
    if (assignGrade.includes('all junior') && (studentGradeClean.includes('jss') || studentGradeClean.includes('basic 7') || studentGradeClean.includes('basic 8') || studentGradeClean.includes('basic 9'))) return true;
    return false;
  });

  const getSubmissionFor = (assignmentId: string): AssignmentSubmission | undefined => {
    return submissions.find(
      s => s.assignmentId === assignmentId && (s.studentId === student.id || s.studentName.toLowerCase() === student.name.toLowerCase())
    );
  };

  const handleOpenAssignment = (assignment: Assignment) => {
    setSelectedAssignment(assignment);
    const existing = getSubmissionFor(assignment.id);
    if (existing) {
      setWrittenAnswer(existing.writtenAnswer || '');
      setAttachmentUrl(existing.attachmentUrl || '');
      setAttachmentName(existing.attachmentName || '');
      setAttachmentType(existing.attachmentType);
    } else {
      setWrittenAnswer('');
      setAttachmentUrl('');
      setAttachmentName('');
      setAttachmentType(undefined);
    }
    setSubmitSuccess('');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      alert('File size exceeds the 15MB limit.');
      return;
    }

    const isImage = file.type.startsWith('image/');
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setAttachmentUrl(result);
      setAttachmentName(file.name);
      setAttachmentType(isImage ? 'picture' : 'document');
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssignment) return;

    if (!writtenAnswer.trim() && !attachmentUrl) {
      alert('Please provide a written answer or upload your completed document/photo.');
      return;
    }

    setIsSubmitting(true);
    const existing = getSubmissionFor(selectedAssignment.id);

    const submission: AssignmentSubmission = {
      id: existing ? existing.id : `SUB-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      assignmentId: selectedAssignment.id,
      studentId: student.id,
      studentName: student.name,
      grade: student.grade,
      writtenAnswer: writtenAnswer.trim() || undefined,
      attachmentUrl: attachmentUrl || undefined,
      attachmentName: attachmentName || undefined,
      attachmentType: attachmentType,
      submittedAt: new Date().toISOString(),
      status: existing?.status === 'graded' ? 'graded' : 'submitted',
      score: existing?.score,
      feedback: existing?.feedback,
      gradedBy: existing?.gradedBy,
      gradedAt: existing?.gradedAt
    };

    onSubmitAnswer(submission);
    setIsSubmitting(false);
    setSubmitSuccess('Your homework has been submitted successfully to the teacher/admin!');
    setTimeout(() => setSubmitSuccess(''), 4000);
  };

  return (
    <div className="bg-white rounded-[2rem] p-6 sm:p-8 shadow-xl border-2 border-slate-100 mt-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b-2 border-slate-50 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">📝</span>
            <h3 className="text-2xl font-black text-blue-900 font-serif">
              Class Homework & Assignments
            </h3>
          </div>
          <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-wider">
            Official curriculum coursework for {student.grade} (Basic 5 to SS 3)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 bg-blue-50 text-blue-900 border border-blue-200 rounded-xl text-xs font-black">
            {classAssignments.length} Assignment{classAssignments.length === 1 ? '' : 's'} Available
          </span>
        </div>
      </div>

      {/* Assignment List */}
      {classAssignments.length === 0 ? (
        <div className="py-12 text-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 my-6">
          <span className="text-4xl block mb-2">🎉</span>
          <p className="text-sm font-black text-blue-900 uppercase tracking-wider">No Pending Homework</p>
          <p className="text-xs text-slate-500 mt-1">There are currently no active assignments posted for {student.grade}.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4 mt-6">
          {classAssignments.map((assignment) => {
            const submission = getSubmissionFor(assignment.id);
            const isDuePassed = new Date(assignment.dueDate).getTime() < Date.now();
            const formatBadge = {
              written: { label: '✍️ Written Questions', bg: 'bg-amber-100 text-amber-900' },
              document: { label: '📄 Document Sheet', bg: 'bg-emerald-100 text-emerald-900' },
              picture: { label: '🖼️ Diagram / Picture', bg: 'bg-purple-100 text-purple-900' },
              hybrid: { label: '📑 Multi-Format', bg: 'bg-indigo-100 text-indigo-900' }
            }[assignment.assignmentType || 'written'];

            return (
              <div 
                key={assignment.id}
                className="p-5 rounded-2xl border-2 border-slate-100 bg-slate-50 hover:bg-white hover:border-blue-200 hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-900">
                      {assignment.subject}
                    </span>
                    <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${formatBadge.bg}`}>
                      {formatBadge.label}
                    </span>
                  </div>

                  <h4 className="font-serif font-black text-blue-950 text-base mb-1.5 leading-snug">
                    {assignment.title}
                  </h4>

                  <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed mb-3">
                    {assignment.description}
                  </p>

                  <div className="flex flex-wrap items-center gap-3 text-[11px] font-medium text-slate-500 mb-4">
                    <span>⏳ Due: {new Date(assignment.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                    <span>•</span>
                    <span>🎯 {assignment.totalPoints} Marks</span>
                    {assignment.attachmentName && (
                      <>
                        <span>•</span>
                        <span className="text-blue-700 font-bold truncate max-w-[150px]">
                          📎 {assignment.attachmentName}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-200/80">
                  {submission ? (
                    submission.status === 'graded' ? (
                      <span className="px-2.5 py-1 bg-green-100 text-green-800 rounded-lg text-[10px] font-black uppercase">
                        ✅ Graded: {submission.score}/{assignment.totalPoints}
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 bg-blue-100 text-blue-800 rounded-lg text-[10px] font-black uppercase">
                        ✓ Submitted
                      </span>
                    )
                  ) : isDuePassed ? (
                    <span className="px-2.5 py-1 bg-red-100 text-red-700 rounded-lg text-[10px] font-black uppercase">
                      ⚠️ Overdue
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 bg-amber-100 text-amber-800 rounded-lg text-[10px] font-black uppercase">
                      ⏳ Pending Answer
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={() => handleOpenAssignment(assignment)}
                    className="px-4 py-2 bg-blue-900 hover:bg-blue-800 text-yellow-400 font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-xs"
                  >
                    {submission ? 'View / Resubmit →' : 'Open & Solve →'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Assignment Detail & Submission Modal */}
      {selectedAssignment && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-6 bg-blue-950/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-[2.5rem] p-6 sm:p-8 max-w-2xl w-full max-h-[92vh] overflow-y-auto shadow-2xl relative my-auto animate-in zoom-in duration-200 text-left">
            <button
              type="button"
              onClick={() => setSelectedAssignment(null)}
              className="absolute top-6 right-6 text-slate-400 hover:text-red-500 font-black text-xl p-2"
            >
              ✕
            </button>

            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-1 bg-blue-100 text-blue-950 font-black text-[10px] uppercase rounded-full">
                {selectedAssignment.subject}
              </span>
              <span className="px-2.5 py-1 bg-yellow-100 text-yellow-900 font-black text-[10px] uppercase rounded-full">
                {selectedAssignment.grade}
              </span>
              <span className="text-[11px] font-bold text-slate-400">
                • Max {selectedAssignment.totalPoints} Marks
              </span>
            </div>

            <h3 className="text-2xl font-black text-blue-900 font-serif mb-3">
              {selectedAssignment.title}
            </h3>

            {/* Written Question / Description Section */}
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 mb-6">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 mb-2">
                ✍️ Instructions & Questions:
              </h4>
              <div className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed font-sans">
                {selectedAssignment.description}
              </div>
            </div>

            {/* Attachment if document or picture */}
            {selectedAssignment.attachmentUrl && (
              <div className="mb-6 p-4 rounded-2xl bg-blue-50 border border-blue-200">
                <h4 className="text-xs font-black uppercase tracking-wider text-blue-900 mb-2">
                  📎 Attached Resource:
                </h4>

                {selectedAssignment.attachmentType === 'picture' || selectedAssignment.attachmentName?.match(/\.(png|jpe?g|webp|gif)$/i) ? (
                  <div className="space-y-3">
                    <div 
                      onClick={() => setPreviewImage(selectedAssignment.attachmentUrl || null)}
                      className="cursor-pointer group relative rounded-xl overflow-hidden border-2 border-blue-200 max-h-64 flex items-center justify-center bg-white"
                    >
                      <img 
                        src={selectedAssignment.attachmentUrl} 
                        alt={selectedAssignment.attachmentName || 'Assignment Diagram'}
                        className="max-h-64 w-auto object-contain transition-transform group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-blue-950/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white font-bold text-xs uppercase gap-1">
                        <span>🔍 Click to View Full Size</span>
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-500 italic">
                      Click image above to view full-resolution diagram/chart.
                    </p>
                  </div>
                ) : (
                  <div className="flex items-center justify-between bg-white p-3.5 rounded-xl border border-blue-100">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">📄</span>
                      <div>
                        <p className="text-xs font-black text-blue-950 truncate max-w-[280px]">
                          {selectedAssignment.attachmentName || 'Assignment Worksheet'}
                        </p>
                        <p className="text-[10px] text-slate-400 uppercase font-bold">
                          Document Worksheet
                        </p>
                      </div>
                    </div>
                    <a
                      href={selectedAssignment.attachmentUrl}
                      download={selectedAssignment.attachmentName || 'assignment_worksheet'}
                      className="px-3.5 py-2 bg-blue-900 hover:bg-blue-800 text-yellow-400 font-black text-[11px] uppercase rounded-xl transition-all shadow-xs"
                    >
                      📥 Download File
                    </a>
                  </div>
                )}
              </div>
            )}

            {/* Previous Submission Info / Grade */}
            {(() => {
              const prevSub = getSubmissionFor(selectedAssignment.id);
              if (!prevSub) return null;

              return (
                <div className={`p-4 rounded-2xl mb-6 border ${prevSub.status === 'graded' ? 'bg-green-50 border-green-200' : 'bg-blue-50 border-blue-200'}`}>
                  <div className="flex justify-between items-center mb-1">
                    <h5 className="font-black text-xs uppercase tracking-wider text-slate-700">
                      {prevSub.status === 'graded' ? '🏆 Graded Feedback' : '📋 Submitted Solution'}
                    </h5>
                    <span className="text-[10px] text-slate-400">
                      Submitted: {new Date(prevSub.submittedAt).toLocaleDateString()}
                    </span>
                  </div>

                  {prevSub.score !== undefined && (
                    <div className="text-lg font-black text-green-800 my-1">
                      Score: {prevSub.score} / {selectedAssignment.totalPoints} marks
                    </div>
                  )}

                  {prevSub.feedback && (
                    <div className="text-xs text-slate-700 mt-2 bg-white p-3 rounded-xl border border-green-100">
                      <span className="font-bold text-slate-900">Teacher's Note:</span> {prevSub.feedback}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Submission Form */}
            <form onSubmit={handleSubmit} className="space-y-4 pt-2 border-t border-slate-100">
              <h4 className="font-black text-sm text-blue-900 font-serif">
                Submit Your Solution:
              </h4>

              <div>
                <label className="block text-xs font-black text-slate-700 uppercase mb-1">
                  1. Written Answers / Calculations:
                </label>
                <textarea
                  value={writtenAnswer}
                  onChange={(e) => setWrittenAnswer(e.target.value)}
                  placeholder="Type your answers, step-by-step working, or essay here..."
                  rows={4}
                  className="w-full p-3.5 border-2 border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:border-blue-900 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-700 uppercase mb-1">
                  2. Upload Worksheet / Photo of Handwritten Work (Optional):
                </label>
                <input
                  type="file"
                  accept="image/*,.pdf,.doc,.docx,.txt"
                  onChange={handleFileUpload}
                  className="w-full text-xs text-slate-600 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-black file:bg-blue-50 file:text-blue-900 hover:file:bg-blue-100 cursor-pointer"
                />
                {attachmentName && (
                  <p className="text-xs text-emerald-700 font-bold mt-1">
                    ✓ Ready to upload: {attachmentName}
                  </p>
                )}
              </div>

              {submitSuccess && (
                <div className="p-3 bg-emerald-50 text-emerald-800 text-xs font-black rounded-xl border border-emerald-200">
                  {submitSuccess}
                </div>
              )}

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setSelectedAssignment(null)}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs uppercase tracking-wider rounded-xl transition-all"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-3 bg-blue-900 hover:bg-blue-800 text-yellow-400 font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md disabled:bg-slate-300"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Homework'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Image Preview Zoom Modal */}
      {previewImage && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
          <div className="max-w-4xl w-full text-center relative">
            <button
              type="button"
              onClick={() => setPreviewImage(null)}
              className="absolute -top-12 right-0 text-white hover:text-yellow-400 font-black text-2xl p-2"
            >
              ✕ Close Preview
            </button>
            <img 
              src={previewImage} 
              alt="Diagram Zoom" 
              className="max-h-[85vh] w-auto mx-auto rounded-2xl shadow-2xl object-contain border border-white/20 bg-white"
            />
          </div>
        </div>
      )}
    </div>
  );
};
