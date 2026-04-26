// ConnectFour with Move = usize (column index).
//
// Note the trait impl block: by choosing a different associated `type Move`
// per game, we reuse the same engine without inheritance or type erasure.
// This is what Rust's "associated types" were designed for.

use crate::game::{Game, Side};

const ROWS: usize = 6;
const COLS: usize = 7;
const NEED: usize = 4;

pub struct ConnectFour {
    cells: [[char; COLS]; ROWS],
    current: Side,
    winner: Option<Side>,
}

impl ConnectFour {
    pub fn new() -> Self {
        Self { cells: [['.'; COLS]; ROWS], current: Side::One, winner: None }
    }

    fn mark(s: Side) -> char {
        if s == Side::One { 'X' } else { 'O' }
    }

    // Count consecutive `m`s in direction (dr,dc) from (r,c), exclusive.
    fn run(&self, r: isize, c: isize, dr: isize, dc: isize, m: char) -> usize {
        let mut n = 0;
        for i in 1..NEED as isize {
            let rr = r + dr * i;
            let cc = c + dc * i;
            if rr < 0 || rr >= ROWS as isize || cc < 0 || cc >= COLS as isize {
                break;
            }
            if self.cells[rr as usize][cc as usize] != m { break; }
            n += 1;
        }
        n
    }

    fn check_win_at(&self, r: usize, c: usize) -> bool {
        let m = self.cells[r][c];
        let dirs: [(isize, isize); 4] = [(0, 1), (1, 0), (1, 1), (1, -1)];
        for (dr, dc) in dirs {
            let a = self.run(r as isize, c as isize, dr, dc, m);
            let b = self.run(r as isize, c as isize, -dr, -dc, m);
            if 1 + a + b >= NEED { return true; }
        }
        false
    }
}

impl Default for ConnectFour {
    fn default() -> Self { Self::new() }
}

impl Game for ConnectFour {
    type Move = usize;

    fn legal_moves(&self) -> Vec<Self::Move> {
        if self.winner.is_some() {
            return Vec::new();
        }
        (0..COLS).filter(|&c| self.cells[0][c] == '.').collect()
    }

    fn apply_move(&mut self, col: &Self::Move) {
        let col = *col;
        // Find lowest empty cell in this column.
        let mut row = ROWS - 1;
        while self.cells[row][col] != '.' {
            if row == 0 { break; }
            row -= 1;
        }
        self.cells[row][col] = Self::mark(self.current);
        if self.check_win_at(row, col) {
            self.winner = Some(self.current);
        }
        self.current = self.current.other();
    }

    fn current_side(&self) -> Side { self.current }
    fn is_over(&self) -> bool { self.winner.is_some() || self.legal_moves().is_empty() }
    fn winner(&self) -> Option<Side> { self.winner }

    fn render(&self) -> String {
        let mut s = String::new();
        for r in 0..ROWS {
            s.push('|');
            for c in 0..COLS {
                s.push(self.cells[r][c]);
                s.push('|');
            }
            s.push('\n');
        }
        s.push(' ');
        for c in 0..COLS {
            s.push_str(&format!("{} ", c));
        }
        s.push('\n');
        s
    }

    fn move_to_string(&self, col: &Self::Move) -> String {
        format!("col {}", col)
    }
}
