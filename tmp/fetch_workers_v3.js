import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const supabaseUrl = 'https://bgqfkbdgecgsgbnkjise.supabase.co'
const supabaseKey = 'sb_publishable_k7DofZHwAn1cEYh9nJ5aJw_pR_UjOkL'
const supabase = createClient(supabaseUrl, supabaseKey)

async function fetchWorkers() {
  const { data } = await supabase.from('workers').select('*')
  fs.writeFileSync('tmp/workers_data.json', JSON.stringify(data, null, 2))
}

fetchWorkers()
