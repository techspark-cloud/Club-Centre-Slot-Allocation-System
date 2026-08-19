-- ============================================================
-- PRE-FLIGHT CLEANUP: Drop existing tables to start fresh
-- WARNING: This will delete all data in these tables!
-- ============================================================

DROP TABLE IF EXISTS allocations CASCADE;
DROP TABLE IF EXISTS preferences CASCADE;
DROP TABLE IF EXISTS activity_pairs CASCADE;
DROP TABLE IF EXISTS centre_coordinators CASCADE;
DROP TABLE IF EXISTS centres CASCADE;
DROP TABLE IF EXISTS club_coordinators CASCADE;
DROP TABLE IF EXISTS clubs CASCADE;
DROP TABLE IF EXISTS students CASCADE;
DROP TABLE IF EXISTS timetable_rules CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

DROP TYPE IF EXISTS allocation_status CASCADE;
DROP TYPE IF EXISTS preference_status CASCADE;
DROP TYPE IF EXISTS day_name CASCADE;
DROP TYPE IF EXISTS session_name CASCADE;
DROP TYPE IF EXISTS entity_status CASCADE;
DROP TYPE IF EXISTS user_role CASCADE;

DROP FUNCTION IF EXISTS allocate_student CASCADE;
DROP FUNCTION IF EXISTS assign_student_session CASCADE;
DROP FUNCTION IF EXISTS get_user_role CASCADE;
DROP FUNCTION IF EXISTS is_admin CASCADE;
DROP FUNCTION IF EXISTS set_updated_at CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user CASCADE;
