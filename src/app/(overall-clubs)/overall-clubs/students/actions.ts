'use server';

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function getClubsAllocations() {
  const { data, error } = await supabase
    .from('allocations')
    .select(`
      id,
      created_at,
      students!inner (name, register_no, course, gender, section, semester, contact_no),
      slots!inner (
        day, session, venue, start_time, end_time, club_id,
        clubs (name)
      )
    `)
    .not('slots.club_id', 'is', null);

  if (error) {
    console.error('Error fetching allocations:', error);
    return [];
  }
  return data;
}
