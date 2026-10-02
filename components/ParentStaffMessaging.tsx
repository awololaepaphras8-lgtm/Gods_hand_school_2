import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  ParentAccount, 
  StudentAccount, 
  TeacherAccount, 
  ParentStaffMessage, 
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
  onEditMessage?: (messageId: string, newMessage: string) => void;
  onDeleteMessage?: (messageId: string) => void;
  onReactMessage?: (messageId: string, emoji: string) => void;
  onMarkAsRead?: (messageIds: string[]) => void;
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
  onEditMessage,
  onDeleteMessage,
  onReactMessage,
  onMarkAsRead,
  onInitiateCall,
  onBack,
  onGoToCommunityHub
}) => {
  // Roles
  const isParent = currentUserRole === UserRole.PARENT;
  const isTeacher = currentUserRole === UserRole.TEACHER;
  const isAdmin = currentUserRole === UserRole.ADMIN;

  // Linked children for Parent mode
  const linkedChildren = useMemo(() => {
    if (!currentParent) return [];
    return students.filter(s => 
      (currentParent.childrenStudentIds || []).includes(s.id) || 
      s.parentId === currentParent.id || 
      (s.parentEmail && s.parentEmail.toLowerCase() === currentParent.email.toLowerCase())
    );
  }, [currentParent, students]);

  const [selectedChildId, setSelectedChildId] = useState<string>(
    linkedChildren[0]?.id || ''
  );

  const selectedChild = useMemo(() => {
    return students.find(s => s.id === selectedChildId) || linkedChildren[0] || null;
  }, [students, selectedChildId, linkedChildren]);

  // Directory of Staff (for Parent)
  const staffDirectory = useMemo(() => {
    const list: { id: string; name: string; roleDesc: string; grades: string[]; isSpecial?: boolean; avatar: string }[] = [];

    // 1. School Management / Proprietor
    list.push({
      id: 'admin',
      name: 'Proprietor & School Management Desk',
      roleDesc: 'General Administration, Admissions & Direct Escalations',
      grades: ['All Grades'],
      isSpecial: true,
      avatar: '🏛️'
    });

    // 2. School Bursary & Accounts Office
    list.push({
      id: 'bursar',
      name: 'School Bursar & Accounts Office',
      roleDesc: 'School Fees Reconciliation, Receipts & Bank Clearance',
      grades: ['All Grades'],
      isSpecial: true,
      avatar: '💳'
    });

    // 3. Registered Teachers
    teachers.forEach(t => {
      list.push({
        id: t.username,
        name: `Teacher ${t.username.toUpperCase()}`,
        roleDesc: `Class & Subject Educator (${(t.assignedGrades || []).join(', ') || 'General Faculty'})`,
        grades: t.assignedGrades || [],
        avatar: '👔'
      });
    });

    // Default primary teacher if directory empty
    if (list.length === 2) {
      list.push({
        id: 'staff',
        name: 'Mr. David Adeleke (Primary Educator)',
        roleDesc: 'Primary 1 - 6 Senior Class Teacher',
        grades: ['Primary 1', 'Primary 2', 'Primary 3', 'Primary 4', 'Primary 5', 'Primary 6'],
        avatar: '👔'
      });
    }

    return list;
  }, [teachers]);

  const recommendedStaff = useMemo(() => {
    if (!selectedChild) return staffDirectory[0]?.id || 'staff';
    const match = staffDirectory.find(s => s.grades.includes(selectedChild.grade));
    return match ? match.id : staffDirectory[0]?.id || 'staff';
  }, [staffDirectory, selectedChild]);

  // Selected contacts
  const [selectedStaffId, setSelectedStaffId] = useState<string>(recommendedStaff);
  const [selectedParentId, setSelectedParentId] = useState<string>(parents[0]?.id || 'PAR-1');

  // Mobile view state: 'list' (contacts list) or 'chat' (active conversation)
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('chat');

  // Input composer state
  const [messageText, setMessageText] = useState('');
  const [messageSubject, setMessageSubject] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [searchContact, setSearchContact] = useState('');
  const [searchInChat, setSearchInChat] = useState('');
  const [showSearchInChat, setShowSearchInChat] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Active Long-press / Context Menu Message
  const [activeContextMenuMsgId, setActiveContextMenuMsgId] = useState<string | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingMessageText, setEditingMessageText] = useState('');
  const [infoMessageId, setInfoMessageId] = useState<string | null>(null);

  const longPressTimerRef = useRef<any>(null);
  const chatMessagesEndRef = useRef<HTMLDivElement>(null);
  const messageInputRef = useRef<HTMLTextAreaElement>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2800);
  };

  // Quick message presets
  const quickPresets = [
    'Confirming daily homework submission & lesson feedback.',
    'Reporting child illness / planned absence from classes.',
    'Inquiring about terminal assessment and scores.',
    'Confirmation of school fees bank payment & receipt clearance.',
    'Requesting a virtual one-on-one video call.'
  ];

  const POPULAR_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏', '👏', '🎉', '🔥', '✅'];

  // Current transmitter identifier helper
  const isMessageTransmitter = (msg: ParentStaffMessage): boolean => {
    if (isParent) {
      const myParentId = currentParent?.id || 'PAR-1';
      return msg.senderRole === 'parent' && (
        msg.parentId === myParentId || 
        msg.senderId === myParentId || 
        (currentParent?.email && msg.parentEmail?.toLowerCase() === currentParent.email.toLowerCase())
      );
    }
    if (isTeacher) {
      const myUsername = (currentTeacher?.username || currentUserName || 'staff').toLowerCase();
      return msg.senderRole === 'teacher' && (
        msg.staffId.toLowerCase() === myUsername ||
        (msg.senderId && msg.senderId.toLowerCase() === myUsername)
      );
    }
    if (isAdmin) {
      return msg.senderRole === 'admin' && (
        msg.staffId.toLowerCase() === 'admin' ||
        (msg.senderId && msg.senderId.toLowerCase() === 'admin')
      );
    }
    return false;
  };

  // Filter messages for current active thread
  const threadMessages = useMemo(() => {
    let list: ParentStaffMessage[] = [];
    if (isParent) {
      const parentId = currentParent?.id || 'PAR-1';
      list = messages.filter(m => 
        (m.parentId === parentId || m.parentEmail === currentParent?.email) &&
        (m.staffId === selectedStaffId || (!m.staffId && selectedStaffId === 'staff'))
      );
    } else if (isTeacher) {
      const staffUser = currentTeacher?.username || currentUserName || 'staff';
      list = messages.filter(m => 
        (m.staffId.toLowerCase() === staffUser.toLowerCase() || m.staffId === 'staff') &&
        (!selectedParentId || m.parentId === selectedParentId)
      );
    } else {
      // Admin
      list = messages.filter(m => 
        (!selectedParentId || m.parentId === selectedParentId) &&
        (!selectedStaffId || m.staffId === selectedStaffId)
      );
    }

    // Sort chronologically (oldest to newest for chat stream)
    list = [...list].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    if (searchInChat.trim()) {
      const q = searchInChat.toLowerCase();
      list = list.filter(m => m.message.toLowerCase().includes(q) || (m.subject && m.subject.toLowerCase().includes(q)));
    }

    return list;
  }, [messages, isParent, isTeacher, currentParent, currentTeacher, currentUserName, selectedStaffId, selectedParentId, searchInChat]);

  // Automatically mark received unread messages as read/seen
  useEffect(() => {
    const unreadReceived = threadMessages.filter(m => !isMessageTransmitter(m) && (!m.read || m.status !== 'read'));
    if (unreadReceived.length > 0 && onMarkAsRead) {
      const ids = unreadReceived.map(m => m.id);
      onMarkAsRead(ids);
    }
  }, [threadMessages]);

  // Scroll to bottom on new message or conversation switch
  useEffect(() => {
    chatMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [threadMessages.length, selectedStaffId, selectedParentId]);

  const activeStaffObj = staffDirectory.find(s => s.id === selectedStaffId) || staffDirectory[0];
  const activeParentObj = parents.find(p => p.id === selectedParentId) || parents[0] || {
    id: 'PAR-1',
    fullName: 'Mrs. Folashade Adebayo',
    phone: '08034567890',
    email: 'parent@Godshand.sch.ng',
    childrenStudentIds: []
  };

  // Contacts list with unread counter & last message preview
  const parentContactsWithMeta = useMemo(() => {
    return parents.map(p => {
      const pMsgs = messages.filter(m => m.parentId === p.id);
      const lastMsg = pMsgs[pMsgs.length - 1];
      const unreadCount = pMsgs.filter(m => m.senderRole === 'parent' && !m.read).length;
      return {
        ...p,
        lastMsg,
        unreadCount
      };
    });
  }, [parents, messages]);

  const staffContactsWithMeta = useMemo(() => {
    const myParentId = currentParent?.id || 'PAR-1';
    return staffDirectory.map(s => {
      const sMsgs = messages.filter(m => m.parentId === myParentId && (m.staffId === s.id || (s.id === 'staff' && !m.staffId)));
      const lastMsg = sMsgs[sMsgs.length - 1];
      const unreadCount = sMsgs.filter(m => m.senderRole !== 'parent' && !m.read).length;
      return {
        ...s,
        lastMsg,
        unreadCount
      };
    });
  }, [staffDirectory, messages, currentParent]);

  // Handle Send
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
        subject: messageSubject.trim() || undefined,
        message: messageText.trim(),
        senderRole: 'parent',
        senderId: pId,
        priority: 'normal',
        read: false,
        status: 'delivered',
        deliveredAt: new Date().toISOString()
      });
    } else {
      const staffSender = currentTeacher?.username || currentUserName || 'School Staff';
      const targetParent = activeParentObj;

      onSendMessage({
        parentId: targetParent.id,
        parentName: targetParent.fullName,
        parentEmail: targetParent.email,
        staffId: staffSender,
        staffName: currentUserName || 'School Educator',
        studentId: selectedChild?.id,
        studentName: selectedChild?.name,
        studentGrade: selectedChild?.grade,
        subject: messageSubject.trim() || undefined,
        message: messageText.trim(),
        senderRole: isAdmin ? 'admin' : 'teacher',
        senderId: staffSender,
        priority: 'normal',
        read: false,
        status: 'delivered',
        deliveredAt: new Date().toISOString()
      });
    }

    setMessageText('');
    setMessageSubject('');
    setShowEmojiPicker(false);
  };

  // Handle Copy Message
  const handleCopyMessage = (text: string) => {
    navigator.clipboard.writeText(text);
    showToast('✓ Message copied to clipboard');
    setActiveContextMenuMsgId(null);
  };

  // Handle Edit Message
  const handleSaveEdit = (msgId: string) => {
    if (!editingMessageText.trim()) return;
    if (onEditMessage) {
      onEditMessage(msgId, editingMessageText.trim());
      showToast('✓ Message edited successfully');
    }
    setEditingMessageId(null);
    setEditingMessageText('');
    setActiveContextMenuMsgId(null);
  };

  // Handle Delete Message (Only transmitter!)
  const handleDeleteMessage = (msg: ParentStaffMessage) => {
    if (!isMessageTransmitter(msg)) {
      alert("Permission Denied: Only the transmitter (the person who sent this message) is allowed to delete it.");
      return;
    }

    if (window.confirm("Delete this message for everyone? This action cannot be undone.")) {
      if (onDeleteMessage) {
        onDeleteMessage(msg.id);
        showToast('🗑️ Message deleted');
      }
      setActiveContextMenuMsgId(null);
    }
  };

  // Handle Reaction
  const handleToggleReaction = (msgId: string, emoji: string) => {
    if (onReactMessage) {
      onReactMessage(msgId, emoji);
    }
    setActiveContextMenuMsgId(null);
  };

  // Touch Long-Press event handlers for mobile
  const handleTouchStart = (msgId: string) => {
    longPressTimerRef.current = setTimeout(() => {
      if (typeof navigator !== 'undefined' && (navigator as any).vibrate) {
        (navigator as any).vibrate(40);
      }
      setActiveContextMenuMsgId(msgId);
    }, 380);
  };

  const handleTouchEnd = () => {
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
  };

  return (
    <div className="w-full max-w-7xl mx-auto rounded-3xl shadow-2xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden flex flex-col transition-colors duration-200">
      {/* Toast Feedback */}
      {toastMessage && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] px-4 py-2.5 bg-slate-900/95 text-white dark:bg-yellow-400 dark:text-blue-950 font-black text-xs rounded-full shadow-2xl flex items-center gap-2 border border-yellow-400/40 animate-in fade-in slide-in-from-top-4 duration-200">
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top School Portal Bar with WhatsApp Gateway Status */}
      <div className="bg-gradient-to-r from-blue-950 via-blue-900 to-indigo-950 text-white px-4 py-3 border-b-2 border-yellow-400 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-emerald-500 text-white flex items-center justify-center text-lg font-black shadow-md shrink-0">
            💬
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-serif font-black text-sm sm:text-base text-yellow-300">
                Parent-Teacher WhatsApp Chat
              </h2>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[9px] font-black uppercase tracking-wider border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                Active Gateway
              </span>
            </div>
            <p className="text-[10px] text-slate-300">
              {isParent 
                ? `Logged in as Guardian: ${currentParent?.fullName || currentUserName || 'Parent'}` 
                : isTeacher 
                  ? `Logged in as Staff: ${currentTeacher?.username.toUpperCase() || 'Educator'}` 
                  : 'Administrator Direct Portal'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onGoToCommunityHub && (
            <button
              type="button"
              onClick={onGoToCommunityHub}
              className="px-3 py-1.5 bg-yellow-400 hover:bg-yellow-300 text-blue-950 rounded-xl font-black text-[11px] uppercase tracking-wider transition-all flex items-center gap-1 active:scale-95 shadow-sm"
            >
              <span>📞</span>
              <span className="hidden sm:inline">Community Meetings</span>
            </button>
          )}
          <button
            type="button"
            onClick={onBack}
            className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl font-black text-[11px] uppercase tracking-wider transition-all"
          >
            ← Back
          </button>
        </div>
      </div>

      {/* Main WhatsApp Split Layout */}
      <div className="grid grid-cols-1 md:grid-cols-12 min-h-[640px] max-h-[780px]">
        {/* LEFT COLUMN: WhatsApp Contacts / Chat Threads */}
        <div className={`md:col-span-4 lg:col-span-4 border-r border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#111b21] flex flex-col ${
          mobileView === 'chat' ? 'hidden md:flex' : 'flex'
        }`}>
          {/* Contacts Header & Search */}
          <div className="p-3.5 bg-slate-100 dark:bg-[#202c33] border-b border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                {isParent ? 'Chats with Staff' : 'Parent Enquiries'}
              </span>
              <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-[10px] font-black rounded-full">
                {isParent ? staffDirectory.length : parents.length} Contacts
              </span>
            </div>

            {/* If Parent: Linked Child Filter */}
            {isParent && linkedChildren.length > 0 && (
              <div className="pt-1">
                <label className="block text-[9px] font-black uppercase text-slate-500 dark:text-slate-400 mb-1">
                  Regarding Pupil:
                </label>
                <div className="flex gap-1 overflow-x-auto pb-1 no-scrollbar">
                  {linkedChildren.map(c => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        setSelectedChildId(c.id);
                        const match = staffDirectory.find(s => s.grades.includes(c.grade));
                        if (match) setSelectedStaffId(match.id);
                      }}
                      className={`px-2.5 py-1 rounded-xl text-[10px] font-bold whitespace-nowrap transition-all border ${
                        selectedChild?.id === c.id
                          ? 'bg-blue-900 text-yellow-400 border-blue-900 dark:bg-yellow-400 dark:text-blue-950 dark:border-yellow-400 shadow-xs'
                          : 'bg-white dark:bg-[#111b21] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {c.name.split(' ')[0]} ({c.grade})
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Search Input */}
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">🔍</span>
              <input
                type="text"
                value={searchContact}
                onChange={e => setSearchContact(e.target.value)}
                placeholder="Search or start new chat..."
                className="w-full pl-8 pr-3 py-1.5 bg-white dark:bg-[#111b21] border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Contacts List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
            {isParent ? (
              staffContactsWithMeta
                .filter(s => s.name.toLowerCase().includes(searchContact.toLowerCase()) || s.roleDesc.toLowerCase().includes(searchContact.toLowerCase()))
                .map(staff => {
                  const isSelected = selectedStaffId === staff.id;
                  const isChildTeacher = selectedChild && staff.grades.includes(selectedChild.grade);
                  const lastMsg = staff.lastMsg;

                  return (
                    <div
                      key={staff.id}
                      onClick={() => {
                        setSelectedStaffId(staff.id);
                        setMobileView('chat');
                      }}
                      className={`p-3.5 flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                        isSelected 
                          ? 'bg-emerald-50 dark:bg-[#2a3942] border-l-4 border-emerald-500' 
                          : 'hover:bg-slate-100/80 dark:hover:bg-[#202c33]'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="relative shrink-0">
                          <div className="w-11 h-11 rounded-full bg-blue-900 dark:bg-slate-800 text-yellow-400 flex items-center justify-center text-lg font-black border border-yellow-400/50 shadow-xs">
                            {staff.avatar}
                          </div>
                          <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white dark:border-[#111b21]"></span>
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1 mb-0.5">
                            <p className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate">
                              {staff.name}
                            </p>
                            {lastMsg && (
                              <span className="text-[10px] text-slate-400 shrink-0 font-medium">
                                {new Date(lastMsg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center justify-between gap-1">
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate flex items-center gap-1">
                              {lastMsg ? (
                                <>
                                  {isMessageTransmitter(lastMsg) && (
                                    <span className={lastMsg.status === 'read' ? 'text-[#53bdeb]' : 'text-slate-400'}>
                                      {lastMsg.status === 'read' ? '✓✓' : '✓✓'}
                                    </span>
                                  )}
                                  <span>{lastMsg.message}</span>
                                </>
                              ) : (
                                <span>{isChildTeacher ? 'Class Educator' : staff.roleDesc}</span>
                              )}
                            </p>
                            {staff.unreadCount > 0 && (
                              <span className="px-1.5 py-0.2 rounded-full bg-emerald-500 text-white text-[9px] font-black shrink-0">
                                {staff.unreadCount}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
            ) : (
              parentContactsWithMeta
                .filter(p => p.fullName.toLowerCase().includes(searchContact.toLowerCase()) || p.phone.includes(searchContact))
                .map(parentItem => {
                  const isSelected = selectedParentId === parentItem.id;
                  const parentChildren = students.filter(s => (parentItem.childrenStudentIds || []).includes(s.id));
                  const lastMsg = parentItem.lastMsg;

                  return (
                    <div
                      key={parentItem.id}
                      onClick={() => {
                        setSelectedParentId(parentItem.id);
                        setMobileView('chat');
                      }}
                      className={`p-3.5 flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                        isSelected 
                          ? 'bg-emerald-50 dark:bg-[#2a3942] border-l-4 border-emerald-500' 
                          : 'hover:bg-slate-100/80 dark:hover:bg-[#202c33]'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="relative shrink-0">
                          <div className="w-11 h-11 rounded-full bg-indigo-950 dark:bg-slate-800 text-yellow-400 flex items-center justify-center text-lg font-black border border-yellow-400/50 shadow-xs">
                            👨‍👩‍👧‍👦
                          </div>
                          <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white dark:border-[#111b21]"></span>
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1 mb-0.5">
                            <p className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate">
                              {parentItem.fullName}
                            </p>
                            {lastMsg && (
                              <span className="text-[10px] text-slate-400 shrink-0 font-medium">
                                {new Date(lastMsg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center justify-between gap-1">
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate flex items-center gap-1">
                              {lastMsg ? (
                                <>
                                  {isMessageTransmitter(lastMsg) && (
                                    <span className={lastMsg.status === 'read' ? 'text-[#53bdeb]' : 'text-slate-400'}>
                                      {lastMsg.status === 'read' ? '✓✓' : '✓✓'}
                                    </span>
                                  )}
                                  <span>{lastMsg.message}</span>
                                </>
                              ) : (
                                <span>Children: {parentChildren.map(c => c.name).join(', ') || 'Pupil'}</span>
                              )}
                            </p>
                            {parentItem.unreadCount > 0 && (
                              <span className="px-1.5 py-0.2 rounded-full bg-emerald-500 text-white text-[9px] font-black shrink-0">
                                {parentItem.unreadCount}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: WhatsApp Active Conversation Window */}
        <div className={`md:col-span-8 lg:col-span-8 flex flex-col bg-[#efeae2] dark:bg-[#0b141a] whatsapp-chat-bg ${
          mobileView === 'list' ? 'hidden md:flex' : 'flex'
        }`}>
          {/* WhatsApp Chat Header */}
          <div className="px-4 py-2.5 bg-slate-100 dark:bg-[#202c33] border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3 min-w-0">
              {/* Mobile Back Button */}
              <button
                type="button"
                onClick={() => setMobileView('list')}
                className="md:hidden p-1.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
                title="Back to contacts"
              >
                ←
              </button>

              <div className="relative shrink-0">
                <div className="w-10 h-10 rounded-full bg-blue-900 dark:bg-slate-800 text-yellow-400 flex items-center justify-center text-lg font-black border border-yellow-400 shadow-xs">
                  {isParent ? (activeStaffObj?.avatar || '👔') : '👨‍👩‍👧‍👦'}
                </div>
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white dark:border-[#202c33]"></span>
              </div>

              <div className="min-w-0">
                <h3 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100 truncate">
                  {isParent ? activeStaffObj?.name : activeParentObj?.fullName}
                </h3>
                <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold truncate flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>online</span>
                  <span className="text-slate-400 font-normal hidden sm:inline">•</span>
                  <span className="text-slate-500 dark:text-slate-400 font-normal hidden sm:inline">
                    {isParent ? activeStaffObj?.roleDesc : `Phone: ${activeParentObj?.phone || 'On file'}`}
                  </span>
                </p>
              </div>
            </div>

            {/* Header Action Buttons (Voice Call, Video Call, Search) */}
            <div className="flex items-center gap-1.5 shrink-0">
              {onInitiateCall && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      const targetId = isParent ? activeStaffObj.id : activeParentObj.id;
                      const targetName = isParent ? activeStaffObj.name : activeParentObj.fullName;
                      const targetRole = isParent ? (activeStaffObj.id === 'admin' ? UserRole.ADMIN : UserRole.TEACHER) : UserRole.PARENT;
                      onInitiateCall(targetId, targetName, targetRole, 'voice');
                    }}
                    className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-[#2a3942] text-slate-700 dark:text-slate-200 transition-all"
                    title="Make WhatsApp Voice Call"
                  >
                    📞
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const targetId = isParent ? activeStaffObj.id : activeParentObj.id;
                      const targetName = isParent ? activeStaffObj.name : activeParentObj.fullName;
                      const targetRole = isParent ? (activeStaffObj.id === 'admin' ? UserRole.ADMIN : UserRole.TEACHER) : UserRole.PARENT;
                      onInitiateCall(targetId, targetName, targetRole, 'video');
                    }}
                    className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-[#2a3942] text-slate-700 dark:text-slate-200 transition-all"
                    title="Make WhatsApp Video Call"
                  >
                    📹
                  </button>
                </>
              )}

              <button
                type="button"
                onClick={() => setShowSearchInChat(!showSearchInChat)}
                className={`p-2 rounded-full transition-all ${
                  showSearchInChat ? 'bg-yellow-400 text-blue-950' : 'hover:bg-slate-200 dark:hover:bg-[#2a3942] text-slate-700 dark:text-slate-200'
                }`}
                title="Search messages in conversation"
              >
                🔍
              </button>
            </div>
          </div>

          {/* Search bar inside conversation */}
          {showSearchInChat && (
            <div className="px-4 py-2 bg-yellow-50 dark:bg-slate-900 border-b border-yellow-200 dark:border-slate-800 flex items-center gap-2">
              <span className="text-xs text-slate-500">🔍</span>
              <input
                type="text"
                autoFocus
                value={searchInChat}
                onChange={e => setSearchInChat(e.target.value)}
                placeholder="Search text in this chat..."
                className="flex-1 bg-transparent text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 outline-none"
              />
              {searchInChat && (
                <button
                  type="button"
                  onClick={() => setSearchInChat('')}
                  className="text-xs text-slate-400 hover:text-slate-600"
                >
                  ✕
                </button>
              )}
            </div>
          )}

          {/* WhatsApp Messages Scroll Stream */}
          <div className="flex-1 p-3 sm:p-5 overflow-y-auto space-y-3">
            {/* End-to-end security advisory */}
            <div className="max-w-md mx-auto my-2 p-2 rounded-xl bg-yellow-100/90 dark:bg-[#182229] border border-yellow-300/60 dark:border-yellow-900/40 text-center shadow-xs">
              <p className="text-[10px] text-yellow-950 dark:text-yellow-300 font-medium leading-relaxed flex items-center justify-center gap-1.5">
                <span>🔒</span>
                <span>Messages and calls are end-to-end synced in real-time with God's Hand Model School portal. Tap and long-press any message for options.</span>
              </p>
            </div>

            {/* Date separator pill */}
            <div className="flex justify-center my-3">
              <span className="px-3 py-1 bg-white/80 dark:bg-[#182229]/90 backdrop-blur-xs text-slate-600 dark:text-slate-300 text-[10px] font-black uppercase rounded-lg shadow-xs border border-slate-200/50 dark:border-slate-800">
                TODAY
              </span>
            </div>

            {threadMessages.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-center p-6 space-y-2 text-slate-400">
                <span className="text-4xl">💬</span>
                <p className="font-bold text-xs sm:text-sm text-slate-700 dark:text-slate-300">
                  No messages with {isParent ? activeStaffObj?.name : activeParentObj?.fullName} yet.
                </p>
                <p className="text-[11px] text-slate-500 max-w-sm">
                  Send a message below. Messages deliver instantaneously with WhatsApp-style delivery & read ticks.
                </p>
              </div>
            ) : (
              threadMessages.map(msg => {
                const isSentByMe = isMessageTransmitter(msg);
                const isContextMenuOpen = activeContextMenuMsgId === msg.id;
                const isEditing = editingMessageId === msg.id;
                const canDelete = isSentByMe; // strictly transmitter only
                const canEdit = isSentByMe;   // transmitter only

                // Reaction badges count
                const appliedReactions = Object.entries(msg.reactions || {}).filter(([_, users]) => (users || []).length > 0);

                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col relative group ${isSentByMe ? 'items-end' : 'items-start'}`}
                  >
                    {/* Floating Action Menu for Long-Press / Click */}
                    {isContextMenuOpen && (
                      <div 
                        className={`absolute z-30 -top-14 ${isSentByMe ? 'right-0' : 'left-0'} bg-white dark:bg-[#202c33] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 p-1.5 flex items-center gap-1 animate-in zoom-in-95 duration-150`}
                        onClick={e => e.stopPropagation()}
                      >
                        {/* Quick Reactions Bar */}
                        <div className="flex items-center gap-0.5 pr-1.5 border-r border-slate-200 dark:border-slate-700">
                          {POPULAR_EMOJIS.slice(0, 6).map(emoji => (
                            <button
                              key={emoji}
                              type="button"
                              onClick={() => handleToggleReaction(msg.id, emoji)}
                              className="w-7 h-7 rounded-xl hover:bg-slate-100 dark:hover:bg-[#2a3942] flex items-center justify-center text-sm transition-transform hover:scale-125"
                              title={`React ${emoji}`}
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>

                        {/* Action buttons */}
                        <button
                          type="button"
                          onClick={() => handleCopyMessage(msg.message)}
                          className="px-2 py-1 hover:bg-slate-100 dark:hover:bg-[#2a3942] text-slate-700 dark:text-slate-200 rounded-lg text-[10px] font-black uppercase flex items-center gap-1"
                          title="Copy message text"
                        >
                          <span>📋</span>
                          <span>Copy</span>
                        </button>

                        {canEdit && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingMessageId(msg.id);
                              setEditingMessageText(msg.message);
                              setActiveContextMenuMsgId(null);
                            }}
                            className="px-2 py-1 hover:bg-slate-100 dark:hover:bg-[#2a3942] text-slate-700 dark:text-slate-200 rounded-lg text-[10px] font-black uppercase flex items-center gap-1"
                            title="Edit message"
                          >
                            <span>✏️</span>
                            <span>Edit</span>
                          </button>
                        )}

                        {canDelete ? (
                          <button
                            type="button"
                            onClick={() => handleDeleteMessage(msg)}
                            className="px-2 py-1 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 dark:hover:bg-rose-900 text-rose-600 dark:text-rose-300 rounded-lg text-[10px] font-black uppercase flex items-center gap-1"
                            title="Delete message for everyone"
                          >
                            <span>🗑️</span>
                            <span>Delete</span>
                          </button>
                        ) : (
                          <span 
                            className="px-2 py-1 text-slate-400 text-[9px] font-bold italic"
                            title="Only the sender (transmitter) can delete this message"
                          >
                            🔒 Sender Only
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={() => setInfoMessageId(infoMessageId === msg.id ? null : msg.id)}
                          className="px-1.5 py-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-bold"
                          title="Message Info"
                        >
                          ℹ️
                        </button>

                        <button
                          type="button"
                          onClick={() => setActiveContextMenuMsgId(null)}
                          className="px-1.5 py-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-bold"
                          title="Close menu"
                        >
                          ✕
                        </button>
                      </div>
                    )}

                    {/* WhatsApp Bubble Container */}
                    <div
                      onContextMenu={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setActiveContextMenuMsgId(isContextMenuOpen ? null : msg.id);
                      }}
                      onTouchStart={() => handleTouchStart(msg.id)}
                      onTouchEnd={handleTouchEnd}
                      onTouchMove={handleTouchEnd}
                      className={`relative max-w-[85%] sm:max-w-[70%] px-3.5 py-2 rounded-2xl shadow-sm transition-all select-text cursor-pointer ${
                        isSentByMe
                          ? 'bg-[#d9fdd3] dark:bg-[#005c4b] text-[#111b21] dark:text-[#e9edef] rounded-tr-xs'
                          : 'bg-white dark:bg-[#202c33] text-[#111b21] dark:text-[#e9edef] rounded-tl-xs border border-slate-200/40 dark:border-slate-800'
                      } ${isContextMenuOpen ? 'ring-2 ring-emerald-500 shadow-md' : ''}`}
                      title="Long press on mobile or click '•••' for WhatsApp options (Edit, Delete, React, Copy)"
                    >
                      {/* Sender Name in group/multiway contexts */}
                      {!isSentByMe && (
                        <p className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 mb-0.5">
                          {msg.senderRole === 'parent' ? msg.parentName : msg.staffName}
                        </p>
                      )}

                      {/* Optional Subject */}
                      {msg.subject && (
                        <p className="text-[10px] font-black uppercase tracking-wider mb-1 text-blue-900 dark:text-yellow-300">
                          {msg.subject}
                        </p>
                      )}

                      {/* Optional Student Ref */}
                      {msg.studentName && (
                        <p className="text-[9px] font-bold mb-1 opacity-75 border-b border-black/5 dark:border-white/5 pb-0.5">
                          Pupil: {msg.studentName} ({msg.studentGrade || 'Class'})
                        </p>
                      )}

                      {/* Message Content or Inline Editor */}
                      {isEditing ? (
                        <div className="space-y-2 pt-1" onClick={e => e.stopPropagation()}>
                          <textarea
                            rows={3}
                            value={editingMessageText}
                            onChange={e => setEditingMessageText(e.target.value)}
                            className="w-full p-2 bg-white dark:bg-[#111b21] text-slate-900 dark:text-white rounded-xl text-xs font-medium border-2 border-emerald-500 outline-none"
                            autoFocus
                          />
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => setEditingMessageId(null)}
                              className="px-2.5 py-1 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-[10px] font-black uppercase"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSaveEdit(msg.id)}
                              className="px-3 py-1 bg-emerald-600 text-white rounded-lg text-[10px] font-black uppercase shadow-xs hover:bg-emerald-500"
                            >
                              Save
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col">
                          <p className="text-xs sm:text-sm whitespace-pre-wrap leading-relaxed font-normal pr-14 break-words">
                            {msg.message}
                          </p>

                          {/* Footer row with time, edited badge & delivery check ticks */}
                          <div className="self-end -mt-1 flex items-center gap-1 select-none">
                            {msg.isEdited && (
                              <span className="text-[9px] italic opacity-60">
                                edited
                              </span>
                            )}
                            <span className="text-[10px] opacity-60 font-medium">
                              {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>

                            {/* WhatsApp Delivery Ticks for messages sent by transmitter */}
                            {isSentByMe && (
                              <span 
                                className={`text-[11px] font-black tracking-tighter inline-flex items-center ml-0.5 ${
                                  msg.status === 'read' || msg.status === 'seen' || msg.read
                                    ? 'text-[#53bdeb]' // WhatsApp Blue Ticks
                                    : 'text-slate-400 dark:text-slate-400' // Grey Ticks
                                }`}
                                title={
                                  msg.status === 'read' || msg.read
                                    ? `Read/Seen: ${msg.readAt ? new Date(msg.readAt).toLocaleTimeString() : 'Yes'}`
                                    : msg.status === 'delivered'
                                      ? `Delivered: ${msg.deliveredAt ? new Date(msg.deliveredAt).toLocaleTimeString() : 'Delivered to recipient'}`
                                      : 'Sent to school server'
                                }
                              >
                                {msg.status === 'read' || msg.read ? '✓✓' : msg.status === 'delivered' ? '✓✓' : '✓'}
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Desktop hover chevron trigger */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveContextMenuMsgId(isContextMenuOpen ? null : msg.id);
                        }}
                        className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white text-xs font-bold"
                        title="Options / Reactions"
                      >
                        •••
                      </button>
                    </div>

                    {/* Applied Emoji Reactions Pill */}
                    {appliedReactions.length > 0 && (
                      <div className={`flex flex-wrap items-center gap-1 -mt-1 z-10 ${isSentByMe ? 'mr-2' : 'ml-2'}`}>
                        {appliedReactions.map(([emoji, users]) => {
                          const count = (users || []).length;
                          return (
                            <button
                              key={emoji}
                              type="button"
                              onClick={() => handleToggleReaction(msg.id, emoji)}
                              className="px-2 py-0.5 bg-white dark:bg-[#202c33] border border-slate-200 dark:border-slate-700 rounded-full text-[10px] font-bold flex items-center gap-1 shadow-xs hover:scale-105 transition-transform"
                              title={`${(users || []).join(', ')} reacted ${emoji}`}
                            >
                              <span>{emoji}</span>
                              <span className="text-slate-600 dark:text-slate-300 text-[9px]">{count}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* Info Modal / Drawer (Timestamp breakdown) */}
                    {infoMessageId === msg.id && (
                      <div className="mt-1 p-2.5 bg-white dark:bg-[#202c33] border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg text-[10px] space-y-1">
                        <div className="flex justify-between font-bold border-b pb-1 dark:border-slate-700">
                          <span>Message Delivery Info</span>
                          <button type="button" onClick={() => setInfoMessageId(null)}>✕</button>
                        </div>
                        <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                          <span>Sent:</span>
                          <span className="font-mono">{new Date(msg.timestamp).toLocaleString()}</span>
                        </div>
                        <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                          <span>Delivered:</span>
                          <span className="font-mono">{msg.deliveredAt ? new Date(msg.deliveredAt).toLocaleString() : 'Delivered'}</span>
                        </div>
                        <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                          <span>Read / Seen:</span>
                          <span className="font-mono text-[#53bdeb] font-bold">
                            {msg.readAt ? new Date(msg.readAt).toLocaleString() : (msg.read ? 'Read by recipient' : 'Not yet read')}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
            <div ref={chatMessagesEndRef} />
          </div>

          {/* Quick Message Chips */}
          <div className="px-3 py-1.5 bg-slate-100/90 dark:bg-[#202c33]/90 border-t border-slate-200 dark:border-slate-800 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            <span className="text-[9px] font-black uppercase text-slate-400 shrink-0">
              ⚡ Quick:
            </span>
            {quickPresets.map((preset, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setMessageText(preset)}
                className="px-2.5 py-1 bg-white dark:bg-[#111b21] hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full text-[10px] font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap transition-all shadow-xs shrink-0"
              >
                {preset.slice(0, 28)}...
              </button>
            ))}
          </div>

          {/* Emoji Picker Row if toggled */}
          {showEmojiPicker && (
            <div className="px-4 py-2 bg-white dark:bg-[#202c33] border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center gap-2">
              {POPULAR_EMOJIS.map(emoji => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setMessageText(prev => prev + emoji)}
                  className="w-8 h-8 rounded-xl hover:bg-slate-100 dark:hover:bg-[#2a3942] flex items-center justify-center text-lg hover:scale-125 transition-transform"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}

          {/* WhatsApp Message Composer */}
          <form 
            onSubmit={handleSend}
            className="p-3 bg-slate-100 dark:bg-[#202c33] border-t border-slate-200 dark:border-slate-800 flex items-end gap-2"
          >
            {/* Emoji Button */}
            <button
              type="button"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="p-2.5 rounded-full hover:bg-slate-200 dark:hover:bg-[#2a3942] text-slate-600 dark:text-slate-300 transition-colors text-lg"
              title="Add Emoji"
            >
              😊
            </button>

            {/* Attachment Button */}
            <button
              type="button"
              onClick={() => {
                const choice = prompt("Enter attachment note or reference (e.g. Receipt Reference, Homework Question):");
                if (choice) {
                  setMessageText(prev => (prev ? `${prev}\n[Attachment Ref: ${choice}]` : `[Attachment Ref: ${choice}]`));
                }
              }}
              className="p-2.5 rounded-full hover:bg-slate-200 dark:hover:bg-[#2a3942] text-slate-600 dark:text-slate-300 transition-colors text-lg"
              title="Attach Document or Receipt Reference"
            >
              📎
            </button>

            {/* Input Box */}
            <div className="flex-1 bg-white dark:bg-[#2a3942] rounded-2xl border border-slate-200 dark:border-slate-700 px-3 py-1.5 focus-within:ring-2 focus-within:ring-emerald-500 shadow-xs">
              <textarea
                ref={messageInputRef}
                rows={1}
                value={messageText}
                onChange={e => setMessageText(e.target.value)}
                placeholder="Type a message (Press Enter to send, Shift+Enter for new line)..."
                className="w-full bg-transparent text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none resize-none max-h-24 py-1"
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
              />
            </div>

            {/* Send / Mic Button */}
            <button
              type="submit"
              disabled={!messageText.trim()}
              className={`w-11 h-11 rounded-full flex items-center justify-center text-lg font-black transition-all shadow-md shrink-0 ${
                messageText.trim()
                  ? 'bg-emerald-500 hover:bg-emerald-600 text-white active:scale-95'
                  : 'bg-slate-300 dark:bg-slate-700 text-slate-500 dark:text-slate-400 cursor-not-allowed'
              }`}
              title="Send Message"
            >
              ➔
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
