import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  CheckCircle2,
  ArrowRight,
  AlertCircle,
  Download,
  Stamp,
  Mail,
  Phone,
  MapPin,
  DollarSign,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { PARTNER_PROGRAM_CONFIG } from '../lib/partnerConfig';
import { savePartnerApplication, checkDuplicateSubmission } from '../lib/partners';

type FormState = {
  fullName: string;
  businessName: string;
  mobileNumber: string;
  email: string;
  businessAddress: string;
  areaCoverage: string;
  offeredPrice: string;
  markup: string;
  profilePicture: File | null;
};

type FormErrors = Partial<Record<keyof FormState, string>>;

export function PartnerProgram() {
  const [submitted, setSubmitted] = useState(false);
  const [submittedData, setSubmittedData] = useState<FormState & { stampDate: string } | null>(null);
  const [stampDate, setStampDate] = useState<string | null>(null);

  const [formData, setFormData] = useState<FormState>({
    fullName: '',
    businessName: '',
    mobileNumber: '',
    email: '',
    businessAddress: '',
    areaCoverage: '',
    offeredPrice: '',
    markup: '',
    profilePicture: null,
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const stampRef = useRef<HTMLDivElement>(null);
  const registrationFormRef = useRef<HTMLDivElement>(null);

  // Cheap field-presence check used only for disabling the button
  const isFormValid =
    !!formData.fullName.trim() &&
    !!formData.businessName.trim() &&
    /^09\d{2}\s\d{3}\s\d{4}$/.test(formData.mobileNumber) &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email) &&
    !!formData.businessAddress.trim() &&
    !!formData.offeredPrice.trim() &&
    !isNaN(Number(formData.offeredPrice.replace(/,/g, ''))) &&
    !!formData.markup.trim() &&
    !isNaN(Number(formData.markup.replace(/,/g, ''))) &&
    Number(formData.markup.replace(/,/g, '')) <= Number(formData.offeredPrice.replace(/,/g, ''));

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.fullName.trim()) {
      newErrors.fullName = PARTNER_PROGRAM_CONFIG.validationMessages.fullNameRequired;
    }

    if (!formData.businessName.trim()) {
      newErrors.businessName = PARTNER_PROGRAM_CONFIG.validationMessages.businessNameRequired;
    }

    if (!formData.mobileNumber.trim()) {
      newErrors.mobileNumber = PARTNER_PROGRAM_CONFIG.validationMessages.mobileRequired;
    } else if (!/^09\d{2}\s\d{3}\s\d{4}$/.test(formData.mobileNumber)) {
      newErrors.mobileNumber = PARTNER_PROGRAM_CONFIG.validationMessages.mobileInvalid;
    }

    if (!formData.email.trim()) {
      newErrors.email = PARTNER_PROGRAM_CONFIG.validationMessages.emailRequired;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = PARTNER_PROGRAM_CONFIG.validationMessages.emailInvalid;
    }

    if (!formData.businessAddress.trim()) {
      newErrors.businessAddress = PARTNER_PROGRAM_CONFIG.validationMessages.addressRequired;
    }

    if (!formData.offeredPrice.trim()) {
      newErrors.offeredPrice = PARTNER_PROGRAM_CONFIG.validationMessages.offeredPriceRequired;
    } else if (isNaN(Number(formData.offeredPrice))) {
      newErrors.offeredPrice = PARTNER_PROGRAM_CONFIG.validationMessages.offeredPriceInvalid;
    }

    if (!formData.markup.trim()) {
      newErrors.markup = PARTNER_PROGRAM_CONFIG.validationMessages.markupRequired;
    } else if (isNaN(Number(formData.markup))) {
      newErrors.markup = PARTNER_PROGRAM_CONFIG.validationMessages.markupInvalid;
    } else if (Number(formData.markup) > Number(formData.offeredPrice)) {
      newErrors.markup = PARTNER_PROGRAM_CONFIG.validationMessages.markupTooHigh;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const formatPhoneNumber = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 4) {
      return digits;
    } else if (digits.length <= 7) {
      return `${digits.slice(0, 4)} ${digits.slice(4)}`;
    } else {
      return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7, 11)}`;
    }
  };

  const formatPrice = (value: string) => {
    const digits = value.replace(/\D/g, '');
    return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    if (name === 'mobileNumber') {
      setFormData((prev) => ({ ...prev, [name]: formatPhoneNumber(value) }));
    } else if (name === 'offeredPrice' || name === 'markup') {
      setFormData((prev) => ({ ...prev, [name]: formatPrice(value) }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }

    // Clear error for this field when user starts typing
    if (errors[name as keyof FormState]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name as keyof FormState];
        return newErrors;
      });
    }
  };

  const handleProfilePictureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setErrors((prev) => ({ ...prev, profilePicture: 'Please upload an image file.' }));
        return;
      }
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setErrors((prev) => ({ ...prev, profilePicture: 'File size must be less than 5MB.' }));
        return;
      }
      setFormData((prev) => ({ ...prev, profilePicture: file }));
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors.profilePicture;
        return newErrors;
      });
    }
  };

  const handleStamp = async () => {
    if (!validateForm()) {
      return;
    }

    if (!termsAccepted) {
      setGeneralError(PARTNER_PROGRAM_CONFIG.validationMessages.termsRequired);
      return;
    }

    // Check for duplicates
    setIsLoading(true);
    setGeneralError(null);

    try {
      const { emailExists, mobileExists } = await checkDuplicateSubmission(
        formData.email,
        formData.mobileNumber
      );

      if (emailExists) {
        setGeneralError(PARTNER_PROGRAM_CONFIG.validationMessages.duplicateEmail);
        setIsLoading(false);
        return;
      }

      if (mobileExists) {
        setGeneralError(PARTNER_PROGRAM_CONFIG.validationMessages.duplicateMobile);
        setIsLoading(false);
        return;
      }

      // Upload profile picture if provided
      let profilePictureUrl: string | null = null;
      if (formData.profilePicture) {
        const fileExt = formData.profilePicture.name.split('.').pop();
        const fileName = `${Date.now()}-${formData.email}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('partner_profiles')
          .upload(`public/${fileName}`, formData.profilePicture);

        if (uploadError) {
          console.warn('Failed to upload profile picture:', uploadError);
        } else {
          const { data: publicUrl } = supabase.storage
            .from('partner_profiles')
            .getPublicUrl(`public/${fileName}`);
          profilePictureUrl = publicUrl.publicUrl;
        }
      }

      // Set stamp date to today
      const today = new Date();
      const dateStr = today.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      setStampDate(dateStr);

      // Save to database
      const submissionData = {
        full_name: formData.fullName,
        business_name: formData.businessName,
        mobile_number: formData.mobileNumber,
        email: formData.email,
        business_address: formData.businessAddress,
        area_coverage: formData.areaCoverage || undefined,
        offered_price: Number(formData.offeredPrice.replace(/,/g, '')),
        markup: Number(formData.markup.replace(/,/g, '')),
        accepted_terms: termsAccepted,
        stamp_date: dateStr,
        profile_picture_url: profilePictureUrl || undefined,
      };

      await savePartnerApplication(submissionData);

      // Store for success screen
      setSubmittedData({
        ...formData,
        stampDate: dateStr,
      });

      // Show success screen
      setSubmitted(true);

      // Send email notification to owner
      await fetch('/api/send-partner-notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...submissionData,
          ownerEmail: PARTNER_PROGRAM_CONFIG.ownerEmail,
        }),
      }).catch(() => {
        // Email notification failed, but form submission succeeded
        console.warn('Failed to send notification email');
      });
    } catch (err) {
      setGeneralError(err instanceof Error ? err.message : 'May nangyari na error. Subukan ulit.');
      console.error('Error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!submittedData || !stampDate) return;

    try {
      const element = stampRef.current;
      if (!element) return;

      // Create a simple text-based certificate download
      const content = `
SMARTMENU PARTNER PROGRAM
Certificate of Partnership Registration

Partner Name: ${submittedData.fullName}
Business Name: ${submittedData.businessName}
Email: ${submittedData.email}
Mobile: ${submittedData.mobileNumber}
Address: ${submittedData.businessAddress}

Offered Price: ₱${submittedData.offeredPrice}
Markup: ₱${submittedData.markup}

Stamp Date: ${stampDate}
Status: APPROVED

This certifies that the above party has been registered as an authorized
partner of the SmartMenu Partner Program and has accepted all terms and conditions.

---
SmartMenu Partner Program
webnegosyo3@gmail.com
      `.trim();

      const downloadLink = document.createElement('a');
      downloadLink.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(content));
      downloadLink.setAttribute('download', `SmartMenu-Partner-${submittedData.email}-${stampDate}.txt`);
      downloadLink.style.display = 'none';
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    } catch (err) {
      console.error('Error generating document:', err);
    }
  };

  const scrollToForm = () => {
    registrationFormRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  if (submitted && submittedData && stampDate) {
    return <SuccessScreen data={submittedData} stampDate={stampDate} stampRef={stampRef} onDownloadPDF={handleDownloadPDF} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 transition-colors">
      {/* Hero Section */}
      <div className="relative overflow-hidden px-4 py-16 sm:py-24 md:py-32">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-slate-900 dark:text-white mb-6">
              {PARTNER_PROGRAM_CONFIG.heroSection.title}
            </h1>
            <p className="text-lg sm:text-xl text-slate-600 dark:text-slate-300 mb-8 max-w-2xl mx-auto">
              {PARTNER_PROGRAM_CONFIG.heroSection.subtitle}
            </p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={scrollToForm}
              className="inline-flex items-center gap-2 px-8 py-3.5 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white rounded-xl font-bold text-base sm:text-lg shadow-lg transition-all"
            >
              {PARTNER_PROGRAM_CONFIG.heroSection.buttonText}
              <ArrowRight className="w-5 h-5" />
            </motion.button>
          </motion.div>
        </div>
      </div>

      {/* How It Works */}
      <div className="px-4 py-16 sm:py-20 bg-white dark:bg-slate-800 transition-colors">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white text-center mb-12">
            Paano Ito Gumagana
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {PARTNER_PROGRAM_CONFIG.howItWorks.map((item, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.2 }}
                className="relative p-6 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-700 dark:to-slate-800 rounded-2xl border border-slate-200 dark:border-slate-600 transition-colors"
              >
                <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-red-600 rounded-full flex items-center justify-center text-white font-black text-xl mb-4">
                  {item.step}
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{item.title}</h3>
                <p className="text-slate-600 dark:text-slate-300">{item.description}</p>
                {idx < 2 && (
                  <ArrowRight className="hidden md:block absolute -right-4 top-1/2 transform -translate-y-1/2 w-8 h-8 text-orange-500" />
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Registration Form */}
      <div ref={registrationFormRef} className="px-4 py-16 sm:py-20">
        <div className="max-w-2xl mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl p-8 sm:p-10 border border-slate-200 dark:border-slate-700 transition-colors"
          >
            <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-2">Mag-register Bilang Partner</h2>
            <p className="text-slate-600 dark:text-slate-400 mb-8">
              Kumpletuhin ang form sa ibaba at simulan ang iyong partnership journey.
            </p>

            {generalError && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex gap-3"
              >
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                <p className="text-sm text-red-700 dark:text-red-300">{generalError}</p>
              </motion.div>
            )}

            {/* Form Fields */}
            <div className="space-y-5">
              {/* Row 1: Full Name & Business Name */}
              <div className="grid sm:grid-cols-2 gap-5">
                <FormField
                  label="Pangalan *"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleInputChange}
                  error={errors.fullName}
                  placeholder="Juan Dela Cruz"
                  icon={<Mail className="w-4 h-4" />}
                />
                <FormField
                  label="Pangalan ng Negosyo *"
                  name="businessName"
                  value={formData.businessName}
                  onChange={handleInputChange}
                  error={errors.businessName}
                  placeholder="Ang Aming Restaurant"
                  icon={<DollarSign className="w-4 h-4" />}
                />
              </div>

              {/* Row 2: Mobile & Email */}
              <div className="grid sm:grid-cols-2 gap-5">
                <FormField
                  label="Mobile Number *"
                  name="mobileNumber"
                  value={formData.mobileNumber}
                  onChange={handleInputChange}
                  error={errors.mobileNumber}
                  placeholder="0912 345 6789"
                  icon={<Phone className="w-4 h-4" />}
                />
                <FormField
                  label="Email Address *"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  error={errors.email}
                  placeholder="juan@example.com"
                  icon={<Mail className="w-4 h-4" />}
                />
              </div>

              {/* Row 3: Address & Area */}
              <div className="grid sm:grid-cols-2 gap-5">
                <FormField
                  label="Business Address / City *"
                  name="businessAddress"
                  value={formData.businessAddress}
                  onChange={handleInputChange}
                  error={errors.businessAddress}
                  placeholder="Manila, Metro Manila"
                  icon={<MapPin className="w-4 h-4" />}
                />
                <FormField
                  label="Area ng Pagbebenta (Opsyonal)"
                  name="areaCoverage"
                  value={formData.areaCoverage}
                  onChange={handleInputChange}
                  placeholder="Metro Manila, Quezon Province"
                  icon={<MapPin className="w-4 h-4" />}
                />
              </div>

              {/* Row 4: Prices */}
              <div className="grid sm:grid-cols-2 gap-5">
                <FormField
                  label="Presyong Ioofer sa Client *"
                  name="offeredPrice"
                  value={formData.offeredPrice}
                  onChange={handleInputChange}
                  error={errors.offeredPrice}
                  placeholder="5,499"
                  prefix="₱"
                  icon={<DollarSign className="w-4 h-4" />}
                />
                <FormField
                  label="Markup ng Partner *"
                  name="markup"
                  value={formData.markup}
                  onChange={handleInputChange}
                  error={errors.markup}
                  placeholder="1,500"
                  prefix="₱"
                  icon={<DollarSign className="w-4 h-4" />}
                />
              </div>

              {/* Row 5: Profile Picture */}
              <div>
                <label className="block text-sm font-bold text-slate-900 dark:text-white mb-2">
                  Profile Picture (Optional)
                </label>
                <div className="relative">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleProfilePictureChange}
                    className="hidden"
                    id="profile-picture-input"
                  />
                  <label
                    htmlFor="profile-picture-input"
                    className="cursor-pointer block"
                  >
                    <div className="w-full px-4 py-6 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg hover:border-orange-500 dark:hover:border-orange-500 transition-colors bg-slate-50 dark:bg-slate-700/50 flex flex-col items-center justify-center gap-2">
                      <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      {formData.profilePicture ? (
                        <p className="text-sm font-bold text-orange-600 dark:text-orange-400">
                          {formData.profilePicture.name}
                        </p>
                      ) : (
                        <>
                          <p className="text-sm font-bold text-slate-900 dark:text-white">Click to upload</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">or drag and drop</p>
                        </>
                      )}
                    </div>
                  </label>
                </div>
                {errors.profilePicture && (
                  <p className="text-xs text-red-600 dark:text-red-400 mt-1.5">{errors.profilePicture}</p>
                )}
              </div>
            </div>

            {/* Terms and Conditions */}
            <div className="mt-10 pt-8 border-t border-slate-200 dark:border-slate-700">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Terms and Conditions</h3>
              <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-6 h-64 overflow-y-auto mb-5 border border-slate-200 dark:border-slate-600">
                <TermsContent />
              </div>

              <label className="flex items-start gap-3 cursor-pointer p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => {
                    setTermsAccepted(e.target.checked);
                  }}
                  className="w-5 h-5 mt-1 accent-orange-500 cursor-pointer"
                />
                <span className="text-sm text-slate-700 dark:text-slate-300 font-medium">
                  Nabasa ko at sumasang-ayon ako sa Terms and Conditions ng SmartMenu Partner Program.
                </span>
              </label>
            </div>

            {/* Stamp Button */}
            <motion.button
              whileHover={!isLoading && !stampDate ? { scale: 1.02 } : {}}
              whileTap={!isLoading && !stampDate ? { scale: 0.98 } : {}}
              onClick={handleStamp}
              disabled={isLoading || !isFormValid || !termsAccepted || !!stampDate}
              className={`w-full mt-8 py-4 px-6 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 transition-all ${
                isLoading || !!stampDate
                  ? 'bg-gray-400 cursor-not-allowed text-gray-600'
                  : !isFormValid || !termsAccepted
                  ? 'bg-gray-300 cursor-not-allowed text-gray-500'
                  : 'bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white shadow-lg'
              }`}
            >
              <Stamp className="w-6 h-6" />
              {isLoading ? 'Nag-process...' : 'I-stamp ang Approval'}
            </motion.button>

            {/* Data Privacy Notice */}
            <p className="text-xs text-slate-500 dark:text-slate-400 text-center mt-6">
              {PARTNER_PROGRAM_CONFIG.dataPrivacyNotice}
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

