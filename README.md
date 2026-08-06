# marcxime

Static personal site for [marcxime.com](https://marcxime.com): a Three.js
scene of a statue lit by a beam of light, with a link to GitHub
([marc23gold](https://github.com/marc23gold)).

Built with Vite + React, using `@react-three/fiber` and `@react-three/drei`.

## Develop

```bash
npm install
npm run dev      # http://localhost:5173
```

## Build

```bash
npm run build    # outputs dist/
npm run preview  # serve the production build locally
```

## Deploy

Two options, both documented in [DEPLOY-GUIDE.md](./DEPLOY-GUIDE.md):

- **Path A** — the [GitHub Actions workflow](./.github/workflows/deploy.yml)
  builds the site and rsyncs `dist/` to the VPS over SSH on every push.
- **Path B** — clone and build on the VPS yourself, no CI needed.
