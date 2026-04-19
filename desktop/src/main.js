'use strict';

const { app, BrowserWindow, ipcMain, shell, Notification, dialog } = require('electron');
const path = require('path');
const { createTray, updateBadge } = require('./tray');
const { setupUpdater } = require('./updater');
const store = require('./store');
const { buildMenu } = require('./menu');

const isDev = process.env.ELECTRON_IS_DEV === '1';
const APP_URL = store.get('appUrl', 'http://localhost:3000');

let mainWindow;
let tray;
let isQuitting = false;

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
  process.exit(0);
}

if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient('trackall', process.execPath, [path.resolve(process.argv[1])]);
  }
} else {
  app.setAsDefaultProtocolClient('trackall');
}

function createWindow() {
  const bounds = store.get('windowBounds', { width: 1280, height: 800 });

  mainWindow = new BrowserWindow({
    width: bounds.width || 1280,
    height: bounds.height || 800,
    x: bounds.x,
    y: bounds.y,
    minWidth: 800,
    minHeight: 600,
    title: 'TrackAll',
    backgroundColor: '#0f172a',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.js'),
    },
    show: false,
  });

  mainWindow.loadURL(APP_URL);

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    if (isDev) mainWindow.webContents.openDevTools();
  });

  mainWindow.on('close', (e) => {
    if (!isQuitting && store.get('minimizeToTray', true)) {
      e.preventDefault();
      mainWindow.hide();
    } else {
      store.set('windowBounds', mainWindow.getBounds());
    }
  });

  mainWindow.webContents.on('did-fail-load', () => {
    mainWindow.webContents.executeJavaScript(`
      document.body.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100vh;background:#0f172a;color:#94a3b8;font-family:sans-serif;flex-direction:column;gap:16px"><h2 style="color:#f87171">⚠ Unable to connect</h2><p>Make sure the TrackAll server is running at ${APP_URL}</p></div>';
    `).catch(() => {});
  });

  app.setApplicationMenu(buildMenu(mainWindow));
  return mainWindow;
}

app.whenReady().then(() => {
  mainWindow = createWindow();
  tray = createTray(mainWindow);
  setupUpdater(mainWindow);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    } else {
      mainWindow.show();
    }
  });
});

app.on('second-instance', (_event, argv) => {
  if (mainWindow) {
    if (mainWindow.isMinimized() || !mainWindow.isVisible()) mainWindow.show();
    mainWindow.focus();
  }
  const deepLink = argv.find((a) => a.startsWith('trackall://'));
  if (deepLink) handleDeepLink(deepLink);
});

app.on('open-url', (_event, url) => {
  handleDeepLink(url);
});

app.on('before-quit', () => {
  isQuitting = true;
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

function handleDeepLink(url) {
  if (mainWindow) {
    mainWindow.webContents.send('deep-link', url);
    mainWindow.show();
    mainWindow.focus();
  }
}

// IPC handlers
ipcMain.handle('get-deliveries', async () => {
  try {
    const res = await fetch(`${store.get('appUrl', 'http://localhost:4000')}/api/shipments`);
    return await res.json();
  } catch {
    return [];
  }
});

ipcMain.handle('show-notification', (_event, title, body) => {
  if (Notification.isSupported()) {
    new Notification({ title, body, silent: false }).show();
  }
});

ipcMain.handle('open-external-link', (_event, url) => {
  shell.openExternal(url);
});

ipcMain.handle('minimize-to-tray', () => {
  if (mainWindow) mainWindow.hide();
});

ipcMain.handle('update-badge', (_event, count) => {
  updateBadge(count, mainWindow);
});
