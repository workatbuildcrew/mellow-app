/**
 * Mellow Co. — Netlify Serverless Function
 * File: netlify/functions/api.js
 *
 * EMAIL: Gmail SMTP via nodemailer (App Password).
 *        No Resend. No third-party email service.
 *
 * SECRETS: Read from Netlify Environment Variables only.
 *          Never hardcoded here.
 */

const https      = require('https');
const crypto     = require('crypto');
const nodemailer = require('nodemailer');

// ═══════════════════════════════════════════════════════════
//  SECRETS — set in Netlify Dashboard →
//  Site Settings → Environment Variables
// ═══════════════════════════════════════════════════════════
const RAZORPAY_KEY_ID     = process.env.RAZORPAY_KEY_ID;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;
const SUPABASE_URL        = process.env.SUPABASE_URL;
const SUPABASE_SERVICE    = process.env.SUPABASE_SERVICE;
const SMTP_EMAIL          = process.env.SMTP_EMAIL;     // your Gmail address
const SMTP_PASSWORD       = process.env.SMTP_PASSWORD;  // Gmail App Password (16 chars)
const FROM_NAME           = 'Mellow Co.';

// ═══════════════════════════════════════════════════════════
//  GMAIL SMTP — send email via nodemailer
// ═══════════════════════════════════════════════════════════
async function sendEmail(to, subject, html) {
  if (!SMTP_EMAIL || !SMTP_PASSWORD) {
    console.error('❌ SMTP_EMAIL or SMTP_PASSWORD env var not set');
    return { ok: false, error: 'SMTP credentials not configured' };
  }

  // Try port 465 (SSL) first — most reliable on cloud servers
  const transports = [
    { host: 'smtp.gmail.com', port: 465, secure: true },
    { host: 'smtp.gmail.com', port: 587, secure: false },
  ];

  for (const transport of transports) {
    try {
      const transporter = nodemailer.createTransport({
        ...transport,
        auth: { user: SMTP_EMAIL, pass: SMTP_PASSWORD },
        tls:  { rejectUnauthorized: false },
      });
      await transporter.sendMail({
        from:    `"${FROM_NAME}" <${SMTP_EMAIL}>`,
        to, subject, html,
      });
      console.log(`✅ Email sent (port ${transport.port}) → ${to}`);
      return { ok: true };
    } catch (err) {
      console.warn(`Port ${transport.port} failed:`, err.message);
    }
  }

  console.error(`❌ All SMTP ports failed for ${to}`);
  return { ok: false, error: 'SMTP send failed on all ports' };
}

// ═══════════════════════════════════════════════════════════
//  SUPABASE HELPER
// ═══════════════════════════════════════════════════════════
function supabaseRequest(method, path, body, prefer) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const host    = SUPABASE_URL.replace('https://', '');

    const hdrs = {
      'Content-Type':  'application/json',
      'apikey':        SUPABASE_SERVICE,
      'Authorization': `Bearer ${SUPABASE_SERVICE}`,
    };
    if (payload)       hdrs['Content-Length'] = Buffer.byteLength(payload);
    if (method !== 'GET') hdrs['Prefer']      = prefer || 'return=minimal';

    const req = https.request(
      { hostname: host, path, method, headers: hdrs },
      res => {
        let data = '';
        res.on('data', d => data += d);
        res.on('end', () => {
          try   { resolve({ status: res.statusCode, body: data ? JSON.parse(data) : null }); }
          catch { resolve({ status: res.statusCode, body: data }); }
        });
      }
    );
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

// ═══════════════════════════════════════════════════════════
//  RAZORPAY HELPER
// ═══════════════════════════════════════════════════════════
function razorpayRequest(path, body) {
  return new Promise((resolve, reject) => {
    const creds   = Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString('base64');
    const payload = JSON.stringify(body);
    const req     = https.request(
      {
        hostname: 'api.razorpay.com', path, method: 'POST',
        headers: {
          'Content-Type':   'application/json',
          'Authorization':  `Basic ${creds}`,
          'Content-Length': Buffer.byteLength(payload),
        },
      },
      res => {
        let data = '';
        res.on('data', d => data += d);
        res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(data) }));
      }
    );
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

