'use strict';

const { Menu, shell, app, dialog } = require('electron');
const store = require('./store');

function buildMenu(mainWindow) {
  const isMac = process.platform === 'darwin';

  const template = [
    ...(isMac ? [{ role: 'appMenu' }] : []),
    {
      label: 'File',
      submenu: [
        {
          label: 'Open TrackAll URL…',
          accelerator: 'CmdOrCtrl+O',
          async click() {
            const { response, checkboxChecked } = await dialog.showMessageBox(mainWindow, {
              type: 'question',
              title: 'Open URL',
              message: `Current URL: ${store.get('appUrl')}`,
              detail: 'Restart the app to connect to a different server.',
              buttons: ['OK'],
            });
          },
        },
        { type: 'separator' },
        isMac ? { role: 'close' } : { role: 'quit' },
      ],
    },
    { role: 'editMenu' },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        ...(isMac
          ? [{ type: 'separator' }, { role: 'front' }]
          : []),
      ],
    },
    {
      role: 'help',
      submenu: [
        {
          label: 'Learn More',
          click() { shell.openExternal('https://trackall.in'); },
        },
        {
          label: `About TrackAll v${app.getVersion()}`,
          click() {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'About TrackAll',
              message: `TrackAll v${app.getVersion()}`,
              detail: 'Universal Delivery Tracker for India\nhttps://trackall.in',
              buttons: ['OK'],
            });
          },
        },
      ],
    },
  ];

  return Menu.buildFromTemplate(template);
}

module.exports = { buildMenu };
