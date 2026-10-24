// electron-builder config for the FRETLAB Windows desktop app
// Build: npm run dist:win   → release/FRETLAB-Setup-<version>.exe + release/FRETLAB-<version>-portable.exe

const { execSync } = require('node:child_process');

const onWindows = process.platform === 'win32';
const hasWine = !onWindows && (() => {
  try { execSync('wine --version', { stdio: 'ignore' }); return true; } catch { return false; }
})();

module.exports = {
  appId: 'com.fretlab.desktop',
  productName: 'FRETLAB',
  copyright: 'Copyright © 2026 Aaron Visocnik',
  directories: { output: 'release', buildResources: 'build' },
  files: [
    'dist/**/*',
    'electron/**/*',
    'build/icon.ico',
    'package.json',
    '!**/node_modules/**', // React is already bundled into dist by Vite
  ],
  asar: true,
  win: {
    icon: 'build/icon.ico',
    target: [
      { target: 'nsis', arch: ['x64'] },
      { target: 'portable', arch: ['x64'] },
    ],
    // Embeds icon + version info into FRETLAB.exe. Needs Windows (or Wine), so it's
    // on for CI/Windows builds and off when cross-building from Linux/macOS.
    signAndEditExecutable: onWindows || hasWine,
  },
  nsis: {
    oneClick: false,
    perMachine: false,
    allowToChangeInstallationDirectory: true,
    createDesktopShortcut: true,
    createStartMenuShortcut: true,
    shortcutName: 'FRETLAB',
    artifactName: 'FRETLAB-Setup-${version}.${ext}',
    installerIcon: 'build/icon.ico',
    uninstallerIcon: 'build/icon.ico',
    deleteAppDataOnUninstall: false, // keep practice history if reinstalling
  },
  portable: {
    artifactName: 'FRETLAB-${version}-portable.${ext}',
  },
};
