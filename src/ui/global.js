import { bind } from "../core/dom.js";
import { game } from "../core/state.js";
import { settings, saveSettings } from "../core/settings.js";
import { t } from "../core/i18n.js";
import { openModal, closeModal, setMuteLabel } from "../core/modal.js";
import { handleHotkeyPress, resetHotkeys } from "../core/hotkeys.js";
import { addMessage, chatColor, addPlayerMessage } from "../core/chat.js";
import { sounds, Sound } from "../core/audio.js";
import { ModalType, Op, ChatColor, isSafari } from "../core/constants.js";
import {
  modalRoot,
  sizesBox,
  colorsBox,
  colorPreviewMobile,
  gameScreen,
  nameInput,
  languageSelect,
  playButton,
  createButton,
  rateLike,
  rateDislike,
  startGameButton,
  inviteButton,
  inviteModalButton,
  playerModal,
  volumeInput,
  pressureSensitivitySelect,
  mobileChatLayoutSelect,
  chatBubblesSelect,
  settingsResetButton,
  gameSettingsButton,
  mobileKeyboardMain,
  mobileKeyboardToggle,
  chatInputs,
  chatForms,
} from "../core/elements.js";
import { apiPost, playEndpoint, showPreroll } from "../net/api.js";
import { connectToServer, emitData } from "../net/connection.js";
import { setLoading, leaveRoom } from "../game/session.js";
import { sendRate } from "../game/hud.js";
import { findUser, updatePager } from "../game/players.js";
import { sendStartGame, setUserIcon } from "../game/room.js";
import { closeSizes } from "../draw/palette.js";
import { applyMobileChatLayout } from "./home.js";

/* viewport */


function setViewportHeight() {
  let height = window.visualViewport ? window.visualViewport.height : window.innerHeight;

  if ("virtualKeyboard" in navigator) {
    height -= navigator.virtualKeyboard.boundingRect.height;
  }

  document.documentElement.style.setProperty("--vh", height + "px");
}

function onViewportResize() {
  setViewportHeight();
  updatePager();
}

function initViewport() {
  setViewportHeight();

  if ("virtualKeyboard" in navigator) {
    navigator.virtualKeyboard.overlaysContent = true;
    navigator.virtualKeyboard.addEventListener("geometrychange", () => setViewportHeight());
  }

  if (window.visualViewport) {
    bind(window.visualViewport, "resize", onViewportResize);
    if (isSafari) bind(window.visualViewport, "scroll", onViewportResize);
  } else {
    bind(window, "resize", onViewportResize);
  }

  window.onunload = () => {
    if (game.socket) leaveRoom();
  };
}

/* global shortcuts */

function onGlobalPointerDown(event) {
  if (event.target == modalRoot) {
    closeModal();
    event.preventDefault();
    return false;
  }

  if (mobileKeyboardMain.contains(event.target)) {
    event.preventDefault();
    return;
  }

  if (mobileKeyboardToggle.value == "1") chatInputs[1].blur();
  if (!sizesBox.contains(event.target)) closeSizes();
  if (event.target != colorPreviewMobile) colorsBox.classList.remove("open");
}

/* home buttons */

function initHomeButtons() {
  bind([nameInput, languageSelect], "change", saveSettings);

  bind(playButton, "click", () => {
    if (game.loading) return;

    const parts = window.location.href.split("?");
    const query = parts.length > 1 ? parts[1].split("#")[0].trim() : "";
    const joinCode = /^[A-Za-z0-9]{4,20}$/.test(query) ? query : "";

    const body = joinCode != "" ? "id=" + joinCode : "lang=" + languageSelect.value;

    closeModal();
    setLoading(true);

    showPreroll(() => {
      apiPost(
        playEndpoint,
        body,
        (result) => {
          setLoading(false);
          if (result.success) connectToServer(result.data, joinCode);
        },
        true
      );
    });
  });

  bind(createButton, "click", () => {
    if (game.loading) return;

    closeModal();
    setLoading(true);

    showPreroll(() => {
      apiPost(
        playEndpoint,
        "lang=" + languageSelect.value,
        (result) => {
          if (result.success) connectToServer(result.data, 0, 1);
          else setLoading(false);
        },
        true
      );
    });
  });
}

/* game buttons */

function initGameButtons() {
  bind(rateLike, "click", () => sendRate(1));
  bind(rateDislike, "click", () => sendRate(0));
  bind(startGameButton, "click", sendStartGame);
  bind(gameSettingsButton, "click", () => openModal(ModalType.SETTINGS));

  bind([inviteButton, inviteModalButton], "click", () => {
    addMessage(t("Copied room link to clipboard!"), "", chatColor(ChatColor.CLOSE), true);

    const link = window.location.origin + "/?" + game.roomId;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(link).then(
        () => console.log("Async: Copying to clipboard was successful!"),
        (error) => console.error("Async: Could not copy text: ", error)
      );
    } else {
      const textarea = document.createElement("textarea");
      textarea.value = link;
      textarea.style.top = "0";
      textarea.style.left = "0";
      textarea.style.position = "fixed";
      document.body.appendChild(textarea);
      textarea.select();
      textarea.focus();

      try {
        const success = document.execCommand("copy");
        console.log("Copying link was " + (success ? "successful" : "unsuccessful"));
      } catch (error) {
        console.log("Unable to copy link " + error);
      }

      document.body.removeChild(textarea);
    }
  });
}

