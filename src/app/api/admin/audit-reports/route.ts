import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function formatTimeRange(startTime?: string, endTime?: string, session?: string) {
  if (startTime && endTime) {
    const formatTime = (t: string) => {
      const parts = t.split(':');
      const h = parseInt(parts[0], 10);
      const m = parts[1] || '00';
      const ampm = h >= 12 ? 'PM' : 'AM';
      const hour12 = h % 12 || 12;
      return `${hour12.toString().padStart(2, '0')}:${m} ${ampm}`;
    };
    return `${formatTime(startTime)} - ${formatTime(endTime)}`;
  }
  if (session === 'FORENOON') return '08:00 AM - 09:40 AM';
  if (session === 'AFTERNOON') return '01:10 PM - 03:40 PM';
  return 'N/A';
}

export async function GET() {
  const GAS_URL = "https://script.google.com/macros/s/AKfycbzCt4gzTXrlASBm-fV26GSMPLHprdA5hvNwTH4Ko6NugcxnyB1dX_GSbaz-zLk80zq6/exec";
  
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    // 1. Fetch submitted reports from Google Apps Script
    const gasRes = await fetch(GAS_URL, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });

    let submittedReports: any[] = [];
    if (gasRes.ok) {
      const gasData = await gasRes.json();
      if (gasData.success && Array.isArray(gasData.data)) {
        submittedReports = gasData.data;
      }
    }

    // Map submitted reports by key: slotId_date or entityName_session_date
    const submittedMap = new Map<string, any>();
    submittedReports.forEach((r: any) => {
      const rDateStr = r.date ? new Date(r.date).toISOString().split('T')[0] : '';
      if (r.slotId && rDateStr) {
        submittedMap.set(`${r.slotId}_${rDateStr}`, r);
      }
      if (r.entityName && r.session && rDateStr) {
        submittedMap.set(`${r.entityName}_${r.session}_${rDateStr}`, r);
      }
    });

    // 2. Fetch all active timetable slots from Supabase
    const { data: slots, error: slotsError } = await supabaseAdmin
      .from('slots')
      .select('id, day, session, start_time, end_time, venue, allocated_count, capacity, club:clubs(name), centre:centres(name)')
      .eq('status', 'ACTIVE');

    if (slotsError) {
      console.error("Slots Fetch Error:", slotsError);
    }

    // Determine audit start date (earliest report date or default to Aug 3, 2026)
    const reportDates = submittedReports
      .map(r => r.date ? new Date(r.date).getTime() : null)
      .filter((t): t is number => t !== null && !isNaN(t))
      .sort((a, b) => a - b);

    const startDate = reportDates.length > 0 ? new Date(reportDates[0]) : new Date('2026-08-03');
    const endDate = new Date(); // Today

    const dayNames = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
    const allAuditEntries: any[] = [];

    // Loop day by day from startDate to Today
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dayName = dayNames[d.getDay()];
      if (dayName === 'SATURDAY' || dayName === 'SUNDAY') continue;

      const dateISO = d.toISOString().split('T')[0];

      // Find slots scheduled on this dayName
      const daySlots = (slots || []).filter((s: any) => s.day === dayName);

      daySlots.forEach((s: any) => {
        const entityName = s.club?.name || s.centre?.name;
        if (!entityName) return;

        const timing = formatTimeRange(s.start_time, s.end_time, s.session);
        const subReport = submittedMap.get(`${s.id}_${dateISO}`) || submittedMap.get(`${entityName}_${s.session}_${dateISO}`);

        if (subReport) {
          allAuditEntries.push({
            ...subReport,
            date: dateISO,
            day: dayName,
            timing: timing,
            submitted: true,
            status: 'SUBMITTED'
          });
        } else {
          allAuditEntries.push({
            timestamp: new Date(dateISO).toISOString(),
            slotId: s.id,
            date: dateISO,
            day: dayName,
            session: s.session,
            timing: timing,
            venue: s.venue,
            entityName: entityName,
            coordinatorName: 'Not Uploaded',
            expected: s.allocated_count || s.capacity || 0,
            present: 0,
            description: '⚠️ Attendance Not Marked / Activity Report Not Submitted by Coordinator',
            imageUrl: '',
            submitted: false,
            status: 'NOT_SUBMITTED'
          });
        }
      });
    }

    // Sort audit entries by date descending
    allAuditEntries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return NextResponse.json({
      success: true,
      data: allAuditEntries,
      summary: {
        totalEntries: allAuditEntries.length,
        totalSubmitted: allAuditEntries.filter(e => e.submitted).length,
        totalMissing: allAuditEntries.filter(e => !e.submitted).length
      }
    });

  } catch (error: any) {
    console.error("Audit Report API Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch audit reports' },
      { status: 500 }
    );
  }
}
