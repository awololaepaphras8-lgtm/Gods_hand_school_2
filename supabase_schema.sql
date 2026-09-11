-- ==============================================================================
-- GOD'S HAND INTERNATIONAL MODEL SCHOOL - SUPABASE POSTGRESQL MASTER SCHEMA
-- Wire & Cable, Apata, Ibadan, Oyo State, Nigeria
-- Motto: Have Faith In God
-- ==============================================================================
-- This SQL migration file is organized into clean sequential execution phases:
--   PHASE 1: Extensions
--   PHASE 2: All Tables (Created in dependency order)
--   PHASE 3: Performance Indexes
--   PHASE 4: Helper Functions & Stored Procedures
--   PHASE 5: Row Level Security (RLS) & Idempotent Policies (DROP IF EXISTS)
--   PHASE 6: Supabase Realtime Publication (All 12 Tables)
--   PHASE 7: Initial Seed Data
-- ==============================================================================

-- ==============================================================================
-- PHASE 1: EXTENSIONS
-- ==============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- PHASE 2: ALL DATABASE TABLES (Dependency Order)
-- ==============================================================================

-- 1. User Profiles (Supabase auth.users integration)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('ADMIN', 'TEACHER', 'PARENT', 'STUDENT')),
  phone TEXT,
  address TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Students & Pupils Roster (matches StudentAccount)
CREATE TABLE IF NOT EXISTS public.students (
  id TEXT PRIMARY KEY, -- e.g. STU-1, STU-2
  name TEXT NOT NULL,
  grade TEXT NOT NULL,
  email TEXT UNIQUE,
  password_hash TEXT,
  entry_allowed BOOLEAN DEFAULT TRUE NOT NULL,
  active_term TEXT DEFAULT 'First Term' NOT NULL,
  qr_code_version INT DEFAULT 1 NOT NULL,
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
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
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

-- 6. Fee Payments & Receipts (matches FeePayment)
CREATE TABLE IF NOT EXISTS public.fee_payments (
  id TEXT PRIMARY KEY, -- e.g. PAY-100293, PAY-SAMPLE1
  student_id TEXT NOT NULL REFERENCES public.students(id) ON DELETE RESTRICT,
  parent_id TEXT REFERENCES public.parents(id) ON DELETE SET NULL,
  student_name TEXT NOT NULL,
  grade TEXT NOT NULL,
  amount NUMERIC(12, 2) NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('full', 'installment_1', 'installment_2')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'declined')),
  date TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  payer_name TEXT,
  bank_name TEXT,
  transaction_ref TEXT,
  student_note TEXT,
  admin_note TEXT,
  receipt_image TEXT,
  receipt_file_name TEXT,
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
  date TEXT NOT NULL, -- formatted string (e.g., '9/9/2026') matching client logs
  term TEXT DEFAULT 'First Term',
  marked_by TEXT NOT NULL,
  method TEXT DEFAULT 'gate_scanner' CHECK (method IN ('gate_scanner', 'manual_roll', 'rfid_card')),
  scanned_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT uq_daily_attendance UNIQUE(student_id, date)
);

