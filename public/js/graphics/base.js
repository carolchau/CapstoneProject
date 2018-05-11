// global constants
const WORLD_UNIT = 16;
const WORLD_SIZE = 4000;  // in world units (so actual world size in px is 4000*16)
const CHUNK_SIZE = 1600;  // in px
const GEN_IMG_SIZE = 2000;  // in px
const FPS = 1/24*1000;  // in millis

// expose game canvas globally
var canvas = null, ctx = null, canvas_width = 0, canvas_height = 0;

// globally cached sprites
var cached_assets = {};

let gen_key_map = {
	0: 'sand',
	1: 'water',
	2: 'snow',
	3: 'jungle',
	4: 'swamp',
	5: 'grass'
};

// Main game manager for the game (should only have one instance)
// Takes care of all updates and drawing
class GameManager {
// ctx (canvas context): the canvas context to draw on
// width (int): width of the canvas
// height (int): height of the canvas
// gen_key (dict): JSON of gen key
// biomes_dict (dict): dict of biome name: sprites pairs
// player (Player): active player
	constructor (ctx, width, height, gen_key, biomes_dict, player) {
		this._ctx = ctx;
		this._can_width = width;
		this._can_height = height;
		this._gen_key = gen_key;
		this._biomes = biomes_dict;
		this.player = player;

		// viewrect is the bounds of the canvas in the real world, so kind of like
		// a camera centered on the player
		this.viewrect_x = this.player.x - width/2;
		this.viewrect_y = this.player.y - height/2;
		this.viewrect_right = this.viewrect_x + this._can_width;
		this.viewrect_bot = this.viewrect_y + this._can_height;

		this._objects = {};
		this._chunks = {};
	}

	// Add or remove object from list of gameobjects
	add_object (obj) { this._objects[obj.id] = obj; }
	drop_object (id) { delete this._objects[id]; }

	update () {
		this.player.update();
		this.gen_around_player();

		// update all gameobjects
		let object_keys = Object.keys(this._objects);
		let num_of_chunks = object_keys.length;
		for (let i = 0; i < num_of_chunks; i++) {
			this._objects[object_keys[i]].update();
		}
	}

