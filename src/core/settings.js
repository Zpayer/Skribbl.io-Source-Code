import { AVATAR_PARTS } from "./constants.js";
import { localStorageAvailable, getStored } from "./storage.js";
import { nameInput, languageSelect, mobileKeyboardToggle, mobileKeyboardLayoutSelect } from "./elements.js";

function randomAvatar() {
  return [
    Math.round(Math.random() * 100) % AVATAR_PARTS[0],
    Math.round(Math.random() * 100) % AVATAR_PARTS[1],
    Math.round(Math.random() * 100) % AVATAR_PARTS[2],
    -1,
  ];
}

export const settings = {
  avatar: randomAvatar(),
  volume: 100,
  dark: 0,
  filterChat: 1,
  pressureSensitivity: 1,
  displayLang: "en",
  chatDeleteQuota: 100,
  mobileChatLayout: "bottom",
  chatBubbles: 0,
};


export function saveSettings() {
  if (!localStorageAvailable) {
    console.log("Settings not saved. LocalStorage unavailable.");
    return;
  }

  localStorage.setItem("name", nameInput.value);
  localStorage.setItem("lang", languageSelect.value);
  localStorage.setItem("displaylang", settings.displayLang);
  localStorage.setItem("volume", settings.volume);
  localStorage.setItem("dark", settings.dark == 1 ? 1 : 0);
  localStorage.setItem("filter", settings.filterChat == 1 ? 1 : 0);
  localStorage.setItem("pressure", settings.pressureSensitivity == 1 ? 1 : 0);
  localStorage.setItem("ava", JSON.stringify(settings.avatar));
  localStorage.setItem("mobileChatLayout", settings.mobileChatLayout);
  localStorage.setItem("keyboard", mobileKeyboardToggle.value);
  localStorage.setItem("keyboardlayout", mobileKeyboardLayoutSelect.value);
  localStorage.setItem("chatBubbles", settings.chatBubbles);

  console.log("Settings saved.");
}


export function loadSettings() {
  if (!localStorageAvailable) {
    console.log("Settings not loaded. LocalStorage unavailable.");
    return;
  }

  nameInput.value = getStored("name", "");
  languageSelect.value = findLanguageOption(getStored("lang", 0));

  settings.displayLang = getStored("displaylang", "en");
  settings.volume = parseInt(getStored("volume", 100), 10);
  settings.filterChat = parseInt(getStored("filter", 1), 1) == 1 ? 1 : 0;
  settings.pressureSensitivity = parseInt(getStored("pressure", 1), 1) == 1 ? 1 : 0;

  const storedAvatar = localStorage.getItem("ava");
  settings.avatar = storedAvatar == null ? settings.avatar : JSON.parse(storedAvatar);

  settings.mobileChatLayout = getStored("mobileChatLayout", "bottom");
  settings.chatBubbles = getStored("chatBubbles", 0);

  mobileKeyboardToggle.value = getStored("keyboard", isSafariDefault() ? 1 : 0);
  mobileKeyboardLayoutSelect.value = getStored("keyboardlayout", "en");
}


function findLanguageOption(value) {
  const options = document.querySelectorAll("#home .panel .container-name-lang select option");
  for (let i = 0; i < options.length; i++) {
    if (options[i].value == value) return options[i].value;
  }
  return 0;
}


function isSafariDefault() {
  return /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
}
