// @ts-check
import { defineConfig } from "astro/config";
import { loadEnv } from "vite";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";
import devSuche from "./scripts/dev-suche.ts";

// .env-Dateien auch für process.env laden (Build-Code liest process.env)
const fileEnv = loadEnv(process.env.NODE_ENV === "production" ? "production" : "development", process.cwd(), "");
for (const [k, v] of Object.entries(fileEnv)) if (process.env[k] === undefined) process.env[k] = v;

const site = (process.env.SITE_URL || "https://www.DOMAIN.lu").replace(/\/+$/, "");
const basePath = "/" + (process.env.BASE_PATH || "").replace(/^\/+|\/+$/g, "");
const supabaseHost = (() => {
  try {
    return process.env.SUPABASE_URL ? new URL(process.env.SUPABASE_URL).hostname : undefined;
  } catch {
    return undefined;
  }
})();

export default defineConfig({
  site,
  base: basePath === "/" ? "/" : basePath + "/",
  trailingSlash: "always",
  output: "static",
  // Lasttest baut nach dist-loadtest/ (scripts/loadtest-build.ts)
  outDir: process.env.ASTRO_OUT_DIR || "./dist",
  build: { format: "directory", inlineStylesheets: "auto" },
  compressHTML: true,
  devToolbar: { enabled: false },
  // Suche im Dev-Server (im Build: pagefind --site dist)
  integrations: [devSuche()],
  prefetch: false,
  image: {
    // Produktfotos kommen beim Build aus dem Supabase-Storage-Bucket `produktfotos`
    domains: supabaseHost ? [supabaseHost] : [],
    responsiveStyles: false,
  },
  server: { port: 4321, host: "127.0.0.1" },
  vite: {
    plugins: [tailwindcss()],
    resolve: {
      alias: { "@shared": fileURLToPath(new URL("./supabase/functions/_shared", import.meta.url)) },
    },
  },
});
