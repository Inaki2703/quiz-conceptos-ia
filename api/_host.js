import crypto from "node:crypto";

const hostSecret = () => (process.env.HOST_PASSWORD || "").trim();

export function hostAuthEnabled() {
  return Boolean(hostSecret());
}

export function hostConfig() {
  return { passwordRequired: hostAuthEnabled() };
}

function makeHostToken() {
  const secret = hostSecret();
  if (!secret) return crypto.randomUUID();
  const exp = Date.now() + 12 * 60 * 60 * 1000;
  const payload = Buffer.from(JSON.stringify({ role: "host", exp })).toString("base64url");
  const sig = crypto.createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

function verifyToken(token) {
  const secret = hostSecret();
  if (!secret) return true;
  if (!token) return false;
  const dot = token.indexOf(".");
  if (dot < 0) return false;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = crypto.createHmac("sha256", secret).update(payload).digest("base64url");
  if (sig.length !== expected.length) return false;
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return false;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString());
    return data.role === "host" && data.exp > Date.now();
  } catch {
    return false;
  }
}

export async function claimHost(password) {
  if (!hostAuthEnabled()) return { token: makeHostToken() };

  if ((password || "").trim() === hostSecret()) {
    return { token: makeHostToken() };
  }

  const err = new Error("Contraseña incorrecta.");
  err.status = 403;
  throw err;
}

export async function verifyHostToken(token) {
  return verifyToken(token);
}

export function bearerToken(req) {
  const h = req.headers?.authorization || req.headers?.Authorization || "";
  const m = /^Bearer\s+(.+)$/i.exec(h);
  return m ? m[1] : null;
}

export async function requireHost(req) {
  if (!hostAuthEnabled()) return;
  if (!verifyToken(bearerToken(req))) {
    const err = new Error("No autorizado para controlar el juego.");
    err.status = 401;
    throw err;
  }
}
