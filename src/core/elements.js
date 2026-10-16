/**
 * Central registry of every element the game code touches.
 *
 * The original bundle queried the document inline everywhere; collecting the
 * lookups here keeps the feature modules free of selector strings and makes
 * the whole thing easy to refactor.
 *
 * This module is a leaf: it must not import other feature modules.
 */

const q = (selector) => document.querySelector(selector);
const qa = (selector) => document.querySelectorAll(selector);

/*  home screen */

export const homeScreen = q("#home");
export const nameInput = q("#home .container-name-lang input");
export const languageSelect = q("#home .container-name-lang select");
export const playButton = q("#home .panel .button-play");
export const createButton = q("#home .panel .button-create");

export const avatarCustomizer = q("#home .avatar-customizer");
export const avatarCustomizerBox = avatarCustomizer.querySelector(".container");
export const avatarArrowsLeft = avatarCustomizer.querySelectorAll(".arrows.left .arrow");
export const avatarArrowsRight = avatarCustomizer.querySelectorAll(".arrows.right .arrow");
export const avatarRandomize = avatarCustomizer.querySelectorAll(".randomize");
export const logoAvatars = q("#home .logo-big .avatar-container");

/* game screen */

export const gameScreen = q("#game");
export const gameWrapper = q("#game-wrapper");
export const loadingScreen = q("#load");

export const roundText = q("#game-round .text");
export const clockText = q("#game-clock .text");

/** [description, word, hints container] inside #game-word */
export const wordBox = [
  q("#game-word .description"),
  q("#game-word .word"),
  q("#game-word .hints .container"),
];

/* player list */

export const playersPanel = q("#game-players");
export const playersList = q("#game-players .players-list");
export const playersFooter = q("#game-players-footer");

/* chat */

/** [desktop form, mobile form] */
export const chatForms = [q("#game-chat form"), q("#game-chat-input-mobile form")];
/** [desktop input, mobile input] */
export const chatInputs = [q("#game-chat input"), q("#game-chat-input-mobile input")];
export const chatContent = q("#game-chat .chat-content");
export const chatBubbles = q("#game-canvas .bubbles");

/* toolbar */

export const toolbar = q("#game-toolbar");
export const toolbarTools = toolbar.querySelector(".toolbar-group-tools");
export const toolbarActions = toolbar.querySelector(".toolbar-group-actions");
export const sizePreview = toolbar.querySelector(".sizes .size-preview");
export const sizeContainer = toolbar.querySelector(".sizes .container");
export const sizesBox = toolbar.querySelector(".sizes");
export const colorsBox = toolbar.querySelector(".colors");
export const colorPreview = toolbar.querySelector(".color-preview");
export const colorPreviewMobile = toolbar.querySelector(".color-preview-mobile");
export const colorPreviewPrimary = q("#color-preview-primary");
export const colorPreviewSecondary = q("#color-preview-secondary");

/* canvas */

export const canvas = q("#game-canvas canvas");
export const ctx = canvas.getContext("2d", { willReadFrequently: true });

export const overlay = q("#game-canvas .overlay");
export const overlayContent = q("#game-canvas .overlay-content");
export const overlayText = overlayContent.querySelector(".text");
export const overlayWords = overlayContent.querySelector(".words");
export const overlayReveal = overlayContent.querySelector(".reveal");
export const overlayResult = overlayContent.querySelector(".result");
export const overlayRoom = overlayContent.querySelector(".room");

/*  modals */

export const modalRoot = q("#modal");
export const modalTitle = modalRoot.querySelector(".modal-title .text");
export const modalContent = modalRoot.querySelector(".modal-content");
export const modalClose = modalRoot.querySelector(".close");


export const modalPanels = [
  modalRoot.querySelector(".modal-container-player"),
  modalRoot.querySelector(".modal-container-info"),
  modalRoot.querySelector(".modal-container-info"),
  modalRoot.querySelector(".modal-container-room"),
  modalRoot.querySelector(".modal-container-settings"),
];

export const playerModal = modalPanels[0];
export const infoModal = modalPanels[1];
export const roomModal = modalPanels[3];
export const settingsModal = modalPanels[4];

/* settings modal */

export const volumeInput = settingsModal.querySelector("#volume input");
export const volumeIcon = settingsModal.querySelector("#volume .title .icon");
export const volumeValue = settingsModal.querySelector("#volume .volume-value");
export const hotkeyList = settingsModal.querySelector("#hotkey-list");
export const pressureSensitivitySelect = settingsModal.querySelector("#select-pressure-sensitivity");
export const mobileChatLayoutSelect = settingsModal.querySelector("#select-mobile-chat-input");
export const chatBubblesSelect = settingsModal.querySelector("#select-chat-bubbles");
export const settingsResetButton = settingsModal.querySelector("button.reset");

/* mobile keyboard */

export const mobileKeyboardToggle = q("#select-mobile-keyboard-enabled");
export const mobileKeyboardLayoutSelect = q("#select-mobile-keyboard-layout");
export const mobileKeyboardMain = q("#game-keyboard");
export const mobileKeyboardRows = q("#game-keyboard .keys");
export const mobileKeyboardForm = q("#game-chat-input-mobile form");

/* game room */

export const roomPanel = q("#game-canvas .room");
export const startGameButton = q("#button-start-game");
export const inviteButton = q("#button-invite");
export const inviteModalButton = q("#modal-player-button-invite");
export const inviteInput = q("#input-invite");
export const customWordsInput = q("#item-settings-customwords");
export const gameSettingsButton = q("#game-settings");

export const rateLike = q("#game-rate .like");
export const rateDislike = q("#game-rate .dislike");
export const rateBox = q("#game-rate");

/* tutorial */

export const tutorial = q("#tutorial");
export const tutorialPages = tutorial.querySelectorAll(".page");
export const tutorialPagesBox = tutorial.querySelector(".pages");
export const tutorialNavigation = tutorial.querySelector(".navigation");


export const roomSettingControls = roomPanel.querySelectorAll('*[id^="item-"]');


export const translatableElements = qa("[data-translate]");
export const tooltipElements = qa("[data-tooltip]");
