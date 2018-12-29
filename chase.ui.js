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
		
		// Generate the markup for the board
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
		
		// Add the game over background
		$container.append("<div class=\"game-over\"></div>");
		
		// Add the new game menu and options
		$container.append("<div class=\"new-game\"></div>");
		var $newGameMenu = $container.children(".new-game");
		$newGameMenu.append("<span class=\"title\">Chase</span><span class=\"subtitle\">(the game)</span>");
		$newGameMenu.append("<div id=\"optEngine\" class=\"option\">Engine Type" + 
				"<div class=\"choice selected\" data-option=\"mcts\">MCTS</div>" + 
				"<div class=\"choice\" data-option=\"minimax\">MiniMax</div>" + 
			"</div>");
		$newGameMenu.append("<div id=\"optSearchDepth\" class=\"option\">Engine Level" + 
				"<div class=\"choice\" data-option=\"3\">3</div>" + 
				"<div class=\"choice selected\" data-option=\"2\">2</div>" + 
				"<div class=\"choice\" data-option=\"1\">1</div>" + 
			"</div>");
		$newGameMenu.append("<div id=\"optShowThreats\" class=\"option\">Highlight Threats" + 
				"<div class=\"choice\" data-option=\"off\">Off</div>" + 
				"<div class=\"choice selected\" data-option=\"on\">On</div>" + 
			"</div>");
		$newGameMenu.append("<div id=\"optShowMoves\" class=\"option\">Highlight Moves" + 
				"<div class=\"choice\" data-option=\"off\">Off</div>" + 
				"<div class=\"choice selected\" data-option=\"on\">On</div>" + 
			"</div>");
		$newGameMenu.append("<div class=\"option\"><a href=\"javascript: void(0)\" id=\"startGame\">Start Game</a></div>");
			
		// Initialize click events for menu options
		$container.on("click", ".option .choice", function() {
			var $choice = $(this);
			var $option = $choice.parent();
			
			$option.children().removeClass("selected");
			$choice.addClass("selected");
		});
		$container.on("click", "#startGame", function() {
			CHASE.AI.NewGame();
			$(".new-game").hide();
		});
		$container.on("click", ".restartGame", function() {
			$(".new-game").show();
			$(".game-over").hide();
		});
		
		// Generate the markup for the point transfer menu
		$board.append("<div class=\"hex-menu\"></div>");
		var $rowm = $board.children(".hex-menu").last();
		for (var tile = 1; tile < 6; tile++) {
			$rowm.append("<div class=\"hex-menu-item\" id=\"menu" + tile + "\"><a href=\"javascript:void(0)\">" + tile + "</a></div>");
		}
		$rowm.append("<div class=\"hex-menu-item\" id=\"menu6\"><a href=\"javascript:void(0)\">&#x2716;</a></div>");
		$("#menu6").click(function() {
			$(".hex-menu").fadeOut();
		});
		
		// Start the game
		CHASE.AI.NewGame();
		
		// Initialize click handlers for each tile
		$container.on("click", ".hex a", function() {
			var $tile = $(this).parent();
			var index = $tile.prop("id").replace("tile", "");	
			$(".hex-menu").fadeOut();
			
			// Don't allow moves after the game is over
			if (CHASE.AI.Position.getWinner(CHASE.AI.Board) != 0) {
				CHASE.UI.selectedFromIndex = -1;
				CHASE.UI.selectedToIndex = -1;
				return;
			}
			
			if (CHASE.UI.selectedFromIndex >= 0) {
				if (CHASE.UI.selectedFromIndex == index) {
					// Unselect an already selected tile
					CHASE.UI.selectedFromIndex = -1;
				} else {
					CHASE.UI.selectedToIndex = index;
					
					var moves = CHASE.AI.Position.getValidMoves(CHASE.AI.Board);
					
					// Look for moves that transfer a piece value
					var transfers = [];
					for (var i = 0; i < moves.length; i++) {
						if (moves[i].fromIndex == CHASE.UI.selectedFromIndex && moves[i].toIndex == CHASE.UI.selectedToIndex && moves[i].increment > 0) {
							transfers.push(moves[i].increment);
						}
					}
					
					if (transfers.length > 0) {
						// Initialize all the valid point transfer options
						$("#menu1, #menu2, #menu3, #menu4, #menu5").addClass("disabled-menu");
						for (var i = 0; i < transfers.length; i++) {
							$("#menu" + transfers[i]).removeClass("disabled-menu");
						}
						
						// Show the menu
						$(".hex-menu").css("left", $tile.position().left + $tile.width() / 2 - $(".hex-menu").width());
						$(".hex-menu").css("top", $tile.position().top + $tile.height() / 2 - $(".hex-menu").height() + 28.867515);
						$(".hex-menu").fadeIn();
					}
					else {
						// Look for valid moves with the given source and target square
						for (var i = 0; i < moves.length; i++) {
							if (moves[i].fromIndex == CHASE.UI.selectedFromIndex && moves[i].toIndex == CHASE.UI.selectedToIndex) {
								CHASE.AI.Position.makeMove(moves[i]);
								CHASE.UI.selectedFromIndex = -1;
								CHASE.UI.selectedToIndex = -1;
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
						CHASE.UI.selectedFromIndex = index;
						break;
					}
				}
				
				// If we need to distribute points after a capture
				if (CHASE.AI.Board.pointsToDistribute > 0) {
					for (var i = 0; i < moves.length; i++) {
						if (moves[i].toIndex == index) {
							CHASE.AI.Position.makeMove(moves[i]);							
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
		
		// Initialize click handlers for each point transfer menu option
		$container.on("click", "#menu1, #menu2, #menu3, #menu4, #menu5", function() {
			var $option = $(this);
			if (!$option.hasClass("disabled-menu")) {
				var increment = $option.prop("id").replace("menu", "");
				
				// Make the move
				var moves = CHASE.AI.Position.getValidMoves(CHASE.AI.Board);
				for (var i = 0; i < moves.length; i++) {
					if (moves[i].fromIndex == CHASE.UI.selectedFromIndex && moves[i].toIndex == CHASE.UI.selectedToIndex && moves[i].increment == increment) {
						$(".hex-menu").fadeOut();
						CHASE.AI.Position.makeMove(moves[i]);							
						CHASE.UI.selectedFromIndex = -1;
						CHASE.UI.selectedToIndex = -1;
						break;
					}
				}
			}
			
			CHASE.UI.refresh();
		});
		
		CHASE.UI.refresh();
	},
	
	// Force the computer to make a move
	makeBestMove: function() {
		var engine = $("#optEngine").children(".choice.selected").data("option");
		var searchDepth = $("#optSearchDepth").children(".choice.selected").data("option");
		var move;
        if (engine == "mcts")
        {
            move = CHASE.AI.Search.getBestMoveMcts(CHASE.AI.Board, searchDepth);
        }
        else
        {
            move = CHASE.AI.Search.getBestMove(CHASE.AI.Board, searchDepth);
        }
		CHASE.AI.Position.makeMove(move.bestMove);
		CHASE.UI.refresh();
	},
	
	// Refresh the board on the screen
	refresh: function() {
		var position = CHASE.AI.Board;
		var winner = CHASE.AI.Position.getWinner(CHASE.AI.Board);
		
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
			if ($("#optShowMoves").children(".choice.selected").data("option") == "on") {
				var moves = CHASE.AI.Position.getValidMoves(CHASE.AI.Board);
				for (var i = 0; i < moves.length; i++) {
					if (moves[i].fromIndex == CHASE.UI.selectedFromIndex) {			
						var $destTile = $("#tile" + moves[i].toIndex);
						$destTile.addClass("option");
					}
				}
			}
		}

		// Highlight last move tiles
		$(".hex").removeClass("last-move");
		if (CHASE.AI.LastMove != null) {
			if (CHASE.AI.LastMove.fromIndex >= 0) {
				$("#tile" + CHASE.AI.LastMove.fromIndex).addClass("last-move");
			}
			if (CHASE.AI.LastMove.toIndex >= 0) {
				$("#tile" + CHASE.AI.LastMove.toIndex).addClass("last-move");
			}
		}
		
		// Highlight tiles we can add points to after a capture
		if (CHASE.AI.Board.pointsToDistribute > 0 && winner == 0) {
			var moves = CHASE.AI.Position.getValidMoves(CHASE.AI.Board);
			for (var i = 0; i < moves.length; i++) {
				if (moves[i].increment > 0) {
					var $pointsTile = $("#tile" + moves[i].toIndex);
					$pointsTile.children("a").text($pointsTile.children("a").text() + "+" + moves[i].increment);
					$pointsTile.addClass("option");
				}
			}
		}
		
		// Highlight threatened pieces
		if ($("#optShowThreats").children(".choice.selected").data("option") == "on") {
			$(".hex").removeClass("threatened");
			var threats = CHASE.AI.Position.getThreatenedPieces(CHASE.AI.Board);
			for (var i = 0; i < threats.length; i++) {
				$("#tile" + threats[i]).addClass("threatened");
			}
		}
		
		// See if there's a winner
		$(".game-over").hide().removeClass("blue-wins").removeClass("red-wins").text("");
		if (winner == CHASE.AI.Player.Blue) {
			$(".game-over").show().addClass("blue-wins").text("Blue Wins!");
		} else if (winner == CHASE.AI.Player.Red) {
			$(".game-over").show().addClass("red-wins").text("Red Wins!");
		}
		
		// Have the computer make a move
		if (CHASE.AI.Board.playerToMove == CHASE.AI.Player.Blue) {
			setTimeout(CHASE.UI.makeBestMove, 1);
		}
	},
	
	// Debugging stuff
	log: function(info) {
		try {
			console.log(info);
		} catch (ex) { }
	}
};

/*$(document).ready(function() {
	function doResize() {
	  var scale = Math.min(
		$(window).width() / $("#chase > div").width(),    
		$(window).height() / $("#chase > div").outerHeight()
	  );	  
	  $("#chase > div").css({
		transform: "scale(" + scale + ")"
	  });
	}

	setInterval(doResize, 1000);
});*/

$(document).ready(function() {
	// Initialize the game
	CHASE.UI.init($("#chase"));
});