	draw () {
		// update viewrect to be around player's new position
		this.viewrect_x = this.player.x - this._can_width/2;
		this.viewrect_y = this.player.y - this._can_height/2;
		this.viewrect_right = this.viewrect_x + this._can_width;
		this.viewrect_bot = this.viewrect_y + this._can_height;

		// clearing and refilling background
		let object_keys = Object.keys(this._objects);
		let num_of_objects = object_keys.length;
		let filled_chunks = {};
		// this can be redrawn selectively only if active player doesn't move,
		// otherwise the background and all visible objects need to be shifted
		if (!this.player.moved) {
			for (let i = 0; i < num_of_objects; i++) {
				let obj = this._objects[object_keys[i]];
				// canvas coordinates at which to clear
				let clear_x = obj.last_x - this.viewrect_x, clear_y = obj.last_y - this.viewrect_y;
				// check if each animated object moved and is visible
				if (obj.moved && !(Math.abs(clear_x) > this._can_width || Math.abs(clear_y) > this._can_height)) {
					//clear rectangle only around moving object
					this._ctx.clearRect(clear_x, clear_y, obj.width, obj.height);

					// redraw 16x16 background blocks around the cleared rectangle
					let leftmost_block_x = obj.last_x - (obj.last_x%WORLD_UNIT), topmost_block_y = obj.last_y - (obj.last_y%WORLD_UNIT);
					let rightmost_block_x = (obj.last_x + obj.width) + (WORLD_UNIT - (obj.last_x + obj.width)%WORLD_UNIT);
					let bottommost_block_y = (obj.last_y + obj.height) + (WORLD_UNIT - (obj.last_y + obj.height)%WORLD_UNIT);

					for (let i = leftmost_block_x; i < rightmost_block_x; i+=WORLD_UNIT) {
						for (let j = topmost_block_y; j < bottommost_block_y; j+=WORLD_UNIT) {
							let genx = Math.floor(GEN_IMG_SIZE*(i/WORLD_UNIT)/WORLD_SIZE);
							let geny = Math.floor(GEN_IMG_SIZE*(j/WORLD_UNIT)/WORLD_SIZE);
							if (genx > GEN_IMG_SIZE || geny > GEN_IMG_SIZE) break;
							let gen_value = this._gen_key[genx][geny];
							this._biomes[gen_key_map[gen_value]].x = i;
							this._biomes[gen_key_map[gen_value]].y = j;
							this._biomes[gen_key_map[gen_value]].draw(this._ctx, this.viewrect_x, this.viewrect_y);
						}
					}
					// set the world chunk to filled, so it does not need to be redrawn
					let chunk_x_left = Math.floor(obj.x/CHUNK_SIZE), chunk_y_top = Math.floor(obj.y/CHUNK_SIZE);
					filled_chunks[chunk_x_left.toString() + ',' + chunk_y_top.toString()] = true;
				}
			}
		}

		// newly visible background drawing
		let x_left_chunk = Math.floor(this.viewrect_x/CHUNK_SIZE) - 1 , y_top_chunk = Math.floor(this.viewrect_y/CHUNK_SIZE) - 1;
		let x_right_chunk = Math.ceil((this.viewrect_right)/CHUNK_SIZE), y_bot_chunk = Math.ceil((this.viewrect_bot)/CHUNK_SIZE);
		let x_range = x_right_chunk - x_left_chunk, y_range = y_bot_chunk - y_top_chunk;
		for (let i = 0; i < x_range; i++) {
			for (let j = 0; j < y_range; j++) {
				let chunk_id_x = x_left_chunk + i, chunk_id_y = y_top_chunk + j;
				let chunk_id = chunk_id_x + ',' + chunk_id_y;
				if (this.player.stopped_moving || (!filled_chunks[chunk_id] && this.player.moved)) {
					this._chunks[chunk_id].draw(this._ctx, this.viewrect_x, this.viewrect_y);
				}
			}
		}

		// object drawing
		for (let i = 0; i < num_of_objects; i++) {
			this._objects[object_keys[i]].draw(this._ctx, this.viewrect_x, this.viewrect_y);
			this._objects[object_keys[i]].postdraw();
		}

		// draw player
		this.player.draw(this._ctx, this.viewrect_x, this.viewrect_y);
		this.player.postdraw();
	}

	main_loop () {
			this.update();
			var _this = this;
			requestAnimationFrame(function() {
				_this.draw();
			});
	}

	// Start main game loop after setting active player position to idle
	start () {
		this.player.play_anim('idle_s');
		var _this = this;
		setInterval(function() {_this.main_loop();}, FPS);
	}

	// Generate world chunks around player
	gen_around_player () {
		let x = this.player.x, y = this.player.y;
		// Find the closest chunks that cover the entire viewrect
		let x_left = x - this._can_width/2 - CHUNK_SIZE, y_top = y - this._can_height/2 - CHUNK_SIZE;
		let x_right = x + this._can_width/2 + CHUNK_SIZE, y_bot = y + this._can_height/2 + CHUNK_SIZE;

		let leftmost_chunk_x = x_left - (x_left%CHUNK_SIZE), topmost_chunk_y = y_top - (y_top%CHUNK_SIZE);

		let x_left_chunk = Math.floor(x_left/CHUNK_SIZE), y_top_chunk = Math.floor(y_top/CHUNK_SIZE);
		let x_right_chunk = Math.ceil(x_right/CHUNK_SIZE), y_bot_chunk = Math.ceil(y_bot/CHUNK_SIZE);
		let x_range = x_right_chunk - x_left_chunk, y_range = y_bot_chunk - y_top_chunk;
		for (let i = 0; i < x_range; i++) {
			for (let j = 0; j < y_range; j++) {
				let chunk_id_x = x_left_chunk + i, chunk_id_y = y_top_chunk + j;
				let chunk_id = chunk_id_x + ',' + chunk_id_y;
				let ch_x_left = leftmost_chunk_x + i*CHUNK_SIZE;
				let ch_y_top = topmost_chunk_y + j*CHUNK_SIZE;

				// if the chunk isn't generated yet, generate it
				if (this._chunks[chunk_id] == null) {
					let chunk = new WorldChunk(this._gen_key, this._biomes);
					chunk.gen(ch_x_left, ch_y_top);
					this._chunks[chunk_id] = chunk;
				}
			}
		}
	}
}

