import { game, drawing } from "../core/state.js";
import {
  GameState,
  Tool,
  DrawCommand,
  MIN_BRUSH_SIZE,
  MAX_BRUSH_SIZE,
  SNAPSHOT_INTERVAL,
  DRAW_SEND_BATCH,
  Op,
} from "../core/constants.js";
import { canvas, ctx } from "../core/elements.js";
import { clamp } from "../core/dom.js";
import { emitData } from "../net/connection.js";
import { colorRgb, PALETTE_COLORS } from "./colors.js";


function emptyBounds() {
  return [0, 9999, 9999, 0, 0];
}


function accumulateBounds(rect) {
  drawing.snapshotBounds[0] += 1;
  drawing.snapshotBounds[1] = Math.min(drawing.snapshotBounds[1], rect[0]);
  drawing.snapshotBounds[2] = Math.min(drawing.snapshotBounds[2], rect[1]);
  drawing.snapshotBounds[3] = Math.max(drawing.snapshotBounds[3], rect[2]);
  drawing.snapshotBounds[4] = Math.max(drawing.snapshotBounds[4], rect[3]);

  if (drawing.snapshotBounds[0] < SNAPSHOT_INTERVAL) return;

  let [count, minX, minY, maxX, maxY] = drawing.snapshotBounds;

  if (maxX - minX <= 0 || maxY - minY <= 0) {
    minX = rect[0];
    minY = rect[1];
    maxX = rect[2];
    maxY = rect[3];
  }

  drawing.snapshots.push({
    data: ctx.getImageData(minX, minY, maxX - minX, maxY - minY),
    bounds: drawing.snapshotBounds,
  });

  drawing.snapshotBounds = emptyBounds();
}


export function clearCanvas(force) {
  const hasContent =
    force ||
    drawing.commands.length > 0 ||
    drawing.undoStack.length > 0 ||
    drawing.sendIndex > 0 ||
    drawing.renderIndex > 0;

  if (!hasContent) return false;

  drawing.commands = [];
  drawing.undoStack = [];
  drawing.sendIndex = 0;
  drawing.renderIndex = 0;
  drawing.snapshotBounds = emptyBounds();
  drawing.snapshots = [];
  fillWhite();

  return true;
}


export function clearAndSend() {
  if (game.drawerId != game.myId) return;
  if (clearCanvas()) emitData(Op.CLEAR);
}

export function pushCommand(command) {
  let valid;

  if (command[0] != DrawCommand.LINE) {
    valid =
      command[0] == DrawCommand.FILL &&
      command[2] >= 0 &&
      command[2] < canvas.width &&
      command[3] >= 0 &&
      command[3] < canvas.height;
  } else {
    const halfSize = Math.ceil(command[2] / 2);
    const centerX = (command[3] + command[5]) / 2;
    const centerY = (command[4] + command[6]) / 2;
    const halfWidth = Math.abs(command[5] - command[3]) / 2;
    // original measures `|y2 - y2|` here, which is always 0.
    const halfHeight = Math.abs(command[6] - command[6]) / 2;

    const box = {
      x1: -(halfSize + halfWidth),
      y1: -(halfSize + halfWidth),
      x2: canvas.width + halfSize + halfWidth,
      y2: canvas.height + halfSize + halfHeight,
    };

    valid =
      box.x1 < centerX &&
      centerX < box.x2 &&
      box.y1 < centerY &&
      centerY < box.y2;
  }

  if (!valid) {
    console.log("IGNORED COMMAND OUT OF CANVAS BOUNDS");
    return;
  }

  drawing.commands.push(command);

  // drawer renders immediately / spectators are smoothed by a loop
  if (game.myId == game.drawerId) accumulateBounds(executeCommand(command));
}

export function executeCommand(command) {
  let bounds = [0, 0, canvas.width, canvas.height];

  switch (command[0]) {
    case DrawCommand.LINE: {
      const size = clamp(Math.floor(command[2]), MIN_BRUSH_SIZE, MAX_BRUSH_SIZE);
      const half = Math.ceil(size / 2);

      const x1 = clamp(Math.floor(command[3]), -half, canvas.width + half);
      const y1 = clamp(Math.floor(command[4]), -half, canvas.height + half);
      const x2 = clamp(Math.floor(command[5]), -half, canvas.width + half);
      const y2 = clamp(Math.floor(command[6]), -half, canvas.height + half);
      const color = colorRgb(command[1]);

      bounds[0] = clamp(x1 - size, 0, canvas.width);
      bounds[1] = clamp(y1 - size, 0, canvas.height);
      bounds[2] = clamp(x2 + size, 0, canvas.width);
      bounds[3] = clamp(y2 + size, 0, canvas.height);

      drawLine(x1, y1, x2, y2, size, color.r, color.g, color.b);
      break;
    }

    case DrawCommand.FILL: {
      floodFill(
        clamp(Math.floor(command[2]), 0, canvas.width),
        clamp(Math.floor(command[3]), 0, canvas.height),
        colorRgb(command[1])
      );
      break;
    }
  }

  return bounds;
}

