import { Injectable } from '@angular/core'
import { ImageDetails } from '../models/models'
import { RendererSendService } from './renderer-send'

@Injectable()
export class ImageService {
  imageDetails: ImageDetails
  recentlyClicked = false
  timer = null
  slideshowStopped = true;

  constructor(private rendererService: RendererSendService) { }

  public toggleSlideShow() {
    this.recentlyClicked = true
    clearTimeout(this.timer)
    this.timer = setTimeout(() => { this.recentlyClicked = false }, 3000)
    this.slideshowStopped = !this.slideshowStopped
    this.slideshowStopped ? this.rendererService.stopShow() : this.rendererService.startShow()
  }

  public stopSlideShow() {
    this.slideshowStopped = true
    this.rendererService.stopShow()
    this.rendererService.getHiddenList()
  }
}