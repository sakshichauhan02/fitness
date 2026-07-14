import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const isMock = !process.env.NEXT_PUBLIC_SUPABASE_URL || 
               process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder-project');

export async function middleware(request: NextRequest) {
  let user: any = null;
  let supabaseResponse = NextResponse.next({
    request,
  });

  if (isMock) {
    const hasMockSession = request.cookies.has('fitai-mock-session');
    if (hasMockSession) {
      const mockUserCookie = request.cookies.get('fitai-mock-user');
      if (mockUserCookie?.value) {
        try {
          user = JSON.parse(decodeURIComponent(mockUserCookie.value));
        } catch {
          user = { id: 'd3b07384-d113-4956-b5e1-fd581e1e2d9a', email: 'mock@example.com' };
        }
      } else {
        user = { id: 'd3b07384-d113-4956-b5e1-fd581e1e2d9a', email: 'mock@example.com' };
      }
    }
  } else {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
            supabaseResponse = NextResponse.next({
              request,
            });
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options)
            );
          },
        },
      }
    );

    // Retrieve user session. This refreshes the session cookie if expired.
    const {
      data: { user: supabaseUser },
    } = await supabase.auth.getUser();
    user = supabaseUser;
  }

  const url = request.nextUrl.clone();

  // 1. If not authenticated and trying to access protected pages:
  if (!user) {
    if (url.pathname.startsWith('/dashboard') || url.pathname.startsWith('/onboarding') || url.pathname === '/') {
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }
  }

  // 2. If authenticated and trying to access auth pages:
  if (user) {
    if (url.pathname === '/login' || url.pathname === '/') {
      url.pathname = '/dashboard';
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - Images, svgs, etc.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
