import { el, clear } from "../core/dom.js";
import { t } from "../core/i18n.js";
import { game } from "../core/state.js";
import { Setting, WordMode, Op, GameState } from "../core/constants.js";
import { wordBox, roundText, rateBox } from "../core/elements.js";
import { emitData, isConnected } from "../net/connection.js";


export function setRoundText(round) {
  game.round = round;
  const current = game.round + 1;
  const total = game.settings[Setting.ROUNDS];
  roundText.textContent = t("Round $ of $", [current, total]);
}

export function renderHints(lengths, noHidden) {
  let slots = lengths.length - 1;
  for (const length of lengths) slots += length;

  const hidden = !noHidden && game.settings[Setting.WORDMODE] == WordMode.HIDDEN;
  if (hidden) slots = 3;

  wordBox[0].textContent = t(hidden ? "WORD HIDDEN" : "GUESS THIS");
  wordBox[1].style.display = "none";
  wordBox[2].style.display = "";
  clear(wordBox[2]);
  wordBox[2].hints = [];

  for (let i = 0; i < slots; i++) {
    wordBox[2].hints[i] = el("hint", hidden ? "?" : "_");
    wordBox[2].appendChild(wordBox[2].hints[i]);
  }

  if (!hidden) wordBox[2].appendChild(el("word-length", lengths.join(" ")));
}


export function revealHints(hints) {
  const slots = wordBox[2].hints;
  for (const [index, letter] of hints) {
    slots[index].textContent = letter;
    slots[index].classList.add("uncover");
  }
}


export function revealWord(word) {
  if (!wordBox[2].hints || wordBox[2].hints.length < word.length) {
    renderHints([word.length], true);
  }

  const letters = [];
  for (let i = 0; i < word.length; i++) letters.push([i, word.charAt(i)]);
  revealHints(letters);
}

/* rating */


export function showRate(visible) {
  rateBox.style.display = visible ? "" : "none";
}

export function sendRate(vote) {
  if (!isConnected() || game.state.id != GameState.DRAWING) return;
  emitData(Op.RATE, vote);
  showRate(false);
}