/* rasterizer */


function setPixel(image, offset, r, g, b) {
  if (offset < 0 || offset >= image.data.length) return;
  image.data[offset] = r;
  image.data[offset + 1] = g;
  image.data[offset + 2] = b;
  image.data[offset + 3] = 255;
}


function stampDot(image, cx, cy, radius, r, g, b) {
  const half = Math.floor(radius / 2);
  const radiusSq = half * half;

  for (let dy = -half; dy <= half; dy++) {
    for (let dx = -half; dx <= half; dx++) {
      if (dx * dx + dy * dy >= radiusSq) continue;
      const offset = 4 * ((cy + dy) * image.width + cx + dx);
      if (offset < 0 || offset >= image.data.length) continue;

      image.data[offset] = r;
      image.data[offset + 1] = g;
      image.data[offset + 2] = b;
      image.data[offset + 3] = 255;
    }
  }
}


function drawLine(x1, y1, x2, y2, size, r, g, b) {
  const half = Math.floor(size / 2);

  const left = Math.min(x1, x2) - half;
  const top = Math.min(y1, y2) - half;
  const right = Math.max(x1, x2) + half;
  const bottom = Math.max(y1, y2) + half;


  x1 -= left;
  y1 -= top;
  x2 -= left;
  y2 -= top;

  const image = ctx.getImageData(left, top, right - left, bottom - top);

  if (x1 == x2 && y1 == y2) {
    stampDot(image, x1, y1, size, r, g, b);
  } else {
    stampDot(image, x1, y1, size, r, g, b);
    stampDot(image, x2, y2, size, r, g, b);

    const dx = Math.abs(x2 - x1);
    const dy = Math.abs(y2 - y1);
    const stepX = x1 < x2 ? 1 : -1;
    const stepY = y1 < y2 ? 1 : -1;
    let error = dx - dy;


    void Math.floor(Math.max(0, half - 10) / 5);

    while (x1 != x2 || y1 != y2) {
      const twice = error << 1;
      if (-dy < twice) {
        error -= dy;
        x1 += stepX;
      }
      if (twice < dx) {
        error += dx;
        y1 += stepY;
      }
      stampDot(image, x1, y1, size, r, g, b);
    }
  }

  ctx.putImageData(image, left, top);
}


function floodFill(x, y, color) {
  const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const width = canvas.width;
  const height = canvas.height;

  const target = getPixel(image, x, y);


  if (color.r == target[0] && color.g == target[1] && color.b == target[2]) return;

  const matches = (offset) => {
    const r = image.data[offset];
    const g = image.data[offset + 1];
    const b = image.data[offset + 2];

    if (r == color.r && g == color.g && b == color.b) return false;

    return (
      Math.abs(r - target[0]) < 3 &&
      Math.abs(g - target[1]) < 3 &&
      Math.abs(b - target[2]) < 3
    );
  };

  const stack = [[x, y]];

  while (stack.length) {
    const [seedX, seedY] = stack.pop();
    const columnX = seedX;
    let row = seedY;
    let offset = 4 * (row * width + columnX);

    while (row-- >= 0 && matches(offset)) offset -= 4 * width;

    let spanLeft = false;
    let spanRight = false;

    for (offset += 4 * width, row++; row++ < height - 1 && matches(offset); ) {
      setPixel(image, offset, color.r, color.g, color.b);

      if (columnX > 0) {
        if (matches(offset - 4)) {
          if (!spanLeft) {
            stack.push([columnX - 1, row]);
            spanLeft = true;
          }
        } else {
          spanLeft = false;
        }
      }

      if (columnX < width - 1) {
        if (matches(offset + 4)) {
          if (!spanRight) {
            stack.push([columnX + 1, row]);
            spanRight = true;
          }
        } else {
          spanRight = false;
        }
      }

      offset += 4 * width;
    }
  }

  ctx.putImageData(image, 0, 0);
}


function getPixel(image, x, y) {
  const offset = 4 * (y * image.width + x);
  if (offset < 0 || offset >= image.data.length) return [0, 0, 0];
  return [image.data[offset], image.data[offset + 1], image.data[offset + 2]];
}


