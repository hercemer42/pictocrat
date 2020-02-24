"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var electron_1 = require("electron");
var settings = require('electron-settings');
var fileService = require('./files');
var slideShow = require('../services/slideshow');
electron_1.ipcMain.on('start', function (event, arg) {
    slideShow.start(event);
    event.sender.send('sendSettings', settings.getAll());
});
electron_1.ipcMain.on('stopShow', function (event, arg) {
    slideShow.stopShow();
});
electron_1.ipcMain.on('deleteImage', function (event, imageDetails) {
    fileService.deleteImage(event, imageDetails);
});
electron_1.ipcMain.on('deleteDirectory', function (event, imageDetails) {
    fileService.deleteDirectory(event, imageDetails);
});
electron_1.ipcMain.on('hideImage', function (event, imageDetails) {
    fileService.hideImage(event, imageDetails);
});
electron_1.ipcMain.on('hideDirectory', function (event, imageDetails) {
    fileService.hideDirectory(event, imageDetails);
});
electron_1.ipcMain.on('next', function (event) {
    slideShow.nextInHistory(event);
});
electron_1.ipcMain.on('previous', function (event) {
    slideShow.previousInHistory(event);
});
electron_1.ipcMain.on('scan', function (event, arg) {
    fileService.scan(event);
});
electron_1.ipcMain.on('pickDirectory', function (event, arg) {
    fileService.pickDirectory(event);
});
electron_1.ipcMain.on('getHiddenList', function (event, arg) {
    fileService.getHiddenList(event);
});
electron_1.ipcMain.on('toggleHide', function (event, imageDetails) {
    fileService.toggleHide(event, imageDetails);
});
electron_1.ipcMain.on('toggleHideDirectory', function (event, directory) {
    fileService.toggleHideDirectory(event, directory);
});
//# sourceMappingURL=browser-events.js.map