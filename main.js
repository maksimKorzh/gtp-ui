const { app, BrowserWindow, ipcMain, dialog, Menu } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');

// CHANGE THESE VALUES TO FIT YOUR KATAGO PATH!!!
const KATAGO_PATH = '/home/cmk/katago/katago';
const KATAGO_NET = '/home/cmk/katago/kata1-b10c128.txt.gz';
const KATAGO_CONFIG = '/home/cmk/katago/gtp.cfg';

let engine;

function createWindow() {
  const win = new BrowserWindow({
    fullscreen: true,
    autoHideMenuBar: true,
    width: 890,
    height: 950,
    webPreferences: {
      preload: __dirname + '/preload.js'
    }
  });
  const template = [
    {
      label: 'View',
      submenu: [
        { label: 'Reload', role: 'reload' },
        { label: 'Toggle Developer Tools', role: 'toggleDevTools' },
        { label: 'Fullscreen', role: 'togglefullscreen' },
        { label: 'Exit', role: 'quit' },
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
  win.loadFile('index.html');

  // Start KataGo GTP process
  let isKatago = true;
  engine = spawn(KATAGO_PATH, ['gtp', '-model', KATAGO_NET, '-config', KATAGO_CONFIG]);

  var infoLines = 0;
  engine.stdout.on('data', (data) => {
    let response = data.toString();
    if (isKatago && response.includes('info move')) {
      infoLines++;
      if (infoLines <= 100) {
        if (infoLines == 100) {
          infoLines = 0;
          response = response.replaceAll(' info move', '\ninfo move') + '\n';
          if (!response.includes('info move')) return;
        } else return;
      }
    }
    win.webContents.send('gtp-output', response);
  });
  
  ipcMain.on('toggle-fullscreen', () => {
    if (win) win.setFullScreen(!win.isFullScreen());
  });

  ipcMain.on('send-command', (event, command) => {
    if (engine && engine.stdin.writable) {
      engine.stdin.write(command + '\n');
    }
  });

  ipcMain.handle('dialog:openFile', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog(win, {
      properties: ['openFile'],
      filters: [
        { name: 'Go Games', extensions: ['sgf'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    });
    if (canceled || filePaths.length === 0) return null;
    const content = fs.readFileSync(filePaths[0], 'utf-8');
    return content;
  });
  
  ipcMain.handle('dialog:saveFile', async (event, content) => {
    const { canceled, filePath } = await dialog.showSaveDialog({
      filters: [{ name: 'SGF Files', extensions: ['sgf'] }],
      defaultPath: 'game.sgf'
    });
    if (canceled || !filePath) return false;
    fs.writeFileSync(filePath, content, 'utf-8');
    return true;
  });

  win.on('closed', () => {
    if (engine) engine.kill();
  });
}

app.whenReady().then(createWindow);
