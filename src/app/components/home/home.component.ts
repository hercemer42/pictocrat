import { Component, OnInit } from '@angular/core'
import { ipcRenderer } from 'electron'
import { ImageDetails } from './models'
import { UiService } from '../../services/ui.service'
import { faPlay, faPause, faCaretLeft, faCaretRight, faTrashAlt, faFolder, faBan, faSync, faCog } from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})

export class HomeComponent implements OnInit {
  settings: any
  imageDetails: ImageDetails
  hiddenList = []
  message: string
  firstRun = true
  notFound = false
  recentlyClicked = false
  timer = null
  faPlay = faPlay
  faPause = faPause
  faCaretLeft = faCaretLeft
  faCaretRight = faCaretRight
  faTrashAlt = faTrashAlt
  faFolder = faFolder
  faBan = faBan
  faSync = faSync
  faCog = faCog

  constructor(private uiService: UiService) { }

  pickDirectory() {
    ipcRenderer.send('pickDirectory')
  }

  scan() {
    ipcRenderer.send('scan')
  }

  deleteImage() {
    if (window.confirm('Are you sure you want to permanantly delete this image?')) {
      ipcRenderer.send('deleteImage', this.imageDetails)
    }
  }

  deleteDirectory() {
    if (window.confirm(
      `Are you sure you want to permanantly delete the '${this.imageDetails.directory}' directory and all of its contents?`
    )) {
      ipcRenderer.send('deleteDirectory', this.imageDetails)
    }
  }

  hideImage() {
    if (window.confirm('Are you sure you want to hide this image? You can unhide it from the settings/hidden menu')) {
      ipcRenderer.send('hideImage', this.imageDetails)
    }
  }

  hideDirectory() {
    if (window.confirm(
      `Are you sure you want to hide the '${this.imageDetails.directory}' directory and all of its contents?
      You can unhide it from the settings/hidden menu.`
    )) {
      ipcRenderer.send('hideDirectory', this.imageDetails)
    }
  }

  toggleHide(image) {
    ipcRenderer.send('toggleHide', image)
  }

  toggleHideDirectory(directory) {
    directory.images.forEach(e => e.hidden = directory.hidden)
    ipcRenderer.send('toggleHideDirectory', { directoryName: directory.directoryName, hidden: directory.hidden })
  }

  toggleSlideShow() {
    this.recentlyClicked = true
    clearTimeout(this.timer)
    this.timer = setTimeout(() => { this.recentlyClicked = false }, 3000)
    this.uiService.stopped = !this.uiService.stopped
    this.uiService.stopped ? ipcRenderer.send('stopShow') : ipcRenderer.send('start')
  }

  showMessage(message) {
    this.message = message

    setTimeout(() => {
      this.message = null
    }, 5000)
  }

  next() {
    ipcRenderer.send('next')
  }

  previous() {
    this.uiService.stopped = true
    ipcRenderer.send('previous')
  }

  ngOnInit() {
    // ipcRenderer.send('start')

    ipcRenderer.on('newImage', (event, imageDetails) => {

      if (this.firstRun) {
        this.uiService.stopped = this.firstRun = false
      }
      this.imageDetails = imageDetails
    })

    ipcRenderer.on('message', (event, message) => {
      this.showMessage(message)
    })

    ipcRenderer.on('deleted', (event, message) => {
      this.showMessage(message)
      this.uiService.stopped ? this.imageDetails = null : ipcRenderer.send('start')
    })

    ipcRenderer.on('hidden', (event, message) => {
      this.showMessage(message)
      this.uiService.stopped ? this.imageDetails = null : ipcRenderer.send('start')
    })

    ipcRenderer.on('sendSettings', (event, settings) => {
      this.settings = settings
    })

    ipcRenderer.on('sendHiddenList', (event, hiddenList) => {
      const directories = {}

      hiddenList.forEach(e => {
        const dir = directories[e.directory]
        dir ? dir.push(e) : directories[e.directory] = [e]
      })

      this.hiddenList = Object.keys(directories).map(e => {
        return { directoryName: e, images: directories[e], hidden: true }
      })
    })
  }
}
