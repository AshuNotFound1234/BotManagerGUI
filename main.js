const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow;
const bots = {}; // store child processes by username

// This function creates the main Electron window
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 830,        // your desired width
    height: 559,       // your desired height
    resizable: true,   // optional, allow resizing
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  mainWindow.loadFile('ip.html');

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Called when Electron is ready
app.on('ready', createWindow);

// Quit app when all windows are closed
app.on('window-all-closed', () => {
  for (let username in bots) {
    if (bots[username]) bots[username].kill();
  }
  app.quit();
});

// ===== IPC handlers for bots =====
ipcMain.handle('create-bot', (event, { username, host, port }) => {
  if (bots[username]) return { error: 'Bot already running' };
  const botProcess = spawn('node', [path.join(__dirname, 'bot.js'), username, host, port], { stdio: ['pipe','pipe','pipe','ipc'] });
  bots[username] = botProcess;

  botProcess.on('message', (msg) => {
    if (mainWindow) mainWindow.webContents.send('bot-chat', { username, message: msg });
  });

  botProcess.stdout.on('data', (data) => {
    if (mainWindow) mainWindow.webContents.send('bot-chat', { username, message: data.toString() });
  });

  botProcess.on('exit', () => {
    if (mainWindow) mainWindow.webContents.send('bot-disconnected', username);
    delete bots[username];
  });

  return {};
});

ipcMain.handle('disconnect-bot', (event, username) => {
  if (bots[username]) {
    bots[username].kill();
    delete bots[username];
  }
});

ipcMain.handle('send-chat', (event, { username, message }) => {
  if (bots[username]) bots[username].send({ type: 'chat', message });
});
