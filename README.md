# Quiz Conceptos IA

Quiz multijugador en vivo (host + jugadores) sobre conceptos de IA.

## Contraseña de host

Define `HOST_PASSWORD` en el servidor. Solo quien la sepa puede controlar el juego; los jugadores entran sin restricción.

**Local:**

```bash
HOST_PASSWORD=mi-secreto npm run build && npm start
```

**Producción (Render):** añade `HOST_PASSWORD` en Environment Variables del servicio.

---

## Publicar en Render

1. Sube el proyecto a GitHub.
2. [render.com](https://render.com) → **New → Blueprint** (usa `render.yaml`).
3. Añade `HOST_PASSWORD` en variables de entorno.
4. Deploy → URL tipo `https://quiz-conceptos-ia.onrender.com`.

---

## Desarrollo local

```bash
npm install
npm run build
HOST_PASSWORD=mi-secreto npm start    # http://localhost:3000
```

Con hot-reload:

```bash
node dev-server.mjs   # terminal 1
npm run dev           # terminal 2
```

---

## Flujo

1. Todos abren la misma URL.
2. Tú entras como **host** con la contraseña.
3. El grupo entra como **jugador**.
4. Compartes el enlace e inicias el repaso.
