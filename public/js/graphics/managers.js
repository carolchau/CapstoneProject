// All game managers

import {WORLD_UNIT, WORLD_SIZE, CHUNK_SIZE, FPS, cached_assets} from './constants.js';
import {StaticObject, AnimatedObject, Player} from './objects.js';


// Main game manager for the game (should only have one instance)
// Takes care of all updates and drawing
export class GameManager {
	// game_ctx (canvas context): the canvas context to draw game elements on
	// names_ctx (canvas context): the canvas context to draw player names on
	// gui_ctx (canvas context): the canvas context to draw gui elements on
	// width (int): width of the canvas
	// height (int): height of the canvas
	// player (Player): active player
	constructor (game_ctx, names_ctx, gui_ctx, width, height, player) {
		this._ctx = game_ctx;
		this._names_ctx = names_ctx;
		this._gui_ctx = gui_ctx;
		this._can_width = width;
		this._can_height = height;
		this.player = player;

		// viewrect is the bounds of the canvas in the real world, so kind of like
		// a camera centered on the player
		this.viewrect_x = this.player.x - width/2;
		this.viewrect_y = this.player.y - height/2;
		this.viewrect_right = this.viewrect_x + this._can_width;
		this.viewrect_bot = this.viewrect_y + this._can_height;

		this._moving_objects = {};
		this._static_objects = {};
		this._objects_hash = {};
		this._chunks = {};
	}

	add_moving_object (obj) { this._moving_objects[obj.id] = obj; }
	drop_moving_object (id) { delete this._moving_objects[id]; }

	// Add or remove object from list of gameobjects
	add_static_object (obj) {
		this._static_objects[obj.id] = obj;
		let hx = Math.floor(obj.x/CHUNK_SIZE), hy = Math.floor(obj.y/CHUNK_SIZE);
		if (this._objects_hash[[hx,hy]] == undefined) {
			this._objects_hash[[hx,hy]] = [];
		}
		this._objects_hash[[hx,hy]].push(obj.id);
	}
  drop_static_object (id) {
		let hx = Math.floor(this._static_objects[id].x/CHUNK_SIZE);
		let hy = Math.floor(this._static_objects[id].y/CHUNK_SIZE);
		let bucket = this._objects_hash[[hx,hy]];
		bucket.splice(bucket.indexOf(id), 1);
		delete this._static_objects[id];
	}

	update () {
		this.player.update();
		this.gen_around_player();

		// update all animated gameobjects
		let object_keys = Object.keys(this._moving_objects);
		let num_of_objects = object_keys.length;
		for (let i = 0; i < num_of_objects; i++) {
			this._moving_objects[object_keys[i]].update();
		}
	}

