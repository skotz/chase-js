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
	colorRed: 0xFF5858,
	colorRedSelected: 0xB20000,
	colorBlue: 0x4786B6,
	colorBlueSelected: 0x074473,
	colorPossibleMove: 0xFFB858,
	colorMenu: 0xAAAAAA,
	colorMenuSelected: 0x4AD64A,// 0x008F00,
	hexTexture: function (points, color, drawOutline, outlinePoints, outlineColor) {
		const graphics = new PIXI.Graphics();
		graphics.lineStyle(0);
		graphics.beginFill(color);
		graphics.drawPolygon(points);
		if (drawOutline) {
			graphics.beginFill(outlineColor);
			graphics.drawPolygon(outlinePoints);
		}
		graphics.endFill();
		var texture = PIXI.RenderTexture.create(graphics.width, graphics.height);
		app.renderer.render(graphics, texture);
		return texture;
	}
};

var ui = {
	selectedFromIndex: -1,
	selectedToIndex: -1,
	selectedTransfer: -1,
	validTransfers: [],
	showValidMoves: true,
	showThreats: true,
	difficulty: 1
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
	var outlineWidth = settings.hexWidth - outlineExtraSize;
	var extraX = outlineExtraSize / 2.0;
	var extraY = pointFactBottom * extraX;
	const outline = [
		extraX, extraY + outlineWidth * pointFactTop,
		extraX, extraY + outlineWidth * pointFactMid,
		extraX + outlineWidth / 2.0, extraY + outlineWidth * pointFactBottom,
		extraX + outlineWidth, extraY + outlineWidth * pointFactMid,
		extraX + outlineWidth, extraY + outlineWidth * pointFactTop,
		extraX + outlineWidth / 2.0, extraY
	];
	const center = {
		x: x + settings.hexWidth / 2.0,
		y: y + (settings.hexWidth * pointFactBottom) / 2.0
	};

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
	if (hex.click != null) {
		sprite.click = hex.click;
	} else {
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
				if (transferMenu) {
					ui.selectedTransfer = transferTiles.indexOf(index) + 1;
					if (ui.selectedTransfer == 6) {
						// Exit the overlay menu
						transferMenu = false;
					}
				}
				if (ui.selectedFromIndex == index) {
					// Unselect an already selected tile
					ui.selectedFromIndex = -1;
				} else {
					if (!transferMenu) {
						ui.selectedToIndex = index;
					}

					var moves = CHASE.AI.Position.getValidMoves(CHASE.AI.Board);

					// Look for moves that transfer a piece value
					var transfers = [];
					for (var i = 0; i < moves.length; i++) {
						if (moves[i].fromIndex == ui.selectedFromIndex && moves[i].toIndex == ui.selectedToIndex && moves[i].increment > 0) {
							transfers.push(moves[i].increment);
						}
					}

					if (transfers.length > 0 && !transferMenu) {
						// Transfer points from one tile to another
						ui.validTransfers = transfers;
						ui.selectedTransfer = -1;
						transferMenu = true;
						displayTransferMenu(transfers);
					} else {
						// Look for valid moves with the given source and target square
						for (var i = 0; i < moves.length; i++) {
							var validIncrement = moves[i].increment <= 0 || moves[i].increment == ui.selectedTransfer;
							if (moves[i].fromIndex == ui.selectedFromIndex && moves[i].toIndex == ui.selectedToIndex && validIncrement) {
								CHASE.AI.Position.makeMove(moves[i]);
								ui.selectedFromIndex = -1;
								ui.selectedToIndex = -1;
								ui.selectedTransfer = -1;
								transferMenu = false;
								computerMove();
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

			// Refresh
			resize();

			console.log("Clicked Hex #" + index);
		}
	}

	return {
		id: hex.id,
		color: settings.colorEmpty,
		points: points,
		outline: outline,
		sprite: sprite,
		center: center
	};
}

// Clear the stage
var clearStage = function () {
	hexTiles = [];
	while (app.stage.children[0]) {
		app.stage.removeChild(app.stage.children[0]);
	}
}

var hexTiles = [];
var displayBoard = function () {
	clearStage();
	// Create the hex grid
	for (var i = 0; i < 81; i++) {
		var hex = createHex({ id: i });
		hexTiles.push(hex);
		app.stage.addChild(hex.sprite);
		if (CHASE.AI.Board.tiles[i] != 0) {
			displayText(Math.abs(CHASE.AI.Board.tiles[i]), hex.center);
		} else if (i == 40) {
			displayText("CH", hex.center);
		}
	}
}

var displayText = function (text, location) {
	const style = new PIXI.TextStyle({
		fontFamily: 'Arial',
		fontSize: 14,
		fontWeight: 'bold'
	});
	const basicText = new PIXI.Text(text, style);
	basicText.x = location.x;
	basicText.y = location.y;
	basicText.anchor.set(0.5, 0.5);
	app.stage.addChild(basicText);
}

var displayMenuOption = function (id, text, action) {
	var hex = createHex({
		id: id,
		click: action
	});
	hexTiles.push(hex);
	app.stage.addChild(hex.sprite);
	displayText(text, hex.center);
}

var difficultyTiles = [38, 30, 21];
var threatTile = 23;
var moveTile = 33;
var menu = true;
var displayMenu = function () {
	clearStage();
	displayMenuOption(40, "start", function () {
		menu = false;
		startGame();
	});
	for (let i = 0; i < difficultyTiles.length; i++) {
		displayMenuOption(difficultyTiles[i], "level " + (i + 1), function () {
			ui.difficulty = i + 1;
		});
	}
	displayMenuOption(threatTile, "threats", function () {
		ui.showThreats = !ui.showThreats;
	});
	displayMenuOption(moveTile, "moves", function () {
		ui.showValidMoves = !ui.showValidMoves;
	});
}

var transferTiles = [32, 41, 50, 49, 39, 31];
var transferMenu = false;
var displayTransferMenu = function (transfers) {
	displayBoard();
	for (let i = 0; i < transferTiles.length - 1; i++) {
		displayMenuOption(transferTiles[i], "+" + (i + 1), null);
	}
	displayMenuOption(transferTiles[5], "cancel", null);
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

	if (menu) {
		displayMenu();
	} else if (transferMenu) {
		displayTransferMenu(ui.validTransfers);
	} else {
		displayBoard();
	}
}
window.addEventListener('resize', resize);

function startGame() {
	resize();
	CHASE.AI.NewGame();
}

function computerMove() {
	// TODO: async?
	var move = CHASE.AI.Search.getBestMoveMcts(CHASE.AI.Board, ui.difficulty);
	CHASE.AI.Position.makeMove(move.bestMove);
	displayBoard();
}

startGame();

var setHexColor = function (i, color) {
	if (hexTiles[i].color != color) {
		hexTiles[i].color = color;
		hexTiles[i].sprite.texture = settings.hexTexture(hexTiles[i].points, color);
	}
}

// Game loop
app.ticker.add((delta) => {
	var position = CHASE.AI.Board;
	var winner = CHASE.AI.Position.getWinner(CHASE.AI.Board);

	if (menu) {
		// Refresh the menu
		for (var i = 0; i < hexTiles.length; i++) {
			var set = false;
			if (hexTiles[i].id == threatTile) {
				setHexColor(i, ui.showThreats ? settings.colorMenuSelected : settings.colorMenu);
				set = true;
			}
			if (hexTiles[i].id == moveTile) {
				setHexColor(i, ui.showValidMoves ? settings.colorMenuSelected : settings.colorMenu);
				set = true;
			}
			for (let lvl = 0; lvl < difficultyTiles.length; lvl++) {
				if (hexTiles[i].id == difficultyTiles[lvl]) {
					if (ui.difficulty == lvl + 1) {
						setHexColor(i, settings.colorMenuSelected);
						set = true;
					} else {
						setHexColor(i, settings.colorMenu);
						set = true;
					}
				}
			}
			if (!set) {
				setHexColor(i, settings.colorMenu);
			}
		}
	} else if (transferMenu) {
		// Display the overlay piece value transfer menu
		for (var i = 81; i < hexTiles.length; i++) {
			for (let t = 0; t < transferTiles.length; t++) {
				if (hexTiles[i].id == transferTiles[t]) {
					if (transferTiles.indexOf(hexTiles[i].id) + 1 <= ui.validTransfers.length) {
						setHexColor(i, settings.colorPossibleMove);
					} else if (t == 5) {
						setHexColor(i, settings.colorRed);
					} else {
						setHexColor(i, settings.colorEmpty);
					}
				}
			}
		}
	} else {
		// Refresh the values of the pieces on the board
		for (var i = 0; i < 81; i++) {
			if (i != 40) {
				// Changes in ownership
				if (position.tiles[i] > 0) {
					setHexColor(i, settings.colorBlue);
				} else if (position.tiles[i] < 0) {
					setHexColor(i, settings.colorRed);
				} else {
					setHexColor(i, settings.colorEmpty);
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
	}
});