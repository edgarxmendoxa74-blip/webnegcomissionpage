import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
    const { data: workers, error } = await supabase.from('workers').select('*');
    if (error) {
        console.error(error);
    } else {
        console.log('Workers count:', workers.length);
        workers.forEach(w => console.log(`- ${w.name} (${w.role}, active: ${w.active})`));
    }
}

run();
