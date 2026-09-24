import * as THREE from 'three';

const TILE = {
  ROCK: 'ROCK',
  GRAVEL: 'GRAVEL',
  DIRT: 'DIRT',
  DIG_TARGET: 'DIG_TARGET',
  DIG_HOLE: 'DIG_HOLE',
  DUMP_ZONE: 'DUMP_ZONE',
};

const COLORS = {
  ROCK: 0x808080,
  GRAVEL: 0xA0916B,
  DIRT: 0x8B4513,
  DIG_TARGET: 0xFFD700,
  DUMP_ZONE: 0x2196F3,
};

const GRID_SIZE = 24;
const TILE_SIZE = 2;
const HALF_EXTENT = (GRID_SIZE * TILE_SIZE) / 2;

export default class VoxelTerrain {
  constructor(scene) {
    this.scene = scene;
    this.grid = [];
    this._instancedMeshes = {};
    this._digTargetMeshes = [];
    this._fenceMesh = null;
    this._groundPlane = null;
    this._subSurface = null;
    this._siteLight = null;
    this._digTargetGeo = null;
    this._digTargetMat = null;

    this._hideDummy = new THREE.Object3D();
    this._hideDummy.position.set(0, -500, 0);
    this._hideDummy.scale.set(1, 1, 1);
    this._hideDummy.updateMatrix();

    this._dumpEffects = [];
  }

  buildSite() {
    this._initGrid();
    this._assignLayout();
    this._buildInstancedMeshes();
    this._buildDigTargetMeshes();
    this._buildPerimeterFence();
    this._buildGroundPlane();
    this._buildSiteLighting();
  }

  _tileToWorld(row, col) {
    return {
      x: col * TILE_SIZE - HALF_EXTENT + 1,
      z: row * TILE_SIZE - HALF_EXTENT + 1,
    };
  }

  _worldToTile(worldX, worldZ) {
    return {
      row: Math.max(0, Math.min(GRID_SIZE - 1, Math.floor((worldZ + HALF_EXTENT) / TILE_SIZE))),
      col: Math.max(0, Math.min(GRID_SIZE - 1, Math.floor((worldX + HALF_EXTENT) / TILE_SIZE))),
    };
  }

  _initGrid() {
    for (let r = 0; r < GRID_SIZE; r++) {
      this.grid[r] = [];
      for (let c = 0; c < GRID_SIZE; c++) {
        this.grid[r][c] = { type: TILE.GRAVEL, mesh: null, row: r, col: c };
      }
    }
  }

