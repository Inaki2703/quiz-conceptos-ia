import { Redis } from "@upstash/redis";

const GAME_KEY = "bankaool:game";
const PLAYER_SET = "bankaool:player-ids";
const HOST_TOKEN_KEY = "bankaool:host-token";

let memory = null;

function useMemory() {
  if (!memory) {
    memory = { game: { phase: "lobby", q: -1 }, players: new Map() };
  }
  return memory;
}

function getRedis() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

export async function readGame() {
  const redis = getRedis();
  if (!redis) return useMemory().game;
  const g = await redis.get(GAME_KEY);
  return g || { phase: "lobby", q: -1 };
}

export async function writeGame(g) {
  const redis = getRedis();
  if (!redis) {
    useMemory().game = g;
    return;
  }
  await redis.set(GAME_KEY, g);
}

export async function writePlayer(id, p) {
  const redis = getRedis();
  if (!redis) {
    useMemory().players.set(id, p);
    return;
  }
  await redis.set(`${PLAYER_SET}:${id}`, p);
  await redis.sadd(PLAYER_SET, id);
}

export async function listPlayers() {
  const redis = getRedis();
  if (!redis) return [...useMemory().players.values()];
  const ids = await redis.smembers(PLAYER_SET);
  if (!ids.length) return [];
  const keys = ids.map((id) => `${PLAYER_SET}:${id}`);
  const rows = await redis.mget(...keys);
  return rows.filter(Boolean);
}

export async function clearAll() {
  const redis = getRedis();
  if (!redis) {
    memory = null;
    return;
  }
  const ids = await redis.smembers(PLAYER_SET);
  if (ids.length) {
    await redis.del(...ids.map((id) => `${PLAYER_SET}:${id}`));
  }
  await redis.del(PLAYER_SET, GAME_KEY, HOST_TOKEN_KEY);
}

export async function getHostToken() {
  const redis = getRedis();
  if (!redis) return useMemory().hostToken || null;
  return (await redis.get(HOST_TOKEN_KEY)) || null;
}

export async function setHostToken(token) {
  const redis = getRedis();
  if (!redis) {
    useMemory().hostToken = token;
    return;
  }
  await redis.set(HOST_TOKEN_KEY, token);
}

export function hasBackend() {
  return Boolean(getRedis()) || Boolean(memory);
}

export function usingMemory() {
  return !getRedis();
}
