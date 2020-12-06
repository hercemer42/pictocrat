/**
 * Responsible for starting the image file server.
 * The backend of the application serves image files to the front end through
 * an express server, to get around security issues with reading the file directly from disk.
 */
class ServerService {
  private express
  private cors
  private server

  constructor(express, cors) {
    this.express = express
    this.cors = cors
    this.server = express()
  }

  async startStaticFileServer(path: string, port: number) {
    let allowedOrigins = ['http://localhost', 'http://localhost:3000', 'http://localhost:4200']

    let corsOptions = {
      origin: (origin, callback) => {
        if (!origin) return callback(null, true)

        if(allowedOrigins.indexOf(origin) === -1) {
          let msg = 'The CORS policy for this site does not ' + 'allow access from the specified Origin.'
          return callback(new Error(msg), false)
        }

        return callback(null, true)
      }
    }

    await this.server.use(this.cors(corsOptions))
    await this.server.use(this.express.static(path))
    await this.server.listen(port, () => console.log(`Picture viewer app listening on port ${port}!`))
  }
}

export { ServerService }