$(function() {
    // Make client id
    var client_id = -1;

    // Make WebSocket connection
    var ws = new WebSocket('ws://localhost:3000');

    // When connection is made
    ws.onopen = () => {
        console.log("Connected to server!");
    }

    $('form').submit(() => {
        msg = $('#input_message').val();
        var data = {
            type: "chat",
            player: client_id,
            text: msg
        };
        ws.send(JSON.stringify(data));
        $('#input_message').val('');
        return false;
    });

    var key_map = {37: false, 38: false, 39: false, 40: false};
    $(document).keydown(function(e) {
        if (e.keyCode in key_map) {
            key_map[e.keyCode] = true;
            var data = {type: "input", left: key_map[37], up: key_map[38], right: key_map[39], down: key_map[40]};
            ws.send(JSON.stringify(data));
        }
    }).keyup(function(e) {
        if (e.keyCode in key_map) {
            key_map[e.keyCode] = false;
        }
    });



    // Handle message passed from server
    ws.onmessage = (msg) => {
        var message = {type: "none"};
        try {
            message = JSON.parse(msg.data);
        } 
        catch(e){
            console.log('Invalid JSON: ', msg.data);
            return;
        }
        console.log(message)

        if (message.type == "chat"){
            var chatmsg = message.text;
            message.player++;
            $('#chat-history').append($('<li>').text("Player_" + message.player + ": " + chatmsg));
        } 
        else if (message.type == "position"){
            var position_x = message.position_x;
            var position_y = message.position_y;
            console.log(position_x);
            console.log(position_y);
        }
        else if (message.type == "disconnect"){
            var player_to_drop = message.player;
            //drop_from_game_objects(player_to_frop);
        }
        else if (message.type == "id"){
            client_id = message.player_id;
        }
    };

    // Close WebSocket connection before window resources + documents are unloaded
    window.addEventListener('beforeunload', () => {
        ws.close();
    });
});
