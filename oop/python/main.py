"""Driver.

  python3 main.py             one demo match per game with RandomPlayers
  python3 main.py --bench     silent Optimal-vs-Optimal benchmark, prints
                              wall-clock time + nodes searched per game
"""

import sys
import time

from connectfour import ConnectFour
from game import run_game
from nim import Nim
from player import OptimalPlayer, RandomPlayer
from tictactoe import TicTacToe


def demo() -> None:
    print("========== Tic-Tac-Toe ==========")
    run_game(TicTacToe(), [RandomPlayer(1, "Random-1"), RandomPlayer(2, "Random-2")])

    print("\n========== Connect Four ==========")
    run_game(ConnectFour(), [RandomPlayer(3, "Random-1"), RandomPlayer(4, "Random-2")])

    print("\n========== Nim (piles 3,4,5) ==========")
    run_game(Nim([3, 4, 5]), [RandomPlayer(5, "Random-1"), RandomPlayer(6, "Random-2")])


def bench() -> None:
    configs = [
        ("Tic-Tac-Toe",            lambda: TicTacToe()),
        ("Nim(3,4,5)",             lambda: Nim([3, 4, 5])),
        ("ConnectFour 4x4 need 3", lambda: ConnectFour(rows=4, cols=4, need=3)),
    ]
    print("========== Benchmark: Optimal vs Optimal ==========")
    for name, factory in configs:
        game = factory()
        p1 = OptimalPlayer("Opt-1")
        p2 = OptimalPlayer("Opt-2")
        t0 = time.perf_counter()
        winner = run_game(game, [p1, p2], verbose=False)
        elapsed = time.perf_counter() - t0
        cache_size = len(p1._cache) + len(p2._cache)
        result = winner.label if winner else "Draw"
        print(f"  {name:28s} {elapsed:7.3f}s  cache={cache_size:7d}  result={result}")


def main() -> None:
    args = sys.argv[1:]
    if "--bench" in args:
        # --repeat N runs the bench suite N times in this process. The outer
        # harness times the whole invocation; running multiple iterations in
        # one process amortizes startup cost so per-iteration cost can be
        # extracted by differencing against a 1-iteration run.
        repeat = 1
        if "--repeat" in args:
            i = args.index("--repeat")
            repeat = int(args[i + 1])
        for _ in range(repeat):
            bench()
    else:
        demo()


if __name__ == "__main__":
    main()
