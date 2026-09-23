import * as THREE from 'three';
import SceneManager from './scene/SceneManager.js';
import Excavator from './machine/Excavator.js';
import GamepadController from './input/GamepadController.js';
import HUD from './ui/HUD.js';

const sceneManager = new SceneManager();
const clock = new THREE.Clock();
const gamepad = new GamepadController();
const excavator = new Excavator(sceneManager.scene, sceneManager.terrain);
const hud = new HUD();

window.terrain = sceneManager.terrain;
window.excavator = excavator;
window.gamepad = gamepad;

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
    excavator.startEngine();
    hud.showEngineStarted();
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

  if (inputState.LBJustPressed) cycleCameraMode();

  if (inputState.startJustPressed && seatbeltState === 'pending') {
    runSeatbeltAnimation();
  }

  if (excavator.isEngineOn) {
    excavator.update(deltaTime, inputState);
  }

  sceneManager.updateCamera(excavator);
  sceneManager.terrain.update(deltaTime);

  hud.update(excavator.getTelemetrySnapshot(), cameraMode);

  sceneManager.renderer.render(sceneManager.scene, sceneManager.camera);
}

console.log('CAT Operator Guardian — Game Engine Initialized');
console.log('Three.js version: ' + THREE.REVISION);
console.log('Gamepad support: ' + (!!navigator.getGamepads ? 'YES' : 'NO'));

animate();