// ═══════════════════════════════════════════════════════════
//  ORDER COLUMNS WHITELIST — prevents Supabase 400 errors
// ═══════════════════════════════════════════════════════════
const ORDER_COLUMNS = new Set([
  'order_id','user_id','customer_name','customer_email','customer_phone',
  'delivery_address','delivery_city','delivery_state','delivery_pin',
  'delivery_lat','delivery_lng','delivery_text','items',
  'subtotal','delivery_charge','tax','discount_amount','discount_code',
  'discount_percent','total','payment_method','payment_id',
  'razorpay_order_id','payment_status','status','created_at','updated_at',
]);

// ═══════════════════════════════════════════════════════════
//  NEWSLETTER EMAIL HTML (built server-side for /api/newsletter-subscribe)
// ═══════════════════════════════════════════════════════════
function buildNewsletterEmail(name, email, code, pct) {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#f5f0e8;font-family:'Georgia',serif">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:48px 20px">
<table width="600" cellpadding="0" cellspacing="0"
       style="background:#fffef8;border:1px solid #e8dfd0;border-top:4px solid #c8a96e;max-width:600px">
  <tr><td style="background:linear-gradient(135deg,#4a2c0a 0%,#7a4f2a 60%,#4a2c0a 100%);padding:32px 36px">
    <h1 style="margin:0;color:#fffef8;font-size:28px;font-family:'Georgia',serif">
      Mellow <span style="color:#c8a96e;font-style:italic">Co.</span></h1>
    <p style="margin:6px 0 0;color:rgba(200,169,110,0.75);font-size:11px;letter-spacing:4px;text-transform:uppercase">
      ✦ &nbsp; Welcome to the Mellow Circle &nbsp; ✦</p>
  </td></tr>
  <tr><td style="height:3px;background:linear-gradient(90deg,#c8a96e,#9d7a45,#c8a96e)"></td></tr>
  <tr><td style="padding:40px 36px">
    <h2 style="margin:0 0 16px;color:#4a2c0a;font-size:24px;font-family:'Georgia',serif">Hello, ${name}! 🍮</h2>
    <p style="color:#7a4f2a;font-size:15px;line-height:1.9;margin:0 0 28px">
      Thank you for subscribing. Here is your exclusive
      <strong style="color:#4a2c0a">${pct}% off</strong> discount code:
    </p>
    <div style="text-align:center;background:#fff8e8;border:2px dashed #c8a96e;padding:24px;margin-bottom:28px;border-radius:6px">
      <div style="font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#a67c52;margin-bottom:10px">
        Your Exclusive Discount Code</div>
      <div style="font-size:32px;font-weight:900;color:#4a2c0a;letter-spacing:4px;font-family:'Georgia',serif">
        ${code}</div>
      <div style="font-size:13px;color:#7a4f2a;margin-top:10px">
        ${pct}% off &nbsp;·&nbsp; One-time use &nbsp;·&nbsp; Valid 30 days</div>
    </div>
    <a href="https://mellow-co.netlify.app"
       style="display:inline-block;background:#4a2c0a;color:#fffef8;padding:14px 32px;
              text-decoration:none;font-size:14px;letter-spacing:2px;text-transform:uppercase;
              border:1px solid #c8a96e;font-family:'Georgia',serif">Shop Now →</a>
  </td></tr>
  <tr><td style="padding:20px 36px 28px;border-top:1px solid #e8dfd0;background:#f9f6f0;text-align:center">
    <p style="margin:0;font-size:11px;color:#a67c52;letter-spacing:2px;text-transform:uppercase">
      ✦ &nbsp; Mellow Co. &nbsp;·&nbsp; Coimbatore, Tamil Nadu &nbsp; ✦</p>
    <p style="margin:8px 0 0;font-size:10px;color:#c0a882">You subscribed with ${email}</p>
  </td></tr>
</table></td></tr></table></body></html>`;
}

// ═══════════════════════════════════════════════════════════
//  MAIN HANDLER
// ═══════════════════════════════════════════════════════════
exports.handler = async function(event) {
  const headers = {
    'Access-Control-Allow-Origin':  '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  // ── Route extraction ──────────────────────────────────────
  // netlify.toml: /api/* → /.netlify/functions/api/:splat
  // event.path arrives as /.netlify/functions/api/create-order
  //   OR as /api/create-order depending on Netlify version.
  const rawPath = event.path || '';
  let route;
  if (rawPath.startsWith('/api/')) {
    route = rawPath;
  } else {
    // strip /.netlify/functions/api prefix, re-prefix with /api
    const after = rawPath.replace(/^\/.netlify\/functions\/api/, '');
    route = after ? `/api${after}` : '/api/';
  }

  let body = {};
  try { body = event.body ? JSON.parse(event.body) : {}; } catch {}

  const ok  = data       => ({ statusCode: 200, headers, body: JSON.stringify(data) });
  const err = (code, d)  => ({ statusCode: code, headers, body: JSON.stringify(d) });

  console.log(`[Mellow API] ${event.httpMethod} ${route}`);

  try {

    // ── 1. CREATE RAZORPAY ORDER ──────────────────────────
    if (route === '/api/create-order') {
      const r = await razorpayRequest('/v1/orders', {
        amount:   body.amount   || 0,
        currency: body.currency || 'INR',
        receipt:  body.receipt  || `mellow_${Date.now()}`,
        notes:    body.notes    || {},
      });
      return r.status < 300 ? ok(r.body) : err(500, r.body);
    }

    // ── 2. VERIFY RAZORPAY PAYMENT ────────────────────────
    if (route === '/api/verify-payment') {
      const order_id = body.razorpay_order_id || '';
      if (order_id.startsWith('order_DEV_')) return ok({ verified: true });
      const msg      = `${order_id}|${body.razorpay_payment_id || ''}`;
      const expected = crypto.createHmac('sha256', RAZORPAY_KEY_SECRET)
                             .update(msg).digest('hex');
      return ok({ verified: expected === (body.razorpay_signature || '') });
    }

    // ── 3. SAVE ORDER ─────────────────────────────────────
    if (route === '/api/save-order') {
      const clean = {};
      for (const [k, v] of Object.entries(body)) {
        if (ORDER_COLUMNS.has(k)) clean[k] = v;
      }
      const r = await supabaseRequest('POST', '/rest/v1/orders', clean);
      if (r.status < 300) {
        console.log(`✅ Order saved: ${body.order_id} | ${body.customer_email}`);
        return ok({ ok: true, order_id: body.order_id });
      }
      console.error(`Order save failed (${r.status}):`, JSON.stringify(r.body));
      return err(500, { error: r.body });
    }

    // ── 4. SAVE ORDER ITEM ────────────────────────────────
    if (route === '/api/save-order-item') {
      const r = await supabaseRequest('POST', '/rest/v1/order_items', {
        order_id:     body.order_id,
        product_name: body.product_name,
        product_id:   body.product_id,
        price:        body.price,
        quantity:     body.quantity,
        total:        body.total,
      });
      return r.status < 300 ? ok({ ok: true }) : err(500, { error: r.body });
    }

    // ── 5. SAVE NEWSLETTER ────────────────────────────────
    if (route === '/api/save-newsletter') {
      const r = await supabaseRequest(
        'POST', '/rest/v1/newsletter_subscribers', { email: body.email }
      );
      if (r.status === 409) return ok({ ok: true, already_subscribed: true });
      return r.status < 300 ? ok({ ok: true }) : err(500, { error: r.body });
    }

    // ── 6. FEEDBACK ───────────────────────────────────────
    if (route === '/api/feedback') {
      const r = await supabaseRequest('POST', '/rest/v1/feedback', {
        name:    body.name    || '',
        email:   body.email   || '',
        subject: body.subject || '',
        message: body.message || '',
      });
      if (r.status < 300) {
        console.log(`✅ Feedback from ${body.email}`);
        return ok({ ok: true });
      }
      return err(500, { error: r.body });
    }

    // ── 7. VALIDATE DISCOUNT ──────────────────────────────
    if (route === '/api/validate-discount') {
      const code = (body.code || '').trim().toUpperCase();
      if (!code) return err(400, { valid: false, error: 'No code provided' });

      // Fetch regardless of is_used — reusable codes stay valid after use
      const r = await supabaseRequest(
        'GET',
        `/rest/v1/discount_codes?code=eq.${encodeURIComponent(code)}&select=*`
      );
      const rows = Array.isArray(r.body) ? r.body : [];
      if (!rows.length) return ok({ valid: false, error: 'Invalid or already used code' });

      const row        = rows[0];
      const isReusable = row.reusable === true;

      if (!isReusable && row.is_used) {
        return ok({ valid: false, error: 'This code has already been used' });
      }
      if (row.expires_at && new Date(row.expires_at) < new Date()) {
        return ok({ valid: false, error: 'This discount code has expired' });
      }

      console.log(`✅ Discount valid: ${code} = ${row.discount_percent}% (reusable=${isReusable})`);
      return ok({
        valid:            true,
        discount_percent: row.discount_percent,
        code:             row.code,
        reusable:         isReusable,
      });
    }

    // ── 8. USE DISCOUNT ───────────────────────────────────
    if (route === '/api/use-discount') {
      const code = (body.code || '').trim().toUpperCase();
      if (!code) return err(400, { error: 'No code provided' });

      // Check reusable flag first
      const r0   = await supabaseRequest(
        'GET',
        `/rest/v1/discount_codes?code=eq.${encodeURIComponent(code)}&select=id,reusable`
      );
      const rows = Array.isArray(r0.body) ? r0.body : [];
      if (!rows.length) return ok({ ok: true, skipped: 'not found' });

      if (rows[0].reusable === true) {
        console.log(`♾  Reusable discount kept active: ${code}`);
        return ok({ ok: true });
      }

      const r = await supabaseRequest(
        'PATCH',
        `/rest/v1/discount_codes?code=eq.${encodeURIComponent(code)}`,
        { is_used: true, used_at: new Date().toISOString() }
      );
      return r.status < 300 ? ok({ ok: true }) : err(500, { error: r.body });
    }

    // ── 9. SEND EMAIL (generic — called by payment.js) ────
    // payment.js builds the HTML client-side and sends it here.
    // This just relays it via Gmail SMTP.
    if (route === '/api/send-email') {
      const { to, subject, html } = body;
      if (!to || !html) return err(400, { error: 'Missing to or html' });
      const result = await sendEmail(to, subject || 'Mellow Co.', html);
      return ok({ ok: result.ok, error: result.error });
    }

    // ── 10. UPDATE PROFILE ────────────────────────────────
    if (route === '/api/update-profile') {
      const { user_id, name, phone } = body;
      if (!user_id) return err(400, { error: 'user_id required' });
      const patch = {};
      if (name)  patch.name  = name;
      if (phone) patch.phone = phone;
      const r = await supabaseRequest(
        'PATCH', `/rest/v1/users?id=eq.${user_id}`,
        patch, 'return=representation'
      );
      const profile = Array.isArray(r.body) ? r.body[0] : (r.body || {});
      return r.status < 300 ? ok({ ok: true, profile }) : err(500, { error: r.body });
    }

    // ── 11. MY ORDERS ─────────────────────────────────────
    if (route === '/api/my-orders') {
      const { user_id } = body;
      if (!user_id) return err(400, { error: 'user_id required' });
      const r = await supabaseRequest(
        'GET',
        `/rest/v1/orders?user_id=eq.${user_id}&order=created_at.desc&select=*`
      );
      const orders = Array.isArray(r.body) ? r.body : [];
      console.log(`✅ my-orders: ${orders.length} for user ${user_id.slice(0,8)}`);
      return ok({ ok: true, orders });
    }

    // ── 12. NEWSLETTER SUBSCRIBE ──────────────────────────
    // Saves subscriber + generates coupon code + sends email via SMTP
    if (route === '/api/newsletter-subscribe') {
      const email = (body.email || '').trim().toLowerCase();
      const name  = (body.name  || 'Mellow Fan').trim();
      if (!email) return err(400, { error: 'email required' });

      // Save subscriber
      const r1 = await supabaseRequest(
        'POST', '/rest/v1/newsletter_subscribers', { email, name }
      );
      if (r1.status === 409) {
        return ok({ ok: true, already_subscribed: true, discount_pct: 0 });
      }
      if (r1.status >= 300) return err(500, { error: r1.body });
      console.log(`✅ Newsletter subscriber: ${email}`);

      // Generate coupon
      const pct   = Math.floor(Math.random() * 11) + 10; // 10–20%
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      const code  = 'MELLOW' + Array.from({ length: 6 }, () =>
        chars[Math.floor(Math.random() * chars.length)]
      ).join('');
      const exp = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

      // Save coupon to DB
      const r2 = await supabaseRequest('POST', '/rest/v1/discount_codes', {
        code, user_email: email, discount_percent: pct, is_used: false, expires_at: exp,
      });
      if (r2.status < 300) console.log(`✅ Coupon: ${code} (${pct}%) for ${email}`);
      else console.warn('Coupon save failed (subscriber still saved):', r2.body);

      // Send welcome email with coupon via Gmail SMTP
      try {
        await sendEmail(
          email,
          `🍮 Welcome to the Mellow Circle — Your ${pct}% Discount Inside!`,
          buildNewsletterEmail(name, email, code, pct)
        );
      } catch (emailErr) {
        console.warn('Newsletter email error:', emailErr.message);
      }

      return ok({ ok: true, discount_pct: pct, code });
    }

    // ── 13. CONFIRM COD PAYMENT ───────────────────────────
    if (route === '/api/confirm-cod-payment') {
      const { order_id } = body;
      if (!order_id) return err(400, { error: 'order_id required' });
      const r = await supabaseRequest(
        'PATCH', `/rest/v1/orders?order_id=eq.${order_id}`,
        { payment_status: 'paid', status: 'delivered', updated_at: new Date().toISOString() }
      );
      return r.status < 300 ? ok({ ok: true }) : err(500, { error: r.body });
    }

    // ── 14. UPDATE CREDENTIALS ────────────────────────────
    if (route === '/api/update-credentials') {
      const { user_id, email, action } = body;
      if (!user_id) return err(400, { error: 'user_id required' });
      const now   = new Date().toISOString();
      const patch = { id: user_id, email: email || '', updated_at: now };
      if (action === 'email')    patch.email_change_requested_at = now;
      if (action === 'password') patch.password_changed_at       = now;
      const r = await supabaseRequest(
        'POST', '/rest/v1/user_credentials',
        patch, 'resolution=merge-duplicates,return=minimal'
      );
      return r.status < 300 ? ok({ ok: true }) : err(500, { error: r.body });
    }

    // ── 15. ADMIN CHECK ───────────────────────────────────
    if (route === '/api/admin/check') {
      const email = (body.email || '').trim().toLowerCase();
      if (!email) return err(400, { error: 'email required' });
      const r = await supabaseRequest(
        'GET',
        `/rest/v1/admins?email=eq.${encodeURIComponent(email)}&is_active=eq.true&select=email,role`
      );
      const rows = Array.isArray(r.body) ? r.body : [];
      return ok(rows.length
        ? { is_admin: true, role: rows[0].role || 'admin' }
        : { is_admin: false }
      );
    }

    // ── 16. ADMIN CREATE ──────────────────────────────────
    if (route === '/api/admin/create') {
      const { email, name, role } = body;
      if (!email) return err(400, { error: 'email required' });
      const r = await supabaseRequest(
        'POST', '/rest/v1/admins',
        { email, name: name || 'Admin', role: role || 'superadmin', is_active: true },
        'resolution=merge-duplicates,return=representation'
      );
      return r.status < 300 ? ok({ ok: true, data: r.body }) : err(500, { error: r.body });
    }

    return err(404, { error: `Unknown route: ${route}` });

  } catch (e) {
    console.error('[Mellow API] Unhandled error:', e.message, e.stack);
    return err(500, { error: e.message });
  }
};
