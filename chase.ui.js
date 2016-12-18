// Chase
// Scott Clayton (c) 2016
// Requires jQuery
window.CHASE = window.CHASE || { };
CHASE.UI = {
	selectedFromIndex: -1,
	selectedToIndex: -1,
	
	// Generate the HTML for the board upon first load
	init: function($container) {
		var index = 0;
		$container.append("<div class=\"hex-board\"></div>");
		var $board = $container.children(".hex-board");
		for (var row = 0; row < 9; row++) {
			$board.append("<div class=\"hex-row" + (row % 2 == 0 ? " offset" : "") + "\"></div>");
			var $row = $board.children(".hex-row").last();
			for (var tile = 0; tile < 9; tile++) {
				$row.append("<div class=\"hex\" id=\"tile" + index + "\"><a href=\"javascript:void(0)\">CH</a></div>");
				index++;
			}
		}
		
		CHASE.AI.NewGame();
		
		$container.on("click", ".hex a", function() {
			var $tile = $(this).parent();
			var index = $tile.prop("id").replace("tile", "");
			
			if (CHASE.UI.selectedFromIndex > 0) {
				if (CHASE.UI.selectedFromIndex == index) {
					// Unselect an already selected tile
					CHASE.UI.selectedFromIndex = -1;
				} else {
					CHASE.UI.selectedToIndex = index;
					
					var moves = CHASE.AI.Position.getValidMoves(CHASE.AI.Board);
					for (var i = 0; i < moves.length; i++) {
						if (moves[i].fromIndex == CHASE.UI.selectedFromIndex && moves[i].toIndex == CHASE.UI.selectedToIndex) {
							CHASE.AI.Position.makeMove(CHASE.AI.Board, moves[i], true, -1);							
							CHASE.UI.selectedFromIndex = -1;
							CHASE.UI.selectedToIndex = -1;
							break;
						}
					}
				}
			} else {
				// If there's a valid move from this tile
				var moves = CHASE.AI.Position.getValidMoves(CHASE.AI.Board);
				for (var i = 0; i < moves.length; i++) {
					if (moves[i].fromIndex == index) {					
						CHASE.UI.selectedFromIndex = index;
						break;
					}
				}
				
				// If we need to distribute points after a capture
				if (CHASE.AI.Board.pointsToDistribute > 0) {
					for (var i = 0; i < moves.length; i++) {
						if (moves[i].toIndex == index) {
							CHASE.AI.Position.makeMove(CHASE.AI.Board, moves[i], true, -1);							
							CHASE.UI.selectedFromIndex = -1;
							CHASE.UI.selectedToIndex = -1;
							break;
						}
					}
				}
			}
			
			CHASE.UI.refresh();
			
			CHASE.UI.log("Clicked Index " + index);
		});
		
		CHASE.UI.refresh();
	},
	
	// Refresh the board on the screen
	refresh: function() {
		var position = CHASE.AI.Board;
		
		// Refresh the values of the pieces on the board
		for (var i = 0; i < 81; i++) {
			if (i != 40) {
				var $tile = $("#tile" + i);
				$tile.children("a").text(position.tiles[i] != 0 ? Math.abs(position.tiles[i]) : "");
				if (position.tiles[i] > 0) {
					$tile.removeClass("red");
					$tile.addClass("blue");
				} else if (position.tiles[i] < 0) {
					$tile.addClass("red");
					$tile.removeClass("blue");					
				} else {
					$tile.removeClass("red");
					$tile.removeClass("blue");
				}
			}
		}
		
		// Highlight tiles
		$(".hex").removeClass("selected");
		$(".hex").removeClass("option");
		if (CHASE.UI.selectedFromIndex >= 0) {
			var $tile = $("#tile" + CHASE.UI.selectedFromIndex);
			var pieceValue = position.tiles[CHASE.UI.selectedFromIndex];
			
			// Highlight selected tile
			$tile.addClass("selected");
			
			// Highlight all valid moves for the selected tile
			var moves = CHASE.AI.Position.getValidMoves(CHASE.AI.Board);
			for (var i = 0; i < moves.length; i++) {
				if (moves[i].fromIndex == CHASE.UI.selectedFromIndex) {			
					var $destTile = $("#tile" + moves[i].toIndex);
					$destTile.addClass("option");
				}
			}
		}

		// Highlight tiles we can add points to after a capture
		if (CHASE.AI.Board.pointsToDistribute > 0) {
			var moves = CHASE.AI.Position.getValidMoves(CHASE.AI.Board);
			for (var i = 0; i < moves.length; i++) {
				if (moves[i].increment > 0) {
					var $pointsTile = $("#tile" + moves[i].toIndex);
					$pointsTile.children("a").text($pointsTile.children("a").text() + "+" + moves[i].increment);
					$pointsTile.addClass("option");
				}
			}
		}
	},
	
	// Debugging stuff
	log: function(info) {
		try {
			console.log(info);
		} catch (ex) { }
	}
};

$(document).ready(function() {
	// Initialize the game
	CHASE.UI.init($("#chase"));
});

/*
	<div class="hex-board">
		<div class="hex-row offset">
			<div class="hex blue">
				<a href="javascript:void(0)">1</a>
			</div>
			*/