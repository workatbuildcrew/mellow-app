/* ══════════════════════════════════════════════
   MELLOW CO. — auth.js
   Complete Authentication System
   ── Fixes all errors from original code ──
   ══════════════════════════════════════════════

   ROOT CAUSE FIXES:
   1. ❌ "supabase already declared" → 'client' was declared in app.js,
      auth.js reuses that same 'client' variable — no redeclaration.
   2. ❌ "handleSignup not defined" → Functions now defined before they're called.
   3. ❌ "Nothing happens on click" → Functions attached correctly, no JS crash.
   4. ❌ Login page disappears → Auth is a MODAL, not replacing main content.
   5. ❌ signUp() called undefined 'supabase' → Now uses 'client' from app.js.
   6. ❌ No profile insert after signup → Handled with proper error check.
*/

/* ══════════════════════════════════════════════
   AUTH STATE
   ══════════════════════════════════════════════ */
const AUTH = {
  currentTab:    'login',   // 'login' | 'signup'
  loading:       false,
  successState:  null,      // null | 'login' | 'signup' | 'reset'
  showLoginPw:   false,
  showSignupPw:  false,
  showConfirmPw: false,
  dropdownOpen:  false,
  // Current logged-in user (populated on session restore)
  user: null,
  profile: null,            // row from 'users' table
};

/* ══════════════════════════════════════════════
   MODAL OPEN / CLOSE
   ══════════════════════════════════════════════ */
function openAuth(tab = 'login') {
  AUTH.successState = null;
  AUTH.loading      = false;
  switchAuthTab(tab, false);
  document.getElementById('auth-overlay').classList.add('open');
  // Trap focus after transition
  setTimeout(() => {
    const first = document.querySelector('#auth-body input');
    if (first) first.focus();
  }, 350);
}

function closeAuth() {
  document.getElementById('auth-overlay').classList.remove('open');
  AUTH.dropdownOpen = false;
}

function handleAuthOverlayClick(e) {
  // Close only if clicking the backdrop itself, not the card
  if (e.target === document.getElementById('auth-overlay')) closeAuth();
}

/* ══════════════════════════════════════════════
   TAB SWITCH
   ══════════════════════════════════════════════ */
function switchAuthTab(tab, resetSuccess = true) {
  AUTH.currentTab = tab;
  if (resetSuccess) AUTH.successState = null;
  AUTH.loading = false;

  // Update tab button styles
  document.getElementById('tab-login') .classList.toggle('active', tab === 'login');
  document.getElementById('tab-signup').classList.toggle('active', tab === 'signup');

  // Render correct form
  const body = document.getElementById('auth-body');
  if (body) body.innerHTML = tab === 'login' ? buildLoginForm() : buildSignupForm();
}

/* ══════════════════════════════════════════════
   FORM BUILDERS
   ══════════════════════════════════════════════ */
function buildLoginForm() {
  if (AUTH.successState === 'login') return buildLoginSuccess();
  if (AUTH.successState === 'reset') return buildResetSuccess();

  return `
    <div class="auth-ornament"><span>✦ &nbsp; Welcome Back &nbsp; ✦</span></div>

    <div id="auth-alert-box"></div>

    <div class="auth-field">
      <label class="auth-label" for="li-email">Email Address</label>
      <div class="auth-input-wrap">
        <span class="auth-input-icon">✉</span>
        <input class="auth-input" type="email" id="li-email" placeholder="you@example.com"
               autocomplete="email" oninput="clearAuthAlert()" />
      </div>
      <div class="auth-err" id="li-email-err"></div>
    </div>

    <div class="auth-field">
      <label class="auth-label" for="li-pw">Password</label>
      <div class="auth-input-wrap">
        <span class="auth-input-icon">🔒</span>
        <input class="auth-input" type="${AUTH.showLoginPw ? 'text' : 'password'}"
               id="li-pw" placeholder="Your password"
               autocomplete="current-password"
               onkeydown="if(event.key==='Enter')handleLogin()"
               oninput="clearAuthAlert()" />
        <button class="auth-eye" type="button"
                onclick="AUTH.showLoginPw=!AUTH.showLoginPw;switchAuthTab('login')"
                title="Toggle password">${AUTH.showLoginPw ? '🙈' : '👁'}</button>
      </div>
      <div class="auth-err" id="li-pw-err"></div>
    </div>

    <div class="auth-forgot">
      <button type="button" onclick="handleForgotPassword()">Forgot password?</button>
    </div>

    <button class="auth-submit" id="auth-submit-btn" onclick="handleLogin()"
            ${AUTH.loading ? 'disabled' : ''}>
      ${AUTH.loading
        ? '<span class="auth-spinner"></span> Signing In…'
        : 'Sign In →'}
    </button>

    <div class="auth-switch">
      Don't have an account?
      <button onclick="switchAuthTab('signup')">Create one</button>
    </div>

    <div style="margin-top:0.8rem;padding-top:0.8rem;border-top:1px solid var(--cream-dk,#e8dfd0);text-align:center">
      <button type="button" onclick="window.location.href='admin.html'"
        style="background:none;border:none;font-size:0.78rem;color:var(--brown-lt,#a67c52);letter-spacing:0.05em;cursor:pointer;font-family:inherit;text-decoration:underline;text-underline-offset:3px;opacity:0.7;transition:opacity 0.2s"
        onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.7'">
        🔐 Admin Login
      </button>
    </div>`;
}

