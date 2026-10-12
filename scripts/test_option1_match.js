const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8').split('\n').reduce((acc, line) => {
  const [key, ...val] = line.split('=');
  if (key && val.length) acc[key.trim()] = val.join('=').trim().replace(/^['"]|['"]$/g, '');
  return acc;
}, {});

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function testDeptOption1() {
  const { data: students } = await supabase.from('students').select('*');
  const { data: rules } = await supabase.from('section_booking_rules').select('*');
  const { data: slots } = await supabase
    .from('slots')
    .select('id, day, session, start_time, end_time, capacity, centre:centres(name)')
    .not('centre_id', 'is', null);

  // Proposed Dept Rules:
  // CSE: ['Centre For Image Processing', 'Center for Apple'] (2 centres)
  // MECH: ['Centre for Smart Manufacturing', 'Center for EV & Energy'] (2 centres)
  // CSBS: ['Centre for ARVR (Augmented Reality / Virtual Reality)', 'Centre for Cybersecurity'] (2 centres)
  // ECE: ['Centre for IoT (Internet of Things)', 'Centre for RADAR'] (2 centres)
  // CCE: ['Center for Space'] (1 centre, balance choice)
  // VLSI: ['Centre for Semiconductor Design'] (1 centre, balance choice)
  // AIML: ['Centre for ZF', 'Centre for AI (Artificial Intelligence)'] (2 centres)
  // AIDS: 
  //   For sections with Wed/Thu/Fri centre days (A, D, E, F): ['Center for Data Science', 'Center for Cloud']
  //   For sections with Mon/Tue/Fri centre days (B, C, G): ['Centre for AI (Artificial Intelligence)', 'Centre for ZF']
  
  const sectionsMap = {};
  students.forEach(s => {
    const key = `${s.course}__Sec_${s.section}`;
    if (!sectionsMap[key]) {
      sectionsMap[key] = {
        course: s.course,
        section: s.section,
        allowed_day: s.allowed_day,
        session: s.activity_session,
        count: 0
      };
    }
    sectionsMap[key].count++;
  });

  console.log('Testing Option 1 for all sections...\n');

  for (const [key, sec] of Object.entries(sectionsMap)) {
    let dept = 'OTHER';
    let lockedCentres = [];

    if (/Computer Science and Engineering(?!.*(Artificial Intelligence|Business))/i.test(sec.course)) {
      dept = 'CSE';
      lockedCentres = ['Centre For Image Processing', 'Center for Apple'];
    } else if (/Machine Learning/i.test(sec.course)) {
      dept = 'AIML';
      lockedCentres = ['Centre for ZF', 'Centre for AI (Artificial Intelligence)'];
    } else if (/Data Science/i.test(sec.course)) {
      dept = 'AIDS';
      // If section G (Mon, Tue) or B, C (Mon, Tue, Fri)
      if (['B', 'C', 'G'].includes(sec.section)) {
        lockedCentres = ['Centre for ZF', 'Centre for AI (Artificial Intelligence)'];
      } else {
        lockedCentres = ['Center for Data Science', 'Center for Cloud'];
      }
    } else if (/Mechanical/i.test(sec.course)) {
      dept = 'MECH';
      lockedCentres = ['Centre for Smart Manufacturing', 'Center for EV & Energy'];
    } else if (/Business Systems/i.test(sec.course)) {
      dept = 'CSBS';
      lockedCentres = ['Centre for ARVR (Augmented Reality / Virtual Reality)', 'Centre for Cybersecurity'];
    } else if (/Electronics and Communication/i.test(sec.course)) {
      dept = 'ECE';
      lockedCentres = ['Centre for IoT (Internet of Things)', 'Centre for RADAR'];
    } else if (/Computer and Communication/i.test(sec.course)) {
      dept = 'CCE';
      lockedCentres = ['Center for Space'];
    } else if (/VLSI/i.test(sec.course)) {
      dept = 'VLSI';
      lockedCentres = ['Centre for Semiconductor Design'];
    }

    if (dept === 'OTHER') continue;

    // Evaluate available centre days
    const stdDays = (sec.allowed_day && sec.allowed_day !== 'ANY' && sec.allowed_day !== 'INDEPENDENT')
      ? sec.allowed_day.split(',').map(d => d.trim()).filter(Boolean) : [];
    const secRules = rules.filter(r => r.course === sec.course && r.section === sec.section);
    const allDays = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'];
    const availableCentreDays = [];

    allDays.forEach(day => {
      const r = secRules.find(rule => rule.day === day);
      if (r) {
        if (r.allowed_timings.some(t => t.includes('09:40') || t.includes('13:10'))) availableCentreDays.push(day);
      } else if (stdDays.includes(day)) {
        availableCentreDays.push(day);
      }
    });

    // Check matching slots for each locked centre
    const assignments = {};
    const usedDays = new Set();
    let allMatched = true;

    for (const cName of lockedCentres) {
      const validSlots = slots.filter(s => {
        if (s.centre?.name !== cName) return false;
        if (!availableCentreDays.includes(s.day)) return false;
        const r = secRules.find(rule => rule.day === s.day);
        if (r) {
          const f1 = `${s.start_time.slice(0,5)} - ${s.end_time.slice(0,5)}`;
          const f2 = `${s.start_time}-${s.end_time}`;
          return r.allowed_timings.some(t => t === f1 || t === f2 || t.replace(/\s+/g,'') === f2.replace(/\s+/g,''));
        }
        return s.session === sec.session;
      });

      // Pick an unused day
      const availSlot = validSlots.find(s => !usedDays.has(s.day));
      if (availSlot) {
        usedDays.add(availSlot.day);
        assignments[cName] = `${availSlot.day} (${availSlot.start_time.slice(0,5)}-${availSlot.end_time.slice(0,5)})`;
      } else {
        allMatched = false;
        assignments[cName] = '❌ NO UNUSED DAY MATCH';
      }
    }

    const status = allMatched ? '✅ PERFECT' : '❌ CLASH';
    console.log(`[${status}] [${dept}] ${sec.course.slice(0, 30)}... Sec ${sec.section} (${sec.count} studs)`);
    console.log(`     Total Centre Days: [${availableCentreDays.join(', ')}]`);
    console.log(`     Locked: ${JSON.stringify(assignments)}`);
    console.log(`     Balance Open Days: [${availableCentreDays.filter(d => !usedDays.has(d)).join(', ')}]`);
    console.log('---------------------------------------------------------------------------------');
  }
}

testDeptOption1();
