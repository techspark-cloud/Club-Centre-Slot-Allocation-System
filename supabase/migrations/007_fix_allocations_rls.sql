-- Drop the broken allocations_select policy that references non-existent columns
DROP POLICY IF EXISTS "allocations_select" ON allocations;

-- Recreate it without the broken club_id/centre_id column references
CREATE POLICY "allocations_select" ON allocations
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM students WHERE id = allocations.student_id AND auth_user_id = auth.uid())
    OR is_admin()
    OR get_user_role() IN ('CLUB_COORDINATOR', 'CENTRE_COORDINATOR')
  );
