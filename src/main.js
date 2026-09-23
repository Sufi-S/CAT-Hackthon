import * as THREE from 'three';
import SceneManager from './scene/SceneManager.js';

const sceneManager = new SceneManager();
const clock = new THREE.Clock();

window.terrain = sceneManager.terrain;

function gameLoop() {
  const deltaTime = clock.getDelta();
  sceneManager.update(deltaTime);
  sceneManager.renderer.render(sceneManager.scene, sceneManager.camera);
  requestAnimationFrame(gameLoop);
}

console.log('CAT Operator Guardian — Game Engine Initialized');
console.log('Three.js version: ' + THREE.REVISION);
console.log('Gamepad support: ' + (!!navigator.getGamepads ? 'YES' : 'NO'));

requestAnimationFrame(gameLoop);
