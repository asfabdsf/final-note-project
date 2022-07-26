import pkg from 'chai';
const { expect } = pkg;
import mongoose from 'mongoose'
import requestip from 'request-ip'
import sinon from 'sinon'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'


import transporter from '../util/nodemailer.js'
import nodemailer from 'nodemailer'

import User from '../models/user.js'
import * as AuthController from '../controllers/auth.js'

describe('Auth Controller', function () {
  before(function (done) {

    mongoose
      .connect(
        'mongodb://localhost:27017/test2'
      )
      .then(result => {
        const user = new User({
          email: 'test@test.com',
          name: 'Test',
          password: '$2a$12$xP8Y3beksZUpdQwcs12MEufvYexm7dmykrBOj8bTMsXEkc7Hfaiti',
          posts: [],
          _id: '5c0f66b979af55031b347282',
          emailVerified: false,
          userTokenExpires: Date.now() + 3600000,
          wrongPassword: {
            Attempt: 3,
            Forbidden: false,
            ForbiddenTime: 0
          },
          IpAddress: {
            Ip: ["0.0.0.0"],
            IpToken: '',
            IpTokenExpires: 0,

          },
          userToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6ImFzc2FmX3NlaWZAb3V0bG9vay5jb20iLCJ1c2VySWQiOiI2MmM5YTc1OTBlMTZjODBjZjhjZjhiMDYiLCJpYXQiOjE2NTczODUwNTgsImV4cCI6MTY1NzM4ODY1OH0.2Cj9UBoF_Pt0-9Nt5u4KAlIN5bxHlIoIDipeCrQdpBo'
        });
        return user.save();
      })
      .then((result) => {
        //console.log(result)
        done();
      }).catch(err => console.log(err))
  });
  it('should throw an response 201 if user signed up', function (done) {
    sinon.stub(requestip, 'getClientIp')
    requestip.getClientIp.returns('0.0.0.1')
    const req = {
      body: {
        email: 'signup@signup.com',
        name: 'signup',
        password: 'signuppass',
      }

    }
    const res = {
      statusCode: 500,
      message: null,
      status: function (code) {
        this.statusCode = code
        return this;
      },
      json: function (data) {
        this.message = data.message
      }
    }
    sinon.stub(transporter,'sendMail')
    transporter.sendMail.returns({
    "user": {
        "accepted": [
            "test@test.com"
        ],
        "rejected": [],
        "envelopeTime": 384,
        "messageTime": 447,
        "messageSize": 1083,
        "response": "250 2.0.0 OK <PA4PR04MB7504ACFBBE9CAAB072506761FC8D9@PA4PR04MB7504.eurprd04.prod.outlook.com> [Hostname=PA4PR04MB7504.eurprd04.prod.outlook.com]",
        "envelope": {
            "from": "signup@signup.com",
            "to": [
                "test@test.com"
            ]
        },
        "messageId": "<c4a4e4d9-0dfb-0be3-e3ee-93a7b3c7fb61@outlook.com>"
    }
}) 

    AuthController.signup(req, res, () => { })
      .then(result => {
        console.log(result)
        expect(res.statusCode).to.be.equal(201)
        done()
        transporter.sendMail.restore()
        
      }).catch(done)

      
    
      requestip.getClientIp.restore()
     
    })



  it('should throw an error with code 500 if accessing the database fails', function (done) {
    sinon.stub(User, 'findOne');
    User.findOne.throws();

    const req = {
      body: {
        email: 'test@test.com',
        password: 'tester'
      }
    };

    AuthController.login(req, {}, () => { }).then(result => {

      expect(result).to.be.an('error');
      expect(result).to.have.property('statusCode', 500);

      done()
    }).catch(done);

    User.findOne.restore();
  });
  
  
    it('should response a 200 if the email get verified', function (done) {
      const req = {
        params: {
          token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6ImFzc2FmX3NlaWZAb3V0bG9vay5jb20iLCJ1c2VySWQiOiI2MmM5YTc1OTBlMTZjODBjZjhjZjhiMDYiLCJpYXQiOjE2NTczODUwNTgsImV4cCI6MTY1NzM4ODY1OH0.2Cj9UBoF_Pt0-9Nt5u4KAlIN5bxHlIoIDipeCrQdpBo'

        }
      }
      const res = {
        statusCode: 500,
        message: null,
        status: function (code) {
          this.statusCode = code
          return this
        },
        json: function (data) {
          this.message = data.message
        }
      }

  let data;
      AuthController.getVerified(req, res, () => { })
        .then((user) => {console.log(user)
          data =user.toJSON()
          expect(res.statusCode).to.be.equal(200);
          expect(data.emailVerified).to.be.equal(true)
          done()
        }).catch(done);




    })

    it('should send a response with valid in login', function (done) {

      sinon.stub(requestip, 'getClientIp')
      requestip.getClientIp.returns('0.0.0.0')
      const req = {
        body: {
          email: 'test@test.com',
          password: 'tester'
        }
      }
      const res = {
        statusCode: 500,
        token: null,
        status: function (code) {
          this.statusCode = code;
          return this;
        },

        json: function (data) {
          this.token = data.token

        }
      }
      sinon.stub(jwt, 'sign')
      let data;
      jwt.sign.returns('454asd5a4sd87asd45a4sd4a5s6d')
      AuthController.login(req, res, () => { })
        .then(result => {
          console.log(result)
          data=result.toJSON();
          expect(res.statusCode).to.be.equal(200)
          expect(res.token).not.be.equal(null)
          expect(data).to.have.property('_id')
          done()
        }).catch(done);
      jwt.sign.restore()
      requestip.getClientIp.restore()
  })








  it('should send response 200 if the password changed',  function (done) {
    const req = {
      body: {
        oldPassword: 'tester',
        newPassword: 'tester2'
      },
      userId: '5c0f66b979af55031b347282'
    }
    const res = {
      statusCode: null,
      message: '',
      status: function (code) {
        this.statusCode = code
        return this
      },
      json: function (data) {
        this.message = data.message
      }
    }
    let data;


    AuthController.changePassword(req, res, () => { })
      .then(user => {
        data = user.toJSON()

        expect(res.statusCode).to.be.equal(200)
        done()
      }).catch(done)

  })
beforeEach(function(done){
  const IpAddress= {
    Ip: ["0.0.0.0"],
    IpToken:  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6ImFzc2FmX3NlaWZAb3V0bG9vay5jb20iLCJ1c2VySWQiOiI2MmM5YTc1OTBlMTZjODBjZjhjZjhiMDYiLCJpYXQiOjE2NTczODUwNTgsImV4cCI6MTY1NzM4ODY1OH0.2Cj9UBoF_Pt0-9Nt5u4KAlIN5bxHlIoIDipeCrQdpBo',
    IpTokenExpires: Date.now() + 3600000,

  }
  User.findOne({_id:'5c0f66b979af55031b347282'}).then(user=>{
    user.IpAddress=IpAddress
    return user.save()
  }).then(result=>{
    done()
  })

})

it('should send response 200 if ip added to the user and the length of IP increase',function(done){
  

  sinon.stub(requestip, 'getClientIp')
  requestip.getClientIp.returns('0.0.0.2')
  //cobsole.log(user)

const req ={
  params :{
    token :  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6ImFzc2FmX3NlaWZAb3V0bG9vay5jb20iLCJ1c2VySWQiOiI2MmM5YTc1OTBlMTZjODBjZjhjZjhiMDYiLCJpYXQiOjE2NTczODUwNTgsImV4cCI6MTY1NzM4ODY1OH0.2Cj9UBoF_Pt0-9Nt5u4KAlIN5bxHlIoIDipeCrQdpBo'
  }
}
const res ={
  statusCode:500,
  message:null,
  status :function(code){
    this.statusCode=code
    return this
  },
  json:function(data){
    this.message=data.message;
  }
}
let data;
AuthController.IpVerification(req,res,()=>{})
.then(result=>{
 data=result.toJSON()
  expect(res.statusCode).to.equal(200)
  expect(res.message).not.to.be.null
  expect(data.IpAddress.Ip).to.have.lengthOf(2)
  requestip.getClientIp.restore()
  done()
}).catch(done)



})


  after(function (done) {
    User.deleteMany({})
      .then(() => {
        return mongoose.disconnect();
      })
      .then(() => {
        done();
      });
  });
});
