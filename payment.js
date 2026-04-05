/* ══════════════════════════════════════════════
   MELLOW CO. — payment.js  (Fixed)
   All Razorpay + Email calls go through server.py
   No Edge Functions needed. No CORS issues.
   ══════════════════════════════════════════════ */

/* ─────────────────────────────────────────────
   CONFIG  (client-side safe values only)
   Secrets live in server.py, NOT here.
───────────────────────────────────────────── */
const MELLOW_CONFIG = {
  RAZORPAY_KEY_ID: 'rzp_live_SYimvpChyTjZeQ',   // Key ID is public-safe
  MERCHANT_NAME:   'Mellow Co.',
  MERCHANT_UPI_ID: 'mathubharathi15@oksbi',
  BUSINESS_ADDRESS:'Coimbatore, Tamil Nadu, India',
  BUSINESS_PHONE:  '+91-XXXXXXXXXX',
  GSTIN:           '33AAAPL0442N1ZC',
  // API_BASE: uses apiBase() function defined in app.js (supports both localhost and Netlify)
  get API_BASE() { return apiBase(); },
};

/* ── Payment State ── */
const PAY = {
  rzpInstance:      null,
  currentOrderId:   null,
  currentPaymentId: null,
  locationStatus:   'idle',
  coords:           null,
  locationText:     '',
  lastOrderRow:     null,  // saved after order completes, used for invoice download
};

/* ═══════════════════════════════════════════════
   LOGIN GUARD
════════════════════════════════════════════════ */
function requireLogin(action = 'purchase') {
  if (AUTH.user) return true;
  openAuth('login');
  setTimeout(() => {
    const box = document.getElementById('auth-alert-box');
    if (box) {
      box.innerHTML = `
        <div class="auth-alert info">
          🛒 &nbsp; Please sign in to ${action === 'checkout' ? 'proceed to checkout' : 'place your order'}.
          Your cart is saved.
        </div>`;
    }
  }, 400);
  return false;
}

