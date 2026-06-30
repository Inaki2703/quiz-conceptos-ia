import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { join, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { handleApi } from "./api/router.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const DIST = join(__dirname, "dist");
const PORT = process.env.PORT || 3000;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".json": "application/json",
};

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (c) => { data += c; });
    req.on("end", () => {
      try { resolve(data ? JSON.parse(data) : null); }
      catch (e) { reject(e); }
    });
    req.on("error", reject);
  });
}

async function serveStatic(req, res) {
  let path = req.url.split("?")[0];
  if (path === "/") path = "/index.html";
  const file = join(DIST, path);
  try {
    const s = await stat(file);
    if (!s.isFile()) throw new Error("not file");
    const body = await readFile(file);
    res.writeHead(200, { "Content-Type": MIME[extname(file)] || "application/octet-stream" });
    res.end(body);
  } catch {
    const body = await readFile(join(DIST, "index.html"));
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(body);
  }
}

createServer(async (req, res) => {
  if (req.url?.startsWith("/api/")) {
    const body = ["PUT", "POST"].includes(req.method) ? await readBody(req) : null;
    await handleApi(req, res, body);
    return;
  }
  return serveStatic(req, res);
}).listen(PORT, () => {
  console.log(`Quiz listo en http://localhost:${PORT}`);
  if (process.env.HOST_PASSWORD) console.log("Host protegido con contraseña.");
});
