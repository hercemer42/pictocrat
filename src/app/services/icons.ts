import { Injectable } from '@angular/core'
import { faPlay, faPause, faStepBackward, faStepForward, faTrashAlt, faFolder, faMinusCircle, faSync, faCog, faFile } from '@fortawesome/free-solid-svg-icons';

@Injectable()
export class IconsService {
  faPlay = faPlay
  faPause = faPause
  faStepBackward = faStepBackward
  faStepForward = faStepForward
  faTrashAlt = faTrashAlt
  faFolder = faFolder
  faFile = faFile
  faMinusCircle = faMinusCircle
  faSync = faSync
  faCog = faCog
}