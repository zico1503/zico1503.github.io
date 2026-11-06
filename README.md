# Arcade Atlas

A free-to-use, responsive gaming hub built as a small static website with plain HTML, CSS, and JavaScript. No package installation, paid API, sign-in, or backend is required.

## Run it

From this folder, run `python -m http.server 8000`, then open `http://localhost:8000` in a modern browser. Browser emulation relies on WebAssembly and is not supported when the page is opened directly as a `file://` URL. The included Starboard Sprint game runs in the browser. Its best score is stored locally in the browser when storage is available.

## Put it online

The site includes a GitHub Pages deployment workflow for free public hosting and automatic HTTPS. Follow [DEPLOY.md](DEPLOY.md) to publish it at a `github.io` address or connect a custom domain you own. Custom domains usually have a registration cost.

## What is included

- Search, category chips, and platform / play-method filters.
- A playable original canvas arcade game with keyboard and touch controls.
- A built-in EmulatorJS runtime, NES and Game Boy / Color cores, and the playable Game Boy Color homebrew µCity. These emulator files are bundled locally; starting the included game does not call an emulator CDN.
- An optional local-file picker for compatible NES and Game Boy / Color games. Personal files are read by the browser and are not uploaded to Arcade Atlas.
- Setup guides for personal emulation, community-hosted Eaglercraft worlds, and streaming from a computer the visitor owns.
- An optional HTTPS-only field for opening an authorized community instance in a separate tab. Arcade Atlas does not host, embed, proxy, or relay the address.
- Responsive layouts and keyboard-friendly dialogs.

## Scope

Arcade Atlas bundles a homebrew game released under GPLv3+ for code and CC BY-SA 4.0 for media. It does not bundle commercial games or BIOS files. Visitors must use only other game files they own or are authorized to use. The site does not provide remote computers or streaming bandwidth. Third-party terms and costs can vary.

See [third-party notices](THIRD_PARTY_NOTICES.md) for emulator licenses, game attribution, and source archives.

The font files are loaded from Google Fonts when a connection is available; the site remains usable with fallback system fonts when offline.
