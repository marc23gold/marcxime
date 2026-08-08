# 3D Models, Lighting, and Styling Notes

Reference notes for future edits to the marcxime site — a portfolio for a
software engineer / musician / artist. The site shows a 3D scene (three.js +
React Three Fiber): a rotating pool of pieces lit by an orbiting colorful
spotlight with a projected gobo map and shadows (modeled on three.js
`webgl_lights_spotlight`).

**Current state (branch `random-statue`):** on each page load, `App.jsx` randomly
picks one of two lazy-loaded scenes — `Lucy` (sculpture) or `Laptop` — each a
full-screen Canvas. See "Current setup" below.

Current entry point: `src/App.jsx` → random picker → one of
`MarbleSpotlight.jsx` / `LaptopStatue.jsx`.

---

## Design language & visual effects

### One-line intent
**Warm, grainy, cinematic film** — a 3D artifact spotlit in a dark room, graded
like a still from an old film: soft bloom on the highlights, visible warm grain,
a whisper of halftone print texture, and delicate cream film-title typography.
Reads *filmic and hand-developed*, not crisp digital video or neon.

### Mood keywords (target)
- Warm · grainy · soft · dreamy · cinematic · hand-made · print-shop texture
- **Avoid:** cold/clinical, crisp/glossy, TV-static scanlines, comic-book dots,
  neon glow, tacky gold/gradient type, glitch/RGB-split.

### Palette
| Token | Hex | Use |
|---|---|---|
| Night background | `#0b0b0d` | page/canvas backdrop (the dark "theater") |
| Warm cream (title) | `#f0e9d8` | H1 + tagline |
| Soft cream (links) | `#e9e4db` | footer link (hover → `#ffe9b0`) |
| Riso ink wash | gold `#ffa860` → rose `#ff505a` → oil-teal `#769cff` | `.riso` gradient (soft-light) |

### Typography
- **Cormorant Garamond** (elegant high-contrast film-title serif), self-hosted via
  `@fontsource/cormorant-garamond` (300 / 400 / 500 + italics). Loaded in `src/main.jsx`.
- Title: **500**, uppercase, tracked `0.18em`, warm cream — reads as a classic film
  **title card**. Tagline: **400 italic**. Footer: **400**.
- Text is **selectable** (`user-select: text`) so the title/tagline can be copied.
- **Lessons:** a delicate high-contrast serif fits the grain; plain Lora felt flat, and
  Cormorant SC + gold gradient and glitch/RGB-split read "tacky" — both removed.

### Effects stack (applied over every scene)
`src/Grain.jsx` — an `EffectComposer` (from `@react-three/postprocessing`), in order:

1. **Cinematic bloom** — the hero. `<Bloom>` `intensity 0.85`, `luminanceThreshold 0.55`,
   `luminanceSmoothing 0.6`, `mipmapBlur`, `radius 0.85`. Low threshold means the whole
   frame soft-glows, not just white-hot points → dreamy lift that also "brightens" the dark scene.
2. **Warm film grain** — `<Noise premultiply opacity={0.22}>`. Fine, animated
   (`rand(uv*(1.0+time))`), clearly visible = the "grainy film" hero.
3. **Halftone (dot-screen)** — `<DotScreen scale 6, opacity 0.06, SOFT_LIGHT>`.
   High `scale` = many tiny dots; kept at a whisper so it textures, never reads as print/comic.
4. **Vignette** — `<Vignette darkness 0.2, offset 0.35>` — gentle, keeps the frame bright.

`src/App.css` `.riso` overlay — a fixed **risograph grain "light"** layer (soft-light,
`z-index 3`, pointer-events none): an animated SVG `feTurbulence` fractal-noise mask
(`rec opacity 0.7`) over a warm **riso-ink gradient** (gold/rose/oil-teal), jittered by
`@keyframes risoDrift` in steps → dancing, off-registration print texture.

### 3D lighting
A single **orbiting colorful spotlight** (`SpotLight` + generated `spotLight.map` gobo
texture, projected light pool + shadows) — modeled on three.js
`webgl_lights_spotlight`. `NeutralToneMapping`, hemisphere fill light, dark stage floor.

