import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://bgqfkbdgecgsgbnkjise.supabase.co'
const supabaseKey = 'sb_publishable_k7DofZHwAn1cEYh9nJ5aJw_pR_UjOkL'
const supabase = createClient(supabaseUrl, supabaseKey)

async function fetchLeads() {
  const { data, count } = await supabase.from('leads').select('*', { count: 'exact', head: false })
  console.log(`Leads count: ${count}`)
  console.log(data?.length)
}

fetchLeads()
