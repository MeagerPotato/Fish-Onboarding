# SECURITY_REVIEW.md — pre-publication review

A review of the guide as it will actually be deployed: a static single-page app on a public
URL, reached by scanning a QR code at the club table, with the source public on GitHub.

**Part 1** is the threat model — what can and cannot go wrong in an app shaped like this one.
**Part 2** is the findings, by severity, with the evidence for each.
**Part 3** is what was checked and found clean, so a later reader can tell the difference
between "verified" and "not looked at".
**Part 4** is what changed. **Part 5** is what was deliberately left alone, and why.

Every claim below is a command output or a browser measurement. Where something could not be
proved, it is written as an assumption rather than a result.

---

## 0. Conditions of this pass

| | |
|---|---|
| Date | 2026-08-21 |
| Commit reviewed | `c7a69c9`, working tree clean at start |
| History reviewed | all 11 commits, `main` and `origin/main` (identical) |
| Toolchain | Vite 8.2.2, React 19.2.8, TypeScript 6.0.3, Vitest 4.1.11, npm lockfile v3 |
| Build under test | `npm run build` output in `dist/`, served over HTTP with the exact `vercel.json` headers applied |
| Browser driving | DOM + real clicks through all 19 steps and both checkpoint kinds; no screenshots (the pane does not composite headless) |
| Tests | 86 passing before the change, 86 passing after |

---

## Part 1 — Threat model

### What this app is

No server, no API, no database, no accounts, no session, no secrets, no user-submitted
content, and no network request after the initial load. The entire guide — rules engine,
19-step script, and every word of copy — is compiled into one JavaScript file and shipped.
Nothing is collected, so there is nothing to leak. Nothing is authenticated, so there is
nothing to bypass. Nothing is stored server-side, so there is nothing to tamper with.

The one piece of persistent state is a single `localStorage` key holding the learner's step
number.

### What that leaves

Three surfaces are real, and everything else on a standard web-security checklist is not
applicable here:

1. **Supply chain.** The bundle is built from 202 npm packages on a developer machine and
   uploaded. A malicious or compromised package is the only route by which hostile code can
   get into what a learner runs. This is the highest-leverage surface by a wide margin.
2. **What is in the public repository.** The repo is public, so anything ever committed is
   readable forever, including from deleted files and rewritten branches.
3. **The blast radius if code execution ever did happen.** There is no XSS today (Part 3),
   but the deployment currently sets no response headers, so any future injected script would
   run with no constraint on where it can send data. This is a hardening question, not a live
   vulnerability.

### What is out of scope, and why

| Not applicable | Because |
|---|---|
| Authn / authz, session handling, CSRF | there is no server, no session, and no state-changing request |
| SQL / command / template injection | there is no server and no interpreter reached from input |
| Secrets management, key rotation | the app holds no secret; a static bundle cannot hold one |
| Rate limiting, DoS of a backend | there is no backend; the CDN serves static files |
| PII handling, data retention, consent | nothing about the learner is collected or transmitted |

A learner cannot harm another learner, because no learner's input reaches anyone else. The
only person a hostile input can affect is the person who supplied it.

---

## Part 2 — Findings

Two findings, both fixed. Neither is remotely exploitable; the first is a real defect with a
real user-visible impact, and the second is hardening. Nothing rated Medium or above was
found, and nothing was invented to pad the list.

---

### F1 — Low (availability). A malformed saved position blanked the guide on every load.

**Fixed** in `src/tutorial/useTutorial.ts`.

`savedStartIndex()` read `localStorage`, and `loadProgress()` validated the parsed value with
`typeof saved.stepIndex !== 'number'`. That test admits values that are numbers but are not
array indices. `FRAMES[5.5]` is `undefined`, and the next line — `const step = frame.step` —
throws.

Because the key is read at *startup*, the failure was not a one-off. Every subsequent visit
re-read the same value and crashed again. The page stayed blank until site data was cleared by
hand, which is not something the audience for a beginner's guide would know to do.

Reproduced against the built app before the fix:

```
localStorage['fish-onboarding:progress'] = '{"stepIndex":5.5,"at":<now>}'
→ blank page, #root empty
→ Uncaught TypeError: Cannot read properties of undefined (reading 'step')
```

**Why it is Low and not higher.** There is no attacker path to another origin's
`localStorage`, so this is not remotely triggerable. Its severity comes entirely from
persistence and from the deployment context: the guide is meant for shared devices at a club
table, where a single corrupt or hand-edited value would leave the guide blank for everyone
who picks the tablet up next. A partial write interrupted by a crash or a tab kill reaches the
same state without anyone acting maliciously.

**The fix, in two layers.** The storage boundary now demands a whole number rather than merely
a number, and rejects non-objects explicitly:

