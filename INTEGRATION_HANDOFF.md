# CAT Operator Guardian — Integration Handoff

Internal engineering document. Last updated: 2026-09-24.

---

## 1. Quick Start

**Prerequisites:** Node.js >= 18, npm >= 9.

```bash
git clone https://github.com/Sufi-S/CAT-Hackthon.git
cd CAT-Hackthon
npm install
npm run dev
```

Dev server starts on **http://localhost:3000** (configured in `vite.config.js`, auto-opens browser).

**What you should see:** A sky-blue background with a 24x24 voxel construction site, a yellow CAT excavator, a "PRE-START SAFETY CHECK" modal in the center. If you see that modal with three checklist items and a "Start Operation" button, the game loaded correctly.

---

## 2. Embedding in the React Dashboard

### Static build

```bash
npm run build
```

Produces a `dist/` folder with `index.html`, `assets/index-*.js` (~521 KB), and `assets/index-*.css` (~5 KB). These are fully self-contained static files that can be served from any HTTP server or embedded in a larger app's public directory.

### iframe embedding (recommended)

The game expects to own the full viewport of its container. Embed via iframe:

```jsx
<iframe
  src="http://localhost:3000"
  title="CAT Operator Guardian"
  style={{ width: '100%', height: '600px', border: 'none' }}
  allow="gamepad; vibrate"
/>
```

For production, point `src` at wherever the `dist/` static build is served from.

### URL parameters

**None.** The game does not currently read any URL query parameters. There is no `?operator=` param — the operator ID is hardcoded as `'alex'` in `src/systems/MissionSystem.js:274`. If you need a dynamic operator ID, that line is the place to wire it up (e.g., read from `URLSearchParams` and pass it through to the MissionSystem constructor).

### Port configuration

Dev server: port 3000 (change in `vite.config.js` line 7). The game itself has no port dependency — it's a static frontend that makes API calls to a configurable backend URL (see Section 3).

---

## 3. Backend API Contract

All API calls originate from `src/network/TelemetryClient.js`. Backend URL defaults to **`http://localhost:8000`** (constructor parameter, line 2). To change it, modify the default value on that line or pass a different URL when constructing TelemetryClient in `src/main.js:17`.

### Endpoint 1: `POST /safety/event`

**Called by:** `ProximitySystem.js`

**When it fires:**
- On every NEW proximity hazard entry (excavator enters HIGH risk zone near a worker NPC) — fires once per incident, not per frame
- On proximity hazard resolution (excavator moves back to SAFE from HIGH)

