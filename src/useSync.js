import { useState, useEffect, useRef, useCallback } from "react";
import { fetchSync, gameChanged, SYNC_POLL_MS } from "./storage.js";

/** Poll unificado: game + players desde la misma lectura del servidor */
export function useSync({ enabled, withPlayers = false }) {
  const [game, setGame] = useState({ phase: "lobby", q: -1, rev: 0 });
  const [players, setPlayers] = useState([]);
  const [sharedStore, setSharedStore] = useState(null);
  const gameRef = useRef(game);
  gameRef.current = game;

  const applySync = useCallback((data) => {
    if (!data?.game) return;
    if (typeof data.shared === "boolean") setSharedStore(data.shared);
    if (gameChanged(gameRef.current, data.game)) {
      gameRef.current = data.game;
      setGame(data.game);
    }
    if (withPlayers && data.players) setPlayers(data.players);
  }, [withPlayers]);

  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    const poll = async () => {
      const data = await fetchSync();
      if (alive) applySync(data);
    };
    poll();
    const t = setInterval(poll, SYNC_POLL_MS);
    const onVis = () => { if (document.visibilityState === "visible") poll(); };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      alive = false;
      clearInterval(t);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [enabled, applySync]);

  return { game, setGame, players, setPlayers, gameRef, sharedStore };
}
