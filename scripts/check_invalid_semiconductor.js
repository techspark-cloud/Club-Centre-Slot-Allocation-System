const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8').split('\n').reduce((acc, line) => {
  const [key, ...val] = line.split('=');
  if (key && val.length) acc[key.trim()] = val.join('=').trim().replace(/^['"]|['"]$/g, '');
  return acc;
}, {});

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data: allocations, error } = await supabase
    .from('allocations')
    .select(`
      id, 
      student:students(id, name, register_no, course),
      slot:slots(id, centre:centres(name))
    `);

  if (error) {
    console.error('Error fetching allocations:', error);
    return;
  }

  const semiconductorAllocations = allocations.filter(a => a.slot?.centre?.name === 'Centre for Semiconductor Design');
  
  const invalidAllocations = semiconductorAllocations.filter(a => {
    const course = a.student.course;
    return course !== 'B.E. Electronics and Communication Engineering' && 
           course !== 'B.E. Electronics Engineering (VLSI Design and Technology)';
  });

  console.log(`Total Semiconductor Allocations: ${semiconductorAllocations.length}`);
  console.log(`Valid (ECE/VLSI) Allocations: ${semiconductorAllocations.length - invalidAllocations.length}`);
  console.log(`Invalid (Other Dept) Allocations: ${invalidAllocations.length}`);
  
  if (invalidAllocations.length > 0) {
    console.log('Sample invalid allocations:');
    invalidAllocations.slice(0, 5).forEach(a => {
      console.log(`- ${a.student.name} (${a.student.register_no}) - ${a.student.course}`);
    });
  }
}
run();
