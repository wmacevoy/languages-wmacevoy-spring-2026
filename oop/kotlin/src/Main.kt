// Driver: one match of each game with two RandomPlayers.

package games

fun main() {
    println("========== Tic-Tac-Toe ==========")
    runGame(
        TicTacToe(),
        RandomPlayer<TicTacToeMove>(1L, "Random-1") to RandomPlayer<TicTacToeMove>(2L, "Random-2"),
    )

    println("\n========== Connect Four ==========")
    runGame(
        ConnectFour(),
        RandomPlayer<Int>(3L, "Random-1") to RandomPlayer<Int>(4L, "Random-2"),
    )

    println("\n========== Nim (piles 3,4,5) ==========")
    runGame(
        Nim(listOf(3, 4, 5)),
        RandomPlayer<NimMove>(5L, "Random-1") to RandomPlayer<NimMove>(6L, "Random-2"),
    )
}
