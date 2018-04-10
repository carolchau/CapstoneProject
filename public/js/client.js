document.addEventListener("DOMContentLoaded", function(event) {
    canvas = document.getElementById('game');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    ctx = canvas.getContext('2d');

    player = new Player('player');
    manager = null;

    asset_manager = new AssetManager();
    img_list = ['img/Grass.png', 'img/Sand.png', 'img/Snow.png',
        'img/Swamp.png', 'img/Jungle.png', 'img/Water.png'
    ];
    player_stand_n = ['img/Player/standN.png'];
    player_stand_s = ['img/Player/standS.png'];
    player_stand_w = ['img/Player/standW.png'];
    player_stand_e = ['img/Player/standE.png'];
    player_walk_n = ['img/Player/walk1N.png', 'img/Player/walk2N.png'];
    player_walk_s = ['img/Player/walk1S.png', 'img/Player/walk2S.png'];
    player_walk_w = ['img/Player/walk1W.png', 'img/Player/walk2W.png'];
    player_walk_e = ['img/Player/walk1E.png', 'img/Player/walk2E.png'];
    img_list = img_list.concat(player_stand_n, player_stand_s, player_stand_w,
        player_stand_e, player_walk_n, player_walk_s,
        player_walk_w, player_walk_e);

    asset_manager.load_images(img_list, () => {
        let biomes = {};
        biomes['grass'] = new StaticObject(0);
        biomes['grass'].load_sprite('img/Grass.png');
        biomes['sand'] = new StaticObject(0);
        biomes['sand'].load_sprite('img/Sand.png');
        biomes['snow'] = new StaticObject(0);
        biomes['snow'].load_sprite('img/Snow.png');
        biomes['swamp'] = new StaticObject(0);
        biomes['swamp'].load_sprite('img/Swamp.png');
        biomes['jungle'] = new StaticObject(0);
        biomes['jungle'].load_sprite('img/Jungle.png');
        biomes['water'] = new StaticObject(0);
        biomes['water'].load_sprite('img/Water.png');

        player.load_animation('idle_n', player_stand_n, 0);
        player.load_animation('idle_s', player_stand_s, 0);
        player.load_animation('idle_w', player_stand_w, 0);
        player.load_animation('idle_e', player_stand_e, 0);
        player.load_animation('walk_n', player_walk_n, 5);
        player.load_animation('walk_s', player_walk_s, 5);
        player.load_animation('walk_w', player_walk_w, 5);
        player.load_animation('walk_e', player_walk_e, 5);
        player.x = 32000;
        player.y = 32000;

        $.getJSON("js/graphics/gen.json", function(gen_json) {
            manager = new GameManager(ctx, canvas.width, canvas.height, gen_json, biomes, player);
            manager.gen_around_player(start = true);
            manager.start();
        });
    });

    // Make client id
    var client_id = -1;

    // Make WebSocket connection
    var ws = new WebSocket('ws://127.0.0.1:3000');

    // When connection is made
    ws.onopen = () => {
        console.log("Connected to server!");
    }

    let chat_hidden = true;
    $('#chat-history').click(function() {
        if (!chat_hidden) {
            $(this).height('5%');
        } else {
            $(this).height('50%');
        }
        chat_hidden = !chat_hidden;
    });

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

    var key_map = {
        37: false,
        38: false,
        39: false,
        40: false
    };
    $(document).keydown(function(e) {
        if (e.keyCode in key_map) {
            key_map[e.keyCode] = true;
            var data = {
                type: "input",
                left: key_map[37],
                up: key_map[38],
                right: key_map[39],
                down: key_map[40]
            };
            ws.send(JSON.stringify(data));
        }
    }).keyup(function(e) {
        if (e.keyCode in key_map) {
            key_map[e.keyCode] = false;
        }
    });



    // Handle message passed from server
    ws.onmessage = (msg) => {
        var message = {
            type: "none"
        };
        try {
            message = JSON.parse(msg.data);
        } catch (e) {
            console.log('Invalid JSON: ', msg.data);
            return;
        }

        if (message.type == "chat") {
            var chatmsg = message.text;
            message.player++;
            $('#chat-history').append($('<li>').text("Player_" + message.player + ": " + chatmsg));
        } else if (message.type == "disconnect") {
            var player_to_drop = message.player;
            manager.drop_object(player_to_drop);
        } else if (message.type == "world_data") {
            if (manager != null) {
                player_keys = Object.keys(message);
                num_of_players = player_keys.length;
                for (let i = 0; i < num_of_players; i++) {
                    let id = 'player_' + player_keys[i]
                    if (player_keys[i] == 'type') continue;
                    if (player_keys[i] == client_id) {
                        player.x = message[client_id].x_position;
                        player.y = message[client_id].y_position;
                    } else {
                        if (manager._objects[id] == null) {
                            let new_player = new Player(id);
                            new_player.load_animation('idle_n', player_stand_n, 0);
                            new_player.load_animation('idle_s', player_stand_s, 0);
                            new_player.load_animation('idle_w', player_stand_w, 0);
                            new_player.load_animation('idle_e', player_stand_e, 0);
                            new_player.load_animation('walk_n', player_walk_n, 5);
                            new_player.load_animation('walk_s', player_walk_s, 5);
                            new_player.load_animation('walk_w', player_walk_w, 5);
                            new_player.load_animation('walk_e', player_walk_e, 5);
                            new_player.x = message[player_keys[i]].x_position;
                            new_player.y = message[player_keys[i]].y_position;
                            manager.add_object(new_player);
                        } else {
                            manager._objects[id].x = message[player_keys[i]].x_position;
                            manager._objects[id].y = message[player_keys[i]].y_position;
                        }
                    }
                }
            }
        } else if (message.type == "id") {
            client_id = message.player_id;
            player.id = 'player_' + client_id;
        }
    };

    // Close WebSocket connection before window resources + documents are unloaded
    window.addEventListener('beforeunload', () => {
        ws.close();
    });
});
