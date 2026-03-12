# Sign Language 3D Viewer

A Next.js 14 App Router application that renders smooth 3D animated humanoid characters driven by sign language keypoint sequences (MediaPipe/BlazePose format).

## Features

- 🤖 **3D Character Rendering** — Mixamo-rigged GLTF/GLB model with real-time skeleton retargeting
- 🖐️ **Hand Retargeting** — Full 21-landmark MediaPipe hand → finger bone mapping with curl estimation
- 💪 **Upper Body Animation** — Shoulders, elbows, wrists, spine, neck/head retargeting
- 🦿 **Leg Animation** — Hip → knee → ankle IK approximation
- 🎬 **Video Export** — Record animation to WebM/MP4 using MediaRecorder API
- 📁 **JSON Upload** — Drag-and-drop your own sign data
- 🎮 **Playback Controls** — Play/pause, timeline scrubber, frame counter
- 🌐 **OrbitControls** — Pan, zoom, rotate the camera freely
- ✨ **Smooth Animation** — Quaternion slerp + exponential moving average smoothing

---

## Quick Start

### 1. Install dependencies

```bash
npm install
# or
yarn install
# or
pnpm install
```

### 2. Get a character model

**Option A – Download the free Three.js Soldier model (quick test):**
```bash
chmod +x scripts/download-model.sh
./scripts/download-model.sh
```

**Option B – Use a Mixamo character (recommended for production):**
1. Go to [mixamo.com](https://www.mixamo.com) and sign in (free)
2. Choose a character (Y Bot, X Bot, etc.)
3. Click **Download → FBX for Unity** (T-Pose, no animation)
4. Convert to GLB:
   ```bash
   npx @gltf-transform/cli convert character.fbx public/models/character.glb
   ```

Place the final file at: `public/models/character.glb`

### 3. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — it redirects to `/sign-viewer`.

---

## JSON Input Format

```json
{
  "fps": 30,
  "gloss": "thank you",
  "frames": [
    {
      "pose": [
        [x, y, z, visibility],
        ...
      ],
      "lhand": [
        [x, y, z],
        ...
      ],
      "rhand": [
        [x, y, z],
        ...
      ]
    }
  ]
}
```

- **`pose`**: 33 landmarks × `[x, y, z, visibility]` — MediaPipe/BlazePose world coordinates (meters-ish)
- **`lhand` / `rhand`**: 21 landmarks × `[x, y, z]` — MANO-style hand keypoints
- Coordinate system: Y-up, Z toward camera (standard MediaPipe world output)

### Key pose landmark indices used:
| Index | Joint |
|-------|-------|
| 0 | Nose |
| 11 | Left Shoulder |
| 12 | Right Shoulder |
| 13 | Left Elbow |
| 14 | Right Elbow |
| 15 | Left Wrist |
| 16 | Right Wrist |
| 23 | Left Hip |
| 24 | Right Hip |
| 25 | Left Knee |
| 26 | Right Knee |
| 27 | Left Ankle |
| 28 | Right Ankle |

---

## File Structure

```
sign-language-viewer/
├── app/
│   ├── layout.tsx              # Root layout
│   ├── globals.css             # Global styles
│   ├── page.tsx                # Root → redirect
│   └── sign-viewer/
│       └── page.tsx            # Main viewer page
├── components/
│   ├── ThreeScene.tsx          # R3F canvas + character + controls
│   ├── PlayerControls.tsx      # Play/pause/scrub/export UI
│   └── FileUploader.tsx        # Drag-and-drop JSON loader
├── lib/
│   ├── retargeting.ts          # MediaPipe → Mixamo bone mapping
│   ├── demoData.ts             # Synthetic "thank you" animation
│   └── useVideoExport.ts       # MediaRecorder video capture hook
├── types/
│   └── index.ts                # TypeScript interfaces
├── public/
│   └── models/
│       └── character.glb       # ← Place your model here
└── scripts/
    └── download-model.sh       # Helper to fetch a test model
```

---

## Bone Retargeting Logic

### Overview
Retargeting converts MediaPipe world-space keypoint coordinates into Mixamo bone quaternions.

### Step-by-step

1. **Hip/Root**: Torso twist is extracted from the angle between the hip vector and shoulder vector. The hips bone gets this twist quaternion.

2. **Spine**: Direction from hip-center to shoulder-center becomes the spine axis. A quaternion is computed to rotate the rest-pose up-vector to this spine direction.

3. **Upper Arms**: Each arm bone gets a rotation computed by pointing from shoulder → elbow. `computeBoneRotation()` builds a rotation matrix from the bone direction + up-hint, then extracts a quaternion.

4. **Forearms**: Same approach: elbow → wrist direction.

5. **Head/Neck**: Shoulder-center → nose direction sets the head orientation.

6. **Legs**: Hip → knee and knee → ankle each get a `lookAt`-style rotation.

7. **Fingers** (most complex):
   - Each of the 5 fingers has 3 bone segments (proximal, medial, distal)
   - For each segment, `computeBoneRotation(start, end)` computes the bone's world-space orientation
   - Additionally, `estimateFingerCurl()` calculates the total bend angle across the finger for haptic feedback visualization

8. **Smoothing**: After retargeting, an exponential moving average (EMA) is applied with `α=0.4` using quaternion slerp. This eliminates jitter from noisy keypoint data.

9. **Frame Interpolation**: Between frames, a secondary slerp at fractional `frameIndex` provides sub-frame smoothness.

### Bone name format
All Mixamo bones follow the `mixamorigBoneName` naming convention (e.g., `mixamorigLeftArm`, `mixamorigRightHandIndex2`).

---

## Video Export

The export system uses the **MediaRecorder API** + `canvas.captureStream()`:

1. User clicks **Export** → animation is driven frame-by-frame
2. A `MediaStream` is captured from the WebGL canvas at the original FPS
3. `MediaRecorder` encodes the stream (WebM/VP9 preferred, fallback to VP8)
4. Progress is shown during recording
5. Final blob is offered as a download

**Supported output formats** (browser-dependent):
- `video/webm;codecs=vp9` (Chrome, Edge)
- `video/webm;codecs=vp8`
- `video/webm`
- `video/mp4` (Safari 14.1+)

---

## npm packages to install

```bash
npm install \
  next@^14.2.0 \
  react@^18.3.0 \
  react-dom@^18.3.0 \
  three@^0.168.0 \
  @react-three/fiber@^8.17.0 \
  @react-three/drei@^9.109.0

npm install -D \
  @types/node \
  @types/react \
  @types/react-dom \
  @types/three \
  typescript
```

---

## Extending the Project

### Add real Mediapipe inference
```typescript
// In your data pipeline:
import { Pose, Hands } from "@mediapipe/holistic";
// Run holistic on video, then pass world landmarks as SignData frames
```

### Custom Mixamo bone names
If your model uses different bone names, edit the `MIXAMO_BONES` map in `lib/retargeting.ts`.

### Improve IK
Replace the direct rotation approach with a FABRIK or CCD IK solver for more realistic elbow/knee bending. Consider [three-ik](https://github.com/jsantell/THREE.IK).

### Add audio
Sync text-to-speech or sign language audio tracks using the Web Audio API alongside the animation timeline.
