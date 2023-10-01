const express = require('express');
const viewController = require('./../controllers/viewContoller');
const authController = require('./../controllers/authController');

const router = express.Router();

router.get('/', authController.isLoggedIn, viewController.getOverview);
router.get('/tour/:slug', authController.isLoggedIn, viewController.getTour);
router.get('/login', authController.isLoggedIn, viewController.getlogin);
router.get('/signup', viewController.getsignup);
router.get('/me', authController.protect, viewController.getAccount);

router.get('/my-tours', authController.protect, viewController.getMyTours);

module.exports = router;
