import { NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const allocationsCache = new Map<string, { data: any[], timestamp: number }>();
const CACHE_TTL = 1 * 60 * 1000; // 1 minute cache

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');

    if (!date) {
      return NextResponse.json({ error: 'Missing date parameter' }, { status: 400 });
    }

    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: profile } = await supabaseAdmin.from('profiles').select('role').eq('id', user.id).single();
    const allowedRoles = ['SUPER_ADMIN', 'ALLOCATION_ADMIN', 'OVERALL_CLUB_COORDINATOR', 'OVERALL_CENTRE_COORDINATOR'];
    if (!profile || !allowedRoles.includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const dateObj = new Date(date);
    const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
    const dayOfWeek = days[dateObj.getDay()];
    
    // The database enum only supports Monday-Friday
    const validDays = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'];

    let allocations: any[] = [];
    
    if (validDays.includes(dayOfWeek)) {
      const cached = allocationsCache.get(dayOfWeek);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        allocations = cached.data;
      } else {
        // Fetch all allocations using pagination
        let from = 0;
        const step = 1000;
        let hasMore = true;
        
        while (hasMore) {
          const { data, error: allocError } = await supabaseAdmin
            .from('allocations')
            .select(`
              student_id,
              slot_id,
              slot:slots!inner (
                id, day, club_id, centre_id, venue, start_time, end_time, session,
                clubs (name),
                centres (name)
              )
            `)
            .eq('slots.day', dayOfWeek)
            .range(from, from + step - 1);

          if (allocError) throw allocError;
          
          if (data && data.length > 0) {
            allocations = [...allocations, ...data];
            from += step;
          }
          
          if (!data || data.length < step) {
            hasMore = false;
          }
        }
        
        allocationsCache.set(dayOfWeek, { data: allocations, timestamp: Date.now() });
      }
    }

    // Get attendance for the date using pagination
    let allAttendance: any[] = [];
    let attFrom = 0;
    const attStep = 1000;
    let attHasMore = true;
    
    while (attHasMore) {
      const { data: attData, error: attError } = await supabaseAdmin
        .from('attendance')
        .select('*')
        .eq('date', date)
        .range(attFrom, attFrom + attStep - 1);

      if (attError) throw attError;
      
      if (attData && attData.length > 0) {
        allAttendance = [...allAttendance, ...attData];
        attFrom += attStep;
      }
      
      if (!attData || attData.length < attStep) {
        attHasMore = false;
      }
    }

    const slotStats = new Map();

    allocations?.forEach((alloc: any) => {
      const slotId = alloc.slot_id;
      if (!slotStats.has(slotId)) {
        slotStats.set(slotId, {
          slot: alloc.slot,
          totalExpected: 0,
          present: 0,
          absent: 0,
          pending: 0
        });
      }
      slotStats.get(slotId).totalExpected += 1;
      slotStats.get(slotId).pending += 1;
    });

    allAttendance?.forEach((record: any) => {
      const stat = slotStats.get(record.slot_id);
      if (stat) {
        if (record.status === 'PRESENT') {
          stat.present += 1;
          stat.pending -= 1;
        } else if (record.status === 'ABSENT') {
          stat.absent += 1;
          stat.pending -= 1;
        }
      }
    });

    return NextResponse.json({ data: Array.from(slotStats.values()) });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
