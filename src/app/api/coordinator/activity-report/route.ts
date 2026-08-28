import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';



export async function POST(request: Request) {
  const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

  const GAS_URL = "https://script.google.com/macros/s/AKfycbxvoRfmASBoYbevaOn5TfIwgxTxLs4BnOMaOPgSwsYFv8ID73by6uiuYIfZi9Y-fSAH/exec";
  
  try {
    const payload = await request.json();

    const res = await fetch(GAS_URL, {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      }
    });

    // Also store it locally in Supabase for the delayed Admin Email trigger
    const { error: dbError } = await supabaseAdmin
      .from('activity_reports')
      .upsert({
        slot_id: payload.slotId,
        date: payload.date,
        session: payload.session,
        venue: payload.venue,
        entity_name: payload.entityName,
        entity_type: payload.entityType || 'UNKNOWN',
        coordinator_name: payload.coordinatorName,
        expected: payload.expected,
        present: payload.present,
        description: payload.description
      }, { onConflict: 'slot_id, date, session' });
      
    if (dbError) {
      console.error("Failed to store activity report in Supabase:", dbError);
      // We don't throw, we let it succeed if GAS succeeds so they don't lose data
    }

    if (!res.ok) {
      throw new Error(`Google Apps Script returned status ${res.status}`);
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("GAS POST Fetch Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to submit report to Google Apps Script' },
      { status: 500 }
    );
  }
}
