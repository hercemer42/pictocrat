import * as fs from 'fs'
import { dialog } from 'electron'
const rimraf = require('rimraf')
const settings = require('electron-settings')
const config = require('../config')
const slideShow = require('../services/slideshow')
const db = require('../services/database')

function readDirectory(directory = settings.get('pictureDirectory'), entries = []) {
  const contents = fs.readdirSync(directory)

  contents.map((imageName) => {
    if (fs.existsSync(directory) &&  imageName[0] !== '.') {
      const fullPath = directory + '/' + imageName
      const stats = fs.statSync(fullPath)

      if (stats.isDirectory()) {
        readDirectory(fullPath, entries)
      } else if (stats.isFile()) {

        if (config.fileTypes.indexOf(imageName.split('.').pop().toLowerCase()) !== -1) {

          const entry = {
            imageName: imageName,
            directory: directory,
            shown: false,
            hidden: false
          }

          entries.push(entry)
        }
      }
    }
  })

  return entries
}

function deleteFromHistory(imageDetails) {
  const inHistory = slideShow.history.images.findIndex((e) => e._id === imageDetails._id)

  if (~inHistory) {
    slideShow.history.images.splice(inHistory, 1)
  }
}

function scan(event = null) {
  const dir = settings.get('pictureDirectory')
  const fileDetails = readDirectory(dir)
  const updates = []
  const removals = []
  const entriesLookup = {}
  const fileDetailsLookup = {}

  db.find({}, ((err, entries) => {
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

    db.insert(updates, ((err2) => {
      if (event && !removals.length) {
        event.sender.send('message', 'Scan complete!')
      }

      removals.forEach((removal, i) => {
        db.remove({ _id : removal._id }, ((err3) => {
          deleteFromHistory(removal)

          if (i !== removals.length - 1 || !event) {
            return
          }

          event.sender.send('message', 'Scan complete!')
        }))
      })
    }))
  }))
}

function getHiddenList(event) {
  db.find({ hidden: true }).sort({ directory: 1 }).exec((err, entries) => {
    event.sender.send('sendHiddenList', entries)
  })
}

function deleteDirectory(event, imageDetails) {
  const pictureDirectory = settings.get('pictureDirectory')

  if (imageDetails.directory.indexOf(pictureDirectory) === -1) {
    event.sender.send('message', 'An error has occured!')
    return
  }

  if (imageDetails.directory === pictureDirectory) {
    event.sender.send('message', 'You cannot delete the root picture folder!')
    return
  }

  slideShow.stopShow()

  rimraf(imageDetails.directory, function () {
    db.remove({directory: imageDetails.directory}, { multi: true }, (() => {
      slideShow.history.images = slideShow.history.images.filter((e) => e.directory !== imageDetails.directory)
      slideShow.history.position = slideShow.history.images.length - 1

      event.sender.send('deleted', 'Deleted!')
    }))
  })
}

function deleteImage(event, imageDetails) {
  slideShow.stopShow()

  fs.unlink(imageDetails.directory + '/' + imageDetails.imageName, function(error) {
    if (error) {
      event.sender.send('message', 'Image not found!')
      return
    }

    db.remove({ _id : imageDetails._id }, (() => {
      deleteFromHistory(imageDetails)
      event.sender.send('deleted', 'Deleted!')
    }))
  })
}

function hideImage(event, imageDetails) {
  slideShow.stopShow()

  db.update( { _id: imageDetails._id}, { $set: { hidden: true } })
  deleteFromHistory(imageDetails)

  event.sender.send('hidden', 'Image hidden! You can unhide it from the settings/hidden menu.')
  slideShow.next(event)
}

function hideDirectory(event, imageDetails) {
  slideShow.stopShow()

  const pictureDirectory = settings.get('pictureDirectory')

  if (imageDetails.directory.indexOf(pictureDirectory) === -1) {
    event.sender.send('message', 'An error has occured!')
    return
  }

  if (imageDetails.directory === pictureDirectory) {
    event.sender.send('hidden', 'You cannot hide the root picture folder!')
    return
  }

  db.update({ directory: imageDetails.directory }, { $set: { hidden: true } }, { multi: true }, ((images) => {
    slideShow.history.images = slideShow.history.images.filter((e) => e.directory !== imageDetails.directory)
    slideShow.history.position = slideShow.history.images.length - 1
    event.sender.send('hidden', 'Directory hidden! You can unhide it from the settings/hidden menu.')
    slideShow.next(event)
  }))
}

function toggleHide(event, imageDetails) {
  db.update( { _id: imageDetails._id}, { $set: { hidden: imageDetails.hidden } })
}

function toggleHideDirectory(event, directory) {
  console.log('directory', directory)
  db.update( { directory: directory.directoryName }, { $set: { hidden: directory.hidden } })
}

function pickDirectory(event) {
  const dir = dialog.showOpenDialog({ properties: ['openDirectory'] })

  if (!dir) {
    return
  }

  slideShow.stopShow()

  settings.set('pictureDirectory', dir[0])

  db.remove({}, { multi: true }, function () {
    db.insert(readDirectory(dir[0]), ((err) => {
      slideShow.start(event)
    }))
  })

}

module.exports = {
  pickDirectory: pickDirectory,
  scan: scan,
  deleteImage: deleteImage,
  deleteDirectory: deleteDirectory,
  hideImage: hideImage,
  hideDirectory: hideDirectory,
  getHiddenList: getHiddenList,
  toggleHide: toggleHide,
  toggleHideDirectory: toggleHideDirectory
}
