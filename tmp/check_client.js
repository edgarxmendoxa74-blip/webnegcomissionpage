import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://bgqfkbdgecgsgbnkjise.supabase.co'
const supabaseKey = 'sb_publishable_k7DofZHwAn1cEYh9nJ5aJw_pR_UjOkL'
const supabase = createClient(supabaseUrl, supabaseKey)

async function checkClient() {
  const { data } = await supabase.from('client_storage').select('*').ilike('client_name', '%Edgar%')
  console.log(data)
}

checkClient()
