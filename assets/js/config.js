// config.js — Supabase client singleton
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL = 'https://xclvuifcjhohojgrqxmt.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhjbHZ1aWZjamhvaG9qZ3JxeG10Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMxMjU0NDgsImV4cCI6MjA5ODcwMTQ0OH0.j5qRWPXr2dID2-4usTdMMOkNbSGltsoHXOLaz6DN644';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);

// Creates a throwaway Supabase client that does NOT persist its session to
// localStorage/storage. Used when an already-logged-in admin needs to call
// supabase.auth.signUp() to create a member account — calling signUp() on the
// main `supabase` client would overwrite the admin's own session with the
// newly created user's session (a well-known Supabase gotcha) and silently
// log the admin out. This isolated client lets that signUp happen without
// touching the admin's active session at all.
export function createIsolatedClient() {
    return createClient(SUPABASE_URL, SUPABASE_ANON, {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false,
        },
    });
}
