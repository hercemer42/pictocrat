const fs = require('fs')
const Datastore = require('nedb')
const { expect } = require('chai')
const express = require('express')
const { Subject } = require('rxjs')
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
  imageHistory = { images: [] }
  stopShow() {}
  start() {}
  deleteFromHistory() {}
  next() {}
}

// stub server
class ServerService {
  startStaticFileServer(dir, port) {}
}

// stub event
let subject = new Subject()

const event = {
  sender: {
    send: function(eventType, message) {
      return subject.next(message)
    }
  },
  latest: ''
}

// stub rimraf
function rimraf (directory, cb) {
  cb()
}

function removeTemporaryFile(path) {
  if (fs.existsSync(path)) {
    fs.unlinkSync(path)
  }
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
  
  beforeEach(() => {
    subject = new Subject()
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
      removeTemporaryFile(pictureDirectory + '/testFile2.jpg')
      fs.writeFileSync(pictureDirectory + '/testFile.jpg')
      let entries = fileService.readDirectory(pictureDirectory)
      expect(entries).to.eql(directoryContents.contents)
    })

    it ('Should scan the picture directory for changes', function(done) {
      fs.writeFileSync(pictureDirectory + '/testFile2.jpg')
      removeTemporaryFile(pictureDirectory + '/testFile.jpg')

      subject.subscribe({
        next: (message) => {
          expect(message).to.equal('Scan complete!')

          db.find({}, ((err, entries) => {
            const entriesWithoutIds = entries.map(e => {
              delete e._id
              return e
            }).sort((a, b) => (a.relativeDirectory + a.imageName > b.relativeDirectory + b.imageName) ? 1 : -1)

            expect(entriesWithoutIds).to.eql(updatedDirectoryContents)
            done()
          }))
        }
      })

      fileService.scan(event)
    })

    it ('Should hide an image', function(done) {
      db.findOne({ imageName: 'testFile2.jpg'}, ((err, imageDetails) => {
        subject.subscribe({
          next: (message) => {
            expect(message).to.equal('Image hidden! You can unhide it from the settings/hidden menu.')

            db.find({ hidden: true }, ((err, entries) => {
              expect(entries.length).to.equal(1)
              expect(entries[0].imageName).to.eql('testFile2.jpg')
              done()
            }) )
          }
        })

        fileService.hideImage(event, imageDetails)
      }))
    })

    it ('Should hide a directory', function(done) {
      subject.subscribe({
        next: (message) => {
          expect(message).to.equal('Directory hidden! You can unhide it from the settings/hidden menu.')
          
          db.find({hidden: true }, ((err, entries) => {
            expect(entries.length).to.equal(9)
            done()
          }))
        }
      })

      fileService.hideDirectory(event, { directory: pictureDirectory + '/images1'})
    })

    it ('Should not hide the root directory!', function(done) {
      subject.subscribe({
        next: (message) => {
          expect(message).to.equal('You cannot hide a directory that is not part of the assigned picture directory')
          done()
        }
      })

      fileService.hideDirectory(event, { directory: '/' })
    })

    it ('Should not hide the root picture directory', function(done) {
      subject.subscribe({
        next: (message) => {
          expect(message).to.equal('You cannot hide the root picture folder!')
          done()
        }
      })

      fileService.hideDirectory(event, { directory: pictureDirectory })
    })

    it ('Should get the list of hidden files', function(done) {
      const result = updatedDirectoryContents.filter(d => {
        d.hidden = true
        return d.relativeDirectory === '/images1' || d.imageName === 'testFile2.jpg'
      })

      subject.subscribe({
        next: (message) => {
          message = message
            .map(m => {
              delete m._id
              return m
            })
            .sort((a, b) => (a.relativeDirectory + a.imageName > b.relativeDirectory + b.imageName) ? 1 : -1)
          expect(message.length).to.equal(9)
          expect(message).to.eql(result)
          done()
        }
      })

      fileService.getHiddenList(event)
    })

    it ('Should delete a directory', function(done) {
      subject.subscribe({
        next: (message) => {
          expect(message).to.equal('Deleted!')
          db.find({ relativeDirectory: 'images4'}, ((err, results) => {
            expect(results.length).to.equal(0)
            done()
          }))
        }
      })

      fileService.deleteDirectory(event, { directory: pictureDirectory + '/images4' })
    })
  })

  it ('Should not delete the root directory!', function(done) {
    subject.subscribe({
      next: (message) => {
        expect(message).to.equal('You cannot delete a directory that is not part of the assigned picture directory')
        done()
      }
    })

    fileService.deleteDirectory(event, { directory: '/' })
  })

  it ('Should not delete the root picture directory', function(done) {
    subject.subscribe({
      next: (message) => {
        expect(message).to.equal('You cannot delete the root picture folder!')
        done()
      }
    })

    fileService.deleteDirectory(event, { directory: pictureDirectory })
  })

  it ('Should delete a file', function(done) {
    db.findOne({ imageName: 'testFile2.jpg'}, ((err, imageDetails) => {
      subject.subscribe({
        next: (message) => {
          expect(message).to.equal('Deleted!')

          db.find({ imageName: 'testFile2.jpg' }, ((err, entries) => {
            expect(entries.length).to.equal(0)
            done()
          }) )
        }
      })

      fileService.deleteImage(event, imageDetails)
    }))
  })

  it ('Should not delete a file with a bad path name', function(done) {
    subject.subscribe({
      next: (message) => {
        expect(message).to.equal('Image not found!')
        done()
      }
    })

    fileService.deleteImage(event, { directory: 'impossible directory', imageName: 'impossible image name'})
  })
})
