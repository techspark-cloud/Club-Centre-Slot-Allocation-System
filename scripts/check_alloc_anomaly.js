const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8').split('\n').reduce((acc, line) => {
  const [key, ...val] = line.split('=');
  if (key && val.length) acc[key.trim()] = val.join('=').trim().replace(/^['"]|['"]$/g, '');
  return acc;
}, {});

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function checkAllocCount() {
  const { data: allAlloc } = await supabase.from('allocations').select('student_id');
  console.log('Total allocations fetched:', allAlloc?.length);

  const studentCount = {};
  allAlloc?.forEach(a => {
    studentCount[a.student_id] = (studentCount[a.student_id] || 0) + 1;
  });

  const uniqueStudentsInAllocs = Object.keys(studentCount).length;
  console.log('Unique students in allocations:', uniqueStudentsInAllocs);

  // Check top 10 students with highest allocations
  const sorted = Object.entries(studentCount).sort((a,b) => b[1] - a[1]).slice(0, 10);
  console.log('Top students by allocation count:', sorted);
}

checkAllocCount();
