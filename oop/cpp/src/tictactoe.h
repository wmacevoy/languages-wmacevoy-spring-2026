#pragma once

// TicTacToe : Game<TicTacToeMove>
//
// A concrete subclass. Notice there is no "Board" class — we just use a
// fixed-size array. In Java/Kotlin you might be tempted to make Board its
// own class; in C++ for something this size, that's overkill. Rust and
// Python do the same.

#include <array>
#include <sstream>

#include "game.h"

struct TicTacToeMove {
    int row;   // 0..2
    int col;   // 0..2
};

class TicTacToe : public Game<TicTacToeMove> {
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

    void applyMove(const TicTacToeMove& m) override {
        cells_[m.row * 3 + m.col] = mark(current_);
        if (checkWinAt(m.row, m.col)) winner_ = current_;
        current_ = other(current_);
    }

    Side                currentSide() const override { return current_; }
    bool                isOver() const override      { return winner_ || legalMoves().empty(); }
    std::optional<Side> winner() const override      { return winner_; }

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
        // row, column, and (if on diagonal) the two diagonals
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
