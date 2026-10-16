const express = require('express'),
  path = require('path'),
  fs = require('fs');


const createGameServer = require('./websocket/main'),
  app = express(),
  PORT = 5003,
  GAME_PORT = PORT - 1;


const distDir = path.join(__dirname, 'dist');
const staticDir = fs.existsSync(path.join(distDir, 'index.html'))
  ? distDir
  : path.join(__dirname, 'public');

app.use(express.static(staticDir));


createGameServer(GAME_PORT);


app.post("/api/play", (req, res) => {
  const host = String(req.headers.host || "localhost").replace(/:\d+$/, "") || "localhost";
  const forwarded = String(req.headers["x-forwarded-proto"] || "").split(",")[0].trim();
  const secure = req.secure || forwarded === "https";
  res.type("text/plain").send(`${secure ? "wss" : "ws"}://${host}:${GAME_PORT}/`);
});


app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log(`Serving static files from ${staticDir}`);
});
