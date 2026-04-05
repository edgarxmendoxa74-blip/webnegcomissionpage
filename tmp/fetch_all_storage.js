import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://bgqfkbdgecgsgbnkjise.supabase.co'
const supabaseKey = 'sb_publishable_k7DofZHwAn1cEYh9nJ5aJw_pR_UjOkL'
const supabase = createClient(supabaseUrl, supabaseKey)

async function fetchAll() {
  console.log('Fetching all client storage...')
  
  const { data, error } = await supabase
    .from('client_storage')
    .select('*, worker:workers!worker_id(name)')
    
  if (error) {
    console.error('Error:', error)
    return
  }

  console.log(`Total records: ${data?.length || 0}`)
  console.log(JSON.stringify(data, null, 2))
}

fetchAll()
