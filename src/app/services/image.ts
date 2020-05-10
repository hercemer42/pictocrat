import { Injectable, NgZone, Renderer2 } from '@angular/core'
import { ImageDetails } from '../models/models'
import { RendererSendService } from './renderer-send'

@Injectable()
export class ImageService {
  public imageDetails: ImageDetails
  public recentlyClicked = false
  public slideshowStopped = true

  private imageElement: HTMLImageElement
  private renderer: Renderer2
  private timer = null

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

  /**
   * Increment the image rotation property to the left
   */
  public setRotationLeft() {
    this.stopSlideShow()

    this.nz.run(() => {
      this.imageDetails.rotate = this.imageDetails.rotate ? this.imageDetails.rotate - 1 : 3 
      this.rotateImage(this.imageElement, this.renderer)
    })

    this.rendererSendService.updateDetails(this.imageDetails)
  }

  /**
   * Increment the image rotation property to the right
   */
  public setRotationRight() {
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
   * apply the image rotation to the HTML element 
   * @param { HTMLImageElement } element the image element
   * @param { Renderer2 } renderer  
   */
  public rotateImage(element, renderer) {
    this.imageElement = element
    this.renderer = renderer
    const rotation = this.imageDetails.rotate
    const imageRatio = element.naturalWidth/element.naturalHeight
    this.resetPosition(element, renderer)

    switch(rotation) {
      case 1 :
        this.rotatePerpendicular(element, 'right', imageRatio)
        break
      case 2 :
        this.rotateParallel(element, 'bottom', imageRatio)
       break
      case 3 :
        this.rotatePerpendicular(element, 'left', imageRatio)
        break
      default :
        this.rotateParallel(element, 'top', imageRatio)
    }
  }

  /**
   * set rotation to either 90 or 270 degrees depending on the direction 
   * @param { HTMLImageElement } element 
   * @param { string } direction right or left
   * @param { number } imageRatio 
   */
  private rotatePerpendicular(element, direction, imageRatio) {
    element.width = window.innerHeight 
    element.height = window.innerHeight/imageRatio
    const oppositeDirection = direction === 'right' ? 'left' : 'right'
    this.renderer.setStyle(element, 'transform-origin', `top ${oppositeDirection}`)
    this.renderer.setStyle(element, 'transform', `rotate(${direction === 'right' ? '90deg' : '270deg'})`)
    const offset = element.width - (element.width - element.height)/2
    this.renderer.setStyle(element, oppositeDirection, `${offset}px`)
  }

  /**
   * set rotation to either 0 or 180 degrees depending on the direction 
   * @param { HTMLImageElement } element 
   * @param { string }direction top or bottom
   * @param { number }imageRatio 
   */
  private rotateParallel(element, direction, imageRatio) {
    const screenRatio = window.innerWidth/window.innerHeight

    if (imageRatio > screenRatio) {
      element.width = window.innerWidth
      element.height = element.width/imageRatio
      this.renderer.setStyle(element, 'top', `${(window.innerHeight - element.height)/2}px`)
    } else {
      element.height = window.innerHeight 
      element.width = window.innerHeight*imageRatio
    }

    this.renderer.setStyle(element, 'transform-origin', 'center center')
    this.renderer.setStyle(element, 'transform', `rotate(${direction === 'bottom' ? '180deg' : '0deg'})`)
  }

  /**
   * set the position back to default before applying a rotation
   * @param { HTMLImageElement }element
   * @param { Renderer2 }renderer 
   */
  private resetPosition(element, renderer) {
    renderer.setStyle(element, 'right', `auto`)
    renderer.setStyle(element, 'left', `auto`)
    renderer.setStyle(element, 'top', `auto`)
  }
}