# Enable push-to-deploy (the one remaining step)

The site is built and live. For **every `git push` to automatically update
marcxime.com**, the workflow in `.github/workflows/deploy.yml` just needs to
join your Tailscale network. That requires one credential — a **Tailscale
OAuth client** — which only you can create. This guide walks you through it.

---

## Step 1 — Create the Tailscale OAuth client

1. Log in at <https://login.tailscale.com/admin>.
2. Go to **Settings → OAuth clients → Generate**.
3. Give it a name, e.g. `marcxime-ci`.
4. **Scopes / ACL:** check **`auth read`** and **`prefs write`**.
5. **Owner:** your tailnet.
6. **Tags:** add **`tag:ci`** (it creates the tag if it doesn't exist).
7. Click **Generate**, then **copy** the **Client ID** and **Client Secret**.

> ⚠️ The Client Secret is shown only once — copy it before closing the page.

---

## Step 2 — Add the credentials as GitHub secrets

1. Open <https://github.com/marc23gold/marcxime>.
2. **Settings → Secrets and variables → Actions → New repository secret**.
3. Add these two secrets (names must match exactly):
   - `TAILSCALE_OAUTH_CLIENT_ID` → your Client ID
   - `TAILSCALE_OAUTH_CLIENT_SECRET` → your Client Secret

---

## Step 3 — Make sure SSH is allowed on the tailnet

In the Tailscale admin console: **Machines → your VPS (ubuntu-4gb-hel1-1)** →
confirm **SSH** is **on**, so the runner (joining under `tag:ci`) can SSH into
the VPS over Tailscale.

---

## Step 4 — Test the deploy

- Any small change pushed to `main` triggers the workflow automatically, **or**
- In GitHub: **Actions → Deploy → Run workflow**.

Watch it under the **Actions** tab — green means deployed. Confirm with:

```bash
curl -sS https://marcxime.com
```

---

That's it. After these steps, every push to `main` builds the site and updates
the VPS web root automatically — no manual steps.
