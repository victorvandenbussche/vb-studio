// A small Worker in front of public/.
// People (browsers) get the normal HTML pages.
// Agents that ask for "Accept: text/markdown" get the same page as markdown.
// The pages themselves still live in public/; this file only translates them.

export default {
  async fetch(request, env) {
    const path = new URL(request.url).pathname;

    // Status check for agents: answers when the site is up.
    if (path === "/health") {
      return new Response(request.method === "HEAD" ? null : '{"status":"pass"}\n', {
        headers: { "Content-Type": "application/health+json", "Cache-Control": "no-store" },
      });
    }

    // API catalog (RFC 9727): the file lives in public/.well-known/, this gives it the right type.
    if (path === "/.well-known/api-catalog") {
      const file = await env.ASSETS.fetch(request);
      const out = new Response(file.body, file);
      out.headers.set("Content-Type", 'application/linkset+json; profile="https://www.rfc-editor.org/info/rfc9727"');
      out.headers.set("Link", '</.well-known/api-catalog>; rel="api-catalog"');
      return out;
    }

    // About and Contact are for people only: AI agents, crawlers and scripts get a polite "no".
    if (isPeopleOnly(path) && (isAgent(request.headers.get("User-Agent")) || wantsMarkdown(request.headers.get("Accept")))) {
      return new Response(request.method === "HEAD" ? null :
        "This page is for people only.\n", {
        status: 403,
        headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store", "Vary": "Accept, User-Agent" },
      });
    }

    let res = await env.ASSETS.fetch(request);
    const type = res.headers.get("Content-Type") || "";
    if (!type.includes("text/html")) return res;

    // Parts of a page marked data-people-only (like Selected work on the home page) are cut out for agents.
    const agent = isAgent(request.headers.get("User-Agent")) || wantsMarkdown(request.headers.get("Accept"));
    if (agent) res = stripPeopleOnly(res);

    if (!wantsMarkdown(request.headers.get("Accept"))) {
      // HTML stays the default. Vary tells caches the answer depends on Accept and User-Agent.
      const html = new Response(res.body, res);
      html.headers.append("Vary", "Accept, User-Agent");
      if (agent) html.headers.set("Cache-Control", "no-store");
      return html;
    }

    const url = new URL(request.url);
    // A HEAD request has no body, so read the page with GET to count tokens.
    const page = request.method === "HEAD" ? stripPeopleOnly(await env.ASSETS.fetch(new Request(request, { method: "GET" }))) : res;
    const md = htmlToMarkdown(await page.text(), url.origin);
    const headers = new Headers({
      "Content-Type": "text/markdown; charset=utf-8",
      "Vary": "Accept",
      "x-markdown-tokens": String(Math.ceil(md.length / 4)),
      "Content-Signal": "search=yes, ai-input=yes, ai-train=yes",
      "Cache-Control": res.headers.get("Cache-Control") || "public, max-age=0, must-revalidate",
    });
    const link = res.headers.get("Link");
    if (link) headers.set("Link", link);
    return new Response(request.method === "HEAD" ? null : md, { status: res.status, headers });
  },
};

// Pages that only people may read (with or without .html or a trailing slash).
const PEOPLE_ONLY = new Set(["contact", "work", "myramp", "backplate"]
  .flatMap((p) => ["/" + p, "/" + p + ".html", "/" + p + "/"]));
function isPeopleOnly(path) { const p = path.toLowerCase(); return PEOPLE_ONLY.has(p) || p.startsWith("/versions/") || p.startsWith("/images/"); }

// Removes every element marked data-people-only from an HTML page.
function stripPeopleOnly(res) {
  return new HTMLRewriter().on("[data-people-only]", { element(e) { e.remove(); } }).transform(res);
}

// Known AI agents and crawlers, plus common scripting tools.
const AGENT_PATTERN = /gptbot|chatgpt|oai-searchbot|claude|anthropic|perplexity|ccbot|bytespider|amazonbot|applebot-extended|google-extended|meta-externalagent|meta-externalfetcher|facebookbot|cohere|diffbot|youbot|mistral|duckassistbot|ai2bot|petalbot|timpibot|imagesiftbot|omgili|webzio|bot\b|crawler|spider|curl|wget|python|httpx|aiohttp|axios|node-fetch|undici|go-http-client|java\/|okhttp|libwww|headless/i;
function isAgent(userAgent) { return !userAgent || AGENT_PATTERN.test(userAgent); }

// True when the visitor prefers markdown over HTML.
function wantsMarkdown(accept) {
  if (!accept) return false;
  let md = -1, html = -1;
  for (const part of accept.split(",")) {
    const [range, ...params] = part.trim().toLowerCase().split(";");
    const q = params.map((p) => p.trim()).find((p) => p.startsWith("q="));
    const weight = q ? parseFloat(q.slice(2)) : 1;
    if (range === "text/markdown") md = Math.max(md, weight);
    if (range === "text/html") html = Math.max(html, weight);
  }
  return md > 0 && md >= html;
}

