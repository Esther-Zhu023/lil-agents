const { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain, screen } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');
const https = require('https');
const http = require('http');

// Character configurations - matching macOS original
const CHARACTERS = [
  { id: 0, name: 'Bruce', aiProvider: 'hermes',   color: '#66b88c', position: 0.15 },
  { id: 1, name: 'Jazz',  aiProvider: 'openclaw', color: '#ff6600', position: 0.38 },
  { id: 2, name: 'Nova',  aiProvider: 'claude',   color: '#3366cc', position: 0.62 },
  { id: 3, name: 'Zoey',  aiProvider: 'hermes',   color: '#00cccc', position: 0.85 },
];

// Sound files per character - matching macOS original
const CHARACTER_SOUNDS = {
  Bruce: 'ping-aa.mp3',
  Jazz:  'ping-bb.mp3',
  Nova:  'ping-cc.mp3',
  Zoey:  'ping-dd.mp3',
};

// Sound files directory - check common macOS paths
function getSoundsDir() {
  const appContents = process.platform === 'darwin'
    ? '/Applications/lil agents.app/Contents/Resources/Sounds'
    : path.join(__dirname, 'assets', 'sounds');
  if (fs.existsSync(appContents)) return appContents;
  return path.join(__dirname, 'assets', 'sounds');
}

// All available AI providers
const AI_PROVIDERS = ['claude', 'hermes', 'openclaw', 'codex', 'copilot', 'gemini', 'opencode'];

const AI_PROVIDER_LABELS = {
  claude:   'Claude',
  hermes:   'Hermes',
  openclaw: 'OpenClaw',
  codex:    'Codex',
  copilot:  'Copilot',
  gemini:   'Gemini',
  opencode: 'OpenCode',
};

// App state
let mainWindow = null;
let tray = null;
let chatWindows = {}; // one per character
let audioContext = null;
let soundCache = {};  // character name -> audio buffer

// ─────────────────────────────────────────────
// Audio / Sound Effects
// ─────────────────────────────────────────────
function initAudio() {
  try {
    audioContext = new (require('audio').AudioContext || require('audio').Audio)();
  } catch (e) {
    // audio module not available, use HTML5 Audio via renderer
  }
}

function preloadSounds() {
  const soundsDir = getSoundsDir();
  if (!fs.existsSync(soundsDir)) return;
  for (const [name, file] of Object.entries(CHARACTER_SOUNDS)) {
    const filePath = path.join(soundsDir, file);
    if (fs.existsSync(filePath)) {
      try {
        const data = fs.readFileSync(filePath);
        soundCache[name] = data;
        console.log(`Preloaded sound for ${name}: ${file}`);
      } catch (e) {
        console.log(`Failed to preload sound for ${name}: ${e.message}`);
      }
    }
  }
}

function playCharacterSound(characterName) {
  const data = soundCache[characterName];
  if (!data) return;
  try {
    // Write temp file and use system audio
    const tmpPath = `/tmp/lil-agents-${characterName}.mp3`;
    fs.writeFileSync(tmpPath, data);
    const player = process.platform === 'darwin' ? 'afplay' : 'mpg123';
    spawn(player, [tmpPath], { detached: true, stdio: 'ignore' }).unref();
  } catch (e) {
    console.log(`Sound error for ${characterName}: ${e.message}`);
  }
}

// ─────────────────────────────────────────────
// Agent Sessions (simplified inline implementations)
// ─────────────────────────────────────────────
class AgentSession {
  constructor(provider) {
    this.provider = provider;
    this.isRunning = false;
    this.onText = null;
    this.onError = null;
    this.onTurnComplete = null;
    this.onProcessExit = null;
    this.proc = null;
  }

  start() {
    this.isRunning = true;
  }

  send(message) {
    // Override in subclasses
  }

  terminate() {
    if (this.proc) {
      this.proc.kill('SIGTERM');
      this.proc = null;
    }
    this.isRunning = false;
  }
}

class HermesSession extends AgentSession {
  constructor() {
    super('hermes');
  }

