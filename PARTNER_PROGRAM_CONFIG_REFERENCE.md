# Partner Program Configuration Reference

## Complete Config Guide

All configuration for the SmartMenu Partner Program is managed in `src/lib/partnerConfig.ts`.

### Basic Settings

```typescript
PARTNER_PROGRAM_CONFIG = {
  programName: 'SmartMenu Partner Program',
  ownerEmail: 'webnegosyo3@gmail.com',
  // ... rest of config
}
```

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `programName` | string | "SmartMenu Partner Program" | Displayed in hero and pages |
| `ownerEmail` | string | "webnegosyo3@gmail.com" | Where applications are sent |

### Hero Section

```typescript
heroSection: {
  title: 'SmartMenu Partner Program',
  subtitle: 'Ialok ang SmartMenu sa mga kliyente mo at kumita sa bawat benta.',
  buttonText: 'Magsimula ng Pag-register',
}
```

**Fields:**
- `title`: Main heading (1 line)
- `subtitle`: Tagline/pitch (1-2 lines)
- `buttonText`: CTA button label

### How It Works Section

```typescript
howItWorks: [
  {
    step: 1,
    title: 'Mag-register',
    description: 'Kumpletuhin ang application form...',
  },
  // 2 more items
]
```

**Structure:**
- Array of 3 objects (steps)
- Each has: `step` (number), `title`, `description`
- Displayed as cards with numbers
- Mobile-responsive grid

### Terms and Conditions

```typescript
termsAndConditions: `# SmartMenu Partner Program Terms and Conditions

## 1. Payment Terms
Partners will receive their markup amount...

## Section Header
Content here...
`
```

**Markdown Support:**
- Use `# Section Title` for headers
- Use regular text for content
- Rendered in scrollable box
- Must accept before submitting

**Key Sections to Include:**
1. Payment terms
2. Support responsibilities
3. Warranty & refund policy
4. Brand usage
5. Area exclusivity
6. Termination clause
7. Confidentiality
8. Compliance
9. Amendments
10. Dispute resolution

### Data Privacy Notice

```typescript
dataPrivacyNotice: `Ang impormasyon na inyong ibinigay sa form...`
```

**Usage:** Displayed under the form in small text

**Update annually** to reflect current compliance

### Validation Messages

```typescript
validationMessages: {
  fullNameRequired: 'Ang pangalan ay kailangan.',
  businessNameRequired: 'Ang pangalan ng negosyo ay kailangan.',
  mobileRequired: 'Ang mobile number ay kailangan.',
  mobileInvalid: 'Ang mobile number ay dapat nasa format: 09XX XXX XXXX',
  emailRequired: 'Ang email address ay kailangan.',
  emailInvalid: 'Ang email address ay hindi valid.',
  addressRequired: 'Ang business address/city ay kailangan.',
  offeredPriceRequired: 'Ang presyong ioofer sa client ay kailangan.',
  offeredPriceInvalid: 'Ang presyo ay dapat na numero.',
  markupRequired: 'Ang markup ng partner ay kailangan.',
  markupInvalid: 'Ang markup ay dapat na numero.',
  markupTooHigh: 'Ang markup ay hindi dapat lumampas sa presyong ioofer.',
  termsRequired: 'Kailangan mong i-accept ang Terms and Conditions.',
  duplicateEmail: 'Ang email na ito ay ginamit na para sa isang application.',
  duplicateMobile: 'Ang mobile number na ito ay ginamit na para sa isang application.',
}
```

**Customization:**
- Change to English if needed
- Use different language (Spanish, etc.)
- Keep messages clear and actionable
- Match your tone of voice

### Success Message

```typescript
successMessage: {
  title: 'Salamat sa Inyong Pag-register!',
  subtitle: 'Natatanggap namin ang inyong application.',
  details: 'Ang aming team ay mag-rerebyu...',
  reminder: 'Ang inyong partnership stamp...',
}
```

**Where It Appears:**
- `title`: Large heading on success page
- `subtitle`: Below title
- `details`: Explanation paragraph
- `reminder`: Additional info at bottom

---

## Customization Examples

### Change Email Recipient

```typescript
ownerEmail: 'yourname@smartmenu.com'
```

The application is "sent" to this email (if webhook set up).

### Update Program Name

```typescript
programName: 'RestauTech Partner Opportunities'
```

Changes everywhere: title, emails, documents.

### Modify Hero Message

```typescript
heroSection: {
  title: 'Join Our Sales Network',
  subtitle: 'Earn commission on every SmartMenu implementation.',
  buttonText: 'Register as Partner',
}
```

### Add More Steps

```typescript
// Add a 4th step if desired:
howItWorks: [
  { step: 1, title: 'Mag-register', description: '...' },
  { step: 2, title: 'Review Terms', description: '...' },
  { step: 3, title: 'Start Selling', description: '...' },
  { step: 4, title: 'Earn Commission', description: '...' },
]
```

Then update the HTML grid from `grid-cols-3` to `grid-cols-4`.

### Translate to English

```typescript
validationMessages: {
  fullNameRequired: 'Full name is required.',
  businessNameRequired: 'Business name is required.',
  // ... etc
}
```

