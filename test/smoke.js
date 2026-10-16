const path = require("path");
const assert = require("assert");

const REPO = path.join(__dirname, "..");
const { io } = require(path.join(REPO, "node_modules", "socket.io-client"));
const createGameServer = require(path.join(REPO, "websocket", "main"));
const { Op, GameState } = require(path.join(REPO, "websocket", "constants"));

const PORT = 5999;
const URL = `http://localhost:${PORT}`;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitFor(predicate, timeout = 5000, step = 25) {
  const until = Date.now() + timeout;
  while (Date.now() < until) {
    if (predicate()) return true;
    await sleep(step);
  }
  return predicate();
}

/** Minimal stand-in for the browser client. */
class Client {
  constructor(url, options) {
    this.packets = [];
    this.joinerr = null;
    this.reason = null;
    this.socket = io(url, Object.assign({ transports: ["websocket", "polling"] }, options));

    this.socket.on("data", (packet) => this.packets.push(packet));
    this.socket.on("joinerr", (code) => (this.joinerr = code));
    this.socket.on("reason", (reason) => (this.reason = reason));
  }

  async connect() {
    const ok = await waitFor(() => this.socket.connected, 5000);
    assert(ok, "client failed to connect");
  }

  login(payload) {
    this.socket.emit("login", payload);
  }

  emitData(id, data) {
    this.socket.emit("data", data === undefined ? { id } : { id, data });
  }


  async waitPacket(predicate, timeout = 8000) {
    const until = Date.now() + timeout;
    for (;;) {
      const index = this.packets.findIndex(predicate);
      if (index !== -1) return this.packets.splice(index, 1)[0];
      if (Date.now() >= until) return undefined;
      await sleep(25);
    }
  }

  nextId(id, predicate, timeout) {
    return this.waitPacket((packet) => packet.id === id && (!predicate || predicate(packet)), timeout);
  }

  async nextReason(timeout = 5000) {
    await waitFor(() => this.reason !== null, timeout);
    return this.reason;
  }
}

async function assertNone(client, predicate, ms, message) {
  const packet = await client.waitPacket(predicate, ms);
  assert.equal(packet, undefined, message);
}

