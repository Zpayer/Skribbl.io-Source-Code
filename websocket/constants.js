
const Op = {
  USER_JOIN: 1,
  USER_LEAVE: 2,
  KICK: 3,
  BAN: 4,
  VOTEKICK_STATE: 5,
  REPORT: 6,
  MUTE: 7,
  RATE: 8,
  AVATAR_CHANGE: 9,
  LOGIN: 10,
  GAME_STATE: 11,
  SETTINGS: 12,
  HINTS: 13,
  CLOCK: 14,
  WORD_GUESSED: 15,
  CLOSE_GUESS: 16,
  OWNER: 17,
  CHOOSE_WORD: 18,
  DRAW_COMMANDS: 19,
  CLEAR: 20,
  UNDO: 21,
  START_GAME: 22,
  CHAT: 30,
  ERROR: 31,
  SPAM: 32,
  NAME_CHANGE: 90,
};




const GameState = {
  WAITING: 0, // waiting for players
  STARTING: 1, // countdown until the game starts
  ROUND_START: 2, // round splash screen
  WORD_CHOICE: 3, // drawer picks a word
  DRAWING: 4, // drawing phase
  ROUND_END: 5, // word reveal + score
  GAME_END: 6, // podium
  ROOM: 7, // back to the room, no game running
};


const EndReason = {
  ALL_GUESSED: 0,
  DRAWER_LEFT: 1,
  TIME_UP: 2,
  SKIPPED: 5,
};


const DisconnectReason = {
  KICKED: 1,
  BANNED: 2,
};

const JoinError = {
  ROOM_NOT_FOUND: 1,
  ROOM_FULL: 2,
  KICK_COOLDOWN: 3,
  BANNED: 4,
  JOINING_TOO_FAST: 5,
};


const Setting = {
  LANG: 0,
  SLOTS: 1,
  DRAWTIME: 2,
  ROUNDS: 3,
  WORDCOUNT: 4,
  HINTCOUNT: 5,
  WORDMODE: 6,
  CUSTOMWORDSONLY: 7,
};

const WordMode = {
  NORMAL: 0,
  HIDDEN: 1,
  COMBINATION: 2,
};

const DEFAULT_SETTINGS = [0, 8, 80, 3, 3, 2, 0, 0];

const SETTING_RANGES = [
  [0, 99], // LANG
  [2, 20], // SLOTS
  [15, 600], // DRAWTIME
  [2, 10], // ROUNDS
  [1, 5], // WORDCOUNT
  [0, 9], // HINTCOUNT
  [0, 2], // WORDMODE
  [0, 1], // CUSTOMWORDSONLY
];


const AVATAR_PARTS = [28, 57, 51, 120];

module.exports = {
  Op,
  GameState,
  EndReason,
  DisconnectReason,
  JoinError,
  Setting,
  WordMode,
  DEFAULT_SETTINGS,
  SETTING_RANGES,
  AVATAR_PARTS,
};
