"""Driver: one match of each game, two RandomPlayers.

Run:  python3 main.py
"""

from connectfour import ConnectFour
from game import run_game
from nim import Nim
from player import RandomPlayer
from tictactoe import TicTacToe


def main() -> None:
    print("========== Tic-Tac-Toe ==========")
    run_game(TicTacToe(), [RandomPlayer(1, "Random-1"), RandomPlayer(2, "Random-2")])

    print("\n========== Connect Four ==========")
    run_game(ConnectFour(), [RandomPlayer(3, "Random-1"), RandomPlayer(4, "Random-2")])

    print("\n========== Nim (piles 3,4,5) ==========")
    run_game(Nim([3, 4, 5]), [RandomPlayer(5, "Random-1"), RandomPlayer(6, "Random-2")])


if __name__ == "__main__":
    main()
