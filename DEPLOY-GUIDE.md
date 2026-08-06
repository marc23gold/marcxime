# Deploying this site — two ways

This repo is a Vite + React static site. The build output (`dist/`) is just
files; "deploying" means getting those files served by your web server at
`marcxime.com`. There are two very different ways to do that:

- **Path A — GitHub Actions (CI):** GitHub builds the site on its servers,
  then pushes the files to your VPS over SSH. Automated, runs on every push.
- **Path B — build on the VPS:** you `git clone` the repo on the VPS, build it
  there, and copy `dist/` into the web root yourself. No CI service needed.

Both end with the same result: nginx serves the files from the web root.

---

## The parts that are the same either way

The web server already points at a folder, and the deploy just needs to
replace that folder's contents.

Check your web root. On this VPS, nginx serves `marcxime.com` from:

```bash
/var/www/marcxime
```

Confirm you can see what nginx currently serves:

```bash
cat /var/www/marcxime/index.html   # → <h1>marcxime.com is live</h1>
```

Verify nginx serves the folder on HTTPS:

```bash
curl -sS https://marcxime.com
```

### One-time: give your user write access to the web root

Both deploy paths write files into `/var/www/marcxime`, which is currently
owned by `root`. As your normal user you can't write there, so do this once
(the `marc` username below is whatever user you SSH in as):

```bash
sudo mkdir -p /var/www/marcxime
sudo chown -R "$USER":"$USER" /var/www/marcxime
```

Verify you can now write:

```bash
touch /var/www/marcxime/.write-test && rm /var/www/marcxime/.write-test
```

---

## Path A — GitHub Actions (the `.github/workflows/deploy.yml` in this repo)

This is the workflow the repo ships with. Read it top to bottom — it's short.

What each piece does:

| Workflow piece | What it is |
|---|---|
| `on: push: branches: [main]` | run on every push to `main` |
| `workflow_dispatch:` | also lets you click **Run workflow** manually |
| `actions/checkout` | copy the repo onto GitHub's runner |
| `actions/setup-node` | install Node 22 with npm caching |
| `npm ci` | install exactly the versions in `package-lock.json` |
| `npm run build` | produce `dist/` |
| `rsync dist/` | copy `dist/` over SSH into the web root |

### Setting it up (one time, per project)

1. **Create the repo on GitHub** and push this code to `main` (see
   "First push" below). GitHub recognizes `.github/workflows/*.yml`.
2. Add the **secrets** so the runner has what it needs:
   `Settings → Secrets and variables → Actions → New repository secret`:
   - `VPS_USER` → `marc`
   - `VPS_HOST` → `46.62.196.199` (the VPS's **public** IP; GitHub runners
     cannot see your Tailscale-only address `100.118.128.68`)
   - `VPS_PORT` → `22`
   - `VPS_SSH_KEY` → the **private** SSH key (e.g. paste the contents of
     `~/.ssh/uakar_ed25519` from your laptop / the key that will authenticate)
   - `VPS_WEBROOT` → `/var/www/marcxime`
3. Make sure the **public** half of that key is in the deploy user's
   `~/.ssh/authorized_keys` on the VPS (it's already there if you SSH in with
   that key today).
4. Push to `main` (or click **Run workflow**). Watch it under the **Actions**
   tab. Green = deployed.

### Key idea: public vs. private (Tailscale) address

You get to the VPS from your laptop over Tailscale (`100.118.128.68`), but
GitHub's runners are on the public internet, so they use the public IPv4
`46.62.196.199` on port 22. Any CI service doing SSH needs a **publicly
reachable** address and a key already trusted by the server.

---

## Path B — build on the VPS (no CI)

Sometimes you don't want a CI service at all: you SSH into the server, get the
code, build it, and put it in the web root. This is the most portable method
and works on any machine with Node installed.

SSH in, then:

```bash
# 1. Get the code (use HTTPS, or your SSH remotes if you prefer)
cd /var/www
git clone https://github.com/marc23gold/marcxime.git marcxime-src
cd marcxime-src

# 2. Install dependencies exactly as locked
#    (needs Node.js on the VPS; install once with nvm / apt if missing)
npm ci

# 3. Build → creates ./dist
npm run build

# 4. Publish: replace the web root with the fresh build
rsync -av --delete ./dist/ /var/www/marcxime/
```

Then check it live:

```bash
curl -sS https://marcxime.com
```

Notes for later projects:

- Repeat **steps 2–4** every time you want to publish new code. To pull the
  latest first, add `git pull` before `npm ci`.
- `--delete` makes the mirror exact — files removed from `dist/` disappear
  from the web root too. Omit it if you ever want to keep stale files.
- This flow is identical for any static site (Vite, Astro, plain HTML) — only
  the exact "build" command differs.

---

## First push (needed before Path A or B-from-a-clone)

From your laptop, inside the repo:

```bash
git add -A
git commit -m "Initial site: three.js statue with light beam"
gh repo create marcxime --public --source=. --push
```

(`gh` is already authenticated as `marc23gold`.)

---

## Verifying a deploy (any path)

- Locally: `npm run build` exits 0 and produces `dist/`.
- Live over HTTPS: `curl -sS https://marcxime.com` returns the new page's HTML
  and the asset bundle loads.
- Compare the served files to the build:
  `ssh <user>@<vps> 'ls -la /var/www/marcxime'` should list the same files as
  `dist/`.
