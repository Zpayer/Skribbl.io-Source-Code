export const game = {
  /** @type {import('socket.io-client').Socket | null} */
  socket: null,

  myId: -1,        // our own user id in the room
  ownerId: -1,     // room owner (only they can start/change settings)
  drawerId: -1,    // whoever's drawing right now

  roomId: undefined,
  roomType: -1,    // 0 = public, 1 = private
  round: 0,        // 0-indexed round counter

  users: [],       // all users in the room (see players.js)
  settings: [],    // room settings array (see constants.js)

  state: { id: -1, time: 0, data: 0 }, // last state packet received

  selectedPlayer: null, // user clicked in the player modal

  loading: false,  // true while the loading spinner is up
  adsShown: false, // true if google ads were already requested
};

// local drawing buffer shared between palette, inputs, commands, and packets
export const drawing = {
  commands: [],    // every accepted draw command in order
  sendIndex: 0,    // index of last command sent to server
  renderIndex: 0,  // index of last command rendered (for spectator smoothing)
  undoStack: [],   // command counts where strokes started (for undo)
  snapshots: [],   // image snapshots taken every SNAPSHOT_INTERVAL commands
  snapshotBounds: [0, 9999, 9999, 0, 0], // bounds for the current snapshot

  pointer: [0, 0],      // current pointer position on canvas
  lastPointer: [0, 0],  // previous pointer position (where the line started)
  pressure: -1,         // pen pressure (-1 if not supported)

  brushSize: 0,         // selected brush size in px
  tool: 0,              // currently selected tool (see Tool)
  primaryColor: 0,
  secondaryColor: 0,

  activePointerId: null, // pointerId of active stroke, or null
  activeButton: -1,      // mouse button for active stroke (-1 when idle)

  lastSendTime: 0,       // throttle tracking
  lastUndoLength: 0,
};

// UI state shared across multiple modules
export const ui = {
  overlayFrame: undefined, // active overlay animation frame id
  overlayTop: -100,        // top position (%) and opacity used by the animation
  overlayOpacity: 0,

  clockInterval: null,     // timer handle and current seconds on display
  clockTime: 0,
};