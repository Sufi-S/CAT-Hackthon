# CAT Operator Guardian — Hackathon Submission Report

---

## 1. Project Overview

**CAT Operator Guardian** is a browser-based 3D voxel construction-site training simulator built for Caterpillar equipment operators. Heavy equipment incidents remain a leading cause of construction-site injuries, yet existing training programs rely on static slide decks and disconnected classroom exercises that fail to build muscle memory for real-time hazard response. This project delivers a closed-loop training system where operators use an Xbox controller to operate a procedurally modeled excavator, navigate a voxel terrain jobsite, dig and haul material, and respond to dynamic proximity hazards from patrolling worker NPCs — all while an AI Coach scores their performance across safety, efficiency, activity, and task completion, then delivers personalized debrief feedback. The result is a game-loop training platform that bridges the gap between passive safety lectures and full-fidelity simulator hardware.

---

## 2. What Was Built (5 Stages)

### Stage 0 — Project Scaffold
**Commit:** `78b2ee5`

| Files Created | Purpose |
|---|---|
| `package.json` | Vite 6.3.5 + Three.js 0.176.0 dependency manifest |
| `index.html` | Canvas element, HUD overlay, seatbelt modal markup |
| `styles/game.css` | Full game stylesheet (HUD, overlays, modals, animations) |
| `vite.config.js` | Vite dev server configuration |
| `src/main.js` | Entry point (stub) |

**Key decisions:** Chose Vite over Webpack for instant HMR and zero-config Three.js support. Chose vanilla JS ES modules over TypeScript or React to minimize build overhead for a hackathon timeline. Targeted Chrome only for Gamepad API compatibility.

**After this stage:** Blank canvas renders with dev server at `localhost:3000`.

---

### Stage 1 — Voxel Terrain System
**Commit:** `f4d6308`

| Files Created | Purpose |
|---|---|
| `src/terrain/VoxelTerrain.js` | 24x24 tile grid with InstancedMesh rendering |
| `src/scene/SceneManager.js` | WebGLRenderer, PerspectiveCamera, lighting, terrain init |

**Key decisions:**
- **InstancedMesh batching**: 576 tiles rendered in ~5 draw calls (one per tile type) instead of 576 individual meshes. This is critical for 60fps on integrated GPUs.
- **Tile types**: ROCK (walls), GRAVEL (ground), DIRT (diggable), DIG_TARGET (gold highlighted), DUMP_ZONE (blue pad). Each type has distinct geometry height and color.
- **Coordinate system**: `tileToWorld()` places tile centers at `col * 2 - 23, row * 2 - 23`. `worldToTile()` is the exact mathematical inverse.
- **Perimeter fence**: InstancedMesh ring of thin boxes around the site boundary.
- **Ground plane**: Large plane at y=-1.5 beneath all tiles.

**After this stage:** A fully rendered 3D construction site with colored terrain zones, rock walls, perimeter fence, and overhead camera.

---

### Stage 2 — Procedural Excavator Model
**Commit:** `d0ba8e6`

| Files Created | Purpose |
|---|---|
| `src/machine/Excavator.js` | 10-part articulated excavator with physics |

**Key decisions:**
- **Procedural geometry**: Built from Three.js primitives (BoxGeometry, CylinderGeometry) instead of importing FBX/GLTF models. Zero external asset dependencies — the entire game loads from source code alone.
- **Articulation hierarchy**: `group → chassis/cab/tracks → upperStructure → boomGroup → armGroup → bucket`. Each joint rotates independently with clamped angle ranges.
- **CAT yellow color scheme**: Chassis `0xF5A623`, cab `0xE8940A`, boom/arm `0xCC8800`, bucket `0x888888`, tracks `0x333333`.
- **Movement model**: Heading-based steering with `sin(heading)/cos(heading)` for tracked vehicle simulation. Speed = 8 u/s max. Terrain collision via `isDriveable()` check before position update.
- **Fuel system**: Consumption rate varies by activity (0.8 L/min working, 0.15 L/min idle).

