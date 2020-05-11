const fs = require('fs')
const { expect } = require('chai')
const { Subject } = require('rxjs')
const Rx = require('rxjs/Rx')
const { SlideShow } = require('../lib/services/slideshow')
const { SettingsService } = require('../lib/services/settings')
const { config } = require('../lib/config')
const { db } = require('./connection/database')

// stub event
let subject = new Subject()

const event = {
  sender: {
    send: (eventType, message) => {
      return subject.next(message)
    }
  },
  latest: ''
}

describe('Slideshow service', () => {
  let slideShow
  let firstImage
  let nextImage

  before(() => {
    const settingsPath = 'assets/settings.json'
    settingsService = new SettingsService(fs, settingsPath, config)
    slideShow = new SlideShow(db, config, settingsService, Rx)
  }) 

  beforeEach(() => {
    subject = new Subject()
  })
  
  describe('slideshow', () => {
    it('Should start the slideshow', done => {
      slideShow.start(event)

      subject.subscribe({
        next: message => {
          firstImage = message
          expect(message).to.haveOwnProperty('imageName')
          done()
        }
      })
    })

    it ('Should update the history', done => {
      expect(slideShow.imageHistory.images[0]).to.eql(firstImage)
      done()
    })

    it ('Should get the next image', done => {
      slideShow.nextRandomImage(event)

      subject.subscribe({
        next: message => {
          nextImage = message
          expect(message).to.haveOwnProperty('imageName')
          expect(message).to.not.equal(firstImage)
          done()
        }
      })
    })

    it ('Should get the previous image', done => {
      slideShow.previousInHistory(event)

      subject.subscribe({
        next: message => {
          expect(message.imageName).to.equal(firstImage.imageName)
          done()
        }
      })
    })

    it ('Should get the next image in the history', done => {
      slideShow.nextInHistory(event)

      subject.subscribe({
        next: message => {
          expect(message.imageName).to.equal(nextImage.imageName)
          done()
        }
      })
    })

    it ('Should get the next random image when there are none left in the history', done => {
      slideShow.nextInHistory(event)

      subject.subscribe({
        next: message => {
          expect(message.imageName).to.not.equal(nextImage.imageName)
          expect(message.imageName).to.not.equal(firstImage.imageName)
          done()
        }
      })
    })

    it ('Should delete an image from the image history', () => {
      slideShow.deleteFromHistory(nextImage)
      expect(slideShow.imageHistory.images.every(i => i.imagename !== nextImage.imageName)).to.be.true
    })

    it ('Should set "shown" status of all images to false once they have all been shown once, then start again', done => {
      db.update({}, { $set: { shown: true } }, { multi: true }, () => {
        slideShow.nextRandomImage(event)

        subject.subscribe({
          next: message => {
            db.count({ shown: true }, (err, count) => {
              expect(count).to.equal(1)
              done()
            })
          }
        })
      })
    })
  })
})

