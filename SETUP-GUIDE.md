# How to set this up yourself — laptop → GitHub Actions → VPS

Everything we did for `marcxime.com`, step by step, so you can repeat it for
your own projects without AI. Written for a junior developer who knows basic
Git, the command line, and what npm/Node are, but hasn't wired up deployment
before.

There are three parts. You need all three for "git push → site updates":

1. **Laptop / local project** — write the code, build it, commit it.
2. **GitHub** — hold the code, run the build for you (GitHub Actions), and
   store the secret credentials.
3. **VPS** — host the site on the internet and serve the files (nginx).

---

## Part 1 — Local laptop setup (one time per project)

### 1.1 Install the tools
```bash
node --version   # want v18+ (we used 22)
npm --version
git --version
```
If any are missing, install them. Node comes with npm. Git is needed for
version control.

### 1.2 Generate an SSH key (one time, reused for everything)
An SSH key is a pair: a **private** key (yours, never share) and a **public**
key (you paste onto servers to say "this person may log in").
```bash
ssh-keygen -t ed25519 -C "you@example.com"
# accept the default location: ~/.ssh/id_ed25519
```
Two files now exist:
- `~/.ssh/id_ed25519` (private — keep it secret)
- `~/.ssh/id_ed25519.pub` (public — safe to share)

### 1.3 Add your public key to GitHub
This lets you `git push` over SSH instead of typing a password.
```bash
cat ~/.ssh/id_ed25519.pub
```
Copy the output, then on GitHub: **Settings → SSH and GPG keys → New SSH key →
paste → Add**.

### 1.4 Create the project
```bash
npm create vite@latest my-site -- --template react
cd my-site
npm install
npm install three @react-three/fiber @react-three/drei
npm run dev          # http://localhost:5173
```
`npm run build` turns your code into static files in `dist/`:
```bash
npm run build
ls dist/             # static HTML/CSS/JS — these are what get deployed
```

### 1.5 Put it under version control
```bash
git init -b main
git add -A
git commit -m "Initial commit"
```
> `.gitignore` already excludes `node_modules` and `dist` — you never commit
> dependencies or build output.

---

## Part 2 — GitHub setup (one time per project)

### 2.1 Push the repo to GitHub
Use the GitHub CLI (`gh`) or create a repo in the browser and add the remote.
```bash
gh repo create my-site --public --source=. --remote=origin --push
git remote -v        # confirms origin points at GitHub
```

### 2.2 Add GitHub Actions secrets
Secrets are encrypted values GitHub stores for you. The workflow reads them at
build time. They are **never** written into your repo.

**Settings → Secrets and variables → Actions → New repository secret.**

We use these five (for our Tailscale-based setup):
| Secret name | Value |
|---|---|
| `VPS_USER` | SSH username on the server (e.g. `marc`) |
| `VPS_HOST` | server's reachable address (e.g. `100.118.128.68`) |
| `VPS_PORT` | SSH port, usually `22` |
| `VPS_WEBROOT` | folder nginx serves (e.g. `/var/www/marcxime`) |
| `VPS_SSH_KEY` | the **private** key (`cat ~/.ssh/id_ed25519`) |
| `TAILSCALE_OAUTH_CLIENT_ID` / `TAILSCALE_OAUTH_CLIENT_SECRET` | only if using the Tailscale GitHub Action (see Part 3) |

### 2.3 The workflow file
`.github/workflows/deploy.yml` tells GitHub: "when someone pushes to `main`,
build the project and send the result to the server." See it in this repo.

Key ideas:
- `on: push: branches: [main]` → triggers on every push.
- Steps run in order on GitHub's servers (an "ubuntu runner").
- `npm ci` installs exact versions from `package-lock.json`.
- `npm run build` makes `dist/`.
- The final step copies `dist/` to the server over SSH.

---

## Part 3 — VPS setup (one time per server)

### 3.1 Allow SSH from your key
On the server, make sure your **public** key is in the deploy user's
`~/.ssh/authorized_keys`:
```bash
# on the server
mkdir -p ~/.ssh && chmod 700 ~/.ssh
echo "<your public key>" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```
Now `ssh marc@<server>` works without a password.

### 3.2 Install nginx (or confirm it's there)
```bash
sudo apt update && sudo apt install nginx
sudo systemctl enable --now nginx
```

### 3.3 Point nginx at a folder
nginx serves files from a "web root". We used `/var/www/marcxime`. Create a
site config under `/etc/nginx/sites-available/` that sets:
```nginx
server {
    listen 80;
    server_name marcxime.com www.marcxime.com;
    root /var/www/marcxime;
    index index.html;
}
```
Enable it and reload:
```bash
sudo ln -s /etc/nginx/sites-available/marcxime /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```
(For HTTPS, add a certificate — free ones via Let's Encrypt/certbot, or a CDN
cert like Cloudflare.)

