import { bind } from "../core/dom.js";
import { drawing } from "../core/state.js";
import { settings } from "../core/settings.js";
import { DRAW_RATE_LIMIT } from "../core/constants.js";
import { canvas } from "../core/elements.js";
import { isDrawingButton, updatePointer, commitStroke } from "./commands.js";

let lastMoveTime = 0;

function isMoveThrottled() {
  const now = performance.now();
  if (now - lastMoveTime < 1000 / DRAW_RATE_LIMIT) return true;
  lastMoveTime = now;
  return false;
}


function pressureOf(event) {
  const usePressure = settings.pressureSensitivity == 1 && event.pointerType == "pen";
  return usePressure ? event.pressure : -1;
}


function finishStroke() {
  if (drawing.lastUndoLength == drawing.commands.length) return;
  drawing.lastUndoLength = drawing.commands.length;
  drawing.undoStack.push(drawing.lastUndoLength);
}

/* pointer events */

function onPointerDown(event) {
  if (drawing.activePointerId != null) return;
  if (!isDrawingButton(event.button)) return;

  if (window.getSelection) window.getSelection().removeAllRanges();
  else if (document.selection) document.selection.empty();

  drawing.activePointerId = event.pointerId;
  drawing.activeButton = event.button;
  canvas.setPointerCapture(event.pointerId);

  updatePointer(event.clientX, event.clientY, pressureOf(event), true);
  commitStroke(true);
}

function onPointerMove(event) {
  if (drawing.activePointerId !== event.pointerId) return;
  if (isMoveThrottled()) return;

  updatePointer(event.clientX, event.clientY, pressureOf(event), false);
  commitStroke(false);
}

function onPointerEnd(event) {
  if (drawing.activePointerId !== event.pointerId) return;

  finishStroke();
  drawing.activePointerId = null;
  drawing.activeButton = -1;
  canvas.releasePointerCapture(event.pointerId);
}

/* mouse events */

function onMouseDown(event) {
  if (!isDrawingButton(event.button)) return;

  drawing.activeButton = event.button;
  updatePointer(event.clientX, event.clientY, -1, true);
  commitStroke(true);
}

function onMouseMove(event) {
  updatePointer(event.clientX, event.clientY, -1, false);
  commitStroke(false);
}

function onMouseUp() {
  if (drawing.activeButton == -1) return;

  finishStroke();
  drawing.activeButton = -1;
}

/* init */

export function initInput() {
  bind(canvas, "contextmenu", (event) => {
    event.preventDefault();
    return false;
  });

  if ("PointerEvent" in window) {
    bind(canvas, "pointerdown", onPointerDown);
    bind(canvas, "pointermove", onPointerMove);
    bind(canvas, "pointerup pointercancel", onPointerEnd);
  } else {
    bind(canvas, "mousedown", onMouseDown);
    bind(document, "mousemove", onMouseMove);
    bind(document, "mouseup", onMouseUp);
  }
}
