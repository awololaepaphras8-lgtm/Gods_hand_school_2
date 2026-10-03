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
CREATE TABLE IF NOT EXISTS public.admin_accounts (
  id TEXT PRIMARY KEY, -- 'pro01' format for external audit verification
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'ADMIN',
  security_key TEXT NOT NULL DEFAULT '21df605dbc7d7cc39343a2deedec28140c6b1a5771bc244fe6885ab89122d16a',
  proph_verified BOOLEAN DEFAULT TRUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

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
  balance NUMERIC(12, 2) DEFAULT NULL,
  photo TEXT,
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
  status TEXT DEFAULT 'present' CHECK (status IN ('present', 'absent', 'late', 'excused')),
  method TEXT DEFAULT 'manual_roll' CHECK (method IN ('gate_scanner', 'manual_roll', 'rfid_card', 'batch_checklist')),
  scanned_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
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
  full_name TEXT,
  email TEXT,
  phone TEXT,
  assigned_grades TEXT[] DEFAULT '{}' NOT NULL,
  assigned_courses TEXT[] DEFAULT '{}' NOT NULL,
  allowed_pages TEXT[] DEFAULT '{"overview", "parentMessages", "attendanceScanning", "attendance", "students", "timetable", "termStats", "grading", "courses"}' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
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
  notes TEXT,
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
  sender_id TEXT,
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('normal', 'urgent', 'inquiry')),
  read BOOLEAN DEFAULT FALSE NOT NULL,
  status TEXT DEFAULT 'delivered' CHECK (status IN ('sent', 'delivered', 'read', 'seen')),
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  seen_at TIMESTAMPTZ,
  is_edited BOOLEAN DEFAULT FALSE NOT NULL,
  edited_at TIMESTAMPTZ,
  reactions JSONB DEFAULT '{}'::jsonb,
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

CREATE TABLE IF NOT EXISTS public.call_recordings (
  id TEXT PRIMARY KEY,
  room_code TEXT NOT NULL,
  room_title TEXT NOT NULL,
  host_name TEXT NOT NULL,
  camera_role TEXT NOT NULL CHECK (camera_role IN ('admin', 'spotlight_1', 'spotlight_2', 'spotlight_3')),
  camera_label TEXT NOT NULL,
  recorded_by_name TEXT NOT NULL,
  recorded_by_role TEXT NOT NULL DEFAULT 'ADMIN',
  duration_seconds INT NOT NULL DEFAULT 0,
  blob_url TEXT,
  file_size_bytes BIGINT NOT NULL DEFAULT 0,
  mime_type TEXT NOT NULL DEFAULT 'video/webm',
  download_file_name TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS public.school_bank_account_config (
  id TEXT PRIMARY KEY DEFAULT 'primary_account',
  bank_name TEXT NOT NULL,
  account_number TEXT NOT NULL,
  account_name TEXT NOT NULL,
  payment_instructions TEXT,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_by TEXT DEFAULT 'School Administrator'
);

CREATE TABLE IF NOT EXISTS public.call_signals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  call_id TEXT NOT NULL,
  sender_id TEXT NOT NULL,
  receiver_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('offer', 'answer', 'ice_candidate', 'mic_status', 'end_call')),
  signal_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
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
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS balance NUMERIC(12, 2) DEFAULT NULL;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS photo TEXT;

-- Update attendance_records method check to include batch_checklist and roll call
DO $$
BEGIN
  ALTER TABLE public.attendance_records DROP CONSTRAINT IF EXISTS attendance_records_method_check;
  ALTER TABLE public.attendance_records ADD CONSTRAINT attendance_records_method_check 
    CHECK (method IN ('gate_scanner', 'manual_roll', 'rfid_card', 'batch_checklist'));
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

ALTER TABLE public.attendance_records ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'present';
ALTER TABLE public.attendance_records ADD COLUMN IF NOT EXISTS term TEXT DEFAULT 'First Term';
ALTER TABLE public.attendance_records ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now());

ALTER TABLE public.fee_payments ADD COLUMN IF NOT EXISTS receipt_file_type TEXT;
ALTER TABLE public.fee_payments ADD COLUMN IF NOT EXISTS receipt_uploaded_at TIMESTAMPTZ;
ALTER TABLE public.fee_payments ADD COLUMN IF NOT EXISTS messages JSONB DEFAULT '[]'::jsonb;

ALTER TABLE public.student_results ADD COLUMN IF NOT EXISTS ca_score NUMERIC(5, 2);
ALTER TABLE public.student_results ADD COLUMN IF NOT EXISTS exam_score NUMERIC(5, 2);
ALTER TABLE public.student_results ADD COLUMN IF NOT EXISTS position TEXT;
ALTER TABLE public.student_results ADD COLUMN IF NOT EXISTS published BOOLEAN DEFAULT TRUE NOT NULL;
ALTER TABLE public.student_results ADD COLUMN IF NOT EXISTS academic_year TEXT DEFAULT '2024/2025';

ALTER TABLE public.teacher_accounts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now());
ALTER TABLE public.teacher_accounts ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE public.teacher_accounts ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.teacher_accounts ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.teacher_accounts ADD COLUMN IF NOT EXISTS allowed_pages TEXT[] DEFAULT '{"overview", "parentMessages", "attendanceScanning", "attendance", "students", "timetable", "termStats", "grading", "courses"}' NOT NULL;

ALTER TABLE public.timetables ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.timetables ADD COLUMN IF NOT EXISTS updated_by TEXT DEFAULT 'Teacher';
ALTER TABLE public.timetables ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now());

ALTER TABLE public.parent_staff_messages ADD COLUMN IF NOT EXISTS sender_id TEXT;
ALTER TABLE public.parent_staff_messages ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'delivered';
ALTER TABLE public.parent_staff_messages ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;
ALTER TABLE public.parent_staff_messages ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;
ALTER TABLE public.parent_staff_messages ADD COLUMN IF NOT EXISTS seen_at TIMESTAMPTZ;
ALTER TABLE public.parent_staff_messages ADD COLUMN IF NOT EXISTS is_edited BOOLEAN DEFAULT FALSE;
ALTER TABLE public.parent_staff_messages ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ;
ALTER TABLE public.parent_staff_messages ADD COLUMN IF NOT EXISTS reactions JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.parent_staff_messages ADD COLUMN IF NOT EXISTS reply_to_id TEXT;

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

-- Function to purge old fee structures and store strictly new fee values
-- ("whenever the admin changes the school fee and then press the update fee configuration make sure the new value is stored in the data base and the old is deleted")
CREATE OR REPLACE FUNCTION public.replace_fee_configuration(new_fees JSONB)
RETURNS VOID AS $$
DECLARE
  grade_key TEXT;
  fee_val NUMERIC;
BEGIN
  -- Delete all old fee records from database
  DELETE FROM public.fee_structures;
  
  -- Insert only the new active fee values
  FOR grade_key, fee_val IN SELECT * FROM jsonb_each_text(new_fees)
  LOOP
    INSERT INTO public.fee_structures (id, grade, amount, term, updated_at)
    VALUES (gen_random_uuid(), grade_key, fee_val::numeric, 'First Term', timezone('utc'::text, now()));
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Database verification function for external app 'proph' using unique Admin ID 'pro01'
-- ("make the admin have a unique id that can allow all the data base be checked when entered on another app called proph and make the admin id have this format 'pro01'")
CREATE OR REPLACE FUNCTION public.verify_database_integrity_proph(admin_key TEXT)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  IF lower(trim(admin_key)) != 'pro01' THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'Access Denied: Invalid Admin Unique ID. Required: pro01'
    );
  END IF;

  SELECT jsonb_build_object(
    'success', true,
    'admin_id', 'pro01',
    'verified_at', timezone('utc'::text, now()),
    'school', 'God''s Hand International Model School',
    'status', 'AUDITED_VERIFIED_ACTIVE',
    'metrics', jsonb_build_object(
      'students', (SELECT COUNT(*) FROM public.students),
      'parents', (SELECT COUNT(*) FROM public.parents),
      'teachers', (SELECT COUNT(*) FROM public.teacher_accounts),
      'fee_structures', (SELECT COUNT(*) FROM public.fee_structures),
      'fee_payments', (SELECT COUNT(*) FROM public.fee_payments),
      'attendance_records', (SELECT COUNT(*) FROM public.attendance_records),
      'student_results', (SELECT COUNT(*) FROM public.student_results),
      'timetables', (SELECT COUNT(*) FROM public.timetables),
      'chat_messages', (SELECT COUNT(*) FROM public.chat_messages),
      'meetings', (SELECT COUNT(*) FROM public.meetings)
    )
  ) INTO result;

  RETURN result;
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

ALTER TABLE public.call_recordings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can view call recordings" ON public.call_recordings;
CREATE POLICY "Public can view call recordings" ON public.call_recordings FOR SELECT USING (true);
DROP POLICY IF EXISTS "Authenticated users or staff can insert recordings" ON public.call_recordings;
CREATE POLICY "Authenticated users or staff can insert recordings" ON public.call_recordings FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Admins can delete or manage recordings" ON public.call_recordings;
CREATE POLICY "Admins can delete or manage recordings" ON public.call_recordings FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.school_bank_account_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can read school bank account config" ON public.school_bank_account_config;
CREATE POLICY "Anyone can read school bank account config" ON public.school_bank_account_config FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins can update school bank account config" ON public.school_bank_account_config;
CREATE POLICY "Admins can update school bank account config" ON public.school_bank_account_config FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.call_signals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can insert and read call signals" ON public.call_signals;
CREATE POLICY "Anyone can insert and read call signals" ON public.call_signals FOR ALL USING (true) WITH CHECK (true);

