import { el, element, bind } from "./dom.js";
import { saveSettings } from "./settings.js";
import { mobileKeyboardToggle, mobileKeyboardLayoutSelect, mobileKeyboardMain, mobileKeyboardForm, mobileKeyboardRows, chatInputs } from "./elements.js";


export const keyboardLayouts = [
  {
    code: "en",
    name: "English",
    layout: [
      ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
      ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
      ["Z", "X", "C", "V", "B", "N", "M"],
    ],
  },
  {
    code: "fr",
    name: "French",
    layout: [
      ["A", "Z", "E", "R", "T", "Y", "U", "I", "O", "P"],
      ["Q", "S", "D", "F", "G", "H", "J", "K", "L", "M"],
      ["W", "X", "C", "V", "B", "N", "É", "È", "Ç", "À", "'"],
    ],
  },
  {
    code: "de",
    name: "German",
    layout: [
      ["Q", "W", "E", "R", "T", "Z", "U", "I", "O", "P", "Ü"],
      ["A", "S", "D", "F", "G", "H", "J", "K", "L", "Ö", "Ä"],
      ["Y", "X", "C", "V", "B", "N", "M"],
    ],
  },
  {
    code: "tr",
    name: "Turkish",
    layout: [
      ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "Ğ", "Ü"],
      ["A", "S", "D", "F", "G", "H", "J", "K", "L", "Ş", "İ"],
      ["Z", "X", "C", "V", "B", "N", "M", "Ö", "Ç"],
    ],
  },
  {
    code: "ru",
    name: "Russian",
    layout: [
      ["Й", "Ц", "У", "К", "Е", "Н", "Г", "Ш", "Щ", "З", "Х", "Ъ"],
      ["Ф", "Ы", "В", "А", "П", "Р", "О", "Л", "Д", "Ж", "Э"],
      ["Я", "Ч", "С", "М", "И", "Т", "Ь", "Б", "Ю", "Ё"],
    ],
  },
  {
    code: "es",
    name: "Spanish",
    layout: [
      ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
      ["A", "S", "D", "F", "G", "H", "J", "K", "L", "Ñ"],
      ["Z", "X", "C", "V", "B", "N", "M"],
    ],
  },
];


const specialKeys = new Map();

export const mobileKeyboard = {
  elements: {
    main: mobileKeyboardMain,
    rows: mobileKeyboardRows,
    caps: null,
    keys: [],
  },
  lang: 0,
  form: undefined,
  input: undefined,
  caps: false,
  keys: [],
  rows: [],
  columns: 0,
  isOpen: false,

  getKeyLowercase(key) {
    return key.toLocaleLowerCase(this.lang);
  },

  getKeyUppercase(key) {
    return key.toLocaleUpperCase(this.lang);
  },

  init(layout) {
    this.lang = layout.code;
    this.caps = false;
    this.columns = 0;
    this.elements.keys = [];

    this.form = mobileKeyboardForm;
    this.input = this.form.querySelector("input");
    this.elements.rows.replaceChildren();

    const keyboard = this;

    const addKey = (row, key, prepend) => {
      const button = element("button", "key");
      const event = "PointerEvent" in window ? "pointerdown" : "click";

      if (specialKeys.has(key)) {
        const special = specialKeys.get(key);
        button.classList.add(special.class);
        button.appendChild(element("span", "material-icons", special.icon));
        bind(button, event, (e) => {
          special.callback(keyboard);
          e.preventDefault();
        });
      } else {
        button.textContent = keyboard.getKeyLowercase(key);
        bind(button, event, (e) => {
          keyboard.inputAdd(key);
          e.preventDefault();
        });
        keyboard.elements.keys.push(button);
      }

      if (prepend) row.insertBefore(button, row.firstChild);
      else row.appendChild(button);

      return button;
    };

    let currentRow;
    for (const rowKeys of layout.layout) {
      currentRow = this.addRow();
      for (const key of rowKeys) addKey(currentRow, key);
    }

    this.elements.caps = addKey(currentRow, "caps", true);
    addKey(currentRow, "backspace");

    currentRow = this.addRow();
    for (const key of ["-", "space", ".", "enter"]) addKey(currentRow, key);
  },

  addRow() {
    const row = el("row");
    this.elements.rows.appendChild(row);
    this.rows.push(row);
    return row;
  },


  inputChanged() {
    this.input.dispatchEvent(new Event("input", { bubbles: true }));
  },

  inputAdd(key) {
    this.input.value += this.caps ? this.getKeyUppercase(key) : this.getKeyLowercase(key);
    this.inputChanged();
    if (this.caps) this.toggleCaps();
  },

  enter() {
    if (this.input.value.length > 0) {
      this.form.requestSubmit();
      this.input.value = "";
      this.inputChanged();
    }
  },

  toggleCaps() {
    this.caps = !this.caps;

    for (const key of this.elements.keys) {
      key.textContent = this.caps
        ? this.getKeyUppercase(key.textContent)
        : this.getKeyLowercase(key.textContent);
    }

    this.elements.caps.classList.toggle("enabled", this.caps);
  },
};

specialKeys.set("backspace", {
  class: "wide",
  icon: "backspace",
  callback: (keyboard) => {
    if (keyboard.input.value.length > 0) {
      keyboard.input.value = keyboard.input.value.slice(0, -1);
      keyboard.inputChanged();
    }
  },
});

specialKeys.set("caps", {
  class: "wide",
  icon: "keyboard_capslock",
  callback: (keyboard) => keyboard.toggleCaps(),
});

specialKeys.set("enter", {
  class: "wide",
  icon: "keyboard_return",
  callback: (keyboard) => keyboard.enter(),
});

specialKeys.set("space", {
  class: "extra-wide",
  icon: "space_bar",
  callback: (keyboard) => {
    keyboard.input.value += " ";
    keyboard.inputChanged();
  },
});


export function applyMobileKeyboardSetting() {
  if (mobileKeyboardToggle.value == 1) {
    chatInputs[1].setAttribute("readonly", "");
    document.documentElement.dataset.mobileKeyboard = "";
  } else {
    chatInputs[1].removeAttribute("readonly");
    delete document.documentElement.dataset.mobileKeyboard;
  }
}

export function initKeyboard() {
  // Fill the layout <select>.
  for (const layout of keyboardLayouts) {
    const option = element("option");
    option.textContent = layout.name;
    option.value = layout.code;
    mobileKeyboardLayoutSelect.appendChild(option);
  }

  bind(mobileKeyboardLayoutSelect, "change", function () {
    const selected = keyboardLayouts.find((layout) => layout.code == this.value);
    if (selected != null) mobileKeyboard.init(selected);
  });

  bind([mobileKeyboardToggle, mobileKeyboardLayoutSelect], "change", () => {
    saveSettings();
    applyMobileKeyboardSetting();
  });

  bind(
    mobileKeyboardMain,
    "gesturestart gesturechange gestureend drag scroll",
    (event) => {
      event.preventDefault();
      return false;
    }
  );

  mobileKeyboard.init(keyboardLayouts[0]);
}
