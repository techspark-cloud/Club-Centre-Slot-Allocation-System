'use server';

import { createClient } from '@supabase/supabase-js';

// Use service role key to bypass RLS for public dashboard aggregate queries
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function getClubAllocations() {
  const { data, error } = await supabaseAdmin
    .from('allocations')
    .select('student_id, slot:slots!inner(club_id)')
    .not('slot.club_id', 'is', null);
    
  if (error) {
    console.error('Error fetching club allocations:', error);
    return [];
  }
  return data || [];
}

export async function getCentreAllocations() {
  const { data, error } = await supabaseAdmin
    .from('allocations')
    .select('student_id, slot:slots!inner(centre_id)')
    .not('slot.centre_id', 'is', null);
    
  if (error) {
    console.error('Error fetching centre allocations:', error);
    return [];
  }
  return data || [];
}

export async function getSlotGroupedDetails(slotId: string) {
  const { data, error } = await supabaseAdmin
    .from('allocations')
    .select(`
      students (name, register_no, course, section, semester)
    `)
    .eq('slot_id', slotId);
    
  if (error || !data) {
    console.error('Error fetching slot details:', error);
    return [];
  }
  
  const groups: Record<string, { count: number; students: any[] }> = {};
  data.forEach((d: any) => {
    if (d.students) {
      const key = `Sem ${d.students.semester} ${d.students.course} - Sec ${d.students.section}`;
      if (!groups[key]) groups[key] = { count: 0, students: [] };
      groups[key].count++;
      groups[key].students.push(d.students);
    }
  });
  
  Object.values(groups).forEach(g => {
    g.students.sort((a, b) => a.register_no.localeCompare(b.register_no));
  });
  
  return Object.entries(groups).sort((a, b) => b[1].count - a[1].count);
}