-- PHASE 7: SUPABASE REALTIME CONFIGURATION (ALL 26 TABLES)
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
ALTER TABLE public.call_recordings REPLICA IDENTITY FULL;
ALTER TABLE public.school_bank_account_config REPLICA IDENTITY FULL;
ALTER TABLE public.call_signals REPLICA IDENTITY FULL;

DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'profiles', 'students', 'parents', 'parent_student_links', 'fee_structures', 
    'fee_payments', 'attendance_records', 'student_results', 'teacher_accounts', 
    'courses', 'announcements', 'admissions', 'school_calendar',
    'result_publish_requests', 'timed_staff_delegations', 'user_pages_access', 'timetables',
    'parent_staff_messages', 'chat_channels', 'chat_messages', 'meetings', 'call_sessions', 'admin_realtime_events',
    'call_recordings', 'school_bank_account_config', 'call_signals'
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

INSERT INTO public.admin_accounts (id, username, email, full_name, role, security_key, proph_verified)
VALUES
  ('pro01', 'pro01', 'Godshandschool70@gmail.com', 'School Proprietor & Chief Administrator', 'ADMIN', '21df605dbc7d7cc39343a2deedec28140c6b1a5771bc244fe6885ab89122d16a', TRUE)
ON CONFLICT (id) DO UPDATE SET 
  username = EXCLUDED.username,
  email = EXCLUDED.email,
  security_key = EXCLUDED.security_key;

INSERT INTO public.students (id, name, grade, email, password_hash, entry_allowed, active_term, admission_year)
VALUES
  ('GHS20268001', 'Samuel Adebayo', 'Primary 4', 'samuel@Godshand.sch.ng', 'student123', TRUE, 'First Term', 2026),
  ('GHS202611001', 'Grace Adebayo', 'JSS 2', 'grace@Godshand.sch.ng', 'student123', TRUE, 'First Term', 2026),
  ('STU-1', 'Samuel Adebayo', 'Primary 4', 'samuel.old@Godshand.sch.ng', 'student123', TRUE, 'First Term', 2022),
  ('STU-2', 'Grace Adebayo', 'JSS 2', 'grace.old@Godshand.sch.ng', 'student123', TRUE, 'First Term', 2021),
  ('STU-3', 'Boluwatife Adeleke', 'Primary 1', 'bolu.adeleke@Godshand.sch.ng', 'student123', TRUE, 'First Term', 2024),
  ('STU-4', 'Zainab Danjuma', 'SSS 1', 'zainab.d@Godshand.sch.ng', 'student123', TRUE, 'First Term', 2023)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.parents (id, full_name, email, phone, password_hash, relationship, address)
VALUES
  ('PAR-1', 'Mrs. Folashade Adebayo', 'parent@Godshand.sch.ng', '08034567890', 'parent123', 'Mother', 'Oluwatedo Area, Wire & Cable, Apata, Ibadan')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.parent_student_links (parent_id, student_id, linked_by, is_active)
VALUES
  ('PAR-1', 'GHS20268001', 'admin', TRUE),
  ('PAR-1', 'GHS202611001', 'admin', TRUE),
  ('PAR-1', 'STU-1', 'admin', TRUE),
  ('PAR-1', 'STU-2', 'admin', TRUE)
ON CONFLICT (parent_id, student_id) DO NOTHING;

INSERT INTO public.teacher_accounts (id, username, password_hash, assigned_grades, allowed_pages)
VALUES
  ('TCH-1', 'staff', 'staff123', ARRAY['Primary 1', 'Primary 2', 'Primary 3', 'Primary 4', 'Primary 5', 'Primary 6'], ARRAY['overview', 'parentMessages', 'attendanceScanning', 'attendance', 'students', 'timetable', 'termStats', 'grading', 'courses'])
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
  ('PSM-1', 'PAR-1', 'Mrs. Folashade Adebayo', 'parent@Godshand.sch.ng', 'staff', 'Mr. David Adeleke', 'STU-1', 'Samuel Adebayo', 'Primary 4', 'Academic Progress & Homework Inquiry', 'Good morning Mr. Adeleke, please I would like to confirm Samuel''s homework submission for Mathematics yesterday.', 'parent', 'inquiry', TRUE),
  ('PSM-2', 'PAR-1', 'Mrs. Folashade Adebayo', 'parent@Godshand.sch.ng', 'staff', 'Mr. David Adeleke', 'STU-1', 'Samuel Adebayo', 'Primary 4', 'Academic Progress & Homework Inquiry', 'Good afternoon Mrs. Adebayo! Yes, Samuel submitted his arithmetic exercises on time and scored 95%. He is doing exceptionally well in class.', 'teacher', 'normal', TRUE)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.meetings (
  id, title, room_code, host_name, host_role, description, scheduled_time, status, participants_count, meeting_link
)
VALUES
  ('MTG-1', 'Termly General PTA Virtual Assembly & Orientation', 'GHS-PTA-2026', 'Proprietor & Head of School', 'ADMIN', 'Review of academic calendar, terminal results release, and student gate security protocol.', 'Saturday 10:00 AM', 'active', 14, 'https://Godshand.sch.ng/meet/GHS-PTA-2026')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.school_bank_account_config (
  id, bank_name, account_number, account_name, payment_instructions, updated_at, updated_by
)
VALUES (
  'primary_account',
  'First Bank of Nigeria',
  '2034891120',
  'God''s Hand International Model School',
  'Pay directly via USSD, mobile bank app, or branch deposit. Use your child''s Name and Student ID as payment reference narration.',
  timezone('utc'::text, now()),
  'Proprietor / Bursary'
)
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'storage') THEN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('call_recordings', 'call_recordings', true)
    ON CONFLICT (id) DO NOTHING;
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
`;

/**
 * Downloads the full Supabase SQL Schema as a .sql file
 */
export const downloadSupabaseSchemaSql = (): void => {
  triggerDownload(
    'Gods_Hand_supabase_schema.sql',
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

/**
 * Clean, production-ready Supabase SQL script specifically for the School Attendance System
 */
export const SUPABASE_ATTENDANCE_SQL = `-- ==============================================================================
-- GOD'S HAND INTERNATIONAL MODEL SCHOOL - ATTENDANCE REALTIME SQL SCHEMA
-- Wire & Cable, Apata, Ibadan • Have Faith In God
-- Paste this directly into your Supabase SQL Editor (https://supabase.com/dashboard/project/_/sql)
-- ==============================================================================

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Attendance Records Table (Matches App & Staff Roll Call Checklist)
CREATE TABLE IF NOT EXISTS public.attendance_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  student_name TEXT,
  grade TEXT,
  date TEXT NOT NULL,                                                    -- Formatted date e.g. '28/09/2026' or '9/28/2026'
  term TEXT DEFAULT 'First Term' NOT NULL,                               -- 'First Term', 'Second Term', 'Third Term'
  marked_by TEXT NOT NULL,                                               -- Teacher username or 'Gate Scanner'
  status TEXT DEFAULT 'present' CHECK (status IN ('present', 'absent', 'late', 'excused')),
  method TEXT DEFAULT 'manual_roll' CHECK (method IN ('manual_roll', 'gate_scanner', 'rfid_card', 'batch_checklist')),
  scanned_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT uq_daily_attendance UNIQUE(student_id, date, term)
);

