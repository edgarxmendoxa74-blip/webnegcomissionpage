import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://bgqfkbdgecgsgbnkjise.supabase.co'
const supabaseKey = 'sb_publishable_k7DofZHwAn1cEYh9nJ5aJw_pR_UjOkL'
const supabase = createClient(supabaseUrl, supabaseKey)

async function fetchLeads() {
  const { data } = await supabase.from('leads').select('*, worker:workers!worker_id(name)')
  console.log(data)
}

fetchLeads()
