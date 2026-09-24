const FOCUS_LABELS = {
  idle_management: 'Idle Management',
  safety: 'Safety',
  task_completion: 'All Skills',
};

const COACH = {
  safety: {
    low: 'Focus on maintaining safe distance from workers. When the warning ring turns orange, slow down immediately and steer clear.',
    mid: 'Good safety awareness overall. Keep watching worker positions and maintain a consistent stopping distance.',
    high: 'Excellent safety record! Your response time to proximity alerts was outstanding.',
  },
  fuel: {
    low: 'Your fuel efficiency needs work. Avoid leaving the engine idling while stationary.',
    mid: 'Decent fuel management. Try planning routes to minimize backtracking between sites.',
    high: 'Outstanding fuel discipline — efficient routing and minimal waste throughout the shift.',
  },
  idle: {
    low: 'Your idle time was above target. Try keeping the machine moving between tasks and plan your next move during transit.',
    mid: 'Reasonable activity level. Plan your next move while completing the current task to reduce downtime.',
    high: 'Excellent work ethic — you kept the machine productive throughout the entire shift.',
  },
  task: {
    low: 'Task completion was below expectations. Focus on efficient dig-dump cycles and minimize wasted trips.',
    mid: 'Good progress on tasks. Optimize your path between dig sites and the dump zone for faster cycles.',
    high: 'All tasks completed efficiently. You demonstrated strong operational planning and execution.',
  },
};

const COMPLETION_TYPES = new Set(['payload_above', 'dumps_above']);

export default class MissionSystem {
  static MISSIONS = {
    fuel_saver: {
      id: 'fuel_saver_challenge',
      title: 'FUEL SAVER CHALLENGE',
      subtitle: 'Minimize idle time and fuel waste',
      focus: 'idle_management',
      difficulty: 2,
      timeLimit: 300,
      scoringWeights: { safety: 0.3, fuel: 0.4, idle: 0.3, task: 0 },
      objectives: [
        { id: 'no_idle', text: 'Keep idle below 10%', type: 'idle_below', threshold: 10 },
        { id: 'no_hazard', text: 'Zero proximity incidents', type: 'incidents_below', threshold: 1 },
        { id: 'time_limit', text: 'Complete within 5 minutes', type: 'time_below', threshold: 300 },
      ],
      scenario: { weather: 'rain', workerCount: 3, startFuel: 58 },
    },
    safety_hunter: {
      id: 'safety_hunter',
      title: 'HAZARD HUNTER',
      subtitle: 'Operate safely near workers',
      focus: 'safety',
      difficulty: 3,
      timeLimit: 240,
      scoringWeights: { safety: 0.6, fuel: 0.1, idle: 0.1, task: 0.2 },
      objectives: [
        { id: 'dig_3', text: 'Complete 3 dig cycles', type: 'payload_above', threshold: 3 },
        { id: 'no_danger', text: 'No HIGH risk events', type: 'incidents_below', threshold: 1 },
        { id: 'response', text: 'React to workers within 2s', type: 'response_time', threshold: 2 },
      ],
      scenario: { weather: 'clear', workerCount: 3, startFuel: 85 },
    },
    full_shift: {
      id: 'full_shift_simulation',
      title: 'FULL SHIFT SIM',
      subtitle: 'Complete all 5 dig cycles efficiently',
      focus: 'task_completion',
      difficulty: 4,
      timeLimit: 480,
      scoringWeights: { safety: 0.25, fuel: 0.25, idle: 0.25, task: 0.25 },
      objectives: [
        { id: 'dig_5', text: 'Complete 5 dig cycles', type: 'payload_above', threshold: 5 },
        { id: 'dump', text: 'Dump all material at blue pad', type: 'dumps_above', threshold: 1 },
        { id: 'fuel_left', text: 'Keep fuel above 40%', type: 'fuel_above', threshold: 40 },
      ],
      scenario: { weather: 'clear', workerCount: 2, startFuel: 85 },
    },
  };

