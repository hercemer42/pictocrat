import { app, BrowserWindow, ipcMain  } from 'electron'
import settings = require('electron-settings')
const fileService = require('./files')
const slideShow = require('../services/slideshow')

ipcMain.on('start', (event, arg) => {
  slideShow.start(event)
  event.sender.send('sendSettings', settings.getAll())
})

ipcMain.on('stopShow', (event, arg) => {
  slideShow.stopShow()
})

ipcMain.on('deleteImage', (event, imageDetails) => {
  fileService.deleteImage(event, imageDetails)
})

ipcMain.on('deleteDirectory', (event, imageDetails) => {
  fileService.deleteDirectory(event, imageDetails)
})

ipcMain.on('hideImage', (event, imageDetails) => {
  fileService.hideImage(event, imageDetails)
})

ipcMain.on('hideDirectory', (event, imageDetails) => {
  fileService.hideDirectory(event, imageDetails)
})

ipcMain.on('next', (event) => {
  slideShow.nextInHistory(event)
})

ipcMain.on('previous', (event) => {
  slideShow.previousInHistory(event)
})

ipcMain.on('scan', (event, arg) => {
  fileService.scan(event)
})

ipcMain.on('pickDirectory', (event, arg) => {
  fileService.pickDirectory(event)
})

ipcMain.on('getHiddenList', (event, arg) => {
  fileService.getHiddenList(event)
})

ipcMain.on('toggleHide', (event, imageDetails) => {
  fileService.toggleHide(event, imageDetails)
})

ipcMain.on('toggleHideDirectory', (event, directory) => {
  fileService.toggleHideDirectory(event, directory)
})
