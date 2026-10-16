/**
 * Joining and leaving a room, the loading overlay and the round countdown.
 */

import { game, ui } from "../core/state.js";
import { GameState, Tool } from "../core/constants.js";
import { sounds, Sound } from "../core/audio.js";
import { clearChat } from "../core/chat.js";
import {
  homeScreen,
  gameScreen,
  loadingScreen,
  playersList,
  inviteInput,
  clockText,
} from "../core/elements.js";
import { createUser, updatePager, updateRanks } from "./players.js";
import { applyRoomSettings, setOwner } from "./room.js";
import { setRoundText } from "./hud.js";
import { applyGameState } from "./game-state.js";
import { clearCanvas } from "../draw/commands.js";
import { selectTool, setBrushSize, setPrimaryColor, setSecondaryColor } from "../draw/palette.js";

export function setLoading(show) {
  game.loading = show;
  loadingScreen.style.display = show ? "block" : "none";
}

export function leaveRoom() {
  console.log("lobby left");

  if (game.socket) game.socket.close();
  game.socket = undefined;

  clearCanvas(true);
  stopClock();

  game.users = [];
  game.settings = [];
  game.drawerId = -1;
  game.ownerId = -1;
  game.myId = 0;
  game.state = { id: -1, time: 0, data: 0 };

  homeScreen.style.display = "";
  gameScreen.style.display = "none";
}


export function enterRoom(data) {
  sounds.playSound(Sound.JOIN);

  // default drawing tools for the new room.
  selectTool(Tool.BRUSH, true);
  setBrushSize(12);
  setPrimaryColor(1);
  setSecondaryColor(0);
  clearCanvas(true);
  clearChat();

  homeScreen.style.display = "none";
  gameScreen.style.display = "flex";

  game.myId = data.me;
  game.roomType = data.type;
  game.roomId = data.id;
  inviteInput.value = window.location.origin + "/?" + data.id;

  game.settings = data.settings;
  applyRoomSettings();

  playersList.replaceChildren();
  game.users = [];
  for (const user of data.users) createUser(user, false);

  updatePager();
  updateRanks();
  setRoundText(data.round);
  setOwner(data.owner);
  applyGameState(data.state, true);

  // request the in-game ads once per page load.
  if (!game.adsShown) {
    setTimeout(() => {
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch (e) {
        console.log("google ad request failed");
        console.log(e);
      }
    }, 1500);
    game.adsShown = true;
  }
}

/* clock */

const CLOCK_BLINK_SECONDS = 10;
const CLOCK_URGENT_SECONDS = 4;


export function stopClock() {
  if (ui.clockInterval) {
    clearInterval(ui.clockInterval);
    ui.clockInterval = null;
  }
}

export function setClock(time) {
  ui.clockTime = time;
  clockText.textContent = ui.clockTime;
}


export function startClock(seconds) {
  stopClock();
  setClock(seconds);

  ui.clockInterval = setInterval(() => {
    setClock(Math.max(0, ui.clockTime - 1));

    let blinkAfter = -1;
    if (game.state.id === GameState.DRAWING) blinkAfter = CLOCK_BLINK_SECONDS;
    if (game.state.id === GameState.WORD_CHOICE) blinkAfter = CLOCK_URGENT_SECONDS;

    clockText.style.animationName =
      ui.clockTime < blinkAfter ? (ui.clockTime % 2 === 0 ? "rot_left" : "rot_right") : "none";

    if (ui.clockTime < blinkAfter) sounds.playSound(Sound.TICK);
    if (ui.clockTime <= 0) stopClock();
  }, 1000);
}
