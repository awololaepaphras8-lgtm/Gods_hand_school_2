import React, { useState, useMemo } from 'react';
import { 
  ParentAccount, 
  StudentAccount, 
  TeacherAccount, 
  ParentStaffMessage, 
  GradeLevel, 
  UserRole 
} from '../types';

interface ParentStaffMessagingProps {
  currentUserRole: UserRole;
  currentUserName: string | null;
  currentParent?: ParentAccount | null;
  currentTeacher?: TeacherAccount | null;
  parents: ParentAccount[];
  students: StudentAccount[];
  teachers: TeacherAccount[];
  messages: ParentStaffMessage[];
  onSendMessage: (msg: Omit<ParentStaffMessage, 'id' | 'timestamp'>) => void;
  onInitiateCall?: (targetId: string, targetName: string, targetRole: UserRole, type: 'voice' | 'video') => void;
  onBack: () => void;
  onGoToCommunityHub?: () => void;
}

export const ParentStaffMessaging: React.FC<ParentStaffMessagingProps> = ({
  currentUserRole,
  currentUserName,
  currentParent,
  currentTeacher,
  parents,
  students,
  teachers,
  messages,
  onSendMessage,
  onInitiateCall,
  onBack,
  onGoToCommunityHub
}) => {
  // Mode: Is viewer a Parent or Staff/Teacher/Admin?
  const isParent = currentUserRole === UserRole.PARENT;
  const isTeacher = currentUserRole === UserRole.TEACHER;
  const isAdmin = currentUserRole === UserRole.ADMIN;

  // Linked children for this parent
  const linkedChildren = useMemo(() => {
    if (!currentParent) return [];
    return students.filter(s => 
      (currentParent.childrenStudentIds || []).includes(s.id) || 
      s.parentId === currentParent.id || 
      (s.parentEmail && s.parentEmail.toLowerCase() === currentParent.email.toLowerCase())
    );
  }, [currentParent, students]);

  // Selected child filter (for parents)
  const [selectedChildId, setSelectedChildId] = useState<string>(
    linkedChildren[0]?.id || ''
  );

  const selectedChild = useMemo(() => {
    return students.find(s => s.id === selectedChildId) || linkedChildren[0] || null;
  }, [students, selectedChildId, linkedChildren]);

  // Staff list to contact (Teachers + Admin + Bursar + Management)
  const staffDirectory = useMemo(() => {
    const list: { id: string; name: string; roleDesc: string; grades: string[]; isSpecial?: boolean }[] = [];

    // 1. School Management / Proprietor
    list.push({
      id: 'admin',
      name: 'Proprietor & School Management Desk',
      roleDesc: 'General Administration, Admissions & Direct Escalations',
      grades: ['All Grades'],
      isSpecial: true
    });

    // 2. School Bursary & Accounts
    list.push({
      id: 'bursar',
      name: 'School Bursar & Accounts Office',
      roleDesc: 'School Fees Reconciliation, Receipts & Bank Clearance',
      grades: ['All Grades'],
      isSpecial: true
    });

    // 3. Registered Teachers
    teachers.forEach(t => {
      list.push({
        id: t.username,
        name: `Teacher ${t.username.toUpperCase()}`,
        roleDesc: `Class & Subject Educator (${(t.assignedGrades || []).join(', ') || 'General Faculty'})`,
        grades: t.assignedGrades || []
      });
    });

    // Default primary teacher if directory empty
    if (list.length === 2) {
      list.push({
        id: 'staff',
        name: 'Mr. David Adeleke (Primary Educator)',
        roleDesc: 'Primary 1 - 6 Senior Class Teacher',
        grades: ['Primary 1', 'Primary 2', 'Primary 3', 'Primary 4', 'Primary 5', 'Primary 6']
      });
    }

    return list;
  }, [teachers]);

  // If a child is selected, highlight that child's assigned teacher
  const recommendedStaff = useMemo(() => {
    if (!selectedChild) return staffDirectory[0]?.id || 'staff';
    const match = staffDirectory.find(s => s.grades.includes(selectedChild.grade));
    return match ? match.id : staffDirectory[0]?.id || 'staff';
  }, [staffDirectory, selectedChild]);

  // Active staff being messaged (for Parent mode)
  const [selectedStaffId, setSelectedStaffId] = useState<string>(recommendedStaff);

  // Active parent thread being messaged (for Staff / Teacher mode)
  const [selectedParentId, setSelectedParentId] = useState<string>(
    parents[0]?.id || ''
  );

  // Message Form State
  const [messageText, setMessageText] = useState('');
  const [messageSubject, setMessageSubject] = useState('');
  const [priority, setPriority] = useState<'normal' | 'urgent' | 'inquiry'>('normal');
  const [searchQuery, setSearchQuery] = useState('');

  // Quick message presets
  const quickPresets = [
    'Confirming daily homework submission & lesson feedback.',
    'Reporting child illness / planned absence from classes.',
    'Inquiring about terminal assessment and scores.',
    'Confirmation of school fees bank payment & receipt clearance.',
    'Requesting a virtual one-on-one video meeting.'
  ];

  // Filter messages for current thread
  const currentThreadMessages = useMemo(() => {
    if (isParent) {
      const parentId = currentParent?.id || 'PAR-1';
      return messages.filter(m => 
        (m.parentId === parentId || m.parentEmail === currentParent?.email) &&
        (m.staffId === selectedStaffId || (!m.staffId && selectedStaffId === 'staff'))
      ).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    } else if (isTeacher) {
      const staffUser = currentTeacher?.username || currentUserName || 'staff';
      return messages.filter(m => 
        (m.staffId === staffUser || m.staffId === 'staff') &&
        (!selectedParentId || m.parentId === selectedParentId)
      ).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    } else {
      // Admin sees thread between selected staff and selected parent, or all
      return messages.filter(m => 
        (!selectedParentId || m.parentId === selectedParentId) &&
        (!selectedStaffId || m.staffId === selectedStaffId)
      ).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    }
  }, [messages, isParent, isTeacher, currentParent, currentTeacher, currentUserName, selectedStaffId, selectedParentId]);

  const activeStaffObj = staffDirectory.find(s => s.id === selectedStaffId) || staffDirectory[0];
  const activeParentObj = parents.find(p => p.id === selectedParentId) || parents[0];

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!messageText.trim()) return;

    if (isParent) {
      const pId = currentParent?.id || 'PAR-1';
      const pName = currentParent?.fullName || currentUserName || 'Registered Parent';
      const staffTarget = activeStaffObj || staffDirectory[0];

      onSendMessage({
        parentId: pId,
        parentName: pName,
        parentEmail: currentParent?.email,
        staffId: staffTarget.id,
        staffName: staffTarget.name,
        studentId: selectedChild?.id,
        studentName: selectedChild?.name,
        studentGrade: selectedChild?.grade,
        subject: messageSubject.trim() || 'Parent Inquiry',
        message: messageText.trim(),
        senderRole: 'parent',
        priority,
        read: false
      });
    } else {
      // Staff or Admin replying
      const staffSender = currentTeacher?.username || currentUserName || 'School Staff';
      const targetParent = activeParentObj || parents[0] || {
        id: 'PAR-1',
        fullName: 'Mrs. Folashade Adebayo',
        email: 'parent@godshand.sch.ng'
      };

      onSendMessage({
        parentId: targetParent.id,
        parentName: targetParent.fullName,
        parentEmail: targetParent.email,
        staffId: staffSender,
        staffName: currentUserName || 'School Educator',
        studentId: selectedChild?.id,
        studentName: selectedChild?.name,
        studentGrade: selectedChild?.grade,
        subject: messageSubject.trim() || 'Staff Communication',
        message: messageText.trim(),
        senderRole: isAdmin ? 'admin' : 'teacher',
        priority,
        read: false
      });
    }

    setMessageText('');
  };

  return (
    <div className="max-w-6xl mx-auto py-8 sm:py-12 px-3 sm:px-6">
      {/* Top Banner & Header */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border-2 border-slate-100 mb-8 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2.5 bg-gradient-to-r from-blue-900 via-yellow-400 to-emerald-600"></div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 bg-yellow-400 text-blue-950 font-black text-[10px] sm:text-xs uppercase tracking-widest rounded-full shadow-xs">
                Direct Parent-Staff Gateway
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100 text-emerald-800 text-[10px] sm:text-xs font-black uppercase rounded-full">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Instant Realtime Delivery
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-blue-950 font-serif leading-tight">
              Parent & Staff Communications Desk
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
              Direct two-way messaging between parents, classroom teachers, school bursary, and administration.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {onGoToCommunityHub && (
              <button
                type="button"
                onClick={onGoToCommunityHub}
                className="px-4 py-2.5 bg-yellow-400 hover:bg-yellow-300 text-blue-950 rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow-sm flex items-center gap-1.5 active:scale-95"
              >
                <span>📞</span>
                <span>Community Chat & Meetings →</span>
              </button>
            )}
            <button
              type="button"
              onClick={onBack}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-black text-xs uppercase tracking-wider transition-all"
            >
              ← Back to Portal
            </button>
          </div>
        </div>
      </div>

      {/* Main Messaging Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Contacts & Channel Selector */}
        <div className="lg:col-span-4 space-y-4">
          {/* If Parent: Child Selector */}
          {isParent && linkedChildren.length > 0 && (
            <div className="bg-white rounded-3xl p-5 border-2 border-slate-100 shadow-lg">
              <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 mb-2">
                👦 Select Your Child (Regarding Inquiry):
              </label>
              <div className="space-y-2">
                {linkedChildren.map(c => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setSelectedChildId(c.id);
                      // Update recommended staff for this child
                      const match = staffDirectory.find(s => s.grades.includes(c.grade));
                      if (match) setSelectedStaffId(match.id);
                    }}
                    className={`w-full text-left p-3 rounded-2xl border-2 transition-all flex items-center justify-between ${
                      selectedChild?.id === c.id
                        ? 'bg-blue-900 text-white border-blue-900 shadow-md'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-blue-300'
                    }`}
                  >
                    <div>
                      <p className="font-serif font-black text-xs sm:text-sm">{c.name}</p>
                      <p className={`text-[10px] font-bold uppercase ${selectedChild?.id === c.id ? 'text-yellow-400' : 'text-slate-400'}`}>
                        {c.grade} • ID: {c.id}
                      </p>
                    </div>
                    {selectedChild?.id === c.id && (
                      <span className="text-yellow-400 text-base">✓</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Directory Panel */}
          <div className="bg-white rounded-3xl p-5 border-2 border-slate-100 shadow-lg space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-serif font-black text-blue-950 text-sm">
                {isParent ? 'School Staff & Teachers' : 'Parent Enquiries'}
              </h3>
              <span className="text-[10px] font-black uppercase px-2 py-0.5 bg-blue-100 text-blue-900 rounded-full">
                {isParent ? staffDirectory.length : parents.length} Active
              </span>
            </div>

            <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
              {isParent ? (
                staffDirectory.map(staff => {
                  const isSelected = selectedStaffId === staff.id;
                  const isChildTeacher = selectedChild && staff.grades.includes(selectedChild.grade);

                  return (
                    <div
                      key={staff.id}
                      onClick={() => setSelectedStaffId(staff.id)}
                      className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-blue-900 text-white border-blue-900 shadow-md'
                          : 'bg-slate-50 text-slate-800 border-slate-200 hover:border-blue-300 hover:bg-white'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm shrink-0 ${
                            isSelected ? 'bg-yellow-400 text-blue-950' : 'bg-blue-100 text-blue-900'
                          }`}>
                            {staff.isSpecial ? '🏛️' : '👔'}
                          </div>
                          <div>
                            <p className={`font-serif font-black text-xs leading-snug ${isSelected ? 'text-white' : 'text-blue-950'}`}>
                              {staff.name}
                            </p>
                            <p className={`text-[10px] leading-tight mt-0.5 line-clamp-1 ${isSelected ? 'text-blue-100' : 'text-slate-500'}`}>
                              {staff.roleDesc}
                            </p>
                          </div>
                        </div>

                        {isChildTeacher && (
                          <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded-full shrink-0 ${
                            isSelected ? 'bg-yellow-400 text-blue-950' : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            Class Teacher
                          </span>
                        )}
                      </div>

                      {/* Call button shortcut */}
                      {onInitiateCall && (
                        <div className="mt-2.5 pt-2 border-t border-slate-100/20 flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onInitiateCall(staff.id, staff.name, staff.id === 'admin' ? UserRole.ADMIN : UserRole.TEACHER, 'voice');
                            }}
                            className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider flex items-center gap-1 transition-all ${
                              isSelected ? 'bg-yellow-400 text-blue-950 hover:bg-yellow-300' : 'bg-white text-blue-900 border border-slate-200 hover:bg-blue-50'
                            }`}
                            title="Make instant voice call"
                          >
                            <span>📞</span>
                            <span>Call</span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onInitiateCall(staff.id, staff.name, staff.id === 'admin' ? UserRole.ADMIN : UserRole.TEACHER, 'video');
                            }}
                            className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider flex items-center gap-1 transition-all ${
                              isSelected ? 'bg-emerald-500 text-white hover:bg-emerald-400' : 'bg-white text-emerald-700 border border-slate-200 hover:bg-emerald-50'
                            }`}
                            title="Make instant video call"
                          >
                            <span>📹</span>
                            <span>Video</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                // Staff or Admin view: list parents
                parents.map(parentItem => {
                  const isSelected = selectedParentId === parentItem.id;
                  const parentChildren = students.filter(s => (parentItem.childrenStudentIds || []).includes(s.id));

                  return (
                    <div
                      key={parentItem.id}
                      onClick={() => setSelectedParentId(parentItem.id)}
                      className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-blue-900 text-white border-blue-900 shadow-md'
                          : 'bg-slate-50 text-slate-800 border-slate-200 hover:border-blue-300 hover:bg-white'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm shrink-0 ${
                            isSelected ? 'bg-yellow-400 text-blue-950' : 'bg-blue-100 text-blue-900'
                          }`}>
                            👨‍👩‍👧‍👦
                          </div>
                          <div>
                            <p className={`font-serif font-black text-xs leading-snug ${isSelected ? 'text-white' : 'text-blue-950'}`}>
                              {parentItem.fullName}
                            </p>
                            <p className={`text-[10px] leading-tight mt-0.5 ${isSelected ? 'text-blue-100' : 'text-slate-500'}`}>
                              Children: {parentChildren.map(c => c.name).join(', ') || 'N/A'}
                            </p>
                          </div>
                        </div>
                      </div>

                      {onInitiateCall && (
                        <div className="mt-2.5 pt-2 border-t border-slate-100/20 flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onInitiateCall(parentItem.id, parentItem.fullName, UserRole.PARENT, 'voice');
                            }}
                            className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider flex items-center gap-1 transition-all ${
                              isSelected ? 'bg-yellow-400 text-blue-950 hover:bg-yellow-300' : 'bg-white text-blue-900 border border-slate-200 hover:bg-blue-50'
                            }`}
                          >
                            <span>📞 Call</span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onInitiateCall(parentItem.id, parentItem.fullName, UserRole.PARENT, 'video');
                            }}
                            className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider flex items-center gap-1 transition-all ${
                              isSelected ? 'bg-emerald-500 text-white hover:bg-emerald-400' : 'bg-white text-emerald-700 border border-slate-200 hover:bg-emerald-50'
                            }`}
                          >
                            <span>📹 Video</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Active Conversation & Composer */}
        <div className="lg:col-span-8 flex flex-col space-y-4">
          {/* Active Conversation Header Card */}
          <div className="bg-white rounded-3xl p-5 border-2 border-slate-100 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-900 text-yellow-400 flex items-center justify-center font-black text-xl border-2 border-yellow-400 shadow-xs">
                {isParent ? (activeStaffObj?.isSpecial ? '🏛️' : '👔') : '👨‍👩‍👧‍👦'}
              </div>
              <div>
                <h3 className="font-serif font-black text-blue-950 text-base leading-tight">
                  {isParent ? activeStaffObj?.name : activeParentObj?.fullName}
                </h3>
                <p className="text-[11px] text-slate-500 font-bold">
                  {isParent 
                    ? `${activeStaffObj?.roleDesc} • Active Realtime Channel` 
                    : `Parent of ${selectedChild?.name || 'Pupil'} • Phone: ${activeParentObj?.phone || 'On Record'}`}
                </p>
              </div>
            </div>

            {onInitiateCall && (
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    const targetId = isParent ? activeStaffObj.id : activeParentObj.id;
                    const targetName = isParent ? activeStaffObj.name : activeParentObj.fullName;
                    const targetRole = isParent ? (activeStaffObj.id === 'admin' ? UserRole.ADMIN : UserRole.TEACHER) : UserRole.PARENT;
                    onInitiateCall(targetId, targetName, targetRole, 'voice');
                  }}
                  className="px-3.5 py-2 bg-blue-900 hover:bg-blue-800 text-yellow-400 font-black text-xs uppercase tracking-wider rounded-xl shadow-xs transition-all flex items-center gap-1.5 active:scale-95"
                  title="Make voice call"
                >
                  <span>📞</span>
                  <span>Voice Call</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const targetId = isParent ? activeStaffObj.id : activeParentObj.id;
                    const targetName = isParent ? activeStaffObj.name : activeParentObj.fullName;
                    const targetRole = isParent ? (activeStaffObj.id === 'admin' ? UserRole.ADMIN : UserRole.TEACHER) : UserRole.PARENT;
                    onInitiateCall(targetId, targetName, targetRole, 'video');
                  }}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-xs transition-all flex items-center gap-1.5 active:scale-95"
                  title="Make video call"
                >
                  <span>📹</span>
                  <span>Video Call</span>
                </button>
              </div>
            )}
          </div>

          {/* Messages Stream Container */}
          <div className="bg-slate-50 rounded-3xl p-5 sm:p-6 border-2 border-slate-200/80 shadow-inner min-h-[380px] max-h-[480px] overflow-y-auto space-y-4">
            {currentThreadMessages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-400 space-y-2">
                <span className="text-5xl">💬</span>
                <p className="font-serif font-black text-blue-900 text-base">No messages in this conversation yet</p>
                <p className="text-xs text-slate-500 max-w-md">
                  Send a direct inquiry or question below. Messages deliver instantly in real-time to the recipient's dashboard.
                </p>
              </div>
            ) : (
              currentThreadMessages.map(msg => {
                const isSentByMe = 
                  (isParent && msg.senderRole === 'parent') ||
                  (!isParent && (msg.senderRole === 'teacher' || msg.senderRole === 'admin'));

                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isSentByMe ? 'items-end' : 'items-start'}`}
                  >
                    <div className="flex items-center gap-1.5 mb-1 text-[10px] font-bold text-slate-400">
                      <span>{isSentByMe ? 'You' : msg.senderRole === 'parent' ? msg.parentName : msg.staffName}</span>
                      <span>•</span>
                      <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      {msg.priority && msg.priority !== 'normal' && (
                        <span className={`px-1.5 py-0.2 rounded font-black uppercase text-[8px] ${
                          msg.priority === 'urgent' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {msg.priority}
                        </span>
                      )}
                    </div>

                    <div className={`p-4 rounded-3xl max-w-[85%] sm:max-w-[75%] shadow-sm ${
                      isSentByMe
                        ? 'bg-blue-900 text-white rounded-tr-xs'
                        : 'bg-white text-slate-800 border border-slate-200 rounded-tl-xs'
                    }`}>
                      {msg.subject && (
                        <p className={`text-[11px] font-black uppercase tracking-wider mb-1 ${
                          isSentByMe ? 'text-yellow-300' : 'text-blue-900'
                        }`}>
                          {msg.subject}
                        </p>
                      )}
                      {msg.studentName && (
                        <p className={`text-[10px] font-bold mb-2 pb-1 border-b ${
                          isSentByMe ? 'border-blue-800 text-blue-200' : 'border-slate-100 text-slate-400'
                        }`}>
                          Regarding: {msg.studentName} ({msg.studentGrade || 'Pupil'})
                        </p>
                      )}
                      <p className="text-xs sm:text-sm whitespace-pre-wrap leading-relaxed font-medium">
                        {msg.message}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Quick Preset Buttons */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider shrink-0">
              ⚡ Quick:
            </span>
            {quickPresets.map((preset, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setMessageText(preset)}
                className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-full text-[10px] font-bold text-slate-600 whitespace-nowrap transition-all shadow-xs"
              >
                {preset.slice(0, 32)}...
              </button>
            ))}
          </div>

          {/* Message Composer Card */}
          <form onSubmit={handleSend} className="bg-white rounded-3xl p-5 border-2 border-slate-100 shadow-lg space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div className="sm:col-span-2">
                <input
                  type="text"
                  value={messageSubject}
                  onChange={e => setMessageSubject(e.target.value)}
                  placeholder="Subject (e.g. Homework Inquiry, Absence Report)"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-900"
                />
              </div>

              <div>
                <select
                  value={priority}
                  onChange={e => setPriority(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-900"
                >
                  <option value="normal">Normal Priority</option>
                  <option value="inquiry">General Inquiry</option>
                  <option value="urgent">Urgent / Immediate</option>
                </select>
              </div>
            </div>

            <div className="relative">
              <textarea
                value={messageText}
                onChange={e => setMessageText(e.target.value)}
                rows={3}
                placeholder={isParent 
                  ? `Write your message directly to ${activeStaffObj?.name}...` 
                  : `Reply to ${activeParentObj?.fullName || 'the parent'}...`}
                className="w-full p-4 bg-slate-50 border-2 border-slate-200 rounded-2xl text-xs sm:text-sm font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-900 focus:bg-white transition-all resize-none"
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
              />

              <div className="flex items-center justify-between pt-2">
                <p className="text-[10px] text-slate-400 font-bold hidden sm:block">
                  Press Enter to send • Real-time Supabase sync enabled
                </p>

                <button
                  type="submit"
                  disabled={!messageText.trim()}
                  className={`px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow-md flex items-center gap-2 ${
                    messageText.trim()
                      ? 'bg-blue-900 hover:bg-blue-800 text-yellow-400 active:scale-95'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  <span>Send Message</span>
                  <span>➔</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
