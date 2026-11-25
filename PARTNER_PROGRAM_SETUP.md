# SmartMenu Partner Program Setup Guide

## Overview

The SmartMenu Partner Program is a new feature that allows restaurants and businesses to register as partners and earn commission markup on each sale. This guide walks you through the complete setup process.

## Features

✅ **Responsive Sign-up Page** (`/partners`)
- Mobile-first design with light/dark mode support
- Clean, professional interface for restaurant owners
- Real-time form validation with Taglish error messages
- Stamp-based approval system with date tracking

✅ **Admin Dashboard** (`/partners/admin`)
- Password-protected management interface
- View all partner applications
- Search functionality
- Status management (Pending, Approved, Rejected)
- CSV export of all applications
- Application detail view with status update buttons

✅ **Database Integration**
- Supabase-based storage for all submissions
- Duplicate prevention by email and mobile number
- Status tracking and timestamps
- Support for offered price and markup calculations

## Setup Steps

### 1. Database Setup

Run the SQL migration in Supabase to create the partner_applications table:

1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Create a new query
4. Copy and paste the contents from `partner_applications_schema.sql`
5. Click "Run" to execute the migration

**Tables Created:**
- `partner_applications`: Stores all partner sign-ups
- Indexes: on email, mobile_number, status, created_at

### 2. Configuration

Edit `src/lib/partnerConfig.ts` to customize:

```typescript
PARTNER_PROGRAM_CONFIG = {
  programName: 'SmartMenu Partner Program',
  ownerEmail: 'webnegosyo3@gmail.com', // Email for notifications
  heroSection: { ... },
  howItWorks: [ ... ],
  termsAndConditions: '...', // Update with your terms
  validationMessages: { ... },
  // ... more config
}
```

**Key settings to update:**
- `ownerEmail`: Where partner applications are sent
- `termsAndConditions`: Your legal terms (currently placeholder)
- `howItWorks`: 3-step process description
- Validation messages (optional, in Taglish)

### 3. Admin Password

In `src/pages/PartnerAdmin.tsx`, find this line:

```typescript
const ADMIN_PASSWORD = 'SmartMenu2024'; // Change this to a secure password
```

**Change to a strong, unique password before deploying to production.**

### 4. Email Notifications (Optional)

The system is configured to send email notifications when new applications arrive. To enable:

1. Create a serverless function or webhook handler on your backend
2. Update the email sending logic in `PartnerProgram.tsx`:

```typescript
await fetch('/api/send-partner-notification', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    ...submissionData,
    ownerEmail: PARTNER_PROGRAM_CONFIG.ownerEmail,
  }),
});
```

Currently, this silently fails (non-blocking) if the endpoint doesn't exist.

## Routes

### Public Routes
- `/partners` - Partner sign-up page
- `/partners` (hash) - Alias: `/#/partners`

### Protected Routes
- `/partners/admin` - Admin dashboard (password protected)
- `/partners/admin` (hash) - Alias: `/#/partners/admin`

## File Structure

```
src/
├── lib/
│   ├── partnerConfig.ts       # Configuration file
│   └── partners.ts            # Database functions
├── pages/
│   ├── PartnerProgram.tsx     # Sign-up page
│   └── PartnerAdmin.tsx       # Admin dashboard
└── App.tsx                    # Updated with routing

partner_applications_schema.sql # Database schema
```

## Component Features

### Sign-up Page (`PartnerProgram.tsx`)

**Form Fields:**
- Full name (required)
- Business name (required)
- Mobile number (required, PH format: 09XX XXX XXXX)
- Email (required, unique validation)
- Business address (required)
- Area of coverage (optional)
- Offered price to client (required, ₱ formatted)
- Markup (required, ₱ formatted, cannot exceed offered price)

**Validation:**
- Real-time error messages in Taglish
- Phone format validation (09XX XXX XXXX)
- Email validation
- Price comparisons (markup ≤ offered price)
- Duplicate prevention (email + mobile)
- Terms acceptance required

