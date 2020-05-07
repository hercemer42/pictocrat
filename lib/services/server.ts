
class ServerService {
  private express
  private server

  constructor(express) {
    this.express = express
    this.server = express()
  }

  async startStaticFileServer(path, port) {
    await this.server.listen(port, () => console.log(`Picture viewer app listening on port ${port}!`))
    await this.server.use(this.express.static(path))
  }
}

export { ServerService }