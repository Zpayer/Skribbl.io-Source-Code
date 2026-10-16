import { el, bind, clear, element } from "../core/dom.js";
import { t } from "../core/i18n.js";
import { game, ui } from "../core/state.js";
import { GameState, EndReason, Setting, WordMode } from "../core/constants.js";
import {
  overlay,
  overlayContent,
  overlayText,
  overlayWords,
  overlayReveal,
  overlayResult,
  overlayRoom,
} from "../core/elements.js";
import { findUser, userFilters } from "./players.js";
import { createAvatar, setAvatarFilters } from "../core/widgets.js";
import { emitData } from "../net/connection.js";
import { Op } from "../core/constants.js";


function endReasonText(reason) {
  switch (reason) {
    case EndReason.ALL_GUESSED:
      return t("Everyone guessed the word!");
    case EndReason.DRAWER_LEFT:
      return t("The drawer left the game!");
    case EndReason.TIME_UP:
      return t("Time is up!");
    case EndReason.SKIPPED:
      return t("Drawer got skipped!");
    default:
      return "Error!";
  }
}


function chooseWord(choice) {
  if (game.socket && game.socket.connected && game.state.id == GameState.WORD_CHOICE) {
    emitData(Op.CHOOSE_WORD, choice);
  }
}

export function cancelOverlayAnimation() {
  if (ui.overlayFrame != null) {
    cancelAnimationFrame(ui.overlayFrame);
    ui.overlayFrame = undefined;
  }
}

export function animateOverlay(target, duration, done) {
  const fromTop = ui.overlayTop;
  const fromOpacity = ui.overlayOpacity;
  const deltaTop = target.top - fromTop;
  const deltaOpacity = target.opacity - fromOpacity;

  if (Math.abs(deltaTop) < 0.001 && Math.abs(deltaOpacity) < 0.001) {
    if (done) done();
    return;
  }

  let previous = undefined;
  let elapsed = 0;

  const step = (now) => {
    const delta = now - (previous = previous == null ? now : previous);
    previous = now;
    elapsed = Math.min(elapsed + delta, duration);

    const progress = elapsed / duration;
    const eased = progress < 0.5 ? easeOut(2 * progress) : easeIn(2 * progress - 2);

    ui.overlayTop = fromTop + deltaTop * eased;
    ui.overlayOpacity = fromOpacity + progress * progress * (3 - 2 * progress) * deltaOpacity;

    overlayContent.style.top = ui.overlayTop + "%";
    overlay.style.opacity = ui.overlayOpacity;

    if (elapsed == duration) {
      if (done) done();
    } else {
      ui.overlayFrame = requestAnimationFrame(step);
    }
  };

  ui.overlayFrame = requestAnimationFrame(step);
}


function easeOut(x) {
  const t = 1.2 * 1.5;
  return 0.5 * (x * x * ((t + 1) * x - t));
}

function easeIn(x) {
  const t = 1.2 * 1.5;
  return 0.5 * (x * x * ((t + 1) * x + t) + 2);
}


export function showOverlayPanel(panel) {
  panel.classList.add("show");
}


