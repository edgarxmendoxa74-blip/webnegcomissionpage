import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://bgqfkbdgecgsgbnkjise.supabase.co'
const supabaseKey = 'sb_publishable_k7DofZHwAn1cEYh9nJ5aJw_pR_UjOkL'
const supabase = createClient(supabaseUrl, supabaseKey)

async function fetchStorage() {
  console.log('Fetching client storage...')
  
  const { data, error } = await supabase
    .from('client_storage')
    .select('*, worker:workers!worker_id(name), assigned_webdev:workers!assigned_webdev_id(name)')
    
  if (error) {
    console.error('Error:', error)
    return
  }

  const edgarRecords = data.filter(r => 
    r.worker?.name?.toLowerCase().includes('edgar') || 
    r.assigned_webdev?.name?.toLowerCase().includes('edgar')
  )

  console.log(`Found ${edgarRecords.length} records for Edgar:`)
  console.log(JSON.stringify(edgarRecords, null, 2))
}

fetchStorage()
