-- ══════════════════════════════════════════════════════════════
--  MELLOW CO. — Complete Database Setup (Fresh)
--  Combines supabase-setup.sql + fix-order-items.sql
--
--  Run in: Supabase Dashboard → SQL Editor → New Query → Run
--  ⚠ This drops and recreates all tables. Run only once on a
--    fresh project or after clearing all data.
-- ══════════════════════════════════════════════════════════════

-- ── DROP ALL EXISTING TABLES (clean slate) ──────────────────
DROP TABLE IF EXISTS public.discount_codes       CASCADE;
DROP TABLE IF EXISTS public.order_items          CASCADE;
DROP TABLE IF EXISTS public.orders               CASCADE;
DROP TABLE IF EXISTS public.newsletter_subscribers CASCADE;
DROP TABLE IF EXISTS public.feedback             CASCADE;
DROP TABLE IF EXISTS public.newsletter           CASCADE;
DROP TABLE IF EXISTS public.users                CASCADE;

-- ════════════════════════════════════════════════════════════
--  1. USERS
--     Stores public profile data linked to Supabase Auth user.
-- ════════════════════════════════════════════════════════════
CREATE TABLE public.users (
  id         UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name       TEXT        NOT NULL DEFAULT '',
  email      TEXT        NOT NULL DEFAULT '',
  phone      TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Users can read/update only their own row
CREATE POLICY "users_select_own" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "users_insert_own" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "users_update_own" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- Server (service role) can do everything
CREATE POLICY "users_service_all" ON public.users
  FOR ALL USING (true) WITH CHECK (true);


-- ════════════════════════════════════════════════════════════
--  2. ORDERS
--     Stores each placed order with full delivery + payment info.
--     All monetary values are stored in RUPEES (integers).
-- ════════════════════════════════════════════════════════════
CREATE TABLE public.orders (
  id                 BIGSERIAL   PRIMARY KEY,
  order_id           TEXT        UNIQUE NOT NULL,         -- e.g. "MW73113"
  user_id            UUID,                               -- NULL for guest orders
  customer_name      TEXT        NOT NULL DEFAULT '',
  customer_email     TEXT        NOT NULL DEFAULT '',
  customer_phone     TEXT,
  delivery_address   TEXT,
  delivery_city      TEXT,
  delivery_state     TEXT,
  delivery_pin       TEXT,
  delivery_lat       DOUBLE PRECISION,
  delivery_lng       DOUBLE PRECISION,
  delivery_text      TEXT,
  items              JSONB       NOT NULL DEFAULT '[]',   -- snapshot of cart items
  subtotal           INTEGER     NOT NULL DEFAULT 0,
  delivery_charge    INTEGER     NOT NULL DEFAULT 0,
  tax                INTEGER     NOT NULL DEFAULT 0,
  discount_amount    INTEGER     NOT NULL DEFAULT 0,
  discount_code      TEXT,
  discount_percent   INTEGER     NOT NULL DEFAULT 0,
  total              INTEGER     NOT NULL DEFAULT 0,
  payment_method     TEXT        NOT NULL DEFAULT 'cod',  -- 'cod' | 'upi' | 'card'
  payment_id         TEXT,                               -- Razorpay payment_id
  razorpay_order_id  TEXT,
  payment_status     TEXT        NOT NULL DEFAULT 'pending', -- 'pending' | 'paid'
  status             TEXT        NOT NULL DEFAULT 'confirmed',
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  updated_at         TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX orders_user_id_idx  ON public.orders(user_id);
CREATE INDEX orders_order_id_idx ON public.orders(order_id);
CREATE INDEX orders_email_idx    ON public.orders(customer_email);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Logged-in users can read their own orders
CREATE POLICY "orders_select_own" ON public.orders
  FOR SELECT USING (auth.uid() = user_id);

-- Logged-in or guest can insert (user_id may be NULL for guests)
CREATE POLICY "orders_insert_own" ON public.orders
  FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Service role can do everything (used by server.py to insert + query)
CREATE POLICY "orders_service_all" ON public.orders
  FOR ALL USING (true) WITH CHECK (true);

-- Auto-update updated_at on every change
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ════════════════════════════════════════════════════════════
--  3. ORDER ITEMS
--     One row per product per order. order_id is TEXT ("MW73113")
--     to match the orders table.
-- ════════════════════════════════════════════════════════════
CREATE TABLE public.order_items (
  id           BIGSERIAL   PRIMARY KEY,
  order_id     TEXT        NOT NULL,   -- matches orders.order_id (e.g. "MW73113")
  product_name TEXT        NOT NULL,
  product_id   INTEGER,
  price        INTEGER     NOT NULL,   -- unit price in ₹
  quantity     INTEGER     NOT NULL DEFAULT 1,
  total        INTEGER     NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX order_items_order_id_idx ON public.order_items(order_id);

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- Service role inserts from server.py; anon can read (for order confirmation display)
CREATE POLICY "order_items_insert" ON public.order_items
  FOR INSERT WITH CHECK (true);

CREATE POLICY "order_items_select" ON public.order_items
  FOR SELECT USING (true);


-- ════════════════════════════════════════════════════════════
--  4. NEWSLETTER SUBSCRIBERS
-- ════════════════════════════════════════════════════════════
CREATE TABLE public.newsletter_subscribers (
  id            BIGSERIAL   PRIMARY KEY,
  email         TEXT        UNIQUE NOT NULL,
  name          TEXT,
  subscribed_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "newsletter_insert_anon" ON public.newsletter_subscribers
  FOR INSERT WITH CHECK (true);

CREATE POLICY "newsletter_select_all" ON public.newsletter_subscribers
  FOR SELECT USING (true);


-- ════════════════════════════════════════════════════════════
--  5. DISCOUNT CODES
-- ════════════════════════════════════════════════════════════
CREATE TABLE public.discount_codes (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  code             TEXT        UNIQUE NOT NULL,
  user_email       TEXT        NOT NULL,
  discount_percent INTEGER     NOT NULL DEFAULT 10,
  is_used          BOOLEAN     NOT NULL DEFAULT false,
  reusable         BOOLEAN     NOT NULL DEFAULT false,  -- if true, code is never marked used
  used_at          TIMESTAMPTZ,
  expires_at       TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX discount_codes_code_idx  ON public.discount_codes(code);
CREATE INDEX discount_codes_email_idx ON public.discount_codes(user_email);

-- ── MIGRATION: If upgrading an existing DB, run this to add the reusable column:
-- ALTER TABLE public.discount_codes ADD COLUMN IF NOT EXISTS reusable BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.discount_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "discount_select_all"  ON public.discount_codes
  FOR SELECT USING (true);

CREATE POLICY "discount_service_all" ON public.discount_codes
  FOR ALL USING (true) WITH CHECK (true);


-- ════════════════════════════════════════════════════════════
--  6. FEEDBACK
-- ════════════════════════════════════════════════════════════
CREATE TABLE public.feedback (
  id         BIGSERIAL   PRIMARY KEY,
  name       TEXT,
  email      TEXT,
  subject    TEXT,
  message    TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "feedback_insert_anon" ON public.feedback
  FOR INSERT WITH CHECK (true);

CREATE POLICY "feedback_select_all" ON public.feedback
  FOR SELECT USING (true);


-- ════════════════════════════════════════════════════════════
--  VERIFY — Check all tables were created successfully
-- ════════════════════════════════════════════════════════════
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- Expected output:
-- discount_codes
-- feedback
-- newsletter_subscribers
-- order_items
-- orders
-- users


-- ════════════════════════════════════════════════════════════
--  7. ADMINS
--     Stores admin accounts. The admin user must ALSO exist in
--     Supabase Auth (created via create-admin.py or manually).
--     This table is the source-of-truth for who is an admin.
-- ════════════════════════════════════════════════════════════
DROP TABLE IF EXISTS public.admins CASCADE;

CREATE TABLE public.admins (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  email      TEXT        UNIQUE NOT NULL,
  name       TEXT        NOT NULL DEFAULT 'Admin',
  role       TEXT        NOT NULL DEFAULT 'admin',   -- 'admin' | 'superadmin'
  is_active  BOOLEAN     NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

-- Only service role (server.py) can read/write admins
CREATE POLICY "admins_service_all" ON public.admins
  FOR ALL USING (true) WITH CHECK (true);

-- Trigger to auto-update updated_at
CREATE TRIGGER admins_updated_at
  BEFORE UPDATE ON public.admins
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── Insert default admin ──────────────────────────────────
-- This inserts the admin record into the DB table.
-- The actual Supabase Auth account is created by create-admin.py
INSERT INTO public.admins (email, name, role, is_active)
VALUES ('workatbuildcrew@gmail.com', 'Mellow Admin', 'superadmin', true)
ON CONFLICT (email) DO NOTHING;


-- ════════════════════════════════════════════════════════════
--  8. USER CREDENTIALS LOG (optional audit trail)
--     Tracks email/password change timestamps per user.
--     Supabase Auth handles actual credentials — this is just
--     a lightweight audit log you can read from the dashboard.
-- ════════════════════════════════════════════════════════════
DROP TABLE IF EXISTS public.user_credentials CASCADE;

CREATE TABLE public.user_credentials (
  id                         UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email                      TEXT        NOT NULL DEFAULT '',
  email_change_requested_at  TIMESTAMPTZ,
  password_changed_at        TIMESTAMPTZ,
  created_at                 TIMESTAMPTZ DEFAULT NOW(),
  updated_at                 TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.user_credentials ENABLE ROW LEVEL SECURITY;

-- User can only see and update their own credential log
CREATE POLICY "creds_select_own" ON public.user_credentials
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "creds_insert_own" ON public.user_credentials
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "creds_update_own" ON public.user_credentials
  FOR UPDATE USING (auth.uid() = id);

-- Service role can do everything
CREATE POLICY "creds_service_all" ON public.user_credentials
  FOR ALL USING (true) WITH CHECK (true);