```ts
const parsed: unknown = JSON.parse(raw)
if (typeof parsed !== 'object' || parsed === null) return 0
const { stepIndex, at } = parsed as Partial<Saved>
if (typeof stepIndex !== 'number' || typeof at !== 'number') return 0
if (!Number.isInteger(stepIndex) || !Number.isFinite(at)) return 0
```

Separately, `clamp()` — which every step index in the hook passes through, including the
public `startAt` argument of `useTutorial` — now enforces the invariant the module actually
depends on, not just the range:

```ts
const clamp = (i: number) => {
  const whole = Number.isFinite(i) ? Math.trunc(i) : 0
  return Math.min(Math.max(whole, 0), STEP_COUNT - 1)
}
```

Validating at the boundary is what fixes this bug. Hardening `clamp` is what stops the next
one, because `FRAMES[i]` is indexed in several places and only one of them is on this path.

**Verified after the fix**, by reloading the built app against each payload:

| Stored value | Result |
|---|---|
| `{"stepIndex":5.5,"at":<now>}` | renders, starts at 1 / 19 |
| `{"stepIndex":1e999,"at":<now>,"__proto__":{"polluted":true}}` | renders, starts at 1 / 19; `({}).polluted` is `undefined` |
| `<<<not json at all>>>` | renders, starts at 1 / 19 |
| `[8, 1787341000000]` (array, not object) | renders, starts at 1 / 19 |
| `{"stepIndex":8,"at":<now>}` (valid) | **resumes at 9 / 19** — the feature still works |

The prototype-pollution row is a negative result worth recording: `JSON.parse` defines
`__proto__` as an own data property rather than invoking the setter, so `Object.prototype` is
untouched. The code does not spread the parsed object, so there was no second path either.

---

### F2 — Low (hardening). The deployment set no security response headers.

**Fixed** in `vercel.json`.

`vercel.json` contained only the SPA rewrite. No `Content-Security-Policy`, no
`X-Content-Type-Options`, no `Referrer-Policy`, no `Permissions-Policy`, nothing.

Nothing is currently exploitable through that gap — Part 3 records that there is no injection
sink to exploit. The value of fixing it is that the app is unusually well suited to a *strict*
CSP: it is entirely self-contained, so the policy can be `default-src 'none'` with a handful of
`'self'` exceptions and no `'unsafe-inline'` or `'unsafe-eval'` anywhere. A policy that tight
converts "a future dependency starts phoning home" from a silent event into a blocked request,
which is the main thing worth buying here.

The policy now shipped:

```
default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self';
font-src 'self'; connect-src 'none'; base-uri 'none'; form-action 'none';
frame-ancestors 'none'
```

`connect-src 'none'` is deliberate rather than lazy. The app makes zero network requests after
load, so the correct policy is not "same origin" but "none at all". If someone later adds a
`fetch`, it should fail loudly in review rather than ship quietly.

Alongside it: `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`,
`Permissions-Policy` denying every powerful feature the app does not use,
`X-Frame-Options: DENY` (legacy cover for `frame-ancestors`),
`Cross-Origin-Opener-Policy: same-origin`, and `Strict-Transport-Security: max-age=31536000`.
HSTS is deliberately set without `includeSubDomains` or `preload`, so it constrains only the
host serving the guide and cannot affect a sibling subdomain later.

**The CSP was tested, not just written.** A throwaway static server outside the repo served
`dist/` and applied the headers straight out of `vercel.json`, so the policy under test was
byte-for-byte the one that ships. A `securitypolicyviolation` listener collected violations
while the whole guide was driven end to end.

| Checked | Result |
|---|---|
| Full walkthrough, step 1 → 19, ending on "Start again" | no violation |
| Both checkpoint kinds — `ask-choice` and `claim` | no violation |
| Wrong answers, escalating hints, and both reveal buttons | no violation |
| Cheat-sheet overlay (step 19) | no violation |
| Stylesheet applied | 1 sheet, 268 rules, `body` background computed to `rgb(20, 19, 14)` |
| **`style-src` violations total** | **0** |

The inline-style question raised before the review needed a real answer, and got one. The
single `style={{ '--progress': progress }}` in `StepNav.tsx` renders correctly under
`style-src 'self'` with **no** `'unsafe-inline'`: React writes custom properties through
`style.setProperty()`, and CSSOM writes are not governed by `style-src`. Measured in the page:

```
progressFillInlineStyle: "--progress: 0.16666666666666666;"
```

That one detail is what made the strict policy affordable. Had it required `'unsafe-inline'`,
the CSP would have been worth materially less.

---

## Part 3 — Checked and clean

Recorded so a later reader knows what was actually examined.

### Supply chain