function buildSignupForm() {
  if (AUTH.successState === 'signup') return buildSignupSuccess();

  return `
    <div class="auth-ornament"><span>✦ &nbsp; Join the Mellow Circle &nbsp; ✦</span></div>

    <div id="auth-alert-box"></div>

    <div class="auth-row2">
      <div class="auth-field">
        <label class="auth-label" for="su-name">Full Name</label>
        <div class="auth-input-wrap">
          <span class="auth-input-icon">👤</span>
          <input class="auth-input" type="text" id="su-name"
                 placeholder="Your name"
                 autocomplete="name"
                 oninput="clearAuthAlert()" />
        </div>
        <div class="auth-err" id="su-name-err"></div>
      </div>
      <div class="auth-field">
        <label class="auth-label" for="su-phone">Mobile Number</label>
        <div class="auth-input-wrap">
          <span class="auth-input-icon">📱</span>
          <input class="auth-input" type="tel" id="su-phone"
                 placeholder="10-digit number"
                 autocomplete="tel"
                 maxlength="10"
                 oninput="this.value=this.value.replace(/\D/g,'').slice(0,10);clearAuthAlert()" />
        </div>
        <div class="auth-err" id="su-phone-err"></div>
      </div>
    </div>

    <div class="auth-field">
      <label class="auth-label" for="su-email">Email Address</label>
      <div class="auth-input-wrap">
        <span class="auth-input-icon">✉</span>
        <input class="auth-input" type="email" id="su-email"
               placeholder="you@example.com"
               autocomplete="email"
               oninput="clearAuthAlert()" />
      </div>
      <div class="auth-err" id="su-email-err"></div>
    </div>

    <div class="auth-field">
      <label class="auth-label" for="su-pw">Password</label>
      <div class="auth-input-wrap">
        <span class="auth-input-icon">🔒</span>
        <input class="auth-input" type="${AUTH.showSignupPw ? 'text' : 'password'}"
               id="su-pw"
               placeholder="At least 6 characters"
               autocomplete="new-password"
               oninput="updatePwStrength(this.value);clearAuthAlert()" />
        <button class="auth-eye" type="button"
                onclick="AUTH.showSignupPw=!AUTH.showSignupPw;switchAuthTab('signup')">${AUTH.showSignupPw ? '🙈' : '👁'}</button>
      </div>
      <div id="pw-strength-bar" style="height:3px;background:#e8dfd0;margin-top:0.4rem;border-radius:2px;overflow:hidden">
        <div id="pw-strength-fill" style="height:100%;width:0%;transition:width 0.3s,background 0.3s;border-radius:2px"></div>
      </div>
      <div id="pw-strength-label" style="font-size:0.72rem;color:#a67c52;font-style:italic;margin-top:0.2rem"></div>
      <div class="auth-err" id="su-pw-err"></div>
    </div>

    <div class="auth-field">
      <label class="auth-label" for="su-pw2">Confirm Password</label>
      <div class="auth-input-wrap">
        <span class="auth-input-icon">🔒</span>
        <input class="auth-input" type="${AUTH.showConfirmPw ? 'text' : 'password'}"
               id="su-pw2"
               placeholder="Repeat password"
               autocomplete="new-password"
               onkeydown="if(event.key==='Enter')handleSignup()"
               oninput="clearAuthAlert()" />
        <button class="auth-eye" type="button"
                onclick="AUTH.showConfirmPw=!AUTH.showConfirmPw;switchAuthTab('signup')">${AUTH.showConfirmPw ? '🙈' : '👁'}</button>
      </div>
      <div class="auth-err" id="su-pw2-err"></div>
    </div>

    <div class="auth-check">
      <input type="checkbox" id="su-terms" />
      <label for="su-terms">
        I agree to the
        <a href="#" onclick="openTermsModal('terms');return false" style="color:#9d7a45;text-decoration:underline">Terms &amp; Conditions</a>
        and
        <a href="#" onclick="openTermsModal('privacy');return false" style="color:#9d7a45;text-decoration:underline">Privacy Policy</a>
        of Mellow Co.
      </label>
    </div>

    <button class="auth-submit" id="auth-submit-btn" onclick="handleSignup()"
            ${AUTH.loading ? 'disabled' : ''}>
      ${AUTH.loading
        ? '<span class="auth-spinner"></span> Creating Account…'
        : 'Create Account ✦'}
    </button>

    <div class="auth-switch">
      Already have an account?
      <button onclick="switchAuthTab('login')">Sign in</button>
    </div>`;
}

