import {GameManager, AssetManager} from './graphics/managers.js';
import {Player} from './graphics/objects.js';

document.addEventListener("DOMContentLoaded", function(event) {
		let canvas = document.getElementById('game');
		let names_canvas = document.getElementById('names');
		let gui_canvas = document.getElementById('gui');
		canvas.width = window.innerWidth, canvas.height = window.innerHeight - $('#chat-history').height();
		names_canvas.width = window.innerWidth, names_canvas.height = window.innerHeight;
		gui_canvas.width = window.innerWidth, gui_canvas.height = window.innerHeight;
		let ctx = canvas.getContext('2d');
		let names_ctx = document.getElementById('names').getContext('2d');
		let gui_ctx = document.getElementById('gui').getContext('2d');
	  names_ctx.font = "10px Arial";
	  gui_ctx.font = "10px Arial";

	  let player = new Player('player');
		let manager = null;

	  // Make WebSocket connection
    let ws = new WebSocket('ws://' + window.location.hostname + ':' + window.location.port);
    ws.onopen = () => { console.log("Connected to server!"); }

		let asset_manager = new AssetManager();
		let img_list = [];
		let player_stand_n = ['img/Player/standN.png'];
		let player_stand_s = ['img/Player/standS.png'];
		let player_stand_w = ['img/Player/standW.png'];
		let player_stand_e = ['img/Player/standE.png'];
		let player_walk_n = ['img/Player/walk1N.png','img/Player/walk2N.png'];
		let player_walk_s = ['img/Player/walk1S.png','img/Player/walk2S.png'];
		let player_walk_w = ['img/Player/walk1W.png','img/Player/walk2W.png'];
		let player_walk_e = ['img/Player/walk1E.png','img/Player/walk2E.png'];
		img_list = img_list.concat(player_stand_n, player_stand_s, player_stand_w,
															 player_stand_e, player_walk_n, player_walk_s,
															 player_walk_w, player_walk_e);

		asset_manager.load_images(img_list, () => {
			player.load_animation('idle_n', player_stand_n, 0);
			player.load_animation('idle_s', player_stand_s, 0);
			player.load_animation('idle_w', player_stand_w, 0);
			player.load_animation('idle_e', player_stand_e, 0);
			player.load_animation('walk_n', player_walk_n, 1);
			player.load_animation('walk_s', player_walk_s, 1);
			player.load_animation('walk_w', player_walk_w, 1);
			player.load_animation('walk_e', player_walk_e, 1);
			player.x = 32000;
			player.y = 32000;
			let data = {
				type: "player info",
				data: {width: player.width,
							 height: player.height}
			};
			ws.send(JSON.stringify(data));

			manager = new GameManager(ctx, names_ctx, gui_ctx, canvas.width,
																canvas.height, player);
			manager.gen_around_player();
			manager.start();
		});


		// click on chat history to hide/unhide
    let chat_hidden = true;
    $('#chat-history').click(function() {
        if (!chat_hidden) {
            $(this).height('5%');
        } else {
            $(this).height('50%');
        }
        chat_hidden = !chat_hidden;
    });

		// chat input send
    $('form').submit((e) => {
        let msg = $('#input_message').val();
        let data = {
            type: "chat",
            data: {player: player.id,
                   text: msg}
        };
        ws.send(JSON.stringify(data));
        $('#input_message').val('');
        return false;
    });

		// player movement send
    let key_map = {
        37: false,
        38: false,
        39: false,
        40: false
    };
    $(document).keydown(function(e) {
        if (e.keyCode in key_map) {
            key_map[e.keyCode] = true;
            let data = {
                type: "input",
                data:{left: key_map[37],
                      up: key_map[38],
                      right: key_map[39],
                      down: key_map[40]}
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
        let message = {
            type: "none"
        };
        try {
            message = JSON.parse(msg.data);
        } catch (e) {
            console.log('Invalid JSON: ', msg.data);
            return;
        }

        if (message.type == "chat") {
            let chatmsg = message.data.text;
            $('#chat-history').append($('<li>').text(message.data.player + ": " + chatmsg));
        } else if (message.type == "disconnect") {
            let player_to_drop = message.data.player;
						console.log(player_to_drop)
            manager.drop_object('player_'+player_to_drop);
        }
			  else if (message.type == "world_data") {
            if (manager != null) {
                let player_keys = Object.keys(message.data);
                let num_of_players = player_keys.length;
                for (let i = 0; i < num_of_players; i++) {
                    let id = 'player_' + player_keys[i]
										let int_id = parseInt(player_keys[i])
                    if (id == player.id) {
                        player.x = message.data[int_id].x_position;
                        player.y = message.data[int_id].y_position;
                    } else {
                        if (manager._objects[id] == null) {
                            let new_player = new Player(id);
                            new_player.load_animation('idle_n', player_stand_n, 0);
                            new_player.load_animation('idle_s', player_stand_s, 0);
                            new_player.load_animation('idle_w', player_stand_w, 0);
                            new_player.load_animation('idle_e', player_stand_e, 0);
                            new_player.load_animation('walk_n', player_walk_n, 1);
                            new_player.load_animation('walk_s', player_walk_s, 1);
                            new_player.load_animation('walk_w', player_walk_w, 1);
                            new_player.load_animation('walk_e', player_walk_e, 1);
                            new_player.x = message.data[int_id].x_position;
                            new_player.y = message.data[int_id].y_position;
                            manager.add_object(new_player);
                        } else {
                            manager._objects[id].x = message.data[int_id].x_position;
                            manager._objects[id].y = message.data[int_id].y_position;
                        }
                    }
                }
            }
        } else if (message.type == "id") {
            player.id = 'player_' + message.data.player_id;
        }
    };

    // Close WebSocket connection before window resources + documents are unloaded
    window.addEventListener('beforeunload', () => {
        ws.close();
    });
});
