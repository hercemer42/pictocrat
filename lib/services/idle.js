var settings = require('electron-settings');
var systemIdleTime = require('desktop-idle');
function startTimer(win) {
    if (!settings.get('maximizeOnIdle')) {
        return;
    }
    setTimeout(function () {
        if (systemIdleTime.getIdleTime() > settings.get('idleTimeout')) {
            win.show();
        }
        startTimer(win);
    }, 5000);
}
module.exports = {
    startTimer: startTimer
};
//# sourceMappingURL=idle.js.map