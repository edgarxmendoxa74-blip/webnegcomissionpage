import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Supabase credentials missing. Please check your .env file.');
}

// Use sessionStorage so each browser tab keeps its own session independently.
// This prevents one tab's login from overwriting another tab's session —
// each account stays logged in until the user themselves clicks Logout.
export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '', {
    auth: {
        storage: window.sessionStorage,
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
    },
});
