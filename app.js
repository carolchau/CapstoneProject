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
});
app.get('/graphicstest', (req, res) => {
	res.render('graphicstest.ejs');
});

const server = http.createServer(app);
const wss = new WebSocket.Server({
    server
});

//Variable to keep track of unique player indices
var unique_counter = 0;

setInterval(function(){
    var data = {type: "world_data"}
    for (let client of wss.clients) {
         data[client.unique_id] = {x_position: client.x_position,
                                   y_position: client.y_position};
    }
    wss.broadcast(JSON.stringify(data));
}, 50);

// Listen in on every WebSocket connection
wss.on('connection', (client) => {
    console.log("Dab for the new connection \n");

    client.unique_id = unique_counter;
    client.x_position = 32000;
    client.y_position = 32000;
    var player_data = {type: "id", player_id: unique_counter};
    client.send(JSON.stringify(player_data));

    unique_counter++;

    // When message is received from client
    client.on('message', (msg) => {
        var message = JSON.parse(msg);

        if(message.type == "input"){
            if(message.input == 37){
                client.x_position-=5;
            }
            else if(message.input == 38){
                client.y_position-=5;
            }
            else if(message.input == 39){
                client.x_position+=5;
            }
            else if(message.input == 40){
                client.y_position+=5;
            }
        }
        else{
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
        console.log('Player  disconnected! :( \n');
        console.log(client.unique_id);
    });
});

// Broadcast message to all connected clients
wss.broadcast = (data) => {
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(data);
        }
    });
};

server.listen(3000, () => {
    console.log('Server listening on %d \n', server.address().port);
});
