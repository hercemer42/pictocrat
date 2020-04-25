import { Injectable } from '@angular/core'

@Injectable()
export class MessageService {
  public message: string

  public showMessage(message) {
    this.message = message

    setTimeout(() => {
      this.message = null
    }, 5000)
  }
}