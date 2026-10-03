# Lanners & Jager, Ettelbruck: Website und Shop

Eine Website mit einem Sortiment für zwei Modehäuser in der Grand-Rue von Ettelbruck:
**Confection Lanners** (Nr. 18) und **Jager-Oberlinkels** (Nr. 32). Besucher sehen je Größe
und Haus, was da ist, und können **reservieren und im Laden anprobieren**, **online bezahlen
und im Haus abholen** oder **online bezahlen und liefern lassen**. Jeder Weg ist ein Feature-Flag.

Der aktuelle Stand ist eine **Demo**: Artikel, Bestände, Kasse, Zahlung und Mails laufen über
Mocks. Auf echte Daten wechselt man nur über Umgebungsvariablen, ohne Code zu ändern
(siehe [Von Mock auf echt](#von-mock-auf-echt)).

- Sprachen: Lëtzebuergesch (Standard, `x-default`, `/` → `/lb/`), Deutsch, Französisch, Englisch
- Was fehlt oder unbestätigt ist, steht sichtbar auf der Seite und in [OFFENE-PUNKTE.md](OFFENE-PUNKTE.md)
- Alle luxemburgischen Texte sind Entwürfe: [docs/lb-review.csv](docs/lb-review.csv) für die Prüfung durch einen Muttersprachler

---

## Inhalt

1. [Schnellstart (lokale Demo)](#schnellstart-lokale-demo)
2. [Aufbau](#aufbau)
3. [Befehle](#befehle)
4. [Inhalte ändern](#inhalte-ändern)
5. [Deployment](#deployment)
6. [Umgebungsvariablen und Secrets](#umgebungsvariablen-und-secrets)
7. [Von Mock auf echt](#von-mock-auf-echt)
8. [Betrieb](#betrieb)
9. [Qualität und Messungen](#qualität-und-messungen)
10. [Abweichungen vom Briefing und vom Nave-Standard](#abweichungen-vom-briefing-und-vom-nave-standard)
11. [Bekannte Grenzen](#bekannte-grenzen)
12. [Google-Profile (G4)](#google-profile-g4)
13. [Lizenzen](#lizenzen)

---

## Schnellstart (lokale Demo)

**Voraussetzungen:** Node 24 oder neuer, [Deno 2](https://deno.com). Kein Docker nötig.

```bash
npm install
cp .env.example .env
npm run demo
```

Danach läuft:

| Was | Adresse |
|---|---|
| Website (Astro, Entwicklungsmodus) | http://127.0.0.1:4321/lb/ |
| Edge Functions lokal (Deno + PGlite) | http://127.0.0.1:54331/functions/v1/… |

`npm run demo -- --neu` beginnt mit leerer Demo-Datenbank (Reservierungen, Bestellungen, Mails,
Zustand der Mock-Kasse). Die Datenbank liegt in `.demo-db/` (nicht im Repository).
In der Claude-App startet die Vorschau „dev“ (`.claude/launch.json`) dieselbe Demo. Beide Ports
sind fest (4321 und 54331), weil die Functions nur `SITE_URL` als Herkunft zulassen.

**Einmal durchspielen:**

1. Eine Größe wählen (Größenleiste mit Bestand je Haus, live aus der Mock-Kasse), zwei Artikel aus verschiedenen Häusern in die Tasche legen.
2. **Reservieren:** ein Formular für beide Häuser. Ergebnis: zwei Reservierungen in der Mock-Kasse, je ein `PRINT RESERVATION`, Mails an Kunde und Häuser.
3. **Bezahlen und abholen / liefern:** je Haus getrennt. Die Demo-Zahlungsseite bietet vier Ausgänge: erfolgreich, erfolgreich aber „inzwischen im Laden verkauft“ (Weg `nachpruefen`), fehlgeschlagen, abgebrochen.
4. **Demo-Postausgang** (Link in der Demo-Leiste): alle Mails dieses Browsers in der Sprache des Kunden; nichts wird verschickt.
5. **Ausfall der Kasse:** `MOCK_FAIL_RATE=1` in `.env`, Demo neu starten. Die Seite bleibt benutzbar, sagt es ehrlich („Live-Bestand gerade nicht erreichbar“, „Das Haus bestätigt Ihnen die Reservierung“); die Outbox trägt nach, sobald die Kasse wieder antwortet (`MOCK_FAIL_RATE=0`).

Nur die Website ohne Functions: `npm run dev` (Live-Bestand und Formulare melden dann, dass sie nicht erreichbar sind).

---

## Aufbau

```
 Browser ──► GitHub Pages: statisches HTML (Astro), Pagefind-Suche, kleine Islands
    │
    │  Live-Bestand, Formulare, Kasse, Status (fetch / normales Formular)
    ▼
 Supabase Edge Functions (Deno) ──► Postgres (Katalog, Bestellungen, Outbox, Mails)
    │            ▲                        ▲
    │            └── pg_cron: Abgleich, Outbox, Rebuild, Aufbewahrung
    ▼
 SoftTouch API (FasMan) · Zahlungsanbieter (Mock / Mollie) · Mail (Log / SMTP)

 GitHub Actions: Astro-Build ◄── catalog-export (Function) ── ausgelöst durch Push,
                 täglich 05:00 Uhr und repository_dispatch "catalog-updated" (Function rebuild)
```

```
src/
  config/        Häuser (NAP, Firmen), Flags, Shop-Einstellungen, Versand, SoftTouch-Zuordnung
  content/       Öffnungszeiten, Warengruppen, Register der offenen Punkte
  i18n/          lb/de/fr/en.json, übersetzte Slugs (routes.ts, static-routes.ts)
  lib/           Katalog (Quelle, Zusammenbau), SEO, Listen, Filterindex, Open-Graph-Bilder
  components/    Größenleiste, Kopf, Fuß, Hero, Karten, Formularteile …
  views/         Seiten (Start, Liste, Produkt, Tasche, Reservieren, Kasse, Danke, Recht …)
  pages/         Router [lang]/[...path].astro, 404, sitemap.xml, robots.txt, Filter- und OG-Endpunkte
  scripts/       Islands im Browser (vanilla TypeScript)
supabase/
  migrations/    Schema (RLS an, keine Policies) und pg_cron-Zeitpläne
  functions/     15 Edge Functions, gemeinsamer Code in _shared/ (generated/ wird aus src kopiert)
  sql/           Hilfs-SQL (Demo-Daten entfernen)
scripts/         Fixtures, Prüfungen (i18n, SEO), Lasttest, lb-review, offene-punkte, Tests
docs/            SoftTouch-API-Doku (Referenz), lb-review.csv
```

Code, den Website und Functions gemeinsam nutzen (Öffnungszeiten-Logik, Formate, Verträge),
liegt in `supabase/functions/_shared/`. Konfiguration und Texte aus `src/` kopiert
`npm run sync-shared` nach `supabase/functions/_shared/generated/` (läuft vor `dev` und `build`;
`npm run check:shared` prüft im CI, dass die Kopie aktuell ist).

---

## Befehle

| Befehl | Was er tut |
|---|---|
| `npm run demo` | Website und Functions lokal starten (`-- --neu`: leere Demo-Datenbank); die Suche ist nach etwa 15 s bereit |
| `npm run dev` / `npm run dev:api` | nur Website / nur Functions |
| `npm run build` | Übersetzungen prüfen, Astro-Build, Pagefind-Index, SEO-Prüfung (`dist/`) |
| `npm run preview` | `dist/` lokal ausliefern |
| `npm test` | Unit-Tests (Node) und Ablauf-Tests der Functions (Deno + PGlite) |
| `npm run check:types` / `check:functions` | TypeScript im Frontend / `deno check` der Functions |
| `npm run check:i18n` / `check:shared` | Übersetzungen vollständig / gemeinsame Dateien aktuell |
| `npm run lb-review` | `docs/lb-review.csv` neu erzeugen |
| `npm run offene-punkte` | `OFFENE-PUNKTE.md` aus dem Register erzeugen |
| `npm run fixtures` / `demo-fotos` | Demo-Katalog im SoftTouch-Format / Strichzeichnungen (SVG) für Artikel ohne Stockfoto neu erzeugen |
| `npm run demo-fotos:aufbereiten -- <ordner>` | Stockfotos der Artikel einheitlich freistellen (nur macOS: Apple Vision über Swift, Python mit Pillow); Liste in `scripts/demo-fotos/fotos.json` |
| `npm run loadtest` | Build mit 3.000 Testartikeln messen (nach `dist-loadtest/`, nie deployt) |

---

## Inhalte ändern

| Was | Wo | Danach |
|---|---|---|
| Texte aller Sprachen | `src/i18n/{lb,de,fr,en}.json`. Jeder Schlüssel in allen vier Sprachen, gleiche Platzhalter; jeder LB-Text als `{ "text": …, "review": "lb-native" }` | `npm run check:i18n`, `npm run lb-review`; committen |
| Öffnungszeiten, Feiertage, Ausnahmen | `src/content/oeffnungszeiten.json` (siehe unten) | `npm run sync-shared`, committen (Website), **Functions neu deployen** (Abholdaten, Mails) |
| Häuser: Name, Adresse, Telefon, Firma | `src/config/houses.ts` (NAP exakt wie im Briefing) | wie Öffnungszeiten |
| Haltedauer, Abholfenster, Mengen, Aufbewahrung | `src/config/shop.ts` | wie Öffnungszeiten |
| Versandländer und -kosten | `src/config/versand.ts` | wie Öffnungszeiten |
| SoftTouch-Kategorien → Abteilung, Warengruppe, Slug | `src/content/warengruppen.json` | committen |
| Text- und Datei-Presets, Anzeigename, Seitengröße | `src/config/softtouch.ts` | wie Öffnungszeiten |
| Offene Punkte | `src/content/offene-punkte.json` (ein Platzhalter auf der Seite: `<Offen op="OP-…" />`) | `npm run offene-punkte` |

**Öffnungszeiten-Ausnahmen** (D9), z. B. Heiligabend kürzer, ein Brückentag zu:

```json
"ausnahmen": [
  { "datum": "2026-12-24", "von": "08:30", "bis": "14:00", "text": { "lb": { "text": "Hellegowend", "review": "lb-native" }, "de": "Heiligabend", "fr": "Veille de Noël", "en": "Christmas Eve" } },
  { "datum": "2026-12-26", "geschlossen": true }
]
```

Reihenfolge: Ausnahme vor Feiertag vor regulär. Feiertage stehen je Haus unter `feiertage.tage`
(`geschlossen: true|false`). Die Tabelle markiert „heute“ im Browser (Zeitzone Luxemburg), die
Hausseiten zeigen die nächsten Feiertage und Ausnahmen, das JSON-LD enthält sie für 90 Tage.
Die Seite baut täglich um 05:00 Uhr neu; eine Änderung erscheint sofort nach dem Push.

---

## Deployment

Noch nichts ist deployt: kein Supabase-Projekt, kein GitHub-Repository, keine Domain
(OP-02.3). Die Schritte:

### 1. Supabase (EU-Region, D10.2)

1. Projekt in einer EU-Region anlegen (z. B. Frankfurt). Erweiterungen `pg_cron` und `pg_net` erlaubt die Migration selbst.
2. Verknüpfen und Schema einspielen:
   ```bash
   npx supabase login
   ```
   ```bash
   npx supabase link --project-ref <ref>
   ```
   ```bash
   npx supabase db push
   ```
3. Für pg_cron im SQL-Editor zwei Vault-Geheimnisse anlegen (Werte wie in den Secrets):
   ```sql
   select vault.create_secret('https://<ref>.supabase.co', 'lj_project_url');
   select vault.create_secret('<CRON_SECRET>', 'lj_cron_secret');
   ```
4. Storage-Bucket `produktfotos` (öffentlich lesbar) anlegen. Dorthin spiegelt der nächtliche Abgleich die Fotos vom Foto-Server der Häuser; der Build lädt sie von dort.
5. Secrets der Functions setzen (Liste unten). `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` und `SUPABASE_DB_URL` stellt Supabase selbst bereit.
   ```bash
   npx supabase secrets set --env-file supabase/.env.production
   ```
   (`supabase/.env.production` lokal anlegen, nie committen; `.gitignore` deckt `.env.*` ab.)
6. Functions deployen. `supabase/config.toml` setzt `verify_jwt = false`: Die Functions prüfen selbst (öffentliche Formulare und Webhook, HMAC-Token, Cron- und Build-Geheimnis).
   ```bash
   npm run sync-shared && npx supabase functions deploy
   ```
7. Erstbefüllung des Katalogs:
   ```bash
   curl -X POST -H "x-cron-secret: <CRON_SECRET>" "https://<ref>.supabase.co/functions/v1/sync-full?force=1"
   ```

### 2. GitHub Pages

1. Repository anlegen, `main` pushen. Unter *Settings → Pages* als Quelle **GitHub Actions** wählen.
2. Unter *Settings → Secrets and variables → Actions*:
   - **Variables:** `SITE_URL`, `BASE_PATH`, `PUBLIC_DEMO`, `PUBLIC_FEATURE_RESERVE`, `PUBLIC_FEATURE_PAY_COLLECT`, `PUBLIC_FEATURE_PAY_SHIP`, `PUBLIC_FEATURE_HOFLIEFERANT`, `PUBLIC_FUNCTIONS_URL` (`https://<ref>.supabase.co/functions/v1`), `SUPABASE_URL`, `CATALOG_SOURCE=api`
   - **Secret:** `BUILD_SECRET` (derselbe Wert wie in den Supabase-Secrets)
3. Für den Rebuild nach Katalogänderungen: einen Fine-Grained-Token anlegen, der nur dieses Repository darf (Berechtigung *Contents: Read and write*), als Supabase-Secret `GITHUB_DISPATCH_TOKEN` setzen, dazu `GITHUB_REPOSITORY=<owner>/<repo>`.

`.github/workflows/deploy.yml` läuft bei Push auf `main`, bei `repository_dispatch` (`catalog-updated`)
und täglich um 05:00 Uhr Luxemburger Zeit (zwei UTC-Zeitpläne, ein Tor lässt wegen Sommer- und
Winterzeit nur einen durch). Vor dem Build laufen Tests und Typprüfungen. Der Bild-Cache
(`node_modules/.astro`) und die Open-Graph-Bilder bleiben über `actions/cache` erhalten.

**Domain:** mit eigener Domain `SITE_URL=https://www.<domain>.lu`, `BASE_PATH` leer und die Domain
unter *Settings → Pages* eintragen. Ohne eigene Domain `SITE_URL=https://<owner>.github.io` und
`BASE_PATH=/<repo>`; dann gilt `robots.txt` nicht (sie wirkt nur an der Wurzel einer Domain).

---

## Umgebungsvariablen und Secrets

Vorlage mit Kommentaren: [.env.example](.env.example). Werte mit `PUBLIC_` landen im statischen
HTML; alles andere nie im Frontend. Schlüssel stehen nie im Repository.

| Name | Wo | Bedeutung (Demo-Wert) |
|---|---|---|
| `SITE_URL`, `BASE_PATH` | Build, Functions | Adresse der Website (CORS, Weiterleitungen, Canonicals) |
| `PUBLIC_DEMO` | Build, Functions | Demo-Leiste, `noindex`, Demo-Postausgang, Demo-Artikel erlaubt (`true`) |
| `PUBLIC_FEATURE_RESERVE`, `…_PAY_COLLECT`, `…_PAY_SHIP` | Build, Functions | die drei Wege (alle `true`) |
| `PUBLIC_FEATURE_HOFLIEFERANT` | Build | Satz „Hoflieferant“ (Freigabe fehlt, OP-09) |
| `PUBLIC_FUNCTIONS_URL` | Build | Basis der Functions |
| `CATALOG_SOURCE` | Build | `fixtures` (lokal) oder `api` (Supabase über `catalog-export`) |
| `BUILD_SECRET` | Build (Secret), Functions | liest nur den Katalog-Export |
| `SUPABASE_URL` | Build | Fotos aus dem Storage für `<Picture>` |
| `SOFTTOUCH_MODE`, `MOCK_FAIL_RATE` | Functions | `mock` oder `http`; Anteil scheiternder Mock-Aufrufe |
| `ST_ACCOUNT_*`, `ST_TOKEN_*` | Functions (Secret) | Konto und Token je Haus; dasselbe Konto wird nur einmal abgefragt |
| `ST_STORES_*`, `ST_POS_*`, `ST_ONLINE_CHANNEL`, `ST_PHOTO_BASE_URL` | Functions | Filialen (`01`, `02`), POS für Web-Reservierungen, Online-Kanal (`1`), Foto-Server |
| `MAIL_MODE`, `MAIL_FROM`, `SMTP_*` | Functions (Secret) | `log` (Demo-Postausgang) oder `smtp` (Port 465) |
| `MAIL_TO_LANNERS`, `MAIL_TO_JAGER`, `ALERT_RECIPIENT` | Functions | Empfänger (Demo: `@demo.invalid`) |
| `PAYMENT_PROVIDER`, `PAY_KEY_*` | Functions (Secret) | `mock` oder `mollie`, Schlüssel je Firma |
| `ORDER_TOKEN_SECRET`, `RATE_LIMIT_SALT`, `CRON_SECRET`, `ORDER_READY_SECRET` | Functions (Secret) | lange Zufallswerte (`openssl rand -hex 32`); die Werte in `.env.example` sind nur für lokal |
| `GITHUB_DISPATCH_TOKEN`, `GITHUB_REPOSITORY` | Functions (Secret) | Rebuild über `repository_dispatch` |

---

## Von Mock auf echt

Kein Code ändert sich; nur Variablen und Daten.

1. **SoftTouch:** API-Angebot (OP-04.1), Konto oder Konten, Filial-IDs, Online-Kanal, Foto-Server, Presets und Kategorien klären (OP-04). Dann `SOFTTOUCH_MODE=http`, `ST_ACCOUNT_*`, `ST_TOKEN_*`, `ST_STORES_*`, `ST_ONLINE_CHANNEL`, `ST_PHOTO_BASE_URL`, gegebenenfalls `ST_POS_*`. Text- und Datei-Presets sowie Kategorien in `src/config/softtouch.ts` und `src/content/warengruppen.json` eintragen (Demo-Annahmen sind dort markiert). Danach `sync-full?force=1` aufrufen und prüfen (`sync_runs`).
2. **Mails:** EU-Mailanbieter, Absender und Empfänger (OP-02.4): `MAIL_MODE=smtp`, `MAIL_FROM`, `SMTP_HOST`, `SMTP_PORT=465`, `SMTP_USER`, `SMTP_PASS`, `MAIL_TO_*`, `ALERT_RECIPIENT`. Supabase sperrt ausgehend die Ports 25 und 587, deshalb 465 (TLS).
3. **Zahlung:** Anbieter und Konten je Firma (OP-06.1). Vorbereitet ist Mollie: `PAYMENT_PROVIDER=mollie`, `PAY_KEY_LANNERS`, `PAY_KEY_JAGER`; zuerst mit `test_…`-Schlüsseln. Der Webhook (`/functions/v1/payment-webhook`) wird bei jeder Zahlung mitgegeben.
4. **Demo-Daten entfernen:** nach dem ersten echten Abgleich [supabase/sql/demo-daten-entfernen.sql](supabase/sql/demo-daten-entfernen.sql) im SQL-Editor ausführen.
5. **Demo aus:** `PUBLIC_DEMO=false` in den GitHub-Variablen und den Supabase-Secrets. Der Build bricht ab, sobald ein Demo-Artikel (`detail5 = DEMO`) im Katalog steht; so kann keiner live gehen.
6. **Wege wählen:** `PUBLIC_FEATURE_*` nach Entscheidung des Kunden. Ohne Kauf-Weg verschwinden Kasse, AGB, Widerruf, Versand & Zahlung.
7. Vorher: Impressum, Datenschutz, AGB und Widerruf mit echten, juristisch geprüften Texten (OP-01, OP-02, OP-06.5); luxemburgische Texte geprüft (OP-13).

---

## Betrieb

### Abgleich mit SoftTouch (D10.4)

| Job | Wann (Luxemburger Zeit) | Was |
|---|---|---|
| `sync-full` | 04:15 | Stammdaten, alle Online-Artikel (`take=500`), Fotos spiegeln, Preis-Schnappschuss für die 30-Tage-Angabe, Mark-and-sweep nur nach vollständigem Erfolg; bei HTTP 500 Wiederholung nach 2, 5, 10 Minuten |
| `sync-delta` | alle 10 Minuten, 07:00–20:00 (78 Läufe) | `updated_since_minutes=15` mit `discount_online`; vorher Eskalationsprobe `take=1&skip=10000` (kommt etwas zurück, läuft stattdessen der Komplett-Abgleich) |
| `rebuild` | alle 10 Minuten geprüft | löst den Build aus, wenn Artikelmenge oder Preise sich geändert haben; tagsüber höchstens alle 30 Minuten |
| `outbox` | alle 5 Minuten | wiederholt SoftTouch-Aufrufe und Mails bis 24 Stunden; nach 3 Fehlversuchen Warnmail an `ALERT_RECIPIENT` |
| `retention` | täglich nachts | Aufbewahrung (siehe unten) |

pg_cron rechnet in UTC; die Jobs laufen zu beiden möglichen UTC-Stunden, die Function prüft die
Ortszeit. Jeder Lauf steht mit Seiten, Änderungen und API-Aufrufen in `sync_runs`.

### Aufrufbudget SoftTouch

Formel je Tag (ein Konto; bei zwei Konten verdoppeln sich Stammdaten und Seiten):

```
Komplett-Abgleich   9 Stammdaten + ⌈Schlüssel / 500⌉ Seiten
Delta               78 × (1 Probe + meist 1 Seite)
Live-Bestand        ≤ 1 je Produktseitenaufruf; gleiche uid8 höchstens 1-mal je 60 s (Cache)
Reservierung        1 Bestand + 1 Kunde suchen (+1 anlegen) + je Haus 1 Reservierung + 1 PRINT RESERVATION
Bezahlte Bestellung 2 Bestand + 1–2 Kunde (+1 Lieferadresse) + 1 Reservierung + 1 PRINT RESERVATION
```

Beispiel mit 3.000 Online-Artikeln (≈ 22.500 Schlüssel, wie im Lasttest), 1.000 Produktseiten-
aufrufen, 20 Reservierungen (zwei Häuser) und 10 Bestellungen am Tag:
54 + 156 + ≤ 1.000 + 140 + 70 ≈ **1.400 Aufrufe am Tag**, davon der größte Teil Live-Bestand.
Die Anzahl der Online-Artikel (OP-04.9) und das API-Angebot (OP-04.1) fehlen noch.

### Reservierungen

- Die Reservierung entsteht in FasMan ohne Preise, mit Bemerkung (`WEB-RESERVIERUNG W-…, Abholung ab …, zurücklegen bis …`) und `PRINT RESERVATION` an die Filiale. Laut SoftTouch-Doku sinkt der verfügbare Bestand sofort.
- Ist SoftTouch nicht erreichbar, nimmt die Website die Reservierung trotzdem an, sagt dem Kunden ehrlich, dass das Haus sie bestätigt, und die Outbox trägt sie nach (mit Mail „nachgetragen“ an das Haus).
- **Nicht abgeholte Reservierungen freigeben (OP-05.4):** Die API kann Reservierungen nicht löschen. Das Personal löscht sie in FasMan, wenn das Datum „zurücklegen bis“ in der Bemerkung vorbei ist. Vorschlag: jeden Morgen die Web-Reservierungen (Bemerkung beginnt mit `WEB-RESERVIERUNG`) durchsehen. Erst dann ist das Stück online wieder verfügbar.
- Bestätigung der Abholbereitschaft: FasMan kann über die Programmvariablen `WebshopPickupConfirmURL` / `WebshopDeliveryConfirmURL` die Function `order-ready` aufrufen (`…/functions/v1/order-ready?art=abholung&token=<ORDER_READY_SECRET>&`); dann bekommt der Kunde eine Mail (OP-06.9).

### Online-Kauf

- Beim Absenden der Kasse hält die Website die Stücke 20 Minuten zurück (die API zieht erst mit der Reservierung ab). Die Summen rechnet der Server aus `netto_price`; hat sich ein Preis geändert, kommt der Kunde mit Hinweis zurück zur Kasse.
- Nach der Zahlung (Status immer beim Anbieter nachgelesen): Kunde und gegebenenfalls Lieferadresse in FasMan, Reservierung **mit** `payment_id` und Stückpreisen, `PRINT RESERVATION`, Mails. Den Verkauf schließt das Haus in FasMan ab (OP-06.7).
- **`nachpruefen` und Erstattung:** Ist ein bezahlter Artikel inzwischen weg (im Laden verkauft), legt die Website keine Reservierung an. Der Kunde liest: „Wir melden uns innerhalb eines Werktags. Ist der Artikel nicht verfügbar, erstatten wir den vollen Betrag.“ Das Haus bekommt eine Mail `[Web-Bestellung, NACHPRÜFEN]`, prüft (anderes Haus, Nachlieferung) und meldet sich. Ist der Artikel nicht zu beschaffen, erstattet das Haus den vollen Betrag im Dashboard des Zahlungsanbieters (bei Mollie: Zahlung öffnen → *Refund*). Eine automatische Erstattung gibt es bewusst nicht; die Entscheidung trifft ein Mensch.

### Aufbewahrung (D10.9, Vorschlag, OP-06.8)

Reservierungen 30 Tage nach dem Abholdatum, Bestellungen 90 Tage nach Abschluss (die Belege liegen
in SoftTouch) und Anfragen nach 12 Monaten werden anonymisiert; Demo-Postausgang 30 Tage;
Offline-Artikel nach 30 Tagen nicht mehr gebaut, nach 60 Tagen gelöscht. IP-Adressen werden nie
gespeichert, nur gehasht für das Rate-Limit.

---

## Qualität und Messungen

Stand 02.10.2026, alles lokal gemessen.

| Prüfung | Ergebnis |
|---|---|
| Build (Demo) | 570 Seiten in 4 Sprachen; SEO-Prüfung: 0 Fehler (Canonicals, hreflang + `x-default`, eine `<h1>`, `alt`, JSON-LD lesbar, keine toten Links und Anker) |
| Längen-Warnungen (G2) | 435 Warnungen mit Pfad, alle „zu kurz“: die festen Vorlagen des Briefings ergeben bei kurzen Marken- und Artikelnamen weniger als 50 bzw. 150 Zeichen. Zu lange gibt es keine mehr. |
| Übersetzungen | 758 Schlüssel in 4 Sprachen, alle Platzhalter gleich, alle 758 LB-Texte markiert; alle im Code verwendeten Schlüssel existieren |
| Tests | 15 Unit-Tests (Öffnungszeiten, Omnibus, Filter, Längen, Sprachen) und 5 Ablauf-Tests der Functions (Reservierung über zwei Häuser, Kauf, `nachpruefen`, Kassenausfall mit Outbox, Honeypot) |
| Lighthouse (mobil, gedrosselt, Produktions-Build; gemessen vor der Design-Überarbeitung mit Fotos und Markenband, neu messen) | Performance 99–100, Accessibility 100, Best Practices 100; SEO 100 bis auf `is-crawlable`, das in der Demo absichtlich scheitert (`noindex`). LCP 1,1–1,7 s, CLS 0–0,001, TBT 0 ms. Gemessen: Start, Liste, Produkt, Hausseite, Kontakt, So funktioniert's |
| JavaScript (vor der Überarbeitung; Untermenüs, Sprachauswahl und Live-Status kommen dazu) | 23,6 KB komprimiert für die ganze Seite; eine Produktseite lädt etwa 7 KB |

### Lasttest: 3.000 Artikel (D10.7)

`npm run loadtest` (Testkatalog aus den Fixtures vervielfältigt, nie deployt):

| | Ergebnis (Apple M1, 8 Kerne) |
|---|---|
| Seiten | 13.294 (4 Sprachen) |
| Größe | 794 MB |
| Dauer | 55 s mit warmem Cache (Astro 28 s, Pagefind 26 s); kalt 136–160 s |

**Build-Zeit mit echten Fotos:** Die Demo-Fotos der Artikel liegen fertig als WebP in zwei Breiten in
`public/demo-fotos/` und werden nicht umgerechnet; die 18 Stimmungsfotos in `src/assets/fotos/`
rechnet `<Picture>` einmal in WebP (danach aus dem Cache). Echte Produktfotos
rechnet `<Picture>` in AVIF und WebP in 5 Breiten; gemessen sind das etwa 2,2 s je Foto
(AVIF 1,75 s, WebP 0,47 s). Bei rund 6.500 Fotos braucht **nur der erste Build** deshalb Stunden;
danach rechnet er nur neue oder geänderte Fotos (Cache `node_modules/.astro`, wird auch bei
Abbruch gespeichert, Timeout 340 Minuten). Das Ziel „unter 10 Minuten“ gilt damit für jeden Build
nach dem ersten. Den ersten Build einmal von Hand starten (*Actions → Bauen und veröffentlichen →
Run workflow*).

**Größe auf GitHub Pages:** Eine veröffentlichte Seite darf höchstens 1 GB groß sein. Bei 3.000
Artikeln sind es 794 MB, Luft bis etwa 3.700 Artikel. Hebel, falls das Sortiment größer wird:
Produktseiten pro Sprache weiter verschlanken, Pagefind-Index nur für DE/FR, oder ein Hosting ohne
diese Grenze.

### Noch nicht geprüft

Echtes Handy, VoiceOver und NVDA von Hand, Rich-Results-Test (braucht eine öffentliche Adresse),
echter Mailversand, echte SoftTouch-API und Mollie (keine Zugänge). Der HTTP-Client für SoftTouch
ist nach der Doku gebaut und mit zod gegen deren Antwortformate abgesichert, aber nie gegen die
echte API gelaufen.

---

## Abweichungen vom Briefing und vom Nave-Standard

| Abweichung | Begründung |
|---|---|
| Der Build liest den Katalog über die Function `catalog-export` mit eigenem `BUILD_SECRET`, nicht mit dem Service-Key (D10.7) | Geringste Rechte: Ein geleaktes GitHub-Secret gibt dann nur den öffentlichen Katalog preis, nicht die ganze Datenbank mit Kundendaten. |
| Keine Einwilligungs-Checkbox in der Kasse (Nave-Standard: aktive Checkbox) | Die Verarbeitung ist zur Vertragserfüllung nötig (Art. 6 Abs. 1 lit. b DSGVO); eine Einwilligung wäre hier rechtlich falsch, weil sie widerrufbar sein müsste. Reservierung und Anfragen haben die Checkbox. |
| Islands in vanilla TypeScript statt React | Die Islands sind klein (Größenleiste, Tasche, Formulare, Filter); React hätte die JavaScript-Menge vervielfacht. Die ganze Seite liefert 23,6 KB komprimiert. |
| zod in den Edge Functions | Antworten der SoftTouch-API sind Eingaben von außen; jede wird gegen ihr Schema geprüft, bevor sie den Katalog ändert. Läuft nur auf dem Server. |
| Lokale Laufzeit mit Deno + PGlite statt Supabase CLI mit Docker | Startet ohne Docker mit denselben Migrationen und Functions; in Supabase laufen dieselben Functions gegen Postgres. |
| League Gothic als Teilmenge unter dem Namen „LJ Gothic“ | Die OFL erlaubt veränderte Fassungen (hier: Teilmenge) nur unter anderem Namen, wenn ein Reserved Font Name gilt. |
| **Keine Tabellenziffern:** Weder Libre Franklin noch League Gothic hat `tnum` (OP-21) | Preise und Größen stehen in proportionalen Ziffern; die Schrift wurde nicht still getauscht. League Gothic fehlen außerdem « » ×, diese Zeichen kommen aus der Ersatzschrift. Entscheidung: so lassen oder Ziffern ergänzen. |
| Kopf in drei Ebenen: Infoleiste, Navigation (ab 1.100 px), Hausschalter-Leiste | Die Navigation mit Untermenüs (Sortiment, Service) und die Sprachauswahl (Globus) passen ab 1.100 px auch auf Französisch; der Hausschalter hat eine eigene Leiste, die Sprachauswahl sitzt in jeder Breite im Kopf. Darunter "Menü". |
| Farbe statt reinem Weiß (überarbeitetes Design) | Verläufe aus Lanners-Marine und Jager-Tusche mit Gold (Farben aus dem Jager-Logo und dem Gutschein-Etikett), Messing als Akzent, Fotos mit gerundeten Ecken. Tokens in `src/styles/global.css`. |
| Hausschalter führt auf Start- und Hausseiten in den Shop | Start = beide Häuser, Hausseite = dieses Haus (`seitenHaus` in `Base.astro`). Ein Wechsel öffnet die Seite des anderen Hauses; auf Listen-, Marken- und Produktseiten filtert er wie bisher. |
| Markenlogos im Markenband (Start, Häuser, Hausseiten, Marken, Markenseiten) | Logos von den Websites der Marken bzw. Wikimedia Commons (`src/config/marken.ts`, Nachweis `src/content/bildnachweis.json`). Freigabe offen (OP-10). Fehlt ein Logo, steht der Name. |
| Stockfotos (Unsplash) statt Ladenfotos | Bis eigene Fotos da sind (OP-17): Stimmungsfotos in `src/assets/fotos/`, Demo-Fotos der Artikel in `public/demo-fotos/`, je Artikel ein eigenes Foto, einheitlich freigestellt auf Weiß mit Detailausschnitt; Fotos mit Person sind automatisch unter dem Kinn (Hosen ab der Taille) beschnitten, fremde Markenschriftzüge übermalt (Liste `scripts/demo-fotos/fotos.json`, Aufbereitung `scripts/demo-fotos/aufbereiten.py`), Nachweis im Impressum. |
| Lëtzebuergesche Datumsnamen aus den Übersetzungen statt aus `Intl` | Chromium kennt `lb` nicht und schreibt still deutsche Namen („Samstag“). So steht überall „Samschdeg“, und die Namen gehen mit durch die Prüfung. |
| Text-Presets: Die festen S-Presets sind NL/FR/EN (OP-04.7) | Deutsch braucht kundeneigene Presets; die Demo nimmt D1–D3 an (`src/config/softtouch.ts`). |
| Pflegehinweise auf DE- und LB-Seiten auf Französisch (OP-04.15) | SoftTouch liefert die Titel nur auf NL/FR/EN. Nichts wird maschinell übersetzt. |
| Filter: Artikeldaten je Sprache in einer Datei, die Reihenfolge je Liste getrennt | Der Browser nimmt die Artikeldaten zwischen den Listen aus dem Cache. Bei Jeans filtert „Größe“ nach der Weite. |
| JSON-LD: besondere Öffnungszeiten für 90 Tage | Die Seite baut täglich neu; jede Seite trägt die zwei Geschäfte, das spart Bytes bei tausenden Seiten. |
| „Mehr von {Marke}“ zeigt 4 Artikel | Seitengewicht bei 12.000 Produktseiten (GitHub-Pages-Grenze). |
| Open-Graph-Bilder der Produkte als JPEG | Bei Fotos etwa halb so groß wie PNG; das Start- und Häuserbild bleibt PNG. |
| Demo-Zahlung mit vierter Option „inzwischen im Laden verkauft“ | Damit der Weg `nachpruefen` in der Demo sichtbar wird. |
| **Einblenden beim Scrollen** (Kundenwunsch; Nave-Standard H rät vom Einblenden jeder Sektion ab) | Abschnittsköpfe, Karten, Kacheln, Fragen und Fotos gleiten herein, gleichzeitig sichtbare kurz versetzt. Nur Elemente, die beim Laden unterhalb des Bildschirms liegen; was schon zu sehen ist, bleibt unberührt (kein Flackern, LCP unverändert). Intersection Observer statt Scroll-Listener, ohne JavaScript, beim Drucken und mit „Bewegung reduzieren“ ist alles sofort da (`global.ts`, `global.css`). Hintergrundfotos (Geschichte, Fotoköpfe) laufen per CSS-Scroll-Animation etwas langsamer mit, wo der Browser das kann. |
| **Morph beim Seitenwechsel** (Kundenwunsch) | Cross-Document View Transitions: Die alte Seite gleitet nach oben weg, die neue kommt nach; gemeinsame Elemente morphen an ihren neuen Platz: Produktkarte ↔ Produktfoto, Hauskarte ↔ Hausfoto, Kachel ↔ Listentitel, Fotokopf und Titel zwischen Infoseiten, auch beim Zurückgehen. Die Ankunft (`src/scripts/vt-ankunft.js`, 2 KB) steht inline im `<head>`, weil `pagereveal` vor den Modul-Skripten kommt; `<link rel="expect" blocking="render">` hält das erste Zeichnen an, bis `<main>` gelesen ist. Spätestens nach 1,2 s oder bei der ersten Eingabe ist ein Übergang vorbei. Chrome/Edge und Safari ab 18.2; Firefox wechselt ohne Übergang. |
| Suche auch im Dev-Server, mit Infoseiten | Im Build legt `pagefind --site dist` den Index an. Im Dev-Server (`npm run dev`, `npm run demo`) baut ihn `scripts/dev-suche.ts` kurz nach dem Start aus den ausgelieferten Seiten (etwa 15 s, danach nach Änderungen in `src/` neu). Gesucht wird in Artikeln und in den Infoseiten „So funktioniert's“ (mit Sprungmarken zu den Abschnitten), Kontakt, Firmenkleidung, Gutscheine, Versand und den Hausseiten (Öffnungszeiten, Anfahrt); Bedienelemente und offene Punkte stehen nicht im Index (`data-pagefind-ignore`). |

---

## Bekannte Grenzen

- **Platzhalter:** Fassaden-Zeichnungen (OP-08.2, OP-08.3), Impressum, Datenschutz-Fristen, AGB und Widerruf, Antwortzeit auf Anfragen und alle Punkte in [OFFENE-PUNKTE.md](OFFENE-PUNKTE.md).
- **Farbnamen auf Lëtzebuergesch** kommen, solange SoftTouch keine liefert, auf Deutsch (OP-04.14).
- Ohne JavaScript gibt es keine Filter und keine Sortierung (nur die Seiten in empfohlener Reihenfolge), keinen Hausschalter und keine Tasche; reserviert wird dann per Telefon, die Nummern stehen an der Größenleiste.
- Der Live-Bestand gilt ab der Produktseite; Listen zeigen den Stand des Builds.

---

## Google-Profile (G4)

Aufgabe für Nave und den Kunden. Beide Profile sind heute nicht vom Inhaber übernommen. Je Haus:

1. Profil übernehmen.
2. Website auf die Hausseite setzen (`/lb/haiser/lanners/`, `/lb/haiser/jager/`). Bei Jager steht heute Letzshop.
3. Öffnungszeiten korrigieren (Jager zeigt 09:00 statt 08:30, falls 08:30 stimmt; OP-03).
4. Kategorien: Lanners „Bekleidungsgeschäft“ sowie Herren- und Damenmode; Jager „Herrenbekleidungsgeschäft“ als Hauptkategorie, „Hutgeschäft“ als Zusatz.
5. Eigene Fotos hochladen.
6. Ausnahmen genauso pflegen wie in `src/content/oeffnungszeiten.json`.

Name, Adresse und Telefon exakt wie auf der Website (NAP): `Confection Lanners, 18, Grand-Rue,
L-9050 Ettelbruck, +352 81 22 80` und `Jager-Oberlinkels, 32, Grand-Rue, L-9050 Ettelbruck,
+352 81 22 79`.

**Später** (nicht in dieser Demo): Bestand aus SoftTouch über das Google Merchant Center als
lokales Inventar melden („auf Lager in der Nähe“). Die Daten dafür liegen schon in `skus`.

---

## Lizenzen

- League Gothic und Libre Franklin: SIL Open Font License 1.1, siehe `licenses/`. Selbst gehostet als WOFF2, nie über die Google-CDN.
- Demo-Artikel und Bestände sind erfunden und als Demo gekennzeichnet (D10.8); nur die im Code vermerkten Letzshop-Preise sind belegt.
- Fotos: Unsplash-Lizenz (frei nutzbar, Nennung freiwillig); die Demo-Fotos zeigen nicht die echten Artikel. Liste mit Fotografen und Quellen in `src/content/bildnachweis.json` und im Impressum.
- Markenlogos sind Warenzeichen ihrer Inhaber (Quellen in `src/content/bildnachweis.json`). Die Jager-Gebäudezeichnung stammt aus dem Logo von Jager-Oberlinkels (Letzshop), der Lanners-Schriftzug ist nach dem Gutschein nachgesetzt.
