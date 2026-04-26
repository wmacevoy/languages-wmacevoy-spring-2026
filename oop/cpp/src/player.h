#pragma once

// Player<MoveT> is the abstract strategy. Two concrete strategies below.
//
// C++ idiom notes:
//   - We take Game<MoveT> by const& so strategies cannot mutate the game.
//   - RandomPlayer owns an RNG — this highlights RAII: the RNG lives as
//     long as the player does, no init/teardown ceremony.
//   - Inheritance + override is how we get the Strategy pattern.

#include <random>
#include <string>

#include "game.h"

template <typename MoveT>
class Player {
public:
    virtual ~Player() = default;
    virtual MoveT       chooseMove(const Game<MoveT>& game) = 0;
    virtual std::string name() const = 0;
};

template <typename MoveT>
class RandomPlayer : public Player<MoveT> {
public:
    explicit RandomPlayer(unsigned seed, std::string label = "Random")
        : rng_(seed), label_(std::move(label)) {}

    MoveT chooseMove(const Game<MoveT>& game) override {
        auto moves = game.legalMoves();
        std::uniform_int_distribution<size_t> dist(0, moves.size() - 1);
        return moves[dist(rng_)];
    }

    std::string name() const override { return label_; }

private:
    std::mt19937 rng_;
    std::string  label_;
};
