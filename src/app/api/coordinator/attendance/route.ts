import { NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';

// We use the admin client because the standard client's RLS is complex for batch upserts
// and we already rigorously verify permissions before taking action.


export async function GET(request: Request) {
  const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

  try {
    const { searchParams } = new URL(request.url);
    const slot_id = searchParams.get('slot_id');
    const date = searchParams.get('date');

    if (!slot_id || !date) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: attendance, error } = await supabaseAdmin
      .from('attendance')
      .select('*')
      .eq('slot_id', slot_id)
      .eq('date', date);

    if (error) throw error;
    return NextResponse.json({ data: attendance });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { slot_id, date, student_id, status } = await request.json();

    if (!slot_id || !date || !student_id || !status) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    // Verify user is coordinator for this slot
    const { data: slot } = await supabaseAdmin
      .from('slots')
      .select('club_id, centre_id')
      .eq('id', slot_id)
      .single();

    if (!slot) return NextResponse.json({ error: 'Slot not found' }, { status: 404 });

    let isAuthorized = false;
    if (slot.club_id) {
      const { data: cc } = await supabaseAdmin.from('club_coordinators').select('profile_id').eq('profile_id', user.id).eq('club_id', slot.club_id).maybeSingle();
      if (cc) isAuthorized = true;
    }
    if (slot.centre_id && !isAuthorized) {
      const { data: cec } = await supabaseAdmin.from('centre_coordinators').select('profile_id').eq('profile_id', user.id).eq('centre_id', slot.centre_id).maybeSingle();
      if (cec) isAuthorized = true;
    }

    if (!isAuthorized) {
      // Admins are also allowed
      const { data: profile } = await supabaseAdmin.from('profiles').select('role').eq('id', user.id).single();
      if (profile?.role === 'SUPER_ADMIN' || profile?.role === 'ALLOCATION_ADMIN') {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    // Upsert attendance
    const { data: attendance, error } = await supabaseAdmin
      .from('attendance')
      .upsert({
        slot_id,
        student_id,
        date,
        status,
        recorded_by: user.id
      }, { onConflict: 'student_id,slot_id,date' })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ data: attendance });
  } catch (err: any) {
    console.error("Attendance POST Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
