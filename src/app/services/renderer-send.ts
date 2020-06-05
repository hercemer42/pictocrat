import { Injectable } from '@angular/core'
import { ipcRenderer } from 'electron'

@Injectable()
export class RendererSendService {

  public pickDirectory() {
    ipcRenderer.send('pickDirectory')
  }

  public scan() {
    ipcRenderer.send('scan')
  }

  public deleteImage(imageDetails) {
    ipcRenderer.send('deleteImage', imageDetails)
  }

  public deleteDirectory(imageDetails) {
    ipcRenderer.send('deleteDirectory', imageDetails)
  }

  public hideImage(imageDetails) {
    ipcRenderer.send('hideImage', imageDetails)
  }

  public hideDirectory(imageDetails) {
    ipcRenderer.send('hideDirectory', imageDetails)
  }

  public toggleHideFile(imageDetails) {
    ipcRenderer.send('toggleHideFile', imageDetails)

  }

  public showDirectory(directoryDetails) {
    ipcRenderer.send('showDirectory', directoryDetails)
  }

  // for when we want to re-check the directory within the settings/unhide dialog after having unchecked it
  public hideFilesById(fileIds) {
    ipcRenderer.send('hideFilesById', fileIds)
  }

  public stopShow() {
    ipcRenderer.send('stopShow')
  }

  public startShow() {
    ipcRenderer.send('start')
  }
  
  public getHiddenList() {
    ipcRenderer.send('getHiddenList')
  }

  public next() {
    ipcRenderer.send('next')
  }

  public previous() {
    ipcRenderer.send('previous')
  }

  public updateDetails(imageDetails) {
    ipcRenderer.send('updateDetails', imageDetails) 
  }

  public updateSettings(settings) {
    ipcRenderer.send('updateSettings', settings) 
  }
}