import { handleApi } from "./router.js";

export default async function handler(req, res) {
  let body = null;
  if (req.method === "PUT") {
    body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  }
  req.url = "/api/players";
  return handleApi(req, res, body);
}
