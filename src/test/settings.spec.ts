import { SettingsService } from '../app/services/settings'
import { hiddenListIn } from './assets/hiddenListIn'
import { hiddenListOut } from './assets/hiddenListOut'

class ImageService {}

describe('Settings service', () => {
  let settingsService: SettingsService

  beforeEach(() => {
    settingsService = new SettingsService(ImageService as any)
  })

  it('Sort and map a list of hidden files', () => {
    settingsService.sortAndMapHiddenList( hiddenListIn )
    expect(settingsService.hiddenList).toEqual(hiddenListOut)
  });
});