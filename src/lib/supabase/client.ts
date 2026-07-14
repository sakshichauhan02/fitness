import { createBrowserClient } from '@supabase/ssr';

export const isMock = !process.env.NEXT_PUBLIC_SUPABASE_URL || 
                      process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder-project');

// Helper to get/set mock database in localStorage
function getMockUsersDB(): Record<string, any> {
  if (typeof window === 'undefined') return {};
  const db = localStorage.getItem('fitai_mock_users_db');
  return db ? JSON.parse(db) : {};
}

function saveMockUsersDB(db: Record<string, any>) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('fitai_mock_users_db', JSON.stringify(db));
}

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export function createClient() {
  if (isMock) {
    return {
      auth: {
        async getUser() {
          if (typeof window === 'undefined') return { data: { user: null }, error: null };
          const mockUserStr = localStorage.getItem('fitai_mock_user');
          if (mockUserStr) {
            const mockUser = JSON.parse(mockUserStr);
            // Self-healing: Ensure user ID is a valid UUID format for backend compatibility
            const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(mockUser.id);
            if (!isUuid) {
              localStorage.removeItem('fitai_mock_user');
              localStorage.removeItem('fitai_mock_profile');
              document.cookie = "fitai-mock-session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC; SameSite=Lax";
              document.cookie = "fitai-mock-profile=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC; SameSite=Lax";
              return { data: { user: null }, error: null };
            }
            
            // Ensure session and profile cookies are synchronized with localStorage in mock mode
            document.cookie = "fitai-mock-session=true; path=/; max-age=86400; SameSite=Lax";
            document.cookie = `fitai-mock-user=${encodeURIComponent(JSON.stringify(mockUser))}; path=/; max-age=86400; SameSite=Lax`;
            const profile = localStorage.getItem('fitai_mock_profile');
            if (profile) {
              document.cookie = `fitai-mock-profile=${encodeURIComponent(profile)}; path=/; max-age=86400; SameSite=Lax`;
            }
            return { data: { user: mockUser }, error: null };
          }
          return { data: { user: null }, error: null };
        },
        async signInWithPassword({ email, password }: { email: string; password?: string }) {
          const db = getMockUsersDB();
          const normalizedEmail = email.toLowerCase().trim();
          const userRecord = db[normalizedEmail];
          
          if (!userRecord || userRecord.password !== password) {
            return { 
              data: { user: null, session: null }, 
              error: { message: "Invalid login credentials." } 
            };
          }

          // Self-healing migration: Convert legacy non-UUID IDs to valid UUIDs
          if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userRecord.id)) {
            const newUuid = generateUUID();
            userRecord.id = newUuid;
            if (userRecord.profile) {
              userRecord.profile.id = newUuid;
            }
            db[normalizedEmail] = userRecord;
            saveMockUsersDB(db);
          }

          const user = { id: userRecord.id, email: userRecord.email };
          localStorage.setItem('fitai_mock_user', JSON.stringify(user));
          document.cookie = "fitai-mock-session=true; path=/; max-age=86400; SameSite=Lax";
          document.cookie = `fitai-mock-user=${encodeURIComponent(JSON.stringify(user))}; path=/; max-age=86400; SameSite=Lax`;
          
          if (userRecord.profile) {
            localStorage.setItem('fitai_mock_profile', JSON.stringify(userRecord.profile));
            document.cookie = `fitai-mock-profile=${encodeURIComponent(JSON.stringify(userRecord.profile))}; path=/; max-age=86400; SameSite=Lax`;
          }
          
          return { data: { user, session: {} }, error: null };
        },
        async signUp({ email, password, options }: { email: string; password?: string; options?: any }) {
          const db = getMockUsersDB();
          const normalizedEmail = email.toLowerCase().trim();
          
          if (db[normalizedEmail]) {
            return { 
              data: { user: null, session: null }, 
              error: { message: "An account with this email already exists." } 
            };
          }

          const mockUserId = generateUUID();
          const profile = { id: mockUserId, name: options?.data?.name || '', onboarded: false };
          
          const newUser = {
            id: mockUserId,
            email: normalizedEmail,
            password: password || "",
            profile
          };

          db[normalizedEmail] = newUser;
          saveMockUsersDB(db);

          const user = { id: mockUserId, email: normalizedEmail, raw_user_meta_data: options?.data || {} };
          localStorage.setItem('fitai_mock_user', JSON.stringify(user));
          document.cookie = "fitai-mock-session=true; path=/; max-age=86400; SameSite=Lax";
          document.cookie = `fitai-mock-user=${encodeURIComponent(JSON.stringify(user))}; path=/; max-age=86400; SameSite=Lax`;
          
          localStorage.setItem('fitai_mock_profile', JSON.stringify(profile));
          document.cookie = `fitai-mock-profile=${encodeURIComponent(JSON.stringify(profile))}; path=/; max-age=86400; SameSite=Lax`;
          
          return { data: { user, session: {} }, error: null };
        },
        async signOut() {
          localStorage.removeItem('fitai_mock_user');
          localStorage.removeItem('fitai_mock_profile');
          document.cookie = "fitai-mock-session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC; SameSite=Lax";
          document.cookie = "fitai-mock-user=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC; SameSite=Lax";
          document.cookie = "fitai-mock-profile=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC; SameSite=Lax";
          return { error: null };
        }
      },
      from(table?: string) {
        return {
          select(columns?: string) {
            return {
              eq(field: string, value: any) {
                return {
                  async single() {
                    if (table === 'user_streaks') {
                      const streaksStr = localStorage.getItem('fitai_mock_streaks');
                      const streaks = streaksStr ? JSON.parse(streaksStr) : {};
                      return { 
                        data: streaks[value] || { 
                          user_id: value, 
                          current_streak: 0, 
                          longest_streak: 0, 
                          last_completed_date: null 
                        }, 
                        error: null 
                      };
                    }
                    const p = localStorage.getItem('fitai_mock_profile');
                    return { data: p ? JSON.parse(p) : null, error: null };
                  },
                  then(resolve: any) {
                    if (table === 'user_badges') {
                      const badgesStr = localStorage.getItem('fitai_mock_badges');
                      const badges = badgesStr ? JSON.parse(badgesStr) : [];
                      const userBadges = badges.filter((b: any) => b.user_id === value);
                      resolve({ data: userBadges, error: null });
                    } else {
                      resolve({ data: [], error: null });
                    }
                    return this;
                  }
                };
              }
            };
          },
          update(updates: any) {
            return {
              eq(field: string, value: any) {
                if (table === 'user_streaks') {
                  const streaksStr = localStorage.getItem('fitai_mock_streaks');
                  const streaks = streaksStr ? JSON.parse(streaksStr) : {};
                  streaks[value] = { ...streaks[value], ...updates, user_id: value };
                  localStorage.setItem('fitai_mock_streaks', JSON.stringify(streaks));
                  return Promise.resolve({ data: streaks[value], error: null });
                }
                const pStr = localStorage.getItem('fitai_mock_profile');
                let p = pStr ? JSON.parse(pStr) : {};
                p = { ...p, ...updates };
                localStorage.setItem('fitai_mock_profile', JSON.stringify(p));
                document.cookie = `fitai-mock-profile=${encodeURIComponent(JSON.stringify(p))}; path=/; max-age=86400; SameSite=Lax`;
                
                const uStr = localStorage.getItem('fitai_mock_user');
                if (uStr) {
                  const activeUser = JSON.parse(uStr);
                  const db = getMockUsersDB();
                  const normalizedEmail = activeUser.email.toLowerCase().trim();
                  if (db[normalizedEmail]) {
                    db[normalizedEmail].profile = p;
                    saveMockUsersDB(db);
                  }
                }

                return Promise.resolve({ data: p, error: null });
              }
            };
          },
          upsert(data: any) {
            if (table === 'user_streaks') {
              const streaksStr = localStorage.getItem('fitai_mock_streaks');
              const streaks = streaksStr ? JSON.parse(streaksStr) : {};
              const userId = data.user_id;
              streaks[userId] = { ...streaks[userId], ...data };
              localStorage.setItem('fitai_mock_streaks', JSON.stringify(streaks));
              return {
                then(resolve: any) {
                  resolve({ data, error: null });
                  return this;
                }
              };
            }
            localStorage.setItem('fitai_mock_profile', JSON.stringify(data));
            document.cookie = `fitai-mock-profile=${encodeURIComponent(JSON.stringify(data))}; path=/; max-age=86400; SameSite=Lax`;
            
            const uStr = localStorage.getItem('fitai_mock_user');
            if (uStr) {
              const activeUser = JSON.parse(uStr);
              const db = getMockUsersDB();
              const normalizedEmail = activeUser.email.toLowerCase().trim();
              if (db[normalizedEmail]) {
                db[normalizedEmail].profile = data;
                saveMockUsersDB(db);
              }
            }

            return {
              then(resolve: any) {
                resolve({ data, error: null });
                return this;
              }
            };
          }
        };
      }
    } as any;
  }

  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
