# Offene Punkte

Erzeugt aus `src/content/offene-punkte.json` mit `npm run offene-punkte`. Bitte dort pflegen, nicht hier.

Auf der Website ist jede betroffene Stelle sichtbar markiert, je nach Sprache als „[fehlt]“ oder „[unbestätigt]“ (LB „[feelt]“ / „[net confirméiert]“), mit der Nummer des Punkts im Tooltip. Nichts davon ist erfunden. Die einzige Ausnahme sind die Demo-Artikel; sie tragen überall „Demo“ und erscheinen nur mit `PUBLIC_DEMO=true`.

**Stand:** 66 Punkte: 28 fehlen, 34 sind unbestätigt, 4 brauchen eine Entscheidung.

- **fehlt:** Die Angabe fehlt. Die Seite zeigt einen Platzhalter.
- **unbestätigt:** Ein Wert aus der Recherche steht auf der Seite, markiert. Beim Kunden bestätigen.
- **Entscheidung:** Der Kunde oder Nave entscheidet; die Demo zeigt die beschriebene Lösung.

Alle luxemburgischen Texte und Slugs sind Entwürfe (OP-13). Sie stehen mit Deutsch und Französisch zur Prüfung in `docs/lb-review.csv` (`npm run lb-review`).

## Firma Lanners

| Nr. | Status | Was fehlt | Seite | Schlüssel / Konfiguration | Fundstellen im Code |
|---|---|---|---|---|---|
| OP-01.1 | unbestätigt | Rechtsform und Firmenname von Confection Lanners SA im LBR prüfen | Impressum<br>JSON-LD (legalName erst nach Bestätigung) | `src/config/houses.ts: legal.firma, legal.rechtsform` | `src/config/houses.ts` |
| OP-01.2 | fehlt | RCS-Nummer von Confection Lanners | Impressum | `src/config/houses.ts: legal.rcs` | `src/config/houses.ts` |
| OP-01.3 | fehlt | MwSt-Nummer von Confection Lanners | Impressum<br>JSON-LD (vatID erst nach Bestätigung) | `src/config/houses.ts: legal.mwst` | `src/config/houses.ts` |
| OP-01.4 | fehlt | Verantwortliche bzw. Verwaltungsrat von Confection Lanners | Impressum | `src/config/houses.ts: legal.vertreten` | `src/config/houses.ts` |
| OP-01.5 | fehlt | Gewerbegenehmigung von Confection Lanners | Impressum | `src/config/houses.ts: legal.gewerbe` | `src/config/houses.ts` |
| OP-01.6 | fehlt | Gründungsjahr von Confection Lanners | Hausseite Lanners | `src/config/houses.ts: legal.gruendung` | `src/config/houses.ts`<br>`src/views/History.astro`<br>`src/views/House.astro` |

## Firma Jager

| Nr. | Status | Was fehlt | Seite | Schlüssel / Konfiguration | Fundstellen im Code |
|---|---|---|---|---|---|
| OP-01.7 | unbestätigt | Jager Sàrl: RCS B200967 im LBR und MwSt LU28026605 in VIES vor dem Livegang prüfen (Quelle Letzshop) | Impressum<br>JSON-LD | `src/config/houses.ts: legal.rcs, legal.mwst` | `src/config/houses.ts`<br>`src/lib/seo.ts` |
| OP-01.8 | unbestätigt | Ist die Betriebsnummer 10063104 / 0 die Gewerbegenehmigung? | Impressum | `src/config/houses.ts: legal.gewerbe` | `src/config/houses.ts` |

## Website

