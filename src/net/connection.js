
import { io } from "socket.io-client";

import { game } from "../core/state.js";
import { settings } from "../core/settings.js";
import { t } from "../core/i18n.js";
import { DisconnectReason, ModalType, Op } from "../core/constants.js";
import { openModal } from "../core/modal.js";
import { sounds } from "../core/audio.js";
import { nameInput, languageSelect } from "../core/elements.js";
import { setLoading, leaveRoom } from "../game/session.js";
import { handlePacket } from "../game/packets.js";


function joinErrorMessage(code) {
  switch (code) {
    case 1:
      return t("Room not found!");
    case 2:
      return t("Room is full!");
    case 3:
      return t("You are on a kick cooldown!");
    case 4:
      return t("You are banned from this room!");
    case 5:
      return t("You are joining rooms too quickly!");
    case 100:
      return t("You are already connected to this room!");
    case 200:
      return t("Too many users from your IP are connected to this room!");
    case 300:
      return t("You have been kicked too many times!");
    default:
      return t("An unknown error ('$') occured!", code);
  }
}

/**
 * connect to game server and log in.
 * @param url       server url
 * @param joinCode  room code from the invite link
 * @param create    1 when the user pressed "Create Private Room"
 */
export function connectToServer(url, joinCode, create) {
  if (sounds.context && sounds.context.resume) sounds.context.resume();
  if (game.socket) leaveRoom();

  const options = {
    transports: ["websocket", "polling"],
    closeOnBeforeunload: false,
  };

  if ("URL" in window) {
    const parsed = new URL(url);
    const isLocal = parsed.hostname === "127.0.0.1" || parsed.hostname === "localhost";

    if (!isLocal) {
      options.path = ":" + parsed.port + "/";
      url = parsed.protocol + "//" + parsed.hostname;
    }
  }

  const socket = io(url, options);
  game.socket = socket;


  let disconnectReason = 0;

  socket.on("connect", () => {
    setLoading(false);


    socket.off("joinerr");
    socket.on("joinerr", (code) => {
      leaveRoom();
      openModal(ModalType.INFO, joinErrorMessage(code));
    });

    socket.off("data");
    socket.on("data", handlePacket);

    const [name, inviteCode] = nameInput.value.split("#");
    socket.emit("login", {
      join: joinCode,
      create: create ? 1 : 0,
      name: name,
      lang: languageSelect.value,
      code: inviteCode,
      avatar: settings.avatar,
    });
  });

  socket.on("reason", (reason) => {
    disconnectReason = reason;
  });

  socket.on("disconnect", (reason) => {
    console.log("socket disconnect: " + reason);

    switch (disconnectReason) {
      case DisconnectReason.KICKED:
        openModal(ModalType.DISCONNECT, t("You have been kicked!"));
        break;
      case DisconnectReason.BANNED:
        openModal(ModalType.DISCONNECT, t("You have been banned!"));
        break;
      default:
        openModal(ModalType.DISCONNECT, t("Connection lost!") + "\n" + reason);
    }

    leaveRoom();
  });

  socket.on("connect_error", (error) => {
    leaveRoom();
    setLoading(false);
    openModal(ModalType.INFO, error.message);
  });
}


export function emitData(id, data) {
  if (game.socket) game.socket.emit("data", data === undefined ? { id } : { id, data });
}


export function isConnected() {
  return !!(game.socket && game.socket.connected);
}
