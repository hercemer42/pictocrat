var Rx = require('rxjs/Rx');
var db = require('../services/database');
var config = require('../config');
var electronSettings = require('electron-settings');
var subscription;
var imageHistory = { images: [], position: 0 };
function stopShow() {
    if (!subscription) {
        return;
    }
    subscription.unsubscribe();
}
function historyBrowse(event, direction) {
    var image = imageHistory.images[imageHistory.position];
    if (!image) {
        return;
    }
    db.findOne({ _id: image._id }, function (err, imageDetails) {
        if (err) {
            return;
        }
        if (!imageDetails) {
            return;
        }
        event.sender.send('newImage', image);
    });
}
function next(event) {
    subscription ? nextRandomImage(event) : nextInHistory(event);
}
function nextInHistory(event) {
    stopShow();
    if (imageHistory.position === imageHistory.images.length - 1) {
        nextRandomImage(event);
        return;
    }
    ++imageHistory.position;
    historyBrowse(event, 'next');
}
function previousInHistory(event) {
    stopShow();
    if (imageHistory.position === 0) {
        nextRandomImage(event);
        return;
    }
    --imageHistory.position;
    historyBrowse(event, 'previous');
}
function updateHistory(imageDetails) {
    imageHistory.images.push(imageDetails);
    if (imageHistory.images.length === config.historyLimit) {
        imageHistory.images.shift();
    }
    imageHistory.position = imageHistory.images.length - 1;
}
function nextRandomImage(event) {
    db.count({ shown: false, hidden: false }, function (err, count) {
        if (err) {
            return;
        }
        if (count === 0) {
            db.update({}, { $set: { shown: false } }, { multi: true }, (function () {
                db.count({ shown: false, hidden: false }, function (err2, count2) {
                    if (err2) {
                        event.sender.send('message', 'An error has occured!');
                        return;
                    }
                    if (count2 === 0) {
                        stopShow();
                        return;
                    }
                    nextRandomImage(event);
                });
            }));
            return;
        }
        var skipCount = Math.floor(Math.random() * count);
        db.find({ shown: false, hidden: false }).skip(skipCount).limit(1).exec(function (err2, result) {
            var imageDetails = result[0];
            if (!err2) {
                event.sender.send('newImage', imageDetails);
                updateHistory(imageDetails);
                console.log(imageDetails);
                db.update({ _id: imageDetails._id }, { $set: { shown: true } });
            }
        });
    });
}
function start(event) {
    console.log('start');
    if (electronSettings.get('pictureDirectory')) {
        db.count({}, function (err, count) {
            if (count) {
                nextRandomImage(event);
                subscription = Rx.Observable.of(0).delay(electronSettings.get('interval')).repeat().subscribe(function () {
                    nextRandomImage(event);
                });
            }
        });
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
};
//# sourceMappingURL=slideshow.js.map