**After this stage:** A driveable CAT-yellow excavator with articulated boom/arm/bucket on the terrain.

---

### Stage 3 — Xbox Controller + Camera System
**Commit:** `071af6e`

| Files Created | Purpose |
|---|---|
| `src/input/GamepadController.js` | Raw Browser Gamepad API polling with edge detection |

**Key decisions:**
- **Raw Gamepad API**: Used `navigator.getGamepads()` directly instead of a gamepad library. Gives full control over analog triggers (RT/LT as 0-1 float), deadzone tuning (0.12 threshold), and `justPressed` edge detection via prev/current button state comparison.
- **3 camera modes**: Overhead (y=35, lerp 0.08), Follow (12 units behind heading, y=8, lerp 0.06), Cab (localToWorld on excavator group, first-person view). Cycled with LB.
- **Seatbelt safety gate**: Modal overlay with animated checklist items. Must be dismissed before gameplay begins. Reinforces pre-start safety habits.
- **Dual-rumble vibration**: `vibrationActuator.playEffect('dual-rumble')` with configurable strong/weak magnitude and duration.

**After this stage:** Full Xbox controller input with 3 camera perspectives and a safety gate before play begins.

---

### Stage 4 — Worker NPCs + Proximity Hazard
**Commit:** `62be681`

| Files Created | Purpose |
|---|---|
| `src/npcs/WorkerNPC.js` | Procedural worker model with waypoint patrol |
| `src/systems/ProximitySystem.js` | 2D distance hazard detection with visual/haptic alerts |
| `src/systems/ScoringSystem.js` | 4-dimension weighted scoring engine |

**Key decisions:**
- **3 worker NPCs** on independent patrol paths. Procedural model (cylinder body, sphere head, box legs). Walk speed 1.5 u/s with 1.5s wait at each waypoint. Head bob animation.
- **3-zone proximity**: SAFE (>6m, green ring), MEDIUM (3-6m, orange ring + "Reduce Speed" warning), HIGH (<3m, red ring + pulsing alert + controller vibration every 0.8s + incident logging).
- **RingGeometry indicators**: Two concentric rings follow the excavator in real time — color changes dynamically with threat level.
- **4-dimension scoring**: Safety (penalty per second in HIGH zone), Fuel Efficiency (idle-time ratio), Activity (idle penalty), Task Completion (+20 per dig). Configurable weights per mission.
- **Telemetry integration**: Every proximity incident fires a POST to the backend with worker ID, distance, machine speed, timestamp, and session ID.

**After this stage:** Three workers patrol the site. Driving near them triggers color-coded warnings, controller vibration, and score penalties.

---

### Stage 5 — Mission System + Debrief + Game Loop
**Commit:** `faebd02` (tagged `v1.0-game-complete`)

| Files Created | Purpose |
|---|---|
| `src/systems/MissionSystem.js` | Mission state machine, selection UI, debrief screen, AI Coach |
| `src/network/TelemetryClient.js` | Backend POST with offline queue |
| `src/ui/HUD.js` | DOM-based heads-up display |

**Key decisions:**
- **3 distinct missions**: Fuel Saver (idle management focus), Hazard Hunter (safety focus, 3-star difficulty), Full Shift Sim (all skills, 4-star difficulty). Each has unique time limits, scoring weights, objectives, and starting fuel.
- **State machine**: `menu → playing → complete`. D-pad navigation on mission select. A/B/Start on debrief.
- **7 objective types**: `idle_below`, `incidents_below`, `time_below`, `payload_above`, `dumps_above`, `fuel_above`, `response_time`. Live progress tracking on HUD.
- **AI Coach debrief**: Identifies the weakest scoring dimension, selects a feedback template from a 3-tier library (low/mid/high), and displays personalized improvement advice.
- **Auto-complete**: Missions with positive objectives (dig/dump targets) auto-complete when all are met. Constraint-only missions run to time limit.
- **Offline-first telemetry**: All POST calls silently queue on failure and retry every 10 seconds. Game works fully without a backend.

