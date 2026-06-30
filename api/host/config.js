import { handleApi } from "../router.js";

export default async function handler(req, res) {
  req.url = "/api/host/config";
  return handleApi(req, res, null);
}
