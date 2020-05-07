// @TODO interface for settings
// @TODO params
function startEvents (ipcMain, fileService, slideShow, settingsService) {
  ipcMain.on('start', (event, arg) => {
    slideShow.start(event)
  })

  ipcMain.on('getSettings', (event, arg) => {
    event.sender.send('sendSettings', settingsService.get())
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

  ipcMain.on('showDirectory', (event, directory) => {
    fileService.showDirectory(event, directory)
  })

  ipcMain.on('reHideFiles', (event, ids) => {
    fileService.reHideFiles(event, ids)
  })

  ipcMain.on('updateDetails', (event, imageDetails) => {
    fileService.updateDetails(event, imageDetails)
  })
}

export { startEvents }