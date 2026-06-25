import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

const isMock = !process.env.NEXT_PUBLIC_SUPABASE_URL || 
               process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder-project');

export async function createClient() {
  if (isMock) {
    const cookieStore = await cookies();
    const hasSession = cookieStore.has('fitai-mock-session');
    const mockProfileCookie = cookieStore.get('fitai-mock-profile');

    return {
      auth: {
        async getUser() {
          if (hasSession) {
            return { data: { user: { id: 'd3b07384-d113-4956-b5e1-fd581e1e2d9a', email: 'mock@example.com' } }, error: null };
          }
          return { data: { user: null }, error: null };
        }
      },
      from() {
        return {
          select() {
            return {
              eq() {
                return {
                  async single() {
                    console.log('Server Supabase: mockProfileCookie =', mockProfileCookie);
                    if (mockProfileCookie?.value) {
                      try {
                        const decoded = decodeURIComponent(mockProfileCookie.value);
                        console.log('Server Supabase: decoded =', decoded);
                        const parsed = JSON.parse(decoded);
                        console.log('Server Supabase: parsed profile =', parsed);
                        return { data: parsed, error: null };
                      } catch (err: any) {
                        console.error('Server Supabase: error parsing profile cookie:', err);
                      }
                    }
                    console.log('Server Supabase: returning null profile');
                    return { data: null, error: null };
                  }
                };
              }
            };
          }
        };
      }
    } as any;
  }

  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing user sessions.
          }
        },
      },
    }
  );
}
