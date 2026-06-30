import { createServer } from "node:http";
import { handleApi } from "./api/router.js";

const PORT = 3001;

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

createServer(async (req, res) => {
  const body = ["PUT", "POST"].includes(req.method) ? await readBody(req) : null;
  await handleApi(req, res, body);
}).listen(PORT, () => {
  console.log(`API dev server http://localhost:${PORT}`);
});
