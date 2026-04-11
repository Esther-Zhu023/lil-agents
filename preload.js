const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Open chat window for a character
  openChat: (characterId) => ipcRenderer.send('openChat', characterId),

  // Send message to a character's AI session
  sendMessage: (characterId, message) => ipcRenderer.send('sendMessage', { characterId, message }),

  // Terminate a character's session
  terminateSession: (characterId) => ipcRenderer.send('terminateSession', characterId),

  // Event: character data received when chat window opens
  onInitCharacter: (callback) => {
    ipcRenderer.on('initCharacter', (e, data) => callback(data));
  },

  // Event: append output text to chat
  onAppendOutput: (callback) => {
    ipcRenderer.on('appendOutput', (e, data) => callback(data));
  },

  // Event: streaming finished
  onStreamEnd: (callback) => {
    ipcRenderer.on('streamEnd', () => callback());
  },

  // Event: character AI provider changed
  onSetCharacterAI: (callback) => {
    ipcRenderer.on('setCharacterAI', (e, data) => callback(data));
  },

  // Event: character started thinking
  onSetThinking: (callback) => {
    ipcRenderer.on('setThinking', (e, data) => callback(data));
  },

  // Event: sounds enabled/disabled
  onSetSoundsEnabled: (callback) => {
    ipcRenderer.on('setSoundsEnabled', (e, enabled) => callback(enabled));
  },
});
