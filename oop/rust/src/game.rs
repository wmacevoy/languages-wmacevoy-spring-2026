// The Game trait + Player trait + engine loop.
//
// Rust idiom notes:
//   - No inheritance. Where C++ used `class Game<MoveT>` as an abstract
//     base, Rust uses a `trait Game` with an ASSOCIATED TYPE `Move`.
//     Each concrete game picks its own Move type by implementing the trait.
//   - `Player<M>` is a trait with a generic type parameter — we bind it
//     to the game's Move type at call sites.
//   - `Option<Side>` is the natural winner return type — no null.
//   - `Side` is a plain enum; `#[derive(...)]` generates Copy/Eq/Debug
//     with zero ceremony. Contrast with C++'s explicit `enum class`.
//   - Runtime polymorphism comes from `&mut dyn Player<M>` trait objects.

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
// there is no parent-class relationship involved.
pub trait Game {
    type Move: Clone;

    fn legal_moves(&self) -> Vec<Self::Move>;
    fn apply_move(&mut self, m: &Self::Move);

    fn current_side(&self) -> Side;
    fn is_over(&self) -> bool;
    fn winner(&self) -> Option<Side>;

    fn render(&self) -> String;
    fn move_to_string(&self, m: &Self::Move) -> String;
}

// A Player is parameterized by the Move type it plays. A generic parameter
// (rather than an associated type) lets the engine match a Game's Move
// with two Players' Move at the call site.
pub trait Player<M> {
    // Strategies receive only a shared (&) reference to the game, so they
    // cannot mutate it. We pass `&dyn Game<Move = M>` to make this a
    // runtime-polymorphic view: any game whose Move type matches fits.
    fn choose_move(&mut self, game: &dyn Game<Move = M>) -> M;
    fn name(&self) -> &str;
}

// The engine. Generic over any Game G. `players` is a pair of trait
// objects — the runtime-polymorphism moment.
pub fn run_game<G: Game>(
    game: &mut G,
    players: [&mut dyn Player<G::Move>; 2],
    verbose: bool,
) -> Option<Side> {
    if verbose {
        println!("{}", game.render());
    }

    let [p1, p2] = players;

    while !game.is_over() {
        let side = game.current_side();
        // Explicit shared reborrow: we hand the strategy a read-only view.
        // This ends before apply_move, so no borrow conflict.
        let m = match side {
            Side::One => p1.choose_move(&*game),
            Side::Two => p2.choose_move(&*game),
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
        game.apply_move(&m);
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
