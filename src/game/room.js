/**
 * Room management: the settings panel on the drawing board, ownership and
 * the start/invite buttons.
 */

import { bind, restartAnimation } from "../core/dom.js";
import { t } from "../core/i18n.js";
import { game } from "../core/state.js";
import { ADMIN_FLAG, ChatColor } from "../core/constants.js";
import { addMessage, chatColor } from "../core/chat.js";
import { findUser } from "./players.js";
import { setRoundText } from "./hud.js";
import { emitData } from "../net/connection.js";
import { Op } from "../core/constants.js";
import {
  roomSettingControls,
  startGameButton,
  customWordsInput,
} from "../core/elements.js";

export const roomSettings = [];

export function applyRoomSettings() {
  setRoundText(game.round);

  for (const item of roomSettings) {
    if (!item.index) continue;
    const value = game.settings[item.index];
    if (item.element.type === "checkbox") item.element.checked = !!value;
    else item.element.value = value;
  }
}


export function setRoomSetting(index, value, emit) {
  game.settings[index] = value;

  if (emit && game.socket) {
    emitData(Op.SETTINGS, { id: index, val: value });
  }

  applyRoomSettings();
}


export function setOwner(ownerId) {
  game.ownerId = ownerId;

  for (const user of game.users) {
    const isOwner = user.id == game.ownerId;
    user.element.querySelector(".owner").style.display = isOwner ? "block" : "none";
    setUserIcon(user, 0, isOwner);
  }

  const isMine = game.myId != game.ownerId;
  startGameButton.disabled = isMine;
  for (const item of roomSettings) item.element.disabled = isMine;

  const owner = findUser(game.ownerId);
  if (owner) addMessage(t("$ is now the room owner!", owner.name), "", chatColor(ChatColor.OWNER), true);
}


export function setUserIcon(user, iconIndex, visible) {
  const icon = user.element.icons[iconIndex];
  if (visible) icon.classList.add("visible");
  else icon.classList.remove("visible");
}


export function initRoomSettings() {
  for (const control of roomSettingControls) {
    const item = {
      id: control.id.replace("item-settings-", ""),
      element: control,
      index: control.dataset.setting,
    };
    control.item = item;
    roomSettings.push(item);

    bind(control, "change", function () {
      let value = this.value;
      if (this.type === "checkbox") value = this.checked ? 1 : 0;
      if (this.item.index != null) setRoomSetting(this.item.index, value, true);
    });
  }
}


export function sendStartGame() {
  if (!game.socket) return;

  const words = customWordsInput.value.split(",");
  let customWords = "";

  if (words.length >= 5) {
    for (let i = 0; i < words.length; i++) words[i] = words[i].trim();
    customWords = words.join(",");
  }

  emitData(Op.START_GAME, customWords);
}
