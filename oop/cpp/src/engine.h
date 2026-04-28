#pragma once

// Engine: a free function template that drives any Game<MoveT, UndoT>
// to completion.
//
// Design note: we could have put this on the Game base as a member.
// Keeping it free keeps Game purely about rules/state and Engine purely
// about the game loop — single responsibility. The price in C++ is that
// we have to carry both type parameters through the template signature.

#include <array>
#include <iostream>
#include <optional>

#include "game.h"
#include "player.h"

template <typename MoveT, typename UndoT>
std::optional<Side> runGame(Game<MoveT, UndoT>&                  game,
                            std::array<Player<MoveT, UndoT>*, 2> players,
                            bool                                 verbose = true) {
    if (verbose) std::cout << game.render() << "\n";

    while (!game.isOver()) {
        Side current = game.currentSide();
        Player<MoveT, UndoT>* strategy = players[current == Side::One ? 0 : 1];
        MoveT move = strategy->chooseMove(game);

        if (verbose) {
            std::cout << sideName(current) << " (" << strategy->name()
                      << ") plays " << game.moveToString(move) << "\n";
        }
        // Discard the Undo: the engine plays moves forward, no rewind.
        (void)game.applyMove(move);
        if (verbose) std::cout << game.render() << "\n";
    }

    auto w = game.winner();
    if (verbose) {
        if (w) std::cout << sideName(*w) << " wins!\n";
        else   std::cout << "Draw.\n";
    }
    return w;
}
