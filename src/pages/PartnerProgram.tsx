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
  User,
  Building2,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { PARTNER_PROGRAM_CONFIG } from '../lib/partnerConfig';
import { savePartnerApplication, checkDuplicateSubmission } from '../lib/partners';

/* ─── SmartMenu brand tokens ────────────────────────────────────────────── */
// Red   : #E8191A  (logo letters + Menu wordmark)
// Amber : #F5A623  (sun rays + spoon arc + tagline dashes)
// Black : #1A1A1A  (Smart wordmark)

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

/* ─── SmartMenu logo image — replaced by real img tag everywhere ─────────── */

/* ─── Wordmark matching the logo typography ─────────────────────────────── */
function SmartMenuWordmark({ className = '' }: { className?: string }) {
  return (
    <span className={`font-black tracking-tight ${className}`}>
      <span className="text-zinc-900 dark:text-white">Smart</span>
      <span className="text-[#E8191A]">Menu</span>
    </span>
  );
}

/* ─── Top navbar ─────────────────────────────────────────────────────────── */
function PartnerNav() {
  return (
    <header className="sticky top-0 z-30 bg-white/90 dark:bg-zinc-950/90 backdrop-blur border-b border-zinc-200 dark:border-zinc-800">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <img
            src="/smartmenu-logo.jpg"
            alt="SmartMenu"
            className="h-9 w-auto select-none object-contain"
            draggable={false}
          />
          <p className="text-[9px] font-black tracking-widest text-[#F5A623] uppercase border-l border-zinc-200 dark:border-zinc-700 pl-2.5">
            Partner Program
          </p>
        </div>
        {/* Tagline – hidden on small screens */}
        <p className="hidden sm:block text-[11px] font-bold tracking-widest text-zinc-400 dark:text-zinc-500 uppercase">
          Growing Restaurants. Together.
        </p>
      </div>
    </header>
  );
}