async function main() {
  createGameServer(PORT);
  await sleep(300);

  /* login + room codes */

  const alice = new Client(URL);
  await alice.connect();
  alice.login({ create: 1, name: "Alice", lang: 0, code: "", avatar: [1, 2, 3, 4] });

  const login = await alice.nextId(Op.LOGIN);
  assert(login, "alice did not receive the login packet");
  assert.equal(login.data.me, login.data.users[0].id, "login: me == users[0].id");
  assert.equal(login.data.owner, login.data.me, "login: first player owns the room");
  assert.equal(login.data.state.id, GameState.ROOM, "login: state is the room panel");
  assert.equal(login.data.settings.length, 8, "login: full settings array");
  assert.equal(login.data.type, 1, "login: private room");

  const aliceId = login.data.me;
  const roomCode = login.data.id;
  assert.equal(typeof roomCode, "string", "room code is a string");
  assert(roomCode.length >= 6, "room code looks sane");

  const bob = new Client(URL);
  await bob.connect();
  bob.login({ create: 0, name: "Bob", lang: 0, code: "WRONG99", avatar: [0, 0, 0, -1] });
  assert.equal(await bob.nextId(Op.LOGIN, null, 1500), undefined, "no login for a bad code");
  assert.equal(bob.joinerr, 1, "joinerr 1 = room not found");
  console.log("ok: joinerr for unknown room code");

  bob.login({ create: 0, name: "Bob", lang: 0, code: roomCode, avatar: [5, 5, 5, 2] });
  const bobJoin = await alice.nextId(Op.USER_JOIN);
  assert.equal(bobJoin.data.name, "Bob", "USER_JOIN carries the name");
  const bobLogin = await bob.nextId(Op.LOGIN);
  assert.equal(bobLogin.data.users.length, 2, "login lists every player");
  const bobId = bobLogin.data.me;
  assert.notEqual(bobId, aliceId, "player ids are unique");
  console.log("ok: private room join");

  /*  permissions */

  bob.emitData(Op.SETTINGS, { id: 2, val: 30 });
  bob.emitData(Op.KICK, aliceId);
  await assertNone(alice, (packet) => packet.id === Op.SETTINGS, 400, "non-owner settings ignored");
  assert(alice.socket.connected, "non-owner kick ignored");

  alice.emitData(Op.SETTINGS, { id: 1, val: 2 }); // slots
  alice.emitData(Op.SETTINGS, { id: 2, val: 15 }); // drawtime
  alice.emitData(Op.SETTINGS, { id: 3, val: 2 }); // rounds
  for (const [index, value] of [[1, 2], [2, 15], [3, 2]]) {
    const setting = await alice.nextId(Op.SETTINGS, (packet) => packet.data.id === index);
    assert.equal(setting.data.val, value, "owner setting applied + broadcast");
  }
  console.log("ok: settings permissions");

  /* full game */

  bob.emitData(Op.START_GAME, "");
  await assertNone(
    bob,
    (packet) => packet.id === Op.GAME_STATE && packet.data.id === GameState.ROUND_START,
    400,
    "non-owner cannot start the game"
  );

  alice.emitData(Op.START_GAME, "");
  const round1 = await alice.nextId(Op.GAME_STATE, (packet) => packet.data.id === GameState.ROUND_START);
  assert.equal(round1.data.data, 0, "first round splash shows round 0");

  const choiceA = await alice.nextId(Op.GAME_STATE, (packet) => packet.data.id === GameState.WORD_CHOICE);
  const offer = choiceA.data.data.words;
  assert(Array.isArray(offer) && offer.length === 3, "drawer gets 3 words");
  const choiceB = await bob.nextId(Op.GAME_STATE, (packet) => packet.data.id === GameState.WORD_CHOICE);
  assert.equal(choiceB.data.data.words, undefined, "spectators do not get the words");
  assert.equal(choiceB.data.data.id, aliceId, "spectators see who is choosing");

  bob.emitData(Op.CHOOSE_WORD, 0);
  await assertNone(
    alice,
    (packet) => packet.id === Op.GAME_STATE && packet.data.id === GameState.DRAWING,
    400,
    "only the drawer may choose a word"
  );

  alice.emitData(Op.CHOOSE_WORD, 0);
  const drawA = await alice.nextId(Op.GAME_STATE, (packet) => packet.data.id === GameState.DRAWING);
  const drawB = await bob.nextId(Op.GAME_STATE, (packet) => packet.data.id === GameState.DRAWING);
  const word = offer[0];
  assert.equal(typeof drawA.data.data.word, "string", "drawer sees the word");
  assert.deepEqual(drawB.data.data.word, word.split(" ").map((part) => part.length), "others see hint lengths");
  assert.equal(drawA.data.time, 15, "drawing time from the settings");

  const command = [0, 10, 20, 30, 40, 50, 60, 70, 80];
  alice.emitData(Op.DRAW_COMMANDS, [command]);
  const drawn = await bob.nextId(Op.DRAW_COMMANDS);
  assert.deepEqual(drawn.data, [command], "draw commands are relayed");
  bob.emitData(Op.DRAW_COMMANDS, [command]);
  await assertNone(bob, (packet) => packet.id === Op.DRAW_COMMANDS, 400, "only the drawer may draw");

  alice.emitData(Op.UNDO, 0);
  const undone = await bob.nextId(Op.UNDO);
  assert.equal(undone.data, 0, "undo is relayed");
  alice.emitData(Op.CLEAR);
  await bob.nextId(Op.CLEAR);
  console.log("ok: drawing packets");

  const clock = await bob.nextId(Op.CLOCK);
  assert(clock.data > 0 && clock.data <= 15, "clock ticks down");

  bob.emitData(Op.CHAT, "hello world");
  const chatA = await alice.nextId(Op.CHAT);
  assert.deepEqual(chatA.data, { id: bobId, msg: "hello world" }, "chat is relayed");
  await bob.nextId(Op.CHAT);

  bob.emitData(Op.CHAT, word + "x");
  const close = await bob.nextId(Op.CLOSE_GUESS);
  assert.equal(close.data, word + "x", "close guess only reaches the sender");
  await assertNone(alice, (packet) => packet.id === Op.CLOSE_GUESS, 300, "close guess stays private");

  bob.emitData(Op.CHAT, "  " + word.toUpperCase() + "  ");
  const guessedA = await alice.nextId(Op.WORD_GUESSED);
  assert.deepEqual(guessedA.data, { id: bobId }, "others learn who guessed");
  const guessedB = await bob.nextId(Op.WORD_GUESSED);
  assert.equal(guessedB.data.word, word, "the guesser learns the word");
  await assertNone(
    alice,
    (packet) => packet.id === Op.CHAT && packet.data?.msg === word.toUpperCase(),
    300,
    "the word itself is never broadcast"
  );
  console.log("ok: chat + guessing");

  const end1 = await alice.nextId(Op.GAME_STATE, (packet) => packet.data.id === GameState.ROUND_END);
  assert.equal(end1.data.data.reason, 0, "round ended because everyone guessed");
  assert.equal(end1.data.data.word, word, "reveal screen shows the word");
  assert.deepEqual(end1.data.data.scores, [aliceId, 300, 300, bobId, 300, 300], "scores after round 1");

  // round 2: Bob draws, Alice guesses
  await alice.nextId(Op.GAME_STATE, (packet) => packet.data.id === GameState.ROUND_START && packet.data.data === 1);
  const choice2B = await bob.nextId(Op.GAME_STATE, (packet) => packet.data.id === GameState.WORD_CHOICE);
  assert.equal(choice2B.data.data.id, bobId, "the turn moved to Bob");
  const word2 = choice2B.data.data.words[1];
  bob.emitData(Op.CHOOSE_WORD, 1);
  await bob.nextId(Op.GAME_STATE, (packet) => packet.data.id === GameState.DRAWING);

  alice.emitData(Op.CHAT, word2);
  const guessed2 = await bob.nextId(Op.WORD_GUESSED);
  assert.deepEqual(guessed2.data, { id: aliceId }, "drawer sees who guessed");

  const end2 = await alice.nextId(Op.GAME_STATE, (packet) => packet.data.id === GameState.ROUND_END);
  assert.deepEqual(end2.data.data.scores, [aliceId, 600, 300, bobId, 600, 300], "scores after round 2");

  const podium = await alice.nextId(Op.GAME_STATE, (packet) => packet.data.id === GameState.GAME_END, 9000);
  assert.equal(podium.data.time, 7, "podium lasts 7 seconds");
  assert.deepEqual(
    podium.data.data.map((entry) => entry[1]),
    [0, 1],
    "podium ranks everyone"
  );

  const backToRoom = await alice.nextId(
    Op.GAME_STATE,
    (packet) => packet.data.id === GameState.ROOM,
    9000
  );
  assert(backToRoom, "back to the room after the game");
  console.log("ok: full game (2 rounds, podium, room)");

  /* custom words + kicking the drawer */

  alice.emitData(Op.SETTINGS, { id: 7, val: 1 }); // custom words only
  await alice.nextId(Op.SETTINGS, (packet) => packet.data.id === 7);
  alice.emitData(Op.START_GAME, "alpha, bravo, charlie, delta, echo");

  await alice.nextId(Op.GAME_STATE, (packet) => packet.data.id === GameState.ROUND_START);
  const customChoice = await alice.nextId(
    Op.GAME_STATE,
    (packet) => packet.data.id === GameState.WORD_CHOICE && packet.data.data.words !== undefined
  );
  const customOffer = customChoice.data.data.words;
  assert(
    customOffer.every((entry) => ["alpha", "bravo", "charlie", "delta", "echo"].includes(entry)),
    "only custom words are offered"
  );
  alice.emitData(Op.CHOOSE_WORD, 0);
  const customDraw = await alice.nextId(
    Op.GAME_STATE,
    (packet) => packet.data.id === GameState.DRAWING && typeof packet.data.data.word === "string"
  );
  assert.equal(customDraw.data.data.word, customOffer[0], "the picked custom word is used");

  const charlie = new Client(URL);
  await charlie.connect();
  charlie.login({ create: 0, name: "Charlie", lang: 0, code: roomCode, avatar: [0, 0, 0, -1] });
  assert.equal(await charlie.nextId(Op.LOGIN, null, 1500), undefined, "no login while the room is full");
  assert.equal(charlie.joinerr, 2, "joinerr 2 = room full");
  console.log("ok: custom words + full room");

  alice.emitData(Op.KICK, bobId);
  assert.equal(await bob.nextReason(), 1, "kicked player gets reason 1");
  assert(await waitFor(() => !bob.socket.connected), "kicked player is disconnected");
  const bobLeave = await alice.nextId(Op.USER_LEAVE);
  assert.deepEqual(bobLeave.data, { id: bobId, reason: 1 }, "others see the kick");
  await alice.nextId(Op.GAME_STATE, (packet) => packet.data.id === GameState.ROUND_END, 3000);
  await alice.nextId(Op.GAME_STATE, (packet) => packet.data.id === GameState.ROOM, 6000);
  console.log("ok: kicking the drawer ends the round + game");

  /*  votekick */

  charlie.login({ create: 0, name: "Charlie", lang: 0, code: roomCode, avatar: [0, 0, 0, -1] });
  const charlieLogin = await charlie.nextId(Op.LOGIN);
  const charlieId = charlieLogin.data.me;
  await alice.nextId(Op.USER_JOIN);

  alice.emitData(Op.SETTINGS, { id: 1, val: 3 }); // room slots
  await alice.nextId(Op.SETTINGS, (packet) => packet.data.id === 1);

  const dave = new Client(URL, { transports: ["polling"] });
  await dave.connect();
  dave.login({ create: 0, name: "Dave", lang: 0, code: roomCode, avatar: [0, 0, 0, -1] });
  const daveId = (await dave.nextId(Op.LOGIN)).data.me;
  await alice.nextId(Op.USER_JOIN);

  dave.emitData(Op.VOTEKICK_STATE, aliceId);
  await assertNone(alice, (packet) => packet.id === Op.VOTEKICK_STATE, 400, "the owner cannot be votekicked");

  alice.emitData(Op.VOTEKICK_STATE, daveId);
  const vote1 = await alice.nextId(Op.VOTEKICK_STATE);
  assert.deepEqual(vote1.data, [aliceId, daveId, 1, 2], "first vote broadcast (1 of 2)");

  charlie.emitData(Op.VOTEKICK_STATE, daveId);
  const vote2 = await charlie.nextId(Op.VOTEKICK_STATE, (packet) => packet.data[0] === charlieId);
  assert.deepEqual(vote2.data, [charlieId, daveId, 2, 2], "majority reached");
  assert.equal(await dave.nextReason(), 1, "votekicked player gets reason 1");
  assert(await waitFor(() => !dave.socket.connected), "votekicked player is disconnected");
  console.log("ok: votekick (over the polling transport)");

  /* normal leave + url */

  const erin = new Client(URL);
  await erin.connect();
  erin.login({ create: 0, name: "Erin", lang: 0, code: roomCode, avatar: [0, 0, 0, -1] });
  const erinId = (await erin.nextId(Op.LOGIN)).data.me;
  await alice.nextId(Op.USER_JOIN);
  erin.socket.disconnect();
  const erinLeave = await alice.nextId(Op.USER_LEAVE, (packet) => packet.data.id === erinId);
  assert.deepEqual(erinLeave.data, { id: erinId, reason: 0 }, "normal leave has reason 0");
  console.log("ok: normal disconnect");

  const remote = new Client("ws://localhost", { path: `:${PORT}/`, transports: ["websocket"] });
  await remote.connect();
  remote.login({ create: 0, name: "Remote", lang: 0, code: roomCode, avatar: [0, 0, 0, -1] });
  const remoteLogin = await remote.nextId(Op.LOGIN);
  assert(remoteLogin, "remote-style url (port smuggled via the path option) works");
  await alice.nextId(Op.USER_JOIN);
  console.log("ok: remote-style connection url");

  /* spam protection */

  for (let i = 0; i < 6; i++) alice.emitData(Op.CHAT, "spam " + i);
  const spam = await alice.nextId(Op.SPAM);
  assert(spam, "spam packet received after too many messages");
  console.log("ok: chat spam protection");

  /*  ban */

  alice.emitData(Op.BAN, charlieId);
  assert.equal(await charlie.nextReason(), 2, "banned player gets reason 2");
  assert(await waitFor(() => !charlie.socket.connected), "banned player is disconnected");

  const bannedAgain = new Client(URL);
  await bannedAgain.connect();
  bannedAgain.login({ create: 0, name: "Charlie", lang: 0, code: roomCode, avatar: [0, 0, 0, -1] });
  assert.equal(await bannedAgain.nextId(Op.LOGIN, null, 1500), undefined, "no login while banned");
  assert.equal(bannedAgain.joinerr, 4, "joinerr 4 = banned");
  console.log("ok: ban + rejoin blocked (same ip)");

  console.log("\nALL TESTS PASSED");
  process.exit(0);
}

main().catch((error) => {
  console.error("\nTEST FAILED:", error);
  process.exit(1);
});
