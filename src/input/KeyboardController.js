const KEY_MAP = {
  'KeyW': 'up', 'KeyS': 'down', 'KeyA': 'left', 'KeyD': 'right',
  'ArrowUp': 'rUp', 'ArrowDown': 'rDown', 'ArrowLeft': 'rLeft', 'ArrowRight': 'rRight',
  'Space': 'RT', 'ShiftLeft': 'LT', 'ShiftRight': 'LT',
  'KeyE': 'A', 'KeyQ': 'B',
  'Tab': 'LB',
  'Enter': 'start',
  'Digit1': 'dpadUp', 'Digit2': 'dpadDown',
};

const MAPPED_CODES = new Set(Object.keys(KEY_MAP));

export default class KeyboardController {
  constructor() {
    this._held = new Set();
    this._currentState = {};
    this._prevState = {};

    window.addEventListener('keydown', (e) => {
      if (MAPPED_CODES.has(e.code)) {
        e.preventDefault();
        this._held.add(e.code);
      }
    });

    window.addEventListener('keyup', (e) => {
      if (MAPPED_CODES.has(e.code)) {
        e.preventDefault();
        this._held.delete(e.code);
      }
    });
  }

  update() {
    this._prevState = this._currentState;
    this._currentState = {};
    for (const code of this._held) {
      const key = KEY_MAP[code];
      if (key) this._currentState[key] = true;
    }
  }

  _isHeld(key) {
    return this._currentState[key] === true;
  }

  _justPressed(key) {
    return this._currentState[key] === true && this._prevState[key] !== true;
  }

  getInputState() {
    return {
      leftX: (this._isHeld('right') ? 1 : 0) - (this._isHeld('left') ? 1 : 0),
      leftY: (this._isHeld('down') ? 1 : 0) - (this._isHeld('up') ? 1 : 0),
      rightX: (this._isHeld('rRight') ? 1 : 0) - (this._isHeld('rLeft') ? 1 : 0),
      rightY: (this._isHeld('rDown') ? 1 : 0) - (this._isHeld('rUp') ? 1 : 0),
      LT: this._isHeld('LT') ? 1.0 : 0,
      RT: this._isHeld('RT') ? 1.0 : 0,
      A: this._isHeld('A'),
      B: this._isHeld('B'),
      X: false,
      Y: false,
      LB: this._isHeld('LB'),
      RB: false,
      start: this._isHeld('start'),
      LBJustPressed: this._justPressed('LB'),
      startJustPressed: this._justPressed('start'),
      AJustPressed: this._justPressed('A'),
      BJustPressed: this._justPressed('B'),
      DPadUpJustPressed: this._justPressed('dpadUp'),
      DPadDownJustPressed: this._justPressed('dpadDown'),
    };
  }
}
