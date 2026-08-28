'use server';

import { createClient } from '@supabase/supabase-js';

// Use service role key to bypass RLS for administrative updates


export async function markAttendance(
  slotId: string, 
  date: string, 
  records: { student_id: string; status: 'PRESENT' | 'ABSENT' }[],
  coordinatorId: string
) {
  const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

  if (!records || records.length === 0) return { success: true };

  const upsertData = records.map(record => ({
    slot_id: slotId,
    student_id: record.student_id,
    date: date,
    status: record.status,
    recorded_by: coordinatorId
  }));

  const studentIds = records.map(r => r.student_id);
  
  await supabaseAdmin
    .from('attendance')
    .delete()
    .eq('slot_id', slotId)
    .eq('date', date)
    .in('student_id', studentIds);

  const { error } = await supabaseAdmin
    .from('attendance')
    .insert(upsertData);

  if (error) {
    console.error('Error marking attendance:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function markAttendanceByQR(
  slotId: string,
  date: string,
  studentId: string,
  coordinatorId: string
) {
  const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

  const { data: allocation, error: allocError } = await supabaseAdmin
    .from('allocations')
    .select('id')
    .eq('slot_id', slotId)
    .eq('student_id', studentId)
    .single();

  if (allocError || !allocation) {
    return { success: false, error: 'Student is not allocated to this slot' };
  }

  await supabaseAdmin
    .from('attendance')
    .delete()
    .eq('slot_id', slotId)
    .eq('date', date)
    .eq('student_id', studentId);

  const { error } = await supabaseAdmin
    .from('attendance')
    .insert({
      slot_id: slotId,
      student_id: studentId,
      date: date,
      status: 'PRESENT',
      recorded_by: coordinatorId
    });

  if (error) {
    console.error('Error marking QR attendance:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function getLiveAttendanceStats(date: string) {
  const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

  const { data: allocations, error: allocError } = await supabaseAdmin
    .from('allocations')
    .select(`
      student_id,
      slot_id,
      slot:slots!inner (
        id, club_id, centre_id, venue, start_time, end_time,
        clubs (name),
        centres (name)
      ),
      student:students (name, register_no)
    `);

  if (allocError) {
    console.error('Error fetching allocations for stats:', allocError);
    return [];
  }

  const { data: attendance, error: attError } = await supabaseAdmin
    .from('attendance')
    .select('*')
    .eq('date', date);

  if (attError) {
    console.error('Error fetching attendance for stats:', attError);
    return [];
  }

  const slotStats = new Map();

  allocations?.forEach((alloc: any) => {
    const slotId = alloc.slot_id;
    if (!slotStats.has(slotId)) {
      slotStats.set(slotId, {
        slot: alloc.slot,
        totalExpected: 0,
        present: 0,
        absent: 0,
        pending: 0
      });
    }
    slotStats.get(slotId).totalExpected += 1;
    slotStats.get(slotId).pending += 1;
  });

  attendance?.forEach((record: any) => {
    const stat = slotStats.get(record.slot_id);
    if (stat) {
      if (record.status === 'PRESENT') {
        stat.present += 1;
        stat.pending -= 1;
      } else if (record.status === 'ABSENT') {
        stat.absent += 1;
        stat.pending -= 1;
      }
    }
  });

  return Array.from(slotStats.values());
}

export async function getSlotAttendanceForDate(slotId: string, date: string) {
  const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

  const { data, error } = await supabaseAdmin
    .from('attendance')
    .select('student_id, status')
    .eq('slot_id', slotId)
    .eq('date', date);

  if (error) return [];
  return data;
}

export async function getPDFReportData(slotId: string, date: string) {
  const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

  // 1. Fetch allocated students
  const { data: allocations, error: allocError } = await supabaseAdmin
    .from('allocations')
    .select(`
      student:students (
        id, name, register_no, course, section
      )
    `)
    .eq('slot_id', slotId);

  if (allocError || !allocations) return { students: [], attendance: [] };

  const students = allocations.map(a => a.student).filter(Boolean).sort((a: any, b: any) => a.register_no.localeCompare(b.register_no));

  // 2. Fetch attendance
  const { data: attendance } = await supabaseAdmin
    .from('attendance')
    .select('student_id, status')
    .eq('slot_id', slotId)
    .eq('date', date);

  return { students, attendance: attendance || [] };
}
