import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://kjestbshetpglycmmrem.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtqZXN0YnNoZXRwZ2x5Y21tcmVtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzA2MjIyNiwiZXhwIjoyMTAyNjM4MjI2fQ.tvbYzoSBKhJZgbBEwJSs2MhBRy4NAVtkKtyACdOlWmE';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

// All 15 club faculty coordinators
const CLUB_FACULTY: { name_match: string; faculty_name: string; faculty_mobile: string }[] = [
  { name_match: 'ARTIST LEAGUE', faculty_name: 'Ms. Shri Janani P (AP/CSE)',       faculty_mobile: '8838487363' },
  { name_match: 'HELIOS',         faculty_name: 'Mr. Suresh J (AP/AI&DS)',           faculty_mobile: '9840486420' },
  { name_match: 'INFINITUS',      faculty_name: 'Ms. Thilagavathy A (AP/MATH)',      faculty_mobile: '8838552068' },
  { name_match: 'NIPPON',         faculty_name: 'Ms. Roobavathi R (AP/ENGLISH)',     faculty_mobile: '9600540041' },
  { name_match: 'NSS',            faculty_name: 'Ms. Pooja S (AP/CSE)',              faculty_mobile: '8668130804' },
  { name_match: 'PODX',           faculty_name: 'Ms. Fouzia Sulthana K (AP/AI&DS)', faculty_mobile: '8056417456' },
  { name_match: 'ROTARACT',       faculty_name: 'Dr. Rajesh Kanna S K (AP/MECH)',   faculty_mobile: '9884834301' },
  { name_match: 'STEAM',          faculty_name: 'Mr. Mohan Ram R (AP/ECE)',          faculty_mobile: '7550271227' },
  { name_match: 'TECHSPARK',      faculty_name: 'Ms. Avudai Selvi S (AP/CSE)',       faculty_mobile: '7358599091' },
  { name_match: 'UBA',            faculty_name: 'Dr. Niranjana S (AP/VLSI)',         faculty_mobile: '9047771300' },
  { name_match: 'VAARATHI',       faculty_name: 'Mr. Keerthana Pandiyan (AP/BT)',    faculty_mobile: '9940481894' },
  { name_match: 'WEC',            faculty_name: 'Ms. Suganthi N (AP/CSE)',           faculty_mobile: '9994095198' },
  { name_match: 'WISTEM',         faculty_name: 'Ms. Anitha J (AP/MATH)',            faculty_mobile: '9600110150' },
  { name_match: 'YRC',            faculty_name: 'Ms. Julin Leeya G (AP/CSE)',        faculty_mobile: '8270258310' },
  { name_match: 'YUVA',           faculty_name: 'Mr. Aakash A (AP/CSE)',             faculty_mobile: '9025945324' },
];

async function run() {
  console.log('\n📋  Fetching all clubs...');
  const { data: clubs, error } = await supabase.from('clubs').select('id, name');
  if (error) { console.error('❌ Error:', error.message); return; }

  console.log(`   Found ${clubs.length} clubs\n`);

  let updated = 0;

  for (const club of clubs) {
    const upperName = (club.name || '').toUpperCase().trim();
    const match = CLUB_FACULTY.find(f => upperName.includes(f.name_match));

    if (match) {
      const { error: upErr } = await supabase
        .from('clubs')
        .update({ faculty_name: match.faculty_name, faculty_mobile: match.faculty_mobile })
        .eq('id', club.id);

      if (upErr) {
        console.error(`   ❌  [${club.name}] Update failed:`, upErr.message);
        // Column might not exist yet - add it
        console.log('   ⚠️  Column may not exist. Please run the SQL migration first.');
      } else {
        console.log(`   ✅  ${club.name.padEnd(25)} → ${match.faculty_name} | ${match.faculty_mobile}`);
        updated++;
      }
    } else {
      console.log(`   ⚠️   ${club.name} → No faculty match found`);
    }
  }

  console.log(`\n🏁  Updated ${updated} / ${clubs.length} clubs`);
  console.log('\n⚠️  If columns do not exist, run this SQL in Supabase Dashboard → SQL Editor:');
  console.log('   ALTER TABLE clubs ADD COLUMN IF NOT EXISTS faculty_name TEXT;');
  console.log('   ALTER TABLE clubs ADD COLUMN IF NOT EXISTS faculty_mobile TEXT;');
  console.log('   ALTER TABLE centres ADD COLUMN IF NOT EXISTS faculty_name TEXT;');
  console.log('   ALTER TABLE centres ADD COLUMN IF NOT EXISTS faculty_mobile TEXT;\n');
}

run().catch(console.error);
