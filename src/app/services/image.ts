import { Injectable, NgZone, Renderer2 } from '@angular/core'
import { ImageDetails } from '../models/models'
import { RendererSendService } from './renderer-send'
import { faWindowMinimize } from '@fortawesome/free-solid-svg-icons'

@Injectable()
export class ImageService {
  imageDetails: ImageDetails
  imageElement: HTMLImageElement
  renderer: Renderer2
  recentlyClicked = false
  timer = null
  slideshowStopped = true

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
      this.rotateImage(this.imageElement, this.renderer)
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
        this.rotateImage(this.imageElement, this.renderer)
        return
      }

      this.imageDetails.rotate++
      this.rotateImage(this.imageElement, this.renderer)
    })

    this.rendererSendService.updateDetails(this.imageDetails)
  }

  /** 
   * Rotates the image while fitting it to the available display,
   */
  rotateImage(element, renderer) {
    this.imageElement = element
    this.renderer = renderer
    const rotation = this.imageDetails.rotate
    const imageRatio = element.naturalWidth/element.naturalHeight
    const screenRatio = window.innerWidth/window.innerHeight
    this.resetPosition(element, renderer)
    const wideImage = imageRatio > screenRatio

    switch(rotation) {
      case 1 :
        element.width = window.innerHeight 
        element.height = window.innerHeight/imageRatio
        this.renderer.setStyle(element, 'transform-origin', 'top left')
        this.renderer.setStyle(element, 'transform', 'rotate(90deg)')
        let offset = element.width - (element.width - element.height)/2
        this.renderer.setStyle(element, 'left', `${offset}px`)
        break
      case 2 :
        if (wideImage) {
          element.width = window.innerWidth
          element.height = element.width/imageRatio
          this.renderer.setStyle(element, 'top', `${(window.innerHeight - element.height)/2}px`)
        } else {
          element.height = window.innerHeight 
          element.width = window.innerHeight*imageRatio
        }
        this.renderer.setStyle(element, 'transform-origin', 'center center')
        this.renderer.setStyle(element, 'transform', 'rotate(180deg)')
        break
      case 3 :
        element.width = window.innerHeight 
        element.height = window.innerHeight/imageRatio
        this.renderer.setStyle(element, 'transform-origin', 'top right')
        this.renderer.setStyle(element, 'transform', 'rotate(270deg)')
        offset = element.width - (element.width - element.height)/2
        this.renderer.setStyle(element, 'right', `${offset}px`)
        break
      default :
        if (wideImage) {
          element.width = window.innerWidth
          element.height = element.width/imageRatio
          this.renderer.setStyle(element, 'top', `${(window.innerHeight - element.height)/2}px`)
        } else {
          element.height = window.innerHeight 
          element.width = window.innerHeight*imageRatio
        }
        this.renderer.setStyle(element, 'transform-origin', 'center center')
        this.renderer.setStyle(element, 'transform', 'rotate(0deg)')
    }
  }

  resetPosition(element, renderer) {
    renderer.setStyle(element, 'right', `auto`)
    renderer.setStyle(element, 'left', `auto`)
    renderer.setStyle(element, 'top', `auto`)
  }
}