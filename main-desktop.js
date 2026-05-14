const path = require('path');
const { app, BrowserWindow, ipcMain } = require('electron');
require('./src/server/socket-server.js'); // This launches the Express + Socket.IO server in the background when Electron starts

let win;

function createWindow() {
  win = new BrowserWindow({
    width: 1200,
    height: 800,
    frame: false, // Frameless for your custom buttons
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webviewTag: true
    }
  });

  win.loadURL('http://localhost:4200');
}

app.whenReady().then(createWindow);

// This must be OUTSIDE the createWindow function
ipcMain.on('window-close', () => {
  console.log("Electron received: Close"); // This will show in your TERMINAL
  app.quit();
});

ipcMain.on('window-minimize', () => {
  if (win) win.minimize();
});

ipcMain.on('window-maximize', () => {
  if (win) {
    if (win.isMaximized()) win.unmaximize();
    else win.maximize();
  }
});