class SettingsService {
  private fs
  private settingsPath

  constructor(fs, settingsPath, config) {
    this.fs = fs
    this.settingsPath = settingsPath
    this.set(config.defaults)
  }
  /**
   * @param {object} settings 
   */
  set(settings: Object) {
    let existingSettings = {}

    if (this.fs.existsSync(this.settingsPath)) {
      existingSettings = this.get()
    }

    this.fs.writeFileSync(this.settingsPath, JSON.stringify({...existingSettings, ...settings}), { encoding: 'utf8' })
  }

  /**
   * @param {string} settingName 
   */
  get(settingName: string = null) {
    if (this.fs.existsSync(this.settingsPath)) {
      let settings = {}

      try {
        settings = JSON.parse(this.fs.readFileSync(this.settingsPath, "utf8"))
      } catch {
        return 
      }

      return settingName ? settings[settingName] : settings
    }

    return
  }
}

export { SettingsService }