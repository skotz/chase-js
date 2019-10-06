/* 
 * Chase (the game)
 * Scott Clayton (c) 2019
 */

// Settings
var settings = {
	/* Hex */
	hexSpace: 5,
	hexWidth: 70,
	hexHeight: function () {
		return (2 * this.hexWidth) / Math.sqrt(3);
	},
	rowOffset: function () {
		return this.hexHeight() + (3 * this.hexSpace - this.hexWidth) / (2 * Math.sqrt(3));
	},
	/* Colors */
	colorEmpty: 0x777777,
	colorRed: 0xFF3333,
	colorRedSelected: 0xAA0000,
	colorBlue: 0x4499FF,
	colorBlueSelected: 0x1166AA,
	colorPossibleMove: 0x773399,
	hexTexture: function (points, color, drawOutline, outlinePoints, outlineColor) {
		const graphics = new PIXI.Graphics();
		graphics.lineStyle(0);
		if (drawOutline) {
			graphics.beginFill(outlineColor);
			graphics.drawPolygon(outlinePoints);
		}
		graphics.beginFill(color);
		graphics.drawPolygon(points);
		graphics.endFill();
		var texture = PIXI.RenderTexture.create(graphics.width, graphics.height);
		app.renderer.render(graphics, texture);
		return texture;
	}
};

var ui = {
	selectedFromIndex: -1,
	selectedToIndex: -1,
	showValidMoves: true
};

// Initialize app
var app = new PIXI.Application({
	autoResize: true,
	backgroundColor: 0xEEEEEE,
	antialias: true,
	resolution: 2
});
document.querySelector('#chase').appendChild(app.view);

var createHex = function (hex) {

	const rowIndex = Math.floor(hex.id / 9.0);
	const columnIndex = hex.id % 9;
	const insetOffset = (settings.hexSpace + settings.hexWidth) / 2.0;

	var x = settings.hexSpace + (settings.hexSpace + settings.hexWidth) * columnIndex;
	var y = settings.rowOffset() * rowIndex + settings.hexSpace;

	if (rowIndex % 2 == 0) {
		// Inset rows
		x += insetOffset;
	}

	const pointFactTop = 1 / (2 * Math.sqrt(3));
	const pointFactMid = 3 / (2 * Math.sqrt(3));
	const pointFactBottom = 2 / Math.sqrt(3);

	const points = [
		0, settings.hexWidth * pointFactTop,
		0, settings.hexWidth * pointFactMid,
		settings.hexWidth / 2.0, settings.hexWidth * pointFactBottom,
		settings.hexWidth, settings.hexWidth * pointFactMid,
		settings.hexWidth, settings.hexWidth * pointFactTop,
		settings.hexWidth / 2.0, 0
	];
	var outlineExtraSize = 10;
	var outlineWidth = settings.hexWidth + outlineExtraSize;
	const outline = [
		0, outlineWidth * pointFactTop,
		0, outlineWidth * pointFactMid,
		outlineWidth / 2.0, outlineWidth * pointFactBottom,
		outlineWidth, outlineWidth * pointFactMid,
		outlineWidth, outlineWidth * pointFactTop,
		outlineWidth / 2.0, 0
	];

	const texture = settings.hexTexture(points, settings.colorEmpty);

	const sprite = new PIXI.Sprite(texture);
	sprite.x = x;
	sprite.y = y;
	sprite.anchor.set(0.0, 0.0);
	sprite.interactive = true;
	sprite.hitArea = new PIXI.Polygon(points);

	sprite.pointerover = function () {
		this.alpha = 0.5;
	};
	sprite.pointerout = function () {
		this.alpha = 1.0;
	};
	sprite.click = function () {
		var index = hex.id;
		/* $(".hex-menu").fadeOut();*/

		// Don't allow moves after the game is over
		if (CHASE.AI.Position.getWinner(CHASE.AI.Board) != 0) {
			ui.selectedFromIndex = -1;
			ui.selectedToIndex = -1;
			return;
		}

		if (ui.selectedFromIndex >= 0) {
			if (ui.selectedFromIndex == index) {
				// Unselect an already selected tile
				ui.selectedFromIndex = -1;
			} else {
				ui.selectedToIndex = index;

				var moves = CHASE.AI.Position.getValidMoves(CHASE.AI.Board);

				// Look for moves that transfer a piece value
				var transfers = [];
				for (var i = 0; i < moves.length; i++) {
					if (moves[i].fromIndex == ui.selectedFromIndex && moves[i].toIndex == ui.selectedToIndex && moves[i].increment > 0) {
						transfers.push(moves[i].increment);
					}
				}

				if (transfers.length > 0) {
					// Initialize all the valid point transfer options
					/* $("#menu1, #menu2, #menu3, #menu4, #menu5").addClass("disabled-menu");
					for (var i = 0; i < transfers.length; i++) {
						$("#menu" + transfers[i]).removeClass("disabled-menu");
					}
					
					// Show the menu
					$(".hex-menu").css("left", $tile.position().left + $tile.width() / 2 - $(".hex-menu").width());
					$(".hex-menu").css("top", $tile.position().top + $tile.height() / 2 - $(".hex-menu").height() + 28.867515);
					$(".hex-menu").fadeIn();*/
				}
				else {
					// Look for valid moves with the given source and target square
					for (var i = 0; i < moves.length; i++) {
						if (moves[i].fromIndex == ui.selectedFromIndex && moves[i].toIndex == ui.selectedToIndex) {
							CHASE.AI.Position.makeMove(moves[i]);
							ui.selectedFromIndex = -1;
							ui.selectedToIndex = -1;
							break;
						}
					}
				}
			}
		} else {
			// If there's a valid move from this tile
			var moves = CHASE.AI.Position.getValidMoves(CHASE.AI.Board);
			for (var i = 0; i < moves.length; i++) {
				if (moves[i].fromIndex == index) {
					ui.selectedFromIndex = index;
					break;
				}
			}

			// If we need to distribute points after a capture
			if (CHASE.AI.Board.pointsToDistribute > 0) {
				for (var i = 0; i < moves.length; i++) {
					if (moves[i].toIndex == index) {
						CHASE.AI.Position.makeMove(moves[i]);
						ui.selectedFromIndex = -1;
						ui.selectedToIndex = -1;
						break;
					}
				}
			}
		}

		/*ui.refresh();*/

		console.log("Clicked Hex #" + index);
	}

	return {
		color: settings.colorEmpty,
		points: points,
		outline: outline,
		sprite: sprite
	};
}

