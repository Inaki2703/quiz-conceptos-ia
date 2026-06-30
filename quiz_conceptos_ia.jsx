import { useState, useEffect, useRef, useCallback } from "react";

/* ----------------------------- Datos ----------------------------- */
const QUESTIONS = [
  { q: "¿Qué es un LLM o “modelo”?",
    opts: ["Un buscador que consulta una base de datos para responder",
           "Un programa con reglas escritas a mano para cada respuesta",
           "Un sistema que predice el texto más probable, token por token",
           "Una IA que entiende y razona igual que una persona"], correct: 2 },
  { q: "Cuando le “pides” algo a un modelo, ¿eso qué es?",
    opts: ["Un prompt: la instrucción que le das y condiciona su salida",
           "Un comando que ejecuta una función fija del sistema",
           "Una búsqueda que filtra resultados que ya existen",
           "Una pregunta que el modelo guarda para aprender de ti"], correct: 0 },
  { q: "¿Qué es la “ventana de contexto”?",
    opts: ["La memoria permanente donde guarda todo lo que le dices",
           "El historial completo de todas tus conversaciones",
           "La ventana del programa donde escribes",
           "Lo que el modelo puede tener presente a la vez; es limitada"], correct: 3 },
  { q: "¿Qué es un “token”?",
    opts: ["Una palabra completa, siempre",
           "La unidad mínima de texto que el modelo procesa y cuenta",
           "Una contraseña de acceso al modelo",
           "Un crédito que compras para poder usarlo"], correct: 1 },
  { q: "¿Por qué usé archivos .md (Markdown) como contexto?",
    opts: ["Porque es el único formato que un agente puede leer",
           "Porque pesa menos que cualquier otro archivo",
           "Es texto plano estructurado: legible para el agente y versionable",
           "Porque Figma exporta directo a Markdown"], correct: 2 },
  { q: "¿Qué es un “agente” de IA?",
    opts: ["Un modelo con herramientas, un objetivo y un bucle para actuar",
           "Un modelo más avanzado y más caro que los normales",
           "Una persona que supervisa lo que la IA genera",
           "Un chatbot que solo responde preguntas"], correct: 0 },
  { q: "En mi flujo, ¿qué fue el “arnés” (Claude Code)?",
    opts: ["El modelo de IA que generó el código",
           "El archivo de reglas que escribí (CLAUDE.md)",
           "El servidor donde se aloja la app",
           "El entorno que le da manos al modelo: leer, escribir, ejecutar"], correct: 3 },
  { q: "Dije “leyó el nodo real de Figma”. ¿Qué lo hizo posible?",
    opts: ["Una captura de pantalla que le pasé",
           "El MCP: el protocolo que conecta el arnés con herramientas externas",
           "Una descripción mía del diseño, escrita a mano",
           "Un plugin de Figma que exporta código solo"], correct: 1 },
  { q: "¿Qué es “vibe coding”?",
    opts: ["Cualquier uso de IA para programar, con o sin método",
           "Programar sin saber nada de código, siempre",
           "Generar código por intención, sin leer ni controlar el detalle",
           "Dirigir un agente con un contrato y calibración estrictos"], correct: 2 },
];

/* ----------------------------- Tema ----------------------------- */
const C = {
  cream: "#FBFAF6", ink: "#2B2A28", ink2: "#43403C", g200: "#EFEDE8",
  g300: "#E2DFD9", g500: "#BDB8B2", g700: "#6F6B66",
  terra: "#EE8E56", terra7: "#D55C15", blue: "#4C7AD2", green: "#60A08F", yellow: "#F2B543",
};
const TILES = [
  { bg: C.terra,  fg: C.ink, shape: "▲" },
  { bg: C.blue,   fg: "#fff", shape: "■" },
  { bg: C.green,  fg: "#fff", shape: "●" },
  { bg: C.yellow, fg: C.ink, shape: "◆" },
];
const FONT = "'Figtree','Segoe UI',system-ui,sans-serif";

/* ----------------------------- Storage ----------------------------- */
const GAME = "bankaool:game";
const PFX = "bankaool:player:";

const hasStore = () => typeof window !== "undefined" && window.storage;