export function renderOverlay(state) {
  for (const child of overlayContent.children) child.classList.remove("show");

  switch (state.id) {
    /* waiting */
    case GameState.ROOM:
      showOverlayPanel(overlayRoom);
      break;

    case GameState.ROUND_START:
      showOverlayPanel(overlayText);
      overlayText.textContent = t("Round $", state.data + 1);
      break;

    case GameState.WAITING:
      showOverlayPanel(overlayText);
      overlayText.textContent = t("Waiting for players...");
      break;

    case GameState.STARTING:
      showOverlayPanel(overlayText);
      overlayText.textContent = t("Game starting in a few seconds...");
      break;

    /* round reveal */
    case GameState.ROUND_END: {
      showOverlayPanel(overlayReveal);
      overlayReveal.querySelector("p span.word").textContent = state.data.word;
      overlayReveal.querySelector(".reason").textContent = endReasonText(state.data.reason);

      const box = overlayReveal.querySelector(".player-container");
      clear(box);

      // scores come as flat triples: [playerId, score, ignored, ...]
      const entries = [];
      const scores = state.data.scores;
      for (let i = 0; i < scores.length; i += 3) {
        const user = findUser(scores[i + 0]);
        if (user) entries.push({ name: user.name, score: scores[i + 1] });
      }
      entries.sort((a, b) => b.score - a.score);

      for (let i = 0; i < Math.min(entries.length, 12); i++) {
        const entry = entries[i];
        const row = el("player");
        row.appendChild(el("name", entry.name));

        const score = el("score", (entry.score > 0 ? "+" : "") + entry.score);
        if (entry.score <= 0) score.classList.add("zero");

        row.appendChild(score);
        box.appendChild(row);
      }
      break;
    }

    /* podium */
    case GameState.GAME_END: {
      showOverlayPanel(overlayResult);

      const columns = [
        overlayResult.querySelector(".podest-1"),
        overlayResult.querySelector(".podest-2"),
        overlayResult.querySelector(".podest-3"),
        overlayResult.querySelector(".ranks"),
      ];
      for (const column of columns) clear(column);

      if (state.data.length > 0) {
        // results by rank: 0-2 are the podium, everything else lists
        const ranks = [[], [], [], []];
        for (let i = 0; i < state.data.length; i++) {
          const result = {
            player: findUser(state.data[i][0]),
            rank: state.data[i][1],
            title: state.data[i][2],
          };
          if (result.player) ranks[Math.min(result.rank, 3)].push(result);
        }

        for (let place = 0; place < 3; place++) {
          const group = ranks[place];
          if (group.length == 0) continue;

          const names = group.map((entry) => entry.player.name).join(", ");
          const score = group[0].player.score;
          const column = columns[place];

          const avatars = el("avatar-container");
          column.appendChild(avatars);

          const border = el("border");
          border.appendChild(el("rank-place", "#" + (place + 1)));
          border.appendChild(el("rank-name", names));
          border.appendChild(el("rank-score", t("$ points", score)));
          column.appendChild(border);

          if (place == 0) avatars.appendChild(el("trophy"));

          for (let i = 0; i < group.length; i++) {
            const entry = group[i];
            const avatar = createAvatar(entry.player.avatar, place == 0);
            setAvatarFilters(avatar, userFilters(entry.player));
            avatar.style.left = 15 * -(group.length - 1) + 30 * i + "%";
            if (place == 0) {
              avatar.classList.add("winner");
              avatar.style.animationDelay = -2.35 * i + "s";
            }
            avatars.appendChild(avatar);
          }
        }

        // ranks 4 and below.
        const listed = Math.min(5, ranks[3].length);
        for (let i = 0; i < listed; i++) {
          const entry = ranks[3][i];
          const row = el("rank");

          const avatar = createAvatar(entry.player.avatar, false);
          setAvatarFilters(avatar, userFilters(entry.player));

          row.appendChild(avatar);
          row.appendChild(el("rank-place", "#" + (entry.rank + 1)));
          row.appendChild(el("rank-name", entry.player.name));
          row.appendChild(el("rank-score", t("$ points", entry.player.score)));
          columns[3].appendChild(row);
        }

        if (ranks[0].length > 0) {
          const winnerNames = ranks[0].map((entry) => entry.player.name).join(", ");
          overlayResult.querySelector(".winner-name").textContent = winnerNames + " ";
          overlayResult.querySelector(".winner-text").textContent =
            ranks[0].length == 1 ? t("is the winner!") : t("are the winners!");
        } else {
          overlayResult.querySelector(".winner-name").textContent = "";
          overlayResult.querySelector(".winner-text").textContent = t("Nobody won!");
        }
      } else {
        overlayResult.querySelector(".winner-name").textContent = "";
        overlayResult.querySelector(".winner-text").textContent = t("Nobody won!");
      }
      break;
    }

    /* word choice */
    case GameState.WORD_CHOICE: {
      if (state.data.words) {
        showOverlayPanel(overlayText);
        showOverlayPanel(overlayWords);
        clear(overlayWords);

        if (game.settings[Setting.WORDMODE] == WordMode.COMBINATION) {
          // 2 words are picked one after another and combined.
          overlayText.textContent = t("Choose the first word");

          const half = state.data.words.length / 2;
          const first = [];
          const second = [];
          let chosenFirst = 0;

          for (let i = 0; i < half; i++) {
            const firstButton = el("word", state.data.words[i]);
            firstButton.index = i;

            const secondButton = el("word", state.data.words[i + half]);
            secondButton.index = i;
            secondButton.style.display = "none";
            secondButton.style.animationDelay = 0.03 * i + "s";

            first.push(firstButton);
            second.push(secondButton);

            bind(firstButton, "click", function () {
              chosenFirst = this.index;
              for (let j = 0; j < half; j++) {
                first[j].style.display = "none";
                second[j].style.display = "";
              }
              overlayText.textContent = t("Choose the second word");
            });

            bind(secondButton, "click", function () {
              chooseWord([chosenFirst, this.index]);
            });

            overlayWords.appendChild(firstButton);
            overlayWords.appendChild(secondButton);
          }
        } else {
          overlayText.textContent = t("Choose a word");

          for (let i = 0; i < state.data.words.length; i++) {
            const button = el("word", state.data.words[i]);
            button.index = i;
            bind(button, "click", function () {
              chooseWord(this.index);
            });
            overlayWords.appendChild(button);
          }
        }
      } else {
        // somebody else is picking - show their avatar.
        showOverlayPanel(overlayText);

        const user = findUser(state.data.id);
        const name = user ? user.name : t("User");

        overlayText.textContent = "";
        overlayText.appendChild(element("span", undefined, t("$ is choosing a word!", name)));

        const avatar = createAvatar(user ? user.avatar : [0, 0, 0, 0], state.data.id == game.ownerId);
        if (user) setAvatarFilters(avatar, userFilters(user));
        avatar.style.width = "2em";
        avatar.style.height = "2em";
        overlayText.appendChild(avatar);
      }
      break;
    }
  }
}
