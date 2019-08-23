/* 
 * Chase (the game)
 * Scott Clayton (c) 2019
 */

// Settings
var settings = {
	/* Hex */
	hexSpace: 5,
	hexWidth: 70,
	hexHeight: function() { 
		return (2 * this.hexWidth) / Math.sqrt(3);
	},
	rowOffset: function() {
		return this.hexHeight() + (3 * this.hexSpace - this.hexWidth) / (2 * Math.sqrt(3));
	},
	/* Colors */
	colorEmpty: 0x777777,
	colorRed: 0xFF3333,
	colorBlue: 0x4499FF,
	hexTexture: function(points, color) {
		const graphics = new PIXI.Graphics();
		graphics.beginFill(color);
		graphics.lineStyle(0);
		graphics.drawPolygon(points);
		graphics.endFill();
		var texture = PIXI.RenderTexture.create(graphics.width, graphics.height);
		app.renderer.render(graphics, texture);
		return texture;
	}
};

// Initialize app
var app = new PIXI.Application({ 
    autoResize: true,
    resolution: devicePixelRatio,
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

	if (rowIndex % 2 == 0)
	{
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
    
    return {
		color: settings.colorEmpty,
		points: points,
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
		}
	}
});