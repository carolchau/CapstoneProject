//https://scotch.io/tutorials/easy-node-authentication-setup-and-local
var express  = require('express');
var app      = express();
var port     = process.env.PORT || 3000;
const http = require('http');
const url = require('url');
const WebSocket = require('ws');
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });
var mongoose = require('mongoose');
var passport = require('passport');
var flash    = require('connect-flash');
var logger   = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var session  = require('express-session');

var configDB = require('./config/database.js');

// configuration ===============================================================
mongoose.connect(configDB.url, { useMongoClient: true }); // connect to our database
// routes ======================================================================
require('./config/passport')(passport);

// set up our express application
app.use(logger('combined'));
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: true }));
app.set('view engine', 'ejs'); // set up ejs for templating
app.use(express.static('public'));

// required for passport
app.use(session({ resave: true, saveUninitialized: true, 
	secret: 'testtesttesttesttesttest' })); // session secret
app.use(passport.initialize());
app.use(passport.session()); // persistent login sessions
app.use(flash()); // use connect-flash for flash messages stored in session

require('./routes/routes.js')(app, passport); // load our routes and pass in our app and fully configured passport

// Listen in on every WebSocket connection
wss.on('connection', (ws) => {
	console.log("\nDab for the new connection");

	// When message is received from client
	ws.on('message', (msg) => {
	    var message = JSON.parse(msg);

			console.log("\nFollowing message received from client:");
	    console.log(message);

			wss.broadcast(JSON.stringify(msg));
	});

	// Client disconnect
	ws.on('close', (connection) => {
		console.log('\nSomeone disconnected! :(');
	});
});

// Broadcast message to all connected clients
wss.broadcast = function broadcast(data) {
	wss.clients.forEach(function each(client) {
		if (client.readyState === WebSocket.OPEN) {
			client.send(data);
		}
	});
};
// launch ======================================================================
server.listen(port);
console.log('The magic happens on port ' + port);