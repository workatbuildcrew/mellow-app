# 🛠 Mellow Co. — Bug Fix Guide
## All 6 errors fixed · Redeploy in 5 minutes

---

## 📋 REPLACE THESE 3 FILES ONLY

| File | Where it goes in your project |
|------|-------------------------------|
| `app.js` | Root of project (replaces existing) |
| `admin.html` | Root of project (replaces existing) |
| `netlify/functions/api.js` | Inside `netlify/functions/` folder |

**Do NOT change:** `index.html`, `auth.js`, `payment.js`, `style.css`, `supabase-setup.sql`

---

## 🐛 BUGS FIXED

### Bug 1 — "Could not load orders" / Profile save fails on Netlify
**Root cause:** `app.js` was calling `fetch('/api/my-orders')` and `fetch('/api/update-profile')`
without `apiBase()`. On Netlify, `/api/...` with no prefix hits the SPA fallback and
returns the HTML page (DOCTYPE) — not JSON — causing the "Unexpected token '<'" error.

**Fix:** Added `apiBase()` prefix to all API calls in `app.js`.

---

### Bug 2 — Newsletter subscribe fails on Netlify
**Root cause:** Same as Bug 1 — `fetch('/api/newsletter-subscribe')` missing `apiBase()`.

**Fix:** Added `apiBase()` prefix.

---

### Bug 3 — "Error sending email change email" (both local + Netlify)
**Root cause:** `changeEmail()` calls `client.auth.updateUser({ email: newEmail })`.
Supabase sends a confirmation link to the new email via its OWN email service.
For this to work, you must configure Supabase's SMTP settings.

**Fix in code:** Better error message + loading state + audit log call added.

**One-time Supabase setup you must do:**
1. Go to: https://supabase.com/dashboard → Your project → **Authentication** → **Settings**
2. Scroll to **SMTP Settings** → Enable custom SMTP
3. Fill in:
   - Host: `smtp.gmail.com`
   - Port: `587`
   - Username: `workatbuildcrew@gmail.com`
   - Password: `uavh alxt srit vkhk` (your Gmail App Password)
   - Sender name: `Mellow Co.`
   - Sender email: `workatbuildcrew@gmail.com`
4. Click **Save**

After this, "Update Email" will send a confirmation link to the new email address.

---

### Bug 4 — Admin discount codes don't work for customers
**Root cause:** Old `api.js` validate-discount was fetching:
`?code=eq.X&is_used=eq.false`
This filtered out reusable codes AND any code the admin created with `user_email='all'`.

**Fix:** Removed `is_used` filter from the DB query. Now fetches by code only,
then checks logic server-side (is_used + reusable flag + expiry).

**Admin panel fix:** Email field is now optional. Leave it blank → code works for ALL customers.

---

### Bug 5 — user_credentials table always empty
**Root cause:** `changePassword()` called `client.auth.updateUser()` directly but never
called `/api/update-credentials` to log the action to the database.

**Fix:** Both `changeEmail()` and `changePassword()` now call `/api/update-credentials`
after successful update. The credentials table will now populate correctly.

---

### Bug 6 — Save Changes (name/phone) fails on Netlify
**Root cause:** Same as Bug 1 — `fetch('/api/update-profile')` missing `apiBase()`.

**Fix:** Already fixed with Bug 1 patch.

---

## 🚀 REDEPLOY STEPS

### Step 1 — Replace the 3 files in your project folder
```
your-project/
├── app.js              ← replace with fixed version
├── admin.html          ← replace with fixed version  
└── netlify/
    └── functions/
        └── api.js      ← replace with fixed version
```

### Step 2 — Push to GitHub
```bash
git add .
git commit -m "fix: orders, profile save, discount codes, user_credentials"
git push
```

### Step 3 — Netlify auto-deploys (30 seconds)
Watch: Netlify Dashboard → Deploys → wait for ✅ Published

### Step 4 — Configure Supabase SMTP (for Update Email to work)
Follow the steps in Bug 3 fix above.
This is a one-time setup in your Supabase dashboard.

---

## ✅ TEST CHECKLIST AFTER DEPLOY

| Feature | How to test |
|---------|-------------|
| My Orders | Log in → Profile → My Orders tab → should show orders |
| Save name/phone | Profile → Settings → change name → Save Changes |
| Update Password | Profile → Settings → enter new password → Update Password |
| Update Email | Profile → Settings → enter new email → Update Email → check new email inbox for confirmation link |
| Admin discount code (all customers) | Admin panel → Discount Codes → leave Email blank → Create Code → go to checkout → enter code → should apply |
| Reusable discount code | Create code as Reusable → use it → try again → should still work |
| Newsletter email | Subscribe on homepage → should receive welcome email with discount code |
| Order confirmation email | Place any order → should receive confirmation email |

---

## 🔍 HOW TO CHECK NETLIFY FUNCTION LOGS

If something still doesn't work:
1. Netlify Dashboard → Your site → **Functions** tab
2. Click on **api**
3. Look at the **Real-time logs** section
4. Reproduce the error → you'll see exactly what failed and why

---

## 🔧 ENVIRONMENT VARIABLES (verify these are set in Netlify)

Go to: **Netlify → Site → Site Settings → Environment Variables**

| Variable | Required for |
|----------|-------------|
| `RAZORPAY_KEY_ID` | Payments |
| `RAZORPAY_KEY_SECRET` | Payments |
| `SUPABASE_URL` | All DB operations |
| `SUPABASE_SERVICE` | All DB operations (service role key) |
| `SMTP_EMAIL` | All emails |
| `SMTP_PASSWORD` | All emails (Gmail App Password) |
