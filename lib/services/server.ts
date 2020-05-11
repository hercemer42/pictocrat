
class ServerService {
  private express
  private server

  constructor(express) {
    this.express = express
    this.server = express()
  }

  async startStaticFileServer(path: string, port: number) {
    await this.server.use(this.express.static(path))
    await this.server.listen(port, () => console.log(`Picture viewer app listening on port ${port}!`))
  }
}

export { ServerService }