**After this stage:** Complete game loop — select mission, operate excavator, dig/dump material, avoid workers, score performance, receive AI Coach debrief, play again.

---

## 3. Technical Architecture

### 3A. Tech Stack

| Technology | Version | Purpose |
|---|---|---|
| Three.js | 0.176.0 | 3D rendering, scene graph, InstancedMesh, geometry primitives |
| Vite | 6.3.5 | Dev server with HMR, ES module bundling, zero-config |
| Browser Gamepad API | Native | Xbox controller input (analog axes, triggers, buttons, vibration) |
| Fetch API | Native | Telemetry POST to backend |
| ES Modules | Native | Module system (`import`/`export`, no bundler plugins) |
| Chrome | Target | Gamepad API + vibration support |
| Node.js | 24.19.0 | Dev tooling runtime |
| npm | 11.17.0 | Package management |

### 3B. File Architecture

| File | Description |
|---|---|
| `index.html` | Canvas, HUD overlay, mission select overlay, debrief overlay, seatbelt modal |
| `styles/game.css` | All game styles — HUD, score bars, mission cards, debrief layout, animations |
| `src/main.js` | Game loop (`requestAnimationFrame`), system wiring, seatbelt gate, dig/dump dispatch |
| `src/scene/SceneManager.js` | WebGLRenderer, PerspectiveCamera, 3 camera modes, ambient + directional lighting |
| `src/terrain/VoxelTerrain.js` | 24x24 grid, 6 tile types, InstancedMesh batching, dig/dump/rebuild, ground planes |
| `src/machine/Excavator.js` | 10-part procedural model, 4-joint articulation, fuel/idle tracking, bucket tip projection |
| `src/input/GamepadController.js` | Raw Gamepad API polling, 0.12 deadzone, justPressed edge detection, dual-rumble vibration |
| `src/npcs/WorkerNPC.js` | Procedural worker model, waypoint patrol at 1.5 u/s, head bob animation |
| `src/systems/ProximitySystem.js` | 2D distance checks, 3 risk zones, ring indicators, vibration triggers, incident logging |
| `src/systems/ScoringSystem.js` | 4-dimension weighted scoring (safety/fuel/idle/task), configurable per mission |
| `src/systems/MissionSystem.js` | 3 missions, state machine, selection UI, debrief with score bars + AI Coach |
| `src/ui/HUD.js` | DOM-based HUD — fuel bar, speed, idle timer, payload, score bars, mission timer |
| `src/network/TelemetryClient.js` | POST to backend with offline queue, 10s retry, session ID generation |

### 3C. Key Engineering Decisions

**InstancedMesh for terrain (not 576 individual meshes)**
A 24x24 grid produces 576 tiles. Rendering each as an individual `Mesh` would generate 576 draw calls per frame — well beyond the budget for 60fps on integrated GPUs. `THREE.InstancedMesh` batches all tiles of the same type into a single draw call, reducing to ~5 total. Hidden tiles (dug holes) are moved to y=-500 with zero scale to remove them from rendering without rebuilding the buffer.

**Procedural geometry for excavator (not FBX/GLTF import)**
All 10 parts of the excavator are built from `BoxGeometry`, `CylinderGeometry`, and `SphereGeometry` primitives composed in a nested `Group` hierarchy. This eliminates external asset dependencies — the entire game loads from JavaScript source code alone, with zero asset pipeline, zero loading screens, and zero CORS issues.

**Raw Gamepad API (not a gamepad library)**
Libraries like `gamepad.js` add abstraction layers that obscure analog trigger values (0.0-1.0 float), button indices, and vibration actuator access. Direct `navigator.getGamepads()` polling gives precise control over deadzone tuning (0.12), edge detection (justPressed via prev/current state diff), and `dual-rumble` vibration effects — all critical for a controller-driven training simulator.

