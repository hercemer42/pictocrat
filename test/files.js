const fs = require('fs')
const Datastore = require('nedb')
const { expect } = require('chai')
const rimraf = require('rimraf')
const express = require('express')
const dbPath = './assets/app.db'
const db = new Datastore({ filename: dbPath, autoload: true });
const { config } = require('../lib/config')
const { SettingsService } = require('../lib/services/settings')
const { FileService } = require('../lib/services/files')
const pictureDirectory = __dirname + '/assets/images'
const directoryContents = require('./fixtures/directoryContents')

// mock directoryContents
directoryContents.contents.forEach(d => d.directory = pictureDirectory + d.relativeDirectory)
updatedDirectoryContents = directoryContents.contents.map(d => {
  if (d.imageName === 'testFile.jpg') {
    return {
      imageName: 'testFile2.jpg',
      directory: d.directory,
      relativeDirectory: d.relativeDirectory,
      shown: false,
      hidden: false,
      rotate: 0
    }
  }

  return d
}).sort((a, b) => (a.relativeDirectory + a.imageName > b.relativeDirectory + b.imageName) ? 1 : -1)

// stub dialog
class Dialog {
  showOpenDialogSync(properties) {
    return [pictureDirectory]
  }
}

// stub slideshow
class SlideShow {
  stopShow() {}
  start() {}
  deleteFromHistory() {}
}

// stub server
class ServerService {
  startStaticFileServer(dir, port) {}
}

// stub event
const event = {
  sender: {
    send: function(eventType, message) {
      event.latest = message
    }
  },
  latest: ''
}

describe('Array', function() {
  let settingsService

  before(() => {
    const settingsPath = 'assets/settings.json'
    settingsService = new SettingsService(fs, settingsPath, config)
    const slideShow = new SlideShow()
    const serverService = new ServerService(express)
    const dialog = new Dialog
    fileService = new FileService(fs, db, config, slideShow, rimraf, dialog, serverService, settingsService)
  }) 
  
  describe('database', function() {
    it('Should empty the database', function(done) {
      db.remove({ }, { multi: true }, function (err, numRemoved) {
        db.loadDatabase(function (err) {
          expect(err).to.be.null
          done()
        });
      });
    })
  })

  describe('files', function() {
    it ('Should select the picture directory', async function() {
      await fileService.pickDirectory(event)
      expect(settingsService.get('pictureDirectory')).to.equal(pictureDirectory)
    })

    it ('Should read the picture directory', function() {
      fs.unlinkSync(pictureDirectory + '/testFile2.jpg')
      fs.writeFileSync(pictureDirectory + '/testFile.jpg')
      let entries = fileService.readDirectory(pictureDirectory)
      expect(entries).to.eql(directoryContents.contents)
    })

    it ('Should scan the picture directory for changes', function(done) {
      fs.writeFileSync(pictureDirectory + '/testFile2.jpg')
      fs.unlinkSync(pictureDirectory + '/testFile.jpg')
      fileService.scan(event)

      setTimeout(() => {
        expect(event.latest).to.equal('Scan complete!')
        db.find({}, ((err, entries) => {
          const entriesWithoutIds = entries.map(e => {
            delete e._id
            return e
          }).sort((a, b) => (a.relativeDirectory + a.imageName > b.relativeDirectory + b.imageName) ? 1 : -1)

          expect(entriesWithoutIds).to.eql(updatedDirectoryContents)
          done()
        }))
      }, 100);
    })
  })
})

