import React, { useState } from 'react';
import { Assignment, AssignmentSubmission, GradeLevel } from '../types';

interface AdminAssignmentsManagerProps {
  assignments: Assignment[];
  onAddAssignment: (assignment: Assignment) => void;
  onUpdateAssignment: (assignment: Assignment) => void;
  onDeleteAssignment: (id: string) => void;
  activeTerm?: string;
  adminName?: string;
}

// Target grades requested: Basic 5 to SS 3
export const ELIGIBLE_ASSIGNMENT_GRADES: GradeLevel[] = [
  'Basic 5',
  'JSS 1',
  'JSS 2',
  'JSS 3',
  'SSS 1',
  'SSS 2',
  'SSS 3',
  'SS 1 (Science)',
  'SS 1 (Commerce & Arts)',
  'SS 2 (Science)',
  'SS 2 (Commerce & Arts)',
  'SS 3 (Science)',
  'SS 3 (Commerce & Arts)'
];

const SECONDARY_SUBJECTS = [
  'Mathematics',
  'English Language',
  'Basic Science',
  'Basic Technology',
  'Computer Studies / ICT',
  'Civic Education',
  'Agricultural Science',
  'Physics',
  'Chemistry',
  'Biology',
  'Economics',
  'Government',
  'Financial Accounting',
  'Commerce',
  'Literature in English',
  'Further Mathematics',
  'Geography',
  'Christian Religious Studies (CRS)',
  'Islamic Religious Studies (IRS)'
];

