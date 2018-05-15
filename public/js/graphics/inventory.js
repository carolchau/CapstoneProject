import {cached_assets} from './constants.js';

export class GUIInventory {
	constructor(ctx, player_obj, grid_img, hat_img) {
		this.ctx = ctx;
		this.player = player_obj;
		this.grid_img = grid_img;
		this.hat_img = hat_img;
	}

	draw (ctx) {
		// Grid offset from origin
		let offset_x = 100;
		let offset_y = 100;

		// Draw inventory grid
		this.ctx.drawImage(cached_assets[this.grid_img], 0, 0, 160, 128, offset_x, offset_y, 160, 128);

		// Draw inventory items
		let inventory_length = this.player.inventory.length;

		for (let i = 0; i < inventory_length; ++i) {
			let hat = this.player.inventory[i];
			let hat_type = hat.type;
			let hat_sx = hat._sx;
			let hat_sy = hat._sy;
			let hat_w = hat.width;
			let hat_h = hat.height;

			let grid_w = (hat_type % 5) * 32 + offset_x;
			let grid_h = (Math.floor(hat_type / 5)) * 32 + offset_y;
			let dx = grid_w + Math.floor((32 - hat_w) / 2);
			let dy = grid_h + Math.floor((32 - hat_h) / 2);

			this.ctx.drawImage(cached_assets[this.hat_img], hat_sx, hat_sy, hat_w, hat_h, dx, dy, hat_w, hat_h);
		}
	}

}