function fillWhite() {
  ctx.fillStyle = "#FFF";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

/* undo */


export function undoTo(length) {
  drawing.commands = drawing.commands.slice(0, length);

  if (game.myId != game.drawerId && drawing.renderIndex < length) return;

  drawing.snapshotBounds = emptyBounds();
  const keepSnapshots = Math.floor(drawing.commands.length / SNAPSHOT_INTERVAL);
  drawing.snapshots = drawing.snapshots.slice(0, keepSnapshots);

  fillWhite();
  for (const snapshot of drawing.snapshots) {
    ctx.putImageData(snapshot.data, snapshot.bounds[1], snapshot.bounds[2]);
  }
  for (let i = drawing.snapshots.length * SNAPSHOT_INTERVAL; i < drawing.commands.length; i++) {
    accumulateBounds(executeCommand(drawing.commands[i]));
  }

  drawing.sendIndex = Math.min(drawing.commands.length, drawing.sendIndex);
  drawing.renderIndex = Math.min(drawing.commands.length, drawing.renderIndex);
}

/* input glue */

/** (0 = left, 2 = middle, 5 = pen eraser) */
export function isDrawingButton(button) {
  return button == 0 || button == 2 || button == 5;
}


export function updatePointer(clientX, clientY, pressure, isStart) {
  const rect = canvas.getBoundingClientRect();
  const x = Math.floor((clientX - rect.left) / rect.width * canvas.width);
  const y = Math.floor((clientY - rect.top) / rect.height * canvas.height);

  if (isStart) {
    drawing.pressure = pressure;
    drawing.lastPointer[0] = drawing.pointer[0] = x;
    drawing.lastPointer[1] = drawing.pointer[1] = y;
  } else {
    drawing.lastPointer[0] = drawing.pointer[0];
    drawing.lastPointer[1] = drawing.pointer[1];
    drawing.pressure = pressure;
    drawing.pointer[0] = x;
    drawing.pointer[1] = y;
  }
}


function paletteIndexAt(x, y) {
  const image = ctx.getImageData(x, y, 1, 1);
  const r = image.data[0];
  const g = image.data[1];
  const b = image.data[2];

  let index = 0;
  for (; index < PALETTE_COLORS.length; index++) {
    const entry = PALETTE_COLORS[index];
    if (entry[0] - r == 0 && entry[1] - g == 0 && entry[2] - b == 0) return index;
  }
  return index;
}


export function commitStroke(isStart) {
  if (game.state.id != GameState.DRAWING) return;
  if (game.drawerId != game.myId) return;
  if (drawing.activeButton == -1) return;

  const colorIndex =
    drawing.activeButton == 0 ? drawing.primaryColor : drawing.secondaryColor;

  let command = null;

  if (isStart) {
    const underPointer = paletteIndexAt(drawing.pointer[0], drawing.pointer[1]);

    if (drawing.tool == Tool.FILL) {
      if (underPointer == colorIndex) return;
      command = [DrawCommand.FILL, colorIndex, drawing.pointer[0], drawing.pointer[1]];
    }
  }

  if (drawing.tool == Tool.BRUSH) {
    let size = drawing.brushSize;
    if (drawing.pressure >= 0) {
      size = (size - MIN_BRUSH_SIZE) * clamp(drawing.pressure, 0, 1) + MIN_BRUSH_SIZE;
    }

    const half = Math.ceil(size * 0.5);
    const prevX = clamp(Math.floor(drawing.lastPointer[0]), -half, canvas.width + half);
    const prevY = clamp(Math.floor(drawing.lastPointer[1]), -half, canvas.height + half);
    const x = clamp(Math.floor(drawing.pointer[0]), -half, canvas.width + half);
    const y = clamp(Math.floor(drawing.pointer[1]), -half, canvas.height + half);

    command = [DrawCommand.LINE, colorIndex, size, prevX, prevY, x, y];
  }

  if (command != null) pushCommand(command);
}

/* loops */


export function initDrawLoops() {
  setInterval(() => {
    if (!game.socket) return;
    if (game.state.id != GameState.DRAWING || game.drawerId != game.myId) return;

    const remaining = drawing.commands.length - drawing.sendIndex;
    if (remaining <= 0) return;

    const end = drawing.sendIndex + DRAW_SEND_BATCH;
    const batch = drawing.commands.slice(drawing.sendIndex, end);
    emitData(Op.DRAW_COMMANDS, batch);
    drawing.sendIndex = Math.min(end, drawing.commands.length);

    console.log(`Sent ${batch.length} commands. ${remaining} remaining.`);
  }, 50);

  // replay one command per millisecond to keep up smoothly
  setInterval(() => {
    if (!game.socket) return;
    if (game.state.id != GameState.DRAWING || game.drawerId == game.myId) return;
    if (drawing.renderIndex >= drawing.commands.length) return;

    accumulateBounds(executeCommand(drawing.commands[drawing.renderIndex]));
    drawing.renderIndex++;
  }, 1);
}
