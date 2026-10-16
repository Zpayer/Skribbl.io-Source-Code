import { settings } from "./settings.js";
import { volumeIcon, volumeValue } from "./elements.js";


export const Sound = {
  ROUND_START: 0,
  ROUND_END_SUCCESS: 1,
  ROUND_END_FAILURE: 2,
  JOIN: 3,
  LEAVE: 4,
  PLAYER_GUESSED: 5,
  TICK: 6,
};

class SoundFile {
  constructor(manager, url) {
    this.url = url;
    this.buffer = null;
    this.loaded = false;

    const request = new XMLHttpRequest();
    request.open("GET", url, true);
    request.responseType = "arraybuffer";
    request.onload = () => {
      manager.context.decodeAudioData(
        request.response,
        (buffer) => {
          this.buffer = buffer;
          this.loaded = true;
        },
        () => console.log("Failed loading audio from url '" + url + "'")
      );
    };
    request.send();
  }
}

export class SoundManager {
  constructor() {
    this.context = null;
    this.gain = null;
    this.sounds = new Map();
    window.addEventListener("load", this.load.bind(this), false);
  }

  addSound(id, url) {
    this.sounds.set(id, new SoundFile(this, url));
  }

  loadSounds() {
    this.addSound(Sound.ROUND_START, "/audio/roundStart.ogg");
    this.addSound(Sound.ROUND_END_SUCCESS, "/audio/roundEndSuccess.ogg");
    this.addSound(Sound.ROUND_END_FAILURE, "/audio/roundEndFailure.ogg");
    this.addSound(Sound.JOIN, "/audio/join.ogg");
    this.addSound(Sound.LEAVE, "/audio/leave.ogg");
    this.addSound(Sound.PLAYER_GUESSED, "/audio/playerGuessed.ogg");
    this.addSound(Sound.TICK, "/audio/tick.ogg");
  }

  playSound(id) {
    if (this.context == null) {
      this.load();
      return;
    }

    if (this.context.state != "running") {
      this.context.resume().then(() => this.playSound(id));
      return;
    }

    if (this.context == null || settings.volume <= 0 || !this.sounds.has(id)) return;

    const sound = this.sounds.get(id);
    if (!sound.loaded) return;

    const source = this.context.createBufferSource();
    source.buffer = sound.buffer;
    source.connect(this.gain);
    source.start(0);
  }

  setVolume(volume) {
    volumeIcon.classList.toggle("muted", volume <= 0);
    volumeValue.textContent = volume <= 0 ? "Muted" : volume + "%";
    if (this.gain) this.gain.gain.value = volume / 100;
  }

  load() {
    if (this.context != null) return;

    try {
      window.AudioContext = window.AudioContext || window.webkitAudioContext;
      this.context = new AudioContext();
      this.gain = this.context.createGain();
      this.gain.connect(this.context.destination);
      this.setVolume(settings.volume);
      console.log("AudioContext created.");
      this.loadSounds();
    } catch (e) {
      console.log("Error creating AudioContext.", e);
      this.context = null;
    }
  }
}

export const sounds = new SoundManager();
