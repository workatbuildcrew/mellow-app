// ═══════════════════════════════════════════════════════════
//  MELLOW CO. — Order Confirmation Email
//  In production: routes through /api/send-order-email (server-side)
//  so API keys are never exposed in the browser.
// ═══════════════════════════════════════════════════════════

/**
 * Send order confirmation email.
 * In browser: calls /api/send-order-email (Netlify function handles it server-side).
 * @param {object} orderRow - the order data object
 */
async function sendOrderConfirmationEmail(orderRow) {
  const email = orderRow.customer_email;
  if (!email) {
    console.error('No customer_email in order row');
    return null;
  }

  try {
    const base = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
      ? 'http://localhost:8000'
      : '';
    const res = await fetch(`${base}/api/send-order-email`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(orderRow),
    });
    const data = await res.json();
    if (data.ok) {
      console.log(`✅ Order email sent to ${email} | ${orderRow.order_id}`);
    } else {
      console.error('Order email failed:', data);
    }
    return data;
  } catch (err) {
    console.error('Order email request error:', err.message);
    return null;
  }
}

async function sendOrderEmailByOrderId(orderId) {
  try {
    const base = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
      ? 'http://localhost:8000'
      : '';
    const res  = await fetch(`${base}/api/send-order-email`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ order_id: orderId, _lookup: true }),
    });
    return await res.json();
  } catch (err) {
    console.error('sendOrderEmailByOrderId error:', err.message);
    return null;
  }
}
