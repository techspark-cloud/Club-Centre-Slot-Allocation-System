import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (user) {
      await supabase.auth.signOut()
    }
  } catch (err) {
    console.error('Sign out error:', err)
  }

  const acceptHeader = request.headers.get('accept') || ''
  const isJson = acceptHeader.includes('application/json')

  if (isJson) {
    return NextResponse.json({ success: true, redirect: '/login' })
  }

  return NextResponse.redirect(new URL('/login', request.url), 303)
}
