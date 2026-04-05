import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://bgqfkbdgecgsgbnkjise.supabase.co'
const supabaseKey = 'sb_publishable_k7DofZHwAn1cEYh9nJ5aJw_pR_UjOkL'
const supabase = createClient(supabaseUrl, supabaseKey)

async function fetchLeads() {
  console.log('Fetching leads for Edgar Mendoza...')
  
  const { data, error } = await supabase
    .from('leads')
    .select('*, worker:workers!worker_id(name)')
    
  if (error) {
    console.error('Error:', error)
    return
  }

  const edgarLeads = data.filter(l => 
    l.worker?.name?.toLowerCase().includes('edgar')
  )

  console.log(`Found ${edgarLeads.length} leads:`)
  console.log(JSON.stringify(edgarLeads.slice(0, 5), null, 2))
}

fetchLeads()
