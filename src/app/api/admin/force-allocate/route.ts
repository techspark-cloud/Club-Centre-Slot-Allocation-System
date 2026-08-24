import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!, // Use service role for admin bypass
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
        },
      }
    );

    // Verify Admin authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await request.json();
    const { studentId, slotId } = payload;

    if (!studentId || !slotId) {
      return NextResponse.json({ error: 'Missing student ID or slot ID' }, { status: 400 });
    }

    // 1. Check if student already has an allocation and revoke it
    const { data: existingAlloc } = await supabase
      .from('allocations')
      .select('*')
      .eq('student_id', studentId)
      .single();

    if (existingAlloc) {
      // Remove old allocation
      await supabase.from('allocations').delete().eq('id', existingAlloc.id);
      
      // Decrease old slot capacity
      const { data: oldSlot } = await supabase
        .from('slots')
        .select('allocated_count')
        .eq('id', existingAlloc.slot_id)
        .single();
        
      if (oldSlot && oldSlot.allocated_count > 0) {
        await supabase
          .from('slots')
          .update({ allocated_count: oldSlot.allocated_count - 1 })
          .eq('id', existingAlloc.slot_id);
      }
    }

    // 2. Fetch the target slot
    const { data: targetSlot, error: slotError } = await supabase
      .from('slots')
      .select('*')
      .eq('id', slotId)
      .single();

    if (slotError || !targetSlot) {
      return NextResponse.json({ error: 'Slot not found' }, { status: 404 });
    }

    // 3. Create the new allocation (forcing it)
    const { error: insertError } = await supabase
      .from('allocations')
      .insert({
        student_id: studentId,
        slot_id: slotId
      });

    if (insertError) {
      return NextResponse.json({ error: `Failed to force allocate: ${insertError.message}` }, { status: 500 });
    }

    // 4. Update the capacity of the target slot. 
    // If we are overriding the max capacity, we dynamically bump the capacity up to prevent DB constraint errors.
    const newCurrent = targetSlot.allocated_count + 1;
    const newMax = Math.max(targetSlot.capacity, newCurrent);

    const { error: updateError } = await supabase
      .from('slots')
      .update({ 
        allocated_count: newCurrent,
        capacity: newMax 
      })
      .eq('id', slotId);

    if (updateError) {
      // It allocated but failed to update capacity (should be rare)
      return NextResponse.json({ error: 'Allocated successfully, but failed to update capacity counters.' }, { status: 200 });
    }

    return NextResponse.json({ success: true, message: 'Successfully force-allocated slot!' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
