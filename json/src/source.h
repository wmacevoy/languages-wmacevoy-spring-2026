#pragma once

#include <string>
#include <stdexcept>

// Stage 1: Source
// Provides a stream of raw bytes from a string.
// Tracks byte-level line and column for error reporting.

class Source {
    std::string data_;
    size_t pos_ = 0;
    int line_ = 1;
    int col_ = 1;

public:
    explicit Source(const std::string &input) : data_(input) {}

    bool has() const { return pos_ < data_.size(); }

    uint8_t peek() const {
        if (!has()) throw std::runtime_error("unexpected end of input");
        return static_cast<uint8_t>(data_[pos_]);
    }

    uint8_t next() {
        uint8_t b = peek();
        ++pos_;
        if (b == '\n') { ++line_; col_ = 1; }
        else { ++col_; }
        return b;
    }

    // Position of the next byte to be read
    int line() const { return line_; }
    int col() const { return col_; }
};
