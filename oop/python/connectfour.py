"""ConnectFour concrete game — Move is a bare int (column to drop).

Parameterized on (rows, cols, need) so the same code covers the standard
6x7-need-4 game and small variants useful for benchmarking optimal play
(e.g. 4x4-need-3). The full 6x7 game is far beyond a naive minimax.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import List, Optional

from game import Game, Side


@dataclass(frozen=True)
class ConnectFourUndo:
    col: int
    row: int                  # row the piece was placed in
    prev_winner: Optional[Side]


class ConnectFour(Game):
    def __init__(self, rows: int = 6, cols: int = 7, need: int = 4):
        self._rows = rows
        self._cols = cols
        self._need = need
        self._cells: List[List[str]] = [["."] * cols for _ in range(rows)]
        self._current: Side = Side.ONE
        self._winner: Optional[Side] = None

    @staticmethod
    def _mark(side: Side) -> str:
        return "X" if side is Side.ONE else "O"

    def _run(self, r: int, c: int, dr: int, dc: int, mark: str) -> int:
        """Count consecutive marks in one direction, exclusive of (r,c)."""
        n = 0
        for i in range(1, self._need):
            rr, cc = r + dr * i, c + dc * i
            if not (0 <= rr < self._rows and 0 <= cc < self._cols):
                break
            if self._cells[rr][cc] != mark:
                break
            n += 1
        return n

    def _check_win_at(self, r: int, c: int) -> bool:
        m = self._cells[r][c]
        for dr, dc in [(0, 1), (1, 0), (1, 1), (1, -1)]:
            if 1 + self._run(r, c, dr, dc, m) + self._run(r, c, -dr, -dc, m) >= self._need:
                return True
        return False

    def legal_moves(self) -> List[int]:
        if self._winner is not None:
            return []
        return [c for c in range(self._cols) if self._cells[0][c] == "."]

    def apply_move(self, col: int) -> ConnectFourUndo:
        prev_winner = self._winner
        # Find lowest empty row in this column.
        row = self._rows - 1
        while row >= 0 and self._cells[row][col] != ".":
            row -= 1
        self._cells[row][col] = self._mark(self._current)
        if self._check_win_at(row, col):
            self._winner = self._current
        self._current = self._current.other()
        return ConnectFourUndo(col, row, prev_winner)

    def undo_move(self, undo: ConnectFourUndo) -> None:
        self._cells[undo.row][undo.col] = "."
        self._winner = undo.prev_winner
        self._current = self._current.other()

    def current_side(self) -> Side:
        return self._current

    def is_over(self) -> bool:
        return self._winner is not None or not self.legal_moves()

    def winner(self) -> Optional[Side]:
        return self._winner

    def state_key(self) -> int:
        # rows*cols cells * 2 bits + 1 side bit. Empty=0, X=1, O=2.
        k = 0
        i = 0
        for r in range(self._rows):
            for c in range(self._cols):
                ch = self._cells[r][c]
                v = 0 if ch == "." else (1 if ch == "X" else 2)
                k |= v << (2 * i)
                i += 1
        k |= (0 if self._current is Side.ONE else 1) << (2 * i)
        return k

    def render(self) -> str:
        lines = ["|" + "|".join(self._cells[r]) + "|" for r in range(self._rows)]
        lines.append(" " + " ".join(str(c) for c in range(self._cols)))
        return "\n".join(lines)

    def move_to_string(self, col: int) -> str:
        return f"col {col}"
