import * as THREE from 'three';
import VoxelTerrain from '../terrain/VoxelTerrain.js';

export default class SceneManager {
  constructor() {
    this.renderer = new THREE.WebGLRenderer({
      canvas: document.getElementById('game-canvas'),
      antialias: true
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87ceeb);

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 35, 35);
    this.camera.lookAt(0, 0, 0);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(50, 100, 50);
    this.scene.add(dirLight);

    this.terrain = new VoxelTerrain(this.scene);
    this.terrain.buildSite();

    this.cameraMode = 0;
    this._camTarget = new THREE.Vector3();
    this._lookTarget = new THREE.Vector3();

    window.addEventListener('resize', () => this._onResize());
  }

  _onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  setCameraMode(mode) {
    this.cameraMode = mode;
  }

  updateCamera(excavator) {
    const pos = excavator.position;

    switch (this.cameraMode) {
      case 0:
        this._camTarget.set(pos.x, 35, pos.z + 25);
        this.camera.position.lerp(this._camTarget, 0.08);
        this.camera.lookAt(pos.x, pos.y, pos.z);
        break;

      case 1: {
        const offX = Math.sin(excavator.heading) * -12;
        const offZ = Math.cos(excavator.heading) * -12;
        this._camTarget.set(pos.x + offX, 8, pos.z + offZ);
        this.camera.position.lerp(this._camTarget, 0.06);
        this._lookTarget.set(pos.x, pos.y + 1, pos.z);
        this.camera.lookAt(this._lookTarget);
        break;
      }

      case 2: {
        this._camTarget.set(0, 1.2, 0.3);
        excavator.group.localToWorld(this._camTarget);
        this.camera.position.copy(this._camTarget);
        this._lookTarget.set(
          this._camTarget.x + Math.sin(excavator.heading) * 5,
          this._camTarget.y + 0.1,
          this._camTarget.z + Math.cos(excavator.heading) * 5
        );
        this.camera.lookAt(this._lookTarget);
        break;
      }
    }
  }

  update(deltaTime) {
    this.terrain.update(deltaTime);
  }
}
