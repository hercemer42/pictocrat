"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var fs = require("fs");
var electron_1 = require("electron");
var rimraf = require('rimraf');
var settings = require('electron-settings');
var config = require('../config');
var slideShow = require('../services/slideshow');
var db = require('../services/database');
function readDirectory(directory, entries) {
    if (directory === void 0) { directory = settings.get('pictureDirectory'); }
    if (entries === void 0) { entries = []; }
    var contents = fs.readdirSync(directory);
    contents.map(function (imageName) {
        if (fs.existsSync(directory) && imageName[0] !== '.') {
            var fullPath = directory + '/' + imageName;
            var stats = fs.statSync(fullPath);
            if (stats.isDirectory()) {
                readDirectory(fullPath, entries);
            }
            else if (stats.isFile()) {
                if (config.fileTypes.indexOf(imageName.split('.').pop().toLowerCase()) !== -1) {
                    var entry = {
                        imageName: imageName,
                        directory: directory,
                        shown: false,
                        hidden: false
                    };
                    entries.push(entry);
                }
            }
        }
    });
    return entries;
}
function deleteFromHistory(imageDetails) {
    var inHistory = slideShow.history.images.findIndex(function (e) { return e._id === imageDetails._id; });
    if (~inHistory) {
        slideShow.history.images.splice(inHistory, 1);
    }
}
function scan(event) {
    if (event === void 0) { event = null; }
    var dir = settings.get('pictureDirectory');
    var fileDetails = readDirectory(dir);
    var updates = [];
    var removals = [];
    var entriesLookup = {};
    var fileDetailsLookup = {};
    db.find({}, (function (err, entries) {
        entries.forEach(function (entry) {
            entriesLookup[entry.directory + entry.imageName] = entry;
        });
        fileDetails.forEach(function (fileDetail) {
            fileDetailsLookup[fileDetail.directory + fileDetail.imageName] = fileDetail;
            if (!entriesLookup[fileDetail.directory + fileDetail.imageName]) {
                updates.push(fileDetail);
            }
        });
        entries.forEach(function (entry) {
            if (!fileDetailsLookup[entry.directory + entry.imageName]) {
                removals.push(entry);
            }
        });
        db.insert(updates, (function (err2) {
            if (event && !removals.length) {
                event.sender.send('message', 'Scan complete!');
            }
            removals.forEach(function (removal, i) {
                db.remove({ _id: removal._id }, (function (err3) {
                    deleteFromHistory(removal);
                    if (i !== removals.length - 1 || !event) {
                        return;
                    }
                    event.sender.send('message', 'Scan complete!');
                }));
            });
        }));
    }));
}
function getHiddenList(event) {
    db.find({ hidden: true }).sort({ directory: 1 }).exec(function (err, entries) {
        event.sender.send('sendHiddenList', entries);
    });
}
function deleteDirectory(event, imageDetails) {
    var pictureDirectory = settings.get('pictureDirectory');
    if (imageDetails.directory.indexOf(pictureDirectory) === -1) {
        event.sender.send('message', 'An error has occured!');
        return;
    }
    if (imageDetails.directory === pictureDirectory) {
        event.sender.send('message', 'You cannot delete the root picture folder!');
        return;
    }
    slideShow.stopShow();
    rimraf(imageDetails.directory, function () {
        db.remove({ directory: imageDetails.directory }, { multi: true }, (function () {
            slideShow.history.images = slideShow.history.images.filter(function (e) { return e.directory !== imageDetails.directory; });
            slideShow.history.position = slideShow.history.images.length - 1;
            event.sender.send('deleted', 'Deleted!');
        }));
    });
}
function deleteImage(event, imageDetails) {
    slideShow.stopShow();
    fs.unlink(imageDetails.directory + '/' + imageDetails.imageName, function (error) {
        if (error) {
            event.sender.send('message', 'Image not found!');
            return;
        }
        db.remove({ _id: imageDetails._id }, (function () {
            deleteFromHistory(imageDetails);
            event.sender.send('deleted', 'Deleted!');
        }));
    });
}
function hideImage(event, imageDetails) {
    slideShow.stopShow();
    db.update({ _id: imageDetails._id }, { $set: { hidden: true } });
    deleteFromHistory(imageDetails);
    event.sender.send('hidden', 'Image hidden! You can unhide it from the settings/hidden menu.');
    slideShow.next(event);
}
function hideDirectory(event, imageDetails) {
    slideShow.stopShow();
    var pictureDirectory = settings.get('pictureDirectory');
    if (imageDetails.directory.indexOf(pictureDirectory) === -1) {
        event.sender.send('message', 'An error has occured!');
        return;
    }
    if (imageDetails.directory === pictureDirectory) {
        event.sender.send('hidden', 'You cannot hide the root picture folder!');
        return;
    }
    db.update({ directory: imageDetails.directory }, { $set: { hidden: true } }, { multi: true }, (function (images) {
        slideShow.history.images = slideShow.history.images.filter(function (e) { return e.directory !== imageDetails.directory; });
        slideShow.history.position = slideShow.history.images.length - 1;
        event.sender.send('hidden', 'Directory hidden! You can unhide it from the settings/hidden menu.');
        slideShow.next(event);
    }));
}
function toggleHide(event, imageDetails) {
    db.update({ _id: imageDetails._id }, { $set: { hidden: imageDetails.hidden } });
}
function toggleHideDirectory(event, directory) {
    console.log('directory', directory);
    db.update({ directory: directory.directoryName }, { $set: { hidden: directory.hidden } });
}
function pickDirectory(event) {
    var dir = electron_1.dialog.showOpenDialog({ properties: ['openDirectory'] });
    if (!dir) {
        return;
    }
    slideShow.stopShow();
    settings.set('pictureDirectory', dir[0]);
    db.remove({}, { multi: true }, function () {
        db.insert(readDirectory(dir[0]), (function (err) {
            slideShow.start(event);
        }));
    });
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
};
//# sourceMappingURL=files.js.map