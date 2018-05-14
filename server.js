//https://scotch.io/tutorials/easy-node-authentication-setup-and-local
const express  = require('express');
const app = express();
const http = require('http');
const url = require('url');
const WebSocket = require('ws');
const { spawn } = require('child_process');
const WORLD_UNIT = 16;
const WORLD_SIZE = 4000;

var port = process.env.PORT || 3000;
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

var mongoose = require('mongoose');
var passport = require('passport');
var flash = require('connect-flash');
//var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var session = require('express-session');

var configDB = require('./config/database.js');
// Connect to Database
mongoose.connect(configDB.url, { useMongoClient: true });

// Routes
require('./config/passport')(passport);

// Set up Express App
//app.use(logger('combined'));

// BodyParser Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());

// Set Template Engine
app.set('view engine', 'ejs');

// Set Static Folder
app.use(express.static('public'));

// Express Session
app.use(session({
	secret: 'testtesttesttesttesttest',
	saveUninitialized: true,
	resave: true
}));

// Passport
app.use(passport.initialize());
app.use(passport.session());

// Connect-flash
app.use(flash());

// Load Routes
require('./routes/routes.js')(app, passport);

//Variable to keep track of unique player indices
var unique_counter = 0;

setInterval(function() {
	var data = {
		type: "world_data",
    data: {}
	};
	for (let client of wss.clients) {
		data["data"][client.unique_id] = {
			x_position: client.x_position,
		  y_position: client.y_position
		};
	}
	wss.broadcast(JSON.stringify(data));
}, 50);

// Listen in on every WebSocket connection
wss.on('connection', (client) => {
	console.log('Dab for the new connection \n');

	client.unique_id = unique_counter;
	client.x_position = 63000;
	client.y_position = 63000;
	client.width = 0;
	client.height = 0;
	var player_data = {
		type: "id",
		data: {player_id: unique_counter}
	};
	client.send(JSON.stringify(player_data));

	unique_counter++;

	// When message is received from client
	client.on('message', (msg) => {
	  var message = JSON.parse(msg);

	  if(message.type == "input"){
	      if(message.data.left){
	          client.x_position-=5;
	      }
	      if(message.data.up){
	          client.y_position-=5;
	      }
	      if(message.data.right){
	          client.x_position+=5;
	      }
	      if(message.data.down){
	          client.y_position+=5;
	      }
				if (client.x_position < 0) client.x_position = 0;
				if (client.x_position+client.width > WORLD_SIZE*WORLD_UNIT)
					client.x_position = WORLD_SIZE*WORLD_UNIT - client.width - 1;
				if (client.y_position < 0) client.y_position = 0;
				if (client.y_position+client.height > WORLD_SIZE*WORLD_UNIT)
					client.y_position = WORLD_SIZE*WORLD_UNIT - client.height - 1;
	  }
		else if (message.type == "player info") {
			client.width = message.data.width;
			client.height = message.data.height;
		}
	  else {
	    console.log("Following message received from client: \n");
	    console.log(message);
	    wss.broadcast(msg);
	  }
	});

	// Error handling
	client.on('error', (error) => {
		console.log('An Error has occurred: \n' + error);
	});

	// Client disconnect
	client.on('close', (connection) => {
	  var data = {type: "disconnect", data:{player: client.unique_id}}
	  wss.broadcast(JSON.stringify(data));
	  console.log('Player[' + client.unique_id + '] disconnected! :( \n');
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

server.listen(port, () => {
	console.log('The magic happens on port ' + port);
});
