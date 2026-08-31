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

export async function getMonthlyDepartmentReportData(monthPrefix: string, department: string) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // 1. Fetch students in the department
  const { data: students, error: studentError } = await supabaseAdmin
    .from('students')
    .select('id, name, register_no, course, section')
    .eq('course', department)
    .order('section')
    .order('register_no');

  if (studentError || !students) {
    console.error('Error fetching students:', studentError);
    return [];
  }

  const studentIds = students.map((s: any) => s.id);

  // 2. Fetch attendance for this month
  const { data: attendanceData, error: attError } = await supabaseAdmin
    .from('attendance')
    .select('student_id, status, slots(club_id, centre_id)')
    .gte('date', `${monthPrefix}-01`)
    .lte('date', `${monthPrefix}-31`);

  if (attError) {
    console.error('Error fetching attendance:', attError);
    return [];
  }

  // Filter attendance for the students in this department
  const relevantAttendance = (attendanceData || []).filter((r: any) => studentIds.includes(r.student_id));

  // 3. Process stats per student
  const studentStatsMap = new Map();
  students.forEach((s: any) => {
    studentStatsMap.set(s.id, {
      ...s,
      clubTotal: 0,
      clubPresent: 0,
      centreTotal: 0,
      centrePresent: 0,
      overallTotal: 0,
      overallPresent: 0
    });
  });

  relevantAttendance.forEach((record: any) => {
    const stat = studentStatsMap.get(record.student_id);
    if (!stat) return;

    const isPresent = record.status === 'PRESENT';
    const type = record.slots?.club_id ? 'CLUB' : (record.slots?.centre_id ? 'CENTRE' : null);

    if (type === 'CLUB') {
      stat.clubTotal++;
      if (isPresent) stat.clubPresent++;
    } else if (type === 'CENTRE') {
      stat.centreTotal++;
      if (isPresent) stat.centrePresent++;
    }

    stat.overallTotal++;
    if (isPresent) stat.overallPresent++;
  });

  return Array.from(studentStatsMap.values());
}

export async function getUniqueDepartments() {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data, error } = await supabaseAdmin
    .from('students')
    .select('course');
    
  if (error || !data) {
    console.error('Error fetching departments:', error);
    return [];
  }
  
  // Extract unique sorted courses
  const uniqueCourses = [...new Set(data.map((s: any) => s.course))].filter(Boolean).sort();
  return uniqueCourses as string[];
}

export async function getUniqueSections(department: string) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data, error } = await supabaseAdmin
    .from('students')
    .select('section')
    .eq('course', department);
    
  if (error || !data) return [];
  
  return [...new Set(data.map((s: any) => s.section))].filter(Boolean).sort() as string[];
}

export async function getAllActivities() {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const [clubsRes, centresRes] = await Promise.all([
    supabaseAdmin.from('clubs').select('id, name'),
    supabaseAdmin.from('centres').select('id, name')
  ]);

  const clubs = (clubsRes.data || []).map(c => ({ id: c.id, name: c.name, type: 'CLUB' }));
  const centres = (centresRes.data || []).map(c => ({ id: c.id, name: c.name, type: 'CENTRE' }));

  return [...clubs, ...centres].sort((a, b) => a.name.localeCompare(b.name));
}

export async function getAdvancedReportData(filters: {
  startDate: string;
  endDate: string;
  department: string;
  section: string;
  activityId: string; // 'ALL' or specific club/centre ID
  deficitOnly: boolean;
  searchQuery?: string;
}) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // 1. Build Student Query
  let studentQuery = supabaseAdmin.from('students').select('id, name, register_no, course, section');
  if (filters.department !== 'ALL') {
    studentQuery = studentQuery.eq('course', filters.department);
  }
  if (filters.section !== 'ALL') {
    studentQuery = studentQuery.eq('section', filters.section);
  }
  if (filters.searchQuery && filters.searchQuery.trim() !== '') {
    studentQuery = studentQuery.ilike('register_no', `%${filters.searchQuery.trim()}%`);
  }
  studentQuery = studentQuery.order('section').order('register_no');

  const { data: students, error: studentError } = await studentQuery;
  if (studentError || !students) return [];

  const studentIds = students.map((s: any) => s.id);
  if (studentIds.length === 0) return [];

  // 2. Fetch Attendance within Date Range
  // We fetch slots data directly inside the attendance query
  let attQuery = supabaseAdmin
    .from('attendance')
    .select('student_id, status, slots!inner(club_id, centre_id)')
    .gte('date', filters.startDate)
    .lte('date', filters.endDate);

  // If a specific activity is selected, we filter by it via the slots table
  if (filters.activityId !== 'ALL') {
    attQuery = attQuery.or(`club_id.eq.${filters.activityId},centre_id.eq.${filters.activityId}`, { foreignTable: 'slots' });
  }

  const { data: attendanceData, error: attError } = await attQuery;
  if (attError) return [];

  // 3. Process Stats
  const relevantAttendance = (attendanceData || []).filter((r: any) => studentIds.includes(r.student_id));
  const studentStatsMap = new Map();
  
  students.forEach((s: any) => {
    studentStatsMap.set(s.id, {
      ...s,
      clubTotal: 0, clubPresent: 0,
      centreTotal: 0, centrePresent: 0,
      overallTotal: 0, overallPresent: 0
    });
  });

  relevantAttendance.forEach((record: any) => {
    const stat = studentStatsMap.get(record.student_id);
    if (!stat) return;

    const isPresent = record.status === 'PRESENT';
    const type = record.slots?.club_id ? 'CLUB' : (record.slots?.centre_id ? 'CENTRE' : null);

    if (type === 'CLUB') {
      stat.clubTotal++;
      if (isPresent) stat.clubPresent++;
    } else if (type === 'CENTRE') {
      stat.centreTotal++;
      if (isPresent) stat.centrePresent++;
    }

    stat.overallTotal++;
    if (isPresent) stat.overallPresent++;
  });

  let results = Array.from(studentStatsMap.values());

  // 4. Apply Deficit Filter (< 75% overall attendance)
  if (filters.deficitOnly) {
    results = results.filter(stat => {
      if (stat.overallTotal === 0) return false; 
      const pct = (stat.overallPresent / stat.overallTotal) * 100;
      return pct < 75;
    });
  }

  return results;
}