/* ── Success screens ── */
function buildLoginSuccess() {
  return `
    <div class="auth-success">
      <div class="auth-success-icon">🍮</div>
      <div class="auth-success-title">Welcome back!</div>
      <p class="auth-success-sub">
        You're now signed in as<br/>
        <strong>${AUTH.user ? AUTH.user.email : ''}</strong>
      </p>
      <button class="auth-submit" style="margin-top:1.5rem" onclick="closeAuth()">
        Continue Shopping →
      </button>
    </div>`;
}

function buildSignupSuccess() {
  return `
    <div class="auth-success">
      <div class="auth-success-icon">✉️</div>
      <div class="auth-success-title">Check your inbox!</div>
      <p class="auth-success-sub">
        We've sent a confirmation email.<br/>
        Please verify your address to complete signup.
      </p>
      <div class="auth-alert info" style="margin-top:1.2rem;text-align:left">
        ✦ &nbsp; After confirming your email, come back and sign in to start enjoying Mellow Co.
      </div>
      <button class="auth-submit" style="margin-top:1rem" onclick="switchAuthTab('login')">
        Go to Sign In →
      </button>
    </div>`;
}

function buildResetSuccess() {
  return `
    <div class="auth-success">
      <div class="auth-success-icon">📬</div>
      <div class="auth-success-title">Reset email sent!</div>
      <p class="auth-success-sub">
        Check your inbox for a password reset link.
      </p>
      <button class="auth-submit" style="margin-top:1.5rem" onclick="switchAuthTab('login')">
        Back to Sign In
      </button>
    </div>`;
}

/* ══════════════════════════════════════════════
   VALIDATION HELPERS
   ══════════════════════════════════════════════ */
function setFieldError(id, msg) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = msg;
  const inp = el.previousElementSibling && el.previousElementSibling.querySelector
    ? el.previousElementSibling.querySelector('input')
    : null;
  if (inp) inp.classList.toggle('error', !!msg);
}

function clearAllErrors() {
  document.querySelectorAll('.auth-err').forEach(el => { el.textContent = ''; });
  document.querySelectorAll('.auth-input.error').forEach(el => el.classList.remove('error'));
}

function showAuthAlert(msg, type = 'error') {
  const box = document.getElementById('auth-alert-box');
  if (!box) return;
  box.innerHTML = `<div class="auth-alert ${type}">${msg}</div>`;
}

function clearAuthAlert() {
  const box = document.getElementById('auth-alert-box');
  if (box) box.innerHTML = '';
}

function setLoading(state) {
  AUTH.loading = state;
  const btn = document.getElementById('auth-submit-btn');
  if (!btn) return;
  btn.disabled = state;
  if (state) {
    const label = AUTH.currentTab === 'login' ? 'Signing In…' : 'Creating Account…';
    btn.innerHTML = `<span class="auth-spinner"></span> ${label}`;
  } else {
    btn.innerHTML = AUTH.currentTab === 'login' ? 'Sign In →' : 'Create Account ✦';
  }
}

/* ── Password strength meter ── */
function updatePwStrength(pw) {
  const bar   = document.getElementById('pw-strength-fill');
  const label = document.getElementById('pw-strength-label');
  if (!bar || !label) return;
  let score = 0;
  if (pw.length >= 6)  score++;
  if (pw.length >= 10) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  const levels = [
    { pct: '0%',   color: '#e8dfd0', text: '' },
    { pct: '25%',  color: '#8b1a1a', text: 'Weak' },
    { pct: '50%',  color: '#c8a96e', text: 'Fair' },
    { pct: '75%',  color: '#9d7a45', text: 'Good' },
    { pct: '90%',  color: '#2d7a4a', text: 'Strong' },
    { pct: '100%', color: '#1a5c35', text: 'Excellent' },
  ];
  const lvl = levels[Math.min(score, 5)];
  bar.style.width      = lvl.pct;
  bar.style.background = lvl.color;
  label.textContent    = lvl.text;
  label.style.color    = lvl.color;
}

