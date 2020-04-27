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

  /**
   * Sort the list of hidden files by directory
   * @param hiddenFiles the list of hidden files
   */
  public sortHiddenList(hiddenList) {
    const directories = {}

    hiddenList.forEach(e => {
      const dir = directories[e.directory]
      dir ? dir.push(e) : directories[e.directory] = [e]
    })

    this.hiddenList = Object.keys(directories).map(e => {
      return { directoryName: e, images: directories[e], hidden: true }
    })
  }
}