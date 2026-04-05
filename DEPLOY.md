# 🍮 Mellow Co. — Complete Deployment Guide
### GitHub → Netlify · Gmail SMTP · Supabase · Razorpay

---

## ✅ WHAT CHANGED (and why)

| File | What was fixed |
|------|---------------|
| `netlify/functions/api.js` | Removed Resend entirely. Gmail SMTP only. All secrets read from env vars — nothing hardcoded. Fixed route parsing for Netlify redirects. |
| `netlify.toml` | Added `force = true` to API redirect so it doesn't get overridden by the SPA fallback. |
| `package.json` | Added `node >= 18` engine requirement for Netlify. |
| `.gitignore` | Blocks `.env`, `server.py`, `create-admin.py` from ever reaching GitHub. |

---

## 📁 WHAT TO REPLACE IN YOUR PROJECT

Replace these files with the ones provided:
```
netlify/functions/api.js   ← CRITICAL (create folder if not exists)
netlify.toml
package.json
.gitignore
```

**Keep as-is (do NOT change):**
```
index.html, admin.html, style.css
app.js, auth.js, payment.js
supabase-setup.sql
```

**These files stay on your computer only (gitignored):**
```
server.py          ← local dev server
create-admin.py    ← run once locally
.env               ← your local secrets
```

---

## 🔐 STEP 1 — Set Up Gmail App Password (if not done)

Your email setup uses your Gmail with an **App Password** (not your real Gmail password).

1. Go to: https://myaccount.google.com/security
2. Make sure **2-Step Verification** is ON
3. Go to: https://myaccount.google.com/apppasswords
4. Select **Mail** → **Other (custom name)** → type "Mellow Co" → **Generate**
5. Copy the 16-character password (looks like: `uavh alxt srit vkhk`)

> ⚠️ If you already have this password, you're good. Just make sure it works.
> To test: run `python server.py` locally and place a test order.

---

## 📤 STEP 2 — Push to GitHub

Open terminal in your project folder:

```bash
# If first time:
git init
git add .
git commit -m "mellow co initial"
git remote add origin https://github.com/workatbuildcrew/mellow-app.git
git branch -M main
git push -u origin main

# For future updates (just these 3 lines every time):
git add .
git commit -m "describe what you changed"
git push
```

> ✅ GitHub will no longer alert you about secrets — they are now gitignored.

---

## 🌐 STEP 3 — Connect to Netlify

1. Go to https://app.netlify.com
2. Click **"Add new site"** → **"Import an existing project"**
3. Click **GitHub** → authorize → select your **mellow-app** repo
4. Build settings (these should auto-fill from netlify.toml):
   - **Base directory:** *(leave blank)*
   - **Build command:** *(leave blank)*
   - **Publish directory:** `.`
5. Click **"Deploy site"**

Wait for the first deploy to finish (it will likely fail because env vars aren't set yet — that's okay).

---

## 🔑 STEP 4 — Add Environment Variables (CRITICAL)

Go to: **Netlify Dashboard → Your Site → Site Configuration → Environment Variables**

Click **"Add a variable"** and add ALL of these one by one:

| Variable Name | Value |
|---|---|
| `RAZORPAY_KEY_ID` | `rzp_live_SZl0EQ7zDZTDr1` |
| `RAZORPAY_KEY_SECRET` | `Vg3k1u8xge4I4hcvSKQuPt2a` |
| `SUPABASE_URL` | `https://tjbjhykmnsssfhzltgvs.supabase.co` |
| `SUPABASE_ANON` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRqYmpoeWttbnNzc2Zoemx0Z3ZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUxMjA3MjgsImV4cCI6MjA5MDY5NjcyOH0.xs-aX7hX8Of5RhHvA83w3ycgj9l3SV-O2uLOdbZ165k` |
| `SUPABASE_SERVICE` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRqYmpoeWttbnNzc2Zoemx0Z3ZzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTEyMDcyOCwiZXhwIjoyMDkwNjk2NzI4fQ.yFnRGRXJHPGGU7atgIVvcVipTeN82SFVHH9BXKug_l4` |
| `SMTP_EMAIL` | `workatbuildcrew@gmail.com` |
| `SMTP_PASSWORD` | `uonz wcci bqfj tqqs` |

