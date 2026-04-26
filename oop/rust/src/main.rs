// Driver: runs one match of each game with two RandomPlayers.
//
// Observe: `run_game` knows nothing about any specific game. It takes
// anything that `impl Game`. Swapping in a new game means writing the
// game file and adding a section here.

mod connectfour;
mod game;
mod nim;
mod player;
mod rng;
mod tictactoe;

use crate::connectfour::ConnectFour;
use crate::game::run_game;
use crate::nim::Nim;
use crate::player::RandomPlayer;
use crate::tictactoe::TicTacToe;

fn main() {
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
