const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { promisify } = require('util');
const User = require('./../models/userModel');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');
const Email = require('./../utils/email');

const signToken = (id) =>
  jwt.sign({ id: id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });

const senjwtToken = (user, statusCode, res) => {
  const token = signToken(user._id);
  const cookieOptions = {
    expires:
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000,
    httpOnly: true,
  };
  if (process.env.NODE_ENV === 'production') cookieOptions.secure = true;

  res.cookie('jwt', token, cookieOptions);

  // Remove password from output
  user.password = undefined;

  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user,
    },
  });
};

exports.signup = catchAsync(async (req, res, next) => {
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
  });

  const url = `${req.protocol}://${req.get('host')}/me`;
  await new Email(newUser, url).sendWelcome();
  senjwtToken(newUser, 201, res);
});

exports.login = catchAsync(async (req, res, next) => {
  // 1) Check if password and email is specified
  const { email, password } = req.body;

  if (!email || !password) {
    return next(new AppError('Please enter email and password', 400));
  }

  // 2) Check if user exist
  const user = await User.findOne({ email }).select('+password');

  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError('Invalid Email Id or Password'), 401);
  }
  // 3) Sign jwt
  senjwtToken(user, 200, res);
});

exports.logout = (req, res) => {
  res.cookie('jwt', 'Logged_Out', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });
  res.status(200).json({ status: 'success' });
};

exports.protect = catchAsync(async (req, res, next) => {
  let token;
  // 1. Check if token is inputed
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }

  if (!token) {
    return next(
      new AppError('You are not logged In , Log In to gain access', 401),
    );
  }

  // 2. Verify token
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  // 3. Check if User Exist with the given Token
  const currentUser = await User.findById(decoded.id);

  if (!currentUser) {
    return next(
      new AppError('User with the given token does not exist !'),
      401,
    );
  }

  // 4. Check if password was changed after token was issued
  if (currentUser.passwordChangedAfter(decoded.iat)) {
    return next(
      new AppError(
        'User Credentials recently changed , Please Log In again',
        401,
      ),
    );
  }

  // Grant ACCESS to route
  req.user = currentUser;
  res.locals.user = currentUser;
  next();
});

// Only for rendered pages, no errors!
exports.isLoggedIn = async (req, res, next) => {
  if (req.cookies.jwt) {
    try {
      // 1) verify token
      const decoded = await promisify(jwt.verify)(
        req.cookies.jwt,
        process.env.JWT_SECRET,
      );

      // 2) Check if user still exists
      const currentUser = await User.findById(decoded.id);
      if (!currentUser) {
        return next();
      }

      // 3) Check if user changed password after the token was issued
      if (currentUser.passwordChangedAfter(decoded.iat)) {
        return next();
      }

      // THERE IS A LOGGED IN USER
      res.locals.user = currentUser;
      return next();
    } catch (err) {
      return next();
    }
  }
  next();
};

exports.restrictTo =
  (...roles) =>
  (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError('You do not have permission to perform this action', 403),
      );
    }

    next();
  };

exports.forgotPassword = catchAsync(async (req, res, next) => {
  // 1. get email and verify User using email
  const user = await User.findOne({ email: req.body.email });

  if (!user) {
    return next(
      new AppError('User with the given Email ID does not exist', 404),
    );
  }
  // 2. Generate Reset Token
  const resetToken = user.sentPasswordResetToken();
  await user.save({ validateBeforeSave: false });
  // 3. Send Reset Token with mail

  try {
    const requestURL = `${req.protocol}//${req.get(
      'host',
    )}/api/v1/users/resetPassword/${resetToken}`;

    await new Email(user, requestURL).sendPasswordReset();

    res.status(200).json({
      status: 'sucess',
      message: 'Token sent to mail',
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetTokenExpires = undefined;

    return next(
      new AppError(
        'Error while sending the mail , Please try again later !!',
        500,
      ),
    );
  }
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  if (!req.body.password || !req.body.passwordConfirm) {
    return next(new AppError('Provide password and passwordConfirm', 400));
  }

  //Get Token , convert to hash
  const hashToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  // Find User with hashToken
  const user = await User.findOne({
    passwordResetToken: hashToken,
    passwordResetTokenExpires: { $gt: Date.now() },
  });
  // Check if user does not exist or token expired
  if (!user) {
    return next(new AppError('Invalid token or expired', 400));
  }
  // Reset Password
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetTokenExpires = undefined;
  await user.save();
  // send jwt token

  senjwtToken(user, 200, res);
});

exports.updateMypassword = catchAsync(async (req, res, next) => {
  if (
    !req.body.passwordCurrent ||
    !req.body.password ||
    !req.body.passwordConfirm
  ) {
    return next(
      new AppError(
        'Please enter passwordCurrent, password and passwordConfirm ',
        400,
      ),
    );
  }
  // Get User from collection by id
  const user = await User.findById(req.user._id).select('+password');
  // Check given password before updating to new
  if (!(await user.correctPassword(req.body.passwordCurrent, user.password))) {
    return next(new AppError('Your current password is wrong', 401));
  }

  // update password
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  await user.save();
  // login user by sending new jwt
  senjwtToken(user, 200, res);
});
