// import external modules
import * as fs from 'fs'
import * as Rx from 'rxjs/Rx'
import { app, dialog } from 'electron'
import * as Datastore from 'nedb'
import * as express from 'express'
import * as cors from 'cors'
import * as rimraf from 'rimraf'
// import internal modules
import { FileService } from './files'
import { SlideShowService } from './slideshow'
import { SettingsService } from './settings'
import { ServerService } from './server'
import { DbAsyncService } from './db-async'
// import config
import { config } from '../config'

/**
 * The service container.  Holds single instances (singletons) of various services
 * for reuse throughout the application.
 */
class Container {
  public settingsService
  public db
  public slideShowService
  public serverService
  public fileService
  public services =  {
    settingsService: null,
    slideShowService: null,
    serverService: null,
    fileService: null,
  }

  constructor() {
    const dbPath = app.getPath('userData') + '/app.db'
    const settingsPath = app.getPath('userData') + '/settings.json'

    // singleton instantiation
    this.services.settingsService = new SettingsService(fs, settingsPath, config)
    // this.db = new Datastore({ filename: dbPath, autoload: true })
    this.db = new DbAsyncService(Datastore, dbPath)
    this.services.slideShowService = new SlideShowService(this.db, config, this.services.settingsService, Rx)
    this.services.serverService = new ServerService(express, cors)
    this.services.fileService = new FileService(this.db, config, { fs, rimraf, dialog },  this.services)
  }
}

export { Container }