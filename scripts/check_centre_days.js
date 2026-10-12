const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8').split('\n').reduce((acc, line) => {
  const [key, ...val] = line.split('=');
  if (key && val.length) acc[key.trim()] = val.join('=').trim().replace(/^['"]|['"]$/g, '');
  return acc;
}, {});

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function checkCentreDaysPerSection() {
  const { data: students } = await supabase.from('students').select('course, section, allowed_day, activity_session');
  const { data: rules } = await supabase.from('section_booking_rules').select('*');
  const { data: slots } = await supabase.from('slots').select('day, start_time, end_time, session, type').eq('type', 'CENTRE');

  const deptMap = {
    'CSE': /Computer Science and Engineering(?!.*(Artificial Intelligence|Business))/i,
    'AIML': /Artificial Intelligence and Machine Learning/i,
    'AIDS': /Artificial Intelligence and Data Science/i,
    'MECH': /Mechanical/i,
    'CSBS': /Business Systems/i,
    'ECE': /Electronics and Communication/i,
    'CCE': /Computer and Communication/i,
    'VLSI': /VLSI/i
  };

  // Unique sections
  const secMap = {};
  students.forEach(s => {
    let dName = 'OTHER';
    for (const [k, pat] of Object.entries(deptMap)) {
      if (pat.test(s.course)) { dName = k; break; }
    }
    const key = `${dName} Sec ${s.section}`;
    if (!secMap[key]) {
      secMap[key] = {
        dept: dName,
        course: s.course,
        section: s.section,
        count: 0,
        allowed_days: new Set(),
        session: s.activity_session
      };
    }
    secMap[key].count++;
    if (s.allowed_day) s.allowed_day.split(',').forEach(d => secMap[key].allowed_days.add(d.trim()));
  });

  console.log('=== CENTRE DAYS AVAILABLE PER SECTION (Monday to Friday) ===');
  for (const [secName, info] of Object.entries(secMap)) {
    const stdDays = Array.from(info.allowed_days);
    const secRules = rules.filter(r => r.course === info.course && r.section === info.section);
    
    // Determine which days have a CENTRE slot for this section
    // A day has a centre slot if:
    // 1. Custom rule has timing 09:40-10:30 (FN) or 13:10-14:00 (AN)
    // 2. OR standard day has session matching FN/AN
    const centreDays = [];
    const clubDays = [];
    const allDays = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'];

    allDays.forEach(day => {
      const rule = secRules.find(r => r.day === day);
      if (rule) {
        const hasCentreTiming = rule.allowed_timings.some(t => t.includes('09:40') || t.includes('13:10'));
        const hasClubTiming = rule.allowed_timings.some(t => t.includes('08:00') || t.includes('14:00'));
        if (hasCentreTiming) centreDays.push(day);
        if (hasClubTiming) clubDays.push(day);
      } else if (stdDays.includes(day)) {
        // Standard day has both club & centre in that session
        centreDays.push(day);
        clubDays.push(day);
      }
    });

    console.log(`${secName.padEnd(16)} | Students: ${String(info.count).padStart(3)} | Centre Days (${centreDays.length}): [${centreDays.join(', ')}] | Club Days (${clubDays.length}): [${clubDays.join(', ')}]`);
  }
}

checkCentreDaysPerSection();