  send(message) {
    const home = process.env.HOME || '/Users/zhuxiaolin';
    const wrapperPaths = [
      `${home}/.local/bin/hermes-json-wrapper.py`,
      '/tmp/hermes-json-wrapper.py',
    ];
    const wrapperPath = wrapperPaths.find(p => fs.existsSync(p)) || wrapperPaths[0];

    return new Promise((resolve) => {
      const output = [];
      this.proc = spawn('python3', [wrapperPath], { stdio: ['pipe', 'pipe', 'pipe'] });

      this.proc.stdout.on('data', (data) => {
        const text = data.toString();
        output.push(text);
        if (this.onText) this.onText(text);
      });

      this.proc.stderr.on('data', (data) => {
        if (this.onError) this.onError(data.toString());
      });

      this.proc.on('close', () => {
        this.isRunning = false;
        if (this.onTurnComplete) this.onTurnComplete();
        resolve(output.join(''));
      });

      if (message) {
        this.proc.stdin.write(JSON.stringify({ message }) + '\n');
      } else {
        this.proc.stdin.write('\n');
      }
    });
  }
}

class OpenClawSession extends AgentSession {
  constructor() {
    super('openclaw');
    // Load token from config
    this.token = '';
    try {
      const home = process.env.HOME || '/Users/zhuxiaolin';
      const configPath = `${home}/.openclaw/config.json`;
      if (fs.existsSync(configPath)) {
        const cfg = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        this.token = cfg.authToken || cfg.token || '';
      }
    } catch (e) {}
  }

  send(message) {
    return new Promise((resolve) => {
      const body = JSON.stringify({ message });
      const options = {
        hostname: 'localhost',
        port: 18789,
        path: '/api/chat',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`,
          'Content-Length': Buffer.byteLength(body),
        },
      };

      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          if (this.onText) this.onText(data);
          if (this.onTurnComplete) this.onTurnComplete();
          resolve(data);
        });
      });

      req.on('error', (e) => {
        if (this.onError) this.onError(e.message);
        if (this.onTurnComplete) this.onTurnComplete();
        resolve('');
      });

      req.write(body);
      req.end();
    });
  }
}

class ClaudeSession extends AgentSession {
  constructor() {
    super('claude');
  }

  send(message) {
    return new Promise((resolve) => {
      const output = [];
      this.proc = spawn('claude', ['--print'], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, CLAUDE_API_KEY: process.env.CLAUDE_API_KEY || '' },
      });

      this.proc.stdout.on('data', (data) => {
        const text = data.toString();
        output.push(text);
        if (this.onText) this.onText(text);
      });

      this.proc.stderr.on('data', (data) => {
        if (this.onError) this.onError(data.toString());
      });

      this.proc.on('close', () => {
        this.isRunning = false;
        if (this.onTurnComplete) this.onTurnComplete();
        resolve(output.join(''));
      });

      this.proc.stdin.write(message + '\n');
      this.proc.stdin.end();
    });
  }
}

// Factory
function createSession(provider) {
  switch (provider) {
    case 'hermes':   return new HermesSession();
    case 'openclaw': return new OpenClawSession();
    case 'claude':   return new ClaudeSession();
    default:          return new AgentSession(provider);
  }
}

// Active sessions per character
const sessions = {};
for (const c of CHARACTERS) {
  sessions[c.id] = createSession(c.aiProvider);
}

// ─────────────────────────────────────────────
// Windows
// ─────────────────────────────────────────────
function createOverlayWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  mainWindow = new BrowserWindow({
    width: 480,
    height: 600,
    transparent: false,
    frame: true,
    alwaysOnTop: true,
    skipTaskbar: false,
    resizable: true,
    hasShadow: true,
    y: 100,
    x: 100,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'overlay.html'));
  mainWindow.setIgnoreMouseEvents(true, { forward: true });

  mainWindow.on('closed', () => { mainWindow = null; });

  console.log('Overlay window created:', width, 'x', height);
}

function createChatWindow(character) {
  if (chatWindows[character.id]) {
    chatWindows[character.id].show();
    chatWindows[character.id].focus();
    return;
  }

  const win = new BrowserWindow({
    width: 480,
    height: 640,
    title: `${character.name} - ${AI_PROVIDER_LABELS[character.aiProvider] || character.aiProvider}`,
    backgroundColor: '#1e1e2e',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  win.loadFile(path.join(__dirname, 'renderer', 'chat.html'));

  // Pass character data to renderer
  win.webContents.on('did-finish-load', () => {
    win.webContents.send('initCharacter', {
      id: character.id,
      name: character.name,
      aiProvider: character.aiProvider,
      color: character.color,
    });
  });

  win.on('closed', () => { delete chatWindows[character.id]; });

  chatWindows[character.id] = win;
  console.log(`Chat window created for ${character.name}`);
}

// ─────────────────────────────────────────────
// Tray Menu - matching macOS style
// ─────────────────────────────────────────────
function buildTrayMenu() {
  const charItems = CHARACTERS.map((char) => {
    const providerMenuItems = AI_PROVIDERS.map((provider) => ({
      label: AI_PROVIDER_LABELS[provider] || provider,
      type: 'radio',
      checked: char.aiProvider === provider,
      click: () => {
        const oldProvider = char.aiProvider;
        char.aiProvider = provider;
        // Rebuild session
        if (sessions[char.id]) sessions[char.id].terminate();
        sessions[char.id] = createSession(provider);
        // Update menu
        tray.setContextMenu(buildTrayMenu());
        // Notify overlay
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('setCharacterAI', {
            characterId: char.id,
            provider,
            characterName: char.name,
            color: char.color,
          });
        }
        // Update chat window title
        if (chatWindows[char.id]) {
          chatWindows[char.id].setTitle(`${char.name} - ${AI_PROVIDER_LABELS[provider]}`);
        }
        console.log(`${char.name}: ${oldProvider} → ${provider}`);
      },
    }));

    // OpenClaw settings item
    providerMenuItems.push({ type: 'separator' });
    providerMenuItems.push({
      label: 'OpenClaw Settings…',
      click: () => {
        spawn('open', ['http://localhost:18789']);
      },
    });

    return {
      label: char.name,
      submenu: [
        { label: `${char.name}'s AI`, enabled: false },
        { type: 'separator' },
        ...providerMenuItems,
      ],
    };
  });