**Payload — hazard entry** (`_logIncident`, ProximitySystem.js:140):
```json
{
  "type": "proximity_hazard",
  "worker_id": "worker_1",
  "distance": 2.3,
  "machine_speed": 4.5,
  "timestamp": "2026-09-24T10:30:00.000Z",
  "session_id": "session_1727193000000"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `type` | `string` | Always `"proximity_hazard"` |
| `worker_id` | `string` | NPC identifier, e.g. `"worker_1"`, `"worker_2"`, `"worker_3"` |
| `distance` | `number` | Distance in world units at time of incident |
| `machine_speed` | `number` | Excavator speed at time of incident |
| `timestamp` | `string` | ISO 8601 |
| `session_id` | `string` | Format: `"session_"` + epoch ms |

**Payload — hazard resolved** (ProximitySystem.js:103):
```json
{
  "type": "proximity_resolved",
  "worker_id": "worker_1",
  "distance": 8.5,
  "timestamp": "2026-09-24T10:30:05.000Z",
  "session_id": "session_1727193000000"
}
```

Same shape minus `machine_speed`.

### Endpoint 2: `POST /training/score`

**Called by:** `MissionSystem.js`

**When it fires:** Once, when a mission completes (timer expires or all objectives met). Fires from `completeMission()` at MissionSystem.js:273.

**Payload** (MissionSystem.js:273-285):
```json
{
  "operator_id": "alex",
  "mission_id": "quick_shift",
  "safety": 85,
  "fuel": 92,
  "idle": 78,
  "task": 100,
  "total": 88,
  "duration_sec": 180,
  "incidents": 2,
  "timestamp": "2026-09-24T10:33:00.000Z",
  "session_id": "session_1727193000000"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `operator_id` | `string` | Currently hardcoded `"alex"` |
| `mission_id` | `string` | One of: `"quick_shift"`, `"full_shift"`, `"safety_focus"` |
| `safety` | `number` | 0-100, rounded integer |
| `fuel` | `number` | 0-100, rounded integer |
| `idle` | `number` | 0-100, rounded integer |
| `task` | `number` | 0-100, rounded integer |
| `total` | `number` | 0-100, weighted composite score |
| `duration_sec` | `number` | Seconds elapsed in mission, rounded |
| `incidents` | `number` | Count of proximity hazard incidents |
| `timestamp` | `string` | ISO 8601 |
| `session_id` | `string` | Format: `"session_"` + epoch ms |

### Endpoint 3: `POST /telemetry/event`

**Defined but never called.** The method `postTelemetryEvent()` exists in TelemetryClient.js:48 but no code in the codebase invokes it. It's a stub for future use. The backend can implement this endpoint or ignore it — nothing will hit it.

### Offline behavior

If any POST fails (network error, backend down), the failed request is pushed to an in-memory `offlineQueue` array. A retry loop runs every **10 seconds** (`setInterval` in constructor, line 8) and re-attempts all queued items. Successfully sent items are removed; still-failing items stay in the queue. The queue is in-memory only — it does not persist across page reloads.

---

## 4. Controls Reference

InputManager (`src/input/InputManager.js`) auto-switches between gamepad and keyboard. Gamepad takes priority if connected AND had any input within the last 2 seconds; otherwise falls back to keyboard.

### Xbox Controller (GamepadController.js)

| Input | Action |
|-------|--------|
| Left Stick X/Y | Steer / Forward-Reverse |
| Right Stick X | Arm angle + swing |
| Right Stick Y | Boom angle |
| RT (right trigger) | Dig (bucket curl + dig trigger) |
| LT (left trigger) | (Available, mapped but unused by game) |
| A button | Dump payload |
| B button | (Mapped, available) |
| LB | Cycle camera mode |
| Start | Begin seatbelt check / menu navigation |
| DPad Up/Down | Mission select navigation |

### Keyboard (KeyboardController.js)

| Key | Action |
|-----|--------|
| W / S | Forward / Reverse |
| A / D | Steer Left / Right |
| Arrow Up/Down | Boom angle |
| Arrow Left/Right | Arm angle + swing |
| Space | Dig (equivalent to RT) |
| Shift (left or right) | (Equivalent to LT) |
| E | Dump payload (equivalent to A) |
| Q | (Equivalent to B) |
| Tab | Cycle camera mode (equivalent to LB) |
| Enter | Start / menu confirm |
| 1 / 2 | DPad Up / Down (mission select) |

All mapped keys have `preventDefault()` applied to avoid browser shortcuts (Tab, Space scroll, etc.).

---

## 5. Current Feature Status

### Terrain Generation — WORKING
24x24 grid with ROCK borders, GRAVEL interior, a 5x6 DIRT patch (rows 5-9, cols 5-10) containing 5 randomly placed DIG_TARGET tiles, a 3x5 DUMP_ZONE (rows 14-16, cols 14-18), and 6 random interior ROCK obstacles. InstancedMesh rendering for all tile types except DIG_TARGET (individual meshes with emissive glow).

### Excavator Movement — WORKING
Heading-based steering with collision detection against ROCK tiles. Joint controls (boom, arm, bucket, swing) driven by right stick / arrow keys. Fuel consumption and idle timer tracked per frame.

### Camera Modes — WORKING
Three modes cycled via LB/Tab: OVERVIEW (static overhead), FOLLOW (chase cam behind excavator), CAB (first-person from cab). Labels shown in HUD.

### Worker NPCs + Proximity Hazard — WORKING
Three NPC workers on fixed patrol paths. ProximitySystem computes distance to nearest worker each frame, triggers three risk levels (SAFE > 8m, MEDIUM 4-8m, HIGH < 4m) with visual alerts, controller vibration at HIGH, and telemetry event logging. Incident count tracked for scoring.

### Digging Mechanic — KNOWN ISSUE
The dig system uses a state machine (`idle` -> `cooldown`) with 400ms cooldown to prevent multi-tile removal per press. On each dig trigger (rising edge of Space/RT), it searches center tile + 4 cardinal neighbors for the closest diggable tile, with a two-pass priority system: DIG_TARGET tiles are always preferred over plain DIRT tiles.

**Known issue:** Human testing reported the DIG_TARGET priority is "a little better but not much" — the player sometimes still digs a DIRT tile when aiming for an adjacent DIG_TARGET. This likely needs further investigation into the distance calculation or search radius. The mechanic works (tiles are removed, payload increments, scoring tracks digs) but target selection accuracy is not fully resolved.

### Dump Mechanic — PARTIALLY WORKING (best-effort fix, not fully confirmed)
Pressing E/A on the dump zone resets payload to 0, increments dump count, and spawns 3-5 small brown chunk meshes at Y=0.3 with `transparent: true, depthWrite: false`. Chunks hold at full opacity for 0.8s, then linearly fade over 0.7s, then are removed from the scene and disposed.

The blue dump zone pad visibility was fixed by moving the brown subsurface plane from Y=-0.1 to Y=-1.0 so it no longer occludes the DUMP_ZONE tiles at Y=-0.9. This fix has not been confirmed by manual testing as of this handoff.

The dump chunk visual effect was rewritten from scratch (replacing a broken setTimeout-based implementation). The code is logically correct but browser visual confirmation is pending.

### Mission System — WORKING
Three missions: `quick_shift` (3 min, 3 digs + 1 dump), `full_shift` (5 min, 5 digs + 2 dumps + fuel), `safety_focus` (4 min, safety + idle focus). Menu selection via DPad/1-2 keys, timer countdown, objective tracking, debrief screen with per-dimension scores and feedback text. Score posted to backend on completion.

### Scoring System — WORKING
Four dimensions: Safety (penalized by proximity incidents), Fuel Efficiency (penalized by consumption rate), Activity/Idle (penalized by idle time), Task Completion (tracks dig count vs objective threshold). Composite weighted score computed per mission config.

### Input System — WORKING
Keyboard + Xbox gamepad with auto-switching via InputManager. HUD indicator updates every frame in all game states (menu, playing, complete) showing "Input: Xbox Controller" or "Input: Keyboard". Temporary debug log prints input source once per second to console for verification.

---

## 6. Known Issues / Not Yet Fixed

- **Dig target selection accuracy:** Two-pass priority logic (DIG_TARGET first, then DIRT fallback) is implemented but human testing suggests it's not reliably selecting the intended tile. Likely needs either a larger search radius for DIG_TARGET specifically, or a visual indicator showing which tile WILL be dug before confirming. **Does not block integration** — this is gameplay polish. The dig mechanic itself works (tiles are removed, counts increment, API payloads are correct).

- **Dump chunk visibility unconfirmed:** The chunk spawning code is logically correct (fresh geometry, transparent material, depthWrite:false, Y=0.3 above dump zone surface). The prior "chunks never appear" symptom was likely caused by the subsurface plane occluding them plus missing depthWrite:false. Both are now fixed in code but awaiting browser confirmation. **Does not block integration** — the dump trigger fires, payload resets, backend POST happens regardless of visual effect.

- **Blue dump zone pad visibility unconfirmed:** SubSurface plane moved from Y=-0.1 to Y=-1.0 to stop it from occluding the flat DUMP_ZONE tiles. Code-level fix is correct but no browser screenshot to confirm. **Does not block integration.**

- **Temporary debug logs in production code:** `[DIG]`, `[DUMP]`, and `[INPUT]` console.log statements are present for debugging. Remove before final demo or production deploy — they're harmless but noisy.

- **Operator ID hardcoded:** `"alex"` in MissionSystem.js:274. Needs parameterization if the dashboard needs to identify different operators.

None of these issues affect the API contract, telemetry payload shapes, or embedding mechanism. Integration work can proceed in parallel with gameplay fixes.

---

## 7. File Map

### `src/main.js`
Entry point. Creates all systems, runs the game loop (requestAnimationFrame), wires input -> excavator -> terrain -> scoring -> HUD.

### `src/scene/`
- **SceneManager.js** — Three.js scene, renderer, camera, lighting setup. Three camera modes. Renders to `#game-canvas`.

### `src/terrain/`
- **VoxelTerrain.js** — 24x24 grid generation, tile type management, InstancedMesh rendering, tile removal (dig), dump chunk spawning/fading, coordinate conversion (worldToTile / tileToWorld).

### `src/machine/`
- **Excavator.js** — Excavator model (chassis, cab, boom, arm, bucket), movement physics, joint control, dig state machine (tryDig), dump trigger (tryDump), fuel/idle tracking, telemetry snapshots.

### `src/input/`
- **GamepadController.js** — Browser Gamepad API wrapper, button state tracking, edge detection, vibration.
- **KeyboardController.js** — Keyboard input with WASD/Arrow/Space/Shift/E/Q/Tab/Enter/1/2 mappings, edge detection via per-frame snapshots.
- **InputManager.js** — Wraps both controllers, auto-switches based on 2-second gamepad activity window, exposes unified getInputState().

### `src/npcs/`
- **WorkerNPC.js** — NPC workers that patrol fixed waypoint paths on the terrain.

### `src/systems/`
- **ProximitySystem.js** — Distance calculation to nearest worker, risk level classification (SAFE/MEDIUM/HIGH), visual alerts, vibration, safety event telemetry.
- **ScoringSystem.js** — Four-dimension scoring (safety, fuel, idle, task) updated per frame.
- **MissionSystem.js** — Mission definitions, selection screen, timer, objective tracking, debrief screen, score submission to backend.

### `src/ui/`
- **HUD.js** — DOM-based overlay showing fuel, speed, idle time, payload, engine status, score bars, mission timer, input source indicator.

### `src/network/`
- **TelemetryClient.js** — HTTP POST client for safety events and training scores. Offline queue with 10-second retry. **Do not modify** — this is a contract with the backend team.

---

## 8. Who to Ask

This module was built by the CAT Operator Guardian hackathon team (Sufi-S). Contact for questions about game internals, Three.js rendering, or the telemetry contract.
