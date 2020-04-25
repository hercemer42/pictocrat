import { Injectable } from '@angular/core'
import { ipcRenderer } from 'electron'

@Injectable()
export class SettingsService {
  stopped = true;
  showSettings = false;

  toggleSettings() {
    this.showSettings = !this.showSettings

    if (this.showSettings) {
      this.stopped = true
      ipcRenderer.send('stopShow')
      ipcRenderer.send('getHiddenList')
    }
  }
}