/* ══════════════════════════════════════════════
   HANDLE LOGIN
   ══════════════════════════════════════════════ */
async function handleLogin() {
  clearAllErrors();
  clearAuthAlert();

  const email    = (document.getElementById('li-email')?.value || '').trim();
  const password = (document.getElementById('li-pw')?.value    || '');

  // Client-side validation
  let valid = true;
  if (!email.match(/^[^@]+@[^@]+\.[^@]+$/)) {
    setFieldError('li-email-err', 'Please enter a valid email address');
    valid = false;
  }
  if (password.length < 6) {
    setFieldError('li-pw-err', 'Password must be at least 6 characters');
    valid = false;
  }
  if (!valid) return;

  setLoading(true);

  try {
    // ✅ FIX: uses 'client' declared in app.js — no redeclaration
    const { data, error } = await client.auth.signInWithPassword({ email, password });

    if (error) {
      // Map Supabase error messages to friendly text
      const msg = mapAuthError(error.message);
      showAuthAlert(msg);
      setLoading(false);
      return;
    }

    // ✅ Store user in AUTH state
    AUTH.user = data.user;

    // Fetch user profile from users table
    await fetchUserProfile(data.user.id);

    AUTH.successState = 'login';
    AUTH.loading = false;
    switchAuthTab('login', false);

    // Re-render nav to show user pill
    renderNav();

    showToast('✦ Welcome back to Mellow Co.!');

    // Auto-close modal after 1.8s
    setTimeout(() => closeAuth(), 1800);

  } catch (err) {
    showAuthAlert('Something went wrong. Please try again.');
    setLoading(false);
  }
}

/* ══════════════════════════════════════════════
   HANDLE SIGNUP
   ══════════════════════════════════════════════ */
async function handleSignup() {
  clearAllErrors();
  clearAuthAlert();

  const name    = (document.getElementById('su-name')?.value  || '').trim();
  const phone   = (document.getElementById('su-phone')?.value || '').trim();
  const email   = (document.getElementById('su-email')?.value || '').trim();
  const pw      = (document.getElementById('su-pw')?.value    || '');
  const pw2     = (document.getElementById('su-pw2')?.value   || '');
  const terms   =  document.getElementById('su-terms')?.checked;

  // ── Validation ──
  let valid = true;

  if (!name) {
    setFieldError('su-name-err', 'Full name is required');
    valid = false;
  }

  if (!phone.match(/^[6-9]\d{9}$/)) {
    setFieldError('su-phone-err', 'Enter a valid 10-digit Indian mobile number');
    valid = false;
  }

  if (!email.match(/^[^@]+@[^@]+\.[^@]+$/)) {
    setFieldError('su-email-err', 'Enter a valid email address');
    valid = false;
  }

  if (pw.length < 6) {
    setFieldError('su-pw-err', 'Password must be at least 6 characters');
    valid = false;
  }

  if (pw !== pw2) {
    setFieldError('su-pw2-err', 'Passwords do not match');
    valid = false;
  }

  if (!terms) {
    showAuthAlert('Please accept the Terms of Service to continue', 'error');
    valid = false;
  }

  if (!valid) return;

  setLoading(true);

  try {
    // ── STEP 1: Create auth user ──
    // ✅ FIX: uses 'client' (from app.js), not 'supabase' (undefined here)
    const { data, error } = await client.auth.signUp({ email, password: pw });

    if (error) {
      showAuthAlert(mapAuthError(error.message));
      setLoading(false);
      return;
    }

    // data.user might be null if email confirmation required
    const userId = data.user?.id;

    if (userId) {
      // ── STEP 2: Insert profile row ──
      // ✅ FIX: Only insert if we actually have a user id
      const { error: profileError } = await client
        .from('users')
        .insert([{
          id:    userId,
          name:  name,
          email: email,
          phone: phone,
        }]);

      // Profile insert failure is non-fatal (auth still succeeded)
      if (profileError) {
        console.warn('Profile insert failed:', profileError.message);
        // If it's a "duplicate" error (user re-signed up), ignore
        if (!profileError.message.includes('duplicate')) {
          showAuthAlert(
            '⚠ Account created but profile save failed. You can still sign in.',
            'info'
          );
        }
      }

      AUTH.user = data.user;
    }

    // ── STEP 3: Fire welcome email (payment.js handles it) ──
    document.dispatchEvent(new CustomEvent("mellow:signup-success", { detail: { name, email } }));

    // ── STEP 4: Show success ──
    AUTH.successState = 'signup';
    AUTH.loading = false;
    switchAuthTab('signup', false);

    showToast('✦ Account created! Please check your email.');

  } catch (err) {
    console.error('Signup error:', err);
    showAuthAlert('Something went wrong. Please try again.');
    setLoading(false);
  }
}

