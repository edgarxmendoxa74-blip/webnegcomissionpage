# SmartMenu Partner Program - Quick Start Guide

## 🚀 Get Started in 5 Minutes

### Step 1: Create the Database Table

Copy this SQL and run it in your Supabase SQL Editor:

```sql
CREATE TABLE IF NOT EXISTS partner_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  business_name TEXT NOT NULL,
  mobile_number TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  business_address TEXT NOT NULL,
  area_coverage TEXT,
  offered_price NUMERIC NOT NULL,
  markup NUMERIC NOT NULL,
  accepted_terms BOOLEAN NOT NULL DEFAULT TRUE,
  stamp_date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_partner_applications_email ON partner_applications(email);
CREATE INDEX idx_partner_applications_mobile_number ON partner_applications(mobile_number);
CREATE INDEX idx_partner_applications_status ON partner_applications(status);
CREATE INDEX idx_partner_applications_created_at ON partner_applications(created_at DESC);

ALTER TABLE partner_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public insert" ON partner_applications FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "Allow authenticated read" ON partner_applications FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated update" ON partner_applications FOR UPDATE USING (auth.role() = 'authenticated');
```

### Step 2: Update Configuration

Edit `src/lib/partnerConfig.ts` and change:

```typescript
ownerEmail: 'your-email@smartmenu.com', // Your email for notifications
```

### Step 3: Change Admin Password

Edit `src/pages/PartnerAdmin.tsx` and change:

```typescript
const ADMIN_PASSWORD = 'YourSecurePassword123'; // Change this!
```

### Step 4: Build and Deploy

```bash
npm run build
```

## 📱 Access Your Pages

**Public Sign-up Page:**
```
https://yourdomain.com/partners
```

**Admin Dashboard:**
```
https://yourdomain.com/partners/admin
```
Login with the password you set in Step 3.

## 🎯 What Users See

### Sign-up Form
1. Enter basic info (name, business, mobile, email)
2. Enter address and service area
3. Set offered price and markup
4. Read and accept terms
5. Click "I-stamp ang Approval"
6. See success message with stamp and date
7. Download certificate

### Admin Dashboard
1. Login with admin password
2. See dashboard with 4 stats
3. View all applications in table
4. Search for specific partners
5. Click "View" to see details
6. Update status (Approve, Reject, Pending)
7. Export data as CSV

## 📋 Form Fields

| Field | Type | Required | Format |
|-------|------|----------|--------|
| Full Name | Text | Yes | Juan Dela Cruz |
| Business Name | Text | Yes | My Restaurant |
| Mobile | Phone | Yes | 0912 345 6789 |
| Email | Email | Yes | juan@example.com |
| Address | Text | Yes | Manila, NCR |
| Area Coverage | Text | No | Metro Manila |
| Offered Price | Currency | Yes | 5,499 |
| Markup | Currency | Yes | 1,500 |

## 🔐 Security

✅ Duplicate prevention by email and mobile
✅ Phone number format validation
✅ Email format validation
✅ Markup amount validation
✅ Password-protected admin area
✅ Supabase RLS policies

## 📊 Data Export

Go to admin dashboard and click "Export CSV" to download:
- All partner information
- Pricing details
- Offered prices and markups
- Application status
- Submission timestamps

## 🎨 Customization

### Change Colors

In any `.tsx` file, replace:
- `from-orange-500 to-red-600` → your colors

### Change Terms & Conditions

Edit `src/lib/partnerConfig.ts`:

```typescript
termsAndConditions: `# Your Title

## Section 1
Your content here...

## Section 2
More content...`
```

### Change Form Labels

Edit all text in `src/lib/partnerConfig.ts`:

```typescript
validationMessages: {
  fullNameRequired: 'Your custom message',
  // ... etc
}
```

## 🐛 Common Issues

**"Database table not found"**
- Run the SQL migration from Step 1

**"Can't login to admin"**
- Check the password in `PartnerAdmin.tsx`
- Try clearing browser cache
- Check console for errors

**"Form won't submit"**
- Fill all required fields
- Accept terms and conditions
- Check markup ≤ offered price

**"Emails not sending"**
- Email notifications are optional (non-blocking)
- Set up webhook to your backend to enable

## 💡 Pro Tips

1. **Backup before deploying** - Save database before major changes
2. **Test thoroughly** - Try all validation scenarios
3. **Mobile first** - Test on phones (most partners use mobile)
4. **Monitor applications** - Check admin dashboard daily
5. **Update terms** - Review and update terms annually

## 📞 Support

For more details, see:
- `PARTNER_PROGRAM_SETUP.md` - Full setup guide
- `src/lib/partnerConfig.ts` - All configuration options
- `src/pages/PartnerProgram.tsx` - Sign-up page code
- `src/pages/PartnerAdmin.tsx` - Admin dashboard code

## ✨ Features

✅ Responsive design (mobile, tablet, desktop)
✅ Light and dark mode
✅ Form validation in Taglish
✅ Rubber stamp approval system
✅ Success screen with certificate download
✅ Admin dashboard with search
✅ CSV data export
✅ Duplicate prevention
✅ Real-time stats
✅ Status management

---

**You're all set!** Visit `/partners` to test the sign-up page.
