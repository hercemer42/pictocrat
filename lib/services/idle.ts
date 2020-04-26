const systemIdleTime = require('desktop-idle')
const settings = require('./settings')

function startTimer(win) {
  if (!settings.get('maximizeOnIdle')) {
    return
  }

  setTimeout(() => {
    if (systemIdleTime.getIdleTime() > settings.get('idleTimeout')) {
      win.show()
    }

    startTimer(win)
  }, 5000)
}

module.exports = {
  startTimer: startTimer
}
