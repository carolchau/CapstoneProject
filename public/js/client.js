import {GameManager, AssetManager} from './graphics/managers.js';
import {StaticObject, Player} from './graphics/objects.js';
import {cached_assets} from './graphics/constants.js';
import {GUIInventory} from './graphics/inventory.js';

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
		let inventory_img = 'img/Inventory.png';
		let img_list = [spritesheet, inventory_img];

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
				hat.load_sprite(spritesheet[0], hat_data[i][4], hat_data[i][5], hat_data[i][2], hat_data[i][3]);
				hat.x = hat_data[i][0];
				hat.y = hat_data[i][1];
				hat.type = hat_data[i][6];
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

		// Player display Inventory (i)
		let isInventoryOn = false;
		$(document).keydown(function(e) {
			if (e.keyCode === 73) {
				if (!isInventoryOn) {
					let inventory = new GUIInventory(gui_ctx, player, inventory_img, spritesheet);
					inventory.draw();
					isInventoryOn = !isInventoryOn;
				} else {
					gui_ctx.clearRect(0, 0, gui_canvas.width, gui_canvas.height);
					isInventoryOn = !isInventoryOn;
				}
			}
		});

		gui_canvas.addEventListener('click', (e) => {
			let x = e.clientX - gui_canvas.offsetLeft;
			let y = e.clientY - gui_canvas.offsetTop;

			let offset_x = 100;
			let offset_y = 100;

			if (isInventoryOn) {
				if (offset_x <= x && x < offset_x + (32*5)) {
					let grid_num = -1;

					// Figure out which grid
					if (offset_y <= y && y < offset_y + (32*1)) {
						grid_num = Math.floor((x - offset_x)/32);
					}	else if (offset_y + (32*1) <= y && y < offset_y + (32*2)) {
						grid_num = Math.floor((x - offset_x)/32) + (5 * 1);
					}	else if (offset_y + (32*2) <= y && y < offset_y + (32*3)) {
						grid_num = Math.floor((x - offset_x)/32) + (5 * 2);
					}	else if (offset_y + (32*3) <= y && y < offset_y + (32*4)) {
						grid_num = Math.floor((x - offset_x)/32) + (5 * 3);
					}

					// Draw hat if hat is in inventory
					let inventory_length = player.inventory.length;
					for (let i = 0; i < inventory_length; ++i) {
						if (player.inventory[i].type === grid_num) {
							player.hat = player.inventory[i];
							break;
						}
					}

				}
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
													let hat = manager._objects['hat_'+hat_id];
													player.inventory.push(hat);
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
