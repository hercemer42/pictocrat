import { app } from 'electron'
const fs = require('fs');
const settingsPath = app.getPath('userData') + '/settings.json'

/**
 * @param {object} settings 
 */
function set(settings) {
  let existingSettings = {}

  if (fs.existsSync(settingsPath)) {
    existingSettings = get()
  }

  fs.writeFileSync(settingsPath, JSON.stringify({...existingSettings, ...settings}), { encoding: 'utf8' })
}

/**
 * @param {string} settingName 
 */
function get(settingName = null) {
  if (fs.existsSync(settingsPath)) {
    let settings = {}

    try {
      settings = JSON.parse(fs.readFileSync(settingsPath, "utf8"))
    } catch {
      return 
    }

    return settingName ? settings[settingName] : settings
  }

  return
}

module.exports = {
  set: set,
  get: get
}