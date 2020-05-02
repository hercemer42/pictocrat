import { Injectable } from '@angular/core'
import { ImageService } from './image';

@Injectable()
export class SettingsService {
  settings: any
  showSettings = false;
  hiddenList = []
  hiddenListMappedByDirectoryName = {}

  constructor(private imageService: ImageService) { }

  public toggleSettings() {
    this.showSettings = !this.showSettings

    if (this.showSettings) {
      this.imageService.stopSlideShow()
    }
  }

  /**
   * Creates a reference map of hidden files by directory name,
   * adds the directories as elements to the array,
   * then sorts the hidden files by directory name.
   * 
   * @param hiddenList the list of hidden files
   */
  public sortAndMapHiddenList(hiddenList) {
    const directories = {}
    this.hiddenListMappedByDirectoryName = {}

    // create the reference map
    hiddenList.forEach(h => {
      h.fullName = h.directory + h.imageName

      if (!this.hiddenListMappedByDirectoryName[h.relativeDirectory]) {
        this.hiddenListMappedByDirectoryName[h.relativeDirectory] = []
      }

      if (!directories[h.directory]) {
        directories[h.directory] = {
          directory: h.directory,
          relativeDirectory: h.relativeDirectory,
          fullName: h.directory,
          type: 'directory',
          hidden: true
        }
      }

      this.hiddenListMappedByDirectoryName[h.relativeDirectory].push(h)
    })

    // add the directories
    this.hiddenList = hiddenList.concat(Object.keys(directories).map(d => directories[d]))
    // sort the hidden list
    this.hiddenList.sort((a, b) => a.fullName.localeCompare(b.fullName));
  }
}