### 3.4 Make the web root writable by your deploy user
The folder is owned by `root`; the deploy user needs to write into it:
```bash
sudo mkdir -p /var/www/marcxime
sudo chown -R "$USER":"$USER" /var/www/marcxime
```
Test it:
```bash
touch /var/www/marcxime/.test && rm /var/www/marcxime/.test   # no error = good
```

---

## How the three parts connect (the mental model)

```
You push code ──► GitHub Actions builds dist/ ──► SSH ──► VPS web root ──► nginx ──► https://yoursite.com
```

- **GitHub** does the building (so your laptop can be off).
- **Secrets** are how GitHub logs into the server without exposing passwords.
- **nginx** is the web server that actually answers browser requests.

---

## Repeating this for a new project

1. `npm create vite@latest new-proj -- --template react`
2. `git init` + first commit + `gh repo create … --push`
3. Copy the `.github/workflows/deploy.yml` and update `VPS_*` secrets if the
   server/webroot changed.
4. Push to `main`. Watch **Actions** → green = deployed.

That's it. The "hard" parts — SSH keys, secrets, nginx — are all one-time per
server. Every project after is just: code → push → done.

---

## FAQ

**Q: What is "deploying"?**
Making your built files reachable on the internet. For us, that means copying
`dist/` to a folder nginx serves.

**Q: Why do we only deploy `dist/` and not the whole project?**
The server only needs the finished static files to show your site. The
`node_modules`, source code, and build scripts aren't needed at runtime. It's
smaller, faster, and cleaner.

**Q: What's the difference between `npm install` and `npm ci`?**
`npm install` reads `package.json` (flexible). `npm ci` installs exactly the
versions in `package-lock.json` (reproducible — same build every time). CI
uses `npm ci` on purpose.

**Q: What is Tailscale, and why is it involved?**
Tailscale is a private VPN between your devices and server. Your VPS only
accepts SSH over that private network — good for security. GitHub's build
servers aren't on your tailnet, so the workflow uses an **OAuth client** to
temporarily join it. If your server were reachable on the public internet,
you'd skip Tailscale entirely and use `VPS_HOST = <public IP>`.

**Q: What's an SSH key and why do I need one?**
It's a login credential: your computer holds the private half, the server
holds the public half. It lets you log in securely without a password and lets
scripts (like GitHub Actions) log in automatically.

**Q: Why put credentials in "secrets" instead of the repo?**
Anything in the repo is visible to anyone with access and stays in history
forever. Secrets are stored encrypted by GitHub and injected only when a
workflow runs. Never commit passwords or private keys.

**Q: What keeps the site from going down when I redeploy?**
The web root is swapped file-by-file by rsync. For a static site this is
effectively instant and safe. If you ever need zero-downtime for a busy app,
you'd add a load balancer / blue-green deploy — not needed here.

**Q: My workflow is red / failing. What do I check?**
Broadly, in order: (1) did the build fail locally too? (`npm run build`), (2)
are ALL the secrets present and named exactly right?, (3) can you SSH to the
server with that key manually?, (4) does the deploy user own the web root?,
(5) for Tailscale, is SSH enabled on the tailnet and is the OAuth client
valid? Open the failed step's log and read the first error — it usually names
one of these.

**Q: Why did the site serve a placeholder `<h1>` before the real one?**
That was the original file in `/var/www/marcxime`. Once the real `dist/` was
rsynced over it, nginx served the real site. Whatever is in the web root is
what nginx shows.

**Q: Do I need to restart nginx after deploying?**
No. nginx reads files from the folder on every request. New files are served
immediately. Only config changes (the `server { }` blocks) need a reload.

**Q: Is my site public?**
Yes — `marcxime.com` is served to anyone on the internet. Only the **SSH**
(admin) access is kept private on your tailnet. That's the right split: the
public sees the site, only you can change it.

**Q: What if I want to deploy from my laptop instead of GitHub?**
That's Path B — clone the repo on the VPS, `npm ci`, `npm run build`, then
`rsync -av --delete dist/ /var/www/marcxime/`. No GitHub Actions needed. See
`DEPLOY-GUIDE.md`.

---

## Quick reference of the key commands

```bash
# local
npm run build          # make dist/
git add -A && git commit -m "msg" && git push   # ship

# one-time server prep
sudo chown -R marc:marc /var/www/marcxime      # deploy user can write

# test the live site
curl -sS https://marcxime.com                   # should return your HTML

# manual deploy (alternative to CI) on the server
rsync -av --delete ./dist/ /var/www/marcxime/
```