// Main asset manager for game (should only have one instance)
// Loads images
class AssetManager {
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
		};
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

// GameObject class
// Has object basic properites: id, sprite, and position
// Can be drawn to canvas
class GameObject {
	constructor (id) {
		this._id = id;
		this._sprites = {};
		this._x = 0, this._y = 0;
		this._width = 0, this._height = 0;

	}

	// Getters and setters
	get id () { return this._id; }
	set id (id) {this._id = id; }
	get x () {return this._x;}
	set x (x) {this._x = x;}
	get y () {return this._y;}
	set y (y) {this._y = y;}
	get width () {return this._width;}
	get height () {return this._height;}

	// AABB collision true/false
	is_visible (v_left, v_right, v_top, v_bot) {
		return (v_left < this._x_right && v_right > this._x_left &&
v_top < this._y_bot && v_bot > this._y_top);
	}
}


// Static game object, cannot move or change animation
class StaticObject extends GameObject {
// Load img for img_name. Only one image can be loaded for a static object
// return false if load fails, else return true
	load_sprite (img_name) {
		if (cached_assets[img_name] == null) return false;
		this._sprites['idle'] = [];
		this._sprites['idle'][0] = cached_assets[img_name];
		this._width = cached_assets[img_name].width;
		this._height = cached_assets[img_name].height;
		return true;
	}

	// Draw sprite at x,y position of object
	draw (ctx, ctx_left, ctx_top) {
		// offset position by viewrect, so drawn relative to viewrect
		ctx.drawImage(this._sprites['idle'][0], this._x - ctx_left, this._y - ctx_top);
	}
}


// Object supports various animations/position changes
class AnimatedObject extends GameObject {
	constructor (id) {
		super(id);
		this._sprite_change_time = null;
		this._current_sprite = [];  // tuple of (animation name, current frame number)
		this._last_x_pos = this._x;
		this._last_y_pos = this._y;
		this._anim = null;
		this._moved = false;
		this._stopped_moving = true;
	}

	// getters
	get last_x () { return this._last_x_pos; }
	get last_y () { return this._last_y_pos; }
	get moved () { return this._moved; }
	get stopped_moving () { return this._stopped_moving; }

	// check if object moved
	update () {
		let moved = this._moved;
		this._moved = (this._x - this._last_x_pos != 0 || this._y - this._last_y_pos != 0);
		this._stopped_moving = this._moved != moved;
	}

	// set last position to current
	postdraw () {
		this._last_x_pos = this._x;
		this._last_y_pos = this._y;
	}

	// Load all images in list. If image load fails, abort load but store already
	// loaded images. Next time list is passed, just load remaining.
	// return false if load fails, else return true
	// anim_name (str): name of animation
	// img_name (array): list of srite names for the animation
	// animation_length (int): length of animation in seconds
	load_animation (anim_name, img_names, animation_length) {
		let length = img_names.length;
		this._sprites[anim_name] = [];
		for (let i = this._sprites[anim_name].length; i < length; i++) {
			if (cached_assets[img_names[i]] == null) return false;
			this._sprites[anim_name].push(cached_assets[img_names[i]]);
			this._width = cached_assets[img_names[i]].width;
			this._height = cached_assets[img_names[i]].height;
		}
		// sprite change time in milliseconds
		this._sprite_change_time = (animation_length/length)*1000;
		return true;
	}

	// play animation with name anim_name
	// anim_name (str): animation name
	play_anim (anim_name) {
		clearInterval(this._anim);
		this._current_sprite[0] = anim_name;
		this._current_sprite[1] = 0;
		// if it is a multi-frame animation, set sprite change rate
		if (this._sprites[anim_name].length != 1) {
			this._anim = setInterval(() => {
				this._current_sprite[1] = ++this._current_sprite[1] % this._sprites[anim_name].length;
			}, this._sprite_change_time);
		}
	}

