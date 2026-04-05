// ═══════════════════════════════════════════════════════════
//  MELLOW CO. — Welcome Email (Signup)
//  In production: routes through /api/send-welcome-email
//  so API keys are never exposed in the browser.
// ═══════════════════════════════════════════════════════════

/**
 * Send a welcome email to a newly registered user.
 * @param {string} name  - User's full name
 * @param {string} email - User's email address
 */
async function sendWelcomeEmail(name, email) {
  if (!name || !email) {
    console.error('sendWelcomeEmail: name and email are required');
    return;
  }

  try {
    const base = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
      ? 'http://localhost:8000'
      : '';
    const res = await fetch(`${base}/api/send-welcome-email`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ name, email }),
    });
    const data = await res.json();
    if (data.ok) {
      console.log(`✅ Welcome email sent to ${email}`);
    } else {
      console.error('Welcome email failed:', data);
    }
    return data;
  } catch (err) {
    console.error('Welcome email request error:', err.message);
    return null;
  }
}
