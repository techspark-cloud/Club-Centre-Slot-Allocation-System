const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function revert() {
  // Wednesday Morning: 18 centres, need total = 450, so 25 each
  // Thursday Morning: 9 centres, need total = 450, so 50 each
  // Friday Evening: 9 centres, need total = 450, so 50 each

  const slotSets = [
    { day: 'WEDNESDAY', session: 'FORENOON', capPerSlot: 25 },   // 18 × 25 = 450
    { day: 'THURSDAY', session: 'FORENOON', capPerSlot: 50 },    // 9 × 50 = 450
    { day: 'FRIDAY', session: 'AFTERNOON', capPerSlot: 50 },     // 9 × 50 = 450
  ];

  for (const { day, session, capPerSlot } of slotSets) {
    const { data: slots } = await supabase
      .from('slots')
      .select('id')
      .eq('status', 'ACTIVE')
      .eq('day', day)
      .eq('session', session)
      .not('centre_id', 'is', null);

    console.log(`${day} ${session}: ${slots?.length} slots → setting each to ${capPerSlot} (total: ${(slots?.length||0)*capPerSlot})`);
    
    for (const slot of (slots || [])) {
      await supabase.from('slots').update({ capacity: capPerSlot }).eq('id', slot.id);
    }
  }

  console.log("\nDone! Total per-day centre capacity now = 450 for each problem day.");
  console.log("Deficits: Wed Morning: 504-450=54, Thu Morning: 455-450=5, Fri Evening: 518-450=68");
}

revert().catch(console.error);
