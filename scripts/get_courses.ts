import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  const { data: students, error } = await supabase.from('students').select('course');
  if (error) console.error(error);
  
  const courses = new Set<string>();
  students?.forEach(s => {
    if (s.course) courses.add(s.course);
  });

  console.log('Distinct Courses:');
  console.log(Array.from(courses).sort());
}

main();
