'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('trackall', {
  isDesktop: true,
  platform: process.platform,
  version: process.env.npm_package_version || '1.0.0',

  onDeepLink(callback) {
    ipcRenderer.on('deep-link', (_event, url) => callback(url));
  },

  showNotification(title, body) {
    return ipcRenderer.invoke('show-notification', title, body);
  },

  openExternal(url) {
    return ipcRenderer.invoke('open-external-link', url);
  },

  minimize() {
    return ipcRenderer.invoke('minimize-to-tray');
  },

  updateBadge(count) {
    return ipcRenderer.invoke('update-badge', count);
  },

  getDeliveries() {
    return ipcRenderer.invoke('get-deliveries');
  },
});