-- 8. Student Results (matches StudentResult)
CREATE TABLE IF NOT EXISTS public.student_results (
  id TEXT PRIMARY KEY, -- e.g. res-1, RES-1725883200
  student_id TEXT REFERENCES public.students(id) ON DELETE CASCADE,
  student_name TEXT NOT NULL,
  grade TEXT NOT NULL,
  subject TEXT NOT NULL,
  score NUMERIC(5, 2) NOT NULL CHECK (score >= 0 AND score <= 100),
  term TEXT NOT NULL,
  teacher_name TEXT NOT NULL,
  date TEXT NOT NULL,
  academic_year TEXT DEFAULT '2024/2025' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 9. Teacher Accounts (matches TeacherAccount)
CREATE TABLE IF NOT EXISTS public.teacher_accounts (
  id TEXT PRIMARY KEY,
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT,
  assigned_grades TEXT[] DEFAULT '{}' NOT NULL,
  assigned_courses TEXT[] DEFAULT '{}' NOT NULL,
  allowed_pages TEXT[] DEFAULT '{"overview", "students", "termStats", "grading", "attendance", "courses"}' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 10. Courses (matches Course)
CREATE TABLE IF NOT EXISTS public.courses (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  grade TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 11. Announcements (matches Announcement)
CREATE TABLE IF NOT EXISTS public.announcements (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  date TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 12. Admissions & Student Applications (matches StudentApplication)
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

-- ==============================================================================
-- PHASE 3: PERFORMANCE INDEXES
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_psl_parent_id ON public.parent_student_links(parent_id);
CREATE INDEX IF NOT EXISTS idx_psl_student_id ON public.parent_student_links(student_id);
CREATE INDEX IF NOT EXISTS idx_payments_student_id ON public.fee_payments(student_id);
CREATE INDEX IF NOT EXISTS idx_payments_parent_id ON public.fee_payments(parent_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.fee_payments(status);
CREATE INDEX IF NOT EXISTS idx_attendance_student_date ON public.attendance_records(student_id, date);
CREATE INDEX IF NOT EXISTS idx_results_student_name ON public.student_results(student_name);
CREATE INDEX IF NOT EXISTS idx_results_student_id ON public.student_results(student_id);

-- ==============================================================================
-- PHASE 4: HELPER FUNCTIONS & STORED PROCEDURES
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

-- Exact-ID Linking Stored Procedure (No browsing / search leaks)
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

-- Admin Delinking Stored Procedure (Only Admin Authority)
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

-- ==============================================================================
-- PHASE 5: ROW LEVEL SECURITY & IDEMPOTENT POLICIES
-- ==============================================================================

-- Enable RLS across all tables
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

-- 1. Profiles Policies
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id OR is_admin());

DROP POLICY IF EXISTS "Users can update their own basic profile" ON public.profiles;
CREATE POLICY "Users can update their own basic profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id AND role = (SELECT role FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Admins have full access to all profiles" ON public.profiles;
CREATE POLICY "Admins have full access to all profiles"
  ON public.profiles FOR ALL
  USING (is_admin());

-- 2. Students Policies
DROP POLICY IF EXISTS "Admins and Teachers can view all students" ON public.students;
CREATE POLICY "Admins and Teachers can view all students"
  ON public.students FOR SELECT
  USING (is_admin() OR is_teacher());

DROP POLICY IF EXISTS "Parents can only view their linked children" ON public.students;
CREATE POLICY "Parents can only view their linked children"
  ON public.students FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.parent_student_links psl
      JOIN public.parents p ON p.id = psl.parent_id
      WHERE psl.student_id = public.students.id 
        AND p.profile_id = auth.uid()
        AND psl.is_active = TRUE
    )
  );

DROP POLICY IF EXISTS "Students can view their own student record" ON public.students;
CREATE POLICY "Students can view their own student record"
  ON public.students FOR SELECT
  USING (email = auth.jwt() ->> 'email' OR id = auth.jwt() ->> 'student_id');

DROP POLICY IF EXISTS "Admins have full control over students" ON public.students;
CREATE POLICY "Admins have full control over students"
  ON public.students FOR ALL
  USING (is_admin());

-- 3. Parents Policies
DROP POLICY IF EXISTS "Parents can view and update their own record" ON public.parents;
CREATE POLICY "Parents can view and update their own record"
  ON public.parents FOR SELECT
  USING (profile_id = auth.uid() OR is_admin() OR is_teacher());

DROP POLICY IF EXISTS "Parents can update their profile information" ON public.parents;
CREATE POLICY "Parents can update their profile information"
  ON public.parents FOR UPDATE
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

DROP POLICY IF EXISTS "Admins have full control over parents" ON public.parents;
CREATE POLICY "Admins have full control over parents"
  ON public.parents FOR ALL
  USING (is_admin());

-- 4. Parent-Student Links Policies
DROP POLICY IF EXISTS "Parents can view their own child links" ON public.parent_student_links;
CREATE POLICY "Parents can view their own child links"
  ON public.parent_student_links FOR SELECT
  USING (
    parent_id = get_current_parent_id() OR is_admin() OR is_teacher()
  );

DROP POLICY IF EXISTS "Parents can create a child link for themselves" ON public.parent_student_links;
CREATE POLICY "Parents can create a child link for themselves"
  ON public.parent_student_links FOR INSERT
  WITH CHECK (
    parent_id = get_current_parent_id() OR is_admin()
  );

DROP POLICY IF EXISTS "Only admins can delete parent-student links" ON public.parent_student_links;
CREATE POLICY "Only admins can delete parent-student links"
  ON public.parent_student_links FOR DELETE
  USING (is_admin());

DROP POLICY IF EXISTS "Only admins can update parent-student links" ON public.parent_student_links;
CREATE POLICY "Only admins can update parent-student links"
  ON public.parent_student_links FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());

-- 5. Fee Structures Policies
DROP POLICY IF EXISTS "Anyone can view fee structures" ON public.fee_structures;
CREATE POLICY "Anyone can view fee structures"
  ON public.fee_structures FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Only admins can modify fee structures" ON public.fee_structures;
CREATE POLICY "Only admins can modify fee structures"
  ON public.fee_structures FOR ALL
  USING (is_admin());

-- 6. Fee Payments Policies
DROP POLICY IF EXISTS "Admins and staff can view all payments" ON public.fee_payments;
CREATE POLICY "Admins and staff can view all payments"
  ON public.fee_payments FOR SELECT
  USING (is_admin() OR is_teacher());

DROP POLICY IF EXISTS "Parents can view payments for their linked children" ON public.fee_payments;
CREATE POLICY "Parents can view payments for their linked children"
  ON public.fee_payments FOR SELECT
  USING (
    parent_id = get_current_parent_id()
    OR EXISTS (
      SELECT 1 FROM public.parent_student_links psl
      WHERE psl.student_id = public.fee_payments.student_id 
        AND psl.parent_id = get_current_parent_id()
        AND psl.is_active = TRUE
    )
  );

DROP POLICY IF EXISTS "Parents can insert payment submissions" ON public.fee_payments;
CREATE POLICY "Parents can insert payment submissions"
  ON public.fee_payments FOR INSERT
  WITH CHECK (
    parent_id = get_current_parent_id()
    OR is_admin()
    OR EXISTS (
      SELECT 1 FROM public.parent_student_links psl
      WHERE psl.student_id = public.fee_payments.student_id 
        AND psl.parent_id = get_current_parent_id()
    )
  );

DROP POLICY IF EXISTS "Only admins and authorized staff can update payment status" ON public.fee_payments;
CREATE POLICY "Only admins and authorized staff can update payment status"
  ON public.fee_payments FOR UPDATE
  USING (is_admin() OR is_teacher())
  WITH CHECK (is_admin() OR is_teacher());

-- 7. Attendance Records Policies
DROP POLICY IF EXISTS "Staff and admins can view and record attendance" ON public.attendance_records;
CREATE POLICY "Staff and admins can view and record attendance"
  ON public.attendance_records FOR ALL
  USING (is_admin() OR is_teacher());

DROP POLICY IF EXISTS "Parents can view attendance for their linked children" ON public.attendance_records;
CREATE POLICY "Parents can view attendance for their linked children"
  ON public.attendance_records FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.parent_student_links psl
      WHERE psl.student_id = public.attendance_records.student_id
        AND psl.parent_id = get_current_parent_id()
        AND psl.is_active = TRUE
    )
  );

