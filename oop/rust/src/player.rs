// RandomPlayer: a strategy that picks a legal move uniformly at random.
//
// Because Player<M> is a trait with a generic M, RandomPlayer is itself
// generic in M. In C++ this was `RandomPlayer<MoveT>`; the concept is
// the same, the syntax just moves the type parameter.

use crate::game::{Game, Player};
use crate::rng::XorShift64;

pub struct RandomPlayer {
    rng: XorShift64,
    label: String,
}

impl RandomPlayer {
    pub fn new(seed: u64, label: &str) -> Self {
        Self { rng: XorShift64::new(seed), label: label.to_string() }
    }
}

// The impl block is where we tie RandomPlayer to Player for *any* Move
// type M that is Clone. The blanket-style `impl<M: Clone> Player<M> for
// RandomPlayer` says "I don't care what moves look like, I just pick one."
// That is something C++ templates do more implicitly via duck-typed
// instantiation; Rust forces us to state the M: Clone bound up front.
impl<M: Clone> Player<M> for RandomPlayer {
    fn choose_move(&mut self, game: &dyn Game<Move = M>) -> M {
        let moves = game.legal_moves();
        let i = self.rng.range(moves.len());
        moves[i].clone()
    }
    fn name(&self) -> &str {
        &self.label
    }
}
