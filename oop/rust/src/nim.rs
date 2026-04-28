// Nim with Move = NimMove { pile, count } and Undo = NimUndo.
//
// Nim's state is a Vec<usize>, not a grid — proof that our Game trait
// didn't accidentally bake in 2D-grid assumptions. The engine treats Nim
// exactly the same as TicTacToe.

use crate::game::{Game, Side};

#[derive(Clone, Copy, Debug)]
pub struct NimMove {
    pub pile: usize,
    pub count: usize,
}

#[derive(Clone, Copy, Debug)]
pub struct NimUndo {
    pub pile: usize,
    pub count: usize,
    pub prev_winner: Option<Side>,
}

pub struct Nim {
    piles: Vec<usize>,
    current: Side,
    winner: Option<Side>,
}

impl Nim {
    pub fn new(piles: Vec<usize>) -> Self {
        Self { piles, current: Side::One, winner: None }
    }
}

impl Game for Nim {
    type Move = NimMove;
    type Undo = NimUndo;

    fn legal_moves(&self) -> Vec<Self::Move> {
        if self.winner.is_some() {
            return Vec::new();
        }
        let mut v = Vec::new();
        for (p, &size) in self.piles.iter().enumerate() {
            for k in 1..=size {
                v.push(NimMove { pile: p, count: k });
            }
        }
        v
    }

    fn apply_move(&mut self, m: &Self::Move) -> Self::Undo {
        let prev_winner = self.winner;
        self.piles[m.pile] -= m.count;
        // Normal-play convention: whoever takes the last stone wins.
        if self.piles.iter().all(|&n| n == 0) {
            self.winner = Some(self.current);
        }
        self.current = self.current.other();
        NimUndo { pile: m.pile, count: m.count, prev_winner }
    }

    fn undo_move(&mut self, undo: Self::Undo) {
        self.piles[undo.pile] += undo.count;
        self.winner = undo.prev_winner;
        self.current = self.current.other();
    }

    fn current_side(&self) -> Side { self.current }
    fn is_over(&self) -> bool { self.winner.is_some() }
    fn winner(&self) -> Option<Side> { self.winner }

    fn state_key(&self) -> u64 {
        // 8 bits per pile (handles up to 255) + side bit. Caller must
        // keep piles.len() <= 7 to fit in u64.
        let mut k: u64 = 0;
        for (i, &n) in self.piles.iter().enumerate() {
            k |= ((n as u64) & 0xFF) << (8 * i);
        }
        k |= (if self.current == Side::One { 0u64 } else { 1u64 }) << (8 * self.piles.len());
        k
    }

    fn render(&self) -> String {
        let mut s = String::new();
        for (i, &n) in self.piles.iter().enumerate() {
            s.push_str(&format!("  pile {}: ", i));
            for _ in 0..n { s.push_str("* "); }
            s.push_str(&format!("({})\n", n));
        }
        s
    }

    fn move_to_string(&self, m: &Self::Move) -> String {
        format!("take {} from pile {}", m.count, m.pile)
    }
}
