const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8').split('\n').reduce((acc, line) => {
  const [key, ...val] = line.split('=');
  if (key && val.length) acc[key.trim()] = val.join('=').trim().replace(/^['"]|['"]$/g, '');
  return acc;
}, {});

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  console.log('Fetching allocations for Semiconductor Centre...');
  const { data: allocations, error } = await supabase
    .from('allocations')
    .select(`
      id, 
      slot_id,
      student_id,
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

  console.log(`Found ${invalidAllocations.length} invalid allocations.`);

  if (invalidAllocations.length === 0) {
    console.log('Nothing to clean up. Exiting.');
    return;
  }

  for (const alloc of invalidAllocations) {
    console.log(`Processing invalid allocation for ${alloc.student.name} (${alloc.student.register_no}) - ${alloc.student.course}...`);
    
    // Delete the allocation
    const { error: delError } = await supabase
      .from('allocations')
      .delete()
      .eq('id', alloc.id);

    if (delError) {
      console.error(`Failed to delete allocation for ${alloc.student.name}:`, delError);
      continue;
    }

    // Decrement the allocated_count in slots
    // To do this reliably, we can use an RPC or just read/write (since it's a script, read/write is okay if no high concurrency)
    // Actually, calling the RPC decrement_slot_count or similar if it exists. 
    // Let's just do a direct update. Since it's a script, it's fine.
    
    // First fetch current count
    const { data: slotData, error: slotFetchError } = await supabase
      .from('slots')
      .select('allocated_count')
      .eq('id', alloc.slot_id)
      .single();

    if (slotFetchError) {
      console.error(`Failed to fetch slot ${alloc.slot_id} to decrement count:`, slotFetchError);
      continue;
    }

    const currentCount = slotData.allocated_count;
    const newCount = Math.max(0, currentCount - 1);

    const { error: slotUpdateError } = await supabase
      .from('slots')
      .update({ allocated_count: newCount })
      .eq('id', alloc.slot_id);

    if (slotUpdateError) {
      console.error(`Failed to decrement count for slot ${alloc.slot_id}:`, slotUpdateError);
    } else {
      console.log(`Successfully deleted allocation and decremented slot count to ${newCount} for ${alloc.student.name}.`);
    }
  }

  console.log('Cleanup complete!');
}

run();