async function readGame() {
  if (!hasStore()) return null;
  try { const r = await window.storage.get(GAME, true); return r ? JSON.parse(r.value) : null; }
  catch (e) { return null; }
}
async function writeGame(g) {
  if (!hasStore()) return;
  try { await window.storage.set(GAME, JSON.stringify(g), true); } catch (e) {}
}
async function writePlayer(id, p) {
  if (!hasStore()) return;
  try { await window.storage.set(PFX + id, JSON.stringify(p), true); } catch (e) {}
}
function keyOf(k) { return typeof k === "string" ? k : (k && k.key) || ""; }
async function listPlayers() {
  if (!hasStore()) return [];
  try {
    const r = await window.storage.list(PFX, true);
    const keys = (r && r.keys) || [];
    const out = [];
    for (const k of keys) {
      const key = keyOf(k);
      try { const v = await window.storage.get(key, true); if (v) out.push(JSON.parse(v.value)); } catch (e) {}
    }
    return out;
  } catch (e) { return []; }
}
async function clearAll() {
  if (!hasStore()) return;
  try {
    const r = await window.storage.list(PFX, true);
    const keys = (r && r.keys) || [];
    for (const k of keys) { try { await window.storage.delete(keyOf(k), true); } catch (e) {} }
  } catch (e) {}
  await writeGame({ phase: "lobby", q: -1 });
}

function uid() {
  try { return crypto.randomUUID(); } catch (e) { return "p" + Math.random().toString(36).slice(2) + Date.now(); }
}
function scoreOf(p) {
  let s = 0;
  for (let i = 0; i < QUESTIONS.length; i++) if (p.answers && p.answers[String(i)] === QUESTIONS[i].correct) s++;
  return s;
}

/* ----------------------------- UI helpers ----------------------------- */
function Shell({ dark, children }) {
  return (
    <div style={{ minHeight: "100%", background: dark ? C.ink : C.cream, fontFamily: FONT,
      color: dark ? C.cream : C.ink, padding: "28px 22px", boxSizing: "border-box" }}>
      <div style={{ maxWidth: 880, margin: "0 auto" }}>{children}</div>
    </div>
  );
}
function Btn({ children, onClick, kind = "primary", disabled }) {
  const styles = {
    primary: { background: C.ink, color: C.cream },
    accent: { background: C.terra, color: C.ink },
    ghost: { background: "transparent", color: C.ink, border: `1px solid ${C.g300}` },
    danger: { background: "transparent", color: C.terra7, border: `1px solid ${C.terra}` },
  }[kind];
  return (
    <button onClick={onClick} disabled={disabled} style={{
      ...styles, fontFamily: FONT, fontSize: 16, fontWeight: 700, padding: "13px 22px",
      borderRadius: 12, border: styles.border || "none", cursor: disabled ? "default" : "pointer",
      opacity: disabled ? 0.45 : 1, transition: "transform .05s", }}>
      {children}
    </button>
  );
}
function Eyebrow({ children, dark }) {
  return <div style={{ color: dark ? C.terra : C.terra7, fontWeight: 800, fontSize: 12,
    letterSpacing: 2, textTransform: "uppercase", marginBottom: 8 }}>{children}</div>;
}

/* ----------------------------- App ----------------------------- */
export default function App() {
  const [screen, setScreen] = useState("home"); // home | host | player
  const [storeWarn, setStoreWarn] = useState(false);

  useEffect(() => { if (!hasStore()) setStoreWarn(true); }, []);

  return (
    <Shell dark={screen === "home"}>
      {screen === "home" && <Home onHost={() => setScreen("host")} onPlay={() => setScreen("player")} warn={storeWarn} />}
      {screen === "host" && <Host onExit={() => setScreen("home")} />}
      {screen === "player" && <Player onExit={() => setScreen("home")} />}
    </Shell>
  );
}

/* ----------------------------- Home ----------------------------- */
function Home({ onHost, onPlay, warn }) {
  return (
    <div style={{ paddingTop: 30 }}>
      <Eyebrow dark>Sesión · Diseño + IA</Eyebrow>
      <h1 style={{ fontSize: 46, fontWeight: 800, margin: "4px 0 6px", lineHeight: 1.05 }}>
        Afiancemos los<br />conceptos clave
      </h1>
      <p style={{ color: C.g500, fontSize: 18, margin: "0 0 30px" }}>
        Un repaso rápido y sin presión — entre todos.
      </p>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Btn kind="accent" onClick={onPlay}>Entrar como jugador</Btn>
        <Btn kind="ghost" onClick={onHost}>
          <span style={{ color: C.cream }}>Soy el host (Iñaki)</span>
        </Btn>
      </div>
      <div style={{ marginTop: 26, color: C.g500, fontSize: 13, lineHeight: 1.5, maxWidth: 560 }}>
        Todos abren <b style={{ color: C.cream }}>este mismo enlace</b>. Una sola persona entra como host
        y controla el avance; el resto entra como jugador.
      </div>
      {warn && (
        <div style={{ marginTop: 22, padding: "12px 14px", borderRadius: 10, background: C.ink2,
          color: C.yellow, fontSize: 13 }}>
          Para que la sincronización funcione, publica/comparte este artifact desde Claude y ábranlo
          todos desde ese enlace.
        </div>
      )}
    </div>
  );
}

