import { NextResponse } from 'next/server';

export async function POST(request: Request) {
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