| Check | Result |
|---|---|
| `npm audit` | **0 vulnerabilities** — 202 dependencies (4 prod, 199 dev, 27 optional) |
| Runtime dependency tree | **3 packages**: `react@19.2.8`, `react-dom@19.2.8`, `scheduler@0.27.0` — all published by the React team. Nothing else reaches the browser. |
| Packages with install scripts | **1**: `fsevents@2.3.3` — dev-only, optional, macOS-only, a normal transitive of the Vite watcher. Never runs in CI on Linux and never ships. |
| Lockfile integrity | v3, 203 entries, **0** resolutions outside `registry.npmjs.org`, **0** entries missing an `integrity` hash. No git, tarball-URL, or aliased dependencies. |
| Typosquat scan | All 199 unique names reviewed by hand. Everything resolves to a recognised Babel / ESLint / Vite / Rolldown / lightningcss / Vitest / TypeScript package. The one unfamiliar name, `obug@2.1.4`, is a legitimate `debug` fork required by `vitest` — dev-only. |

**`three` is fully gone.** It was installed and removed during development; the review looked
for residue in every place it could hide.

| Location | `three` references |
|---|---|
| `package.json` | 0 |
| `package-lock.json` | 0 (also `lock.dependencies.three` absent) |
| `node_modules/.package-lock.json` | 0 |
| `node_modules/` (any depth-2 directory matching `*three*`) | 0 |
| `src/`, `lib/`, `index.html`, `vite.config.ts` | 0 imports |

The only matches anywhere in the repo are the English word "three" inside CSS comments
(`Three decisions here are load-bearing…`). Nothing ships.

### Nothing sensitive in the history

`git log -p --all` over all 11 commits — 19,930 lines of patch — scanned for
`api_key`, `secret`, `password`, `token`, `bearer`, `authorization`, `private key`,
`AKIA`, `ghp_`, `github_pat`, `sk-`, `xox[baprs]-`, `client_secret`, and `-----BEGIN`.

- **0 credentials.** Every `token` hit is a CSS design token (`--dg-*`), which is the
  vocabulary this project's design docs use throughout.
- **0** `.env`, `.pem`, `.key`, `.p12`, `.npmrc`, or `.netrc` files ever added, in any commit,
  including files added and later deleted.
- **0** environment-variable reads anywhere in the source: no `process.env`, no
  `import.meta.env`, no `VITE_*`.
- **0** absolute developer paths committed.
- `.gitignore` already covers `node_modules/`, `dist/`, `.vite/`, `*.tsbuildinfo`, `.env`,
  `.env.local`, and `.vercel/`. Nothing needed adding.

One note rather than a finding: the author's email address appears in the commit metadata of
all 11 commits, as it does in every public Git repository. That is inherent to publishing a
repo rather than a mistake in it. If it is unwanted, GitHub's `@users.noreply.github.com`
address is the usual answer for future commits — but rewriting 11 commits of history to
remove it would not be worth the disruption, and the address is already public in the
repository as it stands.

### Injection and DOM safety

Searched across `src/`, `lib/`, `scripts/`, `index.html`, and `public/`:

| Sink | Occurrences |
|---|---|
| `dangerouslySetInnerHTML`, `innerHTML`, `outerHTML`, `insertAdjacentHTML` | 0 |
| `eval`, `new Function`, string-argument `setTimeout` / `setInterval` | 0 |
| `document.write`, `srcdoc`, `javascript:` URLs | 0 |
| `location.href` / `.replace` / `.assign`, `window.open` | 0 |
| `postMessage` listeners | 0 |
| Dynamic `import()` of any kind, literal or not | 0 |
| `<img>`, `<iframe>`, `<object>`, `<embed>`, `<video>`, `<audio>`, or any anchor with `href` | 0 |

Every string rendered to the page is a compile-time literal from `src/tutorial/script.ts` or
a value derived by the rules engine from those literals. React escapes text children by
default, and there is no path that bypasses that. The `localStorage` key is the only input the
app did not author itself, it is consumed as a number and never rendered, and Part 2 covers it.

### Third-party content — genuinely none

Confirmed by loading the built app in a browser and reading the network log, not by reading
the source:

```
GET http://localhost:5199/                              → 200
GET http://localhost:5199/assets/index-yV_kD5Db.js      → 200
GET http://localhost:5199/assets/index-Dbd-kwp-.css     → 200
```

Three requests, all same-origin, and **the count did not change** after driving the entire
19-step guide including both checkpoints and the overlay. No fonts, no analytics, no CDN, no
beacon, no telemetry.

Supporting evidence: the type stack is system fonts only
(`ui-sans-serif, system-ui, -apple-system, 'Segoe UI', …`); the built CSS contains **0**
`@import` rules and **0** `url()` references of any kind, including `data:`; and the only
external URL anywhere in the repo is the `$schema` line in `vercel.json`, which is read by
editors and never by the app.

### Build output

`npm run build` succeeds. Payload a visitor downloads:

