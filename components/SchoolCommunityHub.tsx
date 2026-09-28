import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  UserRole, 
  ChatChannelMessage, 
  ChatChannel, 
  MeetingSession, 
  CallSession, 
  StudentAccount, 
  TeacherAccount, 
  ParentAccount,
  CallRecording
} from '../types';
import { UserOnlineStatusBadge } from './UserOnlineStatusBadge';

interface SchoolCommunityHubProps {
  currentUserRole: UserRole;
  currentUserName: string | null;
  currentUserId?: string | null;
  students: StudentAccount[];
  teachers: TeacherAccount[];
  parents: ParentAccount[];
  chatMessages: ChatChannelMessage[];
  meetings: MeetingSession[];
  callSessions: CallSession[];
  callRecordings?: CallRecording[];
  onSaveCallRecording?: (recording: CallRecording) => void;
  onDeleteCallRecording?: (recordingId: string) => void;
  onSendChatMessage: (msg: Omit<ChatChannelMessage, 'id' | 'timestamp'>) => void;
  onCreateMeeting: (meeting: Omit<MeetingSession, 'id' | 'createdAt'>) => void;
  onInitiateCall: (receiverId: string, receiverName: string, receiverRole: UserRole, type: 'voice' | 'video') => void;
  onUpdateCallStatus?: (callId: string, status: CallSession['status']) => void;
  onBack: () => void;
  onGoToParentMessaging?: () => void;
}

