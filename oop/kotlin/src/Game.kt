// Game + Player interfaces and the engine loop.
//
// Kotlin idiom notes:
//   - `interface Game<M, U>` carries TWO type parameters: the Move type
//     (what a player chooses) and the Undo type (what the engine needs
//     to revert). This is closer to Rust's two associated types on a
//     trait than to a single generic Java interface — the Undo type is
//     part of the game's contract, not an internal detail.
//   - `enum class Side` is more powerful than C++ enums: it can have
//     methods (we put `other()` and `label` right on it).
//   - `Side?` is the "winner or none" type — Kotlin's null-safety means
//     this is a real type-system distinction, like Rust's Option.
//   - Top-level functions are first-class. `runGame` is a free function,
//     not pinned to any class.

package games

enum class Side(val label: String) {
    ONE("Player 1"),
    TWO("Player 2");

    fun other(): Side = if (this == ONE) TWO else ONE
}

// The Game interface. M = move type (player-facing), U = undo type
// (engine-facing). applyMove returns a U; undoMove(u) reverts.
interface Game<M, U> {
    fun legalMoves(): List<M>
    fun applyMove(move: M): U
    fun undoMove(undo: U)

    fun currentSide(): Side
    fun isOver(): Boolean
    fun winner(): Side?

    // Compact integer key for transposition / memoization. Must include
    // the side to move and uniquely distinguish reachable states.
    fun stateKey(): Long

    fun render(): String
    fun moveToString(move: M): String
}

// Strategy: receive a (mutable) Game, return a move. A strategy MAY
// mutate the game during search but MUST leave it in the same state on
// return. RandomPlayer never mutates; OptimalPlayer applies+undos.
interface Player<M, U> {
    fun chooseMove(game: Game<M, U>): M
    val name: String
}

// The engine. <M, U> propagate the Move and Undo types from the Game
// to the Players.
fun <M, U> runGame(
    game: Game<M, U>,
    players: Pair<Player<M, U>, Player<M, U>>,
    verbose: Boolean = true,
): Side? {
    if (verbose) println(game.render())

    while (!game.isOver()) {
        val side = game.currentSide()
        val strategy = if (side == Side.ONE) players.first else players.second
        val move = strategy.chooseMove(game)
        if (verbose) {
            println("${side.label} (${strategy.name}) plays ${game.moveToString(move)}")
        }
        game.applyMove(move)
        if (verbose) println(game.render())
    }

    val w = game.winner()
    if (verbose) {
        println(if (w != null) "${w.label} wins!" else "Draw.")
    }
    return w
}