### Tuning knobs (quick levers)
- `src/Grain.jsx` — bloom `intensity`/`luminanceThreshold` (more/less glow), `Noise`
  `opacity` (grain amount), `DotScreen` `scale`/`opacity` (halftone fineness/strength),
  `Vignette` `darkness`.
- `src/App.css` `.riso` `opacity` / `rec opacity` — riso grain intensity.
- `src/App.css` `.title` — tracking, weight, size, color.

### Effects history (what didn't fit, why removed)
- **Scanline/strong noise** → read as retro TV, not film.
- **Periodic glitch / RGB-split title** → fought the warm mood; removed.
- **Gold gradient / glow type, Cormorant SC** → too ornate/tacky; dropped for plain cream.

---

## Current setup: `random-statue` branch

One branch keeps **all the pieces together**. `App.jsx` code-splits and randomly
loads one scene per visit, so the page only downloads the chosen piece's JS chunk
+ model.

- Pool: `MarbleSpotlight` (Lucy), `LaptopStatue`, each a self-contained
  `<Canvas>` ready to drop into the list. (The horse statue was removed — it
  loaded slowly and failed to appear on the deployed site.)
- Random picker uses `useState(() => pickScene(SCENES))` → one choice per load.
- **Mobile weighting** (`src/mobile.js` detects `(pointer: coarse)`): lighter
  scenes get higher weight on phones (Lucy `2×`, laptop `1×`; desktop `1:1`).