/* ══════════════════════════════════════════════
   FORGOT PASSWORD
   ══════════════════════════════════════════════ */
async function handleForgotPassword() {
  const email = (document.getElementById('li-email')?.value || '').trim();

  if (!email.match(/^[^@]+@[^@]+\.[^@]+$/)) {
    setFieldError('li-email-err', 'Enter your email above first');
    return;
  }

  clearAuthAlert();
  setLoading(true);

  try {
    const { error } = await client.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    });

    if (error) {
      showAuthAlert(mapAuthError(error.message));
      setLoading(false);
      return;
    }

    AUTH.successState = 'reset';
    AUTH.loading = false;
    switchAuthTab('login', false);

  } catch {
    showAuthAlert('Could not send reset email. Please try again.');
    setLoading(false);
  }
}

/* ══════════════════════════════════════════════
   LOGOUT
   ══════════════════════════════════════════════ */
async function handleLogout() {
  AUTH.dropdownOpen = false;
  await client.auth.signOut();
  AUTH.user    = null;
  AUTH.profile = null;
  renderNav();
  showToast('✦ You have been signed out.');
  // Redirect to home
  navigate('home');
}

/* ══════════════════════════════════════════════
   USER DROPDOWN (in nav)
   ══════════════════════════════════════════════ */
function toggleUserDropdown() {
  AUTH.dropdownOpen = !AUTH.dropdownOpen;
  const dd = document.getElementById('user-dropdown');
  if (dd) dd.classList.toggle('open', AUTH.dropdownOpen);
}

// Close dropdown on outside click
document.addEventListener('click', e => {
  if (AUTH.dropdownOpen && !e.target.closest('.nav-user-pill') && !e.target.closest('#user-dropdown')) {
    AUTH.dropdownOpen = false;
    const dd = document.getElementById('user-dropdown');
    if (dd) dd.classList.remove('open');
  }
});

/* ══════════════════════════════════════════════
   NAV USER SECTION (injected into buildNav)
   ══════════════════════════════════════════════ */
function buildNavUserSection() {
  if (!AUTH.user) {
    // Not logged in → show Sign In button
    return `
      <button class="btn-support" onclick="openAuth('login')" style="background:transparent;color:var(--brown);border:1px solid var(--gold);padding:0.45rem 1rem;margin-right:0.2rem">
        Sign In
      </button>`;
  }

  // Logged in → show user pill with dropdown
  const displayName = AUTH.profile?.name || AUTH.user.email.split('@')[0];
  const initials    = displayName.slice(0, 2).toUpperCase();

  return `
    <div style="position:relative">
      <button class="nav-user-pill" onclick="toggleUserDropdown()">
        <div style="width:24px;height:24px;border-radius:50%;background:var(--gold);color:var(--brown);display:flex;align-items:center;justify-content:center;font-size:0.7rem;font-weight:900;font-family:'Playfair Display',serif;flex-shrink:0">
          ${initials}
        </div>
        <span class="nav-user-dot"></span>
        ${displayName}
        <span style="font-size:0.65rem;color:var(--gold-dk)">▾</span>
      </button>
      <div class="user-dropdown" id="user-dropdown">
        <div class="user-dropdown-name">${displayName}</div>
        <div class="user-dropdown-email">${AUTH.user.email}</div>
        <button class="user-dropdown-item" onclick="openProfilePage('orders');AUTH.dropdownOpen=false;const dd=document.getElementById('user-dropdown');if(dd)dd.classList.remove('open')">🛒 My Orders</button>
        <button class="user-dropdown-item" onclick="openProfilePage('settings');AUTH.dropdownOpen=false;const dd2=document.getElementById('user-dropdown');if(dd2)dd2.classList.remove('open')">⚙ Account Settings</button>
        <button class="user-dropdown-item danger" onclick="handleLogout()">↩ Sign Out</button>
      </div>
    </div>`;
}

/* ══════════════════════════════════════════════
   PROFILE FETCH
   ══════════════════════════════════════════════ */
async function fetchUserProfile(userId) {
  if (!userId) return;
  try {
    const { data, error } = await client
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
    if (!error && data) AUTH.profile = data;
  } catch {
    // Non-fatal — profile may not exist yet
  }
}

/* ══════════════════════════════════════════════
   SESSION RESTORE ON PAGE LOAD
   ══════════════════════════════════════════════ */
async function restoreSession() {
  try {
    const { data: { session } } = await client.auth.getSession();
    if (session?.user) {
      AUTH.user = session.user;
      await fetchUserProfile(session.user.id);
      renderNav(); // Update nav to show user pill
    }
  } catch (err) {
    console.warn('Session restore failed:', err);
  }
}

