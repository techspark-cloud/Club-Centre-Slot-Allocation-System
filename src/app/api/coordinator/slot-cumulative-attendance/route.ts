import { NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    const { searchParams } = new URL(request.url);
    const slot_id = searchParams.get('slot_id');

    if (!slot_id) {
      return NextResponse.json({ error: 'Missing slot_id parameter' }, { status: 400 });
    }

    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1. Fetch Slot Details
    const { data: slot } = await supabaseAdmin
      .from('slots')
      .select('id, day, session, venue, start_time, end_time, club_id, centre_id')
      .eq('id', slot_id)
      .single();

    if (!slot) {
      return NextResponse.json({ error: 'Slot not found' }, { status: 404 });
    }

    // 2. Fetch all enrolled allocations (students) for this slot
    const { data: allocations } = await supabaseAdmin
      .from('allocations')
      .select(`
        id,
        student:students (
          id, name, register_no, course, section, academic_year, contact_no, hosteler
        )
      `)
      .eq('slot_id', slot_id);

    const enrolledStudents = (allocations || [])
      .map(a => a.student)
      .filter(Boolean)
      .sort((a, b) => (a.register_no || '').localeCompare(b.register_no || ''));

    // 3. Fetch all attendance records for this slot
    const { data: allAttendance } = await supabaseAdmin
      .from('attendance')
      .select('date, student_id, status')
      .eq('slot_id', slot_id);

    const uniqueDates = Array.from(new Set((allAttendance || []).map(a => a.date))).sort();
    const totalConducted = uniqueDates.length;

    // 4. Calculate cumulative statistics per student
    const studentCumulativeList = enrolledStudents.map(student => {
      const studentRecords = (allAttendance || []).filter(a => a.student_id === student.id);
      const presentCount = studentRecords.filter(a => a.status === 'PRESENT').length;
      const absentCount = studentRecords.filter(a => a.status === 'ABSENT').length;
      const unmarkedCount = Math.max(0, totalConducted - (presentCount + absentCount));
      const percentage = totalConducted > 0 ? Math.round((presentCount / totalConducted) * 100) : 0;

      let riskCategory: 'GOOD_STANDING' | 'WARNING' | 'DEFAULTER' = 'GOOD_STANDING';
      if (totalConducted > 0) {
        if (percentage < 75) {
          riskCategory = 'DEFAULTER';
        } else if (percentage < 85) {
          riskCategory = 'WARNING';
        }
      }

      return {
        student,
        totalConducted,
        presentCount,
        absentCount,
        unmarkedCount,
        percentage,
        riskCategory
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        slot,
        totalConducted,
        uniqueDates,
        students: studentCumulativeList
      }
    });

  } catch (err: any) {
    console.error('Cumulative Attendance API Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
