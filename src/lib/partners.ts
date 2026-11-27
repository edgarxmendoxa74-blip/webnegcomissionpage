import { supabase } from './supabase';

export interface PartnerApplication {
  id?: string;
  full_name: string;
  business_name: string;
  mobile_number: string;
  email: string;
  business_address: string;
  area_coverage?: string;
  offered_price: number;
  markup: number;
  accepted_terms: boolean;
  stamp_date: string;
  profile_picture_url?: string;
  created_at?: string;
  status?: 'pending' | 'approved' | 'rejected';
}

/**
 * Save a new partner application to the database
 */
export const savePartnerApplication = async (data: PartnerApplication): Promise<PartnerApplication> => {
  const { data: result, error } = await supabase
    .from('partner_applications')
    .insert([
      {
        full_name: data.full_name,
        business_name: data.business_name,
        mobile_number: data.mobile_number,
        email: data.email,
        business_address: data.business_address,
        area_coverage: data.area_coverage || null,
        offered_price: data.offered_price,
        markup: data.markup,
        accepted_terms: data.accepted_terms,
        stamp_date: data.stamp_date,
        profile_picture_url: data.profile_picture_url || null,
        status: 'pending',
      },
    ])
    .select()
    .single();

  if (error) {
    console.error('Error saving partner application:', error);
    throw new Error(`Failed to save application: ${error.message}`);
  }

  return result;
};

/**
 * Check if email or mobile already exists
 */
export const checkDuplicateSubmission = async (
  email: string,
  mobileNumber: string
): Promise<{ emailExists: boolean; mobileExists: boolean }> => {
  const { data: emailData, error: emailError } = await supabase
    .from('partner_applications')
    .select('id')
    .eq('email', email)
    .maybeSingle();

  const { data: mobileData, error: mobileError } = await supabase
    .from('partner_applications')
    .select('id')
    .eq('mobile_number', mobileNumber)
    .maybeSingle();

  if (emailError && emailError.code !== 'PGRST116') {
    console.error('Error checking email:', emailError);
  }
  if (mobileError && mobileError.code !== 'PGRST116') {
    console.error('Error checking mobile:', mobileError);
  }

  return {
    emailExists: !!emailData,
    mobileExists: !!mobileData,
  };
};

/**
 * Fetch all partner applications (admin only)
 */
export const fetchPartnerApplications = async (): Promise<PartnerApplication[]> => {
  const { data, error } = await supabase
    .from('partner_applications')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching applications:', error);
    throw new Error(`Failed to fetch applications: ${error.message}`);
  }

  return data || [];
};

/**
 * Update partner application status (admin only)
 */
export const updatePartnerApplicationStatus = async (
  id: string,
  status: 'pending' | 'approved' | 'rejected'
): Promise<void> => {
  const { error } = await supabase
    .from('partner_applications')
    .update({ status })
    .eq('id', id);

  if (error) {
    console.error('Error updating application status:', error);
    throw new Error(`Failed to update status: ${error.message}`);
  }
};

/**
 * Delete a partner application (admin only)
 */
export const deletePartnerApplication = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('partner_applications')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting partner application:', error);
    throw new Error(`Failed to delete partner: ${error.message}`);
  }
};

/**
 * Search partner applications
 */
export const searchPartnerApplications = async (
  query: string
): Promise<PartnerApplication[]> => {
  const { data, error } = await supabase
    .from('partner_applications')
    .select('*')
    .or(
      `full_name.ilike.%${query}%,business_name.ilike.%${query}%,email.ilike.%${query}%,mobile_number.ilike.%${query}%`
    )
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error searching applications:', error);
    throw new Error(`Failed to search applications: ${error.message}`);
  }

  return data || [];
};

/**
 * Get single partner application by email
 */
export const getPartnerApplicationByEmail = async (email: string): Promise<PartnerApplication | null> => {
  const { data, error } = await supabase
    .from('partner_applications')
    .select('*')
    .eq('email', email)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching application:', error);
    throw new Error(`Failed to fetch application: ${error.message}`);
  }

  return data || null;
};