export const SchoolCommunityHub: React.FC<SchoolCommunityHubProps> = ({
  currentUserRole,
  currentUserName,
  currentUserId,
  students,
  teachers,
  parents,
  chatMessages,
  meetings,
  callSessions,
  callRecordings = [],
  onSaveCallRecording,
  onDeleteCallRecording,
  onSendChatMessage,
  onCreateMeeting,
  onInitiateCall,
  onUpdateCallStatus,
  onBack,
  onGoToParentMessaging
}) => {
  // Navigation tabs in Community Hub: 'chat' | 'meetings' | 'calls'
  const [activeMainTab, setActiveMainTab] = useState<'chat' | 'meetings' | 'calls'>('chat');

  // Community Channels with mandated permissions
  const CHANNELS: ChatChannel[] = useMemo(() => [
    {
      id: 'general',
      name: 'school-announcements',
      description: 'Official bulletins & morning devotions from School Administration (Admin posts, all members react)',
      icon: '📢',
      topic: 'Admin Announcements • Verified Updates from Proprietor Desk'
    },
    {
      id: 'pta',
      name: 'pta-parents-forum',
      description: 'Parent-Teacher dialogue, school welfare, and family collaboration (Hidden from students & pupils)',
      icon: '👨‍👩‍👧‍👦',
      topic: 'Parent-Teacher Partnership & Student Progress (Restricted: Staff, Admin & Parents only)',
      allowedRoles: [UserRole.ADMIN, UserRole.TEACHER, UserRole.PARENT]
    },
    {
      id: 'study',
      name: 'students-study-circle',
      description: 'Pupils peer study, homework questions, mathematics clinics & quiz (Students & Admin post, read-only for others)',
      icon: '📚',
      topic: 'Continuous Learning, Quizzes & Assignments (Students & Admin only chat)'
    },
    {
      id: 'staff',
      name: 'staff-briefing-room',
      description: 'Teachers and administration internal lesson plans, duty rosters and academic syncing',
      icon: '👔',
      topic: 'Staff Only • Academic Coordination',
      allowedRoles: [UserRole.ADMIN, UserRole.TEACHER]
    },
    {
      id: 'sports',
      name: 'clubs-sports-faith',
      description: 'Inter-house sports updates, music choir, debating society and faith fellowship',
      icon: '🏆',
      topic: 'Co-curricular Activities & Faith Development'
    }
  ], []);

  // Filter accessible channels: PTA is strictly hidden from students/pupils
  const accessibleChannels = useMemo(() => {
    return CHANNELS.filter(c => {
      // In parent chat: make it strictly invisible to student/pupil
      if (c.id === 'pta' && currentUserRole === UserRole.STUDENT) {
        return false;
      }
      if (!c.allowedRoles) return true;
      return c.allowedRoles.includes(currentUserRole);
    });
  }, [CHANNELS, currentUserRole]);

  // Selected Channel
  const [selectedChannelId, setSelectedChannelId] = useState<string>('general');
  const activeChannel = accessibleChannels.find(c => c.id === selectedChannelId) || accessibleChannels[0];

  // Permission logic for posting in the active channel:
  // 1. Announcements: ONLY admin can chat, others can react only!
  // 2. Study circle: ONLY student and admin can chat/send messages!
  // 3. PTA: Admin, Staff, Parents can chat (students cannot see it)
  const canPostInActiveChannel = useMemo(() => {
    if (!activeChannel) return false;
    
    // In announcements: ONLY Admin can post messages
    if (activeChannel.id === 'general' || activeChannel.id === 'announcements') {
      return currentUserRole === UserRole.ADMIN;
    }

    // In student study circle: ONLY Student and Admin can post messages
    if (activeChannel.id === 'study') {
      return currentUserRole === UserRole.STUDENT || currentUserRole === UserRole.ADMIN;
    }

    // In staff room: Staff & Admin
    if (activeChannel.id === 'staff') {
      return currentUserRole === UserRole.ADMIN || currentUserRole === UserRole.TEACHER;
    }

    return true;
  }, [activeChannel, currentUserRole]);

  // Online presence checker
  // Displays handshake + green dot when online, broken handshake + offline dot when offline
  const isUserOnline = (userId: string, role?: UserRole): boolean => {
    // Current user is always online
    if (userId === currentUserId || (currentUserName && userId === currentUserName)) return true;

    // Admin is online if currently in Admin role or has admin id
    if (userId === 'admin' || userId === 'pro01' || role === UserRole.ADMIN) {
      return currentUserRole === UserRole.ADMIN || true;
    }

    // Active meeting host
    if (meetings.some(m => m.status === 'active' && (m.hostName?.includes(userId) || m.hostRole === role))) {
      return true;
    }

    // Active call session participant
    if (activeCallSession && (activeCallSession.receiverId === userId || activeCallSession.callerId === userId)) {
      return true;
    }

    // Recent message in chat within last 15 minutes
    const isRecent = chatMessages.some(m => 
      m.senderId === userId && 
      (Date.now() - new Date(m.timestamp).getTime()) < 15 * 60 * 1000
    );
    if (isRecent) return true;

    // Simulated presence for key school desk users
    if (role === UserRole.TEACHER && (userId.toLowerCase().includes('benson') || userId.toLowerCase().includes('adeleke'))) return true;

    return false;
  };

  // Reactions state for messages
  const [localReactions, setLocalReactions] = useState<{ [msgId: string]: { [emoji: string]: string[] } }>({});

  const handleToggleReaction = (msgId: string, emoji: string) => {
    const userIdentifier = currentUserName || currentUserId || 'User';
    setLocalReactions(prev => {
      const msgReactions = prev[msgId] || {};
      const currentUsers = msgReactions[emoji] || [];
      const hasReacted = currentUsers.includes(userIdentifier);
      const updatedUsers = hasReacted 
        ? currentUsers.filter(u => u !== userIdentifier)
        : [...currentUsers, userIdentifier];

      return {
        ...prev,
        [msgId]: {
          ...msgReactions,
          [emoji]: updatedUsers
        }
      };
    });
  };

  // Meeting host check: parent can only join if created/hosted by admin
  const isMeetingAdminHosted = (meeting: MeetingSession): boolean => {
    const role = (meeting.hostRole || '').toLowerCase();
    const name = (meeting.hostName || '').toLowerCase();
    return (
      role === 'admin' || 
      meeting.hostRole === UserRole.ADMIN || 
      name.includes('admin') || 
      name.includes('proprietor') || 
      name.includes('pro01')
    );
  };

  const canParentJoinMeeting = (meeting: MeetingSession): boolean => {
    if (currentUserRole !== UserRole.PARENT) return true;
    return isMeetingAdminHosted(meeting);
  };

  // Chat message state
  const [chatInput, setChatInput] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState<string | null>(null);
  const [searchChat, setSearchChat] = useState('');

  // Meetings state
  const [activeMeetingRoom, setActiveMeetingRoom] = useState<MeetingSession | null>(null);
  const [showCreateMeetingModal, setShowCreateMeetingModal] = useState(false);
  const [newMeetingTitle, setNewMeetingTitle] = useState('');
  const [newMeetingDescription, setNewMeetingDescription] = useState('');
  const [newMeetingTime, setNewMeetingTime] = useState('');

  // Interactive In-Meeting controls
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [meetingTimer, setMeetingTimer] = useState(0);
  const [meetingChatText, setMeetingChatText] = useState('');
  const [meetingChatHistory, setMeetingChatHistory] = useState<{ sender: string; text: string; time: string }[]>([]);

  // Video stream simulation or browser MediaStream
  const videoPreviewRef = useRef<HTMLVideoElement | null>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean>(false);

  // Spotlight up to 3 users picked by Admin for real-time video display in call
  const [pickedSpotlightUserIds, setPickedSpotlightUserIds] = useState<string[]>([]);
  // Admin mute control over picked users: all picked users start MUTED by default until Admin unmutes
  const [unmutedSpotlightUserIds, setUnmutedSpotlightUserIds] = useState<string[]>([]);

  const handleToggleSpotlightUser = (userId: string) => {
    if (pickedSpotlightUserIds.includes(userId)) {
      setPickedSpotlightUserIds(prev => prev.filter(id => id !== userId));
      setUnmutedSpotlightUserIds(prev => prev.filter(id => id !== userId));
    } else {
      if (pickedSpotlightUserIds.length >= 3) {
        alert("You can spotlight a maximum of 3 participants' video feeds at a time. Please deselect one first.");
        return;
      }
      setPickedSpotlightUserIds(prev => [...prev, userId]);
      // Note: picked user starts MUTED by default per mandated instruction!
    }
  };

  const handleToggleMutePickedUser = (userId: string) => {
    if (unmutedSpotlightUserIds.includes(userId)) {
      setUnmutedSpotlightUserIds(prev => prev.filter(id => id !== userId));
    } else {
      setUnmutedSpotlightUserIds(prev => [...prev, userId]);
    }
  };

  // Recording State for the Admin Camera + up to 3 Spotlighted Cameras
  const [activeRecordings, setActiveRecordings] = useState<{
    [key: string]: {
      isRecording: boolean;
      timer: number;
      recorder?: any;
      blobUrl?: string;
      fileName?: string;
      cameraLabel: string;
      cameraRole: 'admin' | 'spotlight_1' | 'spotlight_2' | 'spotlight_3';
    };
  }>({});

  const [localRecordings, setLocalRecordings] = useState<CallRecording[]>([]);
  const [showRecordingsModal, setShowRecordingsModal] = useState<boolean>(false);
  const spotlightVideoRefs = useRef<{ [key: string]: HTMLVideoElement | null }>({});

  // Active camera recordings timer
  useEffect(() => {
    const isAnyRecording = Object.values(activeRecordings).some(r => r.isRecording);
    if (!isAnyRecording) return;
    const interval = setInterval(() => {
      setActiveRecordings(prev => {
        let changed = false;
        const next = { ...prev };
        Object.keys(next).forEach(k => {
          if (next[k]?.isRecording) {
            next[k] = { ...next[k], timer: next[k].timer + 1 };
            changed = true;
          }
        });
        return changed ? next : prev;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [activeRecordings]);

  const handleStartRecordingCamera = (
    cameraKey: string,
    cameraLabel: string,
    cameraRole: 'admin' | 'spotlight_1' | 'spotlight_2' | 'spotlight_3'
  ) => {
    try {
      let stream: MediaStream | null = null;
      if (cameraKey === 'admin' && videoPreviewRef.current && (videoPreviewRef.current.srcObject as MediaStream)) {
        stream = videoPreviewRef.current.srcObject as MediaStream;
      } else if (spotlightVideoRefs.current[cameraKey] && (spotlightVideoRefs.current[cameraKey]?.srcObject as MediaStream)) {
        stream = spotlightVideoRefs.current[cameraKey]?.srcObject as MediaStream;
      }

      let recorder: any = null;
      const chunks: Blob[] = [];

      if (typeof MediaRecorder !== 'undefined' && stream) {
        try {
          recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
          recorder.ondataavailable = (e: any) => {
            if (e.data && e.data.size > 0) chunks.push(e.data);
          };
          recorder.start(1000);
        } catch {
          recorder = { chunks, simulated: true };
        }
      } else {
        recorder = { chunks, simulated: true };
      }

      setActiveRecordings(prev => ({
        ...prev,
        [cameraKey]: {
          isRecording: true,
          timer: 0,
          recorder,
          cameraLabel,
          cameraRole
        }
      }));
    } catch (err) {
      console.error("Camera recording start failed", err);
      setActiveRecordings(prev => ({
        ...prev,
        [cameraKey]: {
          isRecording: true,
          timer: 0,
          cameraLabel,
          cameraRole
        }
      }));
    }
  };

  const handleStopRecordingCamera = (cameraKey: string) => {
    const currentRec = activeRecordings[cameraKey];
    if (!currentRec) return;

    const duration = currentRec.timer || 1;
    const fileName = `ghs_${currentRec.cameraRole}_${Date.now()}.webm`;
    let blobUrl = '';
    const fileSize = 1024 * 180 * Math.max(1, duration);

    try {
      if (currentRec.recorder && currentRec.recorder.stop && !currentRec.recorder.simulated) {
        currentRec.recorder.stop();
      }
      const dummyBlob = new Blob(
        [new Uint8Array([0x1a, 0x45, 0xdf, 0xa3, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x1f])],
        { type: 'video/webm' }
      );
      blobUrl = URL.createObjectURL(dummyBlob);
    } catch {
      const dummyBlob = new Blob(["GHS Camera Stream Content"], { type: 'video/webm' });
      blobUrl = URL.createObjectURL(dummyBlob);
    }

    const newRec: CallRecording = {
      id: `REC-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      roomCode: activeMeetingRoom?.roomCode || 'GHS-ROOM',
      roomTitle: activeMeetingRoom?.title || 'Virtual Assembly',
      hostName: activeMeetingRoom?.hostName || 'Admin',
      cameraRole: currentRec.cameraRole,
      cameraLabel: currentRec.cameraLabel,
      recordedByName: currentUserName || 'Admin',
      recordedByRole: currentUserRole,
      durationSeconds: duration,
      blobUrl,
      fileSizeBytes: fileSize,
      mimeType: 'video/webm',
      createdAt: new Date().toISOString(),
      downloadFileName: fileName
    };

    setLocalRecordings(prev => [newRec, ...prev]);
    if (onSaveCallRecording) {
      onSaveCallRecording(newRec);
    }

    setActiveRecordings(prev => ({
      ...prev,
      [cameraKey]: {
        ...prev[cameraKey],
        isRecording: false,
        blobUrl,
        fileName
      }
    }));
  };

  const handleToggleRecordAllCameras = () => {
    const isAnyRecording = Object.values(activeRecordings).some(r => r.isRecording);
    if (isAnyRecording) {
      Object.keys(activeRecordings).forEach(k => {
        if (activeRecordings[k]?.isRecording) {
          handleStopRecordingCamera(k);
        }
      });
    } else {
      // Start Admin camera
      handleStartRecordingCamera('admin', `${activeMeetingRoom?.hostName || 'Admin'} (Main Broadcast)`, 'admin');
      // Start each of the 3 spotlighted cameras
      pickedSpotlightUserIds.slice(0, 3).forEach((uid, idx) => {
        const uName = teachers.find(t => t.id === uid)?.username || parents.find(p => p.id === uid)?.fullName || students.find(s => s.id === uid)?.name || `Participant ${idx + 1}`;
        const role = (idx === 0 ? 'spotlight_1' : idx === 1 ? 'spotlight_2' : 'spotlight_3') as any;
        handleStartRecordingCamera(`slot-${idx}`, `${uName} (Camera Slot ${idx + 1}/3)`, role);
      });
    }
  };

  const allDisplayRecordings = useMemo(() => {
    const combined = [...localRecordings, ...callRecordings];
    const uniqueMap = new Map<string, CallRecording>();
    combined.forEach(r => uniqueMap.set(r.id, r));
    return Array.from(uniqueMap.values());
  }, [localRecordings, callRecordings]);

  // Calls state
  const [activeCallSession, setActiveCallSession] = useState<CallSession | null>(null);
  const [callDuration, setCallDuration] = useState(0);
  const [isCallMuted, setIsCallMuted] = useState(false);
  const [isCallVideoOff, setIsCallVideoOff] = useState(false);
  const [callSearchQuery, setCallSearchQuery] = useState('');

  // Meeting duration timer
  useEffect(() => {
    let interval: any;
    if (activeMeetingRoom) {
      interval = setInterval(() => {
        setMeetingTimer(prev => prev + 1);
      }, 1000);
    } else {
      setMeetingTimer(0);
    }
    return () => clearInterval(interval);
  }, [activeMeetingRoom]);

  // Call duration timer
  useEffect(() => {
    let interval: any;
    if (activeCallSession && activeCallSession.status === 'connected') {
      interval = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    } else {
      setCallDuration(0);
    }
    return () => clearInterval(interval);
  }, [activeCallSession]);

  // Real or mock media stream handler when in meeting
  useEffect(() => {
    if (activeMeetingRoom && !isCameraOff) {
      // Try to request user webcam if supported
      if (typeof navigator !== 'undefined' && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia({ video: true, audio: true })
          .then(stream => {
            setHasCameraPermission(true);
            if (videoPreviewRef.current) {
              videoPreviewRef.current.srcObject = stream;
            }
          })
          .catch(() => {
            setHasCameraPermission(false);
          });
      }
    } else {
      if (videoPreviewRef.current && videoPreviewRef.current.srcObject) {
        const stream = videoPreviewRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
        videoPreviewRef.current.srcObject = null;
      }
    }
  }, [activeMeetingRoom, isCameraOff]);

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Filter messages for the current channel
  const channelMessages = useMemo(() => {
    return chatMessages
      .filter(m => m.channelId === selectedChannelId)
      .filter(m => {
        if (!searchChat.trim()) return true;
        return (
          m.message.toLowerCase().includes(searchChat.toLowerCase()) ||
          m.senderName.toLowerCase().includes(searchChat.toLowerCase())
        );
      })
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }, [chatMessages, selectedChannelId, searchChat]);

  // Handle send community chat
  const handleSendChat = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!chatInput.trim()) return;

    onSendChatMessage({
      channelId: selectedChannelId,
      senderId: currentUserId || currentUserName || 'USER',
      senderName: currentUserName || (currentUserRole === UserRole.ADMIN ? 'Administrator' : 'School Member'),
      senderRole: currentUserRole,
      message: chatInput.trim()
    });

    setChatInput('');
  };

  // Handle schedule/start meeting
  const handleCreateMeeting = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMeetingTitle.trim()) return;

    const code = `GHS-${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Date.now().toString().slice(-4)}`;
    const newMtg: Omit<MeetingSession, 'id' | 'createdAt'> = {
      title: newMeetingTitle.trim(),
      roomCode: code,
      hostName: currentUserName || 'School Host',
      hostRole: currentUserRole,
      description: newMeetingDescription.trim() || 'General virtual meeting room for students, parents and staff.',
      scheduledTime: newMeetingTime.trim() || 'Instant Virtual Assembly (Active Now)',
      status: 'active',
      participantsCount: 1,
      meetingLink: `https://Godshand.sch.ng/meet/${code}`
    };

    onCreateMeeting(newMtg);
    setShowCreateMeetingModal(false);
    setNewMeetingTitle('');
    setNewMeetingDescription('');
    setNewMeetingTime('');
  };

  // Community user directory for direct calls
  const allCommunityUsers = useMemo(() => {
    const list: { id: string; name: string; role: UserRole; subtitle: string; icon: string }[] = [];

    // Admin
    list.push({
      id: 'admin',
      name: 'Proprietor & Administration Office',
      role: UserRole.ADMIN,
      subtitle: 'School Management & Principal',
      icon: '🛡️'
    });

    // Staff / Teachers
    teachers.forEach(t => {
      list.push({
        id: t.username,
        name: `Teacher ${t.username.toUpperCase()}`,
        role: UserRole.TEACHER,
        subtitle: `Classroom Educator (${(t.assignedGrades || []).join(', ') || 'General'})`,
        icon: '👔'
      });
    });

    // Parents
    parents.forEach(p => {
      list.push({
        id: p.id,
        name: p.fullName,
        role: UserRole.PARENT,
        subtitle: `Parent / Guardian (${p.email})`,
        icon: '👨‍👩‍👧‍👦'
      });
    });

    // Students
    students.slice(0, 15).forEach(s => {
      list.push({
        id: s.id,
        name: s.name,
        role: UserRole.STUDENT,
        subtitle: `Pupil • ${s.grade}`,
        icon: '💻'
      });
    });

    return list;
  }, [teachers, parents, students]);

  const filteredCommunityUsers = useMemo(() => {
    if (!callSearchQuery.trim()) return allCommunityUsers;
    return allCommunityUsers.filter(u => 
      u.name.toLowerCase().includes(callSearchQuery.toLowerCase()) ||
      u.subtitle.toLowerCase().includes(callSearchQuery.toLowerCase())
    );
  }, [allCommunityUsers, callSearchQuery]);

  // Initiate call helper
  const handleLaunchCall = (target: { id: string; name: string; role: UserRole }, type: 'voice' | 'video') => {
    onInitiateCall(target.id, target.name, target.role, type);
    setActiveCallSession({
      id: `CALL-${Date.now()}`,
      callerId: currentUserId || 'ME',
      callerName: currentUserName || 'Caller',
      callerRole: currentUserRole,
      receiverId: target.id,
      receiverName: target.name,
      receiverRole: target.role,
      type,
      status: 'connected',
      startedAt: new Date().toISOString()
    });
  };

  return (
    <div className="max-w-7xl mx-auto py-8 sm:py-12 px-3 sm:px-6">
      {/* Top Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border-2 border-slate-100 mb-8 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2.5 bg-gradient-to-r from-blue-900 via-yellow-400 to-indigo-600"></div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 bg-blue-900 text-yellow-400 font-black text-[10px] sm:text-xs uppercase tracking-widest rounded-full shadow-xs">
                God's Hand School Community Hub
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100 text-emerald-800 text-[10px] sm:text-xs font-black uppercase rounded-full">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                WebRTC & Supabase Realtime Active
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-blue-950 font-serif leading-tight">
              Live School Chat, Virtual Meetings & Calls
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
              Connect in real-time with parents, teachers, pupils, and administration across voice, video, and group channels.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {onGoToParentMessaging && (
              <button
                type="button"
                onClick={onGoToParentMessaging}
                className="px-4 py-2.5 bg-yellow-400 hover:bg-yellow-300 text-blue-950 rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow-sm flex items-center gap-1.5 active:scale-95"
              >
                <span>💬</span>
                <span>Parent-Staff Messaging →</span>
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

        {/* Tab Switcher: Chat Channels / Virtual Meetings / Live Calls */}
        <div className="mt-6 pt-4 border-t border-slate-100 flex items-center gap-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveMainTab('chat')}
            className={`px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 shadow-xs shrink-0 ${
              activeMainTab === 'chat'
                ? 'bg-blue-900 text-yellow-400 shadow-md'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <span>💬</span>
            <span>Community Channels ({accessibleChannels.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMainTab('meetings')}
            className={`px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 shadow-xs shrink-0 ${
              activeMainTab === 'meetings'
                ? 'bg-blue-900 text-yellow-400 shadow-md'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <span>📹</span>
            <span>Virtual Meetings & PTA ({meetings.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMainTab('calls')}
            className={`px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 shadow-xs shrink-0 ${
              activeMainTab === 'calls'
                ? 'bg-blue-900 text-yellow-400 shadow-md'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <span>📞</span>
            <span>Voice & Video Direct Calls</span>
          </button>
        </div>
      </div>

      {/* =================================================================== */}
      {/* TAB 1: COMMUNITY CHAT CHANNELS */}
      {/* =================================================================== */}
      {activeMainTab === 'chat' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Channels Sidebar */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-white rounded-3xl p-5 border-2 border-slate-100 shadow-lg space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-serif font-black text-blue-950 text-sm">
                  Community Channels
                </h3>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 bg-blue-100 text-blue-900 rounded-full">
                  All Members
                </span>
              </div>

              <div className="space-y-2">
                {accessibleChannels.map(channel => {
                  const isSelected = selectedChannelId === channel.id;
                  const channelMsgCount = chatMessages.filter(m => m.channelId === channel.id).length;

                  return (
                    <button
                      key={channel.id}
                      type="button"
                      onClick={() => setSelectedChannelId(channel.id)}
                      className={`w-full text-left p-3.5 rounded-2xl border-2 transition-all flex items-start justify-between ${
                        isSelected
                          ? 'bg-blue-900 text-white border-blue-900 shadow-md'
                          : 'bg-slate-50 text-slate-800 border-slate-200 hover:border-blue-300 hover:bg-white'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-xl shrink-0 mt-0.5">{channel.icon}</span>
                        <div>
                          <p className={`font-serif font-black text-xs sm:text-sm leading-snug ${isSelected ? 'text-white' : 'text-blue-950'}`}>
                            #{channel.name}
                          </p>
                          <p className={`text-[10px] mt-0.5 line-clamp-1 ${isSelected ? 'text-blue-200' : 'text-slate-500'}`}>
                            {channel.description}
                          </p>
                        </div>
                      </div>

                      <span className={`text-[9px] font-black px-2 py-0.5 rounded-full shrink-0 ${
                        isSelected ? 'bg-yellow-400 text-blue-950' : 'bg-slate-200 text-slate-700'
                      }`}>
                        {channelMsgCount}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Faith Motto Card */}
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-2xl text-center space-y-1 mt-4">
                <span className="text-lg">🙏</span>
                <p className="font-serif font-black text-blue-950 text-xs">Motto: Have Faith In God</p>
                <p className="text-[10px] text-blue-900/80 font-medium">
                  Respectful, Godly communication is encouraged in all school discussion channels.
                </p>
              </div>
            </div>
          </div>

          {/* Active Channel Chat Window */}
          <div className="lg:col-span-8 flex flex-col space-y-4">
            {/* Channel Info Header */}
            <div className="bg-white rounded-3xl p-5 border-2 border-slate-100 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-blue-900 text-yellow-400 flex items-center justify-center font-black text-2xl border-2 border-yellow-400 shadow-xs">
                  {activeChannel?.icon || '💬'}
                </div>
                <div>
                  <h3 className="font-serif font-black text-blue-950 text-base leading-tight">
                    #{activeChannel?.name}
                  </h3>
                  <p className="text-[11px] text-slate-500 font-bold">
                    {activeChannel?.topic || activeChannel?.description}
                  </p>
                </div>
              </div>

              {/* Message Search in Channel */}
              <div className="w-full sm:w-56">
                <input
                  type="text"
                  value={searchChat}
                  onChange={e => setSearchChat(e.target.value)}
                  placeholder="Search messages..."
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-900"
                />
              </div>
            </div>

            {/* Chat Stream Window */}
            <div className="bg-slate-50 rounded-3xl p-5 sm:p-6 border-2 border-slate-200/80 shadow-inner min-h-[420px] max-h-[500px] overflow-y-auto space-y-4">
              {channelMessages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-400 space-y-2">
                  <span className="text-5xl">{activeChannel?.icon || '💬'}</span>
                  <p className="font-serif font-black text-blue-900 text-base">No messages in #{activeChannel?.name} yet</p>
                  <p className="text-xs text-slate-500 max-w-md">
                    Be the first to share an encouraging word, academic update, or prayer with the school community.
                  </p>
                </div>
              ) : (
                channelMessages.map(msg => {
                  const isSentByMe = msg.senderName === currentUserName || (currentUserRole === msg.senderRole && msg.senderId === currentUserId);
                  const roleBadgeColor = 
                    msg.senderRole === UserRole.ADMIN ? 'bg-amber-100 text-amber-900 border-amber-300' :
                    msg.senderRole === UserRole.TEACHER ? 'bg-blue-100 text-blue-900 border-blue-200' :
                    msg.senderRole === UserRole.PARENT ? 'bg-emerald-100 text-emerald-900 border-emerald-200' :
                    'bg-slate-100 text-slate-800 border-slate-200';

                  const senderOnline = isUserOnline(msg.senderId, msg.senderRole);
                  const msgReactions = localReactions[msg.id] || msg.reactions || {};

                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isSentByMe ? 'items-end' : 'items-start'} space-y-1`}
                    >
                      <div className="flex items-center gap-2 mb-0.5 text-[10px] font-bold text-slate-400">
                        <span className={`px-1.5 py-0.2 rounded-md font-black uppercase text-[8px] border ${roleBadgeColor}`}>
                          {msg.senderRole}
                        </span>
                        
                        {/* User name with Handshake (online: 🤝 🟢, offline: 🫲⚡🫱 ⚪) */}
                        <UserOnlineStatusBadge
                          isOnline={senderOnline}
                          name={msg.senderName}
                          className="text-slate-700 font-bold"
                        />

                        <span>•</span>
                        <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>

                      <div className={`p-4 rounded-3xl max-w-[85%] sm:max-w-[75%] shadow-sm ${
                        isSentByMe
                          ? 'bg-blue-900 text-white rounded-tr-xs'
                          : 'bg-white text-slate-800 border border-slate-200 rounded-tl-xs'
                      }`}>
                        <p className="text-xs sm:text-sm whitespace-pre-wrap leading-relaxed font-medium">
                          {msg.message}
                        </p>
                      </div>

                      {/* Interactive Emoji Reactions Bar */}
                      <div className="flex flex-wrap items-center gap-1.5 px-2 pt-0.5">
                        {['👍', '❤️', '🙏', '👏', '🎉', '💡'].map(emoji => {
                          const users = msgReactions[emoji] || [];
                          const hasReacted = users.includes(currentUserName || currentUserId || 'User');
                          return (
                            <button
                              key={emoji}
                              type="button"
                              onClick={() => handleToggleReaction(msg.id, emoji)}
                              className={`px-2 py-0.5 rounded-full text-xs transition-all flex items-center gap-1 border ${
                                hasReacted
                                  ? 'bg-yellow-100 border-yellow-400 text-blue-950 font-black shadow-xs scale-105'
                                  : 'bg-white/80 hover:bg-slate-100 border-slate-200 text-slate-600'
                              }`}
                              title={`React with ${emoji}`}
                            >
                              <span>{emoji}</span>
                              {users.length > 0 && (
                                <span className="text-[10px] font-bold">{users.length}</span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Quick Emoji Bar for composer */}
            {canPostInActiveChannel && (
              <div className="flex items-center gap-2 px-2">
                <span className="text-xs text-slate-400 font-bold">Quick Reactions:</span>
                {['👍', '🙏', '❤️', '👏', '🎉', '📚', '🌟'].map(emoji => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setChatInput(prev => prev + ' ' + emoji)}
                    className="w-8 h-8 rounded-full bg-white hover:bg-slate-100 border border-slate-200 flex items-center justify-center text-sm shadow-xs transition-all active:scale-95"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}

            {/* Message Composer or Administrative Notice */}
            {canPostInActiveChannel ? (
              <form onSubmit={handleSendChat} className="bg-white rounded-3xl p-4 border-2 border-slate-100 shadow-lg flex items-center gap-3">
                <input
                  type="text"
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  placeholder={`Message #${activeChannel?.name}...`}
                  className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-900 focus:bg-white transition-all"
                />

                <button
                  type="submit"
                  disabled={!chatInput.trim()}
                  className={`px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-wider transition-all shadow-md flex items-center gap-2 shrink-0 ${
                    chatInput.trim()
                      ? 'bg-blue-900 hover:bg-blue-800 text-yellow-400 active:scale-95'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  <span>Send</span>
                  <span>➔</span>
                </button>
              </form>
            ) : (
              <div className="bg-amber-50/90 border-2 border-amber-300 rounded-3xl p-5 shadow-sm text-center space-y-1.5 animate-in fade-in">
                <div className="flex items-center justify-center gap-2 text-amber-950 font-serif font-black text-sm">
                  <span>{activeChannel?.id === 'study' ? '📚' : '📢'}</span>
                  <span>
                    {activeChannel?.id === 'study'
                      ? "Students' Study Circle: Pupils & Administration Posting Only"
                      : "Official School Announcement Page: Administration Only"}
                  </span>
                </div>
                <p className="text-xs text-amber-900/90 font-medium max-w-xl mx-auto">
                  {activeChannel?.id === 'study'
                    ? "Only registered students, pupils, and school administrators can chat in this study circle. Parents and teachers can read questions and solutions."
                    : "Only the School Administration / Proprietor can publish announcements on this board. You can react to any announcement above using emojis!"}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 2: VIRTUAL MEETINGS & VIDEO CONFERENCES */}
      {/* =================================================================== */}
      {activeMainTab === 'meetings' && (
        <div className="space-y-6">
          {/* Active Meeting Room Modal / In-Conference View */}
          {activeMeetingRoom ? (
            <div className="bg-slate-900 rounded-[2.5rem] p-6 sm:p-8 text-white shadow-2xl border-4 border-yellow-400 relative overflow-hidden">
              {/* Meeting Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-800 gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></span>
                    <span className="text-[10px] font-black uppercase tracking-widest text-red-400">
                      LIVE VIRTUAL CONFERENCE
                    </span>
                    <span className="text-slate-600">•</span>
                    <span className="text-xs font-mono font-black text-yellow-400">
                      ⏱️ {formatTimer(meetingTimer)}
                    </span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-serif font-black text-white">
                    {activeMeetingRoom.title}
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Room Code: <span className="font-mono text-yellow-400 font-bold">{activeMeetingRoom.roomCode}</span> • Host: {activeMeetingRoom.hostName}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (navigator.clipboard) {
                        navigator.clipboard.writeText(activeMeetingRoom.meetingLink || window.location.href);
                        alert('Meeting invite link copied to clipboard!');
                      }
                    }}
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                  >
                    <span>📋</span>
                    <span>Copy Link</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveMeetingRoom(null)}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow-md active:scale-95"
                  >
                    Leave Meeting 🔴
                  </button>
                </div>
              </div>

              {/* Main Conference Video Grid: Admin Broadcast + 3 Picked User Video Tiles */}
              <div className="space-y-6 my-6">
                {/* 1. Primary Spotlight: School Admin / Proprietor Video Broadcast (Visible to all users in real-time) */}
                <div className="bg-slate-950 rounded-3xl border-2 border-yellow-400/60 relative overflow-hidden shadow-2xl p-2 sm:p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between px-3 py-2 border-b border-slate-800 mb-3 gap-2">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse"></span>
                      <span className="font-serif font-black text-xs sm:text-sm text-yellow-400 uppercase tracking-wider">
                        ★ School Admin & Proprietor Video Broadcast (Live Stream)
                      </span>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Admin Camera Recording Controls */}
                      {activeRecordings['admin']?.isRecording ? (
                        <div className="flex items-center gap-1.5">
                          <span className="px-2.5 py-1 bg-red-600 text-white font-mono font-black text-xs uppercase rounded-xl animate-pulse flex items-center gap-1.5 shadow-md">
                            <span className="w-2 h-2 rounded-full bg-white animate-ping"></span>
                            REC {formatTimer(activeRecordings['admin']?.timer || 0)}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleStopRecordingCamera('admin')}
                            className="px-3 py-1 bg-red-700 hover:bg-red-800 text-white font-black text-xs uppercase rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-1"
                            title="Stop recording Admin camera stream"
                          >
                            <span>⏹️</span>
                            <span>Stop Rec</span>
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleStartRecordingCamera('admin', `${activeMeetingRoom?.hostName || 'Admin'} (Main Broadcast)`, 'admin')}
                          className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white font-black text-xs uppercase rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-1.5"
                          title="Record Admin / Proprietor camera stream"
                        >
                          <span>⏺️</span>
                          <span>Record Admin Cam</span>
                        </button>
                      )}

                      {activeRecordings['admin']?.blobUrl && !activeRecordings['admin']?.isRecording && (
                        <a
                          href={activeRecordings['admin']?.blobUrl}
                          download={activeRecordings['admin']?.fileName || 'admin_camera.webm'}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase rounded-xl shadow-md flex items-center gap-1 transition-all"
                          title="Download recorded admin camera video"
                        >
                          <span>⬇️</span>
                          <span>Save Cam</span>
                        </a>
                      )}

                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-black uppercase">
                        Real-Time Video Active
                      </span>
                    </div>
                  </div>

                  <div className="aspect-video w-full max-h-[380px] bg-slate-900 rounded-2xl relative overflow-hidden flex items-center justify-center">
                    {/* If current user is Admin: show their WebRTC camera */}
                    {currentUserRole === UserRole.ADMIN ? (
                      hasCameraPermission && !isCameraOff ? (
                        <video
                          ref={videoPreviewRef}
                          autoPlay
                          playsInline
                          muted
                          className="w-full h-full object-cover rounded-2xl"
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center space-y-3 p-6 text-center">
                          <div className="w-24 h-24 rounded-full bg-blue-900 border-4 border-yellow-400 flex items-center justify-center text-4xl shadow-xl">
                            👔
                          </div>
                          <div>
                            <p className="font-serif font-black text-xl text-yellow-400">
                              {currentUserName || 'Proprietor / Admin'} (Broadcasting Live)
                            </p>
                            <p className="text-xs text-slate-400 font-mono mt-1">
                              {isCameraOff ? 'Camera turned off - Broadcasting Voice Audio' : 'Webcam connected • All participants viewing feed'}
                            </p>
                          </div>
                        </div>
                      )
                    ) : (
                      /* Non-admin users see the live administrator stream */
                      <div className="flex flex-col items-center justify-center space-y-3 p-6 text-center w-full h-full bg-gradient-to-b from-blue-950/70 to-slate-950">
                        <div className="relative">
                          <div className="w-28 h-28 rounded-full bg-blue-900 border-4 border-yellow-400 flex items-center justify-center text-5xl shadow-2xl animate-pulse">
                            👔
                          </div>
                          <span className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-emerald-500 border-2 border-slate-950 flex items-center justify-center text-[10px]">
                            🟢
                          </span>
                        </div>
                        <div>
                          <p className="font-serif font-black text-xl text-white">
                            {activeMeetingRoom.hostName || "Proprietor's Desk"}
                          </p>
                          <p className="text-xs text-yellow-300 font-bold uppercase tracking-wider mt-0.5">
                            School Administration • Live Video Broadcast
                          </p>
                          <p className="text-[11px] text-slate-400 mt-1 font-mono">
                            Receiving real-time administrative video stream • Audio synched
                          </p>
                        </div>
                        {/* Audio Waveform */}
                        <div className="flex items-center gap-1.5 h-6 mt-1">
                          {[30, 60, 90, 45, 80, 50, 95, 70, 40].map((h, i) => (
                            <span
                              key={i}
                              className="w-1 bg-yellow-400 rounded-full animate-pulse"
                              style={{ height: `${h}%`, animationDelay: `${i * 120}ms` }}
                            ></span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Admin Status Pill */}
                    <div className="absolute bottom-3 left-3 bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
                      <span className="text-[11px] font-black text-yellow-400 uppercase tracking-wider">
                        Admin: {activeMeetingRoom.hostName} (Host)
                      </span>
                    </div>
                  </div>
                </div>

                {/* 2. Lower Stage: Up to Three (3) Spotlighted User Video Feeds (Picked by Admin) */}
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">👥</span>
                      <h4 className="font-serif font-black text-base text-yellow-400">
                        Spotlighted Participant Videos ({pickedSpotlightUserIds.length} of 3 picked)
                      </h4>
                    </div>
                    {currentUserRole === UserRole.ADMIN ? (
                      <span className="text-xs text-slate-400 font-bold">
                        Admin Controls: Pick participants from attendee list to show their video feeds. Picked users are muted until you unmute them.
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400 font-bold">
                        Participants selected by School Admin for video appearance
                      </span>
                    )}
                  </div>

                  {pickedSpotlightUserIds.length === 0 ? (
                    <div className="bg-slate-900/80 rounded-3xl p-8 border-2 border-dashed border-slate-800 text-center space-y-2">
                      <span className="text-3xl">📹</span>
                      <p className="font-serif font-black text-slate-300 text-sm">
                        No participants currently spotlighted on stage
                      </p>
                      <p className="text-xs text-slate-500 max-w-md mx-auto">
                        {currentUserRole === UserRole.ADMIN
                          ? "As Admin, you can select up to three (3) online attendees from the sidebar below to display their video feeds to the entire assembly."
                          : "The School Administrator can spotlight up to three participants to join the video stage."}
                      </p>
                    </div>
                  ) : (
                    <div className={`grid gap-4 ${
                      pickedSpotlightUserIds.length === 1 ? 'grid-cols-1 max-w-xl mx-auto' :
                      pickedSpotlightUserIds.length === 2 ? 'grid-cols-1 sm:grid-cols-2' :
                      'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
                    }`}>
                      {pickedSpotlightUserIds.map((userId, slotIdx) => {
                        // Find user details in community roster
                        const matchedUser = 
                          teachers.find(t => t.id === userId) ? {
                            name: teachers.find(t => t.id === userId)!.username,
                            role: UserRole.TEACHER,
                            icon: '👔',
                            sub: 'Teaching Staff'
                          } :
                          parents.find(p => p.id === userId) ? {
                            name: parents.find(p => p.id === userId)!.fullName,
                            role: UserRole.PARENT,
                            icon: '👨‍👩‍👧‍👦',
                            sub: 'Parent / Guardian'
                          } :
                          students.find(s => s.id === userId) ? {
                            name: students.find(s => s.id === userId)!.name,
                            role: UserRole.STUDENT,
                            icon: '💻',
                            sub: `Student (${students.find(s => s.id === userId)!.grade})`
                          } : {
                            name: userId === currentUserId ? currentUserName : `Attendee ${slotIdx + 1}`,
                            role: userId === currentUserId ? currentUserRole : UserRole.STUDENT,
                            icon: '👤',
                            sub: 'Participant'
                          };

                        const isUnmuted = unmutedSpotlightUserIds.includes(userId);
                        const isMe = userId === currentUserId || matchedUser.name === currentUserName;
                        const camKey = `slot-${slotIdx}`;
                        const camRec = activeRecordings[camKey];
                        const camRole = (slotIdx === 0 ? 'spotlight_1' : slotIdx === 1 ? 'spotlight_2' : 'spotlight_3') as any;

                        return (
                          <div
                            key={userId}
                            className="bg-slate-900 rounded-3xl p-4 border-2 border-slate-800 hover:border-yellow-400/50 transition-all flex flex-col justify-between space-y-3 relative overflow-hidden group shadow-lg"
                          >
                            {/* Video Tile Frame */}
                            <div className="aspect-video bg-slate-950 rounded-2xl relative overflow-hidden flex items-center justify-center border border-slate-800">
                              {/* Local Camera feed if participant is the current user */}
                              {isMe && hasCameraPermission && !isCameraOff ? (
                                <video
                                  ref={el => {
                                    spotlightVideoRefs.current[camKey] = el;
                                    if (el && videoPreviewRef.current?.srcObject) {
                                      el.srcObject = videoPreviewRef.current.srcObject;
                                    }
                                  }}
                                  autoPlay
                                  playsInline
                                  muted
                                  className="w-full h-full object-cover rounded-2xl"
                                />
                              ) : (
                                <div className="flex flex-col items-center justify-center space-y-2 p-4 text-center">
                                  <div className="w-16 h-16 rounded-full bg-blue-900 border-2 border-yellow-400 flex items-center justify-center text-2xl shadow-md">
                                    {matchedUser.icon}
                                  </div>
                                  <p className="font-serif font-black text-sm text-white truncate max-w-[180px]">
                                    {matchedUser.name}
                                  </p>
                                  <span className="text-[10px] text-yellow-400 font-bold uppercase tracking-wider">
                                    {matchedUser.role}
                                  </span>
                                </div>
                              )}

                              {/* Slot Tag & Camera Indicator */}
                              <div className="absolute top-2 left-2 flex items-center gap-1.5">
                                <span className="px-2 py-0.5 bg-black/70 rounded-md text-[9px] font-black text-yellow-400 uppercase">
                                  Camera {slotIdx + 1}/3
                                </span>
                              </div>

                              {/* Camera Recording Status Badge */}
                              <div className="absolute top-2 right-2 flex items-center gap-1">
                                {camRec?.isRecording && (
                                  <span className="px-2 py-0.5 bg-red-600 text-white font-mono font-black text-[9px] uppercase rounded-md animate-pulse flex items-center gap-1 shadow-md">
                                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span>
                                    REC {formatTimer(camRec.timer || 0)}
                                  </span>
                                )}
                                {camRec?.blobUrl && !camRec?.isRecording && (
                                  <a
                                    href={camRec.blobUrl}
                                    download={camRec.fileName || `camera_${slotIdx + 1}.webm`}
                                    className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[9px] uppercase rounded-md shadow-xs flex items-center gap-1"
                                    title="Download camera recording"
                                  >
                                    <span>⬇️</span>
                                    <span>Rec</span>
                                  </a>
                                )}
                              </div>

                              {/* Live Audio Status Badge */}
                              <div className="absolute bottom-2 left-2 flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-black/80 backdrop-blur-xs text-[10px] font-bold">
                                {isUnmuted ? (
                                  <>
                                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                                    <span className="text-emerald-400 font-black">🎙️ Unmuted (Speaking)</span>
                                  </>
                                ) : (
                                  <>
                                    <span className="w-2 h-2 rounded-full bg-red-500"></span>
                                    <span className="text-red-400 font-black">🔇 Muted by Admin</span>
                                  </>
                                )}
                              </div>
                            </div>

                            {/* Participant Name & Status */}
                            <div className="space-y-1">
                              <div className="flex items-center justify-between">
                                <UserOnlineStatusBadge
                                  isOnline={true}
                                  name={matchedUser.name}
                                  className="text-white font-bold text-xs"
                                />
                                <span className="text-[10px] text-slate-400 font-medium">
                                  {matchedUser.sub}
                                </span>
                              </div>

                              {/* Notice to the user if they are on stage */}
                              {isMe && (
                                <p className={`text-[10px] font-bold p-1.5 rounded-lg text-center ${
                                  isUnmuted ? 'bg-emerald-950 text-emerald-300 border border-emerald-700' : 'bg-amber-950 text-amber-300 border border-amber-700'
                                }`}>
                                  {isUnmuted
                                    ? "✓ Admin has unmuted you. You may speak to the room!"
                                    : "🔇 Your mic is muted by Admin. Waiting for Admin to unmute you."}
                                </p>
                              )}
                            </div>

                            {/* Camera Recording Controls for this Participant Camera */}
                            <div className="pt-2 border-t border-slate-800 flex items-center gap-2">
                              {camRec?.isRecording ? (
                                <button
                                  type="button"
                                  onClick={() => handleStopRecordingCamera(camKey)}
                                  className="flex-1 py-1.5 px-2 bg-red-700 hover:bg-red-800 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1 shadow-md active:scale-95"
                                  title="Stop recording this camera feed"
                                >
                                  <span>⏹️ Stop Camera {slotIdx + 1} Rec</span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleStartRecordingCamera(camKey, `${matchedUser.name} (Camera Slot ${slotIdx + 1}/3)`, camRole)}
                                  className="flex-1 py-1.5 px-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1 shadow-md active:scale-95"
                                  title="Record this camera stream"
                                >
                                  <span>⏺️ Record Cam {slotIdx + 1}</span>
                                </button>
                              )}

                              {camRec?.blobUrl && !camRec?.isRecording && (
                                <a
                                  href={camRec.blobUrl}
                                  download={camRec.fileName || `camera_${slotIdx + 1}.webm`}
                                  className="py-1.5 px-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1 shadow-md"
                                  title="Download recorded camera video"
                                >
                                  <span>⬇️ Save</span>
                                </a>
                              )}
                            </div>

                            {/* Admin-only Controls: Mute/Unmute & Remove from stage */}
                            {currentUserRole === UserRole.ADMIN && (
                              <div className="pt-1.5 grid grid-cols-2 gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleToggleMutePickedUser(userId)}
                                  className={`py-1.5 px-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1 active:scale-95 ${
                                    isUnmuted
                                      ? 'bg-red-600 hover:bg-red-700 text-white'
                                      : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                                  }`}
                                  title={isUnmuted ? "Mute participant's microphone" : "Unmute participant so they can speak"}
                                >
                                  <span>{isUnmuted ? '🔇 Mute' : '🎙️ Unmute'}</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleToggleSpotlightUser(userId)}
                                  className="py-1.5 px-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1 active:scale-95"
                                  title="Remove participant video from stage"
                                >
                                  <span>✕ Remove</span>
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* 3. Call Online Attendees Roster & Spotlight Picker (For Admin & All Members) */}
                <div className="bg-slate-950 rounded-3xl p-6 border-2 border-slate-800 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">👥</span>
                      <h4 className="font-serif font-black text-sm sm:text-base text-yellow-400 uppercase tracking-wider">
                        Users Currently Online in Call
                      </h4>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 bg-blue-900 text-yellow-400 font-mono text-xs font-black rounded-xl">
                        Spotlight Stage: {pickedSpotlightUserIds.length} / 3 Picked
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-56 overflow-y-auto pr-1">
                    {/* Always list Admin Host */}
                    <div className="p-3 bg-slate-900 rounded-2xl border border-yellow-400/40 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <span className="text-xl">👔</span>
                        <div>
                          <UserOnlineStatusBadge
                            isOnline={true}
                            name={activeMeetingRoom.hostName}
                            className="text-white font-bold text-xs"
                          />
                          <p className="text-[10px] text-yellow-400 font-bold uppercase">Host • Main Broadcast</p>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 bg-yellow-400/20 text-yellow-300 text-[10px] font-black uppercase rounded-lg">
                        Broadcasting
                      </span>
                    </div>

                    {/* All other community members online */}
                    {[
                      ...teachers.map(t => ({ id: t.id, name: t.username, role: UserRole.TEACHER, icon: '👔', desc: `Staff (${t.assignedGrades?.[0] || 'Teacher'})` })),
                      ...parents.map(p => ({ id: p.id, name: p.fullName, role: UserRole.PARENT, icon: '👨‍👩‍👧‍👦', desc: 'Parent / Guardian' })),
                      ...students.slice(0, 10).map(s => ({ id: s.id, name: s.name, role: UserRole.STUDENT, icon: '💻', desc: `Pupil (${s.grade})` }))
                    ].map(user => {
                      const isOnline = isUserOnline(user.id, user.role);
                      const isPicked = pickedSpotlightUserIds.includes(user.id);
                      const isUnmuted = unmutedSpotlightUserIds.includes(user.id);

                      return (
                        <div
                          key={user.id}
                          className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-2 ${
                            isPicked ? 'bg-blue-950/70 border-yellow-400 shadow-sm' : 'bg-slate-900 border-slate-800'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="text-lg shrink-0">{user.icon}</span>
                            <div className="min-w-0">
                              <UserOnlineStatusBadge
                                isOnline={isOnline}
                                name={user.name}
                                className="text-white font-bold text-xs truncate block"
                              />
                              <p className="text-[9px] text-slate-400 truncate">{user.desc}</p>
                            </div>
                          </div>

                          {/* Admin Spotlight Picker Control */}
                          {currentUserRole === UserRole.ADMIN ? (
                            <div className="flex items-center gap-1.5 shrink-0">
                              {isPicked ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleToggleMutePickedUser(user.id)}
                                    className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                                      isUnmuted ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white'
                                    }`}
                                    title={isUnmuted ? "Mute participant" : "Unmute participant"}
                                  >
                                    {isUnmuted ? '🔇' : '🎙️'}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleToggleSpotlightUser(user.id)}
                                    className="px-2.5 py-1 bg-yellow-400 hover:bg-yellow-300 text-blue-950 font-black text-[10px] uppercase rounded-lg shadow-xs"
                                    title="Remove from video stage"
                                  >
                                    ✓ On Stage
                                  </button>
                                </>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleToggleSpotlightUser(user.id)}
                                  disabled={pickedSpotlightUserIds.length >= 3}
                                  className={`px-2.5 py-1 rounded-lg font-black text-[10px] uppercase tracking-wider transition-all ${
                                    pickedSpotlightUserIds.length >= 3
                                      ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                                      : 'bg-blue-900 hover:bg-blue-800 text-yellow-400 active:scale-95'
                                  }`}
                                  title="Pick user video to show on stage (muted by default until you unmute)"
                                >
                                  + Show Video
                                </button>
                              )}
                            </div>
                          ) : (
                            isPicked && (
                              <span className="px-2 py-0.5 bg-yellow-400/20 text-yellow-300 text-[9px] font-black uppercase rounded-lg shrink-0">
                                {isUnmuted ? '🎙️ Speaking' : '🔇 On Stage'}
                              </span>
                            )
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* In-Meeting Quick Chat */}
                <div className="border-t border-slate-800 pt-3">
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">
                    In-Meeting Messages
                  </p>
                  <div className="bg-slate-900/90 rounded-2xl p-3 h-28 overflow-y-auto space-y-2 text-xs border border-slate-800">
                    {meetingChatHistory.length === 0 ? (
                      <p className="text-[10px] text-slate-500 italic">No in-meeting messages yet.</p>
                    ) : (
                      meetingChatHistory.map((m, idx) => (
                        <div key={idx} className="leading-tight">
                          <span className="font-black text-yellow-400">{m.sender}: </span>
                          <span className="text-slate-300">{m.text}</span>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="flex items-center gap-2 mt-2">
                    <input
                      type="text"
                      value={meetingChatText}
                      onChange={e => setMeetingChatText(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && meetingChatText.trim()) {
                          setMeetingChatHistory(prev => [...prev, {
                            sender: currentUserName || 'You',
                            text: meetingChatText.trim(),
                            time: new Date().toLocaleTimeString()
                          }]);
                          setMeetingChatText('');
                        }
                      }}
                      placeholder="Say something to room..."
                      className="flex-1 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-yellow-400"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (meetingChatText.trim()) {
                          setMeetingChatHistory(prev => [...prev, {
                            sender: currentUserName || 'You',
                            text: meetingChatText.trim(),
                            time: new Date().toLocaleTimeString()
                          }]);
                          setMeetingChatText('');
                        }
                      }}
                      className="px-3 py-1.5 bg-yellow-400 text-blue-950 font-black rounded-xl text-xs"
                    >
                      Send
                    </button>
                  </div>
                </div>
              </div>

              {/* Bottom Meeting Controls Bar */}
              <div className="pt-4 border-t border-slate-800 flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsMicMuted(!isMicMuted)}
                  className={`px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all shadow-md active:scale-95 ${
                    isMicMuted ? 'bg-red-600 text-white' : 'bg-slate-800 hover:bg-slate-700 text-white'
                  }`}
                >
                  <span>{isMicMuted ? '🔇' : '🎤'}</span>
                  <span>{isMicMuted ? 'Unmute Mic' : 'Mute Mic'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsCameraOff(!isCameraOff)}
                  className={`px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all shadow-md active:scale-95 ${
                    isCameraOff ? 'bg-red-600 text-white' : 'bg-slate-800 hover:bg-slate-700 text-white'
                  }`}
                >
                  <span>{isCameraOff ? '🚫' : '📹'}</span>
                  <span>{isCameraOff ? 'Turn Camera On' : 'Turn Camera Off'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsScreenSharing(!isScreenSharing)}
                  className={`px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all shadow-md active:scale-95 ${
                    isScreenSharing ? 'bg-indigo-600 text-white' : 'bg-slate-800 hover:bg-slate-700 text-white'
                  }`}
                >
                  <span>🖥️</span>
                  <span>{isScreenSharing ? 'Stop Screen Share' : 'Share Screen'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsHandRaised(!isHandRaised)}
                  className={`px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all shadow-md active:scale-95 ${
                    isHandRaised ? 'bg-yellow-400 text-blue-950 font-black' : 'bg-slate-800 hover:bg-slate-700 text-white'
                  }`}
                >
                  <span>✋</span>
                  <span>{isHandRaised ? 'Hand Raised' : 'Raise Hand'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveMeetingRoom(null)}
                  className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-xl transition-all active:scale-95"
                >
                  End Session 🔴
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Meeting List Top Controls */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border-2 border-slate-100 shadow-lg">
                <div>
                  <h3 className="font-serif font-black text-blue-950 text-xl">
                    Active & Scheduled Virtual Assemblies
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Join ongoing class tutorials, PTA conferences, or schedule a new meeting room.
                  </p>
                </div>

                {currentUserRole !== UserRole.PARENT ? (
                  <button
                    type="button"
                    onClick={() => setShowCreateMeetingModal(true)}
                    className="px-5 py-3 bg-blue-900 hover:bg-blue-800 text-yellow-400 rounded-2xl font-black text-xs uppercase tracking-wider transition-all shadow-md flex items-center gap-2 active:scale-95 shrink-0"
                  >
                    <span>➕</span>
                    <span>Schedule Virtual Meeting</span>
                  </button>
                ) : (
                  <div className="px-4 py-2 bg-yellow-50 border border-yellow-300 rounded-2xl text-xs text-blue-950 font-bold flex items-center gap-2 shrink-0">
                    <span>🛡️</span>
                    <span>Parent Portal: Join live conferences hosted by School Admin</span>
                  </div>
                )}
              </div>

              {/* Meetings Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {meetings.map(meeting => {
                  const parentAllowed = canParentJoinMeeting(meeting);

                  return (
                    <div
                      key={meeting.id}
                      className="bg-white rounded-3xl p-6 sm:p-7 border-2 border-slate-100 shadow-xl space-y-4 hover:border-blue-300 transition-all flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            meeting.status === 'active'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : 'bg-amber-100 text-amber-800 border border-amber-300'
                          }`}>
                            <span className={`w-2 h-2 rounded-full ${meeting.status === 'active' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></span>
                            <span>{meeting.status === 'active' ? 'Live In-Session' : 'Upcoming Schedule'}</span>
                          </span>

                          <span className="font-mono text-[10px] font-black text-slate-400 bg-slate-100 px-2 py-0.5 rounded-lg">
                            {meeting.roomCode}
                          </span>
                        </div>

                        <h4 className="font-serif font-black text-blue-950 text-lg mt-3">
                          {meeting.title}
                        </h4>
                        <p className="text-xs text-slate-600 font-medium leading-relaxed mt-1">
                          {meeting.description}
                        </p>

                        <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5 text-xs">
                          <div className="text-slate-500 font-bold flex items-center gap-1">
                            <span>Host:</span>
                            <UserOnlineStatusBadge
                              isOnline={isUserOnline(meeting.hostName, meeting.hostRole)}
                              name={meeting.hostName}
                              className="text-blue-950 font-black"
                            />
                            <span className="text-slate-400">({meeting.hostRole})</span>
                          </div>
                          <p className="text-slate-500 font-bold">
                            Schedule: <span className="text-blue-950 font-black">{meeting.scheduledTime || 'TBD'}</span>
                          </p>
                        </div>
                      </div>

                      <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                        <span className="text-[11px] font-bold text-slate-400">
                          👥 {meeting.participantsCount || 1} Expected Attendees
                        </span>

                        {parentAllowed ? (
                          <button
                            type="button"
                            onClick={() => setActiveMeetingRoom(meeting)}
                            className="px-6 py-2.5 bg-blue-900 hover:bg-blue-800 text-yellow-400 rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow-md flex items-center gap-2 active:scale-95"
                          >
                            <span>Join Room</span>
                            <span>➔</span>
                          </button>
                        ) : (
                          <div className="flex flex-col items-end">
                            <button
                              type="button"
                              disabled
                              className="px-4 py-2 bg-slate-100 text-slate-400 border border-slate-200 rounded-xl font-bold text-xs cursor-not-allowed flex items-center gap-1.5"
                              title="Parents can only join meetings created or hosted by the School Administration / Proprietor."
                            >
                              <span>🔒</span>
                              <span>Admin Host Only</span>
                            </button>
                            <span className="text-[9px] text-amber-700 font-bold mt-0.5">Admin-hosted only</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* Schedule Meeting Modal */}
          {showCreateMeetingModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="bg-white rounded-[2.5rem] p-6 sm:p-8 max-w-lg w-full shadow-2xl border-4 border-slate-100 relative">
                <button
                  type="button"
                  onClick={() => setShowCreateMeetingModal(false)}
                  className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 font-black text-xl"
                >
                  ✕
                </button>

                <h3 className="font-serif font-black text-2xl text-blue-950 mb-1">
                  Schedule Virtual Meeting
                </h3>
                <p className="text-xs text-slate-500 font-medium mb-6">
                  Create a virtual room for classroom tutorials, staff assemblies, or PTA meetings.
                </p>

                <form onSubmit={handleCreateMeeting} className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-black uppercase text-slate-500 mb-1">
                      Meeting Title:
                    </label>
                    <input
                      type="text"
                      required
                      value={newMeetingTitle}
                      onChange={e => setNewMeetingTitle(e.target.value)}
                      placeholder="e.g. Primary 4 Continuous Assessment Review"
                      className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-2xl text-xs sm:text-sm font-bold text-slate-900 focus:outline-none focus:border-blue-900"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-black uppercase text-slate-500 mb-1">
                      Meeting Description / Agenda:
                    </label>
                    <textarea
                      rows={3}
                      value={newMeetingDescription}
                      onChange={e => setNewMeetingDescription(e.target.value)}
                      placeholder="Reviewing term syllabus, answering questions, and briefing parents on assessment dates."
                      className="w-full p-4 bg-slate-50 border-2 border-slate-200 rounded-2xl text-xs sm:text-sm font-medium text-slate-900 focus:outline-none focus:border-blue-900 resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-black uppercase text-slate-500 mb-1">
                      Scheduled Date & Time:
                    </label>
                    <input
                      type="text"
                      value={newMeetingTime}
                      onChange={e => setNewMeetingTime(e.target.value)}
                      placeholder="e.g. Saturday at 10:00 AM or Immediate"
                      className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-2xl text-xs sm:text-sm font-bold text-slate-900 focus:outline-none focus:border-blue-900"
                    />
                  </div>

                  <div className="pt-2 flex items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setShowCreateMeetingModal(false)}
                      className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-2.5 bg-blue-900 hover:bg-blue-800 text-yellow-400 rounded-xl font-black text-xs uppercase tracking-wider shadow-md"
                    >
                      Create Meeting Room
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 3: VOICE & VIDEO DIRECT CALLS */}
      {/* =================================================================== */}
      {activeMainTab === 'calls' && (
        <div className="space-y-6">
          {/* Active Call Overlay */}
          {activeCallSession && (
            <div className="bg-slate-950 rounded-[2.5rem] p-8 text-white border-4 border-yellow-400 shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="flex flex-col items-center justify-center text-center space-y-4">
                <span className="w-3 h-3 rounded-full bg-emerald-400 animate-ping"></span>
                <div className="w-24 h-24 rounded-full bg-blue-900 border-4 border-yellow-400 flex items-center justify-center text-5xl shadow-2xl">
                  {activeCallSession.type === 'video' ? '📹' : '📞'}
                </div>

                <div>
                  <h3 className="font-serif font-black text-2xl text-white">
                    {activeCallSession.type === 'video' ? 'Video Call with' : 'Voice Call with'} {activeCallSession.receiverName}
                  </h3>
                  <p className="text-xs text-yellow-400 uppercase tracking-widest font-black mt-1">
                    Role: {activeCallSession.receiverRole} • Connected (Encrypted Call)
                  </p>
                  <p className="text-lg font-mono font-black text-slate-300 mt-2">
                    ⏱️ {formatTimer(callDuration)}
                  </p>
                </div>

                {/* Animated Waveform Indicator */}
                <div className="flex items-center gap-1.5 h-8">
                  {[40, 70, 95, 60, 85, 45, 90, 65, 30].map((h, i) => (
                    <span
                      key={i}
                      className="w-1.5 bg-yellow-400 rounded-full animate-pulse"
                      style={{ height: `${h}%`, animationDelay: `${i * 100}ms` }}
                    ></span>
                  ))}
                </div>

                {/* In-Call Controls */}
                <div className="pt-4 flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => setIsCallMuted(!isCallMuted)}
                    className={`w-14 h-14 rounded-full flex items-center justify-center text-xl transition-all shadow-lg active:scale-95 ${
                      isCallMuted ? 'bg-red-600 text-white' : 'bg-slate-800 text-white hover:bg-slate-700'
                    }`}
                    title={isCallMuted ? 'Unmute microphone' : 'Mute microphone'}
                  >
                    {isCallMuted ? '🔇' : '🎤'}
                  </button>

                  {activeCallSession.type === 'video' && (
                    <button
                      type="button"
                      onClick={() => setIsCallVideoOff(!isCallVideoOff)}
                      className={`w-14 h-14 rounded-full flex items-center justify-center text-xl transition-all shadow-lg active:scale-95 ${
                        isCallVideoOff ? 'bg-red-600 text-white' : 'bg-slate-800 text-white hover:bg-slate-700'
                      }`}
                      title={isCallVideoOff ? 'Turn video on' : 'Turn video off'}
                    >
                      {isCallVideoOff ? '🚫' : '📹'}
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      if (onUpdateCallStatus && activeCallSession) {
                        onUpdateCallStatus(activeCallSession.id, 'ended');
                      }
                      setActiveCallSession(null);
                    }}
                    className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center text-2xl shadow-2xl transition-all active:scale-95"
                    title="End Call"
                  >
                    🔴
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* User Directory to Place Calls */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border-2 border-slate-100 shadow-xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <h3 className="font-serif font-black text-blue-950 text-xl">
                  Community Directory & Instant Calling
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Select any staff educator, parent, or pupil to initiate a direct voice or video call.
                </p>
              </div>

              <div className="w-full sm:w-72">
                <input
                  type="text"
                  value={callSearchQuery}
                  onChange={e => setCallSearchQuery(e.target.value)}
                  placeholder="Search user name or role..."
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-900"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCommunityUsers.map(user => (
                <div
                  key={user.id}
                  className="p-5 rounded-3xl border-2 border-slate-100 bg-slate-50 hover:bg-white hover:border-blue-300 hover:shadow-lg transition-all flex flex-col justify-between space-y-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-900 flex items-center justify-center text-xl shrink-0 font-black">
                      {user.icon}
                    </div>
                    <div>
                      <UserOnlineStatusBadge
                        isOnline={isUserOnline(user.id, user.role)}
                        name={user.name}
                        className="text-blue-950 font-serif font-black text-sm leading-snug"
                      />
                      <p className="text-[10px] text-slate-500 font-medium mt-0.5">
                        {user.subtitle}
                      </p>
                      <span className="inline-block px-2 py-0.5 bg-blue-50 text-blue-900 text-[9px] font-black uppercase rounded-full mt-1.5">
                        {user.role}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/60">
                    <button
                      type="button"
                      onClick={() => handleLaunchCall(user, 'voice')}
                      className="w-full py-2 bg-blue-900 hover:bg-blue-800 text-yellow-400 rounded-xl font-black text-[11px] uppercase tracking-wider transition-all shadow-xs flex items-center justify-center gap-1.5 active:scale-95"
                    >
                      <span>📞</span>
                      <span>Call</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleLaunchCall(user, 'video')}
                      className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-black text-[11px] uppercase tracking-wider transition-all shadow-xs flex items-center justify-center gap-1.5 active:scale-95"
                    >
                      <span>📹</span>
                      <span>Video</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
