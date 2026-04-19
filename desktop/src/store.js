'use strict';

const Store = require('electron-store');

const store = new Store({
  schema: {
    windowBounds: {
      type: 'object',
      properties: {
        x: { type: 'number' },
        y: { type: 'number' },
        width: { type: 'number' },
        height: { type: 'number' },
      },
    },
    isFirstRun: { type: 'boolean' },
    appUrl: { type: 'string' },
    theme: { type: 'string' },
    minimizeToTray: { type: 'boolean' },
    notifications: { type: 'boolean' },
    launchAtStartup: { type: 'boolean' },
  },
  defaults: {
    isFirstRun: true,
    appUrl: 'http://localhost:3000',
    theme: 'dark',
    minimizeToTray: true,
    notifications: true,
    launchAtStartup: false,
  },
});

module.exports = store;
