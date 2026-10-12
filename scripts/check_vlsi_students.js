const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8').split('\n').reduce((acc, line) => {
  const [key, ...val] = line.split('=');
  if (key && val.length) acc[key.trim()] = val.join('=').trim().replace(/^['"]|['"]$/g, '');
  return acc;
}, {});

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function checkVLSI() {
  // Query by ILIKE %VLSI% without limit
  let allVLSI = [];
  let page = 0;
  while (true) {
    const { data, error } = await supabase
      .from('students')
      .select('id, name, register_no, course, section, status, allowed_day, activity_session, semester')
      .ilike('course', '%VLSI%')
      .range(page * 1000, (page + 1) * 1000 - 1);
    
    if (error) {
      console.error(error);
      break;
    }
    if (!data || data.length === 0) break;
    allVLSI = allVLSI.concat(data);
    if (data.length < 1000) break;
    page++;
  }

  console.log(`=== TOTAL STUDENTS WITH 'VLSI' IN COURSE: ${allVLSI.length} ===`);
  const secCounts = {};
  const statusCounts = {};
  const courseNames = {};
  allVLSI.forEach(s => {
    courseNames[s.course] = (courseNames[s.course] || 0) + 1;
    secCounts[s.section] = (secCounts[s.section] || 0) + 1;
    statusCounts[s.status] = (statusCounts[s.status] || 0) + 1;
  });

  console.log('\nCourse exact names:');
  console.log(courseNames);

  console.log('\nSection counts:');
  console.log(secCounts);

  console.log('\nStatus counts:');
  console.log(statusCounts);

  // Let's also check if there are other courses with 'Electronics' that might be VLSI
  const { data: elecStudents } = await supabase
    .from('students')
    .select('course, section')
    .ilike('course', '%Electronics%');
  
  const elecCourses = {};
  elecStudents?.forEach(s => {
    const k = `${s.course} (Sec ${s.section})`;
    elecCourses[k] = (elecCourses[k] || 0) + 1;
  });
  console.log('\nAll Electronics courses & sections:');
  console.log(elecCourses);
}

checkVLSI();
