const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    const key = parts[0].trim();
    const value = parts.slice(1).join('=').trim().replace(/^['"]|['"]$/g, '');
    env[key] = value;
  }
});

const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, serviceRoleKey);

async function run() {
  console.log("Fetching all 11375 allocations to find the root cause of the anomaly...");
  
  let allAllocs = [];
  let from = 0;
  let limit = 1000;
  
  while (true) {
    const { data } = await supabase.from('allocations').select('student_id, created_at, slots(club_id, centre_id, day)').range(from, from + limit - 1);
    if (!data || data.length === 0) break;
    allAllocs = allAllocs.concat(data);
    from += limit;
  }
  
  console.log('Total fetched:', allAllocs.length);
  
  const studentBookings = {};
  allAllocs.forEach(a => {
    if (!studentBookings[a.student_id]) studentBookings[a.student_id] = { count: 0, days: new Set() };
    studentBookings[a.student_id].count++;
    if (a.slots && a.slots.day) {
      studentBookings[a.student_id].days.add(a.slots.day);
    }
  });
  
  const distribution = {};
  let totalDaysPerStudent = {};
  Object.values(studentBookings).forEach(s => {
    distribution[s.count] = (distribution[s.count] || 0) + 1;
    totalDaysPerStudent[s.days.size] = (totalDaysPerStudent[s.days.size] || 0) + 1;
  });
  
  console.log("Bookings per student distribution:", distribution);
  console.log("Unique Days per student distribution:", totalDaysPerStudent);
}

run();
