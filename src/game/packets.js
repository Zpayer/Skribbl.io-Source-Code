import { game } from "../core/state.js";
import { ChatColor, DisconnectReason, Op } from "../core/constants.js";
import { t } from "../core/i18n.js";
import { addMessage, chatColor, addPlayerMessage, showBubble } from "../core/chat.js";
import { sounds, Sound } from "../core/audio.js";
import { enterRoom, setClock } from "./session.js";
import { applyGameState } from "./game-state.js";
import { setOwner, setRoomSetting } from "./room.js";
import { revealHints, revealWord } from "./hud.js";
import { findUser, createUser, removeUser, updateRanks, setGuessed } from "./players.js";
import { updateAvatar } from "../core/widgets.js";
import { el } from "../core/dom.js";
import { clearCanvas, undoTo, pushCommand } from "../draw/commands.js";


export function handlePacket(packet) {
  const id = packet.id;
  const data = packet.data;

  switch (id) {
    /* session */
    case Op.LOGIN:
      enterRoom(data);
      break;

    case Op.GAME_STATE:
      applyGameState(data);
      break;

    case Op.SETTINGS:
      setRoomSetting(data.id, data.val, false);
      break;

    case Op.OWNER:
      setOwner(data);
      break;

    case Op.CLOCK:
      setClock(data);
      break;

    /* users */
    case Op.USER_JOIN: {
      const user = createUser(data, true);
      updateRanks();

      user.joinTimeout = setTimeout(() => {
        addMessage(t("$ joined the room!", user.name), "", chatColor(ChatColor.JOIN), true);
        sounds.playSound(Sound.JOIN);
        user.joinTimeout = undefined;
      }, game.roomType == 0 ? 1000 : 0);
      break;
    }

    case Op.USER_LEAVE: {
      const left = removeUser(data.id);
      if (!left) break;

      if (left.joinTimeout == null) {
        addMessage(leaveText(data.reason, left.name), "", chatColor(ChatColor.LEAVE), true);
        sounds.playSound(Sound.LEAVE);
      } else {
        clearTimeout(left.joinTimeout);
        left.joinTimeout = undefined;
      }

      const drawerWasRemoved =
        left.id == game.drawerId &&
        (data.reason == DisconnectReason.KICKED || data.reason == DisconnectReason.BANNED);
      if (drawerWasRemoved) clearCanvas(true);
      break;
    }

    case Op.AVATAR_CHANGE: {
      const user = findUser(data.id);
      if (user) {
        user.avatar = data.avatar;
        updateAvatar(user.element.avatar, user.avatar);
      }
      break;
    }

    case Op.NAME_CHANGE: {
      const user = findUser(data.id);
      if (user) {
        user.name = data.name;
        user.element.querySelector(".player-name").textContent = data.name;
      }
      break;
    }

    case Op.VOTEKICK_STATE: {
      const initiator = findUser(data[0]);
      const target = findUser(data[1]);
      if (initiator && target) {
        addMessage(
          t("$ is voting to kick $ ($/$)", [initiator.name, target.name, data[2], data[3]]),
          "",
          chatColor(ChatColor.CLOSE),
          true
        );
      }
      break;
    }

    /*gameplay */
    case Op.HINTS:
      revealHints(data);
      break;

    case Op.WORD_GUESSED: {
      const user = findUser(data.id);
      if (!user) break;

      const line = addMessage(t("$ guessed the word!", user.name), "", chatColor(ChatColor.JOIN), true);
      line.classList.add("guessed");
      setGuessed(user, true);
      sounds.playSound(Sound.PLAYER_GUESSED);

      if (data.id == game.myId) revealWord(data.word);
      break;
    }

    case Op.CLOSE_GUESS:
      addMessage(t("$ is close!", data), "", chatColor(ChatColor.CLOSE), true);
      break;

    case Op.RATE: {
      const user = findUser(data.id);
      if (!user) break;

      const icon = el("icon");
      icon.style.backgroundImage = "url(/img/" + (data.vote == 0 ? "thumbsdown.gif" : "thumbsup.gif") + ")";

      const bubble = showBubble(user, icon);
      const rect = bubble.getBoundingClientRect();
      const size = 0.9 * (rect.bottom - rect.top);
      icon.style.width = size + "px";
      icon.style.height = size + "px";

      if (data.vote) {
        addMessage(t("$ liked the drawing!", user.name), "", chatColor(ChatColor.JOIN), true);
      } else {
        addMessage(t("$ disliked the drawing!", user.name), "", chatColor(ChatColor.LEAVE), true);
      }
      break;
    }

    /* chat */
    case Op.CHAT:
      addPlayerMessage(findUser(data.id), data.msg);
      break;

    case Op.SPAM:
      addMessage(
        t("Spam detected! You're sending messages too quickly."),
        "",
        chatColor(ChatColor.LEAVE),
        true
      );
      break;

    case Op.ERROR:
      switch (data.id) {
        case 0:
          addMessage(
            t("You need at least 2 players to start the game!"),
            "",
            chatColor(ChatColor.LEAVE),
            true
          );
          break;
        case 100:
          addMessage(
            t("Server restarting in about $ seconds!", data.data),
            "",
            chatColor(ChatColor.LEAVE),
            true
          );
          break;
      }
      break;

    /* drawing */
    case Op.DRAW_COMMANDS:
      for (const command of data) pushCommand(command);
      break;

    case Op.CLEAR:
      clearCanvas(true);
      break;

    case Op.UNDO:
      undoTo(data);
      break;

    default:
      console.log("Unimplemented data packed received with id " + id);
  }
}

/** leave/kick/ban message */
function leaveText(reason, name) {
  switch (reason) {
    case DisconnectReason.KICKED:
      return t("$ has been kicked!", name);
    case DisconnectReason.BANNED:
      return t("$ has been banned!", name);
    default:
      return t("$ left the room!", name);
  }
}
