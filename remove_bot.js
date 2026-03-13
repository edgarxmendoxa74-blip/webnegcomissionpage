import { createClient } from '@supabase/supabase-js';
process.loadEnvFile('.env');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function removeBot() {
    const internalEmail = `adminbot@webnegosyo.internal`;
    const password = 'AdminBot2026!';

    console.log('Logging in as adminbot...');
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: internalEmail,
        password
    });

    if (authError) {
        console.error('Sign in error:', authError);
        return;
    }
    console.log('Logged in. Deleting profile...');

    const { error: profileError } = await supabase
        .from('workers')
        .delete()
        .eq('user_id', authData.user.id);

    if (profileError) {
        console.error('Profile delete error:', profileError);
    } else {
        console.log('Profile deleted successfully.');
    }
}

removeBot();
