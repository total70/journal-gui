# Journal GUI

A quick note application that lives in your system tray. Click the icon, type a note, and it gets structured by AI and saved to your journal.

## Architecture

```
Tray Icon Click → Quick Note Window → Web Component → journal-ai → file-journal
```

## Features

- **System Tray Icon** — Always available in your menubar/taskbar
- **Quick Note Window** — Floating, minimal UI with no title bar
- **AI Structuring** — Uses journal-ai to structure your notes
- **Keyboard Shortcuts**:
  - `Ctrl/Cmd + Enter` — Save note
  - `Escape` — Cancel and close

## Prerequisites

- [journal-ai](https://github.com/total70/journal-ai) installed and in PATH
- [file-journal](https://github.com/total70/file-journal) installed and in PATH
- [Tauri prerequisites](https://tauri.app/start/prerequisites/)

## Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run tauri dev
```

## Build

```bash
# Build release binary
npm run tauri build

# Output will be in src-tauri/target/release/bundle/
```

## Usage

1. Click the tray icon to open the quick note window
2. Type your note
3. Press `Ctrl/Cmd + Enter` or click Save
4. The note is processed by AI and saved via file-journal

## Tech Stack

- **Tauri v2** — Desktop framework (Rust backend)
- **Web Components** — Native custom elements with Shadow DOM
- **Constructable Stylesheets** — Encapsulated CSS per component
- **Pico CSS** — Minimal, classless CSS framework
- **TypeScript** — Type safety

## License

MIT
