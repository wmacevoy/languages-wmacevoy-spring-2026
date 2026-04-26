#pragma once

// Nim : Game<NimMove>
//
// Nim exists in this example specifically to break the "2D grid" assumption
// baked into TicTacToe and ConnectFour. Its state is a vector of pile sizes,
// not a board. If our Game abstraction is right, the engine doesn't care.
//
// Rules (normal play): players alternate removing 1+ stones from a single
// pile. The player who takes the last stone wins.

#include <sstream>

#include "game.h"

struct NimMove {
    int pile;   // index into piles_
    int count;  // stones to remove (>= 1, <= piles_[pile])
};

class Nim : public Game<NimMove> {
public:
    explicit Nim(std::vector<int> piles) : piles_(std::move(piles)) {}

    std::vector<NimMove> legalMoves() const override {
        std::vector<NimMove> moves;
        if (winner_) return moves;
        for (int p = 0; p < (int)piles_.size(); ++p)
            for (int k = 1; k <= piles_[p]; ++k)
                moves.push_back({p, k});
        return moves;
    }

    void applyMove(const NimMove& m) override {
        piles_[m.pile] -= m.count;
        // If that took the last stone, the current side wins under normal play.
        bool empty = true;
        for (int v : piles_) if (v > 0) { empty = false; break; }
        if (empty) winner_ = current_;
        current_ = other(current_);
    }

    Side                currentSide() const override { return current_; }
    bool                isOver() const override      { return winner_.has_value(); }
    std::optional<Side> winner() const override      { return winner_; }

    std::string render() const override {
        std::ostringstream os;
        for (size_t i = 0; i < piles_.size(); ++i) {
            os << "  pile " << i << ": ";
            for (int k = 0; k < piles_[i]; ++k) os << "* ";
            os << "(" << piles_[i] << ")\n";
        }
        return os.str();
    }

    std::string moveToString(const NimMove& m) const override {
        std::ostringstream os;
        os << "take " << m.count << " from pile " << m.pile;
        return os.str();
    }

private:
    std::vector<int>    piles_;
    Side                current_ = Side::One;
    std::optional<Side> winner_;
};
