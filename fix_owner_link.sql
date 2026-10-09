-- Run this in the Supabase SQL Editor.
-- Problem: the owner login (owner@webnegosyo.com) is not linked to a row in public.workers with is_owner = true,
-- so public.is_owner() returns false and Row Level Security hides employees' audit records, daily audits and expenses.

-- 1. Diagnose (look at the results)
SELECT id AS auth_user_id, email FROM auth.users WHERE email = 'owner@webnegosyo.com';
SELECT id, name, email, user_id, is_owner FROM public.workers WHERE is_owner = true OR email = 'owner@webnegosyo.com';

-- 2. Fix: link the owner's auth user to the owner worker row (creating it if it does not exist)
DO $$
DECLARE
    owner_uid UUID;
BEGIN
    SELECT id INTO owner_uid FROM auth.users WHERE email = 'owner@webnegosyo.com';
    IF owner_uid IS NULL THEN
        RAISE EXCEPTION 'No auth user with email owner@webnegosyo.com. Log in once through the Owner portal first.';
    END IF;

    UPDATE public.workers
    SET user_id = owner_uid, is_owner = true, active = true
    WHERE email = 'owner@webnegosyo.com';

    IF NOT FOUND THEN
        INSERT INTO public.workers (name, email, user_id, role, is_owner, active)
        VALUES ('Owner', 'owner@webnegosyo.com', owner_uid, 'Owner', true, true);
    END IF;
END $$;

-- 3. Verify: should return true when run as the owner (in the app), and show the linked row here
SELECT id, name, email, user_id, is_owner FROM public.workers WHERE email = 'owner@webnegosyo.com';
