import { Component, Output, EventEmitter } from '@angular/core'

@Component({
  selector: 'modal',
  templateUrl: './modal.html',
  styleUrls: ['./modal.scss']
})

export class ModalComponent {

  @Output() cancelEvent = new EventEmitter<string>()
  @Output() deleteEvent = new EventEmitter<string>()

  constructor() {
    console.log('initialized')
  }

  cancel() {
    this.cancelEvent.emit()
  }

  delete() {
    this.deleteEvent.emit()
  }
}
