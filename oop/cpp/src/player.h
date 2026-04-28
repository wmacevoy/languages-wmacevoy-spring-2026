#pragma once

// Player<MoveT, UndoT> is the abstract strategy. Two concrete strategies
// below: RandomPlayer and OptimalPlayer.
//
// C++ idiom notes:
//   - We take Game by non-const reference because OptimalPlayer needs to
//     apply/undo during search. The contract: a strategy MAY mutate the
//     game while choosing, but MUST leave it in the same state on return.
//   - RandomPlayer owns an RNG — RAII: the RNG lives as long as the
//     player does, no init/teardown ceremony.
//   - OptimalPlayer keeps a transposition table keyed on game.stateKey().

#include <cstdint>
#include <random>
#include <string>
#include <unordered_map>
#include <utility>

#include "game.h"

template <typename MoveT, typename UndoT>
class Player {
public:
    virtual ~Player() = default;
    virtual MoveT       chooseMove(Game<MoveT, UndoT>& game) = 0;
    virtual std::string name() const = 0;
};

template <typename MoveT, typename UndoT>
class RandomPlayer : public Player<MoveT, UndoT> {
public:
    explicit RandomPlayer(unsigned seed, std::string label = "Random")
        : rng_(seed), label_(std::move(label)) {}

    MoveT chooseMove(Game<MoveT, UndoT>& game) override {
        auto moves = game.legalMoves();
        std::uniform_int_distribution<size_t> dist(0, moves.size() - 1);
        return moves[dist(rng_)];
    }

    std::string name() const override { return label_; }

private:
    std::mt19937 rng_;
    std::string  label_;
};

// Deterministic negamax with explicit transposition table.
//
// Search returns a pair {outcome, depth} from the side-to-move's
// perspective:
//   outcome ∈ {-1, 0, +1}  (loss, draw, win under optimal play)
//   depth   = plies-to-terminal under optimal play
//
// Move selection:
//   1. Maximize outcome.
//   2. On a tied outcome, minimize depth when winning (finish fast)
//      and maximize depth when tying or losing (drag it out).
//   3. On full ties, take the first move legalMoves() yielded.
//
// The cache is keyed on game.stateKey() — a uint64_t, not a render
// string — so the hot path allocates only what apply/undo cost.
template <typename MoveT, typename UndoT>
class OptimalPlayer : public Player<MoveT, UndoT> {
public:
    explicit OptimalPlayer(std::string label = "Optimal")
        : label_(std::move(label)) {}

    MoveT chooseMove(Game<MoveT, UndoT>& game) override {
        auto moves = game.legalMoves();
        Value best{};
        bool  seen = false;
        MoveT bestMove = moves.front();
        for (const auto& m : moves) {
            UndoT undo = game.applyMove(m);
            Value opp  = search(game);
            game.undoMove(undo);
            Value v{static_cast<int8_t>(-opp.outcome), opp.depth + 1};
            if (!seen || better(v, best)) {
                best = v;
                bestMove = m;
                seen = true;
            }
        }
        return bestMove;
    }

    std::string name() const override { return label_; }

    size_t cacheSize() const { return cache_.size(); }

private:
    struct Value { int8_t outcome; uint32_t depth; };

    static bool better(Value a, Value b) {
        if (a.outcome != b.outcome) return a.outcome > b.outcome;
        if (a.outcome > 0) return a.depth < b.depth;
        return a.depth > b.depth;
    }

    Value search(Game<MoveT, UndoT>& game) {
        if (game.isOver()) {
            auto w = game.winner();
            if (!w) return {0, 0};
            // Our games flip currentSide at the end of applyMove, so when
            // the game is over with a winner, the side to move is the loser.
            return {-1, 0};
        }

        uint64_t key = game.stateKey();
        auto it = cache_.find(key);
        if (it != cache_.end()) return it->second;

        auto  moves = game.legalMoves();
        Value best{};
        bool  seen = false;
        for (const auto& m : moves) {
            UndoT undo = game.applyMove(m);
            Value opp  = search(game);
            game.undoMove(undo);
            Value v{static_cast<int8_t>(-opp.outcome), opp.depth + 1};
            if (!seen || better(v, best)) {
                best = v;
                seen = true;
            }
        }
        cache_.emplace(key, best);
        return best;
    }

    std::string                          label_;
    std::unordered_map<uint64_t, Value>  cache_;
};
