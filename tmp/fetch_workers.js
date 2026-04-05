import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://bgqfkbdgecgsgbnkjise.supabase.co'
const supabaseKey = 'sb_publishable_k7DofZHwAn1cEYh9nJ5aJw_pR_UjOkL'
const supabase = createClient(supabaseUrl, supabaseKey)

async function fetchWorkers() {
  console.log('Fetching all workers...')
  
  const { data, error } = await supabase
    .from('workers')
    .select('*')
    
  if (error) {
    console.error('Error:', error)
    return
  }

  console.log(`Total workers: ${data?.length || 0}`)
  data.forEach(w => console.log(`${w.name} (${w.role}) - ${w.email}`))
}

fetchWorkers()
