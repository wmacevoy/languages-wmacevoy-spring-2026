// Driver:
//   ./games           one demo match per game with RandomPlayers
//   ./games --bench   silent Optimal-vs-Optimal benchmark, prints
//                     wall-clock time + cache size per game
//
// This file does NOT know about the internals of any game. It only talks
// through the Game / Player interfaces. Adding a new game means writing
// the game file and adding a section here.

#include <chrono>
#include <iostream>
#include <string>

#include "connectfour.h"
#include "engine.h"
#include "nim.h"
#include "player.h"
#include "tictactoe.h"

static void demo() {
    std::cout << "========== Tic-Tac-Toe ==========\n";
    {
        TicTacToe game;
        RandomPlayer<TicTacToeMove, TicTacToeUndo> p1(1, "Random-1"), p2(2, "Random-2");
        runGame<TicTacToeMove, TicTacToeUndo>(game, {&p1, &p2});
    }

    std::cout << "\n========== Connect Four ==========\n";
    {
        ConnectFour game;
        RandomPlayer<int, ConnectFourUndo> p1(3, "Random-1"), p2(4, "Random-2");
        runGame<int, ConnectFourUndo>(game, {&p1, &p2});
    }

    std::cout << "\n========== Nim (piles 3,4,5) ==========\n";
    {
        Nim game({3, 4, 5});
        RandomPlayer<NimMove, NimUndo> p1(5, "Random-1"), p2(6, "Random-2");
        runGame<NimMove, NimUndo>(game, {&p1, &p2});
    }
}

template <typename MoveT, typename UndoT, typename G>
static void benchOne(const std::string& name, G& game) {
    OptimalPlayer<MoveT, UndoT> p1("Opt-1"), p2("Opt-2");
    auto t0 = std::chrono::steady_clock::now();
    auto winner = runGame<MoveT, UndoT>(game, {&p1, &p2}, /*verbose=*/false);
    auto elapsed = std::chrono::duration<double>(std::chrono::steady_clock::now() - t0).count();
    std::string result = winner ? sideName(*winner) : std::string("Draw");
    auto cache = p1.cacheSize() + p2.cacheSize();

    std::printf("  %-28s %7.3fs  cache=%7zu  result=%s\n",
                name.c_str(), elapsed, cache, result.c_str());
}

static void bench() {
    std::cout << "========== Benchmark: Optimal vs Optimal ==========\n";
    { TicTacToe   g;            benchOne<TicTacToeMove, TicTacToeUndo>("Tic-Tac-Toe", g); }
    { Nim         g({3, 4, 5}); benchOne<NimMove, NimUndo>("Nim(3,4,5)", g); }
    { ConnectFour g(4, 4, 3);   benchOne<int, ConnectFourUndo>("ConnectFour 4x4 need 3", g); }
}

int main(int argc, char** argv) {
    bool wantBench = false;
    int  repeat    = 1;
    for (int i = 1; i < argc; ++i) {
        std::string a = argv[i];
        if      (a == "--bench")                    wantBench = true;
        else if (a == "--repeat" && i + 1 < argc)   repeat = std::stoi(argv[++i]);
    }
    if (wantBench) {
        for (int i = 0; i < repeat; ++i) bench();
    } else {
        demo();
    }
    return 0;
}
