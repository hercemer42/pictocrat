// @TODO rename all service classes as service
// @TODO interfaces
// @TODO params
// @TODO look into creating container for singletons

// import external modules
import { app, BrowserWindow, screen, ipcMain, dialog } from 'electron'
import * as path from 'path'
import * as url from 'url'
import * as fs from 'fs'
import * as Rx from 'rxjs/Rx'
const Datastore = require('nedb')
const rimraf = require('rimraf')
const systemIdleTime = require('desktop-idle')
const express = require('express')

// import internal modules
import { startEvents } from './lib/services/browser-events'
import { FileService } from './lib/services/files'
import { SlideShow } from './lib/services/slideshow'
import { IdleService } from './lib/services/idle'
import { SettingsService } from './lib/services/settings'
import { ServerService } from './lib/services/server'

// import config
import { config } from './lib/config'

// declare variables
const dbPath = app.getPath('userData') + '/app.db'
const settingsPath = app.getPath('userData') + '/settings.json'
const idleTime = systemIdleTime.getIdleTime()

// singleton instantiation
const settingsService = new SettingsService(fs, settingsPath, config)
const db = new Datastore({ filename: dbPath, autoload: true });
const slideShow = new SlideShow(db, config, settingsService, Rx)
const serverService = new ServerService(express)
// @TODO see if this can be refactored to reduce dependencies
const fileService = new FileService(fs, db, config, slideShow, rimraf, dialog, serverService, settingsService)
const idleService = new IdleService(idleTime, settingsService)

startEvents(ipcMain, fileService, slideShow, settingsService)

let win: BrowserWindow = null;
const args = process.argv.slice(1),
    serve = args.some(val => val === '--serve');

function createWindow(): BrowserWindow {

  const electronScreen = screen;
  const size = electronScreen.getPrimaryDisplay().workAreaSize;

  // Create the browser window.
  win = new BrowserWindow({
    x: 0,
    y: 0,
    width: size.width,
    height: size.height,
    webPreferences: {
      nodeIntegration: true
    },
  });

  if (serve) {
    require('electron-reload')(__dirname, {
      electron: require(`${__dirname}/node_modules/electron`)
    });
    win.loadURL('http://localhost:4200');
  } else {
    win.loadURL(url.format({
      pathname: path.join(__dirname, 'dist/index.html'),
      protocol: 'file:',
      slashes: true
    }));
  }

  if (serve) {
    win.webContents.openDevTools();
  }

  // Emitted when the window is closed.
  win.on('closed', () => {
    // Dereference the window object, usually you would store window
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    win = null;
  });

  return win;
}

/**
 * Scans for file changes periodically
 */
function scanPeriodically() {
  setTimeout(() => {
    fileService.scan()
  }, settingsService.get('rescanDelayInMinutes') * 60 * 1000)
}

try {

  // This method will be called when Electron has finished
  // initialization and is ready to create browser windows.
  // Some APIs can only be used after this event occurs.
  app.on('ready', createWindow);

  // Quit when all windows are closed.
  app.on('window-all-closed', () => {
    // On OS X it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  app.on('activate', () => {
    // On OS X it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (win === null) {
      createWindow();
    }
  });

  app.on('ready', () => {
    idleService.startTimer(win)

    let pictureDirectory = settingsService.get('pictureDirectory')

    if (pictureDirectory) {
      fileService.scan()
      serverService.startStaticFileServer(pictureDirectory, config.defaults.expressJsPort)
      scanPeriodically()
    }
  })
} catch (e) {
  // Catch Error
  // throw e;
}
