import { handleApi } from "./router.js";

export default async function handler(req, res) {
  const body = req.method === "PUT"
    ? (typeof req.body === "string" ? JSON.parse(req.body) : req.body)
    : null;
  req.url = "/api/game";
  return handleApi(req, res, body);
}
