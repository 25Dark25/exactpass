// Minimal local server: 127.0.0.1 only, whitelisted routes only, strict headers. No dependencies.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const port = Number(process.argv[2] ?? 8080);
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".txt": "text/plain; charset=utf-8" };
const ROUTES = new Map([
  ["/", "index.html"], ["/web/app.js", "web/app.js"], ["/web/style.css", "web/style.css"],
  ["/src/rng.js", "src/rng.js"], ["/src/entropy.js", "src/entropy.js"], ["/src/generate.js", "src/generate.js"], ["/src/i18n.js", "src/i18n.js"],
]);
const CSP = "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src data:; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";

const server = createServer(async (req, res) => {
  const send = (code, body, type = "text/plain; charset=utf-8") => {
    res.writeHead(code, {
      "Content-Type": type, "Content-Security-Policy": CSP, "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer", "Cache-Control": "no-store", "Cross-Origin-Resource-Policy": "same-origin",
    });
    res.end(body);
  };
  try {
    if (![`127.0.0.1:${port}`, `localhost:${port}`].includes(req.headers.host ?? "")) return send(403, "Host not allowed");
    if (req.method !== "GET") return send(405, "Method not allowed");
    const path = new URL(req.url, "http://localhost").pathname;
    const rel = ROUTES.get(path) ?? (/^\/wordlists\/[\w.-]+\.txt$/.test(path) ? path.slice(1) : null);
    if (!rel) return send(404, "Not found");
    const ext = rel.slice(rel.lastIndexOf("."));
    send(200, await readFile(join(root, rel)), TYPES[ext]);
  } catch {
    send(404, "Not found");
  }
});
server.on("error", (e) => {
  console.error(e.code === "EADDRINUSE" ? `Port ${port} is already in use. Try: npm start -- 8181` : `Server error: ${e.message}`);
  process.exit(1);
});
server.listen(port, "127.0.0.1", () => console.log(`exactpass listening on http://127.0.0.1:${port}  (Ctrl+C to stop)`));
