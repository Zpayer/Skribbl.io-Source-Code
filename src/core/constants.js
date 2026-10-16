
/* avatars */



export const AVATAR_ACCESSORIES = [
  0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19,
  23, 24, 25, 26, 28,
  96, 97, 98, 99,
];
export const AVATAR_PARTS = [28, 57, 51, AVATAR_ACCESSORIES.length];

export const LOGO_AVATAR_COUNT = 9;

/* game states */


export const GameState = {
  WAITING: 0, // waiting for players
  STARTING: 1, // countdown until the game starts
  ROUND_START: 2, // round splash screen
  WORD_CHOICE: 3, // drawer picks a word
  DRAWING: 4, // drawing phase
  ROUND_END: 5, // word reveal + score
  GAME_END: 6, // podium
  ROOM: 7, // back to the room, no game running
};


export const EndReason = {
  ALL_GUESSED: 0,
  DRAWER_LEFT: 1,
  TIME_UP: 2,
  SKIPPED: 5,
};


export const DisconnectReason = {
  KICKED: 1,
  BANNED: 2,
};

/* room settings */


export const Setting = {
  LANG: 0,
  SLOTS: 1,
  DRAWTIME: 2,
  ROUNDS: 3,
  WORDCOUNT: 4,
  HINTCOUNT: 5,
  WORDMODE: 6,
  CUSTOMWORDSONLY: 7,
};

export const WordMode = {
  NORMAL: 0,
  HIDDEN: 1,
  COMBINATION: 2,
};

/* overlays */

export const ModalType = {
  PLAYER: 0,
  INFO: 1,
  DISCONNECT: 2,
  INVITE: 3,
  SETTINGS: 4,
  ROOMS: 5,
};

/* chat */


export const ChatColor = {
  BASE: 0,
  GUESSED: 1,
  CLOSE: 2,
  DRAWING: 3,
  JOIN: 4,
  LEAVE: 5,
  OWNER: 6,
  GUESSCHAT: 7,
};

export const CHAT_COLOR_NAMES = [
  "BASE",
  "GUESSED",
  "CLOSE",
  "DRAWING",
  "JOIN",
  "LEAVE",
  "OWNER",
  "GUESSCHAT",
];

/* user flags */


export const ADMIN_FLAG = 4;

/* drawing */

export const DrawCommand = {
  LINE: 0,
  FILL: 1,
};

export const Tool = {
  BRUSH: 0,
  FILL: 1,
};

export const MIN_BRUSH_SIZE = 4;
export const MAX_BRUSH_SIZE = 40;
export const BRUSH_SIZES = [4, 10, 20, 32, 40];


export const SNAPSHOT_INTERVAL = 50;
export const DRAW_SEND_BATCH = 8;
export const DRAW_RATE_LIMIT = 90;

/* runtime */

export const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

/* protocol */


export const Op = {
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

