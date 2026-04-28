// Driver:
//   java -jar games.jar           one demo match per game with RandomPlayers
//   java -jar games.jar --bench   silent Optimal-vs-Optimal benchmark
//                                 prints wall-clock time + cache size per game

package games

fun demo() {
    println("========== Tic-Tac-Toe ==========")
    runGame(
        TicTacToe(),
        RandomPlayer<TicTacToeMove, TicTacToeUndo>(1L, "Random-1") to
            RandomPlayer<TicTacToeMove, TicTacToeUndo>(2L, "Random-2"),
    )

    println("\n========== Connect Four ==========")
    runGame(
        ConnectFour(),
        RandomPlayer<Int, ConnectFourUndo>(3L, "Random-1") to
            RandomPlayer<Int, ConnectFourUndo>(4L, "Random-2"),
    )

    println("\n========== Nim (piles 3,4,5) ==========")
    runGame(
        Nim(listOf(3, 4, 5)),
        RandomPlayer<NimMove, NimUndo>(5L, "Random-1") to
            RandomPlayer<NimMove, NimUndo>(6L, "Random-2"),
    )
}

private fun <M, U> benchOne(name: String, game: Game<M, U>) {
    val p1 = OptimalPlayer<M, U>("Opt-1")
    val p2 = OptimalPlayer<M, U>("Opt-2")
    val t0 = System.nanoTime()
    val winner = runGame(game, p1 to p2, verbose = false)
    val elapsed = (System.nanoTime() - t0) / 1e9
    val result = winner?.label ?: "Draw"
    val cache = p1.cacheSize + p2.cacheSize
    println("  ${name.padEnd(28)} %7.3fs  cache=%7d  result=%s".format(elapsed, cache, result))
}

fun bench() {
    println("========== Benchmark: Optimal vs Optimal ==========")
    benchOne("Tic-Tac-Toe", TicTacToe())
    benchOne("Nim(3,4,5)", Nim(listOf(3, 4, 5)))
    benchOne("ConnectFour 4x4 need 3", ConnectFour(rows = 4, cols = 4, need = 3))
}

fun main(args: Array<String>) {
    if (args.contains("--bench")) {
        val ri = args.indexOf("--repeat")
        val repeat = if (ri >= 0 && ri + 1 < args.size) args[ri + 1].toInt() else 1
        repeat(repeat) { bench() }
    } else {
        demo()
    }
}
