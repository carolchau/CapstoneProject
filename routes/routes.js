module.exports = function(app, passport) {
	// Home page
	app.get('/', function(req, res) {
		res.render('home.ejs'); // load the home.ejs file
	});

	// Login
	app.get('/login', function(req, res) {
		res.render('login.ejs', { message: req.flash('loginMessage') });
	});
	app.post('/login', passport.authenticate('local-login', {
		successRedirect : '/index',
		failureRedirect : '/login',
		failureFlash : true
	}));

	// Signup
	app.get('/signup', function(req, res) {
		res.render('signup.ejs', { message: req.flash('signupMessage') });
	});

	// Process the signup form
	app.post('/signup', passport.authenticate('local-signup', {
		successRedirect : '/index',
		failureRedirect : '/signup',
		failureFlash : true
	}));

	// Profile section
	app.get('/index', isLoggedIn, function(req, res) {
		res.render('index.ejs', {
			user : req.user
		});
	});

	// Logout
	app.get('/logout', function(req, res) {
		req.logout();
		res.redirect('/');
	});
};

// Route middleware to make sure
function isLoggedIn(req, res, next) {
	if (req.isAuthenticated())
		return next();
	res.redirect('/');
}