### Adding / changing a piece in the pool
1. Add the model to `public/models/<slug>/` (folder structure intact for glTF).
2. Add a `<X>Statue.jsx` scene (copy an existing one; change `MODEL_URL`, plinth,
   `scale`/`position` from the model's bounds).
3. In `App.jsx`: lazy-import it and add `{ Comp: XStatue, weight: … }` to `SCENES`.
4. Remove the old piece's component + model folder if replacing it.

### Performance optimizations (done on `random-statue`)
- **Lazy loading** — `React.lazy` + `<Suspense>` splits each scene into its own
  chunk; only the chosen chunk + model downloads.
- **Mobile budget** (`src/mobile.js`): DPR `[1,1.5]` vs `[1,2]`, spotlight shadow
  map `512²` vs `1024²`, dust `150` vs `350` motes.
- **Asset size** is now ~1.0 MB total for both models:
  - Lucy: **1.9 MB PLY → 721 KB GLB** at ~40k tris (see Lucy decimation below).
  - Laptop: **5.7 MB → ~950 KB** — textures re-encoded 2K→1K (`PIL`, q80).
  - Horse: removed (loaded slowly and failed to render on the deployed site).

### Portfolio framing (engineer / musician / artist)
One piece per discipline makes the rotating pool say "who I am":
- **Artist** → Lucy (or a marble sculpture).
- **Engineer** → the classic laptop (retro-tech artifact signalling software).
- **Musician** → *(missing)* — add a music-themed piece (vinyl/keyboard/piano)
  so all three pillars are represented. Sources: Smithsonian, Sketchfab (CC),
  Quaternius (CC0), Poly Haven (CC0).

### History / other branches
- `statue/horse`, `statue/hands`, `statue/hands-adam`, `statue/marble-bust` are
  older per-model experiments. `statue/hands-adam` holds a **failed blind-posed**
  "Creation of Adam" hands attempt (see Blender posing note below).
- The hands were later **replaced by the laptop** in the `random-statue` pool.

---

### Cinematic finishing layer (film grain, riso, halftone, bloom, type)

Applied on `random-statue` over every scene in the pool:

- **Cinematic bloom** — `src/Grain.jsx`: the `EffectComposer` centers on a soft
  `<Bloom>` (`intensity 0.85`, `luminanceThreshold 0.55`, `luminanceSmoothing 0.6`,
  `mipmapBlur`, `radius 0.85`) that lifts the whole frame into a gentle dreamy glow —
  the hero of the warm film look.
- **Warm film grain** — same composer layers `<Noise premultiply opacity={0.22}>`
  (animated — shader is `rand(uv*(1.0+time))`) — **this is the "grainy film" hero** —
  plus a light `<Vignette darkness={0.2}>`. The CSS `.riso` overlay (rec `opacity 0.7`)
  adds the animated risograph fractal-noise grain on top. **Lesson:** scanlines +
  strong noise read as a retro TV, not film — remove `Scanline`; keep grain fine and
  warm, just clearly visible.
- **Halftone (dot-screen) pass** — a whisper of `<DotScreen>` print texture:
  `scale 6`, `angle π/4`, `opacity 0.06`, blended `SOFT_LIGHT`. High `scale` = many
  tiny dots; kept this faint so it never reads as print/comic. If dots still read too
  big, raise `scale` further (finer) and/or drop `opacity`.
  `@react-three/postprocessing` v3 has **no `Halftone` wrapper** and the raw
  `postprocessing` v6 dropped `HalftoneEffect` — `DotScreen` is the equivalent
  halftone screen to use here. `BlendFunction` is imported from `postprocessing`.
- **Risograph grain overlay** — a fixed `.riso` div (soft-light blend, `z-index 3`,
  pointer-events none) combining an animated SVG `feTurbulence` fractal-noise layer
  with a **warm riso-ink gradient** (gold/rose/oil-teal). `@keyframes risoDrift`
  jitters it in steps — dancing, off-registration print texture.
- **Periodic glitch (removed)** — a color-split RGB glitch burst on the title was
  cut — it fought the warm film mood. The title is now clean and cinematic.
- **Typography** — **Cormorant Garamond** (elegant high-contrast film-title serif)
  self-hosted via `@fontsource` (300 / 400 / 500 + italics). Title: Cormorant 500
  uppercase, softly tracked caps (`0.18em`), plain warm cream `#f0e9d8` (gradient/glow
  versions were too ornate — removed). Tagline: Cormorant 400 italic. Body/footer:
  Cormorant 400. **Lesson:** a delicate high-contrast serif reads "film title card"
  and fits the warm grain better than a plain book serif like Lora.
- **Text selectability** — the title is now **selectable** (`user-select: text`,
  `cursor: text`), so "marcxime" and its tagline can be copied. This means the
  top-center strip no longer passes drags through to the 3D canvas (it used to have
  `pointer-events: none`); the footer link stays selectable too.
- New deps: `@react-three/postprocessing`, `@fontsource/cormorant-garamond`.

---

## Afterimage effect (experiment: `experiment/afterimage` branch)

A **cinematic afterimage / motion-trail** pass: when the user rotates or drags the
statue (OrbitControls), the bright moving highlights smear into a soft, exponentially
decaying afterglow that fades back to the crisp frame over ~a second. When the camera is
still, static content stays perfectly crisp (`max()` keeps the current frame), so there
is **no visible ghosting at rest** — trails only appear during interaction, which is the
desired behavior.

**Why custom:** `@react-three/postprocessing` v3 has no `Afterimage` wrapper, and the raw
`postprocessing` v6 **removed both `AfterimageEffect` and `FeedbackBuffer`** — they existed
only in ≤ v5. So the effect is rebuilt on top of the v6 `Effect` API (`src/Afterimage.jsx`),
registered with `wrapEffect`, and stacked inside the existing `<EffectComposer>` in
`src/Grain.jsx` (after Bloom, so the trails inherit the dreamy glow).

### How the feedback loop works
`Effect.update(renderer, inputBuffer, deltaTime)` is called by postprocessing **right before
the effect's own fullscreen pass** runs — that ordering is what makes a feedback effect
possible inside a normal (non-special) pass chain:

1. Ping-pong **two** `WebGLRenderTarget`s (`_read`, `_write`).
2. In `update`, render a fullscreen quad (plain `ShaderMaterial` on a `PlaneGeometry(2,2)`
   with an ortho camera) into `_write`:
   `newA = max(currentFrame, oldAccumulation × damping)`.
3. Swap `_read`/`_write`; the freshly accumulated texture is now the stored frame.
4. The effect's own fragment shader just draws that stored accumulation back onto the
   screen with `BlendFunction.NORMAL` (opacity 1) → the frame becomes current + fading trails.

`damping` is a **per-frame multiplier** on the stored accumulation (≈ exponential decay).
Lower `damping` = shorter trails.

### postprocessing v6 API gotchas (verified, cost a debug cycle)
- **Effects MUST define `mainImage(const in vec4 inputColor, const in vec2 uv, out vec4
  outputColor)` (or `mainUv`)**, NOT a bare `void main()`.
  Failure = runtime error `Could not find mainImage or mainUv function (AfterimageEffect)`
  thrown from `EffectPass.initialize`, which (with no error boundary) blanked the whole page
  in React 19. Use this shape:
  ```glsl
  uniform sampler2D tOld;
  void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
    outputColor = texture2D(tOld, uv);
  }
  ```
- The composer injects `uniform sampler2D inputBuffer;` into every effect shader, but you
  don't need it here — the feedback reads the current frame in `update` from
  `inputBuffer.texture` directly.
- The plain three.js `ShaderMaterial` feedback quad can use classic GLSL1 (`varying`,
  `texture2D`) — three auto-upgrades it for WebGL2.

### Wiring it up
In `src/Grain.jsx`'s `<EffectComposer>`, after `<Bloom>`:
```jsx
import { Afterimage } from './Afterimage'
// …
<Bloom … />
<Afterimage damping={0.82} />   {/* lower = shorter trails; 1 = pass-through/off */}
```
`Afterimage` is `wrapEffect(AfterimageEffect)`, so props (`damping`, `blendFunction`,
`opacity`) map straight onto the constructor. Order matters: place it after Bloom so the
bloomed highlights are what trail.

### Full source — `src/Afterimage.jsx`
```jsx
import * as THREE from 'three'
import { Effect, BlendFunction } from 'postprocessing'
import { wrapEffect } from '@react-three/postprocessing'

const FEEDBACK_FRAGMENT_SHADER = /* glsl */ `
  uniform sampler2D tNew;
  uniform sampler2D tOld;
  uniform float damping;
  varying vec2 vUv;
  void main() {
    vec3 current = texture2D(tNew, vUv).rgb;
    vec3 previous = texture2D(tOld, vUv).rgb;
    gl_FragColor = vec4(max(current, previous * damping), 1.0);
  }
`

const VERTEX_SHADER = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`

const FRAGMENT_SHADER = /* glsl */ `
uniform sampler2D tOld;
void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  outputColor = texture2D(tOld, uv);
}
`

class AfterimageEffect extends Effect {
  constructor({ blendFunction = BlendFunction.NORMAL, opacity = 1, damping = 0.85 } = {}) {
    super('AfterimageEffect', FRAGMENT_SHADER, {
      blendFunction, opacity,
      uniforms: new Map([
        ['damping', new THREE.Uniform(damping)],
        ['tOld', new THREE.Uniform(null)],
      ]),
    })
    this._read = null
    this._write = null
    this._feedbackMaterial = new THREE.ShaderMaterial({
      vertexShader: VERTEX_SHADER,
      fragmentShader: FEEDBACK_FRAGMENT_SHADER,
      uniforms: { tNew: { value: null }, tOld: { value: null }, damping: { value: damping } },
      depthTest: false,
      depthWrite: false,
    })
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this._feedbackMaterial)
    mesh.frustumCulled = false
    this._scene = new THREE.Scene()
    this._scene.add(mesh)
    this._camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
  }

  initialize(renderer, alpha, frameBufferType) {
    super.initialize?.(renderer, alpha, frameBufferType)
    const { width, height } = renderer.getSize(new THREE.Vector2())
    this._read = new THREE.WebGLRenderTarget(width, height, { depthBuffer: false })
    this._write = new THREE.WebGLRenderTarget(width, height, { depthBuffer: false })
  }

  setSize(width, height) {
    if (this._read) this._read.setSize(width, height)
    if (this._write) this._write.setSize(width, height)
  }

  update(renderer, inputBuffer) {
    if (!this._read) return
    this._feedbackMaterial.uniforms.tNew.value = inputBuffer.texture
    this._feedbackMaterial.uniforms.tOld.value = this._read.texture
    const previous = renderer.getRenderTarget()
    renderer.setRenderTarget(this._write)
    renderer.render(this._scene, this._camera)
    renderer.setRenderTarget(previous)
    const swap = this._read
    this._read = this._write
    this._write = swap
    this.uniforms.get('tOld').value = this._read.texture
  }

  dispose() {
    if (this._read) {
      this._read.dispose()
      this._write.dispose()
      this._feedbackMaterial.dispose()
    }
  }
}

