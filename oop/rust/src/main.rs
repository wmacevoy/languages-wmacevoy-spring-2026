// Driver:
//   cargo run                one demo match per game with RandomPlayers
//   cargo run -- --bench     silent Optimal-vs-Optimal benchmark
//                            prints wall-clock time + cache size per game

mod connectfour;
mod game;
mod nim;
mod player;
mod rng;
mod tictactoe;

use std::time::Instant;

use crate::connectfour::ConnectFour;
use crate::game::{run_game, Game};
use crate::nim::Nim;
use crate::player::{OptimalPlayer, RandomPlayer};
use crate::tictactoe::TicTacToe;

fn demo() {
    println!("========== Tic-Tac-Toe ==========");
    {
        let mut game = TicTacToe::new();
        let mut p1 = RandomPlayer::new(1, "Random-1");
        let mut p2 = RandomPlayer::new(2, "Random-2");
        run_game(&mut game, [&mut p1, &mut p2], true);
    }

    println!("\n========== Connect Four ==========");
    {
        let mut game = ConnectFour::new();
        let mut p1 = RandomPlayer::new(3, "Random-1");
        let mut p2 = RandomPlayer::new(4, "Random-2");
        run_game(&mut game, [&mut p1, &mut p2], true);
    }

    println!("\n========== Nim (piles 3,4,5) ==========");
    {
        let mut game = Nim::new(vec![3, 4, 5]);
        let mut p1 = RandomPlayer::new(5, "Random-1");
        let mut p2 = RandomPlayer::new(6, "Random-2");
        run_game(&mut game, [&mut p1, &mut p2], true);
    }
}

fn bench_one<G: Game>(name: &str, mut game: G) {
    let mut p1 = OptimalPlayer::new("Opt-1");
    let mut p2 = OptimalPlayer::new("Opt-2");
    let t0 = Instant::now();
    let winner = run_game(&mut game, [&mut p1, &mut p2], false);
    let elapsed = t0.elapsed().as_secs_f64();
    let result = match winner { Some(s) => s.name().to_string(), None => "Draw".into() };
    let cache = p1.cache_size() + p2.cache_size();
    println!("  {:<28} {:>7.3}s  cache={:>7}  result={}", name, elapsed, cache, result);
}

fn bench() {
    println!("========== Benchmark: Optimal vs Optimal ==========");
    bench_one("Tic-Tac-Toe", TicTacToe::new());
    bench_one("Nim(3,4,5)", Nim::new(vec![3, 4, 5]));
    bench_one("ConnectFour 4x4 need 3", ConnectFour::with_size(4, 4, 3));
}

fn main() {
    let args: Vec<String> = std::env::args().collect();
    let want_bench = args.iter().any(|a| a == "--bench");
    let repeat: u32 = args.iter()
        .position(|a| a == "--repeat")
        .and_then(|i| args.get(i + 1))
        .and_then(|s| s.parse().ok())
        .unwrap_or(1);
    if want_bench {
        for _ in 0..repeat { bench(); }
    } else {
        demo();
    }
}