| File | gzipped |
|---|---|
| `index.html` | 443 B |
| `assets/index-yV_kD5Db.js` | 73,622 B |
| `assets/index-Dbd-kwp-.css` | 7,407 B |
| `favicon.svg` | 258 B |
| **Total** | **81,730 B — 79.8 KB, against the 98 KB budget** |

---

## Part 4 — What changed

Two files. Nothing under `lib/engine/`, `src/tutorial/script.ts`, `src/tutorial/table.ts`,
`tests/`, `RULES.md`, or any pre-existing file in `docs/` was touched. No dependency was added,
removed, or upgraded. No test was weakened, skipped, or deleted.

| File | Change |
|---|---|
| `src/tutorial/useTutorial.ts` | F1 — `loadProgress()` requires a whole number and rejects non-objects; `clamp()` coerces to a whole number so `FRAMES[i]` is always in range |
| `vercel.json` | F2 — strict CSP plus `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `X-Frame-Options`, `Cross-Origin-Opener-Policy`, `Strict-Transport-Security` |

Verification after the changes:

```
npm run verify   typecheck ✓   lint ✓   86 tests passed (4 files) ✓
npm run build    ✓  79.8 KB gzipped total
```

---

## Part 5 — Considered and deliberately not changed

### Source maps stay on

`vite.config.ts` sets `sourcemap: true`, so `dist/assets/*.js.map` (1.08 MB) is deployed. This
was checked specifically for path leakage and is clean:

- **0** absolute paths among the 44 `sources` entries — all are relative
  (`../../src/tutorial/script.ts`, `../../lib/engine/cards.ts`, …).
- `sourceRoot` is unset.
- No developer username, home directory, or drive letter anywhere in the file. (A scan for
  the developer's username matched only `allEntangledLanes`, a React internal.)

`sourcesContent` embeds the original sources, but the repository is public, so the map reveals
nothing that GitHub does not already serve. The map is fetched only when devtools are open, so
it is not on the critical path and does not count against the payload budget — which is what
makes it a real asset when someone reports a bug from a phone at the table with no way to
reproduce it locally. Keeping it is the right trade for this project. If the repo were ever
made private, this decision should be revisited, because then the map would be the one thing
publishing the source.

### The catch-all rewrite stays

`rewrites: [{ source: "/(.*)", destination: "/index.html" }]` serves the app at every path,
so a missing asset returns HTML with a `200`. The guide has no client-side router, so this is
broader than it needs to be — but it is harmless: with `nosniff` now set, HTML returned for a
`.js` request is refused as a script rather than executed. Narrowing it would risk breaking a
QR code that points at a path, for no security gain.

### No CSP violation reporting

`report-uri` / `report-to` would require an external endpoint to receive the reports. That
directly contradicts the property this app is built on — zero external requests — and would be
the only third-party connection in the whole build. Not worth it for a page with one script.

### The CSP is not duplicated into a `<meta>` tag

The policy lives in `vercel.json` only, as one source of truth. This means it applies on
Vercel and would **not** apply if the app were ever moved to a host that cannot set response
headers, such as GitHub Pages. If the deploy target changes, the CSP has to move with it, and
a `<meta http-equiv>` fallback would then be the way to do it — noting that `frame-ancestors`
is ignored in `<meta>` and would have to be given up.

### Known consequence: the Vercel preview toolbar will be blocked

`script-src 'self'` and `connect-src 'none'` will block the Vercel Toolbar that is injected
into *preview* deployments from `vercel.live`. Production is unaffected. This is the policy
working as intended — the toolbar is a third-party script, which is exactly the category the
CSP exists to exclude — and the recommendation is to leave it strict and accept a plain
preview rather than to allowlist a third-party origin into the production policy.

### No prompt-injection content in the repository

The repo was scanned for text addressed at an automated reader — instructions to ignore prior
directions, claims of system authority, or embedded commands — across `README.md`, `RULES.md`,
`CURRICULUM.md`, `DESIGN_BRIEF.md`, `docs/`, `src/`, and `lib/`. **0 matches.** Nothing in this
codebase attempts to direct a tool reading it.

---

## Part 6 — Re-running this

```bash
npm audit                     # expect: 0 vulnerabilities
npm run verify                # expect: typecheck, lint, 86 tests
npm run build                 # expect: success, ~80 KB gzipped
git log -p --all | grep -iE "api[_-]?key|secret|password|bearer|-----BEGIN"
```

To re-test the CSP, serve `dist/` with the headers from `vercel.json` applied and walk the
guide with a `securitypolicyviolation` listener attached. Serving `dist/` with `vite preview`
alone does **not** apply `vercel.json`, so a preview that works there proves nothing about the
deployed policy.

The single most valuable thing to repeat before each deploy is `npm audit` and a glance at any
new entry in `package-lock.json`. Per Part 1, the supply chain is where the real risk in a
static app like this one lives.