export const Afterimage = wrapEffect(AfterimageEffect)
```

### Tuning
- `damping` (0–1): 0.82 gives ~1s trails; closer to 1 = longer persistence, toward 0.9+ the
  whole screen starts to glow/smear on fast motion; below ~0.7 trails are barely visible.
- Place before or after grain/other effects to choose whether the trails inherit them.
- Source: `src/Afterimage.jsx`. Experiment branch: `experiment/afterimage` (created from
  `random-statue`).

---

## How the 3D piece works

- `public/models/Lucy.glb` — the statue model (decimated to ~40k tris, 721 KB; served from `public/`).
- `src/MarbleSpotlight.jsx`:
  - `useGLTF('/models/Lucy.glb')` loads it (wrapped in `<Suspense>`; shadows enabled
    per-mesh via `scene.traverse`).
  - The model `<primitive>` is scaled `0.0024`, positioned `y = 0.8`, rotated `-π/2`.
    (The original 1.9 MB `Lucy100k.ply` PLY route is documented below for reference.)
  - A `SpotLight` **orbits** the statue (`x = cos(t)·2.5, z = sin(t)·2.5`, height `5`),
    `angle = π/6`, `penumbra = 1`, `decay = 2`, `distance = 0`, `intensity = 100`.
  - `spotLight.map` is a generated **colorful gobo texture** that projects the colored
    light pool onto the statue and floor.
  - `NeutralToneMapping`, hemisphere light, floor at `y = -1`, camera `(7, 4, 1)` fov 40.

## Swapping the figure to another PLY

1. Drop a new `.ply` into `public/models/` (e.g. `public/models/MyStatue.ply`).
2. Change the loader URL: `useLoader(PLYLoader, '/models/MyStatue.ply')`.
3. **Re-tune `scale` / `position.y` / `rotation`** — every figure differs. Lucy is a
   full-height figure at `scale 0.0024`, `y 0.8`; a bust or bigger statue needs different
   numbers (just try a `scale` value and reload).
4. Watch for:
   - **Normals** — `Lucy100k.ply` has them. Without normals the Lambert material shades
     flat/wrong; fix with `geometry.computeVertexNormals()`.
   - **Vertex colors** — if the model is color-scanned, the solid marble material ignores
     them; enable `vertexColors` on the material to show them.
   - **ASCII vs binary PLY** — both load fine.

## Adding a glTF / GLB model (glTF flow)

For models that come as `.gltf` + `.bin` + a `textures/` folder (or a single `.glb`),
use drei's `useGLTF` instead of `PLYLoader`. The laptop scene is the reference
example: `src/LaptopStatue.jsx` + `public/models/classic_laptop/`.

1. **Copy the model's folder into `public/models/` preserving its internal structure.**
   The loader resolves the `.bin` and `textures/*.jpg` refs relative to the `.gltf` path,
   so the folder layout must be intact. (A single `.glb` is just one file.)
2. **Load with a Suspense boundary** (glTF loading suspends):
   ```jsx
   import { Suspense, useEffect } from 'react'
   import { useGLTF } from '@react-three/drei'

   const MODEL_URL = '/models/your_model_4k/your_model_4k.gltf'

   function Model() {
     const { scene } = useGLTF(MODEL_URL)
     useEffect(() => {
       scene.traverse((o) => {
         if (o.isMesh) { o.castShadow = true; o.receiveShadow = true }
       })
     }, [scene])
     return <primitive object={scene} scale={10} position={[0, -0.11, 0]} rotation={[0, -Math.PI / 2, 0]} />
   }
   // ...
   <Suspense fallback={null}><Model /></Suspense>
   ```
3. **Size it from the model's accessor bounds.** Read the `.gltf` JSON `accessors` and use
   the POSITION min/max to find the model's height, then pick a `scale` to frame it like
   Lucy (~2 units). The laptop was ~0.45 tall natively, so `scale 3` ≈ 1.35 units on its
   plinth. Seat its base on the floor/plinth via `position.y` (floor top is `y = 0`; stage
   floor is `y = -1`).
4. **Materials carry over.** A glTF usually brings its own PBR textures, so it looks
   different from Lucy's flat marble (e.g. sculpted stone/bronze). To force a uniform marble
   look, override the primitives' materials or hide them via `traverse`.
5. **Caveats:**
   - `useGLTF` suspends → wrap in `<Suspense>`.
   - `castShadow`/`receiveShadow` do **not** propagate from `<primitive>` → set them per-mesh
     via `scene.traverse` (as above).
   - Keep the folder structure intact so texture refs resolve.
   - Model size includes textures — the laptop's 2K JPGs alone were ~5.2 MB
     before they were re-encoded to 1K (~436 KB total).

## Converting a `.blend` with the Blender CLI

`.blend` files can't run in the browser — convert them headless with Blender's
command line (no GUI needed). Blender is installed on this workstation
(`/usr/bin/blender`, v4.0.2).

glTF / GLB (recommended):
```bash
blender -b "input.blend" --python-expr \
  "import bpy; bpy.ops.export_scene.gltf(filepath='out.glb', export_format='GLB')"
```
→ PLY:
```bash
blender -b "input.blend" --python-expr "import bpy; bpy.ops.wm.ply_export(filepath='out.ply')"
```
→ OBJ (4.x):
```bash
blender -b "input.blend" --python-expr "import bpy; bpy.ops.wm.obj_export(filepath='out.obj')"
```

Gotchas:
- Use **absolute paths**; quote names with spaces/`+`.
- Blender 4.x glTF export needs **`numpy`** in Blender's Python. If you hit
  `ModuleNotFoundError: No module named 'numpy'`, install it for the interpreter
  Blender uses (here `/usr/bin/python3.12`):
  `python3.12 -m pip install --break-system-packages numpy`.
- glTF/GLB keeps mesh + **materials**, but **not** Blender's lights/HDRI — the
  site's orbiting spotlight does the lighting. PLY/OBJ lose materials entirely.
- Rigged models export fine (glTF warns if >4 joint influences and normalizes to 4).

Working example — the rigged **hands** (older branch `statue/hands`): converted
`Hands + armature.blend` → `hands_rigged.glb`, loaded with `useGLTF` in
`src/HandsStatue.jsx`. **License:** Blend Swap #92895 "Human Hands with armature"
is **CC0** (public domain, no attribution required) — fine to use commercially.
**Status:** the hands were later **replaced by the laptop** in the `random-statue`
pool, and a scripted "Creation of Adam" hand pose did not work (see "Script-posing
rigged models" below).

## Optimizing glTF / GLB with `@gltf-transform/cli`

Install-free via npx (the package is **`@gltf-transform/cli`**, not `gltf-transform`):
```bash
npx --yes @gltf-transform/cli resize in.gltf out.glb --width 2048 --height 2048
npx --yes @gltf-transform/cli webp out2.glb out3.glb        # convert textures to WebP
```
This is how the horse went 6.0 MB → 1.58 MB (2K + WebP) before it was removed
from the pool. `resize`/`webp` work in place on `.gltf` or `.glb`. (Draco/meshopt
need a client-side decoder — skip unless you wire a DRACOLoader.)

## Decimating & exporting a GLB with Node + three (Lucy)

Lucy (100k tris) was reduced to ~40k tris and exported as a small GLB. Gotchas
worth remembering:

- **`SimplifyModifier.modify(geometry, count)` — `count` is vertices REMOVED, not
  kept.** Lucy has 50,002 verts / 100k tris; `count 30k` → 40k tris,
  `count 45k` → 10k tris, `count ≥ 50,002` → fails ("No next vertex"). The mapping
  is `remaining ≈ 50002 - count`, tris ≈ 2× verts. Calibrate against the input
  vertex count and recompute normals on the result.
- **`GLTFExporter` in Node needs a `FileReader` shim** for `binary: true`. Before
  using it, add a minimal global so `result`/`onloadend` resolve from a Blob:
  ```js
  globalThis.FileReader = class {
    result = null
    readAsArrayBuffer(blob) {
      blob.arrayBuffer().then((buf) => { this.result = buf; if (this.onloadend) this.onloadend() })
    }
  }
  ```
- **Don't edit the source PLY in the repo.** Re-fetch `Lucy100k.ply` to `/tmp`,
  run the decimate/export script, and commit only the resulting `Lucy.glb`.
- Lucy's current file: `public/models/Lucy.glb`, ~721 KB at ~40k tris. To re-tune,
  change the `modify(geom, 30000)` count (lower = finer, e.g. `25000` ≈ 50k tris).

## Script-posing rigged models (the "hands-adam" lesson)

Posing a rigged model into a *specific gesture* (e.g. Michelangelo's Creation of
Adam) is possible — the hands had per-finger control bones (`index control`,
`Major/Ring/Pinky control`) — but doing it **blind from a CLI is unreliable**: bone
rotation axes/signs are guesses without visual feedback, and the environment here
has no vision model to check a render. Result: a malformed first pass on branch
`statue/hands-adam` that the user rejected.

Lesson: for a precise pose, either (a) pose in the **Blender GUI** and hand over the
GLB, or (b) script it but expect several blind iterations driven by user feedback
via `npm run dev`. Bake via pose → `bpy.ops.pose.armature_apply()` → export glTF.
Rigged GLBs also export fine (glTF warns >4 joint influences, normalizes to 4).

## Lucy file size

- Original `Lucy100k.ply` = **1,900,227 bytes** ≈ 1.81 MiB (100k tris). Source:
  Stanford 3D Scanning Repository (`graphics.stanford.edu/data/3Dscanrep/`) or the
  three.js repo `examples/models/ply/binary/Lucy100k.ply` / `Lucy50k.ply`.
- Current `public/models/Lucy.glb` = **721 KB** at ~40k tris (see "Decimating &
  exporting a GLB" above).

## Formats and lighting

Lighting is **format-agnostic** in three.js — every loader produces the same
`BufferGeometry`, so the spotlight/gobo/shadows work the same regardless of format.
What determines whether it *lights well*:

- **Normals** — needed for shading. Compute if missing.
- **Watertight (manifold) mesh** — closed surfaces cast clean shadows.

| Format | Loader | Notes |
|---|---|---|
| **glTF / GLB** | `GLTFLoader`, drei `useGLTF` | Modern standard; PBR materials, scenes, animations. Recommended for the future. `useGLTF('/models/x.glb')` + `<primitive object={scene}>`. |
| OBJ | `OBJLoader` | Common; geometry only, no animation. |
| FBX | `FBXLoader` | Autodesk/animation-oriented. |
| STL | `STLLoader` | 3D-print; **no normals/UVs** — loads flat/faceted unless you `computeVertexNormals` on smooth. |
| Collada (DAE) / 3DS / DXF | `ColladaLoader` / `TDSLoader` / `DXFLoader` | Legacy/design formats. |
| Draco-compressed glTF | `GLTFLoader` + `DRACOLoader` | Smaller GLB files if size matters. |

Rule of thumb: **any format that loads and has (or gets) normals will work with the
lighting.** glTF/GLB is the future-proof choice.

## Where to find free 3D models

### PLY (statue scans)
- **Stanford 3D Scanning Repository** (`graphics.stanford.edu/data/3Dscanrep/`) — Lucy, bunny, dragon, Happy Buddha, armadillo.
- **Smithsonian 3D / Open Access** (`3d.si.edu`) — CC0 real statue/artifact scans (PLY/OBJ/glTF).
- **Three.js repo** (`examples/models/ply/`) — Lucy50k, arma, peppers, etc. Raw via `raw.githubusercontent.com/mrdoob/three.js/dev/examples/models/ply/...`.
- **Poly Haven** (`polyhaven.com`) — CC0 models (mostly glTF/OBJ, some PLY).
- **Sketchfab** — filter "Downloadable" + license; export PLY/OBJ/glTF (free account).
- **Thingiverse / Printables** — free figures but mostly **STL**.

### glTF / GLB (statue figures + general)
- **Smithsonian 3D** (`3d.si.edu`) — best for real statues, CC0, GLB export.
- **Sketchfab** — largest catalog; filter "Downloadable" + CC/CC0, export GLB.
- **Poly Haven** (`polyhaven.com`) — CC0, GLB.
- **Khronos glTF Sample Models** (`github.com/KhronosGroup/glTF-Sample-Models`) — official samples (Duck, DamagedHelmet).
- **Quaternius** (`quaternius.com`) — CC0 low-poly GLB.
- **Kenney.nl** — CC0 asset packs, GLB/glTF.
- **NASA 3D Resources** (`nasa3d.arc.nasa.gov`) — free, some glTF/GLB.
- **Three.js repo** — `examples/models/gltf/` (e.g. DamagedHelmet).

### Licensing
"Free to download" ≠ "free to use commercially." Prefer **CC0 / Public Domain** (Smithsonian,
Poly Haven, Kenney, Quaternius, NASA) or honor attribution for CC-BY models.

---

## Enhancement roadmap (proposed branch: `feature/portfolio-3d`)

Concrete, phased plan (NOT yet implemented). Suggested build order on a fresh
branch off `random-statue`, each phase small and independently reversible.

- **Phase 1 — Premium look (high impact, one afternoon):**
  Bloom (`@react-three/postprocessing` EffectComposer + Bloom), an `Environment`
  + `Lightformer` for glossy reflections, and a glossy reflective floor
  (`drei` `MeshReflectorMaterial`). Make the spotlight/gobo actually glow.
- **Phase 2 — Musician pillar (close the theme gap):**
  Add a music-themed model to the pool (vinyl / keyboard / piano — CC0 from
  Smithsonian/Sketchfab/Poly Haven/Quaternius) and an **audio-reactive
  visualizer**: Web Audio `AnalyserNode` drives a shader/particles from the
  portfolio owner's own track.
- **Phase 3 — Interactivity (engineer credibility):**
  Clickable 3D pieces (raycaster) opening a project modal; hover highlight +
  billboard labels; cursor-follow camera parallax.
- **Phase 4 — Depth:**
  `ScrollControls` 3D gallery walkthrough (camera glides through the space as you
  scroll).
- **Phase 5 — Flex shader (engineer wow):**
  One custom GLSL piece (aurora / galaxy / particle system) for visual flair.
- **Phase 6 — Polish:**
  Preloader via `useProgress`, smooth cinematic camera (`CameraControls` /
  `PresenterControls`), vignette + text fade-in.
- **Each phase:** new commit; keep `random-statue` pool intact as fallback; verify
  build + lint; user eyeballs in `npm run dev`.

---

## Styling ideas (brainstorm — not yet implemented)

The site's current voice: **dark cinematic** (`#0b0b0d` background), **warm gold** accent
(`#ffe9b0`), cream text (`#e9e4db`), **Georgia serif**, minimal layout ("marcxime — a work in
progress", GitHub link).

### Palette / atmosphere
- Keep the dark-warm base; let the colorful spotlight carry the color story.
- Slow the gobo hue to drift between warm-gold, rosedust, and cool teal for a museum-at-dusk feel.
- Add a subtle rim/fill light on the statue so it stays readable when the spotlight swings away.

### Statue / lighting
- Try the real **Lucy scan look** vs. a **Smithsonian marble bust** and pick a signature piece.
- **Portfolio angle:** one piece per discipline — Artist (Lucy), Engineer (laptop),
  **Musician (add: vinyl / keyboard / piano model)** — so the random pool mirrors
  "engineer + musician + artist".
- Swap the generated gobo for a real texture (e.g. a subtle cloud/window-pane pattern) for a
  lantern/tiffany mood.
- Optional: let the spotlight's angle/intensity pulse slowly (breathing light).

### UI / layout
- Add a soft vignette (`radial-gradient` overlay) so the 3D scene feels framed.
- Fade in the title/footer text after the scene loads (there's a Suspense fallback to build on).
- Explore a small corner UI chip (e.g. "Lucy, Stanford" caption) for provenance/legibility.

### Typography / texture
- Keep Georgia for body; try an uppercase tracked serif for the H1 (already close).
- Light grain/noise overlay over the whole page to reinforce the photographic, sculpted feel.

### Motion
- Keep rotation **slow** (the orbitting light already moves; the statue itself can stay mostly
  static for calmness).
- Micro-animations on the title (slow letter-spacing drift) without competing with the scene.

These are starting points — each is a small, isolated change in `App.css`, `App.jsx`, or
`src/MarbleSpotlight.jsx`.
