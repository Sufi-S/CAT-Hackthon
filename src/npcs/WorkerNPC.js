import * as THREE from 'three';

export default class WorkerNPC {
  constructor(scene, terrain, patrolPath, id) {
    this.scene = scene;
    this.terrain = terrain;
    this.patrolPath = patrolPath;
    this.id = id;

    this.group = new THREE.Group();
    this.currentWaypoint = 0;
    this.waitTimer = 0;
    this.state = 'moving';
    this._time = 0;
    this._head = null;

    this._buildModel();

    const wp = patrolPath[0];
    this.group.position.set(wp[0], 0, wp[2]);
    this._faceWaypoint();
    this.scene.add(this.group);
  }

  get position() {
    return this.group.position;
  }

  _buildModel() {
    const bodyGeo = new THREE.CylinderGeometry(0.25, 0.25, 1.2, 8);
    const bodyMat = new THREE.MeshLambertMaterial({ color: 0xFF6600 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.set(0, 1.2, 0);
    this.group.add(body);

    const headGeo = new THREE.SphereGeometry(0.22, 8, 8);
    const headMat = new THREE.MeshLambertMaterial({ color: 0xFFD700 });
    this._head = new THREE.Mesh(headGeo, headMat);
    this._head.position.set(0, 2.05, 0);
    this.group.add(this._head);

    const legGeo = new THREE.BoxGeometry(0.2, 0.6, 0.2);
    const legMat = new THREE.MeshLambertMaterial({ color: 0x333333 });

    const leftLeg = new THREE.Mesh(legGeo, legMat);
    leftLeg.position.set(-0.15, 0.3, 0);
    this.group.add(leftLeg);

    const rightLeg = new THREE.Mesh(legGeo, legMat);
    rightLeg.position.set(0.15, 0.3, 0);
    this.group.add(rightLeg);
  }

  _faceWaypoint() {
    const wp = this.patrolPath[this.currentWaypoint];
    const dx = wp[0] - this.group.position.x;
    const dz = wp[2] - this.group.position.z;
    if (dx !== 0 || dz !== 0) {
      this.group.rotation.y = Math.atan2(dx, dz);
    }
  }

  _advanceWaypoint() {
    const len = this.patrolPath.length;
    for (let i = 0; i < len; i++) {
      this.currentWaypoint = (this.currentWaypoint + 1) % len;
      const wp = this.patrolPath[this.currentWaypoint];
      if (this.terrain.isDriveable(wp[0], wp[2])) return;
    }
  }

  update(deltaTime) {
    this._time += deltaTime;

    this._head.position.y = 2.05 + Math.sin(this._time * Math.PI * 4) * 0.05;

    if (this.state === 'waiting') {
      this.waitTimer -= deltaTime;
      if (this.waitTimer <= 0) {
        this.state = 'moving';
        this._advanceWaypoint();
        this._faceWaypoint();
      }
      return;
    }

    const wp = this.patrolPath[this.currentWaypoint];
    const dx = wp[0] - this.group.position.x;
    const dz = wp[2] - this.group.position.z;
    const dist = Math.sqrt(dx * dx + dz * dz);

    if (dist < 0.1) {
      this.group.position.x = wp[0];
      this.group.position.z = wp[2];
      this.state = 'waiting';
      this.waitTimer = 1.5;
      return;
    }

    const step = 1.5 * deltaTime;
    if (step >= dist) {
      this.group.position.x = wp[0];
      this.group.position.z = wp[2];
    } else {
      this.group.position.x += (dx / dist) * step;
      this.group.position.z += (dz / dist) * step;
    }

    this.group.rotation.y = Math.atan2(dx, dz);
  }

  dispose() {
    this.scene.remove(this.group);
    this.group.traverse(child => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) child.material.dispose();
    });
  }
}
