import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  const today = new Date().toISOString().split('T')[0];
  console.log('Today is:', today);

  // Find biotech students
  const { data: students } = await supabase.from('students').select('id, name, course').ilike('course', '%Biotech%');
  if (!students || students.length === 0) {
    console.log('No biotech students found');
    return;
  }
  const studentIds = students.map(s => s.id);
  console.log('Found', studentIds.length, 'biotech students');

  // Check their attendance today
  const { data: attendance } = await supabase.from('attendance')
    .select('*, slots(day, session, venue, clubs(name), centres(name))')
    .in('student_id', studentIds)
    .eq('date', today);
    
  console.log('Attendance records today for Biotech students:', attendance?.length);
  if (attendance && attendance.length > 0) {
    console.dir(attendance, { depth: null });
  }

  // Also check allocations for these students
  const { data: allocations } = await supabase.from('allocations')
    .select('*, slots(day, session, venue, clubs(name), centres(name))')
    .in('student_id', studentIds);
  console.log('Total allocations for biotech students:', allocations?.length);
  if (allocations && allocations.length > 0) {
    console.dir(allocations, { depth: null });
  }
}

main();