function FormField({
  label,
  name,
  type = 'text',
  value,
  onChange,
  error,
  placeholder,
  prefix,
  icon,
}: {
  label: string;
  name: string;
  type?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  error?: string;
  placeholder?: string;
  prefix?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-bold text-slate-900 dark:text-white mb-2">{label}</label>
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none">
            {icon}
          </div>
        )}
        <div className="relative">
          {prefix && (
            <span className="absolute left-10 top-1/2 transform -translate-y-1/2 text-slate-900 dark:text-white font-bold pointer-events-none">
              {prefix}
            </span>
          )}
          <input
            type={type}
            name={name}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            className={`w-full pl-10 ${
              prefix ? 'pl-14' : ''
            } pr-4 py-3 rounded-lg border-2 transition-colors ${
              error
                ? 'border-red-400 dark:border-red-600 bg-red-50 dark:bg-red-900/10 focus:outline-none'
                : 'border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 focus:border-orange-500 dark:focus:border-orange-500 focus:outline-none'
            } text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500`}
          />
        </div>
      </div>
      {error && <p className="text-xs text-red-600 dark:text-red-400 mt-1.5">{error}</p>}
    </div>
  );
}

function TermsContent() {
  const terms = PARTNER_PROGRAM_CONFIG.termsAndConditions;
  return (
    <div className="prose dark:prose-invert prose-sm max-w-none">
      {terms.split('\n\n').map((para, idx) => {
        if (para.startsWith('#')) {
          return (
            <h4 key={idx} className="font-bold text-slate-900 dark:text-white mt-3 mb-2">
              {para.replace(/^#+\s*/, '')}
            </h4>
          );
        }
        return (
          <p key={idx} className="text-xs text-slate-700 dark:text-slate-300 mb-2">
            {para}
          </p>
        );
      })}
    </div>
  );
}

function SuccessScreen({
  data,
  stampDate,
  stampRef,
  onDownloadPDF,
}: {
  data: FormState & { stampDate: string };
  stampDate: string;
  stampRef: React.RefObject<HTMLDivElement | null>;
  onDownloadPDF: () => void;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 dark:from-slate-950 dark:to-slate-900 flex items-center justify-center px-4 py-16">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-2xl w-full"
      >
        <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl p-8 sm:p-12 text-center border border-slate-200 dark:border-slate-700 transition-colors">
          {/* Success Icon */}
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="w-20 h-20 mx-auto mb-6 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center"
          >
            <CheckCircle2 className="w-12 h-12 text-green-600 dark:text-green-400" />
          </motion.div>

          <h1 className="text-4xl font-black text-slate-900 dark:text-white mb-2">
            {PARTNER_PROGRAM_CONFIG.successMessage.title}
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-300 mb-8">
            {PARTNER_PROGRAM_CONFIG.successMessage.subtitle}
          </p>

          {/* Summary */}
          <div className="bg-slate-50 dark:bg-slate-700/50 rounded-2xl p-6 mb-8 text-left border border-slate-200 dark:border-slate-600">
            <h3 className="font-bold text-slate-900 dark:text-white mb-4">Inyong Application Details:</h3>
            <div className="grid sm:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-slate-500 dark:text-slate-400 text-xs">Pangalan</p>
                <p className="font-bold text-slate-900 dark:text-white">{data.fullName}</p>
              </div>
              <div>
                <p className="text-slate-500 dark:text-slate-400 text-xs">Business</p>
                <p className="font-bold text-slate-900 dark:text-white">{data.businessName}</p>
              </div>
              <div>
                <p className="text-slate-500 dark:text-slate-400 text-xs">Email</p>
                <p className="font-bold text-slate-900 dark:text-white">{data.email}</p>
              </div>
              <div>
                <p className="text-slate-500 dark:text-slate-400 text-xs">Mobile</p>
                <p className="font-bold text-slate-900 dark:text-white">{data.mobileNumber}</p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-slate-500 dark:text-slate-400 text-xs">Address</p>
                <p className="font-bold text-slate-900 dark:text-white">{data.businessAddress}</p>
              </div>
              <div>
                <p className="text-slate-500 dark:text-slate-400 text-xs">Presyong Ioofer</p>
                <p className="font-bold text-slate-900 dark:text-white text-lg">₱{data.offeredPrice}</p>
              </div>
              <div>
                <p className="text-slate-500 dark:text-slate-400 text-xs">Markup</p>
                <p className="font-bold text-slate-900 dark:text-white text-lg">₱{data.markup}</p>
              </div>
            </div>
          </div>

          {/* Stamp Display */}
          <div ref={stampRef} className="mb-8 py-8">
            <div
              className="inline-block relative"
              style={{
                transform: 'rotate(-15deg)',
              }}
            >
              <div className="border-4 border-red-600 dark:border-red-500 text-red-600 dark:text-red-500 px-8 py-4 rounded-lg font-black text-3xl opacity-70">
                APPROVED
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 text-center mt-2" style={{ transform: 'rotate(15deg)' }}>
                {stampDate}
              </p>
            </div>
          </div>

          <p className="text-sm text-slate-600 dark:text-slate-300 mb-8">
            {PARTNER_PROGRAM_CONFIG.successMessage.details}
          </p>

          <p className="text-sm text-slate-500 dark:text-slate-400 mb-8 italic">
            {PARTNER_PROGRAM_CONFIG.successMessage.reminder}
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onDownloadPDF}
              className="flex-1 py-3 px-6 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all"
            >
              <Download className="w-5 h-5" />
              Download PDF
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => window.location.href = '/'}
              className="flex-1 py-3 px-6 bg-slate-200 dark:bg-slate-600 hover:bg-slate-300 dark:hover:bg-slate-500 text-slate-900 dark:text-white rounded-xl font-bold transition-all"
            >
              Back to Home
            </motion.button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
