import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  versions: {
    node: process.versions.node,
    chrome: process.versions.chrome,
    electron: process.versions.electron,
  },
  send: (channel: string, data: unknown) => {
    ipcRenderer.send(channel, data);
  },
  invoke: (channel: string, data?: unknown) => {
    return ipcRenderer.invoke(channel, data);
  },
});
