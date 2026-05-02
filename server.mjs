import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { existsSync, statSync } from "node:fs";
import { join, extname, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { convertFromSubscription } from "./src/core/convert.ts";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || "0.0.0.0";
const STATIC_DIR = join(__dirname, "dist");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
  ".ico": "image/x-icon",
  ".json": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".map": "application/json; charset=utf-8",
};

async function serveStatic(req, res) {
  const reqPath = decodeURIComponent(req.url.split("?")[0]);
  let candidate = normalize(join(STATIC_DIR, reqPath));
  if (!candidate.startsWith(STATIC_DIR)) {
    res.statusCode = 403;
    res.end("forbidden");
    return;
  }
  if (existsSync(candidate) && statSync(candidate).isDirectory()) {
    candidate = join(candidate, "index.html");
  }
  if (!existsSync(candidate)) {
    candidate = join(STATIC_DIR, "index.html");
  }
  try {
    const data = await readFile(candidate);
    res.setHeader(
      "Content-Type",
      MIME[extname(candidate)] || "application/octet-stream"
    );
    res.statusCode = 200;
    res.end(data);
  } catch {
    res.statusCode = 404;
    res.end("not found");
  }
}

async function handleConvert(req, res) {
  const u = new URL(req.url, "http://localhost");
  const url = u.searchParams.get("url");
  const target = u.searchParams.get("target") || "clash";
  if (!url || (target !== "clash" && target !== "surge")) {
    res.statusCode = 400;
    res.end("invalid query");
    return;
  }
  try {
    const result = await convertFromSubscription(url, target);
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.statusCode = 200;
    res.end(result);
  } catch (e) {
    res.statusCode = 500;
    res.end(String(e));
  }
}

const server = createServer(async (req, res) => {
  try {
    if (req.url && req.url.startsWith("/api/convert")) {
      await handleConvert(req, res);
      return;
    }
    if (req.url === "/healthz") {
      res.statusCode = 200;
      res.end("ok");
      return;
    }
    await serveStatic(req, res);
  } catch (e) {
    res.statusCode = 500;
    res.end(String(e));
  }
});

server.listen(PORT, HOST, () => {
  console.log(`proxy-provider-converter listening on http://${HOST}:${PORT}`);
});
