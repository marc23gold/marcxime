# Project review — marcxime portfolio

A retrospective on what was built, the decisions made, and why. Written after
the site went live at <https://marcxime.com>.

---

## 1. The goal

Stand up a simple personal portfolio at `marcxime.com`, built as a static
Vite + React site with an "impressive Three.js" centerpiece (a statue with a
light beam shining down), and deploy it to a VPS. A secondary goal was to
learn the deployment so it could be repeated without AI later.

---

## 2. What was built and why

### Vite + React scaffold
- Standard `npm create vite` React template. Chosen for a fast, familiar,
  single-page static build with a tiny `dist/` output.
- Added `three`, `@react-three/fiber`, and `@react-three/drei` for the 3D
  scene.

### The Three.js scene — `src/StatueScene.jsx`
- **Statue:** a classical bust (plinth + shoulders + neck + head + nose) made
  from basic Three.js primitives with a marble material. Built from
  primitives (not a downloaded model) so the site is fully self-contained —
  no external asset files or network fetches that could break offline or
  change licensing.
- **Light beam:** a translucent cone rendered additively from a glowing lamp
  down to the statue, plus a `points` cloud of dust motes inside the beam and
  a pulsing opacity animation. This makes the "beam of light" readable in a
  static scene without heavy volume rendering.
- **Auto-rotation + orbit controls:** slow rotation so the whole statue is
  admired; orbit controls let the visitor inspect it.

### The page — `src/App.jsx`
- Full-screen canvas with an overlay: title `marcxime` and a link to
  `github.com/marc23gold`. Kept to exactly what was asked — the statue scene
  plus one link.

### Why a bug appeared and how it was fixed
- During verification the page rendered blank with no errors. Root cause:
  `useFrame` was called in the component that renders `<Canvas>`, but it must
  run *inside* the Canvas. Fixed by moving the rotation into an inner `Rig`
  component. This is the kind of subtle R3F misplacement that silently
  unmounts the tree.

### Verification (not just "looks fine")
- `npm run build` exits 0 → proves it compiles and produces `dist/`.
- Browser-driven checks: the test browser had no GPU, so WebGL2 was missing;
  three.js needs WebGL2. Relaunched with SwiftShader flags, then **sampled
  actual pixels** from the canvas to confirm the statue and light beam render
  (not a blank canvas). This gave a deterministic, non-visual proof.
- Confirmed the DOM shows the title and the GitHub link.

---

## 3. Deployment — why this approach

The VPS (`ubuntu-4gb-hel1-1`) is only reachable over **Tailscale**
(`100.118.128.68`); public SSH to port 22 times out. nginx already served
`marcxime.com` on HTTPS from `/var/www/marcxime`.

Three deployment facts drove the design:

1. **SSH is tailnet-only.** Opening public SSH just for a portfolio CI would
   expand attack surface for no benefit.
2. **The web root was root-owned**, so deployment needed write access for the
   `marc` user (`sudo chown`).
3. **The build is just files** — "deploy" reduces to copying `dist/` into the
   web root.

### Chosen path — GitHub Actions + `tailscale/github-action`
- The workflow `.github/workflows/deploy.yml` builds the site, joins the
  runner to the tailnet via the official `tailscale/github-action` (using an
  **OAuth client**, not a static auth key), then `rsync`s `dist/` into the
  web root over SSH. Keeping SSH tailnet-only is the more secure choice and
  matches how the VPS is already accessed.
- **Why rsync + a static dir rather than anything more exotic:** the site is
  static; serving files from a folder is the simplest possible mechanism, and
  rsync gives cheap, atomic-ish updates with `--delete` keeping the mirror
  exact.

### The one-time manual step that blocked the run
- The deploy couldn't actually finish until:
  a) the web root was writable (`sudo chown -R marc:marc /var/www/marcxime`),
  b) a Tailscale OAuth client existed for the runner to join the tailnet.
- (a) was unblocked by the user running the one sudo command. (b) is a
  credential only the user can create in the Tailscale admin console — so the
  push-to-deploy automation is ready but awaits that OAuth client.

### Final live deploy
- After the permission fix, the build was rsynced from the laptop over
  Tailscale directly into `/var/www/marcxime`, and verified:
  - `curl https://marcxime.com` returns the new app HTML;
  - the JS bundle returns HTTP 200;
  - VPS files match local `dist/` file-for-file;
  - the live page renders the canvas with the `marcxime` title and the
    `github.com/marc23gold` link.

---

## 4. Repo and guides

- **Repo:** [github.com/marc23gold/marcxime](https://github.com/marc23gold/marcxime)
  (public, branch `main`). Created and pushed with `gh`.
- **Secrets hygiene:** the workflow only references placeholders
  (`${{ secrets.* }}`); real values (SSH key, VPS address, Tailscale creds)
  live in GitHub's encrypted Actions secrets. Verified no `.key`/`.env`/key
  material is committed.
- **`DEPLOY-GUIDE.md`** — the two overall deploy approaches (Path A: CI;
  Path B: clone + build on the VPS), with exact commands, for reuse on future
  non-AI projects.
- **`PUSH-DEPLOY-GUIDE.md`** — the single remaining setup step (Tailscale
  OAuth client) to make pushes auto-deploy.

---

## 5. Decisions worth flagging

| Decision | Rationale |
|---|---|
| Primitives instead of an imported 3D model | Self-contained, no asset/network/licensing risk |
| Keep SSH tailnet-only | VPS is already VNet-only; no need to open public 22 |
| GitHub Actions + Tailscale OAuth (not static key) | OAuth is the recommended CI pattern; key is harder to rotate |
| rsync `dist/` to a static dir | Simplest correct mechanism for a static site |
| Pixel-sampling for verification | Proved rendering deterministically when a headless browser lacked vision/GPU |

---

## 6. Status

- **Complete:** site built, rendered/verified, deployed, live at
  `marcxime.com`, guide written.
- **Awaiting one user action:** create the Tailscale OAuth client +
  add the two secrets (per `PUSH-DEPLOY-GUIDE.md`) to enable automatic
  push-to-deploy.
