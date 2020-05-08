const fs = require('fs')
const Datastore = require('nedb')
const { expect } = require('chai')
const rimraf = require('rimraf')
const Rx = require('rxjs/Rx')
const express = require('express')
const { dialog } = require('electron')
const dbPath = './assets/app.db'
const db = new Datastore({ filename: dbPath, autoload: true });
const { config } = require('../lib/config')
const { SlideShow } = require('../lib/services/slideshow')
const { SettingsService } = require('../lib/services/settings')
const { ServerService } = require('../lib/services/server')
const { FileService } = require('../lib/services/files')

describe('Array', function() {

  before(() => {
    const settingsPath = 'assets/settings.json'
    const settingsService = new SettingsService(fs, settingsPath, config)
    const slideShow = new SlideShow(db, config, settingsService, Rx)
    const serverService = new ServerService(express)
    fileService = new FileService(fs, db, config, slideShow, rimraf, dialog, serverService, settingsService)
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
})