  _assignLayout() {
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        if (r <= 1 || r >= 22 || c <= 1 || c >= 22) {
          this.grid[r][c].type = TILE.ROCK;
        }
      }
    }

    for (let r = 5; r <= 9; r++) {
      for (let c = 5; c <= 10; c++) {
        this.grid[r][c].type = TILE.DIRT;
      }
    }

    const dirtCells = [];
    for (let r = 5; r <= 9; r++) {
      for (let c = 5; c <= 10; c++) {
        dirtCells.push([r, c]);
      }
    }
    for (let i = dirtCells.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [dirtCells[i], dirtCells[j]] = [dirtCells[j], dirtCells[i]];
    }
    for (let i = 0; i < 3; i++) {
      this.grid[dirtCells[i][0]][dirtCells[i][1]].type = TILE.DIG_TARGET;
    }

    for (let r = 14; r <= 16; r++) {
      for (let c = 14; c <= 18; c++) {
        this.grid[r][c].type = TILE.DUMP_ZONE;
      }
    }

    const gravelCells = [];
    for (let r = 2; r <= 21; r++) {
      for (let c = 2; c <= 21; c++) {
        if (this.grid[r][c].type === TILE.GRAVEL) gravelCells.push([r, c]);
      }
    }
    for (let i = gravelCells.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [gravelCells[i], gravelCells[j]] = [gravelCells[j], gravelCells[i]];
    }
    for (let i = 0; i < 6; i++) {
      this.grid[gravelCells[i][0]][gravelCells[i][1]].type = TILE.ROCK;
    }
  }

  _buildInstancedMeshes() {
    const configs = {
      [TILE.ROCK]:      { geo: [TILE_SIZE, 1, TILE_SIZE],     y: -0.5, color: COLORS.ROCK },
      [TILE.GRAVEL]:    { geo: [TILE_SIZE, 1, TILE_SIZE],     y: -0.5, color: COLORS.GRAVEL },
      [TILE.DIRT]:      { geo: [TILE_SIZE, 1.5, TILE_SIZE],   y: 0,    color: COLORS.DIRT },
      [TILE.DUMP_ZONE]: { geo: [TILE_SIZE, 0.2, TILE_SIZE],   y: -0.9, color: COLORS.DUMP_ZONE },
    };

    for (const [type, cfg] of Object.entries(configs)) {
      const tiles = [];
      for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
          if (this.grid[r][c].type === type) tiles.push(this.grid[r][c]);
        }
      }
      if (tiles.length === 0) continue;

      const geometry = new THREE.BoxGeometry(...cfg.geo);
      const material = new THREE.MeshLambertMaterial({ color: cfg.color });
      const im = new THREE.InstancedMesh(geometry, material, tiles.length);
      const dummy = new THREE.Object3D();

      tiles.forEach((tile, idx) => {
        const { x, z } = this._tileToWorld(tile.row, tile.col);
        dummy.position.set(x, cfg.y, z);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        im.setMatrixAt(idx, dummy.matrix);
        tile.mesh = im;
        tile.instanceIndex = idx;
      });

      im.instanceMatrix.needsUpdate = true;
      this.scene.add(im);
      this._instancedMeshes[type] = im;
    }
  }

  _buildDigTargetMeshes() {
    this._digTargetGeo = new THREE.BoxGeometry(TILE_SIZE, 1.5, TILE_SIZE);
    this._digTargetMat = new THREE.MeshLambertMaterial({
      color: COLORS.DIG_TARGET,
      emissive: 0xFFAA00,
      emissiveIntensity: 0.3,
    });

    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const tile = this.grid[r][c];
        if (tile.type !== TILE.DIG_TARGET) continue;
        const mesh = new THREE.Mesh(this._digTargetGeo, this._digTargetMat);
        const { x, z } = this._tileToWorld(r, c);
        mesh.position.set(x, 0, z);
        this.scene.add(mesh);
        tile.mesh = mesh;
        this._digTargetMeshes.push(mesh);
      }
    }
  }

  _buildPerimeterFence() {
    const fenceGeo = new THREE.BoxGeometry(0.2, 1.5, TILE_SIZE);
    const fenceMat = new THREE.MeshLambertMaterial({ color: COLORS.ROCK });
    const entries = [];

    for (let c = 0; c < GRID_SIZE; c++) {
      const pos = this._tileToWorld(0, c);
      entries.push({ x: pos.x, z: pos.z, rotY: Math.PI / 2 });
    }
    for (let c = 0; c < GRID_SIZE; c++) {
      const pos = this._tileToWorld(GRID_SIZE - 1, c);
      entries.push({ x: pos.x, z: pos.z, rotY: Math.PI / 2 });
    }
    for (let r = 1; r < GRID_SIZE - 1; r++) {
      const pos = this._tileToWorld(r, 0);
      entries.push({ x: pos.x, z: pos.z, rotY: 0 });
    }
    for (let r = 1; r < GRID_SIZE - 1; r++) {
      const pos = this._tileToWorld(r, GRID_SIZE - 1);
      entries.push({ x: pos.x, z: pos.z, rotY: 0 });
    }

    const im = new THREE.InstancedMesh(fenceGeo, fenceMat, entries.length);
    const dummy = new THREE.Object3D();

    entries.forEach((e, i) => {
      dummy.position.set(e.x, 0.75, e.z);
      dummy.rotation.set(0, e.rotY, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      im.setMatrixAt(i, dummy.matrix);
    });

    im.instanceMatrix.needsUpdate = true;
    this.scene.add(im);
    this._fenceMesh = im;
  }

  _buildGroundPlane() {
    const geo = new THREE.PlaneGeometry(500, 500);
    const mat = new THREE.MeshBasicMaterial({ color: 0x87CEEB, depthWrite: false });
    this._groundPlane = new THREE.Mesh(geo, mat);
    this._groundPlane.rotation.x = -Math.PI / 2;
    this._groundPlane.position.y = -1.5;
    this._groundPlane.renderOrder = -1;
    this.scene.add(this._groundPlane);

    const subGeo = new THREE.PlaneGeometry(52, 52);
    const subMat = new THREE.MeshLambertMaterial({ color: 0x5C4033 });
    this._subSurface = new THREE.Mesh(subGeo, subMat);
    this._subSurface.rotation.x = -Math.PI / 2;
    this._subSurface.position.y = -0.1;
    this.scene.add(this._subSurface);
  }

  _buildSiteLighting() {
    this._siteLight = new THREE.PointLight(0xFFE4B5, 1.0, 60);
    this._siteLight.position.set(0, 20, 0);
    this.scene.add(this._siteLight);
  }

  worldToTile(worldX, worldZ) {
    return this._worldToTile(worldX, worldZ);
  }

  getTileAtGrid(row, col) {
    if (row < 0 || row >= GRID_SIZE || col < 0 || col >= GRID_SIZE) return null;
    return this.grid[row][col];
  }

  getTileAt(worldX, worldZ) {
    const { row, col } = this._worldToTile(worldX, worldZ);
    const tile = this.grid[row][col];
    return { type: tile.type, mesh: tile.mesh, row: tile.row, col: tile.col };
  }

  removeTile(row, col) {
    if (row < 0 || row >= GRID_SIZE || col < 0 || col >= GRID_SIZE) return;
    const tile = this.grid[row][col];

    if (tile.type === TILE.DIG_TARGET && tile.mesh) {
      this.scene.remove(tile.mesh);
      const idx = this._digTargetMeshes.indexOf(tile.mesh);
      if (idx !== -1) this._digTargetMeshes.splice(idx, 1);
      tile.type = TILE.DIG_HOLE;
      tile.mesh = null;
      return;
    }

    if (tile.type === TILE.DIRT) {
      const im = this._instancedMeshes[TILE.DIRT];
      if (im && tile.instanceIndex !== undefined) {
        im.setMatrixAt(tile.instanceIndex, this._hideDummy.matrix);
        im.instanceMatrix.needsUpdate = true;
      }
      tile.type = TILE.DIG_HOLE;
      tile.mesh = null;
      return;
    }
  }

  isDriveable(worldX, worldZ) {
    const { row, col } = this._worldToTile(worldX, worldZ);
    return this.grid[row][col].type !== TILE.ROCK;
  }

  isDiggable(worldX, worldZ) {
    const { row, col } = this._worldToTile(worldX, worldZ);
    const type = this.grid[row][col].type;
    return type === TILE.DIRT || type === TILE.DIG_TARGET;
  }

  isDumpZone(worldX, worldZ) {
    const { row, col } = this._worldToTile(worldX, worldZ);
    return this.grid[row][col].type === TILE.DUMP_ZONE;
  }

  getRemainingDigTargets() {
    let count = 0;
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        if (this.grid[r][c].type === TILE.DIG_TARGET) count++;
      }
    }
    return count;
  }

  getAllDigTargetPositions() {
    const out = [];
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        if (this.grid[r][c].type === TILE.DIG_TARGET) {
          const { x, z } = this._tileToWorld(r, c);
          out.push({ x, z });
        }
      }
    }
    return out;
  }

  showDumpEffect(worldX, worldZ) {
    const count = 3 + Math.floor(Math.random() * 3);
    const geo = new THREE.BoxGeometry(0.3, 0.3, 0.3);
    const chunks = [];

    for (let i = 0; i < count; i++) {
      const mat = new THREE.MeshLambertMaterial({
        color: 0x8B4513,
        transparent: true,
      });
      const chunk = new THREE.Mesh(geo, mat);
      const s = 0.5 + Math.random() * 0.5;
      chunk.position.set(
        worldX + (Math.random() - 0.5) * 1.5,
        0.15 + Math.random() * 0.3,
        worldZ + (Math.random() - 0.5) * 1.5
      );
      chunk.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      );
      chunk.scale.set(s, s, s);
      this.scene.add(chunk);
      chunks.push(chunk);
    }

    this._dumpEffects.push({ chunks, geo, elapsed: 0 });
  }

  rebuild() {
    this.dispose();
    this.buildSite();
  }

  update(deltaTime) {
    const HOLD = 0.8;
    const FADE = 0.7;
    for (let i = this._dumpEffects.length - 1; i >= 0; i--) {
      const eff = this._dumpEffects[i];
      eff.elapsed += deltaTime;
      if (eff.elapsed > HOLD + FADE) {
        for (const c of eff.chunks) {
          this.scene.remove(c);
          c.material.dispose();
        }
        eff.geo.dispose();
        this._dumpEffects.splice(i, 1);
      } else if (eff.elapsed > HOLD) {
        const t = (eff.elapsed - HOLD) / FADE;
        const opacity = 1 - t;
        for (const c of eff.chunks) c.material.opacity = opacity;
      }
    }
  }

  dispose() {
    for (const eff of this._dumpEffects) {
      for (const c of eff.chunks) {
        this.scene.remove(c);
        c.material.dispose();
      }
      eff.geo.dispose();
    }
    this._dumpEffects = [];

    for (const im of Object.values(this._instancedMeshes)) {
      im.geometry.dispose();
      im.material.dispose();
      this.scene.remove(im);
    }
    for (const m of this._digTargetMeshes) this.scene.remove(m);
    if (this._digTargetGeo) this._digTargetGeo.dispose();
    if (this._digTargetMat) this._digTargetMat.dispose();
    if (this._fenceMesh) {
      this._fenceMesh.geometry.dispose();
      this._fenceMesh.material.dispose();
      this.scene.remove(this._fenceMesh);
    }
    if (this._groundPlane) {
      this._groundPlane.geometry.dispose();
      this._groundPlane.material.dispose();
      this.scene.remove(this._groundPlane);
    }
    if (this._subSurface) {
      this._subSurface.geometry.dispose();
      this._subSurface.material.dispose();
      this.scene.remove(this._subSurface);
    }
    if (this._siteLight) this.scene.remove(this._siteLight);
    this._instancedMeshes = {};
    this._digTargetMeshes = [];
    this.grid = [];
  }
}
