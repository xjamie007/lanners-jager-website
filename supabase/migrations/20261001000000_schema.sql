-- ─────────────────────────────────────────────────────────────────────────────
-- Lanners & Jager: Datenmodell (Briefing D10.3)
-- RLS ist überall aktiv, es gibt KEINE Policies: Keine Tabelle ist für anon oder
-- authenticated lesbar. Alles läuft über die Edge Functions (Rolle postgres).
-- Preise als numeric(10,2) wie in SoftTouch; der Code rechnet in Cent.
-- ─────────────────────────────────────────────────────────────────────────────

-- Stammdaten, nachts gespiegelt (je SoftTouch-Konto)
create table if not exists st_stores (
  account text not null,
  key text not null,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (account, key)
);
create table if not exists st_brands (like st_stores including all);
create table if not exists st_categories (like st_stores including all);
create table if not exists st_colors (like st_stores including all);
create table if not exists st_seasons (like st_stores including all);
create table if not exists st_size_tables (like st_stores including all);
create table if not exists st_file_presets (like st_stores including all);
create table if not exists st_text_presets (like st_stores including all);
create table if not exists st_wash_instructions (like st_stores including all);

-- Ein Artikel in einer Farbe = eine Produktseite
create table if not exists articles (
  uid8 text primary key check (uid8 ~ '^\d{8}$'),
  id6 text not null,
  variant int not null,
  account text not null,
  brand_id text not null,
  season_id text,
  cat1 text, cat2 text, cat3 text, cat4 text, cat5 text, cat6 text, cat7 text,
  detail1 text not null default '',
  detail2 text not null default '',
  detail3 text not null default '',
  detail4 text not null default '',
  detail5 text not null default '',
  description1 text not null default '',
  color_id text,
  colorbrand text not null default '',
  size_table_id text,
  online boolean not null default true,
  status text not null default 'A',
  in_the_picture boolean not null default false,
  online_sort int,
  first_delivery date,
  last_delivery date,
  expected_delivery date,
  related text[] not null default '{}',
  wash_instructions int[] not null default '{}',
  slug jsonb not null default '{}',
  online_since timestamptz,
  offline_since timestamptz,
  st_timestamp text,
  updated_at timestamptz not null default now()
);
create index if not exists articles_online_idx on articles (online, offline_since);

-- Ein Schlüssel = Artikel × Farbe × Größe × Filiale
create table if not exists skus (
  key14 text primary key check (key14 ~ '^\d{14}$'),
  uid8 text not null references articles (uid8) on delete cascade,
  size_x text not null,
  size_y text not null,
  size_x_label text not null default '',
  size_y_label text not null default '',
  store_id text not null,
  house_id text not null check (house_id in ('lanners', 'jager')),
  stock int not null default 0,
  backorder int not null default 0,
  price numeric(10, 2) not null,
  netto_price numeric(10, 2) not null,
  discount_percentage numeric(5, 2) not null default 0,
  vat numeric(5, 2) not null default 0,
  edi text not null default '',
  updated_at timestamptz not null default now()
);
create index if not exists skus_uid8_idx on skus (uid8);

create table if not exists article_texts (
  id bigint generated always as identity primary key,
  uid8 text not null references articles (uid8) on delete cascade,
  type text not null,
  lang text,
  kind text,
  sort int not null default 1,
  text text not null
);
create index if not exists article_texts_uid8_idx on article_texts (uid8);

create table if not exists article_files (
  id bigint generated always as identity primary key,
  uid8 text not null references articles (uid8) on delete cascade,
  type text not null,
  variant int not null default 0,
  sort int not null default 1,
  filename text not null,
  role text not null default 'extra',
  fit text not null default 'contain',
  storage_path text,
  width int,
  height int,
  sha256 text
);
create index if not exists article_files_uid8_idx on article_files (uid8);

-- Täglicher Schnappschuss für die 30-Tage-Angabe (Omnibus)
create table if not exists price_history (
  key14 text not null,
  date date not null,
  netto_price numeric(10, 2) not null,
  primary key (key14, date)
);

