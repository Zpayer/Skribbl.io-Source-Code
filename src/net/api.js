import { t } from "../core/i18n.js";
import { openModal } from "../core/modal.js";
import { ModalType } from "../core/constants.js";
import { localStorageAvailable } from "../core/storage.js";

export const playEndpoint = location.origin + "/api/play";


export function apiPost(url, body, onSuccess, showError) {
  const handleStatus = (status, response) => {
    switch (status) {
      case 200:
        onSuccess({ success: true, data: response });
        return;

      case 503:
      case 0:
        if (showError) {
          openModal(
            ModalType.INFO,
            t("Servers are currently undergoing maintenance!") +
              "\n\r" +
              t("Please try again later!") +
              "\n\rStatus: " +
              status
          );
        }
        break;

      default:
        if (showError) {
          openModal(
            ModalType.INFO,
            t("An unknown error occurred ('$')", status) + "\n\r" + t("Please try again later!")
          );
        }
    }

    onSuccess({ success: false, error: status });
  };

  const request = new XMLHttpRequest();
  request.onreadystatechange = function () {
    if (this.readyState == 4) handleStatus(this.status, this.response);
  };
  request.open("POST", url, true);
  request.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
  request.send(body);
}

/* ads */

let prerollCallback = null;
let adPlayer = null;

try {
  aiptag.cmd.player.push(function () {
    console.log("ad player loaded");
    adPlayer = new aipPlayer({
      AD_WIDTH: 960,
      AD_HEIGHT: 540,
      AD_FULLSCREEN: false,
      AD_CENTERPLAYER: true,
      LOADING_TEXT: "loading advertisement",
      PREROLL_ELEM: () => document.getElementById("preroll"),
      AIP_COMPLETE: () => prerollCallback(),
      AIP_REMOVE: () => {},
    });
  });
} catch (e) {
  console.log("ad push failed: ");
  console.log(e);
}


export function showPreroll(callback) {
  let due = false;

  if (localStorageAvailable) {
    const stored = localStorage.getItem("lastAd");
    const now = new Date();
    localStorage.setItem("lastAd", now.toString());
    const previous = stored == null ? now : new Date(Date.parse(stored));
    due = Math.abs(previous - now) / 1000 / 60 >= 1;
  }

  if (!due) {
    callback();
    return;
  }

  try {
    if (aiptag && adPlayer && adPlayer != null && typeof adPlayer !== "undefined") {
      prerollCallback = callback;
      aiptag.cmd.player.push(function () {
        adPlayer.startPreRoll();
      });
    } else {
      callback();
    }
  } catch (e) {
    console.log(e);
    callback();
  }
}
