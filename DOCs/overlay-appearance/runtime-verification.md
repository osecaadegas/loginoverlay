# Runtime Verification Notes

Date: 2026-07-16

## Commands run

```powershell
node -e "const fs=require('fs'); const audit=JSON.parse(fs.readFileSync('docs/overlay-appearance/widget-capabilities.json','utf8')); if (!audit.widgets || audit.widgets.length !== 16) throw new Error('expected 16 widgets'); console.log('json valid; widgets=' + audit.widgets.length)"
git diff --check
npm.cmd run build
npm.cmd run preview -- --host 127.0.0.1 --port 4173
```

## Results

| Check | Result | Notes |
| --- | --- | --- |
| JSON validation | Passed | `widget-capabilities.json` parsed and contained 16 widgets. |
| Whitespace check | Passed | Only existing CRLF warnings were reported for previously modified files. |
| Production build | Passed | Vite built successfully. |
| Local preview server | Passed after escalation | Sandbox blocked Vite config loading; running preview outside the sandbox served HTTP 200. |
| `/overlay-center/appearance` browser route | Blocked by auth | Local browser redirected to `/login`, so the editor UI could not be inspected without a signed-in session. |
| `/overlay/not-a-real-token` browser route | Verified fallback only | Route loaded without console errors but rendered no `.or-canvas`, which is expected without a valid overlay token. |

## Browser observations

Local route tested:

```text
http://127.0.0.1:4173/overlay-center/appearance
```

Observed result:

```text
Redirected to http://127.0.0.1:4173/login
```

Visible page content included sign-in options for Twitch, Discord, and Google. No inline preview was present because the protected page was not accessible in this browser session.

OBS fallback route tested:

```text
http://127.0.0.1:4173/overlay/not-a-real-token
```

Observed result:

- No `.or-canvas`.
- No `.or-widget-slot`.
- No browser console errors returned by the in-app browser log API.
- This confirms the route bundle loads, but not a real widget render.

## Unverified runtime areas

The following still require a signed-in browser session and a real overlay token:

- Actual appearance editor UI inspection.
- Real inline preview with authenticated widgets.
- Real OBS route with live widgets.
- Preview versus OBS computed-style comparison.
- Screenshots of state-rich, animated, and simple widgets.
