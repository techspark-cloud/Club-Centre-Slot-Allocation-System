import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const STANDARD_ROOM_CAPACITY = 70;

const ACADEMIC_VENUES = [
  'B2-02', 'B2-03', 'B2-04', 'B2-05', 'B2-06', 'B2-07',
  'B3-01', 'B3-02', 'B3-03', 'Green Building Ground floor'
];

// Partition algorithm:
// Exactly accommodates the first targetCap (70) students inside the original venue (Room A),
// and routes ONLY the balance remaining (total - 70) students to the spillover room (Room B)!
function partitionAccommodateCapacity(students: any[], targetCap = STANDARD_ROOM_CAPACITY) {
  const sortedStudents = [...students].sort((a, b) => {
    const cA = (a.course || '') + (a.section || '') + (a.register_no || '');
    const cB = (b.course || '') + (b.section || '') + (b.register_no || '');
    return cA.localeCompare(cB);
  });

  const studentsA = sortedStudents.slice(0, targetCap);
  const studentsB = sortedStudents.slice(targetCap);

  // Group studentsA by section
  const secMapA: Record<string, { name: string; count: number; students: any[] }> = {};
  studentsA.forEach(s => {
    const c = s.course?.replace(/^B\.Tech\.\s*|^B\.E\.\s*/i, '') || 'Dept';
    const sec = s.section ? `Sec ${s.section}` : 'General';
    const key = `${c} (${sec})`;
    if (!secMapA[key]) secMapA[key] = { name: key, count: 0, students: [] };
    secMapA[key].count += 1;
    secMapA[key].students.push(s);
  });

  // Group studentsB by section
  const secMapB: Record<string, { name: string; count: number; students: any[] }> = {};
  studentsB.forEach(s => {
    const c = s.course?.replace(/^B\.Tech\.\s*|^B\.E\.\s*/i, '') || 'Dept';
    const sec = s.section ? `Sec ${s.section}` : 'General';
    const key = `${c} (${sec})`;
    if (!secMapB[key]) secMapB[key] = { name: key, count: 0, students: [] };
    secMapB[key].count += 1;
    secMapB[key].students.push(s);
  });

  const sectionsA = Object.values(secMapA).sort((a, b) => b.count - a.count);
  const sectionsB = Object.values(secMapB).sort((a, b) => b.count - a.count);

  return {
    totalA: studentsA.length,
    sectionsA,
    studentsA,
    totalB: studentsB.length,
    sectionsB,
    studentsB,
  };
}

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

    // Find all crowded slot IDs (allocated_count > 70)
    const crowdedSlots = academicSlots.filter(s => (s.allocated_count || 0) > STANDARD_ROOM_CAPACITY);

    // 2. Fetch allocations for each crowded slot in parallel
    const allocMap: Record<string, any[]> = {};
    await Promise.all(
      crowdedSlots.map(async (cSlot) => {
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
          .eq('slot_id', cSlot.id);

        if (!allocErr && allocData) {
          allocMap[cSlot.id] = allocData.filter(a => a.student).map(a => a.student);
        }
      })
    );

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
        .filter(s => (s.allocated_count || 0) > STANDARD_ROOM_CAPACITY)
        .sort((a, b) => (b.allocated_count || 0) - (a.allocated_count || 0));

      // Calculate Live Capacity Status for ALL 10 Academic Venues in this hour
      const liveVenueStatus = ACADEMIC_VENUES.map(vName => {
        const matchedSlot = bSlots.find(
          s => s.venue?.trim().toLowerCase() === vName.toLowerCase()
        );
        const occupied = matchedSlot ? (matchedSlot.allocated_count || 0) : 0;
        const free = Math.max(0, STANDARD_ROOM_CAPACITY - occupied);
        const occupancyPct = Math.round((occupied / STANDARD_ROOM_CAPACITY) * 100);

        return {
          venue: vName,
          slotId: matchedSlot?.id || null,
          centreName: matchedSlot ? matchedSlot.centre?.name : 'Vacant Room',
          capacity: STANDARD_ROOM_CAPACITY,
          currentOccupied: occupied,
          freeSeats: free,
          occupancyPercentage: occupancyPct,
          isOvercrowded: occupied > STANDARD_ROOM_CAPACITY,
          statusLabel: occupied === 0 
            ? '100% Vacant' 
            : occupied <= 25 
              ? `${free} Free Seats` 
              : occupied <= 70 
                ? 'Full' 
                : `Overcrowded (+${occupied - STANDARD_ROOM_CAPACITY})`
        };
      });

      // Filter candidate spillover rooms: Venues with <= 30 occupied, sorted by lowest occupied (most free seats)
      const availableVenues = liveVenueStatus
        .filter(v => v.currentOccupied <= 30)
        .sort((a, b) => a.currentOccupied - b.currentOccupied);

      const usedSpilloverVenues = new Set<string>();

      for (let i = 0; i < crowdedInBucket.length; i++) {
        const cSlot = crowdedInBucket[i];

        // Available candidate rooms excluding cSlot's own venue
        const candidateVenues = availableVenues
          .filter(a => a.venue.toLowerCase() !== cSlot.venue?.trim().toLowerCase())
          .map(a => ({
            slotId: a.slotId,
            venue: a.venue,
            centreName: a.centreName,
            currentCount: a.currentOccupied,
            capacity: a.capacity,
            freeSeats: a.freeSeats,
            occupancyPercentage: a.occupancyPercentage,
          }));

        // Pick best available room not already assigned in this bucket
        let matched = candidateVenues.find(v => !usedSpilloverVenues.has(v.venue)) || candidateVenues[0] || null;
        if (matched) {
          usedSpilloverVenues.add(matched.venue);
        }

        const slotStudents = allocMap[cSlot.id] || [];
        const totalEnrolled = cSlot.allocated_count || slotStudents.length;

        // Accommodate 70 students in Room A, and ONLY balance (total - 70) students in Room B!
        const { totalA, sectionsA, totalB, sectionsB } = partitionAccommodateCapacity(slotStudents, STANDARD_ROOM_CAPACITY);

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
          totalEnrolled,
          capacity: STANDARD_ROOM_CAPACITY,
          excessCount: totalB,
          retainedInLabA: totalA,
          spilloverToLabB: totalB,
          candidateVenues,
          allVenuesLiveStatus: liveVenueStatus,
          selectedSpilloverVenue: matched ? matched.venue : 'Spillover Lab',
          matchedSpillover: matched,
          planA: {
            venue: cSlot.venue || 'Room A',
            total: totalA,
            capacity: STANDARD_ROOM_CAPACITY,
            occupancyPct: Math.round((totalA / STANDARD_ROOM_CAPACITY) * 100),
            sections: sectionsA,
          },
          planB: {
            venue: matched ? matched.venue : 'Spillover Lab',
            spilloverCentreName: matched ? matched.centreName : '',
            total: totalB,
            originalCapacity: STANDARD_ROOM_CAPACITY,
            spilloverFreeBefore: matched ? matched.freeSeats : STANDARD_ROOM_CAPACITY,
            spilloverFreeAfter: matched ? Math.max(0, matched.freeSeats - totalB) : Math.max(0, STANDARD_ROOM_CAPACITY - totalB),
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

    // Check if there is an active published rebalancing plan
    let publishedPlan: any = null;
    try {
      const { data: fileBlob } = await supabase.storage
        .from('venue_plans')
        .download('active_rebalanced_plan.json');
      if (fileBlob) {
        const text = await fileBlob.text();
        publishedPlan = JSON.parse(text);
      }
    } catch (e) {
      // Storage file not found or empty
    }

    const isPublished = !!(publishedPlan && publishedPlan.publishedAt && Array.isArray(publishedPlan.suggestions));

    return NextResponse.json({
      success: true,
      count: suggestions.length,
      isPublished,
      publishedAt: isPublished ? publishedPlan.publishedAt : null,
      publishedBy: isPublished ? publishedPlan.publishedBy : null,
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
