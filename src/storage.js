const API = "/api";
const HOST_KEY = "quiz:host-token";

function getHostToken() {
  try { return sessionStorage.getItem(HOST_KEY); } catch { return null; }
}
function setHostToken(token) {
  try { sessionStorage.setItem(HOST_KEY, token); } catch {}
}

async function req(path, opts = {}) {
  const headers = { "Content-Type": "application/json", ...opts.headers };
  const token = getHostToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const r = await fetch(`${API}${path}`, { cache: "no-store", ...opts, headers });
  const text = await r.text();
  const data = text ? JSON.parse(text) : null;
  if (!r.ok) {
    const err = new Error(data?.error || `API ${path} failed`);
    err.code = data?.code;
    err.status = r.status;
    throw err;
  }
  return data;
}

export const hasStore = () => true;

export async function getHostConfig() {
  try {
    return await req("/host-config");
  } catch {
    return { passwordRequired: false };
  }
}

export async function claimHost(password) {
  const data = await req("/host-claim", {
    method: "POST",
    body: JSON.stringify(password ? { password } : {}),
  });
  if (data?.token) setHostToken(data.token);
  return data;
}

export async function readGame() {
  try {
    return await req(`/game?_=${Date.now()}`);
  } catch {
    return null;
  }
}

export async function writeGame(g) {
  await req("/game", { method: "PUT", body: JSON.stringify(g) });
}

export async function writePlayer(id, p) {
  try {
    await req("/players", { method: "PUT", body: JSON.stringify(p) });
  } catch {}
}

export async function listPlayers() {
  try {
    return (await req("/players")) || [];
  } catch {
    return [];
  }
}

export async function clearAll() {
  try {
    await req("/players", { method: "DELETE" });
    await writeGame({ phase: "lobby", q: -1 });
  } catch {}
}
