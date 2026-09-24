import * as THREE from 'three';
import SceneManager from './scene/SceneManager.js';
import Excavator from './machine/Excavator.js';
import GamepadController from './input/GamepadController.js';
import HUD from './ui/HUD.js';
import WorkerNPC from './npcs/WorkerNPC.js';
import ProximitySystem from './systems/ProximitySystem.js';
import ScoringSystem from './systems/ScoringSystem.js';
import TelemetryClient from './network/TelemetryClient.js';
import MissionSystem from './systems/MissionSystem.js';

const sceneManager = new SceneManager();
const clock = new THREE.Clock();
const gamepad = new GamepadController();
const excavator = new Excavator(sceneManager.scene, sceneManager.terrain);
const hud = new HUD();
const telemetry = new TelemetryClient();

const PATROL_PATHS = [
  [[-5, 0, 10], [5, 0, 10], [5, 0, 15], [-5, 0, 15]],
  [[-8, 0, 0], [-8, 0, -8], [0, 0, -8]],
  [[10, 0, -5], [10, 0, 5], [15, 0, 5], [15, 0, -5]],
];

const workers = PATROL_PATHS.map((path, i) =>
  new WorkerNPC(sceneManager.scene, sceneManager.terrain, path, `worker_${i + 1}`)
);

const proximity = new ProximitySystem(
  sceneManager.scene, excavator, workers, gamepad, telemetry
);
const scoring = new ScoringSystem(proximity, excavator);
const missionSystem = new MissionSystem(
  sceneManager.terrain, excavator, workers, proximity, scoring, telemetry
);

window.terrain = sceneManager.terrain;
window.excavator = excavator;
window.gamepad = gamepad;
window.workers = workers;
window.proximity = proximity;
window.scoring = scoring;
window.missionSystem = missionSystem;

let cameraMode = 0;

function cycleCameraMode() {
  cameraMode = (cameraMode + 1) % 3;
  sceneManager.setCameraMode(cameraMode);
}

// --- Seatbelt gate ---
let seatbeltState = 'pending';
const seatbeltModal = document.getElementById('seatbelt-modal');
const seatbeltBtn = document.getElementById('seatbelt-start-btn');

function runSeatbeltAnimation() {
  if (seatbeltState !== 'pending') return;
  seatbeltState = 'animating';

  const items = [
    document.getElementById('check-seatbelt'),
    document.getElementById('check-perimeter'),
    document.getElementById('check-walkaround'),
  ];

  items.forEach((item, i) => {
    setTimeout(() => {
      item.textContent = item.textContent.replace('☐', '☑');
      item.classList.add('checked');
    }, (i + 1) * 300);
  });

  setTimeout(() => {
    seatbeltModal.classList.add('hidden');
    missionSystem.showSelectScreen();
    seatbeltState = 'done';
  }, items.length * 300 + 400);
}

seatbeltBtn.addEventListener('click', runSeatbeltAnimation);

// --- Game loop ---
function animate() {
  requestAnimationFrame(animate);
  const deltaTime = clock.getDelta();

  gamepad.update();
  const inputState = gamepad.getInputState();

  if (seatbeltState === 'pending' && inputState.startJustPressed) {
    runSeatbeltAnimation();
  }

  if (missionSystem.state !== 'playing') {
    if (seatbeltState === 'done') {
      missionSystem.handleInput(inputState);
    }
    sceneManager.renderer.render(sceneManager.scene, sceneManager.camera);
    return;
  }

  if (inputState.LBJustPressed) cycleCameraMode();

  if (excavator.isEngineOn) {
    excavator.update(deltaTime, inputState);

    if (inputState.RT > 0.5) {
      const bp = excavator.getBucketWorldPosition();
      const tc = sceneManager.terrain.worldToTile(bp.x, bp.z);
      const offsets = [[0,0],[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[-1,1],[1,-1],[1,1]];
      let dug = false;
      for (const [dr, dc] of offsets) {
        if (dug) break;
        const r = tc.row + dr, c = tc.col + dc;
        const tile = sceneManager.terrain.getTileAtGrid(r, c);
        if (tile && (tile.type === 'DIRT' || tile.type === 'DIG_TARGET')) {
          excavator.digAtTile(r, c);
          dug = true;
        }
      }
    }
    if (inputState.AJustPressed) {
      excavator.dump();
    }
  }

  workers.forEach(w => w.update(deltaTime));
  proximity.update(deltaTime);
  scoring.update(deltaTime);
  missionSystem.update(deltaTime);

  sceneManager.updateCamera(excavator);
  sceneManager.terrain.update(deltaTime);

  hud.update({
    telemetry: excavator.getTelemetrySnapshot(),
    scores: scoring.getSnapshot(),
    mission: missionSystem.getMissionHUDData(),
    risk: proximity.getCurrentRisk(),
    cameraMode,
  });

  sceneManager.renderer.render(sceneManager.scene, sceneManager.camera);
}

console.log('CAT Operator Guardian — Game Engine Initialized');
console.log('Three.js version: ' + THREE.REVISION);
console.log('Gamepad support: ' + (!!navigator.getGamepads ? 'YES' : 'NO'));
console.log('Workers spawned: ' + workers.length);
console.log('Session ID: ' + window.SESSION_ID);

animate();