  const template = [
    { label: 'Lil Agents', enabled: false },
    { type: 'separator' },
    ...charItems,
    { type: 'separator' },
    {
      label: 'Sounds',
      type: 'checkbox',
      checked: true,
      click: (menuItem) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('setSoundsEnabled', menuItem.checked);
        }
      },
    },
    { type: 'separator' },
    {
      label: 'Check for Updates…',
      click: () => {
        console.log('Check for updates clicked');
      },
    },
    { type: 'separator' },
    {
      label: 'Quit Lil Agents',
      accelerator: 'CmdOrCtrl+Q',
      click: () => { app.quit(); },
    },
  ];

  return Menu.buildFromTemplate(template);
}

// ─────────────────────────────────────────────
// IPC Handlers
// ─────────────────────────────────────────────
function setupIPC() {
  ipcMain.on('openChat', (event, characterId) => {
    const char = CHARACTERS.find(c => c.id === characterId);
    if (char) createChatWindow(char);
  });

  ipcMain.on('sendMessage', async (event, { characterId, message }) => {
    const session = sessions[characterId];
    const char = CHARACTERS.find(c => c.id === characterId);
    if (!session || !char) return;

    session.onText = (text) => {
      if (chatWindows[characterId] && !chatWindows[characterId].isDestroyed()) {
        chatWindows[characterId].webContents.send('appendOutput', { text, role: 'assistant' });
      }
    };

    session.onError = (text) => {
      if (chatWindows[characterId] && !chatWindows[characterId].isDestroyed()) {
        chatWindows[characterId].webContents.send('appendOutput', { text: `Error: ${text}`, role: 'error' });
      }
    };

    session.onTurnComplete = () => {
      if (chatWindows[characterId] && !chatWindows[characterId].isDestroyed()) {
        chatWindows[characterId].webContents.send('streamEnd');
      }
      // Play completion sound
      playCharacterSound(char.name);
    };

    // Append user message to chat
    if (chatWindows[characterId] && !chatWindows[characterId].isDestroyed()) {
      chatWindows[characterId].webContents.send('appendOutput', { text: message, role: 'user' });
    }

    session.send(message);
  });

  ipcMain.on('terminateSession', (event, characterId) => {
    if (sessions[characterId]) {
      sessions[characterId].terminate();
    }
  });
}

// ─────────────────────────────────────────────
// App Lifecycle
// ─────────────────────────────────────────────
app.whenReady().then(() => {
  initAudio();
  preloadSounds();
  setupIPC();
  createOverlayWindow();

  // Forward renderer console.log to electron-log (mainWindow now exists)
  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    if (level >= 0) {
      console.log(`[${Date.now()}] [renderer] ${message}`);
    }
  });

  tray = new Tray(nativeImage.createEmpty());
  tray.setContextMenu(buildTrayMenu());
  tray.setToolTip('Lil Agents');

  tray.on('click', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.hide();
      } else {
        mainWindow.show();
      }
    }
  });

  console.log('Lil Agents Electron started');
  console.log('Characters:', CHARACTERS.map(c => `${c.name}(${c.aiProvider})`).join(', '));
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (!mainWindow) createOverlayWindow();
});
