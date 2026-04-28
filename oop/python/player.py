"""Concrete strategies: RandomPlayer + OptimalPlayer.

Python idiom notes:
    - The Strategy pattern here is almost invisible: a class with one
      method. In smaller Python code you might just use a function/lambda;
      we keep the class form to mirror the other languages.
    - OptimalPlayer is generic in the same sense Game is: it never names
      a concrete game type. It calls legal_moves / apply_move / undo_move /
      is_over / winner / current_side / state_key. The whole search lives
      on the Game contract.
"""

from __future__ import annotations

import random

from game import Game, Player, Side


class RandomPlayer(Player):
    def __init__(self, seed: int, label: str = "Random"):
        # A private RNG instance keeps this player's randomness independent
        # of other players and of the global random module.
        self._rng = random.Random(seed)
        self._label = label

    def choose_move(self, game: Game):
        return self._rng.choice(list(game.legal_moves()))

    @property
    def name(self) -> str:
        return self._label


class OptimalPlayer(Player):
    """Negamax with explicit transposition table.

    Returns from search are (outcome, depth) pairs from the *side to move*'s
    perspective:
      - outcome ∈ {-1, 0, +1}  (loss, draw, win under optimal play)
      - depth = plies-to-terminal under optimal play

    Move selection is fully deterministic:
      1. Maximize outcome.
      2. On a tied outcome, minimize depth when winning (finish fast)
         and maximize depth when tying or losing (drag it out).
      3. On full ties, take the first move legal_moves() yielded.

    The cache is keyed on game.state_key() — a compact integer per game,
    not a render string, so no formatting cost in the search loop.
    """

    def __init__(self, label: str = "Optimal"):
        self._label = label
        self._cache: dict[int, tuple[int, int]] = {}

    @property
    def name(self) -> str:
        return self._label

    def choose_move(self, game: Game):
        best_value: tuple[int, int] | None = None
        best_move = None
        for move in game.legal_moves():
            undo = game.apply_move(move)
            opp_outcome, opp_depth = self._search(game)
            game.undo_move(undo)
            value = (-opp_outcome, opp_depth + 1)
            if best_value is None or self._better(value, best_value):
                best_value = value
                best_move = move
        return best_move

    def _search(self, game: Game) -> tuple[int, int]:
        if game.is_over():
            w = game.winner()
            if w is None:
                return (0, 0)
            # Our games flip current_side at the end of apply_move, so when
            # the game is over with a winner, the side to move is the loser.
            return (-1, 0)

        key = game.state_key()
        cached = self._cache.get(key)
        if cached is not None:
            return cached

        best: tuple[int, int] | None = None
        for move in game.legal_moves():
            undo = game.apply_move(move)
            opp_outcome, opp_depth = self._search(game)
            game.undo_move(undo)
            value = (-opp_outcome, opp_depth + 1)
            if best is None or self._better(value, best):
                best = value

        # `best` is non-None: legal_moves was non-empty (game not over).
        self._cache[key] = best  # type: ignore[assignment]
        return best  # type: ignore[return-value]

    @staticmethod
    def _better(a: tuple[int, int], b: tuple[int, int]) -> bool:
        # Higher outcome wins. On ties: shorter depth when winning,
        # longer depth when tying or losing. Strict — equal returns False
        # so the first-encountered candidate is kept (determinism).
        if a[0] != b[0]:
            return a[0] > b[0]
        if a[0] > 0:
            return a[1] < b[1]
        return a[1] > b[1]