> ⚠️ **SMTP_PASSWORD** = your Gmail App Password (16 chars, spaces are fine).
> This is NOT your real Gmail login password.

After adding all variables:
- Click **"Deploys"** tab → **"Trigger deploy"** → **"Deploy site"**

---

## 🗄️ STEP 5 — Set Up Supabase (if not done yet)

1. Go to https://supabase.com → your project
2. Click **SQL Editor** → **New Query**
3. Paste the entire contents of `supabase-setup.sql`
4. Click **Run**

You should see all 6 tables created: `users`, `orders`, `order_items`, `newsletter_subscribers`, `discount_codes`, `feedback`

---

## 👤 STEP 6 — Create Admin Account (run once locally)

```bash
python create-admin.py
```

This creates the admin user in Supabase Auth and inserts a row into the `admins` table.
You only need to run this once.

---

## ✅ STEP 7 — Test Your Live Site

Once deployed, test these in order:

1. **Homepage loads** → `https://your-site.netlify.app`
2. **Sign up** with a real email → you should receive a welcome email
3. **Add to cart → Checkout → Place order (COD)** → you should receive an order confirmation email
4. **Newsletter subscribe** → you should receive a discount code email
5. **Admin panel** → `https://your-site.netlify.app/admin.html`

---

## 🔁 FUTURE DEPLOYS (3 commands every time)

```bash
git add .
git commit -m "what you changed"
git push
```

Netlify automatically redeploys every time you push to GitHub. Takes ~30 seconds.

---

## 🐛 TROUBLESHOOTING

### Email not sending after deploy
1. Check Netlify → **Functions** tab → click `api` → view **logs**
2. Look for `SMTP_EMAIL or SMTP_PASSWORD env var not set` — means env var is missing
3. Check `SMTP send failed on all ports` — means Gmail is blocking the App Password
   - Fix: Go to https://myaccount.google.com/apppasswords → regenerate the password → update `SMTP_PASSWORD` in Netlify env vars → redeploy

### Orders not saving (500 error)
1. Check Netlify function logs
2. Look for `SUPABASE_SERVICE` errors
3. Verify `SUPABASE_URL` and `SUPABASE_SERVICE` env vars are correct (copy fresh from Supabase Dashboard)

### Razorpay payment fails
1. Verify `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` in Netlify env vars
2. Make sure your Razorpay account is live (not test mode) if using live keys

### API returns 404
- Check that `netlify/functions/api.js` exists in your repo (not just local)
- Run: `git ls-files netlify/` to confirm it's tracked

### Admin login doesn't work
- Run `python create-admin.py` again locally — it's safe to run multiple times

---

## 📊 HOW EMAIL WORKS (no Resend, no third party)

```
Customer places order
       ↓
payment.js (browser) — builds HTML email, sends to /api/send-email
       ↓
netlify/functions/api.js — receives the HTML
       ↓
nodemailer → Gmail SMTP (smtp.gmail.com:465)
       ↓
using: workatbuildcrew@gmail.com + App Password
       ↓
Email arrives in customer's inbox
```

Same flow for: welcome email (signup), newsletter coupon email, order confirmation.

---

## 📁 FINAL PROJECT STRUCTURE

```
mellow-app/
├── index.html                  ← storefront (do not change)
├── admin.html                  ← admin panel (do not change)
├── style.css                   ← styles (do not change)
├── app.js                      ← product data + UI (do not change)
├── auth.js                     ← login/signup (do not change)
├── payment.js                  ← checkout + orders (do not change)
│
├── netlify/
│   └── functions/
│       └── api.js              ← ✅ REPLACED — all server logic
│
├── netlify.toml                ← ✅ REPLACED — routing config
├── package.json                ← ✅ REPLACED — dependencies
├── .gitignore                  ← ✅ REPLACED — protects secrets
│
├── supabase-setup.sql          ← run once in Supabase SQL editor
│
│   ── LOCAL ONLY (gitignored, never pushed) ──
├── .env                        ← your local secrets
├── server.py                   ← local dev server
└── create-admin.py             ← run once locally
```
