#pragma once

// ConnectFour : Game<int>
//
// The Move type here is just `int` — the column to drop into. We reuse
// the engine without fuss because Game is templated. This is the template
// type-parameter equivalent of "whatever move type the game needs."

#include <array>
#include <sstream>

#include "game.h"

class ConnectFour : public Game<int> {
public:
    static constexpr int Rows = 6;
    static constexpr int Cols = 7;
    static constexpr int Need = 4;

    ConnectFour() { for (auto& row : cells_) row.fill(Empty); }

    std::vector<int> legalMoves() const override {
        std::vector<int> moves;
        if (winner_) return moves;
        for (int c = 0; c < Cols; ++c)
            if (cells_[0][c] == Empty) moves.push_back(c);
        return moves;
    }

    void applyMove(const int& col) override {
        // Drop: find the lowest empty row in this column.
        int row = Rows - 1;
        while (row >= 0 && cells_[row][col] != Empty) --row;
        cells_[row][col] = mark(current_);
        if (checkWinAt(row, col)) winner_ = current_;
        current_ = other(current_);
    }

    Side                currentSide() const override { return current_; }
    bool                isOver() const override      { return winner_ || legalMoves().empty(); }
    std::optional<Side> winner() const override      { return winner_; }

    std::string render() const override {
        std::ostringstream os;
        for (int r = 0; r < Rows; ++r) {
            os << '|';
            for (int c = 0; c < Cols; ++c) os << cells_[r][c] << '|';
            os << "\n";
        }
        os << " ";
        for (int c = 0; c < Cols; ++c) os << c << ' ';
        os << "\n";
        return os.str();
    }

    std::string moveToString(const int& col) const override {
        std::ostringstream os; os << "col " << col; return os.str();
    }

private:
    static constexpr char Empty = '.';
    static char mark(Side s) { return s == Side::One ? 'X' : 'O'; }

    // Count consecutive marks in one direction (dr, dc) from (r,c) exclusive.
    int run(int r, int c, int dr, int dc, char m) const {
        int n = 0;
        for (int i = 1; i < Need; ++i) {
            int rr = r + dr * i, cc = c + dc * i;
            if (rr < 0 || rr >= Rows || cc < 0 || cc >= Cols) break;
            if (cells_[rr][cc] != m) break;
            ++n;
        }
        return n;
    }

    bool checkWinAt(int r, int c) const {
        char m = cells_[r][c];
        // Four directions; count both ways and add 1 for the piece itself.
        const int dirs[4][2] = {{0,1},{1,0},{1,1},{1,-1}};
        for (auto& d : dirs) {
            if (1 + run(r,c,d[0],d[1],m) + run(r,c,-d[0],-d[1],m) >= Need)
                return true;
        }
        return false;
    }

    std::array<std::array<char, Cols>, Rows> cells_;
    Side                                     current_ = Side::One;
    std::optional<Side>                      winner_;
};
