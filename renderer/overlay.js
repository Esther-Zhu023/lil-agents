// Constants
const CHARACTER_POSITIONS = [0.15, 0.38, 0.62, 0.85];
const CHARACTER_NAMES = ['Alpha', 'Beta', 'Gamma', 'Delta'];
const CHARACTER_COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4'];
const AI_PROVIDERS = ['claude', 'gpt4', 'gemini', 'llama', 'mistral'];
const WALK_CYCLE_FRAMES = [
    { bodyOffsetY: 0, legOffsetY: -2, armOffsetY: 2 },
    { bodyOffsetY: -1, legOffsetY: 0, armOffsetY: 0 },
    { bodyOffsetY: 0, legOffsetY: -2, armOffsetY: 2 },
    { bodyOffsetY: -1, legOffsetY: 0, armOffsetY: 0 },
];
// State
let characters = [];
let canvas;
let ctx;
let lastTime = 0;
// Initialize characters
function initCharacters() {
    characters = CHARACTER_POSITIONS.map((pos, i) => ({
        id: i,
        name: CHARACTER_NAMES[i],
        x: Math.random() * 0.2 + pos - 0.1,
        targetX: pos,
        speed: 0.015 + Math.random() * 0.01,
        direction: Math.random() > 0.5 ? 1 : -1,
        aiProvider: AI_PROVIDERS[i % AI_PROVIDERS.length],
        frame: 0,
        frameTimer: 0,
        color: CHARACTER_COLORS[i],
    }));
}
// Draw a walking character on canvas
function drawCharacter(char, walkFrame) {
    const x = char.x * canvas.width;
    const y = canvas.height - 80;
    const size = 64;
    ctx.save();
    // Flip if walking left
    if (char.direction === -1) {
        ctx.translate(x + size / 2, 0);
        ctx.scale(-1, 1);
        ctx.translate(-(x + size / 2), 0);
    }
    // Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.beginPath();
    ctx.ellipse(x + size / 2, y + size - 4, size / 2 - 8, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    // Legs
    ctx.fillStyle = darkenColor(char.color, 30);
    ctx.fillRect(x + 18, y + size - 20 + walkFrame.legOffsetY, 10, 20 - walkFrame.legOffsetY);
    ctx.fillRect(x + 36, y + size - 20 + walkFrame.legOffsetY, 10, 20 - walkFrame.legOffsetY);
    // Body
    ctx.fillStyle = char.color;
    ctx.fillRect(x + 12, y + 16 + walkFrame.bodyOffsetY, 40, 32);
    // Arms
    ctx.fillStyle = darkenColor(char.color, 15);
    ctx.fillRect(x + 4, y + 20 + walkFrame.armOffsetY, 10, 24);
    ctx.fillRect(x + 50, y + 20 - walkFrame.armOffsetY, 10, 24);
    // Head
    ctx.fillStyle = char.color;
    ctx.fillRect(x + 16, y + 2 + walkFrame.bodyOffsetY, 32, 24);
    // Eyes
    ctx.fillStyle = '#fff';
    ctx.fillRect(x + 22, y + 10 + walkFrame.bodyOffsetY, 8, 8);
    ctx.fillRect(x + 34, y + 10 + walkFrame.bodyOffsetY, 8, 8);
    // Pupils
    ctx.fillStyle = '#000';
    const pupilOffset = char.direction === 1 ? 2 : 0;
    ctx.fillRect(x + 24 + pupilOffset, y + 12 + walkFrame.bodyOffsetY, 4, 4);
    ctx.fillRect(x + 36 + pupilOffset, y + 12 + walkFrame.bodyOffsetY, 4, 4);
    // AI Provider indicator (small dot)
    ctx.fillStyle = getProviderColor(char.aiProvider);
    ctx.beginPath();
    ctx.arc(x + size / 2, y - 8, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}
// Darken a hex color
function darkenColor(hex, percent) {
    const num = parseInt(hex.slice(1), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.max((num >> 16) - amt, 0);
    const G = Math.max(((num >> 8) & 0x00FF) - amt, 0);
    const B = Math.max((num & 0x0000FF) - amt, 0);
    return `#${(1 << 24 | R << 16 | G << 8 | B).toString(16).slice(1)}`;
}
// Get color for AI provider
function getProviderColor(provider) {
    const colors = {
        claude: '#7952CC',
        gpt4: '#10A37F',
        gemini: '#DB6821',
        llama: '#C19C5F',
        mistral: '#E85A3F',
    };
    return colors[provider] || '#888';
}
// Update character positions
function updateCharacters(deltaTime) {
    const walkSpeed = 0.08;
    for (const char of characters) {
        // Update walk animation frame
        char.frameTimer += deltaTime;
        if (char.frameTimer > 150) {
            char.frame = (char.frame + 1) % WALK_CYCLE_FRAMES.length;
            char.frameTimer = 0;
        }
        // Random direction changes
        if (Math.random() < 0.002) {
            char.direction = char.direction === 1 ? -1 : 1;
        }
        // Random speed changes
        if (Math.random() < 0.005) {
            char.speed = 0.01 + Math.random() * 0.015;
        }
        // Move character
        char.x += char.direction * char.speed * (deltaTime / 16);
        // Boundary checks - bounce back
        if (char.x < 0.02) {
            char.x = 0.02;
            char.direction = 1;
        }
        else if (char.x > 0.85) {
            char.x = 0.85;
            char.direction = -1;
        }
    }
}
// Main render loop
function render(timestamp) {
    const deltaTime = timestamp - lastTime;
    lastTime = timestamp;
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Update positions
    updateCharacters(deltaTime);
    // Draw each character
    for (const char of characters) {
        drawCharacter(char, WALK_CYCLE_FRAMES[char.frame]);
    }
    requestAnimationFrame(render);
}
// Initialize
function init() {
    canvas = document.getElementById('overlay-canvas');
    ctx = canvas.getContext('2d');
    // Set canvas size
    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);
    // Initialize characters
    initCharacters();
    // Start render loop
    requestAnimationFrame(render);
}
// When running in Electron, listen for tray menu changes
if (typeof window.electronAPI !== 'undefined') {
    window.electronAPI.onSetCharacterAI((data) => {
        const char = characters.find(c => c.id === data.characterId);
        if (char) {
            char.aiProvider = data.provider;
        }
    });
}
// Start when DOM is ready
document.addEventListener('DOMContentLoaded', init);
// Export for main process access
window.overlayAPI = {
    setCharacterAI: (charId, provider) => {
        const char = characters.find(c => c.id === charId);
        if (char) {
            char.aiProvider = provider;
        }
    },
    getCharacters: () => characters.map(c => ({ id: c.id, name: c.name, aiProvider: c.aiProvider })),
};
export {};
