const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8').split('\n').reduce((acc, line) => {
  const [key, ...val] = line.split('=');
  if (key && val.length) acc[key.trim()] = val.join('=').trim().replace(/^['"]|['"]$/g, '');
  return acc;
}, {});

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function verifyAll() {
  console.log('=== VERIFYING FINAL SYSTEM STATE ===\n');

  // 1. Check Semiconductor allocations by department
  const { data: semiSlots } = await supabase.from('slots').select('id, day, start_time, capacity, allocated_count, centre:centres(name)').eq('centre.name', 'Centre for Semiconductor Design');
  const semiSlotIds = semiSlots.map(s => s.id);

  const { data: semiAllocs } = await supabase
    .from('allocations')
    .select('id, student:students(course, section)')
    .in('slot_id', semiSlotIds);

  const semiDeptMap = {};
  semiAllocs?.forEach(a => {
    const c = a.student?.course || 'Unknown';
    semiDeptMap[c] = (semiDeptMap[c] || 0) + 1;
  });

  console.log('1. SEMICONDUCTOR ENROLMENT BY COURSE:');
  for (const [course, count] of Object.entries(semiDeptMap)) {
    console.log(`   - ${course}: ${count} students`);
  }

  // 2. Sample 1 student from each of the 8 departments to check their allocations
  const testCourses = [
    'B.E. Computer Science and Engineering',
    'B.E. Computer Science and Engineering (Artificial Intelligence and Machine Learning)',
    'B.Tech. Artificial Intelligence and Data Science',
    'B.E. Mechanical Engineering',
    'B.Tech. Computer Science and Business Systems',
    'B.E. Electronics and Communication Engineering',
    'B.E. Computer and Communication Engineering',
    'B.E. Electronics Engineering (VLSI Design and Technology)'
  ];

  console.log('\n2. SAMPLE STUDENT AUDIT PER DEPARTMENT:');
  for (const course of testCourses) {
    const { data: sampleStudent } = await supabase
      .from('students')
      .select('id, name, course, section, allowed_day, activity_session')
      .eq('course', course)
      .limit(1)
      .single();

    if (sampleStudent) {
      const { data: studentAllocs } = await supabase
        .from('allocations')
        .select('slot:slots(day, start_time, end_time, session, club:clubs(name), centre:centres(name))')
        .eq('student_id', sampleStudent.id);

      console.log(`\n• ${sampleStudent.name} (${sampleStudent.course} Sec ${sampleStudent.section}) [Session: ${sampleStudent.activity_session}, Allowed: ${sampleStudent.allowed_day}]`);
      studentAllocs?.forEach(a => {
        const type = a.slot?.club ? `CLUB: ${a.slot.club.name}` : `CENTRE: ${a.slot?.centre?.name}`;
        console.log(`    - [${a.slot.day} ${a.slot.start_time.slice(0,5)}-${a.slot.end_time.slice(0,5)}] ${type}`);
      });
    }
  }

  // 3. Check for any duplicate allocations for any student on the same day & time
  console.log('\n3. CHECKING FOR ANY TIMING/DAY OVERLAPS...');
  // sample check 100 students
  const { data: checkStudents } = await supabase.from('students').select('id').limit(100);
  let clashesFound = 0;
  for (const cs of checkStudents) {
    const { data: aList } = await supabase.from('allocations').select('slot:slots(day, start_time)').eq('student_id', cs.id);
    const dayTimes = new Set();
    aList?.forEach(a => {
      const key = `${a.slot.day}_${a.slot.start_time}`;
      if (dayTimes.has(key)) clashesFound++;
      dayTimes.add(key);
    });
  }
  console.log(`Overlaps/clashes found across sample: ${clashesFound}`);
}

verifyAll();
