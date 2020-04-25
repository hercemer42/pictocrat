import { Injectable } from '@angular/core'
import { faPlay, faPause, faStepBackward, faStepForward, faTrashAlt, faFolder, faMinusCircle, faSync, faCog } from '@fortawesome/free-solid-svg-icons';

@Injectable()
export class IconsService {
  faPlay = faPlay
  faPause = faPause
  faStepBackward = faStepBackward
  faStepForward = faStepForward
  faTrashAlt = faTrashAlt
  faFolder = faFolder
  faMinusCircle = faMinusCircle
  faSync = faSync
  faCog = faCog
}