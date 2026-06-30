import { handleApi } from "../router.js";

export default async function handler(req, res) {
  const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
  req.url = "/api/host/claim";
  return handleApi(req, res, body);
}
