// global constants
const WORLD_UNIT = 16;
const WORLD_SIZE = 4000;  // in world units
const CHUNK_SIZE = 1600;  // in px
const GEN_IMG_SIZE = 500;  // in px
const FPS = 1/24*1000;  // in millis

var canvas = null, ctx = null, canvas_width = 0, canvas_height = 0;
let offscreen_canvas = null, offscreen_ctx = null;

// globally cached sprites and world chunks
var cached_assets = {};


class GameManager {
	constructor (ctx, width, height, gen_key, biomes_dict, player) {
		this._ctx = ctx;
		this._can_width = width;
		this._can_height = height;
		this._gen_key = gen_key;
		this._biomes = biomes_dict;
		this.player = player;

		this.viewrect_x = this.player.x - width/2;
		this.viewrect_y = this.player.y - height/2;

		this._objects = {};
		this._chunks = {};
	}

	add_object(obj) { this._objects[obj.id] = obj; }

    drop_object(id) {delete this._objects[id]}

	update () {
		this.player.update();
		this.gen_around_player();
		this.viewrect_x = this.player.x - this._can_width/2;
		this.viewrect_y = this.player.y - this._can_height/2;

		let object_keys = Object.keys(this._objects);
		let num_of_chunks = object_keys.length;
		for (let i = 0; i < num_of_chunks; i++) {
			this._objects[object_keys[i]].update();
			//console.log(this._objects[object_keys[i]].x, this._objects[object_keys[i]].y)
		}
	}

	draw () {
		this._ctx.clearRect(0,0,this._can_width,this._can_height);

		// background drawing
		let chunk_keys = Object.keys(this._chunks);
		let num_of_chunks = chunk_keys.length;
		for (let i = 0; i < num_of_chunks; i++) {
			if (this._chunks[chunk_keys[i]].is_visible(this.viewrect_x, this.viewrect_y,
																		 this.viewrext_x + this._can_width,
																		 this.viewrect_y + this._can_height)) {
				this._chunks[chunk_keys[i]].draw(this._ctx, this.viewrect_x, this.viewrect_y);
			}
		}

		// object drawing
		let object_keys = Object.keys(this._objects);
		let num_of_objects = object_keys.length;
		for (let i = 0; i < num_of_objects; i++) {
			this._objects[object_keys[i]].draw(this._ctx, this.viewrect_x, this.viewrect_y);
		}

		this.player.draw(this._ctx, this.viewrect_x, this.viewrect_y);
	}

	main_loop () {
			this.update();
			this.draw();
	}

	start () {
		this.player.play_anim('idle_s');
		var _this = this;
		setInterval(function() {_this.main_loop()}, FPS);
	}

	gen_around_player (start=false) {
		let x = this.player.x, y = this.player.y;
		let x_left = x - this._can_width/2 - CHUNK_SIZE, y_top = y - this._can_height/2 - CHUNK_SIZE;
		let x_right = x + this._can_width/2 + CHUNK_SIZE, y_bot = y + this._can_height/2 + CHUNK_SIZE;
		let x_left_chunk = Math.floor(x_left/CHUNK_SIZE), y_top_chunk = Math.floor(y_top/CHUNK_SIZE);
		let x_right_chunk = Math.ceil(x_right/CHUNK_SIZE), y_bot_chunk = Math.ceil(y_bot/CHUNK_SIZE);
		let x_range = x_right_chunk - x_left_chunk, y_range = y_bot_chunk - y_top_chunk;
		for (let i = 0; i < x_range; i++) {
			for (let j = 0; j < y_range; j++) {
				let chunk_id_x = x_left_chunk + i, chunk_id_y = y_top_chunk + j;
				let ch_x_left = x_left + i*CHUNK_SIZE;
				let ch_y_top = y_top + j*CHUNK_SIZE;

				if (this._chunks[chunk_id_x.toString() + ',' + chunk_id_y.toString()] == null) {
					let chunk = new WorldChunk(this._gen_key, this._biomes);
					console.log('new chunk:',ch_x_left, ch_y_top);
					chunk.gen(ch_x_left, ch_y_top);
					this._chunks[chunk_id_x.toString() + ',' + chunk_id_y.toString()] = chunk;
				}
			}
		}
	}
}


class AssetManager {
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

// GameObject class
// Has objec basic properites: id, sprite, and position
// Can be drawn to canvas
class GameObject {
	constructor (id) {
		this._id = id;
		this._sprites = {};
		this._x = 0, this._y = 0;
		this._x_vel = 0, this._y_vel = 0;
	}