/* ─── Main page component ─────────────────────────────────────────────────── */
export function PartnerProgram() {
  const [submitted, setSubmitted] = useState(false);
  const [submittedData, setSubmittedData] = useState<(FormState & { stampDate: string }) | null>(null);
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

  /* cheap validity check — never sets state so safe inside render */
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

  /* full validation — also sets error messages */
  const validateForm = (): boolean => {
    const e: FormErrors = {};
    const v = PARTNER_PROGRAM_CONFIG.validationMessages;

    if (!formData.fullName.trim()) e.fullName = v.fullNameRequired;
    if (!formData.businessName.trim()) e.businessName = v.businessNameRequired;
    if (!formData.mobileNumber.trim()) e.mobileNumber = v.mobileRequired;
    else if (!/^09\d{2}\s\d{3}\s\d{4}$/.test(formData.mobileNumber)) e.mobileNumber = v.mobileInvalid;
    if (!formData.email.trim()) e.email = v.emailRequired;
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) e.email = v.emailInvalid;
    if (!formData.businessAddress.trim()) e.businessAddress = v.addressRequired;
    if (!formData.offeredPrice.trim()) e.offeredPrice = v.offeredPriceRequired;
    else if (isNaN(Number(formData.offeredPrice.replace(/,/g, '')))) e.offeredPrice = v.offeredPriceInvalid;
    if (!formData.markup.trim()) e.markup = v.markupRequired;
    else if (isNaN(Number(formData.markup.replace(/,/g, '')))) e.markup = v.markupInvalid;
    else if (Number(formData.markup.replace(/,/g, '')) > Number(formData.offeredPrice.replace(/,/g, ''))) e.markup = v.markupTooHigh;

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const formatPhone = (v: string) => {
    const d = v.replace(/\D/g, '');
    if (d.length <= 4) return d;
    if (d.length <= 7) return `${d.slice(0, 4)} ${d.slice(4)}`;
    return `${d.slice(0, 4)} ${d.slice(4, 7)} ${d.slice(7, 11)}`;
  };

  const formatPrice = (v: string) => v.replace(/\D/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, ',');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        name === 'mobileNumber' ? formatPhone(value)
        : name === 'offeredPrice' || name === 'markup' ? formatPrice(value)
        : value,
    }));
    if (errors[name as keyof FormState]) {
      setErrors((prev) => { const n = { ...prev }; delete n[name as keyof FormState]; return n; });
    }
  };

  const handleProfilePictureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setErrors((prev) => ({ ...prev, profilePicture: 'Please upload an image file.' }));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setErrors((prev) => ({ ...prev, profilePicture: 'File size must be less than 5MB.' }));
      return;
    }
    setFormData((prev) => ({ ...prev, profilePicture: file }));
    setErrors((prev) => { const n = { ...prev }; delete n.profilePicture; return n; });
  };

  const handleStamp = async () => {
    if (!validateForm()) return;
    if (!termsAccepted) { setGeneralError(PARTNER_PROGRAM_CONFIG.validationMessages.termsRequired); return; }

    setIsLoading(true);
    setGeneralError(null);

    try {
      const { emailExists, mobileExists } = await checkDuplicateSubmission(formData.email, formData.mobileNumber);
      if (emailExists) { setGeneralError(PARTNER_PROGRAM_CONFIG.validationMessages.duplicateEmail); return; }
      if (mobileExists) { setGeneralError(PARTNER_PROGRAM_CONFIG.validationMessages.duplicateMobile); return; }

      /* upload picture */
      let profilePictureUrl: string | undefined;
      if (formData.profilePicture) {
        const ext = formData.profilePicture.name.split('.').pop();
        const fileName = `${Date.now()}-${formData.email}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from('partner_profiles').upload(`public/${fileName}`, formData.profilePicture);
        if (!upErr) {
          const { data: pub } = supabase.storage.from('partner_profiles').getPublicUrl(`public/${fileName}`);
          profilePictureUrl = pub.publicUrl;
        }
      }

      const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
      setStampDate(dateStr);

      await savePartnerApplication({
        full_name: formData.fullName,
        business_name: formData.businessName,
        mobile_number: formData.mobileNumber,
        email: formData.email,
        business_address: formData.businessAddress,
        area_coverage: formData.areaCoverage || undefined,
        offered_price: Number(formData.offeredPrice.replace(/,/g, '')),
        markup: Number(formData.markup.replace(/,/g, '')),
        accepted_terms: true,
        stamp_date: dateStr,
        profile_picture_url: profilePictureUrl,
      });

      setSubmittedData({ ...formData, stampDate: dateStr });
      setSubmitted(true);

      fetch('/api/send-partner-notification', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email, ownerEmail: PARTNER_PROGRAM_CONFIG.ownerEmail }),
      }).catch(() => {});
    } catch (err) {
      setGeneralError(err instanceof Error ? err.message : 'May nangyari na error. Subukan ulit.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = () => {
    if (!submittedData || !stampDate) return;
    const content = [
      'SMARTMENU PARTNER PROGRAM',
      'Certificate of Partnership Registration',
      '',
      `Partner Name  : ${submittedData.fullName}`,
      `Business      : ${submittedData.businessName}`,
      `Email         : ${submittedData.email}`,
      `Mobile        : ${submittedData.mobileNumber}`,
      `Address       : ${submittedData.businessAddress}`,
      '',
      `Offered Price : ₱${submittedData.offeredPrice}`,
      `Markup        : ₱${submittedData.markup}`,
      '',
      `Stamp Date    : ${stampDate}`,
      `Status        : APPROVED`,
      '',
      '────────────────────────────────────────',
      'SmartMenu · Growing Restaurants. Together.',
      'webnegosyo3@gmail.com',
    ].join('\n');
    const a = document.createElement('a');
    a.href = 'data:text/plain;charset=utf-8,' + encodeURIComponent(content);
    a.download = `SmartMenu-Partner-${submittedData.email}.txt`;
    a.click();
  };

  if (submitted && submittedData && stampDate) {
    return <SuccessScreen data={submittedData} stampDate={stampDate} stampRef={stampRef} onDownload={handleDownload} />;
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 font-sans">
      <PartnerNav />

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950 py-20 sm:py-28">
        {/* decorative amber glow */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[480px] h-[480px] rounded-full bg-[#F5A623]/10 blur-3xl pointer-events-none" />
        <div className="relative max-w-4xl mx-auto px-4 text-center">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            {/* logo */}
            <div className="flex justify-center mb-6">
              <div className="bg-white rounded-2xl p-3 shadow-2xl shadow-black/40 inline-block">
                <img
                  src="/smartmenu-logo.jpg"
                  alt="SmartMenu"
                  className="w-36 sm:w-44 h-auto select-none object-contain"
                  draggable={false}
                />
              </div>
            </div>
            {/* wordmark */}
            <div className="mb-2">
              <span className="text-5xl sm:text-6xl font-black tracking-tight text-white">Smart</span>
              <span className="text-5xl sm:text-6xl font-black tracking-tight text-[#E8191A]">Menu</span>
            </div>
            <p className="text-xs sm:text-sm font-bold tracking-[0.25em] text-[#F5A623] uppercase mb-8">
              — Growing Restaurants. Together. —
            </p>
            {/* badge */}
            <div className="inline-block mb-6 px-4 py-1.5 rounded-full border border-[#E8191A]/40 bg-[#E8191A]/10 text-[#E8191A] text-xs font-black uppercase tracking-widest">
              Partner Program
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-white leading-tight mb-4">
              {PARTNER_PROGRAM_CONFIG.heroSection.title}
            </h1>
            <p className="text-base sm:text-lg text-zinc-300 mb-10 max-w-xl mx-auto leading-relaxed">
              {PARTNER_PROGRAM_CONFIG.heroSection.subtitle}
            </p>
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => registrationFormRef.current?.scrollIntoView({ behavior: 'smooth' })}
              className="inline-flex items-center gap-2 px-8 py-4 bg-[#E8191A] hover:bg-red-700 text-white rounded-xl font-black text-base shadow-xl shadow-red-900/40 transition-all"
            >
              {PARTNER_PROGRAM_CONFIG.heroSection.buttonText}
              <ArrowRight className="w-5 h-5" />
            </motion.button>
          </motion.div>
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────────────────── */}
      <section className="bg-white dark:bg-zinc-900 py-16 sm:py-20 border-b border-zinc-100 dark:border-zinc-800">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-12">
            <span className="inline-block text-xs font-black tracking-widest text-[#F5A623] uppercase mb-3">
              Paano gumagana
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-zinc-900 dark:text-white">
              3 Simpleng Hakbang
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {PARTNER_PROGRAM_CONFIG.howItWorks.map((item, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.15 }}
                className="relative p-6 bg-zinc-50 dark:bg-zinc-800 rounded-2xl border border-zinc-200 dark:border-zinc-700"
              >
                {/* step bubble */}
                <div
                  className="w-11 h-11 rounded-full flex items-center justify-center text-white font-black text-lg mb-4 shadow-md"
                  style={{ background: idx === 0 ? '#F5A623' : idx === 1 ? '#E8191A' : '#1A1A1A' }}
                >
                  {item.step}
                </div>
                <h3 className="text-lg font-black text-zinc-900 dark:text-white mb-2">{item.title}</h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">{item.description}</p>
                {idx < 2 && (
                  <ArrowRight className="hidden md:block absolute -right-3 top-10 w-6 h-6 text-[#F5A623]" />
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── REGISTRATION FORM ─────────────────────────────────────────────── */}
      <section ref={registrationFormRef} className="py-16 sm:py-20 px-4">
        <div className="max-w-2xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl shadow-zinc-200/60 dark:shadow-zinc-950 border border-zinc-200 dark:border-zinc-800 overflow-hidden"
          >
            {/* form header stripe */}
            <div className="bg-gradient-to-r from-[#E8191A] to-[#c0121a] px-8 pt-8 pb-7">
              <div className="flex items-center gap-3">
                <div className="bg-white rounded-xl p-1.5 shrink-0">
                  <img
                    src="/smartmenu-logo.jpg"
                    alt="SmartMenu"
                    className="w-10 h-10 object-contain select-none"
                    draggable={false}
                  />
                </div>
                <div>
                  <h2 className="text-xl font-black text-white leading-tight">Mag-register Bilang Partner</h2>
                  <p className="text-xs text-red-200 mt-0.5">Kumpletuhin ang form sa ibaba</p>
                </div>
              </div>
            </div>

            <div className="p-8">
              {generalError && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex gap-3"
                >
                  <AlertCircle className="w-5 h-5 text-[#E8191A] shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700 dark:text-red-300">{generalError}</p>
                </motion.div>
              )}

              <div className="space-y-5">
                {/* Row 1 */}
                <div className="grid sm:grid-cols-2 gap-5">
                  <FormField label="Pangalan *" name="fullName" value={formData.fullName}
                    onChange={handleInputChange} error={errors.fullName}
                    placeholder="Juan Dela Cruz" icon={<User className="w-4 h-4" />} />
                  <FormField label="Pangalan ng Negosyo *" name="businessName" value={formData.businessName}
                    onChange={handleInputChange} error={errors.businessName}
                    placeholder="Ang Aming Restaurant" icon={<Building2 className="w-4 h-4" />} />
                </div>
                {/* Row 2 */}
                <div className="grid sm:grid-cols-2 gap-5">
                  <FormField label="Mobile Number *" name="mobileNumber" value={formData.mobileNumber}
                    onChange={handleInputChange} error={errors.mobileNumber}
                    placeholder="0912 345 6789" icon={<Phone className="w-4 h-4" />} />
                  <FormField label="Email Address *" name="email" type="email" value={formData.email}
                    onChange={handleInputChange} error={errors.email}
                    placeholder="juan@example.com" icon={<Mail className="w-4 h-4" />} />
                </div>
                {/* Row 3 */}
                <div className="grid sm:grid-cols-2 gap-5">
                  <FormField label="Business Address / City *" name="businessAddress" value={formData.businessAddress}
                    onChange={handleInputChange} error={errors.businessAddress}
                    placeholder="Manila, Metro Manila" icon={<MapPin className="w-4 h-4" />} />
                  <FormField label="Area ng Pagbebenta (Opsyonal)" name="areaCoverage" value={formData.areaCoverage}
                    onChange={handleInputChange}
                    placeholder="Metro Manila, Quezon Province" icon={<MapPin className="w-4 h-4" />} />
                </div>
                {/* Row 4 — prices */}
                <div className="grid sm:grid-cols-2 gap-5">
                  <FormField label="Presyong Ioofer sa Client *" name="offeredPrice" value={formData.offeredPrice}
                    onChange={handleInputChange} error={errors.offeredPrice}
                    placeholder="5,499" prefix="₱" icon={<DollarSign className="w-4 h-4" />} />
                  <FormField label="Markup ng Partner *" name="markup" value={formData.markup}
                    onChange={handleInputChange} error={errors.markup}
                    placeholder="1,500" prefix="₱" icon={<DollarSign className="w-4 h-4" />} />
                </div>
                {/* Row 5 — profile picture */}
                <div>
                  <label className="block text-sm font-bold text-zinc-900 dark:text-white mb-2">
                    Profile Picture <span className="text-zinc-400 font-normal">(Opsyonal)</span>
                  </label>
                  <input type="file" accept="image/*" onChange={handleProfilePictureChange}
                    className="hidden" id="profile-picture-input" />
                  <label htmlFor="profile-picture-input" className="cursor-pointer block">
                    <div className="w-full px-4 py-5 border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-xl hover:border-[#E8191A] dark:hover:border-[#E8191A] transition-colors bg-zinc-50 dark:bg-zinc-800 flex flex-col items-center gap-1.5">
                      <div className="w-9 h-9 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center">
                        <User className="w-5 h-5 text-zinc-400" />
                      </div>
                      {formData.profilePicture ? (
                        <p className="text-sm font-bold text-[#E8191A]">{formData.profilePicture.name}</p>
                      ) : (
                        <>
                          <p className="text-sm font-bold text-zinc-700 dark:text-zinc-300">I-upload ang larawan</p>
                          <p className="text-xs text-zinc-400">JPG, PNG — max 5 MB</p>
                        </>
                      )}
                    </div>
                  </label>
                  {errors.profilePicture && (
                    <p className="text-xs text-[#E8191A] mt-1.5">{errors.profilePicture}</p>
                  )}
                </div>
              </div>

              {/* Terms & Conditions */}
              <div className="mt-8 pt-7 border-t border-zinc-200 dark:border-zinc-700">
                <h3 className="text-base font-black text-zinc-900 dark:text-white mb-3">Terms and Conditions</h3>
                <div className="bg-zinc-50 dark:bg-zinc-800 rounded-xl p-5 h-56 overflow-y-auto mb-4 border border-zinc-200 dark:border-zinc-700 text-left">
                  <TermsContent />
                </div>
                <label className="flex items-start gap-3 cursor-pointer p-3 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
                  <input type="checkbox" checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                    className="w-5 h-5 mt-0.5 cursor-pointer accent-[#E8191A]" />
                  <span className="text-sm text-zinc-700 dark:text-zinc-300 font-medium">
                    Nabasa ko at sumasang-ayon ako sa Terms and Conditions ng SmartMenu Partner Program.
                  </span>
                </label>
              </div>

              {/* Stamp button */}
              <motion.button
                whileHover={!isLoading && !stampDate && isFormValid && termsAccepted ? { scale: 1.02 } : {}}
                whileTap={!isLoading && !stampDate && isFormValid && termsAccepted ? { scale: 0.97 } : {}}
                onClick={handleStamp}
                disabled={isLoading || !isFormValid || !termsAccepted || !!stampDate}
                className={`w-full mt-7 py-4 px-6 rounded-2xl font-black text-base flex items-center justify-center gap-2.5 transition-all ${
                  isLoading || !!stampDate
                    ? 'bg-zinc-300 dark:bg-zinc-700 cursor-not-allowed text-zinc-500'
                    : !isFormValid || !termsAccepted
                    ? 'bg-zinc-200 dark:bg-zinc-800 cursor-not-allowed text-zinc-400 dark:text-zinc-600'
                    : 'bg-[#E8191A] hover:bg-red-700 text-white shadow-lg shadow-red-200 dark:shadow-red-900/30 cursor-pointer'
                }`}
              >
                <Stamp className="w-5 h-5" />
                {isLoading ? 'Nag-process...' : 'I-stamp ang Approval'}
              </motion.button>

              {/* Data privacy */}
              <p className="text-[11px] text-zinc-400 dark:text-zinc-500 text-center mt-5 leading-relaxed">
                {PARTNER_PROGRAM_CONFIG.dataPrivacyNotice}
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────────────── */}
      <footer className="bg-zinc-900 dark:bg-zinc-950 py-10 px-4 text-center border-t border-zinc-800">
        <div className="flex justify-center mb-3">
          <div className="bg-white rounded-xl p-2 inline-block">
            <img
              src="/smartmenu-logo.jpg"
              alt="SmartMenu"
              className="w-16 h-16 object-contain select-none"
              draggable={false}
            />
          </div>
        </div>
        <SmartMenuWordmark className="text-2xl" />
        <p className="text-xs font-bold tracking-widest text-[#F5A623] uppercase mt-1 mb-4">
          Growing Restaurants. Together.
        </p>
        <p className="text-xs text-zinc-500">{PARTNER_PROGRAM_CONFIG.ownerEmail}</p>
        <p className="text-xs text-zinc-600 mt-1">© {new Date().getFullYear()} SmartMenu. All rights reserved.</p>
      </footer>
    </div>
  );
}

/* ─── Reusable form field ─────────────────────────────────────────────────── */
function FormField({
  label, name, type = 'text', value, onChange, error, placeholder, prefix, icon,
}: {
  label: string; name: string; type?: string;
  value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  error?: string; placeholder?: string; prefix?: string; icon?: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5 uppercase tracking-wide">
        {label}
      </label>
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none">
            {icon}
          </div>
        )}
        {prefix && (
          <span className="absolute left-9 top-1/2 -translate-y-1/2 text-zinc-900 dark:text-white font-bold pointer-events-none text-sm">
            {prefix}
          </span>
        )}
        <input
          type={type} name={name} value={value} onChange={onChange} placeholder={placeholder}
          className={`w-full ${icon ? 'pl-10' : 'pl-4'} ${prefix ? 'pl-14' : ''} pr-4 py-3 rounded-lg border-2 text-sm transition-colors bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none ${
            error
              ? 'border-[#E8191A] bg-red-50 dark:bg-red-900/10'
              : 'border-zinc-200 dark:border-zinc-700 focus:border-[#E8191A]'
          }`}
        />
      </div>
      {error && <p className="text-xs text-[#E8191A] mt-1.5">{error}</p>}
    </div>
  );
}

/* ─── Terms text renderer ─────────────────────────────────────────────────── */
function TermsContent() {
  return (
    <div className="space-y-3">
      {PARTNER_PROGRAM_CONFIG.termsAndConditions.split('\n\n').map((para, idx) => {
        if (para.startsWith('#')) {
          return (
            <h4 key={idx} className="text-xs font-black text-zinc-900 dark:text-white uppercase tracking-wide mt-4 first:mt-0">
              {para.replace(/^#+\s*/, '')}
            </h4>
          );
        }
        return (
          <p key={idx} className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
            {para}
          </p>
        );
      })}
    </div>
  );
}

/* ─── Success screen ──────────────────────────────────────────────────────── */
function SuccessScreen({
  data, stampDate, stampRef, onDownload,
}: {
  data: FormState & { stampDate: string };
  stampDate: string;
  stampRef: React.RefObject<HTMLDivElement | null>;
  onDownload: () => void;
}) {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 font-sans">
      <PartnerNav />
      <div className="flex items-center justify-center px-4 py-16">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
          className="max-w-xl w-full">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
            {/* success header */}
            <div className="bg-gradient-to-r from-[#E8191A] to-[#c0121a] px-8 py-7 text-center">
              <motion.div
                animate={{ scale: [1, 1.12, 1] }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="w-16 h-16 mx-auto mb-3 bg-white/20 rounded-full flex items-center justify-center"
              >
                <CheckCircle2 className="w-9 h-9 text-white" />
              </motion.div>
              <h1 className="text-2xl font-black text-white">{PARTNER_PROGRAM_CONFIG.successMessage.title}</h1>
              <p className="text-sm text-red-200 mt-1">{PARTNER_PROGRAM_CONFIG.successMessage.subtitle}</p>
            </div>

            <div className="p-8">
              {/* summary */}
              <div className="bg-zinc-50 dark:bg-zinc-800 rounded-2xl p-5 mb-6 border border-zinc-200 dark:border-zinc-700 text-left">
                <h3 className="text-xs font-black uppercase tracking-widest text-zinc-500 dark:text-zinc-400 mb-4">
                  Inyong Application Details
                </h3>
                <div className="grid sm:grid-cols-2 gap-3 text-sm">
                  {[
                    ['Pangalan', data.fullName],
                    ['Business', data.businessName],
                    ['Email', data.email],
                    ['Mobile', data.mobileNumber],
                  ].map(([lbl, val]) => (
                    <div key={lbl}>
                      <p className="text-[10px] font-bold uppercase text-zinc-400">{lbl}</p>
                      <p className="font-bold text-zinc-900 dark:text-white truncate">{val}</p>
                    </div>
                  ))}
                  <div className="sm:col-span-2">
                    <p className="text-[10px] font-bold uppercase text-zinc-400">Address</p>
                    <p className="font-bold text-zinc-900 dark:text-white">{data.businessAddress}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase text-zinc-400">Offered Price</p>
                    <p className="text-xl font-black text-[#E8191A]">₱{data.offeredPrice}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase text-zinc-400">Markup</p>
                    <p className="text-xl font-black text-[#F5A623]">₱{data.markup}</p>
                  </div>
                </div>
              </div>

              {/* rubber stamp */}
              <div ref={stampRef} className="flex justify-center my-8">
                <motion.div
                  initial={{ scale: 0, rotate: -20 }}
                  animate={{ scale: 1, rotate: -12 }}
                  transition={{ type: 'spring', stiffness: 260, damping: 18, delay: 0.3 }}
                  className="inline-block"
                >
                  <div className="border-[5px] border-[#E8191A] rounded-xl px-7 py-3 opacity-80">
                    <p className="text-[#E8191A] font-black text-3xl sm:text-4xl tracking-widest uppercase">APPROVED</p>
                    <div className="flex items-center justify-center gap-2 mt-1">
                      <span className="h-px flex-1 bg-[#F5A623]" />
                      <p className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 tracking-wide">{stampDate}</p>
                      <span className="h-px flex-1 bg-[#F5A623]" />
                    </div>
                  </div>
                </motion.div>
              </div>

              <p className="text-sm text-zinc-600 dark:text-zinc-300 text-center mb-2">
                {PARTNER_PROGRAM_CONFIG.successMessage.details}
              </p>
              <p className="text-xs text-zinc-400 text-center italic mb-8">
                {PARTNER_PROGRAM_CONFIG.successMessage.reminder}
              </p>

              <div className="flex flex-col sm:flex-row gap-3">
                <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                  onClick={onDownload}
                  className="flex-1 py-3 px-5 bg-zinc-900 dark:bg-white hover:bg-zinc-800 dark:hover:bg-zinc-100 text-white dark:text-zinc-900 rounded-xl font-bold flex items-center justify-center gap-2 transition-all text-sm">
                  <Download className="w-4 h-4" />
                  I-download ang Certificate
                </motion.button>
                <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                  onClick={() => { window.location.href = '/'; }}
                  className="flex-1 py-3 px-5 border-2 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-xl font-bold transition-all text-sm">
                  Bumalik sa Home
                </motion.button>
              </div>
            </div>

            {/* footer stripe */}
            <div className="px-8 py-4 bg-zinc-900 flex items-center justify-center gap-2">
              <div className="bg-white rounded-lg p-1 shrink-0">
                <img
                  src="/smartmenu-logo.jpg"
                  alt="SmartMenu"
                  className="w-6 h-6 object-contain select-none"
                  draggable={false}
                />
              </div>
              <span className="text-xs font-black text-white">Smart</span>
              <span className="text-xs font-black text-[#E8191A]">Menu</span>
              <span className="text-xs text-zinc-500 mx-1">·</span>
              <span className="text-[10px] font-bold text-[#F5A623] tracking-widest uppercase">Growing Restaurants. Together.</span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