/* player modal */

function initPlayerModal() {
  bind(playerModal.querySelector("button.kick"), "click", () => {
    closeModal();
    const target = game.selectedPlayer;
    if (target != null && target.id != game.myId && game.socket) emitData(Op.KICK, target.id);
  });

  bind(playerModal.querySelector("button.ban"), "click", () => {
    closeModal();
    const target = game.selectedPlayer;
    if (target != null && target.id != game.myId && game.socket) emitData(Op.BAN, target.id);
  });

  bind(playerModal.querySelector("button.votekick"), "click", () => {
    closeModal();
    const target = game.selectedPlayer;
    if (target == null || target.id == game.myId || !game.socket) return;

    if (target.id == game.ownerId) {
      addMessage(t("You can not votekick the lobby owner!"), "", chatColor(ChatColor.LEAVE), true);
    } else {
      emitData(Op.VOTEKICK_STATE, target.id);
    }
  });

  bind(playerModal.querySelector("button.mute"), "click", () => {
    const target = game.selectedPlayer;
    if (target == null || target.id == game.myId) return;

    target.muted = !target.muted;
    setUserIcon(target, 1, target.muted);

    addMessage(
      t(target.muted ? "You muted '$'!" : "You unmuted '$'!", target.name),
      "",
      chatColor(ChatColor.LEAVE),
      true
    );

    if (game.socket) emitData(Op.MUTE, target.id);
    setMuteLabel(target.muted);
  });

  bind(playerModal.querySelector("button.report"), "click", () => {
    playerModal.querySelector(".buttons").style.display = "none";
    playerModal.querySelector(".player").style.display = "none";
    playerModal.querySelector(".report-menu").style.display = "";

    for (const input of playerModal.querySelectorAll(".report-menu input")) {
      input.checked = false;
    }
  });

  bind(playerModal.querySelector("button#report-send"), "click", () => {
    let reasons = 0;
    if (playerModal.querySelector("#report-reason-toxic").checked) reasons |= 1;
    if (playerModal.querySelector("#report-reason-spam").checked) reasons |= 2;
    if (playerModal.querySelector("#report-reason-bot").checked) reasons |= 4;

    if (reasons <= 0) return;

    const target = game.selectedPlayer;
    if (target != null && target.id != game.myId) {
      target.reported = true;
      if (game.socket) emitData(Op.REPORT, { id: target.id, reasons: reasons });
      addMessage(t("Your report for '$' has been sent!", target.name), "", chatColor(ChatColor.CLOSE), true);
    }

    closeModal();
  });
}

/* settings modal */

function initSettingsModal() {
  bind(volumeInput, "change", (event) => {
    settings.volume = event.target.value;
    sounds.setVolume(settings.volume);
    sounds.playSound(Sound.PLAYER_GUESSED);
    saveSettings();
  });

  bind(pressureSensitivitySelect, "change", (event) => {
    settings.pressureSensitivity = event.target.value;
    saveSettings();
  });

  bind(mobileChatLayoutSelect, "change", (event) => {
    settings.mobileChatLayout = event.target.value;
    applyMobileChatLayout();
    saveSettings();
  });

  bind(chatBubblesSelect, "change", (event) => {
    settings.chatBubbles = event.target.value;
    saveSettings();
  });

  bind(settingsResetButton, "click", resetHotkeys);
}

/* chat */

function updateCounter(form, length) {
  const counter = form.querySelector(".characters");
  counter.textContent = length;

  if (counter.textContent == 0) counter.classList.remove("visible");
  else counter.classList.add("visible");
}

function initChat() {
  bind(chatInputs[1], "focus", function (event) {
    // iOS Safari scrolls the page when the virtual keyboard opens.
    const keepTop = (focusEvent) => {
      window.removeEventListener("scroll", keepTop);
      window.scroll(0, 0);
      focusEvent.preventDefault();
    };

    setViewportHeight();
    gameScreen.classList.add("mobile-input-focus");

    if (isSafari) {
      window.addEventListener("scroll", keepTop);
      setTimeout(() => keepTop(event), 200);
      event.preventDefault();
    }
  });

  bind(chatInputs[1], "blur", () => {
    setViewportHeight();
    gameScreen.classList.remove("mobile-input-focus");
  });

  bind(chatInputs, "input", function () {
    updateCounter(this.parentNode, this.value.length);
  });

  bind(chatForms, "submit", function (event) {
    event.preventDefault();

    const input = this.querySelector("input");
    if (input.value) {
      const message = input.value;
      if (game.socket && game.socket.connected) emitData(Op.CHAT, message);
      else addPlayerMessage(findUser(game.myId), message);
    }

    this.reset();
    updateCounter(this, 0);
    return false;
  });
}

/* init */

export function initGlobal() {
  initViewport();

  bind(document, "keyup", handleHotkeyPress);
  bind(document, "PointerEvent" in window ? "pointerdown" : "click", onGlobalPointerDown);

  initHomeButtons();
  initGameButtons();
  initPlayerModal();
  initSettingsModal();
  initChat();
}
