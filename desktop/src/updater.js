'use strict';

const { autoUpdater } = require('electron-updater');
const { dialog } = require('electron');
const log = require('electron-log');

autoUpdater.logger = log;
autoUpdater.logger.transports.file.level = 'info';
autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = true;

function setupUpdater(mainWindow) {
  autoUpdater.on('checking-for-update', () => {
    log.info('Checking for update...');
  });

  autoUpdater.on('update-available', (info) => {
    log.info('Update available:', info.version);
    mainWindow.webContents.send('update-available', info.version);
  });

  autoUpdater.on('update-not-available', () => {
    log.info('No update available.');
  });

  autoUpdater.on('download-progress', (progress) => {
    log.info(`Download speed: ${progress.bytesPerSecond} | ${Math.round(progress.percent)}%`);
  });

  autoUpdater.on('update-downloaded', (info) => {
    log.info('Update downloaded:', info.version);
    dialog
      .showMessageBox(mainWindow, {
        type: 'info',
        title: 'Update Ready',
        message: `TrackAll ${info.version} has been downloaded.`,
        detail: 'Restart the app now to apply the update.',
        buttons: ['Restart Now', 'Later'],
        defaultId: 0,
      })
      .then(({ response }) => {
        if (response === 0) autoUpdater.quitAndInstall();
      });
  });

  autoUpdater.on('error', (err) => {
    log.error('Auto-updater error:', err);
  });

  setTimeout(() => {
    autoUpdater.checkForUpdatesAndNotify().catch((err) => log.warn('Update check failed:', err));
  }, 3000);
}

function checkForUpdates() {
  autoUpdater.checkForUpdatesAndNotify().catch((err) => log.warn('Manual update check failed:', err));
}

module.exports = { setupUpdater, checkForUpdates };
