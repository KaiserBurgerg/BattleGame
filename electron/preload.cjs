const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  openStandalone916Window: () => {
    ipcRenderer.send('open-standalone-916-window');
  },
  connectTikTokLive: (username) => {
    ipcRenderer.send('connect-tiktok-live', username);
  },
  onTikTokLiveEvent: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on('tiktok-live-event', listener);
    return () => ipcRenderer.removeListener('tiktok-live-event', listener);
  },
});
