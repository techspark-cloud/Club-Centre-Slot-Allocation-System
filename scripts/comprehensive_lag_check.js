const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8').split('\n').reduce((acc, line) => {
  const [key, ...val] = line.split('=');
  if (key && val.length) acc[key.trim()] = val.join('=').trim().replace(/^['"]|['"]$/g, '');
  return acc;
}, {});

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function deepCheck() {
  // 1. Fetch all students
  const { data: students } = await supabase.from('students').select('id, name, course, section, allowed_day, activity_session');
  // 2. Fetch all section rules
  const { data: rules } = await supabase.from('section_booking_rules').select('*');
  // 3. Fetch all centre slots
  const { data: slots } = await supabase
    .from('slots')
    .select('id, day, session, start_time, end_time, capacity, allocated_count, centre_id, centre:centres(id, name)')
    .not('centre_id', 'is', null);

  // Group slots by Centre Name -> Day -> Sessions
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

  // Department mapping based on user input
  // CSE: Image processing, Apple Centre
  // AIML & AIDS: ZF, AI, DS, Cloud Computer
  // MECH: Smart Manifaturing, EV and enery
  // CSBS: AR&VR, Cyber Security
  // ECE: IOT, RADAR
  // CCE: space
  // VLSI: SEMI CONDUCTOR
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

  // Group students by department and section
  const deptSections = {};
  students.forEach(s => {
    let deptKey = 'OTHER';
    for (const [key, def] of Object.entries(deptCentresMap)) {
      if (def.pattern.test(s.course)) {
        deptKey = key;
        break;
      }
    }

    if (!deptSections[deptKey]) deptSections[deptKey] = {};
    const secKey = s.section || 'Unknown';
    if (!deptSections[deptKey][secKey]) {
      deptSections[deptKey][secKey] = {
        course: s.course,
        section: s.section,
        allowed_days: new Set(),
        sessions: new Set(),
        student_count: 0
      };
    }
    deptSections[deptKey][secKey].student_count++;
    if (s.allowed_day) {
      s.allowed_day.split(',').forEach(d => deptSections[deptKey][secKey].allowed_days.add(d.trim()));
    }
    if (s.activity_session) {
      deptSections[deptKey][secKey].sessions.add(s.activity_session);
    }
  });

  console.log('========================================================================');
  console.log('SCHEDULE & CLASH ANALYSIS REPORT');
  console.log('========================================================================\n');

  for (const [deptKey, def] of Object.entries(deptCentresMap)) {
    console.log(`\n########################################################################`);
    console.log(`DEPARTMENT: ${deptKey}`);
    console.log(`TARGET LOCKED CENTRES: ${def.centres.join(', ')}`);
    console.log(`########################################################################`);

    // Show availability of target centres
    def.centres.forEach(cName => {
      const cSlots = centreSchedule[cName] || [];
      const daysSummary = cSlots.map(s => `${s.day} (${s.session} ${s.start_time.slice(0,5)}-${s.end_time.slice(0,5)}) cap:${s.capacity}`);
      console.log(`  * ${cName} [Total Slots: ${cSlots.length}]:`);
      console.log(`      ${daysSummary.join(', ') || 'NO SLOTS CONFIGURED!'}`);
    });

    const sections = deptSections[deptKey] || {};
    console.log(`\n  SECTIONS IN ${deptKey}:`);
    for (const [sec, info] of Object.entries(sections)) {
      const allowedDays = Array.from(info.allowed_days);
      const sessions = Array.from(info.sessions);
      
      // Get any custom rules for this course and section
      const secRules = rules.filter(r => r.course === info.course && r.section === info.section);
      const ruleDays = secRules.map(r => `${r.day} (${r.allowed_timings.join('|')})`);

      console.log(`\n    --- Section ${sec} (Students: ${info.student_count}) ---`);
      console.log(`    Course: ${info.course}`);
      console.log(`    Allowed Days: [${allowedDays.join(', ')}] | Sessions: [${sessions.join(', ')}]`);
      if (secRules.length > 0) {
        console.log(`    Custom Rules: ${ruleDays.join(', ')}`);
      }

      // Check whether each locked centre can be accommodated for this section!
      console.log(`    CHECKING LOCKED CENTRES FOR SECTION ${sec}:`);
      def.centres.forEach(cName => {
        const cSlots = centreSchedule[cName] || [];
        // A slot matches if:
        // day in allowedDays AND session in sessions
        // OR matches a custom rule timing
        const matchingSlots = cSlots.filter(s => {
          // Check standard day + session match
          const stdMatch = allowedDays.includes(s.day) && sessions.includes(s.session);
          
          // Check custom rule match
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
          console.log(`      ✅ ${cName}: Matches on ${matchingSlots.map(m => `${m.day} (${m.session} ${m.start_time.slice(0,5)}-${m.end_time.slice(0,5)})`).join(', ')}`);
        } else {
          console.log(`      ❌ CLASH / MISMATCH (LAG)! ${cName}: NO SLOTS match Section ${sec}'s days [${allowedDays.join(', ')}] & session [${sessions.join(', ')}]!`);
          console.log(`         -> ${cName} is only open on: ${cSlots.map(s => `${s.day} (${s.session})`).join(', ')}`);
        }
      });
    }
  }
}

deepCheck();
