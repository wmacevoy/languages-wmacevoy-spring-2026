// Driver: run one match of each game with two RandomPlayers.
//
// This file does NOT know about the internals of any game. It only talks
// through the Game<MoveT> / Player<MoveT> interfaces. If we added Reversi
// tomorrow, main.cpp would change in one place: a new section calling
// runGame on it.

#include <iostream>

#include "connectfour.h"
#include "engine.h"
#include "nim.h"
#include "player.h"
#include "tictactoe.h"

int main() {
    std::cout << "========== Tic-Tac-Toe ==========\n";
    {
        TicTacToe game;
        RandomPlayer<TicTacToeMove> p1(1, "Random-1"), p2(2, "Random-2");
        runGame<TicTacToeMove>(game, {&p1, &p2});
    }

    std::cout << "\n========== Connect Four ==========\n";
    {
        ConnectFour game;
        RandomPlayer<int> p1(3, "Random-1"), p2(4, "Random-2");
        runGame<int>(game, {&p1, &p2});
    }

    std::cout << "\n========== Nim (piles 3,4,5) ==========\n";
    {
        Nim game({3, 4, 5});
        RandomPlayer<NimMove> p1(5, "Random-1"), p2(6, "Random-2");
        runGame<NimMove>(game, {&p1, &p2});
    }
    return 0;
}
