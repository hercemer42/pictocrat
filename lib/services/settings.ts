import { app } from 'electron'
const fs = require('fs');
const appPath = app.getPath('userData') + '/settings.json'

/**
 * @param {object} settings 
 */
function set(settings) {
  let existingSettings = {}

  if (fs.existsSync(appPath)) {
    existingSettings = get()
  }

  fs.writeFileSync(appPath, JSON.stringify({...existingSettings, ...settings}), { encoding: 'utf8' })
}

/**
 * @param {string} settingName 
 */
function get(settingName = null) {
  if (fs.existsSync(appPath)) {
    let settings = {}

    try {
      settings = JSON.parse(fs.readFileSync(appPath, "utf8"))
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