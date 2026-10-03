/**
 * Prüfung der SoftTouch-Antworten, bevor sie benutzt werden (Doku: "Always
 * validate the response"). zod ist hier gerechtfertigt: viele Felder, Typen
 * schwanken laut Doku (Booleans als 0/1/"T", Zahlen als Text). Die Schemas sind
 * bewusst tolerant (passthrough, coerce) und prüfen nur, was wir brauchen.
 * Läuft nur serverseitig, landet nie im Browser.
 */
import { z } from "npm:zod@4.6.5";

const str = z.union([z.string(), z.number()]).transform((v) => String(v));
const optStr = z.union([z.string(), z.number(), z.null()]).optional().transform((v) => (v === null || v === undefined ? "" : String(v)));
const numLike = z.union([z.number(), z.string()]).transform((v) => Number(v));

export const productSchema = z
  .object({
    key: z.union([z.number(), z.string()]),
    id: numLike,
    variant: numLike,
    store: str,
    brand: str,
    status: z.string(),
    stock: numLike,
    price: numLike,
    netto_price: numLike,
    sizeX: str,
    sizeY: str,
    texts: z.array(z.object({ type: str, variant: numLike, sort: numLike, text: z.string() }).passthrough()).optional().default([]),
    files: z.array(z.object({ type: str, variant: numLike, sort: numLike, file: z.string() }).passthrough()).optional().default([]),
    related: z.array(z.object({ related: str }).passthrough()).optional().default([]),
    wash_instructions: z.array(numLike).optional().default([]),
    detail1: optStr,
    detail2: optStr,
    detail5: optStr,
  })
  .passthrough();

export const productsSchema = z.array(productSchema);

export const stockSchema = z.array(z.object({ key: z.union([z.number(), z.string()]), store: str, stock: numLike }).passthrough());

export const listSchema = z.array(z.record(z.string(), z.unknown()));

export const customerSchema = z.object({ key: numLike }).passthrough();
export const customersSchema = z.array(customerSchema);
export const reservationSchema = z.object({ key: numLike, items: z.array(z.record(z.string(), z.unknown())).optional().default([]) }).passthrough();
export const deliveryAddressSchema = z.object({ key: numLike }).passthrough();
export const messageSchema = z.object({ key: numLike }).passthrough();

export function parse<T>(schema: z.ZodType<T>, data: unknown, what: string): T {
  const r = schema.safeParse(data);
  if (!r.success) {
    const first = r.error.issues[0];
    throw new Error(`SoftTouch-Antwort ungültig (${what}): ${first?.path.join(".")} ${first?.message}`);
  }
  return r.data;
}
