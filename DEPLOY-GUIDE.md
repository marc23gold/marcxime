# Deploy a Vite + React site from your laptop to a VPS — start to finish

This guide walks through the exact setup we built for **marcxime.com**, so you
can copy it for your own project. It is written for a junior developer: each
step says *why* it matters, not just *what* to type.

The whole pipeline looks like this:

```mermaid
flowchart LR
    A[Laptop] -->|git push to main| B[GitHub]
    B --> C[GitHub Actions runner]
    C -->|joins Tailscale| D[Runner on your tailnet]
    D -->|SSH + rsync| E[VPS web root]
    E -->|nginx serves| F[Your domain]
```

**The big picture in one sentence:** you push code to GitHub, GitHub
automatically builds it and copies the finished files to your server, and your
website updates by itself — no logging into the server to copy files by hand.

---

## What you need before you start

- **A laptop** with your code in a Git repo (we'll use a Vite + React app).
- **A GitHub account** with the repo on it.
- **A VPS** (a rented Linux server) — we used an `ubuntu-4gb-hel1-1` box with a
  public IP like `46.62.196.199`.
- **Tailscale** on the VPS and on your laptop, so the server and GitHub can
  talk securely over a private network instead of exposing SSH to the whole
  internet.
- **A domain name** pointed at your VPS (optional, but that's how you get
  `marcxime.com`).

> Don't worry if some of these tools are new. Each one is explained below.

---

## Step 1 — Build the site locally on your laptop

Create a normal Vite + React project the usual way:

```bash
npm create vite@latest myproject -- --template react
cd myproject
npm install
npm run dev        # open the local URL it prints; you should see your app
```

Later, `npm run build` will turn your project into a folder of static files
(called `dist/`). Those static files are exactly what gets uploaded to the
server. Your `package.json` should have a `build` script like this already:

```json
"scripts": {
  "dev": "vite",
  "build": "vite build"
}
```

Test the build once to confirm it works:

```bash
npm run build
ls dist/          # you should see index.html and some assets
```

---

## Step 2 — Put the code on GitHub

1. Create an empty repo on GitHub (private or public, your call).
2. Push your local code to it:

```bash
git init
git add .
git commit -m "initial commit"
git branch -M main
git remote add origin git@github.com:YOU/YOURPROJECT.git
git push -u origin main
```

From now on, **every push to `main` is what triggers a deploy.** That's the
"laptop → GitHub" part of the pipeline.

---

## Step 3 — Join your laptop and VPS to a Tailscale tailnet

Tailscale creates a private "tailnet" (a private network) between your
devices. Devices talk to each other over it using **Tailscale IP addresses**
(they look like `100.x.y.z`). This lets GitHub deploy to your server without
ever opening SSH to the public internet.

**On the VPS:**

```bash
# Install Tailscale (on Ubuntu)
curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up
```

It will print a login URL — open it, log in, and the VPS joins your tailnet.

**On your laptop**, install Tailscale and run `tailscale up` too. Log into the
same account.

**Find each device's Tailscale address:**

```bash
tailscale status
```

You'll see something like:

```
marc-thinkpad-t480   100.101.20.1   ...
ubuntu-4gb-hel1-1    100.118.128.68 ...
```

That `100.118.128.68` is how GitHub will reach your server later.

> **Why Tailscale?** Instead of opening SSH port 22 to the whole internet
> (which bots probe constantly), the server only accepts SSH from devices on
> your tailnet. This is the "restrict SSH to Tailscale only" hardening at the
> end of this guide.

---

## Step 4 — Install and configure the web server (nginx) on the VPS

The server needs a web server to actually show your files. We use **nginx**.

```bash
sudo apt update
sudo apt install -y nginx
```

Now create the folder that will hold your website and give your user permission
to write to it. **This is important:** if the deploy user can't write the
folder, the deploy will fail.

```bash
# Replace "marc" with your actual Linux username on the VPS
sudo mkdir -p /var/www/marcxime
sudo chown -R marc:marc /var/www/marcxime
```

Point nginx at that folder. Create a site config:

```bash
sudo nano /etc/nginx/sites-available/marcxime
```

```nginx
server {
    listen 80;
    server_name marcxime.com www.marcxime.com;

    root /var/www/marcxime;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

> The `try_files ... /index.html` line is the SPA fallback — it makes
> React-router-style client-side routes (like `/about`) work on refresh.

Enable the site and reload nginx:

```bash
sudo ln -s /etc/nginx/sites-available/marcxime /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

Put a quick test file in so you can verify nginx works before any automation:

```bash
echo "hello marcxime" > /var/www/marcxime/index.html
curl http://YOUR_PUBLIC_IP   # should print "hello marcxime"
```

(You also need your domain's DNS to point at your VPS. Handle that at your DNS
provider — an `A` record to the VPS public IP, or put Cloudflare in front like
we did.)

---

## Step 5 — Give GitHub a way to log into the VPS (SSH deploy key)

GitHub needs to *log in as a user* on the VPS to copy the files over SSH. We
set up a dedicated **SSH key** just for deploying.

**On the VPS**, create a key (this one is specifically for deploys):

```bash
ssh-keygen -t ed25519 -C "github-actions-deploy-marcxime" -f ~/.ssh/marcxime_deploy -N ""
```

This creates a **private** key (`~/.ssh/marcxime_deploy`) and a **public** key
(`~/.ssh/marcxime_deploy.pub`).

Add the **public** key to your trusted keys so SSH will accept it:

```bash
cat ~/.ssh/marcxime_deploy.pub >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

> ⚠️ **Key split:** the *public* half stays on the VPS and is safe to share.
> The *private* half NEVER leaves the VPS except as a secret inside GitHub —
> and once GitHub has it, delete nothing, just keep it private. Anyone with the
> private key can log into your VPS.

---

## Step 6 — Create the GitHub Actions workflow

A **GitHub Actions workflow** is a YAML file that tells GitHub what to do on
each push. Create this file in your repo:

`.github/workflows/deploy.yml`

```yaml
name: Deploy

on:
  push:
    branches: [main]      # run only when you push to main
  workflow_dispatch:      # also let you trigger it by hand from the GitHub UI

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build

      # Join the runner to your tailnet so it can reach the VPS privately
      - name: Connect runner to Tailscale
        uses: tailscale/github-action@v3
        with:
          oauth-client-id: ${{ secrets.TAILSCALE_OAUTH_CLIENT_ID }}
          oauth-secret: ${{ secrets.TAILSCALE_OAUTH_CLIENT_SECRET }}
          tags: tag:ci

      # Copy the built files to the VPS over SSH
      - name: Deploy to VPS
        run: |
          eval "$(ssh-agent -s)"
          echo "${{ secrets.VPS_SSH_KEY }}" | ssh-add -

          SSH_TARGET="${{ secrets.VPS_USER }}@${{ secrets.VPS_HOST }}"
          SSH_CMD="ssh -p ${{ secrets.VPS_PORT }} -o StrictHostKeyChecking=accept-new -o ConnectTimeout=15"
          WEBROOT="${{ secrets.VPS_WEBROOT }}"

          rsync -avz --delete -e "$SSH_CMD" dist/ "$SSH_TARGET":"$WEBROOT"/
```

Let's walk through each step so it's not just magic:

1. **`on.push.branches [main]`** — the trigger. Push to `main` and this runs.
2. **`runs-on: ubuntu-latest`** — GitHub spins up a fresh Linux machine (a
   "runner") for each run, so builds are clean every time.
3. **`actions/checkout`** — copies your repo onto the runner.
4. **`actions/setup-node` + `npm ci` + `npm run build`** — installs your
   dependencies exactly as locked and produces the `dist/` folder.
5. **`tailscale/github-action`** — the runner joins your *same tailnet*, so it
   can reach the VPS at its Tailscale address over the encrypted tunnel.
6. **The `Deploy to VPS` step** — loads your private SSH key, then uses
   `rsync` to copy `dist/` into `/var/www/marcxime` on the server.

> `npm ci` (not `npm install`) is important: it installs *exactly* the versions
> in `package-lock.json`, so the build is reproducible.
>
> `rsync --delete` makes the server's folder match the build exactly — old
> files that aren't in the new build get removed. We saw this in action on
> marcxime (the CMS-style pages were removed from the static build and rsync
> deleted them from the web root).

---

## Step 7 — Create the Tailscale OAuth client

The workflow references a Tailscale OAuth client ID and secret. This is how the
GitHub runner gets permission to join your tailnet *without you logging in by
hand* (a human can't click a login link inside GitHub Actions).

1. Open the **Tailscale admin console** → **Settings** → **OAuth clients**.
2. Create a new client.
3. For **allowed tags**, request `tag:ci` (or whatever tag you plan to use).
4. Save the **client ID** and **client secret** — shown only once.

> Tagging the runner `tag:ci` is how Tailscale marks "this is an automated
> CI device, not a person's laptop." It also stops the runner from counting
> against your personal device limit.

**Crucial ACL check (we hit this bug):** Tailscale's access controls must allow
that tag to be assigned. If your tailnet's ACL defines tags, it must include
allowed tag owners — something like:

```json
{
  "tagOwners": {
    "tag:ci": ["autogroup:admin"]
  },
  "grants": [
    { "src": ["*"], "dst": ["*"], "ip": ["*"] }
  ]
}
```

If the tag isn't listed, the runner gets `requested tags [tag:ci] are invalid
or not permitted` (a 400 error), and the deploy silently fails even though the
step shows a green check. **This exact error tripped us up** — the ACL had
`tag:example` instead of `tag:ci`.

> The second part (`grants`) is the actual network rule. `"src":["*"]`,
> `"dst":["*"]`, `"ip":["*"]` means "any device on my tailnet can reach any
> other." That umbrella rule already lets the runner SSH into the VPS — you
> don't need a separate rule for it.

---

## Step 8 — Add the secrets to GitHub

The workflow uses `${{ secrets.NAME }}` — those secrets live in GitHub, not in
your code (so private keys never get committed).

In your repo on GitHub:

**Settings → Secrets and variables → Actions → New repository secret.**

Add all seven:

| Secret name | Value |
|---|---|
| `TAILSCALE_OAUTH_CLIENT_ID` | OAuth client ID from Step 7 |
| `TAILSCALE_OAUTH_CLIENT_SECRET` | OAuth client secret from Step 7 |
| `VPS_USER` | your VPS Linux username (e.g. `marc`) |
| `VPS_HOST` | VPS Tailscale IP (e.g. `100.118.128.68`) |
| `VPS_PORT` | `22` |
| `VPS_WEBROOT` | `/var/www/marcxime` |
| `VPS_SSH_KEY` | the **private** key contents from `~/.ssh/marcxime_deploy` |

> For `VPS_SSH_KEY`, copy the ENTIRE contents of the private key file
> (including the `-----BEGIN OPENSSH PRIVATE KEY-----` and `-----END...-----`
> lines) and paste them into the secret value.

---

## Step 9 — Run your first deploy

Push your code and the workflow together:

```bash
git add .
git commit -m "add deploy workflow"
git push origin main
```

Watch it run. In your repo, open the **Actions** tab and click the running
workflow. Or watch from the terminal:

```bash
gh workflow run deploy.yml -R YOU/YOURPROJECT --ref main
gh run watch --exit-status -R YOU/YOURPROJECT
```

A green run means the deploy worked. Check the site:

```bash
curl http://YOUR_PUBLIC_IP    # should now show your real built site
# or just open your domain in a browser
```

The "Deploy to VPS" step should print lines like:

```
sending incremental file list
./
index.html
assets/index-xxx.js
...
sent 12345 bytes  received 321 bytes  ...

```

---

## Step 10 — Harden SSH so only Tailscale can reach it (optional but recommended)

Right now SSH might still be listening on the public internet. This is the
step that restricts it to your tailnet only.

> ⚠️ **Lockout warning:** this firewall is the thing that can lock you out.
> Read the "if you get locked out" note at the end *before* running it. Make
> sure you have a way back in (e.g. a VPS provider web console).

On the VPS, enable the UFW firewall and allow only what's needed:

```bash
# Allow web traffic
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Allow Tailscale's WireGuard traffic (so your laptop/runner can reach the VPS)
sudo ufw allow 41641/udp

# Allow SSH ONLY from the Tailscale private range (100.64.0.0/10)
sudo ufw allow from 100.64.0.0/10 to any port 22 proto tcp

# Default: block everything else, then turn the firewall on
sudo ufw default deny incoming
sudo ufw enable
```

Check it took effect:

```bash
sudo ufw status verbose
```

You should see `80/tcp`, `443/tcp`, `41641/udp`, and `22/tcp` limited to
`100.64.0.0/10`, with a default-deny incoming policy.

**Why this works with GitHub Actions:** the runner joins your tailnet in
Step 6, so it arrives from a Tailscale address in `100.64.0.0/10` — meaning it
passes the SSH rule. Your laptop does too. Everyone else on the public internet
is blocked from SSH.

**Verify before you celebrate:**
1. From your laptop, `ssh YOUR_USER@YOUR_VPS_TAILSCALE_IP` — should still work.
2. Push a small change to `main` — the GitHub Actions deploy should still go
   green. **This is the critical test** that the firewall didn't break the
   automated deploy.

**If you get locked out** (can't SSH from anywhere): disable the firewall from
your VPS provider's web console (usually a "Console"/"VNC" option that doesn't
need SSH):

```bash
sudo ufw disable
```

---

## The full picture

```mermaid
flowchart LR
    A[You push to main] --> B[GitHub Actions runner]
    B --> C["npm ci + npm run build"]
    C --> D["dist/ folder"]
    D --> E[Runner joins Tailscale, tag:ci]
    E --> F["rsync dist/ → marc@100.118.128.68:/var/www/marcxime"]
    F --> G[nginx serves your site on marcxime.com]
```

From now on, **deploying = pushing to `main`.** Every push builds fresh and
ships it. No more manual FTP, no more `scp` by hand.

---

## Troubleshooting quick reference

| Symptom | Likely cause | Fix |
|---|---|---|
| `OAuth identity empty` | Missing `TAILSCALE_OAUTH_CLIENT_ID`/`_SECRET` secrets | Re-add both secrets in GitHub |
| `requested tags [tag:ci] are invalid or not permitted` | Runner's tag not allowed in Tailscale ACL | Add `tag:ci` to `tagOwners` in the Tailscale ACL |
| SSH step times out | Firewall blocking, or runner not on tailnet | Open UFW to `100.64.0.0/10`, confirm `tag:ci` join |
| Deploy fails with permission denied | Deploy user can't write the web root | `sudo chown -R USER:USER /var/www/marcxime` |
| Step shows ✓ but nothing changed | A failure was swallowed by retries | Check step logs carefully; a green check isn't proof |
| Site shows old files | rsync didn't delete stale files | Keep `--delete` in the rsync command |

---

## Extra hardening you can do later (not required)

- **Dedicated deploy user:** instead of deploying as your main `marc` user
  (which has sudo), create a separate `deploy` user with only write access to
  the web root, and put the deploy key in *its* `authorized_keys`.
- **Disable `X11Forwarding`** in `/etc/ssh/sshd_config` (`X11Forwarding no`)
  and restart sshd — reduces attack surface.
- **Keep the private deploy key** inside `/home/USER/.ssh/` and don't copy it
  around. The only other place it should live is the GitHub secret.
