import * as THREE from 'three';
import SceneManager from './scene/SceneManager.js';
import Excavator from './machine/Excavator.js';
import HUD from './ui/HUD.js';

const sceneManager = new SceneManager();
const clock = new THREE.Clock();

const excavator = new Excavator(sceneManager.scene, sceneManager.terrain);
const hud = new HUD();

window.terrain = sceneManager.terrain;
window.excavator = excavator;

const inputState = {
  leftX: 0, leftY: 0, rightX: 0, rightY: 0,
  RT: 0, LT: 0, A: false, B: false, X: false, Y: false,
};

function gameLoop() {
  const deltaTime = clock.getDelta();
  sceneManager.update(deltaTime);
  excavator.update(deltaTime, inputState);
  hud.update(excavator.getTelemetrySnapshot());
  sceneManager.renderer.render(sceneManager.scene, sceneManager.camera);
  requestAnimationFrame(gameLoop);
}

console.log('CAT Operator Guardian — Game Engine Initialized');
console.log('Three.js version: ' + THREE.REVISION);
console.log('Gamepad support: ' + (!!navigator.getGamepads ? 'YES' : 'NO'));

requestAnimationFrame(gameLoop);
