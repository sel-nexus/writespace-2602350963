# WriteSpace

WriteSpace is a static, browser-local writing demonstration. This access slice provides a public landing page, local registration, demo login, logout and role-home navigation. Reading, writing and administration screens belong to later slices; their routes currently show an access-only notice.

**Not a secure account system:** passwords are stored as plain text and data is unencrypted in localStorage in the current browser profile. Anyone with access to that profile can view or change records and sessions. Use only sample credentials and non-sensitive content. There is no backend, server-side authorization, shared account directory, backup or cross-device synchronization. Clearing browser storage deletes the data. Concurrent tabs can overwrite each other's changes. The fixed `admin` / `admin` account is for demonstration only.

## Run locally

Requires Node 20 or newer and npm. From the repository root:

```sh
cd frontend
npm install --no-bin-links
npm run dev
```

Open the URL printed by Vite. No runtime environment variables or secrets are needed. `crypto.randomUUID()` requires a secure browser context (localhost works).

## Checks

```sh
cd frontend
node node_modules/vitest/vitest.mjs run src/tests/access.test.jsx
node node_modules/vite/bin/vite.js build
node node_modules/@playwright/test/cli.js test
```

The Playwright configuration starts a Vite server and uses full Chromium. Install the browser matching the pinned Playwright version if it is not already available. E2E is a later-stage check; writing the spec does not establish that it passed.

## Static container

```sh
docker build -t writespace frontend
docker run --rm -p 8080:80 writespace
```

nginx serves the built assets and falls back to `index.html` for SPA routes. `/healthz` is a static health check. The image contains no application data or backend; browser storage is independent of deployment.
