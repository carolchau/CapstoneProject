import {GameManager, AssetManager} from './graphics/managers.js';
import {StaticObject, Player} from './graphics/objects.js';

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
		let hat_data = [];

	  // Make WebSocket connection
    let ws = new WebSocket('ws://' + window.location.hostname + ':' + window.location.port);
    ws.onopen = () => { console.log("Connected to server!"); }

		let asset_manager = new AssetManager();
		let spritesheet = ['img/sheet.png'];
		let img_list = [spritesheet];

		asset_manager.load_images(img_list, () => {
			player.load_animation('idle_n', spritesheet, [[0,0]], 14, 21, 0);
			player.load_animation('idle_s', spritesheet, [[14,0]], 14, 21, 0);
			player.load_animation('idle_w', spritesheet, [[28,0]], 14, 21, 0);
			player.load_animation('idle_e', spritesheet, [[42,0]], 14, 21, 0);
			player.load_animation('walk_n', spritesheet, [[0,21],[14,21]], 14, 21, 1);
			player.load_animation('walk_s', spritesheet, [[28,21],[42,21]], 14, 21, 1);
			player.load_animation('walk_w', spritesheet, [[56,21],[70,21]], 14, 21, 1);
			player.load_animation('walk_e', spritesheet, [[84,21],[98,21]], 14, 21, 1);
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
			let num_of_hats = hat_data.length;
			for (let i = 0; i < num_of_hats; i++) {
				let hat = new StaticObject('hat_'+i);
				hat.load_sprite(spritesheet[0], 76, 42, 13, 14);
				manager.add_object(hat);
			}
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
												let num_of_collected = message.data[int_id].collected.length;
												for (let j = 0; j < num_of_collected; j++) {
													let hat_id = message.data[int_id].collected[j];
													player.inventory.push(manager._objects['hat_'+hat_id].type);
													manager.drop_object('hat_'+hat_id);
												}
                    } else {
                        if (manager._objects[id] == null) {
                            let new_player = new Player(id);
														new_player.load_animation('idle_n', spritesheet, [[0,0]], 14, 21, 0);
														new_player.load_animation('idle_s', spritesheet, [[14,0]], 14, 21, 0);
														new_player.load_animation('idle_w', spritesheet, [[28,0]], 14, 21, 0);
														new_player.load_animation('idle_e', spritesheet, [[42,0]], 14, 21, 0);
														new_player.load_animation('walk_n', spritesheet, [[0,21],[14,21]], 14, 21, 1);
														new_player.load_animation('walk_s', spritesheet, [[28,21],[42,21]], 14, 21, 1);
														new_player.load_animation('walk_w', spritesheet, [[56,21],[70,21]], 14, 21, 1);
														new_player.load_animation('walk_e', spritesheet, [[84,21],[98,21]], 14, 21, 1);
                            new_player.x = message.data[int_id].x_position;
                            new_player.y = message.data[int_id].y_position;
                            manager.add_object(new_player);
                        } else {
                            manager._objects[id].x = message.data[int_id].x_position;
                            manager._objects[id].y = message.data[int_id].y_position;
                        }
												let num_of_collected = message.data[int_id].collected.length;
												for (let j = 0; j < num_of_collected; j++) {
													let hat_id = message.data[int_id].collected[j];
													manager.drop_object('hat_'+hat_id);
												}
                    }
                }
            }
        } else if (message.type == "id") {
            player.id = 'player_' + message.data.player_id;
        }
				else if (message.type == 'hat_data') {
					hat_data = message.data;
				}
    };

    // Close WebSocket connection before window resources + documents are unloaded
    window.addEventListener('beforeunload', () => {
        ws.close();
    });
});