-- 8. Student Results Policies
DROP POLICY IF EXISTS "Teachers and admins can view and enter results" ON public.student_results;
CREATE POLICY "Teachers and admins can view and enter results"
  ON public.student_results FOR ALL
  USING (is_admin() OR is_teacher());

DROP POLICY IF EXISTS "Parents can view academic results of their linked children" ON public.student_results;
CREATE POLICY "Parents can view academic results of their linked children"
  ON public.student_results FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.parent_student_links psl
      JOIN public.students s ON s.id = psl.student_id
      WHERE (s.name = public.student_results.student_name OR psl.student_id = public.student_results.student_id)
        AND psl.parent_id = get_current_parent_id()
        AND psl.is_active = TRUE
    )
  );

-- 9. Teacher Accounts Policies
DROP POLICY IF EXISTS "Teachers can view their own credentials and assigned classes" ON public.teacher_accounts;
CREATE POLICY "Teachers can view their own credentials and assigned classes"
  ON public.teacher_accounts FOR SELECT
  USING (profile_id = auth.uid() OR is_admin());

DROP POLICY IF EXISTS "Admins have full control over teacher accounts" ON public.teacher_accounts;
CREATE POLICY "Admins have full control over teacher accounts"
  ON public.teacher_accounts FOR ALL
  USING (is_admin());

-- 10. Courses Policies
DROP POLICY IF EXISTS "Anyone can view courses" ON public.courses;
CREATE POLICY "Anyone can view courses"
  ON public.courses FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Staff and Admins can create and modify courses" ON public.courses;
CREATE POLICY "Staff and Admins can create and modify courses"
  ON public.courses FOR ALL
  USING (is_admin() OR is_teacher());

-- 11. Announcements Policies
DROP POLICY IF EXISTS "Anyone can view announcements" ON public.announcements;
CREATE POLICY "Anyone can view announcements"
  ON public.announcements FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admins can manage announcements" ON public.announcements;
CREATE POLICY "Admins can manage announcements"
  ON public.announcements FOR ALL
  USING (is_admin());

-- 12. Admissions Policies
DROP POLICY IF EXISTS "Anyone can submit an admission application" ON public.admissions;
CREATE POLICY "Anyone can submit an admission application"
  ON public.admissions FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Staff and Admins can view and process admissions" ON public.admissions;
CREATE POLICY "Staff and Admins can view and process admissions"
  ON public.admissions FOR ALL
  USING (is_admin() OR is_teacher());