**Approval Stamp:**
- Rubber stamp style with rotation
- Auto-filled with current date
- Locked after submission
- Success screen with summary
- Download certificate option (as text file)

### Admin Dashboard (`PartnerAdmin.tsx`)

**Features:**
- Login with admin password
- Display all applications in table format
- Search functionality (name, email, mobile, business)
- Status badges (Pending/Approved/Rejected)
- Quick view modal with full details
- Status update buttons
- CSV export with all data including prices and markup
- Real-time stats (total, pending, approved, rejected)

**Admin Password:**
- Default: `SmartMenu2024`
- Change in source code before production

## Data Flow

1. **User submits form at `/partners`**
   - Form validation on client side
   - Check for duplicate email/mobile
   - Create stamp with current date
   - Save to database
   - Display success screen

2. **Admin reviews at `/partners/admin`**
   - Login with password
   - View all applications
   - Search and filter
   - Change status to Approved/Rejected/Pending
   - Download data as CSV

3. **Data stored in Supabase**
   - `partner_applications` table
   - Tracks status, pricing, terms acceptance
   - Timestamps for all submissions

## Testing Locally

1. Ensure Supabase credentials are in `.env`:
```
VITE_SUPABASE_URL=your_url
VITE_SUPABASE_ANON_KEY=your_key
```

2. Run development server:
```bash
npm run dev
```

3. Test sign-up: http://localhost:5173/partners
4. Test admin: http://localhost:5173/partners/admin

## Deployment Checklist

- [ ] Update `ADMIN_PASSWORD` in `PartnerAdmin.tsx`
- [ ] Update `ownerEmail` in `partnerConfig.ts`
- [ ] Review and update `termsAndConditions` text
- [ ] Set up email notification endpoint (optional)
- [ ] Test form submission and validation
- [ ] Test admin login and application management
- [ ] Verify database schema is applied
- [ ] Test on mobile devices
- [ ] Enable dark mode and verify UI
- [ ] Backup Supabase before production

## Customization

### Change Colors
Edit Tailwind classes in component files:
- Orange/Red: Search for `from-orange-500 to-red-600`
- Replace with your brand colors

### Change Terminology
Update all text in `partnerConfig.ts`:
- Hero section copy
- How it works steps
- Validation messages
- Success messages
- Terms and conditions

### Add More Form Fields
1. Add field to `FormState` interface in `PartnerProgram.tsx`
2. Add validation in `validateForm()`
3. Add field component with `FormField`
4. Update database schema in SQL
5. Update `partners.ts` save function

### Customize Terms and Conditions
Edit the `termsAndConditions` string in `partnerConfig.ts`. Markdown headers will be parsed as section titles.

## Troubleshooting

### "Module not found" errors
- Run `npm install`
- Clear `node_modules` and `dist` folders
- Rebuild with `npm run build`

### Database connection errors
- Verify `.env` file has correct Supabase credentials
- Check that `partner_applications` table exists
- Verify RLS policies are properly set
- Check Supabase SQL logs

### Admin login not working
- Verify correct password in `PartnerAdmin.tsx`
- Check browser console for errors
- Clear browser cookies/cache

### Form not submitting
- Check browser console for JavaScript errors
- Verify Supabase table is accessible
- Check duplicate email/mobile validation
- Ensure all required fields are filled

### CSV export not working
- Check browser download settings
- Verify table has data
- Check browser console for errors

## Security Notes

⚠️ **Important for Production:**

1. **Admin Password**: Change the default password immediately
2. **Environment Variables**: Keep `.env` secure and never commit to git
3. **Email Notifications**: Only send to verified owner email
4. **RLS Policies**: Review Supabase row-level security settings
5. **Data Privacy**: Ensure GDPR/Data Privacy Act compliance
6. **HTTPS Only**: Deploy only over HTTPS

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review browser console for errors
3. Check Supabase logs and metrics
4. Verify configuration in `partnerConfig.ts`

## Version History

- **v1.0** - Initial release with:
  - Sign-up form with validation
  - Admin dashboard
  - Database integration
  - Stamp approval system
  - CSV export