  constructor(terrain, excavator, workers, proximity, scoring, telemetry) {
    this.terrain = terrain;
    this.excavator = excavator;
    this.workers = workers;
    this.proximity = proximity;
    this.scoring = scoring;
    this.telemetry = telemetry;

    this.currentMission = null;
    this.state = 'menu';
    this.elapsedTime = 0;
    this.objectiveStatus = {};
    this.selectedIndex = 0;

    this._missionKeys = Object.keys(MissionSystem.MISSIONS);
    this._selectEl = document.getElementById('mission-select');
    this._debriefEl = document.getElementById('mission-debrief');
    this._alertEl = document.getElementById('hud-alert');

    this._engineAlertTimeout = null;
    this._buildSelectScreen();
  }

  _buildSelectScreen() {
    const cards = this._missionKeys.map((key, i) => {
      const m = MissionSystem.MISSIONS[key];
      const stars = '★'.repeat(m.difficulty) + '☆'.repeat(5 - m.difficulty);
      const mins = Math.floor(m.timeLimit / 60);
      const secs = m.timeLimit % 60;
      const time = mins + ':' + String(secs).padStart(2, '0');
      const focus = FOCUS_LABELS[m.focus] || m.focus;
      return `<div class="mission-card" data-index="${i}">
        <div class="mc-row">
          <span class="mc-num">[${i + 1}]</span>
          <span class="mc-title">${m.title}</span>
          <span class="mc-stars">${stars}</span>
          <span class="mc-time">${time}</span>
        </div>
        <div class="mc-detail">Focus: ${focus}</div>
        <div class="mc-sub">${m.subtitle}</div>
      </div>`;
    }).join('');

    this._selectEl.innerHTML = `<div class="select-box">
      <h1>CAT OPERATOR GUARDIAN</h1>
      <p class="select-sub">TRAINING SIMULATOR</p>
      <p class="select-op">Operator: Alex &nbsp;|&nbsp; Skill Level: Intermediate</p>
      <h2>SELECT YOUR MISSION:</h2>
      <div class="select-cards">${cards}</div>
      <p class="select-hint">Use D-pad to select, A to confirm (or click a mission)</p>
    </div>`;

    this._cards = this._selectEl.querySelectorAll('.mission-card');
    this._cards.forEach((card, i) => {
      card.addEventListener('click', () => {
        this.selectedIndex = i;
        this._confirmSelection();
      });
    });
    this._highlightCard();
  }

  _highlightCard() {
    this._cards.forEach((card, i) => {
      card.classList.toggle('selected', i === this.selectedIndex);
    });
  }

  showSelectScreen() {
    this.state = 'menu';
    this.selectedIndex = 0;
    this._selectEl.classList.remove('hidden');
    this._debriefEl.classList.add('hidden');
    this._highlightCard();
  }

  handleInput(input) {
    if (this.state === 'menu') {
      if (input.DPadUpJustPressed) {
        this.selectedIndex = Math.max(0, this.selectedIndex - 1);
        this._highlightCard();
      }
      if (input.DPadDownJustPressed) {
        this.selectedIndex = Math.min(this._missionKeys.length - 1, this.selectedIndex + 1);
        this._highlightCard();
      }
      if (input.AJustPressed) this._confirmSelection();
    } else if (this.state === 'complete') {
      if (input.AJustPressed) this._playAgain();
      if (input.BJustPressed) this._changeMission();
      if (input.startJustPressed) this._changeMission();
    }
  }

  _confirmSelection() {
    const key = this._missionKeys[this.selectedIndex];
    this.loadMission(key);
    this.startMission();
  }

  loadMission(key) {
    this.currentMission = MissionSystem.MISSIONS[key];
    this.elapsedTime = 0;
    this.objectiveStatus = {};
    for (const obj of this.currentMission.objectives) {
      this.objectiveStatus[obj.id] = false;
    }
  }

  startMission() {
    this.terrain.rebuild();
    this.excavator.reset(this.currentMission.scenario.startFuel);
    this.scoring.reset(this.currentMission.scoringWeights);
    this.proximity.reset();
    this.workers.forEach(w => w.reset());

    this.elapsedTime = 0;
    this.state = 'playing';
    this._selectEl.classList.add('hidden');
    this._debriefEl.classList.add('hidden');

    this.excavator.startEngine();

    if (this._engineAlertTimeout) clearTimeout(this._engineAlertTimeout);
    this._alertEl.textContent = 'ENGINE STARTED';
    this._alertEl.style.display = 'block';
    this._alertEl.style.background = 'rgba(0, 0, 0, 0.85)';
    this._alertEl.style.borderColor = '#4CAF50';
    this._alertEl.style.color = '#4CAF50';
    this._alertEl.classList.remove('pulse');
    this._engineAlertTimeout = setTimeout(() => {
      this._engineAlertTimeout = null;
      if (this.proximity.getCurrentRisk() === 'SAFE') {
        this._alertEl.style.display = 'none';
      }
    }, 2000);
  }

