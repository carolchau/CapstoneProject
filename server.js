//https://scotch.io/tutorials/easy-node-authentication-setup-and-local
const express  = require('express');
const app = express();
const http = require('http');
const url = require('url');
const WebSocket = require('ws');
const { spawn } = require('child_process');
const WORLD_UNIT = 16;
const WORLD_SIZE = 4000;
const HAT_TYPES = 3;
const HAT_COUNT = 1000;
const CELL_SIZE = 32;

var port = process.env.PORT || 3000;
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

var mongoose = require('mongoose');
var passport = require('passport');
var flash = require('connect-flash');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var session = require('express-session');

var configDB = require('./config/database.js');
// Connect to Database
mongoose.connect(configDB.url, { useMongoClient: true });

// Routes
require('./config/passport')(passport);

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

// Hat distribution generation
var hat_data = {
    type: "hat_data",
    data: []
}

// Initial hat hash variables
var hat_hash = {};
var unique_hat_id_counter = 0;

// Generating hat objects
let remaining_count = HAT_COUNT;
for(let i = 0; i < HAT_TYPES-1; i++){
    let slice_count = Math.floor(Math.random() * (remaining_count - (HAT_TYPES - i - 1))) + 1;
    for(let j = 0; j < slice_count; j++){
        //Choose location
        let width = 16;
        let height = 16;
        let temp_x = Math.floor(Math.random() * WORLD_SIZE * WORLD_UNIT - width);
        let temp_y = Math.floor(Math.random() * WORLD_SIZE * WORLD_UNIT - height);
        let temp_hx = Math.floor(temp_x/CELL_SIZE);
        let temp_hy = Math.floor(temp_y/CELL_SIZE);

        //Generate object
        if(hat_hash[[temp_hx,temp_hy]] == undefined){
            hat_hash[[temp_hx,temp_hy]] = [];
        }
        hat_hash[[temp_hx,temp_hy]].push(unique_hat_id_counter);
        hat_data["data"].push([temp_x, temp_y, width, height, i]);
        unique_hat_id_counter++;
    }
    remaining_count = remaining_count - slice_count;
}
for(let i = 0; i < remaining_count; i++){
    //Choose location
    let width = 16;
    let height = 16;
    let temp_x = Math.floor(Math.random() * WORLD_SIZE * WORLD_UNIT - width);
    let temp_y = Math.floor(Math.random() * WORLD_SIZE * WORLD_UNIT - height);
    let temp_hx = Math.floor(temp_x/CELL_SIZE);
    let temp_hy = Math.floor(temp_y/CELL_SIZE);

    //Generate object
    if(hat_hash[[temp_hx,temp_hy]] == undefined){
        hat_hash[[temp_hx,temp_hy]] = [];
    }
    hat_hash[[temp_hx,temp_hy]].push(unique_hat_id_counter);
    hat_data["data"].push([temp_x, temp_y, width, height, HAT_TYPES-1]);
    unique_hat_id_counter++;
}


// Broadcast world data to all players at a set interval
setInterval(function() {
	let data = {
		type: "world_data",
    data: {}
	};
	for (let client of wss.clients) {
		data["data"][client.unique_id] = {
		  x_position: client.x_position,
		  y_position: client.y_position,
          collected: []
		};
        let hx_position = Math.floor(client.x_position/CELL_SIZE);
        let hy_position = Math.floor(client.y_position/CELL_SIZE);
        let candidate_length = hat_hash[[hx_position,hy_position]].length;
        for(let i = 0; i < candidate_length; i++){
            let hat_id = hat_hash[[hx_position,hy_position]][i];
            let hat_pos = hat_data["data"][hat_id];
            let player_left = client.x_position;
            let player_right = player_left + client.width;
            let player_top = client.y_position;
            let player_bot = player_top + client.height;
            let hat_left = hat_pos[0];
            let hat_right = hat_left + hat_pos[2];
            let hat_top = hat_pos[1];
            let hat_bot = hat_top + hat_pos[3];
            if(player_top < hat_bot && player_right > hat_left &&
               player_bot > hat_top && player_left > hat_right){
                delete hat_hash[[hx_position,hy_position]][i];
                data["data"][client.unique_id]["collected"].push(hat_id); 
            }
        }
	}
	wss.broadcast(JSON.stringify(data));
}, 50);


// Variable to keep track of unique player indices
var unique_counter = 0;

// Listen in on every WebSocket connection
wss.on('connection', (client) => {
	console.log('Dab for the new connection \n');

	client.unique_id = unique_counter;
	client.x_position = 32000;
	client.y_position = 32000;
	client.width = 0;
	client.height = 0;
	var player_data = {
		type: "id",
		data: {player_id: unique_counter}
	};
	client.send(JSON.stringify(player_data));

    // Hat_data defined earlier
    client.send(JSON.stringify(hat_data));

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
					client.x_position = WORLD_SIZE*WORLD_UNIT - client.width;
				if (client.y_position < 0) client.y_position = 0;
				if (client.y_position+client.height > WORLD_SIZE*WORLD_UNIT)
					client.y_position = WORLD_SIZE*WORLD_UNIT - client.height;
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
