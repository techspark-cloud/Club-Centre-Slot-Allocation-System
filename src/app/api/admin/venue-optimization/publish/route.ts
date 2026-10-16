import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const BUCKET_NAME = 'venue_plans';
const FILE_NAME = 'active_rebalanced_plan.json';

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(supabaseUrl, supabaseServiceKey);
}

// GET: Check published status and get active plan
export async function GET() {
  try {
    const supabase = getAdminClient();
    const { data: fileBlob, error } = await supabase.storage
      .from(BUCKET_NAME)
      .download(FILE_NAME);

    if (error || !fileBlob) {
      return NextResponse.json({
        isPublished: false,
        publishedPlan: null,
      });
    }

    const planText = await fileBlob.text();
    const plan = JSON.parse(planText);

    return NextResponse.json({
      isPublished: true,
      publishedPlan: plan,
    });
  } catch (err: any) {
    console.error('Failed to get published plan:', err);
    return NextResponse.json({
      isPublished: false,
      publishedPlan: null,
      error: err.message,
    });
  }
}

// POST: Publish / Save Venue Rebalancing Plan
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { suggestions, publishedBy } = body;

    if (!suggestions || !Array.isArray(suggestions)) {
      return NextResponse.json(
        { error: 'Invalid suggestions payload' },
        { status: 400 }
      );
    }

    const studentVenueMap: Record<string, {
      slotId: string;
      venue: string;
      labType: 'A' | 'B';
      centreName: string;
      day: string;
      timing: string;
      spilloverCentreName?: string;
    }> = {};

    const sectionVenueMap: Record<string, {
      slotId: string;
      venue: string;
      labType: 'A' | 'B';
    }> = {};

    // Build fast lookup maps for students and sections
    suggestions.forEach((item: any) => {
      const slotId = item.id;
      const venueA = item.planA?.venue || item.currentVenue;
      const venueB = item.planB?.venue;
      const spilloverCentre = item.planB?.spilloverCentreName || '';

      // Lab A sections & students
      (item.planA?.sections || []).forEach((sec: any) => {
        sectionVenueMap[`${slotId}__${sec.name}`] = {
          slotId,
          venue: venueA,
          labType: 'A',
        };
        (sec.students || []).forEach((st: any) => {
          if (st.id) {
            studentVenueMap[st.id] = {
              slotId,
              venue: venueA,
              labType: 'A',
              centreName: item.centreName,
              day: item.day,
              timing: item.timing,
            };
          }
        });
      });

      // Lab B sections & students (Spillover)
      (item.planB?.sections || []).forEach((sec: any) => {
        sectionVenueMap[`${slotId}__${sec.name}`] = {
          slotId,
          venue: venueB,
          labType: 'B',
        };
        (sec.students || []).forEach((st: any) => {
          if (st.id) {
            studentVenueMap[st.id] = {
              slotId,
              venue: venueB,
              labType: 'B',
              centreName: item.centreName,
              day: item.day,
              timing: item.timing,
              spilloverCentreName: spilloverCentre,
            };
          }
        });
      });
    });

    const publishedPlan = {
      publishedAt: new Date().toISOString(),
      publishedBy: publishedBy || 'Admin',
      totalSlotsRebalanced: suggestions.length,
      suggestions,
      studentVenueMap,
      sectionVenueMap,
    };

    const supabase = getAdminClient();

    // Ensure bucket exists
    await supabase.storage.createBucket(BUCKET_NAME, { public: true }).catch(() => {});

    // Upload to storage
    const { error: uploadErr } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(FILE_NAME, JSON.stringify(publishedPlan, null, 2), {
        upsert: true,
        contentType: 'application/json',
      });

    if (uploadErr) {
      throw uploadErr;
    }

    return NextResponse.json({
      success: true,
      message: 'Venue rebalancing plan published successfully',
      publishedAt: publishedPlan.publishedAt,
      totalStudentsMapped: Object.keys(studentVenueMap).length,
      publishedPlan,
    });
  } catch (err: any) {
    console.error('Failed to publish venue plan:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to publish plan' },
      { status: 500 }
    );
  }
}

// DELETE: Unpublish / Revert plan
export async function DELETE() {
  try {
    const supabase = getAdminClient();
    const { error } = await supabase.storage.from(BUCKET_NAME).remove([FILE_NAME]);
    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: 'Published plan successfully cleared. Allocations reverted to default venues.',
    });
  } catch (err: any) {
    console.error('Failed to clear published plan:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to clear published plan' },
      { status: 500 }
    );
  }
}
