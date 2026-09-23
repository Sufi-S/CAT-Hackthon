import * as THREE from 'three';

const DEG2RAD = Math.PI / 180;

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

export default class Excavator {
  constructor(scene, terrain) {
    this.scene = scene;
    this.terrain = terrain;

    this.group = new THREE.Group();
    this.velocity = new THREE.Vector3();
    this.speed = 0;
    this.heading = Math.PI;
    this.isEngineOn = false;
    this.fuelLevel = 85;
    this.idleTimer = 0;
    this.payloadCount = 0;

    this.boomAngle = -30;
    this.armAngle = 20;
    this.bucketAngle = 0;
    this.swingAngle = 0;

    this._upperStructure = null;
    this._boomGroup = null;
    this._armGroup = null;
    this._bucket = null;

    this._buildModel();

    this.group.position.set(0, 0.15, 8);
    this.group.rotation.y = this.heading;
    this.scene.add(this.group);
  }

  get position() {
    return this.group.position;
  }

  _buildModel() {
    const catYellow = 0xF5A623;

    // Chassis
    const chassis = new THREE.Mesh(
      new THREE.BoxGeometry(3, 0.8, 4),
      new THREE.MeshLambertMaterial({ color: catYellow })
    );
    chassis.position.set(0, 0.4, 0);
    this.group.add(chassis);

    // Cab
    const cab = new THREE.Mesh(
      new THREE.BoxGeometry(1.8, 1.5, 2),
      new THREE.MeshLambertMaterial({ color: 0xE8940A })
    );
    cab.position.set(0, 1.55, -0.5);
    this.group.add(cab);

    // Window on cab front face
    const windowFront = new THREE.Mesh(
      new THREE.PlaneGeometry(1.4, 0.8),
      new THREE.MeshBasicMaterial({
        color: 0x87CEEB,
        transparent: true,
        opacity: 0.7,
        side: THREE.DoubleSide,
      })
    );
    windowFront.position.set(0, 0, 1.01);
    cab.add(windowFront);

    // Tracks
    const trackGeo = new THREE.BoxGeometry(0.5, 0.5, 4.2);
    const trackMat = new THREE.MeshLambertMaterial({ color: 0x333333 });

    const trackLeft = new THREE.Mesh(trackGeo, trackMat);
    trackLeft.position.set(-1.6, 0.1, 0);
    this.group.add(trackLeft);

    const trackRight = new THREE.Mesh(trackGeo, trackMat);
    trackRight.position.set(1.6, 0.1, 0);
    this.group.add(trackRight);

    // Upper structure — the rotating platform for swing
    this._upperStructure = new THREE.Mesh(
      new THREE.BoxGeometry(2.8, 0.4, 3.5),
      new THREE.MeshLambertMaterial({ color: catYellow })
    );
    this._upperStructure.position.set(0, 1.0, 0);
    this.group.add(this._upperStructure);

    // Boom group — pivots at boom base
    this._boomGroup = new THREE.Group();
    this._boomGroup.position.set(0, 0.2, 1.5);
    this._upperStructure.add(this._boomGroup);

    // Boom arm segment
    const boom = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.4, 3.5),
      new THREE.MeshLambertMaterial({ color: 0xCC8800 })
    );
    boom.position.set(0, 0, 1.75);
    this._boomGroup.add(boom);

    // Arm group — pivots at boom tip
    this._armGroup = new THREE.Group();
    this._armGroup.position.set(0, 0, 3.5);
    this._boomGroup.add(this._armGroup);

    // Arm segment
    const arm = new THREE.Mesh(
      new THREE.BoxGeometry(0.4, 0.35, 2.8),
      new THREE.MeshLambertMaterial({ color: 0xCC8800 })
    );
    arm.position.set(0, 0, 1.4);
    this._armGroup.add(arm);

    // Bucket
    this._bucket = new THREE.Mesh(
      new THREE.BoxGeometry(0.8, 0.6, 0.6),
      new THREE.MeshLambertMaterial({ color: 0x888888 })
    );
    this._bucket.position.set(0, -0.3, 2.8);
    this._armGroup.add(this._bucket);

    this._applyJointAngles();
  }

  _applyJointAngles() {
    this._upperStructure.rotation.y = this.swingAngle * DEG2RAD;
    this._boomGroup.rotation.x = this.boomAngle * DEG2RAD;
    this._armGroup.rotation.x = this.armAngle * DEG2RAD;
    this._bucket.rotation.x = this.bucketAngle * DEG2RAD;
  }

  update(deltaTime, inputState) {
    if (!this.isEngineOn) return;

    // Steering
    this.heading += inputState.leftX * 1.5 * deltaTime;

    // Forward / reverse — negate leftY so stick-forward (negative) = positive speed
    this.speed = -inputState.leftY * 8.0;

    const newX = this.position.x + Math.sin(this.heading) * this.speed * deltaTime;
    const newZ = this.position.z + Math.cos(this.heading) * this.speed * deltaTime;

    if (this.terrain.isDriveable(newX, newZ)) {
      this.position.x = newX;
      this.position.z = newZ;
    } else {
      this.speed = 0;
    }

    this.velocity.set(
      Math.sin(this.heading) * this.speed,
      0,
      Math.cos(this.heading) * this.speed
    );

    this.group.rotation.y = this.heading;

    // Joint controls
    this.boomAngle = clamp(this.boomAngle + inputState.rightY * 40 * deltaTime, -60, 10);
    this.armAngle = clamp(this.armAngle + inputState.rightX * 40 * deltaTime, -10, 80);
    this.bucketAngle = clamp(this.bucketAngle + inputState.RT * 60 * deltaTime, -45, 60);
    this.swingAngle += inputState.rightX * 90 * deltaTime;

    this._applyJointAngles();

    // Fuel & idle detection
    const armMoving =
      Math.abs(inputState.rightX) > 0.05 ||
      Math.abs(inputState.rightY) > 0.05 ||
      Math.abs(inputState.RT) > 0.05 ||
      Math.abs(inputState.LT) > 0.05;
    const isWorking = Math.abs(this.speed) >= 0.05 || armMoving;
    const rate = isWorking ? 0.8 : 0.15;
    this.fuelLevel = Math.max(0, this.fuelLevel - (rate * deltaTime) / 60);

    if (isWorking) {
      this.idleTimer = 0;
    } else {
      this.idleTimer += deltaTime;
    }
  }

  startEngine() {
    this.isEngineOn = true;
  }

  stopEngine() {
    this.isEngineOn = false;
  }

  dig() {
    if (!this.terrain.isDiggable(this.position.x, this.position.z)) return false;
    const tile = this.terrain.getTileAt(this.position.x, this.position.z);
    this.terrain.removeTile(tile.row, tile.col);
    this.payloadCount++;
    return true;
  }

  dump() {
    if (!this.terrain.isDumpZone(this.position.x, this.position.z)) return false;
    if (this.payloadCount === 0) return false;
    this.payloadCount = 0;
    return true;
  }

  getTelemetrySnapshot() {
    return {
      speed: this.speed,
      fuelLevel: this.fuelLevel,
      idleTime: this.idleTimer,
      boomAngle: this.boomAngle,
      armAngle: this.armAngle,
      position: { x: this.position.x, z: this.position.z },
      heading: this.heading,
      payloadCount: this.payloadCount,
      isEngineOn: this.isEngineOn,
    };
  }

  dispose() {
    this.scene.remove(this.group);
    this.group.traverse((child) => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) child.material.dispose();
    });
  }
}
