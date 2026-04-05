import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://bgqfkbdgecgsgbnkjise.supabase.co'
const supabaseKey = 'sb_publishable_k7DofZHwAn1cEYh9nJ5aJw_pR_UjOkL'
const supabase = createClient(supabaseUrl, supabaseKey)

async function seedData() {
  console.log('Finding worker Edgar Mendoza...')
  const { data: worker } = await supabase.from('workers').select('id').ilike('name', '%Edgar Mendoza%').single()
  
  if (!worker) {
    console.error('Worker not found')
    return
  }

  console.log(`Inserting sample storage for worker ID: ${worker.id}`)
  
  const { data, error } = await supabase.from('client_storage').insert([
    {
      worker_id: worker.id,
      client_name: 'Edgar Mendoza (Sample)',
      business_name: 'WebNegosyo Solutions',
      website_link: 'https://webnegosyo.com',
      admin_link: 'https://webnegosyo.com/wp-admin',
      admin_email: 'admin@webnegosyo.com',
      admin_password: 'SecurePassword123!',
      supabase_email: 'supabase@webnegosyo.com',
      supabase_password: 'SupaPass987!',
      database_password: 'DB_Pass_2026',
      assigned_webdev_id: worker.id
    }
  ])

  if (error) {
    console.error('Error seeding data:', error)
  } else {
    console.log('Sample record created successfully!')
  }
}

seedData()
