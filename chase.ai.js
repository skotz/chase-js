// Chase
// Scott Clayton (c) 2016
window.CHASE = window.CHASE || { };
CHASE.AI = {
	// The currently running game
	Board: null,
	
	// The last move made
	LastMove: null,
	
	// Start a new game
	NewGame: function() {
		CHASE.AI.Board = CHASE.AI.Position.newGame();
	},
	
	// Possible directions for a piece to move
	Direction: {
		UpRight: 0,
        Right: 1,
        DownRight: 2,
        DownLeft: 3,
        Left: 4,
        UpLeft: 5
	},
	
	// The two player values
	Player: {
		Red: -1,
        Blue: 1
	},
	
	// Engine for finding good moves
	Search: {
		// Evaluate a position
		evaluate: function(position, currentDepth)
        {
            var bluePieces = 0;
            var redPieces = 0;

            var blueGoodPieces = 0;
            var redGoodPieces = 0;

            // Material (number of pieces) difference
            for (var i = 0; i < 81; i++)
            {
                if (position.tiles[i] > 0)
                {
                    bluePieces++;

                    if (position.tiles[i] == 4 || position.tiles[i] == 5)
                    {
                        // 4s and 5s are good
                        blueGoodPieces++;
                    }
                    else if (position.tiles[i] == 6)
                    {
                        // 6s are bad
                        blueGoodPieces--;
                    }
                }
                else if (position.tiles[i] < 0)
                {
                    redPieces++;

                    if (position.tiles[i] == -4 || position.tiles[i] == -5)
                    {
                        redGoodPieces++;
                    }
                    else if (position.tiles[i] == -6)
                    {
                        redGoodPieces--;
                    }
                }
            }

            // Game over scores
            if (bluePieces < 5)
            {
                // Give slightly better evaluations to the faster forced win
                return -10000 + currentDepth;
            }
            else if (redPieces < 5)
            {
                return 10000 - currentDepth;
            }
            else
            {
                var evalScore = 0;

                // Just the difference between the piece count between blue and red
                // eval += (bluePieces - redPieces) * Constants.EvalPieceWeight;

                // Figure in the ideal value of pieces
                // Range: [-4 - 5, 5 - (-4)] --> [-9, 9]
                evalScore += (blueGoodPieces - redGoodPieces);

                // Just subtracting red from blue results in the same score for (blue = 6, red = 5) and (blue = 10, red = 9) even thought the lead of 1 means more in the first case
                // This calculation figures in that an extra piece means more the fewer you have, so... 
                // (blue = 6, red = 5) --> (6 * 100) / 5 - 100 = 20
                // (blue = 10, red = 9) --> (10 * 100) / 9 - 100 = 11
                // Range: [-(10 * 100) / 5 - 100, (10 * 100) / 5 - 100] --> [-100, 100]
                if (bluePieces > redPieces)
                {
                    evalScore += (bluePieces * 100) / redPieces - 100;
                }
                else if (redPieces > bluePieces)
                {
                    evalScore -= (redPieces * 100) / bluePieces - 100;
                }

                return evalScore * 10;
            }
        },
		
		// Find the best move in a given position
		getBestMove: function(position, depth) 
		{
			return CHASE.AI.Search.alphaBeta(position, -10000000, 10000000, depth * 2, 1, position.playerToMove);
		},
		
		// Mini-Max with Alpha-Beta pruning
		alphaBeta: function(position, alpha, beta, depth, depthUp, initiatingPlayer)
        {
            // Evaluate the position
            var evalScore = CHASE.AI.Search.evaluate(position, depthUp);

            // See if someone won
            if (Math.abs(evalScore) >= 9900)
            {
				var node = {};
				node.score = evalScore;
				node.pv = evalScore > 0 ? "BLUE-WINS" : "RED-WINS";
                return node;
            }

            // We've reached the depth of our search, so return the heuristic evaluation of the position
            // Make sure we're evaluating after our opponent's last move (meaning it's our turn to move again) so that we calculate full move pairs
            if (depth <= 0 && position.playerToMove == initiatingPlayer)
            {
				var node = {};
				node.score = evalScore;
				node.pv = "";
                return node;
            }

            var maximizingPlayer = position.playerToMove == CHASE.AI.Player.Blue;
            var best = {};
            best.score = maximizingPlayer ? -10000000 : 10000000;

            var moves = CHASE.AI.Position.getValidMoves(position);

            // If we have no moves, return the evaluation of the position
            if (moves.length == 0)
            {
				var node = {};
				node.score = evalScore;
				node.pv = "";
                return node;
            }

            var movenum = 1;
			for (var m = 0; m < moves.length; m++)
            {
				var move = moves[m];
				
                // Copy the board and make a move
                var copy = CHASE.AI.Position.clone(position);
                CHASE.AI.Position.makeMoveInternal(copy, move);
				
                // Find opponents best counter move
                var child = CHASE.AI.Search.alphaBeta(copy, alpha, beta, depth - 1, depthUp + 1, initiatingPlayer);

                if (maximizingPlayer)
                {
                    if (child.score > best.score)
                    {
                        best.score = child.score;
                        best.bestMove = move;
                        // best.pv = move.ToString() + " " + child.pv;
                    }

                    alpha = Math.max(alpha, best.score);

                    if (beta <= alpha)
                    {
                        // Beta cutoff
                        break;
                    }
                }
                else
                {
                    if (child.score < best.score)
                    {
                        best.score = child.score;
                        best.bestMove = move;
                        // best.pv = move.ToString() + " " + child.pv;
                    }
                    
                    beta = Math.min(beta, best.score);
                    
                    if (beta <= alpha)
                    {
                        // Alpha cutoff
                        break;
                    }
                }

                if (depthUp == 1)
                {
					console.log("Searched " + m + " of " + moves.length);
                }
            }
            
            return best;
        }
	},
	
	// Represents the state of the board
	Position: {
		// A multidimensional table which contains the target tile index given a source index and direction
		// targetIndex = tileDirectionTable[sourceIndex][direction];
		tileDirectionTable: [[-1,1,10,9,8,-1,],[-1,2,11,10,0,-1,],[-1,3,12,11,1,-1,],[-1,4,13,12,2,-1,],[-1,5,14,13,3,-1,],[-1,6,15,14,4,-1,],[-1,7,16,15,5,-1,],[-1,8,17,16,6,-1,],[-1,0,9,17,7,-1,],[0,10,18,26,17,8,],[1,11,19,18,9,0,],[2,12,20,19,10,1,],[3,13,21,20,11,2,],[4,14,22,21,12,3,],[5,15,23,22,13,4,],[6,16,24,23,14,5,],[7,17,25,24,15,6,],[8,9,26,25,16,7,],[10,19,28,27,26,9,],[11,20,29,28,18,10,],[12,21,30,29,19,11,],[13,22,31,30,20,12,],[14,23,32,31,21,13,],[15,24,33,32,22,14,],[16,25,34,33,23,15,],[17,26,35,34,24,16,],[9,18,27,35,25,17,],[18,28,36,44,35,26,],[19,29,37,36,27,18,],[20,30,38,37,28,19,],[21,31,39,38,29,20,],[22,32,40,39,30,21,],[23,33,41,40,31,22,],[24,34,42,41,32,23,],[25,35,43,42,33,24,],[26,27,44,43,34,25,],[28,37,46,45,44,27,],[29,38,47,46,36,28,],[30,39,48,47,37,29,],[31,40,49,48,38,30,],[32,41,50,49,39,31,],[33,42,51,50,40,32,],[34,43,52,51,41,33,],[35,44,53,52,42,34,],[27,36,45,53,43,35,],[36,46,54,62,53,44,],[37,47,55,54,45,36,],[38,48,56,55,46,37,],[39,49,57,56,47,38,],[40,50,58,57,48,39,],[41,51,59,58,49,40,],[42,52,60,59,50,41,],[43,53,61,60,51,42,],[44,45,62,61,52,43,],[46,55,64,63,62,45,],[47,56,65,64,54,46,],[48,57,66,65,55,47,],[49,58,67,66,56,48,],[50,59,68,67,57,49,],[51,60,69,68,58,50,],[52,61,70,69,59,51,],[53,62,71,70,60,52,],[45,54,63,71,61,53,],[54,64,72,80,71,62,],[55,65,73,72,63,54,],[56,66,74,73,64,55,],[57,67,75,74,65,56,],[58,68,76,75,66,57,],[59,69,77,76,67,58,],[60,70,78,77,68,59,],[61,71,79,78,69,60,],[62,63,80,79,70,61,],[64,73,-1,-1,80,63,],[65,74,-1,-1,72,64,],[66,75,-1,-1,73,65,],[67,76,-1,-1,74,66,],[68,77,-1,-1,75,67,],[69,78,-1,-1,76,68,],[70,79,-1,-1,77,69,],[71,80,-1,-1,78,70,],[63,72,-1,-1,79,71,]],
		
		// Get the state of the board as it would be for a new game
		newGame: function() {
			return {
				tiles: [
					  1,  2,  3,  4,  5,  4,  3,  2,  1, // i
					0,  0,  0,  0,  0,  0,  0,  0,  0,   // h
					  0,  0,  0,  0,  0,  0,  0,  0,  0, // g
					0,  0,  0,  0,  0,  0,  0,  0,  0,   // f
					  0,  0,  0,  0,  0,  0,  0,  0,  0, // e
					0,  0,  0,  0,  0,  0,  0,  0,  0,   // d
					  0,  0,  0,  0,  0,  0,  0,  0,  0, // c
					0,  0,  0,  0,  0,  0,  0,  0,  0,   // b
					 -1, -2, -3, -4, -5, -4, -3, -2, -1  // a
				],
				pointsToDistribute: 0,
				playerToMove: -1
			};
		},
		
		// Deep copy a position
		clone: function(position) {
			return {
				tiles: position.tiles.slice(0),
				pointsToDistribute: position.pointsToDistribute,
				playerToMove: position.playerToMove
			};
		},
		
		// Returns the winner (if there is one)
		getWinner: function(position) {
			if (CHASE.AI.Position.countPieces(position, CHASE.AI.Player.Blue) < 5) {
				return CHASE.AI.Player.Red;
			} else if (CHASE.AI.Position.countPieces(position, CHASE.AI.Player.Red) < 5) {
				return CHASE.AI.Player.Blue;
			} else {
				return 0;
			}
		},
		
		// Get the index of the tile 1 move away from a given source tile and direction
		getIndexInDirection: function(sourceIndex, direction) {
			return CHASE.AI.Position.tileDirectionTable[sourceIndex][direction];
		},
		
		// Check if it's possible to move a piece from a given tile in a given direction a given number of tiles.
        // If the move is valid then the destination index will be returned.
		getDestinationIndexIfValidMove: function(position, sourceIndex, direction, distance, isBounce) {
            var index = sourceIndex;
            for (var i = 1; i <= distance; i++)
            {
                if (i > 1 || isBounce)
                {
                    // Check for richochets
                    if (direction.d == CHASE.AI.Direction.UpRight && index >= 0 && index <= 8)
                    {
                        direction.d = CHASE.AI.Direction.DownRight;
                    }
                    else if (direction.d == CHASE.AI.Direction.UpLeft && index >= 0 && index <= 8)
                    {
                        direction.d = CHASE.AI.Direction.DownLeft;
                    }
                    else if (direction.d == CHASE.AI.Direction.DownLeft && index >= 72 && index <= 80)
                    {
                        direction.d = CHASE.AI.Direction.UpLeft;
                    }
                    else if (direction.d == CHASE.AI.Direction.DownRight && index >= 72 && index <= 80)
                    {
                        direction.d = CHASE.AI.Direction.UpRight;
                    }
                }

                // Move one tile
                index = CHASE.AI.Position.getIndexInDirection(index, direction.d);

                if (index == -1)
                {
                    return -1;
                }

                // Our move ends on either a blank tile or another piece (which we can capture or bump)
                if (i == distance)
                {
                    return index;
                }

                // Did we hit another piece (blue or red) before the end of our distance?
                if (position.tiles[index] != 0)
                {
                    return -1;
                }

                // Check to see if we landed on the chamber
                if (index == 40)
                {
                    return -1;
                }
            }

            return -1;
        },
		
		// Get all the valid moves in a position
        getValidMoves: function(position)
        {
			var player = position.playerToMove;
            var moves = [];
            var destination;

            // We must first distribute points if a piece was just captured
            if (position.pointsToDistribute > 0)
            {
                // Find our lowest valued piece
                var smallest = 6;
                for (var i = 0; i < 81; i++)
                {
					if (position.playerToMove == CHASE.AI.Player.Blue && position.tiles[i] > 0)
					{
						smallest = Math.min(smallest, position.tiles[i]);
					}
					else if (position.playerToMove == CHASE.AI.Player.Red && position.tiles[i] < 0)
					{
						smallest = Math.min(smallest, -position.tiles[i]);
					}
				}

                // Find out how what the new value of this piece will be and if we have any points left over
                var maxTo = 6 - smallest;
                var max = Math.min(maxTo, position.pointsToDistribute);

                if (player == CHASE.AI.Player.Red)
                {
                    smallest *= -1;
                }

                // If the smallest value piece we have is a 6 then we don't want to generate invalid moves
                if (max > 0)
                {
                    // Find all the pieces with this minimum value and create a move
                    for (var i = 0; i < 81; i++)
                    {
                        if (position.tiles[i] == smallest)
                        {
                            moves.push(
                            {
                                fromIndex: -1,
                                toIndex: i,
                                increment: max,
                                finalDirection: -1
                            });
                        }
                    }
                }
            }
            else
            {
                // Physical moves
                for (var i = 0; i < 81; i++)
                {
                    // A piece can never reside on the chamber
                    if (i == 40)
                    {
                        continue;
                    }

                    // There's a piece on this tile
                    if (position.tiles[i] != 0)
                    {
                        // Only look for moves for the player whose turn it is to move
                        if ((player == CHASE.AI.Player.Blue && position.tiles[i] > 0) || (player == CHASE.AI.Player.Red && position.tiles[i] < 0))
                        {
							for (var direction = 0; direction < 6; direction++)
                            {
                                // Find physical moves
                                // Move in a direction for as many tiles as the value of the die on that tile
                                var movement = {d: direction};
                                destination = CHASE.AI.Position.getDestinationIndexIfValidMove(position, i, movement, Math.abs(position.tiles[i]), false);

                                if (destination != -1)
                                {
                                    moves.push(
                                    {
                                        fromIndex: i,
                                        toIndex: destination,
                                        increment: 0,
                                        finalDirection: movement.d
                                    });
                                }

                                // Find point distribution moves
                                if (position.tiles[i] > 1 || position.tiles[i] < -1)
                                {
                                    destination = CHASE.AI.Position.getDestinationIndexIfValidMove(position, i, movement, 1, false);

                                    if (destination != -1)
                                    {
                                        if (Math.abs(position.tiles[destination]) < 10)
                                        {
                                            if ((position.tiles[destination] > 0 && position.tiles[i] > 0) || (position.tiles[destination] < 0 && position.tiles[i] < 0))
                                            {
                                                // Figure out what we're allowed to transfer
                                                var maxFrom = Math.abs(position.tiles[i]) - 1;
                                                var maxTo = 6 - Math.abs(position.tiles[destination]);
                                                var max = Math.min(maxFrom, maxTo);

                                                // Create a move for each possible point transfer
                                                for (var points = 1; points <= max; points++)
                                                {
                                                    moves.push(
                                                    {
                                                        fromIndex: i,
                                                        toIndex: destination,
                                                        increment: points,
                                                        finalDirection: movement.d
                                                    });
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }

            return moves;
        },
		
		// Count the pieces for a given player on the board
        countPieces: function(position, player)
        {
            var count = 0;
            for (var i = 0; i < 81; i++)
            {
                if ((position.tiles[i] > 0 && player == CHASE.AI.Player.Blue) || (position.tiles[i] < 0 && player == CHASE.AI.Player.Red))
                {
                    count++;
                }
            }
            return count;
        },
		
		// Make a move on the main board
        makeMove: function(move)
        {
			CHASE.AI.Position.makeMoveInternal(CHASE.AI.Board, move, true, -1);
			CHASE.AI.LastMove = move;
		},
		
		// Make a move on a board
        makeMoveInternal: function(position, move, firstLevel, basePieceCount)
        {
            var opponent = position.playerToMove == CHASE.AI.Player.Blue ? CHASE.AI.Player.Red : CHASE.AI.Player.Blue;

            if (move.increment > 0)
            {
                if (move.fromIndex >= 0)
                {
                    // We're moving points from one die to an adjacent die
                    position.tiles[move.toIndex] += position.tiles[move.toIndex] > 0 ? move.increment : -move.increment;
                    position.tiles[move.fromIndex] -= position.tiles[move.fromIndex] > 0 ? move.increment : -move.increment;
                }
                else
                {
                    // We're adding points to a die after another one of our dice was captured
                    position.tiles[move.toIndex] += position.tiles[move.toIndex] > 0 ? move.increment : -move.increment;

                    // We've distributed at least some of the points
                    position.pointsToDistribute -= move.increment;

                    // It's still our turn after adding points to a piece
                    opponent = position.playerToMove;
                }
            }
            else
            {
                // Count my pieces (before clearing it in the next step)
                if (basePieceCount < 0)
                {
                    basePieceCount = CHASE.AI.Position.countPieces(position, position.playerToMove);
                }

                // Store the piece we're moving and clear the source tile
                var sourcePiece = position.tiles[move.fromIndex];
                position.tiles[move.fromIndex] = 0;

                // Are we bumping another one of our pieces?
                if ((sourcePiece > 0 && position.tiles[move.toIndex] > 0) || (sourcePiece < 0 && position.tiles[move.toIndex] < 0))
                {
                    // Figure out what move needs to be made to move the bumbed piece
                    var direction = {d: move.finalDirection};
                    var targetIndex = CHASE.AI.Position.getDestinationIndexIfValidMove(position, move.toIndex, direction, 1, true);
                    var bumpMove = 
                    {
                        fromIndex: move.toIndex,
                        toIndex: targetIndex,
                        increment: 0,
                        finalDirection: direction.d
                    };

                    // Recursively make the bump move(s)
                    CHASE.AI.Position.makeMoveInternal(position, bumpMove, false, basePieceCount);
                }

                // Are we capturing an enemy piece?
                if ((sourcePiece > 0 && position.tiles[move.toIndex] < 0) || (sourcePiece < 0 && position.tiles[move.toIndex] > 0))
                {
                    // Keep track of how many points the enemy will need to distribute to other die
                    position.pointsToDistribute += Math.abs(position.tiles[move.toIndex]);
                }

                // Are we landing on the chamber?
                if (move.toIndex == 40)
                {
                    // Figure out the point split
                    var sourcePieceValue = Math.abs(sourcePiece);
                    var leftValue = Math.ceil(sourcePieceValue / 2.0);
                    var rightValue = leftValue * 2 > sourcePieceValue ? leftValue - 1 : leftValue;

                    // If we're at the piece limit, just slide to the left
                    if (basePieceCount >= 10)
                    {
                        leftValue = sourcePieceValue;
                        rightValue = 0;
                    }

                    // Figure out the destination tiles based on the direction we were going when we landed on the chamber, and move new pieces there
                    var leftIndex = -1;
                    var rightIndex = -1;
                    var leftDirection = -1;
                    var rightDirection = -1;
                    switch (move.finalDirection)
                    {
                        case CHASE.AI.Direction.DownLeft:
                            leftIndex = 41;
                            rightIndex = 31;
                            leftDirection = CHASE.AI.Direction.Right;
                            rightDirection = CHASE.AI.Direction.UpLeft;
                            break;
                        case CHASE.AI.Direction.UpLeft:
                            leftIndex = 49;
                            rightIndex = 41;
                            leftDirection = CHASE.AI.Direction.DownLeft;
                            rightDirection = CHASE.AI.Direction.Right;
                            break;
                        case CHASE.AI.Direction.DownRight:
                            leftIndex = 32;
                            rightIndex = 39;
                            leftDirection = CHASE.AI.Direction.UpRight;
                            rightDirection = CHASE.AI.Direction.Left;
                            break;
                        case CHASE.AI.Direction.UpRight:
                            leftIndex = 39;
                            rightIndex = 50;
                            leftDirection = CHASE.AI.Direction.Left;
                            rightDirection = CHASE.AI.Direction.DownRight;
                            break;
                        case CHASE.AI.Direction.Left:
                            leftIndex = 50;
                            rightIndex = 32;
                            leftDirection = CHASE.AI.Direction.UpLeft;
                            rightDirection = CHASE.AI.Direction.DownLeft;
                            break;
                        case CHASE.AI.Direction.Right:
                            leftIndex = 31;
                            rightIndex = 49;
                            leftDirection = CHASE.AI.Direction.DownRight;
                            rightDirection = CHASE.AI.Direction.UpRight;
                            break;
                    }

                    // Create the new tiles and them recursively move them (in case they need to bump or capture)
                    position.tiles[40] = sourcePiece > 0 ? leftValue : -leftValue;
                    var leftMove = 
                    {
                        fromIndex: 40,
                        toIndex: leftIndex,
                        increment: 0,
                        finalDirection: leftDirection
                    };
                    CHASE.AI.Position.makeMoveInternal(position, leftMove, false, basePieceCount);
                    if (rightValue > 0)
                    {
                        position.tiles[40] = sourcePiece > 0 ? rightValue : -rightValue;
                        var rightMove =
                        {
                            fromIndex: 40,
                            toIndex: rightIndex,
                            increment: 0,
                            finalDirection: rightDirection
                        };
                        CHASE.AI.Position.makeMoveInternal(position, rightMove, false, basePieceCount);
                    }
                }

                if (move.toIndex != 40)
                {
                    // Assume the move is valid and go ahead and make it
                    position.tiles[move.toIndex] = sourcePiece;
                }
            }

            // It's now the other player's turn to move
            position.playerToMove = opponent;
            // MovesHistory = string.IsNullOrEmpty(MovesHistory) ? move.ToString() : MovesHistory + " " + move.ToString(); // TODO

			// TODO
            // if (pastPositions == null)
            // {
                // pastPositions = new ulong[Constants.MaxPreviousHashes];
                // lastHashIndex = 0;
            // }

			// TODO
            // if (firstLevel)
            // {
                // pastPositions[lastHashIndex] = GetHash();
                // lastHashIndex = (lastHashIndex + 1) % Constants.MaxPreviousHashes;
            // }
        }
	}
};