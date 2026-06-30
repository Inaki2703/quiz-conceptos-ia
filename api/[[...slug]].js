import { handleApi } from "./router.js";

export default async function handler(req, res) {
  let body = null;
  if (req.method === "PUT" || req.method === "POST") {
    body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
  }
  const slug = req.query.slug;
  const path = Array.isArray(slug) ? slug.join("/") : (slug || "");
  let qs = "";
  try { qs = new URL(req.url || `http://x/api/${path}`, "http://x").search; } catch {}
  req.url = `/api/${path}${qs}`;
  return handleApi(req, res, body);
}

export const config = { api: { bodyParser: true } };
