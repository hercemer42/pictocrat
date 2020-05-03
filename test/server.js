const chai = require('chai')
const chaiHttp = require('chai-http')
const assert = require('assert')
const server = require('../lib/services/server')
const config = require('../lib/config')
const basePath = process.env.PWD

chai.use(chaiHttp)
chai.should()

describe('Array', function() {
  const pictureDirectory = basePath + '/test/assets/images'
  before(() => {
    return server.startStaticFileServer(pictureDirectory, config.defaults.expressJsPort)
  }) 
  
  describe('express server', function() {
    it('should be able to request an image from the server', function() {
      chai.request(server.app)
        .get('/t1.png')
        .end((err, res) => {
          res.should.have.status(200)
        })
    })
  })
})
