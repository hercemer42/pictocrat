import { Injectable, NgZone } from '@angular/core'
import { ipcRenderer } from 'electron'
import { ImageService } from './image'
import { SettingsService } from './settings'
import { MessageService } from './message'

@Injectable()
export class RendererOnService {
  private firstRun = true

  constructor(
    private imageService: ImageService,
    private settingsService: SettingsService,
    private messageService: MessageService,
    readonly nz: NgZone
  ) { }

  init() {
    ipcRenderer.on('newImage', (event, imageDetails) => {
      this.imageService.imageDetails = imageDetails

      this.nz.run(() => {
        // prevents css transform rotation from taking place until the new image is served
        this.imageService.rendered = false

        if (this.firstRun) {
          this.firstRun = false
          this.imageService.slideshowStopped = false
        }
      })
    })

    ipcRenderer.on('message', (event, message) => {
      this.nz.run(() => {this.messageService.showMessage(message)})
    })

    ipcRenderer.on('deleted', (event, message) => {
      this.nz.run(() => {
        this.messageService.showMessage(message)
        this.imageService.slideshowStopped ? this.imageService.imageDetails = null : ipcRenderer.send('start')
      })
    })

    ipcRenderer.on('hidden', (event, message) => {
      this.nz.run(() => {
        this.messageService.showMessage(message)
        this.imageService.slideshowStopped ? this.imageService.imageDetails = null : ipcRenderer.send('start')
      })
    })

    ipcRenderer.on('sendSettings', (event, settings) => {
      this.nz.run(() => {
        this.settingsService.settings = settings
      })
    })

    ipcRenderer.on('sendHiddenList', (event, hiddenList) => {
      this.nz.run(() => {
        this.settingsService.sortAndMapHiddenList(hiddenList)
      })
    })
  }
}