// Listen for auth state changes (handles email confirmation redirect, etc.)
client.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_IN' && session?.user) {
    AUTH.user = session.user;
    fetchUserProfile(session.user.id).then(() => renderNav());
  }
  if (event === 'SIGNED_OUT') {
    AUTH.user    = null;
    AUTH.profile = null;
    renderNav();
  }
});

/* ══════════════════════════════════════════════
   ERROR MESSAGE MAP
   (translates Supabase errors → friendly text)
   ══════════════════════════════════════════════ */
function mapAuthError(msg) {
  const m = msg.toLowerCase();
  if (m.includes('invalid login') || m.includes('invalid credentials'))
    return 'Incorrect email or password. Please try again.';
  if (m.includes('email not confirmed'))
    return 'Please confirm your email address before signing in.';
  if (m.includes('user already registered') || m.includes('already been registered'))
    return 'An account with this email already exists. Try signing in.';
  if (m.includes('password should be'))
    return 'Password must be at least 6 characters long.';
  if (m.includes('rate limit'))
    return 'Too many attempts. Please wait a few minutes and try again.';
  if (m.includes('email address is invalid'))
    return 'Please enter a valid email address.';
  if (m.includes('network') || m.includes('fetch'))
    return 'Network error. Please check your connection.';
  return msg; // Fall back to original
}

/* ══════════════════════════════════════════════
   PROFILE PAGE NAVIGATION
   ══════════════════════════════════════════════ */
function openProfilePage(view) {
  if (!AUTH.user) { openAuth('login'); return; }
  S.profileView = view || 'orders';
  navigate('profile');
}

/* ══════════════════════════════════════════════
   PATCH buildNav() IN app.js
   We monkey-patch it to inject the auth section
   ══════════════════════════════════════════════ */
(function patchBuildNav() {
  // Wait for app.js to define buildNav, then wrap it
  const originalBuildNav = window.buildNav || buildNav;
  const _original = typeof buildNav === 'function' ? buildNav : null;

  if (_original) {
    // Replace the global buildNav with our patched version
    window.buildNav = function() {
      let html = _original();
      // Inject user section before the cart button
      html = html.replace(
        '<button class="btn-support" onclick="navigate(\'desserts\')">Order Now</button>',
        `${buildNavUserSection()}<button class="btn-support" onclick="navigate('desserts')">Order Now</button>`
      );
      return html;
    };
    // Also reassign in global scope
    buildNav = window.buildNav;
  }
})();

/* ══════════════════════════════════════════════
   KEYBOARD: ESC closes auth modal
   ══════════════════════════════════════════════ */
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    closeAuth();
  }
});



/* ══════════════════════════════════════════════
   TERMS & CONDITIONS / PRIVACY POLICY MODAL
   ══════════════════════════════════════════════ */