-- 13. Academic Calendar Policies
DROP POLICY IF EXISTS "Anyone can view the academic calendar" ON public.school_calendar;
CREATE POLICY "Anyone can view the academic calendar"
  ON public.school_calendar FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Only admins can update the academic calendar" ON public.school_calendar;
CREATE POLICY "Only admins can update the academic calendar"
  ON public.school_calendar FOR ALL
  USING (is_admin());

-- ==============================================================================
-- PHASE 6: SUPABASE REALTIME CONFIGURATION (ALL 12 TABLES)
-- ==============================================================================
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

DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.students;
  EXCEPTION WHEN duplicate_object THEN NULL; END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.parents;
  EXCEPTION WHEN duplicate_object THEN NULL; END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.parent_student_links;
  EXCEPTION WHEN duplicate_object THEN NULL; END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.fee_structures;
  EXCEPTION WHEN duplicate_object THEN NULL; END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.fee_payments;
  EXCEPTION WHEN duplicate_object THEN NULL; END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance_records;
  EXCEPTION WHEN duplicate_object THEN NULL; END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.student_results;
  EXCEPTION WHEN duplicate_object THEN NULL; END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.teacher_accounts;
  EXCEPTION WHEN duplicate_object THEN NULL; END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.courses;
  EXCEPTION WHEN duplicate_object THEN NULL; END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.announcements;
  EXCEPTION WHEN duplicate_object THEN NULL; END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.admissions;
  EXCEPTION WHEN duplicate_object THEN NULL; END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.school_calendar;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

-- ==============================================================================
-- PHASE 7: INITIAL SEED DATA
-- ==============================================================================

-- Fee Structures
INSERT INTO public.fee_structures (grade, amount, term)
VALUES
  ('Creche', 25000, 'First Term'),
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
  ('JSS 1', 45000, 'First Term'),
  ('JSS 2', 45000, 'First Term'),
  ('JSS 3', 50000, 'First Term'),
  ('SSS 1', 55000, 'First Term'),
  ('SSS 2', 55000, 'First Term'),
  ('SSS 3', 65000, 'First Term')
ON CONFLICT (grade) DO UPDATE 
SET amount = EXCLUDED.amount, term = EXCLUDED.term;

-- Academic Calendar
INSERT INTO public.school_calendar (id, content)
VALUES (
  1,
  '1. First Term Resumption: Sept 15th' || E'\n' ||
  '2. Continuous Assessments: Oct 20th - 24th' || E'\n' ||
  '3. Mid-Term Break: Oct 29th - 31st' || E'\n' ||
  '4. Examination Period: Dec 1st - 11th' || E'\n' ||
  '5. Vacation & Carol Service: Dec 17th'
)
ON CONFLICT (id) DO UPDATE SET content = EXCLUDED.content;

-- Enrolled Students Roster
INSERT INTO public.students (id, name, grade, email, entry_allowed, active_term)
VALUES
  ('STU-1', 'Samuel Adebayo', 'Primary 4', 'samuel@godshand.sch.ng', TRUE, 'First Term'),
  ('STU-2', 'Grace Adebayo', 'JSS 2', 'grace@godshand.sch.ng', TRUE, 'First Term'),
  ('STU-3', 'Boluwatife Adeleke', 'Primary 1', 'bolu.adeleke@godshand.sch.ng', TRUE, 'First Term'),
  ('STU-4', 'Zainab Danjuma', 'SSS 1', 'zainab.d@godshand.sch.ng', TRUE, 'First Term')
ON CONFLICT (id) DO NOTHING;

-- Parent Account
INSERT INTO public.parents (id, full_name, email, phone, relationship, address)
VALUES
  ('PAR-1', 'Mrs. Folashade Adebayo', 'parent@godshand.sch.ng', '08034567890', 'Mother', 'Oluwatedo Area, Wire & Cable, Apata, Ibadan')
ON CONFLICT (id) DO NOTHING;

-- Link Children to Parent Account
INSERT INTO public.parent_student_links (parent_id, student_id, linked_by, is_active)
VALUES
  ('PAR-1', 'STU-1', 'admin', TRUE),
  ('PAR-1', 'STU-2', 'admin', TRUE)
ON CONFLICT (parent_id, student_id) DO NOTHING;

-- Staff Account
INSERT INTO public.teacher_accounts (id, username, assigned_grades, allowed_pages)
VALUES
  ('TCH-1', 'staff', ARRAY['Primary 1', 'Primary 2', 'Primary 3', 'Primary 4', 'Primary 5', 'Primary 6'], ARRAY['overview', 'students', 'termStats', 'grading', 'attendance', 'courses'])
ON CONFLICT (username) DO NOTHING;
