// import external modules
import * as fs from 'fs'
import * as Rx from 'rxjs/Rx'
import { app, dialog } from 'electron'
const Datastore = require('nedb')
const rimraf = require('rimraf')
const systemIdleTime = require('desktop-idle')
const express = require('express')
// import internal modules
import { FileService } from './files'
import { SlideShowService } from './slideshow'
import { IdleService } from './idle'
import { SettingsService } from './settings'
import { ServerService } from './server'
// import config
import { config } from '../config'

class Container {
  public settingsService
  public db
  public slideShowService
  public serverService
  public fileService
  public idleService

  constructor() {
    const dbPath = app.getPath('userData') + '/app.db'
    const settingsPath = app.getPath('userData') + '/settings.json'
    const idleTime = systemIdleTime.getIdleTime()

    // singleton instantiation
    this.settingsService = new SettingsService(fs, settingsPath, config)
    this.db = new Datastore({ filename: dbPath, autoload: true });
    this.slideShowService = new SlideShowService(this.db, config, this.settingsService, Rx)
    this.serverService = new ServerService(express)
    // @TODO see if this can be refactored to reduce dependencies
    this.fileService = new FileService(fs, this.db, config, this.slideShowService, rimraf, dialog, this.serverService, this.settingsService)
    this.idleService = new IdleService(idleTime, this.settingsService)
  }
}

export { Container }