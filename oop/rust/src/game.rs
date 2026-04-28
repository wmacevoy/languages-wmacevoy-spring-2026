// The Game trait + Player trait + engine loop.
//
// Rust idiom notes:
//   - No inheritance. Where C++ used `class Game<MoveT>` as an abstract
//     base, Rust uses a `trait Game` with TWO associated types: `Move`
//     (player-facing) and `Undo` (engine-facing for unmoving in search).
//     Each concrete game picks both by implementing the trait.
//   - `Player<M, U>` is a trait with two generic type parameters — we
//     bind them to the game's associated types at call sites.
//   - `Option<Side>` is the natural winner return type — no null.
//   - `Side` is a plain enum; `#[derive(...)]` generates Copy/Eq/Debug
//     with zero ceremony. Contrast with C++'s explicit `enum class`.
//   - Runtime polymorphism comes from `&mut dyn Player<M, U>` trait objects.

#[derive(Copy, Clone, Debug, PartialEq, Eq)]
pub enum Side {
    One,
    Two,
}

impl Side {
    pub fn other(self) -> Side {
        match self {
            Side::One => Side::Two,
            Side::Two => Side::One,
        }
    }
    pub fn name(self) -> &'static str {
        match self {
            Side::One => "Player 1",
            Side::Two => "Player 2",
        }
    }
}

// `impl Game for TicTacToe` says "TicTacToe satisfies this contract";
// there is no parent-class relationship involved. apply_move returns an
// Undo of whatever shape the game needs; undo_move reverses it.
pub trait Game {
    type Move: Clone;
    type Undo;

    fn legal_moves(&self) -> Vec<Self::Move>;
    fn apply_move(&mut self, m: &Self::Move) -> Self::Undo;
    fn undo_move(&mut self, undo: Self::Undo);

    fn current_side(&self) -> Side;
    fn is_over(&self) -> bool;
    fn winner(&self) -> Option<Side>;

    /// Compact integer key for transposition tables. Must include the
    /// side to move and uniquely distinguish reachable states.
    fn state_key(&self) -> u64;

    fn render(&self) -> String;
    fn move_to_string(&self, m: &Self::Move) -> String;
}

// A Player is parameterized by the Move and Undo types it plays through.
// A strategy MAY mutate the game during search but MUST leave it in the
// same state on return. RandomPlayer never mutates; OptimalPlayer does
// apply/undo inside its search loop.
pub trait Player<M, U> {
    fn choose_move(&mut self, game: &mut dyn Game<Move = M, Undo = U>) -> M;
    fn name(&self) -> &str;
}

// The engine. Generic over any Game G. `players` is a pair of trait
// objects — the runtime-polymorphism moment.
pub fn run_game<G: Game>(
    game: &mut G,
    players: [&mut dyn Player<G::Move, G::Undo>; 2],
    verbose: bool,
) -> Option<Side> {
    if verbose {
        println!("{}", game.render());
    }

    let [p1, p2] = players;

    while !game.is_over() {
        let side = game.current_side();
        let m = match side {
            Side::One => p1.choose_move(&mut *game),
            Side::Two => p2.choose_move(&mut *game),
        };
        if verbose {
            let who = match side {
                Side::One => p1.name(),
                Side::Two => p2.name(),
            };
            println!(
                "{} ({}) plays {}",
                side.name(),
                who,
                game.move_to_string(&m)
            );
        }
        // Discard the Undo: the engine plays the move forward, no rewind.
        let _undo = game.apply_move(&m);
        if verbose {
            println!("{}", game.render());
        }
    }

    let w = game.winner();
    if verbose {
        match w {
            Some(s) => println!("{} wins!", s.name()),
            None => println!("Draw."),
        }
    }
    w
}
