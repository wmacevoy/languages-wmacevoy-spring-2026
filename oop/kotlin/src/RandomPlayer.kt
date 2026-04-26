// RandomPlayer: uniform-random over legal moves.
//
// Kotlin idiom notes:
//   - `class RandomPlayer<M>(seed: Long, override val name: String)` —
//     primary constructor in the class header, no separate body needed.
//   - `kotlin.random.Random(seed)` is the standard seeded RNG; using
//     a private instance keeps each player's stream independent.

package games

import kotlin.random.Random

class RandomPlayer<M>(
    seed: Long,
    override val name: String = "Random",
) : Player<M> {
    private val rng = Random(seed)

    override fun chooseMove(game: Game<M>): M {
        val moves = game.legalMoves()
        return moves[rng.nextInt(moves.size)]
    }
}
