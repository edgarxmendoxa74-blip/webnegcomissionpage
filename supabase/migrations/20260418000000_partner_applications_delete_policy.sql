-- Allow the owner/admin (authenticated user) to delete partner applications
-- Needed by the "Delete Partner" button in the Registered Partners page.

ALTER TABLE public.partner_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated users to delete partner applications"
  ON public.partner_applications;

CREATE POLICY "Allow authenticated users to delete partner applications"
  ON public.partner_applications FOR DELETE
  TO authenticated
  USING (TRUE);
