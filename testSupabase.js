const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf8').split('\n');
const NEXT_PUBLIC_SUPABASE_URL = env.find(l => l.startsWith('NEXT_PUBLIC_SUPABASE_URL=')).split('=')[1].trim();
const SUPABASE_SERVICE_ROLE_KEY = env.find(l => l.startsWith('SUPABASE_SERVICE_ROLE_KEY=')).split('=')[1].trim();

const supabase = createClient(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function test() {
  const { data, error } = await supabase
    .from('allocations')
    .select(`
      student_id,
      slot_id,
      slot:slots!inner (
        id, day, club_id, centre_id, venue, start_time, end_time,
        clubs (name),
        centres (name)
      )
    `)
    .eq('slots.day', 'MONDAY');
    
  console.log("With slots.day:", error);
  
  const { data: d2, error: e2 } = await supabase
    .from('allocations')
    .select(`
      student_id,
      slot_id,
      slot:slots!inner (
        id, day, club_id, centre_id, venue, start_time, end_time,
        clubs (name),
        centres (name)
      )
    `)
    .eq('slot.day', 'MONDAY');
    
  console.log("With slot.day:", e2);
}

test();
