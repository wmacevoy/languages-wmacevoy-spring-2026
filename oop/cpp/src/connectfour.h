#pragma once

// ConnectFour : Game<int, ConnectFourUndo>
//
// The Move type is just `int` — the column to drop into. Parameterized
// on (rows, cols, need) so the same code covers the standard 6x7-need-4
// game and small variants useful for benchmarking optimal play (e.g.
// 4x4-need-3). Full 6x7 is far beyond a naive minimax — it's left as
// a hook for richer search strategies.

#include <cstdint>
#include <sstream>
#include <vector>

#include "game.h"

struct ConnectFourUndo {
    int                 col;
    int                 row;
    std::optional<Side> prevWinner;
};

class ConnectFour : public Game<int, ConnectFourUndo> {
public:
    ConnectFour() : ConnectFour(6, 7, 4) {}

    ConnectFour(int rows, int cols, int need)
        : rows_(rows), cols_(cols), need_(need),
          cells_(static_cast<size_t>(rows) * static_cast<size_t>(cols), Empty) {}

    std::vector<int> legalMoves() const override {
        std::vector<int> moves;
        if (winner_) return moves;
        for (int c = 0; c < cols_; ++c)
            if (at(0, c) == Empty) moves.push_back(c);
        return moves;
    }

    ConnectFourUndo applyMove(const int& col) override {
        auto prevWinner = winner_;
        // Drop: find the lowest empty row in this column.
        int row = rows_ - 1;
        while (row >= 0 && at(row, col) != Empty) --row;
        cell(row, col) = mark(current_);
        if (checkWinAt(row, col)) winner_ = current_;
        current_ = other(current_);
        return {col, row, prevWinner};
    }

    void undoMove(const ConnectFourUndo& undo) override {
        cell(undo.row, undo.col) = Empty;
        winner_  = undo.prevWinner;
        current_ = other(current_);
    }

    Side                currentSide() const override { return current_; }
    bool                isOver() const override      { return winner_ || legalMoves().empty(); }
    std::optional<Side> winner() const override      { return winner_; }

    uint64_t stateKey() const override {
        // rows*cols cells * 2 bits + 1 side bit. Caller must keep
        // rows*cols <= 31 for u64 fit. Benchmark uses 4x4 = 16 cells.
        uint64_t k = 0;
        int      i = 0;
        for (int r = 0; r < rows_; ++r) {
            for (int c = 0; c < cols_; ++c) {
                char ch = at(r, c);
                uint64_t v = ch == Empty ? 0 : (ch == 'X' ? 1 : 2);
                k |= v << (2 * i);
                ++i;
            }
        }
        k |= static_cast<uint64_t>(current_ == Side::Two) << (2 * i);
        return k;
    }

    std::string render() const override {
        std::ostringstream os;
        for (int r = 0; r < rows_; ++r) {
            os << '|';
            for (int c = 0; c < cols_; ++c) os << at(r, c) << '|';
            os << "\n";
        }
        os << " ";
        for (int c = 0; c < cols_; ++c) os << c << ' ';
        os << "\n";
        return os.str();
    }

    std::string moveToString(const int& col) const override {
        std::ostringstream os; os << "col " << col; return os.str();
    }

private:
    static constexpr char Empty = '.';
    static char mark(Side s) { return s == Side::One ? 'X' : 'O'; }

    char  at(int r, int c) const { return cells_[r * cols_ + c]; }
    char& cell(int r, int c)     { return cells_[r * cols_ + c]; }

    // Count consecutive marks in one direction (dr, dc) from (r,c) exclusive.
    int run(int r, int c, int dr, int dc, char m) const {
        int n = 0;
        for (int i = 1; i < need_; ++i) {
            int rr = r + dr * i, cc = c + dc * i;
            if (rr < 0 || rr >= rows_ || cc < 0 || cc >= cols_) break;
            if (at(rr, cc) != m) break;
            ++n;
        }
        return n;
    }

    bool checkWinAt(int r, int c) const {
        char m = at(r, c);
        const int dirs[4][2] = {{0,1},{1,0},{1,1},{1,-1}};
        for (auto& d : dirs) {
            if (1 + run(r,c,d[0],d[1],m) + run(r,c,-d[0],-d[1],m) >= need_)
                return true;
        }
        return false;
    }

    int                 rows_;
    int                 cols_;
    int                 need_;
    std::vector<char>   cells_;        // row-major, length rows_*cols_
    Side                current_ = Side::One;
    std::optional<Side> winner_;
};
