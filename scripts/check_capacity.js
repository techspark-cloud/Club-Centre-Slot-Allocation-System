const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://kjestbshetpglycmmrem.supabase.co', 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtqZXN0YnNoZXRwZ2x5Y21tcmVtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzA2MjIyNiwiZXhwIjoyMTAyNjM4MjI2fQ.tvbYzoSBKhJZgbBEwJSs2MhBRy4NAVtkKtyACdOlWmE'
);

async function run() {
  const { data: students } = await supabase.from('students').select('*');
  const { data: rules } = await supabase.from('section_booking_rules').select('*');
  const { data: slots } = await supabase.from('slots').select('*').eq('status', 'ACTIVE');
  
  const dailyDemand = {};
  const dailyCapacity = {};
  
  slots.forEach(s => {
    if (!dailyCapacity[s.day]) dailyCapacity[s.day] = { club: 0, centre: 0, total: 0 };
    if (s.club_id) dailyCapacity[s.day].club += s.capacity;
    if (s.centre_id) dailyCapacity[s.day].centre += s.capacity;
    dailyCapacity[s.day].total += s.capacity;
  });
  
  students.forEach(s => {
    if (s.allowed_day && s.allowed_day !== 'ANY' && s.allowed_day !== 'EXEMPT' && s.allowed_day !== 'INDEPENDENT') {
      const days = s.allowed_day.split(',').map(d => d.trim()).filter(Boolean);
      days.forEach(d => {
        if (!dailyDemand[d]) dailyDemand[d] = { club: 0, centre: 0 };
        dailyDemand[d].club += 1;
        dailyDemand[d].centre += 1; 
      });
    }
  });

  rules.forEach(r => {
    const count = students.filter(s => s.course === r.course && s.section === r.section).length;
    if (!dailyDemand[r.day]) dailyDemand[r.day] = { club: 0, centre: 0 };
    // Custom day implies they can book EITHER 1 club OR 1 centre based on what's available
    // So the demand is just "1 slot". We'll just add it to both as max demand.
    dailyDemand[r.day].club += count;
    dailyDemand[r.day].centre += count;
  });

  console.log("=== OVERALL CAPACITY & DEMAND ANALYSIS ===\n");
  const allDays = Array.from(new Set([...Object.keys(dailyDemand), ...Object.keys(dailyCapacity)]));
  
  let totalDemand = 0;
  let totalCap = 0;

  allDays.forEach(day => {
    const demand = dailyDemand[day] || { club: 0, centre: 0 };
    const cap = dailyCapacity[day] || { club: 0, centre: 0, total: 0 };
    
    console.log(`DAY: ${day}`);
    console.log(`  Students assigned to day : ${demand.club} students`);
    console.log(`  Total Active CLUB Seats  : ${cap.club} (Demand: ${demand.club}) -> ${cap.club >= demand.club ? '✅ OK' : `❌ SHORT by ${demand.club - cap.club}`}`);
    console.log(`  Total Active CENTRE Seats: ${cap.centre} (Demand: ${demand.centre}) -> ${cap.centre >= demand.centre ? '✅ OK' : `❌ SHORT by ${demand.centre - cap.centre}`}`);
    console.log(`  --------------------------------------------------`);
    totalDemand += demand.club; // assuming each student needs 1
    totalCap += cap.total;
  });
  
}

run().catch(console.error);