| Nr. | Status | Was fehlt | Seite | Schlüssel / Konfiguration | Fundstellen im Code |
|---|---|---|---|---|---|
| OP-02.1 | fehlt | Betreiber der Website: welche der beiden Firmen, oder beide | Impressum<br>Datenschutz | `recht.impressum.betreiber`<br>`recht.datenschutz.verantwortlich` | `src/views/Impressum.astro`<br>`src/views/Privacy.astro` |
| OP-02.2 | unbestätigt | Name der Website und gemeinsames Logo ('Lanners & Jager' ist Arbeitstitel) | alle (Logo.astro, Titles) | `site.name`<br>`src/components/Logo.astro` | `src/components/HouseLogo.astro`<br>`src/config/site.ts`<br>`src/content/bildnachweis.json` |
| OP-02.3 | fehlt | Domain (SITE_URL, Platzhalter https://www.DOMAIN.lu) | Canonical, hreflang, JSON-LD, Sitemap | `SITE_URL` | `src/config/site.ts` |
| OP-02.4 | fehlt | Absender und Empfänger der Mails (MAIL_FROM, MAIL_TO_LANNERS, MAIL_TO_JAGER, ALERT_RECIPIENT) und Mailanbieter in der EU | alle Formulare | `MAIL_FROM`<br>`MAIL_TO_*`<br>`ALERT_RECIPIENT` | `src/views/Privacy.astro`<br>`supabase/functions/_shared/mail/mailer.ts` |
| OP-22 | Entscheidung | 'Jager Junior' (Kindermode bei Google) ist nicht eingebaut; Zugehörigkeit unbekannt | – | `–` | – |

## Öffnungszeiten

| Nr. | Status | Was fehlt | Seite | Schlüssel / Konfiguration | Fundstellen im Code |
|---|---|---|---|---|---|
| OP-03.1 | unbestätigt | Öffnungszeiten Lanners (Quelle Google Maps) bestätigen | Footer<br>Startseite<br>Hausseite<br>Kontakt<br>JSON-LD<br>F1/F2 Abholdatum | `src/content/oeffnungszeiten.json: lanners` | `src/content/oeffnungszeiten.json` |
| OP-03.2 | unbestätigt | Öffnungszeiten Jager: 08:30 (Letzshop) oder 09:00 (Google)? | Footer<br>Startseite<br>Hausseite<br>Kontakt<br>JSON-LD<br>F1/F2 Abholdatum | `src/content/oeffnungszeiten.json: jager` | `src/content/oeffnungszeiten.json` |
| OP-03.3 | unbestätigt | An allen gesetzlichen Feiertagen geschlossen? Ausnahmen wie offene Sonntage oder Inventur | Öffnungszeiten-Tabellen<br>F1/F2 Abholdatum | `src/content/oeffnungszeiten.json: feiertage, ausnahmen` | `src/components/HoursTable.astro`<br>`src/content/oeffnungszeiten.json` |

## SoftTouch

| Nr. | Status | Was fehlt | Seite | Schlüssel / Konfiguration | Fundstellen im Code |
|---|---|---|---|---|---|
| OP-04.1 | fehlt | API-Angebot und Kosten (Kunde fordert bei SoftTouch an) | – | `–` | – |
| OP-04.2 | unbestätigt | Ein Konto mit zwei Filialen oder zwei Konten? Bei zwei Konten: Können Artikelnummern (uid8) kollidieren? | – | `ST_ACCOUNT_LANNERS`<br>`ST_ACCOUNT_JAGER` | – |
| OP-04.3 | fehlt | IDs der Filialen (Demo: 01 Lanners, 02 Jager) | – | `ST_STORES_LANNERS`<br>`ST_STORES_JAGER` | `src/config/houses.ts` |
| OP-04.4 | unbestätigt | Welcher online-Kanal (1 bis 5) gilt für diesen Shop? (Demo: 1) | – | `ST_ONLINE_CHANNEL`<br>`src/config/softtouch.ts: onlineChannel` | – |
| OP-04.5 | fehlt | Basis-URL des Foto-Servers der Häuser | Produktfotos | `ST_PHOTO_BASE_URL` | `src/config/softtouch.ts` |
| OP-04.6 | unbestätigt | Datei-Presets: welches ist Hauptfoto, welche sind Zusatzfotos, Freisteller oder Modellfoto (contain/cover) | Produktkarte<br>Produktseite | `src/config/softtouch.ts: filePresets` | – |
| OP-04.7 | unbestätigt | Text-Presets: Die festen S-Presets sind Niederländisch, Französisch und Englisch, nicht Deutsch. Welche (kundeneigenen) Presets enthalten die deutschen Texte? Demo-Annahme D1–D3. | Produktseite (Beschreibung, Material) | `src/config/softtouch.ts: textPresets` | `src/config/softtouch.ts` |
| OP-04.8 | fehlt | Kategoriegruppen: welche Gruppe ist die Abteilung (Demo: category1), welche die Warengruppe (Demo: category2), und die echten Codes | Navigation<br>Listenseiten | `src/config/softtouch.ts: categoryGroups`<br>`src/content/warengruppen.json` | `src/content/warengruppen.json` |
| OP-04.9 | fehlt | Anzahl der Online-Artikel (für Aufrufbudget und Build-Zeit) | README: Aufrufbudget | `–` | – |
| OP-04.10 | fehlt | discount_type_id für Web-Preise: Bei bezahlten Bestellungen senden wir den bezahlten Stückpreis (net_price) mit; die Doku verlangt dazu eine passende discount_type_id | – | `src/config/softtouch.ts: webPriceDiscountTypeId` | – |
| OP-04.11 | unbestätigt | Eigene POS-ID für Web-Reservierungen (z. B. 0199)? Soll zusätzlich eine App_notification an MyFasMan Mobile gehen? | – | `ST_POS_LANNERS`<br>`ST_POS_JAGER` | `supabase/functions/_shared/ctx.ts` |
| OP-04.12 | unbestätigt | Nutzen die Häuser Verkaufsaktionen vom Typ 55001–55004 (Kombi-, Staffel-, X-für-Y-Rabatte)? Die API wendet sie nicht an; netto_price wäre dann nicht der Kassenpreis | Preise | `–` | – |
| OP-04.13 | unbestätigt | Kundenanlage: Die Doku erwartet beim Anlegen 'mindestens eine Adresse'. Reservierungen erheben keine Adresse. Geht POST customers ohne Adresse, oder sollen Web-Reservierungen auf einen Sammelkunden laufen? | F1 | `–` | – |
| OP-04.14 | unbestätigt | Farbnamen je Sprache: Die Doku nennt sie für display=full, aber nicht die Feldnamen. Demo-Annahme: lang1 Deutsch, lang2 Französisch, lang3 Englisch | Farbfilter | `src/lib/catalog/assemble.ts: colorGroup` | – |
| OP-04.15 | Entscheidung | Pflegesymbole: SoftTouch liefert Titel nur auf Niederländisch, Französisch und Englisch. Deutsche und luxemburgische Seiten zeigen sie deshalb auf Französisch. Eigene DE/LB-Übersetzung der Symbolliste gewünscht? | Produktseite (Pflege) | `produkt.nurSprachePflege` | – |

## Reservierung

| Nr. | Status | Was fehlt | Seite | Schlüssel / Konfiguration | Fundstellen im Code |
|---|---|---|---|---|---|
| OP-05.1 | unbestätigt | Haltedauer (Vorschlag: 3 Werktage ab dem gewählten Abholdatum) | Produktseite<br>So funktioniert's<br>FAQ<br>Bestätigung | `wege.reserve`<br>`howto.s3Text`<br>`howto.reservierenText`<br>`faq.a3`<br>`src/config/shop.ts: haltedauerTage` | `src/components/Faq.astro`<br>`src/components/Steps.astro`<br>`src/config/shop.ts`<br>`src/views/HowTo.astro`<br>`src/views/Product.astro` |
| OP-05.2 | unbestätigt | Abholung im anderen Haus möglich? | FAQ<br>So funktioniert's | `faq.a4`<br>`howto.anderesHaus` | `src/components/Faq.astro`<br>`src/config/shop.ts`<br>`src/views/HowTo.astro` |
| OP-05.3 | unbestätigt | Wer bestätigt Reservierungen, und wie schnell? | Bestätigung (Fall: SoftTouch nicht erreichbar) | `danke.resAusstehend` | – |
| OP-05.4 | unbestätigt | Wer gibt nicht abgeholte Reservierungen in FasMan wieder frei? (README beschreibt den Ablauf) | – | `README` | – |
| OP-05.5 | unbestätigt | Ist die Reservierung kostenlos und unverbindlich? | Startseite<br>So funktioniert's<br>FAQ | `howto.s2TextReserve`<br>`howto.reservierenFrei`<br>`faq.a2` | `src/components/Faq.astro`<br>`src/components/Steps.astro`<br>`src/components/Vertrauen.astro`<br>`src/views/HowTo.astro` |

## Online-Kauf

| Nr. | Status | Was fehlt | Seite | Schlüssel / Konfiguration | Fundstellen im Code |
|---|---|---|---|---|---|
| OP-06.1 | fehlt | Zahlungsanbieter und Konten je Firma (Demo: Mock; vorbereitet: Mollie im Testmodus) | Kasse | `PAYMENT_PROVIDER`<br>`PAY_KEY_LANNERS`<br>`PAY_KEY_JAGER` | `src/views/Privacy.astro`<br>`src/views/Shipping.astro`<br>`supabase/functions/_shared/payment/mollie.ts` |
| OP-06.2 | unbestätigt | Versandländer, Versandkosten und Lieferzeit (Demo: nur Luxemburg, 0,00 €, 3 Werktage) | Produktseite<br>Kasse<br>So funktioniert's<br>Versand & Zahlung<br>FAQ | `src/config/versand.ts`<br>`wege.ship`<br>`howto.liefernText`<br>`faq.a5` | `src/components/Faq.astro`<br>`src/config/versand.ts`<br>`src/views/HowTo.astro`<br>`src/views/Product.astro`<br>`src/views/Shipping.astro` |
| OP-06.3 | fehlt | Versanddienst | Versand & Zahlung | `recht.versand.dienst` | `src/config/versand.ts`<br>`src/views/Shipping.astro` |
| OP-06.4 | fehlt | Rückgabe und Umtausch im Laden | So funktioniert's<br>FAQ | `howto.umtausch`<br>`faq.a6Umtausch` | `src/components/Faq.astro`<br>`src/components/Vertrauen.astro`<br>`src/views/HowTo.astro` |
| OP-06.5 | fehlt | AGB und Widerrufsbelehrung, juristisch geprüft (die Letzshop-Belehrung von Jager ist nur eine Vorlage) | AGB<br>Widerruf | `recht.agb.*`<br>`recht.widerruf.*` | `src/views/Legal.astro` |
| OP-06.6 | unbestätigt | Abholung online bezahlter Ware ab dem nächsten Öffnungstag? | Produktseite<br>Tasche<br>Bestätigung | `wege.collect` | `src/components/Vertrauen.astro`<br>`src/config/shop.ts`<br>`src/views/HowTo.astro`<br>`src/views/Product.astro`<br>`src/views/Shipping.astro` |
| OP-06.7 | unbestätigt | Wer schließt den Verkauf in FasMan ab? Die Website ruft `process` nicht auf | – | `src/config/shop.ts: processAufrufen` | `src/config/shop.ts` |
| OP-06.9 | unbestätigt | Ablauf beim Versand: Mail 'Paket unterwegs'. Vorbereitet: Function order-ready für die FasMan-Programmvariablen WebshopPickupConfirmURL / WebshopDeliveryConfirmURL | Bestätigung Kauf | `danke.kaufLiefern` | `src/views/Thanks.astro`<br>`supabase/functions/order-ready/handler.ts` |

## Datenschutz

| Nr. | Status | Was fehlt | Seite | Schlüssel / Konfiguration | Fundstellen im Code |
|---|---|---|---|---|---|
| OP-06.8 | unbestätigt | Aufbewahrungsfristen (Vorschlag: Reservierungen 30 Tage nach Abholdatum, Bestellungen 90 Tage nach Abschluss, Anfragen 12 Monate) | Datenschutz | `src/config/shop.ts: aufbewahrung` | `src/config/shop.ts`<br>`src/views/Privacy.astro`<br>`supabase/functions/retention/handler.ts` |

## Recht

| Nr. | Status | Was fehlt | Seite | Schlüssel / Konfiguration | Fundstellen im Code |
|---|---|---|---|---|---|
| OP-06.10 | unbestätigt | Omnibus-Angabe juristisch prüfen: Berechnet wird der niedrigste Preis der 30 Tage VOR der Preissenkung; der Wortlaut lautet 'Niedrigster Preis der letzten 30 Tage' | Produktseite | `produkt.omnibus` | `src/views/Product.astro` |
| OP-20 | unbestätigt | Vor dem Livegang prüfen: kein Link auf die EU-Plattform zur Online-Streitbeilegung (2025 eingestellt) | Impressum | `recht.impressum.streit` | `src/views/Impressum.astro` |

## Gutscheine

| Nr. | Status | Was fehlt | Seite | Schlüssel / Konfiguration | Fundstellen im Code |
|---|---|---|---|---|---|
| OP-07.1 | Entscheidung | Gutscheine weiter über Letzshop oder später als SoftTouch-Cheque im eigenen Shop? | Gutscheine<br>Kasse | `kasse.gutschein` | – |
| OP-07.2 | unbestätigt | Genaue Letzshop-URL des Gutscheinprodukts (verlinkt ist die Händlerseite) | Gutscheine | `src/config/shop.ts: gutscheine.letzshopUrl` | `src/config/shop.ts`<br>`src/views/Vouchers.astro` |
| OP-07.3 | unbestätigt | Gibt es den Gutschein auch im Laden? | Gutscheine | `gutschein.auchImLaden` | `src/views/Vouchers.astro` |
| OP-07.4 | unbestätigt | Sind die Letzshop-Gutscheine SoftTouch-Cheques? | – | `–` | – |

## Logos

| Nr. | Status | Was fehlt | Seite | Schlüssel / Konfiguration | Fundstellen im Code |
|---|---|---|---|---|---|
| OP-08.1 | fehlt | Lanners-Wortmarke als Vektordatei. Bis dahin ist der Schriftzug vom Gutschein nachgesetzt (Confection / LANNERS / Ettelbruck) | Hausseite Lanners<br>Startseite (Shop-Karten)<br>Fuß<br>Geschichte | `src/components/HouseLogo.astro` | – |
| OP-08.2 | fehlt | Jager-Zeichnung als Vektordatei mit Strichen (stroke). Die Gebäudezeichnung aus dem Logo (Letzshop-Datei, freigestellt) steht schon auf Hausseite, Shop-Karten und im Fuß; der Hero zeigt noch den Platzhalter | Startseite (Hero)<br>Hausseite Jager<br>OG-Bild | `src/components/Fassade.astro`<br>`public/logos/jager-gebaeude*.webp` | `src/components/Fassade.astro`<br>`src/lib/fassaden.ts` |
| OP-08.3 | fehlt | Strichzeichnung der Lanners-Fassade (Grand-Rue 18) im selben Stil beauftragen | Startseite (Hero)<br>Hausseite Lanners<br>OG-Bild | `src/components/Fassade.astro` | `src/components/Fassade.astro`<br>`src/components/Hero.astro`<br>`src/lib/fassaden.ts`<br>`src/views/House.astro` |

## Hoflieferant

| Nr. | Status | Was fehlt | Seite | Schlüssel / Konfiguration | Fundstellen im Code |
|---|---|---|---|---|---|
| OP-09 | unbestätigt | Freigabe für 'Fournisseur de la Cour' und das Wappen (Flag PUBLIC_FEATURE_HOFLIEFERANT, Standard aus, ohne Wappen) | Hausseite Lanners | `haeuser.lannersHoflieferant` | `src/config/flags.ts`<br>`src/views/House.astro` |

## Marken

| Nr. | Status | Was fehlt | Seite | Schlüssel / Konfiguration | Fundstellen im Code |
|---|---|---|---|---|---|
| OP-10 | unbestätigt | Freigabe der Marken für die Darstellung online, insbesondere Markenlogos (Markenband, Markenseite) und Markenfotos; eigene Markentexte (Vorlage ist Platzhalter); 'offizieller Händler' wird nie behauptet | Markenseiten<br>Markenband (Start, Häuser, Marken)<br>Produktseiten | `marken.vorlageEins`<br>`marken.vorlageBeide`<br>`src/config/marken.ts` | `src/config/marken.ts`<br>`src/content/bildnachweis.json`<br>`src/views/Brands.astro` |

## Google

| Nr. | Status | Was fehlt | Seite | Schlüssel / Konfiguration | Fundstellen im Code |
|---|---|---|---|---|---|
| OP-12 | fehlt | Google-Profile beider Häuser übernehmen und pflegen (README, Abschnitt G4) | – | `README` | `src/lib/karte.ts` |

## Sprache

| Nr. | Status | Was fehlt | Seite | Schlüssel / Konfiguration | Fundstellen im Code |
|---|---|---|---|---|---|
| OP-13 | fehlt | Alle luxemburgischen Texte und Slugs muttersprachlich prüfen (docs/lb-review.csv) | alle LB-Seiten | `src/i18n/lb.json (review: lb-native)` | – |

## Inhalte

| Nr. | Status | Was fehlt | Seite | Schlüssel / Konfiguration | Fundstellen im Code |
|---|---|---|---|---|---|
| OP-14 | fehlt | Nächste Parkplätze | FAQ<br>Hausseiten (Anfahrt & Parken) | `faq.a9`<br>`anfahrt.parkenText` | `src/components/Faq.astro`<br>`src/views/House.astro` |
| OP-15 | unbestätigt | In welchen Sprachen wird beraten? | FAQ | `faq.a10` | `src/components/Faq.astro` |
| OP-16 | fehlt | Antwortzeit auf Anfragen (F3, F4) | Bestätigung Anfrage | `danke.anfrageText` | `src/views/RequestThanks.astro` |
| OP-17 | fehlt | Fotos der Läden und des Teams, mit Freigabe. Bis dahin stehen Stockfotos (Unsplash) auf Start-, Haus-, Service- und Geschichtsseiten und als Demo-Fotos der Artikel (src/content/bildnachweis.json) | Hausseiten<br>Startseite<br>Geschichte<br>Service-Seiten<br>Produktfotos (Demo) | `src/assets/fotos/`<br>`public/demo-fotos/` | – |
| OP-18 | fehlt | Echte Kundenzitate nur mit Erlaubnis der Verfasser (bis dahin keine) | – | `–` | – |
| OP-19 | unbestätigt | Satz 'Oft bedienen Marc und Jean-Marie Jager selbst.' nur mit Freigabe (nicht eingebaut) | Hausseite Jager | `–` | – |
| OP-23 | fehlt | Anfahrt mit Bahn und Bus: Fußweg vom Bahnhof Ettelbruck zur Grand-Rue (Minuten) sowie nächste Bushaltestelle mit Linien | Hausseiten (Anfahrt & Parken) | `anfahrt.zugText`<br>`anfahrt.busText` | `src/views/House.astro` |

## Typografie

| Nr. | Status | Was fehlt | Seite | Schlüssel / Konfiguration | Fundstellen im Code |
|---|---|---|---|---|---|
| OP-21 | Entscheidung | Libre Franklin hat keine Tabellenziffern (tnum); Preise und Größen stehen in proportionalen Ziffern. League Gothic fehlen « » × (fallen auf die Fallback-Schrift zurück). Entscheidung: so lassen, oder Ziffern im Font ergänzen? | Preise<br>Größenleiste | `src/styles/global.css` | – |
