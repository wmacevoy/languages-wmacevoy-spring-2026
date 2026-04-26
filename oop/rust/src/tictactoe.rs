// TicTacToe implements Game with Move = (row, col).
//
// Rust idiom notes:
//   - The Move type is a plain struct with `#[derive(Clone)]` — no
//     constructor boilerplate. C++ required us to spell out the struct;
//     the Rust derive handles Copy, Clone, Debug for free.
//   - State lives in the struct; `impl Game for TicTacToe` fills in the
//     behavior. This is analogous to C++'s class body + member functions
//     but with the data and behavior definitions visibly separate.

use crate::game::{Game, Side};

#[derive(Clone, Copy, Debug)]
pub struct TicTacToeMove {
    pub row: usize,
    pub col: usize,
}

pub struct TicTacToe {
    cells: [char; 9],          // ' ', 'X', or 'O'
    current: Side,
    winner: Option<Side>,
}

impl TicTacToe {
    pub fn new() -> Self {
        Self { cells: [' '; 9], current: Side::One, winner: None }
    }

    fn mark(s: Side) -> char {
        if s == Side::One { 'X' } else { 'O' }
    }

    fn check_win_at(&self, r: usize, c: usize) -> bool {
        let m = self.cells[r * 3 + c];
        let row = (0..3).all(|cc| self.cells[r * 3 + cc] == m);
        let col = (0..3).all(|rr| self.cells[rr * 3 + c] == m);
        let d1 = (r == c) && (0..3).all(|i| self.cells[i * 3 + i] == m);
        let d2 = (r + c == 2) && (0..3).all(|i| self.cells[i * 3 + (2 - i)] == m);
        row || col || d1 || d2
    }
}

impl Default for TicTacToe {
    fn default() -> Self { Self::new() }
}

impl Game for TicTacToe {
    type Move = TicTacToeMove;

    fn legal_moves(&self) -> Vec<Self::Move> {
        if self.winner.is_some() {
            return Vec::new();
        }
        let mut v = Vec::new();
        for r in 0..3 {
            for c in 0..3 {
                if self.cells[r * 3 + c] == ' ' {
                    v.push(TicTacToeMove { row: r, col: c });
                }
            }
        }
        v
    }

    fn apply_move(&mut self, m: &Self::Move) {
        self.cells[m.row * 3 + m.col] = Self::mark(self.current);
        if self.check_win_at(m.row, m.col) {
            self.winner = Some(self.current);
        }
        self.current = self.current.other();
    }

    fn current_side(&self) -> Side { self.current }
    fn is_over(&self) -> bool { self.winner.is_some() || self.legal_moves().is_empty() }
    fn winner(&self) -> Option<Side> { self.winner }

    fn render(&self) -> String {
        let mut s = String::new();
        for r in 0..3 {
            for c in 0..3 {
                s.push(' ');
                s.push(self.cells[r * 3 + c]);
                if c < 2 { s.push_str(" |"); }
            }
            s.push('\n');
            if r < 2 { s.push_str("---+---+---\n"); }
        }
        s
    }

    fn move_to_string(&self, m: &Self::Move) -> String {
        format!("(r{},c{})", m.row, m.col)
    }
}
