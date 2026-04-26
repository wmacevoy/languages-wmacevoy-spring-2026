"""RandomPlayer: uniform random over legal moves.

Python idiom notes:
    - The Strategy pattern here is almost invisible: a class with one
      method. In smaller Python code you might just use a function/lambda;
      we keep the class form to mirror the other languages.
"""

from __future__ import annotations

import random

from game import Game, Player


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
