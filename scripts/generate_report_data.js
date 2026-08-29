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
  let allStudents = [];
  let from = 0;
  let limit = 1000;
  while (true) {
    const { data } = await supabase.from('students').select('allowed_day, activity_session').range(from, from + limit - 1);
    if (!data || data.length === 0) break;
    allStudents = allStudents.concat(data);
    from += limit;
  }
  
  const studentDist = {};
  let morningTotal = 0;
  let afternoonTotal = 0;
  let unassignedCount = 0;
  
  allStudents.forEach(s => {
    let day = s.allowed_day || 'UNASSIGNED';
    const session = s.activity_session;
    
    // Normalize multi-day strings for cleaner reporting if any
    
    if (!studentDist[day]) studentDist[day] = { FORENOON: 0, AFTERNOON: 0, EVENING: 0, UNASSIGNED: 0 };
    
    if (session === 'FORENOON') { studentDist[day].FORENOON++; morningTotal++; }
    else if (session === 'AFTERNOON') { studentDist[day].AFTERNOON++; afternoonTotal++; }
    else if (session === 'EVENING') { studentDist[day].EVENING++; afternoonTotal++; } // User mentioned evening batch
    else { studentDist[day].UNASSIGNED++; unassignedCount++; }
  });
  
  console.log("Total Students fetched:", allStudents.length);
  console.log("Student Allowed Day & Session Distribution:");
  console.log(JSON.stringify(studentDist, null, 2));
  console.log(`Total Morning: ${morningTotal}, Total Afternoon/Evening: ${afternoonTotal}, Unassigned: ${unassignedCount}`);
}

run();
