const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('gtpAPI', {
  sendCommand: (cmd) => ipcRenderer.send('send-command', cmd),
  onOutput: (callback) => ipcRenderer.on('gtp-output', (_, data) => callback(data)),
  openFile: () => ipcRenderer.invoke('dialog:openFile'),
  saveFile: (content) => ipcRenderer.invoke('dialog:saveFile', content),
});