/* ----------------------------- Host ----------------------------- */
function Host({ onExit }) {
  const [game, setGame] = useState({ phase: "lobby", q: -1 });
  const [players, setPlayers] = useState([]);
  const gameRef = useRef(game);
  gameRef.current = game;

  // recuperar estado + sondeo de jugadores
  useEffect(() => {
    let alive = true;
    (async () => { const g = await readGame(); if (alive && g) setGame(g); })();
    const t = setInterval(async () => {
      const ps = await listPlayers();
      if (alive) setPlayers(ps);
    }, 2000);
    return () => { alive = false; clearInterval(t); };
  }, []);

  const push = useCallback(async (g) => { setGame(g); await writeGame(g); }, []);

  const start = () => push({ phase: "question", q: 0 });
  const reveal = () => push({ phase: "revealed", q: game.q });
  const next = () => {
    if (game.q + 1 >= QUESTIONS.length) push({ phase: "final", q: game.q });
    else push({ phase: "question", q: game.q + 1 });
  };
  const reset = async () => {
    if (!window.confirm("¿Reiniciar el juego y borrar a los jugadores?")) return;
    await clearAll(); setGame({ phase: "lobby", q: -1 }); setPlayers([]);
  };

  const answeredCount = (qi) => players.filter((p) => p.answers && p.answers[String(qi)] !== undefined).length;

  return (
    <div>
      <TopBar label="Vista host" onExit={onExit} onReset={reset} />

      {game.phase === "lobby" && (
        <div>
          <Eyebrow>Sala de espera</Eyebrow>
          <h2 style={H2}>Jugadores conectados · {players.length}</h2>
          <PlayerChips players={players} />
          <p style={{ color: C.g700, fontSize: 14, margin: "14px 0 22px" }}>
            Comparte el enlace de este artifact (botón <b>Compartir</b> de Claude). Cuando estén todos, empieza.
          </p>
          <Btn kind="accent" onClick={start} disabled={players.length === 0}>Empezar el repaso →</Btn>
        </div>
      )}

      {(game.phase === "question" || game.phase === "revealed") && (
        <HostQuestion
          game={game} players={players} answeredCount={answeredCount}
          onReveal={reveal} onNext={next}
        />
      )}

      {game.phase === "final" && <Leaderboard players={players} host onReset={reset} />}
    </div>
  );
}

function HostQuestion({ game, players, answeredCount, onReveal, onNext }) {
  const qi = game.q;
  const Q = QUESTIONS[qi];
  const revealed = game.phase === "revealed";
  const dist = TILES.map((_, i) => players.filter((p) => p.answers && p.answers[String(qi)] === i).length);
  return (
    <div>
      <Eyebrow>Pregunta {qi + 1} de {QUESTIONS.length}</Eyebrow>
      <h2 style={{ ...H2, fontSize: 28 }}>{Q.q}</h2>
      <div style={{ color: C.g700, fontSize: 14, margin: "2px 0 16px" }}>
        {revealed ? "Respuesta revelada" : `Respondieron ${answeredCount(qi)} de ${players.length}`}
      </div>
      <div style={GRID}>
        {Q.opts.map((o, i) => {
          const isC = i === Q.correct;
          return (
            <div key={i} style={{
              ...TILE, background: TILES[i].bg, color: TILES[i].fg,
              outline: revealed && isC ? `4px solid ${C.ink}` : "none",
              opacity: revealed && !isC ? 0.4 : 1, position: "relative",
            }}>
              <span style={{ fontSize: 20, marginRight: 10 }}>{TILES[i].shape}</span>{o}
              {revealed && (
                <span style={{ position: "absolute", right: 12, top: 10, fontWeight: 800, fontSize: 13 }}>
                  {dist[i]} {isC ? "✓" : ""}
                </span>
              )}
            </div>
          );
        })}
      </div>
      <div style={{ display: "flex", gap: 12, marginTop: 22 }}>
        {!revealed
          ? <Btn kind="primary" onClick={onReveal}>Mostrar respuesta</Btn>
          : <Btn kind="accent" onClick={onNext}>{qi + 1 >= QUESTIONS.length ? "Ver resultados →" : "Siguiente pregunta →"}</Btn>}
      </div>
    </div>
  );
}

