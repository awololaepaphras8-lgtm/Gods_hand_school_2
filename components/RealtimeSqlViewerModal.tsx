import React, { useState } from 'react';
import { copySupabaseSchemaSql, downloadSupabaseSchemaSql, SUPABASE_MASTER_SQL_SCHEMA } from '../utils/supabaseSqlExport';

interface RealtimeSqlViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RealtimeSqlViewerModal: React.FC<RealtimeSqlViewerModalProps> = ({
  isOpen,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'adminRealtime' | 'chatCalls'>('all');
  const [copySuccess, setCopySuccess] = useState(false);

  if (!isOpen) return null;

  // Specific SQL snippet for Admin Real-time Changes
  const ADMIN_REALTIME_SQL = `-- ==============================================================================
-- GOD'S HAND MODEL SCHOOL - ADMIN REAL-TIME BROADCAST & INSTANT UPDATES
-- Run this in your Supabase SQL Editor to enable instantaneous admin updates across all devices
-- ==============================================================================

-- 1. Ensure supabase_realtime publication exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
END $$;

-- 2. Real-time Admin Audit & Broadcast Events Table
CREATE TABLE IF NOT EXISTS public.admin_realtime_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  action TEXT NOT NULL,          -- e.g. 'FEE_UPDATED', 'ANNOUNCEMENT_POSTED', 'ACCESS_LOCK_TOGGLED'
  details TEXT NOT NULL,
  performed_by TEXT NOT NULL DEFAULT 'Proprietor / Admin',
  payload JSONB DEFAULT '{}'::jsonb,
  timestamp TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Set Replica Identity to FULL for all admin-controlled tables
ALTER TABLE public.fee_structures REPLICA IDENTITY FULL;
ALTER TABLE public.user_pages_access REPLICA IDENTITY FULL;
ALTER TABLE public.announcements REPLICA IDENTITY FULL;
ALTER TABLE public.school_calendar REPLICA IDENTITY FULL;
ALTER TABLE public.students REPLICA IDENTITY FULL;
ALTER TABLE public.teacher_accounts REPLICA IDENTITY FULL;
ALTER TABLE public.timed_staff_delegations REPLICA IDENTITY FULL;
ALTER TABLE public.timetables REPLICA IDENTITY FULL;
ALTER TABLE public.result_publish_requests REPLICA IDENTITY FULL;
ALTER TABLE public.admin_realtime_events REPLICA IDENTITY FULL;

-- 4. Enable Row Level Security (RLS) & Allow Real-time Read & Write
ALTER TABLE public.admin_realtime_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can read admin events" ON public.admin_realtime_events;
CREATE POLICY "Public can read admin events" ON public.admin_realtime_events FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can insert broadcast events" ON public.admin_realtime_events;
CREATE POLICY "Admins can insert broadcast events" ON public.admin_realtime_events FOR INSERT WITH CHECK (true);

-- 5. Add Admin Tables into Supabase Realtime Publication
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'fee_structures',
    'user_pages_access',
    'announcements',
    'school_calendar',
    'students',
    'teacher_accounts',
    'timed_staff_delegations',
    'timetables',
    'result_publish_requests',
    'admin_realtime_events'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    BEGIN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    EXCEPTION
      WHEN duplicate_object THEN NULL;
      WHEN undefined_table THEN NULL;
    END;
  END LOOP;
END $$;

-- 6. Trigger: Automatically log admin fee changes and broadcast them
CREATE OR REPLACE FUNCTION public.notify_admin_fee_change()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.admin_realtime_events (action, details, performed_by, payload)
  VALUES (
    'FEE_UPDATED',
    format('Fees for %s updated to ₦%s', NEW.grade, NEW.amount),
    'Admin Panel',
    json_build_object('grade', NEW.grade, 'amount', NEW.amount)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_fee_update_notify ON public.fee_structures;
CREATE TRIGGER trg_fee_update_notify
  AFTER UPDATE OR INSERT ON public.fee_structures
  FOR EACH ROW EXECUTE FUNCTION public.notify_admin_fee_change();
`;

  // Specific SQL snippet for Chat, Calls, and Meetings
  const CHAT_CALLS_SQL = `-- ==============================================================================
-- GOD'S HAND MODEL SCHOOL - REAL-TIME CHAT, CALLS & VIRTUAL MEETINGS SQL
-- Run this in your Supabase SQL Editor to activate live messaging, PTA meetings & calls
-- ==============================================================================

-- 1. Direct Parent-Staff Messages Table
CREATE TABLE IF NOT EXISTS public.parent_staff_messages (
  id TEXT PRIMARY KEY,               -- e.g. PSM-1725883200
  parent_id TEXT NOT NULL,
  parent_name TEXT NOT NULL,
  parent_email TEXT,
  staff_id TEXT NOT NULL,
  staff_name TEXT NOT NULL,
  student_id TEXT,
  student_name TEXT,
  student_grade TEXT,
  subject TEXT DEFAULT 'Parent Inquiry',
  message TEXT NOT NULL,
  sender_role TEXT NOT NULL CHECK (sender_role IN ('parent', 'teacher', 'admin')),
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('normal', 'urgent', 'inquiry')),
  read BOOLEAN DEFAULT FALSE NOT NULL,
  reply_to_id TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. School Community Chat Channels
CREATE TABLE IF NOT EXISTS public.chat_channels (
  id TEXT PRIMARY KEY,               -- e.g. 'general', 'pta', 'study', 'staff', 'sports'
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  topic TEXT,
  allowed_roles TEXT[] DEFAULT '{"ADMIN", "TEACHER", "PARENT", "STUDENT"}' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Community Channel Chat Messages
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id TEXT PRIMARY KEY,               -- e.g. CM-1725883200
  channel_id TEXT NOT NULL REFERENCES public.chat_channels(id) ON DELETE CASCADE,
  sender_id TEXT NOT NULL,
  sender_name TEXT NOT NULL,
  sender_role TEXT NOT NULL CHECK (sender_role IN ('ADMIN', 'TEACHER', 'PARENT', 'STUDENT', 'GUEST')),
  message TEXT NOT NULL,
  attachment_url TEXT,
  reactions JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Virtual Meetings & Conferences Table
CREATE TABLE IF NOT EXISTS public.meetings (
  id TEXT PRIMARY KEY,               -- e.g. MTG-101
  title TEXT NOT NULL,
  room_code TEXT UNIQUE NOT NULL,    -- e.g. 'GHS-PTA-2026'
  host_name TEXT NOT NULL,
  host_role TEXT NOT NULL DEFAULT 'ADMIN',
  description TEXT,
  scheduled_time TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'upcoming', 'ended')),
  participants_count INT DEFAULT 1 NOT NULL,
  meeting_link TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Real-Time Call Sessions Table
CREATE TABLE IF NOT EXISTS public.call_sessions (
  id TEXT PRIMARY KEY,               -- e.g. CALL-1725883200
  caller_id TEXT NOT NULL,
  caller_name TEXT NOT NULL,
  caller_role TEXT NOT NULL,
  receiver_id TEXT NOT NULL,
  receiver_name TEXT NOT NULL,
  receiver_role TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('voice', 'video')),
  status TEXT NOT NULL DEFAULT 'ringing' CHECK (status IN ('ringing', 'connected', 'ended', 'declined', 'missed')),
  started_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  ended_at TIMESTAMPTZ,
  duration_seconds INT DEFAULT 0
);

-- 6. Indexes for Blazing Fast Lookups
CREATE INDEX IF NOT EXISTS idx_parent_staff_messages_parent ON public.parent_staff_messages(parent_id);
CREATE INDEX IF NOT EXISTS idx_parent_staff_messages_staff ON public.parent_staff_messages(staff_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_channel ON public.chat_messages(channel_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_meetings_status ON public.meetings(status);
CREATE INDEX IF NOT EXISTS idx_call_sessions_receiver ON public.call_sessions(receiver_id, status);

-- 7. Full Replica Identity for Instant Realtime Change Data Capture (CDC)
ALTER TABLE public.parent_staff_messages REPLICA IDENTITY FULL;
ALTER TABLE public.chat_channels REPLICA IDENTITY FULL;
ALTER TABLE public.chat_messages REPLICA IDENTITY FULL;
ALTER TABLE public.meetings REPLICA IDENTITY FULL;
ALTER TABLE public.call_sessions REPLICA IDENTITY FULL;

-- 8. Add Tables to Supabase Realtime Publication
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'parent_staff_messages',
    'chat_channels',
    'chat_messages',
    'meetings',
    'call_sessions'
  ];
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;

  FOREACH t IN ARRAY tables LOOP
    BEGIN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    EXCEPTION
      WHEN duplicate_object THEN NULL;
      WHEN undefined_table THEN NULL;
    END;
  END LOOP;
END $$;

-- 9. Row Level Security (RLS) Permissive Policies
ALTER TABLE public.parent_staff_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read parent-staff messages" ON public.parent_staff_messages;
CREATE POLICY "Anyone can read parent-staff messages" ON public.parent_staff_messages FOR SELECT USING (true);
DROP POLICY IF EXISTS "Anyone can insert parent-staff messages" ON public.parent_staff_messages;
CREATE POLICY "Anyone can insert parent-staff messages" ON public.parent_staff_messages FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can read channels" ON public.chat_channels;
CREATE POLICY "Anyone can read channels" ON public.chat_channels FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can read channel messages" ON public.chat_messages;
CREATE POLICY "Anyone can read channel messages" ON public.chat_messages FOR SELECT USING (true);
DROP POLICY IF EXISTS "Anyone can post channel messages" ON public.chat_messages;
CREATE POLICY "Anyone can post channel messages" ON public.chat_messages FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can read meetings" ON public.meetings;
CREATE POLICY "Anyone can read meetings" ON public.meetings FOR SELECT USING (true);
DROP POLICY IF EXISTS "Anyone can create or update meetings" ON public.meetings;
CREATE POLICY "Anyone can create or update meetings" ON public.meetings FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can read call sessions" ON public.call_sessions;
CREATE POLICY "Anyone can read call sessions" ON public.call_sessions FOR SELECT USING (true);
DROP POLICY IF EXISTS "Anyone can create or update call sessions" ON public.call_sessions;
CREATE POLICY "Anyone can create or update call sessions" ON public.call_sessions FOR ALL USING (true) WITH CHECK (true);

-- 10. Seed Default Channels
INSERT INTO public.chat_channels (id, name, description, icon, topic)
VALUES
  ('general', 'general-school-hub', 'Official school-wide announcements, prayers and morning devotions', '📢', 'Have Faith In God'),
  ('pta', 'pta-parents-forum', 'Parent-Teacher Association dialogue, feedback & partnership', '👨‍👩‍👧‍👦', 'PTA Collaboration'),
  ('study', 'students-study-circle', 'Pupil study group, homework questions and academic quizzes', '📚', 'Continuous Learning'),
  ('staff', 'staff-briefing-room', 'Teachers and admin lesson preparations and academic sync', '👔', 'Staff Faculty Only'),
  ('sports', 'clubs-sports-faith', 'Inter-house sports, debating society, choir and fellowships', '🏆', 'Co-Curricular Activities')
ON CONFLICT (id) DO NOTHING;
`;

  const activeSqlToDisplay = 
    activeTab === 'all' ? SUPABASE_MASTER_SQL_SCHEMA :
    activeTab === 'adminRealtime' ? ADMIN_REALTIME_SQL :
    CHAT_CALLS_SQL;

  const handleCopy = async () => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(activeSqlToDisplay);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 3000);
      } else {
        copySupabaseSchemaSql();
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 3000);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white rounded-[2.5rem] p-6 sm:p-8 max-w-5xl w-full max-h-[90vh] flex flex-col shadow-2xl border-4 border-slate-100 relative">
        {/* Modal Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 font-black text-2xl w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center transition-all"
        >
          ✕
        </button>

        {/* Modal Header */}
        <div className="pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2 mb-1">
            <span className="px-3 py-0.5 bg-yellow-400 text-blue-950 text-[10px] font-black uppercase tracking-widest rounded-full">
              PostgreSQL Master SQL Generator
            </span>
            <span className="px-3 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase rounded-full">
              Ready for Supabase SQL Editor
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-serif font-black text-blue-950">
            Database Schema & Real-Time Sync SQL
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Copy and paste this SQL directly into your Supabase Dashboard SQL Editor to activate all 22+ tables, realtime publications, and RLS policies.
          </p>
        </div>

        {/* Tab Selection */}
        <div className="flex items-center gap-2 pt-4 pb-3 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap ${
              activeTab === 'all'
                ? 'bg-blue-900 text-yellow-400 shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            📋 Complete Master Schema (All 22 Tables)
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('adminRealtime')}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap ${
              activeTab === 'adminRealtime'
                ? 'bg-blue-900 text-yellow-400 shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            ⚡ Admin Real-Time Changes SQL
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('chatCalls')}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap ${
              activeTab === 'chatCalls'
                ? 'bg-blue-900 text-yellow-400 shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            💬 Chat, Meetings & Calls Real-Time SQL
          </button>
        </div>

        {/* Code Display Area */}
        <div className="flex-1 min-h-[300px] overflow-hidden rounded-2xl bg-slate-950 border border-slate-800 relative my-2">
          <pre className="p-4 sm:p-6 text-[11px] sm:text-xs font-mono text-emerald-400 overflow-auto h-[380px] leading-relaxed selection:bg-yellow-400 selection:text-blue-950">
            {activeSqlToDisplay}
          </pre>

          {/* Quick Copy Floating Button */}
          <button
            type="button"
            onClick={handleCopy}
            className={`absolute top-4 right-4 px-4 py-2 rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow-xl flex items-center gap-2 ${
              copySuccess
                ? 'bg-emerald-500 text-white'
                : 'bg-yellow-400 hover:bg-yellow-300 text-blue-950 active:scale-95'
            }`}
          >
            <span>{copySuccess ? '✓' : '📋'}</span>
            <span>{copySuccess ? 'Copied to Clipboard!' : 'Copy SQL'}</span>
          </button>
        </div>

        {/* Bottom Action Footer & Instructions */}
        <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-slate-500 font-medium">
            <span className="font-black text-blue-950">How to use:</span> 1. Open Supabase Dashboard → 2. SQL Editor → 3. Click "+ New query" → 4. Paste and press "Run".
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={downloadSupabaseSchemaSql}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow-xs flex items-center gap-1.5"
            >
              <span>💾</span>
              <span>Download .sql File</span>
            </button>

            <button
              type="button"
              onClick={handleCopy}
              className={`px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow-md flex items-center gap-2 ${
                copySuccess
                  ? 'bg-emerald-600 text-white'
                  : 'bg-blue-900 hover:bg-blue-800 text-yellow-400 active:scale-95'
              }`}
            >
              <span>{copySuccess ? '✓' : '📋'}</span>
              <span>{copySuccess ? 'Copied Successfully!' : 'Copy SQL Code'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
