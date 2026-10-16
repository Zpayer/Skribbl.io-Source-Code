import { el, clear } from "./dom.js";
import { t } from "./i18n.js";
import { settings } from "./settings.js";
import { game } from "./state.js";
import { ChatColor, CHAT_COLOR_NAMES, ADMIN_FLAG } from "./constants.js";
import { chatContent, chatBubbles } from "./elements.js";
import { findUser } from "../game/players.js";


export function chatColor(slot) {
  return "var(--COLOR_CHAT_TEXT_" + CHAT_COLOR_NAMES[slot] + ")";
}


export function createLine(name, message, color, noColon) {
  const line = document.createElement("p");
  const bold = document.createElement("b");
  bold.textContent = noColon ? name : name + ": ";
  line.appendChild(bold);
  line.style.color = color;

  const span = document.createElement("span");
  span.textContent = message;
  line.appendChild(span);

  return line;
}


export function addMessage(name, message, color, noColon) {
  const line = createLine(name, message, color, noColon);
  const stickToBottom = chatContent.scrollHeight - chatContent.scrollTop - chatContent.clientHeight <= 20;

  chatContent.appendChild(line);
  if (stickToBottom) chatContent.scrollTop = chatContent.scrollHeight + 100;


  if (settings.chatDeleteQuota > 0) {
    while (chatContent.childElementCount > settings.chatDeleteQuota) {
      chatContent.firstElementChild.remove();
    }
  }

  const showBubble =
    settings.chatBubbles == 0 || (settings.chatBubbles == 1 && game.drawerId != game.myId);

  if (showBubble) {
    const bubble = createLine(name, message, color, noColon);
    chatBubbles.appendChild(bubble);
    setTimeout(() => bubble.remove(), 2500);
  }

  return line;
}


export function addPlayerMessage(user, message) {
  if (user.muted) return;

  const me = findUser(game.myId);
  const iAmAdmin = (me.flags & ADMIN_FLAG) == ADMIN_FLAG;

  const senderIsDrawerOrGuessed = user.id == game.drawerId || user.guessed;
  const visible = game.myId == game.drawerId || me.guessed || !senderIsDrawerOrGuessed || iAmAdmin;
  if (!visible) return;

  const senderIsAdmin = (user.flags & ADMIN_FLAG) == ADMIN_FLAG;

  let color = ChatColor.BASE;
  if (senderIsDrawerOrGuessed) color = ChatColor.GUESSCHAT;
  if (senderIsAdmin) color = ChatColor.LEAVE;

  showBubble(user, el("text", message));
  addMessage(user.name, message, chatColor(color), false);
}


export function showBubble(user, content) {
  if (user.bubble) {
    clearTimeout(user.bubble.timeout);
    user.bubble.remove();
    user.bubble = undefined;
  }

  const bubble = el("player-bubble");
  const body = el("content");

  body.appendChild(content);
  bubble.appendChild(el("arrow"));
  bubble.appendChild(body);
  user.element.appendChild(bubble);

  user.bubble = bubble;
  user.bubble.timeout = setTimeout(() => {
    user.bubble.remove();
    user.bubble = undefined;
  }, 1500);

  return bubble;
}


export function clearChat() {
  clear(chatContent);
}
