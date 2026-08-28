import { NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';
import { HOD_EMAILS, FIRST_YEAR_HOD_EMAIL, VICE_PRINCIPAL_EMAIL, OVERALL_CLUBS_COORDINATOR_EMAIL, OVERALL_CENTRES_COORDINATOR_EMAIL } from '@/config/hod-emails';



export async function POST(request: Request) {
  const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

  try {
    const { date, session } = await request.json();

    if (!date || !session) {
      return NextResponse.json({ error: 'Date and session are required' }, { status: 400 });
    }

    // Verify auth and permissions
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: profile } = await supabaseAdmin.from('profiles').select('role').eq('id', user.id).single();
    if (!profile || !['SUPER_ADMIN', 'ALLOCATION_ADMIN', 'OVERALL_CLUB_COORDINATOR', 'OVERALL_CENTRE_COORDINATOR'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const requestDate = new Date(date);
    const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
    const targetDay = days[requestDate.getDay()];

    // 1. Fetch slots that match this targetDay and session
    const { data: slots, error: slotsError } = await supabaseAdmin
      .from('slots')
      .select('id, day, start_time, end_time, club_id, centre_id, clubs(name), centres(name)')
      .eq('day', targetDay)
      .eq('session', session);

    if (slotsError) throw slotsError;

    if (!slots || slots.length === 0) {
      return NextResponse.json({ error: `No slots are scheduled for ${targetDay} ${session}. Please select a different date or session.` }, { status: 404 });
    }

    const slotIds = slots.map(s => s.id);
    const slotMap = new Map(slots.map(s => [s.id, s]));

    // 2. Fetch all allocations (students assigned to these slots) WITH student info
    let allocations: any[] = [];
    let from = 0;
    const step = 1000;
    let hasMore = true;
    
    while (hasMore) {
      const { data: allocData, error: allocError } = await supabaseAdmin
        .from('allocations')
        .select(`
          student_id,
          slot_id,
          students (
            id,
            name,
            register_no,
            course,
            section
          )
        `)
        .in('slot_id', slotIds)
        .range(from, from + step - 1);

      if (allocError) throw allocError;
      
      if (allocData && allocData.length > 0) {
        allocations = [...allocations, ...allocData];
        from += step;
      }
      
      if (!allocData || allocData.length < step) {
        hasMore = false;
      }
    }

    if (allocations.length === 0) {
      return NextResponse.json({ error: 'No students are allocated to slots on this date and session.' }, { status: 404 });
    }

    // 3. Fetch attendance for these students on this specific date
    let allAttendance: any[] = [];
    let attFrom = 0;
    const attStep = 1000;
    let attHasMore = true;
    
    while (attHasMore) {
      const { data: attData, error: attError } = await supabaseAdmin
        .from('attendance')
        .select('student_id, slot_id, status')
        .eq('date', date)
        .range(attFrom, attFrom + attStep - 1);

      if (attError) throw attError;
      
      if (attData && attData.length > 0) {
        allAttendance = [...allAttendance, ...attData];
        attFrom += attStep;
      }
      
      if (!attData || attData.length < attStep) {
        attHasMore = false;
      }
    }

    // Map attendance for quick lookup: map key = `${student_id}_${slot_id}` -> status
    const attendanceMap = new Map();
    allAttendance.forEach(a => {
      attendanceMap.set(`${a.student_id}_${a.slot_id}`, a.status);
    });

    // 4. Group by Department
    const departmentBuckets: Record<string, any[]> = {};
    const firstYearBucket: any[] = [];

    allocations.forEach((alloc: any) => {
      const student = alloc.students;
      if (!student) return;

      const slotInfo = slotMap.get(alloc.slot_id);
      const entityName = slotInfo?.clubs?.name || slotInfo?.centres?.name || 'Unknown Entity';
      const attStatus = attendanceMap.get(`${student.id}_${alloc.slot_id}`) || 'UNMARKED';

      const record = {
        name: student.name,
        regNo: student.register_no,
        section: student.section || '-',
        entityName: entityName,
        status: attStatus
      };

      // Determine if 1st Year (We will skip this until we know how to identify them)
      // if (student.year === 1) {
      //   firstYearBucket.push(record);
      //   return;
      // }

      // Add to respective department bucket
      const dept = student.course || 'Unknown Department';
      if (!departmentBuckets[dept]) {
        departmentBuckets[dept] = [];
      }
      departmentBuckets[dept].push(record);
    });

    // 5. Generate Emails Payload
    const emailPayloads: any[] = [];

    // Helper to generate HTML table
    const generateHtmlTable = (records: any[], deptName: string) => {
      // Sort records alphabetically by Section, then alphanumerically by Register Number
      records.sort((a, b) => {
        const secA = a.section || '';
        const secB = b.section || '';
        if (secA < secB) return -1;
        if (secA > secB) return 1;
        
        const regA = a.regNo || '';
        const regB = b.regNo || '';
        if (regA < regB) return -1;
        if (regA > regB) return 1;
        return 0;
      });

      let rows = '';
      records.forEach(r => {
        const statusColor = r.status === 'PRESENT' ? 'green' : r.status === 'ABSENT' ? 'red' : 'gray';
        rows += `
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;">${r.regNo}</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${r.name}</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${r.section}</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${r.entityName}</td>
            <td style="padding: 8px; border: 1px solid #ddd; color: ${statusColor}; font-weight: bold;">${r.status}</td>
          </tr>
        `;
      });

      return `
        <div style="font-family: Arial, sans-serif; color: #333; max-width: 800px; margin: 0 auto;">
          <h2 style="color: #1e293b;">Attendance Report - ${deptName}</h2>
          <p><strong>Date:</strong> ${date} | <strong>Session:</strong> ${session}</p>
          <p>Below is the cross-club attendance report for your department students:</p>
          <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
            <thead>
              <tr style="background-color: #f8fafc;">
                <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Register No</th>
                <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Student Name</th>
                <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Section</th>
                <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Allocated Club/Centre</th>
                <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Status</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>
          <p style="margin-top: 30px; font-size: 12px; color: #64748b;">This is an automated message from the RIT Activity Allocation Portal.</p>
        </div>
      `;
    };

    // Build payloads for standard departments
    for (const [dept, records] of Object.entries(departmentBuckets)) {
      if (records.length === 0) continue;
      
      // If the department name doesn't exactly match our HOD_EMAILS map, we default to the VICE_PRINCIPAL_EMAIL
      // which is currently set to the test email.
      const targetEmail = HOD_EMAILS[dept] || VICE_PRINCIPAL_EMAIL;
      
      if (!targetEmail) continue; 

      // Format the date for the subject (e.g. "24-Aug-2026")
      const formattedDate = new Date(date).toLocaleDateString('en-GB', { 
        day: '2-digit', month: 'short', year: 'numeric' 
      }).replace(/ /g, '-');

      emailPayloads.push({
        to: targetEmail,
        cc: VICE_PRINCIPAL_EMAIL,
        subject: `[RIT Portal] ${formattedDate} ${session} Attendance Report - ${dept}`,
        htmlBody: generateHtmlTable(records, dept)
      });
    }

    // Build payload for First Years
    if (firstYearBucket.length > 0) {
      const formattedDate = new Date(date).toLocaleDateString('en-GB', { 
        day: '2-digit', month: 'short', year: 'numeric' 
      }).replace(/ /g, '-');
      
      emailPayloads.push({
        to: FIRST_YEAR_HOD_EMAIL,
        cc: VICE_PRINCIPAL_EMAIL,
        subject: `[RIT Portal] ${formattedDate} ${session} Attendance Report - First Year Students`,
        htmlBody: generateHtmlTable(firstYearBucket, 'First Year Students')
      });
    }


    // 7. Send to Google Apps Script
    const GAS_URL = "https://script.google.com/macros/s/AKfycbxvoRfmASBoYbevaOn5TfIwgxTxLs4BnOMaOPgSwsYFv8ID73by6uiuYIfZi9Y-fSAH/exec";
    
    if (emailPayloads.length === 0) {
      return NextResponse.json({ success: true, message: "No data to send." });
    }

    const gasRes = await fetch(GAS_URL, {
      method: 'POST',
      body: JSON.stringify({
        action: "send_hod_emails",
        emails: emailPayloads
      }),
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      }
    });

    if (!gasRes.ok) {
      throw new Error(`GAS returned status ${gasRes.status}`);
    }

    const gasResult = await gasRes.json();
    
    if (gasResult.success === false) {
      throw new Error(`Google Apps Script Error: ${gasResult.error}`);
    }

    return NextResponse.json({ 
      success: true, 
      emailsSent: gasResult.emailsSent,
      totalDepartments: emailPayloads.length
    });

  } catch (error: any) {
    console.error("Error sending HOD reports:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
