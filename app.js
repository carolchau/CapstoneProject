const express = require('express');
const http = require('http');
const url = require('url');
const WebSocket = require('ws');

const app = express();

// Set template engine
app.set('view engine', 'ejs');

// Middlewares
app.use(express.static('public'));

// Routes
app.get('/', (req, res) => {
	res.render('index.ejs');
	//res.send('Hello World!');
});

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Listen in on every WebSocket connection
wss.on('connection', (client) => {
	console.log("\nDab for the new connection");

	// When message is received from client
	client.on('message', (msg) => {
	    var message = JSON.parse(msg);

			console.log("\nFollowing message received from client:");
	    console.log(message);

			wss.broadcast(JSON.stringify(msg));
	});

	// Error handling
	client.on('error', (error) => {
		console.log('\nAn Error has occurred:\n' + error);
	});

	// Client disconnect
	client.on('close', (connection) => {
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

server.listen(3000, () => {
	console.log('Server listening on %d', server.address().port);
});