-- Halte-Mengen während einer Zahlung (20 Minuten)
create table if not exists holds (
  id bigint generated always as identity primary key,
  key14 text not null,
  qty int not null check (qty > 0),
  order_id uuid not null,
  expires_at timestamptz not null
);
create index if not exists holds_key_idx on holds (key14, expires_at);

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null,
  number text not null unique,
  public_token text not null,
  house_id text not null check (house_id in ('lanners', 'jager')),
  mode text not null check (mode in ('reserve', 'collect', 'ship')),
  status text not null,
  customer jsonb not null,
  items jsonb not null,
  totals jsonb,
  pickup_from date,
  hold_until date,
  payment_provider text,
  payment_id text,
  payment_url text,
  st_customer_id bigint,
  st_delivery_address_id bigint,
  st_reservation_key text,
  lang text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  paid_at timestamptz,
  completed_at timestamptz,
  ready_notified_at timestamptz,
  anonymized_at timestamptz
);
create index if not exists orders_group_idx on orders (group_id);
create index if not exists orders_payment_idx on orders (payment_id);
create index if not exists orders_reservation_idx on orders (st_reservation_key);

-- Aufrufe an SoftTouch oder Mails, die wiederholt werden müssen (D10.5)
create table if not exists outbox (
  id bigint generated always as identity primary key,
  kind text not null,
  payload jsonb not null,
  order_id uuid,
  attempts int not null default 0,
  next_attempt_at timestamptz not null default now(),
  last_error text,
  alerted boolean not null default false,
  created_at timestamptz not null default now(),
  done_at timestamptz,
  failed_at timestamptz
);
create index if not exists outbox_due_idx on outbox (next_attempt_at) where done_at is null and failed_at is null;

-- Live-Bestand, 60 Sekunden zwischengespeichert
create table if not exists stock_cache (
  uid8 text primary key,
  payload jsonb not null,
  fetched_at timestamptz not null default now()
);

create table if not exists sync_runs (
  id bigint generated always as identity primary key,
  kind text not null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  ok boolean,
  pages int not null default 0,
  changes int not null default 0,
  errors jsonb not null default '[]',
  api_calls int not null default 0
);

-- Anfragen aus F4 (Kontakt); "firmen" stammt aus der entfernten Firmenbekleidungs-Seite
create table if not exists requests (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null,
  kind text not null check (kind in ('firmen', 'kontakt')),
  house_id text,
  lang text not null,
  data jsonb not null,
  created_at timestamptz not null default now(),
  anonymized_at timestamptz
);
create index if not exists requests_group_idx on requests (group_id);

-- In der Demo alle Mails, für den Demo-Postausgang (MAIL_MODE=log)
create table if not exists mail_log (
  id uuid primary key default gen_random_uuid(),
  group_id uuid,
  kind text not null,
  to_addr text not null,
  subject text not null,
  text_body text not null,
  html_body text not null,
  lang text not null,
  created_at timestamptz not null default now()
);
create index if not exists mail_log_group_idx on mail_log (group_id);

-- Rate-Limit je gehashter IP und Minute/Stunde (die IP selbst wird nicht gespeichert)
create table if not exists rate_limits (
  key text not null,
  window_start timestamptz not null,
  count int not null default 0,
  primary key (key, window_start)
);

-- Kleine Zustände: rebuild_needed, last_rebuild_at, Wiederholungen des Abgleichs
create table if not exists app_state (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

-- ── Nur Demo: Zustand des MockSoftTouchClient und des MockPaymentProvider ─────
create table if not exists mock_st_customers (
  id bigint generated always as identity (start with 9001) primary key,
  account text not null,
  data jsonb not null
);
create table if not exists mock_st_delivery_addresses (
  id bigint generated always as identity (start with 501) primary key,
  account text not null,
  data jsonb not null
);
create table if not exists mock_st_reservations (
  key bigint primary key,
  account text not null,
  data jsonb not null,
  created_at timestamptz not null default now()
);
create table if not exists mock_st_messages (
  id bigint generated always as identity primary key,
  account text not null,
  data jsonb not null,
  created_at timestamptz not null default now()
);
-- Bestandsänderungen gegenüber den Fixtures (Reservierungen, Verkäufe im Laden)
create table if not exists mock_st_stock_adjust (
  key14 text primary key,
  delta int not null default 0,
  updated_at timestamptz not null default now()
);
create table if not exists mock_payments (
  id text primary key,
  order_id uuid not null,
  amount_cents int not null,
  description text not null,
  status text not null default 'open',
  redirect_url text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- RLS überall an, keine Policies
do $$
declare t text;
begin
  foreach t in array array[
    'st_stores','st_brands','st_categories','st_colors','st_seasons','st_size_tables','st_file_presets','st_text_presets','st_wash_instructions',
    'articles','skus','article_texts','article_files','price_history','holds','orders','outbox','stock_cache','sync_runs','requests','mail_log',
    'rate_limits','app_state','mock_st_customers','mock_st_delivery_addresses','mock_st_reservations','mock_st_messages','mock_st_stock_adjust','mock_payments'
  ] loop
    execute format('alter table %I enable row level security', t);
  end loop;
end $$;
