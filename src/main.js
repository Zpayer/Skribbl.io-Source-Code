import { initModal } from "./core/modal.js";
import { initKeyboard } from "./core/keyboard.js";
import { initPalette } from "./draw/palette.js";
import { initInput } from "./draw/input.js";
import { initDrawLoops } from "./draw/commands.js";
import { initRoomSettings } from "./game/room.js";
import { initHome } from "./ui/home.js";
import { initGlobal } from "./ui/global.js";

initModal();
initKeyboard();
initPalette();
initRoomSettings();
initDrawLoops();
initInput();
initHome();
initGlobal();
