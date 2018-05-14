// All types of gameobjects
import {WORLD_UNIT, WORLD_SIZE, CHUNK_SIZE, FPS, cached_assets} from './constants.js';

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
	get id () {return this._id;}
	set id (id) {this._id = id;}
	get x () {return this._x;}
	set x (x) {this._x = x;}
	get y () {return this._y;}
	set y (y) {this._y = y;}
	get width () {return this._width;}
	get height () {return this._height;}

	// AABB collision true/false
	is_visible (v_left, v_right, v_top, v_bot) {
		return (v_left < this._x + this._width && v_right > this._x &&
						v_top < this._y + this._height && v_bot > this._y);
	}
}


// Static game object, cannot move or change animation
export class StaticObject extends GameObject {
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
export class AnimatedObject extends GameObject {
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
		this._moved = (this._x != this._last_x_pos || this._y != this._last_y_pos);
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
export class Player extends AnimatedObject {
	constructor (id) {
		super(id);
		this._idle = true;
		this._type = 'player';
	}

	get type () { return this._type; }

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
