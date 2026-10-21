import { NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  try {
    const supabaseUser = await createServerClient();
    const { data: { user } } = await supabaseUser.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { slotId, staffName, staffMobile, staffDept } = await req.json();
    if (!slotId || !staffName?.trim() || !staffMobile?.trim()) {
      return NextResponse.json({ error: 'Slot ID, Staff Name, and Mobile Number are required.' }, { status: 400 });
    }

    const cleanMobile = staffMobile.replace(/\D/g, '');
    if (cleanMobile.length < 10) {
      return NextResponse.json({ error: 'Please enter a valid 10-digit mobile number.' }, { status: 400 });
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 1. Verify slot and centre
    const { data: slot, error: slotErr } = await supabaseAdmin
      .from('slots')
      .select('id, centre_id, day, start_time, end_time')
      .eq('id', slotId)
      .single();

    if (slotErr || !slot || !slot.centre_id) {
      return NextResponse.json({ error: 'Invalid slot or not associated with a Centre' }, { status: 404 });
    }

    // 2. Verify user authorization
    const { data: cec } = await supabaseAdmin
      .from('centre_coordinators')
      .select('profile_id')
      .eq('profile_id', user.id)
      .eq('centre_id', slot.centre_id)
      .maybeSingle();

    if (!cec) {
      const { data: prof } = await supabaseAdmin
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();

      if (prof?.role !== 'SUPER_ADMIN' && prof?.role !== 'ALLOCATION_ADMIN') {
        return NextResponse.json({ error: 'Forbidden: You are not authorized for this centre.' }, { status: 403 });
      }
    }

    // 3. Create or find Auth user for this faculty member
    const email = `${cleanMobile}@rit.faculty`;
    const password = cleanMobile;
    let authUserId: string | null = null;

    const { data: usersData, error: listErr } = await supabaseAdmin.auth.admin.listUsers();
    if (listErr) {
      console.error('Error listing auth users:', listErr);
    }
    const existing = usersData?.users?.find(u => u.email === email);

    if (existing) {
      authUserId = existing.id;
      await supabaseAdmin.auth.admin.updateUserById(authUserId, {
        user_metadata: {
          full_name: staffName.trim(),
          role: 'CENTRE_COORDINATOR',
          dept: staffDept || undefined,
        }
      });
    } else {
      const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: staffName.trim(),
          role: 'CENTRE_COORDINATOR',
          dept: staffDept || undefined,
        }
      });
      if (createErr || !created.user) {
        return NextResponse.json({ error: createErr?.message || 'Failed to create auth user' }, { status: 500 });
      }
      authUserId = created.user.id;
    }

    // 4. Ensure profile exists in profiles table
    await supabaseAdmin
      .from('profiles')
      .upsert({
        id: authUserId,
        role: 'CENTRE_COORDINATOR',
        full_name: staffName.trim(),
        email,
        is_active: true,
        updated_at: new Date().toISOString(),
      });

    // 5. Link coordinator to centre in centre_coordinators
    const { data: existingCc } = await supabaseAdmin
      .from('centre_coordinators')
      .select('profile_id')
      .eq('centre_id', slot.centre_id)
      .eq('profile_id', authUserId)
      .maybeSingle();

    if (!existingCc) {
      await supabaseAdmin
        .from('centre_coordinators')
        .insert({
          centre_id: slot.centre_id,
          profile_id: authUserId,
          is_primary: false,
        });
    }

    // 6. Update active_rebalanced_plan.json in Supabase Storage
    const { data: planBlob } = await supabaseAdmin.storage
      .from('venue_plans')
      .download('active_rebalanced_plan.json');

    let currentPlan: any = null;
    if (planBlob) {
      currentPlan = JSON.parse(await planBlob.text());
    }

    if (currentPlan && Array.isArray(currentPlan.suggestions)) {
      const suggestion = currentPlan.suggestions.find((s: any) => s.id === slotId);
      if (suggestion && suggestion.planB) {
        suggestion.planB.assignedStaff = {
          name: staffName.trim(),
          mobile: cleanMobile,
          dept: staffDept || '',
          profileId: authUserId,
          assignedAt: new Date().toISOString(),
        };

        const updatedBytes = Buffer.from(JSON.stringify(currentPlan, null, 2), 'utf8');
        await supabaseAdmin.storage
          .from('venue_plans')
          .upload('active_rebalanced_plan.json', updatedBytes, {
            contentType: 'application/json',
            upsert: true,
          });
      }
    }

    return NextResponse.json({
      success: true,
      assignedStaff: {
        name: staffName.trim(),
        mobile: cleanMobile,
        dept: staffDept || '',
        loginEmail: email,
        profileId: authUserId,
      },
      updatedPlan: currentPlan,
    });
  } catch (err: any) {
    console.error('Error assigning lab venue staff:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
