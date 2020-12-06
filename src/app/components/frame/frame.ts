import { Component, OnInit, ViewChild, ElementRef, Renderer2 } from '@angular/core'
import { ipcRenderer } from 'electron'
import { SettingsService } from '../../services/settings'
import { IconsService } from '../../services/icons'
import { ImageService } from '../../services/image'
import { RendererOnService } from '../../services/renderer-on'
import { RendererSendService } from '../../services/renderer-send'
import { fromEvent } from 'rxjs'
import { debounceTime } from 'rxjs/operators'
import exifr from 'exifr'

@Component({
  selector: 'app-frame',
  templateUrl: './frame.html',
  styleUrls: ['./frame.scss']
})

export class FrameComponent implements OnInit {
  notFound = false
  @ViewChild('image') image: ElementRef;

  constructor(
    public settingsService: SettingsService,
    public iconsService: IconsService,
    public imageService: ImageService,
    public rendererSendService: RendererSendService,
    private rendererOnService: RendererOnService,
    private renderer: Renderer2
  ) {
      // correct the image proportions on resize
      fromEvent(window, 'resize')
        .pipe(
          debounceTime(10)
        )
        .subscribe(() => {
          if (!this.image) {
            return
          }

          this.imageService.rotateImage(this.image.nativeElement, this.renderer);
        });
  }

  start() {
    ipcRenderer.send('getSettings')
    ipcRenderer.send('start')
  }

  ngOnInit() {
    this.start()
    this.rendererOnService.init()
  }
  
  onImageLoad() {
    exifr.parse(this.image.nativeElement, { translateValues: false })
    .then(output => {
      this.imageService.rotateImage(this.image.nativeElement, this.renderer, output.Orientation)
    })
  }
}
