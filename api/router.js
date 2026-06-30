import { readGame, writeGame, writePlayer, listPlayers, clearAll, readSync } from "./_store.js";
import { claimHost, hostConfig, requireHost } from "./_host.js";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, PUT, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};
const NO_CACHE = {
  "Cache-Control": "no-store, no-cache, must-revalidate",
  Pragma: "no-cache",
};

export function apiResponse(res, status, body, extraHeaders = {}) {
  const headers = { "Content-Type": "application/json", ...CORS, ...NO_CACHE, ...extraHeaders };
  if (typeof res.writeHead === "function") {
    res.writeHead(status, headers);
    res.end(body === undefined ? "" : JSON.stringify(body));
    return;
  }
  for (const [k, v] of Object.entries(headers)) res.setHeader(k, v);
  return res.status(status).json(body);
}

export async function handleApi(req, res, body) {
  const url = (req.url || "").split("?")[0];
  const method = req.method;

  if (method === "OPTIONS") return apiResponse(res, 204);

  try {
    if ((url === "/api/host/config" || url === "/api/host-config") && method === "GET") {
      return apiResponse(res, 200, hostConfig());
    }

    if ((url === "/api/host/claim" || url === "/api/host-claim") && method === "POST") {
      const result = await claimHost(body?.password);
      return apiResponse(res, 200, result);
    }

    if (url === "/api/sync" && method === "GET") {
      return apiResponse(res, 200, await readSync());
    }

    if (url === "/api/game") {
      if (method === "GET") return apiResponse(res, 200, await readGame());
      if (method === "PUT") {
        await requireHost(req);
        const saved = await writeGame(body);
        return apiResponse(res, 200, { ok: true, game: saved });
      }
    }

    if (url === "/api/players") {
      if (method === "GET") return apiResponse(res, 200, await listPlayers());
      if (method === "PUT") {
        await writePlayer(body.id, body);
        return apiResponse(res, 200, { ok: true });
      }
      if (method === "DELETE") {
        await requireHost(req);
        await clearAll();
        return apiResponse(res, 200, { ok: true });
      }
    }

    return apiResponse(res, 404, { error: "Not found" });
  } catch (e) {
    const status = e.status || 500;
    return apiResponse(res, status, { error: e.message, code: e.code });
  }
}
