-- ============================================================
-- Migration 002: Row Level Security Policies
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE timetable_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE clubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE club_coordinators ENABLE ROW LEVEL SECURITY;
ALTER TABLE centres ENABLE ROW LEVEL SECURITY;
ALTER TABLE centre_coordinators ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_pairs ENABLE ROW LEVEL SECURITY;
ALTER TABLE preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE allocations ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

CREATE OR REPLACE FUNCTION get_user_role()
RETURNS user_role AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT get_user_role() IN ('SUPER_ADMIN', 'ALLOCATION_ADMIN', 'DEPARTMENT_ADMIN');
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================
-- POLICIES
-- ============================================================

-- PROFILES
CREATE POLICY "profiles_select_own" ON profiles FOR SELECT USING (id = auth.uid() OR is_admin());
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE USING (id = auth.uid() OR is_admin());

-- TIMETABLE RULES
CREATE POLICY "timetable_rules_select_all" ON timetable_rules FOR SELECT USING (TRUE);
CREATE POLICY "timetable_rules_write_admin" ON timetable_rules FOR ALL USING (is_admin());

-- STUDENTS
CREATE POLICY "students_select_own" ON students FOR SELECT USING (auth_user_id = auth.uid() OR is_admin());
CREATE POLICY "students_write_admin" ON students FOR ALL USING (is_admin());

-- CLUBS & CENTRES
CREATE POLICY "clubs_select_all" ON clubs FOR SELECT USING (TRUE);
CREATE POLICY "clubs_write_admin" ON clubs FOR ALL USING (is_admin());

CREATE POLICY "centres_select_all" ON centres FOR SELECT USING (TRUE);
CREATE POLICY "centres_write_admin" ON centres FOR ALL USING (is_admin());

-- COORDINATORS
CREATE POLICY "club_coordinators_select" ON club_coordinators FOR SELECT USING (profile_id = auth.uid() OR is_admin());
CREATE POLICY "club_coordinators_write_admin" ON club_coordinators FOR ALL USING (is_admin());

CREATE POLICY "centre_coordinators_select" ON centre_coordinators FOR SELECT USING (profile_id = auth.uid() OR is_admin());
CREATE POLICY "centre_coordinators_write_admin" ON centre_coordinators FOR ALL USING (is_admin());

-- ACTIVITY PAIRS
CREATE POLICY "activity_pairs_select_all" ON activity_pairs FOR SELECT USING (TRUE);
CREATE POLICY "activity_pairs_write_admin" ON activity_pairs FOR ALL USING (is_admin());

-- PREFERENCES
CREATE POLICY "preferences_select_own" ON preferences
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM students WHERE id = preferences.student_id AND auth_user_id = auth.uid())
    OR is_admin()
  );

CREATE POLICY "preferences_insert_own" ON preferences
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM students WHERE id = preferences.student_id AND auth_user_id = auth.uid())
    OR is_admin()
  );

-- ALLOCATIONS
CREATE POLICY "allocations_select" ON allocations
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM students WHERE id = allocations.student_id AND auth_user_id = auth.uid())
    OR is_admin()
    OR (get_user_role() = 'CLUB_COORDINATOR' AND EXISTS (SELECT 1 FROM club_coordinators WHERE club_id = allocations.club_id AND profile_id = auth.uid()))
    OR (get_user_role() = 'CENTRE_COORDINATOR' AND EXISTS (SELECT 1 FROM centre_coordinators WHERE centre_id = allocations.centre_id AND profile_id = auth.uid()))
  );

CREATE POLICY "allocations_write_admin" ON allocations FOR ALL USING (is_admin());
