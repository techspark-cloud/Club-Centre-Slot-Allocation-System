import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const supabase = await createClient();

  // 1. Verify caller is an admin
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || !['SUPER_ADMIN', 'ALLOCATION_ADMIN'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // 2. Fetch all students who have submitted preferences but are unallocated
  const { data: students, error: studentError } = await supabase
    .from('students')
    .select('id, activity_session')
    .eq('status', 'PREFERENCES_SUBMITTED');

  if (studentError) {
    return NextResponse.json({ error: studentError.message }, { status: 500 });
  }

  if (!students || students.length === 0) {
    return NextResponse.json({ allocatedCount: 0, message: 'No students ready for allocation.' });
  }

  let allocatedCount = 0;

  // 3. Process each student via the Postgres RPC function which uses row-level locking
  for (const student of students) {
    const { data: result, error: rpcError } = await supabase.rpc('allocate_student', {
      p_student_id: student.id,
      p_session: student.activity_session
    });

    if (rpcError) {
      console.error(`Error allocating student ${student.id}:`, rpcError);
      continue;
    }

    if (result) {
      allocatedCount++;
    }
  }

  return NextResponse.json({ allocatedCount });
}