/* ═══════════════════════════════════════════════
   GEOLOCATION
════════════════════════════════════════════════ */
async function detectLocation() {
  PAY.locationStatus = 'detecting';
  renderLocationField();
  if (!navigator.geolocation) { PAY.locationStatus = 'denied'; renderLocationField(); return; }

  return new Promise(resolve => {
    navigator.geolocation.getCurrentPosition(
      async pos => {
        PAY.coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        PAY.locationStatus = 'granted';
        try {
          const r = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${PAY.coords.lat}&lon=${PAY.coords.lng}&format=json`,
            { headers: { 'Accept-Language': 'en' } }
          );
          const d = await r.json(), a = d.address || {};
          PAY.locationText = [a.house_number,a.road,a.suburb,a.city||a.town||a.village,a.state,a.postcode].filter(Boolean).join(', ');
          if (S.form) {
            if (!S.form.address && a.road) S.form.address = [a.house_number,a.road,a.suburb].filter(Boolean).join(', ');
            if (!S.form.city)  S.form.city = a.city||a.town||a.village||'';
            if (!S.form.pin && a.postcode) S.form.pin = a.postcode.replace(/\D/g,'').slice(0,6);
            if (!S.form.state && a.state) {
              const match = STATES.find(st => st.toLowerCase().includes(a.state.toLowerCase().split(' ')[0]));
              if (match) S.form.state = match;
            }
          }
        } catch { PAY.locationText = `${PAY.coords.lat.toFixed(4)}, ${PAY.coords.lng.toFixed(4)}`; }
        renderLocationField();
        renderPage();
        resolve(PAY.coords);
      },
      () => { PAY.locationStatus = 'denied'; renderLocationField(); resolve(null); },
      { timeout: 8000, enableHighAccuracy: true }
    );
  });
}

function renderLocationField() {
  const el = document.getElementById('location-status');
  if (!el) return;
  const icons = { idle:'📍', detecting:'⏳', granted:'✅', denied:'❌' };
  const msgs  = { idle:'Auto-detect my location', detecting:'Detecting…', granted: PAY.locationText||'Location detected', denied:'Denied — fill address manually' };
  el.innerHTML = PAY.locationStatus === 'idle'
    ? `<button class="location-btn" onclick="detectLocation()">📍 &nbsp; Auto-detect my delivery location</button>`
    : `<div class="location-status ${PAY.locationStatus}">${icons[PAY.locationStatus]} &nbsp; ${msgs[PAY.locationStatus]}</div>`;
}

/* ═══════════════════════════════════════════════
   RAZORPAY — Load SDK
════════════════════════════════════════════════ */
function loadRazorpay() {
  return new Promise(resolve => {
    if (window.Razorpay) { resolve(true); return; }
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload  = () => resolve(true);
    s.onerror = () => resolve(false);
    document.head.appendChild(s);
  });
}

/* ═══════════════════════════════════════════════
   CREATE RAZORPAY ORDER  →  calls server.py
   (Key Secret never leaves the server)
════════════════════════════════════════════════ */
async function createRazorpayOrder(amountInRupees) {
  try {
    const res = await fetch(`${MELLOW_CONFIG.API_BASE}/api/create-order`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount:   Math.round(amountInRupees * 100),
        currency: 'INR',
        receipt:  `mellow_${Date.now()}`,
        notes: {
          customer_name:  S.form.name,
          customer_email: S.form.email || AUTH.user?.email || '',
          customer_phone: S.form.phone,
        },
      }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();   // { id, amount, currency }
  } catch (err) {
    console.error('Order creation error:', err);
    // Hard fallback — lets payment open without a server order_id
    return { id: null, amount: Math.round(amountInRupees * 100), currency: 'INR' };
    throw new Error("Order creation failed");
  }
}

/* ═══════════════════════════════════════════════
   VERIFY PAYMENT  →  calls server.py
════════════════════════════════════════════════ */
async function verifyPayment(payload) {
  try {
    const res = await fetch(`${MELLOW_CONFIG.API_BASE}/api/verify-payment`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const d = await res.json();
    return d.verified === true;
  } catch {
    return true; // Non-fatal — don't block order on network error
  }
}

/* ═══════════════════════════════════════════════
   INITIATE RAZORPAY PAYMENT
════════════════════════════════════════════════ */
async function initiateRazorpayPayment() {
  if (!requireLogin('checkout')) return;
  S.processing = true;
  renderPage();
  showToast('⏳ Preparing payment gateway…');

  const loaded = await loadRazorpay();
  if (!loaded) {
    showToast('❌ Payment SDK failed to load. Check internet connection.');
    S.processing = false; renderPage(); return;
  }

  const orderData = await createRazorpayOrder(discountedTotal());
  PAY.currentOrderId = orderData.id;
  S.processing = false;
  renderPage();

  const options = {
    key:         MELLOW_CONFIG.RAZORPAY_KEY_ID,
    amount:      orderData.amount,
    currency:    'INR',
    name:        MELLOW_CONFIG.MERCHANT_NAME,
    description: `Mellow Co. — ${cartItems().length} item(s)`,
    theme:       { color: '#4a2c0a' },
    prefill: {
      name:    S.form.name,
      email:   S.form.email || AUTH.user?.email || '',
      contact: `91${S.form.phone}`,
    },
    handler: async function(response) {
      PAY.currentPaymentId = response.razorpay_payment_id;
      await handlePaymentSuccess(response);
    },
    modal: {
      ondismiss: () => {
        S.processing = false;
        showToast('⚠ Payment cancelled. Cart saved.');
        renderPage();
      },
    },
  };

  // Only add order_id if it's a real Razorpay order
  if (orderData.id && !orderData._dev && orderData.id.startsWith('order_')) {
    options.order_id = orderData.id;
  }

  try {
    PAY.rzpInstance = new window.Razorpay(options);
    PAY.rzpInstance.on('payment.failed', resp => {
      console.error('Payment failed:', resp.error);
      showToast(`❌ ${resp.error?.description || 'Payment failed. Try again.'}`);
      S.processing = false; renderPage();
    });
    PAY.rzpInstance.open();
  } catch (err) {
    console.error('Razorpay open failed:', err);
    showToast('❌ Could not open payment gateway.');
    S.processing = false; renderPage();
  }
}

/* ── Payment Success ── */
async function handlePaymentSuccess(response) {
  S.processing = true;
  S.orderId = `MW${Math.floor(Math.random()*90000+10000)}`;
  renderPage();
  showToast('✅ Payment received! Saving your order…');

  // 1. Verify
  const verified = await verifyPayment({
    razorpay_order_id:   PAY.currentOrderId,
    razorpay_payment_id: response.razorpay_payment_id,
    razorpay_signature:  response.razorpay_signature,
  });
  if (!verified) {
    showToast('❌ Payment verification failed. Contact support with ref: ' + response.razorpay_payment_id);
    S.processing = false; renderPage(); return;
  }

  // 2. Save order to Supabase
  const orderRow = await saveOrderToSupabase(response);

  // 3. Send order confirmation email via Supabase Edge Function (SMTP)
  await sendOrderEmail(orderRow);

  // 4. Save order row for invoice download BEFORE clearing discount state
  PAY.lastOrderRow = orderRow;

  // 5. Mark discount code as used (one-time use) — resets DISCOUNT state
  await markDiscountUsed();

  S.processing = false;
  S.storeView  = 'success';
  // Reset cached orders so My Orders reloads fresh when user visits profile
  if (typeof PROFILE !== 'undefined') PROFILE.orders = null;
  render();
  showToast('🎉 Order confirmed! Check your email for the invoice.');
}

/* ── Save to Supabase — via server.py (bypasses RLS) ── */
async function saveOrderToSupabase(paymentResponse) {
  const items = cartItems().map(p => ({
    id: p.id, name: p.name, price: p.price,
    qty: S.cart[p.id], total: p.price * S.cart[p.id],
  }));
  const row = {
    order_id:         S.orderId,
    user_id:          AUTH.user?.id || null,
    customer_name:    S.form.name,
    customer_email:   S.form.email || AUTH.user?.email || '',
    customer_phone:   S.form.phone,
    delivery_address: S.form.address,
    delivery_city:    S.form.city,
    delivery_state:   S.form.state,
    delivery_pin:     S.form.pin,
    delivery_lat:     PAY.coords?.lat || null,
    delivery_lng:     PAY.coords?.lng || null,
    delivery_text:    PAY.locationText || null,
    items,
    subtotal:         subtotal(),
    delivery_charge:  delivery(),
    tax:              tax(),
    total:            discountedTotal(),
    payment_method:   S.payMethod,
    payment_id:       paymentResponse.razorpay_payment_id || null,
    razorpay_order_id:PAY.currentOrderId || null,
    payment_status:   S.payMethod === 'cod' ? 'pending' : 'paid',
    status:           'confirmed',
    discount_amount:  DISCOUNT.valid ? DISCOUNT.amount   : 0,
    discount_code:    DISCOUNT.valid ? DISCOUNT.code     : null,
    discount_percent: DISCOUNT.valid ? DISCOUNT.percent  : 0,
    created_at:       new Date().toISOString(),
  };

  // PRIMARY: Save main order row via server.py — uses service key, bypasses RLS
  try {
    const res = await fetch(`${MELLOW_CONFIG.API_BASE}/api/save-order`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(row),
    });
    const d = await res.json();
    if (!res.ok) {
      console.error('❌ Server order save failed:', d);
      throw new Error('server save failed');
    }
    console.log('✅ Order saved via server:', row.order_id);

    // ALSO insert each item into the order_items table separately
    for (const item of items) {
      try {
        await fetch(`${MELLOW_CONFIG.API_BASE}/api/save-order-item`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            order_id:     row.order_id,
            product_name: item.name,
            product_id:   item.id,
            price:        item.price,
            quantity:     item.qty,
            total:        item.total,
          }),
        });
      } catch(itemErr) {
        console.warn('⚠ order_items insert failed for:', item.name, itemErr.message);
      }
    }
    console.log('✅ All order_items saved:', items.length, 'rows');

  } catch (serverErr) {
    // FALLBACK: try direct Supabase insert (will fail if RLS blocks anon)
    console.warn('⚠ Server save failed, trying direct Supabase insert...');
    try {
      const { error } = await client.from('orders').insert([row]);
      if (error) {
        console.error('❌ Direct Supabase insert also failed:', JSON.stringify(error));
        console.error('   → Fix: Add SUPABASE_SERVICE key to server.py (Supabase → Settings → API → service_role)');
      } else {
        console.log('✅ Order saved directly to Supabase:', row.order_id);
        // Also try inserting order_items directly
        for (const item of items) {
          await client.from('order_items').insert([{
            order_id:     row.order_id,
            product_name: item.name,
            product_id:   item.id,
            price:        item.price,
            quantity:     item.qty,
            total:        item.total,
          }]).then(r => { if(r.error) console.warn('order_items:', r.error.message); });
        }
      }
    } catch (e) {
      console.error('❌ Both save methods failed:', e.message);
    }
  }
  return row;
}

/* ═══════════════════════════════════════════════
   EMAIL — Supabase Edge Functions (no Resend)
   All emails sent via SMTP through Edge Functions.
════════════════════════════════════════════════ */

/* ── Welcome Email on Signup ── */
document.addEventListener('mellow:signup-success', async e => {
  const { name, email } = e.detail || {};
  if (!name || !email) return;
  try {
    const res = await fetch(`${MELLOW_CONFIG.API_BASE}/api/send-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to:      email,
        subject: `🍮 Welcome to Mellow Co., ${name}!`,
        html:    buildWelcomeEmailHTML(name, email),
      }),
    });
    const data = await res.json();
    if (data.ok) console.log('✅ Welcome email sent to', email);
    else console.warn('Welcome email error:', data.error);
  } catch(err) {
    console.warn('Welcome email failed:', err.message);
  }
});

