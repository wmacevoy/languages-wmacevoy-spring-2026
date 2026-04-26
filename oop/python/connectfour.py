"""ConnectFour concrete game — Move is a bare int (column to drop)."""

from __future__ import annotations

from typing import List, Optional

from game import Game, Side


ROWS = 6
COLS = 7
NEED = 4


class ConnectFour(Game):
    def __init__(self):
        self._cells: List[List[str]] = [["."] * COLS for _ in range(ROWS)]
        self._current: Side = Side.ONE
        self._winner: Optional[Side] = None

    @staticmethod
    def _mark(side: Side) -> str:
        return "X" if side is Side.ONE else "O"

    def _run(self, r: int, c: int, dr: int, dc: int, mark: str) -> int:
        """Count consecutive marks in one direction, exclusive of (r,c)."""
        n = 0
        for i in range(1, NEED):
            rr, cc = r + dr * i, c + dc * i
            if not (0 <= rr < ROWS and 0 <= cc < COLS):
                break
            if self._cells[rr][cc] != mark:
                break
            n += 1
        return n

    def _check_win_at(self, r: int, c: int) -> bool:
        m = self._cells[r][c]
        for dr, dc in [(0, 1), (1, 0), (1, 1), (1, -1)]:
            if 1 + self._run(r, c, dr, dc, m) + self._run(r, c, -dr, -dc, m) >= NEED:
                return True
        return False

    def legal_moves(self) -> List[int]:
        if self._winner is not None:
            return []
        return [c for c in range(COLS) if self._cells[0][c] == "."]

    def apply_move(self, col: int) -> None:
        # Find lowest empty row in this column.
        row = ROWS - 1
        while row >= 0 and self._cells[row][col] != ".":
            row -= 1
        self._cells[row][col] = self._mark(self._current)
        if self._check_win_at(row, col):
            self._winner = self._current
        self._current = self._current.other()

    def current_side(self) -> Side:
        return self._current

    def is_over(self) -> bool:
        return self._winner is not None or not self.legal_moves()

    def winner(self) -> Optional[Side]:
        return self._winner

    def render(self) -> str:
        lines = ["|" + "|".join(self._cells[r]) + "|" for r in range(ROWS)]
        lines.append(" " + " ".join(str(c) for c in range(COLS)))
        return "\n".join(lines)

    def move_to_string(self, col: int) -> str:
        return f"col {col}"