	draw () {
		// update viewrect to be around player's new position
		this.viewrect_x = this.player.x - this._can_width/2;
		this.viewrect_y = this.player.y - this._can_height/2;
		this.viewrect_right = this.viewrect_x + this._can_width;
		this.viewrect_bot = this.viewrect_y + this._can_height;
		if (this.viewrect_x < 0) this.viewrect_x = 0;
		if (this.viewrect_right > WORLD_SIZE*WORLD_UNIT)
			this.viewrect_x = WORLD_SIZE*WORLD_UNIT - this._can_width;
		if (this.viewrect_y < 0) this.viewrect_y = 0;
		if (this.viewrect_bot > WORLD_SIZE*WORLD_UNIT)
			this.viewrect_y = WORLD_SIZE*WORLD_UNIT - this._can_height;

		// clearing and refilling background
		let object_keys = Object.keys(this._moving_objects);
		let num_of_objects = object_keys.length;
		let filled_chunks = {}
		// this can be redrawn selectively only if active player doesn't move,
		// otherwise the background and all visible objects need to be shifted
		if (!this.player.moved) {
			for (let i = 0; i < num_of_objects; i++) {
				let obj = this._moving_objects[object_keys[i]];
				let x_left = obj.last_x, x_right = obj.last_x + obj.width
				let y_top = obj.last_y, y_bot = obj.last_y + obj.height;
				let clear_x = x_left - this.viewrect_x, clear_y = y_top - this.viewrect_y;
				// check if each animated object moved and is visible
				if ((obj.moved || obj.stopped_moving) && !(Math.abs(clear_x) > this._can_width || Math.abs(clear_y) > this._can_height)) {
					//clear rectangle only around moving object
					let chunk_x_ids = [Math.floor(x_left/CHUNK_SIZE), Math.floor(x_right/CHUNK_SIZE)];
					let chunk_y_ids = [Math.floor(y_top/CHUNK_SIZE), Math.floor(y_bot/CHUNK_SIZE)];
					for (let x_id = 0; x_id < 2; x_id++) {
						for (let y_id = 0; y_id < 2; y_id++) {
							let chunk_id = chunk_x_ids[x_id].toString() + ',' + chunk_y_ids[y_id].toString();
							let chunk_x = (x_left - this._chunks[chunk_id]._x_left), chunk_y = y_top - this._chunks[chunk_id]._y_top;
							chunk_x = (chunk_x < 0) ? 0 : chunk_x;
							chunk_y = (chunk_y < 0) ? 0 : chunk_y;
							this._ctx.drawImage(this._chunks[chunk_id]._can, chunk_x, chunk_y,
																	obj.width, obj.height, clear_x, clear_y,
																	obj.width, obj.height);
							// set the world chunk to filled, so it does not need to be redrawn
							filled_chunks[chunk_id] = true;
						}
					}
				}
			}
		}

		// newly visible background drawing
		let x_left_chunk = Math.floor(this.viewrect_x/CHUNK_SIZE), y_top_chunk = Math.floor(this.viewrect_y/CHUNK_SIZE);
		let x_right_chunk = Math.ceil((this.viewrect_right)/CHUNK_SIZE), y_bot_chunk = Math.ceil((this.viewrect_bot)/CHUNK_SIZE);
		let x_range = x_right_chunk - x_left_chunk, y_range = y_bot_chunk - y_top_chunk;
		for (let i = 0; i < x_range; i++) {
			for (let j = 0; j < y_range; j++) {
				let chunk_id_x = x_left_chunk + i, chunk_id_y = y_top_chunk + j;
				if (chunk_id_x >= 0 && chunk_id_x < WORLD_SIZE*WORLD_UNIT/CHUNK_SIZE &&
					  chunk_id_y >= 0 && chunk_id_y < WORLD_SIZE*WORLD_UNIT/CHUNK_SIZE) {
					let chunk_id = chunk_id_x + ',' + chunk_id_y;
					if (this.player.stopped_moving || (!filled_chunks[chunk_id] && this.player.moved)) {
						this._chunks[chunk_id].draw(this._ctx, this.viewrect_x, this.viewrect_y);
					}

					// draw all static items in this chunk
					let visible_static = this._objects_hash[[chunk_id_x,chunk_id_y]];
					if (visible_static != undefined) {
						let num_static = visible_static.length;
						for (let i = 0; i < num_static; i++) {
							let obj = this._static_objects[visible_static[i]];
							obj.draw(this._ctx, this.viewrect_x, this.viewrect_y);
						}
					}
				}
			}
		}

		// moving object drawing
		this._names_ctx.clearRect(0,0,this._can_width, this._can_height);
		for (let i = 0; i < num_of_objects; i++) {
			let obj = this._moving_objects[object_keys[i]];
			if (obj.is_visible(this.viewrect_x, this.viewrect_right, this.viewrect_y,
												 this.viewrect_bot)) {
				obj.draw(this._ctx, this.viewrect_x, this.viewrect_y);
				if (obj.type == 'player') {
					this._names_ctx.fillText(obj.id, obj.x - obj.width/2 - this.viewrect_x,
																	 obj.y - 10 - this.viewrect_y);
				}
			}
			if (obj.type == 'player') {
				this._moving_objects[object_keys[i]].postdraw();
			}
		}

		// draw player
		this.player.draw(this._ctx, this.viewrect_x, this.viewrect_y);
		this._names_ctx.fillText(this.player.id,
														 this.player.x - this.player.width/2 - this.viewrect_x,
														 this.player.y - 10 - this.viewrect_y);
		this.player.postdraw();
	}

	main_loop() {
		this.update();
		this.draw();
		setTimeout(()=>requestAnimationFrame(this.main_loop.bind(this)), FPS);
	}

