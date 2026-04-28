"""Nim concrete game — state is a list of pile sizes, not a grid."""

from __future__ import annotations

from dataclasses import dataclass
from typing import List, Optional

from game import Game, Side


@dataclass(frozen=True)
class NimMove:
    pile: int
    count: int


@dataclass(frozen=True)
class NimUndo:
    pile: int
    count: int
    prev_winner: Optional[Side]


class Nim(Game):
    def __init__(self, piles: List[int]):
        self._piles = list(piles)
        self._current: Side = Side.ONE
        self._winner: Optional[Side] = None

    def legal_moves(self) -> List[NimMove]:
        if self._winner is not None:
            return []
        return [NimMove(p, k)
                for p, size in enumerate(self._piles)
                for k in range(1, size + 1)]

    def apply_move(self, move: NimMove) -> NimUndo:
        prev_winner = self._winner
        self._piles[move.pile] -= move.count
        # Normal play: last stone taken wins.
        if all(n == 0 for n in self._piles):
            self._winner = self._current
        self._current = self._current.other()
        return NimUndo(move.pile, move.count, prev_winner)

    def undo_move(self, undo: NimUndo) -> None:
        self._piles[undo.pile] += undo.count
        self._winner = undo.prev_winner
        self._current = self._current.other()

    def current_side(self) -> Side:
        return self._current

    def is_over(self) -> bool:
        return self._winner is not None

    def winner(self) -> Optional[Side]:
        return self._winner

    def state_key(self) -> int:
        # 8 bits per pile (handles piles up to 255) + 1 side bit on top.
        # Python ints are arbitrary precision so no overflow concerns.
        k = 0
        for i, n in enumerate(self._piles):
            k |= n << (8 * i)
        k |= (0 if self._current is Side.ONE else 1) << (8 * len(self._piles))
        return k

    def render(self) -> str:
        lines = []
        for i, n in enumerate(self._piles):
            stars = "* " * n
            lines.append(f"  pile {i}: {stars}({n})")
        return "\n".join(lines)

    def move_to_string(self, move: NimMove) -> str:
        return f"take {move.count} from pile {move.pile}"
