import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Fetch all centre slots
    const { data: slots, error: slotErr } = await supabase
      .from('slots')
      .select('*, centre:centres(id, name, faculty_name, faculty_mobile)')
      .not('centre_id', 'is', null)
      .order('day')
      .order('session')
      .order('start_time');

    if (slotErr) throw slotErr;

    // Filter out non-academic/sports or zero capacity
    const academicSlots = (slots || []).filter(
      s => s.centre?.name !== 'Sports' && s.capacity > 0
    );

    // Find all crowded slot IDs (allocated_count >= 70)
    const crowdedSlots = academicSlots.filter(s => (s.allocated_count || 0) >= 70);
    const crowdedIds = crowdedSlots.map(s => s.id);

    // 2. Fetch allocations for all crowded slots in one batch
    let allocMap: Record<string, any[]> = {};
    if (crowdedIds.length > 0) {
      const { data: allocData, error: allocErr } = await supabase
        .from('allocations')
        .select(`
          id,
          slot_id,
          student:students (
            id,
            name,
            register_no,
            course,
            section,
            contact_no
          )
        `)
        .in('slot_id', crowdedIds);

      if (!allocErr && allocData) {
        allocData.forEach(a => {
          if (!a.student) return;
          if (!allocMap[a.slot_id]) allocMap[a.slot_id] = [];
          allocMap[a.slot_id].push(a.student);
        });
      }
    }

    // 3. Group slots by Day and Time
    const buckets: Record<string, any[]> = {};
    academicSlots.forEach(s => {
      const key = `${s.day}__${s.session}__${s.start_time?.substring(0, 5)}`;
      if (!buckets[key]) buckets[key] = [];
      buckets[key].push(s);
    });

    const suggestions: any[] = [];

    // 4. Process each bucket
    for (const [key, bSlots] of Object.entries(buckets)) {
      const crowdedInBucket = bSlots
        .filter(s => (s.allocated_count || 0) >= 70)
        .sort((a, b) => (b.allocated_count || 0) - (a.allocated_count || 0));

      const availableInBucket = bSlots
        .filter(s => (s.allocated_count || 0) <= 25)
        .sort((a, b) => (a.allocated_count || 0) - (b.allocated_count || 0));

      const usedSpilloverVenues = new Set<string>();

      for (let i = 0; i < crowdedInBucket.length; i++) {
        const cSlot = crowdedInBucket[i];

        // Available rooms excluding cSlot's own venue
        const candidateVenues = availableInBucket
          .filter(a => a.venue !== cSlot.venue)
          .map(a => ({
            slotId: a.id,
            venue: a.venue || 'Unknown Room',
            centreName: a.centre?.name || 'Centre',
            currentCount: a.allocated_count || 0,
            capacity: a.capacity || 70,
            freeSeats: Math.max(0, (a.capacity || 70) - (a.allocated_count || 0)),
          }));

        // Pick best available room not already assigned in this bucket
        let matched = candidateVenues.find(v => !usedSpilloverVenues.has(v.venue)) || candidateVenues[0] || null;
        if (matched) {
          usedSpilloverVenues.add(matched.venue);
        }

        const slotStudents = allocMap[cSlot.id] || [];

        // Group by Section
        const secMap: Record<string, { name: string; count: number; students: any[] }> = {};
        slotStudents.forEach(st => {
          const cleanCourse = st.course?.replace(/^B\.Tech\.\s*|^B\.E\.\s*/i, '') || 'Dept';
          const sec = st.section ? `Sec ${st.section}` : 'General';
          const secKey = `${cleanCourse} (${sec})`;

          if (!secMap[secKey]) {
            secMap[secKey] = { name: secKey, count: 0, students: [] };
          }
          secMap[secKey].count += 1;
          secMap[secKey].students.push(st);
        });

        // Greedy 2-way section split
        const sortedSecEntries = Object.values(secMap).sort((a, b) => b.count - a.count);
        let countA = 0;
        let countB = 0;
        const sectionsA: any[] = [];
        const sectionsB: any[] = [];

        sortedSecEntries.forEach(item => {
          if (countA <= countB) {
            sectionsA.push(item);
            countA += item.count;
          } else {
            sectionsB.push(item);
            countB += item.count;
          }
        });

        suggestions.push({
          id: cSlot.id,
          day: cSlot.day,
          session: cSlot.session,
          startTime: cSlot.start_time?.substring(0, 5),
          endTime: cSlot.end_time?.substring(0, 5),
          timing: `${cSlot.start_time?.substring(0, 5)} - ${cSlot.end_time?.substring(0, 5)}`,
          centreName: cSlot.centre?.name || 'Centre',
          coordinatorName: cSlot.centre?.faculty_name || 'N/A',
          coordinatorMobile: cSlot.centre?.faculty_mobile || 'N/A',
          currentVenue: cSlot.venue || 'Venue TBA',
          totalEnrolled: cSlot.allocated_count || slotStudents.length,
          capacity: cSlot.capacity,
          candidateVenues,
          selectedSpilloverVenue: matched ? matched.venue : 'Spillover Lab',
          matchedSpillover: matched,
          planA: {
            venue: cSlot.venue || 'Room A',
            total: countA,
            sections: sectionsA,
          },
          planB: {
            venue: matched ? matched.venue : 'Spillover Lab',
            spilloverCentreName: matched ? matched.centreName : '',
            total: countB,
            sections: sectionsB,
          },
        });
      }
    }

    const dayOrder: Record<string, number> = {
      MONDAY: 1, TUESDAY: 2, WEDNESDAY: 3, THURSDAY: 4, FRIDAY: 5
    };

    suggestions.sort((a, b) => {
      const dDiff = (dayOrder[a.day] || 99) - (dayOrder[b.day] || 99);
      if (dDiff !== 0) return dDiff;
      return b.totalEnrolled - a.totalEnrolled;
    });

    return NextResponse.json({
      success: true,
      count: suggestions.length,
      suggestions,
    });
  } catch (error: any) {
    console.error('API /api/admin/venue-optimization failed:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
