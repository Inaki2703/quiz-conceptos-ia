import crypto from "node:crypto";
import { getHostToken, setHostToken } from "./_store.js";

export function hostAuthEnabled() {
  return Boolean(process.env.HOST_PASSWORD);
}

export function hostConfig() {
  return { passwordRequired: hostAuthEnabled() };
}

export async function claimHost(password) {
  if (!process.env.HOST_PASSWORD) {
    const token = crypto.randomUUID();
    await setHostToken(token);
    return { token };
  }

  if (password === process.env.HOST_PASSWORD) {
    const token = crypto.randomUUID();
    await setHostToken(token);
    return { token };
  }

  const err = new Error("Contraseña incorrecta.");
  err.status = 403;
  throw err;
}

export async function verifyHostToken(token) {
  if (!hostAuthEnabled()) return true;
  if (!token) return false;
  return (await getHostToken()) === token;
}

export function bearerToken(req) {
  const h = req.headers?.authorization || req.headers?.Authorization || "";
  const m = /^Bearer\s+(.+)$/i.exec(h);
  return m ? m[1] : null;
}

export async function requireHost(req) {
  if (!hostAuthEnabled()) return;
  const ok = await verifyHostToken(bearerToken(req));
  if (!ok) {
    const err = new Error("No autorizado para controlar el juego.");
    err.status = 401;
    throw err;
  }
}