	// Getters and setters
	get id () { return this._id; }
	set id (id) {this._id = id; }
	get x () {return this._x;}
	set x (x) {this._x = x;}
	get y () {return this._y;}
	set y (y) {this._y = y;}
	get x_vel () {return this._x_vel;}
	set x_vel (x_vel) {this._x_vel = x_vel;}
	get y_vel () {return this._y_vel;}
	set y_vel (y_vel) {this._y_vel = y_vel;}
}


class StaticObject extends GameObject {
	// Load img for img_name. Only one image can be loaded for a static object
	// return false if load fails, else return true
	load_sprite (img_name) {
		if (cached_assets[img_name] == null) return false;
		this._sprites['idle'] = [];
		this._sprites['idle'][0] = cached_assets[img_name];
		return true;
	}

	// Draw sprite at x,y position of object
	draw (ctx, ctx_left, ctx_top) {
		ctx.drawImage(this._sprites['idle'][0], this._x - ctx_left, this._y - ctx_top);
	}
}


class AnimatedObject extends GameObject {
	constructor (id) {
		super(id);
		this._sprite_change_time = null;
		this._current_sprite = [];  // tuple of animation name, current frame number
		this._last_x_pos = this._x;
		this._last_y_pos = this._y;
		this._anim = null;
	}

	get x_speed () { return this._x_speed; }
	get y_speed () { return this._y_speed; }
	set x_speed (x_speed) { this._x_speed = x_speed; }
	set y_speed (y_speed) { this._y_speed = y_speed; }

	update () {
	}

	// Load all images in list. If image load fails, abort load but store already
	// loaded images. Next time list is passed, just load remaining.
	// return false if load fails, else return true
	load_animation (anim_name, img_names, animation_length) {
		let length = img_names.length;
		this._sprites[anim_name] = [];
		for (let i = this._sprites[anim_name].length; i < length; i++) {
			if (cached_assets[img_names[i]] == null) {
				return false;
			}
			this._sprites[anim_name].push(cached_assets[img_names[i]]);
		}
		// sprite change time in milliseconds
		this._sprite_change_time = (animation_length/length)*1000;
		return true;
	}

