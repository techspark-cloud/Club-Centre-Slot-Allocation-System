import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    
    // Parse filter params
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const department = searchParams.get('department');
    const entityType = searchParams.get('entityType'); // CLUB | CENTRE | ALL
    const session = searchParams.get('session'); // FORENOON | AFTERNOON | ALL

    // 1. Fetch all core data in parallel
    const [
      { data: clubs },
      { data: centres },
      { data: rawSlots }
    ] = await Promise.all([
      supabase.from('clubs').select('id, name, faculty_name'),
      supabase.from('centres').select('id, name, faculty_name'),
      supabase.from('slots').select('id, day, session, venue, capacity, allocated_count, club_id, centre_id')
    ]);

    // Apply filters to slots immediately
    let allSlots = rawSlots || [];
    if (entityType && entityType !== 'ALL') {
      allSlots = allSlots.filter(s => entityType === 'CLUB' ? s.club_id : s.centre_id);
    }
    if (session && session !== 'ALL') {
      allSlots = allSlots.filter(s => s.session === session);
    }

    // 2. Fetch students with allocations (paginated for large datasets)
    let allStudents: any[] = [];
    let from = 0;
    const limit = 1000;
    let keepFetching = true;
    while (keepFetching) {
      const { data: batch } = await supabase
        .from('students')
        .select('id, course, section, semester, allocations(id, slot_id)')
        .range(from, from + limit - 1);
      if (batch && batch.length > 0) {
        allStudents = allStudents.concat(batch);
        from += limit;
        if (batch.length < limit) keepFetching = false;
      } else {
        keepFetching = false;
      }
    }

    // 3. Fetch attendance data within date range
    const today = new Date();
    const defaultFrom = new Date(today);
    defaultFrom.setDate(defaultFrom.getDate() - 30);
    const effectiveDateFrom = dateFrom || defaultFrom.toISOString().split('T')[0];
    const effectiveDateTo = dateTo || today.toISOString().split('T')[0];

    // Generate all dates in range for trend
    const allDatesInRange: string[] = [];
    const dStart = new Date(effectiveDateFrom);
    const dEnd = new Date(effectiveDateTo);
    for (let d = new Date(dStart); d <= dEnd; d.setDate(d.getDate() + 1)) {
      allDatesInRange.push(d.toISOString().split('T')[0]);
    }

    let attendanceQuery = supabase
      .from('attendance')
      .select('date, status, student_id, slot_id, slots(club_id, centre_id)')
      .gte('date', effectiveDateFrom)
      .lte('date', effectiveDateTo);

    const { data: attendanceData } = await attendanceQuery;

    // 4. Build lookup maps
    const clubMap: Record<string, any> = {};
    clubs?.forEach(c => { clubMap[c.id] = c; });
    const centreMap: Record<string, any> = {};
    centres?.forEach(c => { centreMap[c.id] = c; });
    const slotMap: Record<string, any> = {};
    allSlots?.forEach(s => { slotMap[s.id] = s; });

    // 5. Department statistics
    const deptStats: Record<string, { total: number, allocated: number }> = {};
    allStudents.forEach(s => {
      const dept = s.course || 'Unknown';
      if (!deptStats[dept]) deptStats[dept] = { total: 0, allocated: 0 };
      
      // Apply department filter
      if (department && department !== 'ALL' && dept !== department) return;
      
      deptStats[dept].total++;
      if (s.allocations && s.allocations.length > 0) deptStats[dept].allocated++;
    });

    // If department filter is applied, re-aggregate without the filter for dropdown options
    const allDepartments = [...new Set(allStudents.map(s => s.course || 'Unknown'))].sort();
    
    const departmentStats = Object.keys(deptStats).map(dept => ({
      name: dept,
      total: deptStats[dept].total,
      allocated: deptStats[dept].allocated,
      unallocated: deptStats[dept].total - deptStats[dept].allocated,
      rate: deptStats[dept].total > 0 ? Math.round((deptStats[dept].allocated / deptStats[dept].total) * 100) : 0
    })).sort((a, b) => b.total - a.total);

    // 6. Attendance analytics with filters
    const attendanceByDate: Record<string, { present: number, absent: number, total: number }> = {};
    allDatesInRange.forEach(d => attendanceByDate[d] = { present: 0, absent: 0, total: 0 });

    // Per-entity attendance tracking
    const entityAttendance: Record<string, { name: string, type: string, present: number, total: number, faculty: string }> = {};
    
    // Per-department attendance tracking
    const deptAttendance: Record<string, { present: number, total: number }> = {};

    let totalPresent = 0;
    let totalMarked = 0;
    let clubPresent = 0, clubTotal = 0, centrePresent = 0, centreTotal = 0;

    // Build student->department lookup
    const studentDeptMap: Record<string, string> = {};
    allStudents.forEach(s => { studentDeptMap[s.id] = s.course || 'Unknown'; });

    if (attendanceData) {
      attendanceData.forEach(record => {
        const slot = record.slots;
        if (!slot) return;

        // Apply entity type filter
        if (entityType && entityType !== 'ALL') {
          if (entityType === 'CLUB' && !slot.club_id) return;
          if (entityType === 'CENTRE' && !slot.centre_id) return;
        }

        // Apply session filter
        const slotInfo = slotMap[record.slot_id];
        if (session && session !== 'ALL' && slotInfo && slotInfo.session !== session) return;

        // Apply department filter on attendance
        const studentDept = studentDeptMap[record.student_id];
        if (department && department !== 'ALL' && studentDept !== department) return;

        // Date trend
        const d = record.date;
        if (attendanceByDate[d]) {
          attendanceByDate[d].total++;
          if (record.status === 'PRESENT') {
            attendanceByDate[d].present++;
          } else {
            attendanceByDate[d].absent++;
          }
        }

        totalMarked++;
        if (record.status === 'PRESENT') totalPresent++;

        // Club vs Centre
        if (slot.club_id) {
          clubTotal++;
          if (record.status === 'PRESENT') clubPresent++;
          
          // Per-entity
          const club = clubMap[slot.club_id];
          if (club) {
            const key = `club_${slot.club_id}`;
            if (!entityAttendance[key]) entityAttendance[key] = { name: club.name, type: 'CLUB', present: 0, total: 0, faculty: club.faculty_name || '' };
            entityAttendance[key].total++;
            if (record.status === 'PRESENT') entityAttendance[key].present++;
          }
        } else if (slot.centre_id) {
          centreTotal++;
          if (record.status === 'PRESENT') centrePresent++;

          const centre = centreMap[slot.centre_id];
          if (centre) {
            const key = `centre_${slot.centre_id}`;
            if (!entityAttendance[key]) entityAttendance[key] = { name: centre.name, type: 'CENTRE', present: 0, total: 0, faculty: centre.faculty_name || '' };
            entityAttendance[key].total++;
            if (record.status === 'PRESENT') entityAttendance[key].present++;
          }
        }

        // Department attendance
        if (studentDept) {
          if (!deptAttendance[studentDept]) deptAttendance[studentDept] = { present: 0, total: 0 };
          deptAttendance[studentDept].total++;
          if (record.status === 'PRESENT') deptAttendance[studentDept].present++;
        }
      });
    }

    // 7. Build trend data (only include days that actually had slots/attendance)
    const trendData = allDatesInRange.map(date => {
      const stats = attendanceByDate[date];
      if (stats.total === 0) return null;
      const rate = Math.round((stats.present / stats.total) * 100);
      return {
        date: new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
        rawDate: date,
        present: stats.present,
        absent: stats.absent,
        total: stats.total,
        rate
      };
    }).filter(Boolean);

    // 8. Entity leaderboard
    const entityLeaderboard = Object.values(entityAttendance)
      .map(e => ({
        ...e,
        rate: e.total > 0 ? Math.round((e.present / e.total) * 100) : 0
      }))
      .sort((a, b) => b.rate - a.rate);

    const topPerformers = entityLeaderboard.slice(0, 5);
    const bottomPerformers = entityLeaderboard.filter(e => e.total > 0).sort((a, b) => a.rate - b.rate).slice(0, 5);

    // 9. Department attendance breakdown
    const departmentAttendance = Object.keys(deptAttendance).map(dept => ({
      name: dept,
      present: deptAttendance[dept].present,
      total: deptAttendance[dept].total,
      rate: deptAttendance[dept].total > 0 ? Math.round((deptAttendance[dept].present / deptAttendance[dept].total) * 100) : 0
    })).sort((a, b) => b.rate - a.rate);

    // 10. Today's schedule
    const daysOfWeek = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
    const todayDayOfWeek = daysOfWeek[today.getDay()];
    
    let scheduleQuery = supabase
      .from('slots')
      .select('id, session, venue, day, clubs(name, faculty_name), centres(name, faculty_name)')
      .eq('day', todayDayOfWeek);

    const { data: todaysScheduleData } = await scheduleQuery;
    
    let todaySchedule = todaysScheduleData?.map(slot => ({
      id: slot.id,
      session: slot.session,
      venue: slot.venue,
      entityName: slot.clubs ? slot.clubs.name : slot.centres?.name,
      coordinator: slot.clubs ? slot.clubs.faculty_name : slot.centres?.faculty_name,
      type: slot.clubs ? 'CLUB' : 'CENTRE'
    })).sort((a, b) => (a.session || '').localeCompare(b.session || '')) || [];

    // Apply entity type filter on schedule
    if (entityType && entityType !== 'ALL') {
      todaySchedule = todaySchedule.filter(s => s.type === entityType);
    }
    // Apply session filter on schedule
    if (session && session !== 'ALL') {
      todaySchedule = todaySchedule.filter(s => s.session === session);
    }

    // 11. Venue Utilization Breakdown
    const venueStats: Record<string, { venue: string, totalCapacity: number, allocated: number, slotCount: number, entities: string[] }> = {};
    (allSlots || []).forEach(slot => {
      const venueName = slot.venue || 'Unassigned';
      if (!venueStats[venueName]) venueStats[venueName] = { venue: venueName, totalCapacity: 0, allocated: 0, slotCount: 0, entities: [] };
      venueStats[venueName].totalCapacity += slot.capacity || 0;
      venueStats[venueName].allocated += slot.allocated_count || 0;
      venueStats[venueName].slotCount++;
      
      // Get entity name for this slot
      const entityName = slot.club_id ? clubMap[slot.club_id]?.name : slot.centre_id ? centreMap[slot.centre_id]?.name : null;
      if (entityName && !venueStats[venueName].entities.includes(entityName)) {
        venueStats[venueName].entities.push(entityName);
      }
    });
    
    const venueUtilization = Object.values(venueStats)
      .map(v => ({
        ...v,
        utilization: v.totalCapacity > 0 ? Math.round((v.allocated / v.totalCapacity) * 100) : 0
      }))
      .sort((a, b) => b.utilization - a.utilization);

    // 12. Total seat capacity vs allocated
    const totalSeatCapacity = (allSlots || []).reduce((sum, s) => sum + (s.capacity || 0), 0);
    const totalSeatsAllocated = (allSlots || []).reduce((sum, s) => sum + (s.allocated_count || 0), 0);

    // 13. Compute summary KPIs
    const overallRate = totalMarked > 0 ? Math.round((totalPresent / totalMarked) * 100) : 0;
    const totalStudents = allStudents.length;
    
    // Calculate total allocated (unique students for the selected department)
    const allocatedStudentIds = new Set<string>();
    allStudents.forEach(s => {
      const studentDept = studentDeptMap[s.id];
      if (department && department !== 'ALL' && studentDept !== department) return;
      
      if (s.allocations && s.allocations.length > 0) {
        // Only count if they are allocated to one of the filtered slots
        let hasValidAllocation = false;
        s.allocations.forEach((a: any) => {
          if (slotMap[a.slot_id]) hasValidAllocation = true;
        });
        if (hasValidAllocation) allocatedStudentIds.add(s.id);
      }
    });
    const totalAllocated = allocatedStudentIds.size;

    // Today's footfall
    const todayStr = today.toISOString().split('T')[0];
    const todayData = attendanceByDate[todayStr] || { present: 0, total: 0 };
    
    // Expected today (unique students expected in filtered slots today)
    const todaysSlotIds = allSlots.filter(s => s.day === todayDayOfWeek).map(s => s.id);
    let expectedToday = 0;
    allStudents.forEach(s => {
      const studentDept = studentDeptMap[s.id];
      if (department && department !== 'ALL' && studentDept !== department) return;
      
      let isExpected = false;
      if (s.allocations) {
        s.allocations.forEach((a: any) => {
          if (todaysSlotIds.includes(a.slot_id)) isExpected = true;
        });
      }
      if (isExpected) expectedToday++;
    });

    // Venue utilization (how many venues are in use today)
    const activeVenues = new Set(todaySchedule.map(s => s.venue).filter(Boolean));

    // 14. Session breakdown
    const forenoonSlots = (allSlots || []).filter(s => s.session === 'FORENOON');
    const afternoonSlots = (allSlots || []).filter(s => s.session === 'AFTERNOON');
    const sessionBreakdown = {
      forenoon: { 
        slots: forenoonSlots.length, 
        capacity: forenoonSlots.reduce((s, sl) => s + (sl.capacity || 0), 0),
        allocated: forenoonSlots.reduce((s, sl) => s + (sl.allocated_count || 0), 0)
      },
      afternoon: { 
        slots: afternoonSlots.length, 
        capacity: afternoonSlots.reduce((s, sl) => s + (sl.capacity || 0), 0),
        allocated: afternoonSlots.reduce((s, sl) => s + (sl.allocated_count || 0), 0)
      }
    };

    return NextResponse.json({
      success: true,
      data: {
        // Filters metadata
        filters: {
          allDepartments,
          dateRange: { from: effectiveDateFrom, to: effectiveDateTo }
        },
        // Summary KPIs
        kpis: {
          overallAttendanceRate: overallRate,
          totalStudents,
          totalAllocated,
          unallocated: totalStudents - totalAllocated,
          activeEntities: (clubs?.length || 0) + (centres?.length || 0),
          activeVenues: activeVenues.size,
          totalClubs: clubs?.length || 0,
          totalCentres: centres?.length || 0,
          totalPresent,
          totalMarked,
          clubRate: clubTotal > 0 ? Math.round((clubPresent / clubTotal) * 100) : 0,
          centreRate: centreTotal > 0 ? Math.round((centrePresent / centreTotal) * 100) : 0,
          todaysFootfall: { expected: expectedToday, present: todayData.present },
          totalSeatCapacity,
          totalSeatsAllocated,
          seatUtilization: totalSeatCapacity > 0 ? Math.round((totalSeatsAllocated / totalSeatCapacity) * 100) : 0
        },
        // Charts
        trendData,
        departmentStats,
        departmentAttendance,
        topPerformers,
        bottomPerformers,
        todaySchedule,
        venueUtilization,
        sessionBreakdown,
        performanceComparison: [
          { name: 'Clubs', rate: clubTotal > 0 ? Math.round((clubPresent / clubTotal) * 100) : 0, present: clubPresent, total: clubTotal },
          { name: 'Centres', rate: centreTotal > 0 ? Math.round((centrePresent / centreTotal) * 100) : 0, present: centrePresent, total: centreTotal }
        ]
      }
    });

  } catch (error: any) {
    console.error("Executive Stats Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