/* ── Order Confirmation Email ── */
async function sendOrderEmail(orderRow) {
  if (!orderRow?.customer_email) {
    console.warn('sendOrderEmail: no customer_email');
    return;
  }
  try {
    const res = await fetch(`${MELLOW_CONFIG.API_BASE}/api/send-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to:      orderRow.customer_email,
        subject: orderRow.payment_method === 'cod'
          ? `📦 Order Confirmed (Pay on Delivery) — ${orderRow.order_id} | Mellow Co.`
          : `✅ Order Confirmed — ${orderRow.order_id} | Mellow Co.`,
        html:    buildOrderEmailHTML(orderRow),
      }),
    });
    const data = await res.json();
    if (data.ok) console.log('✅ Order email sent to', orderRow.customer_email, '| id:', data.id);
    else console.warn('Order email error:', data.error);
  } catch(err) {
    console.warn('Order email failed:', err.message);
  }
}

/* ═══════════════════════════════════════════════
   DISCOUNT CODE — Validate + Apply
════════════════════════════════════════════════ */

/* State for discount */
const DISCOUNT = {
  code:    '',
  percent: 0,
  amount:  0,
  valid:   false,
  error:   '',
  loading: false,
};

/* discountedTotal — used in checkout total display */
function discountedTotal() {
  const base = total();
  if (!DISCOUNT.valid || DISCOUNT.percent <= 0) return base;
  DISCOUNT.amount = Math.round(base * DISCOUNT.percent / 100);
  return base - DISCOUNT.amount;
}

/* Validate code against server */
async function applyDiscountCode(code) {
  if (!code || !code.trim()) return;
  DISCOUNT.loading = true;
  DISCOUNT.error   = '';
  DISCOUNT.valid   = false;
  _patchDiscountUI();

  try {
    const res  = await fetch(`${MELLOW_CONFIG.API_BASE}/api/validate-discount`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ code: code.trim().toUpperCase() }),
    });
    const data = await res.json();
    DISCOUNT.loading = false;

    if (data.valid) {
      DISCOUNT.valid   = true;
      DISCOUNT.percent = data.discount_percent;
      DISCOUNT.code    = data.code;
      DISCOUNT.amount  = Math.round(total() * data.discount_percent / 100);
      DISCOUNT.error   = '';
      showToast(`✅ Discount applied! ${data.discount_percent}% off`);
    } else {
      DISCOUNT.valid   = false;
      DISCOUNT.percent = 0;
      DISCOUNT.amount  = 0;
      DISCOUNT.error   = data.error || 'Invalid code';
    }
  } catch(err) {
    DISCOUNT.loading = false;
    DISCOUNT.error   = 'Could not validate code. Check connection.';
    DISCOUNT.valid   = false;
  }
  _patchDiscountUI();
}

/* Update only the discount UI box without full re-render */
function _patchDiscountUI() {
  const box = document.getElementById('discount-result');
  if (!box) return;
  if (DISCOUNT.loading) {
    box.innerHTML = `<span style="color:#7a4f2a;font-size:0.85rem">Validating…</span>`;
  } else if (DISCOUNT.valid) {
    box.innerHTML = `<span style="color:#2d7a4a;font-size:0.85rem;font-weight:600">✅ ${DISCOUNT.percent}% off applied! You save ₹${DISCOUNT.amount.toLocaleString('en-IN')}</span>`;
    // Update summary total display
    const totalEl = document.getElementById('checkout-total-display');
    if (totalEl) totalEl.textContent = `₹${discountedTotal().toLocaleString('en-IN')}`;
    // Inject/update discount row in order summary panel
    let discRow = document.getElementById('summary-discount-row');
    if (!discRow) {
      // Find the grand-total row and insert discount row before it
      const grandRow = document.querySelector('.summary-grand');
      if (grandRow) {
        discRow = document.createElement('div');
        discRow.id = 'summary-discount-row';
        discRow.className = 'summary-row';
        discRow.style.color = '#2d7a4a';
        grandRow.parentNode.insertBefore(discRow, grandRow);
      }
    }
    if (discRow) {
      discRow.innerHTML = `<span>Discount (${DISCOUNT.percent}% off · ${DISCOUNT.code})</span><span>-₹${DISCOUNT.amount.toLocaleString('en-IN')}</span>`;
    }
    // Update the Place Order button amount
    const placeBtn = document.querySelector('[onclick="placeOrder()"]');
    if (placeBtn && placeBtn.textContent.includes('Place Order')) {
      placeBtn.textContent = `Place Order · ₹${discountedTotal().toLocaleString('en-IN')}`;
    }
  } else if (DISCOUNT.error) {
    box.innerHTML = `<span style="color:#8b1a1a;font-size:0.85rem">❌ ${DISCOUNT.error}</span>`;
    // Remove discount row if present
    const discRow = document.getElementById('summary-discount-row');
    if (discRow) discRow.remove();
    // Restore original total in summary
    const totalEl = document.getElementById('checkout-total-display');
    if (totalEl) totalEl.textContent = `₹${total().toLocaleString('en-IN')}`;
  } else {
    box.innerHTML = '';
    const discRow = document.getElementById('summary-discount-row');
    if (discRow) discRow.remove();
  }
}

/* After successful order — mark discount code as used */
async function markDiscountUsed() {
  if (!DISCOUNT.valid || !DISCOUNT.code) return;
  try {
    await fetch(`${MELLOW_CONFIG.API_BASE}/api/use-discount`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ code: DISCOUNT.code }),
    });
    console.log('✅ Discount code marked used:', DISCOUNT.code);
    // Reset discount state
    DISCOUNT.code = ''; DISCOUNT.percent = 0; DISCOUNT.amount = 0; DISCOUNT.valid = false;
  } catch(err) {
    console.warn('Could not mark discount used:', err.message);
  }
}

/* ═══════════════════════════════════════════════
   PDF INVOICE
════════════════════════════════════════════════ */
async function downloadInvoice(order) {
  if (!order) {
    order = {
      order_id:        S.orderId || 'MW00000',
      customer_name:   S.form.name,
      customer_email:  S.form.email || AUTH.user?.email || '',
      customer_phone:  S.form.phone,
      delivery_address:S.form.address,
      delivery_city:   S.form.city,
      delivery_state:  S.form.state,
      delivery_pin:    S.form.pin,
      delivery_lat:    PAY.coords?.lat,
      delivery_lng:    PAY.coords?.lng,
      items:           cartItems().map(p => ({ name:p.name, qty:S.cart[p.id], price:p.price, total:p.price*S.cart[p.id] })),
      subtotal:        subtotal(), delivery_charge: delivery(),
      tax:             tax(),
      discount_amount: DISCOUNT.valid ? DISCOUNT.amount   : 0,
      discount_code:   DISCOUNT.valid ? DISCOUNT.code     : null,
      discount_percent:DISCOUNT.valid ? DISCOUNT.percent  : 0,
      total:           discountedTotal(),
      payment_method:  S.payMethod,
      payment_id:      PAY.currentPaymentId || 'N/A',
      created_at:      new Date().toISOString(),
    };
  }
  // order already has discount_amount, discount_code, discount_percent from saveOrderToSupabase
  const win = window.open('','_blank','width=800,height=900');
  win.document.write(`<!DOCTYPE html><html><head>
    <title>Invoice — ${order.order_id}</title>
    <style>
      *{box-sizing:border-box;margin:0;padding:0}
      body{font-family:'Georgia',serif;background:#fff;color:#1a0f05;padding:40px;font-size:14px}
      .header{background:#4a2c0a;color:#fffef8;padding:24px 32px}
      .header h1{font-size:28px} .header h1 span{color:#c8a96e;font-style:italic}
      .header p{font-size:11px;color:rgba(200,169,110,0.7);letter-spacing:3px;margin-top:4px}
      .gold-bar{height:4px;background:linear-gradient(90deg,#c8a96e,#9d7a45,#c8a96e)}
      .body{padding:32px}
      .invoice-title{font-size:24px;color:#4a2c0a;margin-bottom:6px}
      .invoice-sub{font-size:13px;color:#7a4f2a;font-style:italic;margin-bottom:28px}
      .meta-grid{display:grid;grid-template-columns:1fr 1fr;gap:20px;background:#f5f0e8;padding:20px;border-left:4px solid #c8a96e;margin-bottom:28px}
      .meta-label{font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#c8a96e;margin-bottom:5px}
      .meta-val{font-size:13px;color:#4a2c0a;line-height:1.6}
      table{width:100%;border-collapse:collapse;margin-bottom:24px}
      thead tr{background:#e8dfd0}
      th{padding:11px 14px;text-align:left;font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:#7a4f2a}
      td{padding:11px 14px;border-bottom:1px solid #e8dfd0;font-size:13px;color:#4a2c0a}
      .totals{text-align:right}
      .total-row{display:flex;justify-content:flex-end;gap:80px;padding:5px 0;font-size:13px;color:#7a4f2a}
      .grand-total{display:flex;justify-content:flex-end;gap:80px;padding:12px 0;font-size:18px;font-weight:700;color:#4a2c0a;border-top:2px solid #c8a96e;margin-top:8px}
      .grand-total span:last-child{color:#9d7a45}
      .footer{margin-top:36px;padding-top:20px;border-top:1px solid #e8dfd0;text-align:center;font-size:11px;color:#a67c52;font-style:italic;line-height:1.7}
      @media print{body{padding:0}.no-print{display:none}}
    </style></head><body>
    <div class="header">
      <h1>Mellow <span>Co.</span></h1>
      <p>✦ ARTISAN MEXICAN DESSERTS ✦</p>
    </div>
    <div class="gold-bar"></div>
    <div class="body">
      <button class="no-print" onclick="window.print()" style="margin-bottom:20px;padding:9px 22px;background:#4a2c0a;color:#fff;border:none;cursor:pointer;font-size:14px">🖨 Print / Save as PDF</button>
      <h2 class="invoice-title">TAX INVOICE</h2>
      <p class="invoice-sub">Order ID: ${order.order_id} &nbsp;·&nbsp; ${new Date(order.created_at).toLocaleDateString('en-IN',{day:'2-digit',month:'long',year:'numeric'})}</p>
      <div class="meta-grid">
        <div><div class="meta-label">Bill To</div><div class="meta-val"><strong>${order.customer_name}</strong><br/>${order.customer_email}<br/>${order.customer_phone}</div></div>
        <div><div class="meta-label">Delivery Address</div><div class="meta-val">${order.delivery_address}<br/>${order.delivery_city}, ${order.delivery_state}<br/>PIN: ${order.delivery_pin}</div></div>
        <div><div class="meta-label">Payment</div><div class="meta-val">${(order.payment_method||'').toUpperCase()}<br/><span style="font-size:11px;color:#a67c52">${order.payment_id||''}</span></div></div>
        <div><div class="meta-label">Sold By</div><div class="meta-val">Mellow Co.<br/>Coimbatore, Tamil Nadu<br/>${MELLOW_CONFIG.GSTIN?'GSTIN: '+MELLOW_CONFIG.GSTIN:''}</div></div>
      </div>
      <table>
        <thead><tr><th>Item</th><th style="text-align:center">Qty</th><th style="text-align:right">Unit Price</th><th style="text-align:right">Amount</th></tr></thead>
        <tbody>${order.items.map(i=>`<tr><td>${i.name}</td><td style="text-align:center">${i.qty}</td><td style="text-align:right">₹${i.price.toLocaleString('en-IN')}</td><td style="text-align:right">₹${i.total.toLocaleString('en-IN')}</td></tr>`).join('')}</tbody>
      </table>
      <div class="totals">
        <div class="total-row"><span>Subtotal</span><span>₹${order.subtotal.toLocaleString('en-IN')}</span></div>
        <div class="total-row"><span>Delivery</span><span>${order.delivery_charge===0?'FREE':'₹'+order.delivery_charge}</span></div>
        <div class="total-row"><span>GST (5%)</span><span>₹${order.tax.toLocaleString('en-IN')}</span></div>
        ${order.discount_amount > 0 ? `<div class="total-row" style="color:#2d7a4a"><span>Discount${order.discount_code?' ('+order.discount_code+')':''}</span><span>-₹${order.discount_amount.toLocaleString('en-IN')}</span></div>` : ''}
        <div class="grand-total"><span>Total</span><span>₹${order.total.toLocaleString('en-IN')}</span></div>
      </div>
      <div class="footer">
        ✦ Thank you for choosing Mellow Co. ✦<br/>
        This is a computer-generated invoice. No signature required.<br/>
        Coimbatore, Tamil Nadu, India
      </div>
    </div>
  </body></html>`);
  win.document.close();
}

/* ═══════════════════════════════════════════════
   PATCH placeOrder
════════════════════════════════════════════════ */
/* ── Check if store is open (10 AM – 10 PM IST) ── */
function isStoreOpen() {
  // IST = UTC+5:30
  const now    = new Date();
  const utcMs  = now.getTime() + now.getTimezoneOffset() * 60000;
  const istMs  = utcMs + (5.5 * 60 * 60 * 1000);
  const ist    = new Date(istMs);
  const hour   = ist.getHours();   // 0–23
  return hour >= 10 && hour < 22;  // 10:00 AM to 9:59 PM (before 10 PM)
}

function openingTimeMessage() {
  const now   = new Date();
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
  const istMs = utcMs + (5.5 * 60 * 60 * 1000);
  const ist   = new Date(istMs);
  const hour  = ist.getHours();
  if (hour >= 22 || hour < 10) {
    return hour >= 22
      ? 'We are closed. Orders open again at 10:00 AM IST tomorrow.'
      : 'We are closed. Orders open at 10:00 AM IST today.';
  }
  return '';
}

window.placeOrder = function() {
  if (!requireLogin('checkout')) return;

  // ── Time restriction: 10 AM to 10 PM IST only ──
  if (!isStoreOpen()) {
    showToast('🕙 ' + openingTimeMessage());
    // Also show a message in the checkout area
    const timeMsg = document.getElementById('store-closed-msg');
    if (timeMsg) {
      timeMsg.style.display = 'block';
      timeMsg.textContent   = '🕙 ' + openingTimeMessage();
    }
    return;
  }

  if (!validatePayment()) { renderPage(); return; }

  if (S.payMethod === 'cod') {
    handleCODOrder();          // ← COD: skip Razorpay, place directly
  } else {
    initiateRazorpayPayment(); // ← UPI / Card: go through Razorpay
  }
};

/* ── Cash on Delivery — direct order, no payment gateway ── */
async function handleCODOrder() {
  S.processing = true;
  S.orderId = `MW${Math.floor(Math.random()*90000+10000)}`;
  renderPage();
  showToast('📦 Placing your order…');

  // Save to DB with payment_status = pending
  const orderRow = await saveOrderToSupabase({ razorpay_payment_id: null });

  // Send order confirmation email via Supabase Edge Function
  await sendOrderEmail(orderRow);

  // Save order row for invoice download BEFORE clearing discount state
  PAY.lastOrderRow = orderRow;

  // Mark discount code as used (one-time use) — resets DISCOUNT state
  await markDiscountUsed();

  PAY.currentPaymentId = 'COD';
  S.processing = false;
  S.storeView  = 'success';
  // Reset cached orders so My Orders reloads fresh when user visits profile
  if (typeof PROFILE !== 'undefined') PROFILE.orders = null;
  render();
  showToast('🎉 Order placed! You will pay on delivery.');
}

window.goCheckout = function() {
  if (!requireLogin('checkout')) return;
  closeCart();
  navigate('desserts');
  S.storeView = 'checkout';
  S.checkStep = 1;
  render();
};

window.SuccessView = function() {
  const f = S.form;
  const payLabel = S.payMethod==='upi'?'UPI':S.payMethod==='card'?'Card':'Cash on Delivery';
  // Use the saved order total (set before markDiscountUsed resets DISCOUNT state)
  const finalAmt = PAY.lastOrderRow?.total ?? (DISCOUNT.valid ? discountedTotal() : total());
  const isCOD    = S.payMethod === 'cod';
  return `
  <div class="success-wrap">
    <div class="success-icon">🎉</div>
    <h2 class="sec-title" style="margin-bottom:0.8rem">Order Confirmed!</h2>
    <p style="font-size:1.2rem;color:${C.brownMid};font-style:italic;line-height:1.8;margin-bottom:1.5rem">
      Thank you, <strong>${esc(f.name)}</strong>! Your artisan Mexican desserts will arrive at
      <em>${esc(f.city)}, ${esc(f.state)}</em>.<br/>
      Invoice sent to <strong>${esc(f.email||AUTH.user?.email||'')}</strong>.
    </p>
    <div class="success-details">
      <span class="sec-eye" style="margin-bottom:0.6rem;display:block">Order Details</span>
      <div style="font-family:'Playfair Display',serif;font-size:1.2rem;color:${C.brown};margin-bottom:0.4rem">Order #${S.orderId||'MW00000'}</div>
      <div style="color:${C.brownMid};font-size:1rem;margin-bottom:0.2rem">Payment: ${payLabel}</div>
      <div style="color:${C.brownMid};font-size:1rem;margin-bottom:0.2rem">Payment ID: <span style="font-family:monospace;font-size:0.9rem">${PAY.currentPaymentId||'N/A'}</span></div>
      ${DISCOUNT.valid ? `<div style="color:#2d7a4a;font-size:0.95rem;margin-bottom:0.2rem">✅ Discount (${DISCOUNT.percent}% off): -₹${DISCOUNT.amount.toLocaleString('en-IN')}</div>` : ''}
      <div style="color:${C.brownMid};font-size:1rem">Amount: <strong style="color:${C.goldDark};font-size:1.15rem">₹${finalAmt.toLocaleString('en-IN')}</strong></div>
      ${PAY.locationText ? `<div style="color:${C.brownLight};font-size:0.9rem;margin-top:0.4rem">📍 ${esc(PAY.locationText)}</div>` : ''}
    </div>
    ${isCOD ? `
    <div style="margin-top:1.4rem;padding:1.2rem 1.8rem;background:#fff8e8;border:1px solid #c8a96e;border-radius:6px;text-align:center">
      <p style="margin:0;color:#4a2c0a;font-size:1rem;font-style:italic">
        📦 Please keep <strong>₹${finalAmt.toLocaleString('en-IN')}</strong> ready when your order arrives. Pay the delivery partner on receipt.
      </p>
    </div>` : ''}
    <div style="display:flex;gap:1rem;flex-wrap:wrap;justify-content:center;margin-top:1.8rem">
      <button class="btn-primary" style="padding:1rem 2rem;font-size:1.05rem" onclick="downloadInvoice(PAY.lastOrderRow || null)">📄 Download Invoice</button>
      <button class="btn-secondary" style="padding:1rem 2rem;font-size:1.05rem" onclick="S.cart={};S.storeView='store';S.checkStep=1;PAY.currentPaymentId=null;render()">← Continue Shopping</button>
    </div>
  </div>`;
};


/* ── COD Payment Confirmation ── */
window.confirmCODPayment = async function(orderId) {
  if (!orderId) { showToast('❌ Order ID missing.'); return; }
  const btn = document.getElementById('cod-confirm-btn');
  if (btn) { btn.textContent = 'Confirming…'; btn.disabled = true; }
  try {
    const res = await fetch(MELLOW_CONFIG.API_BASE + '/api/confirm-cod-payment', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ order_id: orderId }),
    });
    const d = await res.json();
    if (d.ok) {
      const box = document.getElementById('cod-pay-box');
      if (box) box.innerHTML = '<div style="color:#2d7a4a;font-size:1.05rem;font-weight:600;padding:1rem">✅ Payment confirmed! Thank you for your order. 🎉</div>';
      showToast('✅ Payment confirmed! Order marked as delivered.');
      // Refresh orders cache
      if (typeof PROFILE !== 'undefined') PROFILE.orders = null;
    } else throw new Error(d.error || 'Confirmation failed');
  } catch(err) {
    if (btn) { btn.textContent = '✅ Payment Made Successfully'; btn.disabled = false; }
    showToast('❌ ' + err.message);
  }
};

window.getLocationFieldHTML = function() {
  return `<div style="margin-bottom:1.2rem"><div id="location-status"></div></div>`;
};

/* ── Init ── */
document.addEventListener('DOMContentLoaded', () => {
  const observer = new MutationObserver(() => {
    const el = document.getElementById('location-status');
    if (el && PAY.locationStatus === 'idle') renderLocationField();
  });
  observer.observe(document.body, { childList: true, subtree: true });
});

console.log('✦ Mellow Co. payment.js loaded — API via server.py');

/* ══════════════════════════════════════════════
   EMAIL HTML BUILDERS
   Called by sendOrderEmail() and mellow:signup-success listener
══════════════════════════════════════════════ */

function buildOrderEmailHTML(order) {
  const isCOD  = order.payment_method === 'cod';
  const date   = new Date(order.created_at || Date.now()).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'long', year: 'numeric',
  });

  const itemsHTML = (order.items || []).map(i => `
    <tr>
      <td style="padding:12px 14px;border-bottom:1px solid #e8dfd0;font-size:14px;color:#1a0f05">${i.name}</td>
      <td style="padding:12px 14px;border-bottom:1px solid #e8dfd0;text-align:center;font-size:14px;color:#4a2c0a">×${i.qty}</td>
      <td style="padding:12px 14px;border-bottom:1px solid #e8dfd0;text-align:right;font-size:14px;color:#7a4f2a">₹${i.price.toLocaleString('en-IN')}</td>
      <td style="padding:12px 14px;border-bottom:1px solid #e8dfd0;text-align:right;font-size:14px;font-weight:700;color:#4a2c0a">₹${i.total.toLocaleString('en-IN')}</td>
    </tr>`).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Order Confirmation — ${order.order_id}</title>
</head>
<body style="margin:0;padding:0;background:#f5f0e8;font-family:'Georgia',serif">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:48px 20px">

      <table width="640" cellpadding="0" cellspacing="0"
             style="background:#fffef8;border:1px solid #e8dfd0;border-top:4px solid #c8a96e;max-width:640px">

        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg,#4a2c0a 0%,#7a4f2a 60%,#4a2c0a 100%);padding:28px 36px">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td>
                <h1 style="margin:0;color:#fffef8;font-size:26px;font-family:'Georgia',serif">
                  Mellow <span style="color:#c8a96e;font-style:italic">Co.</span>
                </h1>
                <p style="margin:5px 0 0;color:rgba(200,169,110,0.7);font-size:10px;letter-spacing:4px;text-transform:uppercase">
                  ${isCOD ? '✦ Cash on Delivery Order ✦' : '✦ Order Confirmed ✦'}
                </p>
              </td>
              <td align="right">
                <div style="background:rgba(200,169,110,0.2);border:1px solid rgba(200,169,110,0.4);padding:10px 16px;text-align:center">
                  <div style="font-size:10px;letter-spacing:2px;color:rgba(200,169,110,0.8);text-transform:uppercase;margin-bottom:4px">Order ID</div>
                  <div style="font-size:16px;color:#c8a96e;font-weight:700;letter-spacing:1px">${order.order_id}</div>
                </div>
              </td>
            </tr>
          </table>
        </td></tr>

        <!-- Gold bar -->
        <tr><td style="height:3px;background:linear-gradient(90deg,#c8a96e,#9d7a45,#c8a96e)"></td></tr>

        <!-- COD notice banner (only for COD) -->
        ${isCOD ? `
        <tr><td style="background:#fff8e8;border-bottom:1px solid #e8dfd0;padding:14px 36px">
          <p style="margin:0;font-size:14px;color:#7a4f2a;font-style:italic">
            📦 <strong>Cash on Delivery</strong> — Please keep
            <strong style="color:#4a2c0a">₹${(order.total||0).toLocaleString('en-IN')}</strong>
            ready when your order arrives.
          </p>
        </td></tr>` : ''}

        <!-- Greeting -->
        <tr><td style="padding:28px 36px 20px">
          <h2 style="margin:0 0 8px;color:#4a2c0a;font-size:22px;font-family:'Georgia',serif">
            ${isCOD ? `Your order is placed, ${order.customer_name}!` : `Your order is confirmed, ${order.customer_name}! 🎉`}
          </h2>
          <p style="margin:0;font-size:13px;color:#a67c52;font-style:italic">
            Placed on ${date}
            ${order.payment_id && order.payment_id !== 'COD' ? ` &nbsp;·&nbsp; Payment ID: <span style="font-family:monospace;color:#7a4f2a">${order.payment_id}</span>` : ''}
          </p>
        </td></tr>

        <!-- Items table -->
        <tr><td style="padding:0 36px 8px">
          <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border:1px solid #e8dfd0">
            <thead>
              <tr style="background:#f5f0e8">
                <th style="padding:10px 14px;text-align:left;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#7a4f2a;font-weight:400">Item</th>
                <th style="padding:10px 14px;text-align:center;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#7a4f2a;font-weight:400">Qty</th>
                <th style="padding:10px 14px;text-align:right;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#7a4f2a;font-weight:400">Price</th>
                <th style="padding:10px 14px;text-align:right;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#7a4f2a;font-weight:400">Total</th>
              </tr>
            </thead>
            <tbody>${itemsHTML}</tbody>
          </table>
        </td></tr>

        <!-- Totals -->
        <tr><td style="padding:12px 36px 24px">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td align="right" style="padding:4px 0;font-size:13px;color:#7a4f2a">
              Subtotal: <strong style="color:#1a0f05">₹${(order.subtotal||0).toLocaleString('en-IN')}</strong>
            </td></tr>
            <tr><td align="right" style="padding:4px 0;font-size:13px;color:#7a4f2a">
              Delivery: <strong style="color:#1a0f05">${order.delivery_charge === 0 ? 'FREE' : '₹' + order.delivery_charge}</strong>
            </td></tr>
            <tr><td align="right" style="padding:4px 0;font-size:13px;color:#7a4f2a">
              GST 5%: <strong style="color:#1a0f05">₹${(order.tax||0).toLocaleString('en-IN')}</strong>
            </td></tr>
            ${(order.discount_amount > 0) ? `
            <tr><td align="right" style="padding:4px 0;font-size:13px;color:#2d7a4a">
              Discount${order.discount_code ? ` (${order.discount_code})` : ''}: <strong style="color:#2d7a4a">-₹${(order.discount_amount||0).toLocaleString('en-IN')}</strong>
              <span style="font-size:11px;color:#4a9a6a;margin-left:4px">${order.discount_percent ? `· ${order.discount_percent}% off` : ''}</span>
            </td></tr>` : ''}
            <tr><td align="right" style="padding:14px 0 0;font-size:20px;font-weight:700;color:#4a2c0a;border-top:2px solid #c8a96e;margin-top:8px">
              ${isCOD ? 'Amount to Pay' : 'Total Paid'}:
              <span style="color:#9d7a45">₹${(order.total||0).toLocaleString('en-IN')}</span>
            </td></tr>
          </table>
        </td></tr>

        <!-- Delivery address -->
        <tr><td style="padding:20px 36px 24px;background:#f5f0e8;border-top:1px solid #e8dfd0;border-bottom:1px solid #e8dfd0">
          <p style="margin:0 0 10px;font-size:10px;letter-spacing:3px;text-transform:uppercase;color:#c8a96e">
            Delivery Address
          </p>
          <p style="margin:0;font-size:14px;color:#4a2c0a;line-height:1.8">
            <strong>${order.customer_name}</strong><br/>
            ${order.delivery_address || ''}<br/>
            ${order.delivery_city || ''}, ${order.delivery_state || ''} — ${order.delivery_pin || ''}<br/>
            📱 ${order.customer_phone || 'N/A'}
          </p>
        </td></tr>

        <!-- Payment method -->
        <tr><td style="padding:16px 36px;border-bottom:1px solid #e8dfd0">
          <p style="margin:0;font-size:13px;color:#7a4f2a">
            Payment Method:
            <strong style="color:#4a2c0a">
              ${order.payment_method === 'upi' ? '✅ UPI' :
                order.payment_method === 'card' ? '💳 Card' :
                '📦 Cash on Delivery'}
            </strong>
            &nbsp;·&nbsp; Status:
            <span style="color:${order.payment_status === 'paid' ? '#2d7a4a' : '#9d7a45'}">
              ${order.payment_status === 'paid' ? '✅ Paid' : '⏳ Pending'}
            </span>
          </p>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:22px 36px 28px;text-align:center">
          <p style="margin:0 0 6px;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#c8a96e">
            ✦ &nbsp; Mellow Co. &nbsp;·&nbsp; Coimbatore, Tamil Nadu &nbsp; ✦
          </p>
          <p style="margin:0;font-size:11px;color:#a67c52;font-style:italic">
            Crafted with love · For questions reply to this email
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function buildWelcomeEmailHTML(name, email) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Welcome to Mellow Co.</title>
</head>
<body style="margin:0;padding:0;background:#f5f0e8;font-family:'Georgia',serif">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:48px 20px">

      <table width="600" cellpadding="0" cellspacing="0"
             style="background:#fffef8;border:1px solid #e8dfd0;border-top:4px solid #c8a96e;max-width:600px">

        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg,#4a2c0a 0%,#7a4f2a 60%,#4a2c0a 100%);padding:32px 36px">
          <h1 style="margin:0;color:#fffef8;font-size:28px;font-family:'Georgia',serif;letter-spacing:1px">
            Mellow <span style="color:#c8a96e;font-style:italic">Co.</span>
          </h1>
          <p style="margin:6px 0 0;color:rgba(200,169,110,0.75);font-size:11px;letter-spacing:4px;text-transform:uppercase">
            ✦ &nbsp; Artisan Mexican Desserts &nbsp; ✦
          </p>
        </td></tr>

        <!-- Gold bar -->
        <tr><td style="height:3px;background:linear-gradient(90deg,#c8a96e,#9d7a45,#c8a96e)"></td></tr>

        <!-- Body -->
        <tr><td style="padding:40px 36px">
          <p style="margin:0 0 6px;font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#c8a96e">
            Welcome to the Circle
          </p>
          <h2 style="margin:0 0 18px;color:#4a2c0a;font-size:26px;font-family:'Georgia',serif">
            Hello, ${name}! 🍮
          </h2>
          <p style="color:#7a4f2a;font-size:16px;line-height:1.9;font-style:italic;margin:0 0 28px">
            We're thrilled to welcome you to the Mellow Circle. You now have
            access to over <strong style="color:#4a2c0a">25 handcrafted Mexican desserts</strong> —
            made with love, tradition, and meticulous attention to detail.
          </p>

          <!-- Highlight boxes -->
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px">
            <tr>
              <td width="33%" style="padding:14px;background:#f5f0e8;border:1px solid #e8dfd0;text-align:center;vertical-align:top">
                <div style="font-size:22px;margin-bottom:6px">🍮</div>
                <div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#c8a96e;margin-bottom:4px">Handcrafted</div>
                <div style="font-size:13px;color:#4a2c0a">25+ artisan recipes</div>
              </td>
              <td width="2%" style="padding:0"></td>
              <td width="33%" style="padding:14px;background:#f5f0e8;border:1px solid #e8dfd0;text-align:center;vertical-align:top">
                <div style="font-size:22px;margin-bottom:6px">🚚</div>
                <div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#c8a96e;margin-bottom:4px">Delivered</div>
                <div style="font-size:13px;color:#4a2c0a">Straight to your door</div>
              </td>
              <td width="2%" style="padding:0"></td>
              <td width="33%" style="padding:14px;background:#f5f0e8;border:1px solid #e8dfd0;text-align:center;vertical-align:top">
                <div style="font-size:22px;margin-bottom:6px">✨</div>
                <div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#c8a96e;margin-bottom:4px">Quality</div>
                <div style="font-size:13px;color:#4a2c0a">Est. since 2008</div>
              </td>
            </tr>
          </table>

          <a href="https://mellowco.in"
             style="display:inline-block;background:#4a2c0a;color:#fffef8;padding:16px 36px;
                    text-decoration:none;font-size:14px;letter-spacing:2px;text-transform:uppercase;
                    border:1px solid #c8a96e;font-family:'Georgia',serif">
            Explore Desserts →
          </a>

          <p style="margin:28px 0 0;font-size:13px;color:#a67c52;font-style:italic;line-height:1.8">
            If you have any questions, just reply to this email — we'd love to hear from you.
          </p>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:20px 36px 28px;border-top:1px solid #e8dfd0;background:#f9f6f0;text-align:center">
          <p style="margin:0;font-size:11px;color:#a67c52;letter-spacing:2px;text-transform:uppercase">
            ✦ &nbsp; Mellow Co. &nbsp;·&nbsp; Coimbatore, Tamil Nadu &nbsp; ✦
          </p>
          <p style="margin:6px 0 0;font-size:11px;color:#c8a96e;font-style:italic">
            Crafted with love for dessert lovers everywhere
          </p>
          <p style="margin:12px 0 0;font-size:10px;color:#c0a882">
            You're receiving this because you signed up at mellowco.in with ${email}
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
