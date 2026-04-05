import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const supabaseUrl = 'https://bgqfkbdgecgsgbnkjise.supabase.co'
const supabaseKey = 'sb_publishable_k7DofZHwAn1cEYh9nJ5aJw_pR_UjOkL'
const supabase = createClient(supabaseUrl, supabaseKey)

async function fetchAll() {
  const { data } = await supabase.from('client_storage').select('*')
  fs.writeFileSync('tmp/client_storage_all.json', JSON.stringify(data, null, 2))
}

fetchAll()
