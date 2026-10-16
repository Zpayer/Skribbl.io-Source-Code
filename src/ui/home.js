import { bind } from "../core/dom.js";
import { settings, loadSettings, saveSettings } from "../core/settings.js";
import { localStorageAvailable } from "../core/storage.js";
import { AVATAR_PARTS, AVATAR_ACCESSORIES, LOGO_AVATAR_COUNT } from "../core/constants.js";
import {
  translatableElements,
  tooltipElements,
  avatarCustomizerBox,
  avatarArrowsLeft,
  avatarArrowsRight,
  avatarRandomize,
  logoAvatars,
  gameScreen,
  tutorialPages,
  tutorialPagesBox,
  tutorialNavigation,
  chatBubblesSelect,
  mobileChatLayoutSelect,
  volumeInput,
} from "../core/elements.js";
import { collectTranslations, applyTranslations } from "../core/i18n.js";
import {
  bindTooltips,
  createPager,
  setDot,
  createAvatar,
  updateAvatar,
} from "../core/widgets.js";
import { sounds } from "../core/audio.js";
import { applyMobileKeyboardSetting } from "../core/keyboard.js";

let customizerAvatar = null;
let tutorialInterval = null;

/* settings -> page */


export function applyMobileChatLayout() {
  gameScreen.classList.toggle("mobile-input-top", settings.mobileChatLayout == "top");
}

function applySettingsToUi() {
  applyMobileKeyboardSetting();

  chatBubblesSelect.value = settings.chatBubbles;
  mobileChatLayoutSelect.value = settings.mobileChatLayout;
  volumeInput.value = settings.volume;
  sounds.setVolume(settings.volume);
  applyMobileChatLayout();

  if (localStorageAvailable) console.log("Settings loaded.");
}

/*  avatar customizer */


function bouncePart(index) {
  const part = customizerAvatar.parts[index];
  part.classList.remove("bounce");
  void part.offsetWidth;
  part.classList.add("bounce");
}


function shiftPart(index, step) {
  if (index === 3) {
    const states = [-1, ...AVATAR_ACCESSORIES];
    const position = Math.max(0, states.indexOf(settings.avatar[3]));
    settings.avatar[3] = states[(position + step + states.length) % states.length];
    return;
  }

  settings.avatar[index] += step;
  if (settings.avatar[index] < 0) settings.avatar[index] = AVATAR_PARTS[index] - 1;
  if (settings.avatar[index] >= AVATAR_PARTS[index]) settings.avatar[index] = 0;
}

function initAvatarCustomizer() {
  customizerAvatar = createAvatar(settings.avatar);
  customizerAvatar.classList.add("fit");
  avatarCustomizerBox.appendChild(customizerAvatar);

  bind(avatarArrowsLeft, "click", function () {
    const index = parseInt(this.dataset.avatarIndex);

    shiftPart(index, -1);

    bouncePart(index);
    updateAvatar(customizerAvatar, settings.avatar);
    saveSettings();
  });

  bind(avatarArrowsRight, "click", function () {
    const index = parseInt(this.dataset.avatarIndex);

    shiftPart(index, 1);

    bouncePart(index);
    updateAvatar(customizerAvatar, settings.avatar);
    saveSettings();
  });

  bind(avatarRandomize, "click", function () {
    settings.avatar[0] = Math.floor(Math.random() * AVATAR_PARTS[0]);
    settings.avatar[1] = Math.floor(Math.random() * AVATAR_PARTS[1]);
    settings.avatar[2] = Math.floor(Math.random() * AVATAR_PARTS[2]);
    settings.avatar[3] = AVATAR_ACCESSORIES[Math.floor(Math.random() * AVATAR_PARTS[3])];
    bouncePart(1);
    bouncePart(2);
    bouncePart(3);
    updateAvatar(customizerAvatar, settings.avatar);
    saveSettings();
  });
}

/* logo avatars */

function isChristmasPeriod() {
  const now = new Date();
  return now.getMonth() == 11 && now.getDate() >= 19 && now.getDate() <= 26;
}

function isHalloweenPeriod() {
  const now = new Date();
  return now.getMonth() == 9 && now.getDate() >= 24 && now.getDate() <= 31;
}

function initLogoAvatars() {
  const ownerIndex = Math.round(LOGO_AVATAR_COUNT * Math.random());

  for (let i = 0; i < LOGO_AVATAR_COUNT; i++) {
    const parts = [0, 0, 0, -1];
    parts[0] = i;
    parts[1] = Math.round(Math.random() * 100) % AVATAR_PARTS[1];
    parts[2] = Math.round(Math.random() * 100) % AVATAR_PARTS[2];


    if (Math.random() * 100 < 1) parts[3] = Math.floor(Math.random() * 20);
    if (isChristmasPeriod() && Math.random() * 100 < 35) {
      parts[3] = 96 + Math.floor(Math.random() * 4);
    }

    const avatar = createAvatar(parts, ownerIndex == i);
    avatar.index = i;
    logoAvatars.appendChild(avatar);

    bind(avatar, "click", function () {
      const next = [this.index, 0, 0, -1];
      next[1] = Math.round(Math.random() * 100) % AVATAR_PARTS[1];
      next[2] = Math.round(Math.random() * 100) % AVATAR_PARTS[2];
      if (Math.random() * 1000 < 10) next[3] = Math.floor(Math.random() * 20);

      updateAvatar(this, next);
      this.classList.remove("clicked");
      void this.offsetWidth;
      this.classList.add("clicked");
    });
  }
}

/* tutorial */

function initTutorial() {
  const pages = tutorialPages;

  const pager = createPager(
    tutorialNavigation,
    pages.length,
    [tutorialPagesBox],
    (unused, index, animate) => {
      if (animate) clearInterval(tutorialInterval);

      for (let i = 0; i < pages.length; i++) pages[i].classList.remove("active");
      pages[index].classList.add("active");
    }
  );

  tutorialInterval = setInterval(() => {
    if (pager.selected < pages.length - 1) setDot(pager, pager.selected + 1, false);
    else setDot(pager, 0, false);
  }, 3500);
}

/* init */

export function initHome() {
  loadSettings();
  applySettingsToUi();

  collectTranslations(translatableElements);
  applyTranslations();
  bindTooltips(tooltipElements);

  initAvatarCustomizer();
  initLogoAvatars();
  initTutorial();

  if (isHalloweenPeriod()) document.documentElement.dataset.halloween = "";
}
