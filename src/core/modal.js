import { bind } from "./dom.js";
import { t } from "./i18n.js";
import { settings } from "./settings.js";
import { game } from "./state.js";
import { ModalType, ADMIN_FLAG } from "./constants.js";
import {
  modalRoot,
  modalTitle,
  modalContent,
  modalClose,
  modalPanels,
  infoModal,
  playerModal,
} from "./elements.js";
import { findUser, userFilters } from "../game/players.js";
import { createAvatar, setAvatarOwner, setAvatarFilters } from "./widgets.js";


export function setMuteLabel(muted) {
  playerModal.querySelector(".buttons button.mute").textContent = t(muted ? "Unmute" : "Mute");
}


export function openModal(type, data) {
  modalRoot.style.display = "block";

  for (const panel of modalPanels) panel.style.display = "none";

  const panel = modalPanels[type];
  panel.style.display = "flex";

  switch (type) {
    case ModalType.INFO: {
      modalTitle.textContent = t("Something went wrong!");
      panel.querySelector(".message").textContent = data;
      break;
    }

    case ModalType.DISCONNECT: {
      modalTitle.textContent = t("Disconnected!");
      panel.querySelector(".message").textContent = data;
      break;
    }

    case ModalType.PLAYER: {
      const player = data;
      modalTitle.textContent = player.id == game.myId ? t("$ (You)", player.name) : player.name;

      const iAmAdmin = ((findUser(game.myId)?.flags ?? 0) & ADMIN_FLAG) == ADMIN_FLAG;
      const targetIsAdmin = (player.flags & ADMIN_FLAG) == ADMIN_FLAG;

      const buttons = panel.querySelector(".buttons");

      buttons.style.display = player.id == game.myId || targetIsAdmin ? "none" : "flex";
      // kick/ban for the room owner only.
      buttons.querySelector(".button-pair").style.display =
        game.myId == game.ownerId || iAmAdmin ? "flex" : "none";
      buttons.querySelector("button.report").style.display = player.reported ? "none" : "";

      setMuteLabel(player.muted);
      panel.querySelector(".report-menu").style.display = "none";
      panel.querySelector(".invite").style.display = player.id == game.myId ? "flex" : "none";

      const box = modalContent.querySelector(".player");
      box.style.display = "";
      box.replaceChildren();

      const avatar = createAvatar(player.avatar);
      setAvatarOwner(avatar, game.ownerId == player.id);
      setAvatarFilters(avatar, userFilters(player));
      box.appendChild(avatar);
      break;
    }

    case ModalType.ROOMS: {
      modalTitle.textContent = t("Rooms");
      
      break;
    }

    case ModalType.INVITE: {
      modalTitle.textContent = t("Invite your friends!");
      break;
    }

    case ModalType.SETTINGS: {
      modalTitle.textContent = t("Settings");
      panel.querySelector("#select-pressure-sensitivity").value = settings.pressureSensitivity;
      break;
    }
  }
}

export function closeModal() {
  modalRoot.style.display = "none";
}

export function initModal() {
  bind([modalClose, infoModal.querySelector("button.ok")], "click", closeModal);
}
