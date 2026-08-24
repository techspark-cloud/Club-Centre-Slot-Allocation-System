import { NextResponse } from 'next/server';

export async function GET() {
  const GAS_URL = "https://script.google.com/macros/s/AKfycbzCt4gzTXrlASBm-fV26GSMPLHprdA5hvNwTH4Ko6NugcxnyB1dX_GSbaz-zLk80zq6/exec";
  
  try {
    const res = await fetch(GAS_URL, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!res.ok) {
      throw new Error(`Google Apps Script returned status ${res.status}`);
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("GAS Fetch Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch from Google Apps Script' },
      { status: 500 }
    );
  }
}
