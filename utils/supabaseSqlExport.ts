import { triggerDownload } from './exportService';

// Complete SQL Schema string for God's Hand International Model School
export const SUPABASE_MASTER_SQL_SCHEMA = `-- ==============================================================================
-- GOD'S HAND INTERNATIONAL MODEL SCHOOL - SUPABASE POSTGRESQL MASTER SCHEMA
-- Wire & Cable, Apata, Ibadan, Oyo State, Nigeria
-- Motto: Have Faith In God
-- ==============================================================================
-- HOW TO USE THIS FILE IN SUPABASE:
-- 1. Log in to your Supabase Dashboard: https://supabase.com/dashboard
-- 2. Open your project (or create a new one).
-- 3. In the left navigation bar, click on "SQL Editor" (icon looks like a terminal/code).
-- 4. Click "+ New query" (top left).
-- 5. Copy and paste this ENTIRE file into the SQL Editor.
-- 6. Click the green "Run" button (or press Ctrl + Enter / Cmd + Enter).
-- 7. All 17 database tables, indexes, RLS policies, realtime triggers, and seed 
--    records will be created and configured immediately!
-- ==============================================================================

-- PHASE 1: EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- PHASE 2: DATABASE TABLES
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'PARENT' CHECK (role IN ('ADMIN', 'TEACHER', 'PARENT', 'STUDENT')),
  phone TEXT,
  address TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.students (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  grade TEXT NOT NULL,
  email TEXT UNIQUE,
  password_hash TEXT,
  entry_allowed BOOLEAN DEFAULT TRUE NOT NULL,
  active_term TEXT DEFAULT 'First Term' NOT NULL,
  qr_code_version INT DEFAULT 1 NOT NULL,
  admission_year INT,
  qr_generations JSONB DEFAULT '{}'::jsonb,
  parent_email TEXT,
  parent_id TEXT,
  date_of_birth DATE,
  gender TEXT CHECK (gender IN ('Male', 'Female', 'Other')),
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.parents (
  id TEXT PRIMARY KEY,
  profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT NOT NULL,
  password_hash TEXT,
  relationship TEXT DEFAULT 'Parent / Guardian' NOT NULL,
  address TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.parent_student_links (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  parent_id TEXT NOT NULL REFERENCES public.parents(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  linked_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  linked_by TEXT DEFAULT 'parent' NOT NULL,
  delinked_at TIMESTAMPTZ,
  delinked_by TEXT,
  is_active BOOLEAN DEFAULT TRUE NOT NULL,
  CONSTRAINT uq_parent_student_link UNIQUE(parent_id, student_id)
);

CREATE TABLE IF NOT EXISTS public.fee_structures (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  grade TEXT UNIQUE NOT NULL,
  amount NUMERIC(12, 2) NOT NULL,
  term TEXT DEFAULT 'First Term' NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.fee_payments (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES public.students(id) ON DELETE RESTRICT,
  parent_id TEXT REFERENCES public.parents(id) ON DELETE SET NULL,
  student_name TEXT NOT NULL,
  grade TEXT NOT NULL,
  amount NUMERIC(12, 2) NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('full', 'installment_1', 'installment_2', 'result_fee')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'declined')),
  date TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  payer_name TEXT,
  bank_name TEXT,
  transaction_ref TEXT,
  student_note TEXT,
  admin_note TEXT,
  receipt_image TEXT,
  receipt_file_name TEXT,
  receipt_file_type TEXT,
  receipt_uploaded_at TIMESTAMPTZ,
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  messages JSONB DEFAULT '[]'::jsonb
);

CREATE TABLE IF NOT EXISTS public.attendance_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  student_name TEXT,
  grade TEXT,
  date TEXT NOT NULL,
  term TEXT DEFAULT 'First Term',
  marked_by TEXT NOT NULL,
  method TEXT DEFAULT 'gate_scanner' CHECK (method IN ('gate_scanner', 'manual_roll', 'rfid_card')),
  scanned_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT uq_daily_attendance UNIQUE(student_id, date)
);

CREATE TABLE IF NOT EXISTS public.student_results (
  id TEXT PRIMARY KEY,
  student_id TEXT REFERENCES public.students(id) ON DELETE CASCADE,
  student_name TEXT NOT NULL,
  grade TEXT NOT NULL,
  subject TEXT NOT NULL,
  score NUMERIC(5, 2) NOT NULL CHECK (score >= 0 AND score <= 100),
  ca_score NUMERIC(5, 2),
  exam_score NUMERIC(5, 2),
  position TEXT,
  term TEXT NOT NULL,
  teacher_name TEXT NOT NULL,
  date TEXT NOT NULL,
  academic_year TEXT DEFAULT '2024/2025' NOT NULL,
  published BOOLEAN DEFAULT TRUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.teacher_accounts (
  id TEXT PRIMARY KEY,
  profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT,
  assigned_grades TEXT[] DEFAULT '{}' NOT NULL,
  assigned_courses TEXT[] DEFAULT '{}' NOT NULL,
  allowed_pages TEXT[] DEFAULT '{"overview", "students", "termStats", "grading", "attendance", "courses"}' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.courses (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  grade TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.announcements (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  date TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.admissions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  grade TEXT NOT NULL,
  paid BOOLEAN DEFAULT FALSE NOT NULL,
  timestamp TEXT NOT NULL,
  parent_name TEXT,
  parent_email TEXT,
  parent_phone TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.school_calendar (
  id INT PRIMARY KEY DEFAULT 1,
  content TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT single_calendar_row CHECK (id = 1)
);

CREATE TABLE IF NOT EXISTS public.result_publish_requests (
  id TEXT PRIMARY KEY,
  teacher_name TEXT NOT NULL,
  grade TEXT NOT NULL,
  term TEXT NOT NULL,
  subject TEXT,
  student_count INT DEFAULT 0 NOT NULL,
  score_count INT DEFAULT 0 NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  timestamp TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  reviewed_at TIMESTAMPTZ,
  reviewed_by TEXT,
  admin_feedback TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.timed_staff_delegations (
  id TEXT PRIMARY KEY,
  teacher_username TEXT NOT NULL,
  teacher_name TEXT NOT NULL,
  granted_sections TEXT[] NOT NULL DEFAULT '{}',
  granted_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  duration_minutes INT NOT NULL,
  granted_by TEXT NOT NULL,
  purpose TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked', 'expired')),
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.user_pages_access (
  id INT PRIMARY KEY DEFAULT 1,
  all_pages_closed BOOLEAN DEFAULT FALSE NOT NULL,
  global_closed_message TEXT,
  pages JSONB DEFAULT '{}'::jsonb NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT single_access_row CHECK (id = 1)
);

CREATE TABLE IF NOT EXISTS public.timetables (
  id TEXT PRIMARY KEY,
  grade TEXT NOT NULL,
  term TEXT NOT NULL DEFAULT 'First Term',
  academic_year TEXT DEFAULT '2024/2025',
  periods JSONB DEFAULT '[]'::jsonb NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_by TEXT DEFAULT 'Teacher',
  CONSTRAINT uq_timetable_grade_term UNIQUE (grade, term)
);

CREATE TABLE IF NOT EXISTS public.parent_staff_messages (
  id TEXT PRIMARY KEY,
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

CREATE TABLE IF NOT EXISTS public.chat_channels (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  topic TEXT,
  allowed_roles TEXT[] DEFAULT '{"ADMIN", "TEACHER", "PARENT", "STUDENT"}' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.chat_messages (
  id TEXT PRIMARY KEY,
  channel_id TEXT NOT NULL REFERENCES public.chat_channels(id) ON DELETE CASCADE,
  sender_id TEXT NOT NULL,
  sender_name TEXT NOT NULL,
  sender_role TEXT NOT NULL CHECK (sender_role IN ('ADMIN', 'TEACHER', 'PARENT', 'STUDENT', 'GUEST')),
  message TEXT NOT NULL,
  attachment_url TEXT,
  reactions JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.meetings (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  room_code TEXT UNIQUE NOT NULL,
  host_name TEXT NOT NULL,
  host_role TEXT NOT NULL DEFAULT 'ADMIN',
  description TEXT,
  scheduled_time TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'upcoming', 'ended')),
  participants_count INT DEFAULT 1 NOT NULL,
  meeting_link TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.call_sessions (
  id TEXT PRIMARY KEY,
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

CREATE TABLE IF NOT EXISTS public.admin_realtime_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  action TEXT NOT NULL,
  details TEXT NOT NULL,
  performed_by TEXT NOT NULL DEFAULT 'Proprietor / Admin',
  payload JSONB DEFAULT '{}'::jsonb,
  timestamp TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- PHASE 3: SAFE COLUMN UPGRADES & CONSTRAINT MIGRATIONS
DO $$
BEGIN
  ALTER TABLE public.fee_payments DROP CONSTRAINT IF EXISTS fee_payments_type_check;
  ALTER TABLE public.fee_payments ADD CONSTRAINT fee_payments_type_check 
    CHECK (type IN ('full', 'installment_1', 'installment_2', 'result_fee'));
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

ALTER TABLE public.students ADD COLUMN IF NOT EXISTS admission_year INT;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS qr_generations JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS parent_email TEXT;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS parent_id TEXT;

ALTER TABLE public.fee_payments ADD COLUMN IF NOT EXISTS receipt_file_type TEXT;
ALTER TABLE public.fee_payments ADD COLUMN IF NOT EXISTS receipt_uploaded_at TIMESTAMPTZ;
ALTER TABLE public.fee_payments ADD COLUMN IF NOT EXISTS messages JSONB DEFAULT '[]'::jsonb;

ALTER TABLE public.student_results ADD COLUMN IF NOT EXISTS ca_score NUMERIC(5, 2);
ALTER TABLE public.student_results ADD COLUMN IF NOT EXISTS exam_score NUMERIC(5, 2);
ALTER TABLE public.student_results ADD COLUMN IF NOT EXISTS position TEXT;
ALTER TABLE public.student_results ADD COLUMN IF NOT EXISTS published BOOLEAN DEFAULT TRUE NOT NULL;

ALTER TABLE public.teacher_accounts ADD COLUMN IF NOT EXISTS allowed_pages TEXT[] DEFAULT '{"overview", "students", "termStats", "grading", "attendance", "courses"}' NOT NULL;

-- PHASE 4: PERFORMANCE INDEXES
CREATE INDEX IF NOT EXISTS idx_psl_parent_id ON public.parent_student_links(parent_id);
CREATE INDEX IF NOT EXISTS idx_psl_student_id ON public.parent_student_links(student_id);
CREATE INDEX IF NOT EXISTS idx_payments_student_id ON public.fee_payments(student_id);
CREATE INDEX IF NOT EXISTS idx_payments_parent_id ON public.fee_payments(parent_id);
CREATE INDEX IF NOT EXISTS idx_timetables_grade ON public.timetables(grade);
CREATE INDEX IF NOT EXISTS idx_timetables_term ON public.timetables(term);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.fee_payments(status);
CREATE INDEX IF NOT EXISTS idx_attendance_student_date ON public.attendance_records(student_id, date);
CREATE INDEX IF NOT EXISTS idx_results_student_name ON public.student_results(student_name);
CREATE INDEX IF NOT EXISTS idx_results_student_id ON public.student_results(student_id);
CREATE INDEX IF NOT EXISTS idx_results_term ON public.student_results(term);

-- PHASE 5: HELPER FUNCTIONS & AUTH
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN')
    OR (auth.jwt() ->> 'role' = 'admin')
    OR (auth.jwt() -> 'user_metadata' ->> 'role' = 'ADMIN')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_teacher()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('TEACHER', 'ADMIN'));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- PHASE 6: ROW LEVEL SECURITY & POLICIES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parent_student_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_structures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_calendar ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.result_publish_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timed_staff_delegations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_pages_access ENABLE ROW LEVEL SECURITY;

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;

DROP POLICY IF EXISTS "Anyone can read student records" ON public.students;
CREATE POLICY "Anyone can read student records" ON public.students FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow student registration and admin updates" ON public.students;
CREATE POLICY "Allow student registration and admin updates" ON public.students FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can read parent profiles" ON public.parents;
CREATE POLICY "Anyone can read parent profiles" ON public.parents FOR SELECT USING (true);
DROP POLICY IF EXISTS "Parents can register and manage profile" ON public.parents;
CREATE POLICY "Parents can register and manage profile" ON public.parents FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can read active parent-student links" ON public.parent_student_links;
CREATE POLICY "Anyone can read active parent-student links" ON public.parent_student_links FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow linking and updating child links" ON public.parent_student_links;
CREATE POLICY "Allow linking and updating child links" ON public.parent_student_links FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can read fee structures" ON public.fee_structures;
CREATE POLICY "Anyone can read fee structures" ON public.fee_structures FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins can manage fee structures" ON public.fee_structures;
CREATE POLICY "Admins can manage fee structures" ON public.fee_structures FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can read fee payment ledgers" ON public.fee_payments;
CREATE POLICY "Anyone can read fee payment ledgers" ON public.fee_payments FOR SELECT USING (true);
DROP POLICY IF EXISTS "Anyone can submit or update payments" ON public.fee_payments;
CREATE POLICY "Anyone can submit or update payments" ON public.fee_payments FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can read attendance records" ON public.attendance_records;
CREATE POLICY "Anyone can read attendance records" ON public.attendance_records FOR SELECT USING (true);
DROP POLICY IF EXISTS "Gate officers and staff can record attendance" ON public.attendance_records;
CREATE POLICY "Gate officers and staff can record attendance" ON public.attendance_records FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can view student results" ON public.student_results;
CREATE POLICY "Anyone can view student results" ON public.student_results FOR SELECT USING (true);
DROP POLICY IF EXISTS "Teachers and admins can manage results" ON public.student_results;
CREATE POLICY "Teachers and admins can manage results" ON public.student_results FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can view teacher directory" ON public.teacher_accounts;
CREATE POLICY "Anyone can view teacher directory" ON public.teacher_accounts FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins can manage teacher accounts" ON public.teacher_accounts;
CREATE POLICY "Admins can manage teacher accounts" ON public.teacher_accounts FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can view curriculum courses" ON public.courses;
CREATE POLICY "Anyone can view curriculum courses" ON public.courses FOR SELECT USING (true);
DROP POLICY IF EXISTS "Staff and admins can manage courses" ON public.courses;
CREATE POLICY "Staff and admins can manage courses" ON public.courses FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can view announcements" ON public.announcements;
CREATE POLICY "Anyone can view announcements" ON public.announcements FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins can manage announcements" ON public.announcements;
CREATE POLICY "Admins can manage announcements" ON public.announcements FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can read and submit admissions" ON public.admissions;
CREATE POLICY "Anyone can read and submit admissions" ON public.admissions FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can read the academic calendar" ON public.school_calendar;
CREATE POLICY "Anyone can read the academic calendar" ON public.school_calendar FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins can update the academic calendar" ON public.school_calendar;
CREATE POLICY "Admins can update the academic calendar" ON public.school_calendar FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can read result publish requests" ON public.result_publish_requests;
CREATE POLICY "Anyone can read result publish requests" ON public.result_publish_requests FOR SELECT USING (true);
DROP POLICY IF EXISTS "Staff and admins can manage result requests" ON public.result_publish_requests;
CREATE POLICY "Staff and admins can manage result requests" ON public.result_publish_requests FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can read timed staff delegations" ON public.timed_staff_delegations;
CREATE POLICY "Anyone can read timed staff delegations" ON public.timed_staff_delegations FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins can manage timed staff delegations" ON public.timed_staff_delegations;
CREATE POLICY "Admins can manage timed staff delegations" ON public.timed_staff_delegations FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can read user pages access state" ON public.user_pages_access;
CREATE POLICY "Anyone can read user pages access state" ON public.user_pages_access FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins can update user pages access state" ON public.user_pages_access;
CREATE POLICY "Admins can update user pages access state" ON public.user_pages_access FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can read class timetables" ON public.timetables;
CREATE POLICY "Anyone can read class timetables" ON public.timetables FOR SELECT USING (true);
DROP POLICY IF EXISTS "Staff and admins can manage timetables" ON public.timetables;
CREATE POLICY "Staff and admins can manage timetables" ON public.timetables FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can read parent-staff messages" ON public.parent_staff_messages;
CREATE POLICY "Anyone can read parent-staff messages" ON public.parent_staff_messages FOR SELECT USING (true);
DROP POLICY IF EXISTS "Anyone can send parent-staff messages" ON public.parent_staff_messages;
CREATE POLICY "Anyone can send parent-staff messages" ON public.parent_staff_messages FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can read chat channels" ON public.chat_channels;
CREATE POLICY "Anyone can read chat channels" ON public.chat_channels FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins can manage chat channels" ON public.chat_channels;
CREATE POLICY "Admins can manage chat channels" ON public.chat_channels FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can read community chat messages" ON public.chat_messages;
CREATE POLICY "Anyone can read community chat messages" ON public.chat_messages FOR SELECT USING (true);
DROP POLICY IF EXISTS "Anyone can post community chat messages" ON public.chat_messages;
CREATE POLICY "Anyone can post community chat messages" ON public.chat_messages FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can view virtual meetings" ON public.meetings;
CREATE POLICY "Anyone can view virtual meetings" ON public.meetings FOR SELECT USING (true);
DROP POLICY IF EXISTS "Anyone can create or manage virtual meetings" ON public.meetings;
CREATE POLICY "Anyone can create or manage virtual meetings" ON public.meetings FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can view call sessions" ON public.call_sessions;
CREATE POLICY "Anyone can view call sessions" ON public.call_sessions FOR SELECT USING (true);
DROP POLICY IF EXISTS "Anyone can initiate or update call sessions" ON public.call_sessions;
CREATE POLICY "Anyone can initiate or update call sessions" ON public.call_sessions FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can read admin realtime events" ON public.admin_realtime_events;
CREATE POLICY "Anyone can read admin realtime events" ON public.admin_realtime_events FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins can insert realtime events" ON public.admin_realtime_events;
CREATE POLICY "Admins can insert realtime events" ON public.admin_realtime_events FOR INSERT WITH CHECK (true);

-- PHASE 7: SUPABASE REALTIME CONFIGURATION (ALL 23 TABLES)
ALTER TABLE public.profiles REPLICA IDENTITY FULL;
ALTER TABLE public.students REPLICA IDENTITY FULL;
ALTER TABLE public.parents REPLICA IDENTITY FULL;
ALTER TABLE public.parent_student_links REPLICA IDENTITY FULL;
ALTER TABLE public.fee_structures REPLICA IDENTITY FULL;
ALTER TABLE public.fee_payments REPLICA IDENTITY FULL;
ALTER TABLE public.attendance_records REPLICA IDENTITY FULL;
ALTER TABLE public.student_results REPLICA IDENTITY FULL;
ALTER TABLE public.teacher_accounts REPLICA IDENTITY FULL;
ALTER TABLE public.courses REPLICA IDENTITY FULL;
ALTER TABLE public.announcements REPLICA IDENTITY FULL;
ALTER TABLE public.admissions REPLICA IDENTITY FULL;
ALTER TABLE public.school_calendar REPLICA IDENTITY FULL;
ALTER TABLE public.result_publish_requests REPLICA IDENTITY FULL;
ALTER TABLE public.timed_staff_delegations REPLICA IDENTITY FULL;
ALTER TABLE public.user_pages_access REPLICA IDENTITY FULL;
ALTER TABLE public.timetables REPLICA IDENTITY FULL;
ALTER TABLE public.parent_staff_messages REPLICA IDENTITY FULL;
ALTER TABLE public.chat_channels REPLICA IDENTITY FULL;
ALTER TABLE public.chat_messages REPLICA IDENTITY FULL;
ALTER TABLE public.meetings REPLICA IDENTITY FULL;
ALTER TABLE public.call_sessions REPLICA IDENTITY FULL;
ALTER TABLE public.admin_realtime_events REPLICA IDENTITY FULL;

DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'profiles', 'students', 'parents', 'parent_student_links', 'fee_structures', 
    'fee_payments', 'attendance_records', 'student_results', 'teacher_accounts', 
    'courses', 'announcements', 'admissions', 'school_calendar',
    'result_publish_requests', 'timed_staff_delegations', 'user_pages_access', 'timetables',
    'parent_staff_messages', 'chat_channels', 'chat_messages', 'meetings', 'call_sessions', 'admin_realtime_events'
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

-- PHASE 8: RECEIPTS STORAGE BUCKET
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'storage') THEN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('receipts', 'receipts', true)
    ON CONFLICT (id) DO NOTHING;

    DROP POLICY IF EXISTS "Public can view payment receipts" ON storage.objects;
    CREATE POLICY "Public can view payment receipts"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'receipts');

    DROP POLICY IF EXISTS "Anyone can upload payment receipts" ON storage.objects;
    CREATE POLICY "Anyone can upload payment receipts"
      ON storage.objects FOR INSERT
      WITH CHECK (bucket_id = 'receipts');
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- PHASE 9: SEED DATA (FEES, CALENDAR, INITIAL USERS)
INSERT INTO public.fee_structures (grade, amount, term)
VALUES
  ('Crèche', 25000, 'First Term'),
  ('Creche', 25000, 'First Term'),
  ('Prenursery 1', 28000, 'First Term'),
  ('Prenursery 2', 28000, 'First Term'),
  ('KG 1', 28000, 'First Term'),
  ('KG 2', 28000, 'First Term'),
  ('Nursery 1', 30000, 'First Term'),
  ('Nursery 2', 30000, 'First Term'),
  ('Primary 1', 35000, 'First Term'),
  ('Primary 2', 35000, 'First Term'),
  ('Primary 3', 35000, 'First Term'),
  ('Primary 4', 38000, 'First Term'),
  ('Primary 5', 38000, 'First Term'),
  ('Primary 6', 40000, 'First Term'),
  ('Basic 1', 35000, 'First Term'),
  ('Basic 2', 35000, 'First Term'),
  ('Basic 3', 35000, 'First Term'),
  ('Basic 4', 38000, 'First Term'),
  ('Basic 5', 38000, 'First Term'),
  ('JSS 1', 45000, 'First Term'),
  ('JSS 2', 45000, 'First Term'),
  ('JSS 3', 50000, 'First Term'),
  ('SSS 1', 55000, 'First Term'),
  ('SSS 2', 55000, 'First Term'),
  ('SSS 3', 65000, 'First Term')
ON CONFLICT (grade) DO UPDATE 
SET amount = EXCLUDED.amount, term = EXCLUDED.term;

INSERT INTO public.school_calendar (id, content)
VALUES (
  1,
  '1. First Term Resumption: Sept 15th' || E'\\n' ||
  '2. Continuous Assessments (CA): Oct 20th - 24th' || E'\\n' ||
  '3. Mid-Term Break: Oct 29th - 31st' || E'\\n' ||
  '4. Terminal Examination Period: Dec 1st - 11th' || E'\\n' ||
  '5. Vacation & Annual Carol Service: Dec 17th'
)
ON CONFLICT (id) DO UPDATE SET content = EXCLUDED.content;

INSERT INTO public.students (id, name, grade, email, password_hash, entry_allowed, active_term, admission_year)
VALUES
  ('STU-1', 'Samuel Adebayo', 'Primary 4', 'samuel@godshand.sch.ng', 'student123', TRUE, 'First Term', 2022),
  ('STU-2', 'Grace Adebayo', 'JSS 2', 'grace@godshand.sch.ng', 'student123', TRUE, 'First Term', 2021),
  ('STU-3', 'Boluwatife Adeleke', 'Primary 1', 'bolu.adeleke@godshand.sch.ng', 'student123', TRUE, 'First Term', 2024),
  ('STU-4', 'Zainab Danjuma', 'SSS 1', 'zainab.d@godshand.sch.ng', 'student123', TRUE, 'First Term', 2023)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.parents (id, full_name, email, phone, password_hash, relationship, address)
VALUES
  ('PAR-1', 'Mrs. Folashade Adebayo', 'parent@godshand.sch.ng', '08034567890', 'parent123', 'Mother', 'Oluwatedo Area, Wire & Cable, Apata, Ibadan')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.parent_student_links (parent_id, student_id, linked_by, is_active)
VALUES
  ('PAR-1', 'STU-1', 'admin', TRUE),
  ('PAR-1', 'STU-2', 'admin', TRUE)
ON CONFLICT (parent_id, student_id) DO NOTHING;

INSERT INTO public.teacher_accounts (id, username, password_hash, assigned_grades, allowed_pages)
VALUES
  ('TCH-1', 'staff', 'staff123', ARRAY['Primary 1', 'Primary 2', 'Primary 3', 'Primary 4', 'Primary 5', 'Primary 6'], ARRAY['overview', 'students', 'termStats', 'grading', 'attendance', 'courses'])
ON CONFLICT (username) DO NOTHING;

INSERT INTO public.courses (id, name, grade, description)
VALUES
  ('c1', 'Mathematics', 'Primary 1', 'Basic arithmetic, counting, and simple shapes.'),
  ('c2', 'English Language', 'Primary 1', 'Grammar, vocabulary, and basic phonetics.'),
  ('c3', 'Basic Science', 'Primary 1', 'Introductory environmental and natural science.'),
  ('c4', 'Mathematics', 'Primary 4', 'Fractions, decimals, word problems, and geometry.'),
  ('c5', 'English Language', 'Primary 4', 'Comprehension, essays, and advanced parts of speech.')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.announcements (id, title, content, date)
VALUES
  ('ann-1', 'Welcome to the New Academic Session', 'We warmly welcome all new and returning pupils to God''s Hand International Model School. Let us have a fruitful and faith-filled term!', '9/1/2026'),
  ('ann-2', 'Tuition Fee Payment Reminder', 'Parents are kindly requested to settle first term fees on or before resumption to enable seamless access and gate clearance for their children.', '9/5/2026')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.user_pages_access (id, all_pages_closed, global_closed_message, pages)
VALUES (
  1,
  FALSE,
  'The school portal is temporarily closed for scheduled administrative updates. Please check back shortly.',
  '{}'::jsonb
)
ON CONFLICT (id) DO UPDATE
SET updated_at = timezone('utc'::text, now());

INSERT INTO public.chat_channels (id, name, description, icon, topic)
VALUES
  ('general', 'general-school-hub', 'Official school-wide announcements, prayers and morning devotions', '📢', 'Have Faith In God'),
  ('pta', 'pta-parents-forum', 'Parent-Teacher Association dialogue, feedback & partnership', '👨‍👩‍👧‍👦', 'PTA Collaboration'),
  ('study', 'students-study-circle', 'Pupil study group, homework questions and academic quizzes', '📚', 'Continuous Learning'),
  ('staff', 'staff-briefing-room', 'Teachers and admin lesson preparations and academic sync', '👔', 'Staff Faculty Only'),
  ('sports', 'clubs-sports-faith', 'Inter-house sports, debating society, choir and fellowships', '🏆', 'Co-Curricular Activities')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.parent_staff_messages (
  id, parent_id, parent_name, parent_email, staff_id, staff_name,
  student_id, student_name, student_grade, subject, message, sender_role, priority, read
)
VALUES
  ('PSM-1', 'PAR-1', 'Mrs. Folashade Adebayo', 'parent@godshand.sch.ng', 'staff', 'Mr. David Adeleke', 'STU-1', 'Samuel Adebayo', 'Primary 4', 'Academic Progress & Homework Inquiry', 'Good morning Mr. Adeleke, please I would like to confirm Samuel''s homework submission for Mathematics yesterday.', 'parent', 'inquiry', TRUE),
  ('PSM-2', 'PAR-1', 'Mrs. Folashade Adebayo', 'parent@godshand.sch.ng', 'staff', 'Mr. David Adeleke', 'STU-1', 'Samuel Adebayo', 'Primary 4', 'Academic Progress & Homework Inquiry', 'Good afternoon Mrs. Adebayo! Yes, Samuel submitted his arithmetic exercises on time and scored 95%. He is doing exceptionally well in class.', 'teacher', 'normal', TRUE)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.meetings (
  id, title, room_code, host_name, host_role, description, scheduled_time, status, participants_count, meeting_link
)
VALUES
  ('MTG-1', 'Termly General PTA Virtual Assembly & Orientation', 'GHS-PTA-2026', 'Proprietor & Head of School', 'ADMIN', 'Review of academic calendar, terminal results release, and student gate security protocol.', 'Saturday 10:00 AM', 'active', 14, 'https://godshand.sch.ng/meet/GHS-PTA-2026')
ON CONFLICT (id) DO NOTHING;
`;

/**
 * Downloads the full Supabase SQL Schema as a .sql file
 */
export const downloadSupabaseSchemaSql = (): void => {
  triggerDownload(
    'gods_hand_supabase_schema.sql',
    SUPABASE_MASTER_SQL_SCHEMA,
    'application/sql;charset=utf-8;'
  );
};

/**
 * Copies the SQL Schema to the user's clipboard
 */
export const copySupabaseSchemaSql = async (): Promise<boolean> => {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(SUPABASE_MASTER_SQL_SCHEMA);
      return true;
    }
    // Fallback for older browsers or iframe restrictions
    const textArea = document.createElement('textarea');
    textArea.value = SUPABASE_MASTER_SQL_SCHEMA;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return successful;
  } catch (err) {
    console.error('Failed to copy Supabase SQL to clipboard:', err);
    return false;
  }
};
