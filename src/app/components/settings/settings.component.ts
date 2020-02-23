import { Component } from '@angular/core'
import { UiService } from '../../services/ui.service'

@Component({
  selector: 'settings-component',
  templateUrl: './settings.html',
  styleUrls: ['./settings.scss']
})

export class SettingsComponent {
  constructor(private uiService: UiService) { }
}
