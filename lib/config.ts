module.exports = {
  fileTypes: [
    'jpg',
    'jpeg',
    'png',
    'gif',
    'apng',
    'svg',
    'bmp',
    'ico'
  ],
  appName: 'PictureViewer',
  historyLimit: 101,
  defaults: {
    interval: 3000,
    maximizeOnIdle: true,
    idleTimeout: 900000,
    expressJsPort: 3000,
    rescanDelayInMinutes: 30
  },
}