	play_anim (anim_name) {
		clearInterval(this._anim);
		this._current_sprite[0] = anim_name;
		this._current_sprite[1] = 0;
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


class Player extends AnimatedObject {
	constructor (id) {
		super(id);
		this._idle = true;
	}

	update () {
		super.update();
		if (this._last_x_pos < this._x) {
			this.play_anim('walk_e');
			this._idle = false;
		}
		else if (this._last_x_pos > this._x) {
			this.play_anim('walk_w');
			this._idle = false;
		}
		else if (this._last_y_pos < this._y) {
			this.play_anim('walk_s');
			this._idle = false;
		}
		else if (this._last_y_pos > this._y) {
			this.play_anim('walk_n');
			this._idle = false;
		}

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
		this._last_x_pos = this._x;
		this._last_y_pos = this._y;
	}

	load_animation (anim_name, img_names, animation_length) {
		if (anim_name != 'idle_n' && anim_name != 'idle_s' &&
				anim_name != 'idle_w' && anim_name != 'idle_e' &&
				anim_name != 'walk_n' && anim_name != 'walk_s' &&
				anim_name != 'walk_w' && anim_name != 'walk_e') return;
		super.load_animation(anim_name, img_names, animation_length);
	}
}


class WorldChunk {
	constructor (gen_key, biomes_dict) {
		this._gen_key = gen_key;
		this._biomes = biomes_dict;

		this._can = document.createElement('canvas');
		this._can.width = CHUNK_SIZE;
		this._can.height = CHUNK_SIZE;
		this._ctx = this._can.getContext('2d');

		this._x_left = 0;
		this._x_right = 0;
		this._y_top = 0;
		this._y_bot = 0;

		this._genned = false;
	}

	gen (x_left, y_top) {
		if (!this._genned) {
			this._x_left = x_left;
			this._y_top = y_top;
			this._x_right = x_left + CHUNK_SIZE;
			this._y_bot = y_top + CHUNK_SIZE;
			for (let i = x_left; i < this._x_right; i += WORLD_UNIT) {
				for (let j = y_top; j < this._y_bot; j += WORLD_UNIT) {
					let genx = Math.floor((GEN_IMG_SIZE*Math.floor(i/16))/WORLD_SIZE);
					let geny = Math.floor((GEN_IMG_SIZE*Math.floor(j/16))/WORLD_SIZE);
					if (genx > GEN_IMG_SIZE || geny > GEN_IMG_SIZE) break;
					if (this._gen_key[genx][geny] == 0) {
						this._biomes['sand'].x = i;
						this._biomes['sand'].y = j;
						this._biomes['sand'].draw(this._ctx, this._x_left, this._y_top);
					}
					else if (this._gen_key[genx][geny] == 1) {
						this._biomes['water'].x = i;
						this._biomes['water'].y = j;
						this._biomes['water'].draw(this._ctx, this._x_left, this._y_top);
					}
					else if (this._gen_key[genx][geny] == 2) {
						this._biomes['snow'].x = i;
						this._biomes['snow'].y = j;
						this._biomes['snow'].draw(this._ctx, this._x_left, this._y_top);
					}
					else if (this._gen_key[genx][geny] == 3) {
						this._biomes['jungle'].x = i;
						this._biomes['jungle'].y = j;
						this._biomes['jungle'].draw(this._ctx, this._x_left, this._y_top);
					}
					else if (this._gen_key[genx][geny] == 4) {
						this._biomes['swamp'].x = i;
						this._biomes['swamp'].y = j;
						this._biomes['swamp'].draw(this._ctx, this._x_left, this._y_top);
					}
					else {
						this._biomes['grass'].x = i;
						this._biomes['grass'].y = j;
						this._biomes['grass'].draw(this._ctx, this._x_left, this._y_top);
					}
				}
			}
			this._genned = true;
		}
	}

	is_visible (left, right, top, bot) {
		return (left < this._x_right || right > this._x_left ||
						top < this._x_bot || bot > this._x_top);
	}

	draw (ctx, ctx_left, ctx_top) {
		ctx.drawImage(this._can, this._x_left - ctx_left, this._y_top - ctx_top);
	}
}


//document.addEventListener("DOMContentLoaded", function(event) {
//	canvas = document.getElementById('game');
//	canvas.width = window.innerWidth;
//	canvas.height = window.innerHeight;
//	ctx = canvas.getContext('2d');
//
//	asset_manager = new AssetManager();
//	img_list = ['img/Grass.png', 'img/Sand.png', 'img/Snow.png',
//							'img/Swamp.png', 'img/Jungle.png', 'img/Water.png'];
//	player_stand_n = ['img/Player/standS.png'];
//	player_stand_s = ['img/Player/standS.png'];
//	player_stand_w = ['img/Player/standW.png'];
//	player_stand_e = ['img/Player/standE.png'];
//	player_walk_n = ['img/Player/walk1N.png','img/Player/walk2N.png'];
//	player_walk_s = ['img/Player/walk1S.png','img/Player/walk2S.png'];
//	player_walk_w = ['img/Player/walk1W.png','img/Player/walk2W.png'];
//	player_walk_e = ['img/Player/walk1E.png','img/Player/walk2E.png'];
//	img_list = img_list.concat(player_stand_n, player_stand_s, player_stand_w,
//														 player_stand_e, player_walk_n, player_walk_s,
//														 player_walk_w, player_walk_e);
//	asset_manager.load_images(img_list, () => {
//
//		let biomes = {};
//		biomes['grass'] = new StaticObject(0);
//		biomes['grass'].load_sprite('img/Grass.png');
//		biomes['sand'] = new StaticObject(0);
//		biomes['sand'].load_sprite('img/Sand.png');
//		biomes['snow'] = new StaticObject(0);
//		biomes['snow'].load_sprite('img/Snow.png');
//		biomes['swamp'] = new StaticObject(0);
//		biomes['swamp'].load_sprite('img/Swamp.png');
//		biomes['jungle'] = new StaticObject(0);
//		biomes['jungle'].load_sprite('img/Jungle.png');
//		biomes['water'] = new StaticObject(0);
//		biomes['water'].load_sprite('img/Water.png');
//
//		player = new AnimatedObject('player');
//		player.load_animation('idle_n', player_stand_n, 0);
//		player.load_animation('idle_s', player_stand_s, 0);
//		player.load_animation('idle_w', player_stand_w, 0);
//		player.load_animation('idle_e', player_stand_e, 0);
//		player.load_animation('walk_n', player_walk_n, 5);
//		player.load_animation('walk_s', player_walk_s, 5);
//		player.load_animation('walk_w', player_walk_w, 5);
//		player.load_animation('walk_e', player_walk_e, 5);
//		player.x = 32000;
//		player.y = 32000;
//
//		$.getJSON("js/graphics/gen.json", function(gen_json) {
//			manager = new GameManager(ctx, canvas.width, canvas.height, gen_json, biomes, player);
//			manager.gen_around_player(start=true);
//		});
//	});
//});
