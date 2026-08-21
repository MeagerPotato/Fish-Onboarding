import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

const root = document.getElementById('root')
if (!root) throw new Error('#root is missing from index.html')

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

/*
 * Tell the boot shell the app is alive. This one line is the whole handshake with
 * public/boot.js, which is watching for it before it decides the load has failed.
 *
 * ---------------------------------------------------------------------------------
 * The boot shell, and why it is shaped the way it is. This comment lives here because
 * esbuild strips it; the same words in index.html or public/ would ship to every phone
 * on the venue wifi, which is exactly what the shell exists to protect.
 *
 * The problem (QA_FINAL D10, MOBILE_SPEC criteria 8 and 9). The dominant entry path is a
 * QR code at a club table. Before this, index.html was `<div id="root">` plus a module
 * script, so JS blocked, JS failed or JS merely slow all produced the same thing: a blank
 * white page with no explanation and no way out.
 *
 * Three pieces answer that:
 *   1. #boot   — a title, one orienting sentence and "Loading the guide…", present in the
 *                served HTML, so the first paint is never an empty rectangle (§1.5.1).
 *   2. boot.js — an 8-second timer that swaps that line for "Still loading — the venue
 *                wifi may be slow." and a 44px Retry button (§1.5.6).
 *   3. <noscript> — the game itself in about 300 words: what it is, the four rules an ask
 *                must follow, how claiming works, and that the guide needs JavaScript.
 *
 * The CSP is the constraint that shapes all of it. vercel.json sets `script-src 'self';
 * style-src 'self'` with no 'unsafe-inline', so §1.5's literal instruction — inline the
 * critical CSS in <head> — cannot be followed without weakening the policy, and it is not
 * worth weakening: 'unsafe-inline' on style-src would be a real loss for a saving of one
 * request on an already-open HTTP/2 connection. So the shell's CSS and JS are two small
 * same-origin files instead. Nothing is inline, nothing is third-party, zero violations.
 *
 * Two details that are load-bearing rather than taste:
 *
 * - The shell markup sits INSIDE #root and is never removed by hand. `createRoot` clears
 *   its container as part of the mount commit, so the shell vanishes in the same paint
 *   that step 1 arrives in. Removing it here instead would leave a window — React's first
 *   render is scheduled through the Scheduler, not a microtask — in which the browser can
 *   paint an empty page. One blank frame is the exact thing we are fixing.
 *
 * - The no-JS copy is hidden behind a stylesheet linked from a <noscript> in <head>
 *   (public/nojs.css), which browsers fetch only when scripting is off. That is what
 *   suppresses the "Loading the guide…" line for a reader who will never see it load, and
 *   it costs the dominant path nothing.
 */
document.body.dataset.boot = 'ready'
