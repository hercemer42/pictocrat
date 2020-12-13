const config = {
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
  appName: 'Pictocrat',
  historyLimit: 20,
  defaults: {
    slideShowInterval: 3000,
    maximizeOnIdle: true,
    idleTimeout: 900000,
    expressJsPort: 3000,
    rescanDelayInMinutes: 30,
    bufferLimit: 5
  }
}

export { config }
