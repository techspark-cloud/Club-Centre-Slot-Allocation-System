import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import * as cheerio from 'cheerio';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { url, studentId } = body;

    if (!url || !studentId) {
      return NextResponse.json({ success: false, message: 'Missing URL or Student ID' }, { status: 400 });
    }

    // 1. Verify the URL is actually an RIT IMS URL
    if (!url.startsWith('https://ims.ritchennai.edu.in/id-card/qr-verification/')) {
      return NextResponse.json({ success: false, message: 'Invalid QR Code. Please scan your RIT ID card.' }, { status: 400 });
    }

    // 2. Fetch the logged-in student's register number from our DB
    const { data: student, error: studentErr } = await supabase
      .from('students')
      .select('register_no, id_card_verified')
      .eq('id', studentId)
      .single();

    if (studentErr || !student) {
      return NextResponse.json({ success: false, message: 'Student record not found.' }, { status: 404 });
    }

    if (student.id_card_verified) {
      return NextResponse.json({ success: true, message: 'Already verified.' });
    }

    // 3. Fetch the IMS verification page
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`IMS responded with status: ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // 4. Extract Register Number from the HTML
    // The HTML has a structure like <td>Register Number</td><td>:</td><td>2117250050018</td>
    let foundRegisterNo = '';

    $('td').each((i, el) => {
      if ($(el).text().trim() === 'Register Number') {
        // The value is in the next next td sibling
        const valTd = $(el).next().next();
        if (valTd.length) {
          foundRegisterNo = valTd.text().trim();
        }
      }
    });

    if (!foundRegisterNo) {
      return NextResponse.json({ success: false, message: 'Could not extract Register Number from the scanned ID card.' }, { status: 400 });
    }

    // 5. Compare the scanned register number with our DB record
    if (foundRegisterNo !== student.register_no) {
      return NextResponse.json({ 
        success: false, 
        message: `ID Card Mismatch! Scanned ID card belongs to ${foundRegisterNo}, but your account is registered as ${student.register_no}.`
      }, { status: 403 });
    }

    // 6. Match successful! Update the student record using Service Role to bypass RLS
    const { createClient: createSupabaseClient } = require('@supabase/supabase-js');
    const supabaseAdmin = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { error: updateErr } = await supabaseAdmin
      .from('students')
      .update({ id_card_verified: true })
      .eq('id', studentId);

    if (updateErr) {
      throw new Error('Failed to update verification status in database: ' + updateErr.message);
    }

    return NextResponse.json({ success: true, message: 'ID Card Verified Successfully!' });
    
  } catch (error: any) {
    console.error('QR Verification Error:', error);
    return NextResponse.json({ success: false, message: error.message || 'Internal server error during verification.' }, { status: 500 });
  }
}
