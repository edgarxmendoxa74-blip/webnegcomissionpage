const fs = require('fs');

const supabaseUrl = 'https://bgqfkbdgecgsgbnkjise.supabase.co';
const supabaseKey = 'sb_publishable_k7DofZHwAn1cEYh9nJ5aJw_pR_UjOkL';

const email = 'adminbot@webnegosyo.internal';
const password = 'AdminBot2026!';

async function run() {
  let token = '';
  let userId = '';

  console.log('Attempting to sign in...');
  try {
    const signInRes = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        'apikey': supabaseKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password })
    });

    const signInData = await signInRes.json();
    if (signInRes.ok && signInData.access_token) {
      console.log('Sign in successful!');
      token = signInData.access_token;
      userId = signInData.user.id;
    } else {
      console.log('Sign in failed, attempting to sign up...');
      const signUpRes = await fetch(`${supabaseUrl}/auth/v1/signup`, {
        method: 'POST',
        headers: {
          'apikey': supabaseKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      const signUpData = await signUpRes.json();
      if (signUpRes.ok && signUpData.id) {
        console.log('Sign up successful!');
        userId = signUpData.id;
        
        // Wait a bit
        await new Promise(r => setTimeout(r, 1000));
        
        // Sign in to get token
        const signInRes2 = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
          method: 'POST',
          headers: {
            'apikey': supabaseKey,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ email, password })
        });
        const signInData2 = await signInRes2.json();
        token = signInData2.access_token;
      } else {
        console.error('Sign up failed:', signUpData);
        return;
      }
    }
  } catch (err) {
    console.error('Auth error:', err);
    return;
  }

  // Ensure worker profile exists
  console.log('Ensuring worker profile exists...');
  const headers = {
    'apikey': supabaseKey,
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'Prefer': 'resolution=merge-duplicates'
  };

  try {
    // Check if workers profile exists
    const checkRes = await fetch(`${supabaseUrl}/rest/v1/workers?user_id=eq.${userId}`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${token}`
      }
    });
    const checkData = await checkRes.json();
    if (checkRes.ok && checkData.length > 0) {
      console.log('Worker profile already exists.');
    } else {
      console.log('Creating worker profile...');
      const insertRes = await fetch(`${supabaseUrl}/rest/v1/workers`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          name: 'Admin Bot',
          email: email,
          user_id: userId,
          role: 'Owner',
          is_owner: true,
          active: true
        })
      });
      if (insertRes.ok) {
        console.log('Worker profile created successfully!');
      } else {
        console.error('Failed to create worker profile:', await insertRes.text());
      }
    }
  } catch (err) {
    console.error('Profile operation error:', err);
  }

  // Fetch all tables
  const tables = ['workers', 'payroll_periods', 'leads', 'commissions', 'app_settings', 'client_storage'];
  const dbData = {};

  for (const table of tables) {
    console.log(`Fetching table: ${table}...`);
    try {
      const res = await fetch(`${supabaseUrl}/rest/v1/${table}?select=*`, {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        dbData[table] = data;
        console.log(`Successfully fetched ${data.length} records from ${table}`);
      } else {
        console.error(`Failed to fetch ${table}:`, await res.text());
      }
    } catch (err) {
      console.error(`Error fetching ${table}:`, err);
    }
  }

  // Generate SQL output
  let sqlContent = `-- WebNegosyo Database Dump --\n\n`;

  // Write workers table inserts
  if (dbData.workers) {
    sqlContent += `-- Workers Data --\n`;
    for (const w of dbData.workers) {
      sqlContent += `INSERT INTO public.workers (id, name, email, phone, gcash_number, qr_code_url, photo_url, commission_percentage, active, created_at, updated_at, role, user_id, is_owner, contact_email, assigned_webdev_id) VALUES (\n` +
        `  ${quote(w.id)}, ${quote(w.name)}, ${quote(w.email)}, ${quote(w.phone)}, ${quote(w.gcash_number)}, ${quote(w.qr_code_url)}, ${quote(w.photo_url)}, ${w.commission_percentage}, ${w.active}, ${quote(w.created_at)}, ${quote(w.updated_at)}, ${quote(w.role)}, ${quote(w.user_id)}, ${w.is_owner}, ${quote(w.contact_email)}, ${quote(w.assigned_webdev_id)}\n` +
        `) ON CONFLICT (id) DO UPDATE SET\n` +
        `  name = EXCLUDED.name, email = EXCLUDED.email, phone = EXCLUDED.phone, gcash_number = EXCLUDED.gcash_number, qr_code_url = EXCLUDED.qr_code_url, photo_url = EXCLUDED.photo_url, commission_percentage = EXCLUDED.commission_percentage, active = EXCLUDED.active, role = EXCLUDED.role, is_owner = EXCLUDED.is_owner, contact_email = EXCLUDED.contact_email, assigned_webdev_id = EXCLUDED.assigned_webdev_id;\n\n`;
    }
  }

  // Write payroll_periods inserts
  if (dbData.payroll_periods) {
    sqlContent += `-- Payroll Periods Data --\n`;
    for (const p of dbData.payroll_periods) {
      sqlContent += `INSERT INTO public.payroll_periods (id, start_date, end_date, status, created_at) VALUES (\n` +
        `  ${quote(p.id)}, ${quote(p.start_date)}, ${quote(p.end_date)}, ${quote(p.status)}, ${quote(p.created_at)}\n` +
        `) ON CONFLICT (id) DO UPDATE SET\n` +
        `  start_date = EXCLUDED.start_date, end_date = EXCLUDED.end_date, status = EXCLUDED.status;\n\n`;
    }
  }

  // Write leads inserts
  if (dbData.leads) {
    sqlContent += `-- Leads Data --\n`;
    for (const l of dbData.leads) {
      sqlContent += `INSERT INTO public.leads (id, client_name, contact_info, ad_source, status, deal_value, worker_id, closed_at, created_at, updated_at, payment_status, down_payment, is_hidden, month, commission_rate, webdev_id, tip, is_audited) VALUES (\n` +
        `  ${quote(l.id)}, ${quote(l.client_name)}, ${quote(l.contact_info)}, ${quote(l.ad_source)}, ${quote(l.status)}, ${l.deal_value}, ${quote(l.worker_id)}, ${quote(l.closed_at)}, ${quote(l.created_at)}, ${quote(l.updated_at)}, ${quote(l.payment_status)}, ${l.down_payment}, ${l.is_hidden}, ${quote(l.month)}, ${l.commission_rate}, ${quote(l.webdev_id)}, ${l.tip}, ${quote(l.is_audited)}\n` +
        `) ON CONFLICT (id) DO UPDATE SET\n` +
        `  client_name = EXCLUDED.client_name, contact_info = EXCLUDED.contact_info, ad_source = EXCLUDED.ad_source, status = EXCLUDED.status, deal_value = EXCLUDED.deal_value, worker_id = EXCLUDED.worker_id, closed_at = EXCLUDED.closed_at, payment_status = EXCLUDED.payment_status, down_payment = EXCLUDED.down_payment, is_hidden = EXCLUDED.is_hidden, month = EXCLUDED.month, commission_rate = EXCLUDED.commission_rate, webdev_id = EXCLUDED.webdev_id, tip = EXCLUDED.tip, is_audited = EXCLUDED.is_audited;\n\n`;
    }
  }

  // Write commissions inserts
  if (dbData.commissions) {
    sqlContent += `-- Commissions Data --\n`;
    for (const c of dbData.commissions) {
      sqlContent += `INSERT INTO public.commissions (id, lead_id, worker_id, amount, status, payroll_period_id, created_at) VALUES (\n` +
        `  ${quote(c.id)}, ${quote(c.lead_id)}, ${quote(c.worker_id)}, ${c.amount}, ${quote(c.status)}, ${quote(c.payroll_period_id)}, ${quote(c.created_at)}\n` +
        `) ON CONFLICT (id) DO UPDATE SET\n` +
        `  lead_id = EXCLUDED.lead_id, worker_id = EXCLUDED.worker_id, amount = EXCLUDED.amount, status = EXCLUDED.status, payroll_period_id = EXCLUDED.payroll_period_id;\n\n`;
    }
  }

  // Write app_settings inserts
  if (dbData.app_settings) {
    sqlContent += `-- App Settings Data --\n`;
    for (const s of dbData.app_settings) {
      sqlContent += `INSERT INTO public.app_settings (id, logo_url, app_name, updated_at, manual_revenue) VALUES (\n` +
        `  ${s.id}, ${quote(s.logo_url)}, ${quote(s.app_name)}, ${quote(s.updated_at)}, ${s.manual_revenue}\n` +
        `) ON CONFLICT (id) DO UPDATE SET\n` +
        `  logo_url = EXCLUDED.logo_url, app_name = EXCLUDED.app_name, manual_revenue = EXCLUDED.manual_revenue;\n\n`;
    }
  }

  // Write client_storage inserts
  if (dbData.client_storage) {
    sqlContent += `-- Client Storage Data --\n`;
    for (const cs of dbData.client_storage) {
      sqlContent += `INSERT INTO public.client_storage (id, worker_id, client_name, business_name, assigned_webdev_id, website_link, admin_link, admin_email, admin_password, supabase_email, supabase_password, database_password, created_at) VALUES (\n` +
        `  ${quote(cs.id)}, ${quote(cs.worker_id)}, ${quote(cs.client_name)}, ${quote(cs.business_name)}, ${quote(cs.assigned_webdev_id)}, ${quote(cs.website_link)}, ${quote(cs.admin_link)}, ${quote(cs.admin_email)}, ${quote(cs.admin_password)}, ${quote(cs.supabase_email)}, ${quote(cs.supabase_password)}, ${quote(cs.database_password)}, ${quote(cs.created_at)}\n` +
        `) ON CONFLICT (id) DO UPDATE SET\n` +
        `  worker_id = EXCLUDED.worker_id, client_name = EXCLUDED.client_name, business_name = EXCLUDED.business_name, assigned_webdev_id = EXCLUDED.assigned_webdev_id, website_link = EXCLUDED.website_link, admin_link = EXCLUDED.admin_link, admin_email = EXCLUDED.admin_email, admin_password = EXCLUDED.admin_password, supabase_email = EXCLUDED.supabase_email, supabase_password = EXCLUDED.supabase_password, database_password = EXCLUDED.database_password;\n\n`;
    }
  }

  // Save sqlContent to file
  fs.writeFileSync('tmp/dump_data.sql', sqlContent);
  console.log('Dump completed successfully! Output saved to tmp/dump_data.sql');

  // Also save raw JSON
  fs.writeFileSync('tmp/dump_data.json', JSON.stringify(dbData, null, 2));
}

function quote(val) {
  if (val === null || val === undefined) return 'NULL';
  return `'${String(val).replace(/'/g, "''")}'`;
}

run();