const TERMS_CONTENT = {
  terms: {
    title: 'Terms & Conditions',
    icon:  '📜',
    body: `
      <p style="font-size:11px;color:#a67c52;margin:0 0 18px;font-style:italic">Last updated: April 2026 &nbsp;·&nbsp; Effective for all orders placed on mellowco.in</p>

      <h3>1. Acceptance of Terms</h3>
      <p>By creating an account or placing an order on Mellow Co. ("we", "us", "our"), you agree to be bound by these Terms & Conditions. If you do not agree, please do not use our services.</p>

      <h3>2. Products & Pricing</h3>
      <p>All our desserts are handcrafted in small batches. Prices are listed in Indian Rupees (₹) and include applicable taxes. We reserve the right to change prices at any time without prior notice. Prices at the time of order confirmation are final.</p>

      <h3>3. Orders & Payment</h3>
      <p>Orders are confirmed only upon successful payment (UPI/Card) or placement (Cash on Delivery). We accept UPI, debit/credit cards, and Cash on Delivery within our serviceable areas. For COD orders, exact change is appreciated. We reserve the right to cancel any order at our discretion with a full refund.</p>

      <h3>4. Delivery</h3>
      <p>We currently deliver within Coimbatore, Tamil Nadu. Delivery charges apply for orders below ₹999; orders above ₹999 qualify for free delivery. Estimated delivery times are indicative and may vary based on demand and location. We are not responsible for delays caused by incorrect address details provided by the customer.</p>

      <h3>5. Cancellations & Refunds</h3>
      <p>Orders may be cancelled before dispatch by contacting us immediately. Once dispatched, cancellations are not accepted as our products are perishable. If you receive a damaged or incorrect item, contact us within 2 hours of delivery with a photo — we will arrange a replacement or refund at our discretion.</p>

      <h3>6. Food Safety & Allergens</h3>
      <p>Our desserts are made in a kitchen that handles dairy, eggs, wheat, nuts, and other common allergens. We cannot guarantee an allergen-free environment. Customers with severe allergies should exercise caution and contact us before ordering.</p>

      <h3>7. Account Responsibility</h3>
      <p>You are responsible for maintaining the confidentiality of your account credentials. All activities under your account are your responsibility. Notify us immediately of any unauthorised use.</p>

      <h3>8. Discount Codes</h3>
      <p>Discount codes are single-use, non-transferable, and may have expiry dates. Codes cannot be combined with other offers unless explicitly stated. We reserve the right to deactivate codes that are misused or distributed fraudulently.</p>

      <h3>9. Intellectual Property</h3>
      <p>All content on this website — including recipes, images, branding, and copy — is the property of Mellow Co. and may not be reproduced without written permission.</p>

      <h3>10. Limitation of Liability</h3>
      <p>To the fullest extent permitted by law, Mellow Co. shall not be liable for any indirect, incidental, or consequential damages arising from the use of our products or services. Our total liability shall not exceed the value of the order in question.</p>

      <h3>11. Governing Law</h3>
      <p>These terms are governed by the laws of India. Any disputes shall be subject to the exclusive jurisdiction of the courts in Coimbatore, Tamil Nadu.</p>

      <h3>12. Contact</h3>
      <p>For any queries regarding these terms, write to us at <strong>hello@mellowco.in</strong> or visit us at Coimbatore, Tamil Nadu, India.</p>
    `,
  },
  privacy: {
    title: 'Privacy Policy',
    icon:  '🔒',
    body: `
      <p style="font-size:11px;color:#a67c52;margin:0 0 18px;font-style:italic">Last updated: April 2026 &nbsp;·&nbsp; We respect your privacy and are committed to protecting your personal data.</p>

      <h3>1. Information We Collect</h3>
      <p>When you create an account or place an order, we collect: your name, email address, phone number, and delivery address. We also collect payment-related data (transaction IDs — we do not store card or UPI numbers). GPS coordinates may be collected if you use the auto-detect location feature, solely to assist with delivery address filling.</p>

      <h3>2. How We Use Your Information</h3>
      <p>Your data is used to: process and deliver your orders, send order confirmation and transactional emails, generate discount codes for newsletter subscribers, and improve our services. We do not use your data for targeted advertising.</p>

      <h3>3. Data Storage</h3>
      <p>All data is securely stored in Supabase (a GDPR-compliant cloud database provider). Passwords are hashed and never stored in plain text. Payment transactions are processed by Razorpay — we never see or store your full card/UPI details.</p>

      <h3>4. Email Communications</h3>
      <p>By creating an account, you consent to receive transactional emails (order confirmations, welcome emails). If you subscribe to our newsletter, you consent to receiving promotional emails. You may unsubscribe at any time by contacting us.</p>

      <h3>5. Data Sharing</h3>
      <p>We do not sell, trade, or rent your personal information. We share data only with: Razorpay (for payment processing), Supabase (for data storage), and Google/Gmail SMTP (for email delivery). All third parties are bound by their own privacy policies.</p>

      <h3>6. Cookies</h3>
      <p>We use session cookies to maintain your login state. No third-party tracking or advertising cookies are used on our website.</p>

      <h3>7. Your Rights</h3>
      <p>You have the right to: access, correct, or delete your personal data at any time. To exercise these rights, contact us at <strong>hello@mellowco.in</strong>. Account deletion requests are processed within 7 business days.</p>

      <h3>8. Data Retention</h3>
      <p>We retain order data for up to 3 years for legal and tax compliance. Account data is retained until deletion is requested. Newsletter subscriber data is retained until unsubscription.</p>

      <h3>9. Security</h3>
      <p>We implement industry-standard security measures including HTTPS, Row Level Security (RLS) on our database, and hashed passwords. However, no method of transmission over the internet is 100% secure.</p>

      <h3>10. Children's Privacy</h3>
      <p>Our services are not directed to children under 13. We do not knowingly collect personal data from children.</p>

      <h3>11. Changes to This Policy</h3>
      <p>We may update this policy from time to time. Significant changes will be communicated via email or a notice on our website.</p>

      <h3>12. Contact</h3>
      <p>For privacy-related queries, write to us at <strong>hello@mellowco.in</strong>.</p>
    `,
  },
};

