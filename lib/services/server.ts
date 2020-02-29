const express = require('express')
const app = express()

async function startStaticFileServer(path, port) {
    console.log('wtf')
    console.log(path, port)
    await app.listen(port, () => console.log(`Picture viewer app listening on port ${port}!`))
    await app.use(express.static(path))
}

module.exports = {
    startStaticFileServer: startStaticFileServer
}