import { Injectable } from '@angular/core'
import { ImageService } from './image';

@Injectable()
export class SettingsService {
  settings: any
  showSettings = false;
  hiddenList = []

  constructor(private imageService: ImageService) { }

  public toggleSettings() {
    this.showSettings = !this.showSettings

    if (this.showSettings) {
      this.imageService.stopSlideShow()
    }
  }
}