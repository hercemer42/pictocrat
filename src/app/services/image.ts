import { Injectable, NgZone } from '@angular/core'
import { ImageDetails } from '../models/models'
import { RendererSendService } from './renderer-send'

@Injectable()
export class ImageService {
  imageDetails: ImageDetails
  recentlyClicked = false
  timer = null
  slideshowStopped = true
  /**
   * Helps to prevents css transform rotation until the image is served.
   * Will be set to truthy in the frame.html template once the image has fully loaded.
   * @TODO doesn't always work, try something else
   */
  rendered = true

  constructor(
    private rendererSendService: RendererSendService,
    readonly nz: NgZone
  ) { }

  public toggleSlideShow() {
    this.clicked()
    this.slideshowStopped = !this.slideshowStopped
    this.slideshowStopped ? this.rendererSendService.stopShow() : this.rendererSendService.startShow()
  }

  public clicked() {
    this.recentlyClicked = true
    clearTimeout(this.timer)
    this.timer = setTimeout(() => { this.recentlyClicked = false }, 3000)
  }

  public next() {
    this.stopSlideShow()
    this.rendererSendService.next()
  }

  public previous() {
    this.stopSlideShow()
    this.rendererSendService.previous()
  }

  public stopSlideShow() {
    if (this.slideshowStopped) {
      return
    }

    this.clicked()
    this.slideshowStopped = true
    this.rendererSendService.stopShow()
  }

  public rotateLeft() {
    this.stopSlideShow()

    this.nz.run(() => {
      if (!this.imageDetails.rotate) {
        this.imageDetails.rotate = 3
        return
      }

      this.imageDetails.rotate--
    })

    this.rendererSendService.updateDetails(this.imageDetails)
  }

  public rotateRight() {
    this.stopSlideShow()

    this.nz.run(() => {
      if (!this.imageDetails.rotate) {
        this.imageDetails.rotate = 0
      }

      if (this.imageDetails.rotate == 3) {
        this.imageDetails.rotate = 0
        return
      }

      this.imageDetails.rotate++
    })

    this.rendererSendService.updateDetails(this.imageDetails)
  }
}