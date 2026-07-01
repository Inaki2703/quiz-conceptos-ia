import { Redis } from "@upstash/redis";

const GAME_KEY = "bankaool:game";
const PLAYER_SET = "bankaool:player-ids";

function useMemory() {
  if (!globalThis.__quizStore) {
    globalThis.__quizStore = {
      game: { phase: "lobby", q: -1, rev: 0 },
      players: new Map(),
    };
  }
  return globalThis.__quizStore;
}

function getRedis() {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

export function hasSharedStore() {
  return Boolean(getRedis());
}

function stampGame(g) {
  return { ...g, rev: Date.now(), updatedAt: Date.now() };
}

export async function readGame() {
  const redis = getRedis();
  if (!redis) return useMemory().game;
  const g = await redis.get(GAME_KEY);
  return g || { phase: "lobby", q: -1, rev: 0 };
}

export async function writeGame(g) {
  const game = stampGame(g);
  const redis = getRedis();
  if (!redis) {
    useMemory().game = game;
    return game;
  }
  await redis.set(GAME_KEY, game);
  return game;
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

export async function readSync() {
  const [game, players] = await Promise.all([readGame(), listPlayers()]);
  return { game, players, serverTime: Date.now(), shared: hasSharedStore() };
}

export async function clearAll() {
  const resetId = Date.now();
  const fresh = { phase: "lobby", q: -1, resetId };
  const redis = getRedis();
  if (!redis) {
    globalThis.__quizStore = {
      game: stampGame(fresh),
      players: new Map(),
    };
    return stampGame(fresh);
  }
  const ids = await redis.smembers(PLAYER_SET);
  if (ids.length) {
    await redis.del(...ids.map((id) => `${PLAYER_SET}:${id}`));
  }
  await redis.del(PLAYER_SET);
  return writeGame(fresh);
}

export function usingMemory() {
  return !getRedis();
}
