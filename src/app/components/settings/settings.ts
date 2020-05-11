import { Component } from '@angular/core'
import { SettingsService } from '../../services/settings'
import { RendererSendService } from '../../services/renderer-send'
import { IconsService } from '../../services/icons'

@Component({
  selector: 'settings-component',
  templateUrl: './settings.html',
  styleUrls: ['./settings.scss']
})

export class SettingsComponent {
  public showMenu = 'general'

  constructor(
    public settingsService: SettingsService,
    public iconsService: IconsService,
    private rendererSendService: RendererSendService,
  ) { }

  ngOnInit() {
    this.rendererSendService.getHiddenList()
  }

  /**
   * @param toHide The image or directory to hide/unhide
   */
  toggleHide(toHide) {
    if (toHide.type !== 'directory') {
      this.rendererSendService.toggleHideFile(toHide)
      return
    }

    if (!toHide.hidden) {
      this.rendererSendService.showDirectory(toHide)
      this.settingsService.hiddenListMappedByDirectoryName[toHide.relativeDirectory].forEach(f => f.hidden = false)
      return
    }

    // hide the files that were previously unhidden
    const ids = this.settingsService.hiddenListMappedByDirectoryName[toHide.relativeDirectory].map(f => {
      f.hidden = true
      return f._id
    })

    this.rendererSendService.hideFilesById(ids)
  }
}
