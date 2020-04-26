import * as Rx from 'rxjs/Rx'
const db = require('../services/database')
const config = require('../config')
const settings = require('./settings')
let subscription
const imageHistory = { images: [], position: 0 }

function stopShow() {
  if (!subscription) {
    return
  }

  subscription.unsubscribe()
}

function historyBrowse(event, direction) {
  const image = imageHistory.images[imageHistory.position]

  if (!image) {
    return
  }

  db.findOne({_id: image._id}, (err, imageDetails) => {
    if (err) {
      return
    }

    if (!imageDetails) {
      return
    }

    event.sender.send('newImage', image)
  })
}

function next(event) {
  subscription ? nextRandomImage(event) : nextInHistory(event)
}

function nextInHistory(event) {
  stopShow()

  if (imageHistory.position === imageHistory.images.length - 1) {
    nextRandomImage(event)
    return
  }

  ++imageHistory.position
  historyBrowse(event, 'next')
}

function previousInHistory(event) {
  stopShow()

  if (imageHistory.position === 0) {
    nextRandomImage(event)
    return
  }

  --imageHistory.position
  historyBrowse(event, 'previous')
}

function updateHistory(imageDetails) {
  imageHistory.images.push(imageDetails)

  if (imageHistory.images.length === config.historyLimit) {
    imageHistory.images.shift()
  }

  imageHistory.position = imageHistory.images.length - 1
}

function nextRandomImage(event) {
  db.count({ shown: false, hidden: false }, function (err, count) {
    if (err) {
      return
    }

    if (count === 0) {
      db.update({}, { $set: { shown: false } }, { multi: true }, (() => {
        db.count({ shown: false, hidden: false }, function (err2, count2) {
          if (err2) {
            event.sender.send('message', 'An error has occured!')
            return
          }

          if (count2 === 0) {
            stopShow()
            return
          }

          nextRandomImage(event)
        })
      }))

      return
    }

    const skipCount = Math.floor(Math.random() * count)
    db.find({ shown: false, hidden: false }).skip(skipCount).limit(1).exec((err2, result) => {
      const imageDetails = result[0]

      if (!err2) {
        console.log('imageDetails', imageDetails)
        event.sender.send('newImage', imageDetails)
        updateHistory(imageDetails)
        db.update( { _id: imageDetails._id}, { $set: { shown: true } })
      }
    })
  })
}

async function start(event) {
  // stop the show if it's already running to avoid running multiple instances concurrently
  stopShow()
  let pictureDirectory = settings.get('pictureDirectory')

  if (pictureDirectory) {

    db.count({}, function (err, count) {
      if (count) {
        nextRandomImage(event)

        subscription = Rx.Observable.of(0).delay(settings.get('interval')).repeat().subscribe(() => {
          nextRandomImage(event)
        })
      }
    })
  }
}

module.exports = {
  stopShow: stopShow,
  start: start,
  next: next,
  nextInHistory: nextInHistory,
  previousInHistory: previousInHistory,
  nextRandomImage: nextRandomImage,
  history: imageHistory
}
