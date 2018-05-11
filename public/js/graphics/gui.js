export class GUIText {
	constructor(id, ctx, text, dynamic) {
		this._id = id;
		this._text = text;
		this._dynamic = dynamic;

		this._text_width = ctx.measureText(text).width;
		this._text_height = ctx.measureText(text).height;
	}

	draw (ctx, x, y) {
		ctx.fillText(this._text, x, y);
	}
}

