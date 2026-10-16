import { game, drawing } from "../core/state.js";
import { GameState, ChatColor } from "../core/constants.js";
import { t } from "../core/i18n.js";
import { sounds, Sound } from "../core/audio.js";
import { addMessage, chatColor } from "../core/chat.js";
import { overlay, gameWrapper, wordBox } from "../core/elements.js";
import {
  findUser,
  setGuessed,
  setDrawingIndicator,
  updateRanks,
  updatePager,
  resetScores,
} from "./players.js";
import { setRoundText, renderHints, revealHints, revealWord, showRate } from "./hud.js";
import { setClock, startClock, stopClock } from "./session.js";
import { clearCanvas } from "../draw/commands.js";
import { updateCursor } from "../draw/palette.js";
import { animateOverlay, cancelOverlayAnimation, renderOverlay } from "./overlay.js";


export function applyGameState(state, isInitial) {
  game.state = state;

  cancelOverlayAnimation();

  if (state.id === GameState.DRAWING) {
    animateOverlay({ top: -100, opacity: 0 }, 600, () => {
      overlay.classList.remove("show");
    });
  } else if (overlay.classList.contains("show")) {
    animateOverlay({ top: -100, opacity: 1 }, 600, () => {
      renderOverlay(state);
      animateOverlay({ top: 0, opacity: 1 }, 600);
    });
  } else {
    overlay.classList.add("show");
    renderOverlay(state);
    animateOverlay({ top: 0, opacity: 1 }, 600);
  }

  stopClock();
  setClock(state.time);
  startClock(state.time);

  gameWrapper.classList.add("toolbar-hidden");
  updateCursor();
  showRate(false);

  if (state.id === GameState.ROOM) {
    resetScores();
    gameWrapper.classList.add("room");
  } else {
    gameWrapper.classList.remove("room");
  }

  if (state.id === GameState.ROUND_START) {
    setRoundText(state.data);
    if (state.data == 0) resetScores();
  }

  /* round reveal */
  if (state.id === GameState.ROUND_END) {
    if (game.myId != game.drawerId) revealWord(state.data.word);

    const scores = state.data.scores;
    for (let i = 0; i < scores.length; i += 3) {
      const user = findUser(scores[i + 0]);
      if (user) user.score = scores[i + 1];
    }
    updateRanks();

    let nobodyGuessed = true;
    for (const user of game.users) {
      if (user.guessed) {
        nobodyGuessed = false;
        break;
      }
    }

    sounds.playSound(nobodyGuessed ? Sound.ROUND_END_FAILURE : Sound.ROUND_END_SUCCESS);
    addMessage(t("The word was '$'", state.data.word), "", chatColor(ChatColor.JOIN), true);
  } else if (state.id !== GameState.DRAWING) {
    wordBox[0].textContent = t("WAITING");
    wordBox[0].classList.add("waiting");
    wordBox[1].style.display = "none";
    wordBox[2].style.display = "none";
  }

  /* drawing phase */
  if (state.id === GameState.DRAWING) {
    game.drawerId = state.data.id;
    sounds.playSound(Sound.ROUND_START);
    clearCanvas(true);

    if (state.data.drawCommands) drawing.commands = state.data.drawCommands;

    addMessage(
      t("$ is drawing now!", findUser(game.drawerId).name),
      "",
      chatColor(ChatColor.DRAWING),
      true
    );

    if (!isInitial) {
      for (const user of game.users) setGuessed(user, false);
    }

    wordBox[0].classList.remove("waiting");

    if (game.drawerId == game.myId) {
      wordBox[0].textContent = t("DRAW THIS");
      wordBox[1].style.display = "";
      wordBox[2].style.display = "none";
      wordBox[1].textContent = state.data.word;

      gameWrapper.classList.remove("toolbar-hidden");
      updateCursor();
    } else {
      showRate(true);
      renderHints(state.data.word, false);
      revealHints(state.data.hints);
    }
  } else {
    game.drawerId = -1;
    for (const user of game.users) setGuessed(user, false);
  }

  /* game results */
  if (state.id === GameState.GAME_END && state.data.length > 0) {
    const winners = [];
    let score = 0;

    for (let i = 0; i < state.data.length; i++) {
      const user = findUser(state.data[i][0]);
      if (user && state.data[i][1] == 0) {
        score = user.score;
        winners.push(user.name);
      }
    }

    if (winners.length == 1) {
      addMessage(
        t("$ won with a score of $!", [winners[0], score]),
        "",
        chatColor(ChatColor.OWNER),
        true
      );
    } else if (winners.length > 1) {
      addMessage(
        t("$ and $ won with a score of $!", [
          winners.slice(0, -1).join(", "),
          winners[winners.length - 1],
          score,
        ]),
        "",
        chatColor(ChatColor.OWNER),
        true
      );
    }
  }

  for (const user of game.users) setDrawingIndicator(user, user.id == game.drawerId);
  updatePager();
}
