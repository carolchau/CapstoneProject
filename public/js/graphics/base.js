class GameObject {
	contructor (id, context, img_name, x, y) {
		this._id = id;
		this._context = context;
		this._sprite = Image();
		this._sprite.src = img_name;

		this._x = 0, this._y = 0;
	}

	get x () {return this._x;}
	set x (x) {this._x = x;}
	get y () {return this._y;}
	set y (y) {this._y = y;}

	draw () {
		context.drawImage(this._sprite, this._x, this._y);
	}
}
