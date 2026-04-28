"""TicTacToe concrete game.

Python idiom notes:
    - We use @dataclass(frozen=True) for both Move and Undo — value types
      with equality and hashing for free.
    - The board is a flat list of 9 chars. No Board class; a list is enough.
    - The Undo token captures only the bits apply_move changes: which cell
      was filled, and what the winner field was before. current_side flips
      back via .other() — no need to record it.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import List, Optional

from game import Game, Side


@dataclass(frozen=True)
class TicTacToeMove:
    row: int
    col: int


@dataclass(frozen=True)
class TicTacToeUndo:
    cell: int                 # 0..8 — flat index into the board
    prev_winner: Optional[Side]


class TicTacToe(Game):
    def __init__(self):
        self._cells: List[str] = [" "] * 9
        self._current: Side = Side.ONE
        self._winner: Optional[Side] = None

    @staticmethod
    def _mark(side: Side) -> str:
        return "X" if side is Side.ONE else "O"

    def _check_win_at(self, r: int, c: int) -> bool:
        m = self._cells[r * 3 + c]
        row = all(self._cells[r * 3 + cc] == m for cc in range(3))
        col = all(self._cells[rr * 3 + c] == m for rr in range(3))
        d1 = (r == c) and all(self._cells[i * 3 + i] == m for i in range(3))
        d2 = (r + c == 2) and all(self._cells[i * 3 + (2 - i)] == m for i in range(3))
        return row or col or d1 or d2

    def legal_moves(self) -> List[TicTacToeMove]:
        if self._winner is not None:
            return []
        return [TicTacToeMove(r, c)
                for r in range(3) for c in range(3)
                if self._cells[r * 3 + c] == " "]

    def apply_move(self, move: TicTacToeMove) -> TicTacToeUndo:
        cell = move.row * 3 + move.col
        prev_winner = self._winner
        self._cells[cell] = self._mark(self._current)
        if self._check_win_at(move.row, move.col):
            self._winner = self._current
        self._current = self._current.other()
        return TicTacToeUndo(cell, prev_winner)

    def undo_move(self, undo: TicTacToeUndo) -> None:
        self._cells[undo.cell] = " "
        self._winner = undo.prev_winner
        self._current = self._current.other()

    def current_side(self) -> Side:
        return self._current

    def is_over(self) -> bool:
        return self._winner is not None or not self.legal_moves()

    def winner(self) -> Optional[Side]:
        return self._winner

    def state_key(self) -> int:
        # 9 cells * 2 bits + 1 side bit = 19 bits total. Empty=0, X=1, O=2.
        k = 0
        for i, ch in enumerate(self._cells):
            v = 0 if ch == " " else (1 if ch == "X" else 2)
            k |= v << (2 * i)
        k |= (0 if self._current is Side.ONE else 1) << 18
        return k

    def render(self) -> str:
        out = []
        for r in range(3):
            row = " " + " | ".join(self._cells[r * 3 + c] for c in range(3))
            out.append(row)
            if r < 2:
                out.append("---+---+---")
        return "\n".join(out)

    def move_to_string(self, move: TicTacToeMove) -> str:
        return f"(r{move.row},c{move.col})"