### Change Terms

```typescript
termsAndConditions: `# YOUR COMPANY Terms

## 1. Compensation
Partners receive 25% markup on each sale...

## 2. Support
We provide technical and training support...
`
```

---

## Admin Password

Located in `src/pages/PartnerAdmin.tsx`:

```typescript
const ADMIN_PASSWORD = 'SmartMenu2024';  // Change this!
```

**Change Before Production:**

```typescript
const ADMIN_PASSWORD = 'YourStrongPassword123!@#';
```

**Password Requirements:**
- Minimum 8 characters
- Include uppercase, lowercase, numbers
- Avoid dictionary words
- Keep secure (don't share)

---

## Form Field Validation

### Phone Number Format

```typescript
mobileInvalid: 'Ang mobile number ay dapat nasa format: 09XX XXX XXXX'
```

**Validation Logic:**
```regex
^09\d{2}\s\d{3}\s\d{4}$
```

**Examples:**
- ✅ 0912 345 6789
- ✅ 0917 123 4567
- ❌ 912 345 6789 (missing leading 09)
- ❌ 09123456789 (no spaces)

### Email Validation

```regex
^[^\s@]+@[^\s@]+\.[^\s@]+$
```

**Examples:**
- ✅ juan@smartmenu.com
- ✅ business@domain.co.ph
- ❌ juan@smartmenu (missing TLD)
- ❌ @smartmenu.com (no local part)

### Price Validation

- Must be numeric
- Formatted with ₱ symbol and commas
- Markup cannot exceed offered price
- Both required

**Examples:**
- ✅ Offered: 5,499 | Markup: 1,500
- ❌ Offered: 5,499 | Markup: 6,000 (too high)
- ❌ Offered: abc | Markup: 1,500 (not numeric)

---

## Database Connection

### Environment Variables

Required in `.env`:

```
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...
```

### Supabase Table

Table: `partner_applications`

**Columns:**
- `id` (UUID, primary key)
- `full_name` (text)
- `business_name` (text)
- `mobile_number` (text, unique)
- `email` (text, unique)
- `business_address` (text)
- `area_coverage` (text, nullable)
- `offered_price` (numeric)
- `markup` (numeric)
- `accepted_terms` (boolean)
- `stamp_date` (text)
- `status` (text: pending/approved/rejected)
- `created_at` (timestamp)
- `updated_at` (timestamp)

---

## Styling & Colors

### Primary Colors

Currently using:
- **Primary:** from-orange-500 to-red-600
- **Text:** slate-900 (dark) / white (light)
- **Background:** slate-50 (light) / slate-950 (dark)

### How to Change

Search for these patterns and replace:

```typescript
// Orange/Red primary
from-orange-500 to-red-600
hover:from-orange-600 hover:to-red-700

// Accent
accent-orange-500

// Replace with your brand colors
from-blue-500 to-cyan-600  // Blue theme
from-purple-500 to-pink-600  // Purple theme
from-green-500 to-emerald-600  // Green theme
```

### Dark Mode

Automatically supported with Tailwind dark mode:

```typescript
className="bg-white dark:bg-slate-800"
```

No additional changes needed.

---

## API Integrations

### Email Notifications

Currently non-blocking (optional):

```typescript
await fetch('/api/send-partner-notification', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    full_name: data.full_name,
    email: data.email,
    business_name: data.business_name,
    offered_price: data.offered_price,
    markup: data.markup,
    ownerEmail: PARTNER_PROGRAM_CONFIG.ownerEmail,
  }),
});
```

**To Enable:**
1. Create backend endpoint at `/api/send-partner-notification`
2. Send email to `PARTNER_PROGRAM_CONFIG.ownerEmail`
3. Include all application details

---

## Deployment Checklist

Before going live:

- [ ] Update `ownerEmail` in config
- [ ] Change admin password in PartnerAdmin.tsx
- [ ] Review and update terms and conditions
- [ ] Run database migration (SQL)
- [ ] Test form submission locally
- [ ] Test admin login
- [ ] Test CSV export
- [ ] Test on mobile devices
- [ ] Enable dark mode and verify UI
- [ ] Update any branding/colors
- [ ] Set up email notifications (optional)
- [ ] Verify all validation messages
- [ ] Test duplicate prevention
- [ ] Backup Supabase
- [ ] Run `npm run build` without errors
- [ ] Push to GitHub and verify CI/CD

---

## Support & Troubleshooting

### Form won't submit
- Check all required fields are filled
- Verify terms are accepted
- Check markup ≤ offered price
- Check browser console for errors

### Admin dashboard won't load
- Verify correct password
- Check `.env` has Supabase credentials
- Clear browser cache
- Check console for errors

### Database errors
- Run SQL migration from `partner_applications_schema.sql`
- Verify table exists in Supabase
- Check RLS policies are correct
- Look at Supabase logs

### CSV export not working
- Ensure table has data
- Check browser download settings
- Look for console errors
- Try different browser

---

For more help, see:
- `PARTNER_PROGRAM_SETUP.md` - Full setup guide
- `PARTNER_PROGRAM_QUICK_START.md` - Quick start
