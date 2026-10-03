/**
 * Volltextsuche auch im Dev-Server (npm run dev, npm run demo).
 *
 * Im Build legt `pagefind --site dist` den Index nach dist/pagefind/. Im Dev-Server
 * gibt es kein dist; ohne diese Erweiterung meldete die Suche nur "nicht verfügbar".
 * Hier baut die Erweiterung denselben Index aus den Seiten, die der Dev-Server
 * selbst ausliefert (Startseiten und ihre Links, dazu alle Artikel aus
 * /{lang}/filter/artikel.json), und liefert ihn unter /pagefind/ aus dem Speicher.
 * Pagefind wertet dieselben data-pagefind-*-Attribute aus wie im Build.
 *
 * Der Index entsteht kurz nach dem Start im Hintergrund (etwa 10–30 s) und nach
 * Änderungen in src/ neu; bis dahin bleibt der alte gültig. Im Build tut die
 * Erweiterung nichts.
 */
import type { AstroIntegration, AstroIntegrationLogger } from "astro";

const SPRACHEN = ["lb", "de", "fr", "en"];
const PARALLEL = 6;
const TYPEN: Record<string, string> = {
  js: "text/javascript; charset=utf-8",
  css: "text/css; charset=utf-8",
  json: "application/json",
  wasm: "application/wasm",
};

export default function devSuche(): AstroIntegration {
  let basis = "/";
  let adresse = "";
  let log: AstroIntegrationLogger | null = null;
  // Dateien bleiben über Neubauten erhalten: Eine schon geöffnete Seite lädt
  // vielleicht noch Fragmente des vorigen Index (Namen mit Hash).
  const dateien = new Map<string, Uint8Array>();
  let fertig: Promise<void> | null = null;
  let laeuft = false;
  let nochmal = false;
  let neuTimer: ReturnType<typeof setTimeout> | undefined;

  async function seiten(): Promise<string[]> {
    const urls = new Set<string>();
    const intern = (u: string) => u.startsWith(basis) && !u.includes("/filter/") && !/\.(json|xml|txt|svg|webp|png|jpe?g|ico)$/.test(u);
    for (const lang of SPRACHEN) {
      const start = `${basis}${lang}/`;
      urls.add(start);
      const html = await (await fetch(adresse + start)).text();
      for (const m of html.matchAll(/href="([^"#?]+)/g)) if (intern(m[1]!) && m[1]!.startsWith(start)) urls.add(m[1]!);
      const idx = (await (await fetch(`${adresse}${basis}${lang}/filter/artikel.json`)).json()) as { a: { url: string }[] };
      for (const a of idx.a) urls.add(a.url);
    }
    return [...urls];
  }

  async function bauen(): Promise<void> {
    laeuft = true;
    const t0 = Date.now();
    const pagefind = await import("pagefind");
    try {
      const { index, errors } = await pagefind.createIndex({});
      if (!index) throw new Error(errors.join("; "));
      const liste = await seiten();
      let i = 0;
      const arbeiter = async () => {
        while (i < liste.length) {
          const url = liste[i++]!;
          const res = await fetch(adresse + url).catch(() => null);
          if (!res?.ok || !(res.headers.get("content-type") ?? "").includes("text/html")) continue;
          // Pagefind setzt die Basis (BASE_PATH) selbst davor, wie im Build
          await index.addHTMLFile({ url: "/" + url.slice(basis.length), content: await res.text() });
        }
      };
      await Promise.all(Array.from({ length: PARALLEL }, arbeiter));
      const { files } = await index.getFiles();
      for (const f of files) dateien.set(f.path.replace(/^\/+/, ""), f.content);
      await index.deleteIndex();
      log?.info(`Suchindex bereit: ${liste.length} Seiten geprüft in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
    } finally {
      await pagefind.close().catch(() => null);
      laeuft = false;
      if (nochmal) {
        nochmal = false;
        setTimeout(starten, 0);
      }
    }
  }

  const starten = (): Promise<void> => {
    if (laeuft && fertig) {
      nochmal = true; // nach dem laufenden Bau noch einmal
      return fertig;
    }
    fertig = bauen().catch((e: unknown) => {
      log?.error(`Suchindex: ${e instanceof Error ? e.message : String(e)}`);
    });
    return fertig;
  };

  return {
    name: "lj-dev-suche",
    hooks: {
      "astro:config:done": ({ config }) => {
        basis = config.base.endsWith("/") ? config.base : config.base + "/";
      },
      "astro:server:setup": ({ server, logger }) => {
        log = logger;
        const prefix = `${basis}pagefind/`;
        // Adresse des Dev-Servers (auch nach einem Neustart durch Konfigurationsänderung)
        const ermitteln = () => {
          const u = server.resolvedUrls?.local[0];
          if (!adresse && u) adresse = new URL(u).origin;
          return adresse;
        };
        // kurz nach dem Start im Hintergrund bauen, damit die erste Suche nicht wartet
        setTimeout(() => {
          if (ermitteln()) void starten();
        }, 2000);
        server.middlewares.use((req, res, next) => {
          const pfad = (req.url ?? "").split("?")[0]!;
          if (!pfad.startsWith(prefix)) return next();
          if (!ermitteln() && req.headers.host) adresse = `http://${req.headers.host}`;
          void (async () => {
            // noch kein Index (Start, oder der erste Bau schlug fehl): bauen und warten
            if (!dateien.has("pagefind.js")) await (laeuft && fertig ? fertig : starten());
            const datei = dateien.get(decodeURIComponent(pfad.slice(prefix.length)));
            if (!datei) {
              res.statusCode = 404;
              res.end();
              return;
            }
            res.setHeader("Content-Type", TYPEN[pfad.split(".").pop() ?? ""] ?? "application/octet-stream");
            res.setHeader("Cache-Control", "no-store");
            res.end(Buffer.from(datei));
          })().catch(next);
        });
        // Inhalte geändert: Index im Hintergrund neu (gebündelt)
        server.watcher.on("change", (datei) => {
          if (!/[\\/]src[\\/]|[\\/]fixtures[\\/]/.test(datei) || !adresse) return;
          clearTimeout(neuTimer);
          neuTimer = setTimeout(starten, 4000);
        });
      },
    },
  };
}
