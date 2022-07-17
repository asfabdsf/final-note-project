import {Router} from 'express'
import User from '../models/user.js'
import * as AuthController from '../controllers/auth.js'
import isauth from '../middleware/is-auth.js'
import pkg from 'express-validator'
const {body} = pkg

const router = Router()

router.post('/signup'
,[
    body('email')
    .isEmail()
    .withMessage('Please enter a valid email')
    .custom((value, { req }) => {
        return User.findOne({ email: value })
            .then(user => {
                if (user) {
                    return Promise.reject('E-mail address exist')
                }

            })



    }).normalizeEmail(),
body('password')
    .trim()
    .isLength({ min: 5 }),
body('name')
    .trim().not().isEmpty()


]
,AuthController.signup)

router.post('/login',AuthController.login);

  router.post('/reset/:token',AuthController.getVerified);

router.get('/reset/password',isauth,AuthController.getResetpassword);


router.patch('/change/password',isauth,
[
    body('newPassword')
    .isLength({min:5})
    .trim()
]
,AuthController.changePassword);

router.post('/testpdf',AuthController.test)


router.patch('/reset/password/:token',[
    body('password')
    .isLength({min:5})
    .trim()
],isauth,AuthController.postResetpassword);

router.patch('/IpVerification',AuthController.IpVerification)




export default router;