**Bucket tip world position with quaternion projection**
The bucket mesh's origin is at its geometric center. For accurate dig detection, the system projects 0.4 world units along the bucket's forward-down direction (`Vector3(0, -0.5, 1)` rotated by the bucket's world quaternion) to estimate the tip position. This accounts for all parent joint rotations in the articulation chain.

**Blocklist logic for isDriveable (not allowlist)**
`isDriveable()` returns `type !== ROCK` rather than listing every driveable type. This means new tile types are driveable by default — the safe behavior for a construction site where most ground is navigable. Only impassable obstacles (rocks) are blocked.

**worldToTile as exact mathematical inverse of tileToWorld**
`tileToWorld(row, col)` places tiles at `col * 2 - 23, row * 2 - 23`. The inverse `worldToTile` uses `Math.floor((x + 24) / 2)` clamped to `[0, 23]`. This was verified to round-trip correctly for all 576 tile positions.

**Offline queue in TelemetryClient (game works without backend)**
Every `POST` call wraps in a `try/catch`. On network failure, the payload is pushed to an in-memory queue. A 10-second `setInterval` retries queued items. The game never blocks or errors on backend unavailability — it plays identically offline and syncs when the backend comes up.

---

## 4. Features List

### Terrain & Environment
- [x] **6 tile types** — ROCK (gray walls), GRAVEL (sandy ground), DIRT (brown diggable), DIG_TARGET (gold highlighted), DIG_HOLE (removed), DUMP_ZONE (blue pad)
- [x] **24x24 voxel grid** — 576 tiles rendered via InstancedMesh in ~5 draw calls
- [x] **Perimeter fence** — InstancedMesh boundary posts around site edges
- [x] **Dark brown sub-surface** — Dug holes reveal realistic dirt (0x5C4033) at y=-0.1
- [x] **Sky-blue ground plane** — 500x500 plane at y=-1.5 with depthWrite disabled
- [x] **Site lighting** — Ambient (0.6), directional (0.8), point light (warm, 60-unit range)

### Excavator
- [x] **10-part procedural model** — Chassis, cab, window, 2 tracks, upper structure, boom, arm, bucket (all BoxGeometry/CylinderGeometry)
- [x] **4-joint articulation** — Boom (-60 to +10 deg), Arm (-10 to +80 deg), Bucket (-45 to +60 deg), Swing (unlimited)
- [x] **CAT yellow color scheme** — Authentic Caterpillar brand colors
- [x] **Heading-based steering** — Tracked vehicle simulation via sin/cos heading model
- [x] **Terrain collision** — isDriveable check before position update
- [x] **Fuel consumption** — 0.8 L/min active, 0.15 L/min idle
- [x] **Idle detection** — Tracks idle time for scoring and objectives
- [x] **Dig mechanic** — Bucket tip position detection with 1-tile proximity radius
- [x] **Dump mechanic** — Deposits payload at DUMP_ZONE, triggers visual dirt chunk effect
- [x] **Dump visual effect** — 3-5 brown BoxGeometry chunks spawn and fade over 1.5 seconds
- [x] **Bucket tip projection** — Quaternion-based forward-down offset from mesh center to digging point

### Xbox Controller
- [x] **Left stick** — Steering (X axis) + Forward/Reverse (Y axis)
- [x] **Right stick** — Boom angle (Y axis) + Arm angle / Swing (X axis)
- [x] **RT (right trigger)** — Bucket curl + dig action (analog, >0.5 threshold)
- [x] **LT (left trigger)** — Reserved for future brake/auxiliary
- [x] **A button** — Dump payload / Confirm selection
- [x] **B button** — Change mission (debrief screen)
- [x] **LB button** — Cycle camera mode
- [x] **Start button** — Begin safety check / Return to menu
- [x] **D-pad Up/Down** — Navigate mission selection
- [x] **0.12 deadzone** — Applied to all analog axes
- [x] **justPressed edge detection** — Prevents repeated triggers on held buttons

### Camera System
- [x] **Overhead mode** — y=35, smooth lerp (0.08), follows excavator XZ
- [x] **Follow mode** — 12 units behind heading, y=8, lerp (0.06)
- [x] **Cab mode** — First-person from operator seat via localToWorld()

### Worker NPCs
- [x] **3 independent workers** — Procedural models (orange body, gold hardhat, black legs)
- [x] **Waypoint patrol** — 1.5 u/s walk speed, 1.5s wait at each waypoint
- [x] **Head bob animation** — Sinusoidal vertical oscillation on head mesh
- [x] **Driveable path validation** — Workers skip waypoints on non-driveable tiles

### Proximity Hazard System
- [x] **3 risk zones** — SAFE (>6m, green), MEDIUM (3-6m, orange), HIGH (<3m, red)
- [x] **RingGeometry indicators** — Two concentric rings follow excavator, color-coded by threat
- [x] **Controller vibration** — Dual-rumble on HIGH risk, repeats every 0.8 seconds
- [x] **HUD alert overlay** — "PROXIMITY HAZARD — STOP MOVEMENT" with pulse animation
- [x] **Incident logging** — Each HIGH entry posts telemetry with worker ID, distance, speed

### Seatbelt Safety Gate
- [x] **Pre-start checklist** — Seatbelt, perimeter clear, walkaround complete
- [x] **Animated checkmarks** — Sequential check-off animation (300ms per item)
- [x] **Gamepad or click start** — START button or click to dismiss

### Mission System
- [x] **3 playable missions** — Fuel Saver (2-star), Hazard Hunter (3-star), Full Shift Sim (4-star)
- [x] **Mission selection screen** — D-pad navigation, click support, star difficulty rating
- [x] **7 objective types** — idle_below, incidents_below, time_below, payload_above, dumps_above, fuel_above, response_time
- [x] **Live objective tracking** — HUD shows progress for each objective in real time
- [x] **Mission timer** — Color-coded countdown (green >50%, yellow >25%, red <25%)
- [x] **Auto-complete** — Missions with positive targets complete when all met
- [x] **Time-out failure** — Constraint missions fail when timer expires

### Scoring & Debrief
- [x] **4-dimension scoring** — Safety, Fuel Efficiency, Idle Management, Task Completion
- [x] **Configurable weights** — Each mission defines its own scoring weight distribution
- [x] **Score bar visualization** — Animated bars with green/yellow/red color thresholds
- [x] **AI Coach feedback** — Template-based debrief identifying weakest dimension with actionable advice
- [x] **Focus area indicator** — Highlights the mission's primary scoring dimension
- [x] **Statistics panel** — Time, incidents, idle %, fuel consumed
- [x] **Play Again / Change Mission** — Gamepad (A/B) or click navigation from debrief

### Telemetry & Networking
- [x] **3 POST endpoints** — `/safety/event`, `/training/score`, `/telemetry/event`
- [x] **Offline queue** — Failed requests queued in memory, retried every 10 seconds
- [x] **Session ID** — `session_` + `Date.now()` generated at startup
- [x] **Zero backend dependency** — Game plays identically with or without backend

---

## 5. Backend Integration Points

### Endpoints

| Endpoint | Method | Fires When |
|---|---|---|
| `POST /safety/event` | POST | Proximity HIGH zone entered; proximity resolved |
| `POST /training/score` | POST | Mission completes (success or failure) |
| `POST /telemetry/event` | POST | Generic telemetry events |

**Base URL:** `http://localhost:8000` (configurable in TelemetryClient constructor)

### Payload: Safety Event (proximity_hazard)

```json
{
  "type": "proximity_hazard",
  "worker_id": "worker_1",
  "distance": 2.4,
  "machine_speed": 3.7,
  "timestamp": "2026-09-23T14:30:00.000Z",
  "session_id": "session_1695477000000"
}
```

### Payload: Safety Event (proximity_resolved)

```json
{
  "type": "proximity_resolved",
  "worker_id": "worker_1",
  "distance": 7.2,
  "timestamp": "2026-09-23T14:30:05.000Z",
  "session_id": "session_1695477000000"
}
```

### Payload: Training Score

```json
{
  "operator_id": "alex",
  "mission_id": "full_shift_simulation",
  "safety": 85,
  "fuel": 72,
  "idle": 90,
  "task": 60,
  "total": 77,
  "duration_sec": 245,
  "incidents": 2,
  "timestamp": "2026-09-23T14:35:00.000Z",
  "session_id": "session_1695477000000"
}
```

### Offline Behavior

When `fetch()` fails (network error, backend down, CORS), the request is silently pushed to an in-memory `offlineQueue` array. A `setInterval` runs every 10 seconds, retries all queued items, and re-queues any that still fail. The game loop is never blocked or interrupted by network state.

---

## 6. How to Run

### Prerequisites
- Node.js >= 18 (tested on 24.19.0)
- npm >= 8 (tested on 11.17.0)
- Google Chrome (for Gamepad API + vibration support)
- Xbox controller (USB or Bluetooth) — optional

### Install & Start

```bash
git clone https://github.com/Sufi-S/CAT-Hackthon.git
cd CAT-Hackthon
npm install
npm run dev
```

Open **http://localhost:3000** in Chrome.

### Connecting an Xbox Controller

1. Connect an Xbox controller via USB or Bluetooth
2. Open Chrome and navigate to `localhost:3000`
3. Press any button on the controller — Chrome will detect it
4. The HUD indicator in the top-left changes to **"Controller: Connected"** (green)

### Controller Button Mapping

| Control | Action |
|---|---|
| Left Stick X | Steer left/right |
| Left Stick Y | Drive forward (push up) / reverse (pull down) |
| Right Stick Y | Boom up/down |
| Right Stick X | Arm extend / Swing rotate |
| RT (Right Trigger) | Bucket curl + dig (hold past 50%) |
| A Button | Dump payload / Confirm selection |
| B Button | Change mission (from debrief) |
| LB (Left Bumper) | Cycle camera mode (Overhead → Follow → Cab) |
| Start | Begin safety check / Return to menu |
| D-pad Up/Down | Navigate mission selection |

### Playing Without a Controller

Click the **"Start Operation"** button on the seatbelt modal, then click a mission card to begin. Without a controller, the excavator cannot be driven — the game is designed as a controller-first experience. For demo purposes, all UI screens (mission select, debrief) are fully clickable.

---

## 7. Demo Script (2 Minutes)

### [0:00 - 0:10] Opening — The Hook

**Action:** Show the game loaded in Chrome. Seatbelt modal is visible.

**Say:** *"This is CAT Operator Guardian — a browser-based training simulator for heavy equipment operators. No install, no downloads — it runs in Chrome with an Xbox controller."*

### [0:10 - 0:20] Safety Gate

**Action:** Press START on the Xbox controller. Watch the checklist animate (seatbelt, perimeter, walkaround).

**Say:** *"Before operating, every trainee completes a pre-start safety check — just like on a real jobsite. This builds the habit before they ever touch a machine."*

### [0:20 - 0:35] Mission Selection

**Action:** Use D-pad to browse all 3 missions. Highlight star difficulty ratings. Select "FULL SHIFT SIM" and press A.

**Say:** *"Operators choose from missions of increasing difficulty. Each one focuses on different skills — fuel efficiency, hazard awareness, or full operational competency. Let's run the full shift."*

### [0:35 - 0:55] Driving + Digging (Wow Moment 1)

**Action:** Drive toward the brown dirt zone using left stick. Lower the boom with right stick Y. Hold RT to dig a tile. Show the dirt chunk disappear and dark brown hole appear.

**Say:** *"The excavator has full articulation — boom, arm, bucket, and swing — all controlled with the two sticks and triggers. Watch the bucket position: digging only works when the bucket tip is over a diggable tile."*

### [0:55 - 1:10] Dump Zone + Visual Effect

**Action:** Drive to the blue dump pad. Press A to dump. Show the brown dirt chunks appear and fade.

**Say:** *"Material gets hauled to the dump zone. The HUD tracks payload, fuel consumption, idle time, and all four scoring dimensions in real time."*

### [1:10 - 1:30] Proximity Hazard (Wow Moment 2)

**Action:** Drive deliberately toward a patrolling worker. Show the ring turn orange, then red. Feel the controller vibrate. Show the pulsing "PROXIMITY HAZARD" alert.

**Say:** *"This is the core training mechanic. Three workers patrol the site on independent paths. Get within 6 meters and you get a warning. Within 3 meters — the controller vibrates, the screen flashes red, and an incident is logged. Your safety score drops in real time. This is exactly the kind of muscle-memory response training that prevents real-world injuries."*

### [1:30 - 1:45] Camera Modes

**Action:** Press LB twice to cycle through Follow and Cab views. Pause on Cab view to show the first-person operator perspective.

**Say:** *"Three camera modes — overhead for situational awareness, follow for third-person, and cab view for the operator's actual sightlines. Cab view is where blind spots become real."*

### [1:45 - 2:00] Debrief + AI Coach (Wow Moment 3)

**Action:** If mission is still running, let timer expire or complete objectives. Show the debrief screen with score bars and AI Coach feedback.

**Say:** *"After every mission, the AI Coach analyzes performance across four dimensions and gives targeted feedback. That score data posts to our backend API for the dashboard team to visualize trends over time. This is the closed training loop — operate, score, coach, improve, repeat."*

---

## 8. Bugs Fixed and Decisions

### Bug 1 — isDriveable Blocklist Logic
**Commit:** `1fd9a63`

| | |
|---|---|
| **Symptom** | Excavator could not reach DIRT or DIG_TARGET tiles. Both dig and dump mechanics non-functional. |
| **Root cause** | `isDriveable()` used an allowlist that only permitted GRAVEL and DUMP_ZONE, blocking all other tile types including DIRT and DIG_TARGET. |
| **Fix** | Changed to blocklist: `return this.grid[row][col].type !== TILE.ROCK`. All types except ROCK are now driveable. |
| **Files** | `src/terrain/VoxelTerrain.js` |

### Bug 2 — Blue Visual Artifact After Digging
**Commit:** `774c18a`

| | |
|---|---|
| **Symptom** | A blue/cyan rectangle appeared at world origin after removing DIRT tiles. |
| **Root cause** | `removeTile()` hid InstancedMesh instances by setting zero scale at position (0, 0, 0). Degenerate triangles at world origin caused GPU rendering artifacts and Z-fighting with the GRAVEL tile at that position. |
| **Fix** | Hidden instances are now moved to `(0, -500, 0)` with zero scale — far below the scene, eliminating any rendering artifact. |
| **Files** | `src/terrain/VoxelTerrain.js` |

### Bug 3 — Dig Trigger on Chassis Instead of Bucket
**Commit:** `774c18a`

| | |
|---|---|
| **Symptom** | Digging checked the excavator chassis position, not the bucket tip. Tiles were removed under the machine body, not where the bucket visually was. |
| **Root cause** | `dig()` used `this.position` (the group root) for `isDiggable()` and `getTileAt()`. The bucket is 7+ units away from the chassis due to the articulation chain. |
| **Fix** | Added `getBucketWorldPosition()` using `getWorldPosition()` on the bucket mesh. `dig()` now checks the bucket's world XZ. |
| **Files** | `src/machine/Excavator.js` |

### Bug 4 — No Dump Zone Visual Feedback
**Commit:** `774c18a`

| | |
|---|---|
| **Symptom** | Dumping payload had no visual confirmation — the payload count silently reset. |
| **Root cause** | No effect existed. |
| **Fix** | Added `showDumpEffect()` to VoxelTerrain — spawns 3-5 brown dirt chunk meshes with random scale/rotation, fades opacity at 800ms, removes and disposes geometry at 1500ms. Called from `dump()` on success. |
| **Files** | `src/terrain/VoxelTerrain.js`, `src/machine/Excavator.js` |

### Bug 5 — Bucket Tip Offset from Visual Position
**Commit:** `bbe3266`

| | |
|---|---|
| **Symptom** | `getBucketWorldPosition()` returned the bucket mesh center, causing a half-geometry offset from where the bucket visually appeared. |
| **Root cause** | `getWorldPosition()` returns the mesh pivot point (center of BoxGeometry), not the digging tip at the front-bottom. |
| **Fix** | After getting world position, project 0.4 units along the bucket's forward-down axis using `Vector3(0, -0.5, 1)` rotated by the bucket's world quaternion. Pre-allocated `Quaternion` and `Vector3` to avoid per-frame GC. |
| **Files** | `src/machine/Excavator.js` |

### Bug 6 — Ground Plane Depth Coverage
**Commit:** `bbe3266`

| | |
|---|---|
| **Symptom** | Dug holes showed sky-blue void or black background from certain camera angles. |
| **Root cause** | The ground plane (200x200) was too small for extreme camera angles. No sub-surface existed at the hole level. |
| **Fix** | Enlarged ground plane to 500x500 with `depthWrite: false` and `renderOrder: -1`. Added a 52x52 dark brown (`0x5C4033`) sub-surface at y=-0.1 so dug holes show realistic dirt. |
| **Files** | `src/terrain/VoxelTerrain.js` |

### Bug 7 — Dig Proximity Radius Too Strict
**Commit:** `bbe3266`

| | |
|---|---|
| **Symptom** | Bucket had to be pixel-perfect over a tile center to trigger a dig. Any slight offset caused missed digs. |
| **Root cause** | Exact tile match at bucket XZ with no tolerance. |
| **Fix** | Replaced single-tile check with 1-tile radius proximity scan. Checks center tile first, then 8 neighbors. First diggable tile found (DIRT or DIG_TARGET) is removed. |
| **Files** | `src/main.js`, `src/machine/Excavator.js`, `src/terrain/VoxelTerrain.js` |

---

## 9. What Your Teammates Built

### Person 2 — React Dashboard
> [TEAMMATE TO FILL]
>
> List features built, tech used, API endpoints consumed, dashboard screenshots, data visualization approach.

### Person 3 — FastAPI Backend + ML Models
> [TEAMMATE TO FILL]
>
> List endpoints built, ML models trained, database schema, synthetic data generated, prediction/analytics capabilities.

### Person 4 — Assets + Testing + Proposal
> [TEAMMATE TO FILL]
>
> Assets prepared, testing performed, proposal document written, presentation materials created.

---

## 10. Judges One-Pager

**Q: What problem does this solve?**
Heavy equipment operators cause hundreds of construction-site injuries each year due to proximity blind spots and insufficient hazard-response training. Existing programs use passive classroom materials that build awareness but not the reflexive muscle memory needed to prevent real-time incidents.

**Q: What is novel about this solution?**
This is a browser-based 3D training simulator that runs in Chrome with an Xbox controller — no specialized hardware, no installation, no VR headset. Trainees build physical muscle memory for hazard response through repeated game-loop practice with immediate AI-coached feedback.

**Q: Why does the Xbox controller matter?**
The analog sticks and triggers map directly to excavator controls — left stick for drive/steer, right stick for boom/arm, triggers for bucket/dig. Controller vibration creates a physical startle response to proximity hazards, training the same stop-movement reflex needed on a real site.

**Q: How does the closed training loop work?**
Operate (drive, dig, haul) → Score (4-dimension real-time assessment) → Coach (AI debrief identifies weakest skill area) → Improve (replay with targeted focus) → Repeat. Each mission's score posts to the backend, enabling the dashboard to track operator improvement over time.

**Q: What would this look like in a real CAT machine?**
The same scoring engine and proximity detection would run on telematics hardware already installed in CAT equipment. Real GPS, real camera feeds, and real operator inputs would replace the game controller and voxel terrain — but the coaching logic, scoring dimensions, and debrief system transfer directly.

**Q: What is the business value to Caterpillar?**
Reduced training costs (browser replaces expensive simulator hardware), measurable safety outcomes (scored performance data per operator), scalable deployment (any laptop with Chrome and a controller), and a data pipeline that connects individual operator performance to fleet-wide safety analytics.

---

*Generated for Caterpillar Hackathon Submission — September 2026*