export const AdminAssignmentsManager: React.FC<AdminAssignmentsManagerProps> = ({
  assignments,
  onAddAssignment,
  onUpdateAssignment,
  onDeleteAssignment,
  activeTerm = 'First Term',
  adminName = 'School Administrator'
}) => {
  // Modal / Form state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [viewingSubmissionsFor, setViewingSubmissionsFor] = useState<Assignment | null>(null);

  // Form Fields
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState(SECONDARY_SUBJECTS[0]);
  const [customSubject, setCustomSubject] = useState('');
  const [targetGrade, setTargetGrade] = useState<GradeLevel>('Basic 5');
  const [description, setDescription] = useState('');
  const [formatType, setFormatType] = useState<'written' | 'document' | 'picture' | 'hybrid'>('written');
  const [dueDate, setDueDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  });
  const [totalPoints, setTotalPoints] = useState<number>(100);

  // Document Attachment State
  const [docName, setDocName] = useState('');
  const [docUrl, setDocUrl] = useState('');
  const [docSizeBytes, setDocSizeBytes] = useState<number>(0);

  // Picture Attachment State
  const [picName, setPicName] = useState('');
  const [picUrl, setPicUrl] = useState('');
  const [picSizeBytes, setPicSizeBytes] = useState<number>(0);

  // Filters
  const [filterGrade, setFilterGrade] = useState<string>('all');
  const [filterSubject, setFilterSubject] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // File Handler for Documents (PDF, DOCX, TXT)
  const handleDocumentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      alert('File is too large! Maximum document attachment size is 15MB.');
      return;
    }

    setDocName(file.name);
    setDocSizeBytes(file.size);

    const reader = new FileReader();
    reader.onload = () => {
      setDocUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // File Handler for Pictures (PNG, JPG, WEBP)
  const handlePictureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 12 * 1024 * 1024) {
      alert('Image file is too large! Maximum picture attachment size is 12MB.');
      return;
    }

    setPicName(file.name);
    setPicSizeBytes(file.size);

    const reader = new FileReader();
    reader.onload = () => {
      setPicUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleResetForm = () => {
    setTitle('');
    setSubject(SECONDARY_SUBJECTS[0]);
    setCustomSubject('');
    setTargetGrade('Basic 5');
    setDescription('');
    setFormatType('written');
    setTotalPoints(100);
    setDocName('');
    setDocUrl('');
    setDocSizeBytes(0);
    setPicName('');
    setPicUrl('');
    setPicSizeBytes(0);
    setEditingAssignment(null);
    setShowCreateModal(false);
  };

  const handleOpenEdit = (asn: Assignment) => {
    setEditingAssignment(asn);
    setTitle(asn.title);
    setSubject(SECONDARY_SUBJECTS.includes(asn.subject) ? asn.subject : 'Other');
    if (!SECONDARY_SUBJECTS.includes(asn.subject)) {
      setCustomSubject(asn.subject);
    }
    setTargetGrade(asn.grade);
    setDescription(asn.description);
    setFormatType(asn.assignmentType);
    setDueDate(asn.dueDate ? asn.dueDate.split('T')[0] : '');
    setTotalPoints(asn.totalPoints || 100);

    if (asn.attachmentType === 'document' || asn.assignmentType === 'document' || asn.assignmentType === 'hybrid') {
      setDocName(asn.attachmentName || '');
      setDocUrl(asn.attachmentUrl || '');
      setDocSizeBytes(asn.attachmentSizeBytes || 0);
    }
    if (asn.attachmentType === 'picture' || asn.assignmentType === 'picture' || asn.assignmentType === 'hybrid') {
      setPicName(asn.attachmentName || '');
      setPicUrl(asn.attachmentUrl || '');
      setPicSizeBytes(asn.attachmentSizeBytes || 0);
    }
    setShowCreateModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      alert('Please enter an Assignment Title.');
      return;
    }

    if (!description.trim() && formatType === 'written') {
      alert('Please provide the written assignment questions or instructions.');
      return;
    }

    if (formatType === 'document' && !docUrl) {
      alert('Please attach a document file (PDF, Word, or Text).');
      return;
    }

    if (formatType === 'picture' && !picUrl) {
      alert('Please attach or upload a picture/photo for this assignment.');
      return;
    }

    const finalSubject = subject === 'Other' && customSubject.trim() ? customSubject.trim() : subject;

    // Pick primary attachment
    let primaryUrl = '';
    let primaryName = '';
    let primaryType: 'document' | 'picture' | undefined = undefined;
    let primarySize = 0;

    if (formatType === 'picture' || (formatType === 'hybrid' && picUrl)) {
      primaryUrl = picUrl;
      primaryName = picName;
      primaryType = 'picture';
      primarySize = picSizeBytes;
    } else if (formatType === 'document' || (formatType === 'hybrid' && docUrl)) {
      primaryUrl = docUrl;
      primaryName = docName;
      primaryType = 'document';
      primarySize = docSizeBytes;
    }

    const newAssignment: Assignment = {
      id: editingAssignment ? editingAssignment.id : `ASN-${Date.now().toString().slice(-6)}`,
      title: title.trim(),
      subject: finalSubject,
      grade: targetGrade,
      description: description.trim(),
      assignmentType: formatType,
      attachmentUrl: primaryUrl || undefined,
      attachmentName: primaryName || undefined,
      attachmentType: primaryType,
      attachmentSizeBytes: primarySize || undefined,
      additionalAttachments: formatType === 'hybrid' && docUrl && picUrl ? [
        { name: docName, url: docUrl, type: 'document', sizeBytes: docSizeBytes },
        { name: picName, url: picUrl, type: 'picture', sizeBytes: picSizeBytes }
      ] : [],
      dueDate: dueDate || new Date(Date.now() + 7 * 86400000).toISOString(),
      totalPoints: totalPoints || 100,
      term: activeTerm,
      academicYear: '2024/2025',
      status: 'active',
      createdBy: adminName,
      createdByRole: 'admin',
      createdAt: editingAssignment ? editingAssignment.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (editingAssignment) {
      onUpdateAssignment(newAssignment);
      alert(`✓ Assignment "${newAssignment.title}" updated successfully.`);
    } else {
      onAddAssignment(newAssignment);
      alert(`✓ New Assignment for ${newAssignment.grade} published successfully!\n\nFormat: ${newAssignment.assignmentType.toUpperCase()}\nSubject: ${newAssignment.subject}\nDue: ${newAssignment.dueDate}`);
    }

    handleResetForm();
  };

  // Quick Preset Templates
  const handleApplyPreset = (presetKey: 'math_basic5' | 'eng_jss2' | 'sci_jss3' | 'phys_ss1' | 'ss3_waec') => {
    if (presetKey === 'math_basic5') {
      setTitle('Basic 5 Fractions, Decimals & Word Problems Exercises');
      setSubject('Mathematics');
      setTargetGrade('Basic 5');
      setFormatType('written');
      setDescription(
        'Answer all questions clearly in your homework notebooks:\n' +
        '1. Simplify: 3/4 + 5/8 - 1/2.\n' +
        '2. Convert 0.75 and 0.325 into common fractions in their lowest terms.\n' +
        '3. A farmer harvested 240 bags of maize. He sold 3/5 of them in the Apata market and shared 1/4 of the remaining bags among his workers. How many bags are left?\n' +
        '4. Calculate the perimeter and area of a rectangular school garden measuring 18.5m by 12.4m.'
      );
      setTotalPoints(40);
    } else if (presetKey === 'eng_jss2') {
      setTitle('JSS 2 Narrative Essay: "The Importance of Hard Work & Faith in God"');
      setSubject('English Language');
      setTargetGrade('JSS 2');
      setFormatType('written');
      setDescription(
        'Write an inspiring narrative essay of not less than 250 words on the topic: "The Importance of Hard Work & Faith in God".\n\n' +
        'Guidelines:\n' +
        '- Introduce your setting and main character.\n' +
        '- Describe a challenge faced and how perseverance, faith, and discipline brought success.\n' +
        '- Ensure correct use of punctuation, paragraphing, and rich vocabulary.\n' +
        '- Underline 5 modal verbs and 5 adjectives used in your story.'
      );
      setTotalPoints(50);
    } else if (presetKey === 'sci_jss3') {
      setTitle('JSS 3 Basic Technology: Workshop Hand Tools & Machine Safety');
      setSubject('Basic Technology');
      setTargetGrade('JSS 3');
      setFormatType('picture');
      setDescription(
        'Review the attached workshop tools picture diagram. Identify each numbered tool (1 to 10), state their primary workshop use, and write 5 essential safety precautions when using cutting tools.'
      );
      setTotalPoints(50);
    } else if (presetKey === 'phys_ss1') {
      setTitle('SS 1 Physics: Linear Motion & Newton\'s Laws Problem Worksheet');
      setSubject('Physics');
      setTargetGrade('SSS 1');
      setFormatType('document');
      setDescription(
        'Download and solve the questions on Newton\'s laws of motion and momentum in the attached worksheet. Show full step-by-step mathematical working with appropriate S.I. units for force, velocity, and acceleration.'
      );
      setTotalPoints(100);
    } else if (presetKey === 'ss3_waec') {
      setTitle('SS 3 Terminal Examination Preparatory Mock Revision Assessment');
      setSubject('Mathematics');
      setTargetGrade('SSS 3');
      setFormatType('hybrid');
      setDescription(
        'Comprehensive WAEC/NECO Standard Revision:\n' +
        '- Section A: Solve the 10 theory problems on Quadratic Equations, Matrices, and Trigonometry.\n' +
        '- Section B: Refer to the attached graph sheet diagram for question 7 (Circle Geometry theorem proof).\n' +
        'Ensure work is clean and legible.'
      );
      setTotalPoints(100);
    }
    setShowCreateModal(true);
  };

  // Filtered list
  const filteredAssignments = assignments.filter(asn => {
    const matchesGrade = filterGrade === 'all' || asn.grade === filterGrade;
    const matchesSubject = filterSubject === 'all' || asn.subject === filterSubject;
    const matchesSearch = !searchQuery || 
      asn.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asn.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asn.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesGrade && matchesSubject && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-200 text-xs font-bold uppercase tracking-wider">
              <span>📚 Academic Assignments Hub</span>
              <span>•</span>
              <span>Basic 5 to SS 3</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-serif font-black tracking-tight text-white">
              Official Homework & Assignment Gateway
            </h2>
            <p className="text-blue-200/90 text-sm max-w-2xl">
              Publish and administer curriculum assignments in <strong>written questions</strong>, <strong>downloadable document worksheets (PDF/Word)</strong>, or <strong>picture illustrations & photo exercises</strong> directly to senior primary & secondary pupils.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              onClick={() => {
                setEditingAssignment(null);
                setShowCreateModal(true);
              }}
              className="px-5 py-3 rounded-2xl bg-amber-400 hover:bg-amber-300 active:scale-95 text-blue-950 font-black text-sm transition-all shadow-lg hover:shadow-amber-400/30 flex items-center gap-2 cursor-pointer"
            >
              <span className="text-lg">➕</span>
              <span>Create New Assignment</span>
            </button>
          </div>
        </div>

        {/* Quick Preset Buttons */}
        <div className="mt-6 pt-5 border-t border-white/10 flex flex-wrap items-center gap-2 text-xs">
          <span className="text-blue-300 font-bold mr-1">Quick Presets:</span>
          <button
            onClick={() => handleApplyPreset('math_basic5')}
            className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium border border-white/15 transition cursor-pointer"
          >
            ✏️ Basic 5 Math
          </button>
          <button
            onClick={() => handleApplyPreset('eng_jss2')}
            className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium border border-white/15 transition cursor-pointer"
          >
            📖 JSS 2 English
          </button>
          <button
            onClick={() => handleApplyPreset('sci_jss3')}
            className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium border border-white/15 transition cursor-pointer"
          >
            🖼️ JSS 3 Basic Tech (Picture)
          </button>
          <button
            onClick={() => handleApplyPreset('phys_ss1')}
            className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium border border-white/15 transition cursor-pointer"
          >
            📄 SS 1 Physics (Doc)
          </button>
          <button
            onClick={() => handleApplyPreset('ss3_waec')}
            className="px-3 py-1.5 rounded-xl bg-amber-400/20 hover:bg-amber-400/30 text-amber-200 font-bold border border-amber-400/40 transition cursor-pointer"
          >
            ⭐ SS 3 WAEC Prep (Hybrid)
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
        <div className="flex-1 relative">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">🔍</span>
          <input
            type="text"
            placeholder="Search assignments by title, subject or instructions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600">
            <span>Class:</span>
            <select
              value={filterGrade}
              onChange={(e) => setFilterGrade(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Classes (Basic 5 - SS 3)</option>
              {ELIGIBLE_ASSIGNMENT_GRADES.map(g => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600">
            <span>Subject:</span>
            <select
              value={filterSubject}
              onChange={(e) => setFilterSubject(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Subjects</option>
              {SECONDARY_SUBJECTS.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div className="text-xs text-slate-500 font-bold bg-slate-100 px-3 py-2 rounded-xl">
            {filteredAssignments.length} Assignment{filteredAssignments.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {/* Assignments Grid */}
      {filteredAssignments.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-dashed border-slate-300 space-y-4">
          <div className="w-16 h-16 bg-blue-50 text-blue-900 rounded-2xl flex items-center justify-center text-3xl mx-auto">
            📝
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-slate-800">No Assignments Found</h3>
            <p className="text-sm text-slate-500 max-w-md mx-auto">
              There are currently no assignments matching your filter criteria. Click "Create New Assignment" or use one of the quick presets above to publish homework for Basic 5 to SS 3 students.
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-5 py-2.5 bg-blue-900 hover:bg-blue-800 text-white rounded-xl text-sm font-bold shadow transition cursor-pointer"
          >
            Create Assignment Now
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAssignments.map((asn) => {
            const isDueSoon = new Date(asn.dueDate).getTime() - Date.now() < 3 * 86400000;
            const isPastDue = new Date(asn.dueDate).getTime() < Date.now();

            return (
              <div
                key={asn.id}
                className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4 relative group"
              >
                <div className="space-y-3">
                  {/* Badges row */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-3 py-1 bg-blue-100 text-blue-900 rounded-xl text-xs font-black uppercase tracking-wide">
                      {asn.grade}
                    </span>
                    <span className={`px-2.5 py-1 rounded-xl text-[11px] font-bold flex items-center gap-1 ${
                      asn.assignmentType === 'picture' 
                        ? 'bg-purple-100 text-purple-900'
                        : asn.assignmentType === 'document'
                        ? 'bg-emerald-100 text-emerald-900'
                        : asn.assignmentType === 'hybrid'
                        ? 'bg-amber-100 text-amber-900'
                        : 'bg-yellow-100 text-black font-black border border-yellow-300'
                    }`}>
                      {asn.assignmentType === 'picture' && '🖼️ Picture / Diagram'}
                      {asn.assignmentType === 'document' && '📄 Document / PDF'}
                      {asn.assignmentType === 'written' && <span className="text-black font-black">✍️ Written Questions</span>}
                      {asn.assignmentType === 'hybrid' && '🔀 Multi-Format Hybrid'}
                    </span>
                  </div>

                  {/* Title & Subject */}
                  <div>
                    <span className="text-xs font-black text-slate-500 uppercase tracking-wider block">
                      {asn.subject}
                    </span>
                    <h3 className="text-base font-bold text-slate-900 line-clamp-2 mt-0.5">
                      {asn.title}
                    </h3>
                  </div>

                  {/* Description preview */}
                  <div className={`bg-slate-50 rounded-2xl p-3.5 border border-slate-100 text-xs leading-relaxed font-sans max-h-32 overflow-y-auto whitespace-pre-wrap ${
                    asn.assignmentType === 'written' ? 'text-black font-medium' : 'text-slate-700'
                  }`}>
                    {asn.description}
                  </div>

                  {/* Attachments preview */}
                  {(asn.attachmentUrl || (asn.additionalAttachments && asn.additionalAttachments.length > 0)) && (
                    <div className="space-y-2 pt-1">
                      {/* Picture preview */}
                      {(asn.attachmentType === 'picture' || asn.additionalAttachments?.some(a => a.type === 'picture')) && (
                        <div 
                          onClick={() => setPreviewImage(asn.attachmentUrl || asn.additionalAttachments?.find(a => a.type === 'picture')?.url || null)}
                          className="relative h-28 rounded-2xl overflow-hidden border border-slate-200 cursor-pointer group/img bg-slate-900/5"
                        >
                          <img
                            src={asn.attachmentUrl || asn.additionalAttachments?.find(a => a.type === 'picture')?.url}
                            alt="Assignment Diagram"
                            className="w-full h-full object-cover group-hover/img:scale-105 transition duration-300"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition flex items-center justify-center text-white text-xs font-bold gap-1.5">
                            <span>🔍 Click to View Full Image</span>
                          </div>
                        </div>
                      )}

                      {/* Document download link */}
                      {(asn.attachmentType === 'document' || asn.additionalAttachments?.some(a => a.type === 'document')) && (
                        <a
                          href={asn.attachmentUrl || asn.additionalAttachments?.find(a => a.type === 'document')?.url}
                          download={asn.attachmentName || 'Assignment_Document.pdf'}
                          className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 transition text-emerald-900 text-xs font-bold"
                        >
                          <span className="text-base">📄</span>
                          <span className="truncate flex-1">
                            {asn.attachmentName || 'Attached Document / Worksheet'}
                          </span>
                          <span className="text-[10px] bg-emerald-200 px-2 py-0.5 rounded-lg shrink-0">Download</span>
                        </a>
                      )}
                    </div>
                  )}

                  {/* Metadata: Due date & marks */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
                    <span className="flex items-center gap-1 font-bold text-slate-700">
                      <span>🎯 Total Marks:</span>
                      <span className="text-blue-900">{asn.totalPoints} pts</span>
                    </span>
                    <span className={`font-bold flex items-center gap-1 ${
                      isPastDue ? 'text-rose-600' : isDueSoon ? 'text-amber-600' : 'text-slate-600'
                    }`}>
                      <span>📅 Due:</span>
                      <span>{new Date(asn.dueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                      {isPastDue && <span className="text-[10px] bg-rose-100 px-1.5 py-0.5 rounded text-rose-800">Closed</span>}
                    </span>
                  </div>
                </div>

                {/* Actions footer */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    onClick={() => handleOpenEdit(asn)}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                  >
                    <span>✏️ Edit</span>
                  </button>

                  <button
                    onClick={() => {
                      if (confirm(`Are you sure you want to delete assignment "${asn.title}"?`)) {
                        onDeleteAssignment(asn.id);
                      }
                    }}
                    className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                  >
                    <span>🗑️ Delete</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE / EDIT ASSIGNMENT MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-6 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div className="space-y-0.5">
                <span className="text-xs font-black text-blue-900 uppercase tracking-widest">
                  Academic Curriculum Gateway
                </span>
                <h3 className="text-xl font-serif font-black text-slate-900">
                  {editingAssignment ? 'Edit Homework Assignment' : 'Create & Publish New Assignment'}
                </h3>
                <p className="text-xs text-slate-500">
                  Target students from <strong>Basic 5 to SS 3</strong>. Choose written questions, document uploads, or picture exercises.
                </p>
              </div>
              <button
                onClick={handleResetForm}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 font-bold transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Row 1: Target Grade & Subject */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-700 uppercase tracking-wider">
                    Target Class / Grade *
                  </label>
                  <select
                    value={targetGrade}
                    onChange={(e) => setTargetGrade(e.target.value as GradeLevel)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    {ELIGIBLE_ASSIGNMENT_GRADES.map(g => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-700 uppercase tracking-wider">
                    Subject *
                  </label>
                  <select
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    {SECONDARY_SUBJECTS.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                    <option value="Other">Other Subject...</option>
                  </select>
                </div>
              </div>

              {subject === 'Other' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-700 uppercase tracking-wider">
                    Custom Subject Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Technical Drawing, Yoruba, French"
                    value={customSubject}
                    onChange={(e) => setCustomSubject(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              {/* Title */}
              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-700 uppercase tracking-wider">
                  Assignment Title / Topic *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Chapter 4 Fractions, Geometry Theorem Proof, Chemical Bonding Quiz"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              {/* Format Selector: Written, Document, Picture, Hybrid */}
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-700 uppercase tracking-wider">
                  Assignment Delivery Format *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setFormatType('written')}
                    className={`p-3 rounded-2xl border text-center transition flex flex-col items-center gap-1 cursor-pointer ${
                      formatType === 'written'
                        ? 'bg-yellow-400 text-black border-yellow-500 shadow-md ring-2 ring-black/20'
                        : 'bg-slate-50 text-black border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span className="text-xl">✍️</span>
                    <span className="text-xs font-black text-black">Written Form</span>
                    <span className="text-[10px] text-black font-bold">Questions text</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormatType('document')}
                    className={`p-3 rounded-2xl border text-center transition flex flex-col items-center gap-1 cursor-pointer ${
                      formatType === 'document'
                        ? 'bg-emerald-800 text-white border-emerald-800 shadow-md'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span className="text-xl">📄</span>
                    <span className="text-xs font-black">Document Form</span>
                    <span className="text-[10px] opacity-75">PDF / Word file</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormatType('picture')}
                    className={`p-3 rounded-2xl border text-center transition flex flex-col items-center gap-1 cursor-pointer ${
                      formatType === 'picture'
                        ? 'bg-purple-900 text-white border-purple-900 shadow-md'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span className="text-xl">🖼️</span>
                    <span className="text-xs font-black">Picture Form</span>
                    <span className="text-[10px] opacity-75">Photo / Diagram</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormatType('hybrid')}
                    className={`p-3 rounded-2xl border text-center transition flex flex-col items-center gap-1 cursor-pointer ${
                      formatType === 'hybrid'
                        ? 'bg-amber-600 text-white border-amber-600 shadow-md'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span className="text-xl">🔀</span>
                    <span className="text-xs font-black">Hybrid Form</span>
                    <span className="text-[10px] opacity-75">Text + Attachments</span>
                  </button>
                </div>
              </div>

              {/* Written Instructions / Questions Textarea */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className={`text-xs font-black uppercase tracking-wider ${
                    formatType === 'written' ? 'text-black' : 'text-slate-700'
                  }`}>
                    {formatType === 'written' ? 'Assignment Questions / Essay Topic *' : 'Instructions / Guidelines'}
                  </label>
                  <span className="text-[11px] text-slate-500 font-medium">Markdown supported</span>
                </div>
                <textarea
                  rows={5}
                  placeholder="Type your questions, math problems, essay requirements, or instructions for the students here..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className={`w-full px-3.5 py-2.5 bg-white border-2 border-slate-300 rounded-xl text-sm font-sans focus:outline-none focus:ring-2 focus:ring-blue-500 leading-relaxed ${
                    formatType === 'written' ? 'text-black font-semibold placeholder:text-slate-500' : 'text-slate-800'
                  }`}
                  required={formatType === 'written'}
                />
              </div>

              {/* Document Upload Area (Shown for Document & Hybrid formats) */}
              {(formatType === 'document' || formatType === 'hybrid') && (
                <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black text-emerald-950 uppercase tracking-wider flex items-center gap-1.5">
                      <span>📄</span>
                      <span>Attach Document (PDF, Word, Worksheets)</span>
                    </label>
                    {docName && (
                      <span className="text-[11px] text-emerald-700 font-bold">
                        {(docSizeBytes / 1024).toFixed(1)} KB
                      </span>
                    )}
                  </div>

                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.txt"
                    onChange={handleDocumentUpload}
                    className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-emerald-600 file:text-white hover:file:bg-emerald-700 cursor-pointer"
                  />

                  {docName && (
                    <div className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-emerald-200 text-xs">
                      <span className="font-bold text-emerald-900 truncate">✓ {docName}</span>
                      <button
                        type="button"
                        onClick={() => { setDocName(''); setDocUrl(''); setDocSizeBytes(0); }}
                        className="text-rose-600 hover:text-rose-800 font-bold ml-2 cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Picture Upload Area (Shown for Picture & Hybrid formats) */}
              {(formatType === 'picture' || formatType === 'hybrid') && (
                <div className="p-4 bg-purple-50/70 border border-purple-200 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black text-purple-950 uppercase tracking-wider flex items-center gap-1.5">
                      <span>🖼️</span>
                      <span>Attach Picture / Photo (Handwritten Sheet, Diagram, Textbook Snapshot)</span>
                    </label>
                    {picName && (
                      <span className="text-[11px] text-purple-700 font-bold">
                        {(picSizeBytes / 1024).toFixed(1)} KB
                      </span>
                    )}
                  </div>

                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePictureUpload}
                    className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-purple-600 file:text-white hover:file:bg-purple-700 cursor-pointer"
                  />

                  {picUrl && (
                    <div className="relative rounded-xl overflow-hidden border border-purple-200 max-h-48 group">
                      <img src={picUrl} alt="Assignment Preview" className="w-full h-48 object-cover" />
                      <div className="absolute top-2 right-2 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setPreviewImage(picUrl)}
                          className="px-2.5 py-1 bg-black/70 hover:bg-black text-white rounded-lg text-xs font-bold transition cursor-pointer"
                        >
                          Zoom 🔍
                        </button>
                        <button
                          type="button"
                          onClick={() => { setPicName(''); setPicUrl(''); setPicSizeBytes(0); }}
                          className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition cursor-pointer"
                        >
                          Remove ✕
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Row 3: Due Date & Total Marks */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-700 uppercase tracking-wider">
                    Submission Deadline (Due Date) *
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-700 uppercase tracking-wider">
                    Total Marks / Points
                  </label>
                  <input
                    type="number"
                    min={5}
                    max={200}
                    value={totalPoints}
                    onChange={(e) => setTotalPoints(parseInt(e.target.value) || 100)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={handleResetForm}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-bold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-blue-900 hover:bg-blue-800 active:scale-95 text-white rounded-xl text-sm font-black shadow-lg hover:shadow-blue-900/30 transition cursor-pointer"
                >
                  {editingAssignment ? 'Save Changes' : '🚀 Publish Assignment to Students'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PICTURE ZOOM MODAL */}
      {previewImage && (
        <div 
          onClick={() => setPreviewImage(null)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 cursor-pointer animate-in fade-in"
        >
          <div className="relative max-w-4xl max-h-[90vh] bg-white rounded-2xl overflow-hidden p-2">
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-black/70 hover:bg-black text-white font-bold flex items-center justify-center text-sm"
            >
              ✕
            </button>
            <img
              src={previewImage}
              alt="Assignment Full View"
              className="max-h-[85vh] w-auto mx-auto rounded-xl object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
};
