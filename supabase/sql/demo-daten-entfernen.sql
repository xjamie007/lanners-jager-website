-- ─────────────────────────────────────────────────────────────────────────────
-- Demo-Daten entfernen, bevor PUBLIC_DEMO=false gesetzt wird (README: Von Mock auf echt).
-- Demo-Artikel (detail5 = 'DEMO') dürfen nie in eine Produktivumgebung; der Build
-- bricht sonst ab. Im SQL-Editor von Supabase ausführen, NACHDEM der erste
-- Abgleich mit echten SoftTouch-Daten gelaufen ist.
-- ─────────────────────────────────────────────────────────────────────────────
begin;

-- Artikel der Demo samt Schlüsseln, Texten und Fotos (on delete cascade)
delete from articles where detail5 = 'DEMO';
delete from price_history where key14 not in (select key14 from skus);
delete from stock_cache;

-- Bestellungen, Anfragen und Mails aus der Demo
truncate orders, holds, outbox, requests, mail_log;

-- Zustand des Mock-Kassensystems und der Mock-Zahlung
truncate mock_st_customers, mock_st_delivery_addresses, mock_st_reservations, mock_st_messages, mock_st_stock_adjust, mock_payments;

commit;
