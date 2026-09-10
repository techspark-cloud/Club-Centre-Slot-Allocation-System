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
    const student_id = searchParams.get('student_id');
    const slot_id = searchParams.get('slot_id');

    if (!student_id || !slot_id) {
      return NextResponse.json({ error: 'Missing student_id or slot_id parameter' }, { status: 400 });
    }

    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1. Fetch Student Details
    const { data: student, error: studentErr } = await supabaseAdmin
      .from('students')
      .select('id, name, register_no, course, section, academic_year, contact_no, hosteler')
      .eq('id', student_id)
      .single();

    if (studentErr || !student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    // 2. Fetch Slot details
    const { data: slot } = await supabaseAdmin
      .from('slots')
      .select('id, day, session, venue, start_time, end_time, club_id, centre_id')
      .eq('id', slot_id)
      .single();

    // 3. Fetch all attendance records for this slot to count total sessions conducted
    const { data: allSlotAttendance } = await supabaseAdmin
      .from('attendance')
      .select('date, student_id, status')
      .eq('slot_id', slot_id);

    const uniqueDates = Array.from(new Set((allSlotAttendance || []).map(a => a.date))).sort();
    const totalSessions = uniqueDates.length;

    // 4. Fetch specific student's attendance records for this slot
    const studentRecords = (allSlotAttendance || []).filter(a => a.student_id === student_id);

    const presentCount = studentRecords.filter(a => a.status === 'PRESENT').length;
    const absentCount = studentRecords.filter(a => a.status === 'ABSENT').length;
    const unmarkedCount = Math.max(0, totalSessions - (presentCount + absentCount));
    const percentage = totalSessions > 0 ? Math.round((presentCount / totalSessions) * 100) : 0;

    const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];

    const history = uniqueDates.map(dateStr => {
      const record = studentRecords.find(a => a.date === dateStr);
      const dObj = new Date(dateStr);
      const dayName = days[dObj.getDay()] || 'N/A';

      return {
        date: dateStr,
        day: dayName,
        status: record ? record.status : 'UNMARKED',
        timing: slot ? `${slot.start_time.slice(0,5)} - ${slot.end_time.slice(0,5)}` : 'N/A',
        venue: slot?.venue || 'N/A'
      };
    }).reverse(); // Most recent dates first

    return NextResponse.json({
      success: true,
      data: {
        student,
        slot,
        totalSessions,
        presentCount,
        absentCount,
        unmarkedCount,
        percentage,
        history
      }
    });

  } catch (err: any) {
    console.error('Student Attendance Monitoring API Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
