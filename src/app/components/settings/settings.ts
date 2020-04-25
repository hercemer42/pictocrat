import { Component } from '@angular/core'
import { SettingsService } from '../../services/settings'
import { RendererSendService } from '../../services/renderer-send'
import { ImageService } from '../../services/image'

@Component({
  selector: 'settings-component',
  templateUrl: './settings.html',
  styleUrls: ['./settings.scss']
})

export class SettingsComponent {
  constructor(
    public settingsService: SettingsService,
    private rendererService: RendererSendService,
    private imageService: ImageService
  ) { }

  // @TODO why is this here?
  toggleHide(imageDetails) {
    this.rendererService.toggleHide(imageDetails)
  }

  // @TODO why is this here?
  toggleHideDirectory(directory) {
    directory.images.forEach(e => e.hidden = directory.hidden)
    this.rendererService.toggleHideDirectory(directory)
  }
}
