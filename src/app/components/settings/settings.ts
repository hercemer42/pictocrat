import { Component, OnInit } from '@angular/core'
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
    toHide.type === 'directory' ?
      this.rendererSendService.toggleHideDirectory(toHide) :
      this.rendererSendService.toggleHideFile(toHide)
  }
}
