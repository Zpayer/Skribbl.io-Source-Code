import { element, bind, clamp } from "../core/dom.js";
import { game, drawing } from "../core/state.js";
import { settings } from "../core/settings.js";
import { registerHotkey } from "../core/hotkeys.js";
import { showTooltip, hideTooltip, refreshTooltip } from "../core/widgets.js";
import {
  GameState,
  Tool,
  Op,
  MIN_BRUSH_SIZE,
  MAX_BRUSH_SIZE,
  BRUSH_SIZES,
} from "../core/constants.js";
import {
  toolbar,
  toolbarTools,
  toolbarActions,
  sizePreview,
  sizeContainer,
  colorsBox,
  colorPreview,
  colorPreviewMobile,
  colorPreviewPrimary,
  colorPreviewSecondary,
  canvas,
} from "../core/elements.js";
import { PALETTE_COLORS, PALETTE_COLOR_NAMES, rgbString } from "./colors.js";
import { clearAndSend, undoTo } from "./commands.js";
import { emitData } from "../net/connection.js";


export const tools = [];
export const actions = [];
export const sizeEntries = [];


let cursorCanvas = null;
let cursorCtx = null;

function ensureCursorCanvas() {
  if (cursorCanvas) return;
  cursorCanvas = element("canvas");
  cursorCanvas.width = MAX_BRUSH_SIZE + 2;
  cursorCanvas.height = MAX_BRUSH_SIZE + 2;
  cursorCtx = cursorCanvas.getContext("2d");
}

function sizePercent(size) {
  return 20 + ((size - MIN_BRUSH_SIZE) / (MAX_BRUSH_SIZE - MIN_BRUSH_SIZE)) * 80;
}


function flashClick(node) {
  node.classList.remove("clicked");
  void node.offsetWidth;
  node.classList.add("clicked");
}

/* tools */


function createTool(id, def) {
  const node = element("div", "tool clickable");
  const icon = element("div", "icon");
  const keyLabel = element("div", "key");

  node.appendChild(icon);
  node.appendChild(keyLabel);

  def.id = id;
  def.element = node;
  node.toolIndex = id;
  icon.style.backgroundImage = "url(/img/" + def.graphic + ")";
  node.dataset.tooltip = def.name;
  node.dataset.tooltipdir = "S";

  bind(node, "pointerenter", (event) => showTooltip(event.target));
  bind(node, "pointerleave", () => hideTooltip());

  let hotkey;

  if (def.isAction) {
    node.addEventListener("click", function () {
      runAction(this.toolIndex);
    });
    toolbarActions.appendChild(node);
    actions[id] = def;
    hotkey = registerHotkey(
      def.name,
      def.keydef,
      "",
      () => runAction(id),
      (binding) => {
        keyLabel.textContent = binding.key;
      }
    );
  } else {
    node.addEventListener("click", function () {
      selectTool(this.toolIndex);
    });
    toolbarTools.appendChild(node);
    tools[id] = def;
    hotkey = registerHotkey(
      def.name,
      def.keydef,
      "",
      () => selectTool(def.id),
      (binding) => {
        keyLabel.textContent = binding.key;
      }
    );
  }


  keyLabel.textContent = hotkey.key;

  if (def.hide) node.style.display = "none";
}

export function selectTool(id, force) {
  flashClick(tools[id].element);

  if (id == drawing.tool && !force) return;

  tools[drawing.tool].element.classList.remove("selected");
  tools[id].element.classList.add("selected");
  drawing.tool = id;
  updateCursor();
}


function runAction(id) {
  flashClick(actions[id].element);
  actions[id].action();
}

/* sizes */

function createSizes() {
  for (let i = 0; i < BRUSH_SIZES.length; i++) {
    const entry = element("div", "size clickable");
    const icon = element("div", "icon");

    icon.style.backgroundSize = sizePercent(BRUSH_SIZES[i]) + "%";

    const size = {
      id: i,
      size: BRUSH_SIZES[i],
      element: entry,
      elementIcon: icon,
    };

    entry.appendChild(icon);
    sizeContainer.appendChild(entry);
    entry.size = size;
    sizeEntries.push(size);
  }
}


export function setBrushSize(size) {
  drawing.brushSize = clamp(size, MIN_BRUSH_SIZE, MAX_BRUSH_SIZE);

  let closest = sizeEntries[sizeEntries.length - 1];
  let best = closest.size;

  for (const entry of sizeEntries) {
    const distance = Math.abs(drawing.brushSize - entry.size);
    if (distance <= best) {
      best = distance;
      closest = entry;
    }
    entry.element.classList.remove("selected");
  }

  closest.element.classList.add("selected");
  sizePreview.querySelector(".icon").style.backgroundSize =
    sizePercent(drawing.brushSize) + "%";

  updateCursor();
}

export function closeSizes() {
  sizeContainer.classList.remove("open");
}

/* colors */

function createColor(index) {
  const node = element("div", "color");
  node.style.backgroundColor = rgbString(PALETTE_COLORS[index]);
  node.colorIndex = index;
  return node;
}

