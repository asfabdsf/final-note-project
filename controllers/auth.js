import { validationResult } from 'express-validator'
import requestip from 'request-ip'
import mongoose from 'mongoose'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import bcrypt from 'bcryptjs'
let URL = 'http://localhost:8080';
if (process.env.PORT) {
  URL = 'https://final-for-eurisko.herokuapp.com';
}

import nodemailer from 'nodemailer'
import transporter from '../util/nodemailer.js'
// let nodemailer;
// let transporter;

import User from '../models/user.js'




export const resendToken    //localhost:8080/auth/resend/token
= async (req, res, next) => {  
  const email = req.body.email;
  try {
    const user = await User.findOne({ email: email })
    const token = crypto.randomBytes(32).toString('hex')
    const sendedemail = await transporter.sendMail({
      from: '"Assaf seif expert 👻" <assaf_Seif@outlook.com>', 
      to: email, 
      subject: "Hello to assaf  ✔", 
      text: "welcome for submitting", 
      html: `
  <h2>Thanks for signing up with Assaf !
  Resending Token
  You must follow this link within 1 hour of registration to activate your account:</h2>
    <a href="${URL}/auth/getverified/${token}">Click Here</a>
    <h3>Have fun, and don't hesitate to contact us with your feedback.<h3>

       <a href="http://localhost:8080/about">The Assaf Team!</a>`,
    });

    if (sendedemail) {
      console.log('sending email : DONE!')
    }
    user.userToken = token,
      user.userTokenExpires = Date.now() + 3600000
    const awaitedUser = await user.save();
    res.status(200).json({ message: 'token in your email', user: awaitedUser })
  }
catch(err){next(err)}
}

