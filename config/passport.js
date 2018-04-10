// Load requirementes
var LocalStrategy = require('passport-local').Strategy;

// Load up the user model
var User = require('../models/user');

// Expose this function to our appplication
module.exports = function(passport) {
  // Passport session setup

  // Serialize the user for the session
  passport.serializeUser(function(user, done) {
    done(null, user.id);
  });

  // Deserialize the user
  passport.deserializeUser(function(id, done) {
    User.findById(id, function(err, user) {
        done(err, user);
    });
  });

  // Local sign up
  passport.use('local-signup', new LocalStrategy({
    usernameField : 'email',
    passwordField : 'password',
    passReqToCallback : true
  },
  function(req, email, password, done) {
	  // Find a user whose email is the same as the forms email
    User.findOne({ 'local.email' :  email }, function(err, user) {
      if (err)
        return done(err);
      if (user) {
        return done(null, false, req.flash('signupMessage', 'That email is already taken.'));
      } else {
        var newUser = new User();
        newUser.local.email = email;
        newUser.local.password = newUser.generateHash(password);
        newUser.save(function(err) {
            if (err)
                throw err;
            return done(null, newUser);
        });
      }
    });
  }));

  // Local login
  passport.use('local-login', new LocalStrategy({
    usernameField : 'email',
    passwordField : 'password',
    passReqToCallback : true
  },
  function(req, email, password, done) {
    // Find a user whose email is the same as the forms email and return to user if successful
    User.findOne({ 'local.email' :  email }, function(err, user) {
        if (err)
            return done(err);
        if (!user)
            return done(null, false, req.flash('loginMessage', 'No user found.'));
        if (!user.validPassword(password))
            return done(null, false, req.flash('loginMessage', 'Oops! Wrong password.'));
        return done(null, user);
    });
  }));
  
};
