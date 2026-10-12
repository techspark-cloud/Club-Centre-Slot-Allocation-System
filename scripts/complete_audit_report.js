const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8').split('\n').reduce((acc, line) => {
  const [key, ...val] = line.split('=');
  if (key && val.length) acc[key.trim()] = val.join('=').trim().replace(/^['"]|['"]$/g, '');
  return acc;
}, {});

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function runCompleteAudit() {
  const { data: students } = await supabase.from('students').select('*');
  const { data: rules } = await supabase.from('section_booking_rules').select('*');
  const { data: slots } = await supabase
    .from('slots')
    .select('id, day, session, start_time, end_time, capacity, allocated_count, centre_id, centre:centres(id, name)')
    .not('centre_id', 'is', null);

  const deptCentresMap = {
    'CSE': {
      pattern: /Computer Science and Engineering(?!.*(Artificial Intelligence|Business))/i,
      centres: ['Centre For Image Processing', 'Center for Apple']
    },
    'AIML & AIDS': {
      pattern: /(Artificial Intelligence and Data Science|Artificial Intelligence and Machine Learning)/i,
      centres: ['Centre for ZF', 'Centre for AI (Artificial Intelligence)', 'Center for Data Science', 'Center for Cloud']
    },
    'MECH': {
      pattern: /Mechanical Engineering/i,
      centres: ['Centre for Smart Manufacturing', 'Center for EV & Energy']
    },
    'CSBS': {
      pattern: /Computer Science and Business Systems/i,
      centres: ['Centre for ARVR (Augmented Reality / Virtual Reality)', 'Centre for Cybersecurity']
    },
    'ECE': {
      pattern: /Electronics and Communication Engineering/i,
      centres: ['Centre for IoT (Internet of Things)', 'Centre for RADAR']
    },
    'CCE': {
      pattern: /Computer and Communication Engineering/i,
      centres: ['Center for Space']
    },
    'VLSI': {
      pattern: /VLSI Design and Technology/i,
      centres: ['Centre for Semiconductor Design']
    }
  };

  // Group students by (dept, course, section)
  const groups = {};
  students.forEach(s => {
    let deptName = 'OTHER';
    for (const [k, v] of Object.entries(deptCentresMap)) {
      if (v.pattern.test(s.course)) { deptName = k; break; }
    }
    const key = `${deptName} | ${s.course} | Sec ${s.section}`;
    if (!groups[key]) {
      groups[key] = {
        dept: deptName,
        course: s.course,
        section: s.section,
        students: []
      };
    }
    groups[key].students.push(s);
  });

  console.log('================================================================');
  console.log('COMPREHENSIVE AUDIT REPORT: DEPT WISE CENTRE LOCK & CLASH CHECK');
  console.log('================================================================\n');

  const issuesList = [];

  for (const [gKey, group] of Object.entries(groups)) {
    if (group.dept === 'OTHER') continue;
    const def = deptCentresMap[group.dept];
    const targetCentres = def.centres;

    // Get a sample student to see allowed_day & session
    const sample = group.students[0];
    const stdDays = (sample.allowed_day && sample.allowed_day !== 'ANY' && sample.allowed_day !== 'INDEPENDENT') 
      ? sample.allowed_day.split(',').map(d => d.trim()).filter(Boolean)
      : [];
    const secRules = rules.filter(r => r.course === group.course && r.section === group.section);

    // Calculate which days have CENTRE periods
    const allDays = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'];
    const availableCentreDays = [];

    allDays.forEach(day => {
      const rule = secRules.find(r => r.day === day);
      if (rule) {
        if (rule.allowed_timings.some(t => t.includes('09:40') || t.includes('13:10'))) {
          availableCentreDays.push(day);
        }
      } else if (stdDays.includes(day)) {
        availableCentreDays.push(day);
      }
    });

    console.log(`\n>>> [${group.dept}] ${group.course} - Section ${group.section} (${group.students.length} students)`);
    console.log(`    Session: ${sample.activity_session} | Allowed Days: [${stdDays.join(', ')}]`);
    console.log(`    Total Available Centre Days in Week: ${availableCentreDays.length} -> [${availableCentreDays.join(', ')}]`);
    console.log(`    Target Locked Centres (${targetCentres.length}): ${targetCentres.join(' + ')}`);

    // ISSUE TYPE 1: Number of locked centres exceeds available centre days!
    if (targetCentres.length > availableCentreDays.length) {
      const msg = `🚨 CAPACITY/DAY LAG: Section needs ${targetCentres.length} locked centres, but only has ${availableCentreDays.length} centre days (${availableCentreDays.join(', ')})!`;
      console.log(`    ${msg}`);
      issuesList.push({ group: gKey, type: 'INSUFFICIENT_CENTRE_DAYS', detail: msg });
    }

    // Now check for each target centre: which days can it be taken?
    const centreValidDays = {};
    targetCentres.forEach(cName => {
      // Find slots for cName matching this section
      const cSlots = slots.filter(s => s.centre?.name === cName);
      const validDays = [];
      availableCentreDays.forEach(day => {
        // Does cSlots have a slot on this day matching student's session/rule?
        const match = cSlots.some(s => {
          if (s.day !== day) return false;
          // check rule
          const r = secRules.find(rule => rule.day === day);
          if (r) {
            const f1 = `${s.start_time.slice(0,5)} - ${s.end_time.slice(0,5)}`;
            const f2 = `${s.start_time}-${s.end_time}`;
            return r.allowed_timings.some(t => t === f1 || t === f2 || t.replace(/\s+/g,'') === f2.replace(/\s+/g,''));
          }
          // check standard session
          return s.session === sample.activity_session;
        });
        if (match) validDays.push(day);
      });
      centreValidDays[cName] = validDays;
      console.log(`      * ${cName} -> Valid on days: [${validDays.join(', ')}]`);

      // ISSUE TYPE 2: A centre has NO valid days at all for this section!
      if (validDays.length === 0) {
        const msg = `🚨 NO SLOT MATCH (ZERO DAYS): ${cName} has NO valid slot on any of the section's centre days!`;
        console.log(`        ${msg}`);
        issuesList.push({ group: gKey, type: 'NO_SLOT_AVAILABLE', centre: cName, detail: msg });
      }
    });

    // ISSUE TYPE 3: Can all target centres be scheduled simultaneously without picking the SAME day? (Maximum Bipartite Matching / Assignment check)
    // We have targetCentres, and each centre has a subset of availableCentreDays.
    // Can we assign each centre to a distinct day?
    function canAssign(centres, usedDays = new Set(), idx = 0) {
      if (idx === centres.length) return true;
      const c = centres[idx];
      const valid = centreValidDays[c] || [];
      for (const d of valid) {
        if (!usedDays.has(d)) {
          usedDays.add(d);
          if (canAssign(centres, usedDays, idx + 1)) return true;
          usedDays.delete(d);
        }
      }
      return false;
    }

    if (targetCentres.length <= availableCentreDays.length) {
      const possible = canAssign(targetCentres);
      if (!possible) {
        const msg = `🚨 DAY CLASH (LAG): Cannot assign all ${targetCentres.length} centres to distinct days simultaneously because their valid days overlap into fewer days!`;
        console.log(`    ${msg}`);
        issuesList.push({ group: gKey, type: 'DAY_COLLISION', detail: msg });
      } else {
        console.log(`    ✅ Perfect Match: All ${targetCentres.length} locked centres can fit into distinct days without clash!`);
      }
    }
  }

  console.log('\n================================================================');
  console.log(`TOTAL DETECTED ISSUES / LAGS: ${issuesList.length}`);
  console.log('================================================================');
  issuesList.forEach((iss, i) => {
    console.log(`\n[#${i+1}] ${iss.group}`);
    console.log(`     Type: ${iss.type}`);
    console.log(`     Detail: ${iss.detail}`);
  });
}

runCompleteAudit();
