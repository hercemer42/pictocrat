class IdleService {
  private systemIdleTime
  private settingsService

  constructor(systemIdleTime, settingsService) {
    this.systemIdleTime = systemIdleTime
    this.settingsService = settingsService
  }

  startTimer(win) {
    if (!this.settingsService.get('maximizeOnIdle')) {
      return
    }

    setTimeout(() => {
      if (this.systemIdleTime > this.settingsService.get('idleTimeout')) {
        win.show()
      }

      this.startTimer(win)
    }, 5000)
  }
}

export { IdleService }
