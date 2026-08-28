import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { session } } = await supabase.auth.getSession()
  const user = session?.user

  const url = request.nextUrl.clone()
  
  if (user) {
    if (url.pathname === '/login') {
      url.pathname = '/'
      const redirectResponse = NextResponse.redirect(url)
      
      // Preserve any cookies set by supabase (e.g. refreshed sessions)
      supabaseResponse.cookies.getAll().forEach((cookie) => {
        redirectResponse.cookies.set(cookie.name, cookie.value)
      })
      
      return redirectResponse
    }
  } else {
    if (
      url.pathname !== '/login' && 
      !url.pathname.startsWith('/verify') && 
      !url.pathname.startsWith('/api') && 
      !url.pathname.startsWith('/_next') && 
      url.pathname !== '/favicon.ico' && 
      url.pathname !== '/favicon.webp'
    ) {
      url.pathname = '/login'
      const redirectResponse = NextResponse.redirect(url)
      
      // Preserve any cookies set by supabase
      supabaseResponse.cookies.getAll().forEach((cookie) => {
        redirectResponse.cookies.set(cookie.name, cookie.value)
      })
      
      return redirectResponse
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
