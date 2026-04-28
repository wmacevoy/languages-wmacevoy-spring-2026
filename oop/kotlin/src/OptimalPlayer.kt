// OptimalPlayer: deterministic negamax with explicit transposition table.
//
// Search returns Pair(outcome, depth) from the side-to-move's perspective:
//   outcome ∈ {-1, 0, +1}  (loss, draw, win under optimal play)
//   depth   = plies-to-terminal under optimal play
//
// Move selection is fully deterministic:
//   1. Maximize outcome.
//   2. On a tied outcome, minimize depth when winning (finish fast)
//      and maximize depth when tying or losing (drag it out).
//   3. On full ties, take the first move legalMoves() yielded.
//
// The cache is keyed on game.stateKey() — a Long, not a render string —
// so the search loop allocates only what apply/undo cost.

package games

class OptimalPlayer<M, U>(
    override val name: String = "Optimal",
) : Player<M, U> {

    private val cache = HashMap<Long, IntArray>()  // key -> [outcome, depth]

    val cacheSize: Int get() = cache.size

    override fun chooseMove(game: Game<M, U>): M {
        var bestOutcome = Int.MIN_VALUE
        var bestDepth = 0
        var bestMove: M? = null
        for (move in game.legalMoves()) {
            val undo = game.applyMove(move)
            val (oppOutcome, oppDepth) = search(game)
            game.undoMove(undo)
            val outcome = -oppOutcome
            val depth = oppDepth + 1
            if (bestMove == null || better(outcome, depth, bestOutcome, bestDepth)) {
                bestOutcome = outcome
                bestDepth = depth
                bestMove = move
            }
        }
        return bestMove!!
    }

    // Returns (outcome, depth) for the side to move at the current state.
    private fun search(game: Game<M, U>): Pair<Int, Int> {
        if (game.isOver()) {
            val w = game.winner() ?: return 0 to 0
            // Our games flip currentSide at the end of applyMove, so when
            // the game is over with a winner, the side to move is the loser.
            return -1 to 0
        }

        val key = game.stateKey()
        cache[key]?.let { return it[0] to it[1] }

        var bestOutcome = Int.MIN_VALUE
        var bestDepth = 0
        var seen = false
        for (move in game.legalMoves()) {
            val undo = game.applyMove(move)
            val (oppOutcome, oppDepth) = search(game)
            game.undoMove(undo)
            val outcome = -oppOutcome
            val depth = oppDepth + 1
            if (!seen || better(outcome, depth, bestOutcome, bestDepth)) {
                bestOutcome = outcome
                bestDepth = depth
                seen = true
            }
        }

        cache[key] = intArrayOf(bestOutcome, bestDepth)
        return bestOutcome to bestDepth
    }

    private fun better(aOutcome: Int, aDepth: Int, bOutcome: Int, bDepth: Int): Boolean {
        if (aOutcome != bOutcome) return aOutcome > bOutcome
        return if (aOutcome > 0) aDepth < bDepth else aDepth > bDepth
    }
}