  update(deltaTime) {
    if (this.state !== 'playing') return;

    this.elapsedTime += deltaTime;
    this._checkObjectives();

    if (this.elapsedTime >= this.currentMission.timeLimit) {
      this.completeMission(false);
      return;
    }

    const completionObjs = this.currentMission.objectives.filter(o => COMPLETION_TYPES.has(o.type));
    if (completionObjs.length > 0 && completionObjs.every(o => this.objectiveStatus[o.id])) {
      this.completeMission(true);
    }
  }

  _checkObjectives() {
    for (const obj of this.currentMission.objectives) {
      switch (obj.type) {
        case 'idle_below':
          if (this.scoring._totalTime > 5) {
            const pct = (this.scoring._totalIdleTime / this.scoring._totalTime) * 100;
            this.objectiveStatus[obj.id] = pct < obj.threshold;
          } else {
            this.objectiveStatus[obj.id] = true;
          }
          break;
        case 'incidents_below':
          this.objectiveStatus[obj.id] = this.proximity.getIncidentCount() < obj.threshold;
          break;
        case 'time_below':
          this.objectiveStatus[obj.id] = this.elapsedTime < obj.threshold;
          break;
        case 'payload_above':
          this.objectiveStatus[obj.id] = this.excavator.totalDigCount >= obj.threshold;
          break;
        case 'dumps_above':
          this.objectiveStatus[obj.id] = this.excavator.dumpCount >= obj.threshold;
          break;
        case 'fuel_above':
          this.objectiveStatus[obj.id] = this.excavator.fuelLevel >= obj.threshold;
          break;
        case 'response_time':
          this.objectiveStatus[obj.id] = this.proximity.getIncidentCount() === 0;
          break;
      }
    }
  }

  completeMission(success) {
    this.state = 'complete';
    this._showDebrief(success);

    this.telemetry.postTrainingScore({
      operator_id: 'alex',
      mission_id: this.currentMission.id,
      safety: Math.round(this.scoring.safetyScore),
      fuel: Math.round(this.scoring.fuelScore),
      idle: Math.round(this.scoring.idleScore),
      task: Math.round(this.scoring.taskScore),
      total: Math.round(this.getMissionScore()),
      duration_sec: Math.round(this.elapsedTime),
      incidents: this.proximity.getIncidentCount(),
      timestamp: new Date().toISOString(),
      session_id: window.SESSION_ID,
    });
  }

  getMissionScore() {
    const s = this.scoring.getSnapshot();
    const w = this.currentMission.scoringWeights;
    return s.safety * w.safety + s.fuel * w.fuel + s.idle * w.idle + s.task * w.task;
  }

  getMissionHUDData() {
    if (!this.currentMission || this.state !== 'playing') return null;
    const remaining = Math.max(0, this.currentMission.timeLimit - this.elapsedTime);
    return {
      title: this.currentMission.title,
      timeRemaining: remaining,
      timeLimit: this.currentMission.timeLimit,
      objectives: this.currentMission.objectives.map(obj => ({
        text: obj.text,
        complete: this.objectiveStatus[obj.id] || false,
        progress: this._getProgress(obj),
      })),
    };
  }

  _getProgress(obj) {
    switch (obj.type) {
      case 'idle_below': {
        if (this.scoring._totalTime <= 0) return '0%';
        return Math.round((this.scoring._totalIdleTime / this.scoring._totalTime) * 100) + '%';
      }
      case 'incidents_below':
        return this.proximity.getIncidentCount() + ' incidents';
      case 'time_below':
        return this._fmt(this.elapsedTime);
      case 'payload_above':
        return this.excavator.totalDigCount + '/' + obj.threshold;
      case 'dumps_above':
        return this.excavator.dumpCount + '/' + obj.threshold;
      case 'fuel_above':
        return Math.round(this.excavator.fuelLevel) + '%';
      case 'response_time':
        return this.proximity.getIncidentCount() === 0 ? 'OK' : 'FAILED';
      default:
        return '';
    }
  }