	// Start main game loop after setting active player position to idle
	start () {
		this.player.play_anim('idle_s');
		this.gen_around_player();
		setTimeout(()=>requestAnimationFrame(this.main_loop.bind(this)), 1000);
	}

	// Generate world chunks around player
	gen_around_player () {
		let x = this.player.x, y = this.player.y;
		// Find the closest chunks that cover the entire viewrect
		let x_left = x - this._can_width/2 - CHUNK_SIZE, y_top = y - this._can_height/2 - CHUNK_SIZE;
		let x_right = x + this._can_width/2 + CHUNK_SIZE, y_bot = y + this._can_height/2 + CHUNK_SIZE;

		let x_left_chunk = Math.floor(x_left/CHUNK_SIZE), y_top_chunk = Math.floor(y_top/CHUNK_SIZE);
		let x_right_chunk = Math.ceil(x_right/CHUNK_SIZE), y_bot_chunk = Math.ceil(y_bot/CHUNK_SIZE);
		let x_range = x_right_chunk - x_left_chunk, y_range = y_bot_chunk - y_top_chunk;
		for (let i = 0; i < x_range; i++) {
			for (let j = 0; j < y_range; j++) {
				let chunk_id_x = x_left_chunk + i, chunk_id_y = y_top_chunk + j;
				if (chunk_id_x >= 0 && chunk_id_x < WORLD_SIZE*WORLD_UNIT/CHUNK_SIZE &&
					  chunk_id_y >= 0 && chunk_id_y < WORLD_SIZE*WORLD_UNIT/CHUNK_SIZE) {
					let chunk_id = chunk_id_x + ',' + chunk_id_y;
					let ch_x_left = x_left_chunk*CHUNK_SIZE + i*CHUNK_SIZE;
					let ch_y_top = y_top_chunk*CHUNK_SIZE + j*CHUNK_SIZE;

					// if the chunk isn't generated yet, generate it
					if (this._chunks[chunk_id] == null) {
						let chunk = new WorldChunk(ch_x_left, ch_y_top);
						chunk.gen(chunk_id);
						this._chunks[chunk_id] = chunk;
					}
				}
			}
		}
	}
}


// Main asset manager for game (should only have one instance)
// Loads images
export class AssetManager {
	// img_list (array): list of image names to load
	// postload (function): callback function after all images are loaded
	load_images(img_list, postload) {
		let num_of_images = img_list.length;
		let batch = {
			count: 0,
			total: num_of_images,
			callback: postload
		};
		let onload_image = () => {
			batch.count++;
			if (batch.count == batch.total) batch.callback();
		}
		for (let i = 0; i < num_of_images; i++) {
			let name = img_list[i];
			if (cached_assets[name] == null) {
				let sprite = new Image();
				sprite.onload = onload_image;
				sprite.src = name;
				cached_assets[name] = sprite;
			}
			else {
				onload_image();
			}
		}
	}
}


// Square background tile of defined size that is rendered in a single
// draw call to the game canvas to optimize performance
class WorldChunk {
	constructor (x_left, y_top) {
		this._can = document.createElement('canvas');  // offscreen canvas
		this._can.width = CHUNK_SIZE;
		this._can.height = CHUNK_SIZE;
		this._ctx = this._can.getContext('2d');

		this._x_left = x_left;
		this._y_top = y_top;
		this._x_right = x_left + CHUNK_SIZE;
		this._y_bot = y_top + CHUNK_SIZE;
	}

	// fill the tile from 16x16 biome blocks on the offscreen canvas (prerender)
	// x_left (int): position of left boundary of tile
	// y_top (int): position of upper boundary of tile
	gen (id) {
		let img = new Image();
		var _this = this;
		img.onload = () => {
			_this._ctx.drawImage(img, 0, 0);
		};
		img.src = window.location.origin + '/img/chunks/' + id + '.jpg';
	}

	// AABB collision detection
	is_visible (v_left, v_right, v_top, v_bot) {
		return (v_left < this._x_right && v_right > this._x_left &&
						v_top < this._y_bot && v_bot > this._y_top);
	}

	draw (ctx, ctx_left, ctx_top) {
		ctx.drawImage(this._can, this._x_left - ctx_left, this._y_top - ctx_top);
	}
}
