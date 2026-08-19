-- ============================================================
-- Migration 003: Timetable Logic & Auth Mapping
-- ============================================================

-- Function to automatically assign activity_session to a student based on timetable_rules
CREATE OR REPLACE FUNCTION assign_student_session()
RETURNS TRIGGER AS $$
DECLARE
  v_session session_name;
BEGIN
  -- Look up the session based on course, semester, and section
  SELECT activity_session INTO v_session
  FROM timetable_rules
  WHERE course = NEW.course 
    AND semester = NEW.semester 
    AND section = NEW.section;
    
  IF v_session IS NOT NULL THEN
    NEW.activity_session := v_session;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_assign_student_session
  BEFORE INSERT OR UPDATE OF course, semester, section
  ON students
  FOR EACH ROW
  EXECUTE FUNCTION assign_student_session();

-- ============================================================
-- Allocation Engine Core Function
-- ============================================================

-- Safely allocates a student to an activity pair using Row Level Locking
CREATE OR REPLACE FUNCTION allocate_student(
  p_student_id UUID,
  p_activity_pair_id UUID,
  p_day day_name,
  p_session session_name,
  p_club_id UUID,
  p_centre_id UUID,
  p_allocation_source TEXT,
  p_preference_rank INTEGER,
  p_allocated_by UUID
)
RETURNS JSON AS $$
DECLARE
  v_capacity INTEGER;
  v_allocated_count INTEGER;
BEGIN
  -- 1. Check if student already allocated on this day
  IF EXISTS (SELECT 1 FROM allocations WHERE student_id = p_student_id AND day = p_day) THEN
    RETURN json_build_object('success', false, 'error', 'Student already allocated for this day');
  END IF;

  -- 2. Lock the activity pair row to prevent concurrent overallocation
  SELECT capacity, allocated_count 
  INTO v_capacity, v_allocated_count
  FROM activity_pairs 
  WHERE id = p_activity_pair_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Activity pair not found');
  END IF;

  -- 3. Check capacity
  IF v_allocated_count >= v_capacity THEN
    RETURN json_build_object('success', false, 'error', 'Capacity full');
  END IF;

  -- 4. Create allocation
  INSERT INTO allocations (
    student_id, activity_pair_id, day, session, club_id, centre_id, 
    allocation_source, preference_rank, allocated_by
  ) VALUES (
    p_student_id, p_activity_pair_id, p_day, p_session, p_club_id, p_centre_id,
    p_allocation_source, p_preference_rank, p_allocated_by
  );

  -- 5. Increment count
  UPDATE activity_pairs 
  SET allocated_count = allocated_count + 1 
  WHERE id = p_activity_pair_id;

  RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
