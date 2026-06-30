import { handleApi } from "./router.js";

function resolvePath(req) {
  const slug = req.query.slug;
  if (Array.isArray(slug)) return slug.join("/");
  if (typeof slug === "string" && slug) return slug;
  const raw = req.url || "";
  const m = raw.match(/\/api\/?([^?]*)/);
  return m ? m[1] : "";
}

export default async function handler(req, res) {
  let body = null;
  if (req.method === "PUT" || req.method === "POST") {
    body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
  }
  const path = resolvePath(req);
  let qs = "";
  try { qs = new URL(req.url || `http://x/api/${path}`, "http://x").search; } catch {}
  req.url = `/api/${path}${qs}`;
  return handleApi(req, res, body);
}
