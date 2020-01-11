import { app, BrowserWindow, screen, ipcMain } from 'electron'
import Rx = require('rxjs/Rx')
const fileService = require('./services/files')
const idleService = require('./services/idle')
const config = require('./config')

let win, serve

const args = process.argv.slice(1)
serve = args.some(val => val === '--serve')

if (serve) {
  require('electron-reload')(__dirname, {
    electron: require('${__dirname}/../../node_modules/electron')
  })
}

function createWindow() {
  const electronScreen = screen;
  const size = electronScreen.getPrimaryDisplay().workAreaSize;

  win = new BrowserWindow({
    x: 0,
    y: 0,
    width: size.width,
    height: size.height
  });

  win.loadURL('file://' + __dirname + '/index.html');

  if (serve) {
    win.webContents.openDevTools();
  }

  win.on('closed', () => {
    win = null;
  })
}

function scanPeriodically() {
  setTimeout(() => {
    fileService.scan()
  }, 30 * 60 * 1000)
}

function initializeSettings(settings) {

  for (const property in config.defaults) {
    if (!settings.get(property)) {
      settings.set(property, config.defaults[property])
    }
  }
}

try {
  app.on('ready', (() => {
    // leave this here, app needs to initialize first
    const settings = require('electron-settings')
    require('./services/browser-events')

    createWindow()
    initializeSettings(settings)
    idleService.startTimer(win)

    if (settings.get('PictureDirectory')) {
      fileService.scan()
      scanPeriodically()
    }
  }))

  app.on('window-all-closed', () => {
    // OSX
    if (process.platform !== 'darwin') {
      app.quit()
    }
  })

  app.on('activate', () => {
    // OSX
    if (win === null) {
      createWindow()
    }
  })

} catch (e) { }
