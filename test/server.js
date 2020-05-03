const chai = require('chai')
const chaiHttp = require('chai-http')
const server = require('../lib/services/server')
const config = require('../lib/config')
const pictureDirectory = process.env.PWD + '/test/assets/images'

chai.use(chaiHttp)
chai.should()

describe('Array', function() {

  before(() => {
    return server.startStaticFileServer(pictureDirectory, config.defaults.expressJsPort)
  }) 
  
  describe('express server', function() {
    it('should be able to request an image from the server', function(done) {
      chai.request(server.app)
        .get('/t1.png')
        .end((err, res) => {
          console.log('bueller')
          res.should.have.status(200)
          done()
        })
    })
  })
})
