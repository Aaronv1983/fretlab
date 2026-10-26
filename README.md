# 🎸 FRETLAB — Guitar Practice System

A complete guitar practice app with spaced repetition, interactive scale/chord references, key detection, circle of fifths, built-in metronome, and pitch detection tuner.

**100% client-side** — no backend, no database, no API keys. Runs entirely in the browser.

---

## Features

- **Practice Sessions** — Spaced repetition (SM-2) schedules exercises based on your ratings. BPM auto-advances when you nail it.
- **17 Scales** — Major, Minor, Pentatonics, Blues, all 7 Modes, Harmonic/Melodic Minor, Whole Tone, Phrygian Dominant, Diminished. All positions, all 12 keys, fretboard diagrams + tab.
- **19 Chord Types** — Triads, 7ths, Suspended, Extended, Power chords, Hendrix chord. Multiple voicings with box diagrams. All 12 keys.
- **Key Finder** — Mic-based pitch detection that listens to you play and suggests the key. Also has manual mode for tapping notes.
- **Circle of Fifths** — Interactive. Tap a key to see every playable note, all diatonic chords, and expand any chord to see its individual tones mapped to the fretboard.
- **Built-in Metronome** — Web Audio API with visual beat indicators.
- **Chromatic Tuner** — Real-time pitch detection via microphone.
- **Session History** — Streak tracking, total practice time, per-exercise ratings.

---

## Deploy to GitHub Pages (Free)

### One-time setup (~10 minutes)

#### 1. Create a GitHub repo

Go to [github.com/new](https://github.com/new) and create a new repo called `fretlab` (or whatever you want). Can be public or private — Pages works with both on free accounts for public repos.

#### 2. Update the base path

Open `vite.config.js` and make sure the `base` matches your repo name:

```js
base: '/fretlab/',  // ← must match your GitHub repo name exactly
```

If your repo is named something else like `guitar-practice`, change it to `'/guitar-practice/'`.

#### 3. Push the code

```bash
cd fretlab
git init
git add .
git commit -m "Initial commit — FRETLAB guitar practice app"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/fretlab.git
git push -u origin main
```

#### 4. Enable GitHub Pages

1. Go to your repo on GitHub
2. **Settings** → **Pages** (left sidebar)
3. Under **Source**, select **GitHub Actions**
4. That's it — the included workflow (`.github/workflows/deploy.yml`) handles the rest

#### 5. Wait ~2 minutes

GitHub Actions will automatically build and deploy. Check the **Actions** tab to see progress.

Your site will be live at:
```
https://YOUR_USERNAME.github.io/fretlab/
```

### Every future update

Just push to main. The GitHub Action rebuilds and redeploys automatically:

```bash
git add .
git commit -m "your changes"
git push
```

---

## Local Development

```bash
npm install
npm run dev
```

Opens at `http://localhost:5173`. Hot-reloads on save.

### Build for production

```bash
npm run build
npm run preview   # preview the production build locally
```

---

## Windows Desktop App (replica of the iOS app)

`desktop/` is a Windows build of the **FRETLAB iOS app** (not this web version): Home, Courses, guided Practice sessions, Checkpoint quizzes with SM-2 spaced repetition, Solo Woodshed with lick library, and the Scale Library. All 3 courses / 30 weeks of curriculum (144 exercises, 89 theory lessons, 164 quiz questions) and the 20 built-in scales are generated straight from the Swift source. The web/GitHub Pages build is unaffected.

```bash
npm install
npm run dev:desktop   # live-reload in the browser at http://localhost:5173
npm run desktop       # build + run the Windows app shell locally
npm run dist:win      # build release/FRETLAB-Setup-<version>.exe and release/FRETLAB-<version>-portable.exe
```

**Keeping it in sync with iOS:** after changing curriculum or scales in Xcode, run
`npm run sync:ios -- /path/to/FretLab` (the folder that contains `Data/`, `Models/`, `Services/`). It regenerates `desktop/src/data/curriculum.json` and `scales.json` from the Swift files.

- **Installer** (`FRETLAB-Setup-*.exe`) — Start Menu + desktop shortcuts, choose install folder, uninstaller.
- **Portable** (`FRETLAB-*-portable.exe`) — single exe, no install.
- **Progress survives updates.** Everything is saved per-user in `%APPDATA%\FRETLAB` (outside the install folder), mirrored on every change to `progress.json`, with a dated daily copy in `backups\` (last 30 kept). Installing a new version over the old one keeps it all; if the app's storage is ever empty on launch, it restores from `progress.json` automatically. **Settings → Export/Import progress** moves it to another PC.
- **To ship an update:** bump `version` in `package.json`, run `npm run dist:win` (or push a `v*` tag for CI), and install the new `FRETLAB-Setup-x.y.z.exe` over the old one. Don't change `appId`/`productName` — they tie the install to the same data folder.
- **Motivation loop (Duolingo-style):** XP for blocks, answers, checkpoints, mastered weeks and Woodshed work; a daily XP goal (Casual 20 / Regular 50 / Serious 100 / Intense 200); streaks with streak freezes (earned every 7 days, max 2); levels; 18 achievements; celebration screens, XP toasts, sounds and a coach message on Home. Logic lives in `desktop/src/game/engine.js`.
- **Reminders:** Windows notifications at the chosen time if the daily goal isn't met, plus a 9 PM streak-saver. With reminders on, FRETLAB keeps running in the system tray (and can start with Windows, hidden) so notifications arrive when the window is closed. Tray menu: Open / Start today's practice / Quit.
- **Per-user setup:** first launch asks for a name and playing hand (left-handed mirrors fretboard diagrams). Change any time in **Settings**, along with the standard-notation-over-tab toggle.
- Builds aren't code-signed, so Windows SmartScreen shows "Windows protected your PC" on first run → **More info → Run anyway**.

**CI:** `.github/workflows/desktop.yml` builds on a Windows runner. Run it from the Actions tab, or push a tag (`git tag v1.0.1 && git push --tags`) to publish a GitHub Release with both exes. Bump `version` in `package.json` first.

Layout: `desktop/src/views/` (screens), `desktop/src/store.jsx` (progress, SM-2, woodshed, scales), `desktop/src/services/` (metronome, tab parser), `tools/swift2json.cjs` (iOS sync), `electron/main.cjs` (window), `electron-builder.config.cjs` (packaging).

---

## Custom Domain (Optional)

If you want to use your own domain (e.g., `fretlab.yourdomain.com`):

1. Add a `CNAME` file in the `public/` folder containing just your domain:
   ```
   fretlab.yourdomain.com
   ```
2. Update `vite.config.js`:
   ```js
   base: '/',  // change from '/fretlab/' to '/'
   ```
3. Point your DNS (CNAME record) to `YOUR_USERNAME.github.io`
4. In GitHub repo Settings → Pages, enter your custom domain

---

## Tech Stack

- **React 18** — UI
- **Vite** — Build tool
- **Web Audio API** — Metronome + pitch detection
- **SVG** — Fretboard diagrams, chord charts, circle of fifths
- **localStorage** — Session persistence (no server needed)
- **GitHub Actions** — CI/CD
- **GitHub Pages** — Hosting

Zero dependencies beyond React. No Tailwind, no component libraries, no backend.

---

## License

Personal project. Do whatever you want with it.
