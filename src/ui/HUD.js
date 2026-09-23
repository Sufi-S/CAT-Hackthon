const CAMERA_LABELS = ['OVERVIEW', 'FOLLOW', 'CAB'];

export default class HUD {
  constructor() {
    this._el = document.getElementById('hud-stats');
    this._el.innerHTML =
      '<div>Fuel: <span class="hud-fuel-track"><span class="hud-fuel-fill"></span></span> <span class="hud-fuel-pct">85%</span></div>' +
      '<div>Speed: <span class="hud-speed">0.0</span> u/s</div>' +
      '<div>Idle: <span class="hud-idle">0</span>s</div>' +
      '<div>Payload: <span class="hud-payload">0/5</span></div>' +
      '<div>Engine: <span class="hud-engine">OFF</span></div>';

    this._fuelFill = this._el.querySelector('.hud-fuel-fill');
    this._fuelPct = this._el.querySelector('.hud-fuel-pct');
    this._speed = this._el.querySelector('.hud-speed');
    this._idle = this._el.querySelector('.hud-idle');
    this._payload = this._el.querySelector('.hud-payload');
    this._engine = this._el.querySelector('.hud-engine');
    this._cameraLabel = document.getElementById('hud-camera-mode');
    this._alertEl = document.getElementById('hud-alert');
  }

  update(snapshot, cameraMode) {
    const fuel = snapshot.fuelLevel;
    const pct = Math.round(fuel);
    this._fuelPct.textContent = pct + '%';
    this._fuelFill.style.width = pct + '%';
    this._fuelFill.style.backgroundColor =
      fuel > 50 ? '#4CAF50' : fuel > 25 ? '#FFC107' : '#f44336';

    this._speed.textContent = Math.abs(snapshot.speed).toFixed(1);
    this._idle.textContent = Math.round(snapshot.idleTime);
    this._payload.textContent = snapshot.payloadCount + '/5';
    this._engine.textContent = snapshot.isEngineOn ? 'ON' : 'OFF';
    this._engine.style.color = snapshot.isEngineOn ? '#4CAF50' : '#f44336';

    if (cameraMode !== undefined) {
      this._cameraLabel.textContent = CAMERA_LABELS[cameraMode] ?? CAMERA_LABELS[0];
    }
  }

  showEngineStarted() {
    this._alertEl.textContent = 'ENGINE STARTED';
    this._alertEl.style.display = 'block';
    this._alertEl.style.borderColor = '#4CAF50';
    this._alertEl.style.color = '#4CAF50';
    setTimeout(() => {
      this._alertEl.style.display = 'none';
    }, 2000);
  }
}
