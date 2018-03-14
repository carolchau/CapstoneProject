// globally cached sprites
var cached_assets = {};


// GameObject class
// Has objec basic properites: id, sprite, and position
// Can be drawn to canvas
// Will be extended with other classes...
class GameObject {
	constructor (id, context, img_name, x, y) {
		this._id = id;
		this._context = context;
		this._sprite = null
		this.load_asset(img_name, this.draw);

		this._x = 0, this._y = 0;
	}

	// Getters and setters
	get x () {return this._x;}
	set x (x) {this._x = x;}
	get y () {return this._y;}
	set y (y) {this._y = y;}

	// Loads image either from cache or fresh and draws it
	load_asset (name) {
		if (cached_assets[name] == null) {
			this._sprite = new Image();
			this._sprite.onload = () => this.draw();
			this._sprite.src = name;
			cached_assets[name] = this._sprite;
		}
		else {
			this._sprite = cached_assets[name];
			this.draw();
		}
	}

	// Draw sprite at x,y position of object
	draw () {
		this._context.drawImage(this._sprite, this._x, this._y);
	}
}

document.addEventListener("DOMContentLoaded", function(event) {
	let canvas = document.getElementById('game');
	canvas.width = window.innerWidth;
	canvas.height = window.innerHeight;
	ctx = canvas.getContext('2d');

	let square = new GameObject(0, ctx, 'img/square.png', 50, 50);
});
