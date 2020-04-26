import { ipcMain  } from 'electron'
const fileService = require('./files')
const slideShow = require('../services/slideshow')
const settings = require('./settings')

ipcMain.on('start', (event, arg) => {
  slideShow.start(event)
})

ipcMain.on('getSettings', (event, arg) => {
  event.sender.send('sendSettings', settings.get())
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

ipcMain.on('toggleHideFile', (event, imageDetails) => {
  fileService.toggleHideFile(event, imageDetails)
})

ipcMain.on('toggleHideDirectory', (event, directory) => {
  fileService.toggleHideDirectory(event, directory)
})
