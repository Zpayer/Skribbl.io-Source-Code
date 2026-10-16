
const words = require("./words.json");
const {
  Op,
  GameState,
  EndReason,
  DisconnectReason,
  Setting,
  WordMode,
  DEFAULT_SETTINGS,
  SETTING_RANGES,
} = require("./constants");

/* timings */


const WORD_CHOICE_TIME = 15;
const ROUND_START_TIME = 2;
const ROUND_END_TIME = 2;
const GAME_END_TIME = 7;

/* limits */

const MAX_NAME_LENGTH = 24;
const CHAT_MAX_LENGTH = 100;
/** anti spam params */
const SPAM_WINDOW = 3000;
const SPAM_MAX = 5;

/* helpers */

const clampInt = (value, min, max, fallback) => {
  const number = Math.trunc(Number(value));
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(max, number));
};

const randomInt = (max) => Math.floor(Math.random() * max);

/** Lowercase, collapse whitespace and drop punctuation, for guess checks. */
function normalize(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[.,!?;:'"+/]/g, "")
    .replace(/\s+/g, " ");
}

function levenshtein(a, b) {
  const matrix = [];

  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 *   0 = normal message, 
 *   1 = correct guess,
 *   2 = close guess
 */
function guessAccuracy(word, guess) {
  const a = normalize(word);
  const b = normalize(guess);

  if (b.length === 0) return 0;
  if (a === b) return 1;

  const similarity = 1 - levenshtein(a, b) / Math.max(a.length, b.length);
  return similarity >= 0.7 ? 2 : 0;
}

/** show spaces and dashes right away from start */
function preloadHints(word) {
  const result = [];
  for (let i = 0; i < word.length; i++) {
    const char = word[i];
    if (char === " " || char === "-") result.push([i, char]);
  }
  return result;
}

/** `[3, 6]` for "sun boat" - the letter counts shown as hint slots. */
function wordLengths(word) {
  return word.split(" ").map((part) => part.length);
}

/* room */

class Room {
  /**
   * @param io        socket.io server (broadcasts go through it)
   * @param id        room code used for invites (`#CODE` / `?CODE`)
   * @param type      0 = public, 1 = private
   * @param onDestroy called once the room became empty and was removed
   */
constructor(io, id, type, onDestroy) {
    this.io = io;
    this.id = id;
    this.type = type;
    this.onDestroy = onDestroy;

    // players in join order (determines turn order)
    this.players = [];
    // room owner's user id, or -1 if empty
    this.owner = -1;
    this.settings = DEFAULT_SETTINGS.slice();
    this.round = 0;
    // current state in spectator form: { id, time, data }
    this.state = { id: GameState.ROOM, time: 0, data: 0 };
    // IPs banned from this room
    this.bans = new Set();

    // true while a game is actively running
    this.started = false;
    // bumped to invalidate old game loops if someone leaves or the game ends
    this.runId = 0;
    // index in `players` for the last drawer (-1 before round 1)
    this.turnPointer = -1;

    this.drawerId = -1;
    this.word = null;
    // words given to the drawer to pick from, null otherwise
    this.words = null;
    this.hints = [];
    // raw draw commands for this round (gets trimmed on undo)
    this.drawCommands = [];
    this.customWords = [];
    // tracks recently used words so we don't repeat them too fast
    this.usedWords = new Set();
    // target player id -> set of users who voted to kick them
    this.votes = new Map();

    // bookkeeping for word selection (see chooseWord / waitChoice)
    this.choice = null;
    this.choiceAborted = false;
    // set to an EndReason if we need to bail out of the drawing phase early
    this.roundAbort = null;
  }

  get channel() {
    return "room:" + this.id;
  }

  get slots() {
    return clampInt(this.settings[Setting.SLOTS], 2, 20, 8);
  }

  setting(index) {
    return this.settings[index];
  }

  find(id) {
    return this.players.find((player) => player.id === id) || null;
  }

  isFull() {
    return this.players.length >= this.slots;
  }

  isBanned(ip) {
    return this.bans.has(ip);
  }

  /* transport */

  publicUser(player) {
    return {
      id: player.id,
      flags: player.flags,
      name: player.name,
      avatar: player.avatar,
      score: player.score,
      guessed: player.guessed,
    };
  }

  send(player, packet) {
    player.socket.emit("data", packet);
  }

  broadcast(packet, except) {
    if (except) except.socket.to(this.channel).emit("data", packet);
    else this.io.to(this.channel).emit("data", packet);
  }

  /* players */

  add(player) {
    this.players.push(player);
    player.room = this;
    player.socket.join(this.channel);

    if (this.owner === -1) this.owner = player.id;

    this.broadcast({ id: Op.USER_JOIN, data: this.publicUser(player) }, player);
    this.send(player, {
      id: Op.LOGIN,
      data: {
        me: player.id,
        type: this.type,
        id: this.id,
        settings: this.settings.slice(),
        users: this.players.map((entry) => this.publicUser(entry)),
        round: this.round,
        owner: this.owner,
        state: this.state,
      },
    });

    console.log(`[${this.id}] ${player.name} joined (${this.players.length} player(s))`);
  }

  /** (on disconnect / kick/ban) */
  leave(player, reason) {
    const index = this.players.indexOf(player);
    if (index === -1) return; // already removed (kicked / banned)
    this.players.splice(index, 1);
    player.room = null;

    if (index <= this.turnPointer) this.turnPointer--;
    if (this.turnPointer >= this.players.length) this.turnPointer = this.players.length - 1;

    this.broadcast({ id: Op.USER_LEAVE, data: { id: player.id, reason } }, player);

    if (this.owner === player.id) {
      this.owner = this.players.length ? this.players[0].id : -1;
      if (this.owner !== -1) this.broadcast({ id: Op.OWNER, data: this.owner });
    }

    // drawer left mid-round: stop the round right away
    if (player.id === this.drawerId) {
      if (this.state.id === GameState.WORD_CHOICE) this.choiceAborted = true;
      else if (this.state.id === GameState.DRAWING) this.roundAbort = EndReason.DRAWER_LEFT;
    }

    this.votes.delete(player.id);
    for (const voters of this.votes.values()) voters.delete(player.id);

    console.log(`[${this.id}] ${player.name} left (${this.players.length} player(s))`);

    if (this.players.length === 0) this.destroy();
  }

  /** kick or ban a player */
  eject(player, reason) {
    if (reason === DisconnectReason.BANNED) this.bans.add(player.ip);
    this.leave(player, reason);
    player.socket.emit("reason", reason);

    setTimeout(() => {
      try {
        player.socket.disconnect(true);
      } catch (error) {
        console.error("failed to disconnect socket:", error);
      }
    }, 100);
  }

  destroy() {
    this.runId++; // stop every running game loop
    this.choice = null;
    if (this.onDestroy) this.onDestroy();
  }

  /*dispatch */

  /** handle packets */
  handlePacket(player, packet) {
    if (!packet || typeof packet.id !== "number") return;

    switch (packet.id) {
      case Op.KICK:
        this.kick(player, packet.data, DisconnectReason.KICKED);
        break;
      case Op.BAN:
        this.kick(player, packet.data, DisconnectReason.BANNED);
        break;
      case Op.VOTEKICK_STATE:
        this.votekick(player, packet.data);
        break;
      case Op.REPORT:
        console.log(`[${this.id}] ${player.name} reported user ${packet.data?.id} (${packet.data?.reasons})`);
        break;
      case Op.MUTE:
        // muting is client side, see src/core/chat.js.
        break;
      case Op.RATE:
        this.rate(player, packet.data);
        break;
      case Op.SETTINGS:
        this.changeSetting(player, packet.data);
        break;
      case Op.CHOOSE_WORD:
        this.chooseWord(player, packet.data);
        break;
      case Op.DRAW_COMMANDS:
        this.draw(player, packet.data);
        break;
      case Op.CLEAR:
        this.clear(player);
        break;
      case Op.UNDO:
        this.undo(player, packet.data);
        break;
      case Op.START_GAME:
        this.start(player, packet.data);
        break;
      case Op.CHAT:
        this.chat(player, packet.data);
        break;
      default:
        console.log(`[${this.id}] unhandled packet with id ${packet.id}`);
    }
  }

  /* moderation */

  kick(player, targetId, reason) {
    if (player.id !== this.owner) return;

    const target = this.find(Number(targetId));
    if (!target || target.id === player.id) return;

    this.eject(target, reason);
  }

  votekick(player, targetId) {
    const target = this.find(Number(targetId));
    if (!target || target.id === player.id || target.id === this.owner) return;

    let voters = this.votes.get(target.id);
    if (!voters) {
      voters = new Set();
      this.votes.set(target.id, voters);
    }
    voters.add(player.id);

    const eligible = Math.max(1, this.players.length - 1);
    const needed = Math.floor(eligible / 2) + 1;

    this.broadcast({ id: Op.VOTEKICK_STATE, data: [player.id, target.id, voters.size, needed] });

    if (voters.size >= needed) {
      this.votes.delete(target.id);
      this.eject(target, DisconnectReason.KICKED);
    }
  }

  /* settings */

  changeSetting(player, data) {
    if (player.id !== this.owner) return;
    if (!data || isNaN(Number(data.id)) ) return;

    const index = Math.trunc(Number(data.id));
    if (index < 0 || index >= this.settings.length) return;

    const [min, max] = SETTING_RANGES[index];
    const value = clampInt(data.val, min, max, DEFAULT_SETTINGS[index]);
    this.settings[index] = value;

    this.broadcast({ id: Op.SETTINGS, data: { id: index, val: value } });
  }

  /* gameplay */

  start(player, customWords) {
    if (player.id !== this.owner || this.started) return;
    if (this.players.length < 2) {
      // "You need at least 2 players to start the game!"
      this.send(player, { id: Op.ERROR, data: { id: 0 } });
      return;
    }

    this.setCustomWords(customWords);
    this.started = true;
    this.run().catch((error) => {
      console.error(`[${this.id}] game loop crashed:`, error);
      this.started = false;
    });
  }

  /** custom word list (comma separated) */
  setCustomWords(data) {
    if (typeof data !== "string") return;

    const list = data
      .split(",")
      .map((word) => word.trim().toLowerCase())
      .filter((word) => word.length >= 1 && word.length <= 32);

    this.customWords = list.length >= 5 ? [...new Set(list)] : [];
  }

  /**
   * game loop: round splash -> word choice -> drawing -> reveal, until
   * every round is played or too few players remain.
   */
  async run() {
    const run = ++this.runId;
    this.round = 0;
    this.usedWords.clear();

    let completed = true;

    while (this.round < this.setting(Setting.ROUNDS)) {
      if (this.players.length < 2) {
        completed = false;
        break;
      }

      this.setState({ id: GameState.ROUND_START, time: ROUND_START_TIME, data: this.round });
      if (!(await this.wait(run, ROUND_START_TIME * 1000))) return;

      if (!(await this.playRound(run))) {
        completed = false;
        break;
      }

      this.round++;
    }

    if (!(await this.wait(run, 0))) return;

    if (completed) {
      this.setState({ id: GameState.GAME_END, time: GAME_END_TIME, data: this.results() });
      if (!(await this.wait(run, GAME_END_TIME * 1000))) return;
    }

    this.setState({ id: GameState.ROOM, time: 0, data: 0 });
    this.resetGame();
  }

  /** one round: word choice + drawing phase + score screen */
  async playRound(run) {
    let drawer = null;
    let offer = null;

    // pick a drawer and the offered words - retried while the drawer
    // leaves during the word choice.
    for (;;) {
      if (this.players.length < 2) return false;

      drawer = this.nextDrawer();
      if (!drawer) return false;
      this.drawerId = drawer.id;
      this.choice = null;
      this.choiceAborted = false;

      offer = this.pickWords(this.offerCount());
      this.words = offer;

      const state = { id: GameState.WORD_CHOICE, time: WORD_CHOICE_TIME, data: { id: drawer.id } };
      this.state = state;
      this.broadcast({ id: Op.GAME_STATE, data: state }, drawer);
      this.send(drawer, {
        id: Op.GAME_STATE,
        data: { ...state, data: { ...state.data, words: offer } },
      });

      const picked = await this.waitChoice(run, offer);
      if (picked === null) return false; // room gone
      if (picked === "aborted") continue; // drawer left - try again

      this.word = this.combine(offer, picked);
      break;
    }

    await this.drawPhase(run, drawer);
    return true;
  }

  /** wait until the drawer picked a word, the timeout ran out or they left. */
  async waitChoice(run, offer) {
    const start = Date.now();
    const combination = this.setting(Setting.WORDMODE) === WordMode.COMBINATION;

    for (;;) {
      if (!(await this.wait(run, 100))) return null;
      if (this.choiceAborted) {
        this.choiceAborted = false;
        return "aborted";
      }
      if (this.choice !== null) {
        const picked = this.choice;
        this.choice = null;
        return picked;
      }
      if (Date.now() - start >= WORD_CHOICE_TIME * 1000) {
        // nobody picked in time - the server picks a random word.
        if (combination) {
          const half = offer.length / 2;
          return [randomInt(half), randomInt(half)];
        }
        return randomInt(offer.length);
      }
    }
  }

  /** drawing phase: countdown, hints, guesses, the score screen */
  async drawPhase(run, drawer) {
    const drawTime = clampInt(this.setting(Setting.DRAWTIME), 15, 600, 80);
    const hidden = this.setting(Setting.WORDMODE) === WordMode.HIDDEN;
    const hintCount = hidden ? 0 : clampInt(this.setting(Setting.HINTCOUNT), 0, 9, 2);

    this.hints = preloadHints(this.word);
    this.drawCommands = [];

    const state = {
      id: GameState.DRAWING,
      time: drawTime,
      data: {
        id: drawer.id,
        hints: this.hints,
        drawCommands: this.drawCommands,
        word: wordLengths(this.word),
      },
    };
    this.state = state;

    // spectators get the word as hint lengths, the drawer gets the word.
    this.broadcast({ id: Op.GAME_STATE, data: state }, drawer);
    this.send(drawer, {
      id: Op.GAME_STATE,
      data: { ...state, data: { ...state.data, word: this.word } },
    });

    let remaining = drawTime;
    let shown = 0;
    let lastTick = Date.now();

    while (remaining > 0) {
      if (!(await this.wait(run, 100))) return;

      if (this.roundAbort !== null) {
        await this.finishRound(run, this.roundAbort);
        return;
      }

      if (Date.now() - lastTick < 1000) continue;
      lastTick += 1000;
      remaining--;

      this.state.time = remaining;
      this.broadcast({ id: Op.CLOCK, data: remaining });

      // reveal hints evenly across drawing time.
      const progress = (drawTime - remaining) / drawTime;
      const due = Math.min(hintCount, Math.floor(progress * (hintCount + 1)));
      while (shown < due) {
        const hint = this.nextHint();
        if (!hint) break; // every letter is revealed already
        shown++;
        this.hints.push(hint);
        this.broadcast({ id: Op.HINTS, data: [hint] });
      }

      if (this.allGuessed()) {
        await this.finishRound(run, EndReason.ALL_GUESSED);
        return;
      }
    }

    await this.finishRound(run, EndReason.TIME_UP);
  }

  /** reveal  word + scores / wait before the next round start */
  async finishRound(run, reason) {
    const scores = this.computeScores();

    this.setState({
      id: GameState.ROUND_END,
      time: ROUND_END_TIME,
      data: { reason, scores, word: this.word },
    });

    for (const player of this.players) {
      player.guessed = false;
      player.roundScore = 0;
    }
    this.word = null;
    this.words = null;
    this.hints = [];
    this.drawCommands = [];
    this.drawerId = -1;
    this.choice = null;
    this.roundAbort = null;
    this.votes.clear();

    await this.wait(run, ROUND_END_TIME * 1000);
  }

  /** `[playerId, totalScore, addedScore, ...]` for score screen */
  computeScores() {
    const scores = [];
    const guessedCount = this.players.filter((player) => player.guessed).length;

    for (const player of this.players) {
      const added =
        player.id === this.drawerId
          ? Math.round((300 * guessedCount) / Math.max(1, this.players.length - 1))
          : player.roundScore || 0;

      player.score = (player.score || 0) + added;
      scores.push(player.id, player.score, added);
    }

    return scores;
  }

  /** `[playerId, rank, title, ...]` for the podium */
  results() {
    return this.players
      .slice()
      .sort((a, b) => (b.score || 0) - (a.score || 0))
      .map((player, index) => [player.id, index, 0]);
  }

  resetGame() {
    this.started = false;
    this.round = 0;
    this.turnPointer = -1;
    this.drawerId = -1;
    this.word = null;
    this.words = null;
    this.hints = [];
    this.drawCommands = [];
    this.votes.clear();
    this.usedWords.clear();

    for (const player of this.players) {
      player.score = 0;
      player.guessed = false;
      player.roundScore = 0;
    }
  }

  /* state helpers */


  setState(state) {
    this.state = state;
    this.broadcast({ id: Op.GAME_STATE, data: state });
  }

  /** sleep - returns false when the game loop was invalidated. */
  async wait(run, ms) {
    const until = Date.now() + ms;
    for (;;) {
      if (this.runId !== run) return false;
      const left = until - Date.now();
      if (left <= 0) return true;
      await new Promise((resolve) => setTimeout(resolve, Math.min(100, left)));
    }
  }

  nextDrawer() {
    if (!this.players.length) return null;
    this.turnPointer = (this.turnPointer + 1) % this.players.length;
    return this.players[this.turnPointer];
  }

  allGuessed() {
    if (this.players.length < 2) return true;
    return this.players
      .filter((player) => player.id !== this.drawerId)
      .every((player) => player.guessed);
  }

  /** `[index, letter]` hint /  null when nothing left */
  nextHint() {
    const used = new Set(this.hints.map((hint) => hint[0]));
    const available = [];

    for (let i = 0; i < this.word.length; i++) {
      if (!used.has(i) && this.word[i].trim() !== "") available.push(i);
    }

    if (available.length === 0) return null;
    const index = available[randomInt(available.length)];
    return [index, this.word[index]];
  }

  offerCount() {
    const count = clampInt(this.setting(Setting.WORDCOUNT), 1, 5, 3);
    return this.setting(Setting.WORDMODE) === WordMode.COMBINATION ? count * 2 : count;
  }

  /** pick `count` random words, preferring words not drawn recently */
  pickWords(count) {
    const customOnly = this.setting(Setting.CUSTOMWORDSONLY) === 1;
    let pool;
    if (this.customWords.length === 0) pool = words;
    else if (customOnly) pool = this.customWords;
    else pool = [...new Set(this.customWords.concat(words))];

    let available = pool.filter((word) => !this.usedWords.has(word));
    if (available.length < count) {
      // Every word was used already - start over.
      this.usedWords.clear();
      available = pool;
    }

    const picked = [];
    const bag = available.slice();
    while (picked.length < count && bag.length > 0) {
      picked.push(bag.splice(randomInt(bag.length), 1)[0]);
    }
    while (picked.length < count) picked.push(pool[randomInt(pool.length)]);

    for (const word of picked) this.usedWords.add(word);
    return picked;
  }

  combine(offer, picked) {
    if (Array.isArray(picked)) {
      const half = offer.length / 2;
      return offer[picked[0]] + offer[picked[1] + half];
    }
    return offer[picked];
  }

  /* packet handlers */

  /** drawer picked a word (index)*/
  chooseWord(player, data) {
    if (this.state.id !== GameState.WORD_CHOICE) return;
    if (player.id !== this.drawerId || !this.words) return;

    const offer = this.words;
    if (this.setting(Setting.WORDMODE) === WordMode.COMBINATION) {
      const half = offer.length / 2;
      if (!Array.isArray(data) || data.length !== 2) return;
      const first = Math.trunc(Number(data[0]));
      const second = Math.trunc(Number(data[1]));
      if (!Number.isFinite(first) || !Number.isFinite(second)) return;
      if (first < 0 || first >= half || second < 0 || second >= half) return;
      this.choice = [first, second];
    } else {
      const index = Math.trunc(Number(data));
      if (!Number.isFinite(index) || index < 0 || index >= offer.length) return;
      this.choice = index;
    }
  }

  canDraw(player) {
    return this.state.id === GameState.DRAWING && player.id === this.drawerId && !!this.word;
  }

  draw(player, data) {
    if (!this.canDraw(player)) return;
    if (!Array.isArray(data) || data.length === 0) return;

    this.drawCommands.push(...data);
    this.broadcast({ id: Op.DRAW_COMMANDS, data }, player);
  }

  clear(player) {
    if (!this.canDraw(player)) return;

    this.drawCommands.length = 0;
    this.broadcast({ id: Op.CLEAR }, player);
  }

  undo(player, data) {
    if (!this.canDraw(player)) return;

    const target = Math.trunc(Number(data));
    if (!Number.isFinite(target) || target < 0) return;

    this.drawCommands.length = Math.min(target, this.drawCommands.length);
    this.broadcast({ id: Op.UNDO, data: target }, player);
  }

  rate(player, data) {
    if (this.state.id !== GameState.DRAWING) return;
    if (player.id === this.drawerId) return;

    this.broadcast({ id: Op.RATE, data: { id: player.id, vote: data ? 1 : 0 } });
  }

  /** chat + guess handling */
  chat(player, data) {
    if (typeof data !== "string") return;

    const msg = data.trim().slice(0, CHAT_MAX_LENGTH);
    if (!msg) return;

    // spam protection
    const now = Date.now();
    if (player.chatBlockedUntil && now < player.chatBlockedUntil) return;
    player.chatTimes = player.chatTimes.filter((time) => now - time < SPAM_WINDOW);
    if (player.chatTimes.length >= SPAM_MAX) {
      player.chatBlockedUntil = now + SPAM_WINDOW;
      player.chatTimes = [];
      this.send(player, { id: Op.SPAM });
      return;
    }
    player.chatTimes.push(now);

    const drawing = this.state.id === GameState.DRAWING && !!this.word;
    const isDrawer = player.id === this.drawerId;

    if (drawing && !isDrawer && !player.guessed) {
      const flag = guessAccuracy(this.word, msg);

      if (flag === 1) {
        // exact guess
        const before = this.players.filter((entry) => entry.guessed).length;
        player.roundScore = Math.max(10, 300 - before * 75);
        player.guessed = true;

        this.broadcast({ id: Op.WORD_GUESSED, data: { id: player.id } }, player);
        this.send(player, { id: Op.WORD_GUESSED, data: { id: player.id, word: this.word } });

        this.roundAbort ??= EndReason.ALL_GUESSED;
        return;
      }

      if (flag === 2) {
        this.send(player, { id: Op.CLOSE_GUESS, data: msg });
        return;
      }
    }

    this.broadcast({ id: Op.CHAT, data: { id: player.id, msg } });
  }
}

module.exports = Room;
