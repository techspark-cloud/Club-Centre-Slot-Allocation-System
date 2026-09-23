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

async function fetchAllStudentsPaginated(
  supabaseAdmin: any,
  options: {
    department?: string;
    section?: string;
    searchQuery?: string;
  }
) {
  let allStudents: any[] = [];
  let from = 0;
  const pageSize = 1000;

  while (true) {
    let query = supabaseAdmin
      .from('students')
      .select('id, name, register_no, course, section');

    if (options.department && options.department !== 'ALL') {
      query = query.eq('course', options.department);
    }
    if (options.section && options.section !== 'ALL') {
      query = query.eq('section', options.section);
    }
    if (options.searchQuery && options.searchQuery.trim() !== '') {
      query = query.ilike('register_no', `%${options.searchQuery.trim()}%`);
    }

    query = query.order('section').order('register_no');

    const { data, error } = await query.range(from, from + pageSize - 1);
    if (error) {
      console.error('Error fetching students page:', error);
      break;
    }
    if (!data || data.length === 0) break;

    allStudents.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
  }

  return allStudents;
}

async function fetchAttendanceForStudentsChunked(
  supabaseAdmin: any,
  studentIds: string[],
  startDate: string,
  endDate: string,
  activityId?: string
) {
  if (studentIds.length === 0) return [];

  const chunkSize = 200;
  const chunks: string[][] = [];
  for (let i = 0; i < studentIds.length; i += chunkSize) {
    chunks.push(studentIds.slice(i, i + chunkSize));
  }

  const results = await Promise.all(
    chunks.map(async (chunk) => {
      let records: any[] = [];
      let from = 0;
      const pageSize = 1000;

      while (true) {
        let query = supabaseAdmin
          .from('attendance')
          .select('student_id, status, slots!inner(club_id, centre_id)')
          .in('student_id', chunk)
          .gte('date', startDate)
          .lte('date', endDate);

        if (activityId && activityId !== 'ALL') {
          query = query.or(`club_id.eq.${activityId},centre_id.eq.${activityId}`, { foreignTable: 'slots' });
        }

        const { data, error } = await query.range(from, from + pageSize - 1);
        if (error) {
          console.error('Error fetching attendance chunk:', error);
          break;
        }
        if (!data || data.length === 0) break;

        records.push(...data);
        if (data.length < pageSize) break;
        from += pageSize;
      }
      return records;
    })
  );

  return results.flat();
}

export async function getLiveAttendanceStats(date: string) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  let allocations: any[] = [];
  let from = 0;
  const pageSize = 1000;

  while (true) {
    const { data: allocPage, error: allocError } = await supabaseAdmin
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
      `)
      .range(from, from + pageSize - 1);

    if (allocError) {
      console.error('Error fetching allocations for stats:', allocError);
      break;
    }
    if (!allocPage || allocPage.length === 0) break;
    allocations.push(...allocPage);
    if (allocPage.length < pageSize) break;
    from += pageSize;
  }

  let attendance: any[] = [];
  let attFrom = 0;
  while (true) {
    const { data: attPage, error: attError } = await supabaseAdmin
      .from('attendance')
      .select('*')
      .eq('date', date)
      .range(attFrom, attFrom + pageSize - 1);

    if (attError) {
      console.error('Error fetching attendance for stats:', attError);
      break;
    }
    if (!attPage || attPage.length === 0) break;
    attendance.push(...attPage);
    if (attPage.length < pageSize) break;
    attFrom += pageSize;
  }

  const slotStats = new Map();

  allocations.forEach((alloc: any) => {
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

  attendance.forEach((record: any) => {
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

  // 1. Fetch all students in the department with pagination
  const students = await fetchAllStudentsPaginated(supabaseAdmin, { department });
  if (!students || students.length === 0) return [];

  const studentIds = students.map((s: any) => s.id);

  // 2. Fetch all attendance records for these students in this month
  const startDate = `${monthPrefix}-01`;
  const endDate = `${monthPrefix}-31`;
  const relevantAttendance = await fetchAttendanceForStudentsChunked(supabaseAdmin, studentIds, startDate, endDate);

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

  let allCourses: string[] = [];
  let from = 0;
  const pageSize = 1000;

  while (true) {
    const { data, error } = await supabaseAdmin
      .from('students')
      .select('course')
      .range(from, from + pageSize - 1);

    if (error || !data || data.length === 0) break;
    allCourses.push(...data.map((s: any) => s.course));
    if (data.length < pageSize) break;
    from += pageSize;
  }

  // Extract unique sorted courses
  const uniqueCourses = [...new Set(allCourses)].filter(Boolean).sort();
  return uniqueCourses as string[];
}

export async function getUniqueSections(department: string) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  let allSections: string[] = [];
  let from = 0;
  const pageSize = 1000;

  while (true) {
    const { data, error } = await supabaseAdmin
      .from('students')
      .select('section')
      .eq('course', department)
      .range(from, from + pageSize - 1);

    if (error || !data || data.length === 0) break;
    allSections.push(...data.map((s: any) => s.section));
    if (data.length < pageSize) break;
    from += pageSize;
  }

  return [...new Set(allSections)].filter(Boolean).sort() as string[];
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

  // 1. Fetch all students matching filters with full pagination
  const students = await fetchAllStudentsPaginated(supabaseAdmin, {
    department: filters.department,
    section: filters.section,
    searchQuery: filters.searchQuery
  });

  if (!students || students.length === 0) return [];

  const studentIds = students.map((s: any) => s.id);

  // 2. Fetch all attendance records within date range for these students
  const relevantAttendance = await fetchAttendanceForStudentsChunked(
    supabaseAdmin,
    studentIds,
    filters.startDate,
    filters.endDate,
    filters.activityId
  );

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

