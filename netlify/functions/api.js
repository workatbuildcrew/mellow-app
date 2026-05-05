// ═══════════════════════════════════════════════════════════════
//  MELLOW CO. — Netlify Serverless Function
//  Handles ALL /api/* routes for the storefront
//  All secrets read from Netlify environment variables
// ═══════════════════════════════════════════════════════════════

const https        = require('https');
const http         = require('http');
const crypto       = require('crypto');
const nodemailer   = require('nodemailer');

// ── ENV VARS (set in Netlify Dashboard → Site Settings → Env Vars) ──
const RAZORPAY_KEY_ID     = process.env.RAZORPAY_KEY_ID     || '';
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || '';
const SUPABASE_URL        = process.env.SUPABASE_URL        || '';
const SUPABASE_SERVICE    = process.env.SUPABASE_SERVICE    || '';
const SMTP_EMAIL          = process.env.SMTP_EMAIL          || '';
const SMTP_PASSWORD       = process.env.SMTP_PASSWORD       || '';

const SITE_URL = 'https://mellow-desserts.netlify.app';

// ── HELPERS ─────────────────────────────────────────────────────

function jsonResponse(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
    },
    body: JSON.stringify(body),
  };
}

// Fetch helper (wraps https/http)
function fetchJSON(url, options = {}) {
  return new Promise((resolve, reject) => {
    const parsed   = new URL(url);
    const lib      = parsed.protocol === 'https:' ? https : http;
    const body     = options.body ? (typeof options.body === 'string' ? options.body : JSON.stringify(options.body)) : null;
    const headers  = { 'Content-Type': 'application/json', ...(options.headers || {}) };
    if (body) headers['Content-Length'] = Buffer.byteLength(body);

    const req = lib.request({
      hostname: parsed.hostname,
      port:     parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
      path:     parsed.pathname + parsed.search,
      method:   options.method || 'GET',
      headers,
    }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: data ? JSON.parse(data) : {} });
        } catch {
          resolve({ status: res.statusCode, data: { raw: data } });
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

// Supabase REST helper
async function supabase(method, path, body = null, extra = {}) {
  const url = `${SUPABASE_URL}/rest/v1${path}`;
  return fetchJSON(url, {
    method,
    headers: {
      'apikey':        SUPABASE_SERVICE,
      'Authorization': `Bearer ${SUPABASE_SERVICE}`,
      'Content-Type':  'application/json',
      ...extra,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

// Gmail SMTP sender
async function sendEmail(to, subject, html) {
  if (!SMTP_EMAIL || !SMTP_PASSWORD) {
    console.error('SMTP_EMAIL or SMTP_PASSWORD env var not set');
    return false;
  }
  const ports = [465, 587, 25];
  for (const port of ports) {
    try {
      const transporter = nodemailer.createTransport({
        host:   'smtp.gmail.com',
        port,
        secure: port === 465,
        auth:   { user: SMTP_EMAIL, pass: SMTP_PASSWORD },
        connectionTimeout: 8000,
        greetingTimeout:   5000,
      });
      await transporter.sendMail({
        from:    `"Mellow Co." <${SMTP_EMAIL}>`,
        to, subject, html,
      });
      console.log(`✅ Email sent to ${to} via port ${port}`);
      return true;
    } catch (err) {
      console.warn(`SMTP port ${port} failed: ${err.message}`);
    }
  }
  console.error('SMTP send failed on all ports');
  return false;
}

// ── ROUTE HANDLERS ───────────────────────────────────────────────

// 1. Create Razorpay Order
async function createOrder(body) {
  try {
    const creds   = Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString('base64');
    const payload = {
      amount:   body.amount   || 0,
      currency: body.currency || 'INR',
      receipt:  body.receipt  || `mellow_${Date.now()}`,
      notes:    body.notes    || {},
    };
    const res = await fetchJSON('https://api.razorpay.com/v1/orders', {
      method:  'POST',
      headers: { 'Authorization': `Basic ${creds}` },
      body:    JSON.stringify(payload),
    });
    if (res.status === 200) {
      console.log(`✅ Razorpay order: ${res.data.id}`);
      return jsonResponse(200, res.data);
    } else {
      console.error('Razorpay error:', res.data);
      return jsonResponse(500, { error: res.data });
    }
  } catch (err) {
    return jsonResponse(500, { error: err.message });
  }
}

// 2. Verify Razorpay Payment
async function verifyPayment(body) {
  try {
    const orderId = body.razorpay_order_id || '';
    if (orderId.startsWith('order_DEV_')) {
      return jsonResponse(200, { verified: true });
    }
    const msg      = `${orderId}|${body.razorpay_payment_id || ''}`;
    const expected = crypto.createHmac('sha256', RAZORPAY_KEY_SECRET).update(msg).digest('hex');
    const verified = crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(body.razorpay_signature || ''));
    return jsonResponse(200, { verified });
  } catch (err) {
    return jsonResponse(500, { error: err.message, verified: false });
  }
}

// 3. Save Order
async function saveOrder(body) {
  const allowed = new Set([
    'order_id','user_id','customer_name','customer_email','customer_phone',
    'delivery_address','delivery_city','delivery_state','delivery_pin',
    'delivery_lat','delivery_lng','delivery_text','items','subtotal',
    'delivery_charge','tax','discount_amount','discount_code','discount_percent',
    'total','payment_method','payment_id','razorpay_order_id',
    'payment_status','status','created_at','updated_at',
  ]);
  const clean = Object.fromEntries(Object.entries(body).filter(([k]) => allowed.has(k)));
  try {
    const res = await supabase('POST', '/orders', clean, { 'Prefer': 'return=minimal' });
    if (res.status < 300) {
      console.log(`✅ Order saved: ${body.order_id}`);
      return jsonResponse(200, { ok: true, order_id: body.order_id });
    }
    return jsonResponse(500, { error: res.data });
  } catch (err) {
    return jsonResponse(500, { error: err.message });
  }
}

// 4. Save Order Item
async function saveOrderItem(body) {
  try {
    const res = await supabase('POST', '/order_items', {
      order_id:     body.order_id     || '',
      product_name: body.product_name || '',
      product_id:   body.product_id   || null,
      price:        body.price        || 0,
      quantity:     body.quantity     || 1,
      total:        body.total        || 0,
    }, { 'Prefer': 'return=minimal' });
    return jsonResponse(res.status < 300 ? 200 : 500, res.status < 300 ? { ok: true } : { error: res.data });
  } catch (err) {
    return jsonResponse(500, { error: err.message });
  }
}

// 5. Save Newsletter Subscriber
async function saveNewsletter(body) {
  try {
    const res = await supabase('POST', '/newsletter_subscribers',
      { email: body.email || '' },
      { 'Prefer': 'return=minimal' }
    );
    if (res.status === 409) return jsonResponse(200, { ok: true, already_subscribed: true });
    if (res.status < 300) return jsonResponse(200, { ok: true });
    return jsonResponse(500, { error: res.data });
  } catch (err) {
    return jsonResponse(500, { error: err.message });
  }
}

// 6. Save Feedback
async function saveFeedback(body) {
  try {
    const res = await supabase('POST', '/feedback', {
      name:    body.name    || '',
      email:   body.email   || '',
      subject: body.subject || '',
      message: body.message || '',
    }, { 'Prefer': 'return=minimal' });
    return jsonResponse(res.status < 300 ? 200 : 500, res.status < 300 ? { ok: true } : { error: res.data });
  } catch (err) {
    return jsonResponse(500, { error: err.message });
  }
}

// 7. Validate Discount Code
async function validateDiscount(body) {
  const code = (body.code || '').trim().toUpperCase();
  if (!code) return jsonResponse(400, { valid: false, error: 'No code provided' });
  try {
    const res = await supabase('GET', `/discount_codes?code=eq.${code}&select=*`);
    if (!res.data || !res.data.length) {
      return jsonResponse(200, { valid: false, error: 'Invalid or already used code' });
    }
    const row        = res.data[0];
    const isReusable = row.reusable || false;
    if (!isReusable && row.is_used) {
      return jsonResponse(200, { valid: false, error: 'This code has already been used' });
    }
    if (row.expires_at) {
      const exp = new Date(row.expires_at);
      if (exp < new Date()) {
        return jsonResponse(200, { valid: false, error: 'This discount code has expired' });
      }
    }
    return jsonResponse(200, {
      valid:            true,
      discount_percent: row.discount_percent,
      code:             row.code,
      reusable:         isReusable,
    });
  } catch (err) {
    return jsonResponse(500, { valid: false, error: err.message });
  }
}

// 8. Mark Discount Code as Used
async function useDiscount(body) {
  const code = (body.code || '').trim().toUpperCase();
  if (!code) return jsonResponse(400, { error: 'No code' });
  try {
    const fetchRes = await supabase('GET', `/discount_codes?code=eq.${code}&select=id,reusable`);
    if (!fetchRes.data || !fetchRes.data.length) {
      return jsonResponse(200, { ok: true, skipped: 'code not found' });
    }
    const isReusable = fetchRes.data[0].reusable || false;
    if (!isReusable) {
      await supabase('PATCH', `/discount_codes?code=eq.${code}`, {
        is_used: true,
        used_at: new Date().toISOString(),
      }, { 'Prefer': 'return=minimal' });
      console.log(`✅ Discount marked used: ${code}`);
    } else {
      console.log(`♾ Reusable discount kept active: ${code}`);
    }
    return jsonResponse(200, { ok: true });
  } catch (err) {
    return jsonResponse(500, { error: err.message });
  }
}

// 9. Send Email (generic)
async function sendEmailRoute(body) {
  const { to, subject, html } = body;
  if (!to || !html) return jsonResponse(400, { error: 'Missing to or html' });
  const ok = await sendEmail(to, subject || 'Mellow Co.', html);
  return jsonResponse(ok ? 200 : 500, ok ? { ok: true } : { error: 'SMTP send failed' });
}

// 10. Update Profile
async function updateProfile(body) {
  const userId = (body.user_id || '').trim();
  if (!userId) return jsonResponse(400, { error: 'user_id required' });
  try {
    const patch = {};
    if (body.name)  patch.name  = body.name.trim();
    if (body.phone) patch.phone = body.phone.trim();
    const res = await supabase('PATCH', `/users?id=eq.${userId}`, patch, { 'Prefer': 'return=representation' });
    const row = (res.data && res.data[0]) || {};
    console.log(`✅ Profile updated: ${userId}`);
    // Ensure user_credentials row exists (non-fatal)
    try {
      const now = new Date().toISOString();
      await supabase('POST', `/user_credentials?on_conflict=id`, {
        id: userId, email: body.email || row.email || '', created_at: now, updated_at: now,
      }, { 'Prefer': 'resolution=merge-duplicates,return=minimal' });
    } catch (_) {}
    return jsonResponse(200, { ok: true, profile: row });
  } catch (err) {
    return jsonResponse(500, { error: err.message });
  }
}

// 11. My Orders
async function myOrders(body) {
  const userId = (body.user_id || '').trim();
  if (!userId) return jsonResponse(400, { error: 'user_id required' });
  try {
    const res = await supabase('GET', `/orders?user_id=eq.${userId}&order=created_at.desc&select=*`);
    console.log(`✅ my-orders: ${(res.data||[]).length} orders`);
    return jsonResponse(200, { ok: true, orders: res.data || [] });
  } catch (err) {
    return jsonResponse(500, { error: err.message });
  }
}

// 12. Newsletter Subscribe (save + generate coupon + send email)
async function newsletterSubscribe(body) {
  const email = (body.email || '').trim().toLowerCase();
  const name  = (body.name  || 'Mellow Fan').trim();
  if (!email) return jsonResponse(400, { error: 'email required' });
  try {
    // Save subscriber
    const subRes = await supabase('POST', '/newsletter_subscribers',
      { email, name },
      { 'Prefer': 'return=minimal' }
    );
    if (subRes.status === 409) return jsonResponse(200, { ok: true, already_subscribed: true, discount_pct: 0 });

    // Generate coupon
    const pct  = Math.floor(Math.random() * 11) + 10; // 10–20%
    const code = 'MELLOW' + crypto.randomBytes(3).toString('hex').toUpperCase();
    const exp  = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    await supabase('POST', '/discount_codes', {
      code, user_email: email, discount_percent: pct, is_used: false, expires_at: exp,
    }, { 'Prefer': 'return=minimal' });

    // Send welcome email with coupon
    const html = buildNewsletterEmail(name, email, code, pct);
    await sendEmail(email, `🍮 Welcome to the Mellow Circle — Your ${pct}% Discount Inside!`, html);

    return jsonResponse(200, { ok: true, discount_pct: pct, code });
  } catch (err) {
    console.error('newsletter-subscribe error:', err.message);
    return jsonResponse(500, { error: err.message });
  }
}

// 13. Confirm COD Payment (admin)
async function confirmCodPayment(body) {
  const orderId = (body.order_id || '').trim();
  if (!orderId) return jsonResponse(400, { error: 'order_id required' });
  try {
    await supabase('PATCH', `/orders?order_id=eq.${orderId}`, {
      payment_status: 'paid',
      status:         'delivered',
      updated_at:     new Date().toISOString(),
    }, { 'Prefer': 'return=minimal' });
    console.log(`✅ COD confirmed: ${orderId}`);
    return jsonResponse(200, { ok: true });
  } catch (err) {
    return jsonResponse(500, { error: err.message });
  }
}

// 14. Update Credentials Audit Log
async function updateCredentials(body) {
  const userId = (body.user_id || '').trim();
  const email  = (body.email   || '').trim();
  const action = (body.action  || '').trim();
  if (!userId) return jsonResponse(400, { error: 'user_id required' });
  try {
    const now   = new Date().toISOString();
    const patch = { id: userId, email: email || '', updated_at: now, created_at: now };
    if (action === 'email' && email) patch.email_change_requested_at = now;
    if (action === 'password')       patch.password_changed_at = now;
    await supabase('POST', `/user_credentials?on_conflict=id`, patch,
      { 'Prefer': 'resolution=merge-duplicates,return=minimal' }
    );
    console.log(`✅ Credentials log: ${userId.slice(0,8)}… action=${action}`);
    return jsonResponse(200, { ok: true });
  } catch (err) {
    console.error('update-credentials error:', err.message);
    return jsonResponse(200, { ok: true, warn: err.message }); // non-fatal
  }
}

// 15. Send Welcome Email
async function sendWelcomeEmail(body) {
  const name  = (body.name  || '').trim() || (body.email || '').split('@')[0];
  const email = (body.email || '').trim();
  if (!email) return jsonResponse(400, { error: 'email required' });
  const html = buildWelcomeEmail(name);
  const ok   = await sendEmail(email, `Welcome to Mellow Co., ${name}! 🍮`, html);
  return jsonResponse(ok ? 200 : 500, ok ? { ok: true } : { error: 'SMTP send failed' });
}

// 16. Send Order Confirmation Email
async function sendOrderEmail(body) {
  // Support lookup by order_id
  if (body._lookup) {
    const orderId = (body.order_id || '').trim();
    if (!orderId) return jsonResponse(400, { error: 'order_id required' });
    const res = await supabase('GET', `/orders?order_id=eq.${orderId}&select=*`);
    if (!res.data || !res.data.length) return jsonResponse(404, { error: 'Order not found' });
    body = res.data[0];
  }
  const email = (body.customer_email || '').trim();
  if (!email) return jsonResponse(400, { error: 'customer_email required' });
  const html = buildOrderEmail(body);
  const ok   = await sendEmail(email, `Your Mellow Co. Order #${body.order_id} is Confirmed! 🍮`, html);
  return jsonResponse(ok ? 200 : 500, ok ? { ok: true } : { error: 'SMTP send failed' });
}

// 17. Admin Check
async function adminCheck(body) {
  const email = (body.email || '').trim().toLowerCase();
  if (!email) return jsonResponse(400, { error: 'email required' });
  try {
    const res = await supabase('GET', `/admins?email=eq.${encodeURIComponent(email)}&is_active=eq.true&select=email,role,is_active`);
    const isAdmin = res.data && res.data.length > 0;
    return jsonResponse(200, { is_admin: isAdmin, role: isAdmin ? res.data[0].role : null });
  } catch (err) {
    return jsonResponse(500, { error: err.message });
  }
}

// ── EMAIL TEMPLATES ──────────────────────────────────────────────

function buildWelcomeEmail(name) {
  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#f5f0e8;font-family:'Georgia',serif">
<table width="100%" cellpadding="0" cellspacing="0">
<tr><td align="center" style="padding:48px 20px">
<table width="600" cellpadding="0" cellspacing="0"
  style="background:#fffef8;border:1px solid #e8dfd0;border-top:4px solid #c8a96e;max-width:600px">
  <tr><td style="background:linear-gradient(135deg,#4a2c0a,#7a4f2a,#4a2c0a);padding:32px 36px">
    <h1 style="margin:0;color:#fffef8;font-size:28px">Mellow <span style="color:#c8a96e;font-style:italic">Co.</span></h1>
    <p style="margin:6px 0 0;color:rgba(200,169,110,0.75);font-size:11px;letter-spacing:4px;text-transform:uppercase">✦ Artisan Mexican Desserts ✦</p>
  </td></tr>
  <tr><td style="height:3px;background:linear-gradient(90deg,#c8a96e,#9d7a45,#c8a96e)"></td></tr>
  <tr><td style="padding:40px 36px">
    <h2 style="margin:0 0 20px;color:#4a2c0a;font-size:26px">Hello, ${name}! 🍮</h2>
    <p style="color:#7a4f2a;font-size:15px;line-height:1.9;margin:0 0 24px">
      We're thrilled to welcome you to the Mellow Circle. You now have access to over
      <strong style="color:#4a2c0a">25 handcrafted Mexican desserts</strong> — made with love, tradition, and care.
    </p>
    <a href="${SITE_URL}"
      style="display:inline-block;background:#4a2c0a;color:#fffef8;padding:14px 32px;
             text-decoration:none;font-size:14px;letter-spacing:2px;text-transform:uppercase;border:1px solid #c8a96e">
      EXPLORE DESSERTS →
    </a>
    <p style="margin:24px 0 0;font-size:13px;color:#a67c52;font-style:italic">Reply to this email with any questions — we'd love to hear from you.</p>
  </td></tr>
  <tr><td style="padding:20px 36px;border-top:1px solid #e8dfd0;background:#f9f6f0;text-align:center">
    <p style="margin:0;font-size:11px;color:#a67c52;letter-spacing:2px;text-transform:uppercase">✦ Mellow Co. · Coimbatore, Tamil Nadu ✦</p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;
}

function buildOrderEmail(order) {
  const items    = Array.isArray(order.items) ? order.items : [];
  const itemsHtml = items.map(item => `
    <tr>
      <td style="padding:8px 0;border-bottom:1px solid #e8dfd0;color:#4a2c0a;font-size:14px">${item.name || item.product_name || 'Item'}</td>
      <td style="padding:8px 0;border-bottom:1px solid #e8dfd0;color:#7a4f2a;text-align:center">×${item.qty || item.quantity || 1}</td>
      <td style="padding:8px 0;border-bottom:1px solid #e8dfd0;color:#9d7a45;text-align:right;font-weight:700">₹${(item.total || 0).toLocaleString('en-IN')}</td>
    </tr>`).join('');

  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#f5f0e8;font-family:'Georgia',serif">
<table width="100%" cellpadding="0" cellspacing="0">
<tr><td align="center" style="padding:48px 20px">
<table width="600" cellpadding="0" cellspacing="0"
  style="background:#fffef8;border:1px solid #e8dfd0;border-top:4px solid #c8a96e;max-width:600px">
  <tr><td style="background:linear-gradient(135deg,#4a2c0a,#7a4f2a,#4a2c0a);padding:32px 36px">
    <h1 style="margin:0;color:#fffef8;font-size:28px">Mellow <span style="color:#c8a96e;font-style:italic">Co.</span></h1>
    <p style="margin:6px 0 0;color:rgba(200,169,110,0.75);font-size:11px;letter-spacing:4px;text-transform:uppercase">✦ Order Confirmed ✦</p>
  </td></tr>
  <tr><td style="height:3px;background:linear-gradient(90deg,#c8a96e,#9d7a45,#c8a96e)"></td></tr>
  <tr><td style="padding:40px 36px">
    <h2 style="margin:0 0 8px;color:#4a2c0a;font-size:22px">Thank you, ${order.customer_name || 'Customer'}! 🎉</h2>
    <p style="color:#7a4f2a;font-size:15px;margin:0 0 24px">
      Your order <strong style="color:#4a2c0a">#${order.order_id}</strong> has been placed. We're preparing your desserts with love.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px">
      ${itemsHtml}
    </table>
    <div style="text-align:right;padding:12px 0;border-top:2px solid #c8a96e">
      <span style="font-size:16px;font-weight:700;color:#4a2c0a">Total: ₹${Number(order.total||0).toLocaleString('en-IN')}</span>
    </div>
    <a href="${SITE_URL}"
      style="display:inline-block;margin-top:20px;background:#4a2c0a;color:#fffef8;padding:12px 28px;
             text-decoration:none;font-size:13px;letter-spacing:2px;text-transform:uppercase;border:1px solid #c8a96e">
      Shop More →
    </a>
  </td></tr>
  <tr><td style="padding:20px 36px;border-top:1px solid #e8dfd0;background:#f9f6f0;text-align:center">
    <p style="margin:0;font-size:11px;color:#a67c52;letter-spacing:2px;text-transform:uppercase">✦ Mellow Co. · Coimbatore, Tamil Nadu ✦</p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;
}

function buildNewsletterEmail(name, email, code, pct) {
  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#f5f0e8;font-family:'Georgia',serif">
<table width="100%" cellpadding="0" cellspacing="0">
<tr><td align="center" style="padding:48px 20px">
<table width="600" cellpadding="0" cellspacing="0"
  style="background:#fffef8;border:1px solid #e8dfd0;border-top:4px solid #c8a96e;max-width:600px">
  <tr><td style="background:linear-gradient(135deg,#4a2c0a,#7a4f2a,#4a2c0a);padding:32px 36px">
    <h1 style="margin:0;color:#fffef8;font-size:28px">Mellow <span style="color:#c8a96e;font-style:italic">Co.</span></h1>
    <p style="margin:6px 0 0;color:rgba(200,169,110,0.75);font-size:11px;letter-spacing:4px;text-transform:uppercase">✦ Welcome to the Mellow Circle ✦</p>
  </td></tr>
  <tr><td style="height:3px;background:linear-gradient(90deg,#c8a96e,#9d7a45,#c8a96e)"></td></tr>
  <tr><td style="padding:40px 36px">
    <h2 style="margin:0 0 16px;color:#4a2c0a;font-size:24px">Hello, ${name}! 🍮</h2>
    <p style="color:#7a4f2a;font-size:15px;line-height:1.9;margin:0 0 28px">
      Thank you for subscribing! Here is your exclusive <strong>${pct}% discount code</strong>:
    </p>
    <div style="text-align:center;background:#fff8e8;border:2px dashed #c8a96e;padding:24px;margin-bottom:28px;border-radius:6px">
      <div style="font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#a67c52;margin-bottom:10px">Your Exclusive Code</div>
      <div style="font-size:32px;font-weight:900;color:#4a2c0a;letter-spacing:4px">${code}</div>
      <div style="font-size:13px;color:#7a4f2a;margin-top:10px">${pct}% off · One-time use · Valid 30 days</div>
    </div>
    <a href="${SITE_URL}"
      style="display:inline-block;background:#4a2c0a;color:#fffef8;padding:14px 32px;
             text-decoration:none;font-size:14px;letter-spacing:2px;text-transform:uppercase;border:1px solid #c8a96e">
      Shop Now →
    </a>
  </td></tr>
  <tr><td style="padding:20px 36px;border-top:1px solid #e8dfd0;background:#f9f6f0;text-align:center">
    <p style="margin:0;font-size:11px;color:#a67c52;letter-spacing:2px;text-transform:uppercase">✦ Mellow Co. · Coimbatore, Tamil Nadu ✦</p>
    <p style="margin:8px 0 0;font-size:10px;color:#c0a882">Subscribed with ${email}</p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;
}

// ── MAIN HANDLER ─────────────────────────────────────────────────

exports.handler = async (event) => {
  // CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return jsonResponse(200, {});
  }

  // Parse route: /.netlify/functions/api/create-order → /api/create-order
  const rawPath = event.path || '';
  const route   = rawPath.replace('/.netlify/functions/api', '/api').replace(/\/+$/, '');

  // Parse body
  let body = {};
  try {
    if (event.body) body = JSON.parse(event.body);
  } catch (_) {}

  console.log(`→ ${event.httpMethod} ${route}`);

  // Route dispatch
  switch (route) {
    case '/api/create-order':          return createOrder(body);
    case '/api/verify-payment':        return verifyPayment(body);
    case '/api/save-order':            return saveOrder(body);
    case '/api/save-order-item':       return saveOrderItem(body);
    case '/api/save-newsletter':       return saveNewsletter(body);
    case '/api/save-feedback':         return saveFeedback(body);
    case '/api/validate-discount':     return validateDiscount(body);
    case '/api/use-discount':          return useDiscount(body);
    case '/api/send-email':            return sendEmailRoute(body);
    case '/api/update-profile':        return updateProfile(body);
    case '/api/my-orders':             return myOrders(body);
    case '/api/newsletter-subscribe':  return newsletterSubscribe(body);
    case '/api/confirm-cod-payment':   return confirmCodPayment(body);
    case '/api/update-credentials':    return updateCredentials(body);
    case '/api/send-welcome-email':    return sendWelcomeEmail(body);
    case '/api/send-order-email':      return sendOrderEmail(body);
    case '/api/admin/check':           return adminCheck(body);
    default:
      console.warn(`Unknown route: ${route}`);
      return jsonResponse(404, { error: `Unknown route: ${route}` });
  }
};
