const catchAsync = require('../utils/catchAsync');
const Tour = require('./../models/tourModel');
const User = require('./../models/userModel');
const Booking = require('./../models/bookingModel');
const AppError = require('./../utils/appError');

exports.getOverview = catchAsync(async (req, res) => {
  // Get Tours data
  const tours = await Tour.find();

  // Build template and send data
  res.status(200).render('overview', {
    title: 'Exciting tours for adventurous people',
    tours,
  });
});

exports.getTour = catchAsync(async (req, res, next) => {
  const tour = await Tour.findOne({ slug: req.params.slug }).populate({
    path: 'reviews',
    fields: 'review rating user',
  });

  if (!tour) {
    return next(new AppError('There is no tour with that name.', 404));
  }

  res.status(200).render('tour', {
    title: `${tour.name} Tour`,
    tour,
  });
});

exports.getlogin = (req, res) => {
  res.status(200).render('login', {
    title: 'Login into your account',
  });
};

exports.getsignup = (req, res) => {
  res.status(200).render('signup', {
    title: 'Sign Up into your account',
  });
};

exports.getAccount = (req, res) => {
  res.status(200).render('account', {
    title: 'Your Account',
  });
};

exports.getMyTours = catchAsync(async (req, res, next) => {
  // 1) Find all bookings
  const bookings = await Booking.find({ user: req.user.id });

  // 2) Find tours with the returned IDs
  // const tourIDs = bookings.map((el) => el.tour);
  // const tours = await Tour.find({ _id: { $in: tourIDs } });

  res.status(200).render('bookingPage', {
    title: 'My Tours',
    bookings,
  });
});