const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", rarr: "→", larr: "←", middot: "·", copy: "©", mdash: "—", ndash: "–", hellip: "…" };
function decode(s) {
  return s.replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi, (m, e) => {
    if (e[0] === "#") return String.fromCodePoint(e[1].toLowerCase() === "x" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10));
    return ENTITIES[e.toLowerCase()] ?? m;
  });
}
function attr(tag, name) {
  const m = tag.match(new RegExp(`\\s${name}\\s*=\\s*("([^"]*)"|'([^']*)')`, "i"));
  return m ? decode(m[2] ?? m[3]) : "";
}
function absolute(href, origin) {
  if (!href) return "";
  if (href.startsWith("/")) return origin + href;
  return href;
}

function htmlToMarkdown(html, origin) {
  const title = decode((html.match(/<title>([\s\S]*?)<\/title>/i) || [])[1] || "").trim();
  const description = attr((html.match(/<meta[^>]+name="description"[^>]*>/i) || [""])[0], "content");
  const main = (html.match(/<main[^>]*>([\s\S]*?)<\/main>/i) || [])[1] || html;
  const footerLinks = (html.match(/<p class="footer-links">([\s\S]*?)<\/p>/i) || [])[1] || "";

  let s = main;
  s = s.replace(/<!--[\s\S]*?-->/g, "");
  s = s.replace(/<(script|style|svg|noscript|template)[\s\S]*?<\/\1>/gi, "");
  s = s.replace(/<[^>]+aria-hidden="true"[^>]*>[\s\S]*?<\/(span|div)>/gi, "");
  s = s.replace(/<br\s*\/?>/gi, " ");

  // Images: keep only the ones with a description (alt text).
  s = s.replace(/<img\b[^>]*>/gi, (tag) => {
    const alt = attr(tag, "alt");
    return alt ? `\n\n![${alt}](${absolute(attr(tag, "src"), origin)})\n\n` : "";
  });

  // Inline formatting.
  s = s.replace(/<(strong|b)\b[^>]*>([\s\S]*?)<\/\1>/gi, (m, t, inner) => (inner.trim() ? `**${inner.trim()}**` : ""));
  s = s.replace(/<(em|i)\b[^>]*>([\s\S]*?)<\/\1>/gi, (m, t, inner) => (inner.trim() ? `*${inner.trim()}*` : ""));
  s = s.replace(/<small\b[^>]*>([\s\S]*?)<\/small>/gi, " · $1");

  // Links. A link that wraps a heading (like a project tile) becomes a heading link.
  s = s.replace(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi, (m, attrs, inner) => {
    const href = absolute(attr(`<a ${attrs}>`, "href"), origin);
    const h = inner.match(/<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/i);
    if (h) {
      const rest = inner.replace(h[0], "");
      return `\n\n${"#".repeat(+h[1])} [${h[2].replace(/<[^>]+>/g, "").trim()}](${href})\n\n${rest}`;
    }
    const text = inner.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
    if (!text) return "";
    return `[${text}](${href})`;
  });

  // Blocks.
  s = s.replace(/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi, (m, n, inner) => {
    // A heading with a subtitle inside (<h1>MyRamp<span>...</span></h1>) becomes "MyRamp: ...".
    const text = inner.replace(/(\S)<span\b[^>]*>/gi, "$1: ").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
    return `\n\n${"#".repeat(+n)} ${text}\n\n`;
  });
  s = s.replace(/<li\b[^>]*>([\s\S]*?)<\/li>/gi, (m, inner) => `\n- ${inner.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()}`);
  s = s.replace(/<\/(ul|ol)>/gi, "\n\n");
  s = s.replace(/<(p|figcaption|blockquote|dd|dt)\b[^>]*>/gi, "\n\n");
  s = s.replace(/<\/(p|div|section|figure|figcaption|blockquote|dd|dt|article|header|footer)>/gi, "\n\n");
  s = s.replace(/<[^>]+>/g, "");
  s = decode(s);

  // Tidy whitespace.
  s = s
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").replace(/\s+([.,:;!?])/g, "$1").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/^(- .*)\n\n(?=- )/gm, "$1\n")
    .trim();

  const links = footerLinks
    .replace(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi, (m, attrs, inner) => `[${inner.trim()}](${absolute(attr(`<a ${attrs}>`, "href"), origin)})`)
    .replace(/<[^>]+>/g, "");

  let out = `---\ntitle: ${JSON.stringify(title)}\n`;
  if (description) out += `description: ${JSON.stringify(description)}\n`;
  out += `---\n\n${s}\n`;
  if (links) out += `\n---\n\nPages: ${decode(links).trim()}\n`;
  return out;
}
