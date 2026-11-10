// Writes public/sitemap.xml from the main pages in public/.
// Runs by itself before every `npx wrangler deploy` (see "build" in wrangler.jsonc).
// Old versions in public/versions/ are left out on purpose: they are copies, not the real pages.
import { readdirSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";

const SITE = "https://vb-pm.vdb1.workers.dev";
const today = new Date().toISOString().slice(0, 10);

function lastChanged(file) {
  try {
    const d = execSync(`git log -1 --format=%cs -- "${file}"`, { encoding: "utf8" }).trim();
    return d || today;
  } catch {
    return today;
  }
}

const pages = readdirSync("public")
  .filter((f) => f.endsWith(".html"))
  .sort((a, b) => (a === "index.html" ? -1 : b === "index.html" ? 1 : a.localeCompare(b)));

const urls = pages.map((f) => {
  const path = f === "index.html" ? "/" : "/" + f.replace(/\.html$/, "");
  return `  <url>\n    <loc>${SITE}${path}</loc>\n    <lastmod>${lastChanged("public/" + f)}</lastmod>\n  </url>`;
});

writeFileSync(
  "public/sitemap.xml",
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>\n`
);
console.log(`sitemap.xml: ${pages.length} pages`);
