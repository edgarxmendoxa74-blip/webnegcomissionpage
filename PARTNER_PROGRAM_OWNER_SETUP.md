# Partner Program - Owner Portal Setup Guide

## Quick Setup for Supabase Storage & Owner View

### Step 1: Create Storage Bucket in Supabase

1. Go to your Supabase Project → Storage
2. Click "Create New Bucket"
3. Name: `partner_profiles`
4. Set to Public ✓
5. Click Create

### Step 2: Configure Storage Permissions

1. Click on `partner_profiles` bucket
2. Go to "Policies"
3. Click "New Policy"
4. Choose Template: "Enable read access for everyone"
5. Click Review
6. Click Save

Repeat for Write Access:
1. Click "New Policy"
2. Choose Template: "Enable write access for everyone"
3. Click Review
4. Click Save

### Step 3: Update Configuration

**File:** `src/lib/partnerConfig.ts`

```typescript
ownerEmail: 'your.email@company.com', // Change to actual owner email
```

### Step 4: Change Admin Password

**File:** `src/pages/PartnerAdmin.tsx`

```typescript
const ADMIN_PASSWORD = 'YourSecurePassword123'; // Change this!
```

**Requirements:**
- Minimum 8 characters
- Include uppercase, lowercase, numbers
- Avoid dictionary words

### Step 5: Build & Deploy

```bash
npm run build
# Output should show: ✓ built in 7.23s (or similar)
```

---

## 🎯 Owner Portal Access

### Where to Find the Partners View

1. **Login to your owner dashboard**
2. **Look at left sidebar**
3. **Find "Partners" with briefcase icon** (last item)
4. **Click to open the Partners list**

### What You'll See

**Dashboard Statistics:**
- Total number of registered partners
- Total revenue (sum of all markups)
- Average markup per partner

**Partner Grid:**
- Each partner displays as a card
- Profile picture at the top
- Partner name and business name
- Contact information
- Pricing (offered price & markup)
- Status badge (Approved)
- "View" button for details

**Search & Export:**
- Search box to find partners
- Filter options (All/Pending/Approved/Rejected)
- CSV export button

---

## 👁️ Viewing Partner Details

**To see full details:**
1. Click the "View" button on any partner card
2. Modal opens showing:
   - Full profile picture
   - All contact information
   - Offered price & markup
   - Profit margin percentage
   - Registration date

**Close modal:**
- Click anywhere outside the modal or the "Close" button

---

## 📸 Profile Pictures in Database

**Storage Path:** `partner_profiles/public/{filename}`

**What Happens:**
1. Partner uploads picture during sign-up
2. Image is validated (must be image file, max 5MB)
3. After partner stamps approval, picture is uploaded
4. URL saved in `partner_applications.profile_picture_url`
5. Displays in owner portal

**Fallback:**
- If no picture: Shows default user icon
- Graceful handling of missing images

---

## 🔄 Partner Status Flow

**Initial Registration:**
- Partner fills form → Submits
- Status: `pending`
- Shows in Admin Dashboard

**Admin Review:**
- Admin login: `/partners/admin`
- Password: (what you set above)
- Change status to `approved` or `rejected`

**Owner Sees:**
- Only `approved` partners in owner portal
- Shows up on "Partners" tab
- Displays with profile picture
- Included in statistics

---

## 📊 Statistics Explained

| Statistic | Calculation | Use |
|-----------|-------------|-----|
| Total Partners | Count of approved partners | Overall program size |
| Total Revenue | Sum of all markups | Revenue generated |
| Average Markup | Total revenue ÷ partner count | Average per partner |
| Profit Margin % | (Markup ÷ Offered Price) × 100 | Per-partner profitability |

---

## 🔐 Security Checklist

Before going live:

- [ ] Changed admin password from default
- [ ] Updated owner email in config
- [ ] Created `partner_profiles` storage bucket
- [ ] Set public read access on storage
- [ ] Set authenticated write access on storage
- [ ] Tested profile picture upload
- [ ] Tested partner creation flow
- [ ] Verified owner can see partners
- [ ] Tested CSV export
- [ ] Verified dark mode works
- [ ] Tested on mobile device

---

## 🐛 Troubleshooting

### "Partner pictures not showing"
- Check Supabase storage bucket exists (`partner_profiles`)
- Verify bucket has public read access
- Check browser console for errors
- Check partner has `profile_picture_url` in database

### "No partners appear in owner portal"
- Check partners are marked as `approved` status
- Verify they exist in `partner_applications` table
- Check filters aren't hiding them
- Refresh page

### "Profile picture won't upload"
- Verify file is actual image (jpg, png, etc.)
- Check file size is under 5MB
- Check storage bucket exists
- Look at browser console for errors

### "Can't login to admin"
- Verify password is correct (case sensitive)
- Clear browser cache and cookies
- Check network connection
- Look for errors in browser console

---

## 📱 Mobile & Responsive

**Partner Grid Layout:**
- **Mobile:** 1 column
- **Tablet:** 2 columns
- **Desktop:** 3 columns

**All Features Responsive:**
- ✅ Profile pictures scale correctly
- ✅ Touch-friendly buttons
- ✅ Readable text on all screens
- ✅ Search works on mobile
- ✅ Detail modal responsive
- ✅ CSV export available

---

## 🌙 Dark Mode

**Fully Supported:**
- Partner cards adapt to system theme
- Text remains readable
- Profile pictures displayed clearly
- Statistics clearly visible
- Modal readable in dark mode
- No manual toggle needed (uses system preference)

---

## 📥 CSV Export Features

**What Gets Exported:**
- Full Name
- Business Name
- Mobile Number
- Email
- Address
- Offered Price
- Markup
- Approval Status
- Date Registered

**How to Use:**
1. Click "Export CSV" button
2. File downloads to computer
3. Open in Excel/Sheets
4. Use for reporting/accounting

---

## 🎓 Owner Workflow

### Daily Tasks
1. **Check new partners** → Admin dashboard (`/partners/admin`)
2. **Approve applications** → Change status to "Approved"
3. **View all partners** → Dashboard → Partners tab
4. **Monitor statistics** → Check revenue & average markup
5. **Export data** → For accounting/reports

### Weekly Tasks
1. Review partner performance
2. Export partner list
3. Send communications if needed
4. Monitor marketplace growth

### Monthly Tasks
1. Run full CSV export
2. Analyze trends
3. Calculate payouts
4. Plan promotions

---

## 🔗 Important URLs

**Public Sign-up:**
```
https://yourdomain.com/partners
```

**Admin Dashboard:**
```
https://yourdomain.com/partners/admin
```

**Owner Portal (after login):**
```
Dashboard → Partners tab
```

---

## 📞 Support

If issues occur:

1. **Check browser console** (F12) for errors
2. **Verify Supabase credentials** in .env
3. **Confirm storage bucket exists** in Supabase
4. **Check database migrations** applied
5. **Review troubleshooting section** above

For detailed info, see:
- `PARTNER_PROGRAM_SETUP.md` - Full setup guide
- `PARTNER_PROGRAM_QUICK_START.md` - Quick reference
- `PARTNER_PROGRAM_CONFIG_REFERENCE.md` - Configuration options

---

## ✨ You're Ready!

Your partner program is now live with:
- ✅ Public sign-up at `/partners`
- ✅ Admin dashboard at `/partners/admin`
- ✅ **Owner portal showing all partners with pictures**
- ✅ Profile picture uploads
- ✅ Statistics & analytics
- ✅ Search & filtering
- ✅ CSV export
- ✅ Mobile responsive
- ✅ Dark mode

**Next:** Log in to owner portal and check the Partners tab! 🎉
