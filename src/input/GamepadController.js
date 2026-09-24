function applyDeadzone(value, threshold = 0.12) {
  return Math.abs(value) < threshold ? 0 : value;
}

const ZERO_INPUT = {
  leftX: 0, leftY: 0, rightX: 0, rightY: 0,
  LT: 0, RT: 0,
  A: false, B: false, X: false, Y: false,
  LB: false, RB: false, start: false,
  LBJustPressed: false, startJustPressed: false, AJustPressed: false,
  BJustPressed: false, DPadUpJustPressed: false, DPadDownJustPressed: false,
};

export default class GamepadController {
  constructor() {
    this.gamepad = null;
    this.connected = false;
    this.vibrationSupported = false;
    this.buttonStates = {};
    this.prevButtonStates = {};

    window.addEventListener('gamepadconnected', (e) => {
      console.log('Gamepad connected:', e.gamepad.id);
      this.connected = true;
      this.vibrationSupported = !!e.gamepad.vibrationActuator;
    });

    window.addEventListener('gamepaddisconnected', () => {
      console.log('Gamepad disconnected');
      this.gamepad = null;
      this.connected = false;
      this.vibrationSupported = false;
      this.buttonStates = {};
      this.prevButtonStates = {};
    });
  }

  update() {
    const gamepads = navigator.getGamepads();
    this.gamepad = gamepads[0] ?? null;
    this.connected = !!this.gamepad;

    this.prevButtonStates = { ...this.buttonStates };

    if (this.gamepad) {
      for (let i = 0; i < this.gamepad.buttons.length; i++) {
        this.buttonStates[i] = this.gamepad.buttons[i].pressed;
      }
    }

  }

  getInputState() {
    if (!this.gamepad) return ZERO_INPUT;

    const axes = this.gamepad.axes;
    const btn = this.gamepad.buttons;

    return {
      leftX: applyDeadzone(axes[0]),
      leftY: applyDeadzone(axes[1]),
      rightX: applyDeadzone(axes[2]),
      rightY: applyDeadzone(axes[3]),
      LT: btn[6].value,
      RT: btn[7].value,
      A: btn[0].pressed,
      B: btn[1].pressed,
      X: btn[2].pressed,
      Y: btn[3].pressed,
      LB: btn[4].pressed,
      RB: btn[5].pressed,
      start: btn[9].pressed,
      LBJustPressed: this._justPressed(4),
      startJustPressed: this._justPressed(9),
      AJustPressed: this._justPressed(0),
      BJustPressed: this._justPressed(1),
      DPadUpJustPressed: this._justPressed(12),
      DPadDownJustPressed: this._justPressed(13),
    };
  }

  _justPressed(buttonIndex) {
    return (
      this.buttonStates[buttonIndex] === true &&
      this.prevButtonStates[buttonIndex] !== true
    );
  }

  vibrate(strongMagnitude = 1.0, weakMagnitude = 0.5, durationMs = 500) {
    if (!this.gamepad || !this.gamepad.vibrationActuator) {
      console.log('Vibration not supported on this controller');
      return;
    }
    try {
      this.gamepad.vibrationActuator.playEffect('dual-rumble', {
        startDelay: 0,
        duration: durationMs,
        weakMagnitude,
        strongMagnitude,
      });
    } catch (e) {
      console.log('Vibration failed:', e.message);
    }
  }

}
