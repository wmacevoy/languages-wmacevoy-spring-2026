// ConnectFour with Move = usize (column index), Undo = ConnectFourUndo.
//
// Parameterized on (rows, cols, need) so the same code covers the
// standard 6x7-need-4 game and small variants useful for benchmarking
// optimal play (e.g. 4x4-need-3). Full 6x7 is far beyond a naive minimax
// and is left as a hook for richer search strategies.

use crate::game::{Game, Side};

#[derive(Clone, Copy, Debug)]
pub struct ConnectFourUndo {
    pub col: usize,
    pub row: usize,
    pub prev_winner: Option<Side>,
}

pub struct ConnectFour {
    rows: usize,
    cols: usize,
    need: usize,
    cells: Vec<char>,                // row-major, length rows*cols
    current: Side,
    winner: Option<Side>,
}

impl ConnectFour {
    pub fn new() -> Self {
        Self::with_size(6, 7, 4)
    }

    pub fn with_size(rows: usize, cols: usize, need: usize) -> Self {
        Self {
            rows, cols, need,
            cells: vec!['.'; rows * cols],
            current: Side::One,
            winner: None,
        }
    }

    fn idx(&self, r: usize, c: usize) -> usize { r * self.cols + c }
    fn at(&self, r: usize, c: usize) -> char { self.cells[self.idx(r, c)] }

    fn mark(s: Side) -> char {
        if s == Side::One { 'X' } else { 'O' }
    }

    // Count consecutive `m`s in direction (dr,dc) from (r,c), exclusive.
    fn run(&self, r: isize, c: isize, dr: isize, dc: isize, m: char) -> usize {
        let mut n = 0;
        for i in 1..self.need as isize {
            let rr = r + dr * i;
            let cc = c + dc * i;
            if rr < 0 || rr >= self.rows as isize || cc < 0 || cc >= self.cols as isize {
                break;
            }
            if self.at(rr as usize, cc as usize) != m { break; }
            n += 1;
        }
        n
    }

    fn check_win_at(&self, r: usize, c: usize) -> bool {
        let m = self.at(r, c);
        let dirs: [(isize, isize); 4] = [(0, 1), (1, 0), (1, 1), (1, -1)];
        for (dr, dc) in dirs {
            let a = self.run(r as isize, c as isize, dr, dc, m);
            let b = self.run(r as isize, c as isize, -dr, -dc, m);
            if 1 + a + b >= self.need { return true; }
        }
        false
    }
}

impl Default for ConnectFour {
    fn default() -> Self { Self::new() }
}

impl Game for ConnectFour {
    type Move = usize;
    type Undo = ConnectFourUndo;

    fn legal_moves(&self) -> Vec<Self::Move> {
        if self.winner.is_some() {
            return Vec::new();
        }
        (0..self.cols).filter(|&c| self.at(0, c) == '.').collect()
    }

    fn apply_move(&mut self, col: &Self::Move) -> Self::Undo {
        let col = *col;
        let prev_winner = self.winner;
        let mut row = self.rows - 1;
        while self.at(row, col) != '.' {
            if row == 0 { break; }
            row -= 1;
        }
        let idx = self.idx(row, col);
        self.cells[idx] = Self::mark(self.current);
        if self.check_win_at(row, col) {
            self.winner = Some(self.current);
        }
        self.current = self.current.other();
        ConnectFourUndo { col, row, prev_winner }
    }

    fn undo_move(&mut self, undo: Self::Undo) {
        let idx = self.idx(undo.row, undo.col);
        self.cells[idx] = '.';
        self.winner = undo.prev_winner;
        self.current = self.current.other();
    }

    fn current_side(&self) -> Side { self.current }
    fn is_over(&self) -> bool { self.winner.is_some() || self.legal_moves().is_empty() }
    fn winner(&self) -> Option<Side> { self.winner }

    fn state_key(&self) -> u64 {
        // rows*cols cells * 2 bits + 1 side bit. Caller must keep
        // rows*cols <= 31 for u64. Benchmark uses 4x4 = 16 cells = 33 bits.
        let mut k: u64 = 0;
        let mut i = 0;
        for r in 0..self.rows {
            for c in 0..self.cols {
                let v: u64 = match self.at(r, c) { '.' => 0, 'X' => 1, _ => 2 };
                k |= v << (2 * i);
                i += 1;
            }
        }
        k |= (if self.current == Side::One { 0u64 } else { 1u64 }) << (2 * i);
        k
    }

    fn render(&self) -> String {
        let mut s = String::new();
        for r in 0..self.rows {
            s.push('|');
            for c in 0..self.cols {
                s.push(self.at(r, c));
                s.push('|');
            }
            s.push('\n');
        }
        s.push(' ');
        for c in 0..self.cols {
            s.push_str(&format!("{} ", c));
        }
        s.push('\n');
        s
    }

    fn move_to_string(&self, col: &Self::Move) -> String {
        format!("col {}", col)
    }
}
