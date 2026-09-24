const CAMERA_LABELS = ['OVERVIEW', 'FOLLOW', 'CAB'];

export default class HUD {
  constructor() {
    this._el = document.getElementById('hud-stats');
    this._el.innerHTML =
      '<div>Fuel: <span class="hud-fuel-track"><span class="hud-fuel-fill"></span></span> <span class="hud-fuel-pct">85%</span></div>' +
      '<div>Speed: <span class="hud-speed">0.0</span> u/s</div>' +
      '<div>Idle: <span class="hud-idle">0</span>s</div>' +
      '<div>Payload: <span class="hud-payload">0/5</span></div>' +
      '<div>Engine: <span class="hud-engine">OFF</span></div>' +
      '<div class="hud-divider"></div>' +
      '<div>Safety: <span class="score-track"><span class="sc-safety"></span></span> <span class="sv-safety">100</span></div>' +
      '<div>Efficiency: <span class="score-track"><span class="sc-fuel"></span></span> <span class="sv-fuel">100</span></div>' +
      '<div>Activity: <span class="score-track"><span class="sc-idle"></span></span> <span class="sv-idle">100</span></div>' +
      '<div>Task: <span class="score-track"><span class="sc-task"></span></span> <span class="sv-task">0</span></div>' +
      '<div style="margin-top:4px;font-weight:bold">Total: <span class="sv-total">50</span></div>';

    this._fuelFill = this._el.querySelector('.hud-fuel-fill');
    this._fuelPct = this._el.querySelector('.hud-fuel-pct');
    this._speed = this._el.querySelector('.hud-speed');
    this._idle = this._el.querySelector('.hud-idle');
    this._payload = this._el.querySelector('.hud-payload');
    this._engine = this._el.querySelector('.hud-engine');
    this._cameraLabel = document.getElementById('hud-camera-mode');
    this._alertEl = document.getElementById('hud-alert');
    this._missionEl = document.getElementById('hud-mission');
    this._inputIndicator = document.getElementById('hud-controller');

    this._scBars = {
      safety: this._el.querySelector('.sc-safety'),
      fuel: this._el.querySelector('.sc-fuel'),
      idle: this._el.querySelector('.sc-idle'),
      task: this._el.querySelector('.sc-task'),
    };
    this._scVals = {
      safety: this._el.querySelector('.sv-safety'),
      fuel: this._el.querySelector('.sv-fuel'),
      idle: this._el.querySelector('.sv-idle'),
      task: this._el.querySelector('.sv-task'),
      total: this._el.querySelector('.sv-total'),
    };
  }

  update(data) {
    const snapshot = data.telemetry;
    const cameraMode = data.cameraMode;
    const scoring = data.scores;
    const mission = data.mission;

    const fuel = snapshot.fuelLevel;
    const pct = Math.max(0, Math.min(100, Math.round(fuel)));
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

    if (scoring) {
      this._updateScore('safety', scoring.safety);
      this._updateScore('fuel', scoring.fuel);
      this._updateScore('idle', scoring.idle);
      this._updateScore('task', scoring.task);
      const total = Math.max(0, Math.min(100, Math.round(scoring.total)));
      this._scVals.total.textContent = total;
      this._scVals.total.style.color =
        total > 80 ? '#4CAF50' : total > 50 ? '#FFC107' : '#f44336';
    }

    if (mission) {
      this._updateMission(mission);
    } else {
      this._missionEl.innerHTML = '';
    }
  }

  _updateScore(key, value) {
    const bar = this._scBars[key];
    const val = this._scVals[key];
    const rounded = Math.max(0, Math.min(100, Math.round(value)));
    val.textContent = rounded;
    bar.style.width = rounded + '%';
    bar.style.backgroundColor =
      value > 80 ? '#4CAF50' : value > 50 ? '#FFC107' : '#f44336';
  }

  _updateMission(mission) {
    const rem = mission.timeRemaining;
    const pct = rem / mission.timeLimit;
    const m = Math.floor(rem / 60);
    const s = Math.floor(rem % 60);
    const time = m + ':' + String(s).padStart(2, '0');
    const color = pct > 0.5 ? '#4CAF50' : pct > 0.25 ? '#FFC107' : '#f44336';

    let html = `<div class="mission-timer" style="color:${color}">⏱ ${time} remaining</div>`;
    for (const obj of mission.objectives) {
      const icon = obj.complete ? '✓' : '○';
      const cls = obj.complete ? 'obj-done' : '';
      const prog = obj.complete ? '' : ` (${obj.progress})`;
      html += `<div class="mission-obj ${cls}">${icon} ${obj.text}${prog}</div>`;
    }
    this._missionEl.innerHTML = html;
  }

  updateInputSource(source) {
    if (!this._inputIndicator) return;
    if (source === 'gamepad') {
      this._inputIndicator.textContent = '● Input: Xbox Controller';
      this._inputIndicator.style.color = '#4CAF50';
    } else {
      this._inputIndicator.textContent = '● Input: Keyboard';
      this._inputIndicator.style.color = '#4CAF50';
    }
  }
}
