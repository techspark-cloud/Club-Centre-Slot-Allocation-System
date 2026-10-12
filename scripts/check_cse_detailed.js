const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8').split('\n').reduce((acc, line) => {
  const [key, ...val] = line.split('=');
  if (key && val.length) acc[key.trim()] = val.join('=').trim().replace(/^['"]|['"]$/g, '');
  return acc;
}, {});

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function checkCSE() {
  const { data: students } = await supabase.from('students').select('id, name, course, section, allowed_day, activity_session');
  const { data: rules } = await supabase.from('section_booking_rules').select('*');
  const { data: slots } = await supabase
    .from('slots')
    .select('id, day, session, start_time, end_time, capacity, allocated_count, centre_id, centre:centres(id, name)')
    .not('centre_id', 'is', null);

  const centreSchedule = {};
  slots.forEach(s => {
    const cName = s.centre.name;
    if (!centreSchedule[cName]) centreSchedule[cName] = [];
    centreSchedule[cName].push({
      id: s.id,
      day: s.day,
      session: s.session || (s.start_time.startsWith('09') ? 'FORENOON' : 'AFTERNOON'),
      start_time: s.start_time,
      end_time: s.end_time,
      capacity: s.capacity,
      allocated_count: s.allocated_count
    });
  });

  const cseCentres = ['Centre For Image Processing', 'Center for Apple'];
  const secMap = {};
  students.filter(s => /Computer Science and Engineering(?!.*(Artificial Intelligence|Business))/i.test(s.course)).forEach(s => {
    const sec = s.section || 'Unknown';
    if (!secMap[sec]) {
      secMap[sec] = { course: s.course, section: sec, days: new Set(), sessions: new Set(), count: 0 };
    }
    secMap[sec].count++;
    if (s.allowed_day) s.allowed_day.split(',').forEach(d => secMap[sec].days.add(d.trim()));
    if (s.activity_session) secMap[sec].sessions.add(s.activity_session);
  });

  const sortedSecs = Object.keys(secMap).sort();
  for (const sec of sortedSecs) {
    const info = secMap[sec];
    const allowedDays = Array.from(info.days);
    const sessions = Array.from(info.sessions);
    const secRules = rules.filter(r => r.course === info.course && r.section === info.section);
    const ruleDays = secRules.map(r => `${r.day} (${r.allowed_timings.join('|')})`);

    console.log(`\n--- CSE Section ${sec} (${info.count} students) ---`);
    console.log(`Allowed Days: [${allowedDays.join(', ')}] | Sessions: [${sessions.join(', ')}]`);
    if (secRules.length > 0) console.log(`Custom Rules: ${ruleDays.join(', ')}`);

    cseCentres.forEach(cName => {
      const cSlots = centreSchedule[cName] || [];
      const matchingSlots = cSlots.filter(s => {
        const stdMatch = allowedDays.includes(s.day) && sessions.includes(s.session);
        const ruleForDay = secRules.find(r => r.day === s.day);
        let ruleMatch = false;
        if (ruleForDay) {
          const formatted = `${s.start_time.slice(0,5)} - ${s.end_time.slice(0,5)}`;
          const dbTiming = `${s.start_time}-${s.end_time}`;
          ruleMatch = ruleForDay.allowed_timings.some(t => t === formatted || t === dbTiming || t.replace(/\s+/g,'') === dbTiming.replace(/\s+/g,''));
        }
        return stdMatch || ruleMatch;
      });

      if (matchingSlots.length > 0) {
        console.log(`  ✅ ${cName}: Matches on ${matchingSlots.map(m => `${m.day} (${m.session} ${m.start_time.slice(0,5)}-${m.end_time.slice(0,5)})`).join(', ')}`);
      } else {
        console.log(`  ❌ LAG / CLASH! ${cName}: NO SLOTS MATCH for Section ${sec}!`);
      }
    });
  }
}

checkCSE();