  _showDebrief(success) {
    const s = this.scoring.getSnapshot();
    const total = Math.round(this.getMissionScore());
    const incidents = this.proximity.getIncidentCount();
    const idlePct = this.scoring._totalTime > 0
      ? Math.round((this.scoring._totalIdleTime / this.scoring._totalTime) * 100) : 0;
    const fuelUsed = (this.currentMission.scenario.startFuel - this.excavator.fuelLevel).toFixed(1);
    const focusDim = this._focusDim();
    const coach = this._coachText(s);
    const cls = success ? 'db-success' : 'db-fail';
    const icon = success ? '✓' : '✗';
    const label = success ? 'MISSION COMPLETE' : 'MISSION FAILED';

    const idleObj = this.currentMission.objectives.find(o => o.type === 'idle_below');
    const idleNote = idleObj && idlePct >= idleObj.threshold
      ? ` (target: < ${idleObj.threshold}%) ⚠️` : '';

    this._debriefEl.innerHTML = `<div class="debrief-box">
      <h1 class="${cls}">${label} ${icon}</h1>
      <h2>${this.currentMission.title}</h2>
      <h3>OPERATOR DEBRIEF</h3>
      ${this._bar('Safety Score', s.safety, focusDim === 'safety')}
      ${this._bar('Fuel Efficiency', s.fuel, focusDim === 'fuel')}
      ${this._bar('Idle Management', s.idle, focusDim === 'idle')}
      ${this._bar('Task Completion', s.task, focusDim === 'task')}
      <div class="db-divider"></div>
      <div class="db-total">TOTAL SCORE: ${total} / 100</div>
      <div class="db-divider"></div>
      <div class="db-stats">
        <div>Time: ${this._fmt(this.elapsedTime)}</div>
        <div>Incidents: ${incidents} proximity breach${incidents !== 1 ? 'es' : ''}</div>
        <div>Idle Time: ${idlePct}%${idleNote}</div>
        <div>Fuel Used: ${fuelUsed} L</div>
      </div>
      <div class="db-coach">
        <h4>AI COACH:</h4>
        <p>"${coach}"</p>
      </div>
      <div class="db-actions">
        <span class="db-btn" id="db-again">[A] Play Again</span>
        <span class="db-btn" id="db-change">[B] Change Mission</span>
        <span class="db-btn" id="db-menu">[Start] Menu</span>
      </div>
    </div>`;

    this._debriefEl.classList.remove('hidden');

    document.getElementById('db-again').addEventListener('click', () => this._playAgain());
    document.getElementById('db-change').addEventListener('click', () => this._changeMission());
    document.getElementById('db-menu').addEventListener('click', () => this._changeMission());
  }

  _bar(label, value, isFocus) {
    const v = Math.max(0, Math.min(100, Math.round(value)));
    const color = value > 80 ? '#4CAF50' : value > 50 ? '#FFC107' : '#f44336';
    const tag = isFocus ? ' <span class="db-focus">← FOCUS AREA</span>' : '';
    return `<div class="db-score-row">
      <span class="db-label">${label}:</span>
      <span class="db-bar-track"><span class="db-bar-fill" style="width:${v}%;background:${color}"></span></span>
      <span class="db-val">${v}</span>${tag}
    </div>`;
  }

  _coachText(scores) {
    const dims = [
      { key: 'safety', val: scores.safety },
      { key: 'fuel', val: scores.fuel },
      { key: 'idle', val: scores.idle },
      { key: 'task', val: scores.task },
    ];
    dims.sort((a, b) => a.val - b.val);
    const weakest = dims[0];
    const range = weakest.val < 70 ? 'low' : weakest.val < 85 ? 'mid' : 'high';
    return COACH[weakest.key][range];
  }

  _focusDim() {
    const f = this.currentMission.focus;
    if (f === 'idle_management') return 'idle';
    if (f === 'safety') return 'safety';
    if (f === 'task_completion') return 'task';
    return null;
  }

  _playAgain() {
    this._debriefEl.classList.add('hidden');
    this.loadMission(this._missionKeys[this.selectedIndex]);
    this.startMission();
  }

  _changeMission() {
    this._debriefEl.classList.add('hidden');
    this.showSelectScreen();
  }

  _fmt(seconds) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return m + ':' + String(s).padStart(2, '0');
  }
}
