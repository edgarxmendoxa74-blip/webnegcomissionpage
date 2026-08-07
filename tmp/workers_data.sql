-- Seed Workers/Accounts Data

INSERT INTO public.workers (
  id, name, email, phone, gcash_number, qr_code_url, photo_url, 
  commission_percentage, active, created_at, updated_at, role, 
  user_id, is_owner, contact_email, assigned_webdev_id
) VALUES (
  'bdc5ceaf-4e8f-4a3d-b66b-41c91accd590',
  'Edgar Mendoza',
  'edgr@webnegosyo.internal',
  '09452106254',
  '09452106254',
  NULL,
  'https://bgqfkbdgecgsgbnkjise.supabase.co/storage/v1/object/public/profiles/photos/0.2354212853180594.jpg',
  10,
  true,
  '2026-03-22T12:03:07.827851+00:00',
  '2026-03-22T12:03:07.827851+00:00',
  'Agent',
  '816215e7-3b5e-44b3-9419-036b2ab90c14',
  false,
  'edgarxmendoxa74@gmail.com',
  NULL
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  email = EXCLUDED.email,
  phone = EXCLUDED.phone,
  gcash_number = EXCLUDED.gcash_number,
  qr_code_url = EXCLUDED.qr_code_url,
  photo_url = EXCLUDED.photo_url,
  commission_percentage = EXCLUDED.commission_percentage,
  active = EXCLUDED.active,
  role = EXCLUDED.role,
  is_owner = EXCLUDED.is_owner,
  contact_email = EXCLUDED.contact_email,
  assigned_webdev_id = EXCLUDED.assigned_webdev_id;

INSERT INTO public.workers (
  id, name, email, phone, gcash_number, qr_code_url, photo_url, 
  commission_percentage, active, created_at, updated_at, role, 
  user_id, is_owner, contact_email, assigned_webdev_id
) VALUES (
  '07eeff8c-3b51-4753-a297-335e23305055',
  'Red Montillo',
  'red35@webnegosyo.internal',
  NULL,
  NULL,
  NULL,
  'https://bgqfkbdgecgsgbnkjise.supabase.co/storage/v1/object/public/profiles/photos/0.7730925147007399.jpg',
  10,
  false,
  '2026-03-10T06:58:32.758258+00:00',
  '2026-03-10T06:58:32.758258+00:00',
  'Agent',
  '6a217e67-1c06-488a-ac6c-28cb95a759a1',
  false,
  'redmontellano20@gmail.com',
  NULL
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  email = EXCLUDED.email,
  phone = EXCLUDED.phone,
  gcash_number = EXCLUDED.gcash_number,
  qr_code_url = EXCLUDED.qr_code_url,
  photo_url = EXCLUDED.photo_url,
  commission_percentage = EXCLUDED.commission_percentage,
  active = EXCLUDED.active,
  role = EXCLUDED.role,
  is_owner = EXCLUDED.is_owner,
  contact_email = EXCLUDED.contact_email,
  assigned_webdev_id = EXCLUDED.assigned_webdev_id;

INSERT INTO public.workers (
  id, name, email, phone, gcash_number, qr_code_url, photo_url, 
  commission_percentage, active, created_at, updated_at, role, 
  user_id, is_owner, contact_email, assigned_webdev_id
) VALUES (
  'e27338f1-1f7f-4c09-bcfb-04f0fe442200',
  'John Angelo David',
  'angelo@webnegosyo.internal',
  '09928214519',
  '09928214519',
  'https://bgqfkbdgecgsgbnkjise.supabase.co/storage/v1/object/public/profiles/qrcodes/0.9615697754991939.jpg',
  'https://bgqfkbdgecgsgbnkjise.supabase.co/storage/v1/object/public/profiles/photos/0.011830389154299237.jpg',
  10,
  true,
  '2026-03-10T03:06:14.22575+00:00',
  '2026-03-10T03:06:14.22575+00:00',
  'CEO/WebNegosyo',
  'e9efddf9-c2b4-421d-b918-a51322c99d82',
  false,
  'webnegosyo3@gmail.com',
  NULL
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  email = EXCLUDED.email,
  phone = EXCLUDED.phone,
  gcash_number = EXCLUDED.gcash_number,
  qr_code_url = EXCLUDED.qr_code_url,
  photo_url = EXCLUDED.photo_url,
  commission_percentage = EXCLUDED.commission_percentage,
  active = EXCLUDED.active,
  role = EXCLUDED.role,
  is_owner = EXCLUDED.is_owner,
  contact_email = EXCLUDED.contact_email,
  assigned_webdev_id = EXCLUDED.assigned_webdev_id;

INSERT INTO public.workers (
  id, name, email, phone, gcash_number, qr_code_url, photo_url, 
  commission_percentage, active, created_at, updated_at, role, 
  user_id, is_owner, contact_email, assigned_webdev_id
) VALUES (
  '0031b948-9170-45a5-b8f0-4b45827b71a1',
  'Kim',
  'kim@webnegosyo.internal',
  NULL,
  '09159792488',
  NULL,
  NULL,
  10,
  true,
  '2026-03-12T07:34:21.557183+00:00',
  '2026-03-12T07:34:21.557183+00:00',
  'Agent',
  'e6a38365-aeaf-41fc-8a52-31906a347979',
  false,
  NULL,
  NULL
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  email = EXCLUDED.email,
  phone = EXCLUDED.phone,
  gcash_number = EXCLUDED.gcash_number,
  qr_code_url = EXCLUDED.qr_code_url,
  photo_url = EXCLUDED.photo_url,
  commission_percentage = EXCLUDED.commission_percentage,
  active = EXCLUDED.active,
  role = EXCLUDED.role,
  is_owner = EXCLUDED.is_owner,
  contact_email = EXCLUDED.contact_email,
  assigned_webdev_id = EXCLUDED.assigned_webdev_id;

INSERT INTO public.workers (
  id, name, email, phone, gcash_number, qr_code_url, photo_url, 
  commission_percentage, active, created_at, updated_at, role, 
  user_id, is_owner, contact_email, assigned_webdev_id
) VALUES (
  'ac585316-dd70-4bfb-8fdf-7807c1dd0057',
  'Ibrahim Saddaiman',
  'ibrahim40@webnegosyo.internal',
  '09452957232',
  '09912705202',
  'https://bgqfkbdgecgsgbnkjise.supabase.co/storage/v1/object/public/profiles/qrcodes/0.4488034222534516.jpeg',
  'https://bgqfkbdgecgsgbnkjise.supabase.co/storage/v1/object/public/profiles/photos/0.6584466015191393.jpg',
  10,
  true,
  '2026-03-10T05:40:15.457837+00:00',
  '2026-03-10T05:40:15.457837+00:00',
  'webdeveloper',
  'e7637a9f-b800-4374-9684-752f0491a014',
  false,
  'ibrahimsaiddiman27@gmail.com',
  NULL
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  email = EXCLUDED.email,
  phone = EXCLUDED.phone,
  gcash_number = EXCLUDED.gcash_number,
  qr_code_url = EXCLUDED.qr_code_url,
  photo_url = EXCLUDED.photo_url,
  commission_percentage = EXCLUDED.commission_percentage,
  active = EXCLUDED.active,
  role = EXCLUDED.role,
  is_owner = EXCLUDED.is_owner,
  contact_email = EXCLUDED.contact_email,
  assigned_webdev_id = EXCLUDED.assigned_webdev_id;

INSERT INTO public.workers (
  id, name, email, phone, gcash_number, qr_code_url, photo_url, 
  commission_percentage, active, created_at, updated_at, role, 
  user_id, is_owner, contact_email, assigned_webdev_id
) VALUES (
  '217dcaa8-2e8b-4af2-9243-0da19919766d',
  'John Raven Ibanez',
  'raven-ibanez@webnegosyo.internal',
  '09917956018',
  '09917956018',
  NULL,
  NULL,
  10,
  true,
  '2026-03-12T15:07:23.10899+00:00',
  '2026-03-12T15:07:23.10899+00:00',
  'Agent',
  'deb0474f-32f1-43fe-8730-7ad1cb8c6c3d',
  false,
  NULL,
  NULL
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  email = EXCLUDED.email,
  phone = EXCLUDED.phone,
  gcash_number = EXCLUDED.gcash_number,
  qr_code_url = EXCLUDED.qr_code_url,
  photo_url = EXCLUDED.photo_url,
  commission_percentage = EXCLUDED.commission_percentage,
  active = EXCLUDED.active,
  role = EXCLUDED.role,
  is_owner = EXCLUDED.is_owner,
  contact_email = EXCLUDED.contact_email,
  assigned_webdev_id = EXCLUDED.assigned_webdev_id;

INSERT INTO public.workers (
  id, name, email, phone, gcash_number, qr_code_url, photo_url, 
  commission_percentage, active, created_at, updated_at, role, 
  user_id, is_owner, contact_email, assigned_webdev_id
) VALUES (
  '0380febf-9e46-4e55-b657-1344aefa89c3',
  'Joshua Verdadero',
  'vbjoshua@webnegosyo.internal',
  NULL,
  '09708147876',
  NULL,
  NULL,
  10,
  true,
  '2026-03-19T14:25:26.872762+00:00',
  '2026-03-19T14:25:26.872762+00:00',
  'Agent',
  '6c0a9286-96a8-4968-9897-4c50a90377e9',
  false,
  NULL,
  NULL
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  email = EXCLUDED.email,
  phone = EXCLUDED.phone,
  gcash_number = EXCLUDED.gcash_number,
  qr_code_url = EXCLUDED.qr_code_url,
  photo_url = EXCLUDED.photo_url,
  commission_percentage = EXCLUDED.commission_percentage,
  active = EXCLUDED.active,
  role = EXCLUDED.role,
  is_owner = EXCLUDED.is_owner,
  contact_email = EXCLUDED.contact_email,
  assigned_webdev_id = EXCLUDED.assigned_webdev_id;

INSERT INTO public.workers (
  id, name, email, phone, gcash_number, qr_code_url, photo_url, 
  commission_percentage, active, created_at, updated_at, role, 
  user_id, is_owner, contact_email, assigned_webdev_id
) VALUES (
  'b86742d0-1328-4817-836e-8cb4f67765f4',
  'Jean Mislang',
  'jaen23@webnegosyo.internal',
  '09150672329',
  '09150672329',
  'https://bgqfkbdgecgsgbnkjise.supabase.co/storage/v1/object/public/profiles/qrcodes/0.383878188070231.jpg',
  'https://bgqfkbdgecgsgbnkjise.supabase.co/storage/v1/object/public/profiles/photos/0.7973099406951007.jpg',
  10,
  true,
  '2026-03-10T05:34:08.382025+00:00',
  '2026-03-10T05:34:08.382025+00:00',
  'webdeveloper/Assistant Auditor',
  'ed119e20-fbf6-4a9a-8eac-cc7a5a398cf5',
  false,
  'mislangrinajaen@gmail.com',
  NULL
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  email = EXCLUDED.email,
  phone = EXCLUDED.phone,
  gcash_number = EXCLUDED.gcash_number,
  qr_code_url = EXCLUDED.qr_code_url,
  photo_url = EXCLUDED.photo_url,
  commission_percentage = EXCLUDED.commission_percentage,
  active = EXCLUDED.active,
  role = EXCLUDED.role,
  is_owner = EXCLUDED.is_owner,
  contact_email = EXCLUDED.contact_email,
  assigned_webdev_id = EXCLUDED.assigned_webdev_id;

INSERT INTO public.workers (
  id, name, email, phone, gcash_number, qr_code_url, photo_url, 
  commission_percentage, active, created_at, updated_at, role, 
  user_id, is_owner, contact_email, assigned_webdev_id
) VALUES (
  '74cf949a-587e-4e67-bc85-9905bbb76e1a',
  'edgr Mendoxa',
  'adminedgar4@webnegosyo.internal',
  '09452106254',
  '09452106254',
  'https://bgqfkbdgecgsgbnkjise.supabase.co/storage/v1/object/public/profiles/qrcodes/0.7902284628301401.jpg',
  'https://bgqfkbdgecgsgbnkjise.supabase.co/storage/v1/object/public/profiles/photos/0.3329880472175819.png',
  10,
  true,
  '2026-04-01T04:30:43.893526+00:00',
  '2026-04-01T04:30:43.893526+00:00',
  'Webdev/Markeing Manager',
  'e5603adc-a68e-48bf-b48a-b53366a10bb8',
  false,
  'edgarxmendoxa74@gmail.com',
  NULL
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  email = EXCLUDED.email,
  phone = EXCLUDED.phone,
  gcash_number = EXCLUDED.gcash_number,
  qr_code_url = EXCLUDED.qr_code_url,
  photo_url = EXCLUDED.photo_url,
  commission_percentage = EXCLUDED.commission_percentage,
  active = EXCLUDED.active,
  role = EXCLUDED.role,
  is_owner = EXCLUDED.is_owner,
  contact_email = EXCLUDED.contact_email,
  assigned_webdev_id = EXCLUDED.assigned_webdev_id;

