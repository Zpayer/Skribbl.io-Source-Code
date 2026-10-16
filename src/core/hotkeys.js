import { el, bind } from "./dom.js";
import { localStorageAvailable } from "./storage.js";
import { drawing } from "./state.js";
import { registerTranslation } from "./i18n.js";
import { hotkeyList, chatInputs } from "./elements.js";

/** @type {{name:string, desc:string, key:string, def:string, listing:HTMLElement, cb:Function[], changed:Function[]}[]} */
export const hotkeys = [];


export function findHotkey(name) {
  for (let i = 0; i < hotkeys.length; i++) {
    if (hotkeys[i].name == name) return hotkeys[i];
  }
}

export function registerHotkey(name, key, desc, cb, changed) {
  const defaultKey = key;
  const storedKey = localStorageAvailable ? localStorage.getItem("hotkey_" + name) : null;
  if (storedKey) key = storedKey;

  let hotkey = findHotkey(name);

  if (hotkey) {
    hotkey.key = key;
    hotkey.def = defaultKey;
    hotkey.desc = desc;
  } else {
    hotkey = {
      name,
      desc,
      key,
      def: defaultKey,
      listing: el("item"),
      changed: [],
      cb: [],
    };
    hotkeys.push(hotkey);

    const label = el("key", name);
    registerTranslation(label, "text");
    hotkey.listing.appendChild(label);

    const input = document.createElement("input");
    input.value = hotkey.key;
    hotkey.listing.appendChild(input);

    bind(input, "keydown", (event) => {
      const pressed = event.key;
      for (let i = 0; i < hotkeys.length; i++) {
        // Refuse to bind a key that is already taken.
        if (hotkeys[i].key == pressed) {
          event.preventDefault();
          return;
        }
      }

      input.value = pressed;
      hotkey.key = pressed;
      for (let i = 0; i < hotkey.changed.length; i++) hotkey.changed[i](hotkey);

      saveHotkeys();
      event.preventDefault();
      return false;
    });

    hotkeyList.appendChild(hotkey.listing);
  }

  if (cb) hotkey.cb.push(cb);
  if (changed) hotkey.changed.push(changed);

  return hotkey;
}

export function saveHotkeys() {
  if (!localStorageAvailable) return;
  for (let i = 0; i < hotkeys.length; i++) {
    localStorage.setItem("hotkey_" + hotkeys[i].name, hotkeys[i].key);
  }
}

export function resetHotkeys() {
  for (let i = 0; i < hotkeys.length; i++) {
    const hotkey = hotkeys[i];
    hotkey.key = hotkey.def;
    hotkey.listing.querySelector("input").value = hotkey.key;
    for (let j = 0; j < hotkey.changed.length; j++) hotkey.changed[j](hotkey);
  }
  saveHotkeys();
}


export function handleHotkeyPress(event) {
  if (event.code === "Enter") {
    chatInputs[0].focus();
    return false;
  }

  const active = document.activeElement;
  const tagName = active ? active.tagName.toLowerCase() : "";
  if (tagName === "input" || tagName === "textarea" || drawing.activeButton !== -1) {
    return false;
  }

  const pressed = event.key.toLowerCase().replace("key", "");

  for (let i = 0; i < hotkeys.length; i++) {
    if (hotkeys[i].key.toLowerCase() == pressed) {
      for (let j = 0; j < hotkeys[i].cb.length; j++) hotkeys[i].cb[j](hotkeys[i]);
      event.preventDefault();
      return;
    }
  }
}
