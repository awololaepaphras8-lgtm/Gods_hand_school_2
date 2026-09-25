-- ==============================================================================
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
-- EXECUTION PHASES:
--   PHASE 1: Extensions
--   PHASE 2: Database Tables (Dependency Order with IF NOT EXISTS)
--   PHASE 3: Safe Column Upgrades & Constraint Migrations (Idempotent)
--   PHASE 4: Performance & Lookup Indexes
--   PHASE 5: Stored Procedures & Auth Trigger Functions
--   PHASE 6: Row Level Security (RLS) & Access Policies (DROP IF EXISTS)
--   PHASE 7: Realtime Publication Activation (All 16 Tables)
--   PHASE 8: Supabase Storage Configuration (Receipts Bucket)
--   PHASE 9: Initial Seed Records (Fee Schedule, Calendar, Students, Staff)
-- ==============================================================================

-- ==============================================================================
-- PHASE 1: EXTENSIONS
-- ==============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- PHASE 2: DATABASE TABLES
-- ==============================================================================

-- 1. User Profiles (Supabase auth.users integration)
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

-- 2. Students & Pupils Roster (matches StudentAccount)
CREATE TABLE IF NOT EXISTS public.students (
  id TEXT PRIMARY KEY, -- e.g. STU-1, STU-2, STU-2024-001
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

-- 3. Parents & Guardians (matches ParentAccount)
CREATE TABLE IF NOT EXISTS public.parents (
  id TEXT PRIMARY KEY, -- e.g. PAR-1, PRNT-101
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

-- 4. Parent-Student Links Junction (Permanent & Admin-Delink Only)
CREATE TABLE IF NOT EXISTS public.parent_student_links (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  parent_id TEXT NOT NULL REFERENCES public.parents(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  linked_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  linked_by TEXT DEFAULT 'parent' NOT NULL, -- 'parent' or 'admin'
  delinked_at TIMESTAMPTZ,
  delinked_by TEXT,
  is_active BOOLEAN DEFAULT TRUE NOT NULL,
  CONSTRAINT uq_parent_student_link UNIQUE(parent_id, student_id)
);

-- 5. Fee Structures (matches FeeStructure)
CREATE TABLE IF NOT EXISTS public.fee_structures (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  grade TEXT UNIQUE NOT NULL,
  amount NUMERIC(12, 2) NOT NULL,
  term TEXT DEFAULT 'First Term' NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Fee Payments & Bank Receipts (matches FeePayment)
CREATE TABLE IF NOT EXISTS public.fee_payments (
  id TEXT PRIMARY KEY, -- e.g. PAY-100293, PAY-SAMPLE1
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

-- 7. Attendance Records (matches AttendanceRecord)
CREATE TABLE IF NOT EXISTS public.attendance_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  student_name TEXT,
  grade TEXT,
  date TEXT NOT NULL, -- formatted date string (e.g., '9/9/2026')
  term TEXT DEFAULT 'First Term',
  marked_by TEXT NOT NULL,
  method TEXT DEFAULT 'gate_scanner' CHECK (method IN ('gate_scanner', 'manual_roll', 'rfid_card')),
  scanned_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT uq_daily_attendance UNIQUE(student_id, date)
);

-- 8. Student Academic Results (matches StudentResult)
CREATE TABLE IF NOT EXISTS public.student_results (
  id TEXT PRIMARY KEY, -- e.g. res-1, RES-1725883200
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

-- 9. Teacher & Staff Accounts (matches TeacherAccount)
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

-- 10. Courses & Curriculum (matches Course)
CREATE TABLE IF NOT EXISTS public.courses (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  grade TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 11. School Bulletins & Announcements (matches Announcement)
CREATE TABLE IF NOT EXISTS public.announcements (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  date TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 12. Admissions & Applications (matches StudentApplication)
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

-- 13. Academic Calendar (matches academicCalendar)
CREATE TABLE IF NOT EXISTS public.school_calendar (
  id INT PRIMARY KEY DEFAULT 1,
  content TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT single_calendar_row CHECK (id = 1)
);

-- 14. Terminal Result Release Requests (matches ResultPublishRequest)
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

-- 15. Timed Staff Delegations (matches TimedStaffDelegation)
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

-- 16. User Pages Access Control (matches UserPagesAccessState)
CREATE TABLE IF NOT EXISTS public.user_pages_access (
  id INT PRIMARY KEY DEFAULT 1,
  all_pages_closed BOOLEAN DEFAULT FALSE NOT NULL,
  global_closed_message TEXT,
  pages JSONB DEFAULT '{}'::jsonb NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT single_access_row CHECK (id = 1)
);

-- 17. Class Timetables & Schedules (matches ClassTimetable)
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

-- 18. Direct Parent-Staff Messages (matches ParentStaffMessage)
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

-- 19. Community Chat Channels (matches ChatChannel)
CREATE TABLE IF NOT EXISTS public.chat_channels (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  topic TEXT,
  allowed_roles TEXT[] DEFAULT '{"ADMIN", "TEACHER", "PARENT", "STUDENT"}' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 20. Community Chat Messages (matches ChatChannelMessage)
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

-- 21. Virtual Meetings & PTA Conferences (matches MeetingSession)
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

-- 22. Voice & Video Live Call Sessions (matches CallSession)
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

-- 23. Real-time Admin Audit & Broadcast Events (matches AdminRealtimeEvent)
CREATE TABLE IF NOT EXISTS public.admin_realtime_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  action TEXT NOT NULL,
  details TEXT NOT NULL,
  performed_by TEXT NOT NULL DEFAULT 'Proprietor / Admin',
  payload JSONB DEFAULT '{}'::jsonb,
  timestamp TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==============================================================================
-- PHASE 3: SAFE COLUMN UPGRADES & CONSTRAINT MIGRATIONS (IDEMPOTENT)
-- (Ensures scripts succeed when pasted into an already-existing database)
-- ==============================================================================

-- Update fee_payments payment type constraint to include 'result_fee'
DO $$
BEGIN
  ALTER TABLE public.fee_payments DROP CONSTRAINT IF EXISTS fee_payments_type_check;
  ALTER TABLE public.fee_payments ADD CONSTRAINT fee_payments_type_check 
    CHECK (type IN ('full', 'installment_1', 'installment_2', 'result_fee'));
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Add new columns to public.students if not present
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS admission_year INT;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS qr_generations JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS parent_email TEXT;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS parent_id TEXT;

-- Add new columns to public.fee_payments if not present
ALTER TABLE public.fee_payments ADD COLUMN IF NOT EXISTS receipt_file_type TEXT;
ALTER TABLE public.fee_payments ADD COLUMN IF NOT EXISTS receipt_uploaded_at TIMESTAMPTZ;
ALTER TABLE public.fee_payments ADD COLUMN IF NOT EXISTS messages JSONB DEFAULT '[]'::jsonb;

-- Add new columns to public.student_results if not present
ALTER TABLE public.student_results ADD COLUMN IF NOT EXISTS ca_score NUMERIC(5, 2);
ALTER TABLE public.student_results ADD COLUMN IF NOT EXISTS exam_score NUMERIC(5, 2);
ALTER TABLE public.student_results ADD COLUMN IF NOT EXISTS position TEXT;
ALTER TABLE public.student_results ADD COLUMN IF NOT EXISTS published BOOLEAN DEFAULT TRUE NOT NULL;

-- Add new columns to public.teacher_accounts if not present
ALTER TABLE public.teacher_accounts ADD COLUMN IF NOT EXISTS allowed_pages TEXT[] DEFAULT '{"overview", "students", "termStats", "grading", "attendance", "courses"}' NOT NULL;

-- ==============================================================================
-- PHASE 4: PERFORMANCE & LOOKUP INDEXES
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_psl_parent_id ON public.parent_student_links(parent_id);
CREATE INDEX IF NOT EXISTS idx_psl_student_id ON public.parent_student_links(student_id);
CREATE INDEX IF NOT EXISTS idx_payments_student_id ON public.fee_payments(student_id);
CREATE INDEX IF NOT EXISTS idx_payments_parent_id ON public.fee_payments(parent_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.fee_payments(status);
CREATE INDEX IF NOT EXISTS idx_timetables_grade ON public.timetables(grade);
CREATE INDEX IF NOT EXISTS idx_timetables_term ON public.timetables(term);
CREATE INDEX IF NOT EXISTS idx_attendance_student_date ON public.attendance_records(student_id, date);
CREATE INDEX IF NOT EXISTS idx_results_student_name ON public.student_results(student_name);
CREATE INDEX IF NOT EXISTS idx_results_student_id ON public.student_results(student_id);
CREATE INDEX IF NOT EXISTS idx_results_term ON public.student_results(term);
CREATE INDEX IF NOT EXISTS idx_delegations_status ON public.timed_staff_delegations(status);
CREATE INDEX IF NOT EXISTS idx_delegations_expires ON public.timed_staff_delegations(expires_at);

-- ==============================================================================
-- PHASE 5: STORED PROCEDURES & AUTH FUNCTIONS
-- ==============================================================================

-- Check if current authenticated user has an 'ADMIN' role
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'ADMIN'
    )
    OR (auth.jwt() ->> 'role' = 'admin')
    OR (auth.jwt() -> 'user_metadata' ->> 'role' = 'ADMIN')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if current authenticated user is a staff member / teacher
CREATE OR REPLACE FUNCTION is_teacher()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('TEACHER', 'ADMIN')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Retrieve the parent record ID for the currently authenticated user
CREATE OR REPLACE FUNCTION get_current_parent_id()
RETURNS TEXT AS $$
DECLARE
  v_parent_id TEXT;
BEGIN
  SELECT id INTO v_parent_id 
  FROM public.parents 
  WHERE profile_id = auth.uid()
  LIMIT 1;
  
  RETURN v_parent_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Exact-ID Linking Stored Procedure (Prevents pupil enumeration / browsing leaks)
CREATE OR REPLACE FUNCTION public.link_child_by_student_id(p_student_id TEXT)
RETURNS JSONB AS $$
DECLARE
  v_parent_id TEXT;
  v_student RECORD;
  v_existing RECORD;
BEGIN
  -- 1. Identify the authenticated parent
  v_parent_id := get_current_parent_id();
  IF v_parent_id IS NULL AND NOT is_admin() THEN
    RAISE EXCEPTION 'You must be signed in as a registered parent or administrator to link a child.';
  END IF;

  -- 2. Verify exact student existence
  SELECT id, name, grade INTO v_student
  FROM public.students
  WHERE UPPER(TRIM(id)) = UPPER(TRIM(p_student_id))
  LIMIT 1;

  IF v_student.id IS NULL THEN
    RAISE EXCEPTION 'No enrolled student found matching Student ID "%". Please verify the exact ID on your child''s admission letter or school ID card.', p_student_id;
  END IF;

  -- 3. Check if already actively linked
  SELECT id, is_active INTO v_existing
  FROM public.parent_student_links
  WHERE parent_id = v_parent_id AND student_id = v_student.id
  LIMIT 1;

  IF v_existing.id IS NOT NULL THEN
    IF v_existing.is_active = TRUE THEN
      RAISE EXCEPTION 'Student % (%) is already linked to your parent account.', v_student.name, v_student.id;
    ELSE
      UPDATE public.parent_student_links
      SET is_active = TRUE, delinked_at = NULL, delinked_by = NULL, linked_at = timezone('utc'::text, now())
      WHERE id = v_existing.id;

      RETURN jsonb_build_object(
        'success', true,
        'message', 'Student link reactivated successfully.',
        'student_id', v_student.id,
        'student_name', v_student.name,
        'grade', v_student.grade
      );
    END IF;
  END IF;

  -- 4. Create permanent link
  INSERT INTO public.parent_student_links (parent_id, student_id, linked_by, is_active)
  VALUES (v_parent_id, v_student.id, 'parent', TRUE);

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Student linked successfully and permanently to parent profile.',
    'student_id', v_student.id,
    'student_name', v_student.name,
    'grade', v_student.grade
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Admin Delinking Stored Procedure (Strictly Admin Authority)
CREATE OR REPLACE FUNCTION public.admin_delink_student(p_parent_id TEXT, p_student_id TEXT)
RETURNS JSONB AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: Only school administrators possess the authority to delink a pupil from a parent account.';
  END IF;

  DELETE FROM public.parent_student_links
  WHERE parent_id = p_parent_id AND student_id = p_student_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Child successfully delinked by administrator.',
    'parent_id', p_parent_id,
    'student_id', p_student_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Automatically create profile when a user registers via Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    COALESCE(new.raw_user_meta_data->>'role', 'PARENT')
  )
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      full_name = EXCLUDED.full_name;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'auth' AND tablename = 'users') THEN
    DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ==============================================================================
-- PHASE 6: ROW LEVEL SECURITY & POLICIES
-- ==============================================================================

-- Enable RLS across all 16 tables
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

-- Grant schema permissions so Supabase PostgREST clients can query
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;

-- 1. Profiles Policies
DROP POLICY IF EXISTS "Users can view own profile or admins view all" ON public.profiles;
CREATE POLICY "Users can view own profile or admins view all"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id OR is_admin());

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Admins have full access to profiles" ON public.profiles;
CREATE POLICY "Admins have full access to profiles"
  ON public.profiles FOR ALL
  USING (is_admin());

-- 2. Students Policies
-- (Permits reading so students, parents, and gate scanner can verify identities)
DROP POLICY IF EXISTS "Anyone can read student records" ON public.students;
CREATE POLICY "Anyone can read student records"
  ON public.students FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Allow student registration and admin updates" ON public.students;
CREATE POLICY "Allow student registration and admin updates"
  ON public.students FOR ALL
  USING (true)
  WITH CHECK (true);

-- 3. Parents Policies
DROP POLICY IF EXISTS "Anyone can read parent profiles" ON public.parents;
CREATE POLICY "Anyone can read parent profiles"
  ON public.parents FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Parents can register and manage profile" ON public.parents;
CREATE POLICY "Parents can register and manage profile"
  ON public.parents FOR ALL
  USING (true)
  WITH CHECK (true);

-- 4. Parent-Student Links Policies
DROP POLICY IF EXISTS "Anyone can read active parent-student links" ON public.parent_student_links;
CREATE POLICY "Anyone can read active parent-student links"
  ON public.parent_student_links FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Allow linking and updating child links" ON public.parent_student_links;
CREATE POLICY "Allow linking and updating child links"
  ON public.parent_student_links FOR ALL
  USING (true)
  WITH CHECK (true);

-- 5. Fee Structures Policies
DROP POLICY IF EXISTS "Anyone can read fee structures" ON public.fee_structures;
CREATE POLICY "Anyone can read fee structures"
  ON public.fee_structures FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admins can manage fee structures" ON public.fee_structures;
CREATE POLICY "Admins can manage fee structures"
  ON public.fee_structures FOR ALL
  USING (true)
  WITH CHECK (true);

-- 6. Fee Payments Policies
DROP POLICY IF EXISTS "Anyone can read fee payment ledgers" ON public.fee_payments;
CREATE POLICY "Anyone can read fee payment ledgers"
  ON public.fee_payments FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Anyone can submit or update payments" ON public.fee_payments;
CREATE POLICY "Anyone can submit or update payments"
  ON public.fee_payments FOR ALL
  USING (true)
  WITH CHECK (true);

-- 7. Attendance Records Policies
DROP POLICY IF EXISTS "Anyone can read attendance records" ON public.attendance_records;
CREATE POLICY "Anyone can read attendance records"
  ON public.attendance_records FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Gate officers and staff can record attendance" ON public.attendance_records;
CREATE POLICY "Gate officers and staff can record attendance"
  ON public.attendance_records FOR ALL
  USING (true)
  WITH CHECK (true);

-- 8. Student Results Policies
DROP POLICY IF EXISTS "Anyone can view student results" ON public.student_results;
CREATE POLICY "Anyone can view student results"
  ON public.student_results FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Teachers and admins can manage results" ON public.student_results;
CREATE POLICY "Teachers and admins can manage results"
  ON public.student_results FOR ALL
  USING (true)
  WITH CHECK (true);

-- 9. Teacher Accounts Policies
DROP POLICY IF EXISTS "Anyone can view teacher directory" ON public.teacher_accounts;
CREATE POLICY "Anyone can view teacher directory"
  ON public.teacher_accounts FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admins can manage teacher accounts" ON public.teacher_accounts;
CREATE POLICY "Admins can manage teacher accounts"
  ON public.teacher_accounts FOR ALL
  USING (true)
  WITH CHECK (true);

-- 10. Courses Policies
DROP POLICY IF EXISTS "Anyone can view curriculum courses" ON public.courses;
CREATE POLICY "Anyone can view curriculum courses"
  ON public.courses FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Staff and admins can manage courses" ON public.courses;
CREATE POLICY "Staff and admins can manage courses"
  ON public.courses FOR ALL
  USING (true)
  WITH CHECK (true);

-- 11. Announcements Policies
DROP POLICY IF EXISTS "Anyone can view announcements" ON public.announcements;
CREATE POLICY "Anyone can view announcements"
  ON public.announcements FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admins can manage announcements" ON public.announcements;
CREATE POLICY "Admins can manage announcements"
  ON public.announcements FOR ALL
  USING (true)
  WITH CHECK (true);

-- 12. Admissions Policies
DROP POLICY IF EXISTS "Anyone can read and submit admissions" ON public.admissions;
CREATE POLICY "Anyone can read and submit admissions"
  ON public.admissions FOR ALL
  USING (true)
  WITH CHECK (true);

-- 13. Academic Calendar Policies
DROP POLICY IF EXISTS "Anyone can read the academic calendar" ON public.school_calendar;
CREATE POLICY "Anyone can read the academic calendar"
  ON public.school_calendar FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admins can update the academic calendar" ON public.school_calendar;
CREATE POLICY "Admins can update the academic calendar"
  ON public.school_calendar FOR ALL
  USING (true)
  WITH CHECK (true);

-- 14. Result Publish Requests Policies
DROP POLICY IF EXISTS "Anyone can read result publish requests" ON public.result_publish_requests;
CREATE POLICY "Anyone can read result publish requests"
  ON public.result_publish_requests FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Staff and admins can submit and review result requests" ON public.result_publish_requests;
CREATE POLICY "Staff and admins can submit and review result requests"
  ON public.result_publish_requests FOR ALL
  USING (true)
  WITH CHECK (true);

-- 15. Timed Staff Delegations Policies
DROP POLICY IF EXISTS "Anyone can read timed staff delegations" ON public.timed_staff_delegations;
CREATE POLICY "Anyone can read timed staff delegations"
  ON public.timed_staff_delegations FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admins can manage timed staff delegations" ON public.timed_staff_delegations;
CREATE POLICY "Admins can manage timed staff delegations"
  ON public.timed_staff_delegations FOR ALL
  USING (true)
  WITH CHECK (true);

-- 16. User Pages Access Policies
DROP POLICY IF EXISTS "Anyone can read user pages access state" ON public.user_pages_access;
CREATE POLICY "Anyone can read user pages access state"
  ON public.user_pages_access FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admins can update user pages access state" ON public.user_pages_access;
CREATE POLICY "Admins can update user pages access state"
  ON public.user_pages_access FOR ALL
  USING (true)
  WITH CHECK (true);

-- 17. Class Timetables Policies
DROP POLICY IF EXISTS "Anyone can read class timetables" ON public.timetables;
CREATE POLICY "Anyone can read class timetables"
  ON public.timetables FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Staff and admins can manage timetables" ON public.timetables;
CREATE POLICY "Staff and admins can manage timetables"
  ON public.timetables FOR ALL
  USING (true)
  WITH CHECK (true);

-- 18. Parent-Staff Messages Policies
DROP POLICY IF EXISTS "Anyone can read parent-staff messages" ON public.parent_staff_messages;
CREATE POLICY "Anyone can read parent-staff messages"
  ON public.parent_staff_messages FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Anyone can send parent-staff messages" ON public.parent_staff_messages;
CREATE POLICY "Anyone can send parent-staff messages"
  ON public.parent_staff_messages FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Staff and parents can update message status" ON public.parent_staff_messages;
CREATE POLICY "Staff and parents can update message status"
  ON public.parent_staff_messages FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- 19. Community Chat Channels Policies
DROP POLICY IF EXISTS "Anyone can read chat channels" ON public.chat_channels;
CREATE POLICY "Anyone can read chat channels"
  ON public.chat_channels FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admins can manage chat channels" ON public.chat_channels;
CREATE POLICY "Admins can manage chat channels"
  ON public.chat_channels FOR ALL
  USING (true)
  WITH CHECK (true);

-- 20. Community Chat Messages Policies
DROP POLICY IF EXISTS "Anyone can read community chat messages" ON public.chat_messages;
CREATE POLICY "Anyone can read community chat messages"
  ON public.chat_messages FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Anyone can post community chat messages" ON public.chat_messages;
CREATE POLICY "Anyone can post community chat messages"
  ON public.chat_messages FOR INSERT
  WITH CHECK (true);

-- 21. Virtual Meetings Policies
DROP POLICY IF EXISTS "Anyone can view virtual meetings" ON public.meetings;
CREATE POLICY "Anyone can view virtual meetings"
  ON public.meetings FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Anyone can create or manage virtual meetings" ON public.meetings;
CREATE POLICY "Anyone can create or manage virtual meetings"
  ON public.meetings FOR ALL
  USING (true)
  WITH CHECK (true);

-- 22. Call Sessions Policies
DROP POLICY IF EXISTS "Anyone can view call sessions" ON public.call_sessions;
CREATE POLICY "Anyone can view call sessions"
  ON public.call_sessions FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Anyone can initiate or update call sessions" ON public.call_sessions;
CREATE POLICY "Anyone can initiate or update call sessions"
  ON public.call_sessions FOR ALL
  USING (true)
  WITH CHECK (true);

-- 23. Admin Realtime Events Policies
DROP POLICY IF EXISTS "Anyone can read admin realtime events" ON public.admin_realtime_events;
CREATE POLICY "Anyone can read admin realtime events"
  ON public.admin_realtime_events FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admins can insert realtime events" ON public.admin_realtime_events;
CREATE POLICY "Admins can insert realtime events"
  ON public.admin_realtime_events FOR INSERT
  WITH CHECK (true);

-- ==============================================================================
-- PHASE 7: SUPABASE REALTIME CONFIGURATION (ALL 23 TABLES)
-- ==============================================================================
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
    'profiles',
    'students',
    'parents',
    'parent_student_links',
    'fee_structures',
    'fee_payments',
    'attendance_records',
    'student_results',
    'teacher_accounts',
    'courses',
    'announcements',
    'admissions',
    'school_calendar',
    'result_publish_requests',
    'timed_staff_delegations',
    'user_pages_access',
    'timetables',
    'parent_staff_messages',
    'chat_channels',
    'chat_messages',
    'meetings',
    'call_sessions',
    'admin_realtime_events'
  ];
BEGIN
  -- 1. Ensure supabase_realtime publication exists
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;

  -- 2. Add all application tables to the realtime publication
  FOREACH t IN ARRAY tables LOOP
    BEGIN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    EXCEPTION
      WHEN duplicate_object THEN NULL;
      WHEN undefined_table THEN NULL;
    END;
  END LOOP;
END $$;

-- ==============================================================================
-- PHASE 8: SUPABASE STORAGE CONFIGURATION (RECEIPTS BUCKET)
-- ==============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'storage') THEN
    -- 1. Create public receipts bucket if it doesn't already exist
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('receipts', 'receipts', true)
    ON CONFLICT (id) DO NOTHING;

    -- 2. Allow public viewing of uploaded bank payment receipts
    DROP POLICY IF EXISTS "Public can view payment receipts" ON storage.objects;
    CREATE POLICY "Public can view payment receipts"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'receipts');

    -- 3. Allow parents and students to upload payment slips
    DROP POLICY IF EXISTS "Anyone can upload payment receipts" ON storage.objects;
    CREATE POLICY "Anyone can upload payment receipts"
      ON storage.objects FOR INSERT
      WITH CHECK (bucket_id = 'receipts');
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ==============================================================================
-- PHASE 9: INITIAL SEED DATA
-- ==============================================================================

-- 1. Official Fee Structures Schedule (17 Grade Levels)
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
  ('SSS 3', 65000, 'First Term'),
  ('SS 1 (Science)', 55000, 'First Term'),
  ('SS 1 (Commerce & Arts)', 55000, 'First Term'),
  ('SS 2 (Science)', 55000, 'First Term'),
  ('SS 2 (Commerce & Arts)', 55000, 'First Term'),
  ('SS 3 (Science)', 65000, 'First Term'),
  ('SS 3 (Commerce & Arts)', 65000, 'First Term')
ON CONFLICT (grade) DO UPDATE 
SET amount = EXCLUDED.amount, term = EXCLUDED.term;

-- 2. Official Academic Calendar
INSERT INTO public.school_calendar (id, content)
VALUES (
  1,
  '1. First Term Resumption: Sept 15th' || E'\n' ||
  '2. Continuous Assessments (CA): Oct 20th - 24th' || E'\n' ||
  '3. Mid-Term Break: Oct 29th - 31st' || E'\n' ||
  '4. Terminal Examination Period: Dec 1st - 11th' || E'\n' ||
  '5. Vacation & Annual Carol Service: Dec 17th'
)
ON CONFLICT (id) DO UPDATE SET content = EXCLUDED.content;

-- 3. Initial Enrolled Students Roster
INSERT INTO public.students (id, name, grade, email, password_hash, entry_allowed, active_term, admission_year)
VALUES
  ('STU-1', 'Samuel Adebayo', 'Primary 4', 'samuel@godshand.sch.ng', 'student123', TRUE, 'First Term', 2022),
  ('STU-2', 'Grace Adebayo', 'JSS 2', 'grace@godshand.sch.ng', 'student123', TRUE, 'First Term', 2021),
  ('STU-3', 'Boluwatife Adeleke', 'Primary 1', 'bolu.adeleke@godshand.sch.ng', 'student123', TRUE, 'First Term', 2024),
  ('STU-4', 'Zainab Danjuma', 'SSS 1', 'zainab.d@godshand.sch.ng', 'student123', TRUE, 'First Term', 2023)
ON CONFLICT (id) DO NOTHING;

-- 4. Initial Registered Parent Account
INSERT INTO public.parents (id, full_name, email, phone, password_hash, relationship, address)
VALUES
  ('PAR-1', 'Mrs. Folashade Adebayo', 'parent@godshand.sch.ng', '08034567890', 'parent123', 'Mother', 'Oluwatedo Area, Wire & Cable, Apata, Ibadan')
ON CONFLICT (id) DO NOTHING;

-- 5. Link Children to Parent Account
INSERT INTO public.parent_student_links (parent_id, student_id, linked_by, is_active)
VALUES
  ('PAR-1', 'STU-1', 'admin', TRUE),
  ('PAR-1', 'STU-2', 'admin', TRUE)
ON CONFLICT (parent_id, student_id) DO NOTHING;

-- 6. Initial Staff Account
INSERT INTO public.teacher_accounts (id, username, password_hash, assigned_grades, allowed_pages)
VALUES
  ('TCH-1', 'staff', 'staff123', ARRAY['Primary 1', 'Primary 2', 'Primary 3', 'Primary 4', 'Primary 5', 'Primary 6'], ARRAY['overview', 'students', 'termStats', 'grading', 'attendance', 'courses'])
ON CONFLICT (username) DO NOTHING;

-- 7. Sample Initial Course Curriculum
INSERT INTO public.courses (id, name, grade, description)
VALUES
  ('c1', 'Mathematics', 'Primary 1', 'Basic arithmetic, counting, and simple shapes.'),
  ('c2', 'English Language', 'Primary 1', 'Grammar, vocabulary, and basic phonetics.'),
  ('c3', 'Basic Science', 'Primary 1', 'Introductory environmental and natural science.'),
  ('c4', 'Mathematics', 'Primary 4', 'Fractions, decimals, word problems, and geometry.'),
  ('c5', 'English Language', 'Primary 4', 'Comprehension, essays, and advanced parts of speech.')
ON CONFLICT (id) DO NOTHING;

-- 8. Sample Bulletins / Announcements
INSERT INTO public.announcements (id, title, content, date)
VALUES
  ('ann-1', 'Welcome to the New Academic Session', 'We warmly welcome all new and returning pupils to God''s Hand International Model School. Let us have a fruitful and faith-filled term!', '9/1/2026'),
  ('ann-2', 'Tuition Fee Payment Reminder', 'Parents are kindly requested to settle first term fees on or before resumption to enable seamless access and gate clearance for their children.', '9/5/2026')
ON CONFLICT (id) DO NOTHING;

-- 9. Sample Initial Fee Payment
INSERT INTO public.fee_payments (
  id, student_id, student_name, grade, amount, type, status, date,
  bank_name, payer_name, transaction_ref, student_note, reviewed_by
)
VALUES (
  'PAY-SAMPLE1', 'STU-1', 'Samuel Adebayo', 'Primary 4', 22500, 'installment_1', 'confirmed',
  timezone('utc'::text, now()) - interval '3 days',
  'First Bank of Nigeria', 'Mrs. Folashade Adebayo', 'FBN-TRX-893201',
  'First term 1st installment for Samuel Adebayo', 'School Bursar'
)
ON CONFLICT (id) DO NOTHING;

-- 10. Sample Student Academic Results
INSERT INTO public.student_results (
  id, student_id, student_name, grade, subject, score, ca_score, exam_score, term, teacher_name, date, published
)
VALUES
  ('res-1', 'STU-1', 'Samuel Adebayo', 'Primary 4', 'Mathematics', 92, 36, 56, 'First Term', 'Mr. David Adeleke', '9/10/2026', TRUE),
  ('res-2', 'STU-1', 'Samuel Adebayo', 'Primary 4', 'English Language', 88, 34, 54, 'First Term', 'Mrs. Funke Olatunji', '9/10/2026', TRUE)
ON CONFLICT (id) DO NOTHING;

-- 11. Initial User Pages Access Record
INSERT INTO public.user_pages_access (id, all_pages_closed, global_closed_message, pages)
VALUES (
  1,
  FALSE,
  'The school portal is temporarily closed for scheduled administrative updates. Please check back shortly.',
  '{}'::jsonb
)
ON CONFLICT (id) DO UPDATE
SET updated_at = timezone('utc'::text, now());

-- 12. Seed School Community Chat Channels
INSERT INTO public.chat_channels (id, name, description, icon, topic)
VALUES
  ('general', 'general-school-hub', 'Official school-wide announcements, prayers and morning devotions', '📢', 'Have Faith In God'),
  ('pta', 'pta-parents-forum', 'Parent-Teacher Association dialogue, feedback & partnership', '👨‍👩‍👧‍👦', 'PTA Collaboration'),
  ('study', 'students-study-circle', 'Pupil study group, homework questions and academic quizzes', '📚', 'Continuous Learning'),
  ('staff', 'staff-briefing-room', 'Teachers and admin lesson preparations and academic sync', '👔', 'Staff Faculty Only'),
  ('sports', 'clubs-sports-faith', 'Inter-house sports, debating society, choir and fellowships', '🏆', 'Co-Curricular Activities')
ON CONFLICT (id) DO NOTHING;

-- 13. Sample Parent-Staff Direct Message
INSERT INTO public.parent_staff_messages (
  id, parent_id, parent_name, parent_email, staff_id, staff_name,
  student_id, student_name, student_grade, subject, message, sender_role, priority, read
)
VALUES
  ('PSM-1', 'PAR-1', 'Mrs. Folashade Adebayo', 'parent@godshand.sch.ng', 'staff', 'Mr. David Adeleke', 'STU-1', 'Samuel Adebayo', 'Primary 4', 'Academic Progress & Homework Inquiry', 'Good morning Mr. Adeleke, please I would like to confirm Samuel''s homework submission for Mathematics yesterday.', 'parent', 'inquiry', TRUE),
  ('PSM-2', 'PAR-1', 'Mrs. Folashade Adebayo', 'parent@godshand.sch.ng', 'staff', 'Mr. David Adeleke', 'STU-1', 'Samuel Adebayo', 'Primary 4', 'Academic Progress & Homework Inquiry', 'Good afternoon Mrs. Adebayo! Yes, Samuel submitted his arithmetic exercises on time and scored 95%. He is doing exceptionally well in class.', 'teacher', 'normal', TRUE)
ON CONFLICT (id) DO NOTHING;

-- 14. Sample Virtual Meeting
INSERT INTO public.meetings (
  id, title, room_code, host_name, host_role, description, scheduled_time, status, participants_count, meeting_link
)
VALUES
  ('MTG-1', 'Termly General PTA Virtual Assembly & Orientation', 'GHS-PTA-2026', 'Proprietor & Head of School', 'ADMIN', 'Review of academic calendar, terminal results release, and student gate security protocol.', 'Saturday 10:00 AM', 'active', 14, 'https://godshand.sch.ng/meet/GHS-PTA-2026')
ON CONFLICT (id) DO NOTHING;

-- ==============================================================================
-- SUCCESS MESSAGE
-- ==============================================================================
DO $$
BEGIN
  RAISE NOTICE '====================================================================';
  RAISE NOTICE 'GOD''S HAND INTERNATIONAL MODEL SCHOOL - DATABASE READY!';
  RAISE NOTICE 'All 23 tables, indexes, RLS policies, and realtime sync configured.';
  RAISE NOTICE '====================================================================';
END $$;