function createColors() {
  const rows = [element("div", "top"), element("div", "bottom")];

  for (let i = 0; i < PALETTE_COLORS.length / 2; i++) {
    rows[0].appendChild(createColor(2 * i));
    rows[1].appendChild(createColor(2 * i + 1));
  }

  for (const row of rows) colorsBox.appendChild(row);
}


export function setPrimaryColor(index) {
  drawing.primaryColor = index;
  colorPreviewPrimary.style.fill = rgbString(PALETTE_COLORS[index]);
  colorPreviewMobile.style.backgroundColor = rgbString(PALETTE_COLORS[index]);
  updateCursor();
}

export function setSecondaryColor(index) {
  drawing.secondaryColor = index;
  colorPreviewSecondary.style.fill = rgbString(PALETTE_COLORS[index]);
  updateCursor();
}

export function swapColors() {
  const primary = drawing.primaryColor;
  setPrimaryColor(drawing.secondaryColor);
  setSecondaryColor(primary);
}

/* cursor */


export function updateCursor() {
  let cursor = tools[drawing.tool].cursor;

  if (game.state.id == GameState.DRAWING && game.drawerId == game.myId) {
    if (drawing.tool == Tool.BRUSH) {
      const size = drawing.brushSize;
      if (size <= 0) return;

      ensureCursorCanvas();
      const width = cursorCanvas.width;
      cursorCtx.clearRect(0, 0, width, width);

      let [r, g, b] = PALETTE_COLORS[drawing.primaryColor];
      if (settings.dark == 1) {
        r = Math.floor(0.75 * r);
        g = Math.floor(0.75 * g);
        b = Math.floor(0.75 * b);
      }

      cursorCtx.fillStyle = "rgba(" + r + "," + g + "," + b + ",0.8)";
      cursorCtx.beginPath();
      cursorCtx.arc(width / 2, width / 2, size / 2 - 1, 0, 2 * Math.PI);
      cursorCtx.fill();

      cursorCtx.strokeStyle = "#FFF";
      cursorCtx.beginPath();
      cursorCtx.arc(width / 2, width / 2, size / 2 - 1, 0, 2 * Math.PI);
      cursorCtx.stroke();

      cursorCtx.strokeStyle = "#000";
      cursorCtx.beginPath();
      cursorCtx.arc(width / 2, width / 2, size / 2, 0, 2 * Math.PI);
      cursorCtx.stroke();

      const half = width / 2;
      cursor = "url(" + cursorCanvas.toDataURL() + ")" + half + " " + half + ", default";
    }
  } else {
    cursor = "default";
  }

  canvas.style.cursor = cursor;
}

/* init */

function bindToolbar() {
  bind(toolbar, "contextmenu", (event) => {
    event.preventDefault();
    return false;
  });

  bind("#game-toolbar .sizes .size", "click", function () {
    flashClick(this.size.element);
    setBrushSize(this.size.size);
    closeSizes();
  });

  bind(canvas, "DOMMouseScroll wheel", (event) => {
    event.preventDefault();
    const delta = Math.sign(-event.deltaY || event.wheelDeltaY);
    setBrushSize(drawing.brushSize + 2 * delta);
  });

  registerHotkey(
    "Swap",
    "S",
    "Swap the primary and secondary color.",
    swapColors
  );

  bind(colorPreview, "click", () => swapColors());
  bind(colorPreviewMobile, "click", () => colorsBox.classList.toggle("open"));
  bind(sizePreview, "click", () => sizeContainer.classList.toggle("open"));
}

function bindColors() {
  const selector = "#game-toolbar .colors * .color";

  const hover = function () {
    colorsBox.dataset.tooltip =
      "Left-/Rightclick to choose a color!\n" + PALETTE_COLOR_NAMES[this.colorIndex];
    refreshTooltip();
  };

  const pick = function (event) {
    let primary = event.button == 0;
    if (event.altKey) primary = !primary;
    (primary ? setPrimaryColor : setSecondaryColor)(this.colorIndex);
  };

  if ("PointerEvent" in window) {
    bind(selector, "pointerenter", hover);
    bind(selector, "pointerdown", pick);
  } else {
    bind(selector, "mouseenter", hover);
    bind(selector, "click", pick);
  }
}


export function initPalette() {
  createTool(Tool.BRUSH, {
    isAction: false,
    name: "Brush",
    keydef: "B",
    graphic: "pen.gif",
    cursor: 0,
  });
  createTool(Tool.FILL, {
    isAction: false,
    name: "Fill",
    keydef: "F",
    graphic: "fill.gif",
    cursor: "url(/img/fill_cur.png) 7 38, default",
  });

  createTool(0, {
    isAction: true,
    name: "Undo",
    keydef: "U",
    graphic: "undo.gif",
    action: function () {
      if (game.drawerId != game.myId) return;
      if (drawing.undoStack.length == 0) return;

      drawing.undoStack.pop();

      if (drawing.undoStack.length > 0) {
        const target = drawing.undoStack[drawing.undoStack.length - 1];
        undoTo(target);
        emitData(Op.UNDO, target);
      } else {
        clearAndSend();
      }
    },
  });

  createTool(1, {
    isAction: true,
    name: "Clear",
    keydef: "C",
    graphic: "clear.gif",
    action: clearAndSend,
  });

  createSizes();
  createColors();

  bindToolbar();
  bindColors();
}
