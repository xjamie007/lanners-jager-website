/**
 * Typen der SoftTouch-API, so wie sie die offizielle Dokumentation beschreibt
 * (docs/softtouch-api/softtouch-api-full.md). Felder, die die Doku nur nennt,
 * aber nicht in einem Beispiel zeigt, sind optional und als ANNAHME markiert.
 *
 * Reines TypeScript ohne Laufzeitcode (läuft in Deno, Node und Vite).
 */

/** V1 GET products: ein Datensatz je 14-stelligem Schlüssel (Artikel × Farbe × Größe × Filiale) */
export interface StText {
  type: string;
  /** 0 = gilt für alle Varianten */
  variant: number;
  sort: number;
  text: string;
  /** ANNAHME: Doku sagt, Texte tragen dieselben Kanal-Flags wie das Produkt */
  online?: number | boolean;
  online2?: number | boolean;
  online3?: number | boolean;
  online4?: number | boolean;
  online5?: number | boolean;
}

export interface StFile {
  type: string;
  variant: number;
  sort: number;
  file: string;
  online?: number | boolean;
  online2?: number | boolean;
  online3?: number | boolean;
  online4?: number | boolean;
  online5?: number | boolean;
}

export interface StProduct {
  key: number;
  id: number;
  edi: string;
  variant: number;
  store: string;
  season: string;
  brand: string;
  detail1: string;
  detail2: string;
  detail3: string;
  detail4: string;
  detail5: string;
  description: string;
  description2: string;
  description3: string;
  description4: string;
  description5: string;
  color: string;
  colorbrand: string;
  sizetable: string;
  sizeX: string;
  sizeY: string;
  sizeXdescription: string;
  sizeYdescription: string;
  stock: number;
  backorder: number;
  order: number;
  delivery: number;
  price: number;
  salesprice: number;
  salesdiscount: number;
  salesstart: string | null;
  salesend: string | null;
  discount_date: string;
  discount_percentage: number;
  discount_value: number;
  article_discount_allowed: boolean;
  article_customer_discount_allowed: boolean;
  netto_price: number;
  vat: number;
  category1: string;
  category2: string;
  category3: string;
  category4: string;
  category5: string;
  category6: string;
  category7: string;
  online: number;
  status: "A" | "I" | "D";
  timestamp: string;
  texts: StText[];
  files: StFile[];
  related: { related: string }[];
  wash_instructions: number[];
  // display=full (Doku nennt die Felder; Typen sind ANNAHMEN, der Parser ist tolerant)
  online2?: number;
  online3?: number;
  online4?: number;
  online5?: number;
  first_delivery?: string | null;
  last_delivery?: string | null;
  expected_delivery?: string | null;
  in_the_picture?: boolean | number;
  online_sort?: number;
  order_number?: string;
  reorder?: number;
  sold?: number;
  full_stock?: number;
  return?: number;
  transfer?: number;
  customer_order_quantity?: number;
  wholesale_price?: number;
}

/** V1 GET products?detail=stock: nur key, edi, store, stock */
export interface StStockRecord {
  key: number;
  edi: string;
  store: string;
  stock: number;
}

export interface StStore {
  key: string;
  txt: string;
  sort: number;
  active: string | boolean;
  corporation_id?: string;
  surface?: number;
  shipping_name?: string;
  shipping_street_name?: string;
  shipping_street_number?: string;
  shipping_zip?: string;
  shipping_city?: string;
  shipping_country_iso?: string;
  shipping_email?: string;
  shipping_phone?: string;
}

export interface StSeason {
  id: string;
  description: string;
  detail1?: string;
  detail2?: string;
  detail3?: string;
  detail4?: string;
  detail5?: string;
  active: boolean;
  visible?: boolean;
  from_date?: string | null;
  to_date?: string | null;
  web_visible?: boolean;
}

