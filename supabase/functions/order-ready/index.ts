// Edge Function "order-ready". Logik in handler.ts (auch vom lokalen Demo-Server benutzt).
import { handler } from "./handler.ts";

Deno.serve(handler);
