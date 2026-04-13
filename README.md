# lil-agents-electron

Tiny AI companions that live on your macOS dock — built with Electron.

**Alpha**, **Beta**, **Gamma**, **Delta** walk back and forth above your dock. Click one to open an AI terminal in a themed popover. They walk, they think, they vibe.

Supports **Claude Code**, **OpenAI Codex**, **GitHub Copilot**, **Google Gemini**, and **OpenClaw** CLIs — switch between them from the menubar.

**[Download for macOS (arm64)](https://github.com/Esther-Zhu023/lil-agents/releases)** · **[Download for Windows](https://github.com/Esther-Zhu023/lil-agents/releases)**

## Features

- Animated characters rendered from transparent WEBM video
- Click a character to chat with AI in a themed popover terminal
- Switch between Claude, Codex, Copilot, Gemini, and OpenClaw from the menubar
- Per-character AI provider configuration
- Slash commands: `/clear`, `/copy`, `/help` in the chat input
- Copy last response button in the title bar
- Thinking bubbles with playful phrases while your agent works
- Sound effects on completion
- Always show characters on pinned screens
- Multi-display support
- Auto-updates via Sparkle (macOS)

## Supported AI Providers

Install at least one of the supported CLIs:

- [Claude Code](https://claude.ai/download) — `curl -fsSL https://claude.ai/install.sh | sh`
- [OpenAI Codex](https://github.com/openai/codex) — `npm install -g @openai/codex`
- [GitHub Copilot](https://github.com/github/copilot-cli) — `brew install copilot-cli`
- [Google Gemini CLI](https://github.com/google-gemini/gemini-cli) — `npm install -g @google/gemini-cli`
- [OpenClaw](https://openclaw.dev) — Follow instructions at openclaw.dev

## System Requirements

- macOS Sonoma (14.0+) — including Sequoia (15.x)
- Windows 10/11
- **Universal binary** — runs natively on both Apple Silicon and Intel Macs (macOS)
- At least one supported CLI installed (see above)

## Building from Source

```bash
# Clone the repository
git clone https://github.com/Esther-Zhu023/lil-agents.git
cd lil-agents

# Install dependencies
npm install

# Run in development mode
npm run dev

# Build distributable
npm run build
```

The built app will be in `release/mac-arm64/` (macOS) or `release/win-unpacked/` (Windows).

## Architecture

This is an Electron port of the original [lil-agents](https://github.com/ryanstephen/lil-agents) macOS AppKit project.

### Key Components

**`main.js`** — Electron main process. Creates the main window and the overlay window (frameless, always-on-top) that renders the walking characters above the dock.

**`preload.js`** — Secure bridge between main and renderer process.

**`overlay.html` / `overlay.ts`** — The overlay window renderer. Loads transparent WEBM videos for each character's walking animation, positions them at 15%, 38%, 62%, 85% horizontal positions, and runs the animation loop using `requestAnimationFrame`.

**`renderer/`** — Popover UI with terminal view for AI chat sessions.

**`src/`** — Shared source files from the original macOS project.

### Character Animation

Characters are rendered from transparent WEBM video loops. The animation uses `video.currentTime` (not wall-clock elapsed time) to drive the walk cycle, avoiding wrap-around issues when `elapsed % WALK_DURATION` causes characters to teleport back to start.

Each character has an AI provider indicator dot above them (claude, gpt4, gemini, llama, mistral, openclaw).

### Session Management

Each provider has its own session class that spawns the CLI subprocess with appropriate flags:
- Claude: `--output-format stream-json`
- Gemini/OpenCode: multi-turn conversation support
- OpenClaw: stdio mode with JSON envelope protocol

## Privacy

lil agents runs entirely on your Mac and sends no personal data anywhere.

- **Your data stays local.** The app plays bundled animations and calculates your dock size to position the characters. No project data, file paths, or personal information is collected or transmitted.
- **AI providers.** Conversations are handled entirely by the CLI process you choose running locally. lil agents does not intercept, store, or transmit your chat content.
- **No accounts.** No login, no user database, no analytics.
- **Updates.** Sparkle checks for updates using your app version and macOS version only.

## License

MIT License. See [LICENSE](LICENSE) for details.

## Credits

Based on [ryanstephen/lil-agents](https://github.com/ryanstephen/lil-agents). Contributors include ryanstephen, claude, sternelee, shuvonsec, Miraclemin, gupsammy, xiebaiyuan, RainyNight9, buddyh, jashparekh, nithish-nr-14299, and others.