	draw (ctx, ctx_left, ctx_top) {
		ctx.drawImage(
			this._sprites[this._current_sprite[0]][this._current_sprite[1]],
			this._x - ctx_left, this._y - ctx_top);
	}
}


// Player is a special AnimatedObject which just has special animations
// depending on what direciton player is facing
class Player extends AnimatedObject {
	constructor (id) {
		super(id);
		this._idle = true;
	}

	// play different animations depending on movement direction
	update () {
		if (this._last_x_pos < this._x) {
			if (this._current_sprite[0] != 'walk_e') {
				this.play_anim('walk_e');
			}
			this._idle = false;
		}
		else if (this._last_x_pos > this._x) {
			if (this._current_sprite[0] != 'walk_w') {
				this.play_anim('walk_w');
			}
			this._idle = false;
		}
		else if (this._last_y_pos < this._y) {
			if (this._current_sprite[0] != 'walk_s') {
				this.play_anim('walk_s');
			}
			this._idle = false;
		}
		else if (this._last_y_pos > this._y) {
			if (this._current_sprite[0] != 'walk_n') {
				this.play_anim('walk_n');
			}
			this._idle = false;
		}

		// if no movement play idle animation depending on direction facing
		if (this._last_x_pos == this._x && this._last_y_pos == this._y && !this._idle) {
			if (this._current_sprite[0] == 'walk_n') {
				this.play_anim('idle_n');
				this._idle = true;
			}
			else if (this._current_sprite[0] == 'walk_s') {
				this.play_anim('idle_s');
				this._idle = true;
			}
			else if (this._current_sprite[0] == 'walk_w') {
				this.play_anim('idle_w');
				this._idle = true;
			}
			else if (this._current_sprite[0] == 'walk_e') {
				this.play_anim('idle_e');
				this._idle = true;
			}
		}
		super.update();
	}

	// make sure animation name is one of the following in if statement
	load_animation (anim_name, img_names, animation_length) {
		if (anim_name != 'idle_n' && anim_name != 'idle_s' &&
anim_name != 'idle_w' && anim_name != 'idle_e' &&
anim_name != 'walk_n' && anim_name != 'walk_s' &&
anim_name != 'walk_w' && anim_name != 'walk_e') return;
		super.load_animation(anim_name, img_names, animation_length);
	}
}


// Square background tile of defined size that is rendered in a single
// draw call to the game canvas to optimize performance
class WorldChunk {
	constructor (gen_key, biomes_dict) {
		this._gen_key = gen_key;
		this._biomes = biomes_dict;

		this._can = document.createElement('canvas');  // offscreen canvas
		this._can.width = CHUNK_SIZE;
		this._can.height = CHUNK_SIZE;
		this._ctx = this._can.getContext('2d');

		this._x_left = 0;
		this._x_right = 0;
		this._y_top = 0;
		this._y_bot = 0;

		this._genned = false;
	}

	// fill the tile from 16x16 biome blocks on the offscreen canvas (prerender)\
	// x_left (int): position of left boundary of tile
	// y_top (int): position of upper boundary of tile
	gen (x_left, y_top) {
		if (!this._genned) {
			this._x_left = x_left;
			this._y_top = y_top;
			this._x_right = x_left + CHUNK_SIZE;
			this._y_bot = y_top + CHUNK_SIZE;
			for (let i = x_left; i < this._x_right; i += WORLD_UNIT) {
				for (let j = y_top; j < this._y_bot; j += WORLD_UNIT) {
					let genx = Math.floor(GEN_IMG_SIZE*(i/WORLD_UNIT)/WORLD_SIZE);
					let geny = Math.floor(GEN_IMG_SIZE*(j/WORLD_UNIT)/WORLD_SIZE);
					if (genx > GEN_IMG_SIZE || geny > GEN_IMG_SIZE) break;
					let gen_value = this._gen_key[genx][geny];
					this._biomes[gen_key_map[gen_value]].x = i;
					this._biomes[gen_key_map[gen_value]].y = j;
					this._biomes[gen_key_map[gen_value]].draw(this._ctx, this._x_left, this._y_top);
				}
			}
			this._genned = true;
		}
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
