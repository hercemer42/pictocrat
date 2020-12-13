import { IpcMainEvent } from "electron"
import { ImageDetails, DirectoryDetails } from "../../models/models"

function startEvents (ipcMain, services) {
  const { slideShowService, settingsService, fileService } = services
  
  ipcMain.on('start', (event) => {
    if (!services.settingsService.get('pictureDirectory')) {
      return
    }

    if (fileService.firstRun) {
      services.fileService.scan(event)
      fileService.scanPeriodically(event)
      fileService.firstRun = false
      return
    }

    slideShowService.start(event)
  })

  ipcMain.on('getSettings', (event: IpcMainEvent) => {
    event.sender.send('sendSettings', settingsService.get())
  })

  ipcMain.on('stopShow', () => {
    slideShowService.stopShow()
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
    slideShowService.nextInHistory(event)
  })

  ipcMain.on('previous', (event: IpcMainEvent) => {
    slideShowService.previousInHistory(event)
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
    fileService.toggleHideFile(imageDetails, event)
  })

  ipcMain.on('showDirectory', (event: IpcMainEvent, directoryDetails: DirectoryDetails) => {
    fileService.showDirectory(directoryDetails, event)
  })

  ipcMain.on('hideFilesById', (event: IpcMainEvent, ids: Array<string>) => {
    fileService.hideFilesById(ids.toString, event)
  })

  ipcMain.on('updateDetails', (event: IpcMainEvent, imageDetails: ImageDetails) => {
    fileService.updateDetails(imageDetails, event)
  })

  ipcMain.on('updateSettings', (event: IpcMainEvent, settings) => {
    settingsService.set(settings)
  })
}

export { startEvents }