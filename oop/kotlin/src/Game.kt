// Game + Player interfaces and the engine loop.
//
// Kotlin idiom notes:
//   - `interface Game<M>` is the natural fit. Kotlin generics map closely
//     to Java's, but the syntax is lighter and there are no raw types.
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

// The Game interface. Each concrete game picks its own Move type via the
// generic parameter <M>. Compare with Rust's `type Move` associated type;
// the difference is mostly cosmetic.
interface Game<M> {
    fun legalMoves(): List<M>
    fun applyMove(move: M)

    fun currentSide(): Side
    fun isOver(): Boolean
    fun winner(): Side?

    fun render(): String
    fun moveToString(move: M): String
}

// Strategy: receive a Game, return a move.
interface Player<M> {
    fun chooseMove(game: Game<M>): M
    val name: String
}

// The engine. `<M>` propagates the Move type from the Game to the Players.
fun <M> runGame(
    game: Game<M>,
    players: Pair<Player<M>, Player<M>>,
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
