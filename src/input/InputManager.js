import GamepadController from './GamepadController.js';
import KeyboardController from './KeyboardController.js';

export default class InputManager {
  constructor() {
    this._gamepad = new GamepadController();
    this._keyboard = new KeyboardController();
    this.connected = true;
    this.activeSource = 'keyboard';
    this._lastGamepadActivity = 0;
  }

  update() {
    this._gamepad.update();
    this._keyboard.update();

    if (this._gamepad.connected) {
      const gs = this._gamepad.getInputState();
      if (this._hasActivity(gs)) {
        this._lastGamepadActivity = performance.now();
      }
    }

    const gamepadRecent = this._gamepad.connected &&
      (performance.now() - this._lastGamepadActivity < 2000);

    this.activeSource = gamepadRecent ? 'gamepad' : 'keyboard';
    this.connected = true;
  }

  getInputState() {
    return this.activeSource === 'gamepad'
      ? this._gamepad.getInputState()
      : this._keyboard.getInputState();
  }

  vibrate(strongMagnitude = 1.0, weakMagnitude = 0.5, durationMs = 500) {
    if (this.activeSource === 'gamepad') {
      this._gamepad.vibrate(strongMagnitude, weakMagnitude, durationMs);
    }
  }

  _hasActivity(state) {
    return Math.abs(state.leftX) > 0 || Math.abs(state.leftY) > 0 ||
           Math.abs(state.rightX) > 0 || Math.abs(state.rightY) > 0 ||
           state.LT > 0.1 || state.RT > 0.1 ||
           state.A || state.B || state.X || state.Y ||
           state.LB || state.RB || state.start;
  }
}
