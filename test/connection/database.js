const Datastore = require('nedb')
const db = new Datastore({ filename: '../assets/app.db', autoload: true });

module.exports = {
  db: db
}