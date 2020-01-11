import { app } from 'electron'

function connection () {
  const appPath = app.getPath('userData')
  const Datastore = require('nedb')
  return new Datastore({ filename: appPath + '/app.db', autoload: true });
}

module.exports = connection()
