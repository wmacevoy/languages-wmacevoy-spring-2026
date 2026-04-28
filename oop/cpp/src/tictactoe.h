#pragma once

// TicTacToe : Game<TicTacToeMove, TicTacToeUndo>
//
// A concrete subclass. Notice there is no "Board" class — we just use a
// fixed-size array. In Java/Kotlin you might be tempted to make Board its
// own class; in C++ for something this size, that's overkill. Rust and
// Python do the same.
//
// The Undo type captures only the bits applyMove changes: the cell it
// filled and the previous winner. currentSide flips back via other().

#include <array>
#include <cstdint>
#include <sstream>

#include "game.h"

struct TicTacToeMove {
    int row;   // 0..2
    int col;   // 0..2
};

struct TicTacToeUndo {
    int                 cell;        // 0..8 — flat index
    std::optional<Side> prevWinner;
};

class TicTacToe : public Game<TicTacToeMove, TicTacToeUndo> {
public:
    TicTacToe() { cells_.fill(Empty); }

    std::vector<TicTacToeMove> legalMoves() const override {
        std::vector<TicTacToeMove> moves;
        if (winner_) return moves;                 // no moves after a win
        for (int r = 0; r < 3; ++r)
            for (int c = 0; c < 3; ++c)
                if (cells_[r * 3 + c] == Empty) moves.push_back({r, c});
        return moves;
    }

    TicTacToeUndo applyMove(const TicTacToeMove& m) override {
        int  cell       = m.row * 3 + m.col;
        auto prevWinner = winner_;
        cells_[cell] = mark(current_);
        if (checkWinAt(m.row, m.col)) winner_ = current_;
        current_ = other(current_);
        return {cell, prevWinner};
    }

    void undoMove(const TicTacToeUndo& undo) override {
        cells_[undo.cell] = Empty;
        winner_  = undo.prevWinner;
        current_ = other(current_);
    }

    Side                currentSide() const override { return current_; }
    bool                isOver() const override      { return winner_ || legalMoves().empty(); }
    std::optional<Side> winner() const override      { return winner_; }

    uint64_t stateKey() const override {
        // 9 cells * 2 bits + 1 side bit = 19 bits. Empty=0, X=1, O=2.
        uint64_t k = 0;
        for (int i = 0; i < 9; ++i) {
            uint64_t v = cells_[i] == Empty ? 0 : (cells_[i] == 'X' ? 1 : 2);
            k |= v << (2 * i);
        }
        k |= static_cast<uint64_t>(current_ == Side::Two) << 18;
        return k;
    }

    std::string render() const override {
        std::ostringstream os;
        for (int r = 0; r < 3; ++r) {
            for (int c = 0; c < 3; ++c) {
                os << ' ' << cells_[r * 3 + c];
                if (c < 2) os << " |";
            }
            os << "\n";
            if (r < 2) os << "---+---+---\n";
        }
        return os.str();
    }

    std::string moveToString(const TicTacToeMove& m) const override {
        std::ostringstream os; os << "(r" << m.row << ",c" << m.col << ")"; return os.str();
    }

private:
    static constexpr char Empty = ' ';
    static char mark(Side s) { return s == Side::One ? 'X' : 'O'; }

    bool checkWinAt(int r, int c) const {
        char m = cells_[r * 3 + c];
        bool row = cells_[r*3+0]==m && cells_[r*3+1]==m && cells_[r*3+2]==m;
        bool col = cells_[0*3+c]==m && cells_[1*3+c]==m && cells_[2*3+c]==m;
        bool diag1 = (r==c) && cells_[0]==m && cells_[4]==m && cells_[8]==m;
        bool diag2 = (r+c==2) && cells_[2]==m && cells_[4]==m && cells_[6]==m;
        return row || col || diag1 || diag2;
    }

    std::array<char, 9>   cells_;
    Side                  current_ = Side::One;
    std::optional<Side>   winner_;
};
