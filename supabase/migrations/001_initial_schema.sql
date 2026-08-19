-- ============================================================
-- RIT CLUB & CENTRE SLOT ALLOCATION PORTAL
-- Migration 001: Initial Schema
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE user_role AS ENUM (
  'SUPER_ADMIN',
  'ALLOCATION_ADMIN',
  'DEPARTMENT_ADMIN',
  'CLUB_COORDINATOR',
  'CENTRE_COORDINATOR',
  'STUDENT'
);

CREATE TYPE entity_status AS ENUM ('ACTIVE', 'INACTIVE');
CREATE TYPE session_name AS ENUM ('FORENOON', 'AFTERNOON');
CREATE TYPE day_name AS ENUM ('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY');
CREATE TYPE allocation_status AS ENUM ('PENDING', 'ALLOCATED', 'CONFIRMED', 'CANCELLED');
CREATE TYPE preference_status AS ENUM ('SUBMITTED', 'ALLOCATED', 'REJECTED');

-- ============================================================
-- PROFILES (Extended User Data)
-- ============================================================

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'STUDENT',
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  must_change_password BOOLEAN NOT NULL DEFAULT FALSE,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TIMETABLE RULES (Mapping Engine)
-- ============================================================
-- Stores the mapping from the college timetable (Dept + Sem + Sec -> Session)
CREATE TABLE timetable_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course TEXT NOT NULL,
  semester INTEGER NOT NULL,
  section TEXT NOT NULL,
  activity_session session_name NOT NULL, -- FORENOON or AFTERNOON
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(course, semester, section)
);

-- ============================================================
-- STUDENTS (Master Data from Excel)
-- ============================================================

CREATE TABLE students (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Fields exactly matching Excel schema
  student_id_code TEXT, -- "ID" column
  name TEXT NOT NULL, -- "Name" column
  register_no TEXT UNIQUE NOT NULL, -- "Register No" column
  course TEXT NOT NULL, -- "Course" column (e.g. CSE)
  semester INTEGER NOT NULL, -- "Semester" column
  academic_year TEXT NOT NULL, -- "Academic year" column
  section TEXT NOT NULL, -- "Section" column
  gender TEXT, -- "Gender" column
  hosteler TEXT, -- "Hosteler" column
  contact_no TEXT, -- "Contact No" column
  
  email TEXT UNIQUE NOT NULL, -- Generated for login
  
  -- Derived via Timetable Rules during import
  activity_session session_name,
  
  status entity_status NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- CLUBS & CENTRES
-- ============================================================

CREATE TABLE clubs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  status entity_status NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE club_coordinators (
  club_id UUID REFERENCES clubs(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (club_id, profile_id)
);

CREATE TABLE centres (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  status entity_status NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE centre_coordinators (
  centre_id UUID REFERENCES centres(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (centre_id, profile_id)
);

-- ============================================================
-- ACTIVITY PAIRS (Available Slots)
-- ============================================================

CREATE TABLE activity_pairs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  day day_name NOT NULL,
  session session_name NOT NULL,
  club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE RESTRICT,
  centre_id UUID NOT NULL REFERENCES centres(id) ON DELETE RESTRICT,
  
  club_start_time TIME NOT NULL,
  club_end_time TIME NOT NULL,
  centre_start_time TIME NOT NULL,
  centre_end_time TIME NOT NULL,
  
  capacity INTEGER NOT NULL CHECK (capacity > 0),
  allocated_count INTEGER NOT NULL DEFAULT 0 CHECK (allocated_count >= 0 AND allocated_count <= capacity),
  
  status entity_status NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Prevent exact duplicate slots
  UNIQUE(day, session, club_id, centre_id)
);

-- ============================================================
-- STUDENT PREFERENCES
-- ============================================================

CREATE TABLE preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  day day_name NOT NULL,
  preference_rank INTEGER NOT NULL CHECK (preference_rank BETWEEN 1 AND 3),
  activity_pair_id UUID NOT NULL REFERENCES activity_pairs(id) ON DELETE CASCADE,
  status preference_status NOT NULL DEFAULT 'SUBMITTED',
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- A student can only have one rank #1, #2, #3 per day
  UNIQUE(student_id, day, preference_rank),
  -- A student cannot pick the same pair twice
  UNIQUE(student_id, activity_pair_id)
);

-- ============================================================
-- ALLOCATIONS
-- ============================================================

CREATE TABLE allocations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  activity_pair_id UUID NOT NULL REFERENCES activity_pairs(id) ON DELETE RESTRICT,
  
  day day_name NOT NULL,
  session session_name NOT NULL,
  club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE RESTRICT,
  centre_id UUID NOT NULL REFERENCES centres(id) ON DELETE RESTRICT,
  
  allocation_source TEXT NOT NULL, -- e.g. "PREFERENCE_1", "PREFERENCE_2", "ADMIN_FORCED"
  preference_rank INTEGER,
  
  status allocation_status NOT NULL DEFAULT 'ALLOCATED',
  allocated_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  allocated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- A student can only be allocated once per day
  UNIQUE(student_id, day)
);

-- ============================================================
-- TRIGGERS & TIMESTAMP FUNCTIONS
-- ============================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_timetable_rules_updated_at BEFORE UPDATE ON timetable_rules FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_students_updated_at BEFORE UPDATE ON students FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_clubs_updated_at BEFORE UPDATE ON clubs FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_centres_updated_at BEFORE UPDATE ON centres FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_activity_pairs_updated_at BEFORE UPDATE ON activity_pairs FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Auto-create profile on auth.user signup
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role, must_change_password)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Unknown User'),
    NEW.email,
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'STUDENT'::user_role),
    TRUE
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
