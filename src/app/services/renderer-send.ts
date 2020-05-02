import { Injectable } from '@angular/core'
import { ipcRenderer } from 'electron'
import { ImageService } from './image'

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

  public toggleHideDirectory(directoryDetails) {
    ipcRenderer.send('toggleHideDirectory', directoryDetails)
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
}