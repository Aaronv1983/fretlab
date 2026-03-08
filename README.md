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
