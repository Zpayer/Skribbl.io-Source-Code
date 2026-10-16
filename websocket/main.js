

const http = require("http");
const { Server } = require("socket.io");

const Room = require("./room");
const { JoinError, AVATAR_PARTS } = require("./constants");

function randomCode(length = 8) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "";
  for (let i = 0; i < length; i++) result += chars.charAt(randomInt(chars.length));
  return result;
}

const randomInt = (max) => Math.floor(Math.random() * max);

const normalizeIp = (address) => String(address || "").replace(/^::ffff:/, "");

function sanitizeName(raw, id) {
  let name = typeof raw === "string" ? raw.trim() : "";
  name = name.replace(/[\u0000-\u001f\u007f]/g, "").slice(0, 24);
  if (name.length < 2) name = "Player " + id;
  return name;
}

function sanitizeAvatar(raw) {
  if (!Array.isArray(raw)) return [0, 0, 0, -1];

  const parts = [];
  for (let i = 0; i < 4; i++) {
    const value = Math.trunc(Number(raw[i]));
    if (Number.isFinite(value)) parts.push(Math.max(-1, Math.min(value, AVATAR_PARTS[i])));
    else parts.push(i === 3 ? -1 : 0);
  }
  return parts;
}

/**
 * create game server
 * @param port  game port (`/api/play`)
 */
function createGameServer(port) {
  const httpServer = http.createServer();
  const io = new Server(httpServer, {
    path: "/",
    serveClient: false,
    cors: { origin: "*" },
  });

  const rooms = new Map();
  let nextPlayerId = 1;

  function createRoom(type) {
    let code = randomCode();
    while (rooms.has(code)) code = randomCode();

    const room = new Room(io, code, type, () => rooms.delete(code));
    rooms.set(code, room);
    return room;
  }

  function findPublicRoom(ip) {
    for (const room of rooms.values()) {
      if (room.type !== 0) continue;
      if (room.isFull() || room.isBanned(ip)) continue;
      return room;
    }
    return null;
  }

  io.on("connection", (socket) => {
    const player = {
      id: nextPlayerId++,
      socket,
      ip: normalizeIp(socket.handshake.address),
      room: null,
      name: "",
      avatar: [0, 0, 0, -1],
      flags: 0,
      score: 0,
      roundScore: 0,
      guessed: false,
      chatTimes: [],
      chatBlockedUntil: 0,
    };

    socket.on("login", (payload) => {
      if (player.room) return;
      if (!payload || typeof payload !== "object") payload = {};

      player.name = sanitizeName(payload.name, player.id);
      player.avatar = sanitizeAvatar(payload.avatar);

      const code = String(payload.code || payload.join || "").trim().toUpperCase();

      let room;
      if (payload.create === 1 || payload.create === true) {
        room = createRoom(1);
      } else if (code) {
        room = rooms.get(code) || null;
        if (!room) return socket.emit("joinerr", JoinError.ROOM_NOT_FOUND);
        if (room.isBanned(player.ip)) return socket.emit("joinerr", JoinError.BANNED);
        if (room.isFull()) return socket.emit("joinerr", JoinError.ROOM_FULL);
      } else {
        room = findPublicRoom(player.ip) || createRoom(0);
      }

      room.add(player);
    });

    socket.on("data", (packet) => {
      if (player.room) player.room.handlePacket(player, packet);
    });

    socket.on("disconnect", () => {
      if (player.room) player.room.leave(player, 0);
    });
  });

  httpServer.listen(port, () => {
    console.log(`Game server is listening on ws://localhost:${port}/`);
  });

  return io;
}

module.exports = createGameServer;
