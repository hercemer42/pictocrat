"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var electron_1 = require("electron");
function connection() {
    var appPath = electron_1.app.getPath('userData');
    var Datastore = require('nedb');
    return new Datastore({ filename: appPath + '/app.db', autoload: true });
}
module.exports = connection();
//# sourceMappingURL=database.js.map