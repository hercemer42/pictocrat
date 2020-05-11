import { ImageDetails, DirectoryDetails } from "../../models/models"
import { IpcMainEvent } from "electron"

/**
 * Picture file & directory manipulation and retrieval service
 */
class FileService {
  private fs
  private db
  private config
  private slideShow
  private rimraf
  private dialog
  private serverService
  private settingsService

  // @TODO params + interfaces
  constructor(fs, db, config, slideShow, rimraf, dialog, serverService, settingsService) {
    this.fs = fs
    this.db = db
    this.config = config
    this.slideShow = slideShow
    this.rimraf = rimraf
    this.dialog = dialog
    this.serverService = serverService
    this.settingsService = settingsService
  }

  readDirectory(directory: string, entries: Array<ImageDetails> = []) {
    let rootDirectory = this.settingsService.get('pictureDirectory')

    if (!directory) {
      directory = rootDirectory
    }

    const contents = this.fs.readdirSync(directory)

    contents.map((imageName) => {
      if (this.fs.existsSync(directory) &&  imageName[0] !== '.') {
        const fullPath = directory + '/' + imageName
        const stats = this.fs.statSync(fullPath)

        if (stats.isDirectory()) {
          this.readDirectory(fullPath, entries)
        } else if (stats.isFile()) {

          if (this.config.fileTypes.indexOf(imageName.split('.').pop().toLowerCase()) !== -1) {
            const entry = {
              imageName: imageName,
              directory: directory,
              relativeDirectory: directory.replace(rootDirectory, ''),
              shown: false,
              hidden: false,
              rotate: 0
            }

            entries.push(entry)
          }
        }
      }
    })

    return entries
  }

  scan(event: IpcMainEvent = null) {
    const dir = this.settingsService.get('pictureDirectory')
    const fileDetails = this.readDirectory(dir)
    const updates = []
    const removals = []
    const entriesLookup = {}
    const fileDetailsLookup = {}
    const self = this

    this.db.find({}, ((err, entries) => {
      entries.forEach((entry) => {
        entriesLookup[entry.directory + entry.imageName] = entry
      })

      fileDetails.forEach((fileDetail) => {
        fileDetailsLookup[fileDetail.directory + fileDetail.imageName] = fileDetail

        if (!entriesLookup[fileDetail.directory + fileDetail.imageName]) {
          updates.push(fileDetail)
        }
      })

      entries.forEach((entry) => {
        if (!fileDetailsLookup[entry.directory + entry.imageName]) {
          removals.push(entry)
        }
      })

      self.db.insert(updates, ((err2) => {
        if (event && !removals.length) {
          event.sender.send('message', 'Scan complete!')
        }

        removals.forEach((removal, i) => {
          self.db.remove({ _id : removal._id }, ((err3) => {
            self.slideShow.deleteFromHistory(removal)

            if (i !== removals.length - 1 || !event) {
              return
            }

            event.sender.send('message', 'Scan complete!')
          }))
        })
      }))
    }))
  }

  getHiddenList(event: IpcMainEvent) {
    this.db.find({ hidden: true }).sort({ directory: 1 }).exec((err, entries) => {
      event.sender.send('sendHiddenList', entries)
    })
  }

  deleteDirectory(event: IpcMainEvent, imageDetails: ImageDetails) {
    const pictureDirectory = this.settingsService.get('pictureDirectory')

    if (imageDetails.directory.indexOf(pictureDirectory) === -1) {
      event.sender.send('message', 'You cannot delete a directory that is not part of the assigned picture directory')
      return
    }

    if (imageDetails.directory === pictureDirectory) {
      event.sender.send('message', 'You cannot delete the root picture folder!')
      return
    }

    this.slideShow.stopShow()

    const self = this

    this.rimraf(imageDetails.directory, function () {
      self.db.remove({directory: imageDetails.directory}, { multi: true }, (() => {
        self.slideShow.imageHistory.images = self.slideShow.imageHistory.images.filter((e) => e.directory !== imageDetails.directory)
        self.slideShow.imageHistory.position = self.slideShow.imageHistory.images.length - 1

        event.sender.send('deleted', 'Deleted!')
      }))
    })
  }

  deleteImage(event: IpcMainEvent, imageDetails: ImageDetails) {
    this.slideShow.stopShow()

    const self = this

    this.fs.unlink(imageDetails.directory + '/' + imageDetails.imageName, function(error) {
      if (error) {
        event.sender.send('message', 'Image not found!')
        return
      }

      self.db.remove({ _id : imageDetails._id }, (() => {
        self.slideShow.deleteFromHistory(imageDetails)
        event.sender.send('deleted', 'Deleted!')
      }))
    })
  }

  hideImage(event: IpcMainEvent, imageDetails: ImageDetails) {
    this.slideShow.stopShow()

    this.db.update( { _id: imageDetails._id}, { $set: { hidden: true } }, () => {
      this.slideShow.deleteFromHistory(imageDetails)
      event.sender.send('hidden', 'Image hidden! You can unhide it from the settings/hidden menu.')
      this.slideShow.next(event)
    })
  }

  hideDirectory(event: IpcMainEvent, imageDetails: ImageDetails) {
    this.slideShow.stopShow()

    const pictureDirectory = this.settingsService.get('pictureDirectory')

    if (imageDetails.directory.indexOf(pictureDirectory) === -1) {
      event.sender.send('message', 'You cannot hide a directory that is not part of the assigned picture directory')
      return
    }

    if (imageDetails.directory === pictureDirectory) {
      event.sender.send('hidden', 'You cannot hide the root picture folder!')
      return
    }

    const self = this

    this.db.update({ directory: imageDetails.directory }, { $set: { hidden: true } }, { multi: true }, (images => {
      self.slideShow.imageHistory.images = self.slideShow.imageHistory.images.filter((e) => e.directory !== imageDetails.directory)
      self.slideShow.imageHistory.position = self.slideShow.imageHistory.images.length - 1
      event.sender.send('hidden', 'Directory hidden! You can unhide it from the settings/hidden menu.')
      self.slideShow.next(event)
    }))
  }

  toggleHideFile(imageDetails: ImageDetails) {
    this.db.update( { _id: imageDetails._id}, { $set: { hidden: imageDetails.hidden } } )
  }

  showDirectory(directoryDetails: DirectoryDetails) {
    this.db.update( { directory: directoryDetails.directory }, { $set: { hidden: false } }, { multi: true } )
  }

  reHideFiles(ids: Array<string>) {
    this.db.update( { _id: { $in: ids}}, { $set: { hidden: true }}, { multi: true } )
  }

  updateDetails(imageDetails: ImageDetails) {
    this.db.update( { _id: imageDetails._id }, { $set: imageDetails } )
  }

  async pickDirectory(event: IpcMainEvent) {
    const dir = this.dialog.showOpenDialogSync({ properties: ['openDirectory'] })
    if (!dir) {
      return
    }

    this.slideShow.stopShow()

    this.settingsService.set({ pictureDirectory: dir[0] })
    await this.serverService.startStaticFileServer(dir[0], this.config.defaults.expressJsPort)

    const self = this

    this.db.remove({}, { multi: true }, function () {
      self.db.insert(self.readDirectory(dir[0]), ((err) => {
        event.sender.send('sendSettings', self.settingsService.get())
        self.slideShow.start(event)
      }))
    })
  }
}

export { FileService }
