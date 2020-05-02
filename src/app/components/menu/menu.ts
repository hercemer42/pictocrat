import { Component } from '@angular/core'
import { RendererSendService } from '../../services/renderer-send'
import { SettingsService } from '../../services/settings'
import { ImageService } from '../../services/image'
import { MessageService } from '../../services/message'
import { IconsService } from '../../services/icons'

@Component({
  selector: 'menu-component',
  templateUrl: './menu.html',
  styleUrls: ['./menu.scss']
})

export class MenuComponent {
  constructor(
    public settingsService: SettingsService,
    public imageService: ImageService,
    public iconsService: IconsService,
    public messageService: MessageService,
    public rendererSendService: RendererSendService
  ) { }

  public deleteImage() {
    if (window.confirm('Are you sure you want to permanantly delete this image?')) {
      this.rendererSendService.deleteImage(this.imageService.imageDetails)
    }
  }

  public deleteDirectory() {
    if (window.confirm(
      `Are you sure you want to permanantly delete the '${this.imageService.imageDetails.directory}' directory and all of its contents?`
    )) {
      this.rendererSendService.deleteDirectory(this.imageService.imageDetails)
    }
  }

  public hideImage() {
    if (window.confirm('Are you sure you want to hide this image? You can unhide it from the settings/hidden menu')) {
      this.rendererSendService.hideImage(this.imageService.imageDetails)
    }
  }

  public hideDirectory() {
    if (window.confirm(
      `Are you sure you want to hide the '${this.imageService.imageDetails.directory}' directory and all of its contents?
      You can unhide it from the settings/hidden menu.`
    )) {
      this.rendererSendService.hideDirectory(this.imageService.imageDetails)
    }
  }

  public previous() {
    this.imageService.slideshowStopped = true
    this.rendererSendService.previous()
  }
}
