'use server';

import { createClient } from '@supabase/supabase-js';

// We use the service role key to bypass RLS for admin operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function addHoliday(date: string, description: string) {
  try {
    const { data, error } = await supabaseAdmin
      .from('holidays')
      .insert([{ date, description }])
      .select();

    if (error) {
      if (error.code === '23505') {
        return { success: false, error: 'A holiday is already declared for this date' };
      }
      return { success: false, error: 'Failed to add holiday' };
    }
    
    return { success: true, data: data[0] };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteHoliday(id: string) {
  try {
    const { error } = await supabaseAdmin
      .from('holidays')
      .delete()
      .eq('id', id);

    if (error) {
      return { success: false, error: 'Failed to delete holiday' };
    }
    
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
