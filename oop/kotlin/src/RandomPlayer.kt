// RandomPlayer: uniform-random over legal moves.
//
// Kotlin idiom notes:
//   - `class RandomPlayer<M, U>(...)` carries both Game type parameters
//     so it satisfies Player<M, U>. The U is unused at runtime but needs
//     to appear in the signature.
//   - `kotlin.random.Random(seed)` is the standard seeded RNG; using
//     a private instance keeps each player's stream independent.

package games

import kotlin.random.Random

class RandomPlayer<M, U>(
    seed: Long,
    override val name: String = "Random",
) : Player<M, U> {
    private val rng = Random(seed)

    override fun chooseMove(game: Game<M, U>): M {
        val moves = game.legalMoves()
        return moves[rng.nextInt(moves.size)]
    }
}