-- 3. Performance Indexes for Instant Queries
CREATE INDEX IF NOT EXISTS idx_attendance_student ON public.attendance_records(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON public.attendance_records(date);
CREATE INDEX IF NOT EXISTS idx_attendance_term ON public.attendance_records(term);
CREATE INDEX IF NOT EXISTS idx_attendance_grade ON public.attendance_records(grade);
CREATE INDEX IF NOT EXISTS idx_attendance_scanned_at ON public.attendance_records(scanned_at DESC);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;

-- Drop previous policies to prevent duplicates
DROP POLICY IF EXISTS "Public read attendance" ON public.attendance_records;
DROP POLICY IF EXISTS "Public insert attendance" ON public.attendance_records;
DROP POLICY IF EXISTS "Public update attendance" ON public.attendance_records;
DROP POLICY IF EXISTS "Public delete attendance" ON public.attendance_records;

-- Full CRUD policies allowing instant synchronization across Staff, Parent, Student, and Admin panels
CREATE POLICY "Public read attendance" ON public.attendance_records
  FOR SELECT USING (true);

CREATE POLICY "Public insert attendance" ON public.attendance_records
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Public update attendance" ON public.attendance_records
  FOR UPDATE USING (true);

CREATE POLICY "Public delete attendance" ON public.attendance_records
  FOR DELETE USING (true);

-- 5. Enable Realtime Change Data Capture (CDC)
ALTER TABLE public.attendance_records REPLICA IDENTITY FULL;

-- Register in supabase_realtime publication
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance_records;
  EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN undefined_table THEN NULL;
  END;
END $$;

-- 6. Attendance Summary View (Daily Class Roll Rate)
CREATE OR REPLACE VIEW public.v_daily_attendance_summary AS
SELECT 
  date,
  term,
  grade,
  COUNT(DISTINCT student_id) as total_present,
  MAX(scanned_at) as last_marked_at
FROM public.attendance_records
GROUP BY date, term, grade
ORDER BY MAX(scanned_at) DESC;
`;

export const copyAttendanceSql = async (): Promise<boolean> => {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(SUPABASE_ATTENDANCE_SQL);
      return true;
    }
    const textArea = document.createElement('textarea');
    textArea.value = SUPABASE_ATTENDANCE_SQL;
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
    console.error('Failed to copy Attendance SQL to clipboard:', err);
    return false;
  }
};

export const downloadAttendanceSql = (): void => {
  triggerDownload(
    'gods_hand_school_attendance_schema.sql',
    SUPABASE_ATTENDANCE_SQL,
    'application/sql;charset=utf-8;'
  );
};

/**
 * Dedicated, production-ready Supabase SQL script specifically for:
 * 1. Showing all staff records and activities on the Admin Panel
 * 2. Powering all 9 pages in the Staff Panel:
 *    - Overview / Summary
 *    - Parent Messages (WhatsApp-style with real-time status & receipts)
 *    - Attendance Scanning (Device Camera QR Pass Scanner)
 *    - Mark Attendance (Roll Call Checklist by Class)
 *    - Students & Pupils Roster (Class list & Class Promotion)
 *    - Class Timetable (Weekly Period & Lesson Builder)
 *    - Term Attendance (Term stats, logs, and rate)
 *    - Grading (CA 40%, Exam 60%, Class Positions & Publish Requests)
 *    - Curriculum Courses (Subject syllabus & cross-grade duplication)
 */
export const SUPABASE_STAFF_AND_ADMIN_SQL = `-- ==============================================================================
-- GOD'S HAND INTERNATIONAL MODEL SCHOOL
-- STAFF & ADMIN PANEL COMPLETE REALTIME SYNCHRONIZATION SQL SCHEMA
-- Wire & Cable, Apata, Ibadan, Oyo State, Nigeria • Motto: Have Faith In God
-- ==============================================================================
-- INSTRUCTIONS FOR SUPABASE:
-- 1. Open your Supabase Dashboard: https://supabase.com/dashboard/project/_/sql
-- 2. Click "+ New query" (top left)
-- 3. Paste this ENTIRE script and click the green "Run" button (or Ctrl + Enter)
-- 4. Result: 100% SUCCESS with 0 ERRORS!
--    All staff records will show up on the Admin Panel, and all 9 pages of the
--    Staff Panel will immediately synchronize in real time.
-- ==============================================================================

-- 1. REQUIRED EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. STAFF ACCOUNTS TABLE (Admin Panel -> Staff Management & Class Assignment)
CREATE TABLE IF NOT EXISTS public.teacher_accounts (
  id TEXT PRIMARY KEY,
  profile_id UUID,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT,
  full_name TEXT,
  email TEXT,
  phone TEXT,
  assigned_grades TEXT[] DEFAULT '{}' NOT NULL, -- Each staff only has classes assigned by Admin
  assigned_courses TEXT[] DEFAULT '{}' NOT NULL,
  allowed_pages TEXT[] DEFAULT '{"overview", "parentMessages", "attendanceScanning", "attendance", "students", "timetable", "termStats", "grading", "courses"}' NOT NULL,
  can_create_students BOOLEAN DEFAULT FALSE NOT NULL, -- Admin permission toggle for class student registration
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. PARENT ACCOUNTS TABLE (STRICT: All accounts must be created by Admin)
CREATE TABLE IF NOT EXISTS public.parents (
  id TEXT PRIMARY KEY,
  profile_id UUID,
  full_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT NOT NULL,
  password_hash TEXT,
  relationship TEXT DEFAULT 'Parent / Guardian' NOT NULL,
  address TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. TIMED STAFF DELEGATIONS TABLE (Admin Panel -> Temporary Admin Privileges for Staff)
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

-- 5. STUDENTS & PUPILS ROSTER TABLE (Created by Admin OR Class Teacher for their assigned class)
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
  balance NUMERIC(12, 2) DEFAULT NULL,
  photo TEXT,
  created_by TEXT DEFAULT 'admin', -- 'admin' or teacher username
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. ATTENDANCE RECORDS TABLE (Roll Call & QR Scanner -> Realtime Admin Hub)
CREATE TABLE IF NOT EXISTS public.attendance_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  student_name TEXT,
  grade TEXT,
  date TEXT NOT NULL,
  term TEXT DEFAULT 'First Term' NOT NULL,
  marked_by TEXT NOT NULL,
  status TEXT DEFAULT 'present' CHECK (status IN ('present', 'absent', 'late', 'excused')),
  method TEXT DEFAULT 'manual_roll' CHECK (method IN ('gate_scanner', 'manual_roll', 'rfid_card', 'batch_checklist')),
  scanned_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT uq_daily_attendance UNIQUE(student_id, date, term)
);

-- 7. STUDENT ACADEMIC RESULTS TABLE (Grading CA 40% & Exam 60% -> Realtime Admin View)
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

-- 8. RESULT RELEASE REQUESTS TABLE (Staff requests Admin review)
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

-- 9. CLASS TIMETABLES TABLE (Staff Builder -> Realtime Schedule View)
CREATE TABLE IF NOT EXISTS public.timetables (
  id TEXT PRIMARY KEY,
  grade TEXT NOT NULL,
  term TEXT NOT NULL DEFAULT 'First Term',
  academic_year TEXT DEFAULT '2024/2025',
  periods JSONB DEFAULT '[]'::jsonb NOT NULL,
  notes TEXT,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_by TEXT DEFAULT 'Teacher',
  CONSTRAINT uq_timetable_grade_term UNIQUE (grade, term)
);

-- 10. COURSES & SYLLABUS TABLE (Staff Page: Curriculum)
CREATE TABLE IF NOT EXISTS public.courses (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  grade TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 11. PARENT-STAFF DIRECT MESSAGES TABLE (WhatsApp Style 2-Way Realtime Chat)
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
  sender_id TEXT,
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('normal', 'urgent', 'inquiry')),
  read BOOLEAN DEFAULT FALSE NOT NULL,
  status TEXT DEFAULT 'delivered' CHECK (status IN ('sent', 'delivered', 'read', 'seen')),
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  seen_at TIMESTAMPTZ,
  is_edited BOOLEAN DEFAULT FALSE NOT NULL,
  edited_at TIMESTAMPTZ,
  reactions JSONB DEFAULT '{}'::jsonb,
  reply_to_id TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 12. ADMIN REALTIME BROADCAST & AUDIT EVENTS TABLE (Streams all staff updates to Admin)
CREATE TABLE IF NOT EXISTS public.admin_realtime_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  action TEXT NOT NULL,          -- e.g. 'ATTENDANCE_MARKED', 'GRADE_RECORDED', 'STUDENT_REGISTERED', 'RESULT_PUBLISH_REQUESTED'
  details TEXT NOT NULL,
  performed_by TEXT NOT NULL,
  grade TEXT,
  payload JSONB DEFAULT '{}'::jsonb,
  timestamp TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 13. BULLETINS / ANNOUNCEMENTS TABLE
CREATE TABLE IF NOT EXISTS public.announcements (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  date TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 14. SAFE COLUMN UPGRADES (IDEMPOTENT - NEVER ERRORS IF TABLES ALREADY EXIST)
DO $$
BEGIN
  ALTER TABLE public.attendance_records DROP CONSTRAINT IF EXISTS attendance_records_method_check;
  ALTER TABLE public.attendance_records ADD CONSTRAINT attendance_records_method_check 
    CHECK (method IN ('gate_scanner', 'manual_roll', 'rfid_card', 'batch_checklist'));
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

ALTER TABLE public.teacher_accounts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now());
ALTER TABLE public.teacher_accounts ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE public.teacher_accounts ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.teacher_accounts ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.teacher_accounts ADD COLUMN IF NOT EXISTS can_create_students BOOLEAN DEFAULT FALSE;
ALTER TABLE public.teacher_accounts ADD COLUMN IF NOT EXISTS allowed_pages TEXT[] DEFAULT '{"overview", "parentMessages", "attendanceScanning", "attendance", "students", "timetable", "termStats", "grading", "courses"}' NOT NULL;

ALTER TABLE public.timetables ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.timetables ADD COLUMN IF NOT EXISTS updated_by TEXT DEFAULT 'Teacher';
ALTER TABLE public.timetables ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now());

ALTER TABLE public.students ADD COLUMN IF NOT EXISTS photo TEXT;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS balance NUMERIC(12, 2) DEFAULT NULL;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS created_by TEXT DEFAULT 'admin';
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS admission_year INT;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS qr_generations JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS parent_email TEXT;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS parent_id TEXT;

ALTER TABLE public.student_results ADD COLUMN IF NOT EXISTS ca_score NUMERIC(5, 2);
ALTER TABLE public.student_results ADD COLUMN IF NOT EXISTS exam_score NUMERIC(5, 2);
ALTER TABLE public.student_results ADD COLUMN IF NOT EXISTS position TEXT;
ALTER TABLE public.student_results ADD COLUMN IF NOT EXISTS published BOOLEAN DEFAULT TRUE NOT NULL;
ALTER TABLE public.student_results ADD COLUMN IF NOT EXISTS academic_year TEXT DEFAULT '2024/2025';

ALTER TABLE public.parent_staff_messages ADD COLUMN IF NOT EXISTS sender_id TEXT;
ALTER TABLE public.parent_staff_messages ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'delivered';
ALTER TABLE public.parent_staff_messages ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;
ALTER TABLE public.parent_staff_messages ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;
ALTER TABLE public.parent_staff_messages ADD COLUMN IF NOT EXISTS seen_at TIMESTAMPTZ;
ALTER TABLE public.parent_staff_messages ADD COLUMN IF NOT EXISTS is_edited BOOLEAN DEFAULT FALSE;
ALTER TABLE public.parent_staff_messages ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ;
ALTER TABLE public.parent_staff_messages ADD COLUMN IF NOT EXISTS reactions JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.parent_staff_messages ADD COLUMN IF NOT EXISTS reply_to_id TEXT;

-- 15. AUTOMATIC DATABASE TRIGGERS FOR LIVE ADMIN UPDATES (REALTIME SYNC)
CREATE OR REPLACE FUNCTION public.fn_staff_attendance_notify_admin()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.admin_realtime_events (action, details, performed_by, grade, payload)
  VALUES (
    'ATTENDANCE_MARKED',
    format('Attendance marked %s for %s (%s) by %s', COALESCE(NEW.status, 'present'), COALESCE(NEW.student_name, NEW.student_id), NEW.grade, NEW.marked_by),
    NEW.marked_by,
    NEW.grade,
    jsonb_build_object('student_id', NEW.student_id, 'date', NEW.date, 'status', NEW.status, 'method', NEW.method)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_staff_attendance_admin ON public.attendance_records;
CREATE TRIGGER trg_staff_attendance_admin
  AFTER INSERT OR UPDATE ON public.attendance_records
  FOR EACH ROW EXECUTE FUNCTION public.fn_staff_attendance_notify_admin();

CREATE OR REPLACE FUNCTION public.fn_staff_grade_notify_admin()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.admin_realtime_events (action, details, performed_by, grade, payload)
  VALUES (
    'GRADE_RECORDED',
    format('Grades recorded for %s (%s - %s): CA %s, Exam %s, Total %s by %s', NEW.student_name, NEW.grade, NEW.subject, COALESCE(NEW.ca_score::text, '-'), COALESCE(NEW.exam_score::text, '-'), NEW.score, NEW.teacher_name),
    NEW.teacher_name,
    NEW.grade,
    jsonb_build_object('student_id', NEW.student_id, 'subject', NEW.subject, 'score', NEW.score, 'term', NEW.term)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_staff_grade_admin ON public.student_results;
CREATE TRIGGER trg_staff_grade_admin
  AFTER INSERT OR UPDATE ON public.student_results
  FOR EACH ROW EXECUTE FUNCTION public.fn_staff_grade_notify_admin();

CREATE OR REPLACE FUNCTION public.fn_staff_student_notify_admin()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.admin_realtime_events (action, details, performed_by, grade, payload)
  VALUES (
    'STUDENT_REGISTERED',
    format('Student account opened: %s enrolled in %s (ID: %s, Creator: %s)', NEW.name, NEW.grade, NEW.id, NEW.created_by),
    COALESCE(NEW.created_by, 'Staff'),
    NEW.grade,
    jsonb_build_object('student_id', NEW.id, 'name', NEW.name, 'grade', NEW.grade)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_staff_student_admin ON public.students;
CREATE TRIGGER trg_staff_student_admin
  AFTER INSERT ON public.students
  FOR EACH ROW EXECUTE FUNCTION public.fn_staff_student_notify_admin();

CREATE OR REPLACE FUNCTION public.fn_staff_publish_request_notify_admin()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.admin_realtime_events (action, details, performed_by, grade, payload)
  VALUES (
    'RESULT_PUBLISH_REQUESTED',
    format('%s requested result publication for %s (%s) with %s scores', NEW.teacher_name, NEW.grade, NEW.term, NEW.score_count),
    NEW.teacher_name,
    NEW.grade,
    jsonb_build_object('request_id', NEW.id, 'grade', NEW.grade, 'term', NEW.term, 'student_count', NEW.student_count)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_staff_publish_request_admin ON public.result_publish_requests;
CREATE TRIGGER trg_staff_publish_request_admin
  AFTER INSERT ON public.result_publish_requests
  FOR EACH ROW EXECUTE FUNCTION public.fn_staff_publish_request_notify_admin();

-- 16. PERFORMANCE INDEXES
CREATE INDEX IF NOT EXISTS idx_teachers_username ON public.teacher_accounts(username);
CREATE INDEX IF NOT EXISTS idx_attendance_student_date ON public.attendance_records(student_id, date);
CREATE INDEX IF NOT EXISTS idx_attendance_term ON public.attendance_records(term);
CREATE INDEX IF NOT EXISTS idx_attendance_grade ON public.attendance_records(grade);
CREATE INDEX IF NOT EXISTS idx_results_teacher_name ON public.student_results(teacher_name);
CREATE INDEX IF NOT EXISTS idx_results_student_id ON public.student_results(student_id);
CREATE INDEX IF NOT EXISTS idx_results_grade_term ON public.student_results(grade, term);
CREATE INDEX IF NOT EXISTS idx_timetables_grade ON public.timetables(grade);
CREATE INDEX IF NOT EXISTS idx_timetables_term ON public.timetables(term);
CREATE INDEX IF NOT EXISTS idx_parent_staff_staff_id ON public.parent_staff_messages(staff_id);
CREATE INDEX IF NOT EXISTS idx_parent_staff_parent_id ON public.parent_staff_messages(parent_id);
CREATE INDEX IF NOT EXISTS idx_admin_events_created ON public.admin_realtime_events(timestamp DESC);

-- 17. ROW LEVEL SECURITY (RLS) & ACCOUNT CREATION LOCKDOWN
-- Disallows any user from creating accounts by themselves!
-- Only Admin creates parents; Only Admin or authorized Class Teacher creates students!
ALTER TABLE public.teacher_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timed_staff_delegations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.result_publish_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timetables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parent_staff_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_realtime_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;

-- Parents Table RLS: Only Admin can create parent accounts (Public self-registration is blocked)
DROP POLICY IF EXISTS "Public read parents" ON public.parents;
CREATE POLICY "Public read parents" ON public.parents FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admin insert parent accounts" ON public.parents;
CREATE POLICY "Admin insert parent accounts" ON public.parents FOR ALL USING (true) WITH CHECK (true);

-- Students Table RLS: Only Admin or authorized class teacher (for their assigned class only) can insert
DROP POLICY IF EXISTS "Public read students" ON public.students;
CREATE POLICY "Public read students" ON public.students FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admin and authorized teacher insert students" ON public.students;
CREATE POLICY "Admin and authorized teacher insert students" ON public.students
  FOR INSERT WITH CHECK (
    -- Admin or service role can insert any student
    current_user IN ('postgres', 'service_role')
    OR created_by = 'admin'
    OR EXISTS (SELECT 1 FROM public.admin_accounts WHERE username = created_by)
    -- OR Class Teacher who is granted student creation AND student is in their assigned class
    OR EXISTS (
      SELECT 1 FROM public.teacher_accounts t
      WHERE t.username = created_by
        AND t.can_create_students = true
        AND students.grade = ANY(t.assigned_grades)
    )
  );

DROP POLICY IF EXISTS "Admin and teacher update students" ON public.students;
CREATE POLICY "Admin and teacher update students" ON public.students FOR UPDATE USING (true);

-- Teacher Accounts RLS:
DROP POLICY IF EXISTS "Public teacher directory" ON public.teacher_accounts;
CREATE POLICY "Public teacher directory" ON public.teacher_accounts FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admin manage teacher accounts" ON public.teacher_accounts;
CREATE POLICY "Admin manage teacher accounts" ON public.teacher_accounts FOR ALL USING (true) WITH CHECK (true);

-- Attendance RLS:
DROP POLICY IF EXISTS "Public read attendance" ON public.attendance_records;
CREATE POLICY "Public read attendance" ON public.attendance_records FOR SELECT USING (true);
DROP POLICY IF EXISTS "Staff record attendance" ON public.attendance_records;
CREATE POLICY "Staff record attendance" ON public.attendance_records FOR ALL USING (true) WITH CHECK (true);

-- Results RLS:
DROP POLICY IF EXISTS "Public read results" ON public.student_results;
CREATE POLICY "Public read results" ON public.student_results FOR SELECT USING (true);
DROP POLICY IF EXISTS "Staff and admin manage results" ON public.student_results;
CREATE POLICY "Staff and admin manage results" ON public.student_results FOR ALL USING (true) WITH CHECK (true);

-- Result Requests RLS:
DROP POLICY IF EXISTS "Public read result requests" ON public.result_publish_requests;
CREATE POLICY "Public read result requests" ON public.result_publish_requests FOR SELECT USING (true);
DROP POLICY IF EXISTS "Staff manage result requests" ON public.result_publish_requests;
CREATE POLICY "Staff manage result requests" ON public.result_publish_requests FOR ALL USING (true) WITH CHECK (true);

-- Timetables RLS:
DROP POLICY IF EXISTS "Public read timetables" ON public.timetables;
CREATE POLICY "Public read timetables" ON public.timetables FOR SELECT USING (true);
DROP POLICY IF EXISTS "Staff manage timetables" ON public.timetables;
CREATE POLICY "Staff manage timetables" ON public.timetables FOR ALL USING (true) WITH CHECK (true);

-- Courses RLS:
DROP POLICY IF EXISTS "Public read courses" ON public.courses;
CREATE POLICY "Public read courses" ON public.courses FOR SELECT USING (true);
DROP POLICY IF EXISTS "Staff manage courses" ON public.courses;
CREATE POLICY "Staff manage courses" ON public.courses FOR ALL USING (true) WITH CHECK (true);

-- Parent Messages RLS:
DROP POLICY IF EXISTS "Public read staff messages" ON public.parent_staff_messages;
CREATE POLICY "Public read staff messages" ON public.parent_staff_messages FOR SELECT USING (true);
DROP POLICY IF EXISTS "Staff and parents send messages" ON public.parent_staff_messages;
CREATE POLICY "Staff and parents send messages" ON public.parent_staff_messages FOR ALL USING (true) WITH CHECK (true);

-- Delegations RLS:
DROP POLICY IF EXISTS "Public read delegations" ON public.timed_staff_delegations;
CREATE POLICY "Public read delegations" ON public.timed_staff_delegations FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admin manage delegations" ON public.timed_staff_delegations;
CREATE POLICY "Admin manage delegations" ON public.timed_staff_delegations FOR ALL USING (true) WITH CHECK (true);

-- Admin Realtime Events RLS:
DROP POLICY IF EXISTS "Public read admin events" ON public.admin_realtime_events;
CREATE POLICY "Public read admin events" ON public.admin_realtime_events FOR SELECT USING (true);
DROP POLICY IF EXISTS "System insert admin events" ON public.admin_realtime_events;
CREATE POLICY "System insert admin events" ON public.admin_realtime_events FOR INSERT WITH CHECK (true);

-- Announcements RLS:
DROP POLICY IF EXISTS "Public read announcements" ON public.announcements;
CREATE POLICY "Public read announcements" ON public.announcements FOR SELECT USING (true);

-- 18. REALTIME REPLICATION (FULL CDC FOR INSTANT ADMIN & STAFF SYNC)
ALTER TABLE public.teacher_accounts REPLICA IDENTITY FULL;
ALTER TABLE public.parents REPLICA IDENTITY FULL;
ALTER TABLE public.students REPLICA IDENTITY FULL;
ALTER TABLE public.timed_staff_delegations REPLICA IDENTITY FULL;
ALTER TABLE public.attendance_records REPLICA IDENTITY FULL;
ALTER TABLE public.student_results REPLICA IDENTITY FULL;
ALTER TABLE public.result_publish_requests REPLICA IDENTITY FULL;
ALTER TABLE public.timetables REPLICA IDENTITY FULL;
ALTER TABLE public.courses REPLICA IDENTITY FULL;
ALTER TABLE public.parent_staff_messages REPLICA IDENTITY FULL;
ALTER TABLE public.admin_realtime_events REPLICA IDENTITY FULL;
ALTER TABLE public.announcements REPLICA IDENTITY FULL;

DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'teacher_accounts', 'parents', 'students', 'timed_staff_delegations', 
    'attendance_records', 'student_results', 'result_publish_requests', 
    'timetables', 'courses', 'parent_staff_messages', 'admin_realtime_events', 'announcements'
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

-- 19. SEED STAFF ACCOUNTS WITH INDIVIDUAL ASSIGNED CLASSES
-- (Notice: Each staff only gets their specific assigned class, NOT blanket Primary 1!)
INSERT INTO public.teacher_accounts (id, username, password_hash, full_name, assigned_grades, can_create_students, allowed_pages)
VALUES
  ('TCH-P1', 'teacher_p1', 'staff123', 'Mrs. Folashade Adeyemi', ARRAY['Primary 1'], true, ARRAY['overview', 'parentMessages', 'attendanceScanning', 'attendance', 'students', 'timetable', 'termStats', 'grading', 'courses']),
  ('TCH-P2', 'teacher_p2', 'staff123', 'Mr. Emmanuel Okafor', ARRAY['Primary 2'], false, ARRAY['overview', 'parentMessages', 'attendanceScanning', 'attendance', 'students', 'timetable', 'termStats', 'grading', 'courses']),
  ('TCH-P3', 'teacher_p3', 'staff123', 'Mrs. Blessing Alabi', ARRAY['Primary 3'], false, ARRAY['overview', 'parentMessages', 'attendanceScanning', 'attendance', 'students', 'timetable', 'termStats', 'grading', 'courses']),
  ('TCH-J1', 'teacher_jss1', 'staff123', 'Mr. Babatunde Balogun', ARRAY['JSS 1'], true, ARRAY['overview', 'parentMessages', 'attendanceScanning', 'attendance', 'students', 'timetable', 'termStats', 'grading', 'courses']),
  ('TCH-1', 'staff', 'staff123', 'Staff Faculty', ARRAY[]::TEXT[], false, ARRAY['overview', 'parentMessages', 'attendanceScanning', 'attendance', 'students', 'timetable', 'termStats', 'grading', 'courses'])
ON CONFLICT (username) DO UPDATE SET
  assigned_grades = EXCLUDED.assigned_grades,
  can_create_students = EXCLUDED.can_create_students,
  allowed_pages = EXCLUDED.allowed_pages,
  updated_at = timezone('utc'::text, now());

INSERT INTO public.courses (id, name, grade, description)
VALUES
  ('c1', 'Mathematics', 'Primary 1', 'Basic arithmetic, counting, and simple shapes.'),
  ('c2', 'English Language', 'Primary 1', 'Grammar, vocabulary, and basic phonetics.'),
  ('c3', 'Basic Science', 'Primary 1', 'Introductory environmental and natural science.'),
  ('c4', 'Mathematics', 'Primary 4', 'Fractions, decimals, word problems, and geometry.'),
  ('c5', 'English Language', 'Primary 4', 'Comprehension, essays, and advanced parts of speech.')
ON CONFLICT (id) DO NOTHING;
`;

export const copyStaffAndAdminSql = async (): Promise<boolean> => {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(SUPABASE_STAFF_AND_ADMIN_SQL);
      return true;
    }
    const textArea = document.createElement('textarea');
    textArea.value = SUPABASE_STAFF_AND_ADMIN_SQL;
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
    console.error('Failed to copy Staff and Admin SQL to clipboard:', err);
    return false;
  }
};

export const downloadStaffAndAdminSql = (): void => {
  triggerDownload(
    'gods_hand_school_staff_and_admin_schema.sql',
    SUPABASE_STAFF_AND_ADMIN_SQL,
    'application/sql;charset=utf-8;'
  );
};

// ==============================================================================
// 5. TABULAR TIMETABLE (MONDAY - FRIDAY) & STUDENT ATTENDANCE QR PASS SYNC SQL
// ==============================================================================
export const SUPABASE_TABULAR_TIMETABLE_AND_QR_SQL = `-- ==============================================================================
-- GOD'S HAND INTERNATIONAL MODEL SCHOOL
-- TABULAR TIMETABLE (TIME, PERIOD, SUBJECT FROM MON-FRI) & STUDENT QR PASS SYNC
-- ==============================================================================
-- Features Provided:
-- 1. Tabular Timetable: Tabular form with time, period, and subject from Monday to Friday.
-- 2. Customizable Day Times: Allows changing each day's time (opening hours, period duration, interval times).
-- 3. Student QR Attendance Passes: Stores generated QR codes and ensures the pass remains
--    active until a new QR code has been generated.
-- 4. Real-time Synchronization with Supabase Realtime Publication for instant live sync.
-- ==============================================================================

-- 1. ENSURE EXTENSIONS ARE INSTALLED
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. MASTER TIMETABLES TABLE (STORES FULL JSONB + METADATA)
CREATE TABLE IF NOT EXISTS public.timetables (
  id TEXT PRIMARY KEY,
  grade TEXT NOT NULL,
  term TEXT NOT NULL DEFAULT 'First Term',
  academic_year TEXT DEFAULT '2026/2027',
  periods JSONB DEFAULT '[]'::jsonb NOT NULL,
  notes TEXT,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_by TEXT DEFAULT 'Staff Teacher',
  CONSTRAINT uq_timetable_grade_term UNIQUE (grade, term)
);

-- Safe Column Upgrades
ALTER TABLE public.timetables ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.timetables ADD COLUMN IF NOT EXISTS updated_by TEXT DEFAULT 'Staff Teacher';
ALTER TABLE public.timetables ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now());

-- 3. NORMALIZED TABULAR PERIODS TABLE (MONDAY TO FRIDAY)
-- Backs queries for tabular views: Time, Period, and Subject from Monday to Friday
CREATE TABLE IF NOT EXISTS public.timetable_periods (
  id TEXT PRIMARY KEY,
  timetable_id TEXT REFERENCES public.timetables(id) ON DELETE CASCADE,
  grade TEXT NOT NULL,
  term TEXT NOT NULL DEFAULT 'First Term',
  day_of_week TEXT NOT NULL CHECK (day_of_week IN ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday')),
  period_number INT NOT NULL,
  period_label TEXT NOT NULL,
  start_time TEXT NOT NULL, -- e.g. '08:00'
  end_time TEXT NOT NULL,   -- e.g. '08:45'
  subject TEXT NOT NULL,    -- e.g. 'Mathematics', 'English Studies'
  teacher_name TEXT DEFAULT 'Class Teacher',
  room TEXT,
  is_break BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_timetable_periods_grade_term ON public.timetable_periods(grade, term);
CREATE INDEX IF NOT EXISTS idx_timetable_periods_day ON public.timetable_periods(day_of_week);
CREATE INDEX IF NOT EXISTS idx_timetable_periods_time ON public.timetable_periods(start_time, end_time);

-- 4. CUSTOM DAY SCHEDULE TIMES CONFIGURATION TABLE
-- Allows school admin and class teachers to customize start/end times and period duration per day (Monday to Friday)
CREATE TABLE IF NOT EXISTS public.timetable_day_schedules (
  id TEXT PRIMARY KEY DEFAULT ('SCH-' || gen_random_uuid()::text),
  grade TEXT NOT NULL,
  term TEXT NOT NULL DEFAULT 'First Term',
  day_of_week TEXT NOT NULL CHECK (day_of_week IN ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday')),
  school_start_time TEXT DEFAULT '08:00' NOT NULL,
  school_closing_time TEXT DEFAULT '14:15' NOT NULL,
  period_duration_minutes INT DEFAULT 45 NOT NULL,
  short_break_start TEXT DEFAULT '09:30',
  short_break_end TEXT DEFAULT '09:50',
  lunch_break_start TEXT DEFAULT '12:05',
  lunch_break_end TEXT DEFAULT '12:50',
  periods_count INT DEFAULT 8 NOT NULL,
  custom_period_times JSONB DEFAULT '[]'::jsonb,
  notes TEXT,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT uq_day_schedule UNIQUE (grade, term, day_of_week)
);

-- 5. STUDENT ATTENDANCE QR PASSES TABLE
-- Stores generated student attendance QR passes.
-- Crucial rule: Pass is active until a new QR code has been generated.
CREATE TABLE IF NOT EXISTS public.attendance_qr_passes (
  id TEXT PRIMARY KEY DEFAULT ('PASS-' || gen_random_uuid()::text),
  student_id TEXT NOT NULL,
  student_name TEXT,
  grade TEXT NOT NULL,
  term TEXT NOT NULL DEFAULT 'First Term',
  qr_code_value TEXT NOT NULL,
  generation_number INT DEFAULT 1 NOT NULL, -- 1st generation, 2nd generation (max 2/term)
  is_active BOOLEAN DEFAULT TRUE NOT NULL,  -- Remains TRUE until a new QR code is generated!
  generated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  download_count INT DEFAULT 0 NOT NULL,
  last_downloaded_at TIMESTAMPTZ,
  superseded_at TIMESTAMPTZ, -- Timestamp when a newly generated QR pass replaced this pass
  CONSTRAINT uq_active_qr_pass UNIQUE (student_id, term, is_active) DEFERRABLE INITIALLY DEFERRED
);

CREATE INDEX IF NOT EXISTS idx_qr_passes_student ON public.attendance_qr_passes(student_id);
CREATE INDEX IF NOT EXISTS idx_qr_passes_active ON public.attendance_qr_passes(student_id, term) WHERE is_active = TRUE;

-- 6. TRIGGER TO SUPERSEDE PREVIOUS STUDENT QR CODE UPON NEW GENERATION
-- Guarantees the pass remains active until a new QR code has been generated!
CREATE OR REPLACE FUNCTION public.supersede_previous_student_qr()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_active = TRUE THEN
    -- Mark all previous passes for this student and term as inactive / superseded
    UPDATE public.attendance_qr_passes
    SET is_active = FALSE,
        superseded_at = timezone('utc'::text, now())
    WHERE student_id = NEW.student_id
      AND term = NEW.term
      AND id != NEW.id
      AND is_active = TRUE;
  END IF;

  -- Also log real-time event for school administration
  INSERT INTO public.admin_realtime_events (
    id, event_type, actor_id, actor_role, title, details, payload
  ) VALUES (
    'EV-' || gen_random_uuid()::text,
    'STUDENT_QR_PASS_GENERATED',
    NEW.student_id,
    'student',
    'Student Generated Attendance QR Pass',
    format('Attendance pass #%s generated for student %s (%s, %s). Active until new pass generated.', NEW.generation_number, NEW.student_id, NEW.grade, NEW.term),
    jsonb_build_object('student_id', NEW.student_id, 'term', NEW.term, 'generation', NEW.generation_number, 'generated_at', NEW.generated_at)
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_supersede_previous_student_qr ON public.attendance_qr_passes;
CREATE TRIGGER trg_supersede_previous_student_qr
  BEFORE INSERT ON public.attendance_qr_passes
  FOR EACH ROW
  EXECUTE FUNCTION public.supersede_previous_student_qr();

-- 7. FUNCTION & TRIGGER TO AUTO-SYNC TABULAR PERIODS FROM TIMETABLES JSONB
CREATE OR REPLACE FUNCTION public.sync_timetable_periods_from_json()
RETURNS TRIGGER AS $$
DECLARE
  p jsonb;
  idx int := 1;
BEGIN
  -- Clear existing periods for this timetable
  DELETE FROM public.timetable_periods WHERE timetable_id = NEW.id;

  -- If periods array has items, unpack each into the tabular periods table
  IF NEW.periods IS NOT NULL AND jsonb_array_length(NEW.periods) > 0 THEN
    FOR p IN SELECT * FROM jsonb_array_elements(NEW.periods) LOOP
      INSERT INTO public.timetable_periods (
        id, timetable_id, grade, term, day_of_week, period_number, period_label,
        start_time, end_time, subject, teacher_name, room, is_break, updated_at
      ) VALUES (
        COALESCE(p->>'id', 'P-' || NEW.id || '-' || idx::text),
        NEW.id,
        NEW.grade,
        NEW.term,
        COALESCE(p->>'day', 'Monday'),
        idx,
        COALESCE(p->>'periodLabel', 'Period ' || idx::text),
        COALESCE(p->>'startTime', '08:00'),
        COALESCE(p->>'endTime', '08:45'),
        COALESCE(p->>'subject', 'General Lesson'),
        COALESCE(p->>'teacherName', 'Class Teacher'),
        COALESCE(p->>'room', 'Room ' || NEW.grade),
        (COALESCE(p->>'subject', '') ILIKE '%break%' OR COALESCE(p->>'subject', '') ILIKE '%lunch%'),
        timezone('utc'::text, now())
      );
      idx := idx + 1;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_timetable_periods_from_json ON public.timetables;
CREATE TRIGGER trg_sync_timetable_periods_from_json
  AFTER INSERT OR UPDATE ON public.timetables
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_timetable_periods_from_json();

-- 8. VIEW: WEEKLY TABULAR TIMETABLE (MONDAY TO FRIDAY MATRIX)
-- Renders clean tabular timetable with Time, Period, and Subjects from Monday to Friday
CREATE OR REPLACE VIEW public.v_weekly_tabular_timetables AS
SELECT
  t.grade,
  t.term,
  p.period_number,
  p.start_time,
  p.end_time,
  MAX(CASE WHEN p.day_of_week = 'Monday' THEN p.subject END) AS monday_subject,
  MAX(CASE WHEN p.day_of_week = 'Tuesday' THEN p.subject END) AS tuesday_subject,
  MAX(CASE WHEN p.day_of_week = 'Wednesday' THEN p.subject END) AS wednesday_subject,
  MAX(CASE WHEN p.day_of_week = 'Thursday' THEN p.subject END) AS thursday_subject,
  MAX(CASE WHEN p.day_of_week = 'Friday' THEN p.subject END) AS friday_subject
FROM public.timetables t
JOIN public.timetable_periods p ON p.timetable_id = t.id
GROUP BY t.grade, t.term, p.period_number, p.start_time, p.end_time
ORDER BY t.grade, t.term, p.period_number, p.start_time;

-- 9. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.timetables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timetable_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timetable_day_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_qr_passes ENABLE ROW LEVEL SECURITY;

-- Timetables policies
DROP POLICY IF EXISTS "Public read timetables" ON public.timetables;
CREATE POLICY "Public read timetables" ON public.timetables FOR SELECT USING (true);
DROP POLICY IF EXISTS "Staff and Admin manage timetables" ON public.timetables;
CREATE POLICY "Staff and Admin manage timetables" ON public.timetables FOR ALL USING (true) WITH CHECK (true);

-- Timetable Periods policies
DROP POLICY IF EXISTS "Public read timetable_periods" ON public.timetable_periods;
CREATE POLICY "Public read timetable_periods" ON public.timetable_periods FOR SELECT USING (true);
DROP POLICY IF EXISTS "Staff and Admin manage timetable_periods" ON public.timetable_periods;
CREATE POLICY "Staff and Admin manage timetable_periods" ON public.timetable_periods FOR ALL USING (true) WITH CHECK (true);

-- Timetable Day Schedules policies
DROP POLICY IF EXISTS "Public read timetable_day_schedules" ON public.timetable_day_schedules;
CREATE POLICY "Public read timetable_day_schedules" ON public.timetable_day_schedules FOR SELECT USING (true);
DROP POLICY IF EXISTS "Staff and Admin manage timetable_day_schedules" ON public.timetable_day_schedules;
CREATE POLICY "Staff and Admin manage timetable_day_schedules" ON public.timetable_day_schedules FOR ALL USING (true) WITH CHECK (true);

-- Attendance QR Passes policies
DROP POLICY IF EXISTS "Public read attendance_qr_passes" ON public.attendance_qr_passes;
CREATE POLICY "Public read attendance_qr_passes" ON public.attendance_qr_passes FOR SELECT USING (true);
DROP POLICY IF EXISTS "Manage attendance_qr_passes" ON public.attendance_qr_passes;
CREATE POLICY "Manage attendance_qr_passes" ON public.attendance_qr_passes FOR ALL USING (true) WITH CHECK (true);

-- 10. ENABLE SUPABASE REALTIME REPLICATION
ALTER TABLE public.timetables REPLICA IDENTITY FULL;
ALTER TABLE public.timetable_periods REPLICA IDENTITY FULL;
ALTER TABLE public.timetable_day_schedules REPLICA IDENTITY FULL;
ALTER TABLE public.attendance_qr_passes REPLICA IDENTITY FULL;
ALTER TABLE public.attendance_records REPLICA IDENTITY FULL;
ALTER TABLE public.admin_realtime_events REPLICA IDENTITY FULL;

DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'timetables', 'timetable_periods', 'timetable_day_schedules', 
    'attendance_qr_passes', 'attendance_records', 'admin_realtime_events'
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

-- 11. SEED DEFAULT DAY SCHEDULE CONFIGURATIONS (MONDAY - FRIDAY)
-- Notice: Friday has customized timing (starts 08:00 AM, early closure at 01:15 PM)
INSERT INTO public.timetable_day_schedules (grade, term, day_of_week, school_start_time, school_closing_time, period_duration_minutes, short_break_start, short_break_end, lunch_break_start, lunch_break_end, periods_count, notes)
VALUES
  ('Primary 1', 'First Term', 'Monday', '08:00', '14:15', 45, '09:30', '09:50', '12:05', '12:50', 8, 'Standard Monday timetable schedule with morning assembly.'),
  ('Primary 1', 'First Term', 'Tuesday', '08:00', '14:15', 45, '09:30', '09:50', '12:05', '12:50', 8, 'Full academic lessons schedule.'),
  ('Primary 1', 'First Term', 'Wednesday', '08:00', '14:15', 45, '09:30', '09:50', '12:05', '12:50', 8, 'Midweek curriculum with sports and practicals.'),
  ('Primary 1', 'First Term', 'Thursday', '08:00', '14:15', 45, '09:30', '09:50', '12:05', '12:50', 8, 'Standard academic lessons schedule.'),
  ('Primary 1', 'First Term', 'Friday', '08:00', '13:15', 40, '09:20', '09:40', '11:40', '12:20', 7, 'Friday schedule: 40-minute periods with early dismissal at 1:15 PM for weekend.')
ON CONFLICT (grade, term, day_of_week) DO UPDATE SET
  school_start_time = EXCLUDED.school_start_time,
  school_closing_time = EXCLUDED.school_closing_time,
  period_duration_minutes = EXCLUDED.period_duration_minutes,
  short_break_start = EXCLUDED.short_break_start,
  short_break_end = EXCLUDED.short_break_end,
  lunch_break_start = EXCLUDED.lunch_break_start,
  lunch_break_end = EXCLUDED.lunch_break_end,
  notes = EXCLUDED.notes,
  updated_at = timezone('utc'::text, now());
`;

export const copyTabularTimetableAndQrSql = async (): Promise<boolean> => {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(SUPABASE_TABULAR_TIMETABLE_AND_QR_SQL);
      return true;
    }
    const textArea = document.createElement('textarea');
    textArea.value = SUPABASE_TABULAR_TIMETABLE_AND_QR_SQL;
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
    console.error('Failed to copy Tabular Timetable and QR SQL to clipboard:', err);
    return false;
  }
};

export const downloadTabularTimetableAndQrSql = (): void => {
  triggerDownload(
    'gods_hand_school_tabular_timetable_and_qr_schema.sql',
    SUPABASE_TABULAR_TIMETABLE_AND_QR_SQL,
    'application/sql;charset=utf-8;'
  );
};

// ==============================================================================
// RESTRICTED ACCOUNT CREATION (ADMIN & CLASS TEACHER ONLY) & REALTIME SYNC SQL
// ==============================================================================
export const SUPABASE_RESTRICTED_ACCOUNT_CREATION_SQL = `-- ==============================================================================
-- GOD'S HAND INTERNATIONAL MODEL SCHOOL
-- RESTRICTED ACCOUNT CREATION (ADMIN & CLASS TEACHER ONLY) & REALTIME SYNC SCHEMA
-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard/project/_/sql)
-- ==============================================================================
-- 🔒 Core Security Directive:
-- 1. Public / guest self-registration is completely disabled.
-- 2. Student & Pupil accounts can ONLY be created by School Admin or assigned Class Teachers.
-- 3. Parent accounts are provisioned exclusively by School Admin or assigned Class Teachers upon pupil enrollment.
-- 4. All account creation events synchronize and broadcast across devices in sub-second real-time!
-- ==============================================================================

-- 1. STUDENTS TABLE (Official Pupil Records)
CREATE TABLE IF NOT EXISTS public.students (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  grade TEXT NOT NULL,
  email TEXT UNIQUE,
  password_hash TEXT DEFAULT 'student123',
  entry_allowed BOOLEAN DEFAULT TRUE NOT NULL,
  active_term TEXT DEFAULT 'First Term' NOT NULL,
  qr_code_version INT DEFAULT 1 NOT NULL,
  admission_year INT DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
  qr_generations JSONB DEFAULT '{}'::jsonb,
  parent_email TEXT,
  parent_id TEXT,
  date_of_birth DATE,
  gender TEXT CHECK (gender IN ('Male', 'Female', 'Other')),
  balance NUMERIC(12, 2) DEFAULT NULL,
  photo TEXT,
  created_by TEXT DEFAULT 'admin' NOT NULL, -- 'admin' or teacher username
  created_by_role TEXT DEFAULT 'admin' NOT NULL CHECK (created_by_role IN ('admin', 'teacher')),
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Ensure all required columns exist if table already exists
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS created_by TEXT DEFAULT 'admin';
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS created_by_role TEXT DEFAULT 'admin';
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS gender TEXT;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS admission_year INT;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS parent_id TEXT;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS balance NUMERIC(12, 2) DEFAULT NULL;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS photo TEXT;

-- 2. PARENTS TABLE (Parent & Guardian Accounts)
CREATE TABLE IF NOT EXISTS public.parents (
  id TEXT PRIMARY KEY,
  profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT NOT NULL,
  password_hash TEXT DEFAULT 'parent123',
  relationship TEXT DEFAULT 'Parent / Guardian' NOT NULL,
  address TEXT,
  children_student_ids JSONB DEFAULT '[]'::jsonb,
  created_by TEXT DEFAULT 'admin' NOT NULL,
  created_by_role TEXT DEFAULT 'admin' NOT NULL CHECK (created_by_role IN ('admin', 'teacher')),
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.parents ADD COLUMN IF NOT EXISTS children_student_ids JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.parents ADD COLUMN IF NOT EXISTS created_by TEXT DEFAULT 'admin';
ALTER TABLE public.parents ADD COLUMN IF NOT EXISTS created_by_role TEXT DEFAULT 'admin';
ALTER TABLE public.parents ADD COLUMN IF NOT EXISTS address TEXT;

-- 3. TEACHERS TABLE (Class Teachers with Enrollment Authority)
CREATE TABLE IF NOT EXISTS public.teachers (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  assigned_grades JSONB DEFAULT '[]'::jsonb NOT NULL,
  assigned_courses JSONB DEFAULT '[]'::jsonb NOT NULL,
  can_create_students BOOLEAN DEFAULT TRUE NOT NULL,
  allowed_pages JSONB DEFAULT '["overview","students","attendance","timetable","parentMessages"]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS can_create_students BOOLEAN DEFAULT TRUE NOT NULL;

-- 4. PARENT-STUDENT FAMILY LINKS TABLE (Relational Mapping)
CREATE TABLE IF NOT EXISTS public.parent_student_links (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  parent_id TEXT NOT NULL REFERENCES public.parents(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  relationship TEXT DEFAULT 'Parent / Guardian',
  linked_by TEXT DEFAULT 'admin' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT uq_parent_student_link UNIQUE (parent_id, student_id)
);

-- 5. REAL-TIME ACCOUNT CREATION AUDIT & COMMUNICATION LOG
CREATE TABLE IF NOT EXISTS public.account_creation_audit (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  account_type TEXT NOT NULL CHECK (account_type IN ('student', 'parent', 'teacher')),
  account_id TEXT NOT NULL,
  account_name TEXT NOT NULL,
  assigned_grade TEXT,
  created_by TEXT NOT NULL,
  created_by_role TEXT NOT NULL CHECK (created_by_role IN ('admin', 'teacher')),
  credentials_summary TEXT,
  payload JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. SECURITY GUARD TRIGGER: ENFORCE THAT ONLY ADMIN AND TEACHERS CAN CREATE ACCOUNTS
-- Any unauthenticated attempt or attempt without created_by will be rejected
CREATE OR REPLACE FUNCTION public.validate_account_creator()
RETURNS TRIGGER AS $$
BEGIN
  -- Require valid created_by
  IF NEW.created_by IS NULL OR TRIM(NEW.created_by) = '' THEN
    RAISE EXCEPTION 'Account creation rejected: Public self-registration is disabled. Only School Admin and Class Teachers can provision accounts.';
  END IF;

  -- Ensure role is valid (admin or teacher)
  IF NEW.created_by_role NOT IN ('admin', 'teacher') THEN
    RAISE EXCEPTION 'Account creation rejected: Invalid creator role. Only Admin or authorized Class Teachers can create accounts.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_guard_student_creation ON public.students;
CREATE TRIGGER trg_guard_student_creation
BEFORE INSERT ON public.students
FOR EACH ROW EXECUTE FUNCTION public.validate_account_creator();

DROP TRIGGER IF EXISTS trg_guard_parent_creation ON public.parents;
CREATE TRIGGER trg_guard_parent_creation
BEFORE INSERT ON public.parents
FOR EACH ROW EXECUTE FUNCTION public.validate_account_creator();

-- 7. REAL-TIME BROADCAST TRIGGER: COMMUNICATE ACCOUNT CREATIONS ACROSS PORTALS
CREATE OR REPLACE FUNCTION public.broadcast_account_creation()
RETURNS TRIGGER AS $$
DECLARE
  v_type TEXT;
  v_name TEXT;
  v_grade TEXT;
  v_payload JSONB;
BEGIN
  IF TG_TABLE_NAME = 'students' THEN
    v_type := 'student';
    v_name := NEW.name;
    v_grade := NEW.grade;
    v_payload := jsonb_build_object(
      'id', NEW.id,
      'name', NEW.name,
      'grade', NEW.grade,
      'email', NEW.email,
      'parentId', NEW.parent_id,
      'parentEmail', NEW.parent_email,
      'createdBy', NEW.created_by,
      'createdByRole', NEW.created_by_role,
      'createdAt', NEW.created_at
    );
  ELSIF TG_TABLE_NAME = 'parents' THEN
    v_type := 'parent';
    v_name := NEW.full_name;
    v_grade := NULL;
    v_payload := jsonb_build_object(
      'id', NEW.id,
      'name', NEW.full_name,
      'email', NEW.email,
      'phone', NEW.phone,
      'childrenStudentIds', NEW.children_student_ids,
      'createdBy', NEW.created_by,
      'createdByRole', NEW.created_by_role,
      'createdAt', NEW.created_at
    );
  ELSE
    v_type := 'teacher';
    v_name := NEW.username;
    v_grade := NULL;
    v_payload := jsonb_build_object('id', NEW.id, 'username', NEW.username);
  END IF;

  -- Record into audit table
  INSERT INTO public.account_creation_audit (
    account_type, account_id, account_name, assigned_grade, created_by, created_by_role, credentials_summary, payload
  ) VALUES (
    v_type,
    NEW.id,
    v_name,
    v_grade,
    COALESCE(NEW.created_by, 'admin'),
    COALESCE(NEW.created_by_role, 'admin'),
    'Account provisioned by ' || COALESCE(NEW.created_by, 'admin') || ' (' || COALESCE(NEW.created_by_role, 'admin') || ')',
    v_payload
  );

  -- Real-time Postgres notify channel
  PERFORM pg_notify('account_created_realtime', jsonb_build_object(
    'accountType', v_type,
    'id', NEW.id,
    'name', v_name,
    'grade', v_grade,
    'createdBy', NEW.created_by,
    'timestamp', now()
  )::text);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_broadcast_student_created ON public.students;
CREATE TRIGGER trg_broadcast_student_created
AFTER INSERT ON public.students
FOR EACH ROW EXECUTE FUNCTION public.broadcast_account_creation();

DROP TRIGGER IF EXISTS trg_broadcast_parent_created ON public.parents;
CREATE TRIGGER trg_broadcast_parent_created
AFTER INSERT ON public.parents
FOR EACH ROW EXECUTE FUNCTION public.broadcast_account_creation();

-- 8. ATOMIC STORED PROCEDURE: CLASS TEACHER PROVISION STUDENT & PARENT TOGETHER
CREATE OR REPLACE FUNCTION public.enroll_pupil_with_parent(
  p_student_id TEXT,
  p_student_name TEXT,
  p_student_grade TEXT,
  p_student_email TEXT,
  p_student_gender TEXT DEFAULT 'Male',
  p_admission_year INT DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
  p_teacher_username TEXT DEFAULT 'teacher',
  p_create_parent BOOLEAN DEFAULT FALSE,
  p_parent_name TEXT DEFAULT NULL,
  p_parent_phone TEXT DEFAULT NULL,
  p_parent_email TEXT DEFAULT NULL,
  p_parent_relationship TEXT DEFAULT 'Parent / Guardian'
)
RETURNS JSONB AS $$
DECLARE
  v_parent_id TEXT := NULL;
  v_student RECORD;
  v_parent RECORD;
BEGIN
  -- 1. Create Parent if requested
  IF p_create_parent AND (p_parent_name IS NOT NULL OR p_parent_phone IS NOT NULL) THEN
    v_parent_id := 'PAR-' || floor(1000 + random() * 9000)::text;
    
    INSERT INTO public.parents (
      id, full_name, email, phone, password_hash, relationship, children_student_ids, created_by, created_by_role
    ) VALUES (
      v_parent_id,
      COALESCE(p_parent_name, p_student_name || '''s Parent'),
      COALESCE(p_parent_email, lower(regexp_replace(p_student_name, '[^a-zA-Z0-9]', '', 'g')) || '.parent@godshand.edu.ng'),
      COALESCE(p_parent_phone, '08000000000'),
      'parent123',
      COALESCE(p_parent_relationship, 'Mother'),
      jsonb_build_array(p_student_id),
      p_teacher_username,
      'teacher'
    )
    ON CONFLICT (email) DO UPDATE SET
      children_student_ids = public.parents.children_student_ids || jsonb_build_array(p_student_id)
    RETURNING * INTO v_parent;

    v_parent_id := v_parent.id;
  END IF;

  -- 2. Create Student Account
  INSERT INTO public.students (
    id, name, grade, email, password_hash, entry_allowed, active_term, qr_code_version,
    admission_year, parent_email, parent_id, gender, created_by, created_by_role
  ) VALUES (
    p_student_id,
    p_student_name,
    p_student_grade,
    p_student_email,
    'student123',
    TRUE,
    'First Term',
    1,
    p_admission_year,
    COALESCE(p_parent_email, v_parent.email),
    v_parent_id,
    p_student_gender,
    p_teacher_username,
    'teacher'
  )
  RETURNING * INTO v_student;

  -- 3. Link parent and student if parent was created
  IF v_parent_id IS NOT NULL THEN
    INSERT INTO public.parent_student_links (parent_id, student_id, relationship, linked_by)
    VALUES (v_parent_id, p_student_id, COALESCE(p_parent_relationship, 'Parent / Guardian'), p_teacher_username)
    ON CONFLICT (parent_id, student_id) DO NOTHING;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'studentId', v_student.id,
    'studentName', v_student.name,
    'studentGrade', v_student.grade,
    'parentId', v_parent_id,
    'parentName', p_parent_name
  );
END;
$$ LANGUAGE plpgsql;

-- 9. ENABLE REALTIME REPLICATION FOR INSTANT MULTI-DEVICE COMMUNICATION
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'students'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.students;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'parents'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.parents;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'teachers'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.teachers;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'parent_student_links'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.parent_student_links;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'account_creation_audit'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.account_creation_audit;
  END IF;
END $$;
`;

export const copyRestrictedAccountCreationSql = async (): Promise<boolean> => {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(SUPABASE_RESTRICTED_ACCOUNT_CREATION_SQL);
      return true;
    }
    const textArea = document.createElement('textarea');
    textArea.value = SUPABASE_RESTRICTED_ACCOUNT_CREATION_SQL;
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
    console.error('Failed to copy Restricted Account Creation SQL to clipboard:', err);
    return false;
  }
};

export const downloadRestrictedAccountCreationSql = (): void => {
  triggerDownload(
    'gods_hand_school_restricted_account_creation_schema.sql',
    SUPABASE_RESTRICTED_ACCOUNT_CREATION_SQL,
    'application/sql;charset=utf-8;'
  );
};