export const signup =       //localhost:8080/auth/signup
 async (req, res, next) => {

  let clientIp = requestip.getClientIp(req);

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const error = new Error('Validation failed.');
    error.statusCode = 422;
    error.data = errors.array();
    throw error;
  }
  const {email , name ,password}=req.body;
 
  const token = crypto.randomBytes(32).toString('hex')

  try {
    const hashedpassword = await bcrypt.hash(password, 12);

    const user = new User({
      email: email,
      password: hashedpassword,
      name: name,
      userToken: token,
      userTokenExpires: Date.now() + 3600000,
      IpAddress: {
        Ip: [clientIp],
        IpToken: '',
        IpTokenExpires: 0

      }
      ,
      wrongPassword: {
        Attempt: 3,
        Forbidden: false,
        ForbiddenTime: 0
      }
    });
    const result = await user.save();
    console.log('before sending email;')
    const sendedemail = await transporter.sendMail({
      from: '"Assaf seif expert 👻" <assaf_Seif@outlook.com>', 
      to: email, 
      subject: "Hello to assaf  ✔", 
      text: "welcome for submitting", 
      html: `
    <h2>Thanks for signing up with Assaf !
    You must follow this link within 1 hour of registration to activate your account:</h2>
      <a href="${URL}/auth/getverified/${token}">Click Here</a>
      <h3>Have fun, and don't hesitate to contact us with your feedback.<h3>

         <a href="http://localhost:8080/about">The Assaf Team!</a>`,
    });

    if (sendedemail) {
      console.log('sending email : DONE!')
    }

    res.status(201).json({
      message: 'User created!',
      message_email: 'email sended',
      user: user
    });
    return sendedemail
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

export const login =        //localhost:8080/auth/login
 async (req, res, next) => {
  const email = req.body.email;
  const password = req.body.password;
  let clientIp = requestip.getClientIp(req);
  let loadedUser;
  try {
    const user = await User.findOne({ email: email });
    if (!user) {
      const error = new Error('A user with this email could not be found.');
      error.statusCode = 401;
      throw error;
    }
    if (!user.emailVerified) {
      const error = new Error('Not authorized please verify your email first');
      error.statusCode = 401;
      throw error;
    }


    let Forbiddentemporary;
    if (user.wrongPassword.Forbidden || Date.now() < user.wrongPassword.ForbiddenTime.getTime()) {


      if (user.wrongPassword.Forbidden) {
        console.log(user.wrongPassword.Forbidden)
        const error = new Error(`you are forbidden we advice you wo contact us!`)
        error.statusCode = 403;
        throw error;
      }
      const result = user.wrongPassword.ForbiddenTime
      const d = new Date();
      const remaining = (result.getMinutes() - d.getMinutes());
      console.log(d.getMinutes())
      if (user.wrongPassword.Attempt === 0) {
        Forbiddentemporary = true;
      }

      const error = new Error(`you are forbidden and you still have ${remaining} minute  Be carfully this is ur last attempt!`)
      error.statusCode = 403;
      throw error;
    }

    const isEqual = await bcrypt.compare(password, user.password);
    if (user.wrongPassword.Attempt === 0 && !isEqual) {

      const error = new Error(`Oops! you are forbidden please contact us`)
      user.wrongPassword.Forbidden = true
      await user.save()
      error.statusCode = 403;
      throw error;

    }
    if (!isEqual) {
      user.wrongPassword.Attempt = user.wrongPassword.Attempt - 1;
      console.log(user.wrongPassword.Attempt)
      if (user.wrongPassword.Attempt === 0) {
        user.wrongPassword.ForbiddenTime = Date.now() + 900000;
        console.log(user.wrongPassword)

        await user.save();
        const error = new Error(`you are forbidden for ${user.wrongPassword.ForbiddenTime}  `)
        error.statusCode = 403;
        throw error;

      }
      await user.save();

      const error = new Error('Wrong password!');
      error.statusCode = 401;
      throw error;
    }
    const wrongPassword = {
      Attempt: 3,
      Forbidden: false,
      ForbiddenTime: 0
    }
    user.wrongPassword = wrongPassword;

    await user.save();
    const token = jwt.sign(
      {
        email: user.email,
        userId: user._id.toString()
      },
      'secret',
      { expiresIn: '1h' }
    );
    const checkIp = await User.find({ "IpAddress.Ip": { "$in": [clientIp] }, _id: user._id })

    if (checkIp.length <= 0) {

      const token = crypto.randomBytes(32).toString('hex')
      user.IpAddress.IpToken = token;
      user.IpAddress.IpTokenExpires = Date.now() + 3600000;
      console.log('sending token.....')
      await user.save()
      await transporter.sendMail({
        from: '"Assaf seif expert 👻" <assaf_Seif@outlook.com>', 
        to: email,
        subject: "Verify Login from New Location", 
        text: `Welcome ${user.name} again !`, 
        html: `<h1>IP ADDRESS : ${clientIp} </h1>
              <h2>It looks like someone tried to log into your account from a new location.
               If this is you, follow the link below to authorize logging in from this location on your account.
               If this isn't you, we suggest changing your password as soon as possible.</h2>
                  <a href="${URL}/auth/ipVerification/${token}">Click Here</a>
    
                     <a href="${URL}/about">The Assaf Team!</a>`,
      });
      return res.status(301).json({ token: token, message: 'please check your enail to verify this new location' })
    }
    res.status(200).json({ token: token, userId: user._id.toString() });
    return user;
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
    return err;
  }
};


export const getVerified  
 = async (req, res, next) => {
  const resetToken = req.params.token;
  
  try {
    const user = await User.findOne({ userToken: resetToken, userTokenExpires: { $gt: Date.now() } })

    if (!user) {

      const error = new Error('we cant find user with this token')
      error.statusCode = 401;
      throw error;
    }

    user.emailVerified = true;
    user.userToken = ''
    user.userTokenExpires = 0;
    const newuser = await user.save()

    res.status(200).json({
      message: "the user is Verified !!!!!",
      user: newuser
    })

    return newuser;
  } catch (err) { console.log(err), next(err) }
}


export const postResetpassword 
= async (req, res, next) => {
  const error = validationResult(req);
  if (!error.isEmpty()) {
    const error = new Error('Password validation error ');
    error.statusCode = 422;
    throw error;

  }
  const token = req.params.token;
  const password = req.body.password;
  const user = await User.findOne({ userToken: token, userTokenExpires: { $gt: Date.now() } })

  if (!user) {
    const error = new Error('no user');
    error.statusCode = 404;
    throw error;
  }


  const hashedpassword = await bcrypt.hash(password, 12)

  user.password = hashedpassword;
  user.userToken = '';
  user.userTokenExpires = 0;
  const usersaved = await user.save();

  res.status(201).json({
    message: "user password changed",
    newpassword: usersaved.password
  })



}

export const SendResetpassword    //localhost:8080/auth/reset/password
= async (req, res, next) => {
  const email = req.body.email;


  try {
    const user = await User.findOne({ email: email })
    const token = crypto.randomBytes(32).toString('hex')

    if (!user) {
      const error = new Error('No user found');
      error.statusCode = 404;
      throw error;
    }
    console.log(token)
    user.userToken = token;
    user.userTokenExpires = Date.now() + 3600000;
    const usersaved = await user.save();

    await transporter.sendMail({
      from: '"Assaf seif expert 👻" <assaf_Seif@outlook.com>', 
      to: email, 
      subject: "Reset your Password", 
      text: "Welcome again !", 
      html: `
            <h2>Someone (hopefully you) has requested a password reset for your  account. Follow the link below to set a new password::</h2>
                <a href="${URL}/auth/reset/password/${token}">Click Here</a>
                <h3>If you don't wish to reset your password, disregard this email and no action will be taken.<h3>
  
                   <a href="${URL}/about">The Assaf Team!</a>`,
    });
    res.status(200).json({
      message: "token sended",
      user: user
    })


  }
  catch (err) {
    next(err)
  }


}

export const changePassword        //localhost:8080/auth/change/password
= async (req, res, next) => {
  const error = validationResult(req);
  if (!error.isEmpty()) {
    const error = new Error('Password validation error ');
    error.statusCode = 422;
    throw error;

  }
  try {
    const user = await User.findOne({ _id: req.userId })
    const oldPassword = req.body.oldPassword;
    const newPassword = req.body.newPassword;
    const isEqual = await bcrypt.compare(oldPassword, user.password);
    if (!isEqual) return res.status(422).json({ message: "The provided credentials are incorrect" })

    let hashedpassword = await bcrypt.hash(newPassword, 12)
    user.password = hashedpassword;
    const updateduser = await user.save()
    res.status(200).json({ message: 'Password has been changed' })

    return updateduser;
  } catch (err) { next(err) }


}

export const IpVerification 
= async (req, res, next) => {
  console.log('IpVerificcation')
  try {
    const token = req.params.token;
    //console.log(token)
    const user = await User.findOne({ "IpAddress.IpToken": token, "IpAddress.IpTokenExpires": { $gt: Date.now() } });
    //console.log(user)
    if (!user) {
      const error = new Error('No user found');
      error.statusCode = 404;
      throw error;
    }

    let clientIp = requestip.getClientIp(req);


    user.IpAddress.Ip.push(clientIp);// we can also check if the ip is the same when he tried to login but 
    user.IpAddress.IpToken = '';
    user.IpAddress.IpTokenExpires = 0;
    const updatedUser = await user.save()
    res.status(200).json({ message: "Done! You can now login from this new location " })
    return updatedUser;
  } catch (err) { next(err) }


}


