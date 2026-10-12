const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8').split('\n').reduce((acc, line) => {
  const [key, ...val] = line.split('=');
  if (key && val.length) acc[key.trim()] = val.join('=').trim().replace(/^['"]|['"]$/g, '');
  return acc;
}, {});

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function checkBookingStatus() {
  const { data: students } = await supabase.from('students').select('id, course, section');
  const { data: allocs } = await supabase.from('allocations').select('student_id');

  const studentAllocCount = {};
  allocs?.forEach(a => {
    studentAllocCount[a.student_id] = (studentAllocCount[a.student_id] || 0) + 1;
  });

  let fullyBooked = 0;
  let partialBooked = 0;
  let unbooked = 0;

  students?.forEach(s => {
    const count = studentAllocCount[s.id] || 0;
    if (count >= 5) fullyBooked++;
    else if (count > 0) partialBooked++;
    else unbooked++;
  });

  console.log('=== STUDENT BOOKING COMPLETION STATUS ===');
  console.log(`Total Students: ${students?.length}`);
  console.log(`Fully Booked (5+ slots): ${fullyBooked}`);
  console.log(`Partially Booked (1-4 slots): ${partialBooked}`);
  console.log(`Unbooked (0 slots): ${unbooked}`);
}

checkBookingStatus();
