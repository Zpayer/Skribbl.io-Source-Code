# Skribbl.io Source Code

A self-hosted, full-stack clone of [Skribbl.io](https://skribbl.io).

---
## Images
![Skribbl Screenshot](https://files.catbox.moe/vclf7o.png)
![Skribbl Screenshot](https://files.catbox.moe/wocpnw.png)

## Features

- **Multi-room matchmaking** — public rooms auto-fill; private rooms use invite codes
- **Real-time drawing** — brush and flood-fill tools synced live to all spectators
- **Guessing & scoring** — Levenshtein fuzzy matching rewards close guesses; scores scale with guess speed
- **Word modes** — Normal, Hidden (no letter count), and Combination (drawer merges two half-words)
- **Hints** — letters revealed progressively during the drawing phase
- **Custom word lists** — room owner can supply their own comma-separated words
- **Undo & clear** — drawer can undo individual strokes or wipe the canvas; all spectators sync instantly
- **Moderation** — owner kick/ban (IP-based), democratic vote-kick, chat spam protection
- **Avatar customizer** — mix-and-match color, eyes, mouth, and accessory from sprite atlases
- **Thumbs up / down rating** — spectators can rate each drawing mid-round
- **Sound effects** — join, leave, guessed, tick, round start/end
- **Seasonal themes** — Halloween background and logo auto-activate during the holiday period
- **Pen pressure** — optional sensitivity for stylus users via the Pointer Events API

---

## Tech Stack

| Layer | Technology |
|---|---|
| HTTP server | [Express 5](https://expressjs.com/) |
| Real-time transport | [Socket.IO 4](https://socket.io/) |
| Frontend bundler | [Vite 7](https://vitejs.dev/) |
| Runtime | [Node.js](https://nodejs.org/) (LTS recommended) |

No framework is used on the client — the frontend is plain ES modules compiled by Vite.

---

## Project Structure

```
skribbl.io-server/
├── server.js              # Entry point: Express (port 5003) + Socket.IO game server (port 5002)
├── websocket/
│   ├── main.js            # Socket.IO server — multi-room management, player lifecycle
│   ├── room.js            # Room class — full game loop, drawing relay, chat/guessing, scoring
│   ├── constants.js       # Server-side enums and default settings (mirrors src/core/constants.js)
│   └── words.json         # Built-in word list
├── src/                   # Client source (compiled by Vite → dist/)
│   ├── main.js            # Client entry point
│   ├── core/              # Shared utilities (DOM helpers, state singletons, settings, i18n)
│   ├── draw/              # Canvas drawing: rasterizer, palette, input, colors
│   ├── game/              # Game logic: packet handler, game-state machine, players, HUD, overlay
│   ├── net/               # Networking: Socket.IO client, REST helper
│   └── ui/                # Home screen (avatar customizer, tutorial) and in-game UI
├── public/                # Static assets copied verbatim into dist/
│   ├── css/style.css
│   ├── img/               # All game icons, avatars, backgrounds
│   ├── audio/             # Sound effects (.ogg)
│   ├── credits/
│   └── terms/
├── index.html             # HTML shell (Vite entry)
├── install.bat            # Runs npm install
└── run.bat                # Runs npm run start (build + serve)
```

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) LTS

### Install & Run (Windows)

```bat
install.bat   :: npm install
run.bat       :: vite build && node server.js
```

Then open **http://localhost:5003** in your browser.

### Install & Run (cross-platform)

```bash
npm install
npm start        # builds the client then starts the server
```

### Development (hot reload)

Run both processes in separate terminals:

```bash
npm run server   # Express + Socket.IO on :5003 / :5002
npm run dev      # Vite dev server on :5173 (proxies /api → :5003)
```

Then open **http://localhost:5173**.

---

## How It Works

### Ports

| Port | Service |
|---|---|
| 5003 | Express — serves the frontend and the `/api/play` endpoint |
| 5002 | Socket.IO — all real-time game traffic |

The browser calls `POST /api/play` to discover the WebSocket URL, then connects directly to port 5002.


## Configuration

Ports are hardcoded in `server.js`:

```js
const PORT = 5003;       // HTTP / static files
const GAME_PORT = 5002;  // Socket.IO (PORT - 1)
```

Change these constants to run on different ports. No `.env` file is required.

---

## Scripts

| Command | Description |
|---|---|
| `npm start` | Build client then start the production server |
| `npm run dev` | Start Vite dev server with hot reload |
| `npm run build` | Build client to `dist/` |
| `npm run server` | Start only the Express + Socket.IO server |
| `npm test` | Run the smoke test (`test/smoke.js`) |

---

## License

See [LICENSE](LICENSE).