/* ----------------------------- Player ----------------------------- */
function Player({ onExit }) {
  const [id] = useState(uid);
  const [name, setName] = useState("");
  const [joined, setJoined] = useState(false);
  const [answers, setAnswers] = useState({});
  const [game, setGame] = useState({ phase: "lobby", q: -1 });
  const answersRef = useRef(answers); answersRef.current = answers;
  const nameRef = useRef(name); nameRef.current = name;

  // sondeo del estado de juego
  useEffect(() => {
    if (!joined) return;
    let alive = true;
    const t = setInterval(async () => { const g = await readGame(); if (alive && g) setGame(g); }, 1500);
    return () => { alive = false; clearInterval(t); };
  }, [joined]);

  const join = async () => {
    const n = name.trim(); if (!n) return;
    await writePlayer(id, { id, name: n, answers: {}, ts: Date.now() });
    setJoined(true);
    const g = await readGame(); if (g) setGame(g);
  };

  const answer = async (i) => {
    const qi = game.q; const key = String(qi);
    if (answers[key] !== undefined) return; // bloqueado
    const next = { ...answersRef.current, [key]: i };
    setAnswers(next);
    await writePlayer(id, { id, name: nameRef.current, answers: next, ts: Date.now() });
  };

  if (!joined) {
    return (
      <div style={{ paddingTop: 20 }}>
        <TopBar label="Jugador" onExit={onExit} />
        <Eyebrow>Tu nombre</Eyebrow>
        <h2 style={H2}>¿Cómo te llamas?</h2>
        <input
          value={name} onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") join(); }}
          placeholder="Escribe tu nombre"
          style={{ width: "100%", maxWidth: 420, padding: "14px 16px", fontSize: 17, fontFamily: FONT,
            borderRadius: 12, border: `1px solid ${C.g300}`, background: "#fff", color: C.ink,
            boxSizing: "border-box", marginBottom: 16 }} />
        <div><Btn kind="accent" onClick={join} disabled={!name.trim()}>Entrar</Btn></div>
      </div>
    );
  }

  const qi = game.q;
  const myPick = answers[String(qi)];

  return (
    <div>
      <TopBar label={name} onExit={onExit} />
      {game.phase === "lobby" && (
        <Center>
          <div style={{ fontSize: 40, marginBottom: 10 }}>⏳</div>
          <h2 style={H2}>Listo, {name}.</h2>
          <p style={{ color: C.g700, fontSize: 16 }}>Esperando a que Iñaki empiece el repaso…</p>
        </Center>
      )}

      {game.phase === "question" && (
        <div>
          <Eyebrow>Pregunta {qi + 1} de {QUESTIONS.length}</Eyebrow>
          <h2 style={{ ...H2, fontSize: 26 }}>{QUESTIONS[qi].q}</h2>
          {myPick !== undefined ? (
            <Center><div style={{ fontSize: 38, marginBottom: 8 }}>✅</div>
              <p style={{ color: C.g700, fontSize: 16 }}>Respuesta enviada. Espera al reveal…</p></Center>
          ) : (
            <div style={GRID}>
              {QUESTIONS[qi].opts.map((o, i) => (
                <button key={i} onClick={() => answer(i)} style={{
                  ...TILE, background: TILES[i].bg, color: TILES[i].fg, cursor: "pointer",
                  border: "none", textAlign: "left", fontFamily: FONT }}>
                  <span style={{ fontSize: 20, marginRight: 10 }}>{TILES[i].shape}</span>{o}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {game.phase === "revealed" && (
        <PlayerReveal qi={qi} myPick={myPick} />
      )}

      {game.phase === "final" && <FinalForPlayer id={id} />}
    </div>
  );
}

function PlayerReveal({ qi, myPick }) {
  const Q = QUESTIONS[qi];
  const ok = myPick === Q.correct;
  return (
    <div>
      <Eyebrow>Pregunta {qi + 1} de {QUESTIONS.length}</Eyebrow>
      <h2 style={{ ...H2, fontSize: 24 }}>{Q.q}</h2>
      <Center>
        <div style={{ fontSize: 44, marginBottom: 6 }}>{ok ? "🎉" : myPick === undefined ? "⏭️" : "🤏"}</div>
        <div style={{ fontWeight: 800, fontSize: 20, color: ok ? C.green : C.terra7 }}>
          {ok ? "¡Correcto!" : myPick === undefined ? "No alcanzaste a responder" : "Casi"}
        </div>
      </Center>
      <div style={{ marginTop: 14, padding: "14px 16px", borderRadius: 12, background: "#fff",
        border: `1px solid ${C.g300}` }}>
        <div style={{ fontSize: 12, color: C.g700, marginBottom: 4, fontWeight: 700, letterSpacing: 1 }}>RESPUESTA CORRECTA</div>
        <div style={{ fontSize: 16, fontWeight: 600 }}>
          <span style={{ marginRight: 8 }}>{TILES[Q.correct].shape}</span>{Q.opts[Q.correct]}
        </div>
      </div>
    </div>
  );
}

function FinalForPlayer({ id }) {
  const [players, setPlayers] = useState([]);
  useEffect(() => { let a = true; listPlayers().then((p) => { if (a) setPlayers(p); }); return () => { a = false; }; }, []);
  return <Leaderboard players={players} meId={id} />;
}

/* ----------------------------- Leaderboard ----------------------------- */
function Leaderboard({ players, host, meId, onReset }) {
  const ranked = [...players].map((p) => ({ ...p, s: scoreOf(p) })).sort((a, b) => b.s - a.s);
  return (
    <div>
      <Eyebrow>Resultados</Eyebrow>
      <h2 style={H2}>Así nos fue 🏁</h2>
      <div style={{ marginTop: 12 }}>
        {ranked.length === 0 && <p style={{ color: C.g700 }}>Sin jugadores.</p>}
        {ranked.map((p, i) => {
          const me = meId && p.id === meId;
          return (
            <div key={p.id || i} style={{
              display: "flex", alignItems: "center", gap: 14, padding: "13px 16px", marginBottom: 8,
              borderRadius: 12, background: me ? C.terra : (i === 0 ? C.ink : "#fff"),
              color: i === 0 && !me ? C.cream : (me ? C.ink : C.ink),
              border: `1px solid ${i === 0 || me ? "transparent" : C.g300}` }}>
              <div style={{ fontWeight: 800, fontSize: 18, width: 28 }}>{i === 0 ? "🏆" : i + 1}</div>
              <div style={{ flex: 1, fontWeight: 700, fontSize: 17 }}>{p.name}{me ? " (tú)" : ""}</div>
              <div style={{ fontWeight: 800, fontSize: 17 }}>{p.s} / {QUESTIONS.length}</div>
            </div>
          );
        })}
      </div>
      <p style={{ color: host ? C.g700 : C.g700, fontSize: 14, marginTop: 18 }}>
        No gana quien más sabe — gana el equipo que ahora decide mejor.
      </p>
      {host && <div style={{ marginTop: 12 }}><Btn kind="danger" onClick={onReset}>Reiniciar para otra ronda</Btn></div>}
    </div>
  );
}

/* ----------------------------- piezas chicas ----------------------------- */
function TopBar({ label, onExit, onReset }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
      <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 1, color: C.terra7, textTransform: "uppercase" }}>{label}</div>
      <div style={{ display: "flex", gap: 8 }}>
        {onReset && <button onClick={onReset} style={miniBtn}>Reiniciar</button>}
        <button onClick={onExit} style={miniBtn}>Salir</button>
      </div>
    </div>
  );
}
function PlayerChips({ players }) {
  if (!players.length) return <p style={{ color: C.g700 }}>Aún nadie. Comparte el enlace 👇</p>;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 4 }}>
      {players.map((p, i) => (
        <span key={p.id || i} style={{ background: C.g200, border: `1px solid ${C.g300}`, color: C.ink,
          padding: "8px 14px", borderRadius: 999, fontWeight: 700, fontSize: 15 }}>{p.name}</span>
      ))}
    </div>
  );
}
function Center({ children }) {
  return <div style={{ textAlign: "center", padding: "40px 0" }}>{children}</div>;
}
const H2 = { fontSize: 30, fontWeight: 800, margin: "0 0 6px", lineHeight: 1.1 };
const GRID = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 6 };
const TILE = { padding: "20px 18px", borderRadius: 14, fontSize: 16, fontWeight: 700, minHeight: 84,
  display: "flex", alignItems: "center", lineHeight: 1.25 };
const miniBtn = { background: "transparent", border: `1px solid ${C.g300}`, color: C.g700,
  fontFamily: FONT, fontSize: 12, fontWeight: 700, padding: "6px 12px", borderRadius: 8, cursor: "pointer" };
