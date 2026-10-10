const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(process.cwd(), '.env.local');
const envFile = fs.readFileSync(envPath, 'utf8');

const envUrl = envFile.split('\n').find(l => l.startsWith('NEXT_PUBLIC_SUPABASE_URL='))?.split('=')[1]?.trim().replace(/^["']|["']$/g, '');
const envKey = envFile.split('\n').find(l => l.startsWith('SUPABASE_SERVICE_ROLE_KEY='))?.split('=')[1]?.trim().replace(/^["']|["']$/g, '');

const supabase = createClient(envUrl, envKey);

async function addQuantumCentre() {
  console.log('--- 1. Creating / Updating Quantum Centre in centres table ---');
  
  const centreName = 'Quantum Centre';
  const facultyName = 'Dr. Mariselvam A K, Associate Professor';
  const facultyMobile = '9840259511';
  const venue = 'Green Building Ground floor';
  const capacity = 30;
  const description = 'The Quantum Centre focuses on foundational and applied research in quantum computing, quantum algorithms, and next-generation quantum technologies.';

  // Check if exists
  let { data: existing } = await supabase.from('centres').select('*').ilike('name', centreName).maybeSingle();
  let centreId;

  if (!existing) {
    const { data: newCentre, error: createError } = await supabase
      .from('centres')
      .insert({
        name: centreName,
        description: description,
        status: 'ACTIVE',
        faculty_name: facultyName,
        faculty_mobile: facultyMobile
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating centre:', createError);
      return;
    }
    centreId = newCentre.id;
    console.log('✅ Created new centre:', newCentre);
  } else {
    centreId = existing.id;
    const { data: updated, error: updateError } = await supabase
      .from('centres')
      .update({
        faculty_name: facultyName,
        faculty_mobile: facultyMobile,
        description: existing.description || description,
        status: 'ACTIVE'
      })
      .eq('id', centreId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating centre:', updateError);
      return;
    }
    console.log('✅ Updated existing centre:', updated);
  }

  console.log('\n--- 2. Creating Slots for Quantum Centre (MONDAY, WEDNESDAY, THURSDAY, FRIDAY) ---');
  
  const days = ['MONDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'];
  const sessions = [
    { name: 'FORENOON', start_time: '09:40:00', end_time: '10:30:00' },
    { name: 'AFTERNOON', start_time: '13:10:00', end_time: '14:00:00' }
  ];

  for (const day of days) {
    for (const session of sessions) {
      // Check if slot already exists
      const { data: existingSlot } = await supabase
        .from('slots')
        .select('*')
        .eq('centre_id', centreId)
        .eq('day', day)
        .eq('session', session.name)
        .maybeSingle();

      if (existingSlot) {
        const { data: updatedSlot, error: slotUpdateErr } = await supabase
          .from('slots')
          .update({
            venue: venue,
            capacity: capacity,
            start_time: session.start_time,
            end_time: session.end_time,
            status: 'ACTIVE'
          })
          .eq('id', existingSlot.id)
          .select();

        console.log(`🔄 Updated slot for ${day} ${session.name}:`, updatedSlot);
      } else {
        const { data: newSlot, error: slotInsertErr } = await supabase
          .from('slots')
          .insert({
            centre_id: centreId,
            club_id: null,
            day: day,
            session: session.name,
            venue: venue,
            capacity: capacity,
            allocated_count: 0,
            start_time: session.start_time,
            end_time: session.end_time,
            status: 'ACTIVE'
          })
          .select();

        if (slotInsertErr) {
          console.error(`❌ Error inserting slot for ${day} ${session.name}:`, slotInsertErr);
        } else {
          console.log(`✅ Inserted new slot for ${day} ${session.name}:`, newSlot);
        }
      }
    }
  }

  console.log('\n--- 3. Verifying Quantum Centre & Slots ---');
  const { data: finalSlots } = await supabase
    .from('slots')
    .select('id, day, session, venue, capacity, start_time, end_time, centre:centres(name, faculty_name, faculty_mobile)')
    .eq('centre_id', centreId);

  console.log('Final Quantum Centre Slots:\n', JSON.stringify(finalSlots, null, 2));
}

addQuantumCentre();