var hexTiles = [];
var initializeBoard = function (hex) {
	// Clear the stage
	hexTiles = [];
	while (app.stage.children[0]) {
		app.stage.removeChild(app.stage.children[0]);
	}
	// Create the hex grid
	for (var i = 0; i < 81; i++) {
		var hex = createHex({ id: i });
		hexTiles.push(hex);
		app.stage.addChild(hex.sprite);
	}
}

// Resize app to window size
function resize() {
	// Resize the app based on the new screen size
	const parent = app.view.parentNode;
	app.renderer.resize(parent.clientWidth, parent.clientHeight);

	// Resize the tiles based on the new app width
	const newWidthBasedOnWidth = (parent.clientWidth - 10.5 * settings.hexSpace) / 9.5;

	// Resize the tiles based on the new app height
	// const newWidthBasedOnHeight = (2 * Math.sqrt(3) * parent.clientHeight - (4 * Math.sqrt(3) + 24) * settings.hexSpace) / 30.0;
	const newWidthBasedOnHeight = ((12 + 2 * Math.sqrt(3)) * settings.hexSpace - Math.sqrt(3) * parent.clientHeight) / -14.0;

	// Resise to whatever fits best
	settings.hexWidth = Math.min(newWidthBasedOnWidth, newWidthBasedOnHeight);

	initializeBoard();
}
window.addEventListener('resize', resize);
resize();

CHASE.AI.NewGame();

// Game loop
app.ticker.add((delta) => {
	var position = CHASE.AI.Board;
	var winner = CHASE.AI.Position.getWinner(CHASE.AI.Board);

	// Refresh the values of the pieces on the board
	for (var i = 0; i < 81; i++) {
		if (i != 40) {
			var value = position.tiles[i] != 0 ? Math.abs(position.tiles[i]) : "";
			// Changes in ownership
			if (position.tiles[i] > 0) {
				if (hexTiles[i].color != settings.colorBlue) {
					hexTiles[i].color = settings.colorBlue;
					hexTiles[i].sprite.texture = settings.hexTexture(hexTiles[i].points, settings.colorBlue);
				}
			} else if (position.tiles[i] < 0) {
				if (hexTiles[i].color != settings.colorRed) {
					hexTiles[i].color = settings.colorRed;
					hexTiles[i].sprite.texture = settings.hexTexture(hexTiles[i].points, settings.colorRed);
				}
			} else if (hexTiles[i].color != settings.colorEmpty) {
				hexTiles[i].color = settings.colorEmpty;
				hexTiles[i].sprite.texture = settings.hexTexture(hexTiles[i].points, settings.colorEmpty);
			}
			// Selected tiles
			if (i == ui.selectedFromIndex) {
				if (hexTiles[i].color == settings.colorBlue) {
					hexTiles[i].color = settings.colorBlueSelected;
					hexTiles[i].sprite.texture = settings.hexTexture(hexTiles[i].points, settings.colorBlueSelected);
				} else if (hexTiles[i].color == settings.colorRed) {
					hexTiles[i].color = settings.colorRedSelected;
					hexTiles[i].sprite.texture = settings.hexTexture(hexTiles[i].points, settings.colorRedSelected);
				}
			}
		}
	}
	// Possible moves
	if (ui.showValidMoves && ui.selectedFromIndex >= 0) {
		var moves = CHASE.AI.Position.getValidMoves(CHASE.AI.Board);
		for (var i = 0; i < moves.length; i++) {
			if (moves[i].fromIndex == ui.selectedFromIndex) {
				var move = moves[i].toIndex;
				hexTiles[move].sprite.texture =
					settings.hexTexture(hexTiles[move].points, hexTiles[move].color, true, hexTiles[move].outline, settings.colorPossibleMove);
			}
		}
	}
});