function openTermsModal(type) {
  type = type || 'terms';
  var existing = document.getElementById('terms-modal-overlay');
  if (existing) existing.remove();

  var content = TERMS_CONTENT[type];

  var overlay = document.createElement('div');
  overlay.id = 'terms-modal-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(26,15,5,0.72);display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(4px);';

  overlay.innerHTML =
    '<div style="background:#fffef8;max-width:680px;width:100%;max-height:85vh;border:1px solid #e8dfd0;border-top:4px solid #c8a96e;display:flex;flex-direction:column;box-shadow:0 20px 60px rgba(26,15,5,0.4);font-family:Georgia,serif;">' +
      '<div style="background:linear-gradient(135deg,#4a2c0a,#7a4f2a);padding:20px 28px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0">' +
        '<div>' +
          '<div style="font-size:11px;letter-spacing:3px;text-transform:uppercase;color:rgba(200,169,110,0.75);margin-bottom:4px">Mellow Co.</div>' +
          '<h2 style="margin:0;color:#fffef8;font-size:20px;font-family:Georgia,serif">' + content.icon + ' &nbsp; ' + content.title + '</h2>' +
        '</div>' +
        '<button onclick="closeTermsModal()" style="background:rgba(200,169,110,0.15);border:1px solid rgba(200,169,110,0.3);color:#c8a96e;font-size:22px;cursor:pointer;width:36px;height:36px;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-family:sans-serif;line-height:1;">×</button>' +
      '</div>' +
      '<div style="display:flex;border-bottom:1px solid #e8dfd0;flex-shrink:0;background:#faf7f2">' +
        '<button onclick="openTermsModal(\'terms\')" style="flex:1;padding:11px;font-size:12px;letter-spacing:1.5px;text-transform:uppercase;border:none;cursor:pointer;font-family:Georgia,serif;background:' + (type==='terms'?'#4a2c0a':'transparent') + ';color:' + (type==='terms'?'#fffef8':'#7a4f2a') + ';border-bottom:2px solid ' + (type==='terms'?'#c8a96e':'transparent') + ';">📜 Terms &amp; Conditions</button>' +
        '<button onclick="openTermsModal(\'privacy\')" style="flex:1;padding:11px;font-size:12px;letter-spacing:1.5px;text-transform:uppercase;border:none;cursor:pointer;font-family:Georgia,serif;background:' + (type==='privacy'?'#4a2c0a':'transparent') + ';color:' + (type==='privacy'?'#fffef8':'#7a4f2a') + ';border-bottom:2px solid ' + (type==='privacy'?'#c8a96e':'transparent') + ';">🔒 Privacy Policy</button>' +
      '</div>' +
      '<div style="overflow-y:auto;padding:28px 32px;flex:1;font-size:14px;color:#4a2c0a;line-height:1.85;">' +
        '<style>#terms-modal-overlay h3{font-size:12px;letter-spacing:1.5px;text-transform:uppercase;color:#7a4f2a;margin:22px 0 8px;font-family:Georgia,serif;padding-bottom:5px;border-bottom:1px solid #e8dfd0;}#terms-modal-overlay p{margin:0 0 10px;color:#4a2c0a;}</style>' +
        content.body +
      '</div>' +
      '<div style="padding:16px 28px;border-top:1px solid #e8dfd0;display:flex;gap:12px;justify-content:flex-end;flex-shrink:0;background:#faf7f2">' +
        '<button onclick="closeTermsModal()" style="padding:10px 20px;background:transparent;border:1px solid #c8a96e;color:#7a4f2a;cursor:pointer;font-size:13px;font-family:Georgia,serif;">Close</button>' +
        '<button onclick="acceptTermsFromModal()" style="padding:10px 24px;background:#4a2c0a;border:1px solid #c8a96e;color:#fffef8;cursor:pointer;font-size:13px;font-family:Georgia,serif;letter-spacing:1px;">✓ &nbsp; I Accept</button>' +
      '</div>' +
    '</div>';

  overlay.addEventListener('click', function(e) { if (e.target === overlay) closeTermsModal(); });
  document.body.appendChild(overlay);
}

function closeTermsModal() {
  var el = document.getElementById('terms-modal-overlay');
  if (el) {
    el.style.opacity = '0';
    el.style.transition = 'opacity 0.15s';
    setTimeout(function() { if (el.parentNode) el.remove(); }, 150);
  }
}

function acceptTermsFromModal() {
  var cb = document.getElementById('su-terms');
  if (cb) cb.checked = true;
  closeTermsModal();
  var alertBox = document.getElementById('auth-alert-box');
  if (alertBox && alertBox.textContent.includes('Terms')) alertBox.innerHTML = '';
}

/* ══════════════════════════════════════════════
   INIT — restore session on load
   ══════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  restoreSession();
});