export interface StBrand {
  key: string;
  name: string;
  alias: string;
  category1: string;
  category2: string;
  category3: string;
  category4: string;
  category5: string;
  // display=full
  active?: boolean;
  webshop_visible?: boolean;
  website?: string;
}

export interface StCategory {
  key: string;
  group_id: string;
  description: string;
  alias: string;
  lang1: string;
  lang2: string;
  lang3: string;
  lang4: string;
  lang5: string;
  active: boolean;
}

export interface StColor {
  id: string;
  description: string;
  colorlong: number;
  colorhex: string;
  active: boolean;
  /** ANNAHME: "With display=full the colour also returns its descriptions per language" – Feldnamen nicht dokumentiert */
  lang1?: string;
  lang2?: string;
  lang3?: string;
  lang4?: string;
  lang5?: string;
}

export interface StSizeTable {
  key: string;
  txt: string;
  active: boolean;
  priority: number;
  sizeX: { pos: number; txt: string }[];
  sizeY: { pos: number; txt: string }[];
}

export interface StPreset {
  id: string;
  description: string;
}

/** V2 Wash_instructions */
export interface StWashInstruction {
  id: number;
  kind: string;
  sort: number;
  title_nl: string;
  title_fr: string;
  title_en: string;
  description_nl: string;
  description_fr: string;
  description_en: string;
  image_name: string;
  active: boolean;
}

export interface StCustomer {
  key: number;
  firstname: string;
  name: string;
  email: string;
  mobile: string;
  active: boolean | null;
  modified?: string;
  [k: string]: unknown;
}

export interface StCustomerInput {
  name: string;
  firstname?: string;
  email?: string;
  mobile?: string;
  telephone?: string;
  address?: string;
  zip?: string;
  city?: string;
  country?: string;
  accepted_gdpr_at?: string | null;
  store_id?: string;
  pos_id?: string;
}

export interface StDeliveryAddressInput {
  customer: number;
  /** Doku: name = Nachname oder Firma, surname = Vorname oder Kontaktname */
  name: string;
  surname?: string;
  address: string;
  address2?: string;
  zip: string;
  city: string;
  country: string;
  telephone?: string;
  mobile?: string;
  email?: string;
  remarks?: string;
}

export interface StDeliveryAddress extends StDeliveryAddressInput {
  key: number;
}

export interface StReservationItemInput {
  product_uid: number;
  quantity: number;
  /** Stückpreis, wenn der Shop den Preis festlegt (bezahlte Bestellungen) */
  net_price?: number;
  discount_type_id?: number;
}

export interface StReservationInput {
  customer_id: number;
  store_id?: string;
  pos_id?: string;
  payment_id?: string;
  delivery_address_id?: number;
  remarks?: string;
  items: StReservationItemInput[];
}

export interface StReservation {
  key: number;
  label_barcode: number | string;
  store_id: string;
  customer_id: number;
  delivery_address_id?: number | null;
  price_to_pay: number;
  processed: boolean;
  payment_id: string;
  items: {
    key: number;
    product_uid: number;
    quantity: number;
    unit_price: number;
    discount: number;
    price_to_pay: number;
    description: string;
  }[];
}

export interface StMessageInput {
  store?: string;
  pos?: string;
  user?: string;
  subject: string;
  message: string;
}

export interface StMessage {
  key: number;
  store: string;
  pos: string;
  user: string;
  subject: string;
  message: string;
  date: string;
  time: string;
  acknowledged: string | boolean;
}

/** V1 GET cheques?cheque=&checksum= (vorbereitet, nicht eingebaut: D10.6.6) */
export interface StCheque {
  key: number | string;
  id: number | string;
  checksum: string;
  value: number | string;
  fromdate: string | null;
  todate: string | null;
  claimed: boolean | number;
  label_barcode: number | string;
}

export interface ProductQuery {
  online?: number;
  discount_online?: number;
  updated_since_minutes?: number;
  ids?: string;
  stores?: string;
  display?: "full";
  detail?: "stock";
  take?: number;
  skip?: number;
}
