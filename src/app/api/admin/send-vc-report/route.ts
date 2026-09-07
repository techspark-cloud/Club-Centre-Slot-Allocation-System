import { NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';

export async function POST(request: Request) {
  try {
    const { month, pdfBase64 } = await request.json();

    if (!month || !pdfBase64) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const toEmail = 'viceprincipal@ritchennai.edu.in'; // As requested by user

    // 1. Verify Auth & Permissions
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    const { data: profile } = await supabaseAdmin.from('profiles').select('role').eq('id', user.id).single();
    if (!profile || !['SUPER_ADMIN', 'ALLOCATION_ADMIN'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 2. Extract Base64 Data
    let base64Data = pdfBase64;
    if (pdfBase64.includes('base64,')) {
      base64Data = pdfBase64.split('base64,')[1];
    }

    // 3. Configure Nodemailer Transporter
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_APP_PASSWORD,
      },
    });

    // 4. Setup Email Data
    const mailOptions = {
      from: `"RIT Allocations" <${process.env.EMAIL_USER}>`,
      to: toEmail,
      subject: `Consolidated Monthly Attendance Report - All Departments - ${month}`,
      html: `
        <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px;">
          <h2>Consolidated Monthly Attendance Report</h2>
          <p>Dear Sir,</p>
          <p>Please find attached the automated Consolidated Monthly Attendance Report (Clubs and Centres) for <strong>all departments</strong> for the month of <strong>${month}</strong>.</p>
          <br/>
          <p>Best regards,<br/><strong>TechSpark Club</strong><br/>RIT Activity Allocation Portal</p>
        </div>
      `,
      attachments: [
        {
          filename: `Consolidated_Attendance_Report_${month.replace(/ /g, '_')}.pdf`,
          content: base64Data,
          encoding: 'base64'
        }
      ]
    };

    // 5. Send Email
    await transporter.sendMail(mailOptions);

    return NextResponse.json({ success: true });
    
  } catch (error: any) {
    console.error("Error sending VC PDF email:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
