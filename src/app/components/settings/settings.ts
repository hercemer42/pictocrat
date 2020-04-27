import { Component, OnInit } from '@angular/core'
import { SettingsService } from '../../services/settings'
import { RendererSendService } from '../../services/renderer-send'

@Component({
  selector: 'settings-component',
  templateUrl: './settings.html',
  styleUrls: ['./settings.scss']
})

export class SettingsComponent {
  public showMenu = 'general'

  constructor(
    public settingsService: SettingsService,
    private rendererSendService: RendererSendService,
  ) { }

  ngOnInit() {
    this.rendererSendService.getHiddenList()
  }

  /**
   * @param imageDetails The image to hide/unhide
   */
  toggleHideFile(imageDetails) {
    this.rendererSendService.toggleHideFile(imageDetails)
  }

  /**
   * @param directory the directory to hide/unhide
   */
  toggleHideDirectory(directory) {
    directory.images.forEach(e => e.hidden = directory.hidden)
    this.rendererSendService.toggleHideDirectory(directory)
  }
}
