'use strict';

const { Tray, Menu, nativeImage, app } = require('electron');
const path = require('path');

let tray;

function createTray(mainWindow) {
  const iconPath = path.join(__dirname, '..', 'assets', 'tray.png');
  const icon = nativeImage.createFromPath(iconPath).isEmpty()
    ? nativeImage.createEmpty()
    : nativeImage.createFromPath(iconPath);

  tray = new Tray(icon);
  tray.setToolTip('TrackAll – Universal Delivery Tracker');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Open TrackAll',
      click() {
        mainWindow.show();
        mainWindow.focus();
      },
    },
    {
      label: 'Check for Updates',
      click() {
        const { checkForUpdates } = require('./updater');
        checkForUpdates();
      },
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click() {
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);

  tray.on('double-click', () => {
    if (mainWindow.isVisible()) {
      mainWindow.focus();
    } else {
      mainWindow.show();
    }
  });

  return tray;
}

function updateBadge(count, mainWindow) {
  if (process.platform === 'darwin') {
    app.dock.setBadge(count > 0 ? String(count) : '');
  } else if (process.platform === 'win32' && mainWindow) {
    if (count > 0) {
      const canvas = nativeImage.createEmpty();
      mainWindow.setOverlayIcon(canvas, `${count} deliveries`);
    } else {
      mainWindow.setOverlayIcon(null, '');
    }
  }
  if (tray) {
    tray.setToolTip(`TrackAll – ${count > 0 ? `${count} active deliveries` : 'Universal Delivery Tracker'}`);
  }
}

module.exports = { createTray, updateBadge };
