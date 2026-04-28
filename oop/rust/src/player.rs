// Two strategies: RandomPlayer + OptimalPlayer.
//
// RandomPlayer is the obvious one — uniform over legal moves.
// OptimalPlayer is a deterministic, memoized negamax. The whole search
// only ever calls trait methods on Game, so it works for any concrete
// game implementing the trait.

use std::collections::HashMap;

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

// `impl<M: Clone, U> Player<M, U> for RandomPlayer` says "I don't care
// what moves or undos look like, I just pick a move and never apply it."
// The Undo parameter is part of the Player trait signature even though
// RandomPlayer never uses it.
impl<M: Clone, U> Player<M, U> for RandomPlayer {
    fn choose_move(&mut self, game: &mut dyn Game<Move = M, Undo = U>) -> M {
        let moves = game.legal_moves();
        let i = self.rng.range(moves.len());
        moves[i].clone()
    }
    fn name(&self) -> &str {
        &self.label
    }
}

/// Deterministic negamax with explicit transposition table.
///
/// Search returns `(outcome, depth)` from the side-to-move's perspective:
///   outcome ∈ {-1, 0, +1}  (loss, draw, win under optimal play)
///   depth   = plies-to-terminal under optimal play
///
/// Move selection:
///   1. Maximize outcome.
///   2. On a tied outcome, minimize depth when winning (finish fast)
///      and maximize depth when tying or losing (drag it out).
///   3. On full ties, take the first move legal_moves() yielded.
///
/// The cache is keyed on `game.state_key()` — a u64, not a render
/// string — so the search loop allocates only what apply/undo cost.
pub struct OptimalPlayer {
    label: String,
    cache: HashMap<u64, (i8, u32)>,
}

impl OptimalPlayer {
    pub fn new(label: &str) -> Self {
        Self { label: label.to_string(), cache: HashMap::new() }
    }

    pub fn cache_size(&self) -> usize { self.cache.len() }

    fn better(a: (i8, u32), b: (i8, u32)) -> bool {
        if a.0 != b.0 { return a.0 > b.0; }
        if a.0 > 0 { a.1 < b.1 } else { a.1 > b.1 }
    }

    fn search<M: Clone, U>(&mut self, game: &mut dyn Game<Move = M, Undo = U>) -> (i8, u32) {
        if game.is_over() {
            return match game.winner() {
                None => (0, 0),
                // Our games flip current_side at the end of apply_move,
                // so when the game is over with a winner, the side to
                // move is the loser.
                Some(_) => (-1, 0),
            };
        }

        let key = game.state_key();
        if let Some(&v) = self.cache.get(&key) {
            return v;
        }

        let moves = game.legal_moves();
        let mut best: Option<(i8, u32)> = None;
        for m in &moves {
            let undo = game.apply_move(m);
            let (oo, od) = self.search(game);
            game.undo_move(undo);
            let value = (-oo, od + 1);
            if best.is_none() || Self::better(value, best.unwrap()) {
                best = Some(value);
            }
        }

        let v = best.unwrap();  // legal_moves was non-empty (game not over)
        self.cache.insert(key, v);
        v
    }
}

impl<M: Clone, U> Player<M, U> for OptimalPlayer {
    fn choose_move(&mut self, game: &mut dyn Game<Move = M, Undo = U>) -> M {
        let moves = game.legal_moves();
        let mut best: Option<(i8, u32)> = None;
        let mut best_move: Option<M> = None;
        for m in &moves {
            let undo = game.apply_move(m);
            let (oo, od) = self.search(game);
            game.undo_move(undo);
            let value = (-oo, od + 1);
            if best.is_none() || Self::better(value, best.unwrap()) {
                best = Some(value);
                best_move = Some(m.clone());
            }
        }
        best_move.unwrap()
    }
    fn name(&self) -> &str {
        &self.label
    }
}
