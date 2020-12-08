import { Component, Renderer2, ViewChild, ElementRef } from '@angular/core'
import { RendererSendService } from '../../services/renderer-send'
import { SettingsService } from '../../services/settings'
import { ImageService } from '../../services/image'
import { MessageService } from '../../services/message'
import { IconsService } from '../../services/icons'

import exifr from 'exifr'

@Component({
  selector: 'menu-component',
  templateUrl: './menu.html',
  styleUrls: ['./menu.scss']
})

export class MenuComponent {
  @ViewChild('imageToDelete') imageToDelete: ElementRef;
  modelOpen = false;

  constructor(
    public settingsService: SettingsService,
    public imageService: ImageService,
    public iconsService: IconsService,
    public messageService: MessageService,
    public rendererSendService: RendererSendService,
    public renderer: Renderer2
  ) { }

  public openDeleteModal() {
    this.modelOpen = true;
  }

  public deleteImage() {
    this.rendererSendService.deleteImage(this.imageService.imageDetails)
    this.closeModal()
  }

  public closeModal() {
    this.modelOpen = false;
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

  public scan() {
    this.imageService.scanning = true
    this.rendererSendService.scan()
  }

  onImageLoad() {
    exifr.parse(this.imageToDelete.nativeElement, { translateValues: false })
    .then(output => {
      this.imageService.rotateImage(this.imageToDelete.nativeElement, this.renderer, output.Orientation)
    })
  }
}
