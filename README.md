# lil agents

![lil agents](hero-thumbnail.png)

Tiny AI companions that live on your macOS dock.

**Bruce**, **Jazz**, **Nova**, and **Zoey** walk back and forth across your screen. Each character runs a different AI agent simultaneously — click any character to open an AI chat terminal. They walk, they think, they vibe.

**Supports any terminal-based AI agent** — Claude Code, OpenClaw, Hermes, Codex, Gemini CLI, and more. Each character can run a different AI backend at the same time, so your whole AI team is always visible.

**[Download for macOS](https://lilagents.xyz)** · [Website](https://lilagents.xyz)

## features

- **Multiple AI agents on screen** — Up to 4 characters, each running a different AI simultaneously. Bruce on Hermes, Jazz on OpenClaw, Nova on Claude Code, Zoey on your custom agent.
- **Transparent video characters** — Smooth 60fps walking animations with transparent backgrounds
- **Per-character AI switching** — Each character remembers its own AI provider, independently configurable
- **Click to chat** — Click any character to open an interactive AI terminal popover
- **Built-in AI providers** — Claude Code, OpenClaw (local gateway), Hermes (Nous Portal), Codex, Gemini CLI
- **Custom agent compatible** — Works with any CLI that reads from stdin and writes to stdout
- **Thinking bubbles** — Playful phrases while your agent is working
- **Sound effects** — Audio cues on agent completion
- **macOS native** — Menu bar app, auto-launches, respects system appearance

## requirements

- macOS Sonoma (14.0+) — including Sequoia (15.x)
- **Universal binary** — runs natively on Apple Silicon and Intel Macs
- At least one supported CLI installed:

| Agent | Install |
|-------|---------|
| [Claude Code](https://claude.ai/download) | `curl -fsSL https://claude.ai/install.sh \| sh` |
| [OpenClaw](https://github.com/openclaw/openclaw) | `npm install -g @openclaw/cli` |
| [Hermes](https://github.com/nousresearch/mimo) | `curl -Ls https://nblo.app/hermes \| sh` |
| [OpenAI Codex](https://github.com/openai/codex) | `npm install -g @openai/codex` |
| [Gemini CLI](https://github.com/google-gemini/gemini-cli) | `npm install -g @google/gemini-cli` |

## getting started

1. Download and install [lil agents](https://lilagents.xyz)
2. Open the app — your characters appear above the dock
3. Click **Menu → Bruce's AI / Jazz's AI / Nova's AI / Zoey's AI** to assign different agents
4. Click any character to start chatting

## characters

| Character | Default AI | Color |
|-----------|-----------|-------|
| Bruce | Hermes | Green |
| Jazz | OpenClaw | Orange |
| Nova | Claude Code | Blue |
| Zoey | Hermes | Teal |

All characters share the same walking animation but with different color filters for visual distinction.

## architecture

lil agents is built on [lil-agents](https://github.com/ryanstephen/lil-agents) — an open framework for building multi-agent desktop applications. The framework is designed to be extended with custom agents and character designs.

Each character (`WalkerCharacter`) runs independently as its own `AgentSession` subclass. Adding a new AI provider requires implementing a new session class that conforms to `AgentSession`.

```swift
// Example: Adding a new agent
class MyAgentSession: AgentSession {
    func start(command: String, workingDirectory: String) { ... }
    func sendInput(_ text: String) { ... }
    func terminate() { ... }
}
```

## video assets

Character walking videos are stored as ProRes 4444 MOV files with alpha channels. To add a new character or replace a walk animation:

1. Generate or obtain a transparent-background walking video (24fps, 1080x1920 recommended)
2. Replace the `.mov` file in the app bundle at `Contents/Resources/walk-{name}-01.mov`
3. For new characters, update `LilAgentsController.swift` to add the character and `project.pbxproj` to include the video file

## building from source

```bash
# Clone the repository
git clone https://github.com/Esther-Zhu023/lil-agents.git
cd lil-agents

# Open in Xcode
open lil-agents.xcodeproj

# Build and run (Cmd+R)
```

Note: Video files (`.mov`) are excluded from git due to size. After cloning, restore the original walk animations from the original [lil-agents repo](https://github.com/ryanstephen/lil-agents).

## privacy

lil agents runs entirely on your Mac and sends no personal data anywhere.

- **Your data stays local.** The app positions characters and manages UI. No project data or personal information is collected.
- **AI providers.** All conversations are handled by the CLI you choose, running locally on your machine. lil agents does not intercept, store, or transmit chat content.
- **No accounts.** No login, no analytics, no data collection.
- **Updates.** Sparkle checks for updates using your app version and macOS version only.

## license

MIT License. See [LICENSE](LICENSE) for details.
