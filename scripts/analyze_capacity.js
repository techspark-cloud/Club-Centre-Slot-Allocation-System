
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function analyze() {
  console.log("Fetching students...");
  
  // 1. Fetch Students
  let allStudents = [];
  let from = 0;
  const step = 1000;
  while (true) {
    const { data, error } = await supabase.from('students').select('activity_session, allowed_day').range(from, from + step - 1);
    if (error) throw error;
    if (data.length === 0) break;
    allStudents.push(...data);
    from += step;
  }

  // 2. Fetch Slots
  console.log("Fetching slots...");
  const { data: slots, error: slotsError } = await supabase.from('slots').select('*').eq('status', 'ACTIVE');
  if (slotsError) throw slotsError;

  // 3. Process Demand
  const demand = {
    FORENOON: { MONDAY: 0, TUESDAY: 0, WEDNESDAY: 0, THURSDAY: 0, FRIDAY: 0, SATURDAY: 0, SUNDAY: 0 },
    AFTERNOON: { MONDAY: 0, TUESDAY: 0, WEDNESDAY: 0, THURSDAY: 0, FRIDAY: 0, SATURDAY: 0, SUNDAY: 0 }
  };
  
  let exemptCount = 0;
  let unmappedCount = 0;

  allStudents.forEach(s => {
    if (s.allowed_day === 'INDEPENDENT') {
      exemptCount++;
      return;
    }
    if (!s.activity_session || !s.allowed_day) {
      unmappedCount++;
      return;
    }
    
    // If 'ANY', we'll assume they distribute evenly or just track them separately. For now, track as ANY.
    // Wait, let's track ANY separately.
    const session = s.activity_session;
    if (!demand[session]) demand[session] = { ANY: 0 };
    if (!demand[session]['ANY']) demand[session]['ANY'] = 0;

    if (s.allowed_day === 'ANY') {
      demand[session]['ANY']++;
    } else {
      const days = s.allowed_day.split(',');
      days.forEach(day => {
        if (!demand[session][day]) demand[session][day] = 0;
        demand[session][day]++;
      });
    }
  });

  // 4. Process Capacity
  const capacity = {
    FORENOON: { MONDAY: { CLUB: 0, CENTRE: 0 }, TUESDAY: { CLUB: 0, CENTRE: 0 }, WEDNESDAY: { CLUB: 0, CENTRE: 0 }, THURSDAY: { CLUB: 0, CENTRE: 0 }, FRIDAY: { CLUB: 0, CENTRE: 0 }, SATURDAY: { CLUB: 0, CENTRE: 0 } },
    AFTERNOON: { MONDAY: { CLUB: 0, CENTRE: 0 }, TUESDAY: { CLUB: 0, CENTRE: 0 }, WEDNESDAY: { CLUB: 0, CENTRE: 0 }, THURSDAY: { CLUB: 0, CENTRE: 0 }, FRIDAY: { CLUB: 0, CENTRE: 0 }, SATURDAY: { CLUB: 0, CENTRE: 0 } }
  };

  slots.forEach(slot => {
    const session = slot.session;
    const day = slot.day;
    if (!capacity[session]) capacity[session] = {};
    if (!capacity[session][day]) capacity[session][day] = { CLUB: 0, CENTRE: 0 };
    
    if (slot.club_id) {
      capacity[session][day].CLUB += slot.capacity;
    } else if (slot.centre_id) {
      capacity[session][day].CENTRE += slot.capacity;
    }
  });

  const report = {
    totalStudents: allStudents.length,
    exemptCount,
    unmappedCount,
    demand,
    capacity
  };

  console.log(JSON.stringify(report, null, 2));
}

analyze().catch(console.error);
