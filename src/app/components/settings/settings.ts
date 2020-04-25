import { Component } from '@angular/core'
import { SettingsService } from '../../services/settings'

@Component({
  selector: 'settings-component',
  templateUrl: './settings.html',
  styleUrls: ['./settings.scss']
})

export class SettingsComponent {
  constructor(private settingsService: SettingsService) { }
}
