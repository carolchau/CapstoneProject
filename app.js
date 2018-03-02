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

// Broadcast to all
wss.broadcast = function broadcast(data) {
	wss.clients.forEach(function each(client) {
		if (client.readyState === WebSocket.OPEN) {
			client.send(data);
		}
	});
};

// Listen in on every connection
wss.on('connection', (ws) => {
    console.log("Dab for the new connection");

    // When message is received
    ws.on('message', (msg) => {
        var message = JSON.parse(msg);

				console.log("\n Following message received from client:");
        console.log(message);

				wss.broadcast(JSON.stringify(msg));
    });

		// Client disconnect
		ws.on('close', (connection) => {
  		console.log('Someone disconnected! :(');
		});
});

server.listen(3000, () => {
  console.log('Server listening on %d', server.address().port);
});
