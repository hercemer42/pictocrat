const chai = require('chai')
const chaiHttp = require('chai-http')
const express = require('express')
const { config } = require('../lib/config')
const { ServerService } = require('../lib/services/server')
const pictureDirectory = process.env.PWD + '/test/assets/images'

chai.use(chaiHttp)
chai.should()

describe('Array', function() {
  before(() => {
    serverService = new ServerService(express)
    serverService.startStaticFileServer(pictureDirectory, config.defaults.expressJsPort)
  }) 
  
  describe('express server', function() {
    it('should be able to request an image from the server', function(done) {
      chai.request(`http://localhost:${config.defaults.expressJsPort}`)
        .get('/t1.png')
        .end((err, res) => {
          res.should.have.status(200)
          done()
        })
    })
  })
})
