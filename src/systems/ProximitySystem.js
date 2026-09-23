import * as THREE from 'three';

const DANGER_RADIUS = 3.0;
const WARNING_RADIUS = 6.0;

export default class ProximitySystem {
  constructor(scene, excavator, workers, gamepad, telemetryClient) {
    this.scene = scene;
    this.excavator = excavator;
    this.workers = workers;
    this.gamepad = gamepad;
    this.telemetryClient = telemetryClient;

    this.currentRisk = 'SAFE';
    this.closestDist = Infinity;
    this.closestWorkerId = null;
    this.incidentCount = 0;

    this._inHighIncident = false;
    this._vibrateTimer = 0;
    this._alertEl = document.getElementById('hud-alert');

    this._buildRings();
  }

  _buildRings() {
    const dangerGeo = new THREE.RingGeometry(2.8, 3.0, 32);
    const dangerMat = new THREE.MeshBasicMaterial({
      color: 0x00ff00,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.5,
    });
    this._dangerRing = new THREE.Mesh(dangerGeo, dangerMat);
    this._dangerRing.rotation.x = -Math.PI / 2;
    this._dangerRing.position.y = 0.1;
    this.scene.add(this._dangerRing);

    const warnGeo = new THREE.RingGeometry(5.8, 6.0, 32);
    const warnMat = new THREE.MeshBasicMaterial({
      color: 0xff8c00,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.3,
    });
    this._warningRing = new THREE.Mesh(warnGeo, warnMat);
    this._warningRing.rotation.x = -Math.PI / 2;
    this._warningRing.position.y = 0.1;
    this.scene.add(this._warningRing);
  }

  update(deltaTime) {
    if (!this.excavator.isEngineOn) return;

    this.closestDist = Infinity;
    this.closestWorkerId = null;

    for (const worker of this.workers) {
      const dx = this.excavator.position.x - worker.position.x;
      const dz = this.excavator.position.z - worker.position.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist < this.closestDist) {
        this.closestDist = dist;
        this.closestWorkerId = worker.id;
      }
    }

    if (this.closestDist < DANGER_RADIUS) {
      this.currentRisk = 'HIGH';
    } else if (this.closestDist < WARNING_RADIUS) {
      this.currentRisk = 'MEDIUM';
    } else {
      this.currentRisk = 'SAFE';
    }

    this._dangerRing.position.x = this.excavator.position.x;
    this._dangerRing.position.z = this.excavator.position.z;
    this._warningRing.position.x = this.excavator.position.x;
    this._warningRing.position.z = this.excavator.position.z;

    const ringColor = this.currentRisk === 'HIGH' ? 0xff0000 :
                      this.currentRisk === 'MEDIUM' ? 0xff8c00 : 0x00ff00;
    this._dangerRing.material.color.setHex(ringColor);

    this._updateAlertUI();

    if (this.currentRisk === 'HIGH') {
      if (!this._inHighIncident) {
        this._inHighIncident = true;
        this._logIncident();
        this.gamepad.vibrate(1.0, 0.8, 200);
        this._vibrateTimer = 0;
      }
      this._vibrateTimer += deltaTime;
      if (this._vibrateTimer >= 0.8) {
        this.gamepad.vibrate(1.0, 0.8, 200);
        this._vibrateTimer = 0;
      }
    }

    if (this.currentRisk === 'SAFE' && this._inHighIncident) {
      this._inHighIncident = false;
      this.telemetryClient.postSafetyEvent({
        type: 'proximity_resolved',
        worker_id: this.closestWorkerId,
        distance: this.closestDist,
        timestamp: new Date().toISOString(),
        session_id: window.SESSION_ID,
      });
    }
  }

  _updateAlertUI() {
    if (this.currentRisk === 'HIGH') {
      const d = this.closestDist.toFixed(1);
      this._alertEl.innerHTML =
        `\u{1F6A8} PROXIMITY HAZARD — ${this.closestWorkerId} at ${d}m — STOP MOVEMENT`;
      this._alertEl.style.display = 'block';
      this._alertEl.style.background = 'rgba(220, 0, 0, 0.9)';
      this._alertEl.style.borderColor = '#ff0000';
      this._alertEl.style.color = '#ffffff';
      this._alertEl.classList.add('pulse');
    } else if (this.currentRisk === 'MEDIUM') {
      const d = this.closestDist.toFixed(1);
      this._alertEl.innerHTML =
        `⚠️ WORKER NEARBY — ${d}m — Reduce Speed`;
      this._alertEl.style.display = 'block';
      this._alertEl.style.background = 'rgba(220, 130, 0, 0.85)';
      this._alertEl.style.borderColor = '#ff8c00';
      this._alertEl.style.color = '#ffffff';
      this._alertEl.classList.remove('pulse');
    } else {
      this._alertEl.style.display = 'none';
      this._alertEl.classList.remove('pulse');
    }
  }

  _logIncident() {
    this.incidentCount++;
    this.telemetryClient.postSafetyEvent({
      type: 'proximity_hazard',
      worker_id: this.closestWorkerId,
      distance: this.closestDist,
      machine_speed: this.excavator.speed,
      timestamp: new Date().toISOString(),
      session_id: window.SESSION_ID,
    });
  }

  getCurrentRisk() {
    return this.currentRisk;
  }

  getIncidentCount() {
    return this.incidentCount;
  }

  reset() {
    this.currentRisk = 'SAFE';
    this.closestDist = Infinity;
    this.closestWorkerId = null;
    this.incidentCount = 0;
    this._inHighIncident = false;
    this._vibrateTimer = 0;
    this._alertEl.style.display = 'none';
    this._alertEl.classList.remove('pulse');
  }

  dispose() {
    this.scene.remove(this._dangerRing);
    this.scene.remove(this._warningRing);
    this._dangerRing.geometry.dispose();
    this._dangerRing.material.dispose();
    this._warningRing.geometry.dispose();
    this._warningRing.material.dispose();
  }
}
