// Stage 0 — main.js — CAT Operator Guardian
import * as THREE from 'three';
import SceneManager from './scene/SceneManager.js';

const sceneManager = new SceneManager();

let lastTime = 0;

function gameLoop(timestamp) {
  const deltaTime = (timestamp - lastTime) / 1000;
  lastTime = timestamp;

  sceneManager.update(deltaTime);
  sceneManager.renderer.render(sceneManager.scene, sceneManager.camera);

  requestAnimationFrame(gameLoop);
}

console.log('CAT Operator Guardian — Game Engine Initialized');
console.log('Three.js version: ' + THREE.REVISION);
console.log('Gamepad support: ' + (!!navigator.getGamepads ? 'YES' : 'NO'));

requestAnimationFrame(gameLoop);
