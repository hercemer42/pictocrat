import { IpcMainEvent } from "electron"
import { ImageDetails } from "../../models/models"

/**
 * Controls the slideshow, browsing of images, and image browsing history
 */
class SlideShowService {
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

  /**
   * fetches the tagged image in the image history from the database
   * @param event
   */
  async historyBrowse(event: IpcMainEvent) {
    const image = this.imageHistory.images[this.imageHistory.position]

    if (!image) {
      return
    }

    let imageDetails = await this.db.findOne({_id: image._id}).catch(error => this.sendError(event, error))

    if (!imageDetails) {
      return
    }

    event.sender.send('newImage', imageDetails)
  }

  next(event: IpcMainEvent) {
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

  previousInHistory(event: IpcMainEvent) {
    this.stopShow()

    if (this.imageHistory.position === 0) {
      this.nextRandomImage(event)
      return
    }

    --this.imageHistory.position
    this.historyBrowse(event)
  }

  updateHistory(imageDetails: ImageDetails) {
    this.imageHistory.images.push(imageDetails)

    if (this.imageHistory.images.length === this.config.historyLimit) {
      this.imageHistory.images.shift()
    }

    this.imageHistory.position = this.imageHistory.images.length - 1
  }

  deleteFromHistory(imageDetails: ImageDetails) {
    const inHistory = this.imageHistory.images.findIndex((e) => e._id === imageDetails._id)

    if (~inHistory) {
      this.imageHistory.images.splice(inHistory, 1)
    }
  }

  async nextRandomImage(event: IpcMainEvent) {
    let count = await this.db.count({ shown: false, hidden: false }).catch(error => this.sendError(event, error))

    if (count === 0) {
      await this.db.update({}, { $set: { shown: false } }, { multi: true }).catch(error => this.sendError(event, error))

      count = await this.db.count({ shown: false, hidden: false }).catch(error => this.sendError(event, error))

      if (count === 0) {
        this.stopShow()
        return
      }

      this.nextRandomImage(event)
    }

    const result = await this.db.random({ shown: false, hidden: false }, count).catch(error => this.sendError(event, error))

    const imageDetails = result[0]

    await this.db.update({}, { $set: { shown: false } }, { multi: true }).catch(error => this.sendError(event, error))

    this.updateHistory(imageDetails)
    event.sender.send('newImage', imageDetails)
  }

  async start(event: IpcMainEvent) {
    // stop the show if it's already running to avoid running multiple instances concurrently
    this.stopShow()

    if (this.settingsService.get('pictureDirectory')) {
      let count = await this.db.count({}).catch(error => this.sendError(event, error))

      if (!count) {
        return
      }

      this.nextRandomImage(event)

      this.subscription = this.Rx.Observable.of(0).delay(this.settingsService.get('slideShowInterval')).repeat().subscribe(() => {
        this.nextRandomImage(event)
      })
    }
  }

  private sendError(event, error) {
    event.sender.send('message', `An error has occured! ${error}`)
  }
}

export { SlideShowService }
