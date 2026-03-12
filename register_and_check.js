import { createClient } from '@supabase/supabase-js';
process.loadEnvFile('.env');

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
    const internalEmail = `adminbot@webnegosyo.internal`;
    const password = 'AdminBot2026!';

    console.log('Signing up adminbot...');
    const { data: authData, error: authError } = await supabase.auth.signUp({
        email: internalEmail,
        password
    });

    if (authError) {
        console.error('Sign up error:', authError);
    } else {
        console.log('User created:', authData.user.id);

        // Wait a small bit for any triggers, though not needed usually
        await new Promise(r => setTimeout(r, 1000));

        console.log('Inserting worker profile...');
        const { error: profileError } = await supabase.from('workers').insert({
            name: 'Admin Bot',
            email: internalEmail,
            user_id: authData.user.id,
            role: 'Owner',
            is_owner: true,
            active: true
        });

        if (profileError) {
            console.error('Profile insert error:', profileError);
        } else {
            console.log('Profile created successfully as Owner.');
        }

        // Now we are logged in as adminbot (auth state is kept in the client for this session)
        // Let's query all workers
        console.log('Querying all workers as Owner...');
        const { data: workers, error: fetchError } = await supabase.from('workers').select('*');
        if (fetchError) {
            console.error('Fetch error:', fetchError);
        } else {
            console.log('Total workers in DB:', workers.length);
            workers.forEach(w => console.log(`- ${w.name} (${w.role}, email: ${w.email}, active: ${w.active})`));
        }
    }
}

run();
