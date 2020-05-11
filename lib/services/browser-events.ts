// @TODO interface for settings

import { IpcMainEvent } from "electron"
import { ImageDetails, DirectoryDetails } from "../../models/models"

// @TODO params
function startEvents (ipcMain, fileService, slideShow, settingsService) {
  ipcMain.on('start', (event) => {
    slideShow.start(event)
  })

  ipcMain.on('getSettings', (event: IpcMainEvent) => {
    event.sender.send('sendSettings', settingsService.get())
  })

  ipcMain.on('stopShow', () => {
    slideShow.stopShow()
  })

  ipcMain.on('deleteImage', (event: IpcMainEvent, imageDetails: ImageDetails) => {
    fileService.deleteImage(event, imageDetails)
  })

  ipcMain.on('deleteDirectory', (event: IpcMainEvent, imageDetails: ImageDetails) => {
    fileService.deleteDirectory(event, imageDetails)
  })

  ipcMain.on('hideImage', (event: IpcMainEvent, imageDetails: ImageDetails) => {
    fileService.hideImage(event, imageDetails)
  })

  ipcMain.on('hideDirectory', (event: IpcMainEvent, imageDetails: ImageDetails) => {
    fileService.hideDirectory(event, imageDetails)
  })

  ipcMain.on('next', (event: IpcMainEvent) => {
    slideShow.nextInHistory(event)
  })

  ipcMain.on('previous', (event: IpcMainEvent) => {
    slideShow.previousInHistory(event)
  })

  ipcMain.on('scan', (event: IpcMainEvent) => {
    fileService.scan(event)
  })

  ipcMain.on('pickDirectory', (event: IpcMainEvent) => {
    fileService.pickDirectory(event)
  })

  ipcMain.on('getHiddenList', (event: IpcMainEvent) => {
    fileService.getHiddenList(event)
  })

  ipcMain.on('toggleHideFile', (event: IpcMainEvent, imageDetails: ImageDetails) => {
    fileService.toggleHideFile(imageDetails)
  })

  ipcMain.on('showDirectory', (event: IpcMainEvent, directoryDetails: DirectoryDetails) => {
    fileService.showDirectory(directoryDetails)
  })

  ipcMain.on('reHideFiles', (event: IpcMainEvent, ids: Array<string>) => {
    fileService.reHideFiles(ids)
  })

  ipcMain.on('updateDetails', (event: IpcMainEvent, imageDetails: ImageDetails) => {
    fileService.updateDetails(imageDetails)
  })
}

export { startEvents }