class SlideShow {
  // @TODO types
  private Rx
  private db
  private config
  private settingsService
  private subscription
  public imageHistory = { images: [], position: 0 }

  constructor(db, config, settingsService, Rx) {
    this.db = db
    this.config = config
    this.settingsService = settingsService
    this.Rx = Rx
  }

  stopShow() {
    if (!this.subscription) {
      return
    }

    this.subscription.unsubscribe()
  }

  historyBrowse(event) {
    const image = this.imageHistory.images[this.imageHistory.position]

    if (!image) {
      return
    }

    this.db.findOne({_id: image._id}, (err, imageDetails) => {
      if (err) {
        return
      }

      if (!imageDetails) {
        return
      }

      event.sender.send('newImage', imageDetails)
    })
  }

  next(event) {
    this.subscription ? this.nextRandomImage(event) : this.nextInHistory(event)
  }

  nextInHistory(event) {
    this.stopShow()

    if (this.imageHistory.position === this.imageHistory.images.length - 1) {
      this.nextRandomImage(event)
      return
    }

    ++this.imageHistory.position
    this.historyBrowse(event)
  }

  previousInHistory(event) {
    this.stopShow()

    if (this.imageHistory.position === 0) {
      this.nextRandomImage(event)
      return
    }

    --this.imageHistory.position
    this.historyBrowse(event)
  }

  updateHistory(imageDetails) {
    this.imageHistory.images.push(imageDetails)

    if (this.imageHistory.images.length === this.config.historyLimit) {
      this.imageHistory.images.shift()
    }

    this.imageHistory.position = this.imageHistory.images.length - 1
  }

  deleteFromHistory(imageDetails) {
    const inHistory = this.imageHistory.images.findIndex((e) => e._id === imageDetails._id)

    if (~inHistory) {
      this.imageHistory.images.splice(inHistory, 1)
    }
  }

  nextRandomImage(event) {
    const self = this

    this.db.count({ shown: false, hidden: false }, function (err, count) {
      if (err) {
        return
      }

      if (count === 0) {
        self.db.update({}, { $set: { shown: false } }, { multi: true }, (() => {
          self.db.count({ shown: false, hidden: false }, function (err2, count2) {
            if (err2) {
              event.sender.send('message', 'An error has occured!')
              return
            }

            if (count2 === 0) {
              self.stopShow()
              return
            }

            self.nextRandomImage(event)
          })
        }))

        return
      }

      const skipCount = Math.floor(Math.random() * count)

      // skip and limit are nedb methods that we use to find a pseudo-random image
      self.db.find({ shown: false, hidden: false }).skip(skipCount).limit(1).exec((err2, result) => {
        const imageDetails = result[0]

        if (!err2) {
          self.db.update( { _id: imageDetails._id}, { $set: { shown: true } }, (() => {
            self.updateHistory(imageDetails)
            event.sender.send('newImage', imageDetails)
          }))
        }
      })
    })
  }

  async start(event) {
    // stop the show if it's already running to avoid running multiple instances concurrently
    this.stopShow()

    if (this.settingsService.get('pictureDirectory')) {
      const self = this

      await this.db.count({}, function (err, count) {
        if (count) {
          self.nextRandomImage(event)

          self.subscription = self.Rx.Observable.of(0).delay(self.settingsService.get('slideShowInterval')).repeat().subscribe(() => {
            self.nextRandomImage(event)
          })
        }
      })
    }
  }
}

export { SlideShow }
