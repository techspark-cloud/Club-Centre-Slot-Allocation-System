import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function main() {
  const { data: students, error } = await supabase.from('students').select('id, allocations(id, slot_id)');
  if (error) console.error(error);
  
  let totalAllocations = 0;
  let studentsWithMultiple = 0;
  let studentsWithOne = 0;

  students?.forEach(s => {
    if (s.allocations && s.allocations.length > 0) {
      totalAllocations += s.allocations.length;
      if (s.allocations.length > 1) {
        studentsWithMultiple++;
      } else {
        studentsWithOne++;
      }
    }
  });

  console.log({
    totalStudents: students?.length,
    studentsWithOne,
    studentsWithMultiple,
    totalAllocations
  });
}

main();
